import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import PrimaryButton from '../components/ui/PrimaryButton'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useNavigate } from 'react-router-dom'
import { FiTrash2 } from 'react-icons/fi'

const Cart = () => {
  const [cartItems, setCartItems] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('cart') || '[]')
      setCartItems(stored)
    } catch { }
  }, [])

  const removeItem = (index) => {
    const updated = [...cartItems]
    updated.splice(index, 1)
    setCartItems(updated)
    localStorage.setItem('cart', JSON.stringify(updated))
    window.dispatchEvent(new Event('cartUpdate'))
  }

  const handleCheckout = async () => {
    if (cartItems.length === 0) return
    setLoading(true)

    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || '{}')
      const userId = u.id || u.phone
      const userName = u.name || u.fullName || 'Customer'
      const serviceType = localStorage.getItem('selectedOption') || 'General'
      const clothType = localStorage.getItem('selectedCategory') || 'Fabric'
      const slot = '11:00-12:00' // Mock

      // Create orders for each tailor cart item
      for (const item of cartItems) {
        await addDoc(collection(db, 'orders'), {
          tailorId: item.tailorId,
          userId: userId,
          user: userName,
          service: serviceType,
          cloth: clothType,
          slot: slot,
          status: 'Request', // Using 'Request' as initial so tailors see it on dashboard
          priceFrom: item.priceFrom || 150,
          createdAt: new Date().toISOString()
        })
      }

      localStorage.removeItem('cart')
      setCartItems([])
      window.dispatchEvent(new Event('cartUpdate'))
      navigate('/customer/orders')

    } catch (e) {
      console.error(e)
      alert("Failed to create order.")
    } finally {
      setLoading(false)
    }
  }

  const subtotal = cartItems.reduce((acc, item) => acc + (item.priceFrom || 150), 0)
  const taxes = Math.round(subtotal * 0.18)
  const total = subtotal + taxes

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="p-6">
            <h1 className="text-2xl md:text-3xl font-extrabold mb-6">Shopping Cart</h1>
            {cartItems.length === 0 ? (
              <div className="text-neutral-600">Your cart is empty.</div>
            ) : (
              <div className="grid lg:grid-cols-[1fr_350px] gap-8">
                <div className="grid gap-4">
                  {cartItems.map((item, idx) => (
                    <div key={idx} className="card p-4 flex gap-4 items-center">
                      <div className="w-20 h-20 bg-neutral-100 rounded-lg overflow-hidden shrink-0">
                        {item.tailorImage && <img src={item.tailorImage} className="w-full h-full object-cover" alt="" />}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-lg">{item.tailorName}</div>
                        <div className="text-neutral-600 text-sm">{item.distanceKm} km away • ⭐ {item.rating}</div>
                        <div className="font-semibold mt-1">₹{item.priceFrom || 150}</div>
                      </div>
                      <button onClick={() => removeItem(idx)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors">
                        <FiTrash2 />
                      </button>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="card p-6 top-4 sticky">
                    <h2 className="text-xl font-bold mb-4">Summary</h2>
                    <div className="flex justify-between mt-3 text-neutral-600">
                      <span>Subtotal</span>
                      <span>₹{subtotal}</span>
                    </div>
                    <div className="flex justify-between mt-3 text-neutral-600">
                      <span>Taxes & Fees</span>
                      <span>₹{taxes}</span>
                    </div>
                    <div className="border-t border-neutral-200 mt-4 pt-4 flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>₹{total}</span>
                    </div>

                    <PrimaryButton
                      onClick={handleCheckout}
                      className="w-full mt-6"
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Checkout'}
                    </PrimaryButton>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default Cart
