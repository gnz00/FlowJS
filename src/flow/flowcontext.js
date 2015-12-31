export default class FlowContext {
    constructor(states) {
        this._states = states;
        this._currentState = this._states.START;
    }

    setState(newState) {
        this._currentState = newState;
    }

    getState() {
        return this._currentState;
    }

    getStates() {
        return this._states;
    }

    clone() {
        let context = new FlowContext(this.getStates());
        context.setState(this._currentState);
        return context;
    }
}