import assert from 'assert';
import {
  Flow,
  Activity,
  Decider,
  FlowContext,
  RetryableException
} from "../src/index";

const globalCounter = 0;

const states = {
    START : Symbol.for("START"),
    A : Symbol.for("A"),
    B : Symbol.for("B"),
    C : Symbol.for("C"),
    D : Symbol.for("D"),
    END : Symbol.for("END")
};

const decider = new Decider(function(context) {
    switch(context.getState()) {
        case states.START: return ActivityA;
        case states.A: return ActivityA;
        case states.B: return ActivityB;
        case states.C: return ActivityC;
        case states.D: return ActivityD;
    }
});

const ActivityA = new Activity("Standard Activity 1", function (context) {
    context.setState(context.getStates().B);
});

const ActivityB = new Activity("Standard Activity 2", function (context) {
    context.setState(context.getStates().C);
});

const ActivityC = new Activity("Standard Activity 3", function (context) {
    context.setState(context.getStates().D);
});

const ActivityD = new Activity("Standard Activity 4", function (context) {
    context.setState(context.getStates().END);
});

const RetryActivity = new Activity("Retry Activity", function (context) {
    throw new RetryableException;
});

const ErrorActivity = new Activity("Errored Activity", function (context) {
    throw new Error('Random errorrrrr!')
});

const AsyncActivity = new Activity("Asynchronous activity with a custom context", async function (context) {
    await new Promise((resolve, reject) => {
        setTimeout(() => {
            context.store.counter++;
            context.setState(context.getStates().END);
            resolve(context.globals.done());
        }, 30);
    });
});

Object.freeze(states);
Object.freeze(decider);
Object.freeze(ActivityA);
Object.freeze(ActivityB);
Object.freeze(ActivityC);
Object.freeze(ActivityD);

describe('Flow', () => {
    let flow;

    beforeEach(() => {
        flow = new Flow({
            decider: decider,
            context: new FlowContext(states),
            retryLimit: 3
        });
    }); 

    /** Constructor Parameters */
    describe('#constructor()', () => {
        it("accepts a decider in the options parameter", () => {
            assert(flow._decider instanceof Decider);
        });
        it("accepts a context in the options parameter", () => {
            assert(flow.getContext() instanceof FlowContext);
        });
    });

    /** Instance Methods */
    describe('#start()', () => {

        it('triggers the complete event', async (done) => {
            flow.on('complete', (object) => {
                assert(object instanceof Flow);
                done();
            });
            await flow.start();
        });

        it('triggers the success event', async (done) => {
            flow.on('success', (object) => {
                assert(object instanceof Flow);
                done();
            });
            await flow.start();
        });

        it('triggers the failure event', async (done) => {
            flow = new Flow({
                decider: new Decider(function(context) {
                    switch(context.getState()) {
                        case states.START: return RetryActivity;
                    }
                }),
                context: new FlowContext(states)
            });
            flow.on('failure', (object) => {
                assert(object instanceof Flow);
                done();
            });
            await flow.start();
        });

        it('triggers the error event and has the correct callback parameters', async (done) => {
            flow = new Flow({
                decider: new Decider(function(context) {
                    switch(context.getState()) {
                        case states.START: return ErrorActivity;
                    }
                }),
                context: new FlowContext(states)
            });
            flow.on('error', (error, object) => {
                assert(error instanceof Error);
                assert(object instanceof Flow);
                done();
            });
            await flow.start();
        });

        it('only executes asynchronous activities once', async (done) => {
            let context = Object.create(new FlowContext(states), {
                globals: { writable: true, configurable: true, value: { done: done } },
                store: { writable: true, configurable: true, value: { counter: 0 } }
            });
            flow = new Flow({
                decider: new Decider(function(context) {
                    switch(context.getState()) {
                        case states.START: return AsyncActivity;
                    }
                }),
                context: context,
            });
            await flow.start();
            assert(flow.getContext().store.counter === 1);
        });
    });

    describe('#step()', () => {
        it('steps through the states', async () => {
            let context = flow.getContext();
            assert(context.getState() === context.getStates().START);
            await flow.step();
            assert(context.getState() === context.getStates().B);
        });

        it('increases the number of retries when an activity throws a RetryableException', async () => {
            flow = new Flow({
                decider: new Decider(function(context) {
                    switch(context.getState()) {
                        case states.START: return RetryActivity;
                    }
                }),
                context: new FlowContext(states)
            });
            assert(flow.currentRetry() === 0);
            await flow.step();
            assert(flow.currentRetry() === 1);
            await flow.step(); 
            assert(flow.currentRetry() === 2);
        });
    });

    describe('#reset()', () => {
        it('resets the state to a specified step', async () => {
            assert(flow.getContext().getState() === flow.getContext().getStates().START);
            await flow.start();
            assert(flow.getContext().getState() === flow.getContext().getStates().END);
            await flow.reset(); // Back to START, no execution
            assert(flow.getContext().getState() === flow.getContext().getStates().START);
            await flow.start();
            assert(flow.getContext().getState() === flow.getContext().getStates().END);
        });
    });

    describe('#backward()', () => {
        it('steps through the history backwards', async () => {
            assert(flow.getContext().getState() === flow.getContext().getStates().START);
            await flow.start();
            assert(flow.getContext().getState() === flow.getContext().getStates().END);
            await flow.backward(5); // Back to START, execute => B
            assert(flow.getContext().getState() === flow.getContext().getStates().B);
        });
        it('defaults to the entire history', async () => {
            assert(flow.getContext().getState() === flow.getContext().getStates().START);
            await flow.start();
            assert(flow.getContext().getState() === flow.getContext().getStates().END);
            await flow.backward(); // Back to START, execute => B
            assert(flow.getContext().getState() === flow.getContext().getStates().B);
        });
        it('defaults to the entire history if parameter is larger than history', async () => {
            assert(flow.getContext().getState() === flow.getContext().getStates().START);
            await flow.start();
            assert(flow.getContext().getState() === flow.getContext().getStates().END);
            await flow.backward(20); // Back to START, execute => B
            assert(flow.getContext().getState() === flow.getContext().getStates().B);
        });
    });

    it('correctly persists history', async () => {
        // [START, B, C, D, END] Label
        // [0    , 1, 2, 3, 4  ] Index
        // [1    , 2, 3, 4, 5  ] Step #
        assert(flow.getContext().getState() === flow.getContext().getStates().START);
        await flow.start();
        assert(flow.getContext().getState() === flow.getContext().getStates().END);
        await flow.backward(); // Back to START, execute START, current state is B
        assert(flow.getContext().getState() === flow.getContext().getStates().B);
        await flow.reset(); // Back to initial state
        assert(flow.getContext().getState() === flow.getContext().getStates().START);
        await flow.forward(4); // Execute A, B, C, D, current state is END
        assert(flow.getContext().getState() === flow.getContext().getStates().END);
        await flow.reset(3); // Reset to C, history = [START, B] and state  = C
        assert(flow.getContext().getState() === flow.getContext().getStates().C);
        await flow.start();
        assert(flow.getContext().getState() === flow.getContext().getStates().END);
        await flow.reset(-1);
        assert(flow.getContext().getState() === flow.getContext().getStates().START);
        await flow.start();
        assert(flow.getContext().getState() === flow.getContext().getStates().END);
        await flow.replay();
        assert(flow.getContext().getState() === flow.getContext().getStates().END);
    });

});
