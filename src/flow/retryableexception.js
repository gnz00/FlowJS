const RetryableException = function (message, extra) {
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = message || 'Retryable exception thrown by an executing activity.';
    this.extra = extra;
};

export default Object.assign(Error, RetryableException);