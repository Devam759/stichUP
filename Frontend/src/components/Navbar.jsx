import React, { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { FiUser, FiBell, FiPackage, FiMessageCircle, FiShoppingCart } from 'react-icons/fi'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { auth, db } from '../firebase'

const Navbar = ({ hideUntilScroll = false }) => {
  const [isVisible, setIsVisible] = useState(!hideUntilScroll)
  const [scrolled, setScrolled] = useState(false)
  const [user, setUser] = useState(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [pendingOrders, setPendingOrders] = useState([])
  const [newEnquiries, setNewEnquiries] = useState([])
  const notificationsRef = useRef(null)
  const userMenuRef = useRef(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const navigate = useNavigate()

  // Scroll visibility
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 10)
      if (hideUntilScroll) setIsVisible(window.scrollY > 10)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [hideUntilScroll])

  // Close menus on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false)
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) setShowNotifications(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Check user
  useEffect(() => {
    const checkUser = () => {
      try {
        const currentUser = localStorage.getItem('currentUser')
        setUser(currentUser ? JSON.parse(currentUser) : null)
      } catch { setUser(null) }
    }
    checkUser()
    window.addEventListener('storage', checkUser)
    window.addEventListener('authChange', checkUser)
    return () => {
      window.removeEventListener('storage', checkUser)
      window.removeEventListener('authChange', checkUser)
    }
  }, [])

  // Tailor notifications
  useEffect(() => {
    if (!user?.role || user.role !== 'tailor') return
    const tailorId = user.phone || user.id
    if (!tailorId) return

    const qOrders = query(collection(db, 'orders'), where('tailorId', '==', tailorId))
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setPendingOrders(orders.filter(o => o.status === 'Request' || o.status === 'Pending'))
    })

    const qEnquiries = query(collection(db, 'enquiries'), where('tailorId', '==', tailorId))
    const unsubEnquiries = onSnapshot(qEnquiries, (snap) => {
      const enqs = snap.docs.map(d => d.data())
      setNewEnquiries(enqs.filter(e => {
        if (!e.messages?.length) return false
        const last = e.messages[e.messages.length - 1]
        return last.from === 'customer' || last.from === 'user'
      }))
    })

    return () => { unsubOrders(); unsubEnquiries() }
  }, [user])

  const handleLogout = async () => {
    try { await signOut(auth) } catch { }
    localStorage.removeItem('currentUser')
    setUser(null)
    window.dispatchEvent(new Event('authChange'))
    navigate('/')
  }

  const positionClass = hideUntilScroll ? 'fixed' : 'sticky'
  const navBg = hideUntilScroll
    ? (scrolled ? 'bg-white shadow-sm border-b border-neutral-200' : 'bg-transparent')
    : 'bg-white shadow-sm border-b border-neutral-200'
  const textColor = hideUntilScroll && !scrolled ? 'text-white' : 'text-neutral-800'
  const visible = isVisible || !hideUntilScroll

  const notifCount = pendingOrders.length + newEnquiries.length

  return (
    <header className={`${positionClass} top-0 left-0 right-0 w-full z-40 transition-all duration-300 ${navBg} ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="mx-auto w-full max-w-6xl px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          {(!hideUntilScroll || scrolled) && (
            <img src="/logo2.png" alt="StitchUp" className="h-10 w-auto object-contain" />
          )}
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* Customer cart */}
              {user.role === 'customer' && (
                <Link to="/cart" className={`p-2 rounded-lg hover:bg-neutral-100 transition-colors ${textColor}`} title="Cart">
                  <FiShoppingCart className="w-5 h-5" />
                </Link>
              )}

              {/* Tailor notifications */}
              {user.role === 'tailor' && (
                <div className="relative" ref={notificationsRef}>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={`p-2 rounded-lg hover:bg-neutral-100 transition-colors relative ${textColor}`}
                  >
                    <FiBell className="w-5 h-5" />
                    {notifCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-neutral-200 z-50 max-h-96 overflow-hidden flex flex-col">
                      <div className="p-4 border-b border-neutral-100">
                        <div className="font-semibold text-neutral-900">Notifications</div>
                      </div>
                      <div className="overflow-y-auto flex-1 p-2">
                        {notifCount === 0 ? (
                          <div className="p-4 text-center text-neutral-400 text-sm">No new notifications</div>
                        ) : (
                          <>
                            {pendingOrders.slice(0, 5).map(order => (
                              <Link key={order.id} to="/tailor/orders" onClick={() => setShowNotifications(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-50 transition-colors">
                                <div className="p-1.5 bg-blue-50 rounded-lg"><FiPackage className="w-4 h-4 text-blue-600" /></div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-neutral-900 truncate">{order.user} • {order.service}</div>
                                  <div className="text-xs text-neutral-400">{order.slot}</div>
                                </div>
                              </Link>
                            ))}
                            {newEnquiries.slice(0, 5).map((enq, i) => (
                              <Link key={i} to="/tailor/enquiries" onClick={() => setShowNotifications(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-50 transition-colors">
                                <div className="p-1.5 bg-green-50 rounded-lg"><FiMessageCircle className="w-4 h-4 text-green-600" /></div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-neutral-900 truncate">{enq.customerName || 'Customer'}</div>
                                  <div className="text-xs text-neutral-400">New message</div>
                                </div>
                              </Link>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* User menu */}
              <div className="relative" ref={userMenuRef}>
                <button onClick={() => setShowUserMenu(!showUserMenu)} className={`p-2 rounded-lg hover:bg-neutral-100 transition-colors ${textColor}`}>
                  <FiUser className="w-5 h-5" />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-neutral-200 z-50 py-1">
                    <div className="px-4 py-3 border-b border-neutral-100">
                      <p className="text-sm font-medium text-neutral-900 truncate">{user.name || user.fullName || 'User'}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">{user.role}</p>
                    </div>
                    {user.role === 'customer' ? (
                      <>
                        <Link to="/customer/account" onClick={() => setShowUserMenu(false)} className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50">My Account</Link>
                        <Link to="/customer/orders" onClick={() => setShowUserMenu(false)} className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50">Orders</Link>
                        <Link to="/enquiries" onClick={() => setShowUserMenu(false)} className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50">Enquiries</Link>
                      </>
                    ) : (
                      <>
                        <Link to="/tailor/profile" onClick={() => setShowUserMenu(false)} className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50">Profile</Link>
                        <Link to="/tailor/orders" onClick={() => setShowUserMenu(false)} className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50">Orders</Link>
                        <Link to="/tailor/enquiries" onClick={() => setShowUserMenu(false)} className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50">Enquiries</Link>
                        <Link to="/tailor/earnings" onClick={() => setShowUserMenu(false)} className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50">Earnings</Link>
                      </>
                    )}
                    <div className="border-t border-neutral-100 mt-1" />
                    <button onClick={() => { setShowUserMenu(false); handleLogout() }} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className={`px-4 py-2 text-sm font-medium rounded-lg hover:bg-neutral-100 transition-colors ${textColor}`}>Log In</Link>
              <Link to="/signup" className="px-4 py-2 text-sm font-semibold rounded-lg bg-[color:var(--color-primary)] text-white hover:opacity-90 transition-opacity">Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
