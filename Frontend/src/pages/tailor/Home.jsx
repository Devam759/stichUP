import React, { useEffect, useState } from 'react'
import TailorLayout from '../../layouts/TailorLayout'
import Card from '../../components/ui/Card'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'

const Stat = ({ label, value, sub }) => (
  <Card className="p-5">
    <div className="text-sm text-neutral-600">{label}</div>
    <div className="text-2xl font-semibold mt-1">{value}</div>
    {sub ? <div className="text-xs text-neutral-500 mt-1">{sub}</div> : null}
  </Card>
)

const Home = () => {
  const [stats, setStats] = useState({ orders: 0, earnings: 0, rating: 4.7 })
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('currentUser') || '{}')
    const tailorId = u.id || u.phone
    if (!tailorId) return

    const q = query(collection(db, 'orders'), where('tailorId', '==', tailorId))
    const unsub = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      const today = new Date().toISOString().split('T')[0]
      const todayOrders = orders.filter(o => o.createdAt?.startsWith(today))
      const totalEarnings = orders.reduce((acc, o) => acc + (o.priceFrom || 0), 0)

      setStats({
        orders: todayOrders.length,
        earnings: totalEarnings,
        rating: u.rating || 4.7
      })

      setRecentOrders(orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5))
      setLoading(false)
    })

    return () => unsub()
  }, [])

  return (
    <TailorLayout>
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="Orders today" value={stats.orders} sub="Across all services" />
        <Stat label="Total Earnings" value={`₹${stats.earnings}`} sub="Lifetime" />
        <Stat label="Rating" value={stats.rating} sub="From latest reviews" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card className="p-5">
          <div className="text-lg font-semibold mb-3">Recent orders</div>
          {loading ? (
            <div className="text-sm text-neutral-500 animate-pulse">Loading orders...</div>
          ) : recentOrders.length ? (
            <div className="grid gap-3">
              {recentOrders.map(o => (
                <div key={o.id} className="flex justify-between items-center py-2 border-b last:border-0 border-neutral-100">
                  <div>
                    <div className="font-medium">#{o.id.substring(0, 6)} - {o.cloth}</div>
                    <div className="text-xs text-neutral-500">{o.service}</div>
                  </div>
                  <div className="text-sm font-semibold text-(--color-primary)">₹{o.priceFrom}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-neutral-600 text-sm">No new orders</div>
          )}
        </Card>
      </div>
    </TailorLayout>
  )
}

export default Home



