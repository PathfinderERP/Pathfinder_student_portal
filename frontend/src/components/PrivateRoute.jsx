import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ roles }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (roles && !roles.includes(user.user_type)) {
        return <Navigate to="/unauthorized" replace />; // Or redirect to their home
    }

    return <Outlet />;
};

export default PrivateRoute;
