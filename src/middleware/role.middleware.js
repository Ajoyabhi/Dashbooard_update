const { ForbiddenError } = require('../utils/errors');

/**
 * Middleware to check if user has required role
 * @param {string[]} roles - Array of allowed roles
 * @returns {Function} Express middleware function
 */
const checkRole = (roles) => {
    return (req, res, next) => {
        try {
            // Check if user exists in request (should be set by auth middleware)
            if (!req.user) {
                throw new ForbiddenError('User not authenticated');
            }

            // Check if user has required role using user_type
            if (!roles.includes(req.user.user_type)) {
                throw new ForbiddenError('Insufficient permissions');
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = {
    checkRole
}; 