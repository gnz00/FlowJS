export default class RetryableException extends Error {
    constructor(message) {
        super(message);
        this.name = 'RetryableException';
        this.message = message;
    }
};