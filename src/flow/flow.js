import RetryableException from "./retryableexception"
import Debug from 'debug';
import FlowContext from './flowcontext';
import Decider from './decider';

const debug = new Debug('flowjs:flow');

function success(flow) {
    debug("Flow completed successfully");
    flow.setComplete();
}

function fail(flow) {
    debug("Flow failed");
    flow.setComplete();
}

export default class Flow {
    constructor(options) {
        this._initialContext = options.context || new FlowContext();
        this._decider = options.decider || new Decider();
        this._numberRetries = 0;
        this._isComplete = false;
        this._retryLimit = options.retryLimit || 3;
    }

    isComplete() {
        return this._isComplete == true;
    }

    setComplete() {
        this._isComplete = true;
    }

    reset() {
      this._context = Object.assign({}, this._initialContext);
      this._isComplete = false;
    }

    start(context) {
        if (context) {
            this._context = Object.assign({}, context);
        }
        this._isComplete = false;
        while(!this.isComplete()) {
            this.step();
        }
        debug("Flow complete");
    }

    step() {
        debug("Stepping flow", this._context.getState().toString());
        if(this._context.getState() != this._context.getStates().END) {
            try {
                var activityToExecute = this._decider.decide(this._context);
                debug("Starting next activity", activityToExecute.getName());
                activityToExecute.execute(this._context);
                debug("Activity completed", activityToExecute.getName());
            } catch (e) {
                if (e instanceof RetryableException) {
                    this._numberRetries++;
                    if(this._numberRetries > 3) {
                        debug("Exhausted retries, failing..");
                        fail(this);
                    } else {
                        debug("Retryable exception thrown, retrying.", 
                            "Attempt: " + this._numberRetries);
                    }
               } else {
                debug("Exception thrown, failing..", e);
                fail(this);
              }
            }
        } else {
            success(this);
        }
    }
}