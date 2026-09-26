import React, { useState, useEffect, useCallback } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, X, LogOut, LayoutDashboard, Search,
  Home, Info, BookOpen, Users, Newspaper, Camera, FilePlus2, Mail, User
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import apiFetch from '../api';
import { roleHome, roleLabel } from '../roleHome';

const links = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/programs', label: 'Programs' },
  { to: '/team', label: 'Team' },
  { to: '/news', label: 'News' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/apply', label: 'Apply' },
];

const pageItems = [
  { to: '/', label: 'Home', icon: <Home size={15} /> },
  { to: '/about', label: 'About', icon: <Info size={15} /> },
  { to: '/programs', label: 'Programs', icon: <BookOpen size={15} /> },
  { to: '/team', label: 'Team', icon: <Users size={15} /> },
  { to: '/news', label: 'News', icon: <Newspaper size={15} /> },
  { to: '/gallery', label: 'Gallery', icon: <Camera size={15} /> },
  { to: '/apply', label: 'Apply', icon: <FilePlus2 size={15} /> },
  { to: '/contact', label: 'Contact', icon: <Mail size={15} /> },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [q, setQ] = useState('');
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState([]);
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    apiFetch('/posts').then(setPosts).catch(() => setPosts([]));
    apiFetch('/members').then(setMembers).catch(() => setMembers([]));
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Following a link should never leave the overlay hanging open.
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Below this width the nav becomes a full-screen overlay, so it must be
  // hidden from assistive tech and tab order while it is closed. Above it the
  // same markup is the normal desktop bar and must stay exposed.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(max-width: 900px)');
    const sync = () => { setIsCompact(mq.matches); if (!mq.matches) setOpen(false); };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  const trimmed = q.trim().toLowerCase();
  const pageHits = trimmed ? pageItems.filter((p) => p.label.toLowerCase().includes(trimmed)) : [];
  const postHits = trimmed
    ? posts.filter((p) => (p.title || '').toLowerCase().includes(trimmed)).slice(0, 4)
    : [];
  const memberHits = trimmed
    ? members.filter((m) => (m.name || '').toLowerCase().includes(trimmed)).slice(0, 4)
    : [];
  const dropdownOpen = trimmed.length > 0;
  const workspace = roleHome(user?.role);
  const workspaceLabel = roleLabel(user?.role);

  const goTo = (to) => {
    setQ('');
    setOpen(false);
    navigate(to);
  };

  const submitSearch = (e) => {
    e.preventDefault();
    const first = pageHits[0] || postHits[0] || memberHits[0];
    if (first) goTo(first.to || (postHits[0] ? `/news/${postHits[0].slug || ''}` : '/team'));
  };

  // Shared by the desktop search bar and the mobile overlay so the two can
  // never drift apart.
  const renderSearch = useCallback((variant) => (
    <div className={`navbar-searchbox${variant === 'panel' ? ' in-panel' : ''}`}>
      <Search size={15} />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search DTS, pages, news, members..."
        aria-label="Site search"
      />
      {q && (
        <button type="button" className="navbar-search-clear" onClick={() => setQ('')} aria-label="Clear search">
          <X size={13} />
        </button>
      )}
      <button type="submit" className="navbar-search-btn" aria-label="Search">
        <Search size={15} />
      </button>
      {dropdownOpen && (
        <div className={`navbar-dropdown${variant === 'panel' ? ' in-panel' : ''}`}>
          {!pageHits.length && !postHits.length && !memberHits.length && (
            <div className="navbar-dropdown-empty">No results found</div>
          )}
          {pageHits.length > 0 && (
            <>
              <div className="navbar-dropdown-label">Pages</div>
              {pageHits.map((p) => (
                <button type="button" key={p.to} className="navbar-dropdown-row" onClick={() => goTo(p.to)}>
                  <span className="navbar-dropdown-icon">{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </>
          )}
          {postHits.length > 0 && (
            <>
              <div className="navbar-dropdown-label">News</div>
              {postHits.map((p) => (
                <button
                  type="button"
                  key={p._id}
                  className="navbar-dropdown-row"
                  onClick={() => goTo(`/news/${p.slug || ''}`)}
                >
                  <span className="navbar-dropdown-icon"><Newspaper size={15} /></span>
                  <span className="navbar-dropdown-text">{p.title}</span>
                </button>
              ))}
            </>
          )}
          {memberHits.length > 0 && (
            <>
              <div className="navbar-dropdown-label">Team</div>
              {memberHits.map((m) => (
                <button
                  type="button"
                  key={m._id}
                  className="navbar-dropdown-row"
                  onClick={() => goTo('/team')}
                >
                  <span className="navbar-dropdown-icon"><User size={15} /></span>
                  <span className="navbar-dropdown-text">{m.name} — {m.role}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  ), [q, dropdownOpen, pageHits, postHits, memberHits, goTo]);

  return (
    <header className={`navbar ${scrolled ? 'scrolled' : ''} ${open ? 'menu-open' : ''}`}>
      {open && <div className="navbar-menu-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}
      <div className="container">
        <div className="navbar-top">
          <Link to="/" className="navbar-brand" onClick={() => setOpen(false)}>
            <span className="navbar-logo-wrap">
              <img src="/Logo.png" alt="DTS Logo" className="navbar-logo" />
            </span>
            <span className="navbar-title">
              <b>DTS</b>
              <small>Digital Technology Skills</small>
            </span>
          </Link>

          <nav
            className={`navbar-links ${open ? 'open' : ''}`}
            aria-label="Main"
            {...(isCompact && !open ? { inert: '' } : {})}
          >
            {/* The overlay carries its own header so the close control and the
                search field stay reachable no matter how short the viewport is. */}
            <div className="navbar-panel-head">
              <span className="navbar-panel-brand">
                <span className="navbar-panel-logo-wrap">
                  <img src="/Logo.png" alt="" className="navbar-panel-logo" />
                </span>
                <span>
                  <b>DTS</b>
                  <small>Digital Technology Skills</small>
                </span>
              </span>
              <button
                type="button"
                className="navbar-panel-close"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            <form className="navbar-panel-search" onSubmit={submitSearch} role="search">
              {renderSearch('panel')}
            </form>

            <div className="navbar-panel-links">
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
            </div>

            {isLoggedIn ? (
              <div className="navbar-panel-auth">
                <NavLink
                  to={workspace}
                  className={({ isActive }) => (isActive ? 'active dash-link' : 'dash-link')}
                  onClick={() => setOpen(false)}
                >
                  {workspaceLabel}
                </NavLink>
                <button className="dash-link-logout" onClick={handleLogout}>
                  <LogOut size={15} /> Logout
                </button>
              </div>
            ) : (
              <div className="navbar-panel-auth is-split">
                <Link to="/signup" className="navbar-cta" onClick={() => setOpen(false)}>
                  Sign Up
                </Link>
                <Link to="/login" className="navbar-cta navbar-cta-ghost" onClick={() => setOpen(false)}>
                  Log In
                </Link>
              </div>
            )}

            <Link to="/contact" className="navbar-cta navbar-cta-ghost navbar-panel-contact" onClick={() => setOpen(false)}>
              Contact
            </Link>
          </nav>

          <div className="navbar-right">
            <Link to="/apply" className="btn btn-accent btn-sm navbar-cta-desktop">
              Apply Now
            </Link>
            {isLoggedIn ? (
              <>
                <Link to={workspace} className="admin-icon" aria-label={workspaceLabel} title={workspaceLabel}>
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

        <form className="navbar-searchbar" onSubmit={submitSearch} role="search">
          {renderSearch('bar')}
        </form>
      </div>
    </header>
  );
}