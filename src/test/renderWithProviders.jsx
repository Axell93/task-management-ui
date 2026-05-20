import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import authReducer from '../store/authSlice';

export function makeStore(preloaded) {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: preloaded,
  });
}

export function renderWithProviders(ui, { preloadedState, route = '/' } = {}) {
  const store = makeStore(preloadedState);
  const result = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </Provider>,
  );
  return { ...result, store };
}
