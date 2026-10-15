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
import { Comment } from '#models/comment.models.js';
import { UserRoleEnum } from '#utils/constants.js';

const DEMO_EMAIL_DOMAIN = '@workpulse.io';
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
    username: 'pulseadmin',
    email: `admin${DEMO_EMAIL_DOMAIN}`,
    fullName: 'Pulse Admin',
    password: DEMO_PASSWORD,
    role: UserRoleEnum.ADMIN,
  },
  {
    username: 'maya',
    email: `maya${DEMO_EMAIL_DOMAIN}`,
    fullName: 'Maya Sharma',
    password: DEMO_PASSWORD,
    role: UserRoleEnum.MEMBER,
  },
  {
    username: 'leo',
    email: `leo${DEMO_EMAIL_DOMAIN}`,
    fullName: 'Leo Fernandes',
    password: DEMO_PASSWORD,
    role: UserRoleEnum.MEMBER,
  },
  {
    username: 'priya',
    email: `priya${DEMO_EMAIL_DOMAIN}`,
    fullName: 'Priya Nair',
    password: DEMO_PASSWORD,
    role: UserRoleEnum.MEMBER,
  },
  {
    username: 'arjun',
    email: `arjun${DEMO_EMAIL_DOMAIN}`,
    fullName: 'Arjun Kale',
    password: DEMO_PASSWORD,
    role: UserRoleEnum.MEMBER,
  },
  {
    username: 'elena',
    email: `elena${DEMO_EMAIL_DOMAIN}`,
    fullName: 'Elena Rostova',
    password: DEMO_PASSWORD,
    role: UserRoleEnum.MEMBER,
  },
  {
    username: 'sam',
    email: `sam${DEMO_EMAIL_DOMAIN}`,
    fullName: 'Sam Chen',
    password: DEMO_PASSWORD,
    role: UserRoleEnum.MEMBER,
  },
  {
    username: 'zara',
    email: `zara${DEMO_EMAIL_DOMAIN}`,
    fullName: 'Zara Patel',
    password: DEMO_PASSWORD,
    role: UserRoleEnum.MEMBER,
  },
  {
    username: 'marcus',
    email: `marcus${DEMO_EMAIL_DOMAIN}`,
    fullName: 'Marcus Vance',
    password: DEMO_PASSWORD,
    role: UserRoleEnum.MEMBER,
  },
  {
    username: 'aisha',
    email: `aisha${DEMO_EMAIL_DOMAIN}`,
    fullName: 'Aisha Khan',
    password: DEMO_PASSWORD,
    role: UserRoleEnum.MEMBER,
  },
  {
    username: 'david',
    email: `david${DEMO_EMAIL_DOMAIN}`,
    fullName: 'David Kim',
    password: DEMO_PASSWORD,
    role: UserRoleEnum.MEMBER,
  },
];

/* =========================================================
   DEMO CONTENT
========================================================= */

const projectSpecs = [
  {
    name: 'Atlas Web Relaunch',
    description:
      'Enterprise marketing platform rebuild with updated brand system, CMS, and high performance.',
    members: [
      { username: 'pulseadmin', role: UserRoleEnum.ADMIN },
      { username: 'maya', role: UserRoleEnum.ADMIN },
      { username: 'leo', role: UserRoleEnum.MEMBER },
      { username: 'priya', role: UserRoleEnum.MEMBER },
      { username: 'elena', role: UserRoleEnum.PROJECT_ADMIN },
      { username: 'sam', role: UserRoleEnum.MEMBER },
      { username: 'zara', role: UserRoleEnum.MEMBER },
      { username: 'marcus', role: UserRoleEnum.MEMBER },
      { username: 'aisha', role: UserRoleEnum.MEMBER },
      { username: 'david', role: UserRoleEnum.MEMBER },
      { username: 'arjun', role: UserRoleEnum.MEMBER },
    ],
    tasks: [
      {
        title: 'Redesign marketing homepage hero',
        description: 'New hero layout with animated gradient background and inline sign-up form.',
        status: 'todo',
        priority: 'HIGH',
        dueDate: ahead(3),
        assignedTo: 'maya',
        dependsOnTitles: ['Ship v2 design tokens'],
        comments: [
          { by: 'maya', content: 'Figma mockups are ready. @leo @priya please review the inline sign-up input.', at: ago(3, 2) },
          { by: 'leo', content: 'Looks great! Love the animated gradient background styling.', at: ago(2, 4) },
          { by: 'priya', content: 'Keeping the form inline should bump sign-ups by 15-20%. Approved!', at: ago(1, 1) },
        ],
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
        dependsOnTitles: ['Ship v2 design tokens'],
        subtasks: [
          { title: 'Audit current breakpoints', isCompleted: true },
          { title: 'Build the mobile menu', isCompleted: false },
          { title: 'Wire dropdown focus states', isCompleted: false },
        ],
        comments: [
          { by: 'maya', content: 'Mobile drawer is passing accessibility checks and keyboard trap testing.', at: ago(2, 5) },
          { by: 'arjun', content: 'Tested on iPad Air and Pixel 8 — transition is buttery smooth.', at: ago(1, 3) },
        ],
      },
      {
        title: 'A/B test CTA copy',
        description: 'Two variants against the current "Get started free" label.',
        status: 'in_progress',
        priority: 'MEDIUM',
        dueDate: ahead(7),
        assignedTo: 'leo',
        dependsOnTitles: ['Redesign marketing homepage hero'],
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
      {
        title: 'GraphQL gateway federation',
        description: 'Apollo router supergraph config with auth token propagation.',
        status: 'in_progress',
        priority: 'HIGH',
        dueDate: ahead(6),
        assignedTo: 'arjun',
        subtasks: [
          { title: 'Define subgraph schema contracts', isCompleted: true },
          { title: 'Test latency overhead in staging', isCompleted: false },
        ],
      },
      {
        title: 'OAuth2 PKCE social login',
        description: 'Google and GitHub single-sign on integration.',
        status: 'done',
        priority: 'HIGH',
        dueDate: ago(1),
        assignedTo: 'elena',
        subtasks: [
          { title: 'Configure OAuth consent screen', isCompleted: true },
          { title: 'Token exchange unit tests', isCompleted: true },
        ],
      },
      {
        title: 'Kubernetes Helm charts & canary deploys',
        description: 'Automate zero-downtime rolling deploys via ArgoCD.',
        status: 'todo',
        priority: 'HIGH',
        dueDate: ahead(8),
        assignedTo: 'sam',
        dependsOnTitles: ['OAuth2 PKCE social login', 'GraphQL gateway federation'],
        subtasks: [{ title: 'Write values.yaml production overlay', isCompleted: false }],
      },
      {
        title: 'Automated Playwright E2E test suite',
        description: 'Smoke tests covering auth, project creation, and board drag-and-drop.',
        status: 'in_progress',
        priority: 'MEDIUM',
        dueDate: ahead(4),
        assignedTo: 'zara',
        subtasks: [
          { title: 'Set up CI headless browser runner', isCompleted: true },
          { title: 'Add visual regression snapshot assertions', isCompleted: false },
        ],
      },
      {
        title: 'Accessibility & WCAG 2.1 AA audit',
        description: 'Color contrast check, keyboard navigation, and screen reader labels.',
        status: 'done',
        priority: 'MEDIUM',
        dueDate: ago(3),
        assignedTo: 'aisha',
        subtasks: [
          { title: 'Axe-core automated scan', isCompleted: true },
          { title: 'ARIA labels on icon-only buttons', isCompleted: true },
        ],
      },
    ],
    notes: [
      { content: 'Sprint 14 kickoff — scope locked: homepage, nav, blog migration, and gateway federation. All 11 team members onboarded.', isPinned: true, by: 'pulseadmin', at: ago(18) },
      { content: 'Design tokens are live in main — use var(--primary) etc. from theme tokens, no more hard-coded values.', isPinned: true, by: 'maya', at: ago(12) },
      { content: 'Homepage hero: legal wants the pricing footnote visible above the fold.', by: 'leo', at: ago(11, 4) },
      { content: 'CMS migration dry run imported 140/140 posts. 3 had broken image refs — cleaning up in the importer.', by: 'leo', at: ago(10, 6) },
      { content: 'Reminder: performance budget is LCP < 2.0s on mid-tier Android, not just desktop.', by: 'priya', at: ago(9, 2) },
      { content: 'Nav focus trap shipped behind a flag — enable with ?navv2=1 on staging to try it.', by: 'maya', at: ago(8, 5) },
      { content: 'GraphQL Gateway: Supergraph contract schema defined. Ready for client schema generator.', by: 'arjun', at: ago(7, 6) },
      { content: 'OAuth2 PKCE integration passing security reviews. Google & GitHub providers active in staging.', by: 'elena', at: ago(7, 1) },
      { content: 'Helm charts updated for multi-region canary rollout. Staging deployment pipelines ready.', by: 'sam', at: ago(6, 4) },
      { content: 'Playwright test suite covers 42 critical flows. Parallel test runs now finish in under 3 minutes.', by: 'zara', at: ago(5, 8) },
      { content: 'Touch target audit completed: button heights adjusted to minimum 44px on mobile devices.', by: 'marcus', at: ago(4, 3) },
      { content: 'Accessibility review: WCAG 2.1 AA score reached 98/100 across all primary views.', by: 'aisha', at: ago(3, 7) },
      { content: 'Pen test completed with zero critical findings. SOC2 compliance report draft ready for review.', by: 'david', at: ago(2, 5) },
      { content: 'Friday deploy freeze (company all-hands). Canary deployment window confirmed for Thursday 14:00.', by: 'pulseadmin', at: ago(1, 2) },
      { content: 'Sprint 15 candidates: analytics events, nav flag GA, CMS image cleanup. Vote on Monday.', by: 'maya', at: ago(0, 3) },
    ],
    discussions: [
      { by: 'maya', category: 'idea', at: ago(4, 3), content: 'Should we introduce an interactive pipeline dependency graph right on the tasks tab for complex initiatives? Would make tracking upstream blockers effortless for everyone.' },
      { by: 'leo', category: 'update', at: ago(3, 5), content: 'Sprint 14 marketing assets and hero illustrations are now staging-ready. Team review scheduled for Thursday 14:00.' },
      { by: 'priya', category: 'question', at: ago(2, 6), content: 'Do we have a confirmed cutoff date for the legacy CMS blog 301 redirects before DNS cutover to the new edge router?' },
      { by: 'sam', category: 'blocker', at: ago(1, 4), content: 'Notice: Staging Kubernetes cluster will undergo a brief 15-minute rolling upgrade at 16:00 UTC. Deploys will be temporarily queued.' },
      { by: 'marcus', category: 'general', at: ago(0, 3), content: 'Tested the touch targets and responsive navigation on both tablet and mobile — buttery smooth experience across all screen sizes!' },
      { by: 'elena', category: 'idea', at: ago(0, 1), content: 'We should consider adding WebAuthn passkey support after the OAuth2 PKCE launch. Several enterprise beta testers requested it.' },
    ],
  },
  {
    name: 'Mobile Application v2',
    description: 'Next-generation mobile client — onboarding, notifications, biometric auth, and offline cache for field teams.',
    members: [
      { username: 'pulseadmin', role: UserRoleEnum.ADMIN },
      { username: 'priya', role: UserRoleEnum.PROJECT_ADMIN },
      { username: 'maya', role: UserRoleEnum.MEMBER },
      { username: 'arjun', role: UserRoleEnum.MEMBER },
      { username: 'marcus', role: UserRoleEnum.MEMBER },
      { username: 'zara', role: UserRoleEnum.MEMBER },
      { username: 'leo', role: UserRoleEnum.MEMBER },
      { username: 'elena', role: UserRoleEnum.MEMBER },
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
        dependsOnTitles: ['Onboarding screens'],
        subtasks: [{ title: 'Sandbox APNs key', isCompleted: true }],
      },
      {
        title: 'Offline task cache',
        description: 'SQLite mirror of the task list with conflict-last-write-wins.',
        status: 'todo',
        priority: 'MEDIUM',
        dueDate: ahead(9),
        assignedTo: 'arjun',
        dependsOnTitles: ['Onboarding screens'],
      },
      {
        title: 'Beta TestFlight invite flow',
        status: 'todo',
        priority: 'LOW',
        dueDate: ahead(12),
        assignedTo: 'priya',
        dependsOnTitles: ['Biometric authentication (FaceID / Fingerprint)', 'Crashlytics wiring'],
      },
      {
        title: 'Crashlytics wiring',
        status: 'done',
        priority: 'MEDIUM',
        dueDate: ago(1),
        assignedTo: 'leo',
      },
      {
        title: 'Biometric authentication (FaceID / Fingerprint)',
        description: 'Keychain storage for refresh tokens protected by LocalAuthentication.',
        status: 'in_progress',
        priority: 'HIGH',
        dueDate: ahead(3),
        assignedTo: 'marcus',
        subtasks: [
          { title: 'iOS FaceID prompt wiring', isCompleted: true },
          { title: 'Android BiometricPrompt fallback', isCompleted: false },
        ],
      },
      {
        title: 'Deep linking & Universal App Links',
        description: 'Open specific task details from email notification URLs.',
        status: 'done',
        priority: 'MEDIUM',
        dueDate: ago(2),
        assignedTo: 'elena',
        subtasks: [{ title: 'Register apple-app-site-association file', isCompleted: true }],
      },
      {
        title: 'Automated Device Farm testing on iOS 18',
        description: 'Run test matrix across iPhone 15, iPad Air, and Pixel 8.',
        status: 'todo',
        priority: 'HIGH',
        dueDate: ahead(11),
        assignedTo: 'zara',
        dependsOnTitles: ['Biometric authentication (FaceID / Fingerprint)'],
        subtasks: [{ title: 'Configure AWS Device Farm pool', isCompleted: false }],
      },
    ],
    notes: [
      { content: 'TestFlight build 0.4.2 (214) is up — testers, please focus on the onboarding skip button and biometric auth.', isPinned: true, by: 'priya', at: ago(6, 2) },
      { content: 'Push permissions primer: ask AFTER the value pitch screen, conversion doubled in the paper prototype.', by: 'arjun', at: ago(4, 4) },
      { content: 'Offline cache: last-write-wins was signed off by the backend team; no merge fields in v1.', by: 'maya', at: ago(3, 1) },
      { content: 'Biometric FaceID integration tested on iOS 18 device farm — sub-50ms token retrieval.', by: 'marcus', at: ago(2, 6) },
      { content: 'Universal App Links verified on production domain. Email link taps now deep-link directly into tasks.', by: 'elena', at: ago(1, 4) },
      { content: 'Crash-free sessions at 99.4% this week across 1,200 active TestFlight installs.', by: 'zara', at: ago(0, 5) },
    ],
  },
  {
    name: 'Cloud & Infrastructure Hub',
    description: 'Multi-region Kubernetes deployment, automated zero-downtime CI/CD pipelines, and observability monitoring.',
    members: [
      { username: 'pulseadmin', role: UserRoleEnum.ADMIN },
      { username: 'sam', role: UserRoleEnum.PROJECT_ADMIN },
      { username: 'david', role: UserRoleEnum.MEMBER },
      { username: 'arjun', role: UserRoleEnum.MEMBER },
      { username: 'elena', role: UserRoleEnum.MEMBER },
      { username: 'zara', role: UserRoleEnum.MEMBER },
      { username: 'maya', role: UserRoleEnum.MEMBER },
    ],
    tasks: [
      {
        title: 'Migrate Redis clusters to Valkey 8.0',
        description: 'In-place upgrade with replication fallback and memory optimization.',
        status: 'done',
        priority: 'HIGH',
        dueDate: ago(4),
        assignedTo: 'sam',
        subtasks: [
          { title: 'Benchmark throughput under load', isCompleted: true },
          { title: 'Perform production cutover during maintenance', isCompleted: true },
        ],
      },
      {
        title: 'Prometheus & Grafana distributed alerting',
        description: 'Set up P99 latency alerts and Slack/PagerDuty routing.',
        status: 'in_progress',
        priority: 'HIGH',
        dueDate: ahead(5),
        assignedTo: 'david',
        dependsOnTitles: ['Migrate Redis clusters to Valkey 8.0'],
        subtasks: [
          { title: 'Configure PagerDuty webhooks', isCompleted: true },
          { title: 'Build latency SLO dashboard', isCompleted: false },
        ],
      },
      {
        title: 'Terraform Infrastructure as Code audit',
        description: 'Import unmanaged AWS VPC routes and tighten security groups.',
        status: 'todo',
        priority: 'MEDIUM',
        dueDate: ahead(8),
        assignedTo: 'sam',
      },
      {
        title: 'Database read-replica load balancing',
        description: 'Route read queries to Aurora replicas to reduce primary CPU load.',
        status: 'in_progress',
        priority: 'HIGH',
        dueDate: ahead(6),
        assignedTo: 'arjun',
        subtasks: [{ title: 'Connection pool warm-up script', isCompleted: true }],
      },
      {
        title: 'Chaos engineering & disaster recovery drill',
        description: 'Simulate availability zone failure and verify failover time < 30s.',
        status: 'todo',
        priority: 'LOW',
        dueDate: ahead(15),
        assignedTo: 'zara',
      },
      {
        title: 'Automated zero-downtime rolling deploys',
        description: 'Canary health checks before routing 100% of ingress traffic.',
        status: 'done',
        priority: 'HIGH',
        dueDate: ago(1),
        assignedTo: 'elena',
        dependsOnTitles: ['Migrate Redis clusters to Valkey 8.0'],
        subtasks: [
          { title: 'Envoy service mesh health check', isCompleted: true },
          { title: 'Automated rollback on error spike', isCompleted: true },
        ],
      },
    ],
    notes: [
      { content: 'Cluster upgrade notice: Valkey 8.0 migration completed with zero dropped connections.', isPinned: true, by: 'sam', at: ago(8, 1) },
      { content: 'Prometheus alerts configured: warning at 80% CPU over 5m, critical at 95% over 2m.', by: 'david', at: ago(6, 3) },
      { content: 'Automated canary rollback triggered successfully in staging during fault-injection test.', by: 'elena', at: ago(4, 5) },
      { content: 'Aurora read-replicas handling 68% of total query volume now; primary CPU load dropped by 45%.', by: 'arjun', at: ago(2, 2) },
      { content: 'Monthly infrastructure cost down 18% following Redis to Valkey migration and idle container pruning.', by: 'pulseadmin', at: ago(0, 4) },
    ],
  },
  {
    name: 'Customer Success & Analytics',
    description: 'Customer telemetry ingestion, real-time NPS tracking, customer health score dashboards, and Zendesk sync.',
    members: [
      { username: 'pulseadmin', role: UserRoleEnum.ADMIN },
      { username: 'aisha', role: UserRoleEnum.PROJECT_ADMIN },
      { username: 'priya', role: UserRoleEnum.MEMBER },
      { username: 'leo', role: UserRoleEnum.MEMBER },
      { username: 'david', role: UserRoleEnum.MEMBER },
      { username: 'maya', role: UserRoleEnum.MEMBER },
    ],
    tasks: [
      {
        title: 'Real-time NPS sentiment analyzer',
        description: 'Ingest survey scores and run NLP keyword clustering.',
        status: 'in_progress',
        priority: 'HIGH',
        dueDate: ahead(4),
        assignedTo: 'aisha',
        subtasks: [
          { title: 'Webhook endpoint for Typeform', isCompleted: true },
          { title: 'Sentiment classifier pipeline', isCompleted: false },
        ],
      },
      {
        title: 'Customer health score scoring model',
        description: 'Aggregate daily active users, license utilization, and support tickets.',
        status: 'todo',
        priority: 'HIGH',
        dueDate: ahead(7),
        assignedTo: 'priya',
        dependsOnTitles: ['Interactive cohort retention heatmap'],
      },
      {
        title: 'Zendesk bi-directional ticket sync',
        description: 'Display customer ticket status directly in customer profile.',
        status: 'done',
        priority: 'MEDIUM',
        dueDate: ago(2),
        assignedTo: 'leo',
        subtasks: [
          { title: 'Zendesk API OAuth token integration', isCompleted: true },
          { title: 'Sync rate limiter and backoff logic', isCompleted: true },
        ],
      },
      {
        title: 'Customer churn prediction pipeline',
        description: 'Flag accounts with declining 30-day activity.',
        status: 'todo',
        priority: 'MEDIUM',
        dueDate: ahead(10),
        assignedTo: 'david',
        dependsOnTitles: ['Customer health score scoring model'],
      },
      {
        title: 'Interactive cohort retention heatmap',
        description: 'Monthly user cohort retention matrix with interactive filters.',
        status: 'done',
        priority: 'HIGH',
        dueDate: ago(5),
        assignedTo: 'maya',
        subtasks: [{ title: 'D3 / SVG cohort matrix component', isCompleted: true }],
      },
    ],
    notes: [
      { content: 'NPS benchmark: current rolling NPS is +54 across enterprise tier users.', isPinned: true, by: 'aisha', at: ago(7, 2) },
      { content: 'Health score algorithm weights: 40% active seats, 30% weekly task movements, 30% ticket frequency.', by: 'priya', at: ago(5, 4) },
      { content: 'Zendesk ticket webhook integration live: tickets now sync in under 3 seconds.', by: 'leo', at: ago(3, 6) },
      { content: 'Churn risk model flagged 4 enterprise accounts with dropping login trends for customer success outreach.', by: 'david', at: ago(2, 1) },
      { content: 'Cohort retention dashboard reviewed: month-3 retention rose from 71% to 84% post-redesign.', by: 'maya', at: ago(0, 2) },
    ],
  },
];

/* =========================================================
   WIPE — remove everything owned by demo users
========================================================= */

async function wipeDemoData() {
  const demoUserDocs = await User.find({
    $or: [
      { email: { $regex: DEMO_EMAIL_DOMAIN.replace('.', '\\.') + '$' } },
      { email: { $regex: '@projectcamp\\.dev$' } },
    ],
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
  await Comment.deleteMany({
    $or: [{ project: { $in: projectIds } }, { author: { $in: ids } }],
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

  const createdTasksByTitle = {};
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
    createdTasksByTitle[taskSpec.title] = task;

    for (const subSpec of taskSpec.subtasks || []) {
      await SubTask.create({
        title: subSpec.title,
        task: task._id,
        isCompleted: Boolean(subSpec.isCompleted),
        createdBy: admin._id,
      });
    }

    for (const commentSpec of taskSpec.comments || []) {
      await Comment.create({
        content: commentSpec.content,
        project: project._id,
        task: task._id,
        author: users[commentSpec.by]._id,
        createdAt: commentSpec.at || task.createdAt,
        updatedAt: commentSpec.at || task.createdAt,
      });
    }
  }

  // Wire dependsOn dependencies
  for (const taskSpec of spec.tasks) {
    if (taskSpec.dependsOnTitles && taskSpec.dependsOnTitles.length > 0) {
      const depIds = taskSpec.dependsOnTitles
        .map((t) => createdTasksByTitle[t]?._id)
        .filter(Boolean);
      if (depIds.length > 0) {
        await Task.findByIdAndUpdate(createdTasksByTitle[taskSpec.title]._id, {
          dependsOn: depIds,
        });
      }
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

  if (spec.discussions) {
    for (const disc of spec.discussions) {
      await Comment.create({
        project: project._id,
        author: users[disc.by]._id,
        content: disc.content,
        category: disc.category || 'general',
        createdAt: disc.at,
        updatedAt: disc.at,
      });
    }
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
  const admin = users.pulseadmin || users.campadmin;

  const totals = { projects: 0, members: 0, tasks: 0, subtasks: 0, notes: 0, comments: 0 };
  let freshProjects = 0;

  for (const spec of projectSpecs) {
    const { project, created } = await seedProject(admin, spec, users);
    if (created) freshProjects += 1;

    totals.tasks += await Task.countDocuments({ project: project._id });
    totals.notes += await ProjectNote.countDocuments({ project: project._id });
    totals.members += await ProjectMember.countDocuments({ project: project._id });
    totals.comments += await Comment.countDocuments({ project: project._id });
    const taskIds = (await Task.find({ project: project._id }).select('_id')).map((t) => t._id);
    totals.subtasks += await SubTask.countDocuments({ task: { $in: taskIds } });
  }
  totals.projects = await Project.countDocuments({ createdBy: admin._id });

  console.log('');
  console.log('════════════════════════════════════════════════');
  console.log('  ✅ Demo data ready');
  console.log(`     DB: ${mongoose.connection.name}`);
  console.log(
    `     ${totals.projects} projects · ${totals.members} memberships · ${totals.tasks} tasks · ${totals.subtasks} subtasks · ${totals.notes} notes · ${totals.comments} comments`,
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
