// Translate axios errors into a short human-readable message. The backend
// returns ProblemDetails / ValidationProblemDetails with optional `errors`.
export function extractError(err, fallback = 'Something went wrong.') {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (data.errors && typeof data.errors === 'object') {
    return Object.values(data.errors).flat().join(' ');
  }
  return data.detail || data.title || fallback;
}
