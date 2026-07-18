import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import ManagerBoard from './pages/ManagerBoard';
import MemberGrid from './pages/MemberGrid';
import Reports from './pages/Reports';
import './index.css';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
};

function AppRoutes() {
  const { user, loading } = useContext(AuthContext);
  
  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/manager/board" element={
        <ProtectedRoute allowedRoles={['admin', 'manager']}>
          <ManagerBoard />
        </ProtectedRoute>
      } />
      <Route path="/member/grid" element={
        <ProtectedRoute allowedRoles={['member', 'manager', 'admin']}>
          <MemberGrid />
        </ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute allowedRoles={['admin', 'manager']}>
          <Reports />
        </ProtectedRoute>
      } />
      <Route path="/" element={<Navigate to={user?.role === 'member' ? "/member/grid" : user?.role === 'manager' ? "/manager/board" : "/login"} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
