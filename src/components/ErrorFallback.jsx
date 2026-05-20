export default function ErrorFallback({ error, reset }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="card max-w-md w-full p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 text-rose-600 mb-4">
          <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l6.518 11.59c.75 1.335-.213 2.987-1.742 2.987H3.482c-1.53 0-2.493-1.652-1.743-2.987L8.257 3.1zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-slate-900">Something went wrong</h1>
        {/* error.message is rendered as text by React — automatically escaped. */}
        <p className="text-sm text-slate-500 mt-1 break-words">
          {error?.message || 'An unexpected error occurred.'}
        </p>
        <div className="flex gap-2 justify-center mt-5">
          <button className="btn-secondary" onClick={() => window.location.reload()}>
            Reload
          </button>
          <button className="btn-primary" onClick={reset}>
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
