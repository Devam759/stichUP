import React, { useEffect, useMemo, useRef, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import PrimaryButton from '../components/ui/PrimaryButton'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import Card from '../components/ui/Card'
import { FiMapPin, FiStar, FiPhone, FiMessageCircle, FiX, FiCamera, FiUpload, FiSend, FiCopy } from 'react-icons/fi'
import {
  collection, doc, onSnapshot, addDoc, updateDoc, setDoc, getDoc, serverTimestamp, arrayUnion
} from 'firebase/firestore'
import { db } from '../firebase'

const ServiceRow = ({ name, price }) => (
  <div className="flex items-center justify-between py-2 border-b last:border-b-0 border-neutral-200">
    <div className="text-sm">{name}</div>
    <div className="font-semibold">₹{price}</div>
  </div>
)

const TailorProfile = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: tailorId } = useParams()
  const workType = location.state?.workType || localStorage.getItem('workType') || 'quick'

  // Tailor data from route state or defaults
  const tailor = location.state?.tailor || {
    id: tailorId,
    name: 'StitchUP Tailors',
    rating: 4.7,
    reviews: 128,
    years: 8,
    location: 'Andheri East, Mumbai',
    bannerUrl: '',
    avatarUrl: '',
    phone: '',
    services: [
      { name: 'Shirt Alteration', price: 149 },
      { name: 'Pant Hemming', price: 129 },
      { name: 'Blouse Stitching', price: 499 },
      { name: 'Kurta Stitching', price: 699 },
    ],
    reviewsList: [
      { name: 'Aarav', rating: 5, text: 'Perfect fit and quick pickup!' },
      { name: 'Riya', rating: 5, text: 'Great quality, fast delivery.' },
    ],
  }

  // Auth
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('currentUser') || '{}') } catch { return {} }
  })()
  const customerId = currentUser?.id || 'guest'
  const customerName = currentUser?.fullName || currentUser?.name || 'Customer'

  // Chat state
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [tailorPresence, setTailorPresence] = useState('available') // available | busy
  const chatRef = useRef(null)

  // Order/work state
  const [orderDoc, setOrderDoc] = useState(null) // Firestore order doc
  const [accepted, setAccepted] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [endOpen, setEndOpen] = useState(false)
  const [proofPhotos, setProofPhotos] = useState([])
  const fileInputRef = useRef(null)
  const [phoneCopied, setPhoneCopied] = useState(false)

  // Enquiry ID
  const enquiryId = `${tailorId}_${customerId}`

  // Real-time chat listener
  useEffect(() => {
    if (!tailorId || customerId === 'guest') return
    const enquiryRef = doc(db, 'enquiries', enquiryId)

    // Ensure inquiry doc exists
    setDoc(enquiryRef, {
      tailorId,
      tailorName: tailor.name,
      customerId,
      customerName,
      messages: [],
      createdAt: new Date().toISOString(),
      isActive: true
    }, { merge: true })

    const unsub = onSnapshot(enquiryRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setMessages(data.messages || [])
      }
    })
    return unsub
  }, [tailorId, customerId])

  // Real-time tailor presence listener
  useEffect(() => {
    if (!tailorId) return
    const tailorRef = doc(db, 'users', tailorId)
    const unsub = onSnapshot(tailorRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        // Tailor is busy if they have an active chat with someone else
        const isBusy = data.activeChatWith && data.activeChatWith !== customerId
        setTailorPresence(isBusy ? 'busy' : 'available')
      }
    })
    return unsub
  }, [tailorId, customerId])

  // Mark tailor as chatting with this customer when chat opens
  useEffect(() => {
    if (!tailorId || customerId === 'guest') return
    if (chatOpen) {
      updateDoc(doc(db, 'users', tailorId), { activeChatWith: customerId }).catch(() => { })
    } else {
      // Only clear if this customer was the active one
      getDoc(doc(db, 'users', tailorId)).then(snap => {
        if (snap.exists() && snap.data().activeChatWith === customerId) {
          updateDoc(doc(db, 'users', tailorId), { activeChatWith: null }).catch(() => { })
        }
      }).catch(() => { })
    }
  }, [chatOpen])

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages, chatOpen])

  // Timer when work accepted
  useEffect(() => {
    if (!accepted) return
    const t = setInterval(() => setElapsedSec(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [accepted])

  const timerText = useMemo(() => {
    const m = Math.floor(elapsedSec / 60)
    const s = elapsedSec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }, [elapsedSec])

  const sendMessage = async () => {
    if (!input.trim()) return
    const msg = {
      id: Date.now(),
      from: 'customer',
      fromName: customerName,
      text: input.trim(),
      sentAt: new Date().toISOString()
    }
    setInput('')
    try {
      const enquiryRef = doc(db, 'enquiries', enquiryId)
      await updateDoc(enquiryRef, { messages: arrayUnion(msg) })
    } catch {
      // Fallback: local only
      setMessages(prev => [...prev, msg])
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleAcceptWork = async () => {
    try {
      const orderRef = await addDoc(collection(db, 'orders'), {
        tailorId,
        tailorName: tailor.name,
        customerId,
        customerName,
        status: 'InProgress',
        workType,
        startedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      })
      setOrderDoc({ id: orderRef.id })
      setAccepted(true)

      // Update tailor's active order count
      await updateDoc(doc(db, 'users', tailorId), {
        currentOrders: (tailor.currentOrders || 0) + 1
      }).catch(() => { })
    } catch (err) {
      console.error('Accept work error:', err)
      // Fallback — still show UI progress
      setOrderDoc({ id: 'local-' + Date.now() })
      setAccepted(true)
    }
  }

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'))
    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProofPhotos(prev => [...prev, { id: Date.now() + Math.random(), preview: reader.result, name: file.name }])
      }
      reader.readAsDataURL(file)
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleEndTask = async () => {
    if (proofPhotos.length === 0) { alert('Please upload at least one proof photo.'); return }
    try {
      if (orderDoc?.id && !orderDoc.id.startsWith('local-')) {
        await updateDoc(doc(db, 'orders', orderDoc.id), {
          status: 'Ready',
          photos: proofPhotos.map(p => p.preview),
          readyAt: new Date().toISOString(),
          satisfactionStatus: null,
          needsRevision: false
        })
      }
    } catch (err) {
      console.error('End task error:', err)
    }
    setEndOpen(false)
    navigate(`/order/${orderDoc?.id || '123'}`, {
      state: { status: 'awaiting_confirmation', proof: true, photos: proofPhotos.map(p => p.preview), orderId: orderDoc?.id }
    })
  }

  const handleSharePhone = () => {
    const phone = tailor.phone || ''
    if (phone && navigator.clipboard) {
      navigator.clipboard.writeText(phone)
      setPhoneCopied(true)
      setTimeout(() => setPhoneCopied(false), 2000)
    } else if (phone) {
      window.location.href = `tel:${phone}`
    }
  }

  const services = tailor.services || [{ name: 'Tailoring Service', price: 199 }]

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Banner */}
        <div className="relative h-44 md:h-60 w-full bg-gradient-to-br from-neutral-200 to-neutral-100">
          {tailor.bannerUrl && <img src={tailor.bannerUrl} alt="Banner" className="w-full h-full object-cover" />}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 md:left-10 md:translate-x-0">
            <div className="h-24 w-24 rounded-2xl border-4 border-white overflow-hidden bg-neutral-200 shadow-md">
              {tailor.avatarUrl
                ? <img src={tailor.avatarUrl} alt={tailor.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-3xl">✂️</div>
              }
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="mx-auto max-w-6xl px-4 pt-14">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{tailor.name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-neutral-600 mt-1 text-sm">
                <span className="flex items-center gap-1"><FiStar className="text-amber-400 fill-amber-400" /> {tailor.rating} ({tailor.reviews})</span>
                {tailor.years && <span>{tailor.years}+ yrs exp</span>}
                {tailor.location && <span className="flex items-center gap-1"><FiMapPin className="w-3 h-3" /> {tailor.location}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {tailor.phone && (
                <button
                  onClick={handleSharePhone}
                  className="btn-outline inline-flex items-center gap-2"
                  title="Copy phone number"
                >
                  {phoneCopied ? <><FiCopy /> Copied!</> : <><FiPhone /> Share Phone</>}
                </button>
              )}
              <button
                className="btn-outline inline-flex items-center gap-2"
                onClick={() => setChatOpen(true)}
              >
                <FiMessageCircle /> Chat
              </button>
            </div>
          </div>

          {/* Presence + Accept/End bar */}
          <div className="mt-5 p-3 rounded-xl border border-neutral-200 bg-white flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className={['h-2.5 w-2.5 rounded-full', tailorPresence === 'available' ? 'bg-green-500' : 'bg-yellow-500'].join(' ')} />
              <span>
                Tailor is <span className="font-medium capitalize">{tailorPresence}</span>
                {tailorPresence === 'busy' ? ' — currently chatting with another customer' : ''}
              </span>
            </div>
            {customerId !== 'guest' && !accepted ? (
              <button
                className="btn-primary"
                onClick={() => { setChatOpen(true) }}
              >
                Start Chat
              </button>
            ) : accepted ? (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] text-sm font-medium">
                  ⏱ In Progress {timerText}
                </span>
                <button className="btn-outline text-sm" onClick={() => setEndOpen(true)}>End Task</button>
              </div>
            ) : null}
          </div>

          {/* Content Grid */}
          <div className="grid lg:grid-cols-[1fr_360px] gap-4 mt-5 mb-8">
            <div className="grid gap-4">
              <Card className="p-5">
                <div className="text-base font-semibold mb-3">Services & Pricing</div>
                <div className="grid sm:grid-cols-2 gap-x-8">
                  {services.map((s, i) => <ServiceRow key={i} name={s.name} price={s.price} />)}
                </div>
              </Card>
              {tailor.reviewsList?.length > 0 && (
                <Card className="p-5">
                  <div className="text-base font-semibold mb-3">Reviews</div>
                  <div className="grid gap-3">
                    {tailor.reviewsList.map((r, i) => (
                      <div key={i} className="p-3 border border-neutral-200 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm">{r.name}</div>
                          <div className="text-xs text-neutral-600">{r.rating} ★</div>
                        </div>
                        <p className="text-neutral-600 text-sm mt-1">{r.text}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            <div className="grid gap-4 self-start">
              <Card className="p-5">
                <div className="text-base font-semibold">About</div>
                <p className="text-neutral-600 text-sm mt-2">
                  Premium tailoring with doorstep pickup & delivery. Skilled in alterations and custom stitching.
                </p>
              </Card>
              {workType && (
                <Card className="p-4 bg-[color:var(--color-primary)]/5 border-[color:var(--color-primary)]/20">
                  <div className="text-xs font-semibold text-[color:var(--color-primary)] uppercase mb-1">Selected Work Type</div>
                  <div className="font-medium">{workType === 'quick' ? '⚡ Quick Fix' : '✂️ Heavy Work'}</div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {workType === 'quick' ? 'Minor repairs, buttons, chains — ~15 min avg' : 'Full tailoring, custom stitch — ~90 min avg'}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Sticky bar */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t border-neutral-200">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="font-semibold">From ₹{services[0]?.price}</span>
            {tailor.reviews > 0 && <span className="text-neutral-500"> • {tailor.reviews}+ happy customers</span>}
          </div>
          <PrimaryButton onClick={() => { setChatOpen(true) }}>
            {accepted ? `In Progress ${timerText}` : 'Chat with Tailor'}
          </PrimaryButton>
        </div>
      </div>

      <Footer />

      {/* Chat Modal */}
      {chatOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setChatOpen(false)} />
          <div className="absolute inset-0 flex items-end sm:items-center justify-center sm:px-4">
            <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col" style={{ maxHeight: '85vh' }}>
              {/* Chat header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[color:var(--color-primary)] text-white flex-shrink-0">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    Chat with {tailor.name}
                    {accepted && (
                      <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs">⏱ {timerText}</span>
                    )}
                  </div>
                  <div className="text-xs opacity-75 flex items-center gap-1 mt-0.5">
                    <span className={['h-1.5 w-1.5 rounded-full', tailorPresence === 'available' ? 'bg-green-300' : 'bg-yellow-300'].join(' ')} />
                    {tailorPresence === 'available' ? 'Available' : 'Busy — may reply late'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!accepted && (
                    <button
                      onClick={() => handleAcceptWork()}
                      className="px-3 py-1.5 bg-white text-[color:var(--color-primary)] rounded-lg text-xs font-semibold hover:bg-white/90"
                    >
                      Accept Work
                    </button>
                  )}
                  <button onClick={() => setChatOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div ref={chatRef} className="flex-1 overflow-y-auto p-4 bg-neutral-50 space-y-2">
                {messages.length === 0 && (
                  <div className="text-center text-neutral-400 text-sm py-8">
                    Start the conversation! Describe your tailoring need.
                  </div>
                )}
                {messages.map((m, idx) => (
                  <div key={m.id || idx} className={['flex', m.from === 'customer' ? 'justify-end' : 'justify-start'].join(' ')}>
                    <div className={[
                      'max-w-[78%] px-3 py-2 rounded-2xl text-sm',
                      m.from === 'customer'
                        ? 'bg-[color:var(--color-primary)] text-white rounded-br-sm'
                        : 'bg-white border border-neutral-200 rounded-bl-sm shadow-sm'
                    ].join(' ')}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="px-3 py-3 bg-white border-t border-neutral-200 flex items-center gap-2 flex-shrink-0">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe your tailoring need..."
                  className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[color:var(--color-primary)]"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="p-2.5 bg-[color:var(--color-primary)] text-white rounded-xl disabled:opacity-40 hover:opacity-90 transition-all"
                >
                  <FiSend className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* End Task Modal */}
      {endOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEndOpen(false)} />
          <div className="absolute inset-0 grid place-items-center px-4">
            <div className="card p-5 w-full max-w-md bg-white rounded-2xl shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-lg font-semibold">End Task</div>
                  <div className="text-sm text-neutral-500">Upload proof photos to complete the order</div>
                </div>
                <button onClick={() => setEndOpen(false)} className="p-2 hover:bg-neutral-100 rounded-lg">
                  <FiX />
                </button>
              </div>

              {/* Photo upload */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-300 rounded-xl p-6 text-center cursor-pointer hover:border-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/5 transition-colors mb-3"
              >
                <FiCamera className="w-7 h-7 text-neutral-400 mx-auto mb-2" />
                <div className="text-sm font-medium text-neutral-700">Click to upload proof photos</div>
                <div className="text-xs text-neutral-400 mt-1">Share photos of the completed work</div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
              </div>

              {proofPhotos.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {proofPhotos.map(p => (
                    <div key={p.id} className="relative">
                      <img src={p.preview} alt="" className="w-full h-16 object-cover rounded-lg border border-neutral-200" />
                      <button
                        onClick={() => setProofPhotos(prev => prev.filter(x => x.id !== p.id))}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                      >
                        <FiX className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button className="btn-outline flex-1" onClick={() => setEndOpen(false)}>Cancel</button>
                <button
                  className="btn-primary flex-1"
                  onClick={handleEndTask}
                  disabled={proofPhotos.length === 0}
                >
                  Submit & Notify Customer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TailorProfile
