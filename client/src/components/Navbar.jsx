import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, LayoutDashboard } from 'lucide-react';
import useAuth from '../hooks/useAuth';

const links = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/programs', label: 'Programs' },
  { to: '/team', label: 'Team' },
  { to: '/news', label: 'News' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/apply', label: 'Apply' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  return (
    <header className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container">
        <Link to="/" className="navbar-brand" onClick={() => setOpen(false)}>
          <img src="/Logo.png" alt="DTS Logo" className="navbar-logo" />
          <span className="navbar-title">
            <b>DTS</b>
            <small>Digital Technology Skills</small>
          </span>
        </Link>

        <nav className={`navbar-links ${open ? 'open' : ''}`}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) => (isActive ? 'active' : '')}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </NavLink>
          ))}
          {isLoggedIn ? (
            <>
              <NavLink
                to="/dashboard"
                className={({ isActive }) => (isActive ? 'active dash-link' : 'dash-link')}
                onClick={() => setOpen(false)}
              >
                Dashboard
              </NavLink>
              <button className="dash-link-logout" onClick={handleLogout}>
                <LogOut size={15} /> Logout
              </button>
            </>
          ) : (
            <Link to="/signup" className="navbar-cta" onClick={() => setOpen(false)}>
              Sign Up
            </Link>
          )}
          <Link to="/contact" className="navbar-cta navbar-cta-ghost" onClick={() => setOpen(false)}>
            Contact
          </Link>
        </nav>

        <div className="navbar-right">
          <Link to="/apply" className="btn btn-accent btn-sm navbar-cta-desktop">
            Apply Now
          </Link>
          {isLoggedIn ? (
            <>
              <Link to="/dashboard" className="admin-icon" aria-label="Dashboard" title="My Dashboard">
                <LayoutDashboard size={16} />
              </Link>
              <button className="admin-icon" onClick={handleLogout} aria-label="Logout" title="Logout">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-outline btn-sm navbar-login-desktop">
              Log In
            </Link>
          )}
          <button className="hamburger" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}