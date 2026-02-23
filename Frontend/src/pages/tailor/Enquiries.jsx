import React, { useEffect, useRef, useState } from 'react'
import TailorLayout from '../../layouts/TailorLayout'
import Card from '../../components/ui/Card'
import PrimaryButton from '../../components/ui/PrimaryButton'
import Input from '../../components/ui/Input'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../../firebase'

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
  const chatRef = useRef(null)
  const navigate = useNavigate()

  // Get current tailor info
  const [currentTailor, setCurrentTailor] = useState(null)

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('currentUser') || '{}')
      if (user && user.role === 'tailor') {
        setCurrentTailor(user)
      }
    } catch (error) {
      console.error('Error loading current tailor:', error)
    }
  }, [])

  // Load enquiries for this tailor
  useEffect(() => {
    if (customerId) return // Detail view handles its own listener

    const tailorId = currentTailor?.phone || currentTailor?.id
    if (!tailorId) return

    const unsub = onSnapshot(query(collection(db, 'enquiries'), where('tailorId', '==', tailorId)), (snapshot) => {
      let list = snapshot.docs.map(doc => doc.data())
      list.sort((a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0))
      setAllEnquiries(list)
    }, (error) => {
      console.error('Error loading tailor enquiries via Firestore:', error)
    })
    return () => unsub()
  }, [currentTailor, customerId])

  // Load messages for specific customer conversation
  useEffect(() => {
    if (!customerId || !currentTailor) return
    const tailorId = currentTailor.phone || currentTailor.id
    const docId = `${customerId}_${tailorId}`

    const unsub = onSnapshot(doc(db, 'enquiries', docId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data()
        setMessages(data.messages || [])
      } else {
        setMessages([])
      }
    }, (error) => {
      console.error('Error loading enquiries via Firestore:', error)
    })
    return () => unsub()
  }, [customerId, currentTailor])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages])

  const sendToFirestore = async (newMessagesArray, statusUpdate = null) => {
    const tailorId = currentTailor?.phone || currentTailor?.id
    const tailorName = currentTailor?.name || currentTailor?.fullName || 'Tailor'
    const docId = `${customerId}_${tailorId}`

    const payload = {
      customerId,
      customerName,
      tailorId,
      tailorName,
      messages: newMessagesArray,
      lastUpdated: new Date().toISOString()
    }
    if (statusUpdate) payload.status = statusUpdate

    await setDoc(doc(db, 'enquiries', docId), payload, { merge: true })
  }

  const sendMessage = async () => {
    if (!chatInput.trim() || !customerId || !currentTailor) return

    const newMessage = {
      id: Date.now(),
      from: 'tailor',
      text: chatInput.trim(),
      createdAt: new Date().toISOString()
    }

    const updatedMessages = [...messages, newMessage]
    setChatInput('')
    await sendToFirestore(updatedMessages)
  }

  // If no customerId, show list of all enquiries for this tailor
  if (!customerId) {
    return (
      <TailorLayout>
        <div className="max-w-4xl">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-extrabold mb-2">My Enquiries</h1>
            <div className="text-neutral-600">View and manage enquiries from customers</div>
          </div>

          {allEnquiries.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-neutral-600 mb-4">No enquiries yet</div>
              <div className="text-sm text-neutral-500">Customers will send enquiries here when they want to contact you.</div>
            </Card>
          ) : (
            <div className="grid gap-4">
              {allEnquiries.map((enquiry) => {
                const lastMessage = enquiry.messages && enquiry.messages.length > 0
                  ? enquiry.messages[enquiry.messages.length - 1]
                  : null
                const preview = lastMessage
                  ? (lastMessage.type === 'voice' ? '🎤 Voice message' : (lastMessage.text || '').substring(0, 100))
                  : 'No messages yet'

                return (
                  <Link
                    key={enquiry.customerId}
                    to={`/tailor/enquiries?customerId=${enquiry.customerId}&customerName=${encodeURIComponent(enquiry.customerName || 'Customer')}`}
                    className="card p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{enquiry.customerName || 'Customer'}</h3>
                        </div>
                        {lastMessage && (
                          <div className="text-sm text-neutral-600 truncate">{preview}</div>
                        )}
                        {enquiry.lastUpdated && (
                          <div className="text-xs text-neutral-500 mt-2">
                            {new Date(enquiry.lastUpdated).toLocaleString()}
                          </div>
                        )}
                      </div>
                      {lastMessage && lastMessage.from === 'customer' && (
                        <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                          New
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </TailorLayout>
    )
  }

  const handleAddCustomPricing = async () => {
    if (!customPricing.service || !customPricing.price) return

    const pricingMessage = {
      id: Date.now(),
      from: 'tailor',
      type: 'pricing',
      text: `Custom pricing: ${customPricing.service} - ₹${customPricing.price}`,
      pricing: { service: customPricing.service, price: customPricing.price },
      createdAt: new Date().toISOString()
    }

    const updatedMessages = [...messages, pricingMessage]
    setCustomPricing({ service: '', price: '' })

    if (customerId && currentTailor) {
      await sendToFirestore(updatedMessages)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) return

    const rejectMessage = {
      id: Date.now(),
      from: 'tailor',
      type: 'rejection',
      text: `Order rejected: ${rejectReason}`,
      reason: rejectReason,
      createdAt: new Date().toISOString()
    }

    const updatedMessages = [...messages, rejectMessage]
    setShowRejectModal(false)
    setRejectReason('')

    if (customerId && currentTailor) {
      await sendToFirestore(updatedMessages, 'rejected')
    }
  }

  // Show conversation view
  return (
    <TailorLayout>
      <div className="max-w-4xl">
        <div className="mb-4">
          <Link
            to="/tailor/enquiries"
            className="text-sm text-[color:var(--color-primary)] hover:underline mb-2 inline-block"
          >
            ← Back to Enquiries
          </Link>
          <h1 className="text-2xl font-semibold">Conversation with {customerName}</h1>
        </div>

        {/* Custom Pricing Section */}
        <Card className="p-5 mb-4">
          <div className="text-lg font-semibold mb-3">Custom Pricing</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Input
                label="Service"
                value={customPricing.service}
                onChange={(e) => setCustomPricing({ ...customPricing, service: e.target.value })}
                placeholder="e.g., Shirt Alteration"
              />
            </div>
            <div>
              <Input
                label="Price (₹)"
                type="number"
                value={customPricing.price}
                onChange={(e) => setCustomPricing({ ...customPricing, price: e.target.value })}
                placeholder="Enter amount"
              />
            </div>
          </div>
          <PrimaryButton
            onClick={handleAddCustomPricing}
            className="mt-3"
            disabled={!customPricing.service || !customPricing.price}
          >
            Add Pricing
          </PrimaryButton>
        </Card>

        <Card className="p-4">
          <div
            ref={chatRef}
            className="h-96 overflow-y-auto rounded-lg border border-neutral-200 p-4 bg-neutral-50 mb-4"
          >
            {messages.length === 0 ? (
              <div className="text-center text-neutral-500 py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[80%] mb-2 px-3 py-2 rounded-lg text-sm ${m.from === 'tailor'
                      ? 'ml-auto bg-[color:var(--color-primary)] text-white'
                      : 'bg-white border border-neutral-200'
                    } ${m.type === 'rejection' ? 'bg-red-100 border-red-300 text-red-800' : ''}`}
                >
                  {m.type === 'pricing' && m.pricing ? (
                    <div>
                      <div className="font-semibold mb-1">💵 Custom Pricing</div>
                      <div>{m.pricing.service}: ₹{m.pricing.price}</div>
                    </div>
                  ) : (
                    m.text
                  )}
                  {m.createdAt && (
                    <div className={`text-xs mt-1 ${m.from === 'tailor' ? (m.type === 'rejection' ? 'text-red-600' : 'text-white/70') : 'text-neutral-500'
                      }`}>
                      {new Date(m.createdAt).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="flex items-center gap-2 mb-3">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
              className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:border-[color:var(--color-primary)]"
            />
            <button
              onClick={sendMessage}
              className="btn-primary"
            >
              Send
            </button>
          </div>
          <button
            onClick={() => setShowRejectModal(true)}
            className="w-full btn-outline text-red-600 border-red-200 hover:bg-red-50"
          >
            Reject Order
          </button>
        </Card>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="p-6 max-w-md w-full mx-4">
            <div className="text-lg font-semibold mb-3">Reject Order</div>
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Reason for rejection</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 outline-none focus:border-[color:var(--color-primary)] h-24 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
              <PrimaryButton
                onClick={handleReject}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={!rejectReason.trim()}
              >
                Reject
              </PrimaryButton>
            </div>
          </Card>
        </div>
      )}
    </TailorLayout>
  )
}

export default TailorEnquiries

