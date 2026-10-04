// Projects API — contract rows in docs/03-api-contract.md § Projects
import { api } from './client.js';

export const projectsApi = {
  /**
   * GET /projects
   * → [{ role, project: { _id, name, description, createdBy, createdAt,
   *                       updatedAt, members } }]  (members = member count)
   */
  list: () => api.get('/api/v1/projects'),

  /**
   * POST /projects → the bare Project (201). Note it comes back WITHOUT `role`
   * or the `members` count — the list item shape is assembled by the caller.
   * 409 = the creator already has a project with this name.
   */
  create: ({ name, description }) =>
    api.post('/api/v1/projects', {
      name: name.trim(),
      description: description?.trim() || undefined,
    }),

  /**
   * GET /projects/:projectId → the bare Project (any role).
   * 404 also means "not a member of this project" — the backend scopes the
   * lookup to memberships, so both cases look identical from the client.
   */
  get: (projectId) => api.get(`/api/v1/projects/${projectId}`),

  /**
   * PUT /projects/:projectId → Project. Partial; admin / project_admin only.
   * 409 = name already taken among the creator's projects.
   */
  update: (projectId, patch) => api.put(`/api/v1/projects/${projectId}`, patch),

  /**
   * DELETE /projects/:projectId → {} — project admin (owner) only.
   * Cascade-deletes tasks, subtasks, notes and memberships server-side.
   */
  remove: (projectId) => api.delete(`/api/v1/projects/${projectId}`),

  /**
   * GET /projects/:projectId/members
   * → [{ _id, role, user: { _id, username, fullName, avatar, email }, createdAt }]
   */
  listMembers: (projectId) => api.get(`/api/v1/projects/${projectId}/members`),

  /**
   * POST /projects/:projectId/members { email, role } → { projectMember }.
   * admin / project_admin only. Upserts: an existing member's role is updated.
   * 404 = no registered user with that email.
   */
  addMember: (projectId, { email, role }) =>
    api.post(`/api/v1/projects/${projectId}/members`, {
      email: email.trim().toLowerCase(),
      role,
    }),

  /**
   * PUT /projects/:projectId/members/:userId { role } → ProjectMember.
   * Project admin (owner) only; cannot downgrade themselves.
   */
  updateMemberRole: (projectId, userId, role) =>
    api.put(`/api/v1/projects/${projectId}/members/${userId}`, { role }),

  /**
   * DELETE /projects/:projectId/members/:userId → {}.
   * Project admin (owner) only; cannot remove themselves; keeps ≥1 admin.
   */
  removeMember: (projectId, userId) =>
    api.delete(`/api/v1/projects/${projectId}/members/${userId}`),

  /**
   * GET /projects/:projectId/dashboard
   * → { project, stats: { todo, in_progress, done, total }, memberCount, recentTasks }
   */
  dashboard: (projectId) => api.get(`/api/v1/projects/${projectId}/dashboard`),
};
