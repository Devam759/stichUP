import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  password: { type: String },              // bcrypt hashed
  role: { type: String, enum: ['user', 'tailor', 'admin'], default: 'user' },
  address: { type: String },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }   // [lng, lat]
  },
  credits: { type: Number, default: 0 },  // FIX: original had creditsUsed/creditLimit refs in route that don't exist
}, { timestamps: true });

userSchema.index({ location: '2dsphere' });

export default mongoose.model('User', userSchema);
