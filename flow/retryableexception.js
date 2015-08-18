'use strict';

module.exports = function RetryableException(message, extra) {
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = message || 'Retryable exception thrown by an executing activity.';
    this.extra = extra;
};

require('util').inherits(module.exports, Error);