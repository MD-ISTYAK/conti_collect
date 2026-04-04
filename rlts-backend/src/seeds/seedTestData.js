require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const CFARegion = require('../models/CFARegion');

const seedTestData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Create test dealer
    let dealer = await User.findOne({ email: 'dealer@test.com' });
    if (!dealer) {
      dealer = await User.create({
        name: 'Rajesh Kumar',
        email: 'dealer@test.com',
        password: 'Dealer@123',
        role: 'dealer',
        phone: '9876543210',
        businessName: 'Kumar Auto Parts',
        address: {
          street: '42 MG Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          country: 'India',
        },
        region: 'Mumbai',
        isActive: true,
      });
      console.log('✅ Test dealer created: dealer@test.com / Dealer@123');
    } else {
      console.log('ℹ️  Dealer already exists');
    }

    // Create test CFA
    let cfa = await User.findOne({ email: 'cfa@test.com' });
    if (!cfa) {
      cfa = await User.create({
        name: 'Amit Sharma',
        email: 'cfa@test.com',
        password: 'Cfa@1234',
        role: 'cfa',
        phone: '9876543211',
        businessName: 'Sharma Logistics',
        address: {
          street: '15 Industrial Area',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400050',
          country: 'India',
        },
        region: 'Mumbai',
        isActive: true,
      });
      console.log('✅ Test CFA created: cfa@test.com / Cfa@1234');

      // Assign region to CFA
      await CFARegion.create({
        cfaId: cfa._id,
        regionName: 'Mumbai Region',
        states: ['Maharashtra'],
        cities: ['Mumbai', 'Thane', 'Navi Mumbai'],
        pincodes: ['400001', '400050', '400601'],
      });
      console.log('✅ CFA region assigned: Mumbai Region');
    } else {
      console.log('ℹ️  CFA already exists');
    }

    console.log('\n📋 Test Credentials:');
    console.log('─────────────────────────────');
    console.log('Admin:  admin@conticollect.com / Admin@123');
    console.log('Dealer: dealer@test.com / Dealer@123');
    console.log('CFA:    cfa@test.com / Cfa@1234');
    
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
};

seedTestData();
