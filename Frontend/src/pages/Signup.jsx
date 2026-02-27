import React, { useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Input from '../components/ui/Input'
import OTPModal from '../components/OTPModal'
import Toast from '../components/Toast'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { FiUser } from 'react-icons/fi'

const Signup = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [form, setForm] = useState({
    fullName: '',
    phone: searchParams.get('phone') || '',
    role: 'customer'
  })
  const [errors, setErrors] = useState({})
  const [otpOpen, setOtpOpen] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [toast, setToast] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState(null)
  const [otpLoading, setOtpLoading] = useState(false)

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (e.target.name === 'phone') setOtpVerified(false)
    setErrors({})
  }

  const handleGetOtp = async () => {
    const next = {}
    if (!form.fullName || form.fullName.trim().length === 0) next.fullName = 'Full name is required'
    if (!form.phone || form.phone.replace(/\D/g, '').length < 10) next.phone = 'Enter a valid 10-digit phone number'
    if (Object.keys(next).length > 0) { setErrors(next); return }

    setOtpLoading(true)
    try {
      const formattedPhone = '+91' + form.phone.replace(/\D/g, '').slice(-10)

      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible'
        })
      }

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier)
      setConfirmationResult(confirmation)
      setOtpOpen(true)
    } catch (error) {
      console.error('OTP send error:', error)
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear()
        window.recaptchaVerifier = null
      }
      setErrors({ phone: `Failed to send OTP: ${error.message}` })
    }
    setOtpLoading(false)
  }

  const handleVerifyOtp = async (otpString) => {
    if (!otpString || otpString.length !== 6) return
    try {
      if (confirmationResult) {
        await confirmationResult.confirm(otpString)
        setOtpVerified(true)
        setOtpOpen(false)
      } else {
        setErrors({ phone: 'No active verification session. Please try again.' })
        setOtpOpen(false)
      }
    } catch (error) {
      console.error('Verification error:', error)
      setErrors({ phone: `Invalid OTP: ${error.message}` })
      setOtpOpen(false)
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!form.fullName || form.fullName.trim().length === 0) next.fullName = 'Full name is required'
    if (!form.phone || form.phone.replace(/\D/g, '').length < 10) next.phone = 'Enter a valid phone'
    if (!otpVerified) next.otp = 'Please verify your phone with OTP first'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    try {
      const uid = auth.currentUser ? auth.currentUser.uid : form.phone.replace(/\D/g, '').slice(-10)
      const userRef = doc(db, 'users', uid)
      const userSnap = await getDoc(userRef)

      if (userSnap.exists()) {
        // User already in Firestore — just redirect
        const profile = { id: userSnap.id, ...userSnap.data() }
        localStorage.setItem('currentUser', JSON.stringify(profile))
        window.dispatchEvent(new Event('authChange'))
        if (profile.role === 'tailor') navigate('/tailor/dashboard')
        else navigate('/customer')
        return
      }

      const user = {
        fullName: form.fullName.trim(),
        phone: form.phone.replace(/\D/g, '').slice(-10),
        role: form.role,
        id: uid,
        createdAt: new Date().toISOString(),
        // Tailor-specific defaults
        ...(form.role === 'tailor' ? {
          isAvailable: true,
          currentOrders: 0,
          rating: 4.5,
          reviews: 0,
          priceFrom: 150,
          distanceKm: 0
        } : {})
      }

      await setDoc(userRef, user)
      localStorage.setItem('currentUser', JSON.stringify(user))
      window.dispatchEvent(new Event('authChange'))
      setToast(true)
      setTimeout(() => setToast(false), 1500)

      if (user.role === 'tailor') navigate('/tailor/dashboard')
      else navigate('/customer')
    } catch (err) {
      console.error('Signup error:', err)
      setErrors({ form: 'Failed to create account. Please try again.' })
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-neutral-50">
      <Navbar />
      <main className="flex-1 grid place-items-center px-4 py-10">
        <form onSubmit={onSubmit} className="card w-full max-w-md p-8 bg-white rounded-2xl shadow-md">

          <div className="flex flex-col items-center mb-6">
            <div className="h-14 w-14 rounded-2xl bg-[color:var(--color-primary)]/10 flex items-center justify-center mb-3">
              <FiUser className="w-7 h-7 text-[color:var(--color-primary)]" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900">Create Account</h1>
            <p className="text-sm text-neutral-500 mt-1">Join StitchUP to get started</p>
          </div>

          {/* Role Toggle */}
          <div className="mb-5">
            <label className="text-sm font-medium text-neutral-700 mb-2 block">I am a</label>
            <div className="grid grid-cols-2 gap-2">
              {['customer', 'tailor'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setForm({ ...form, role: r })
                    const p = Object.fromEntries([...searchParams.entries()])
                    p.role = r
                    setSearchParams(p, { replace: true })
                  }}
                  className={[
                    'py-3 px-4 rounded-xl border-2 text-center font-medium capitalize transition-all',
                    form.role === r
                      ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                  ].join(' ')}
                >
                  {r === 'customer' ? '🛍 Customer' : '✂️ Tailor'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <Input
              label="Full Name"
              name="fullName"
              value={form.fullName}
              onChange={onChange}
              placeholder="John Doe"
              error={errors.fullName}
            />

            <Input
              label="Phone Number"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={onChange}
              placeholder="98765 43210"
              error={errors.phone}
              right={
                <button
                  type="button"
                  disabled={!form.phone || form.phone.replace(/\D/g, '').length < 10 || otpLoading}
                  onClick={handleGetOtp}
                  className={[
                    'px-3 py-1.5 rounded-lg border text-sm font-medium whitespace-nowrap transition-all',
                    otpVerified
                      ? 'border-green-400 text-green-600 bg-green-50'
                      : (!form.phone || form.phone.replace(/\D/g, '').length < 10)
                        ? 'opacity-50 cursor-not-allowed border-neutral-300 text-neutral-400'
                        : 'border-[color:var(--color-primary)] text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/5'
                  ].join(' ')}
                >
                  {otpVerified ? '✓ Verified' : otpLoading ? 'Sending...' : 'Get OTP'}
                </button>
              }
            />

            {errors.otp && (
              <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                {errors.otp}
              </div>
            )}

            <button
              type="submit"
              disabled={!otpVerified}
              className={[
                'w-full py-3 px-6 rounded-xl font-semibold transition-all',
                otpVerified
                  ? 'bg-[color:var(--color-primary)] text-white hover:opacity-90 active:scale-[0.98]'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
              ].join(' ')}
            >
              Create Account
            </button>

            {errors.form && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {errors.form}
              </div>
            )}

            <div className="text-sm text-center text-neutral-600">
              Already have an account?{' '}
              <Link className="text-[color:var(--color-primary)] font-medium hover:underline" to="/login">
                Login
              </Link>
            </div>
          </div>

          <div id="recaptcha-container" />
        </form>
      </main>
      <Footer />
      <OTPModal
        open={otpOpen}
        onClose={() => setOtpOpen(false)}
        onVerify={handleVerifyOtp}
        phone={form.phone}
      />
      <Toast open={toast} type="success" message="Account created!" />
    </div>
  )
}

export default Signup
