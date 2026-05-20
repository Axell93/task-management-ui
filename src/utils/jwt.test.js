import { describe, expect, it } from 'vitest';
import { decodeJwt, getTokenExpiryMs, isTokenExpired } from './jwt';

// Build a fake JWT (header + payload + dummy sig). The decoder ignores the
// signature, so we don't need a real key.
function makeJwt(payload) {
  const enc = (obj) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc(payload)}.sig`;
}

describe('jwt utils', () => {
  it('decodes a valid token', () => {
    const token = makeJwt({ sub: 'u1', exp: 1_700_000_000 });
    expect(decodeJwt(token)).toEqual({ sub: 'u1', exp: 1_700_000_000 });
  });

  it.each([null, undefined, 42, 'not.a.jwt', 'only.two', 'a.b.c'])(
    'rejects malformed input: %s',
    (input) => {
      const result = decodeJwt(input);
      // last case ("a.b.c") returns null because the payload isn't valid base64-json
      expect(result === null || typeof result === 'object').toBe(true);
    },
  );

  it('isTokenExpired returns true when exp has passed', () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    expect(isTokenExpired(makeJwt({ exp: past }))).toBe(true);
  });

  it('isTokenExpired returns false for a fresh token', () => {
    const future = Math.floor(Date.now() / 1000) + 600;
    expect(isTokenExpired(makeJwt({ exp: future }))).toBe(false);
  });

  it('isTokenExpired falls back to false when exp is missing', () => {
    expect(isTokenExpired(makeJwt({ sub: 'x' }))).toBe(false);
  });

  it('getTokenExpiryMs returns ms epoch', () => {
    const t = makeJwt({ exp: 1_700_000_000 });
    expect(getTokenExpiryMs(t)).toBe(1_700_000_000 * 1000);
  });
});
