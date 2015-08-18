import RetryableException from "./retryableexception"

function success(flow) {
    console.log("Flow completed successfully");
    flow.setComplete();
}

function fail(flow) {
    console.log("Flow failed");
    flow.setComplete();
}

export default class Flow {
    constructor(decider, activitySet) {
        this._context = null;
        this._numberRetries = 0;
        this._decider = decider;
        this._isComplete = null;
    }

    isComplete() {
        return this._isComplete == true;
    }

    setComplete() {
        this._isComplete = true;
    }

    start(initialContext) {
        this._context = initialContext;
        this._isComplete = false;
        while(!this.isComplete()) {
            this.step();
        }
        console.log("Flow complete");
    }

    step() {
        console.log("Stepping flow", this._context.getState().toString());
        if(this._context.getState() != this._context.getStates().END) {
            try {
                var activityToExecute = this._decider.decide(this._context);
                console.log("Starting next activity", activityToExecute.getName());
                activityToExecute.execute(this._context);
                console.log("Activity completed", activityToExecute.getName());
            } catch (e) {
                if (e instanceof RetryableException) {
                    this._numberRetries++;
                    if(this._numberRetries > 3) {
                        console.log("Exhausted retries, failing..");
                        fail(this);
                    } else {
                        console.log("Retryable exception thrown, retrying.", 
                            "Attempt: " + this._numberRetries);
                    }
               } else {
                console.log("Exception thrown, failing..", e);
                fail(this);
              }
            }
        } else {
            success(this);
        }
    }
}
