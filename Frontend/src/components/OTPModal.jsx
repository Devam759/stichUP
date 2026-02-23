import React, { useState, useRef, useEffect } from 'react'

const OTPModal = ({ open, onClose, onVerify }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef([])

  useEffect(() => {
    if (open) {
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => { if (inputRefs.current[0]) inputRefs.current[0].focus() }, 100)
    }
  }, [open])

  if (!open) return null

  const handleChange = (index, e) => {
    const value = e.target.value
    if (isNaN(value)) return

    const newOtp = [...otp]

    // Handle pasting 6 digits
    if (value.length > 1) {
      const pastedData = value.substring(0, 6).split('')
      for (let i = 0; i < pastedData.length; i++) {
        if (i < 6) newOtp[i] = pastedData[i]
      }
      setOtp(newOtp)
      // Focus on the next empty input or the last one
      const nextIndex = Math.min(pastedData.length, 5)
      inputRefs.current[nextIndex].focus()
      return
    }

    newOtp[index] = value
    setOtp(newOtp)

    if (value !== '' && index < 5) {
      inputRefs.current[index + 1].focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus()
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center px-4 pointer-events-none">
        <div className="card p-5 w-full max-w-sm bg-white pointer-events-auto shadow-2xl">
          <div className="text-lg font-semibold text-neutral-900">Enter OTP</div>
          <div className="text-neutral-600 text-sm mt-1">We sent a 6 digit code to your phone</div>
          <div className="mt-6 flex items-center justify-between gap-2">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => inputRefs.current[i] = el}
                maxLength={6}
                value={digit}
                onChange={(e) => handleChange(i, e)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-10 h-12 md:w-12 md:h-14 text-center text-lg font-semibold border rounded-lg border-neutral-300 focus:outline-none focus:border-[color:var(--color-primary)] focus:ring-1 focus:ring-[color:var(--color-primary)] transition-all bg-neutral-50"
              />
            ))}
          </div>
          <div className="mt-6 flex items-center gap-3 justify-end">
            <button className="btn-outline px-6" onClick={onClose}>Cancel</button>
            <button className="btn-primary px-6 shadow-md" onClick={() => { if (onVerify) onVerify(otp.join('')); }}>Verify</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OTPModal


