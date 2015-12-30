import RetryableException from '../flow/retryableException'
import Debug from 'debug';

const debug = new Debug('flowjs:activity');

export default class Activity {

    constructor(name, executeFn){
        this._name = name;
        this._executeFn = executeFn;
    }

    getName() {
        return this._name;
    }

    execute(params) {
        if(this._executeFn) {
            this._executeFn(...params);
        } else {
            debug("No implementation for Activity!");
            throw new Error("Activity does not have an executable function");
        }
    }
}