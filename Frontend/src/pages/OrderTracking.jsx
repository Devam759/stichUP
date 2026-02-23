import React, { useEffect, useMemo, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Card from '../components/ui/Card'
import MapPlaceholder from '../components/MapPlaceholder'
import PrimaryButton from '../components/ui/PrimaryButton'
import Input from '../components/ui/Input'
import { FiPhone, FiMessageCircle, FiCheck, FiX } from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

const Step = ({ label, active, done, time }) => {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className={["h-3.5 w-3.5 rounded-full", done ? 'bg-[color:var(--color-primary)]' : active ? 'bg-[color:var(--color-accent)]' : 'bg-neutral-300'].join(' ')} />
        <div className="w-0.5 flex-1 bg-neutral-200 my-1 last:hidden" />
      </div>
      <div>
        <div className={["text-sm", (done || active) ? 'text-[color:var(--color-text)] font-medium' : 'text-neutral-500'].join(' ')}>{label}</div>
        <div className="text-xs text-neutral-500">{time || '—'}</div>
      </div>
    </div>
  )
}

const OrderTracking = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const orderId = location.state?.orderId || 'ST-2049'
  // Mock data
  const [statusIndex, setStatusIndex] = useState(2) // 0..5
  const [satisfactionModalOpen, setSatisfactionModalOpen] = useState(false)
  const [isSatisfied, setIsSatisfied] = useState(null) // true, false, or null
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')
  const [showDeliverySchedule, setShowDeliverySchedule] = useState(false)
  const [rider, setRider] = useState(null) // { name, etaMin }
  const [etaSec, setEtaSec] = useState(0)
  const [proofAvailable, setProofAvailable] = useState(false)
  const steps = useMemo(() => ([
    { label: 'Requested', time: '10:30 AM' },
    { label: 'Accepted', time: '10:35 AM' },
    { label: 'In Progress', time: '10:45 AM' },
    { label: 'Ready (Awaiting Confirmation)', time: '' },
    { label: 'Out for Delivery', time: '' },
    { label: 'Delivered', time: '' },
  ]), [])

  // Initialize from navigation state
  useEffect(() => {
    const s = location.state?.status
    if (s === 'ready' || s === 'awaiting_confirmation') {
      setStatusIndex(3)
      setSatisfactionModalOpen(true)
      setProofAvailable(!!location.state?.proof)
    }
  }, [location.state])

  // Load order status from Firebase
  useEffect(() => {
    if (!orderId || orderId === 'ST-2049') return // Ignore mock
    const unsub = onSnapshot(doc(db, 'orders', orderId), (docSnap) => {
      if (docSnap.exists()) {
        const order = docSnap.data()
        if (order.status === 'Ready' && !order.satisfactionStatus) {
          setSatisfactionModalOpen(true)
          setStatusIndex(3)
        } else if (order.status === 'Not Satisfied') {
          setStatusIndex(2)
        } else if (order.status === 'Satisfied' && order.deliveryScheduled) {
          setDeliveryDate(order.deliveryDate)
          setDeliveryTime(order.deliveryTime)
          setShowDeliverySchedule(true)
        }
      }
    }, (error) => {
      console.error('Error tracking order:', error)
    })
    return () => unsub()
  }, [orderId])

  // After assigning rider, auto-complete delivery
  useEffect(() => {
    if (!rider) return
    setEtaSec((rider.etaMin || 0) * 60)
    const tick = setInterval(() => {
      setEtaSec(s => {
        if (s <= 1) {
          clearInterval(tick)
          setStatusIndex(5)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [rider])

  const handleSatisfaction = async (satisfied) => {
    setIsSatisfied(satisfied)

    if (!satisfied) {
      // Not satisfied - send back to tailor
      try {
        if (orderId !== 'ST-2049') {
          await updateDoc(doc(db, 'orders', orderId), {
            status: 'Not Satisfied',
            satisfactionStatus: false,
            notSatisfiedAt: new Date().toISOString(),
            needsRevision: true
          })
        }
      } catch (error) {
        console.error('Error updating order:', error)
      }

      setStatusIndex(2) // Back to In Progress
      setSatisfactionModalOpen(false)
      alert('Your feedback has been sent to the tailor. They will work on the changes.')
    } else {
      // Satisfied - show delivery scheduling
      setShowDeliverySchedule(true)
    }
  }

  const handleScheduleDelivery = async () => {
    if (!deliveryDate || !deliveryTime) {
      alert('Please select both date and time for delivery')
      return
    }

    try {
      if (orderId !== 'ST-2049') {
        await updateDoc(doc(db, 'orders', orderId), {
          status: 'Satisfied',
          satisfactionStatus: true,
          deliveryScheduled: true,
          deliveryDate,
          deliveryTime
        })
      }
    } catch (error) {
      console.error('Error scheduling delivery:', error)
    }

    // Assign rider for delivery
    setRider({ name: 'Rahul', vehicle: 'MH12-AB-1234', phone: '+91 98765 43210', etaMin: 12 })
    setStatusIndex(4)
    setSatisfactionModalOpen(false)
    setShowDeliverySchedule(false)
  }

  const assignRider = () => {
    setRider({ name: 'Rahul', vehicle: 'MH12-AB-1234', phone: '+91 98765 43210', etaMin: 12 })
    setStatusIndex(4)
  }

  const canCancel = statusIndex <= 1

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 grid lg:grid-cols-[1fr_420px] gap-4">
        <div className="grid gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-neutral-100 border border-neutral-200 overflow-hidden" />
                <div>
                  <div className="font-semibold">StitchUp Tailors</div>
                  <div className="text-sm text-neutral-600">Order #ST-2049</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-outline inline-flex items-center gap-2"><FiPhone /> Call</button>
                <button className="btn-outline inline-flex items-center gap-2"><FiMessageCircle /> Chat</button>
              </div>
            </div>
            <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] text-sm">
              <span className="h-2 w-2 rounded-full bg-[color:var(--color-primary)] animate-pulse" /> Live status updating
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-lg font-semibold mb-3">Status</div>
            <div className="grid" style={{ gridTemplateColumns: 'auto 1fr', gap: '8px' }}>
              {steps.map((s, i) => (
                <Step key={i} label={s.label} time={s.time} active={i === statusIndex} done={i < statusIndex} />
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-lg font-semibold mb-3">Map</div>
            <MapPlaceholder className="h-48" />
          </Card>
        </div>

        <div className="grid gap-4">
          <Card className="p-5">
            <div className="text-lg font-semibold">Order Details</div>
            <div className="mt-2 text-sm text-neutral-600">Pickup: 11:00–12:00 • Service: Alter • Cloth: Pant</div>
            <div className="mt-3 flex items-center justify-between">
              <div>Subtotal</div>
              <div>₹149</div>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <div>Pickup</div>
              <div>₹49</div>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <div>Tax</div>
              <div>₹27</div>
            </div>
            <div className="mt-3 border-t border-neutral-200 pt-3 flex items-center justify-between font-semibold">
              <div>Total</div>
              <div>₹225</div>
            </div>
            {canCancel ? <button className="btn-outline w-full mt-4">Cancel request</button> : null}
            <PrimaryButton className="w-full mt-2">Track in real-time</PrimaryButton>
          </Card>

          {rider ? (
            <Card className="p-5">
              <div className="text-lg font-semibold mb-1">Rider Assigned</div>
              <div className="text-neutral-600 text-sm">{rider.name} • {rider.vehicle}</div>
              <div className="text-neutral-600 text-sm mt-1">Phone: {rider.phone}</div>
              <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] text-sm">
                ETA {Math.floor(etaSec / 60)}:{String(etaSec % 60).padStart(2, '0')} min
              </div>
              <a href={`tel:${rider.phone.replace(/\s/g, '')}`} className="btn-primary mt-3 inline-flex items-center gap-2">Call rider</a>
            </Card>
          ) : null}
        </div>
      </main>
      <Footer />
      {/* Satisfaction Feedback Modal */}
      {satisfactionModalOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => { }} />
          <div className="absolute inset-0 grid place-items-center px-4">
            <Card className="p-6 w-full max-w-md">
              <div className="text-lg font-semibold mb-2">Order Ready - Are you satisfied?</div>
              <div className="text-neutral-600 text-sm mb-4">The tailor has marked your order as ready. Please review the completed work.</div>

              {proofAvailable && location.state?.photos && (
                <div className="mb-4">
                  <div className="text-sm font-medium mb-2">Completion Photos</div>
                  <div className="grid grid-cols-3 gap-2">
                    {location.state.photos.slice(0, 3).map((photo, idx) => (
                      <img key={idx} src={photo} alt={`Completion ${idx + 1}`} className="w-full h-20 object-cover rounded-lg border border-neutral-200" />
                    ))}
                  </div>
                </div>
              )}

              {!showDeliverySchedule ? (
                <>
                  <div className="text-sm font-medium mb-3">How do you feel about the work?</div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleSatisfaction(true)}
                      className="p-4 border-2 border-green-300 rounded-xl hover:bg-green-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <FiCheck className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-green-700">Satisfied</span>
                      </div>
                      <div className="text-xs text-neutral-600">I'm happy with the work</div>
                    </button>
                    <button
                      onClick={() => handleSatisfaction(false)}
                      className="p-4 border-2 border-red-300 rounded-xl hover:bg-red-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <FiX className="w-5 h-5 text-red-600" />
                        <span className="font-semibold text-red-700">Not Satisfied</span>
                      </div>
                      <div className="text-xs text-neutral-600">Needs changes</div>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm font-medium mb-3">Schedule Home Delivery</div>
                  <div className="grid gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Delivery Date</label>
                      <input
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:border-[color:var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Preferred Time</label>
                      <input
                        type="time"
                        value={deliveryTime}
                        onChange={(e) => setDeliveryTime(e.target.value)}
                        className="w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:border-[color:var(--color-primary)]"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        setShowDeliverySchedule(false)
                        setIsSatisfied(null)
                      }}
                      className="btn-outline flex-1"
                    >
                      Back
                    </button>
                    <PrimaryButton
                      onClick={handleScheduleDelivery}
                      className="flex-1"
                      disabled={!deliveryDate || !deliveryTime}
                    >
                      Schedule Delivery
                    </PrimaryButton>
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Delivery Scheduled Info */}
      {showDeliverySchedule && deliveryDate && deliveryTime && !satisfactionModalOpen && (
        <Card className="p-5 mb-4">
          <div className="text-lg font-semibold mb-2">Delivery Scheduled</div>
          <div className="text-sm text-neutral-600">
            Date: {new Date(deliveryDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div className="text-sm text-neutral-600">
            Time: {deliveryTime}
          </div>
        </Card>
      )}
    </div>
  )
}

export default OrderTracking


