import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';

// configureStore sets up redux-thunk middleware out of the box.
// Only `auth` lives in Redux — task data is fetched per-component via
// the useFetch hook, with mutations as inline axios calls + refetch.
export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});
