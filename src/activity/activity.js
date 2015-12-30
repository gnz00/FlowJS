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

    execute(flowContext) {
        if(this._executeFn) {
            this._executeFn(flowContext);
        } else {
            debug("No implementation for Activity!");
            throw Exception("Activity does not have an executable function");
        }
    }
}