import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import useAuth from '../hooks/useAuth';

export default function StaffLayout({ title, subtitle, navItems }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const activeItem = navItems.find((item) => item.end ? location.pathname === item.to : location.pathname.startsWith(item.to));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img src="/Logo.png" alt="DTS Logo" className="admin-brand-logo" />
          <span>
            <b>DTS</b>
            <small>{title}</small>
          </span>
        </div>
        <span className="admin-nav-title">Workspace</span>
        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </aside>
      <main className="admin-main">
        <div className="admin-header">
          <div>
            <h1>{activeItem?.label || title}</h1>
            <p className="admin-breadcrumb">{subtitle}</p>
          </div>
          {user && (
            <div className="admin-user-chip">
              <span className="admin-user-initial">{(user.name || user.email || 'U')[0].toUpperCase()}</span>
              <div>
                <b>{user.name}</b>
                <small>{user.role}</small>
              </div>
            </div>
          )}
        </div>
        <Outlet />
      </main>
    </div>
  );
}
