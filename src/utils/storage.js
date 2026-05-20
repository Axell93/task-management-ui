// Centralised auth-related storage. Two reasons to wrap localStorage:
//   1. Single place to swap to a more XSS-resistant strategy later
//      (HttpOnly cookie + backend session, BroadcastChannel sync, etc.).
//   2. Defensive try/catch so a quota-blown or disabled-storage browser
//      doesn't crash the auth flow.

const KEYS = Object.freeze({
  TOKEN: 'token',
  EXPIRES_AT: 'expiresAt',
  USER_NAME: 'userName',
});

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota or disabled — ignore */
  }
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const authStorage = {
  getToken: () => safeGet(KEYS.TOKEN),
  getUserName: () => safeGet(KEYS.USER_NAME),
  getExpiresAt: () => safeGet(KEYS.EXPIRES_AT),
  set: ({ token, expiresAt, userName }) => {
    if (token) safeSet(KEYS.TOKEN, token);
    if (expiresAt) safeSet(KEYS.EXPIRES_AT, expiresAt);
    if (userName) safeSet(KEYS.USER_NAME, userName);
  },
  clear: () => {
    safeRemove(KEYS.TOKEN);
    safeRemove(KEYS.EXPIRES_AT);
    safeRemove(KEYS.USER_NAME);
  },
};
