import { v4 as uuidv4 } from 'uuid';
import http from './axios';

const cleanParams = (params) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));

// Every method accepts an optional AbortSignal so useFetch / thunks can
// cancel in-flight requests on unmount or filter changes.
export const tasksApi = {
  list: (filters = {}, signal) =>
    http.get('/tasks', { params: cleanParams(filters), signal }).then((r) => r.data),

  getById: (id, signal) => http.get(`/tasks/${id}`, { signal }).then((r) => r.data),

  // Idempotency-Key: a fresh UUID per call. Replays of the same UUID at
  // the API return the original task (server enforces uniqueness via a
  // filtered index). Note: when axios retries this request, the same key
  // is reused so the second attempt is also safe.
  create: (payload, signal) =>
    http
      .post('/tasks', payload, { headers: { 'Idempotency-Key': uuidv4() }, signal })
      .then((r) => r.data),

  update: (id, payload, signal) =>
    http.put(`/tasks/${id}`, payload, { signal }).then((r) => r.data),

  softDelete: (ids, signal) =>
    http.patch('/tasks/delete-tasks', { ids }, { signal }).then((r) => r.data),

  summary: (signal) => http.get('/tasks/summary', { signal }).then((r) => r.data),
};
