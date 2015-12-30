import RetryableException from './retryableException'
import Debug from 'debug';
import FlowContext from './flowContext';
import Decider from './decider';
import { EventEmitter } from 'events';

const debug = new Debug('flowjs:flow');

class Flow extends EventEmitter {
    constructor(options) {
        super();
        this._initialContext = options.context || new FlowContext();
        this._decider = options.decider || new Decider();
        this._numberRetries = 0;
        this._isComplete = false;
        this._retryLimit = options.retryLimit || 3;

        this.setContext(this._initialContext);
    }

    isComplete() {
        return this._isComplete == true;
    }

    setComplete() {
        this._isComplete = true;
    }

    setContext(context) {
      this._context = Object.create(context);
      this.emit('contextChanged', context);
    }

    getContext() {
      return this._context;
    }

    currentRetry() {
      return this._numberRetries;
    }

    // Reset the flow to the original context supplied during initialization
    reset() {
      this.setContext(this._initialContext);
      this._isComplete = false;
    }

    // Start the workflow with an optional new context
    async start(context) {
        if (context) {
            this.setContext(context);
        }
        this._isComplete = false;
        while(!this.isComplete()) {
            await this.step();
        }
    }

    // Step through the workflow
    async step() {
        debug(`Stepping flow - ${this.getContext().getState().toString()}`);
        if(this.getContext().getState() != this.getContext().getStates().END) {

            try {
                var activityToExecute = this._decider.decide(this.getContext());
                debug(`Starting next activity - ${activityToExecute.getName()}`);
                await activityToExecute.execute(this.getContext());
                debug(`Activity completed - ${activityToExecute.getName()}`);

            } catch (e) {
                if (e.name === 'RetryableException') {
                    this._numberRetries++;
                    if(this.currentRetry() > 3) {
                        debug(`Exhausted retries, failing..`);
                        this::failure();
                    } else {
                        debug(`Retryable exception thrown, retrying. Attempt: ${this.currentRetry()}`);
                    }
               } else {
                debug(`Exception thrown, failing..${JSON.stringify(e.stack, null, 2)}`);
                this::error(e);
              }
            }
        } else {
            debug(`Successfully completed the workflow.`);
            this::success(this);
        }
    }
}



// Private instance methods
function success() {
    this.emit('success', this);
    this::complete();
};

function failure() {
    this.emit('failure', this);
    this::complete();
};

function complete() {
    this.setComplete();
    this.emit('complete', this);
};

function error(error) {
    this.emit('error', error, this);
    this::complete();
};

export default Flow;