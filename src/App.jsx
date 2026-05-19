import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import TasksPage from './pages/TasksPage';
import ProtectedRoute from './routes/ProtectedRoute';
import { logout } from './store/authSlice';

export default function App() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // The axios interceptor fires this event on any 401. Clear local auth
  // state and send the user back to /login.
  useEffect(() => {
    const handler = () => {
      dispatch(logout());
      navigate('/login', { replace: true });
    };
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, [dispatch, navigate]);

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
