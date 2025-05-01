class BaseError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

class ForbiddenError extends BaseError {
    constructor(message = 'Forbidden') {
        super(message, 403);
    }
}

class NotFoundError extends BaseError {
    constructor(message = 'Not Found') {
        super(message, 404);
    }
}

class BadRequestError extends BaseError {
    constructor(message = 'Bad Request') {
        super(message, 400);
    }
}

class UnauthorizedError extends BaseError {
    constructor(message = 'Unauthorized') {
        super(message, 401);
    }
}

module.exports = {
    BaseError,
    ForbiddenError,
    NotFoundError,
    BadRequestError,
    UnauthorizedError
}; 