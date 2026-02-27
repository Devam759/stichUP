import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

const HeroSection = () => {
  const navigate = useNavigate()
  const [showLogo, setShowLogo] = useState(true)

  useEffect(() => {
    const onScroll = () => setShowLogo(window.scrollY <= 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="relative w-full min-h-[85vh] text-white overflow-hidden" id="hero">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-[url('/bg-landing.jpg')] bg-cover bg-center scale-x-[-1]"
        aria-hidden="true"
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/55" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-6xl px-6">
        {showLogo && (
          <img src="/logo2.png" alt="StitchUp" className="absolute top-4 left-6 h-14 w-auto object-contain z-10" />
        )}
        <div className="min-h-[85vh] flex items-center">
          <motion.div
            className="max-w-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <div className="inline-block px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-sm font-medium mb-6 border border-white/20">
              Trusted by 5,000+ customers
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
              Expert Tailoring,<br />At Your Doorstep
            </h1>
            <p className="mt-5 text-white/80 text-lg md:text-xl leading-relaxed max-w-lg">
              Book skilled local tailors for stitching, alterations, and custom fittings — delivered to your door.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-3.5 text-base font-semibold rounded-lg bg-white text-neutral-900 hover:bg-neutral-100 transition-colors shadow-lg"
              >
                Find a Tailor
              </button>
              <button
                onClick={() => navigate('/signup?role=tailor')}
                className="px-8 py-3.5 text-base font-semibold rounded-lg bg-white/10 text-white border border-white/30 hover:bg-white/20 transition-colors backdrop-blur-sm"
              >
                Join as a Tailor
              </button>
            </div>

            {/* Trust indicators */}
            <div className="mt-10 flex items-center gap-8 text-white/70 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg">✓</span>
                <span>Verified Tailors</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">✓</span>
                <span>Doorstep Pickup</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">✓</span>
                <span>Live Tracking</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </header>
  )
}

export default HeroSection
