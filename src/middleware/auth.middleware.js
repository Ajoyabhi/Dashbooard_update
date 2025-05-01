const jwt = require('jsonwebtoken');
const { User } = require('../models');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by id using Sequelize User model
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.user_type)) {
      return res.status(403).json({ 
        message: 'You do not have permission to perform this action' 
      });
    }
    next();
  };
};

const checkAgentAccess = async (req, res, next) => {
  try {
    // If the user is an admin, they have access to everything
    if (req.user.user_type === 'admin') {
      return next();
    }

    // If the user is an agent, they can only access their own data
    // or data of users they registered
    if (req.user.user_type === 'agent') {
      const userId = req.params.userId || req.body.userId;
      if (userId) {
        const user = await User.findOne({
          where: {
            id: userId,
            agent_id: req.user.id
          }
        });
        
        if (!user) {
          return res.status(403).json({ 
            message: 'You do not have access to this user\'s data' 
          });
        }
      }
    }

    next();
  } catch (error) {
    res.status(500).json({ message: 'Error checking agent access' });
  }
};

module.exports = {
  auth,
  authorize,
  checkAgentAccess
}; 