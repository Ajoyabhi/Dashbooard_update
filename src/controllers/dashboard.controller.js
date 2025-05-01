const User = require('../models/user.model');
const Agent = require('../models/agent.model');

const getDashboardData = async (req, res) => {
  try {
    const userType = req.user.userType;
    let dashboardData = {};

    switch (userType) {
      case 'admin':
        // Admin can see all users and agents
        const [users, agents] = await Promise.all([
          User.find().select('-password'),
          Agent.find().select('-password')
        ]);
        dashboardData = { users, agents };
        break;

      case 'agent':
        // Agent can see their profile and registered users
        const agentUsers = await User.find({ 
          registeredByAgent: req.user._id 
        }).select('-password');
        dashboardData = {
          profile: req.user,
          registeredUsers: agentUsers
        };
        break;

      case 'user':
        // User can only see their own profile
        dashboardData = {
          profile: req.user
        };
        break;

      default:
        return res.status(400).json({ message: 'Invalid user type' });
    }

    res.json(dashboardData);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user profile' });
  }
};

const getAgentProfile = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.agentId).select('-password');
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    res.json(agent);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching agent profile' });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const allowedUpdates = [
      'name',
      'mobile',
      'pancard',
      'aadharCard',
      'companyName',
      'gstNumber',
      'businessType',
      'address',
      'city',
      'state',
      'pincode'
    ];

    const updates = Object.keys(req.body)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user profile' });
  }
};

const updateAgentProfile = async (req, res) => {
  try {
    const allowedUpdates = ['name', 'mobile'];
    const updates = Object.keys(req.body)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});

    const agent = await Agent.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json(agent);
  } catch (error) {
    res.status(500).json({ message: 'Error updating agent profile' });
  }
};

module.exports = {
  getDashboardData,
  getUserProfile,
  getAgentProfile,
  updateUserProfile,
  updateAgentProfile
}; 