/**
 * Node-level smoke of the mock API server (no browser needed).
 * Run: node client/src/lib/mock/mock-smoke.mjs
 */
import assert from 'node:assert/strict';

const { handleMockRequest } = await import(
  new URL('./mock-server.js', import.meta.url).href
);

let passed = 0;
const ok = (name) => {
  passed++;
  console.log(`  ✓ ${name}`);
};

const call = (method, path, body) => handleMockRequest(method, path, { body });

/* login guard */
try {
  await call('POST', '/api/v1/auth/login', { username: 'maya' });
  assert.fail('expected 400');
} catch (e) {
  assert.equal(e.status, 400);
  ok('login requires password');
}

try {
  await call('GET', '/api/v1/auth/me');
  assert.fail('expected 401');
} catch (e) {
  assert.equal(e.status, 401);
  assert.deepEqual(e.codes, ['INVALID_TOKEN']);
  ok('me without session → 401 INVALID_TOKEN');
}

/* login as maya (admin on Website Revamp, member on Mobile App MVP) */
const login = await call('POST', '/api/v1/auth/login', {
  username: 'maya',
  password: 'DemoPass123!',
});
assert.equal(login.statusCode, 200);
ok('login ok');

const me = await call('GET', '/api/v1/auth/me');
assert.equal(me.data.username, 'maya');
ok('me returns session user');

/* projects */
const projects = await call('GET', '/api/v1/projects');
assert.equal(projects.data.length, 2);
ok('maya sees 2 projects');

const website = projects.data.find((p) => p.project.name === 'Website Revamp').project;
const mobile = projects.data.find((p) => p.project.name === 'Mobile App MVP').project;
assert.equal(website.members, 4);
ok('member counts present');

/* tasks */
const tasks = await call('GET', `/api/v1/projects/${website._id}/tasks`);
assert.equal(tasks.data.length, 9);
const populated = tasks.data.filter((t) => t.assignedTo && t.assignedTo.username);
assert.ok(populated.length >= 8, `expected populated assignees, got ${populated.length}`);
assert.ok(tasks.data.some((t) => t.assignedTo === null), 'unassigned task present');
assert.ok(populated.some((t) => t.assignedTo.username === 'maya'), 'maya assigned to at least one task');
ok('tasks listed with populated assignee snapshots');

const one = tasks.data.find((t) => t.title === 'Implement responsive navigation');
const detail = await call('GET', `/api/v1/projects/${website._id}/tasks/${one._id}`);
assert.equal(detail.data.subTasks.length, 3);
ok('task detail carries subTasks');

/* subtask toggle (any member) */
const sub = detail.data.subTasks[1];
const toggled = await call(
  'PUT',
  `/api/v1/projects/${website._id}/tasks/${one._id}/subtasks/${sub._id}`,
  { isCompleted: true },
);
assert.equal(toggled.data.isCompleted, true);
ok('subtask toggled');

/* task create (admin role) via JSON */
const created = await call('POST', `/api/v1/projects/${website._id}/tasks`, {
  title: 'Smoke test task',
  priority: 'LOW',
  status: 'todo',
});
assert.equal(created.statusCode, 201);
ok('task created');

/* notes pagination mirrors backend: 15 notes → 2 pages @ limit 12 */
const page1 = await call('GET', `/api/v1/projects/${website._id}/notes?page=1&limit=12`);
assert.equal(page1.data.notes.length, 12);
assert.equal(page1.data.pagination.total, 15);
assert.equal(page1.data.pagination.totalPages, 2);
assert.equal(page1.data.notes[0].isPinned, true);
ok('notes page 1: 12 rows, pinned first, 15 total / 2 pages');

const page2 = await call('GET', `/api/v1/projects/${website._id}/notes?page=2&limit=12`);
assert.equal(page2.data.notes.length, 3);
ok('notes page 2: remaining 3 rows');

/* note CRUD */
const note = await call('POST', `/api/v1/projects/${website._id}/notes`, {
  content: 'Smoke note',
});
assert.equal(note.statusCode, 201);
const patched = await call(
  'PUT',
  `/api/v1/projects/${website._id}/notes/${note.data._id}`,
  { isPinned: true },
);
assert.equal(patched.data.isPinned, true);
ok('note create + pin');

/* dashboard */
const dash = await call('GET', `/api/v1/projects/${website._id}/dashboard`);
assert.deepEqual(dash.data.stats, { todo: 5, in_progress: 3, done: 2, total: 10 });
assert.equal(dash.data.memberCount, 4);
ok('dashboard stats + memberCount');

/* role gating: maya is a plain member on Mobile App MVP */
try {
  await call('POST', `/api/v1/projects/${mobile._id}/notes`, { content: 'nope' });
  assert.fail('expected 403');
} catch (e) {
  assert.equal(e.status, 403);
  ok('member cannot create notes on a project they do not administer');
}

/* logout kills the session */
await call('POST', '/api/v1/auth/logout');
try {
  await call('GET', '/api/v1/auth/me');
  assert.fail('expected 401 after logout');
} catch (e) {
  assert.equal(e.status, 401);
  ok('logout clears the session');
}

console.log(`\n  RESULT: ${passed} passed\n`);
