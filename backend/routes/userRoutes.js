import express from 'express';
import User from '../models/user.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// ─────────────────────────────────────────
// GET /api/users/:email
// Returns user by email; creates if not found (backward-compat with existing frontend)
// ─────────────────────────────────────────
router.get('/:email', async (req, res, next) => {
  try {
    let user = await User.findOne({ email: req.params.email }).select('-password');
    if (!user) {
      user = await User.create({ email: req.params.email });
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────
// POST /api/users/update
// FIX: original route referenced creditsUsed/creditLimit which don't exist.
// Correct field is `credits`. This increments credits by the given amount.
// Body: { email, amount? }   defaults to -1 (deduct one credit)
// ─────────────────────────────────────────
router.post('/update', async (req, res, next) => {
  try {
    const { email, amount = -1 } = req.body;
    if (!email) return res.status(400).json({ message: 'email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.credits = (user.credits || 0) + amount;
    await user.save();

    res.json({ message: 'Credits updated', credits: user.credits, user });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────
// GET /api/users/me  (protected)
// Returns the currently authenticated user's profile
// ─────────────────────────────────────────
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
