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
    context.setState(context._states.B);
});

const ActivityB = new Activity("ActivityB", function (context) {
    throw new RetryableException();
    context.setState(context._states.END);
});

describe('Flow', () => {
  let flow;
  let context;

  beforeEach(() => {
    context = new FlowContext(state);
    flow = new Flow(decider);
  }); 

  /** Constructor Parameters */
  describe('#constructor()', () => {
    it("accepts a decider as the first parameter", () => {
      assert(flow._decider instanceof Decider);
    });
  });

  /** Instance Methods */
  describe('#start()', () => {
    it('accepts an initial context as the first parameter', () => {
      assert(flow._context === null);
      flow.start(context);
      assert(flow._context instanceof FlowContext);
    });
  });

  describe('#step()', () => {
    it('steps through the states', () => {
      flow._context = context;
      assert(flow._context._currentState === state['START']);
      flow.step();
      assert(flow._context._currentState === state['B']);
    });

    it('increases the number of retries when an activity throws a RetryableException', () => {
      flow._context = context;
      assert(flow._numberRetries === 0);
      flow.step(); // ActivityA is successful
      flow.step(); // ActivityB throws a RetryableException
      assert(flow._numberRetries === 1);
    });

    it('increases the number of retries when an activity throws a RetryableException', () => {
      flow._context = context;
      assert(flow._numberRetries === 0);
      flow.step(); // ActivityA is successful
      flow.step(); // ActivityB throws a RetryableException
      assert(flow._numberRetries === 1);
    });
  });

});