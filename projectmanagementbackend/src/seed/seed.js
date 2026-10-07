/**
 * Demo data seeder — `npm run seed`
 *
 * Seeds a small, realistic demo dataset so every implemented feature can be
 * exercised immediately:
 *   • 5 email-verified users (all share one password, see DEMO_PASSWORD)
 *   • 2 projects with mixed memberships (admin / project_admin / member)
 *   • 14 tasks across both projects with staggered due dates
 *   • 6 subtasks (some completed → completedAt is stamped)
 *   • 19 project notes — 15 on "Website Revamp" so the client pagination UI
 *     (PAGE_SIZE = 12) has a second page to show, with 2 pinned notes
 *
 * Modes:
 *   npm run seed          → top-up: creates users/projects/memberships if they
 *                           are missing; content (tasks/subtasks/notes) is only
 *                           inserted for projects created by this run.
 *   npm run seed -- --wipe→ deletes ALL data belonging to *@projectcamp.dev
 *                           users first, then seeds fresh. Never touches any
 *                           other account (incl. the bootstrapped env admin).
 *
 * The script refuses to run in production.
 */
import 'dotenv/config';

import mongoose from 'mongoose';

import connectDB from '../db/database.js';

import { User } from '#models/user.models.js';
import { Project } from '#models/project.models.js';
import { ProjectMember } from '#models/projectmember.models.js';
import { Task } from '#models/task.models.js';
import { SubTask } from '#models/subtask.models.js';
import { ProjectNote } from '#models/note.models.js';
import { UserRoleEnum } from '#utils/constants.js';

const DEMO_EMAIL_DOMAIN = '@projectcamp.dev';
const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'DemoPass123!';

const args = new Set(process.argv.slice(2));
const WIPE = args.has('--wipe');

if (process.env.NODE_ENV === 'production') {
  console.error('❌ Refusing to seed demo data while NODE_ENV=production');
  process.exit(1);
}

/* =========================================================
   TIME HELPERS — deterministic, staggered timestamps
   (createdAt ordering drives the notes pagination demo)
========================================================= */

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

const ago = (days, hours = 0) => new Date(NOW - days * DAY - hours * HOUR);
const ahead = (days) => new Date(NOW + days * DAY);

/* =========================================================
   DEMO USERS
========================================================= */

// password is hashed by the User model's pre-save hook on create.
const demoUsers = [
  {
    username: 'campadmin',
    email: `admin${DEMO_EMAIL_DOMAIN}`,
    fullName: 'Camp Admin',
    password: DEMO_PASSWORD,
    role: UserRoleEnum.ADMIN,
    isEmailVerified: true,
  },
  {
    username: 'maya',
    email: `maya${DEMO_EMAIL_DOMAIN}`,
    fullName: 'Maya Sharma',
    password: DEMO_PASSWORD,
    role: UserRoleEnum.MEMBER,
    isEmailVerified: true,
  },
  {
    username: 'leo',
    email: `leo${DEMO_EMAIL_DOMAIN}`,
    fullName: 'Leo Fernandes',
    password: DEMO_PASSWORD,
    role: UserRoleEnum.MEMBER,
    isEmailVerified: true,
  },
  {
    username: 'priya',
    email: `priya${DEMO_EMAIL_DOMAIN}`,
    fullName: 'Priya Nair',
    password: DEMO_PASSWORD,
    role: UserRoleEnum.MEMBER,
    isEmailVerified: true,
  },
  {
    username: 'arjun',
    email: `arjun${DEMO_EMAIL_DOMAIN}`,
    fullName: 'Arjun Kale',
    password: DEMO_PASSWORD,
    role: UserRoleEnum.MEMBER,
    isEmailVerified: true,
  },
];

/* =========================================================
   DEMO CONTENT
========================================================= */

const projectSpecs = [
  {
    name: 'Website Revamp',
    description:
      'Q4 marketing site overhaul — new design system, CMS migration and performance budget.',
    members: [
      { username: 'campadmin', role: UserRoleEnum.ADMIN }, // camp admin
      { username: 'maya', role: UserRoleEnum.ADMIN }, // main login persona — full rights
      { username: 'leo', role: UserRoleEnum.MEMBER },
      { username: 'priya', role: UserRoleEnum.MEMBER },
    ],
    tasks: [
      {
        title: 'Redesign marketing homepage hero',
        description: 'New hero layout with animated gradient background and inline sign-up form.',
        status: 'todo',
        priority: 'HIGH',
        dueDate: ahead(3),
        assignedTo: 'maya',
      },
      {
        title: 'Migrate blog to new CMS',
        description: 'Move 140 posts off the legacy WP install; preserve slugs and metadata.',
        status: 'todo',
        priority: 'MEDIUM',
        dueDate: ahead(10),
        assignedTo: 'leo',
      },
      {
        title: 'Fix broken pricing links',
        description: 'Three anchors on /pricing still point at the staging domain.',
        status: 'todo',
        priority: 'LOW',
        dueDate: ahead(1),
        assignedTo: 'priya',
      },
      {
        title: 'Implement responsive navigation',
        description: 'Collapsible menu under 768px, focus trap, Esc-to-close.',
        status: 'in_progress',
        priority: 'HIGH',
        dueDate: ahead(2),
        assignedTo: 'maya',
        subtasks: [
          { title: 'Audit current breakpoints', isCompleted: true },
          { title: 'Build the mobile menu', isCompleted: false },
          { title: 'Wire dropdown focus states', isCompleted: false },
        ],
      },
      {
        title: 'A/B test CTA copy',
        description: 'Two variants against the current "Get started free" label.',
        status: 'in_progress',
        priority: 'MEDIUM',
        dueDate: ahead(7),
        assignedTo: 'leo',
        subtasks: [{ title: 'Draft variant copy', isCompleted: true }],
      },
      {
        title: 'Set up analytics events',
        description: 'sign_up, project_created, task_moved, note_added funnels.',
        status: 'in_progress',
        priority: 'MEDIUM',
        dueDate: ahead(5),
        assignedTo: 'priya',
      },
      {
        title: 'Ship v2 design tokens',
        description: 'Color/spacing/typography tokens exported to CSS variables.',
        status: 'done',
        priority: 'HIGH',
        dueDate: ago(2),
        assignedTo: 'maya',
        subtasks: [
          { title: 'Audit legacy colors', isCompleted: true },
          { title: 'Export tokens.css', isCompleted: true },
        ],
      },
      {
        title: 'Archive 2025 campaign assets',
        status: 'done',
        priority: 'LOW',
        dueDate: ago(5),
        assignedTo: 'priya',
      },
      {
        title: 'Draft Q4 roadmap deck',
        description: 'Ten slides max — initiatives, owners, dates.',
        status: 'todo',
        priority: 'MEDIUM',
        dueDate: ahead(14),
      },
    ],
    notes: [
      { content: 'Sprint 14 kickoff — scope locked: homepage, nav, blog migration. Analytics events stay in sprint 15.', isPinned: true, by: 'campadmin', at: ago(18) },
      { content: 'Design tokens are live in main — use var(--pc-primary) etc. from tokens.css, no more hard-coded hex.', isPinned: true, by: 'maya', at: ago(12) },
      { content: 'Homepage hero: legal wants the pricing footnote visible above the fold.', by: 'leo', at: ago(11, 4) },
      { content: 'CMS migration dry run imported 140/140 posts. 3 had broken image refs — cleaning up in the importer.', by: 'leo', at: ago(10, 6) },
      { content: 'Reminder: performance budget is LCP < 2.0s on mid-tier Android, not just desktop.', by: 'priya', at: ago(9, 2) },
      { content: 'Nav focus trap shipped behind a flag — enable with ?navv2=1 on staging to try it.', by: 'maya', at: ago(8, 5) },
      { content: 'Copy review Thursday 15:00 — bring hero + pricing variants.', by: 'campadmin', at: ago(7, 3) },
      { content: 'Pricing anchor fix verified on staging; waiting for the deploy window before closing the task.', by: 'priya', at: ago(6, 7) },
      { content: 'Analytics: defined event names in docs/analytics.md — sign_up, project_created, task_moved, note_added.', by: 'priya', at: ago(5, 1) },
      { content: 'CTA variant B ("Start free — no card needed") won the first 200 sessions by 11%.', by: 'leo', at: ago(4, 8) },
      { content: 'Token migration checklist is in the board — tick items as pages migrate so we can chart progress.', by: 'maya', at: ago(3, 2) },
      { content: 'Blog taxonomy: collapsing 12 categories down to 5. Redirect map reviewed, safe to apply.', by: 'leo', at: ago(2, 6) },
      { content: 'Retro action: do design review BEFORE build, not after — homepage rework cost us two days.', by: 'priya', at: ago(1, 5), edited: true },
      { content: 'Friday deploy freeze (company all-hands). Ship pricing fix Thursday instead.', by: 'campadmin', at: ago(1, 1) },
      { content: 'Sprint 15 candidates: analytics events, nav flag GA, CMS image cleanup. Vote on Monday.', by: 'maya', at: ago(0, 3) },
    ],
  },
  {
    name: 'Mobile App MVP',
    description: 'Companion mobile client — onboarding, notifications, offline cache for the field team.',
    members: [
      { username: 'campadmin', role: UserRoleEnum.ADMIN }, // camp admin
      { username: 'priya', role: UserRoleEnum.PROJECT_ADMIN },
      { username: 'maya', role: UserRoleEnum.MEMBER }, // contrast: limited rights here
      { username: 'arjun', role: UserRoleEnum.MEMBER },
    ],
    tasks: [
      {
        title: 'Onboarding screens',
        description: 'Three-screen walkthrough with skip and sign-in shortcuts.',
        status: 'done',
        priority: 'HIGH',
        dueDate: ago(3),
        assignedTo: 'maya',
      },
      {
        title: 'Push notification service',
        description: 'APNs + FCM wiring, deep-link tap handling.',
        status: 'in_progress',
        priority: 'HIGH',
        dueDate: ahead(4),
        assignedTo: 'arjun',
        subtasks: [{ title: 'Sandbox APNs key', isCompleted: true }],
      },
      {
        title: 'Offline task cache',
        description: 'SQLite mirror of the task list with conflict-last-write-wins.',
        status: 'todo',
        priority: 'MEDIUM',
        dueDate: ahead(9),
        assignedTo: 'arjun',
      },
      {
        title: 'Beta TestFlight invite flow',
        status: 'todo',
        priority: 'LOW',
        dueDate: ahead(12),
        assignedTo: 'priya',
      },
      {
        title: 'Crashlytics wiring',
        status: 'done',
        priority: 'MEDIUM',
        dueDate: ago(1),
        assignedTo: 'leo',
      },
    ],
    notes: [
      { content: 'TestFlight build 0.4.2 (214) is up — testers, please focus on the onboarding skip button.', isPinned: true, by: 'priya', at: ago(6, 2) },
      { content: 'Push permissions primer: ask AFTER the value pitch screen, conversion doubled in the paper prototype.', by: 'arjun', at: ago(4, 4) },
      { content: 'Offline cache: last-write-wins was signed off by the backend team; no merge fields in v1.', by: 'maya', at: ago(2, 8) },
      { content: 'Crash-free sessions at 99.2% this week — up from 97.8% before the Crashlytics wiring.', by: 'leo', at: ago(0, 6) },
    ],
  },
];

/* =========================================================
   WIPE — remove everything owned by demo users
========================================================= */

async function wipeDemoData() {
  const demoUserDocs = await User.find({
    email: { $regex: DEMO_EMAIL_DOMAIN.replace('.', '\\.') + '$' },
  }).select('_id');

  const ids = demoUserDocs.map((u) => u._id);
  if (ids.length === 0) {
    console.log('🧹 Wipe: no demo data found');
    return;
  }

  const projects = await Project.find({ createdBy: { $in: ids } }).select('_id');
  const projectIds = projects.map((p) => p._id);
  const tasks = await Task.find({ project: { $in: projectIds } }).select('_id');
  const taskIds = tasks.map((t) => t._id);

  // Cascade in the same order the app's deleteProject controller uses.
  await SubTask.deleteMany({
    $or: [{ task: { $in: taskIds } }, { createdBy: { $in: ids } }],
  });
  await Task.deleteMany({
    $or: [{ project: { $in: projectIds } }, { assignedBy: { $in: ids } }],
  });
  await ProjectNote.deleteMany({
    $or: [{ project: { $in: projectIds } }, { createdBy: { $in: ids } }],
  });
  await ProjectMember.deleteMany({
    $or: [{ project: { $in: projectIds } }, { user: { $in: ids } }],
  });
  await Project.deleteMany({ $or: [{ _id: { $in: projectIds } }, { createdBy: { $in: ids } }] });
  await User.deleteMany({ _id: { $in: ids } });

  console.log(
    `🧹 Wiped demo data: ${ids.length} users, ${projectIds.length} projects and their content`,
  );
}

/* =========================================================
   SEED
========================================================= */

async function upsertUsers() {
  const byUsername = {};
  for (const spec of demoUsers) {
    // Match either identifier — a pre-existing username from another account
    // (e.g. the bootstrapped env admin) must not collide on the unique index.
    const existing = await User.findOne({
      $or: [{ email: spec.email }, { username: spec.username }],
    });

    if (existing) {
      if (existing.email !== spec.email) {
        throw new Error(
          `Username "${spec.username}" is taken by ${existing.email} — pick another demo username`,
        );
      }
      // Keep the account fresh: verified + the documented demo password.
      existing.fullName = spec.fullName;
      existing.password = DEMO_PASSWORD;
      existing.isEmailVerified = true;
      existing.role = spec.role;
      await existing.save({ validateBeforeSave: false });
      byUsername[spec.username] = existing;
      continue;
    }
    byUsername[spec.username] = await User.create(spec);
  }
  return byUsername;
}

async function seedProject(admin, spec, users) {
  const existing = await Project.findOne({ name: spec.name, createdBy: admin._id });

  if (existing) {
    // Idempotent top-up: only make sure every planned membership exists.
    for (const [username, memberSpec] of memberUsernames(spec)) {
      await ProjectMember.updateOne(
        { project: existing._id, user: users[username]._id },
        { $set: { role: memberSpec.role } },
        { upsert: true },
      );
    }
    return { project: existing, created: false };
  }

  const project = await Project.create({
    name: spec.name,
    description: spec.description,
    createdBy: admin._id,
  });

  for (const [username, memberSpec] of memberUsernames(spec)) {
    await ProjectMember.create({
      project: project._id,
      user: users[username]._id,
      role: memberSpec.role,
    });
  }

  for (const taskSpec of spec.tasks) {
    const task = await Task.create({
      title: taskSpec.title,
      description: taskSpec.description || '',
      project: project._id,
      assignedTo: taskSpec.assignedTo ? users[taskSpec.assignedTo]._id : undefined,
      assignedBy: admin._id,
      status: taskSpec.status,
      priority: taskSpec.priority,
      dueDate: taskSpec.dueDate,
      ...(taskSpec.createdAt ? { createdAt: taskSpec.createdAt, updatedAt: taskSpec.createdAt } : {}),
    });

    for (const subSpec of taskSpec.subtasks || []) {
      await SubTask.create({
        title: subSpec.title,
        task: task._id,
        isCompleted: Boolean(subSpec.isCompleted),
        createdBy: admin._id,
      });
    }
  }

  for (const noteSpec of spec.notes) {
    await ProjectNote.create({
      project: project._id,
      createdBy: users[noteSpec.by]._id,
      content: noteSpec.content,
      isPinned: Boolean(noteSpec.isPinned),
      createdAt: noteSpec.at,
      updatedAt: noteSpec.at,
      ...(noteSpec.edited ? { editedAt: noteSpec.at } : {}),
    });
  }

  return { project, created: true };
}

// memberships are declared explicitly in each spec
function memberUsernames(spec) {
  return spec.members.map(({ username, ...rest }) => [username, rest]);
}

/* =========================================================
   MAIN
========================================================= */

async function main() {
  await connectDB();

  console.log(`🌱 Seeding demo data into database "${mongoose.connection.name}"…`);

  if (WIPE) {
    await wipeDemoData();
  }

  const users = await upsertUsers();
  const admin = users.campadmin;

  const totals = { projects: 0, members: 0, tasks: 0, subtasks: 0, notes: 0 };
  let freshProjects = 0;

  for (const spec of projectSpecs) {
    const { project, created } = await seedProject(admin, spec, users);
    if (created) freshProjects += 1;

    totals.tasks += await Task.countDocuments({ project: project._id });
    totals.notes += await ProjectNote.countDocuments({ project: project._id });
    totals.members += await ProjectMember.countDocuments({ project: project._id });
    const taskIds = (await Task.find({ project: project._id }).select('_id')).map((t) => t._id);
    totals.subtasks += await SubTask.countDocuments({ task: { $in: taskIds } });
  }
  totals.projects = await Project.countDocuments({ createdBy: admin._id });

  console.log('');
  console.log('════════════════════════════════════════════════');
  console.log('  ✅ Demo data ready');
  console.log(`     DB: ${mongoose.connection.name}`);
  console.log(
    `     ${totals.projects} projects · ${totals.members} memberships · ${totals.tasks} tasks · ${totals.subtasks} subtasks · ${totals.notes} notes`,
  );
  console.log(`     (content inserted this run for ${freshProjects} new project(s))`);
  console.log('');
  console.log('  Login with any of (username or email):');
  for (const u of demoUsers) {
    console.log(
      `     ${u.username.padEnd(8)} ${u.email.padEnd(24)} ${u.fullName} — ${u.role}`,
    );
  }
  console.log(`     password: ${DEMO_PASSWORD}`);
  console.log('════════════════════════════════════════════════');
  console.log('');
  console.log('  Note: re-running without --wipe only tops up users/projects');
  console.log('  — use `npm run seed -- --wipe` to reset the demo content.');

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('❌ Seed failed:', error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
