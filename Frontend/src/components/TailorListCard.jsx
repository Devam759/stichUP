import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { FiClock, FiStar, FiMapPin } from 'react-icons/fi'

const TailorListCard = ({ tailor, onHover, onLeave, isQuickFix = false, workType = 'quick' }) => {
  const navigate = useNavigate()
  const {
    id,
    name,
    shopPhotoUrl,
    isAvailable = true,
    currentOrders = 0,
    distanceKm = 0,
    rating = 0,
    reviews = 0,
    priceFrom = 0,
    lightTaskAvgMin = 15,
    heavyTaskAvgMin = 90,
  } = tailor

  // Estimated wait time based on work type + current queue
  const estimatedMin = workType === 'heavy'
    ? currentOrders * heavyTaskAvgMin
    : currentOrders * lightTaskAvgMin
  const etaText = estimatedMin === 0
    ? 'Ready now'
    : estimatedMin < 60
      ? `~${estimatedMin} min wait`
      : `~${Math.round(estimatedMin / 60 * 10) / 10}h wait`

  const [addedToCart, setAddedToCart] = useState(false)

  const handleEnquireNow = (e) => {
    e.stopPropagation()
    navigate(`/enquiries?tailorId=${id}&tailorName=${encodeURIComponent(name)}&isOnline=${isAvailable}`)
  }

  const handleAddToCart = (e) => {
    e.stopPropagation()
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]')
      const existingItem = cart.find(item => item.tailorId === id)
      if (existingItem) { setAddedToCart(true); setTimeout(() => setAddedToCart(false), 2000); return }
      cart.push({ tailorId: id, tailorName: name, tailorImage: shopPhotoUrl, priceFrom, distanceKm, rating, addedAt: new Date().toISOString() })
      localStorage.setItem('cart', JSON.stringify(cart))
      window.dispatchEvent(new Event('cartUpdate'))
      setAddedToCart(true)
      setTimeout(() => setAddedToCart(false), 2000)
    } catch (error) { console.error('Error adding to cart:', error) }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -2 }}
      onMouseEnter={() => onHover?.(tailor)}
      onMouseLeave={() => onLeave?.(tailor)}
      className="card overflow-hidden bg-white"
    >
      {/* Image */}
      <div className="relative w-full h-44 bg-neutral-100 overflow-hidden">
        {shopPhotoUrl ? (
          <img src={shopPhotoUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl">✂️</span>
          </div>
        )}
        {/* ETA badge */}
        <div className={[
          'absolute bottom-2 left-2 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 backdrop-blur-sm',
          isAvailable ? 'bg-green-500/90 text-white' : 'bg-neutral-700/80 text-white'
        ].join(' ')}>
          <span className={['h-1.5 w-1.5 rounded-full', isAvailable ? 'bg-white' : 'bg-neutral-400'].join(' ')} />
          {isAvailable ? 'Available' : 'Busy'}
        </div>
        {/* Work type ETA */}
        <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-black/60 text-white flex items-center gap-1 backdrop-blur-sm">
          <FiClock className="w-3 h-3" /> {etaText}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="font-semibold text-base mb-1">{name}</div>

        <div className="flex items-center gap-3 text-sm text-neutral-600 mb-3">
          <span className="flex items-center gap-1"><FiStar className="text-amber-400 fill-amber-400" /> {rating.toFixed(1)} ({reviews})</span>
          <span className="flex items-center gap-1"><FiMapPin className="w-3 h-3" /> {distanceKm} km</span>
        </div>

        {/* Waiting list */}
        {currentOrders > 0 && (
          <div className="text-xs text-neutral-500 mb-3 bg-neutral-50 rounded-lg px-3 py-1.5">
            📋 {currentOrders} {currentOrders === 1 ? 'order' : 'orders'} ahead of you
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="font-semibold text-neutral-900">From ₹{priceFrom}</span>
          </div>
          {isQuickFix ? (
            <button
              onClick={handleEnquireNow}
              className="btn-primary flex-1 text-sm py-2"
            >
              Chat Now
            </button>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={addedToCart}
              className={`btn-primary flex-1 text-sm py-2 ${addedToCart ? 'opacity-75' : ''}`}
            >
              {addedToCart ? 'Added ✓' : 'Add to Cart'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default TailorListCard
