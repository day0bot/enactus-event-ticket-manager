import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [], requireAuth = true }) => {
    const { user, isAuthenticated } = useAuth();
    const location = useLocation();

    // If authentication is not required (public route) and we have no role restrictions
    if (!requireAuth && allowedRoles.length === 0) {
        return children;
    }

    // If authentication is required but user is not logged in
    if (requireAuth && !isAuthenticated) {
        return <Navigate to="/login" state={{ from: location.pathname }} />;
    }

    // If we have role restrictions and user's role is not in allowed roles
    if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
        return <Navigate to="/unauthorized" />;
    }

    return children;
};

export default ProtectedRoute; 