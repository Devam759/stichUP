import React, { useState, useEffect } from 'react'
import TailorLayout from '../../layouts/TailorLayout'
import Card from '../../components/ui/Card'
import PrimaryButton from '../../components/ui/PrimaryButton'
import { FiCalendar } from 'react-icons/fi'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'

const Row = ({ label, value }) => (
  <div className="flex items-center justify-between py-2 border-b last:border-b-0 border-neutral-200">
    <div>{label}</div>
    <div className="font-semibold">{value}</div>
  </div>
)


const Earnings = () => {
  const [dailyHistory, setDailyHistory] = useState([])
  const [totalWallet, setTotalWallet] = useState(0)
  const [totalAvailable, setTotalAvailable] = useState(0)

  useEffect(() => {
    let unsub = null
    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || '{}')
      const tailorId = u.phone || u.id
      if (!tailorId) return

      const q = query(collection(db, 'orders'), where('tailorId', '==', tailorId))
      unsub = onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(d => d.data())

        // Aggregate earnings
        let gross = 0
        const mapByDate = {}

        for (const o of orders) {
          if (o.status !== 'Request' && o.status !== 'Rejected') {
            const price = Number(o.priceFrom) || 150
            gross += price

            const dateObj = new Date(o.createdAt || Date.now())
            const dayKey = dateObj.toISOString().split('T')[0]

            if (!mapByDate[dayKey]) {
              mapByDate[dayKey] = { date: dayKey, paymentsCount: 0, totalAmount: 0 }
            }
            mapByDate[dayKey].paymentsCount += 1
            mapByDate[dayKey].totalAmount += price
          }
        }

        const historyArray = Object.values(mapByDate).sort((a, b) => b.date.localeCompare(a.date))
        setDailyHistory(historyArray)
        setTotalWallet(gross)
        setTotalAvailable(gross)
      })
    } catch (e) { console.error('Error loading earnings', e) }

    return () => { if (unsub) unsub() }
  }, [])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  return (
    <TailorLayout>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="text-lg font-semibold">Wallet</div>
          <div className="text-3xl font-semibold mt-2">₹{totalWallet.toLocaleString('en-IN')}</div>
          <div className="text-sm text-neutral-600 mt-1">Available to withdraw</div>
          <PrimaryButton className="mt-3 w-full">Withdraw</PrimaryButton>
        </Card>
        <Card className="p-5 lg:col-span-2">
          <div className="text-lg font-semibold mb-3">Earnings Summary</div>
          <Row label="Total Value" value={`₹${totalWallet.toLocaleString('en-IN')}`} />
          <Row label="Estimated Delivery Payout" value={`₹${Math.round(totalWallet * 0.9).toLocaleString('en-IN')}`} />
          <Row label="Platform Commission" value={`₹${Math.round(totalWallet * 0.1).toLocaleString('en-IN')}`} />
        </Card>
      </div>

      {/* Daily Payment History */}
      <Card className="p-5 mt-4">
        <div className="flex items-center gap-2 mb-4">
          <FiCalendar className="w-5 h-5 text-[color:var(--color-primary)]" />
          <div className="text-lg font-semibold">Daily Payment History</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-600 border-b border-neutral-200">
                <th className="py-3 px-2 font-semibold">Date</th>
                <th className="py-3 px-2 font-semibold">Payments</th>
                <th className="py-3 px-2 font-semibold text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {dailyHistory.map((day, index) => (
                <tr key={index} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="py-3 px-2">
                    <div className="font-medium">{formatDate(day.date)}</div>
                    <div className="text-xs text-neutral-500">{day.date}</div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{day.paymentsCount}</span>
                      <span className="text-neutral-600 text-xs">
                        {day.paymentsCount === 1 ? 'payment' : 'payments'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="font-semibold text-green-700">₹{day.totalAmount.toLocaleString('en-IN')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {dailyHistory.length === 0 && (
            <div className="text-center py-8 text-neutral-500">
              No payment history available
            </div>
          )}
        </div>
      </Card>
    </TailorLayout>
  )
}

export default Earnings


