import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import TasksPage from './pages/TasksPage';
import ProtectedRoute from './routes/ProtectedRoute';
import { logout, selectAuth } from './store/authSlice';
import { useSessionExpiry } from './hooks/useSessionExpiry';

export default function App() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token } = useSelector(selectAuth);

  const forceLogout = useCallback(() => {
    dispatch(logout());
    navigate('/login', { replace: true });
  }, [dispatch, navigate]);

  // 401 (real or synthetic from the request interceptor) → log out.
  useEffect(() => {
    window.addEventListener('auth:unauthorized', forceLogout);
    return () => window.removeEventListener('auth:unauthorized', forceLogout);
  }, [forceLogout]);

  // Proactive client-side expiry — fires the moment the JWT's exp claim
  // lands, even with zero network activity. Also handles wake-from-sleep
  // and cross-tab logouts.
  useSessionExpiry(token, forceLogout);

  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <TasksPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/tasks" replace />} />
    </Routes>
  );
}
