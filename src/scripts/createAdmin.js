const { sequelize } = require('../config/database');
const UserModel = require('../models/User');
const User = UserModel(sequelize);

const createAdmin = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection established successfully.');

        // Check if admin already exists
        const existingAdmin = await User.findOne({
            where: { user_type: 'admin' }
        });

        if (existingAdmin) {
            console.log('Admin user already exists');
            process.exit(0);
        }

        // Create admin user
        const admin = await User.create({
            name: 'Admin User',
            user_name: 'admin',
            password: 'admin123', // This will be hashed by the model hook
            email: 'admin@example.com',
            user_type: 'admin',
            created_by: null
        });

        console.log('Admin user created successfully:', admin.user_name);
        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin(); 