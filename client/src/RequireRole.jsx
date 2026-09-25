import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from './hooks/useAuth';
import { roleHome } from './roleHome';

export default function RequireRole({ roles, children }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return <div className="loading"><div className="spinner" />Checking access...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!roles.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />;
  return children;
}
