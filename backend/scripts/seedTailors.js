// Run: node scripts/seedTailors.js
// Inserts demo tailor documents into the `tailors` collection.
// FIX: aligned seed data with updated Tailor schema (services.lightAvgMins/heavyAvgMins + labels)

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Tailor from '../models/tailors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const connectUri = MONGO_URI.includes('?')
  ? MONGO_URI
  : MONGO_URI.replace(/\/?$/, '/stichUP');

const tailors = [
  {
    name: 'Quick Stitch',
    email: 'quickstitch@example.com',
    phone: '9000000001',
    shopPhotoUrl: 'https://images.unsplash.com/photo-1520975917765-9763f2a7b3d6?auto=format&fit=crop&w=800&q=80',
    address: 'Koramangala, Bengaluru',
    services: {
      lightAvgMins: 20,
      heavyAvgMins: 90,
      labels: ['Stitching', 'Alterations']
    },
    isAvailable: true,
    currentOrders: 3,
    waitingListCount: 2,
    priceFrom: 120,
    rating: 4.7,
    location: { type: 'Point', coordinates: [77.5946, 12.9716] }
  },
  {
    name: 'Elegant Tailors',
    email: 'elegant@example.com',
    phone: '9000000002',
    shopPhotoUrl: 'https://images.unsplash.com/photo-1542736667-069246bdbc45?auto=format&fit=crop&w=800&q=80',
    address: 'Bandra West, Mumbai',
    services: {
      lightAvgMins: 30,
      heavyAvgMins: 150,
      labels: ['Custom Suits', 'Wedding Dresses']
    },
    isAvailable: false,
    currentOrders: 5,
    waitingListCount: 0,
    priceFrom: 450,
    rating: 4.9,
    location: { type: 'Point', coordinates: [72.8777, 19.0760] }
  },
  {
    name: 'Budget Alterations',
    email: 'budget@example.com',
    phone: '9000000003',
    shopPhotoUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=800&q=80',
    address: 'Connaught Place, New Delhi',
    services: {
      lightAvgMins: 15,
      heavyAvgMins: 60,
      labels: ['Alterations']
    },
    isAvailable: true,
    currentOrders: 1,
    waitingListCount: 1,
    priceFrom: 80,
    rating: 4.5,
    location: { type: 'Point', coordinates: [77.2090, 28.6139] }
  },
  {
    name: 'Master Tailor Co.',
    email: 'mastertailor@example.com',
    phone: '9000000004',
    shopPhotoUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=800&q=80',
    address: 'T. Nagar, Chennai',
    services: {
      lightAvgMins: 25,
      heavyAvgMins: 120,
      labels: ['Stitching', 'Embroidery', 'Alterations']
    },
    isAvailable: true,
    currentOrders: 0,
    waitingListCount: 0,
    priceFrom: 200,
    rating: 4.8,
    location: { type: 'Point', coordinates: [80.2318, 13.0418] }
  }
];

async function seed() {
  try {
    console.log('Connecting to', connectUri);
    await mongoose.connect(connectUri);

    const emails = tailors.map(t => t.email);
    await Tailor.deleteMany({ email: { $in: emails } });

    const result = await Tailor.insertMany(tailors);
    console.log(`✅ Inserted ${result.length} tailor documents.`);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

seed();
