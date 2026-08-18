/**
 * ProtectedRoute.jsx
 * Route guard. `adminOnly` additionally requires ROLE_ADMIN.
 *
 * This is convenience only - it hides screens, it does not secure anything.
 * The backend must enforce the same rules on every endpoint.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingBlock } from './Spinner';

export default function ProtectedRoute({ adminOnly = false }) {
  const { isAuthenticated, isAdmin, booting } = useAuth();
  const location = useLocation();

  if (booting) return <LoadingBlock label="Checking your session..." />;

  if (!isAuthenticated) {
    // Remember where the user was headed so login can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;

  return <Outlet />;
}
