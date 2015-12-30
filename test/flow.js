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
    END : Symbol.for("END")
};

const decider = new Decider(function(context) {
    switch(context.getState()) {
        case states.START: return ActivityA;
        case states.A: return ActivityA;
        case states.B: return ActivityB;
    }
});

const ActivityA = new Activity("Standard Activity 1", function (context) {
    context.setState(context.getStates().B);
});

const ActivityB = new Activity("Failing Activity 2", function (context) {
    throw new RetryableException('Retrying...');
    context.setState(context.getStates().END);
});

const ActivityC = new Activity("Successful Activity 3", function (context) {
    context.setState(context.getStates().END);
});

const ActivityD = new Activity("Errored Activity 4", function (context) {
    throw new Error('Random errorrrrr!')
});

const ActivityE = new Activity("Asynchronous activity 5 with a custom context", async function (context) {
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
        it('accepts an initial context as the first parameter', async () => {
            const newContext = new FlowContext(states);
            await flow.start(newContext);
            assert(flow.getContext() instanceof FlowContext);
            // Assert that the context is not copied by reference
            assert(flow.getContext() !== newContext);
        });

        it('triggers the complete event', async (done) => {
            flow.on('complete', (object) => {
                assert(object instanceof Flow);
                done();
            });
            await flow.start();
        });

        it('triggers the failure event', async (done) => {
            flow.on('failure', (object) => {
                assert(object instanceof Flow);
                done();
            });
            await flow.start();
        });

        it('triggers the success event', async (done) => {
            flow = new Flow({
                decider: new Decider(function(context) {
                    switch(context.getState()) {
                        case states.START: return ActivityC;
                    }
                }),
                context: new FlowContext(states)
            });
            flow.on('success', (object) => {
                assert(object instanceof Flow);
                done();
            });
            await flow.start();
        });

        it('triggers the error event and has the correct callback parameters', async (done) => {
            flow = new Flow({
                decider: new Decider(function(context) {
                    switch(context.getState()) {
                        case states.START: return ActivityD;
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
                        case states.START: return ActivityE;
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
                decider: decider,
                context: new FlowContext(states)
            });
            assert(flow.currentRetry() === 0);
            await flow.step();
            await flow.step(); 
            assert(flow.currentRetry() === 1);
        });

        it('fails when the retry limit is hit', async (done) => {
            flow.on('failure', (object) => {
                assert(object instanceof Flow);
                done();
            });
            for(var i = 0; i < 5; i++) {
                await flow.step();
            }
        });
    });

});