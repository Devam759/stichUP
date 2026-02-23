import React, { useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Input from '../components/ui/Input'
import PrimaryButton from '../components/ui/PrimaryButton'
import OTPModal from '../components/OTPModal'
import Toast from '../components/Toast'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
const validateEmail = (v) => /.+@.+\..+/.test(v)

const Signup = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', role: 'customer' })

  // Initialize role from ?role=... if provided
  React.useEffect(() => {
    const roleParam = searchParams.get('role')
    if (roleParam && (roleParam === 'customer' || roleParam === 'tailor')) {
      setForm(prev => ({ ...prev, role: roleParam }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
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
    if (form.email && !validateEmail(form.email)) next.email = 'Enter a valid email'
    if (!form.fullName || form.fullName.trim().length === 0) next.fullName = 'Full name is required'
    if (!form.phone || form.phone.replace(/\D/g, '').length < 10) next.phone = 'Enter a valid phone'
    if (!form.password || form.password.length < 6) next.password = 'Min 6 characters'
    if (!otpVerified) next.otp = 'Please verify your phone with OTP'
    setErrors(next)

    if (Object.keys(next).length === 0) {
      try {
        const uid = auth.currentUser ? auth.currentUser.uid : form.phone.replace(/\D/g, '')
        const userRef = doc(db, 'users', uid)
        const userSnap = await getDoc(userRef)

        if (userSnap.exists()) {
          setErrors({ form: 'User already exists with this phone/email' })
          return
        }

        const user = { fullName: form.fullName, email: form.email, phone: form.phone, password: form.password, role: form.role, id: uid }
        await setDoc(userRef, user)

        localStorage.setItem('currentUser', JSON.stringify(user))
        window.dispatchEvent(new Event('authChange'))
        setToast(true)
        setTimeout(() => setToast(false), 1200)

        if (user.role === 'tailor') navigate('/tailor/dashboard')
        else navigate('/customer')
      } catch (err) {
        console.error("Signup error:", err)
        setErrors({ form: 'Failed to create user in Firebase' })
      }
    }
  }

  const handleGetOtp = async () => {
    const next = {}
    if (!form.phone || form.phone.replace(/\D/g, '').length < 10) next.phone = 'Enter a valid phone number'
    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }

    setOtpLoading(true)
    try {
      const formattedPhone = '+91' + form.phone.replace(/\D/g, '')

      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible'
        })
      }

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier)
      setConfirmationResult(confirmation)
      setOtpOpen(true)
    } catch (error) {
      console.error("OTP API issue:", error)
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
        // Fallback or error
        setErrors({ phone: 'No active verification session. Please try again.' })
        setOtpOpen(false)
      }
    } catch (error) {
      console.error("Verification error:", error)
      setErrors({ phone: `Invalid OTP: ${error.message}` })
      setOtpOpen(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1 grid place-items-center px-4 py-10">
        <form onSubmit={onSubmit} className="card w-full max-w-md p-6">
          <div className="text-2xl font-semibold">Create Account</div>
          <div className="mt-4">
            <label className="text-sm font-medium">Account type</label>
            <div className="mt-2 grid grid-cols-2 divide-x divide-neutral-200 rounded-lg overflow-hidden border">
              <button
                type="button"
                aria-pressed={form.role === 'customer'}
                onClick={() => {
                  setForm({ ...form, role: 'customer' })
                  const next = Object.fromEntries([...searchParams.entries()])
                  next.role = 'customer'
                  setSearchParams(next, { replace: true })
                }}
                className={['py-3 px-4 text-center', form.role === 'customer' ? 'bg-white/5 text-(--color-primary) font-medium' : 'bg-transparent text-neutral-700'].join(' ')}
              >
                Customer
              </button>
              <button
                type="button"
                aria-pressed={form.role === 'tailor'}
                onClick={() => {
                  setForm({ ...form, role: 'tailor' })
                  const next = Object.fromEntries([...searchParams.entries()])
                  next.role = 'tailor'
                  setSearchParams(next, { replace: true })
                }}
                className={['py-3 px-4 text-center', form.role === 'tailor' ? 'bg-white/5 text-(--color-primary) font-medium' : 'bg-transparent text-neutral-700'].join(' ')}
              >
                Tailor
              </button>
            </div>
          </div>
          <div className="grid gap-4 mt-4">
            <Input label="Full Name" name="fullName" value={form.fullName} onChange={onChange} placeholder="John Doe" error={errors.fullName} />
            <Input label="Email (optional)" name="email" value={form.email} onChange={onChange} placeholder="you@example.com" error={errors.email} />
            <Input
              label="Phone"
              name="phone"
              value={form.phone}
              onChange={(e) => { setForm({ ...form, phone: e.target.value }); if (otpVerified) setOtpVerified(false); }}
              placeholder="98765 43210"
              error={errors.phone}
              right={
                <button
                  type="button"
                  disabled={!form.phone || form.phone.replace(/\D/g, '').length < 10 || otpLoading}
                  onClick={handleGetOtp}
                  className={[
                    'px-3 py-1 rounded-lg border',
                    'transition-opacity text-sm whitespace-nowrap',
                    (!form.phone || form.phone.replace(/\D/g, '').length < 10) ? 'opacity-50 cursor-not-allowed border-neutral-300 text-neutral-400' : 'opacity-100 border-[color:var(--color-primary)] text-[color:var(--color-primary)]'
                  ].join(' ')}
                >
                  {otpVerified ? 'Verified' : otpLoading ? 'Wait...' : 'Get OTP'}
                </button>
              }
            />
            <Input label="Password" type="password" name="password" value={form.password} onChange={onChange} placeholder="••••••" error={errors.password} />

            <div className="flex items-center gap-2">
              <PrimaryButton
                type="submit"
                className={["flex-1 transition-opacity", !otpVerified ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''].join(' ')}
                disabled={!otpVerified}
              >
                Create Account
              </PrimaryButton>
            </div>
            <div className="text-sm text-neutral-600">Already have an account? <Link className="text-[color:var(--color-primary)] hover:underline" to="/login">Login</Link></div>
          </div>
          <div id="recaptcha-container"></div>
        </form>
      </main>
      <Footer />
      <OTPModal
        open={otpOpen}
        onClose={() => setOtpOpen(false)}
        onVerify={handleVerifyOtp}
      />
      <Toast open={toast} type="success" message="Account created smoothly" />
    </div>
  )
}

export default Signup


