import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import OfficialDashboard from './pages/OfficialDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ComplaintForm from './pages/ComplaintForm';
import ProtectedRoute from './components/Auth/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* User routes */}
          <Route 
            path="/user/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['user']}>
                <UserDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/submit-complaint" 
            element={
              <ProtectedRoute allowedRoles={['user']}>
                <ComplaintForm />
              </ProtectedRoute>
            } 
          />

          {/* Official routes */}
          <Route 
            path="/official/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['official']}>
                <OfficialDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Admin routes */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Redirect based on role */}
          <Route 
            path="/" 
            element={<RoleBasedRedirect />} 
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

// RoleBasedRedirect component
function RoleBasedRedirect() {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'official':
      return <Navigate to="/official/dashboard" replace />;
    default:
      return <Navigate to="/user/dashboard" replace />;
  }
}

export default App;