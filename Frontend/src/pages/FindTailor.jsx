import React, { useEffect, useMemo, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import TailorListCard from '../components/TailorListCard'
import { FiSearch, FiZap, FiScissors } from 'react-icons/fi'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { collection, getDocs, where, query as fsQuery } from 'firebase/firestore'
import { db } from '../firebase'


const FindTailor = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [workType, setWorkType] = useState('quick') // quick | heavy
  const [hovered, setHovered] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    availability: 'all',
    minRating: 0,
    maxDistance: 10,
    minPrice: 0,
    maxPrice: 1000,
    sortBy: 'distance'
  })
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [allTailors, setAllTailors] = useState([])

  // Sync workType from URL params
  useEffect(() => {
    const typeParam = params.get('type')
    if (typeParam === 'heavy' || typeParam === 'quick') setWorkType(typeParam)
  }, [params])

  useEffect(() => {
    const fetchTailors = async () => {
      try {
        const q = fsQuery(collection(db, 'users'), where('role', '==', 'tailor'))
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
            priceFrom: data.priceFrom || 150,
            lightTaskAvgMin: data.lightTaskAvgMin || 15,
            heavyTaskAvgMin: data.heavyTaskAvgMin || 90,
          }
        })
        setAllTailors(docs)
      } catch (e) {
        console.error('Failed to load tailors via Firestore', e)
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
      return a.distanceKm - b.distanceKm
    })
    return filtered
  }, [allTailors, searchQuery, filters])

  const handleSelectTailor = (tailor) => {
    localStorage.setItem('workType', workType)
    navigate(`/tailor/${tailor.id}`, { state: { tailor, workType } })
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-4">

          {/* Work Type Selector */}
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">
              What kind of work do you need?
            </h2>
            <div className="grid grid-cols-2 gap-3 max-w-lg">
              <button
                onClick={() => setWorkType('quick')}
                className={[
                  'relative flex items-start gap-3 p-4 rounded-2xl border-2 transition-all text-left',
                  workType === 'quick'
                    ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/5 shadow-sm'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                ].join(' ')}
              >
                <div className={[
                  'h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0',
                  workType === 'quick' ? 'bg-[color:var(--color-primary)]/15' : 'bg-neutral-100'
                ].join(' ')}>
                  <FiZap className={workType === 'quick' ? 'text-[color:var(--color-primary)]' : 'text-neutral-500'} />
                </div>
                <div>
                  <div className={['font-semibold text-sm', workType === 'quick' ? 'text-[color:var(--color-primary)]' : 'text-neutral-800'].join(' ')}>
                    Quick Fix
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">Button, stitch, chain, minor repairs — ~15 min</div>
                </div>
                {workType === 'quick' && (
                  <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[color:var(--color-primary)]" />
                )}
              </button>

              <button
                onClick={() => setWorkType('heavy')}
                className={[
                  'relative flex items-start gap-3 p-4 rounded-2xl border-2 transition-all text-left',
                  workType === 'heavy'
                    ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/5 shadow-sm'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                ].join(' ')}
              >
                <div className={[
                  'h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0',
                  workType === 'heavy' ? 'bg-[color:var(--color-primary)]/15' : 'bg-neutral-100'
                ].join(' ')}>
                  <FiScissors className={workType === 'heavy' ? 'text-[color:var(--color-primary)]' : 'text-neutral-500'} />
                </div>
                <div>
                  <div className={['font-semibold text-sm', workType === 'heavy' ? 'text-[color:var(--color-primary)]' : 'text-neutral-800'].join(' ')}>
                    Heavy Work
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">Full tailoring, custom stitch — ~90 min+</div>
                </div>
                {workType === 'heavy' && (
                  <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[color:var(--color-primary)]" />
                )}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-white rounded-xl border border-neutral-200 px-3 py-2 shadow-soft mb-4">
            <FiSearch className="text-neutral-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tailors by name..."
              className="flex-1 outline-none bg-transparent text-sm"
            />
          </div>

          {/* Main Content Grid */}
          <div className="flex gap-4">
            {/* Filters Panel */}
            <aside className="hidden md:block w-60 shrink-0">
              <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-soft sticky top-4">
                <h3 className="text-base font-semibold mb-4">Filters</h3>
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-medium text-neutral-700 mb-1.5 block">Availability</label>
                    <select
                      value={filters.availability}
                      onChange={(e) => setFilters({ ...filters, availability: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/20"
                    >
                      <option value="all">All</option>
                      <option value="available">Available</option>
                      <option value="busy">Busy</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-700 mb-1.5 block">Min Rating: {filters.minRating.toFixed(1)} ⭐</label>
                    <input type="range" min="0" max="5" step="0.1" value={filters.minRating}
                      onChange={(e) => setFilters({ ...filters, minRating: parseFloat(e.target.value) })} className="w-full accent-[color:var(--color-primary)]" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-700 mb-1.5 block">Max Distance: {filters.maxDistance} km</label>
                    <input type="range" min="0" max="10" step="0.5" value={filters.maxDistance}
                      onChange={(e) => setFilters({ ...filters, maxDistance: parseFloat(e.target.value) })} className="w-full accent-[color:var(--color-primary)]" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-700 mb-1.5 block">Sort By</label>
                    <select value={filters.sortBy}
                      onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none">
                      <option value="distance">Distance (Nearest)</option>
                      <option value="rating">Rating (Highest)</option>
                      <option value="price">Price (Lowest)</option>
                    </select>
                  </div>
                  <button
                    onClick={() => setFilters({ availability: 'all', minRating: 0, maxDistance: 10, minPrice: 0, maxPrice: 1000, sortBy: 'distance' })}
                    className="w-full px-4 py-2 text-sm text-[color:var(--color-primary)] border border-[color:var(--color-primary)]/30 rounded-lg hover:bg-[color:var(--color-primary)]/5 transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </aside>

            {/* Tailors List */}
            <div className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-6">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="card p-4 animate-pulse">
                      <div className="w-full h-44 rounded-xl bg-neutral-200 mb-3" />
                      <div className="h-4 w-40 bg-neutral-200 rounded mb-2" />
                      <div className="h-3 w-56 bg-neutral-200 rounded" />
                    </div>
                  ))
                ) : list.length ? (
                  list.map((t) => (
                    <div key={t.id} onClick={() => handleSelectTailor(t)} className="cursor-pointer">
                      <TailorListCard
                        tailor={t}
                        onHover={setHovered}
                        onLeave={() => setHovered(null)}
                        isQuickFix={workType === 'quick'}
                        workType={workType}
                      />
                    </div>
                  ))
                ) : (
                  <div className="col-span-full card p-6 text-center text-neutral-500">
                    No tailors match your search. Try adjusting the filters.
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

export default FindTailor
