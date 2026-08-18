/**
 * AdminLayout.jsx
 * Wrapper for the admin section: a title, a tab bar and the active sub-page.
 *
 * Reminder: hiding these screens is a convenience, not security. Every
 * /api/admin/** endpoint must independently require ROLE_ADMIN on the backend.
 */

import { NavLink, Outlet } from 'react-router-dom';
import { IconShield } from '../../components/common/Icons';

const TABS = [
  { to: '/admin', end: true, label: 'Overview' },
  { to: '/admin/events', label: 'Events' },
  { to: '/admin/contests', label: 'Questions' },
  { to: '/admin/contests/new', label: 'New question' },
  { to: '/admin/users', label: 'Users & tokens' },
  { to: '/admin/transactions', label: 'Audit log' },
];

export default function AdminLayout() {
  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1 className="page-title row" style={{ gap: 10 }}>
            <IconShield size={24} /> Admin
          </h1>
          <p className="page-subtitle">
            Create events and the questions inside them, credit virtual tokens, watch matching and
            declare results.
          </p>
        </div>
      </div>

      <div className="segmented" style={{ marginBottom: 'var(--s-6)' }}>
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => `segmented__btn ${isActive ? 'is-active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  );
}
