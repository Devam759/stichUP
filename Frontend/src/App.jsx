import React from 'react'
import { Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
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
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path='/' element={<Homepage />} />
        <Route path='/login' element={<Login />} />
        <Route path='/signup' element={<Signup />} />
        <Route path='/location' element={<LocationPermission />} />
        <Route path='/find' element={<FindTailor />} />
        <Route path='/tailor/:id' element={<TailorProfile />} />
        <Route path='/categories' element={<Categories />} />
        <Route path='/categories/:type' element={<Categories />} />
        <Route path='/quick-fix-options' element={<QuickFixOptions />} />

        {/* Customer routes (must be logged in as customer) */}
        <Route path='/customer' element={<ProtectedRoute allowedRoles={['customer']}><Customer /></ProtectedRoute>} />
        <Route path='/customer/account' element={<ProtectedRoute allowedRoles={['customer']}><CustomerAccount /></ProtectedRoute>} />
        <Route path='/customer/orders' element={<ProtectedRoute allowedRoles={['customer']}><CustomerOrders /></ProtectedRoute>} />
        <Route path='/customer/track/:id' element={<ProtectedRoute allowedRoles={['customer']}><OrderTracking /></ProtectedRoute>} />
        <Route path='/booking' element={<ProtectedRoute allowedRoles={['customer']}><Booking /></ProtectedRoute>} />
        <Route path='/order/:id' element={<ProtectedRoute><OrderTracking /></ProtectedRoute>} />
        <Route path='/cart' element={<ProtectedRoute allowedRoles={['customer']}><Cart /></ProtectedRoute>} />
        <Route path='/enquiries' element={<ProtectedRoute allowedRoles={['customer']}><Enquiries /></ProtectedRoute>} />

        {/* Tailor routes (must be logged in as tailor) */}
        <Route path='/tailor/dashboard' element={<ProtectedRoute allowedRoles={['tailor']}><TailorHome /></ProtectedRoute>} />
        <Route path='/tailor/orders' element={<ProtectedRoute allowedRoles={['tailor']}><TailorOrders /></ProtectedRoute>} />
        <Route path='/tailor/earnings' element={<ProtectedRoute allowedRoles={['tailor']}><TailorEarnings /></ProtectedRoute>} />
        <Route path='/tailor/profile' element={<ProtectedRoute allowedRoles={['tailor']}><TailorProfilePage /></ProtectedRoute>} />
        <Route path='/tailor/enquiries' element={<ProtectedRoute allowedRoles={['tailor']}><TailorEnquiries /></ProtectedRoute>} />

        {/* Admin routes (must be logged in as admin) */}
        <Route path='/admin' element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path='/admin/tailors' element={<ProtectedRoute allowedRoles={['admin']}><AdminTailors /></ProtectedRoute>} />
        <Route path='/admin/users' element={<ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>} />
        <Route path='/admin/orders' element={<ProtectedRoute allowedRoles={['admin']}><AdminOrders /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  )
}

export default App