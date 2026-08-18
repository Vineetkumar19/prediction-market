/**
 * BottomNav.jsx
 * Phone navigation. Hidden above 900px by CSS - the navbar links take over.
 * Sits inside the safe area so it clears the iOS home indicator.
 */

import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { IconHistory, IconHome, IconShield, IconUser, IconWallet } from '../common/Icons';

const linkClass = ({ isActive }) => `bottom-link ${isActive ? 'is-active' : ''}`;

export default function BottomNav() {
  const { isAdmin } = useAuth();

  return (
    <nav className="bottom-nav" aria-label="Main">
      <div className="bottom-nav__inner">
        <NavLink to="/" end className={linkClass}>
          <IconHome size={21} />
          <span>Events</span>
        </NavLink>
        <NavLink to="/wallet" className={linkClass}>
          <IconWallet size={21} />
          <span>Wallet</span>
        </NavLink>
        <NavLink to="/history" className={linkClass}>
          <IconHistory size={21} />
          <span>History</span>
        </NavLink>
        <NavLink to="/profile" className={linkClass}>
          <IconUser size={21} />
          <span>Profile</span>
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin" className={linkClass}>
            <IconShield size={21} />
            <span>Admin</span>
          </NavLink>
        )}
      </div>
    </nav>
  );
}
