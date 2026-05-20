import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  clearError,
  loginThunk,
  registerThunk,
  selectAuth,
  selectIsAuthenticated,
} from '../store/authSlice';
import Spinner from '../components/Spinner';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, error } = useSelector(selectAuth);
  const isAuthed = useSelector(selectIsAuthenticated);
  const loading = status === 'loading';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { userName: '', email: '', password: '' } });

  // Bounce to the protected route once a token lands.
  useEffect(() => {
    if (isAuthed) {
      const to = location.state?.from?.pathname || '/tasks';
      navigate(to, { replace: true });
    }
  }, [isAuthed, navigate, location.state]);

  const onSubmit = (data) => {
    if (mode === 'login') {
      dispatch(loginThunk({ userName: data.userName, password: data.password }));
    } else {
      dispatch(registerThunk(data));
    }
  };

  const switchMode = (val) => {
    setMode(val);
    dispatch(clearError());
    reset();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-brand-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-700 text-white text-lg font-semibold mb-3">
            T
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Task Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        <div className="card p-6">
          <div className="flex p-1 bg-slate-100 rounded-md mb-6">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-1.5 text-sm font-medium rounded ${
                mode === 'login' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 py-1.5 text-sm font-medium rounded ${
                mode === 'register' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label className="label">Username</label>
              <input
                type="text"
                autoComplete="username"
                className="input"
                {...register('userName', { required: 'Username is required' })}
              />
              {errors.userName && (
                <p className="text-xs text-rose-600 mt-1">{errors.userName.message}</p>
              )}
            </div>

            {mode === 'register' && (
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  className="input"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^\S+@\S+\.\S+$/,
                      message: 'Enter a valid email',
                    },
                  })}
                />
                {errors.email && (
                  <p className="text-xs text-rose-600 mt-1">{errors.email.message}</p>
                )}
              </div>
            )}

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="input"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'At least 6 characters' },
                })}
              />
              {errors.password && (
                <p className="text-xs text-rose-600 mt-1">{errors.password.message}</p>
              )}
              {mode === 'register' && (
                <p className="text-xs text-slate-500 mt-1">
                  Must include a digit, lowercase letter, and 6+ characters.
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading && <Spinner />}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
