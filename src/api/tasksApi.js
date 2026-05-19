import { v4 as uuidv4 } from "uuid";
import http from "./axios";

const cleanParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
  );

export const tasksApi = {
  list: (filters = {}) =>
    http.get("/tasks", { params: cleanParams(filters) }).then((r) => r.data),

  getById: (id) => http.get(`/tasks/${id}`).then((r) => r.data),

  create: (payload) =>
    http
      .post("/tasks", payload, { headers: { "Idempotency-Key": uuidv4() } })
      .then((r) => r.data),

  update: (id, payload) =>
    http.put(`/tasks/${id}`, payload).then((r) => r.data),

  softDelete: (ids) =>
    http.patch("/tasks/delete-tasks", { ids }).then((r) => r.data),

  summary: () => http.get("/tasks/summary").then((r) => r.data),
};
