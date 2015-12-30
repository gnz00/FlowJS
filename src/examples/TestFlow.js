import {
  Flow,
  Activity,
  Decider,
  FlowContext,
  RetryableException
} from "../index";

class TestFlow {
    constructor(flow, context) {
        // can be rewritten to accept a execute function, success handler, failure handler.
        var ActivityA = new Activity("ActivityA", function (context) {
            console.log("Executing ActivityA");
            context.setState(context._states.B);
        });

        var ActivityB = new Activity("ActivityB", function (context) {
            console.log("Executing ActivityB");
            throw new RetryableException();
            context.setState(context._states.END);
        });

        var flowStates = {
            START : Symbol.for("START"),
            A : Symbol.for("A"),
            B : Symbol.for("B"),
            END : Symbol.for("END")
        }
        
        var decider = new Decider(function(context){
            switch(context.getState()) {
                case flowStates.START: return ActivityA;
                case flowStates.A: return ActivityA;
                case flowStates.B: return ActivityB;
            }
        });

        this.flow = new Flow(decider);
        this.context = new FlowContext(flowStates);
    }
    
    run() {
        this.flow.start(this.context);
    }
}

export default (new TestFlow()).run();