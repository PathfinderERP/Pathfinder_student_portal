import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ roles }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-white text-slate-900">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-orange-500/10 border-t-orange-500 rounded-full animate-spin" />
                <p className="font-bold uppercase tracking-widest text-xs opacity-50">Authenticating...</p>
            </div>
        </div>;
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
