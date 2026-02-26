import mongoose from 'mongoose';

const tailorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  shopPhotoUrl: { type: String },
  address: { type: String },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }   // [lng, lat]
  },
  services: {
    // FIX: original seed used services:[String]; align schema to numeric avg mins
    lightAvgMins: { type: Number, default: 30 },
    heavyAvgMins: { type: Number, default: 120 },
    // Keep a human-readable label array for display purposes
    labels: { type: [String], default: [] }
  },
  isAvailable: { type: Boolean, default: true },
  currentOrders: { type: Number, default: 0 },
  waitingListCount: { type: Number, default: 0 },
  rating: { type: Number, default: 5 },
  priceFrom: { type: Number, default: 0 },     // FIX: was in seed but missing from schema
  createdAt: { type: Date, default: Date.now }
});

// 2dsphere index — required for $geoNear aggregation
tailorSchema.index({ location: '2dsphere' });

export default mongoose.model('Tailor', tailorSchema);
