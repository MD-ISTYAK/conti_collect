require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      process.exit(0);
    }

    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@conticollect.com',
      password: 'Admin@123',
      role: 'admin',
      phone: '9999999999',
      businessName: 'Conti Collect HQ',
      isActive: true,
    });

    console.log('✅ Admin user created successfully:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: Admin@123`);
    console.log(`   Role: admin`);
    
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
};

seedAdmin();
