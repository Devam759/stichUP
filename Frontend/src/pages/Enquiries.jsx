import React, { useEffect, useRef, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useSearchParams, Link } from 'react-router-dom'
import { collection, query, where, getDocs, doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const Enquiries = () => {
  const [params] = useSearchParams()
  const tailorId = params.get('tailorId')
  const tailorName = params.get('tailorName') || 'Tailor'
  const isOnline = params.get('isOnline') === 'true'
  const [allEnquiries, setAllEnquiries] = useState([])

  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const chatRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingTimerRef = useRef(null)

  const getCustomerId = () => {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || '{}')
      return u.id || u.phone
    } catch {
      return null
    }
  }
  const getCustomerName = () => {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || '{}')
      return u.fullName || u.name || 'Customer'
    } catch {
      return 'Customer'
    }
  }

  // Load specific enquiry
  useEffect(() => {
    if (!tailorId) return
    const customerId = getCustomerId()
    if (!customerId) return

    const docId = `${customerId}_${tailorId}`
    const unsub = onSnapshot(doc(db, 'enquiries', docId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data()
        setMessages(data.messages || [])
      } else {
        // Initialize new conversation
        setMessages([
          { id: 1, from: 'system', text: `You started a conversation with ${tailorName}`, createdAt: new Date().toISOString() },
          { id: 2, from: 'tailor', text: isOnline ? 'Hello! How can I help you with your tailoring needs?' : `${tailorName} is currently offline. Your enquiry will be sent and they will respond when available.`, createdAt: new Date().toISOString() }
        ])
      }
    })
    return () => unsub()
  }, [tailorId, tailorName, isOnline])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  const sendToFirestore = async (msgsArray) => {
    const customerId = getCustomerId()
    if (!customerId) return
    const docId = `${customerId}_${tailorId}`
    await setDoc(doc(db, 'enquiries', docId), {
      customerId,
      customerName: getCustomerName(),
      tailorId,
      tailorName,
      messages: msgsArray,
      lastUpdated: new Date().toISOString(),
      isOnline
    }, { merge: true })
  }

  const sendMessage = async () => {
    if (!chatInput.trim()) return

    const newMessage = {
      id: Date.now(),
      from: 'user',
      text: chatInput.trim(),
      createdAt: new Date().toISOString()
    }

    const newMsgs = [...messages, newMessage]
    setChatInput('')
    await sendToFirestore(newMsgs)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })

        // Guard: reject recordings that are too large for Firestore (1MB doc limit)
        if (audioBlob.size > 600000) { // ~600KB raw → ~800KB base64
          alert('Voice message too long. Please keep recordings under 60 seconds.')
          stream.getTracks().forEach(track => track.stop())
          setIsRecording(false)
          setRecordingTime(0)
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
          return
        }

        const reader = new FileReader()
        reader.onloadend = async () => {
          const base64Audio = reader.result

          const voiceMessage = {
            id: Date.now(),
            from: 'user',
            type: 'voice',
            audioUrl: base64Audio,
            duration: recordingTime,
            createdAt: new Date().toISOString()
          }

          stream.getTracks().forEach(track => track.stop())
          setIsRecording(false)
          setRecordingTime(0)
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)

          await sendToFirestore([...messages, voiceMessage])
        }
        reader.readAsDataURL(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Load all enquiries for list view
  useEffect(() => {
    if (tailorId) return // only fetch if on the master layout
    const customerId = getCustomerId()
    if (!customerId) return

    const fetchAll = async () => {
      try {
        const q = query(collection(db, 'enquiries'), where('customerId', '==', customerId))
        const unsub = onSnapshot(q, (snapshot) => {
          let list = snapshot.docs.map(doc => doc.data())
          list.sort((a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0))
          setAllEnquiries(list)
        })
        return () => unsub()
      } catch (error) {
        console.error('Error loading enquiries:', error)
      }
    }
    fetchAll()
  }, [tailorId])

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      if (mediaRecorderRef.current && isRecording) mediaRecorderRef.current.stop()
    }
  }, [isRecording])

  // If no tailorId, show list of all enquiries
  if (!tailorId) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Navbar />
        <main className="flex-1 px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-extrabold mb-2">My Enquiries</h1>
              <div className="text-neutral-600">View and manage all your tailoring enquiries</div>
            </div>

            {allEnquiries.length === 0 ? (
              <div className="card p-8 text-center">
                <div className="text-neutral-600 mb-4">No enquiries yet</div>
                <Link to="/find" className="btn-primary">
                  Find Tailors
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {allEnquiries.map((enquiry) => {
                  const lastMessage = enquiry.messages && enquiry.messages.length > 0
                    ? enquiry.messages[enquiry.messages.length - 1]
                    : null
                  const preview = lastMessage
                    ? (lastMessage.type === 'voice' ? '🎤 Voice message' : (lastMessage.text || 'Voice message').substring(0, 100))
                    : 'No messages yet'

                  return (
                    <Link
                      key={enquiry.tailorId}
                      to={`/enquiries?tailorId=${enquiry.tailorId}&tailorName=${encodeURIComponent(enquiry.tailorName)}&isOnline=${enquiry.isOnline}`}
                      className="card p-5 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{enquiry.tailorName}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${enquiry.isOnline ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-600'
                              }`}>
                              {enquiry.isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                          {lastMessage && (
                            <div className="text-sm text-neutral-600 truncate">{preview}</div>
                          )}
                          {enquiry.lastUpdated && (
                            <div className="text-xs text-neutral-400 mt-1">
                              {new Date(enquiry.lastUpdated).toLocaleString()}
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <span className="text-blue-600">View →</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // Show chat view for specific tailor
  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-extrabold mb-2">Enquiry with {tailorName}</h1>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Online
                  </span>
                  <span className="text-sm text-neutral-600">Tailor is available for instant chat</span>
                </>
              ) : (
                <>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                    Offline
                  </span>
                  <span className="text-sm text-neutral-600">Your enquiry will be sent and they will respond when available</span>
                </>
              )}
            </div>
          </div>

          <div className="card p-6">
            <div
              ref={chatRef}
              className="h-96 overflow-y-auto mb-4 bg-neutral-50 border border-neutral-200 rounded-lg p-4 space-y-3"
            >
              {messages.length === 0 ? (
                <div className="text-center text-neutral-500 py-8">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.from === 'user' ? 'justify-end' : msg.from === 'system' ? 'justify-center' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${msg.from === 'user'
                      ? 'bg-[color:var(--color-primary)] text-white'
                      : msg.from === 'system'
                        ? 'text-neutral-500 text-xs bg-transparent'
                        : 'bg-white border border-neutral-200'
                      }`}>
                      {msg.type === 'voice' ? (
                        <div className="flex items-center gap-2">
                          <audio controls src={msg.audioUrl} className="max-w-full">
                            Your browser does not support the audio element.
                          </audio>
                          <span className="text-xs opacity-75">{formatTime(msg.duration || 0)}</span>
                        </div>
                      ) : (
                        msg.text
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2 items-center">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]"
                disabled={!isOnline || isRecording}
              />
              {isRecording ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-800 rounded-lg">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">{formatTime(recordingTime)}</span>
                  </div>
                  <button
                    onClick={stopRecording}
                    className="btn-primary"
                  >
                    Stop
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={startRecording}
                    disabled={!isOnline}
                    className="px-3 py-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Record voice note"
                  >
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={sendMessage}
                    className="btn-primary"
                    disabled={!isOnline || !chatInput.trim()}
                  >
                    Send
                  </button>
                </>
              )}
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <strong>Note:</strong> The tailor can provide custom pricing based on your requirements. Discuss your needs in the chat!
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default Enquiries

