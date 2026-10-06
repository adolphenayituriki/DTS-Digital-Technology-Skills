import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from './hooks/useAuth';
import { roleHome } from './roleHome';
import Loading from './components/Loading';
import { RequirePasswordChange } from './components/PasswordChangeGate';

export default function RequireRole({ roles, children }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return <Loading label="Checking access..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!roles.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />;
  // An account still on its emailed temporary password gets the change screen
  // in place of the dashboard, whichever dashboard it tried to open.
  return <RequirePasswordChange>{children}</RequirePasswordChange>;
}
