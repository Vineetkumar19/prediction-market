/**
 * Navbar.jsx
 * Top bar for tablet and desktop. On phones the links move into BottomNav and
 * only the brand, token pill and avatar stay up here.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import { formatTokens, initialsOf } from '../../utils/format';
import {
  IconBell,
  IconGrid,
  IconHistory,
  IconHome,
  IconLogout,
  IconShield,
  IconTrendUp,
  IconUser,
  IconWallet,
} from '../common/Icons';

export default function Navbar({ unreadCount = 0 }) {
  const { user, isAdmin, logout } = useAuth();
  const { wallet, flash } = useWallet();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  /* Close the profile menu on an outside click or Escape. */
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link to="/" className="brand" aria-label="Home">
          <span className="brand__mark">
            <IconTrendUp size={19} />
          </span>
          <span className="brand__text hide-on-phone">
            <span>Prediction Market</span>
            <span className="brand__sub">Simulator &middot; virtual tokens</span>
          </span>
        </Link>

        <nav className="nav-links hide-on-tablet" aria-label="Main">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}>
            <IconHome size={17} /> Events
          </NavLink>
          <NavLink to="/wallet" className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}>
            <IconWallet size={17} /> Wallet
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}>
            <IconHistory size={17} /> History
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}>
              <IconShield size={17} /> Admin
            </NavLink>
          )}
        </nav>

        <div className="navbar__right">
          <Link
            to="/wallet"
            className={`token-pill ${flash ? 'is-flash' : ''}`}
            title="Available tokens"
          >
            <span className="token-pill__value">{formatTokens(wallet.available)}</span>
            <span className="token-pill__label hide-on-phone">tokens</span>
          </Link>

          <Link to="/notifications" className="icon-btn" aria-label="Notifications">
            <IconBell size={18} />
            {unreadCount > 0 && (
              <span className="dot-count">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </Link>

          <div className="menu-anchor" ref={menuRef}>
            <button
              type="button"
              className="avatar"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Account menu"
            >
              {initialsOf(user?.name || user?.userId)}
            </button>

            {menuOpen && (
              <div className="menu" role="menu">
                <div className="menu__header">
                  <div className="bold">{user?.name}</div>
                  <div className="mono small muted">@{user?.userId}</div>
                </div>
                <Link to="/profile" className="menu__item" role="menuitem" onClick={() => setMenuOpen(false)}>
                  <IconUser size={17} /> Profile
                </Link>
                <Link to="/wallet" className="menu__item" role="menuitem" onClick={() => setMenuOpen(false)}>
                  <IconWallet size={17} /> Wallet
                </Link>
                <Link to="/history" className="menu__item" role="menuitem" onClick={() => setMenuOpen(false)}>
                  <IconHistory size={17} /> Transaction history
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="menu__item" role="menuitem" onClick={() => setMenuOpen(false)}>
                    <IconGrid size={17} /> Admin dashboard
                  </Link>
                )}
                <hr className="divider" style={{ margin: '6px 0' }} />
                <button type="button" className="menu__item menu__item--danger" onClick={handleLogout} role="menuitem">
                  <IconLogout size={17} /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
