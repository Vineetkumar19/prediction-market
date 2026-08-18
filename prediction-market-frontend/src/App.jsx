/**
 * App.jsx
 * Provider tree and route table.
 *
 * Provider order matters: Toast is outermost so anything can raise a message,
 * Auth next because Wallet depends on knowing who is logged in, then Wallet.
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { WalletProvider } from './context/WalletContext';

import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/common/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import EventDetails from './pages/EventDetails';
import ContestDetails from './pages/ContestDetails';
import Wallet from './pages/Wallet';
import History from './pages/History';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import NotFound from './pages/NotFound';

import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminEvents from './pages/admin/AdminEvents';
import AdminContests from './pages/admin/AdminContests';
import AdminCreateContest from './pages/admin/AdminCreateContest';
import AdminUsers from './pages/admin/AdminUsers';
import AdminTransactions from './pages/admin/AdminTransactions';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <WalletProvider>
            <Routes>
              {/* ---- public ---- */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* ---- signed in ---- */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/event/:id" element={<EventDetails />} />
                  <Route path="/contest/:id" element={<ContestDetails />} />
                  <Route path="/wallet" element={<Wallet />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/profile" element={<Profile />} />
                </Route>
              </Route>

              {/* ---- admin only ---- */}
              <Route element={<ProtectedRoute adminOnly />}>
                <Route element={<AppLayout />}>
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="events" element={<AdminEvents />} />
                    <Route path="contests" element={<AdminContests />} />
                    <Route path="contests/new" element={<AdminCreateContest />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="transactions" element={<AdminTransactions />} />
                  </Route>
                </Route>
              </Route>

              {/* ---- fallbacks ---- */}
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </WalletProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
