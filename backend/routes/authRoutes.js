import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/user.js';
import { signToken, setOTP, verifyOTP, generateOTP } from '../utils/auth.js';

const router = express.Router();

// ─────────────────────────────────────────
// POST /api/auth/signup
// Body: { name, phone, password, role? }
// ─────────────────────────────────────────
router.post('/signup', async (req, res, next) => {
    try {
        const { name, phone, email, password, role } = req.body;

        if (!phone) return res.status(400).json({ message: 'phone is required' });
        if (!password || password.length < 6)
            return res.status(400).json({ message: 'password must be at least 6 characters' });

        const existing = await User.findOne({ phone });
        if (existing) return res.status(409).json({ message: 'Phone already registered' });

        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({
            name,
            phone,
            email: email || undefined,
            password: hashed,
            role: role === 'tailor' ? 'tailor' : 'user'   // only allow user|tailor self-signup; admin created manually
        });

        const token = signToken({ _id: user._id, phone: user.phone, email: user.email, role: user.role });
        res.status(201).json({ token, user: { _id: user._id, name: user.name, phone: user.phone, role: user.role } });
    } catch (err) {
        next(err);
    }
});

// ─────────────────────────────────────────
// POST /api/auth/login
// Body: { phone, password }
// ─────────────────────────────────────────
router.post('/login', async (req, res, next) => {
    try {
        const { phone, password } = req.body;

        if (!phone || !password)
            return res.status(400).json({ message: 'phone and password are required' });

        const user = await User.findOne({ phone });
        if (!user) return res.status(401).json({ message: 'Invalid phone or password' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: 'Invalid phone or password' });

        const token = signToken({ _id: user._id, phone: user.phone, email: user.email, role: user.role });
        res.json({ token, user: { _id: user._id, name: user.name, phone: user.phone, role: user.role } });
    } catch (err) {
        next(err);
    }
});

// ─────────────────────────────────────────
// POST /api/auth/otp/send
// Body: { phone }
// Sends OTP (logs to console; wire to SMS provider in production)
// ─────────────────────────────────────────
router.post('/otp/send', async (req, res, next) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ message: 'phone is required' });

        const otp = generateOTP();
        setOTP(phone, otp);

        // TODO in production: call Twilio/MSG91 to SMS this OTP
        console.log(`[OTP] Phone: ${phone}  OTP: ${otp}`);

        res.json({ message: 'OTP sent', debug_otp: process.env.NODE_ENV !== 'production' ? otp : undefined });
    } catch (err) {
        next(err);
    }
});

// ─────────────────────────────────────────
// POST /api/auth/otp/verify
// Body: { phone, otp }
// ─────────────────────────────────────────
router.post('/otp/verify', async (req, res, next) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) return res.status(400).json({ message: 'phone and otp are required' });

        const result = verifyOTP(phone, otp);
        if (!result.valid) return res.status(400).json({ message: result.reason });

        // Find or create user by phone (for OTP-only signup flow)
        let user = await User.findOne({ phone });
        if (!user) user = await User.create({ phone, role: 'user' });

        const token = signToken({ _id: user._id, phone: user.phone, email: user.email, role: user.role });
        res.json({ token, user: { _id: user._id, name: user.name, phone: user.phone, role: user.role } });
    } catch (err) {
        next(err);
    }
});

export default router;
