import { formatDate, statusLabel } from './format.js';

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCSV(value) {
  if (value === null || value === undefined) return '""';
  const stringVal = String(value);
  // Double-quote if contains quotes, commas, or newlines
  if (stringVal.includes('"') || stringVal.includes(',') || stringVal.includes('\n') || stringVal.includes('\r')) {
    return `"${stringVal.replace(/"/g, '""')}"`;
  }
  return `"${stringVal}"`;
}

/**
 * Export tasks array to a standard CSV file
 */
export function exportTasksToCSV(tasks = [], projectName = 'project') {
  const headers = [
    'Task ID',
    'Title',
    'Description',
    'Status',
    'Priority',
    'Assignee Name',
    'Assignee Email',
    'Due Date',
    'Subtasks Total',
    'Subtasks Done',
    'Created At',
    'Updated At',
  ];

  const rows = tasks.map((t) => {
    const assignee = t.assignedTo || {};
    const subTasks = t.subTasks || [];
    const subDone = subTasks.filter((s) => s.isCompleted).length;

    return [
      escapeCSV(t._id || ''),
      escapeCSV(t.title || ''),
      escapeCSV(t.description || ''),
      escapeCSV(statusLabel(t.status)),
      escapeCSV(t.priority || 'MEDIUM'),
      escapeCSV(assignee.fullName || assignee.username || 'Unassigned'),
      escapeCSV(assignee.email || ''),
      escapeCSV(t.dueDate ? formatDate(t.dueDate) : ''),
      escapeCSV(subTasks.length),
      escapeCSV(subDone),
      escapeCSV(t.createdAt ? new Date(t.createdAt).toISOString() : ''),
      escapeCSV(t.updatedAt ? new Date(t.updatedAt).toISOString() : ''),
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const safeName = projectName.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
  const filename = `${safeName}-tasks-${new Date().toISOString().slice(0, 10)}.csv`;

  triggerDownload(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Export complete project structure as formatted JSON
 */
export function exportProjectToJSON({ project = {}, tasks = [], members = [], notes = [], comments = [] }) {
  const exportPayload = {
    workpulseExportVersion: '1.0',
    exportedAt: new Date().toISOString(),
    project: {
      id: project._id,
      name: project.name,
      description: project.description || '',
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
    metrics: {
      totalTasks: tasks.length,
      doneTasks: tasks.filter((t) => t.status === 'done').length,
      totalMembers: members.length,
      totalNotes: notes.length,
      totalDiscussions: comments.length,
    },
    members: members.map((m) => ({
      id: m.user?._id || m._id,
      name: m.user?.fullName || m.user?.username,
      email: m.user?.email,
      role: m.role,
      joinedAt: m.createdAt,
    })),
    tasks: tasks.map((t) => ({
      id: t._id,
      title: t.title,
      description: t.description || '',
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      assignee: t.assignedTo ? {
        id: t.assignedTo._id,
        name: t.assignedTo.fullName || t.assignedTo.username,
        email: t.assignedTo.email,
      } : null,
      subtasks: (t.subTasks || []).map((st) => ({
        id: st._id,
        title: st.title,
        isCompleted: Boolean(st.isCompleted),
      })),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
    notes: notes.map((n) => ({
      id: n._id,
      title: n.title,
      content: n.content,
      isPinned: Boolean(n.isPinned),
      createdByName: n.createdByName,
      createdAt: n.createdAt,
    })),
  };

  const jsonContent = JSON.stringify(exportPayload, null, 2);
  const safeName = (project.name || 'project').toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
  const filename = `${safeName}-full-export-${new Date().toISOString().slice(0, 10)}.json`;

  triggerDownload(jsonContent, filename, 'application/json;charset=utf-8;');
}
