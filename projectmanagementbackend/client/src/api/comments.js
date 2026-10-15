import { api } from './client.js';

/**
 * Project-Level Discussions & Comments API
 * Allows any project member to view, post, and engage in open project discussions,
 * share viewpoints/ideas/blockers, and collaborate outside rigid task assignments.
 */
export const commentsApi = {
  /** GET /api/v1/projects/:projectId/comments → Comment[] */
  listProjectComments: (projectId) =>
    api.get(`/api/v1/projects/${projectId}/comments`),

  /**
   * POST /api/v1/projects/:projectId/comments
   * body: { content, category?, taskId? }
   */
  addProjectComment: (projectId, data) => {
    const payload = typeof data === 'string' ? { content: data } : data;
    return api.post(`/api/v1/projects/${projectId}/comments`, payload);
  },

  /** DELETE /api/v1/projects/:projectId/comments/:commentId */
  deleteProjectComment: (projectId, commentId) =>
    api.delete(`/api/v1/projects/${projectId}/comments/${commentId}`),
};
