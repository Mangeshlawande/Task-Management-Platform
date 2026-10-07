/*
 * Mock API server — serves the docs/03-api-contract.md surface from the
 * in-memory database in mock-data.js. Activated with VITE_USE_MOCK_API=true
 * (see api/client.js, which routes every request through handleMockRequest
 * instead of fetch).
 *
 * Rules of engagement:
 *  - Responses use the same envelope { statusCode, success, message, data }
 *    and error shape { message, errors } as the real backend, so feature code
 *    cannot tell the difference.
 *  - Errors are thrown as { status, message, fieldErrors } and converted to
 *    ApiError by api/client.js — identical to a non-2xx fetch response.
 *  - Latency (~150ms ± 120ms) simulates a real network so loading states and
 *    skeletons render.
 *  - Mutations update the in-memory database; persistence is session-only.
 *
 * Covered endpoints (docs/03 + routes/*):
 *  auth:      login, logout, me, change-password
 *  projects:  list, create, get, update, delete
 *  members:   list, add (upsert), update role, remove
 *  tasks:     list, get (with subTasks), update, delete
 *  subtasks:  create, update (toggle/rename), delete
 *  notes:     list (paginated, pinned-first), create, update, delete
 *  dashboard: stats + memberCount + recentTasks
 *
 * Not mocked (deliberately): register/verify-email (OTP mail), forgot/reset
 * password, refresh-token (sessions never expire here), attachments upload.
 */
import { createMockDatabase, DEMO_PASSWORD } from './mock-data.js';
import { ApiError } from '../../api/errors.js';

const db = createMockDatabase();

export { db as mockDatabase, DEMO_PASSWORD as MOCK_DEMO_PASSWORD };

/* =========================================================
   ENVELOPE + ERROR HELPERS
========================================================= */

const ok = (statusCode, data, message) => ({
  statusCode,
  success: true,
  message,
  data,
});

/** Raised by handlers; api/client.js rethrows ApiError as-is. */
const fail = (status, message, fieldErrors) => {
  throw new ApiError(status, message, fieldErrors);
};

/** Array of error codes (INVALID_TOKEN, EMAIL_NOT_VERIFIED…) — the backend
 *  sends these as the `errors` array; ApiError carries them on `.codes`. */
const failWithCodes = (status, message, codes) => {
  const error = new ApiError(status, message);
  error.codes = codes;
  throw error;
};

/* =========================================================
   SMALL UTILITIES
========================================================= */

const now = () => new Date().toISOString();

const requireAuth = () => {
  if (!db.session) {
    failWithCodes(401, 'Unauthorized request', ['INVALID_TOKEN']);
  }
  return db.users.find((u) => u._id === db.session.userId);
};

const requireProject = (projectId) => {
  const project = db.projects.find((p) => p._id === projectId);
  if (!project) fail(404, 'Project not found');
  return project;
};

/** Membership scoping — the client can only see projects it belongs to. */
const requireMember = (user, projectId) => {
  requireProject(projectId);
  const role = db.memberOf(user._id, projectId);
  if (!role) fail(404, 'Project not found');
  return role;
};

const isAdminRole = (role) => role === 'admin' || role === 'project_admin';

const publicUser = (u) => ({
  _id: u._id,
  username: u.username,
  fullName: u.fullName,
  email: u.email,
  avatar: u.avatar,
  role: u.role,
  isEmailVerified: u.isEmailVerified,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
  id: u._id,
});

const subtaskView = (s) => ({
  _id: s._id,
  title: s.title,
  task: s.task,
  isCompleted: s.isCompleted,
  completedAt: s.completedAt,
  createdBy: s.createdBySnapshot ?? { _id: s.createdBy },
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
});

/** Sort helpers matching the backend exactly. */
const byNewestFirst = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
const byPinnedFirst = (a, b) =>
  (b.isPinned === true) - (a.isPinned === true) ||
  new Date(b.createdAt) - new Date(a.createdAt);

const findTask = (projectId, taskId) => {
  const task = db.tasks.find((t) => t._id === taskId && t.project === projectId);
  if (!task) fail(404, 'Task not found in this project');
  return task;
};

const findSubtask = (projectId, taskId, subTaskId) => {
  const sub = db.subtasks.find((s) => s._id === subTaskId && s.task === taskId);
  if (!sub) fail(404, 'Subtask not found');
  findTask(projectId, taskId);
  return sub;
};

const findNote = (projectId, noteId) => {
  const note = db.notes.find((n) => n._id === noteId && n.project === projectId);
  if (!note) fail(404, 'Project note not found');
  return note;
};

/* =========================================================
   ROUTE TABLE
========================================================= */

const routes = [];
const route = (method, pattern, handler) => {
  // ':name' segments capture one path part.
  const keys = [];
  const regex = new RegExp(
    '^' +
      pattern.replace(/:[A-Za-z]+/g, (m) => {
        keys.push(m.slice(1));
        return '([^/]+)';
      }) +
      '$',
  );
  routes.push({ method, regex, keys, handler });
};

const dispatch = (method, path, { body } = {}) => {
  const clean = path.split('?')[0];
  for (const r of routes) {
    if (r.method !== method) continue;
    const match = r.regex.exec(clean);
    if (match) {
      const params = {};
      r.keys.forEach((k, i) => (params[k] = match[i + 1]));
      return r.handler({ params, path, body });
    }
  }
  fail(404, `Mock API has no route for ${method} ${clean}`);
};

/* =========================================================
   AUTH
========================================================= */

route('POST', '/api/v1/auth/login', ({ body }) => {
  const { email, username, password } = body ?? {};
  if ((!email && !username) || !password) {
    fail(400, 'Email/Username and password are required');
  }
  const identifier = String(email || username).toLowerCase();
  const user = db.users.find(
    (u) => u.email === identifier || u.username === identifier,
  );
  if (!user) fail(404, 'User not found');
  if (user.password !== password) fail(401, 'Invalid credentials');
  if (user.isEmailVerified === false) {
    failWithCodes(403, 'Please verify your email address before logging in', [
      'EMAIL_NOT_VERIFIED',
    ]);
  }
  db.session = { userId: user._id };
  return ok(200, { user: publicUser(user), accessToken: 'mock-access', refreshToken: 'mock-refresh' }, 'User logged in successfully');
});

route('POST', '/api/v1/auth/logout', () => {
  db.session = null;
  return ok(200, {}, 'User logged out successfully');
});

route('GET', '/api/v1/auth/me', () => {
  const user = requireAuth();
  return ok(200, publicUser(user), 'Current user fetched successfully');
});

route('POST', '/api/v1/auth/change-password', ({ body }) => {
  const user = requireAuth();
  const { oldPassword, newPassword } = body ?? {};
  if (!oldPassword || !newPassword) {
    fail(400, 'Old password and new password are required');
  }
  if (user.password !== oldPassword) fail(401, 'Invalid old password');
  user.password = newPassword;
  user.updatedAt = now();
  // Backend revokes sessions on password change — mirror that.
  db.session = null;
  return ok(200, {}, 'Password changed successfully');
});

/* =========================================================
   PROJECTS
========================================================= */

route('GET', '/api/v1/projects', () => {
  const user = requireAuth();
  const list = db.members
    .filter((m) => m.user === user._id)
    .map((m) => {
      const project = db.projects.find((p) => p._id === m.project);
      return {
        role: m.role,
        project: {
          _id: project._id,
          name: project.name,
          description: project.description,
          createdBy: project.createdBy,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          members: db.members.filter((x) => x.project === project._id).length,
        },
      };
    });
  return ok(200, list, 'Projects fetched successfully');
});

route('POST', '/api/v1/projects', ({ body }) => {
  const user = requireAuth();
  const name = (body?.name ?? '').trim();
  if (!name) fail(400, 'Project name is required');
  if (name.length < 3 || name.length > 100) {
    fail(400, 'Project name must be between 3 and 100 characters', {
      name: ['Project name must be between 3 and 100 characters'],
    });
  }
  if (db.projects.some((p) => p.name === name && p.createdBy === user._id)) {
    fail(409, 'Project with this name already exists');
  }
  const project = {
    _id: `P${String(db.projects.length + 1).padStart(4, '0')}-${now()}`,
    name,
    description: (body?.description ?? '').trim(),
    createdBy: user._id,
    createdAt: now(),
    updatedAt: now(),
  };
  db.projects.push(project);
  db.members.push({
    _id: `M${now()}`,
    project: project._id,
    user: user._id,
    role: 'admin',
    userSnapshot: {
      _id: user._id, username: user.username, fullName: user.fullName,
      email: user.email, avatar: user.avatar,
    },
    createdAt: now(),
  });
  return ok(201, project, 'Project created successfully');
});

route('GET', '/api/v1/projects/:projectId', ({ params }) => {
  const user = requireAuth();
  requireMember(user, params.projectId);
  const project = requireProject(params.projectId);
  return ok(
    200,
    {
      _id: project._id,
      name: project.name,
      description: project.description,
      createdBy: project.createdBy,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
    'Project fetched successfully',
  );
});

route('PUT', '/api/v1/projects/:projectId', ({ params, body }) => {
  const user = requireAuth();
  const role = requireMember(user, params.projectId);
  if (!isAdminRole(role)) fail(403, 'Not allowed to update this project');
  const project = requireProject(params.projectId);
  if (body?.name !== undefined) {
    const name = body.name.trim();
    if (!name) fail(400, 'Project name is required');
    if (
      db.projects.some(
        (p) => p.name === name && p.createdBy === project.createdBy && p._id !== project._id,
      )
    ) {
      fail(409, 'Project name already exists');
    }
    project.name = name;
  }
  if (body?.description !== undefined) {
    project.description = body.description.trim();
  }
  project.updatedAt = now();
  return ok(200, project, 'Project updated successfully');
});

route('DELETE', '/api/v1/projects/:projectId', ({ params }) => {
  const user = requireAuth();
  const role = requireMember(user, params.projectId);
  if (role !== 'admin') fail(403, 'Only the project admin can delete this project');
  const pid = params.projectId;
  const taskIds = db.tasks.filter((t) => t.project === pid).map((t) => t._id);
  db.subtasks = db.subtasks.filter((s) => !taskIds.includes(s.task));
  db.tasks = db.tasks.filter((t) => t.project !== pid);
  db.notes = db.notes.filter((n) => n.project !== pid);
  db.members = db.members.filter((m) => m.project !== pid);
  db.projects = db.projects.filter((p) => p._id !== pid);
  return ok(200, {}, 'Project deleted successfully');
});

/* =========================================================
   MEMBERS
========================================================= */

route('GET', '/api/v1/projects/:projectId/members', ({ params }) => {
  const user = requireAuth();
  requireMember(user, params.projectId);
  const members = db.members
    .filter((m) => m.project === params.projectId)
    .map((m) => ({
      _id: m._id,
      role: m.role,
      user: m.userSnapshot,
      createdAt: m.createdAt,
    }));
  return ok(200, members, 'Project members fetched successfully');
});

route('POST', '/api/v1/projects/:projectId/members', ({ params, body }) => {
  const user = requireAuth();
  const role = requireMember(user, params.projectId);
  if (!isAdminRole(role)) fail(403, 'Not allowed to manage members');
  const { email, role: newRole } = body ?? {};
  if (!email) fail(400, 'User email is required');
  if (!['project_admin', 'member'].includes(newRole)) {
    fail(400, "Invalid role. Use 'project_admin' or 'member'");
  }
  const target = db.users.find((u) => u.email === String(email).toLowerCase().trim());
  if (!target) fail(404, 'User not found');
  const existing = db.members.find(
    (m) => m.project === params.projectId && m.user === target._id,
  );
  if (existing) {
    existing.role = newRole;
    return ok(200, { projectMember: existing }, 'Member added successfully');
  }
  const member = {
    _id: `M${now()}`,
    project: params.projectId,
    user: target._id,
    role: newRole,
    userSnapshot: {
      _id: target._id, username: target.username, fullName: target.fullName,
      email: target.email, avatar: target.avatar,
    },
    createdAt: now(),
  };
  db.members.push(member);
  return ok(200, { projectMember: member }, 'Member added successfully');
});

route('PUT', '/api/v1/projects/:projectId/members/:userId', ({ params, body }) => {
  const user = requireAuth();
  const role = requireMember(user, params.projectId);
  if (!isAdminRole(role)) fail(403, 'Not allowed to manage members');
  const member = db.members.find(
    (m) => m.project === params.projectId && m.user === params.userId,
  );
  if (!member) fail(404, 'Project member not found');
  if (!['admin', 'project_admin', 'member'].includes(body?.role)) {
    fail(400, 'Invalid role');
  }
  if (params.userId === user._id && body.role !== 'admin') {
    fail(400, 'Admin cannot downgrade themselves');
  }
  member.role = body.role;
  return ok(200, member, 'Role updated successfully');
});

route('DELETE', '/api/v1/projects/:projectId/members/:userId', ({ params }) => {
  const user = requireAuth();
  const role = requireMember(user, params.projectId);
  if (!isAdminRole(role)) fail(403, 'Not allowed to manage members');
  if (params.userId === user._id) fail(400, 'Admin cannot remove themselves');
  const member = db.members.find(
    (m) => m.project === params.projectId && m.user === params.userId,
  );
  if (!member) fail(404, 'Project member not found');
  if (member.role === 'admin') {
    const admins = db.members.filter(
      (m) => m.project === params.projectId && m.role === 'admin',
    );
    if (admins.length === 1) fail(400, 'Project must have at least one admin');
  }
  db.members = db.members.filter((m) => m !== member);
  return ok(200, {}, 'Member removed successfully');
});

/* =========================================================
   TASKS
========================================================= */

const taskListRow = (t) => ({
  ...t,
  assignedTo: t.assignedToSnapshot,
  assignedBy: db.users.find((u) => u._id === t.assignedBy)
    ? {
        _id: t.assignedBy,
        username: db.users.find((u) => u._id === t.assignedBy).username,
        fullName: db.users.find((u) => u._id === t.assignedBy).fullName,
        avatar: db.users.find((u) => u._id === t.assignedBy).avatar,
      }
    : null,
});

route('GET', '/api/v1/projects/:projectId/tasks', ({ params }) => {
  const user = requireAuth();
  requireMember(user, params.projectId);
  const tasks = db.tasks
    .filter((t) => t.project === params.projectId)
    .sort(byNewestFirst)
    .map(taskListRow);
  return ok(200, tasks, 'Tasks fetched successfully');
});

route('GET', '/api/v1/projects/:projectId/tasks/:taskId', ({ params }) => {
  const user = requireAuth();
  requireMember(user, params.projectId);
  const task = findTask(params.projectId, params.taskId);
  const detail = {
    ...taskListRow(task),
    subTasks: db.subtasks
      .filter((s) => s.task === task._id)
      .sort(byNewestFirst)
      .map(subtaskView),
  };
  return ok(200, detail, 'Task fetched successfully');
});

/**
 * POST /tasks — the real API takes multipart/form-data. The mock accepts the
 * same FormData (fields decoded, image files kept as blob: object URLs so the
 * detail modal can still preview them) as well as plain JSON.
 */
route('POST', '/api/v1/projects/:projectId/tasks', ({ params, body }) => {
  const user = requireAuth();
  const role = requireMember(user, params.projectId);
  if (!isAdminRole(role)) fail(403, 'Not allowed to create tasks in this project');

  let payload = body ?? {};
  const attachments = [];
  if (typeof FormData !== 'undefined' && payload instanceof FormData) {
    const fields = {};
    for (const [key, value] of payload.entries()) {
      if (typeof File !== 'undefined' && value instanceof File) {
        attachments.push({
          url: URL.createObjectURL(value),
          localPath: value.name,
          mimeType: value.type,
          size: value.size,
        });
        continue;
      }
      fields[key] = value;
    }
    payload = fields;
  }

  const title = String(payload.title ?? '').trim();
  if (!title) fail(400, 'Task title is required');
  const status = payload.status || 'todo';
  if (!['todo', 'in_progress', 'done'].includes(status)) fail(400, 'Invalid task status');
  const priority = payload.priority || 'MEDIUM';
  if (!['LOW', 'MEDIUM', 'HIGH'].includes(priority)) fail(400, 'Invalid priority');

  let assignee = null;
  if (payload.assignedTo) {
    const member = db.members.find(
      (m) => m.project === params.projectId && m.user === payload.assignedTo,
    );
    if (!member) fail(400, 'Assigned user is not a project member');
    assignee = member;
  }

  const task = {
    _id: `T${now()}`,
    title,
    description: String(payload.description ?? '').trim(),
    project: params.projectId,
    assignedTo: assignee?.user ?? null,
    assignedToSnapshot: assignee?.userSnapshot ?? null,
    assignedBy: user._id,
    status,
    priority,
    dueDate: payload.dueDate || null,
    attachments,
    createdAt: now(),
    updatedAt: now(),
  };
  db.tasks.push(task);
  return ok(201, taskListRow(task), 'Task created successfully');
});

route('PUT', '/api/v1/projects/:projectId/tasks/:taskId', ({ params, body }) => {
  const user = requireAuth();
  const role = requireMember(user, params.projectId);
  const task = findTask(params.projectId, params.taskId);
  // Backend guard: task owner (assignedBy) or project admin.
  if (task.assignedBy !== user._id && !isAdminRole(role)) {
    fail(403, 'Not allowed to update this task');
  }
  const patch = body ?? {};
  if (patch.title !== undefined) {
    if (!patch.title.trim()) fail(400, 'Title cannot be empty');
    task.title = patch.title.trim();
  }
  if (patch.description !== undefined) task.description = patch.description.trim();
  if (patch.status !== undefined) {
    if (!['todo', 'in_progress', 'done'].includes(patch.status)) {
      fail(400, 'Invalid task status');
    }
    task.status = patch.status;
  }
  if (patch.priority !== undefined) {
    if (!['LOW', 'MEDIUM', 'HIGH'].includes(patch.priority)) {
      fail(400, 'Invalid priority');
    }
    task.priority = patch.priority;
  }
  if (patch.assignedTo !== undefined) {
    if (patch.assignedTo === null || patch.assignedTo === '') {
      task.assignedTo = null;
      task.assignedToSnapshot = null;
    } else {
      const member = db.members.find(
        (m) => m.project === params.projectId && m.user === patch.assignedTo,
      );
      if (!member) fail(400, 'Assigned user is not a project member');
      task.assignedTo = member.user;
      task.assignedToSnapshot = member.userSnapshot;
    }
  }
  if (patch.dueDate !== undefined) task.dueDate = patch.dueDate;
  task.updatedAt = now();
  return ok(200, task, 'Task updated successfully');
});

route('DELETE', '/api/v1/projects/:projectId/tasks/:taskId', ({ params }) => {
  const user = requireAuth();
  const role = requireMember(user, params.projectId);
  const task = findTask(params.projectId, params.taskId);
  if (task.assignedBy !== user._id && !isAdminRole(role)) {
    fail(403, 'Not allowed to delete this task');
  }
  db.subtasks = db.subtasks.filter((s) => s.task !== task._id);
  db.tasks = db.tasks.filter((t) => t._id !== task._id);
  return ok(200, {}, 'Task deleted successfully');
});

/* =========================================================
   SUBTASKS
========================================================= */

route('POST', '/api/v1/projects/:projectId/tasks/:taskId/subtasks', ({ params, body }) => {
  const user = requireAuth();
  requireMember(user, params.projectId);
  findTask(params.projectId, params.taskId);
  const title = (body?.title ?? '').trim();
  if (!title) fail(400, 'Subtask title is required');
  const sub = {
    _id: `S${now()}`,
    title,
    task: params.taskId,
    isCompleted: false,
    completedAt: null,
    createdBy: user._id,
    createdBySnapshot: {
      _id: user._id, username: user.username, fullName: user.fullName,
      avatar: user.avatar,
    },
    createdAt: now(),
    updatedAt: now(),
  };
  db.subtasks.push(sub);
  return ok(201, subtaskView(sub), 'Subtask created successfully');
});

route('PUT', '/api/v1/projects/:projectId/tasks/:taskId/subtasks/:subTaskId', ({ params, body }) => {
  const user = requireAuth();
  const role = requireMember(user, params.projectId);
  const sub = findSubtask(params.projectId, params.taskId, params.subTaskId);
  const task = findTask(params.projectId, params.taskId);

  // docs/03 matrix: any member may toggle; rename needs creator/owner/admin.
  const canRename =
    sub.createdBy === user._id || task.assignedBy === user._id || isAdminRole(role);
  if (body?.title !== undefined && !canRename) {
    fail(403, 'Not allowed to rename this subtask');
  }
  if (body?.title !== undefined) {
    if (!body.title.trim()) fail(400, 'Title cannot be empty');
    sub.title = body.title.trim();
  }
  if (body?.isCompleted !== undefined) {
    if (typeof body.isCompleted !== 'boolean') {
      fail(400, 'isCompleted must be boolean');
    }
    sub.isCompleted = body.isCompleted;
    sub.completedAt = body.isCompleted ? now() : null;
  }
  sub.updatedAt = now();
  return ok(200, subtaskView(sub), 'Subtask updated successfully');
});

route('DELETE', '/api/v1/projects/:projectId/tasks/:taskId/subtasks/:subTaskId', ({ params }) => {
  const user = requireAuth();
  const role = requireMember(user, params.projectId);
  const sub = findSubtask(params.projectId, params.taskId, params.subTaskId);
  const task = findTask(params.projectId, params.taskId);
  const canDelete =
    sub.createdBy === user._id || task.assignedBy === user._id || isAdminRole(role);
  if (!canDelete) fail(403, 'Not allowed to delete this subtask');
  db.subtasks = db.subtasks.filter((s) => s._id !== sub._id);
  return ok(200, {}, 'Subtask deleted successfully');
});

/* =========================================================
   NOTES
========================================================= */

const noteView = (n) => ({
  _id: n._id,
  project: n.project,
  content: n.content,
  isPinned: n.isPinned,
  editedAt: n.editedAt,
  createdBy: n.createdBySnapshot,
  createdAt: n.createdAt,
  updatedAt: n.updatedAt,
});

route('GET', '/api/v1/projects/:projectId/notes', ({ params, path }) => {
  const user = requireAuth();
  requireMember(user, params.projectId);
  const query = new URLSearchParams(path.split('?')[1] ?? '');
  const page = Math.max(parseInt(query.get('page')) || 1, 1);
  const limit = Math.min(parseInt(query.get('limit')) || 10, 50);
  const all = db.notes
    .filter((n) => n.project === params.projectId)
    .sort(byPinnedFirst);
  const start = (page - 1) * limit;
  return ok(
    200,
    {
      notes: all.slice(start, start + limit).map(noteView),
      pagination: {
        total: all.length,
        page,
        limit,
        totalPages: Math.ceil(all.length / limit),
      },
    },
    'Project notes fetched successfully',
  );
});

route('POST', '/api/v1/projects/:projectId/notes', ({ params, body }) => {
  const user = requireAuth();
  const role = requireMember(user, params.projectId);
  // Backend: note creation is admin / project_admin only.
  if (!isAdminRole(role)) {
    fail(403, 'You are not allowed to create notes in this project');
  }
  const content = (body?.content ?? '').trim();
  if (!content) fail(400, 'Content is required');
  const note = {
    _id: `N${now()}`,
    project: params.projectId,
    createdBy: user._id,
    createdBySnapshot: {
      _id: user._id, username: user.username, fullName: user.fullName,
      email: user.email, avatar: user.avatar,
    },
    content,
    isPinned: false,
    editedAt: null,
    createdAt: now(),
    updatedAt: now(),
  };
  db.notes.push(note);
  return ok(201, noteView(note), 'Project note created successfully');
});

route('PUT', '/api/v1/projects/:projectId/notes/:noteId', ({ params, body }) => {
  const user = requireAuth();
  const role = requireMember(user, params.projectId);
  const note = findNote(params.projectId, params.noteId);
  if (note.createdBy !== user._id && !isAdminRole(role)) {
    fail(403, 'You are not allowed to update this note');
  }
  if (body?.content !== undefined) {
    if (!body.content.trim()) fail(400, 'Content cannot be empty');
    note.content = body.content.trim();
    note.editedAt = now(); // backend stamps this in a pre-save hook
  }
  if (typeof body?.isPinned === 'boolean') note.isPinned = body.isPinned;
  note.updatedAt = now();
  return ok(200, noteView(note), 'Project note updated successfully');
});

route('DELETE', '/api/v1/projects/:projectId/notes/:noteId', ({ params }) => {
  const user = requireAuth();
  const role = requireMember(user, params.projectId);
  const note = findNote(params.projectId, params.noteId);
  if (note.createdBy !== user._id && !isAdminRole(role)) {
    fail(403, 'You are not allowed to delete this note');
  }
  db.notes = db.notes.filter((n) => n._id !== note._id);
  return ok(200, {}, 'Project note deleted successfully');
});

/* =========================================================
   DASHBOARD
========================================================= */

route('GET', '/api/v1/projects/:projectId/dashboard', ({ params }) => {
  const user = requireAuth();
  requireMember(user, params.projectId);
  const project = requireProject(params.projectId);
  const tasks = db.tasks.filter((t) => t.project === params.projectId);
  const stats = {
    todo: tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
    total: tasks.length,
  };
  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5)
    .map(taskListRow);
  return ok(
    200,
    {
      project: { _id: project._id, name: project.name },
      stats,
      memberCount: db.members.filter((m) => m.project === params.projectId).length,
      recentTasks,
    },
    'Dashboard data fetched successfully',
  );
});

/* =========================================================
   ENTRY POINT — called by api/client.js instead of fetch
========================================================= */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const LATENCY_ENABLED = true;

/**
 * @param {string} method HTTP verb
 * @param {string} path   API path incl. query string
 * @param {{body?: object}} options
 * @returns {Promise<object>} the unwrappable envelope body
 */
export async function handleMockRequest(method, path, { body } = {}) {
  // Simulated network latency so loading/skeleton states are visible.
  if (LATENCY_ENABLED) {
    await sleep(90 + Math.random() * 180);
  }

  return dispatch(method, path, { body });
}
