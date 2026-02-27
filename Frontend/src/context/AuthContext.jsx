import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState(undefined) // undefined = loading
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)
      if (fbUser) {
        try {
          const snap = await getDoc(doc(db, 'users', fbUser.uid))
          if (snap.exists()) {
            const profile = { id: snap.id, ...snap.data() }
            setUserProfile(profile)
            localStorage.setItem('currentUser', JSON.stringify(profile))
            window.dispatchEvent(new Event('authChange'))
          } else {
            setUserProfile(null)
          }
        } catch {
          setUserProfile(null)
        }
      } else {
        setUserProfile(null)
        localStorage.removeItem('currentUser')
        window.dispatchEvent(new Event('authChange'))
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const value = { firebaseUser, userProfile, setUserProfile, loading }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
