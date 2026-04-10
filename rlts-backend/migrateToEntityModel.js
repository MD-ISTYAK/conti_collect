const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');
const Dealer = require('./src/models/Dealer');
const CFA = require('./src/models/CFA');
const Complaint = require('./src/models/Complaint');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const migrate = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rlts';
    console.log(`Connecting to ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.\n');

    // MIGRATION STEP 1: Process CFAs
    const oldPrimaryCfas = await User.find({ role: 'cfa', isPrimary: true });
    console.log(`Found ${oldPrimaryCfas.length} primary CFA users.`);

    for (const cfaUser of oldPrimaryCfas) {
      const code = cfaUser.code || `CFA-${cfaUser._id.toString().substring(0, 6)}`.toUpperCase();
      let cfaEntity = await CFA.findOne({ code });
      
      if (!cfaEntity) {
        cfaEntity = await CFA.create({
          code,
          company: cfaUser.businessName || cfaUser.name,
          region: cfaUser.region,
          isActive: cfaUser.isActive,
        });
        console.log(`Created CFA Entity: ${cfaEntity.code}`);
      }

      // Link User to Entity
      cfaUser.cfaEntity = cfaEntity._id;
      cfaUser.roleLabel = 'sales-office-admin';
      await cfaUser.save();

      // Link Sub-Users
      const subUsers = await User.find({ role: 'cfa', parentUserId: cfaUser._id });
      for (const sub of subUsers) {
        sub.cfaEntity = cfaEntity._id;
        sub.roleLabel = 'sales-office-staff';
        await sub.save();
      }

      // Update Complaints where assigned to this CFA
      const result = await Complaint.updateMany(
        { cfaId: cfaUser._id },
        { $set: { cfaEntity: cfaEntity._id } }
      );
      if (result.modifiedCount > 0) {
        console.log(`Updated ${result.modifiedCount} complaints for CFA ${cfaEntity.code}`);
      }
    }

    // MIGRATION STEP 2: Process Dealers
    const oldPrimaryDealers = await User.find({ role: 'dealer', isPrimary: true });
    console.log(`\nFound ${oldPrimaryDealers.length} primary Dealer users.`);

    for (const dealerUser of oldPrimaryDealers) {
      const code = dealerUser.code || `DLR-${dealerUser._id.toString().substring(0, 6)}`.toUpperCase();
      let dealerEntity = await Dealer.findOne({ code });

      if (!dealerEntity) {
        dealerEntity = await Dealer.create({
          code,
          company: dealerUser.businessName || dealerUser.name,
          region: dealerUser.region,
          isActive: dealerUser.isActive,
        });
        console.log(`Created Dealer Entity: ${dealerEntity.code}`);
      }

      // Link User to Entity
      dealerUser.dealerEntity = dealerEntity._id;
      dealerUser.roleLabel = 'dealer-admin';
      await dealerUser.save();

      // Link Sub-Users
      const subUsers = await User.find({ role: 'dealer', parentUserId: dealerUser._id });
      for (const sub of subUsers) {
        sub.dealerEntity = dealerEntity._id;
        sub.roleLabel = 'dealer-staff';
        await sub.save();
      }

      // Update Complaints from this Dealer
      const result = await Complaint.updateMany(
        { dealerId: dealerUser._id },
        { $set: { dealerEntity: dealerEntity._id } }
      );
      if (result.modifiedCount > 0) {
        console.log(`Updated ${result.modifiedCount} complaints for Dealer ${dealerEntity.code}`);
      }
    }

    console.log('\nMigration to Entity Model completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
