import {
  Flow,
  Activity,
  Decider,
  FlowContext,
  RetryableException
} from "../src/index";

// ActivityA should update the context state
const ActivityA = new Activity("ActivityA", function (context) {
    console.log("Executing ActivityA");
    context.setState(context.getStates().B);
});

// ActivityB should update the context state
const ActivityB = new Activity("ActivityB", function (context) {
    console.log("Executing ActivityB");

    if (Math.floor(Math.random() * 10) % 2 === 0) {
        throw new RetryableException();
    }

    context.setState(context.getStates().END);
});

const states = {
    START : Symbol.for("START"),
    A : Symbol.for("A"),
    B : Symbol.for("B"),
    END : Symbol.for("END")
}

const flow = new Flow({
    context: new FlowContext(states),
    decider: new Decider((context) => {
        switch(context.getState()) {
            case states.START: return ActivityA;
            case states.A: return ActivityA;
            case states.B: return ActivityB;
        }
    })
}); 

flow.on('success', (flowObject) => {
    console.log('Flow succeeded.');
});

flow.on('failure', (flowObject) => {
    console.log('Flow failed.');
});

// Will always get called
flow.on('complete', (flowObject) => {
    console.log('Flow has finished executing.');
});

flow.on('error', (error, flowObject) => {
    console.log(error.stack);
    console.log('Flow encountered an error.');
});

export default flow.start();