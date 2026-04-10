const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const addressSchema = new mongoose.Schema({
  street: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  pincode: { type: String, trim: true, match: /^\d{6}$/ },
  country: { type: String, trim: true, default: 'India' },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false,
  },
  role: {
    type: String,
    required: true,
    enum: ['dealer', 'cfa', 'admin'],
    immutable: true,
  },
  roleLabel: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\d{10}$/, 'Phone must be 10 digits'],
  },
  address: addressSchema,
  cfaEntity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CFA',
    index: true,
  },
  dealerEntity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dealer',
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ cfaEntity: 1 });
userSchema.index({ dealerEntity: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
