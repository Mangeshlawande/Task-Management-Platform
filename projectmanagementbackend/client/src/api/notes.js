// Notes API — contract rows in docs/03-api-contract.md § Notes
import { api } from './client.js';

export const notesApi = {
  /**
   * GET /projects/:projectId/notes?page=&limit= (limit ≤ 50)
   * → { notes: Note[], pagination: { total, page, limit, totalPages } }
   * Pinned notes sort first, then newest. Any project member.
   */
  list: (projectId, { page = 1, limit = 12 } = {}) =>
    api.get(
      `/api/v1/projects/${projectId}/notes?page=${page}&limit=${limit}`,
    ),

  /** POST /projects/:projectId/notes { content } → Note (201). Admin / project_admin. */
  create: (projectId, content) =>
    api.post(`/api/v1/projects/${projectId}/notes`, { content }),

  /** GET /projects/:projectId/notes/:noteId → Note (any member). */
  get: (projectId, noteId) =>
    api.get(`/api/v1/projects/${projectId}/notes/${noteId}`),

  /**
   * PUT /projects/:projectId/notes/:noteId { content?, isPinned? } → Note.
   * Owner or project admin. `editedAt` is stamped server-side.
   */
  update: (projectId, noteId, patch) =>
    api.put(`/api/v1/projects/${projectId}/notes/${noteId}`, patch),

  /** DELETE /projects/:projectId/notes/:noteId → {}. Owner or project admin. */
  remove: (projectId, noteId) =>
    api.delete(`/api/v1/projects/${projectId}/notes/${noteId}`),
};
