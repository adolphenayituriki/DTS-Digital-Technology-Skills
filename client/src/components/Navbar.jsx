import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Menu, X, LogOut, LayoutDashboard, Search,
  Home, Info, BookOpen, Users, Newspaper, Camera, FilePlus2, Mail, User, GraduationCap
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import apiFetch from '../api';

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
  { to: '/profile', label: 'Student Profile', icon: <GraduationCap size={15} /> },
  { to: '/contact', label: 'Contact', icon: <Mail size={15} /> },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [q, setQ] = useState('');
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState([]);
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

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

  const trimmed = q.trim().toLowerCase();
  const pageHits = trimmed ? pageItems.filter((p) => p.label.toLowerCase().includes(trimmed)) : [];
  const postHits = trimmed
    ? posts.filter((p) => (p.title || '').toLowerCase().includes(trimmed)).slice(0, 4)
    : [];
  const memberHits = trimmed
    ? members.filter((m) => (m.name || '').toLowerCase().includes(trimmed)).slice(0, 4)
    : [];
  const dropdownOpen = trimmed.length > 0;

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

  return (
    <header className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container">
        <div className="navbar-top">
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
              <div className="navbar-auth-row">
                <Link to="/signup" className="navbar-cta" onClick={() => setOpen(false)}>
                  Sign Up
                </Link>
                <Link to="/login" className="navbar-cta navbar-cta-ghost" onClick={() => setOpen(false)}>
                  Log In
                </Link>
              </div>
            )}
            <Link to="/contact" className="navbar-cta navbar-cta-ghost" onClick={() => setOpen(false)}>
              Contact
            </Link>
            <Link to="/profile" className="navbar-cta navbar-cta-ghost" onClick={() => setOpen(false)}>
              <GraduationCap size={15} /> Student Profile
            </Link>
          </nav>

          <div className="navbar-right">
            <Link to="/profile" className="btn btn-outline btn-sm navbar-student-desktop" onClick={() => setOpen(false)}>
              <GraduationCap size={15} /> Student Profile
            </Link>
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

        <form className="navbar-searchbar" onSubmit={submitSearch} role="search">
          <div className="navbar-searchbox">
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
              <div className="navbar-dropdown">
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
        </form>
      </div>
    </header>
  );
}