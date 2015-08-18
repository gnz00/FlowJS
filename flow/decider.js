/**
    The Decider is responsible for mapping a FlowState to an Activity.
*/
export default class Decider {
    constructor(decideFn) {
        this._decideFn = decideFn;
    }

    decide(context) { 
       return this._decideFn(context);
   }
}