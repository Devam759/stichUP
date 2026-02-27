import React, { useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Input from '../components/ui/Input'
import PrimaryButton from '../components/ui/PrimaryButton'
import OTPModal from '../components/OTPModal'
import Toast from '../components/Toast'
import { Link, useNavigate } from 'react-router-dom'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

const Login = () => {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState({})
  const [otpOpen, setOtpOpen] = useState(false)
  const [toast, setToast] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState(null)
  const [otpLoading, setOtpLoading] = useState(false)

  const handleGetOtp = async (e) => {
    if (e) e.preventDefault()
    const next = {}
    if (!phone || phone.replace(/\D/g, '').length < 10) next.phone = 'Enter a valid 10-digit phone number'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setOtpLoading(true)
    try {
      const formattedPhone = '+91' + phone.replace(/\D/g, '')
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' })
      }
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier)
      setConfirmationResult(confirmation)
      setOtpOpen(true)
    } catch (error) {
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear() } catch { }
        window.recaptchaVerifier = null
      }
      setErrors({ form: `Failed to send OTP: ${error.message}` })
    }
    setOtpLoading(false)
  }

  const handleVerifyOtp = async (otpString) => {
    if (!otpString || otpString.length !== 6) return
    try {
      if (!confirmationResult) { setErrors({ form: 'Session expired. Please try again.' }); setOtpOpen(false); return }
      const res = await confirmationResult.confirm(otpString)
      const userRef = doc(db, 'users', res.user.uid)
      const userSnap = await getDoc(userRef)
      let targetUser = null

      if (userSnap.exists()) {
        targetUser = { id: userSnap.id, uid: res.user.uid, ...userSnap.data() }
      } else {
        targetUser = { phone: phone.replace(/\D/g, ''), role: 'customer', fullName: 'New User', createdAt: new Date().toISOString() }
        await setDoc(userRef, targetUser)
        targetUser = { id: res.user.uid, uid: res.user.uid, ...targetUser }
      }

      localStorage.setItem('currentUser', JSON.stringify(targetUser))
      window.dispatchEvent(new Event('authChange'))
      setOtpOpen(false)
      setToast(true)
      setTimeout(() => {
        setToast(false)
        navigate(targetUser.role === 'tailor' ? '/tailor/dashboard' : '/customer')
      }, 800)
    } catch (error) {
      setErrors({ form: `Invalid OTP: ${error.message}` })
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
            <h1 className="text-2xl font-bold text-neutral-900">Welcome back</h1>
            <p className="mt-2 text-neutral-500 text-sm">Enter your phone number to continue</p>
          </div>

          {/* Form */}
          <form onSubmit={handleGetOtp} className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Phone Number</label>
                <div className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2.5 bg-white focus-within:border-[color:var(--color-primary)] focus-within:ring-1 focus-within:ring-[color:var(--color-primary)]/20 transition-all">
                  <span className="text-neutral-400 text-sm">+91</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="98765 43210"
                    className="flex-1 outline-none bg-transparent text-neutral-900"
                    maxLength={12}
                  />
                </div>
                {errors.phone && <p className="mt-1.5 text-xs text-red-600">{errors.phone}</p>}
              </div>

              <PrimaryButton type="submit" className="w-full py-3" disabled={otpLoading}>
                {otpLoading ? 'Sending OTP...' : 'Continue with OTP'}
              </PrimaryButton>

              {errors.form && <p className="text-sm text-red-600 text-center">{errors.form}</p>}
            </div>

            <div id="recaptcha-container"></div>
          </form>

          {/* Footer link */}
          <p className="text-center mt-6 text-sm text-neutral-500">
            Don't have an account?{' '}
            <Link to="/signup" className="text-[color:var(--color-primary)] font-medium hover:underline">Create one</Link>
          </p>
        </div>
      </main>
      <Footer />
      <OTPModal open={otpOpen} onClose={() => setOtpOpen(false)} onVerify={handleVerifyOtp} />
      <Toast open={toast} type="success" message="Logged in successfully" />
    </div>
  )
}

export default Login
