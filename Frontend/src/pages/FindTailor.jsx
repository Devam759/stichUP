import React, { useEffect, useMemo, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import TailorListCard from '../components/TailorListCard'
import { FiSearch } from 'react-icons/fi'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase'


const FindTailor = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [workType, setWorkType] = useState('quick') // quick | heavy
  const [hovered, setHovered] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    availability: 'all', // all, available, busy
    minRating: 0,
    maxDistance: 10,
    minPrice: 0,
    maxPrice: 1000,
    sortBy: 'distance' // distance, rating, price
  })
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [allTailors, setAllTailors] = useState([])

  useEffect(() => {
    const fetchTailors = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'tailor'))
        const qs = await getDocs(q)
        const docs = qs.docs.map(d => {
          const data = d.data()
          return {
            id: d.id,
            name: data.fullName || data.name || 'Tailor',
            shopPhotoUrl: data.shopPhotoUrl || '',
            isAvailable: typeof data.isAvailable === 'boolean' ? data.isAvailable : true,
            currentOrders: data.currentOrders || 0,
            distanceKm: data.distanceKm || 0,
            rating: data.rating || 4.5,
            reviews: data.reviews || 0,
            priceFrom: data.priceFrom || 150
          }
        })
        setAllTailors(docs)
      } catch (e) {
        console.error("Failed to load tailors via Firestore", e)
        setAllTailors([])
      } finally {
        setLoading(false)
      }
    }
    fetchTailors()
  }, [])

  const list = useMemo(() => {
    let filtered = allTailors.filter(t => {
      if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (filters.availability === 'available' && !t.isAvailable) return false
      if (filters.availability === 'busy' && t.isAvailable) return false
      if (t.rating < filters.minRating) return false
      if (t.distanceKm > filters.maxDistance) return false
      if (t.priceFrom < filters.minPrice || t.priceFrom > filters.maxPrice) return false
      return true
    })

    filtered.sort((a, b) => {
      if (filters.sortBy === 'rating') return b.rating - a.rating
      if (filters.sortBy === 'price') return a.priceFrom - b.priceFrom
      if (filters.sortBy === 'distance') return a.distanceKm - b.distanceKm
      return 0
    })

    return filtered
  }, [allTailors, searchQuery, filters])

  // (Timer removed because Firestore natively sets loading status)
  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-center gap-2 bg-white rounded-xl border border-neutral-200 px-3 py-2 shadow-soft">
              <FiSearch className="text-neutral-500" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tailors by name"
                className="flex-1 outline-none bg-transparent"
              />
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="flex gap-4">
            {/* Filters Panel - Left Sidebar */}
            <aside className="hidden md:block w-64 shrink-0">
              <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-soft sticky top-4">
                <h3 className="text-lg font-semibold mb-4">Filters</h3>

                <div className="space-y-6">
                  {/* Availability Filter */}
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-2 block">Availability</label>
                    <select
                      value={filters.availability}
                      onChange={(e) => setFilters({ ...filters, availability: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All</option>
                      <option value="available">Available</option>
                      <option value="busy">Busy</option>
                    </select>
                  </div>

                  {/* Rating Filter */}
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-2 block">
                      Min Rating: {filters.minRating.toFixed(1)} ⭐
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.1"
                      value={filters.minRating}
                      onChange={(e) => setFilters({ ...filters, minRating: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  {/* Distance Filter */}
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-2 block">
                      Max Distance: {filters.maxDistance} km
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={filters.maxDistance}
                      onChange={(e) => setFilters({ ...filters, maxDistance: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-2 block">
                      Min Price: ₹{filters.minPrice}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="500"
                      step="10"
                      value={filters.minPrice}
                      onChange={(e) => setFilters({ ...filters, minPrice: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-2 block">
                      Max Price: ₹{filters.maxPrice}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      step="10"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters({ ...filters, maxPrice: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-2 block">Sort By</label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="distance">Distance (Nearest)</option>
                      <option value="rating">Rating (Highest)</option>
                      <option value="price">Price (Lowest)</option>
                    </select>
                  </div>

                  <button
                    onClick={() => setFilters({
                      availability: 'all',
                      minRating: 0,
                      maxDistance: 10,
                      minPrice: 0,
                      maxPrice: 1000,
                      sortBy: 'distance'
                    })}
                    className="w-full px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </aside>

            {/* Tailors List - Right Side */}
            <div className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-4">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="card p-4 animate-pulse">
                      <div className="flex gap-3">
                        <div className="w-20 h-20 rounded-xl bg-neutral-200" />
                        <div className="flex-1 grid gap-2">
                          <div className="h-4 w-40 bg-neutral-200 rounded" />
                          <div className="h-3 w-56 bg-neutral-200 rounded" />
                          <div className="h-6 w-56 bg-neutral-200 rounded" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : list.length ? (
                  list.map((t) => {
                    // Determine if this is quick fix based on URL params or localStorage
                    const workType = params.get('type') === 'heavy' ? 'heavy' : (localStorage.getItem('workType') === 'heavy' ? 'heavy' : 'light')
                    const isQuickFix = workType !== 'heavy'

                    return (
                      <TailorListCard
                        key={t.id}
                        tailor={t}
                        onHover={setHovered}
                        onLeave={() => setHovered(null)}
                        isQuickFix={isQuickFix}
                      />
                    )
                  })
                ) : (
                  <div className="card p-6 text-center text-neutral-600">
                    No tailors match. Adjust filters or pick another work type.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

const Chip = ({ label, selected, onClick }) => (
  <motion.button
    whileTap={{ scale: 0.98 }}
    whileHover={{ y: -1 }}
    onClick={onClick}
    className={[
      'px-3 py-1.5 rounded-full border text-sm',
      selected
        ? 'border-(--color-primary) text-(--color-primary) bg-(--color-primary)/10'
        : 'border-neutral-200 hover:border-(--color-primary)'
    ].join(' ')}
  >
    {label}
  </motion.button>
)

export default FindTailor


