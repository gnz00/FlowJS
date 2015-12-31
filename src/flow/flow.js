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
        this._history = [];

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

    // Jump to a previous step, where 0 is the first step executed
    reset(step = 1) {
        step = step > 0 ? step : 1;
        let stepIndex = step - 1;

        debug(`Jumping to previous step at index ${stepIndex}`);

        if (this._history[stepIndex]) {
            this.setContext(this._history[stepIndex].context);
            this._isComplete = this._history[stepIndex].isComplete;
            this._numberRetries = this._history[stepIndex].numberRetries;
        } else {
            this.setContext(this._initialContext);
            this._numberRetries = 0;
            this._isComplete = false;
        }

        this._history = this._history.slice(0, step - 1);
    }

    // Replay all the steps in the currently in history
    async replay() {
        debug(`Replaying history`);
        let history = this._history.slice();
        for (var i = 0; i < history.length; i++) {
            this.setContext(history[i].context);
            this._isComplete = history[i].isComplete;
            this._numberRetries = history[i].numberRetries;
            await this.step();
        }
    }

    // Execute a number of previous steps in backwards order
    async backward(steps) {
        debug(`Stepping flow backwards ${steps}`);

        if (steps == null || steps > this._history.length) {
            steps = this._history.length;
        }

        let records = this._history.slice(this._history.length - steps, this._history.length).reverse();
        for (var i = 0; i < records.length; i++) {
            this.setContext(records[i].context);
            this._isComplete = records[i].isComplete;
            this._numberRetries = records[i].numberRetries;
            await this.step();
        }
    }
 
    // Execute a specified number of steps
    async forward(steps) {
        for (var i = 0; i < steps; i++) {
            if (!this.isComplete()) {
                await this.step();
            }
        }
    }

    // Execute workflow until completed
    async start() {
        while(!this.isComplete()) {
            await this.step();
        }
    }

    // Step through the workflow
    async step() {

        this._history.push({
            context: this.getContext().clone(),
            numberRetries: this._numberRetries,
            isComplete: this._isComplete
        });

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