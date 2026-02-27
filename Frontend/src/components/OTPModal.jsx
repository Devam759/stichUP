import React, { useState, useRef, useEffect } from 'react'

const OTPModal = ({ open, onClose, onVerify, phone }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const inputRefs = useRef([])

  useEffect(() => {
    if (open) {
      setOtp(['', '', '', '', '', ''])
      setLoading(false)
      setTimeout(() => { if (inputRefs.current[0]) inputRefs.current[0].focus() }, 100)
    }
  }, [open])

  if (!open) return null

  const handleChange = (index, e) => {
    const value = e.target.value
    if (isNaN(value)) return

    const newOtp = [...otp]

    if (value.length > 1) {
      const pastedData = value.substring(0, 6).split('')
      for (let i = 0; i < pastedData.length; i++) {
        if (i < 6) newOtp[i] = pastedData[i]
      }
      setOtp(newOtp)
      const nextIndex = Math.min(pastedData.length, 5)
      inputRefs.current[nextIndex]?.focus()
      return
    }

    newOtp[index] = value
    setOtp(newOtp)
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    // Auto-verify when last digit entered
    if (e.key !== 'Backspace' && index === 5) {
      const filled = [...otp.slice(0, 5), e.key].join('')
      if (filled.length === 6 && !isNaN(filled)) {
        setTimeout(() => handleVerify([...otp.slice(0, 5), e.key].join('')), 100)
      }
    }
  }

  const handleVerify = async (otpCode) => {
    const code = otpCode || otp.join('')
    if (code.length !== 6) return
    setLoading(true)
    if (onVerify) await onVerify(code)
    setLoading(false)
  }

  const maskedPhone = phone
    ? phone.replace(/\D/g, '').slice(-10).replace(/(\d{2})(\d{4})(\d{4})/, '$1XXXX$3')
    : 'your phone'

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center px-4 pointer-events-none">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl pointer-events-auto overflow-hidden">
          <div className="bg-[color:var(--color-primary)] px-6 py-5 text-white">
            <div className="text-xl font-bold">Verify Phone</div>
            <div className="text-sm opacity-80 mt-1">
              Code sent to +91 {maskedPhone}
            </div>
          </div>

          <div className="p-6">
            <div className="text-sm text-neutral-500 mb-5 text-center">
              Enter the 6-digit OTP sent via SMS
            </div>

            <div className="flex items-center justify-between gap-2 mb-6">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => inputRefs.current[i] = el}
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleChange(i, e)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  inputMode="numeric"
                  className="w-11 h-13 text-center text-xl font-bold border-2 rounded-xl border-neutral-200 focus:outline-none focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary)]/20 transition-all bg-neutral-50"
                />
              ))}
            </div>

            <button
              onClick={() => handleVerify()}
              disabled={otp.join('').length !== 6 || loading}
              className={[
                'w-full py-3 rounded-xl font-semibold transition-all',
                otp.join('').length === 6 && !loading
                  ? 'bg-[color:var(--color-primary)] text-white hover:opacity-90 active:scale-[0.98]'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
              ].join(' ')}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Verifying...
                </span>
              ) : 'Verify OTP'}
            </button>

            <button
              onClick={onClose}
              className="w-full mt-3 py-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OTPModal
