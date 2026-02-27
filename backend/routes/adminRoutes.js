import express from 'express';
import Tailor from '../models/tailors.js';
import Job from '../models/job.js';
import User from '../models/user.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require valid JWT and admin role
router.use(verifyToken, requireRole('admin'));

// ─────────────────────────────────────────
// GET /api/admin/metrics
// ─────────────────────────────────────────
router.get('/metrics', async (req, res, next) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [totalTailors, totalUsers, ordersToday, revenueResult] = await Promise.all([
      Tailor.countDocuments(),
      User.countDocuments({ role: 'user' }),
      Job.countDocuments({ createdAt: { $gte: startOfDay } }),
      Job.aggregate([
        { $match: { createdAt: { $gte: startOfDay }, status: { $nin: ['cancelled'] } } },
        { $group: { _id: null, total: { $sum: '$price' } } }
      ])
    ]);

    const commissionToday = revenueResult[0]?.total
      ? Math.round(revenueResult[0].total * 0.1)   // 10% commission rate placeholder
      : 0;

    res.json({ totalTailors, totalUsers, ordersToday, commissionToday });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────
// GET /api/admin/tailors
// ─────────────────────────────────────────
router.get('/tailors', async (req, res, next) => {
  try {
    const tailors = await Tailor.find().limit(200).sort({ createdAt: -1 });
    res.json(tailors);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────
// GET /api/admin/users
// ─────────────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find().select('-password').limit(200).sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────
// GET /api/admin/jobs
// ─────────────────────────────────────────
router.get('/jobs', async (req, res, next) => {
  try {
    const jobs = await Job.find()
      .populate('tailor', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(jobs);
  } catch (err) {
    next(err);
  }
});

export default router;
