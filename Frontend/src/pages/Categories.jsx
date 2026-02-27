import React from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'

const Categories = () => {
  const navigate = useNavigate()
  const { type } = useParams()

  const quickFixCategories = [
    { id: 'shirt', name: 'Shirt', image: '/categories/shirt.png' },
    { id: 'pant', name: 'Pant', image: '/categories/pants.png' },
    { id: 'jacket', name: 'Jacket', image: '/categories/jacket.png' },
    { id: 'kurta', name: 'Kurta', image: '/categories/kurta.png' },
    { id: 'dress', name: 'Dress', image: '/categories/dress.png' },
    { id: 'saree', name: 'Saree', image: '/categories/saree.png' },
    { id: 'other', name: 'Other', image: '/categories/others.png' },
  ]

  const heavyTailoringCategories = [
    { id: 'suit', name: 'Suit', image: '/categories/suit.png' },
    { id: 'blazer', name: 'Blazer', image: '/categories/blazer.png' },
    { id: 'dress', name: 'Dress', image: '/categories/dress.png' },
    { id: 'sherwani', name: 'Sherwani', image: '/categories/Shwerwani.png' },
    { id: 'lehenga', name: 'Lehenga', image: '/categories/Lehenga.png' },
    { id: 'saree', name: 'Saree', image: '/categories/Saree_heavy.png' },
    { id: 'traditional', name: 'Traditional', image: '/categories/Traditional.png' },
    { id: 'other', name: 'Other', image: '/categories/others.png' },
  ]

  const categories = type === 'heavy-tailoring' ? heavyTailoringCategories : quickFixCategories
  const title = type === 'heavy-tailoring' ? 'Heavy Tailoring' : 'Quick Fix'

  const handleCategorySelect = (categoryId) => {
    try { localStorage.setItem('selectedCategory', categoryId) } catch { }
    if (type === 'heavy-tailoring') {
      try { localStorage.setItem('workType', 'heavy') } catch { }
      navigate(`/find?type=heavy&category=${categoryId}`)
    } else {
      navigate(`/quick-fix-options?category=${categoryId}`)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 px-6 py-10">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">Select Category</h1>
            <p className="mt-2 text-neutral-500">{title} — Choose the type of garment you need help with</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((cat, i) => (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleCategorySelect(cat.id)}
                className="rounded-xl border border-neutral-200 overflow-hidden text-left hover:border-neutral-300 hover:shadow-sm transition-all group"
              >
                <div className="aspect-[4/5] bg-neutral-100 overflow-hidden">
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-3">
                  <div className="font-semibold text-neutral-900 text-sm">{cat.name}</div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default Categories
