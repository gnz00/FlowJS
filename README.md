# FlowJS
A simple in-memory framework for creating workflows in JS.

Very much WIP. Tests incoming.

### Flows
A workflow or `Flow` is a composition of `Activities` that are executed sequentially, with a `Decider` determining the next `Activity` upon completion. The `Context` represents the state of the workflow and is the only stateful component. The Decider depends solely on the `Context` to determine the next activity - in the example we simply map the flow states to different activities.

A workflow is composed of four implementation-specific components:
* Decider
* Context
* A set of logical workflow states
* A set of Activities

And a `Flow` executor that steps through the workflow and handles exceptions.

### Workflow States

The `Flow` executor expects a map of Symbols that represent the possible states in the workflow. Two default states must exists: `START` and `END`.

```javascript
    var flowStates = {
        START : Symbol("START"),
        A : Symbol("A"),
        B : Symbol("B"),
        END : Symbol("END")
    }
```

### Activities
At the core of the workflow, are `Activities`. Each `Activity` is single logical step in the workflow and is _ideally_ idempotent. Activities are stateless, they are passed the workflow's `Context` during execution. To pass state between activities, subclass the context for your workflow to set/get state.

The `Activity` class only has two properties:
* Name, and
* A function that accepts a context and executes the activity's business logic.

Note: Currently, the activity is responsible for setting the next state. The core logic in the Flow will retry activites that throw exceptions if the `instanceof RetryableException => true`.

Example:

```javascript
  var ActivityA = new Activity("ActivityA", function (context) {
      console.log("Executing ActivityA");
      context.setState(context._states.B);
  });

  var ActivityB = new Activity("ActivityB", function (context) {
      console.log("Executing ActivityB");
      // Will retry until it exhausts attempts
      throw new RetryableException();
      context.setState(context._states.END);
  });
```
### Decider
The Decider is responsible for taking a context and returning the next `Activity` to execute. Note in the example, we define a starting activity -- this is required at the moment.

Example: 
```javascript
    var decider = new Decider(function(context){
        switch(context.getState()) {
            case flowStates.START: return ActivityA;
            case flowStates.A: return ActivityA;
            case flowStates.B: return ActivityB;
        }
    });
```
