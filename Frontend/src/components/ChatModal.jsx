import React, { useEffect, useState, useRef } from 'react'
import Modal from './ui/Modal'
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

const ChatModal = ({ jobId, userEmail, onClose }) => {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (!jobId) return
    const messagesRef = collection(db, 'chats', jobId, 'messages')
    const q = query(messagesRef, orderBy('createdAt', 'asc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Fallback for immediate local state (where serverTimestamp is not yet resolved)
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }))
      setMessages(msgs)
    })

    return () => unsubscribe()
  }, [jobId])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const send = async () => {
    if (!text.trim()) return
    const messagesRef = collection(db, 'chats', jobId, 'messages')

    // Optimistic UI clear
    setText('')

    await addDoc(messagesRef, {
      sender: userEmail,
      text: text.trim(),
      createdAt: serverTimestamp()
    })
  }

  return (
    <Modal onClose={onClose}>
      <div className="p-4">
        <div className="h-64 overflow-y-auto mb-3 bg-white p-3 rounded">
          {messages.map((m) => (
            <div key={m.id || m.createdAt} className={`mb-2 ${m.sender === userEmail ? 'text-right' : ''}`}>
              <div className="text-sm text-neutral-700">{m.text}</div>
              <div className="text-xs text-neutral-400">{new Date(m.createdAt).toLocaleTimeString()}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="flex gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            className="flex-1 p-2 border rounded focus:outline-none focus:border-[color:var(--color-primary)]"
            placeholder="Discuss details..."
          />
          <button onClick={send} disabled={!text.trim()} className="px-4 py-2 bg-[color:var(--color-primary)] text-white font-medium rounded-lg disabled:opacity-50 transition-colors hover:brightness-110">Send</button>
        </div>
      </div>
    </Modal>
  )
}

export default ChatModal
