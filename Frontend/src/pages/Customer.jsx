import React from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useNavigate } from 'react-router-dom'
import { FiScissors, FiEdit3 } from 'react-icons/fi'
import { motion } from 'framer-motion'

const Customer = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">What do you need?</h1>
            <p className="mt-2 text-neutral-500">Choose the type of service to get started</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* Quick Fix */}
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/categories/quick-fix')}
              className="text-left rounded-xl border border-neutral-200 overflow-hidden hover:border-neutral-300 transition-all group"
            >
              <div className="h-48 bg-neutral-100 overflow-hidden">
                <img
                  src="/quick-fix.jpg"
                  alt="Quick Fix"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <FiScissors className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-semibold text-neutral-900">Quick Fix</h2>
                </div>
                <p className="text-sm text-neutral-500">Button repairs, hemming, zipper fixes, and minor alterations. Usually done within a day.</p>
                <div className="mt-3 text-sm font-medium text-[color:var(--color-primary)]">Starting from ₹50 →</div>
              </div>
            </motion.button>

            {/* Heavy Tailoring */}
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/categories/heavy-tailoring')}
              className="text-left rounded-xl border border-neutral-200 overflow-hidden hover:border-neutral-300 transition-all group"
            >
              <div className="h-48 bg-neutral-100 overflow-hidden">
                <img
                  src="/heavy_tailoring.jpg"
                  alt="Heavy Tailoring"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <FiEdit3 className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-semibold text-neutral-900">Heavy Tailoring</h2>
                </div>
                <p className="text-sm text-neutral-500">Custom suits, dresses, sherwanis, lehenghas, and full garment creation from scratch.</p>
                <div className="mt-3 text-sm font-medium text-[color:var(--color-primary)]">Starting from ₹500 →</div>
              </div>
            </motion.button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default Customer
