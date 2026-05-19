import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { selectIsAuthenticated } from '../store/authSlice';

// Guards every non-auth route. Stores the attempted path so the user
// lands back where they wanted after signing in.
export default function ProtectedRoute({ children }) {
  const authed = useSelector(selectIsAuthenticated);
  const location = useLocation();
  if (!authed) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}
