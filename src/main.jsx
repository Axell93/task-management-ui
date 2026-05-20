import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import ErrorFallback from './components/ErrorFallback.jsx';
import { store } from './store';
import './index.css';

// Catch errors that escape React's render-phase boundary:
//   • window.error   — synchronous throws in event handlers / timers
//   • unhandledrejection — failed promises with no .catch
// For now we only log; in prod wire to Sentry / Datadog / etc.
window.addEventListener('error', (e) => {
  console.error('[window.error]', e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[unhandledrejection]', e.reason);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary fallback={ErrorFallback}>
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </ErrorBoundary>
  </StrictMode>,
);
