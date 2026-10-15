/**
 * Activity Feed & Audit Service
 *
 * Compiles and standardizes chronological activity events from tasks, notes,
 * discussions, and member updates across projects.
 */

export function buildProjectActivities({ tasks = [], notes = [], comments = [], members = [], project = {} }) {
  const events = [];
  const projectName = project.name || '';
  const projectId = project._id || '';

  // 1. Task Events
  tasks.forEach((t) => {
    const actor = t.assignedBy || t.assignedTo || { fullName: 'Team member', username: 'member' };
    const taskTitle = t.title || 'Untitled task';
    const taskLink = projectId ? `/projects/${projectId}/board` : '/projects';

    // Creation
    if (t.createdAt) {
      events.push({
        id: `task_created_${t._id}`,
        type: 'task',
        action: 'created task',
        target: taskTitle,
        actor,
        badge: t.priority,
        badgeTone: t.priority === 'HIGH' ? 'danger' : t.priority === 'MEDIUM' ? 'warning' : 'neutral',
        timestamp: t.createdAt,
        projectName,
        link: taskLink,
        status: t.status,
      });
    }

    // Status or progress update (if updated at least 1 minute after creation)
    if (t.updatedAt && t.createdAt && new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime() > 60000) {
      events.push({
        id: `task_updated_${t._id}`,
        type: 'task_status',
        action: t.status === 'done' ? 'completed task' : 'updated task',
        target: taskTitle,
        actor: t.assignedTo || actor,
        badge: t.status === 'done' ? 'Done' : t.status === 'in_progress' ? 'In Progress' : 'To Do',
        badgeTone: t.status === 'done' ? 'success' : t.status === 'in_progress' ? 'primary' : 'neutral',
        timestamp: t.updatedAt,
        projectName,
        link: taskLink,
        status: t.status,
      });
    }
  });

  // 2. Discussion / Comment Events
  comments.forEach((c) => {
    const author = c.author || { fullName: 'Team member', username: 'member' };
    const taskTitle = c.task?.title;
    const cat = c.category || 'general';

    let action = 'shared a perspective';
    let badge = 'Discussion';
    let badgeTone = 'primary';

    if (cat === 'idea') {
      action = 'shared an idea';
      badge = 'Idea';
      badgeTone = 'purple';
    } else if (cat === 'blocker') {
      action = 'reported a blocker';
      badge = 'Blocker';
      badgeTone = 'danger';
    } else if (cat === 'update') {
      action = 'posted a project update';
      badge = 'Update';
      badgeTone = 'success';
    } else if (cat === 'question') {
      action = 'asked a question';
      badge = 'Question';
      badgeTone = 'warning';
    }

    events.push({
      id: `comment_${c._id}`,
      type: 'comment',
      action,
      target: taskTitle ? `on "${taskTitle}"` : (c.content?.slice(0, 50) + (c.content?.length > 50 ? '…' : '')),
      actor: author,
      badge,
      badgeTone,
      timestamp: c.createdAt,
      projectName,
      link: projectId ? `/projects/${projectId}/discussions` : '/projects',
    });
  });

  // 3. Notes Events
  notes.forEach((n) => {
    const actor = {
      fullName: n.createdByName || 'Team member',
      username: n.createdByName || 'member',
    };
    events.push({
      id: `note_${n._id}`,
      type: 'note',
      action: n.isPinned ? 'pinned note' : 'created note',
      target: n.title || 'Untitled note',
      actor,
      badge: n.isPinned ? 'Pinned' : 'Note',
      badgeTone: n.isPinned ? 'warning' : 'neutral',
      timestamp: n.createdAt,
      projectName,
      link: projectId ? `/projects/${projectId}/notes` : '/notes',
    });
  });

  // 4. Member Events
  members.forEach((m) => {
    const user = m.user || {};
    if (m.createdAt) {
      events.push({
        id: `member_${m._id || user._id}`,
        type: 'member',
        action: 'joined project as',
        target: m.role === 'admin' ? 'Project Admin' : m.role === 'project_admin' ? 'Project Admin' : 'Member',
        actor: user,
        badge: m.role || 'member',
        badgeTone: 'neutral',
        timestamp: m.createdAt,
        projectName,
        link: projectId ? `/projects/${projectId}/members` : '/members',
      });
    }
  });

  // Sort descending by timestamp (newest first)
  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return events;
}
