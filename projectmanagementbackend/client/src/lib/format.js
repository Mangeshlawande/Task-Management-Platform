/** Display helpers shared across features (docs/02 § lib/). */

const ROLE_LABELS = {
  admin: 'Admin',
  project_admin: 'Project admin',
  member: 'Member',
};

export const roleLabel = (role) => ROLE_LABELS[role] ?? role;

export const roleBadgeVariant = (role) =>
  ({ admin: 'primary', project_admin: 'warning', member: 'neutral' }[role] ?? 'neutral');

/** 1 → '1 member', 4 → '4 members'. */
export const memberCountLabel = (count) =>
  `${count ?? 0} member${count === 1 ? '' : 's'}`;

const DATE_FORMAT = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

/** ISO string → 'Sep 29, 2026'. Returns '' for missing/invalid input. */
export const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : DATE_FORMAT.format(date);
};

/** ISO string → 'just now' | '5m ago' | '3h ago' | '2d ago' | 'Sep 12'. */
export const fromNow = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return DATE_FORMAT.format(date);
};

/**
 * Role gates (P2.5). The permission matrix (docs/03) — 'admin' here is the
 * project-level admin role the creator gets, not the global system role.
 */
export const canManageProject = (role) => role === 'admin';

/** Tasks/notes/subtask creation + member invites: creator-admin or project_admin. */
export const canManageContent = (role) => role === 'admin' || role === 'project_admin';

/** Any member can view everything and toggle subtask completion. */
export const canView = (role) =>
  role === 'admin' || role === 'project_admin' || role === 'member';

/** Task priority → Badge variant. */
export const priorityBadgeVariant = (priority) =>
  ({ HIGH: 'danger', MEDIUM: 'warning', LOW: 'neutral' }[priority] ?? 'neutral');

/** Task status → Badge variant (columns use their own dot colors). */
export const statusBadgeVariant = (status) =>
  ({ done: 'success', in_progress: 'primary', todo: 'neutral' }[status] ?? 'neutral');

/** Task status → display label. */
export const statusLabel = (status) =>
  ({ todo: 'To do', in_progress: 'In progress', done: 'Done' }[status] ?? status);
