import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Skeleton } from '../components/common/Skeleton';

export const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-paper-50 flex items-center justify-center p-4">
        <div className="space-y-4 max-w-sm w-full text-center">
          <div className="w-10 h-10 rounded-xl bg-brand mx-auto animate-pulse" />
          <p className="text-xs text-ink-500 font-medium">Verifying BookLeaf authorization...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect based on actual role
    if (user.role === 'admin') {
      return <Navigate to="/admin/tickets" replace />;
    }
    return <Navigate to="/author/dashboard" replace />;
  }

  return <Outlet />;
};
