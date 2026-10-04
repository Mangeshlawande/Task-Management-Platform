// Tasks & subtasks API — contract rows in docs/03-api-contract.md § Tasks & Subtasks
import { api } from './client.js';

const base = (projectId) => `/api/v1/projects/${projectId}/tasks`;

export const tasksApi = {
  /** GET /projects/:projectId/tasks → Task[] (populated assignedTo/assignedBy, newest first) */
  list: (projectId) => api.get(base(projectId)),

  /**
   * POST /projects/:projectId/tasks → Task (201).
   * multipart/form-data: title, description?, assignedTo?, status?, priority?,
   * dueDate?, attachments[] (≤5 images, 1MB each, jpeg/png/webp).
   * 403 = viewer role; 400 = bad file or missing title.
   */
  create: (projectId, formData) => api.postForm(base(projectId), formData),

  /** GET …/:taskId → Task & { subTasks: SubTask[] } — the list rows carry no subtasks. */
  get: (projectId, taskId) => api.get(`${base(projectId)}/${taskId}`),

  /**
   * PUT …/:taskId → Task. JSON partial: title/description/status/assignedTo/
   * priority/dueDate. Send `assignedTo: null` to unassign, `dueDate: null` to
   * clear. Owner (assignedBy) or project admin — members get 403.
   */
  update: (projectId, taskId, patch) =>
    api.put(`${base(projectId)}/${taskId}`, patch),

  /** DELETE …/:taskId → {} — owner or project admin. Cascades subtasks. */
  remove: (projectId, taskId) => api.delete(`${base(projectId)}/${taskId}`),

  /** POST …/:taskId/subtasks { title } → SubTask (201) — admin / project_admin. */
  createSubtask: (projectId, taskId, title) =>
    api.post(`${base(projectId)}/${taskId}/subtasks`, { title }),

  /**
   * PUT …/:taskId/subtasks/:subTaskId → SubTask. `isCompleted` may be toggled
   * by any member; changing `title` needs admin rights (backend-enforced).
   */
  updateSubtask: (projectId, taskId, subTaskId, patch) =>
    api.put(`${base(projectId)}/${taskId}/subtasks/${subTaskId}`, patch),

  /** DELETE …/:taskId/subtasks/:subTaskId → {} — creator, task owner or admin. */
  removeSubtask: (projectId, taskId, subTaskId) =>
    api.delete(`${base(projectId)}/${taskId}/subtasks/${subTaskId}`),
};
