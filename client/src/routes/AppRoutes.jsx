import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

import MainLayout from '../components/layout/MainLayout';

// Auth — one portal per role
import RoleChooser from '../pages/auth/RoleChooser';
import RoleLogin from '../pages/auth/RoleLogin';
import RoleRegister from '../pages/auth/RoleRegister';
import ForgotPasswordPage from '../pages/auth/ForgotPassword';
import ResetPasswordPage from '../pages/auth/ResetPassword';

// Every in-app route comes from the menu registry.
import { allRoutes } from '../config/menuSections';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useContext(AuthContext);
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center text-xs text-gray-400 dark:bg-slate-950">
        Verifying your session…
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AnonymousRoute = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext);
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

const AppRoutes = () => (
  <Routes>
    {/* Anonymous — separate portal per role */}
    <Route path="/login" element={<AnonymousRoute><RoleChooser mode="login" /></AnonymousRoute>} />
    <Route path="/login/:role" element={<AnonymousRoute><RoleLogin /></AnonymousRoute>} />
    <Route path="/register" element={<AnonymousRoute><RoleChooser mode="register" /></AnonymousRoute>} />
    <Route path="/register/:role" element={<AnonymousRoute><RoleRegister /></AnonymousRoute>} />
    <Route path="/forgot-password" element={<AnonymousRoute><ForgotPasswordPage /></AnonymousRoute>} />
    <Route path="/reset-password" element={<AnonymousRoute><ResetPasswordPage /></AnonymousRoute>} />

    {/* Authenticated shell — routes generated from the menu registry */}
    <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
      <Route index element={<Navigate to="/dashboard" replace />} />
      {allRoutes.map(({ path, element }) => (
        <Route key={path} path={path.replace(/^\//, '')} element={element} />
      ))}
    </Route>

    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

export default AppRoutes;
