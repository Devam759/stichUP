import React, { useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Input from '../components/ui/Input'
import OTPModal from '../components/OTPModal'
import { Link, useNavigate } from 'react-router-dom'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { FiPhone } from 'react-icons/fi'

const Login = () => {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState({})
  const [otpOpen, setOtpOpen] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState(null)
  const [otpLoading, setOtpLoading] = useState(false)

  const validate = () => {
    const digits = phone.replace(/\D/g, '')
    if (!digits || digits.length < 10) return 'Enter a valid 10-digit phone number'
    return null
  }

  const handleGetOtp = async () => {
    const err = validate()
    if (err) { setErrors({ phone: err }); return }
    setErrors({})
    setOtpLoading(true)

    try {
      const formattedPhone = '+91' + phone.replace(/\D/g, '').slice(-10)

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
      // Reset recaptcha on error so it can be retried
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear()
        window.recaptchaVerifier = null
      }
      setErrors({ form: `Failed to send OTP: ${error.message}` })
    }
    setOtpLoading(false)
  }

  const handleVerifyOtp = async (otpString) => {
    if (!otpString || otpString.length !== 6) return
    try {
      const res = await confirmationResult.confirm(otpString)
      const uid = res.user.uid

      const userRef = doc(db, 'users', uid)
      const userSnap = await getDoc(userRef)

      let profile
      if (userSnap.exists()) {
        profile = { id: uid, ...userSnap.data() }
      } else {
        // First time on this device — user exists in Auth but not Firestore yet
        // Redirect to signup to complete the profile
        setOtpOpen(false)
        navigate('/signup?phone=' + phone.replace(/\D/g, '').slice(-10) + '&new=1')
        return
      }

      localStorage.setItem('currentUser', JSON.stringify(profile))
      window.dispatchEvent(new Event('authChange'))
      setOtpOpen(false)

      if (profile.role === 'tailor') navigate('/tailor/dashboard')
      else navigate('/customer')
    } catch (error) {
      console.error('OTP verification error:', error)
      setErrors({ form: 'Invalid OTP. Please try again.' })
      setOtpOpen(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-neutral-50">
      <Navbar />
      <main className="flex-1 grid place-items-center px-4 py-10">
        <div className="card w-full max-w-md p-8 bg-white rounded-2xl shadow-md">

          <div className="flex flex-col items-center mb-6">
            <div className="h-14 w-14 rounded-2xl bg-[color:var(--color-primary)]/10 flex items-center justify-center mb-3">
              <FiPhone className="w-7 h-7 text-[color:var(--color-primary)]" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900">Welcome back</h1>
            <p className="text-sm text-neutral-500 mt-1">Login with your phone number</p>
          </div>

          <div className="grid gap-5">
            <div>
              <Input
                label="Phone Number"
                name="phone"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setErrors({}) }}
                placeholder="98765 43210"
                error={errors.phone}
                type="tel"
              />
              <p className="text-xs text-neutral-400 mt-1 ml-1">We'll send a 6-digit OTP to verify your number</p>
            </div>

            <button
              type="button"
              onClick={handleGetOtp}
              disabled={otpLoading}
              className="w-full py-3 px-6 rounded-xl bg-[color:var(--color-primary)] text-white font-semibold
                         hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {otpLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Sending OTP...
                </span>
              ) : 'Get OTP'}
            </button>

            {errors.form && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {errors.form}
              </div>
            )}

            <div className="text-sm text-center text-neutral-600">
              Don't have an account?{' '}
              <Link className="text-[color:var(--color-primary)] font-medium hover:underline" to="/signup">
                Sign up
              </Link>
            </div>
          </div>

          <div id="recaptcha-container" />
        </div>
      </main>
      <Footer />
      <OTPModal
        open={otpOpen}
        onClose={() => setOtpOpen(false)}
        onVerify={handleVerifyOtp}
        phone={phone}
      />
    </div>
  )
}

export default Login
