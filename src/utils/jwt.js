// Tiny pure JWT helper — decodes the payload only, never validates the
// signature (the server is the source of truth). Use to detect expiry
// client-side so we don't send a token we already know is dead.

function base64UrlDecode(input) {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const base64 = (input + pad).replace(/-/g, '+').replace(/_/g, '/');
  // atob exists in browser + jsdom; if missing we treat as malformed.
  if (typeof atob !== 'function') return null;
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
  } catch {
    return null;
  }
}

export function decodeJwt(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const json = base64UrlDecode(parts[1]);
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Returns `exp` (epoch ms) for the token, or 0 if unknown. */
export function getTokenExpiryMs(token) {
  const payload = decodeJwt(token);
  if (!payload || typeof payload.exp !== 'number') return 0;
  return payload.exp * 1000;
}

/** Treat a token as expired if its `exp` has passed (allow a small skew). */
export function isTokenExpired(token, skewMs = 5_000) {
  const exp = getTokenExpiryMs(token);
  if (!exp) return false; // can't tell; defer to the server
  return Date.now() + skewMs >= exp;
}
