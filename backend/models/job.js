import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  tailor: { type: mongoose.Schema.Types.ObjectId, ref: 'Tailor', required: true },
  workType: { type: String, enum: ['light', 'heavy'], required: true },
  status: {
    type: String,
    enum: [
      'requested',
      'accepted',
      'in_progress',
      'finished_by_tailor',
      'awaiting_user_confirmation',
      'rider_assigned',
      'delivered',
      'closed',
      'cancelled'
    ],
    default: 'requested'
  },
  estimatedMinutes: { type: Number },
  images: [{ type: String }],
  messages: [{
    sender: { type: String },
    text: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  price: { type: Number },
  needsRevision: { type: Boolean, default: false },   // FIX: was missing from original schema
  deliveryDate: { type: String },                    // set when customer schedules delivery
  deliveryTime: { type: String },                    // set when customer schedules delivery
  riderInfo: {                                           // populated when rider is assigned
    name: { type: String },
    vehicle: { type: String },
    phone: { type: String },
    etaMin: { type: Number }
  },
  createdAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date },
  startedAt: { type: Date },
  finishedAt: { type: Date },
  confirmedAt: { type: Date },
  deliveredAt: { type: Date }
});

export default mongoose.model('Job', jobSchema);
