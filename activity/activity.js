import RetryableException from '../flow/RetryableException'

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
            console.log("No implementation for Activity!");
            throw Exception("Activity does not have an executeFn");
        }
    }
}