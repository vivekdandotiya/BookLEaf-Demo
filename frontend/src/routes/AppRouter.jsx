import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AuthorLayout } from '../layouts/AuthorLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { Login } from '../pages/common/Login';

// Author Pages
import { AuthorDashboard } from '../pages/author/AuthorDashboard';
import { MyBooks } from '../pages/author/MyBooks';
import { SubmitTicket } from '../pages/author/SubmitTicket';
import { MyTickets } from '../pages/author/MyTickets';
import { AuthorTicketDetail } from '../pages/author/AuthorTicketDetail';

// Admin Pages
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { AdminTicketQueue } from '../pages/admin/AdminTicketQueue';
import { AdminTicketDetail } from '../pages/admin/AdminTicketDetail';
import { AdminAuthors } from '../pages/admin/AdminAuthors';

import { useAuth } from '../context/AuthContext';

const RootRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/tickets" replace />;
  return <Navigate to="/author/dashboard" replace />;
};

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />

      {/* Author Portal Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={['author']} />}>
        <Route path="/author" element={<AuthorLayout />}>
          <Route index element={<Navigate to="/author/dashboard" replace />} />
          <Route path="dashboard" element={<AuthorDashboard />} />
          <Route path="books" element={<MyBooks />} />
          <Route path="tickets" element={<MyTickets />} />
          <Route path="tickets/new" element={<SubmitTicket />} />
          <Route path="tickets/:id" element={<AuthorTicketDetail />} />
        </Route>
      </Route>

      {/* Admin Portal Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/tickets" replace />} />
          <Route path="tickets" element={<AdminTicketQueue />} />
          <Route path="tickets/:id" element={<AdminTicketDetail />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="authors" element={<AdminAuthors />} />
        </Route>
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
