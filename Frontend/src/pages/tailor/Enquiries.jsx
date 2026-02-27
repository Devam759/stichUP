import React, { useEffect, useRef, useState } from 'react'
import TailorLayout from '../../layouts/TailorLayout'
import Card from '../../components/ui/Card'
import PrimaryButton from '../../components/ui/PrimaryButton'
import Input from '../../components/ui/Input'
import { useSearchParams, Link } from 'react-router-dom'
import { collection, query, where, onSnapshot, doc, setDoc, addDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { db } from '../../firebase'
import { FiSend, FiCheck, FiX, FiPhone } from 'react-icons/fi'

const TailorEnquiries = () => {
  const [params] = useSearchParams()
  const customerId = params.get('customerId')
  const customerName = params.get('customerName') || 'Customer'
  const [allEnquiries, setAllEnquiries] = useState([])
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [customPricing, setCustomPricing] = useState({ service: '', price: '' })
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [workAccepted, setWorkAccepted] = useState(false)
  const chatRef = useRef(null)

  const currentTailor = (() => {
    try { return JSON.parse(localStorage.getItem('currentUser') || '{}') } catch { return {} }
  })()
  const tailorId = currentTailor?.id || currentTailor?.phone

  // enquiry doc ID matches what TailorProfile creates: tailorId_customerId
  const enquiryId = customerId ? `${tailorId}_${customerId}` : null

  // Load all enquiries list for this tailor
  useEffect(() => {
    if (customerId || !tailorId) return
    const unsub = onSnapshot(
      query(collection(db, 'enquiries'), where('tailorId', '==', tailorId)),
      (snapshot) => {
        let list = snapshot.docs.map(d => ({ docId: d.id, ...d.data() }))
        list.sort((a, b) => new Date(b.lastUpdated || b.createdAt || 0) - new Date(a.lastUpdated || a.createdAt || 0))
        setAllEnquiries(list)
      },
      (err) => console.error('Enquiries load error:', err)
    )
    return unsub
  }, [tailorId, customerId])

  // Load specific conversation
  useEffect(() => {
    if (!enquiryId) return
    const unsub = onSnapshot(doc(db, 'enquiries', enquiryId), (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setMessages(data.messages || [])
        setWorkAccepted(data.workAccepted || false)
      }
    }, (err) => console.error('Chat load error:', err))
    return unsub
  }, [enquiryId])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages])

  const sendMessage = async () => {
    if (!chatInput.trim() || !enquiryId) return
    const msg = {
      id: Date.now(),
      from: 'tailor',
      fromName: currentTailor?.fullName || currentTailor?.name || 'Tailor',
      text: chatInput.trim(),
      sentAt: new Date().toISOString()
    }
    setChatInput('')
    try {
      await setDoc(doc(db, 'enquiries', enquiryId), {
        tailorId,
        tailorName: currentTailor?.fullName || currentTailor?.name || 'Tailor',
        customerId,
        customerName,
        lastUpdated: new Date().toISOString()
      }, { merge: true })
      await updateDoc(doc(db, 'enquiries', enquiryId), { messages: arrayUnion(msg) })
    } catch (err) {
      console.error('Send msg error:', err)
      setMessages(prev => [...prev, msg])
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleSharePhone = () => {
    const phone = currentTailor?.phone || ''
    if (!phone) return
    // Send tailor's phone as a chat message to customer
    const msg = {
      id: Date.now(),
      from: 'tailor',
      type: 'phone_share',
      text: `📞 My contact number: +91 ${phone}`,
      sentAt: new Date().toISOString()
    }
    if (enquiryId) {
      updateDoc(doc(db, 'enquiries', enquiryId), { messages: arrayUnion(msg) }).catch(console.error)
    }
  }

  const handleAcceptWork = async () => {
    if (!enquiryId || !tailorId) return
    try {
      // Create order in Firestore
      await addDoc(collection(db, 'orders'), {
        tailorId,
        tailorName: currentTailor?.fullName || currentTailor?.name || 'Tailor',
        customerId,
        customerName,
        status: 'Accepted',
        workType: 'custom',
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
      })
      // Mark enquiry as accepted + send system message
      const acceptMsg = {
        id: Date.now(),
        from: 'tailor',
        type: 'system',
        text: '✅ Tailor has accepted your work! Order is now in progress.',
        sentAt: new Date().toISOString()
      }
      await setDoc(doc(db, 'enquiries', enquiryId), {
        workAccepted: true,
        acceptedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }, { merge: true })
      await updateDoc(doc(db, 'enquiries', enquiryId), { messages: arrayUnion(acceptMsg) })
      setWorkAccepted(true)
    } catch (err) {
      console.error('Accept work error:', err)
    }
  }

  const handleAddCustomPricing = async () => {
    if (!customPricing.service || !customPricing.price || !enquiryId) return
    const msg = {
      id: Date.now(),
      from: 'tailor',
      type: 'pricing',
      text: `💵 Custom Quote: ${customPricing.service} — ₹${customPricing.price}`,
      pricing: { service: customPricing.service, price: customPricing.price },
      sentAt: new Date().toISOString()
    }
    setCustomPricing({ service: '', price: '' })
    try {
      await updateDoc(doc(db, 'enquiries', enquiryId), { messages: arrayUnion(msg) })
    } catch (err) { console.error(err) }
  }

  const handleReject = async () => {
    if (!rejectReason.trim() || !enquiryId) return
    const msg = {
      id: Date.now(),
      from: 'tailor',
      type: 'rejection',
      text: `❌ Sorry, I cannot take this order. Reason: ${rejectReason}`,
      sentAt: new Date().toISOString()
    }
    setShowRejectModal(false)
    setRejectReason('')
    try {
      await setDoc(doc(db, 'enquiries', enquiryId), { status: 'rejected', lastUpdated: new Date().toISOString() }, { merge: true })
      await updateDoc(doc(db, 'enquiries', enquiryId), { messages: arrayUnion(msg) })
    } catch (err) { console.error(err) }
  }

  // ── List View (no customerId) ──────────────────────────────────────────────
  if (!customerId) {
    return (
      <TailorLayout>
        <div className="max-w-3xl">
          <div className="mb-5">
            <h1 className="text-2xl font-bold">Enquiries</h1>
            <p className="text-neutral-500 text-sm mt-1">Customer conversations & work requests</p>
          </div>
          {allEnquiries.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-4xl mb-3">💬</div>
              <div className="font-medium text-neutral-700">No enquiries yet</div>
              <div className="text-sm text-neutral-500 mt-1">Customers will contact you from your tailor profile.</div>
            </Card>
          ) : (
            <div className="grid gap-3">
              {allEnquiries.map((enquiry) => {
                const last = enquiry.messages?.slice(-1)[0]
                const isUnread = last?.from === 'customer'
                return (
                  <Link
                    key={enquiry.customerId || enquiry.docId}
                    to={`/tailor/enquiries?customerId=${enquiry.customerId}&customerName=${encodeURIComponent(enquiry.customerName || 'Customer')}`}
                    className="card p-4 hover:shadow-md transition-shadow flex items-center gap-4"
                  >
                    <div className="h-11 w-11 rounded-full bg-[color:var(--color-primary)]/10 flex items-center justify-center text-lg flex-shrink-0">
                      {(enquiry.customerName || 'C')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{enquiry.customerName || 'Customer'}</span>
                        {enquiry.workAccepted && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Accepted</span>}
                        {isUnread && !enquiry.workAccepted && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">New</span>}
                      </div>
                      <div className="text-sm text-neutral-500 truncate mt-0.5">{last?.text || 'No messages yet'}</div>
                    </div>
                    {enquiry.lastUpdated && (
                      <div className="text-xs text-neutral-400 flex-shrink-0">
                        {new Date(enquiry.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </TailorLayout>
    )
  }

  // ── Conversation View ──────────────────────────────────────────────────────
  return (
    <TailorLayout>
      <div className="max-w-3xl">
        <div className="mb-4 flex items-center gap-3">
          <Link to="/tailor/enquiries" className="text-sm text-[color:var(--color-primary)] hover:underline">← Back</Link>
          <h1 className="text-xl font-semibold">{customerName}</h1>
          {workAccepted && <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">Work Accepted ✓</span>}
        </div>

        {/* Action bar */}
        {!workAccepted && (
          <Card className="p-4 mb-4 flex flex-wrap items-center gap-3 bg-amber-50 border-amber-200">
            <div className="flex-1 text-sm text-amber-800">
              <span className="font-medium">Incoming work request</span> — Chat with the customer, then accept or reject
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSharePhone}
                className="px-3 py-2 rounded-lg border border-neutral-300 text-sm flex items-center gap-1.5 hover:bg-white transition-colors"
              >
                <FiPhone className="w-3.5 h-3.5" /> Share Phone
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                className="px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50 transition-colors"
              >
                <FiX className="w-3.5 h-3.5 inline mr-1" />Reject
              </button>
              <button
                onClick={handleAcceptWork}
                className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors flex items-center gap-1.5"
              >
                <FiCheck className="w-3.5 h-3.5" /> Accept Work
              </button>
            </div>
          </Card>
        )}

        {/* Custom Pricing */}
        <Card className="p-4 mb-4">
          <div className="text-sm font-semibold mb-3">Send Custom Quote</div>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <Input label="Service" value={customPricing.service}
              onChange={(e) => setCustomPricing({ ...customPricing, service: e.target.value })}
              placeholder="e.g., Shirt Alteration" />
            <Input label="Price (₹)" type="number" value={customPricing.price}
              onChange={(e) => setCustomPricing({ ...customPricing, price: e.target.value })}
              placeholder="Enter amount" />
          </div>
          <button
            onClick={handleAddCustomPricing}
            disabled={!customPricing.service || !customPricing.price}
            className="px-4 py-2 rounded-lg bg-[color:var(--color-primary)] text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-all"
          >
            Send Quote in Chat
          </button>
        </Card>

        {/* Chat */}
        <Card className="p-4">
          <div ref={chatRef} className="h-80 overflow-y-auto rounded-xl bg-neutral-50 p-3 mb-3 space-y-2">
            {messages.length === 0
              ? <div className="text-center text-neutral-400 text-sm py-10">No messages yet</div>
              : messages.map((m, i) => (
                <div key={m.id || i} className={['flex', m.from === 'tailor' ? 'justify-end' : 'justify-start'].join(' ')}>
                  <div className={[
                    'max-w-[78%] px-3 py-2 rounded-2xl text-sm',
                    m.type === 'system' ? 'bg-green-50 border border-green-200 text-green-800 mx-auto text-center text-xs' :
                      m.type === 'rejection' ? 'bg-red-50 border border-red-200 text-red-800' :
                        m.from === 'tailor' ? 'bg-[color:var(--color-primary)] text-white rounded-br-sm' : 'bg-white border border-neutral-200 rounded-bl-sm'
                  ].join(' ')}>
                    {m.text}
                    <div className={['text-xs mt-0.5', m.from === 'tailor' && m.type !== 'system' && m.type !== 'rejection' ? 'text-white/60' : 'text-neutral-400'].join(' ')}>
                      {m.sentAt ? new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                </div>
              ))}
          </div>
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your reply..."
              className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[color:var(--color-primary)]"
            />
            <button
              onClick={sendMessage}
              disabled={!chatInput.trim()}
              className="p-2.5 bg-[color:var(--color-primary)] text-white rounded-xl disabled:opacity-40 hover:opacity-90"
            >
              <FiSend className="w-4 h-4" />
            </button>
          </div>
        </Card>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="p-6 max-w-sm w-full mx-4 bg-white rounded-2xl">
            <div className="text-lg font-semibold mb-3">Reject Order</div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejecting (e.g. not available, out of scope)..."
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:border-red-400 h-24 resize-none text-sm"
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowRejectModal(false)} className="btn-outline flex-1">Cancel</button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-red-700 transition-colors"
              >Reject & Notify</button>
            </div>
          </Card>
        </div>
      )}
    </TailorLayout>
  )
}

export default TailorEnquiries
