import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from './ErrorBoundary';
import ErrorFallback from './ErrorFallback';

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary fallback={ErrorFallback}>
        <div>safe</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('safe')).toBeInTheDocument();
  });

  it('shows the fallback when a child throws and recovers via Try again', async () => {
    // Suppress the noisy React error log for the deliberately-thrown error.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    let shouldThrow = true;
    const Recoverable = () => {
      if (shouldThrow) throw new Error('kaboom');
      return <div>recovered</div>;
    };

    render(
      <ErrorBoundary fallback={ErrorFallback}>
        <Recoverable />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText('kaboom')).toBeInTheDocument();

    shouldThrow = false;
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByText('recovered')).toBeInTheDocument();

    spy.mockRestore();
  });

  it('XSS-safe — error message is rendered as text, not HTML', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Evil = () => {
      throw new Error('<img src=x onerror=alert(1)>');
    };
    render(
      <ErrorBoundary fallback={ErrorFallback}>
        <Evil />
      </ErrorBoundary>,
    );
    // React escapes; no <img> element should appear in the DOM.
    expect(document.querySelector('img')).toBeNull();
    // But the literal text IS shown (escaped).
    expect(screen.getByText(/onerror=alert/)).toBeInTheDocument();
    spy.mockRestore();
  });
});
