import { useEffect, useRef } from 'react';
import { getTokenExpiryMs } from '../utils/jwt';

/**
 * Schedules a logout callback to fire the moment the JWT's `exp` lands.
 * Re-arms whenever the token changes. Also covers two edge cases:
 *   • cross-tab sync — `storage` events fire when another tab logs in/out
 *   • wake-from-sleep — `visibilitychange` re-checks expiry on focus
 */
export function useSessionExpiry(token, onExpire) {
  // Keep a ref to the latest callback so the timer effect doesn't have to
  // depend on `onExpire` identity (which would re-arm on every render).
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!token) return undefined;
    const exp = getTokenExpiryMs(token);
    if (!exp) return undefined;

    const fire = () => onExpireRef.current?.();
    const msUntil = exp - Date.now();
    if (msUntil <= 0) {
      fire();
      return undefined;
    }

    // setTimeout caps at ~24.8 days; clamp to that to avoid wrap-to-zero.
    const t = setTimeout(fire, Math.min(msUntil, 2_147_483_647));

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() >= exp) fire();
    };
    const onStorage = (e) => {
      if (e.key === 'token' && e.newValue == null) fire();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('storage', onStorage);
    return () => {
      clearTimeout(t);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('storage', onStorage);
    };
  }, [token]);
}
