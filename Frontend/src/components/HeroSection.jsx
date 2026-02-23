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

  // Staggering animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 20, stiffness: 100 } }
  }

  return (
    <header
      className="relative w-full min-h-dvh text-white bg-[#305cde]"
      id="hero"
    >
      <div
        className="absolute inset-0 bg-[#305cde] bg-[url('/bg-landing.jpg')] bg-cover bg-center scale-x-[-1]"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-6xl px-4">
        {showLogo && (
          <img src="/logo2.png" alt="Logo" className="absolute top-3 left-4 h-25 w-auto rounded-md object-cover z-10" />
        )}
        <div className="min-h-dvh flex items-center">
          <motion.div
            className="text-left"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.h1 variants={itemVariants} className="text-4xl md:text-6xl font-bold tracking-tight tasa-orbiter-700 leading-tight">
              TAILORING AT
              <br />
              YOUR DOORSTEP
            </motion.h1>
            <motion.p variants={itemVariants} className="mt-4 text-white/90 max-w-2xl text-lg md:text-xl leading-relaxed">
              Skilled tailors nearby for stitching, alterations, and custom fittings,
              <br className="hidden sm:block" />
              just a tap away.
            </motion.p>
            <motion.div variants={itemVariants} className="mt-8 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center justify-center px-8 py-3.5 text-lg md:px-10 md:py-4 md:text-xl rounded-lg bg-[#3770FF] text-white font-semibold hover:bg-[#2c5ad1] transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-[#3770FF]/30"
              >
                Find a Tailor
              </button>
              <button
                onClick={() => navigate('/signup?role=tailor')}
                className="inline-flex items-center justify-center px-8 py-3.5 text-lg md:px-10 md:py-4 md:text-xl rounded-lg bg-[#202938] text-white font-semibold border border-[#d1d5db] hover:bg-[#2d3748] transition-transform hover:scale-105 active:scale-95 shadow-lg"
              >
                Become a Tailor
              </button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </header>
  )
}

export default HeroSection


