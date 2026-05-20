# Task Management UI

A minimalistic React + Vite SPA for the .NET 9 TaskManagement API. State management with **Redux Toolkit** (which ships redux-thunk by default), styling with **Tailwind CSS**, forms with **React Hook Form**, routing with **React Router**, and a custom **`useFetch`** hook that handles AbortController, retry-with-backoff, and stale-update guards.

## Stack

- React 19 + Vite 8
- Redux Toolkit + react-redux (thunk middleware preconfigured)
- React Router v7
- Tailwind CSS v3
- React Hook Form
- Axios + UUID (for the `Idempotency-Key` header on POST)
- Vitest + React Testing Library + jsdom (52 tests, units + integration)
- ESLint (+ `eslint-plugin-security`, `eslint-config-prettier`) + Prettier

## Pages and modals

| Surface | Purpose | API |
| ------- | ------- | --- |
| `/login`  | Login + Register tabs (single form) | `POST /api/auth/login`, `POST /api/auth/register` |
| `/tasks`  | Table with status/priority filters, **sortable Status & Priority columns**, bulk-select, edit, logout | `GET /api/tasks?status=&priority=` |
| **Create / Edit modal** | Same form, switches mode based on selection | `POST /api/tasks` (with `Idempotency-Key: <uuid>`), `PUT /api/tasks/{id}` |
| **Task detail modal**   | Opens when a task title is clicked — uses `useFetch` | `GET /api/tasks/{id}` |
| **Summary modal**       | Triggered by the "View summary" button — uses `useFetch` | `GET /api/tasks/summary` |

Bulk soft delete uses `PATCH /api/tasks/delete-tasks` with `{ ids: [...] }`.

## Scripts

```bash
npm run dev            # vite dev server (http://localhost:5173)
npm run build          # production bundle
npm run preview        # preview production build
npm run lint           # eslint .
npm run lint:fix       # eslint . --fix
npm run format         # prettier --write .
npm run format:check   # prettier --check .
npm test               # vitest run (single shot, CI-friendly)
npm run test:watch     # vitest in watch mode
npm run test:coverage  # vitest with v8 coverage
```

## Running

```bash
# Backend (separate terminal — must be on https://localhost:7136)
cd C:\Users\anura\TaskManagement
dotnet run --project src/TaskManagement.API

# Frontend
cd C:\Users\anura\Projects\task-management-ui
npm install
npm run dev   # http://localhost:5173
```

Vite proxies `/api` → `https://localhost:7136`, so the browser sees same-origin requests and CORS is sidestepped. Override with `VITE_API_TARGET` (see `.env.example`).

## Code map

```
src/
├── api/
│   ├── axios.js              # base client, bearer attach, retry interceptor,
│   │                          # JWT-expiry pre-check, 401 → logout event
│   ├── authApi.js
│   └── tasksApi.js           # every method accepts an AbortSignal
├── hooks/
│   ├── useFetch.js           # AbortController + retry/backoff + race-safe seq
│   └── useSessionExpiry.js   # proactive JWT exp + cross-tab + wake-from-sleep
├── store/
│   ├── index.js              # configureStore (thunk built in)
│   ├── authSlice.js          # expiry-aware bootstrap, storage helper
│   └── tasksSlice.js         # requestId guard, abort-on-rerun, resetSaveStatus
├── routes/
│   └── ProtectedRoute.jsx
├── pages/
│   ├── AuthPage.jsx          # login / register
│   └── TasksPage.jsx         # table + filters + sortable columns + bulk-select
├── components/
│   ├── ErrorBoundary.jsx     # React render-phase boundary
│   ├── ErrorFallback.jsx     # full-page fallback UI
│   ├── Modal.jsx
│   ├── TaskFormModal.jsx     # create + edit (react-hook-form)
│   ├── TaskDetailModal.jsx   # useFetch — race-safe single-task view
│   ├── SummaryModal.jsx      # useFetch — summary table
│   ├── Badge.jsx
│   └── Spinner.jsx
├── utils/
│   ├── constants.js          # enum strings + badge colours
│   ├── errors.js             # ProblemDetails → human message
│   ├── jwt.js                # decode, isTokenExpired, getTokenExpiryMs
│   ├── sort.js               # semantic status/priority sort + toggle util
│   └── storage.js            # safe localStorage wrapper
└── test/
    ├── setup.js              # jest-dom matchers + auto cleanup
    └── renderWithProviders.jsx
```

## `useFetch` hook

```jsx
import { useFetch } from '../hooks/useFetch';
import { tasksApi } from '../api/tasksApi';

const fetcher = useCallback((signal) => tasksApi.getById(id, signal), [id]);
const { data, error, loading, refetch, cancel } = useFetch(fetcher, {
  immediate: true,   // call on mount (default)
  retries: 2,        // bounded — only transient errors trigger a retry
  baseDelayMs: 300,  // exponential backoff with full jitter
});
```

Built-in protections:

- **AbortController** bound to the component's lifecycle. The fetcher receives the signal and forwards it to axios; unmount → abort, no stale `setState`.
- **Retry policy** — only **transient** failures (network errors, 5xx, 429). 4xx is surfaced to the user immediately.
- **Sequence guard** — every `run` bumps a monotonic counter; older promises that resolve after a newer call has started are discarded.
- **`refetch()`** cancels any in-flight call and starts fresh — used by the "Try again" buttons on error UI.

## Axios layer

`src/api/axios.js` adds two interceptors on top of the base client:

| Concern | Detail |
| ------- | ------ |
| Bearer attach | Reads from the `authStorage` helper on every request |
| Pre-expiry short-circuit | If the JWT's `exp` claim has passed, cancel the request locally and broadcast `auth:unauthorized` — no wasted round-trip |
| Bounded retry | Up to 2 retries with exponential backoff + jitter, **only** for idempotent verbs (GET/HEAD/OPTIONS/PUT/DELETE) and **POST when an `Idempotency-Key` is set**, and **only** for network errors / 5xx / 429 |
| 401 handling | Wipe local auth, fire `auth:unauthorized` event so `App.jsx` can route to `/login` |
| Timeout | 15 s default |

## Redux slice race-safety

`tasksSlice.fetchTasks` carries an RTK-issued `requestId`. The slice tracks the most recent one in `state.latestRequestId`; older fulfilled / rejected actions are dropped in the reducer. The `TasksPage` effect captures the dispatch promise and calls `.abort()` in its cleanup, so the underlying HTTP request is also cancelled — a *typical* rapid-filter-change sequence (Done → ToDo → Done) results in exactly one in-flight call and exactly one committed payload.

## Sorting

UI-only, applied after the server-filtered rows arrive. Status and Priority columns are sortable; clicking cycles **asc → desc → cleared**. Sort order is semantic, not alphabetical:

- Status: `ToDo < InProgress < Done`
- Priority: `Low < Medium < High < Critical`

Implemented in `src/utils/sort.js` and consumed by `TasksPage`.

## Session expiration

1. **Bootstrap**: `authSlice` checks the persisted token's `exp` on startup; if already past, treats the user as logged out and clears storage.
2. **Pre-flight**: every axios request decodes the token and short-circuits to a synthetic 401 if expired — never sends a dead token over the wire.
3. **Proactive**: `useSessionExpiry(token, onExpire)` schedules a `setTimeout` for the moment the JWT lapses; also listens for:
   - `visibilitychange` — re-checks on wake-from-sleep (timers throttle in background tabs)
   - `storage` event — cross-tab logout (another tab clears the token → this tab logs out too)
4. **Reactive**: any real 401 from the server triggers the same logout path via the `auth:unauthorized` window event.

## Error handling

| Layer | Catches |
| ----- | ------- |
| `ErrorBoundary` (`src/components/ErrorBoundary.jsx`) | React render-phase errors. Wraps the entire app in `main.jsx`. Recovery via `reset()`. |
| `window.error` listener (`main.jsx`) | Sync throws in event handlers, timers, etc. |
| `window.unhandledrejection` listener (`main.jsx`) | Failed promises with no `.catch`. |
| Per-feature error UI | Each fetch surface (`TasksPage`, `TaskDetailModal`, `SummaryModal`) renders an inline error with a **Try again** button that calls the hook's `refetch`. |

## Security

| Concern | Mitigation |
| ------- | ---------- |
| **XSS** | Everything is rendered as text by React (auto-escaped). `dangerouslySetInnerHTML` is **lint-forbidden** at the project level (`no-restricted-syntax`). `document.write` is forbidden too. `eslint-plugin-security` flags additional patterns. |
| **CSRF** | JWT travels in the `Authorization` header — cookies are never used for auth, so CSRF is structurally impossible. (If you ever move to cookie auth, switch to SameSite=Lax + a CSRF token middleware on the API.) |
| **CSP** | Strict `Content-Security-Policy` meta in `index.html`: `default-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'` etc. Backend also serves header-level CSP / `X-Frame-Options: DENY` / `Referrer-Policy: no-referrer` via `SecurityHeadersMiddleware`. |
| **Token storage** | `localStorage` wrapped in `authStorage` (centralised so it's trivial to swap for an HttpOnly cookie + backend session). |
| **Storage failures** | Wrapped in try/catch — quota / disabled-storage browsers don't crash auth. |
| **Session expiry** | See section above — three layers (bootstrap, pre-flight, proactive timer). |
| **Bad token detection** | Tokens without a parseable `exp` are treated as opaque; the server is still the source of truth on validation. |

## Testing

```bash
npm test              # 52 tests, < 5s
npm run test:coverage # HTML report in ./coverage
```

### Unit tests

| Subject | File | Covers |
| ------- | ---- | ------ |
| `useFetch` | `src/hooks/useFetch.test.jsx` | success, transient retry, no retry on 4xx, abort on unmount, stale-update guard |
| JWT utils | `src/utils/jwt.test.js` | decode, expiry detection, malformed input |
| Sort utils | `src/utils/sort.test.js` | semantic order, descending, no-mutation, empty input, third-click clear |
| `authSlice` | `src/store/authSlice.test.js` | bootstrap, login persists, login rejection, logout clears |
| `tasksSlice` | `src/store/tasksSlice.test.js` | fetch happy path, **race-condition (stale response discarded)**, create insert, idempotent replay replaces, update in place, bulk delete, filters merge, save reset |

### Integration tests

| Subject | File | Covers |
| ------- | ---- | ------ |
| `<ErrorBoundary>` | `src/components/ErrorBoundary.test.jsx` | renders children, shows fallback + recovers, XSS-safe (no `<img>` injected) |
| `<TaskDetailModal>` | `src/components/TaskDetailModal.test.jsx` | fetches on open, error → retry → recovery, no fetch when closed, **aborts on unmount** |
| `<TasksPage>` | `src/pages/TasksPage.test.jsx` | renders rows, empty state, error state + try-again, semantic Priority sort, asc/desc/cleared toggle, bulk delete after confirm, filter re-fetch |

### Edge cases verified

| Edge case | Covered by |
| --------- | ---------- |
| **Stale updates** (older response overwrites newer state) | `tasksSlice` requestId guard test + `useFetch` sequence-guard test |
| **API failures** (transient and permanent) | `useFetch` retry test + `useFetch` 4xx no-retry test + per-component "Try again" tests |
| **Race conditions** (rapid filter changes, modal opened/closed quickly) | `useEffect` cleanup calls `.abort()` on the dispatch promise + `useFetch` cancels in-flight on unmount + dedicated tasksSlice race test |
| **Empty states** | TasksPage "No tasks match" row, SummaryModal "No data to summarise yet" |
| **Session expiry mid-session** | Proactive `setTimeout` + visibilitychange + cross-tab storage event |
| **Disabled / quota-blown localStorage** | `authStorage` wraps every call in try/catch |

## Lint + format

ESLint runs on every file under `src/` plus the config files. Project-specific rules:

- `no-restricted-syntax` forbids `dangerouslySetInnerHTML` and `document.write`.
- `eslint-plugin-security` recommended rules enabled.
- `eslint-config-prettier` disables stylistic conflicts.
- `prettier/prettier` runs as a warning so format diffs surface inline.

`.prettierrc.json` pins `singleQuote`, `trailingComma: all`, `printWidth: 100`. Run `npm run format` to auto-format.
