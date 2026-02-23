import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Input from '../components/ui/Input'
import PrimaryButton from '../components/ui/PrimaryButton'
import OTPModal from '../components/OTPModal'
import Toast from '../components/Toast'
import { Link, useNavigate } from 'react-router-dom'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from '../firebase'
const Login = () => {
  const navigate = useNavigate()
  const [form, setForm] = useState({ phone: '', password: '' })
  const [errors, setErrors] = useState({})
  const [otpOpen, setOtpOpen] = useState(false)
  const [toast, setToast] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState(null)
  const [otpLoading, setOtpLoading] = useState(false)

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })


  const onSubmit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!form.phone || form.phone.replace(/\D/g, '').length < 10) next.phone = 'Enter a valid phone'
    if (!form.password || form.password.length < 6) next.password = 'Min 6 characters'
    setErrors(next)

    if (Object.keys(next).length === 0) {
      try {
        const inputPhone = (form.phone || '').replace(/\D/g, '')
        const usersRef = collection(db, 'users')
        const q = query(usersRef, where('phone', '==', inputPhone))
        const querySnapshot = await getDocs(q)

        if (querySnapshot.empty) {
          setErrors({ form: 'User not found in Firebase.' })
          return
        }

        let dbUser = null
        querySnapshot.forEach(doc => {
          if (doc.data().password === form.password) dbUser = { id: doc.id, ...doc.data() }
        })

        if (!dbUser) {
          setErrors({ form: 'Invalid password.' })
          return
        }

        localStorage.setItem('currentUser', JSON.stringify(dbUser))
        window.dispatchEvent(new Event('authChange'))
        if (dbUser.role === 'tailor') navigate('/tailor/dashboard')
        else navigate('/customer')
      } catch (err) {
        console.error(err)
        setErrors({ form: 'Database error' })
      }
    }
  }

  const handleLoginClick = (e) => {
    e.preventDefault()
    onSubmit(e)
  }

  const handleGetOtp = async () => {
    const next = {}
    if (!form.phone || form.phone.replace(/\D/g, '').length < 10) next.phone = 'Enter a valid phone'
    setErrors(next)
    if (Object.keys(next).length > 0) return

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
      console.error("OTP send error:", error)
      setErrors({ form: `Failed to send OTP: ${error.message}` })
    }
    setOtpLoading(false)
  }

  const handleVerifyOtp = async (otpString) => {
    if (!otpString || otpString.length !== 6) return

    try {
      if (confirmationResult) {
        const res = await confirmationResult.confirm(otpString)
        const userRef = doc(db, 'users', res.user.uid)
        const userSnap = await getDoc(userRef)

        let targetUser = null

        if (userSnap.exists()) {
          targetUser = { id: userSnap.id, ...userSnap.data() }
        } else {
          // Create new user fallback if not found
          const inputPhone = (form.phone || '').replace(/\D/g, '')
          targetUser = { phone: inputPhone, role: 'customer', id: res.user.uid, name: 'New User' }
          await setDoc(userRef, targetUser)
        }

        localStorage.setItem('currentUser', JSON.stringify(targetUser))
        window.dispatchEvent(new Event('authChange'))
        setOtpOpen(false)
        if (targetUser.role === 'tailor') navigate('/tailor/dashboard')
        else navigate('/customer')
      } else {
        // Fallback for demo if Firebase hit a rate limit but they click Verify anyway
        onSubmit({ preventDefault: () => { } })
        setOtpOpen(false)
      }
    } catch (error) {
      console.error("OTP verification error:", error)
      setErrors({ form: 'Invalid OTP entered.' })
      setOtpOpen(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1 grid place-items-center px-4 py-10">
        <form onSubmit={onSubmit} className="card w-full max-w-md p-6">
          <div className="text-2xl font-semibold">Login</div>

          <div className="grid gap-4 mt-4">
            {/* <Input label="Email" name="email" value={form.email} onChange={onChange} placeholder="you@example.com" error={errors.email} /> */}
            <Input label="Phone" name="phone" value={form.phone} onChange={onChange} placeholder="98765 43210" error={errors.phone} />
            <Input label="Password" type="password" name="password" value={form.password} onChange={onChange} placeholder="••••••" error={errors.password} />
            <div className="flex items-center gap-2">
              <PrimaryButton type="submit" className="flex-1" onClick={handleLoginClick}>Login</PrimaryButton>
              <button type="button" className="btn-outline min-w-[100px]" onClick={handleGetOtp} disabled={otpLoading}>
                {otpLoading ? 'Wait...' : 'Get OTP'}
              </button>
            </div>
            {errors.form && (
              <div className="mt-2 text-sm text-red-600">{errors.form}</div>
            )}
            <div className="text-sm text-neutral-600">Don't have an account? <Link className="text-[color:var(--color-primary)] hover:underline" to="/signup">Sign up</Link></div>
          </div>
          <div id="recaptcha-container"></div>
        </form>
      </main>
      <Footer />
      <OTPModal open={otpOpen} onClose={() => setOtpOpen(false)} onVerify={handleVerifyOtp} />
      <Toast open={toast} type="success" message="Logged in successfully" />
    </div>
  )
}

export default Login


