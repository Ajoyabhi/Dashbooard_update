const { User, UserStatus, MerchantDetails, MerchantCharges, MerchantModeCharges, FinancialDetails, UserIPs, PlatformCharges, TransactionCharges, SettlementTransaction } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const PayoutTransaction = require('../models/payoutTransaction.model');
// const Wallet = require('../models/wallet.model');
const Transaction = require('../models/transaction.model');
const UserTransaction = require('../models/userTransaction.model');
// const User = require('../models/User');

const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      include: [
        { 
          model: UserStatus,
          attributes: ['status', 'payin_status', 'payout_status']
        },
        {
          model: FinancialDetails,
          attributes: ['wallet', 'settlement', 'lien', 'rolling_reserve']
        }
      ],
      attributes: [
        'id',
        'name',
        'user_name',
        'user_type',
        'mobile',
        'email',
        'company_name',
        'business_type',
        'created_at',
        'updated_at'
      ]
    });

    // Transform the data to match frontend requirements
    const transformedUsers = users.map(user => {
      
      const financialDetails = user.FinancialDetail || {};
      
      const transformed = {
        id: user.id,
        name: user.name,
        userType: user.user_type,
        username: user.user_name,
        walletBalance: financialDetails.wallet ? Number(financialDetails.wallet) : 0,
        settlement: financialDetails.settlement ? Number(financialDetails.settlement) : 0,
        lien: financialDetails.lien ? Number(financialDetails.lien) : 0,
        rollingReserve: financialDetails.rolling_reserve ? Number(financialDetails.rolling_reserve) : 0,
        mobile: user.mobile,
        payin: user.UserStatus?.payin_status || false,
        payout: user.UserStatus?.payout_status || false,
        status: user.UserStatus?.status || 'inactive'
      };
      return transformed;
    });

    res.json(transformedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
};

const getAllAgents = async (req, res) => {
  try {
    const agents = await User.findAll({
      where: { user_type: 'agent' },
      include: [
        { model: UserStatus }
      ],
      attributes: { exclude: ['password'] }
    });
    res.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Error fetching agents' });
  }
};

const getUserDetails = async (req, res) => {
  try {
    const user = await User.findOne({
      where: { id: req.params.userId },
      include: [
        { model: UserStatus }
      ],
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Error fetching user details' });
  }
};

const getAgentDetails = async (req, res) => {
  try {
    const agent = await User.findOne({
      where: { 
        id: req.params.agentId,
        user_type: 'agent'
      },
      include: [
        { model: UserStatus }
      ],
      attributes: { exclude: ['password'] }
    });
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(agent);
  } catch (error) {
    console.error('Error fetching agent details:', error);
    res.status(500).json({ error: 'Error fetching agent details' });
  }
};

const getAgentUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { 
        created_by: req.params.agentId
      },
      include: [
        { model: UserStatus }
      ],
      attributes: { exclude: ['password'] }
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching agent users:', error);
    res.status(500).json({ error: 'Error fetching agent users' });
  }
};

// Merchant Details Management
const addOrUpdateMerchantDetails = async (req, res) => {
    try {
        const { user_id } = req.params;
        const {
            payin_merchant_assigned,
            payin_merchant_name,
            payout_merchant_assigned,
            payout_merchant_name,
            user_key,
            user_token,
            payin_callback,
            payout_callback
        } = req.body;

        // Check if user exists
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Create or update merchant details
        const [merchantDetails, created] = await MerchantDetails.findOrCreate({
            where: { user_id },
            defaults: {
                payin_merchant_assigned,
                payin_merchant_name,
                payout_merchant_assigned,
                payout_merchant_name,
                user_key,
                user_token,
                payin_callback,
                payout_callback
            }
        });

        if (!created) {
            await merchantDetails.update({
                payin_merchant_assigned,
                payin_merchant_name,
                payout_merchant_assigned,
                payout_merchant_name,
                user_key,
                user_token,
                payin_callback,
                payout_callback
            });
        }

        res.json({
            success: true,
            message: created ? 'Merchant details added successfully' : 'Merchant details updated successfully',
            data: merchantDetails
        });
    } catch (error) {
        console.error('Error managing merchant details:', error);
        res.status(500).json({
            success: false,
            message: 'Error managing merchant details'
        });
    }
};

// Get merchant details for a user
const getUserMerchantDetails = async (req, res) => {
    try {
        const { user_id } = req.params;

        // Check if user exists
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get merchant details
        const merchantDetails = await MerchantDetails.findOne({
            where: { user_id }
        });

        res.json({
            success: true,
            data: merchantDetails
        });
    } catch (error) {
        console.error('Error fetching merchant details:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching merchant details'
        });
    }
};

// Merchant Charges Management
const addMerchantCharges = async (req, res) => {
    try {
        const {
            user_id,
            start_amount,
            end_amount,
            payout_charge,
            payin_charge,
            agent_payin_charge,
            agent_payout_charge,
            payin_total_charge,
            payout_total_charge,
            payin_charge_type,
            payout_charge_type
        } = req.body;

        const merchantCharges = await MerchantCharges.create({
            user_id,
            start_amount,
            end_amount,
            payout_charge,
            payin_charge,
            agent_payin_charge,
            agent_payout_charge,
            payin_total_charge,
            payout_total_charge,
            payin_charge_type,
            payout_charge_type,
            created_by: req.user.id,
            updated_by: req.user.id
        });

        res.json({
            success: true,
            message: 'Merchant charges added successfully',
            data: merchantCharges
        });
    } catch (error) {
        console.error('Error adding merchant charges:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding merchant charges'
        });
    }
};

const updateMerchantCharges = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            start_amount,
            end_amount,
            payout_charge,
            payin_charge,
            agent_payin_charge,
            agent_payout_charge,
            payin_total_charge,
            payout_total_charge,
            payin_charge_type,
            payout_charge_type
        } = req.body;

        const merchantCharges = await MerchantCharges.findByPk(id);
        if (!merchantCharges) {
            return res.status(404).json({
                success: false,
                message: 'Merchant charges not found'
            });
        }

        await merchantCharges.update({
            start_amount,
            end_amount,
            payout_charge,
            payin_charge,
            agent_payin_charge,
            agent_payout_charge,
            payin_total_charge,
            payout_total_charge,
            payin_charge_type,
            payout_charge_type,
            updated_by: req.user.id
        });

        res.json({
            success: true,
            message: 'Merchant charges updated successfully',
            data: merchantCharges
        });
    } catch (error) {
        console.error('Error updating merchant charges:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating merchant charges'
        });
    }
};

// Get merchant charges for a specific user
const getUserMerchantCharges = async (req, res) => {
    try {
        const { user_id } = req.params;

        // Check if user exists
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get all merchant charges for the user
        const merchantCharges = await MerchantCharges.findAll({
            where: { user_id },
            order: [['start_amount', 'ASC']]
        });

        res.json({
            success: true,
            data: merchantCharges
        });
    } catch (error) {
        console.error('Error fetching user merchant charges:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user merchant charges'
        });
    }
};

// Update merchant charges for a specific user
const updateUserMerchantCharges = async (req, res) => {
    try {
        const { user_id } = req.params;
        const { 
            start_amount,
            end_amount,
            admin_payin_charge,
            admin_payout_charge,
            admin_payin_charge_type,
            admin_payout_charge_type,
        } = req.body;

        // Check if user exists
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Start a transaction
        const result = await sequelize.transaction(async (t) => {
            // Create new charge
            const newCharge = await MerchantCharges.create({
                user_id,
                start_amount,
                end_amount,
                admin_payin_charge,
                admin_payout_charge,
                admin_payin_charge_type,
                admin_payout_charge_type,
                // Set default values for required agent fields
                agent_payin_charge: 0,
                agent_payout_charge: 0,
                agent_payin_charge_type: 'percentage',
                agent_payout_charge_type: 'percentage',
                created_by: req.user.id,
                updated_by: req.user.id
            }, { transaction: t });

            return newCharge;
        });

        res.json({
            success: true,
            message: 'Admin charges added successfully',
            data: result
        });
    } catch (error) {
        console.error('Error adding admin charges:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding admin charges'
        });
    }
};

// Update a specific merchant charge for a user
const updateMerchantCharge = async (req, res) => {
    try {
        const { user_id, charge_id } = req.params;
        const {
            start_amount,
            end_amount,
            payout_charge,
            payin_charge,
            agent_payin_charge,
            agent_payout_charge,
            payin_total_charge,
            payout_total_charge,
            payin_charge_type,
            payout_charge_type
        } = req.body;

        // Check if user exists
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Find the specific charge for this user
        const merchantCharge = await MerchantCharges.findOne({
            where: {
                id: charge_id,
                user_id: user_id
            }
        });

        if (!merchantCharge) {
            return res.status(404).json({
                success: false,
                message: 'Merchant charge not found for this user'
            });
        }

        // Update the charge
        await merchantCharge.update({
            start_amount,
            end_amount,
            payout_charge,
            payin_charge,
            agent_payin_charge,
            agent_payout_charge,
            payin_total_charge,
            payout_total_charge,
            payin_charge_type,
            payout_charge_type,
            updated_by: req.user.id
        });

        res.json({
            success: true,
            message: 'Merchant charge updated successfully',
            data: merchantCharge
        });
    } catch (error) {
        console.error('Error updating merchant charge:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating merchant charge'
        });
    }
};

// Delete a specific merchant charge for a user
const deleteMerchantCharge = async (req, res) => {
    try {
        const { user_id, charge_id } = req.params;  
        const merchantCharge = await MerchantCharges.findOne({
            where: {
                id: charge_id,
                user_id: user_id
            }
        });
        if (!merchantCharge) {
            return res.status(404).json({
                success: false,
                message: 'Merchant charge not found for this user'
            });
        }
        await merchantCharge.destroy();
        res.json({
            success: true,
            message: 'Merchant charge deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting merchant charge:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting merchant charge' 
        });
    }
};

// Update user details
const updateUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      name,
      user_name,
      email,
      mobile,
      company_name,
      business_type,
      user_type,
      payin_status,
      payout_status,
      status
    } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user details
    await user.update({
      name,
      user_name,
      email,
      mobile,
      company_name,
      business_type,
      user_type
    });

    // Convert status string to boolean for DB
    const statusBoolean = status === 'active' ? true : false;

    // Update user status
    const [userStatus, created] = await UserStatus.findOrCreate({
      where: { user_id: userId },
      defaults: {
        payin_status: payin_status !== undefined ? payin_status : true,
        payout_status: payout_status !== undefined ? payout_status : true,
        status: statusBoolean
      }
    });

    if (!created) {
      await userStatus.update({
        payin_status: payin_status !== undefined ? payin_status : userStatus.payin_status,
        payout_status: payout_status !== undefined ? payout_status : userStatus.payout_status,
        status: statusBoolean
      });
    }

    // Convert boolean back to string for frontend
    const statusString = userStatus.status ? 'active' : 'inactive';

    res.json({
      success: true,
      message: 'User details updated successfully',
      data: {
        ...user.toJSON(),
        status: {
          payin_status: userStatus.payin_status,
          payout_status: userStatus.payout_status,
          status: statusString
        }
      }
    });
  } catch (error) {
    console.error('Error updating user details:', error);
    res.status(500).json({ error: 'Error updating user details' });
  }
};

// Get user callbacks
const getUserCallbacks = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const merchantDetails = await MerchantDetails.findOne({
      where: { user_id: userId }
    });

    res.json({
      success: true,
      data: {
        payin_callback: merchantDetails?.payin_callback || null,
        payout_callback: merchantDetails?.payout_callback || null,
        payin_merchant_name: merchantDetails?.payin_merchant_name || null,
        payout_merchant_name: merchantDetails?.payout_merchant_name || null,
        last_updated: merchantDetails?.updated_at || null
      }
    });
  } catch (error) {
    console.error('Error fetching user callbacks:', error);
    res.status(500).json({ error: 'Error fetching user callbacks' });
  }
};

// Get user wallet balance
const getUserWallet = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Getting wallet for user:', userId);

    const user = await User.findByPk(userId);
    console.log('User found:', user ? 'yes' : 'no');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find or create financial details
    const [financialDetails, created] = await FinancialDetails.findOrCreate({
      where: { user_id: userId },
      defaults: {
        settlement: 0,
        wallet: 0,
        lien: 0,
        rolling_reserve: 0
      }
    });
    console.log('Financial details:', financialDetails ? 'found' : 'not found', 'Created:', created);

    res.json({
      success: true,
      data: {
        wallet_balance: financialDetails.wallet || 0
      }
    });
  } catch (error) {
    console.error('Error in getUserWallet:', error);
    res.status(500).json({ error: 'Error fetching wallet balance' });
  }
};

// Update user wallet balance
const updateUserWallet = async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, type, remark } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const financialDetails = await FinancialDetails.findOne({
      where: { user_id: userId }
    });

    if (!financialDetails) {
      return res.status(404).json({ error: 'Financial details not found' });
    }

    const currentBalance = parseFloat(financialDetails.wallet) || 0;
    let newBalance;

    if (type === 'credit') {
      newBalance = currentBalance + parseFloat(amount);
    } else if (type === 'debit') {
      if (currentBalance < parseFloat(amount)) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }
      newBalance = currentBalance - parseFloat(amount);
    } else {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }

    await financialDetails.update({
      wallet: newBalance
    });

    // TODO: Add transaction record to transaction history table

    res.json({
      success: true,
      message: 'Wallet balance updated successfully',
      data: {
        previous_balance: currentBalance,
        new_balance: newBalance,
        transaction_type: type,
        amount: parseFloat(amount),
        remark
      }
    });
  } catch (error) {
    console.error('Error updating wallet balance:', error);
    res.status(500).json({ error: 'Error updating wallet balance' });
  }
};

// Get user IPs
const getUserIPs = async (req, res) => {
    try {
        const { user_id } = req.params;

        // Check if user exists
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const userIPs = await UserIPs.findAll({
            where: { user_id },
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            data: userIPs
        });
    } catch (error) {
        console.error('Error fetching user IPs:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user IPs'
        });
    }
};

// Add user IP
const addUserIP = async (req, res) => {
    try {
        const { user_id } = req.params;
        const { ip_address } = req.body;

        // Check if user exists
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Validate IP address format
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipRegex.test(ip_address)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid IP address format'
            });
        }

        // Check if IP already exists for this user
        const existingIP = await UserIPs.findOne({
            where: { user_id, ip_address }
        });

        if (existingIP) {
            return res.status(400).json({
                success: false,
                message: 'IP address already exists for this user'
            });
        }

        const userIP = await UserIPs.create({
            user_id,
            ip_address,
            created_by: req.user.id,
            updated_by: req.user.id
        });

        res.json({
            success: true,
            message: 'IP address added successfully',
            data: userIP
        });
    } catch (error) {
        console.error('Error adding user IP:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding user IP'
        });
    }
};

// Remove user IP
const removeUserIP = async (req, res) => {
    try {
        const { user_id, ip_id } = req.params;

        // Check if user exists
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Find and delete the IP
        const deleted = await UserIPs.destroy({
            where: {
                id: ip_id,
                user_id
            }
        });

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'IP address not found for this user'
            });
        }

        res.json({
            success: true,
            message: 'IP address removed successfully'
        });
    } catch (error) {
        console.error('Error removing user IP:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing user IP'
        });
    }
};

// Get platform charges
const getPlatformCharges = async (req, res) => {
    try {
        const platformCharges = await PlatformCharges.findAll({
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            data: platformCharges
        });
    } catch (error) {
        console.error('Error fetching platform charges:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching platform charges'
        });
    }
};

// Add platform charge
const addPlatformCharge = async (req, res) => {
    try {
        const { charge, gst } = req.body;

        // Validate charge and GST
        if (charge < 0 || gst < 0) {
            return res.status(400).json({
                success: false,
                message: 'Charge and GST must be positive numbers'
            });
        }

        // Start a transaction
        const result = await sequelize.transaction(async (t) => {
            // Deactivate all existing platform charges
            await PlatformCharges.update(
                { is_active: false },
                { 
                    where: { is_active: true },
                    transaction: t
                }
            );

            // Create new platform charge
            const platformCharge = await PlatformCharges.create({
                charge,
                gst,
                is_active: true,
                created_by: req.user.id,
                updated_by: req.user.id
            }, { transaction: t });

            return platformCharge;
        });

        res.json({
            success: true,
            message: 'Platform charge added successfully',
            data: result
        });
    } catch (error) {
        console.error('Error adding platform charge:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding platform charge'
        });
    }
};

// Remove platform charge
const removePlatformCharge = async (req, res) => {
    try {
        const { charge_id } = req.params;

        // Find and deactivate the platform charge
        const platformCharge = await PlatformCharges.findByPk(charge_id);

        if (!platformCharge) {
            return res.status(404).json({
                success: false,
                message: 'Platform charge not found'
            });
        }

        await platformCharge.update({
            is_active: false,
            updated_by: req.user.id
        });

        res.json({
            success: true,
            message: 'Platform charge removed successfully'
        });
    } catch (error) {
        console.error('Error removing platform charge:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing platform charge'
        });
    }
};

// Update user payin callback
const updateUserPayinCallback = async (req, res) => {
    try {
        const { userId } = req.params;
        const { payinUrl, payinMerchantName } = req.body;

        // Check if user exists
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Find or create merchant details
        const [merchantDetails, created] = await MerchantDetails.findOrCreate({
            where: { user_id: userId },
            defaults: {
                payin_callback: payinUrl || '',
                payin_merchant_name: payinMerchantName || '',
                payin_merchant_assigned: payinMerchantName || '' // Using merchant name as assigned number for now
            }
        });

        if (!created) {
            await merchantDetails.update({
                payin_callback: payinUrl || '',
                payin_merchant_name: payinMerchantName || '',
                payin_merchant_assigned: payinMerchantName || '' // Using merchant name as assigned number for now
            });
        }

        res.json({
            success: true,
            message: 'Payin callback updated successfully',
            data: merchantDetails
        });
    } catch (error) {
        console.error('Error updating payin callback:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating payin callback'
        });
    }
};

// Update user payout callback
const updateUserPayoutCallback = async (req, res) => {
    try {
        const { userId } = req.params;
        const { payoutUrl, payoutMerchantName } = req.body;

        // Check if user exists
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Find or create merchant details
        const [merchantDetails, created] = await MerchantDetails.findOrCreate({
            where: { user_id: userId },
            defaults: {
                payout_callback: payoutUrl || '',
                payout_merchant_name: payoutMerchantName || '',
                payout_merchant_assigned: payoutMerchantName || '' // Using merchant name as assigned number for now
            }
        });

        if (!created) {
            await merchantDetails.update({
                payout_callback: payoutUrl || '',
                payout_merchant_name: payoutMerchantName || '',
                payout_merchant_assigned: payoutMerchantName || '' // Using merchant name as assigned number for now
            });
        }

        res.json({
            success: true,
            message: 'Payout callback updated successfully',
            data: merchantDetails
        });
    } catch (error) {
        console.error('Error updating payout callback:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating payout callback'
        });
    }
};

const getAdminDashboard = async (req, res) => {
    try {
        // 1. Get total number of users
        const totalUsers = await User.count();

        // 2. Calculate total available balance from financial_details
        const totalBalance = await FinancialDetails.sum('wallet');

        // 3. Calculate total payout (sum of merchant charges for completed payout transactions)
        const totalPayout = await TransactionCharges.sum('merchant_charge', {
            where: {
                transaction_type: 'payout',
                status: 'completed'
            }
        });

        // 4. Calculate today's payout
        const todayPayout = await TransactionCharges.sum('merchant_charge', {
            where: {
                transaction_type: 'payout',
                status: 'completed',
                created_at: {
                    [Op.gte]: new Date().setHours(0, 0, 0, 0)
                }
            }
        });

        // 5. Calculate total payin (sum of merchant charges for completed payin transactions)
        const totalPayin = await TransactionCharges.sum('merchant_charge', {
            where: {
                transaction_type: 'payin',
                status: 'completed'
            }
        });

        // 6. Calculate today's payin
        const todayPayin = await TransactionCharges.sum('merchant_charge', {
            where: {
                transaction_type: 'payin',
                status: 'completed',
                created_at: {
                    [Op.gte]: new Date().setHours(0, 0, 0, 0)
                }
            }
        });

        // 7. Calculate total profit (sum of total payin and total payout)
        const totalProfit = (totalPayin || 0) + (totalPayout || 0);

        // 8. Calculate today's profit (sum of today's payin and today's payout)
        const todayProfit = (todayPayin || 0) + (todayPayout || 0);

        // 9. Calculate last 7 days payout and payin data
        const last7DaysData = [];
        for (let i = 6; i >= 0; i--) {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - i);
            startDate.setHours(0, 0, 0, 0);
            
            const endDate = new Date(startDate);
            endDate.setHours(23, 59, 59, 999);

            const dayPayout = await TransactionCharges.sum('merchant_charge', {
                where: {
                    transaction_type: 'payout',
                    status: 'completed',
                    created_at: {
                        [Op.between]: [startDate, endDate]
                    }
                }
            });

            const dayPayin = await TransactionCharges.sum('merchant_charge', {
                where: {
                    transaction_type: 'payin',
                    status: 'completed',
                    created_at: {
                        [Op.between]: [startDate, endDate]
                    }
                }
            });

            last7DaysData.push({
                date: startDate.toISOString().split('T')[0],
                payout: dayPayout || 0,
                payin: dayPayin || 0,
                profit: (dayPayout || 0) + (dayPayin || 0)
            });
        }

        // 10. Get recent payout transactions from MongoDB
        const recentPayoutTransactions = await PayoutTransaction.find()
            .sort({ createdAt: -1 })
            .limit(10);


        const dashboardData = {
            totalUsers: totalUsers || 0,
            totalBalance: totalBalance || 0,
            totalPayout: totalPayout || 0,
            todayPayout: todayPayout || 0,
            totalPayin: totalPayin || 0,
            todayPayin: todayPayin || 0,
            totalProfit: totalProfit || 0,
            todayProfit: todayProfit || 0,
            last7DaysData: last7DaysData,
            recentPayoutTransactions: recentPayoutTransactions.map(transaction => ({
                transaction_id: transaction.transaction_id,
                amount: transaction.amount,
                status: transaction.status,
                reference_id: transaction.reference_id,
                created_at: transaction.createdAt,
                user_name: transaction.user?.id?.name || transaction.user?.name || 'N/A',
                user_email: transaction.user?.id?.email || transaction.user?.email || 'N/A',
                beneficiary_name: transaction.beneficiary_details?.beneficiary_name || 'N/A',
                account_number: transaction.beneficiary_details?.account_number || 'N/A',
                bank_name: transaction.beneficiary_details?.bank_name || 'N/A',
                total_charges: transaction.charges?.total_charges || 0,
                remark: transaction.remark || 'N/A'
            }))
        };

        res.json({
            success: true,
            data: dashboardData
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard data'
        });
    }
};

const getWalletTransactions = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 10,
            type,
            status,
            startDate,
            endDate,
            search
        } = req.query;

        // Convert page and pageSize to numbers
        const pageNumber = parseInt(page);
        const limit = parseInt(pageSize);
        const skip = (pageNumber - 1) * limit;

        // Build filter object
        const filter = {};

        if (type && type !== 'all') {
            filter.transaction_type = type;
        }

        if (status && status !== 'all') {
            filter.status = status;
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(endDate);
            }
        }

        // Add search condition if search term is provided
        if (search) {
            filter.$or = [
                { 'user.name': { $regex: search, $options: 'i' } },
                { transaction_id: { $regex: search, $options: 'i' } },
                { reference_id: { $regex: search, $options: 'i' } }
            ];
        }

        // Get total count for pagination
        const totalCount = await UserTransaction.countDocuments(filter);

        // Get paginated transactions
        const transactions = await UserTransaction.find(filter)
            .sort({ createdAt: -1 }) // Sort by date in descending order
            .skip(skip)
            .limit(limit);

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = pageNumber < totalPages;
        const hasPrevPage = pageNumber > 1;

        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    currentPage: pageNumber,
                    totalPages,
                    totalItems: totalCount,
                    pageSize: limit,
                    hasNextPage,
                    hasPrevPage
                }
            }
        });
    } catch (error) {
        console.error('Error fetching wallet transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching wallet transactions',
            error: error.message
        });
    }
};

// Settle amount for a user
const settleAmount = async (req, res) => {
    try {
        const { user_id, settlement_amount, remark } = req.body;

        if (!user_id || !settlement_amount || settlement_amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid input parameters'
            });
        }

        // Start a transaction
        const result = await sequelize.transaction(async (t) => {
            // Get user's financial details
            const financialDetails = await FinancialDetails.findOne({
                where: { user_id },
                transaction: t,
                lock: true
            });

            if (!financialDetails) {
                throw new Error('Financial details not found');
            }

            const walletBalance = parseFloat(financialDetails.wallet) || 0;
            const settlementBalance = parseFloat(financialDetails.settlement) || 0;
            const amount = parseFloat(settlement_amount);

            // Validate wallet balance
            if (walletBalance < amount) {
                throw new Error('Insufficient wallet balance');
            }

            // Update financial details
            await financialDetails.update({
                wallet: walletBalance - amount,
                settlement: settlementBalance + amount
            }, { transaction: t });

            // Create settlement transaction record
            const settlementTransaction = await SettlementTransaction.create({
                user_id,
                amount,
                wallet_balance_before: walletBalance,
                wallet_balance_after: walletBalance - amount,
                settlement_balance_before: settlementBalance,
                settlement_balance_after: settlementBalance + amount,
                status: 'completed',
                remark: remark || 'Settlement processed',
                created_by: req.user.id,
                updated_by: req.user.id
            }, { transaction: t });

            return {
                financialDetails,
                settlementTransaction
            };
        });

        res.json({
            success: true,
            message: 'Settlement processed successfully',
            data: {
                wallet_balance: result.financialDetails.wallet,
                settlement_balance: result.financialDetails.settlement,
                transaction: result.settlementTransaction
            }
        });
    } catch (error) {
        console.error('Error processing settlement:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error processing settlement'
        });
    }
};

// Get settlement history for a user
const getSettlementHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, pageSize = 10 } = req.query;

        const offset = (page - 1) * pageSize;
        const limit = parseInt(pageSize);

        // Get total count
        const totalCount = await SettlementTransaction.count({
            where: { user_id: userId }
        });

        // Get paginated settlement transactions
        const transactions = await SettlementTransaction.findAll({
            where: { user_id: userId },
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['name', 'user_name']
                },
                {
                    model: User,
                    as: 'updater',
                    attributes: ['name', 'user_name']
                }
            ],
            order: [['created_at', 'DESC']],
            offset,
            limit
        });

        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalCount / pageSize),
                    totalItems: totalCount,
                    pageSize: limit
                }
            }
        });
    } catch (error) {
        console.error('Error fetching settlement history:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching settlement history'
        });
    }
};

module.exports = {
  getAllUsers,
  getAllAgents,
  getUserDetails,
  getAgentDetails,
  getAgentUsers,
  addOrUpdateMerchantDetails,
  getUserMerchantDetails,
  addMerchantCharges,
  updateMerchantCharges,
  getUserMerchantCharges,
  updateUserMerchantCharges,
  updateMerchantCharge,
  updateUserDetails,
  getUserCallbacks,
  updateUserWallet,
  getUserWallet,
  getUserIPs,
  addUserIP,
  removeUserIP,
  getPlatformCharges,
  addPlatformCharge,
  removePlatformCharge,
  deleteMerchantCharge,
  updateUserPayinCallback,
  updateUserPayoutCallback,
  getAdminDashboard,
  getWalletTransactions,
  settleAmount,
  getSettlementHistory
}; 