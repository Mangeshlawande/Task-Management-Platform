/*
 * Mock database — mirrors `src/seed/seed.js` (backend) so both dummy data
 * modes tell the same story: identical personas, project structure, task
 * spread and even note wording. The dataset is rebuilt in-memory on reload.
 *
 * The server (mock-server.js) is the only writer; this module just builds it.
 */

/** Sequential ids stay stable within a session and sort lexically. */
let seq = 0;
const id = (prefix) => `${prefix}${String(++seq).padStart(4, '0')}`;

const iso = (t) => new Date(t).toISOString();

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** A timestamp `days` in the past (+ optional extra hours). */
const ago = (days, hours = 0) => iso(Date.now() - days * DAY - hours * HOUR);
/** A timestamp `days` into the future — used for due dates. */
const ahead = (days) => iso(Date.now() + days * DAY);

export const DEMO_PASSWORD = 'DemoPass123!';

/**
 * Build the whole demo database. Kept as a factory so `useUiDemo()` (see
 * mock/useUiDemo.js) can reset everything without a page reload.
 */
export function createMockDatabase() {
  const db = {
    users: [],
    projects: [],
    members: [],
    tasks: [],
    subtasks: [],
    notes: [],
    /** null | { userId } — the mock "cookie jar" */
    session: null,
  };

  /* ---------------------------------------------------------- users */
  const password = DEMO_PASSWORD; // demo only — everything is inspectable here
  db.users.push(
    {
      _id: id('U'), username: 'campadmin', email: 'admin@projectcamp.dev',
      fullName: 'Camp Admin', password, role: 'admin', isEmailVerified: true,
      avatar: { url: 'https://placehold.co/150x150', localPath: '' },
      createdAt: ago(40), refreshToken: null,
    },
    {
      _id: id('U'), username: 'maya', email: 'maya@projectcamp.dev',
      fullName: 'Maya Sharma', password, role: 'member', isEmailVerified: true,
      avatar: { url: 'https://placehold.co/150x150', localPath: '' },
      createdAt: ago(39), refreshToken: null,
    },
    {
      _id: id('U'), username: 'leo', email: 'leo@projectcamp.dev',
      fullName: 'Leo Fernandes', password, role: 'member', isEmailVerified: true,
      avatar: { url: 'https://placehold.co/150x150', localPath: '' },
      createdAt: ago(38), refreshToken: null,
    },
    {
      _id: id('U'), username: 'priya', email: 'priya@projectcamp.dev',
      fullName: 'Priya Nair', password, role: 'member', isEmailVerified: true,
      avatar: { url: 'https://placehold.co/150x150', localPath: '' },
      createdAt: ago(37), refreshToken: null,
    },
    {
      _id: id('U'), username: 'arjun', email: 'arjun@projectcamp.dev',
      fullName: 'Arjun Kale', password, role: 'member', isEmailVerified: true,
      avatar: { url: 'https://placehold.co/150x150', localPath: '' },
      createdAt: ago(36), refreshToken: null,
    },
  );
  const [campadmin, maya, leo, priya, arjun] = db.users;

  /** Populated-user view attached to rows created by a user. */
  const snapshotOf = (user) => ({
    _id: user._id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    avatar: user.avatar,
  });

  /* ------------------------------------------------------- projects */
  const website = {
    _id: id('P'),
    name: 'Website Revamp',
    description:
      'Q4 marketing site overhaul — new design system, CMS migration and performance budget.',
    createdBy: campadmin._id,
    createdAt: ago(30),
    updatedAt: ago(30),
  };
  const mobile = {
    _id: id('P'),
    name: 'Mobile App MVP',
    description:
      'Companion mobile client — onboarding, notifications, offline cache for the field team.',
    createdBy: campadmin._id,
    createdAt: ago(25),
    updatedAt: ago(25),
  };
  db.projects.push(website, mobile);

  /* -------------------------------------------------------- members */
  const membership = (project, user, role) => ({
    _id: id('M'), project: project._id, user: user._id, role,
    userSnapshot: snapshotOf(user),
    createdAt: project.createdAt,
  });
  db.members.push(
    // Website Revamp — maya is ADMIN here (full rights), the main persona.
    membership(website, campadmin, 'admin'),
    membership(website, maya, 'admin'),
    membership(website, leo, 'member'),
    membership(website, priya, 'member'),
    // Mobile App MVP — maya is a plain member: role gating is exercisable.
    membership(mobile, campadmin, 'admin'),
    membership(mobile, priya, 'project_admin'),
    membership(mobile, maya, 'member'),
    membership(mobile, arjun, 'member'),
  );

  db.memberOf = function memberOf(userId, projectId) {
    return (
      this.members.find(
        (m) => m.project === projectId && m.user === userId,
      )?.role ?? null
    );
  };

  /* ---------------------------------------------------------- tasks */
  const task = (project, spec, daysBack) => {
    const t = {
      _id: id('T'),
      title: spec.title,
      description: spec.description || '',
      project: project._id,
      assignedTo: spec.assignedTo ? spec.assignedTo._id : null,
      assignedToSnapshot: spec.assignedTo ? snapshotOf(spec.assignedTo) : null,
      assignedBy: campadmin._id,
      status: spec.status,
      priority: spec.priority,
      dueDate: spec.dueDays === undefined ? null : ahead(spec.dueDays),
      attachments: [],
      createdAt: ago(daysBack),
      updatedAt: ago(daysBack),
    };
    db.tasks.push(t);
    spec.subtasks?.forEach((sub) => {
      db.subtasks.push({
        _id: id('S'),
        title: sub.title,
        task: t._id,
        isCompleted: Boolean(sub.isCompleted),
        completedAt: sub.isCompleted ? t.createdAt : null,
        createdBy: campadmin._id,
        createdAt: t.createdAt,
        updatedAt: t.createdAt,
      });
    });
    return t;
  };

  // createdAt staggers newest-first so both list sorts behave like the API.
  [
    { title: 'Redesign marketing homepage hero', description: 'New hero layout with animated gradient background and inline sign-up form.', status: 'todo', priority: 'HIGH', dueDays: 3, assignedTo: maya },
    { title: 'Migrate blog to new CMS', description: 'Move 140 posts off the legacy WP install; preserve slugs and metadata.', status: 'todo', priority: 'MEDIUM', dueDays: 10, assignedTo: leo },
    { title: 'Fix broken pricing links', description: 'Three anchors on /pricing still point at the staging domain.', status: 'todo', priority: 'LOW', dueDays: 1, assignedTo: priya },
    {
      title: 'Implement responsive navigation', description: 'Collapsible menu under 768px, focus trap, Esc-to-close.',
      status: 'in_progress', priority: 'HIGH', dueDays: 2, assignedTo: maya,
      subtasks: [
        { title: 'Audit current breakpoints', isCompleted: true },
        { title: 'Build the mobile menu', isCompleted: false },
        { title: 'Wire dropdown focus states', isCompleted: false },
      ],
    },
    {
      title: 'A/B test CTA copy', description: 'Two variants against the current "Get started free" label.',
      status: 'in_progress', priority: 'MEDIUM', dueDays: 7, assignedTo: leo,
      subtasks: [{ title: 'Draft variant copy', isCompleted: true }],
    },
    { title: 'Set up analytics events', description: 'sign_up, project_created, task_moved, note_added funnels.', status: 'in_progress', priority: 'MEDIUM', dueDays: 5, assignedTo: priya },
    {
      title: 'Ship v2 design tokens', description: 'Color/spacing/typography tokens exported to CSS variables.',
      status: 'done', priority: 'HIGH', dueDays: -2, assignedTo: maya,
      subtasks: [
        { title: 'Audit legacy colors', isCompleted: true },
        { title: 'Export tokens.css', isCompleted: true },
      ],
    },
    { title: 'Archive 2025 campaign assets', status: 'done', priority: 'LOW', dueDays: -5, assignedTo: priya },
    { title: 'Draft Q4 roadmap deck', description: 'Ten slides max — initiatives, owners, dates.', status: 'todo', priority: 'MEDIUM', dueDays: 14, assignedTo: null },
  ].forEach((spec, i) => task(website, spec, 14 - i));

  [
    { title: 'Onboarding screens', description: 'Three-screen walkthrough with skip and sign-in shortcuts.', status: 'done', priority: 'HIGH', dueDays: -3, assignedTo: maya },
    {
      title: 'Push notification service', description: 'APNs + FCM wiring, deep-link tap handling.',
      status: 'in_progress', priority: 'HIGH', dueDays: 4, assignedTo: arjun,
      subtasks: [{ title: 'Sandbox APNs key', isCompleted: true }],
    },
    { title: 'Offline task cache', description: 'SQLite mirror of the task list with conflict-last-write-wins.', status: 'todo', priority: 'MEDIUM', dueDays: 9, assignedTo: arjun },
    { title: 'Beta TestFlight invite flow', status: 'todo', priority: 'LOW', dueDays: 12, assignedTo: priya },
    { title: 'Crashlytics wiring', status: 'done', priority: 'MEDIUM', dueDays: -1, assignedTo: leo },
  ].forEach((spec, i) => task(mobile, spec, 12 - i));

  /* ---------------------------------------------------------- notes */
  const note = (project, spec) => {
    const author = spec.by;
    db.notes.push({
      _id: id('N'),
      project: project._id,
      createdBy: author._id,
      createdBySnapshot: snapshotOf(author),
      content: spec.content,
      isPinned: Boolean(spec.isPinned),
      editedAt: spec.edited ? spec.at : null,
      createdAt: spec.at,
      updatedAt: spec.at,
    });
  };

  [
    { isPinned: true, by: campadmin, at: ago(18), content: 'Sprint 14 kickoff — scope locked: homepage, nav, blog migration. Analytics events stay in sprint 15.' },
    { isPinned: true, by: maya, at: ago(12), content: 'Design tokens are live in main — use var(--pc-primary) etc. from tokens.css, no more hard-coded hex.' },
    { by: leo, at: ago(11, 4), content: 'Homepage hero: legal wants the pricing footnote visible above the fold.' },
    { by: leo, at: ago(10, 6), content: 'CMS migration dry run imported 140/140 posts. 3 had broken image refs — cleaning up in the importer.' },
    { by: priya, at: ago(9, 2), content: 'Reminder: performance budget is LCP < 2.0s on mid-tier Android, not just desktop.' },
    { by: maya, at: ago(8, 5), content: 'Nav focus trap shipped behind a flag — enable with ?navv2=1 on staging to try it.' },
    { by: campadmin, at: ago(7, 3), content: 'Copy review Thursday 15:00 — bring hero + pricing variants.' },
    { by: priya, at: ago(6, 7), content: 'Pricing anchor fix verified on staging; waiting for the deploy window before closing the task.' },
    { by: priya, at: ago(5, 1), content: 'Analytics: defined event names in docs/analytics.md — sign_up, project_created, task_moved, note_added.' },
    { by: leo, at: ago(4, 8), content: 'CTA variant B ("Start free — no card needed") won the first 200 sessions by 11%.' },
    { by: maya, at: ago(3, 2), content: 'Token migration checklist is in the board — tick items as pages migrate so we can chart progress.' },
    { by: leo, at: ago(2, 6), content: 'Blog taxonomy: collapsing 12 categories down to 5. Redirect map reviewed, safe to apply.' },
    { by: priya, at: ago(1, 5), content: 'Retro action: do design review BEFORE build, not after — homepage rework cost us two days.', edited: true },
    { by: campadmin, at: ago(1, 1), content: 'Friday deploy freeze (company all-hands). Ship pricing fix Thursday instead.' },
    { by: maya, at: ago(0, 3), content: 'Sprint 15 candidates: analytics events, nav flag GA, CMS image cleanup. Vote on Monday.' },
  ].forEach((spec) => note(website, spec));

  [
    { isPinned: true, by: priya, at: ago(6, 2), content: 'TestFlight build 0.4.2 (214) is up — testers, please focus on the onboarding skip button.' },
    { by: arjun, at: ago(4, 4), content: 'Push permissions primer: ask AFTER the value pitch screen, conversion doubled in the paper prototype.' },
    { by: maya, at: ago(2, 8), content: 'Offline cache: last-write-wins was signed off by the backend team; no merge fields in v1.' },
    { by: leo, at: ago(0, 6), content: 'Crash-free sessions at 99.2% this week — up from 97.8% before the Crashlytics wiring.' },
  ].forEach((spec) => note(mobile, spec));

  return db;
}
