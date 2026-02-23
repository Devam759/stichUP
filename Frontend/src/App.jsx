import React from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Homepage from './pages/Homepage'
import Login from './pages/Login'
import Signup from './pages/Signup'
import LocationPermission from './pages/LocationPermission'
import FindTailor from './pages/FindTailor'
import TailorProfile from './pages/TailorProfile'
import Booking from './pages/Booking'
import OrderTracking from './pages/OrderTracking'
import TailorHome from './pages/tailor/Home'
import TailorOrders from './pages/tailor/Orders'
import TailorEarnings from './pages/tailor/Earnings'
import TailorProfilePage from './pages/tailor/Profile'
import TailorEnquiries from './pages/tailor/Enquiries'
import AdminDashboard from './pages/admin/Dashboard'
import AdminTailors from './pages/admin/Tailors'
import AdminUsers from './pages/admin/Users'
import AdminOrders from './pages/admin/Orders'
import Customer from './pages/Customer'
import Categories from './pages/Categories'
import QuickFixOptions from './pages/QuickFixOptions'
import Cart from './pages/Cart'
import CustomerOrders from './pages/customer/Orders'
import CustomerAccount from './pages/customer/Account'
import Enquiries from './pages/Enquiries'

const App = () => {
  return (
    <div>
      <Routes>
        <Route path='/' element={<Homepage />} />
        <Route path='/login' element={<Login />} />
        <Route path='/signup' element={<Signup />} />
        <Route path='/location' element={<LocationPermission />} />
        <Route path='/find' element={<FindTailor />} />
        <Route path='/tailor/:id' element={<TailorProfile />} />
        <Route path='/booking' element={<Booking />} />
        <Route path='/order/:id' element={<OrderTracking />} />
        <Route path='/tailor/dashboard' element={<TailorHome />} />
        <Route path='/tailor/orders' element={<TailorOrders />} />
        <Route path='/tailor/earnings' element={<TailorEarnings />} />
        <Route path='/tailor/profile' element={<TailorProfilePage />} />
        <Route path='/tailor/enquiries' element={<TailorEnquiries />} />
        <Route path='/admin' element={<AdminDashboard />} />
        <Route path='/admin/tailors' element={<AdminTailors />} />
        <Route path='/admin/users' element={<AdminUsers />} />
        <Route path='/admin/orders' element={<AdminOrders />} />
        <Route path='/customer' element={<Customer />} />
        <Route path='/customer/account' element={<CustomerAccount />} />
        <Route path='/customer/orders' element={<CustomerOrders />} />
        <Route path='/enquiries' element={<Enquiries />} />
        <Route path='/cart' element={<Cart />} />
        <Route path='/categories' element={<Categories />} />
        <Route path='/categories/:type' element={<Categories />} />
        <Route path='/quick-fix-options' element={<QuickFixOptions />} />
      </Routes>
    </div>
  )
}

export default App