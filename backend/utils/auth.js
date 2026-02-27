import jwt from 'jsonwebtoken';

/**
 * Sign a JWT for a user.
 * @param {Object} payload  - { _id, email, phone, role }
 * @returns {string} signed token
 */
export const signToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

/**
 * In-memory OTP store.
 * Structure: { phone: { otp: '123456', expiresAt: Date } }
 * Fine for hackathon/demo; replace with Redis in production.
 */
const otpStore = new Map();

export const setOTP = (phone, otp) => {
    otpStore.set(phone, {
        otp,
        expiresAt: Date.now() + 5 * 60 * 1000   // 5 minutes
    });
};

export const verifyOTP = (phone, otp) => {
    const record = otpStore.get(phone);
    if (!record) return { valid: false, reason: 'OTP not found or not requested' };
    if (Date.now() > record.expiresAt) {
        otpStore.delete(phone);
        return { valid: false, reason: 'OTP expired' };
    }
    if (record.otp !== otp) return { valid: false, reason: 'Incorrect OTP' };
    otpStore.delete(phone);
    return { valid: true };
};

export const generateOTP = () =>
    Math.floor(100000 + Math.random() * 900000).toString();
