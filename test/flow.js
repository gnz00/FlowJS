import assert from 'assert';
import {
  Flow,
  Activity,
  Decider,
  FlowContext,
  RetryableException
} from "../src/index";

const state = {
    START : Symbol.for("START"),
    A : Symbol.for("A"),
    B : Symbol.for("B"),
    C : Symbol.for("C"),
    END : Symbol.for("END")
};

const decider = new Decider(function(context) {
    switch(context.getState()) {
        case state.START: return ActivityA;
        case state.A: return ActivityA;
        case state.B: return ActivityB;
    }
});

const ActivityA = new Activity("ActivityA", function (context) {
    context.setState(context.getStates().B);
});

const ActivityB = new Activity("ActivityB", function (context) {
    throw new RetryableException('Retrying...');
    context.setState(context.getStates().END);
});

const ActivityC = new Activity("ActivityC", function (context) {
    context.setState(context.getStates().END);
});

const ActivityD = new Activity("ActivityD", function (context) {
    throw new Error('Random errorrrrr!')
});

Object.freeze(state);
Object.freeze(decider);
Object.freeze(ActivityA);
Object.freeze(ActivityB);

describe('Flow', () => {
    let flow;

    beforeEach(() => {
        flow = new Flow({
            decider: decider,
            context: new FlowContext(state),
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
        it('accepts an initial context as the first parameter', () => {
            const newContext = new FlowContext(state);
            flow.start(newContext);
            assert(flow.getContext() instanceof FlowContext);
            // Assert that the context is not copied by reference
            assert(flow.getContext() !== newContext);
        });

        it('triggers the complete event', (done) => {
            flow.on('complete', (object) => {
                assert(object instanceof Flow);
                done();
            });
            flow.start();
        });

        it('triggers the failure event', (done) => {
            flow.on('failure', (object) => {
                assert(object instanceof Flow);
                done();
            });
            flow.start();
        });

        it('triggers the success event', (done) => {
            flow = new Flow({
                decider: new Decider(function(context) {
                    switch(context.getState()) {
                        case state.START: return ActivityC;
                    }
                }),
                context: new FlowContext(state)
            });
            flow.on('success', (object) => {
                assert(object instanceof Flow);
                done();
            });
            flow.start();
        });

        it('triggers the error event and has the correct callback parameters', (done) => {
            flow = new Flow({
                decider: new Decider(function(context) {
                    switch(context.getState()) {
                        case state.START: return ActivityD;
                    }
                }),
                context: new FlowContext(state)
            });
            flow.on('error', (error, object) => {
                assert(error instanceof Error);
                assert(object instanceof Flow);
                done();
            });
            flow.start();
        });
    });

    describe('#step()', () => {
        it('steps through the states', () => {
            let context = flow.getContext();
            assert(context.getState() === context.getStates().START);
            flow.step();
            assert(context.getState() === context.getStates().B);
        });

        it('increases the number of retries when an activity throws a RetryableException', () => {
            assert(flow.currentRetry() === 0);
            flow.step(); // ActivityA is successful
            flow.step(); // ActivityB throws a RetryableException
            assert(flow.currentRetry() === 1);
        });

        it('fails when the retry limit is hit', (done) => {
            flow.on('failure', (object) => {
                assert(object instanceof Flow);
                done();
            });
            for(var i = 0; i < 5; i++) {
                flow.step();
            }
        });
    });

});