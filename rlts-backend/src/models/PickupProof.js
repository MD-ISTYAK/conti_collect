const mongoose = require('mongoose');

const gpsLocationSchema = new mongoose.Schema({
  lat: { type: Number, required: true, min: -90, max: 90 },
  lng: { type: Number, required: true, min: -180, max: 180 },
  accuracy: { type: Number },
  address: { type: String, trim: true },
}, { _id: false });

const pickupProofSchema = new mongoose.Schema({
  complaintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
    required: true,
    unique: true,
    index: true,
  },
  pickedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  pickupPhotos: {
    type: [String],
    validate: {
      validator: function (v) {
        return v.length >= 1 && v.length <= 10;
      },
      message: 'Between 1 and 10 pickup photos are required',
    },
  },
  signatureImage: {
    type: String,
    required: [true, 'Dealer signature is required'],
  },
  dealerName: {
    type: String,
    required: [true, 'Dealer name at pickup is required'],
    trim: true,
  },
  gpsLocation: {
    type: gpsLocationSchema,
    required: [true, 'GPS location is required'],
  },
  pickupTime: {
    type: Date,
    required: true,
    default: Date.now,
  },
  warehousePhotos: {
    type: [String],
    validate: {
      validator: function (v) {
        return v.length <= 10;
      },
      message: 'Maximum 10 warehouse photos',
    },
  },
  receivedQuantity: {
    type: Number,
    min: 0,
  },
  conditionNotes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('PickupProof', pickupProofSchema);
