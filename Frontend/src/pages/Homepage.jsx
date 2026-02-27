import React from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import HeroSection from '../components/HeroSection'
import { FiScissors, FiMapPin, FiTruck, FiStar, FiCheckCircle, FiClock, FiShield, FiUsers } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
}

const Homepage = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <Navbar hideUntilScroll />
      <HeroSection />


      {/* ── How It Works ── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900">How StitchUp Works</h2>
          <p className="mt-3 text-neutral-500 max-w-2xl mx-auto">Get your clothes tailored in 3 simple steps — no stress, no hassle.</p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: '01', icon: <FiScissors className="w-6 h-6" />, title: 'Choose Your Service', desc: 'Select from quick fixes like button repairs, or heavy tailoring for custom suits and dresses.' },
            { step: '02', icon: <FiMapPin className="w-6 h-6" />, title: 'Pick a Nearby Tailor', desc: 'Browse verified tailors near you, check ratings, reviews, and pricing before you book.' },
            { step: '03', icon: <FiTruck className="w-6 h-6" />, title: 'Doorstep Delivery', desc: 'We pick up your garments and deliver them back — perfectly tailored, right to your door.' }
          ].map((item, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ ...fadeUp, visible: { ...fadeUp.visible, transition: { ...fadeUp.visible.transition, delay: i * 0.1 } } }}>
              <div className="relative p-6 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 transition-colors h-full">
                <div className="text-xs font-bold text-neutral-300 mb-4">STEP {item.step}</div>
                <div className="w-12 h-12 rounded-lg bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] flex items-center justify-center mb-4">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">{item.title}</h3>
                <p className="text-neutral-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Professional Tailors ── */}
      <section className="bg-neutral-50 border-y border-neutral-100">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <h2 className="text-2xl md:text-3xl font-bold text-neutral-900">Verified & Skilled Tailors</h2>
              <p className="mt-4 text-neutral-500 leading-relaxed">
                Every tailor on StitchUp is personally vetted for quality workmanship,
                timely delivery, and customer satisfaction. We don't list just anyone.
              </p>
              <ul className="mt-6 space-y-4">
                {[
                  { icon: <FiCheckCircle />, text: 'Background verified with experience proof' },
                  { icon: <FiStar />, text: 'Rated by real customers after every order' },
                  { icon: <FiShield />, text: 'Quality guarantee on every service' }
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-neutral-600">
                    <span className="text-[color:var(--color-primary)] text-lg">{item.icon}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/find')}
                className="mt-8 btn-primary px-6 py-3 text-base"
              >
                Browse Tailors
              </button>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <img src="/AdobeStock_158668801.webp" alt="Professional tailor at work" className="w-full h-80 object-cover rounded-xl" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Why StitchUp ── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900">Why Customers Choose Us</h2>
          <p className="mt-3 text-neutral-500 max-w-2xl mx-auto">Built for convenience, designed for trust.</p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: <FiClock className="w-5 h-5" />, title: 'Quick Turnaround', desc: 'Most orders completed within 2-3 days.' },
            { icon: <FiTruck className="w-5 h-5" />, title: 'Free Pickup & Delivery', desc: 'Doorstep service at no extra cost.' },
            { icon: <FiShield className="w-5 h-5" />, title: 'Satisfaction Guarantee', desc: 'Not happy? We\'ll fix it for free.' },
            { icon: <FiUsers className="w-5 h-5" />, title: 'Real Reviews', desc: 'Transparent ratings from real customers.' }
          ].map((item, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ ...fadeUp, visible: { ...fadeUp.visible, transition: { ...fadeUp.visible.transition, delay: i * 0.08 } } }}>
              <div className="p-5 rounded-xl border border-neutral-200 bg-white h-full">
                <div className="w-10 h-10 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center mb-3">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-neutral-900 mb-1">{item.title}</h3>
                <p className="text-neutral-500 text-sm">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Convenience Section ── */}
      <section className="bg-neutral-50 border-y border-neutral-100">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="order-2 md:order-1">
              <img src="/sustainable.webp" alt="Convenient doorstep tailoring" className="w-full h-80 object-cover rounded-xl" />
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="order-1 md:order-2">
              <h2 className="text-2xl md:text-3xl font-bold text-neutral-900">Convenience at Every Step</h2>
              <p className="mt-4 text-neutral-500 leading-relaxed">
                From booking to delivery, we've streamlined every step so you
                never have to worry about your garments.
              </p>
              <div className="mt-6 space-y-4">
                {[
                  'Book online in under 2 minutes',
                  'Real-time order tracking',
                  'Secure payment options',
                  'Chat directly with your tailor'
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-3 text-neutral-600">
                    <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">✓</div>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900">What Our Customers Say</h2>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { name: 'Priya M.', location: 'Mumbai', text: 'Got my blouse altered perfectly. The tailor was punctual and the stitching quality was excellent. Will definitely use again!', rating: 5 },
            { name: 'Rahul K.', location: 'Pune', text: 'Ordered a custom suit for my wedding. The fit was impeccable and they delivered 2 days early. Highly recommended.', rating: 5 },
            { name: 'Anita S.', location: 'Delhi', text: 'Quick fix on my daughter\'s school uniform. Pickup at 10am, delivered by 6pm same day. Incredible service.', rating: 4 }
          ].map((review, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ ...fadeUp, visible: { ...fadeUp.visible, transition: { ...fadeUp.visible.transition, delay: i * 0.1 } } }}>
              <div className="p-6 rounded-xl border border-neutral-200 bg-white h-full flex flex-col">
                <div className="flex items-center gap-1 text-amber-400 text-sm mb-3">
                  {Array.from({ length: review.rating }).map((_, j) => (
                    <span key={j}>★</span>
                  ))}
                </div>
                <p className="text-neutral-600 text-sm leading-relaxed flex-1">"{review.text}"</p>
                <div className="mt-4 pt-4 border-t border-neutral-100">
                  <div className="font-semibold text-neutral-900 text-sm">{review.name}</div>
                  <div className="text-neutral-400 text-xs">{review.location}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-[color:var(--color-primary)]">
        <div className="mx-auto w-full max-w-6xl px-6 py-14 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white">Ready to get started?</h2>
          <p className="mt-3 text-white/70 max-w-lg mx-auto">Join thousands of customers who trust StitchUp for all their tailoring needs.</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/signup')}
              className="px-8 py-3 text-base font-semibold rounded-lg bg-white text-neutral-900 hover:bg-neutral-100 transition-colors"
            >
              Create Free Account
            </button>
            <button
              onClick={() => navigate('/find')}
              className="px-8 py-3 text-base font-semibold rounded-lg bg-white/10 text-white border border-white/30 hover:bg-white/20 transition-colors"
            >
              Explore Tailors
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default Homepage