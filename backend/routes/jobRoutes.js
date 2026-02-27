import express from 'express';
import Job from '../models/job.js';
import Tailor from '../models/tailors.js';
import upload from '../middleware/upload.js';
import { uploadBuffer } from '../config/cloudinary.js';

const router = express.Router();

// ─────────────────────────────────────────
// Valid status transitions enforced server-side
// ─────────────────────────────────────────
const TRANSITIONS = {
  accept: { from: ['requested'], to: 'accepted' },
  start: { from: ['accepted'], to: 'in_progress' },
  finish: { from: ['in_progress'], to: 'finished_by_tailor' },
  confirm: { from: ['finished_by_tailor', 'awaiting_user_confirmation'], to: 'rider_assigned' },
  reopen: { from: ['finished_by_tailor', 'awaiting_user_confirmation'], to: 'in_progress' },
  deliver: { from: ['rider_assigned'], to: 'delivered' },
  close: { from: ['delivered'], to: 'closed' },
  cancel: { from: ['requested', 'accepted'], to: 'cancelled' }
};

const applyTransition = async (req, res, next, action, extraFields = {}) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const rule = TRANSITIONS[action];
    if (!rule.from.includes(job.status)) {
      return res.status(400).json({
        message: `Cannot ${action} a job with status '${job.status}'. Allowed from: ${rule.from.join(', ')}`
      });
    }

    job.status = rule.to;
    Object.assign(job, extraFields);
    await job.save();

    // Emit socket event if io is available
    const io = req.app.get('io');
    if (io) {
      io.to(job._id.toString()).emit('job:status_changed', {
        jobId: job._id,
        newStatus: job.status
      });
    }

    res.json(job);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────
// POST /api/jobs
// Body: { userEmail, tailorId, workType }
// ─────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { userEmail, tailorId, workType } = req.body;
    if (!userEmail || !tailorId || !workType) {
      return res.status(400).json({ message: 'userEmail, tailorId, and workType are required' });
    }
    if (!['light', 'heavy'].includes(workType)) {
      return res.status(400).json({ message: "workType must be 'light' or 'heavy'" });
    }

    const tailor = await Tailor.findById(tailorId);
    if (!tailor) return res.status(404).json({ message: 'Tailor not found' });
    if (!tailor.isAvailable) return res.status(400).json({ message: 'Tailor is not currently available' });

    const avgMins = workType === 'heavy'
      ? (tailor.services.heavyAvgMins || 120)
      : (tailor.services.lightAvgMins || 30);

    const estimatedMinutes = (tailor.waitingListCount || 0) * avgMins + avgMins;

    const job = await Job.create({
      userEmail,
      tailor: tailorId,
      workType,
      estimatedMinutes,
      status: 'requested'
    });

    // Increment the waiting list count
    await Tailor.findByIdAndUpdate(tailorId, { $inc: { waitingListCount: 1 } });

    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
});

// NOTE: Specific routes (/user/:email, /tailor/:id) must come BEFORE /:id
// to avoid Express matching 'user' or 'tailor' as an ObjectId.

// ─────────────────────────────────────────
// GET /api/jobs/user/:email
// Returns all jobs for a customer
// ─────────────────────────────────────────
router.get('/user/:email', async (req, res, next) => {
  try {
    const jobs = await Job.find({ userEmail: req.params.email })
      .populate('tailor', 'name shopPhotoUrl address rating')
      .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────
// GET /api/jobs/tailor/:id
// Returns all jobs for a tailor
// ─────────────────────────────────────────
router.get('/tailor/:id', async (req, res, next) => {
  try {
    const jobs = await Job.find({ tailor: req.params.id })
      .populate('tailor', 'name shopPhotoUrl address rating')
      .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────
// GET /api/jobs/:id
// Returns a single job with populated tailor
// ─────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).populate('tailor');
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────
// POST /api/jobs/:id/accept  (Tailor action)
// ─────────────────────────────────────────
router.post('/:id/accept', async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.status !== 'requested') {
      return res.status(400).json({ message: `Cannot accept a job with status '${job.status}'` });
    }

    job.status = 'accepted';
    job.acceptedAt = new Date();
    await job.save();

    // Decrement waiting list; increment currentOrders
    await Tailor.findByIdAndUpdate(job.tailor, {
      $inc: { waitingListCount: -1, currentOrders: 1 }
    });

    const io = req.app.get('io');
    if (io) io.to(job._id.toString()).emit('job:status_changed', { jobId: job._id, newStatus: job.status });

    res.json(job);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────
// POST /api/jobs/:id/start  (Tailor action)
// ─────────────────────────────────────────
router.post('/:id/start', async (req, res, next) => {
  await applyTransition(req, res, next, 'start', { startedAt: new Date() });
});

// ─────────────────────────────────────────
// POST /api/jobs/:id/finish  (Tailor action — with image upload)
// Multipart/form-data: field name 'images' (multiple)
// ─────────────────────────────────────────
router.post('/:id/finish', upload.array('images', 10), async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (!['in_progress'].includes(job.status)) {
      return res.status(400).json({
        message: `Cannot finish a job with status '${job.status}'. Must be in_progress.`
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'At least one proof image is required to finish a job' });
    }

    // Upload each file buffer to Cloudinary
    let imageUrls = [];
    try {
      imageUrls = await Promise.all(
        req.files.map(f => uploadBuffer(f.buffer, 'stitchup/job-proofs'))
      );
    } catch (uploadErr) {
      // If Cloudinary is not configured, fall back to accepting base64 from body
      console.warn('[UPLOAD] Cloudinary not configured, falling back to body.imageUrls');
      imageUrls = req.body.imageUrls || [];
    }

    job.status = 'finished_by_tailor';
    job.finishedAt = new Date();
    job.images = [...(job.images || []), ...imageUrls];
    job.needsRevision = false;
    await job.save();

    // Decrement currentOrders on tailor
    await Tailor.findByIdAndUpdate(job.tailor, { $inc: { currentOrders: -1 } });

    const io = req.app.get('io');
    if (io) io.to(job._id.toString()).emit('job:status_changed', { jobId: job._id, newStatus: job.status, images: job.images });

    res.json(job);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────
// POST /api/jobs/:id/confirm  (Customer action — satisfied)
// Body: { deliveryDate, deliveryTime }
// ─────────────────────────────────────────
router.post('/:id/confirm', async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (!['finished_by_tailor', 'awaiting_user_confirmation'].includes(job.status)) {
      return res.status(400).json({
        message: `Cannot confirm a job with status '${job.status}'`
      });
    }

    const { deliveryDate, deliveryTime } = req.body;
    if (!deliveryDate || !deliveryTime) {
      return res.status(400).json({ message: 'deliveryDate and deliveryTime are required' });
    }

    // Mock rider assignment (replace with real logistics API call)
    const mockRider = { name: 'Rahul', vehicle: 'MH12-AB-1234', phone: '+91 98765 43210', etaMin: 12 };

    job.status = 'rider_assigned';
    job.confirmedAt = new Date();
    job.deliveryDate = deliveryDate;
    job.deliveryTime = deliveryTime;
    job.needsRevision = false;
    job.riderInfo = mockRider;
    await job.save();

    const io = req.app.get('io');
    if (io) io.to(job._id.toString()).emit('job:status_changed', {
      jobId: job._id, newStatus: job.status, riderInfo: mockRider
    });

    res.json(job);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────
// POST /api/jobs/:id/reopen  (Customer action — not satisfied)
// Sends job back to tailor for revision
// ─────────────────────────────────────────
router.post('/:id/reopen', async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (!['finished_by_tailor', 'awaiting_user_confirmation'].includes(job.status)) {
      return res.status(400).json({
        message: `Cannot reopen a job with status '${job.status}'`
      });
    }

    job.status = 'in_progress';
    job.needsRevision = true;
    // Re-increment currentOrders since tailor has active work again
    await Tailor.findByIdAndUpdate(job.tailor, { $inc: { currentOrders: 1 } });
    await job.save();

    const io = req.app.get('io');
    if (io) io.to(job._id.toString()).emit('job:status_changed', {
      jobId: job._id, newStatus: job.status, needsRevision: true
    });

    res.json(job);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────
// POST /api/jobs/:id/deliver  (Rider/system action)
// ─────────────────────────────────────────
router.post('/:id/deliver', async (req, res, next) => {
  await applyTransition(req, res, next, 'deliver', { deliveredAt: new Date() });
});

// ─────────────────────────────────────────
// POST /api/jobs/:id/cancel
// Body: { reason? }
// Allowed only in requested or accepted states
// ─────────────────────────────────────────
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (!['requested', 'accepted'].includes(job.status)) {
      return res.status(400).json({ message: 'Job can only be cancelled before it starts' });
    }

    const prevStatus = job.status;
    job.status = 'cancelled';
    await job.save();

    // Restore tailor counters depending on what state we cancelled from
    if (prevStatus === 'requested') {
      await Tailor.findByIdAndUpdate(job.tailor, { $inc: { waitingListCount: -1 } });
    } else if (prevStatus === 'accepted') {
      await Tailor.findByIdAndUpdate(job.tailor, { $inc: { currentOrders: -1 } });
    }

    res.json(job);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────
// POST /api/jobs/:id/message
// Body: { sender, text }
// ─────────────────────────────────────────
router.post('/:id/message', async (req, res, next) => {
  try {
    const { sender, text } = req.body;
    if (!sender || !text) {
      return res.status(400).json({ message: 'sender and text are required' });
    }

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const message = { sender, text, createdAt: new Date() };
    job.messages.push(message);
    await job.save();

    const io = req.app.get('io');
    if (io) {
      io.to(job._id.toString()).emit('job:new_message', {
        jobId: job._id,
        message
      });
    }

    res.json(job);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────
// POST /api/jobs/:id/image
// Body: { url } — for adding a single image URL (legacy/frontend direct)
// ─────────────────────────────────────────
router.post('/:id/image', async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ message: 'url is required' });

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    job.images.push(url);
    await job.save();
    res.json(job);
  } catch (err) {
    next(err);
  }
});

export default router;
