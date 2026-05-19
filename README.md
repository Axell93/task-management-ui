# Task Management UI

A minimalistic React + Vite SPA for the .NET 9 TaskManagement API. State management with **Redux Toolkit** (which ships redux-thunk by default), styling with **Tailwind CSS**, forms with **React Hook Form**, and routing with **React Router**.

## Stack

- React 19 + Vite 8
- Redux Toolkit + react-redux (thunk middleware preconfigured)
- React Router v7
- Tailwind CSS v3
- React Hook Form
- Axios + UUID (for the `Idempotency-Key` header on POST)

## Pages and modals

| Surface | Purpose | API |
| ------- | ------- | --- |
| `/login`  | Login + Register tabs (single form) | `POST /api/auth/login`, `POST /api/auth/register` |
| `/tasks`  | Table with status/priority filters, bulk-select, edit, logout | `GET /api/tasks?status=&priority=` |
| **Create / Edit modal** | Same form, switches mode based on selection | `POST /api/tasks` (with `Idempotency-Key: <uuid>`), `PUT /api/tasks/{id}` |
| **Task detail modal**   | Opens when a task title is clicked | `GET /api/tasks/{id}` |
| **Summary modal**       | Triggered by the "View summary" button | `GET /api/tasks/summary` |

Bulk soft delete uses `PATCH /api/tasks/delete-tasks` with `{ ids: [...] }`.

## Running

```bash
# Backend (separate terminal — must be on https://localhost:7136)
cd C:\Users\anura\TaskManagement
dotnet run --project src/TaskManagement.API

# Frontend
cd C:\Users\anura\Projects\task-management-ui
npm install        # already done
npm run dev        # http://localhost:5173
```

Vite proxies `/api` → `https://localhost:7136`, so the browser sees same-origin requests and CORS is sidestepped. The backend also has a CORS policy for `http://localhost:5173` as a safety net.

If your backend listens elsewhere, set `VITE_API_TARGET` in `.env` (template in `.env.example`).

## Code map

```
src/
├── api/
│   ├── axios.js           # base client, bearer attach, 401 -> logout event
│   ├── authApi.js
│   └── tasksApi.js        # Idempotency-Key UUID generated per POST
├── store/
│   ├── index.js           # configureStore (thunk built in)
│   ├── authSlice.js       # loginThunk, registerThunk, logout
│   └── tasksSlice.js      # fetch/create/update/bulkDelete/summary thunks
├── routes/
│   └── ProtectedRoute.jsx # redirects to /login if no token
├── pages/
│   ├── AuthPage.jsx       # login / register
│   └── TasksPage.jsx      # table + filters + bulk-select
├── components/
│   ├── Modal.jsx
│   ├── TaskFormModal.jsx  # create + edit (react-hook-form)
│   ├── TaskDetailModal.jsx
│   ├── SummaryModal.jsx
│   ├── Badge.jsx
│   └── Spinner.jsx
└── utils/
    ├── constants.js       # enum strings + badge colours
    └── errors.js          # ProblemDetails -> human message
```

## Idempotency

`tasksApi.create()` generates a fresh `uuidv4()` and sends it as the `Idempotency-Key` header. The backend stores the key in a unique-filtered indexed column on the Tasks table — replays return the original row instead of creating a duplicate.

## Auth flow

1. User submits the auth form → thunk → API returns `{ token, expiresAt }`.
2. Token is persisted in `localStorage` and attached to all subsequent axios requests via an interceptor.
3. Any `401` response triggers a global `auth:unauthorized` event; `App.jsx` listens, dispatches `logout()`, and redirects to `/login`.
4. `ProtectedRoute` guards `/tasks` and remembers the originally requested path so post-login navigation lands the user back where they were.
