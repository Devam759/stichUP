import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

const AuthContext = createContext(null)

export const useAuth = () => {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
    return ctx
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)       // Firestore user doc + uid
    const [firebaseUser, setFirebaseUser] = useState(null) // Firebase Auth user
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (fbUser) => {
            setFirebaseUser(fbUser)

            if (fbUser) {
                // Try to load user profile from Firestore
                try {
                    const userDoc = await getDoc(doc(db, 'users', fbUser.uid))
                    if (userDoc.exists()) {
                        const data = userDoc.data()
                        const merged = { id: fbUser.uid, uid: fbUser.uid, phone: fbUser.phoneNumber, ...data }
                        setUser(merged)
                        // Keep localStorage in sync for components that still reference it during migration
                        localStorage.setItem('currentUser', JSON.stringify(merged))
                        window.dispatchEvent(new Event('authChange'))
                    } else {
                        // Auth user exists but no Firestore profile yet (mid-signup)
                        setUser({ id: fbUser.uid, uid: fbUser.uid, phone: fbUser.phoneNumber, role: 'customer' })
                    }
                } catch (err) {
                    console.error('Error loading user profile:', err)
                    setUser({ id: fbUser.uid, uid: fbUser.uid, phone: fbUser.phoneNumber, role: 'customer' })
                }
            } else {
                setUser(null)
                localStorage.removeItem('currentUser')
                window.dispatchEvent(new Event('authChange'))
            }
            setLoading(false)
        })
        return () => unsub()
    }, [])

    const signOut = async () => {
        await firebaseSignOut(auth)
        setUser(null)
        localStorage.removeItem('currentUser')
        window.dispatchEvent(new Event('authChange'))
    }

    return (
        <AuthContext.Provider value={{ user, firebaseUser, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthContext
