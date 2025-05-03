/**
 * Get the client's IP address from the request
 * @param {Object} req - Express request object
 * @returns {string} The client's IP address
 */
const getClientIp = (req) => {
    // Try different headers and properties in order of preference
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || // Get first IP if multiple
              req.headers['x-real-ip'] ||
              req.connection.remoteAddress ||
              req.socket.remoteAddress;
    
    // Remove IPv6 wrapper if present
    return ip.replace(/^::ffff:/, '');
};

module.exports = getClientIp; 