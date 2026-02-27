import React, { useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import PrimaryButton from '../components/ui/PrimaryButton'
import OTPModal from '../components/OTPModal'
import Toast from '../components/Toast'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

const Signup = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: searchParams.get('role') || 'customer'
  })
  const [errors, setErrors] = useState({})
  const [otpOpen, setOtpOpen] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [toast, setToast] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState(null)
  const [otpLoading, setOtpLoading] = useState(false)

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!form.fullName.trim()) next.fullName = 'Full name is required'
    if (!form.phone || form.phone.replace(/\D/g, '').length < 10) next.phone = 'Valid phone required'
    if (form.email && !/.+@.+\..+/.test(form.email)) next.email = 'Enter a valid email'
    if (!otpVerified) next.otp = 'Please verify your phone number first'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    try {
      const uid = auth.currentUser?.uid
      if (!uid) { setErrors({ form: 'Phone verification required.' }); return }

      const userRef = doc(db, 'users', uid)
      const userSnap = await getDoc(userRef)
      if (userSnap.exists()) { setErrors({ form: 'Account already exists.' }); return }

      const profile = {
        fullName: form.fullName.trim(),
        email: form.email || '',
        phone: form.phone.replace(/\D/g, ''),
        role: form.role,
        createdAt: new Date().toISOString()
      }
      await setDoc(userRef, profile)

      const merged = { id: uid, uid, ...profile }
      localStorage.setItem('currentUser', JSON.stringify(merged))
      window.dispatchEvent(new Event('authChange'))

      setToast(true)
      setTimeout(() => {
        setToast(false)
        navigate(profile.role === 'tailor' ? '/tailor/dashboard' : '/customer')
      }, 800)
    } catch (err) {
      setErrors({ form: 'Failed to create account. Please try again.' })
    }
  }

  const handleGetOtp = async () => {
    if (!form.phone || form.phone.replace(/\D/g, '').length < 10) {
      setErrors({ phone: 'Enter a valid 10-digit phone number' })
      return
    }
    setOtpLoading(true)
    try {
      const formattedPhone = '+91' + form.phone.replace(/\D/g, '')
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' })
      }
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier)
      setConfirmationResult(confirmation)
      setOtpOpen(true)
    } catch (error) {
      if (window.recaptchaVerifier) { try { window.recaptchaVerifier.clear() } catch { } window.recaptchaVerifier = null }
      setErrors({ phone: `Failed to send OTP: ${error.message}` })
    }
    setOtpLoading(false)
  }

  const handleVerifyOtp = async (otp) => {
    if (!otp || otp.length !== 6) return
    try {
      if (!confirmationResult) { setErrors({ phone: 'Session expired.' }); setOtpOpen(false); return }
      await confirmationResult.confirm(otp)
      setOtpVerified(true)
      setOtpOpen(false)
    } catch (error) {
      setErrors({ phone: `Invalid OTP: ${error.message}` })
      setOtpOpen(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-neutral-50">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/">
              <img src="/logo2.png" alt="StitchUp" className="h-10 mx-auto mb-6" />
            </Link>
            <h1 className="text-2xl font-bold text-neutral-900">Create your account</h1>
            <p className="mt-2 text-neutral-500 text-sm">Join StitchUp as a customer or tailor</p>
          </div>

          <form onSubmit={onSubmit} className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm">
            {/* Role toggle */}
            <div className="grid grid-cols-2 rounded-lg border border-neutral-200 overflow-hidden mb-6">
              <button
                type="button"
                onClick={() => { setForm({ ...form, role: 'customer' }); setSearchParams({ role: 'customer' }, { replace: true }) }}
                className={`py-2.5 text-sm font-medium text-center transition-colors ${form.role === 'customer' ? 'bg-[color:var(--color-primary)] text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'}`}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => { setForm({ ...form, role: 'tailor' }); setSearchParams({ role: 'tailor' }, { replace: true }) }}
                className={`py-2.5 text-sm font-medium text-center transition-colors ${form.role === 'tailor' ? 'bg-[color:var(--color-primary)] text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'}`}
              >
                Tailor
              </button>
            </div>

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Full Name</label>
                <input name="fullName" value={form.fullName} onChange={onChange} placeholder="John Doe"
                  className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 outline-none focus:border-[color:var(--color-primary)] focus:ring-1 focus:ring-[color:var(--color-primary)]/20 transition-all" />
                {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Email <span className="text-neutral-400">(optional)</span></label>
                <input name="email" type="email" value={form.email} onChange={onChange} placeholder="you@example.com"
                  className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 outline-none focus:border-[color:var(--color-primary)] focus:ring-1 focus:ring-[color:var(--color-primary)]/20 transition-all" />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Phone Number</label>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2.5 bg-white flex-1 focus-within:border-[color:var(--color-primary)] focus-within:ring-1 focus-within:ring-[color:var(--color-primary)]/20 transition-all">
                    <span className="text-neutral-400 text-sm">+91</span>
                    <input
                      name="phone" value={form.phone}
                      onChange={(e) => { setForm({ ...form, phone: e.target.value }); if (otpVerified) setOtpVerified(false) }}
                      placeholder="98765 43210"
                      className="flex-1 outline-none bg-transparent"
                      maxLength={12}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleGetOtp}
                    disabled={!form.phone || form.phone.replace(/\D/g, '').length < 10 || otpLoading}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${otpVerified
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'border border-[color:var(--color-primary)] text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/5 disabled:opacity-40 disabled:cursor-not-allowed'
                      }`}
                  >
                    {otpVerified ? '✓ Verified' : otpLoading ? 'Sending...' : 'Get OTP'}
                  </button>
                </div>
                {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                {errors.otp && <p className="mt-1 text-xs text-red-600">{errors.otp}</p>}
              </div>

              {errors.form && <p className="text-sm text-red-600 text-center">{errors.form}</p>}

              <PrimaryButton type="submit" className="w-full py-3" disabled={!otpVerified}>
                Create Account
              </PrimaryButton>
            </div>

            <div id="recaptcha-container"></div>
          </form>

          <p className="text-center mt-6 text-sm text-neutral-500">
            Already have an account?{' '}
            <Link to="/login" className="text-[color:var(--color-primary)] font-medium hover:underline">Log in</Link>
          </p>
        </div>
      </main>
      <Footer />
      <OTPModal open={otpOpen} onClose={() => setOtpOpen(false)} onVerify={handleVerifyOtp} />
      <Toast open={toast} type="success" message="Account created!" />
    </div>
  )
}

export default Signup
