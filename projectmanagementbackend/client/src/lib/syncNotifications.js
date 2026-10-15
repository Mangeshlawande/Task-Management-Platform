import { projectsApi } from '../api/projects.js';
import { tasksApi } from '../api/tasks.js';
import { commentsApi } from '../api/comments.js';
import { formatDate, getDueDateStatus } from './format.js';
import { useNotificationStore } from '../stores/notificationStore.js';

/**
 * Polls or synchronizes notifications for the current authenticated user
 * across their accessible projects.
 */
export async function syncUserNotifications(currentUser) {
  if (!currentUser || !currentUser._id) return;

  try {
    const pList = await projectsApi.list();
    const projects = Array.isArray(pList) ? pList.map((p) => p.project) : [];
    if (projects.length === 0) return;

    const currentUserId = String(currentUser._id);
    const usernameTag = `@${(currentUser.username || '').toLowerCase()}`;

    const notifications = [];

    // Check recent tasks and comments for up to 5 most active projects
    const targetProjects = projects.slice(0, 5);

    await Promise.all(
      targetProjects.map(async (project) => {
        try {
          const [tasks, comments] = await Promise.all([
            tasksApi.list(project._id).catch(() => []),
            commentsApi.listProjectComments(project._id).catch(() => []),
          ]);

          // 1. Tasks assigned to current user
          (tasks || []).forEach((t) => {
            const assignedId = String(t.assignedTo?._id || t.assignedTo || '');
            if (assignedId === currentUserId) {
              const dueStatus = getDueDateStatus(t.dueDate, t.status);

              if (dueStatus?.isOverdue) {
                notifications.push({
                  id: `task_overdue_${t._id}`,
                  type: 'overdue',
                  title: 'Task overdue',
                  description: `"${t.title}" is overdue (was due on ${formatDate(t.dueDate)})`,
                  projectName: project.name,
                  link: `/projects/${project._id}/board`,
                  timestamp: t.dueDate || t.updatedAt || t.createdAt,
                });
              } else if (dueStatus?.isDueToday) {
                notifications.push({
                  id: `task_due_today_${t._id}`,
                  type: 'due_today',
                  title: 'Task due today',
                  description: `"${t.title}" is due today`,
                  projectName: project.name,
                  link: `/projects/${project._id}/board`,
                  timestamp: t.dueDate || t.updatedAt || t.createdAt,
                });
              }

              // Assignment notification (if not done and recent)
              if (t.status !== 'done') {
                notifications.push({
                  id: `task_assigned_${t._id}`,
                  type: 'assignment',
                  title: 'Assigned to you',
                  description: `"${t.title}" in ${project.name}`,
                  projectName: project.name,
                  link: `/projects/${project._id}/board`,
                  timestamp: t.createdAt,
                });
              }
            }
          });

          // 2. Comments with @mention or blocker status
          (comments || []).forEach((c) => {
            const authorId = String(c.author?._id || '');
            if (authorId === currentUserId) return; // ignore own comments

            const contentLower = (c.content || '').toLowerCase();
            const isMentioned = contentLower.includes(usernameTag);

            if (isMentioned) {
              notifications.push({
                id: `mention_${c._id}`,
                type: 'mention',
                title: `${c.author?.fullName || c.author?.username || 'Teammate'} mentioned you`,
                description: c.content,
                projectName: project.name,
                link: `/projects/${project._id}/discussions`,
                timestamp: c.createdAt,
              });
            } else if (c.category === 'blocker') {
              notifications.push({
                id: `blocker_${c._id}`,
                type: 'blocker',
                title: `Blocker reported in ${project.name}`,
                description: c.content,
                projectName: project.name,
                link: `/projects/${project._id}/discussions`,
                timestamp: c.createdAt,
              });
            }
          });
        } catch {
          // ignore single project failure
        }
      })
    );

    useNotificationStore.getState().syncNotifications(notifications);
  } catch {
    // network or auth error
  }
}
