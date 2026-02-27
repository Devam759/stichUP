import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Route guard component.
 * - Redirects to /login if user is not authenticated.
 * - Optionally checks `allowedRoles` (e.g. ['tailor', 'admin']).
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth()
    const location = useLocation()

    if (loading) {
        return (
            <div className="min-h-dvh grid place-items-center">
                <div className="text-neutral-500 animate-pulse">Loading...</div>
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // User is logged in but doesn't have the right role → send them to their home
        if (user.role === 'tailor') return <Navigate to="/tailor/dashboard" replace />
        if (user.role === 'admin') return <Navigate to="/admin" replace />
        return <Navigate to="/customer" replace />
    }

    return children
}

export default ProtectedRoute
