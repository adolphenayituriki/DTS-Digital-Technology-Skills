import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, BookOpen, FilePlus2, User, LayoutDashboard, Menu } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { roleHome } from '../roleHome';

// Bottom navigation for phones. On desktop it is display:none (pure CSS, so
// the prerendered markup and the first client render never disagree); below
// 900px it is the primary way around the site, which is what makes the site
// feel like an installed app rather than a page with a hamburger on it.
//
// The Menu tab does not duplicate the nav - it opens the full-screen overlay
// the hamburger already opens, by event, so the overlay keeps exactly one
// source of truth for its open state.

const ACCOUNT_PATHS = ['/dashboard', '/account', '/profile', '/admin', '/trainer', '/finance', '/secretary'];

export default function MobileTabBar() {
  const { user, isLoggedIn, ready } = useAuth();
  const location = useLocation();

  const workspace = roleHome(user?.role);
  const accountActive = ACCOUNT_PATHS.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`));

  const openMenu = () => {
    window.dispatchEvent(new CustomEvent('dts:open-menu'));
  };

  return (
    <nav className="mobile-tabbar" aria-label="Mobile">
      <NavLink to="/" className="mobile-tab" end>
        <Home size={20} />
        <span>Home</span>
      </NavLink>
      <NavLink to="/programs" className="mobile-tab">
        <BookOpen size={20} />
        <span>Programs</span>
      </NavLink>
      <NavLink to="/apply" className="mobile-tab">
        <FilePlus2 size={20} />
        <span>Apply</span>
      </NavLink>
      {/* `ready` guards the destination the same way Navbar does: until
          localStorage has been read the account state is unknown, and picking
          a target early would disagree with the prerendered markup. */}
      {!ready ? (
        <span className="mobile-tab is-pending" aria-hidden="true">
          <User size={20} />
          <span>Account</span>
        </span>
      ) : isLoggedIn ? (
        <NavLink
          to={user?.mustChangePassword ? '/account' : workspace}
          className={`mobile-tab${accountActive ? ' active' : ''}`}
        >
          <LayoutDashboard size={20} />
          <span>Account</span>
        </NavLink>
      ) : (
        <NavLink to="/login" className="mobile-tab">
          <User size={20} />
          <span>Account</span>
        </NavLink>
      )}
      <button type="button" className="mobile-tab" onClick={openMenu} aria-label="Open menu">
        <Menu size={20} />
        <span>Menu</span>
      </button>
    </nav>
  );
}
