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
 * Build the whole demo database with 11 team members across projects.
 * Kept as a factory so `useUiDemo()` can reset everything without a page reload.
 */
export function createMockDatabase() {
  const db = {
    users: [],
    projects: [],
    members: [],
    tasks: [],
    subtasks: [],
    comments: [],
    notes: [],
    /** null | { userId } — the mock "cookie jar" */
    session: null,
  };

  /* ---------------------------------------------------------- 11 users */
  const password = DEMO_PASSWORD;
  db.users.push(
    {
      _id: id('U'), username: 'pulseadmin', email: 'admin@workpulse.io',
      fullName: 'Pulse Admin', password, role: 'admin',
      avatar: { url: 'https://placehold.co/150x150', localPath: '' },
      createdAt: ago(40), refreshToken: null,
    },
    {
      _id: id('U'), username: 'maya', email: 'maya@workpulse.io',
      fullName: 'Maya Sharma', password, role: 'member',
      avatar: { url: 'https://placehold.co/150x150', localPath: '' },
      createdAt: ago(39), refreshToken: null,
    },
    {
      _id: id('U'), username: 'leo', email: 'leo@workpulse.io',
      fullName: 'Leo Fernandes', password, role: 'member',
      avatar: { url: 'https://placehold.co/150x150', localPath: '' },
      createdAt: ago(38), refreshToken: null,
    },
    {
      _id: id('U'), username: 'priya', email: 'priya@workpulse.io',
      fullName: 'Priya Nair', password, role: 'member',
      avatar: { url: 'https://placehold.co/150x150', localPath: '' },
      createdAt: ago(37), refreshToken: null,
    },
    {
      _id: id('U'), username: 'arjun', email: 'arjun@workpulse.io',
      fullName: 'Arjun Kale', password, role: 'member',
      avatar: { url: 'https://placehold.co/150x150', localPath: '' },
      createdAt: ago(36), refreshToken: null,
    },
    {
      _id: id('U'), username: 'elena', email: 'elena@workpulse.io',
      fullName: 'Elena Rostova', password, role: 'member',
      avatar: { url: 'https://placehold.co/150x150', localPath: '' },
      createdAt: ago(35), refreshToken: null,
    },
    {
      _id: id('U'), username: 'sam', email: 'sam@workpulse.io',
      fullName: 'Sam Chen', password, role: 'member',
      avatar: { url: 'https://placehold.co/150x150', localPath: '' },
      createdAt: ago(34), refreshToken: null,
    },
    {
      _id: id('U'), username: 'zara', email: 'zara@workpulse.io',
      fullName: 'Zara Patel', password, role: 'member',
      avatar: { url: 'https://placehold.co/150x150', localPath: '' },
      createdAt: ago(33), refreshToken: null,
    },
    {
      _id: id('U'), username: 'marcus', email: 'marcus@workpulse.io',
      fullName: 'Marcus Vance', password, role: 'member',
      avatar: { url: 'https://placehold.co/150x150', localPath: '' },
      createdAt: ago(32), refreshToken: null,
    },
    {
      _id: id('U'), username: 'aisha', email: 'aisha@workpulse.io',
      fullName: 'Aisha Khan', password, role: 'member',
      avatar: { url: 'https://placehold.co/150x150', localPath: '' },
      createdAt: ago(31), refreshToken: null,
    },
    {
      _id: id('U'), username: 'david', email: 'david@workpulse.io',
      fullName: 'David Kim', password, role: 'member',
      avatar: { url: 'https://placehold.co/150x150', localPath: '' },
      createdAt: ago(30), refreshToken: null,
    },
  );
  const [campadmin, maya, leo, priya, arjun, elena, sam, zara, marcus, aisha, david] = db.users;

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
    name: 'Atlas Web Relaunch',
    description:
      'Enterprise marketing platform rebuild with updated brand system, CMS, and high performance.',
    createdBy: campadmin._id,
    createdAt: ago(30),
    updatedAt: ago(30),
  };
  const mobile = {
    _id: id('P'),
    name: 'Mobile Application v2',
    description:
      'Next-generation mobile client — onboarding, notifications, biometric auth, and offline cache for field teams.',
    createdBy: campadmin._id,
    createdAt: ago(25),
    updatedAt: ago(25),
  };
  const cloud = {
    _id: id('P'),
    name: 'Cloud & Infrastructure Hub',
    description:
      'Multi-region Kubernetes deployment, automated zero-downtime CI/CD pipelines, and observability monitoring.',
    createdBy: campadmin._id,
    createdAt: ago(20),
    updatedAt: ago(20),
  };
  const analytics = {
    _id: id('P'),
    name: 'Customer Success & Analytics',
    description:
      'Customer telemetry ingestion, real-time NPS tracking, customer health score dashboards, and Zendesk sync.',
    createdBy: campadmin._id,
    createdAt: ago(15),
    updatedAt: ago(15),
  };
  db.projects.push(website, mobile, cloud, analytics);

  /* -------------------------------------------------------- members */
  const membership = (project, user, role) => ({
    _id: id('M'), project: project._id, user: user._id, role,
    userSnapshot: snapshotOf(user),
    createdAt: project.createdAt,
  });
  db.members.push(
    // Atlas Web Relaunch — all 11 team members
    membership(website, campadmin, 'admin'),
    membership(website, maya, 'admin'),
    membership(website, leo, 'member'),
    membership(website, priya, 'member'),
    membership(website, elena, 'project_admin'),
    membership(website, sam, 'member'),
    membership(website, zara, 'member'),
    membership(website, marcus, 'member'),
    membership(website, aisha, 'member'),
    membership(website, david, 'member'),
    membership(website, arjun, 'member'),

    // Mobile Application v2 — 8 members
    membership(mobile, campadmin, 'admin'),
    membership(mobile, priya, 'project_admin'),
    membership(mobile, maya, 'member'),
    membership(mobile, arjun, 'member'),
    membership(mobile, marcus, 'member'),
    membership(mobile, zara, 'member'),
    membership(mobile, leo, 'member'),
    membership(mobile, elena, 'member'),

    // Cloud & Infrastructure Hub — 7 members
    membership(cloud, campadmin, 'admin'),
    membership(cloud, sam, 'project_admin'),
    membership(cloud, david, 'member'),
    membership(cloud, arjun, 'member'),
    membership(cloud, elena, 'member'),
    membership(cloud, zara, 'member'),
    membership(cloud, maya, 'member'),

    // Customer Success & Analytics — 6 members
    membership(analytics, campadmin, 'admin'),
    membership(analytics, aisha, 'project_admin'),
    membership(analytics, priya, 'member'),
    membership(analytics, leo, 'member'),
    membership(analytics, david, 'member'),
    membership(analytics, maya, 'member'),
  );

  db.memberOf = function memberOf(userId, projectId) {
    return (
      this.members.find(
        (m) => m.project === projectId && m.user === userId,
      )?.role ?? null
    );
  };

  /* ---------------------------------------------------------- tasks */
  const tasksByTitle = {};
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
      dependsOn: [],
      attachments: [],
      createdAt: ago(daysBack),
      updatedAt: ago(daysBack),
      _dependsOnTitles: spec.dependsOnTitles || [],
    };
    tasksByTitle[spec.title] = t;
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
    spec.comments?.forEach((c) => {
      db.comments.push({
        _id: id('C'),
        content: c.content,
        project: project._id,
        task: t._id,
        author: snapshotOf(c.by),
        createdAt: c.at ? ago(c.at) : t.createdAt,
        updatedAt: c.at ? ago(c.at) : t.createdAt,
      });
    });
    return t;
  };

  // Atlas Web Relaunch tasks: 5 todo, 5 in_progress, 4 done = 14 total
  [
    {
      title: 'Redesign marketing homepage hero',
      description: 'New hero layout with animated gradient background and inline sign-up form.',
      status: 'todo',
      priority: 'HIGH',
      dueDays: 3,
      assignedTo: maya,
      dependsOnTitles: ['Ship v2 design tokens'],
      comments: [
        { by: maya, content: 'Figma mockups are ready. @leo @priya please review the inline sign-up input.', at: 3 },
        { by: leo, content: 'Looks great! Love the animated gradient background styling.', at: 2 },
        { by: priya, content: 'Keeping the form inline should bump sign-ups by 15-20%. Approved!', at: 1 },
      ],
    },
    { title: 'Migrate blog to new CMS', description: 'Move 140 posts off the legacy WP install; preserve slugs and metadata.', status: 'todo', priority: 'MEDIUM', dueDays: 10, assignedTo: leo },
    { title: 'Fix broken pricing links', description: 'Three anchors on /pricing still point at the staging domain.', status: 'todo', priority: 'LOW', dueDays: 1, assignedTo: priya },
    {
      title: 'Implement responsive navigation', description: 'Collapsible menu under 768px, focus trap, Esc-to-close.',
      status: 'in_progress', priority: 'HIGH', dueDays: 2, assignedTo: maya,
      dependsOnTitles: ['Ship v2 design tokens'],
      subtasks: [
        { title: 'Audit current breakpoints', isCompleted: true },
        { title: 'Build the mobile menu', isCompleted: false },
        { title: 'Wire dropdown focus states', isCompleted: false },
      ],
      comments: [
        { by: maya, content: 'Mobile drawer is passing accessibility checks and keyboard trap testing.', at: 2 },
        { by: arjun, content: 'Tested on iPad Air and Pixel 8 — transition is buttery smooth.', at: 1 },
      ],
    },
    {
      title: 'A/B test CTA copy', description: 'Two variants against the current "Get started free" label.',
      status: 'in_progress', priority: 'MEDIUM', dueDays: 7, assignedTo: leo,
      dependsOnTitles: ['Redesign marketing homepage hero'],
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
    {
      title: 'GraphQL gateway federation', description: 'Apollo router supergraph config with auth token propagation.',
      status: 'in_progress', priority: 'HIGH', dueDays: 6, assignedTo: arjun,
      subtasks: [
        { title: 'Define subgraph schema contracts', isCompleted: true },
        { title: 'Test latency overhead in staging', isCompleted: false },
      ],
    },
    {
      title: 'OAuth2 PKCE social login', description: 'Google and GitHub single-sign on integration.',
      status: 'done', priority: 'HIGH', dueDays: -1, assignedTo: elena,
      subtasks: [
        { title: 'Configure OAuth consent screen', isCompleted: true },
        { title: 'Token exchange unit tests', isCompleted: true },
      ],
    },
    {
      title: 'Kubernetes Helm charts & canary deploys', description: 'Automate zero-downtime rolling deploys via ArgoCD.',
      status: 'todo', priority: 'HIGH', dueDays: 8, assignedTo: sam,
      dependsOnTitles: ['OAuth2 PKCE social login', 'GraphQL gateway federation'],
      subtasks: [{ title: 'Write values.yaml production overlay', isCompleted: false }],
    },
    {
      title: 'Automated Playwright E2E test suite', description: 'Smoke tests covering auth, project creation, and board drag-and-drop.',
      status: 'in_progress', priority: 'MEDIUM', dueDays: 4, assignedTo: zara,
      subtasks: [
        { title: 'Set up CI headless browser runner', isCompleted: true },
        { title: 'Add visual regression snapshot assertions', isCompleted: false },
      ],
    },
    {
      title: 'Accessibility & WCAG 2.1 AA audit', description: 'Color contrast check, keyboard navigation, and screen reader labels.',
      status: 'done', priority: 'MEDIUM', dueDays: -3, assignedTo: aisha,
      subtasks: [
        { title: 'Axe-core automated scan', isCompleted: true },
        { title: 'ARIA labels on icon-only buttons', isCompleted: true },
      ],
    },
  ].forEach((spec, i) => task(website, spec, 14 - i));

  // Mobile Application v2 tasks
  [
    { title: 'Onboarding screens', description: 'Three-screen walkthrough with skip and sign-in shortcuts.', status: 'done', priority: 'HIGH', dueDays: -3, assignedTo: maya },
    {
      title: 'Push notification service', description: 'APNs + FCM wiring, deep-link tap handling.',
      status: 'in_progress', priority: 'HIGH', dueDays: 4, assignedTo: arjun,
      dependsOnTitles: ['Onboarding screens'],
      subtasks: [{ title: 'Sandbox APNs key', isCompleted: true }],
    },
    { title: 'Offline task cache', description: 'SQLite mirror of the task list with conflict-last-write-wins.', status: 'todo', priority: 'MEDIUM', dueDays: 9, assignedTo: arjun, dependsOnTitles: ['Onboarding screens'] },
    { title: 'Beta TestFlight invite flow', status: 'todo', priority: 'LOW', dueDays: 12, assignedTo: priya, dependsOnTitles: ['Biometric authentication (FaceID / Fingerprint)', 'Crashlytics wiring'] },
    { title: 'Crashlytics wiring', status: 'done', priority: 'MEDIUM', dueDays: -1, assignedTo: leo },
    {
      title: 'Biometric authentication (FaceID / Fingerprint)', description: 'Keychain storage for refresh tokens protected by LocalAuthentication.',
      status: 'in_progress', priority: 'HIGH', dueDays: 3, assignedTo: marcus,
      subtasks: [
        { title: 'iOS FaceID prompt wiring', isCompleted: true },
        { title: 'Android BiometricPrompt fallback', isCompleted: false },
      ],
    },
    {
      title: 'Deep linking & Universal App Links', description: 'Open specific task details from email notification URLs.',
      status: 'done', priority: 'MEDIUM', dueDays: -2, assignedTo: elena,
      subtasks: [{ title: 'Register apple-app-site-association file', isCompleted: true }],
    },
    {
      title: 'Automated Device Farm testing on iOS 18', description: 'Run test matrix across iPhone 15, iPad Air, and Pixel 8.',
      status: 'todo', priority: 'HIGH', dueDays: 11, assignedTo: zara,
      dependsOnTitles: ['Biometric authentication (FaceID / Fingerprint)'],
      subtasks: [{ title: 'Configure AWS Device Farm pool', isCompleted: false }],
    },
  ].forEach((spec, i) => task(mobile, spec, 12 - i));

  // Cloud & Infrastructure Hub tasks
  [
    {
      title: 'Migrate Redis clusters to Valkey 8.0', description: 'In-place upgrade with replication fallback and memory optimization.',
      status: 'done', priority: 'HIGH', dueDays: -4, assignedTo: sam,
      subtasks: [
        { title: 'Benchmark throughput under load', isCompleted: true },
        { title: 'Perform production cutover during maintenance', isCompleted: true },
      ],
    },
    {
      title: 'Prometheus & Grafana distributed alerting', description: 'Set up P99 latency alerts and Slack/PagerDuty routing.',
      status: 'in_progress', priority: 'HIGH', dueDays: 5, assignedTo: david,
      dependsOnTitles: ['Migrate Redis clusters to Valkey 8.0'],
      subtasks: [
        { title: 'Configure PagerDuty webhooks', isCompleted: true },
        { title: 'Build latency SLO dashboard', isCompleted: false },
      ],
    },
    { title: 'Terraform Infrastructure as Code audit', description: 'Import unmanaged AWS VPC routes and tighten security groups.', status: 'todo', priority: 'MEDIUM', dueDays: 8, assignedTo: sam },
    {
      title: 'Database read-replica load balancing', description: 'Route read queries to Aurora replicas to reduce primary CPU load.',
      status: 'in_progress', priority: 'HIGH', dueDays: 6, assignedTo: arjun,
      subtasks: [{ title: 'Connection pool warm-up script', isCompleted: true }],
    },
    { title: 'Chaos engineering & disaster recovery drill', description: 'Simulate availability zone failure and verify failover time < 30s.', status: 'todo', priority: 'LOW', dueDays: 15, assignedTo: zara },
    {
      title: 'Automated zero-downtime rolling deploys', description: 'Canary health checks before routing 100% of ingress traffic.',
      status: 'done', priority: 'HIGH', dueDays: -1, assignedTo: elena,
      dependsOnTitles: ['Migrate Redis clusters to Valkey 8.0'],
      subtasks: [
        { title: 'Envoy service mesh health check', isCompleted: true },
        { title: 'Automated rollback on error spike', isCompleted: true },
      ],
    },
  ].forEach((spec, i) => task(cloud, spec, 10 - i));

  // Customer Success & Analytics tasks
  [
    {
      title: 'Real-time NPS sentiment analyzer', description: 'Ingest survey scores and run NLP keyword clustering.',
      status: 'in_progress', priority: 'HIGH', dueDays: 4, assignedTo: aisha,
      subtasks: [
        { title: 'Webhook endpoint for Typeform', isCompleted: true },
        { title: 'Sentiment classifier pipeline', isCompleted: false },
      ],
    },
    { title: 'Customer health score scoring model', description: 'Aggregate daily active users, license utilization, and support tickets.', status: 'todo', priority: 'HIGH', dueDays: 7, assignedTo: priya, dependsOnTitles: ['Interactive cohort retention heatmap'] },
    {
      title: 'Zendesk bi-directional ticket sync', description: 'Display customer ticket status directly in customer profile.',
      status: 'done', priority: 'MEDIUM', dueDays: -2, assignedTo: leo,
      subtasks: [
        { title: 'Zendesk API OAuth token integration', isCompleted: true },
        { title: 'Sync rate limiter and backoff logic', isCompleted: true },
      ],
    },
    { title: 'Customer churn prediction pipeline', description: 'Flag accounts with declining 30-day activity.', status: 'todo', priority: 'MEDIUM', dueDays: 10, assignedTo: david, dependsOnTitles: ['Customer health score scoring model'] },
    {
      title: 'Interactive cohort retention heatmap', description: 'Monthly user cohort retention matrix with interactive filters.',
      status: 'done', priority: 'HIGH', dueDays: -5, assignedTo: maya,
      subtasks: [{ title: 'D3 / SVG cohort matrix component', isCompleted: true }],
    },
  ].forEach((spec, i) => task(analytics, spec, 8 - i));

  // Wire up dependsOn IDs
  db.tasks.forEach((t) => {
    if (t._dependsOnTitles && t._dependsOnTitles.length > 0) {
      t.dependsOn = t._dependsOnTitles
        .map((title) => tasksByTitle[title]?._id)
        .filter(Boolean);
      delete t._dependsOnTitles;
    }
  });

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

  // Atlas Web Relaunch notes: 15 notes across all team members (2 pinned)
  [
    { isPinned: true, by: campadmin, at: ago(18), content: 'Sprint 14 kickoff — scope locked: homepage, nav, blog migration, and gateway federation. All 11 team members onboarded.' },
    { isPinned: true, by: maya, at: ago(12), content: 'Design tokens are live in main — use var(--primary) etc. from theme tokens, no more hard-coded values.' },
    { by: leo, at: ago(11, 4), content: 'Homepage hero: legal wants the pricing footnote visible above the fold.' },
    { by: leo, at: ago(10, 6), content: 'CMS migration dry run imported 140/140 posts. 3 had broken image refs — cleaning up in the importer.' },
    { by: priya, at: ago(9, 2), content: 'Reminder: performance budget is LCP < 2.0s on mid-tier Android, not just desktop.' },
    { by: maya, at: ago(8, 5), content: 'Nav focus trap shipped behind a flag — enable with ?navv2=1 on staging to try it.' },
    { by: arjun, at: ago(7, 6), content: 'GraphQL Gateway: Supergraph contract schema defined. Ready for client schema generator.' },
    { by: elena, at: ago(7, 1), content: 'OAuth2 PKCE integration passing security reviews. Google & GitHub providers active in staging.' },
    { by: sam, at: ago(6, 4), content: 'Helm charts updated for multi-region canary rollout. Staging deployment pipelines ready.' },
    { by: zara, at: ago(5, 8), content: 'Playwright test suite covers 42 critical flows. Parallel test runs now finish in under 3 minutes.' },
    { by: marcus, at: ago(4, 3), content: 'Touch target audit completed: button heights adjusted to minimum 44px on mobile devices.' },
    { by: aisha, at: ago(3, 7), content: 'Accessibility review: WCAG 2.1 AA score reached 98/100 across all primary views.' },
    { by: david, at: ago(2, 5), content: 'Pen test completed with zero critical findings. SOC2 compliance report draft ready for review.' },
    { by: campadmin, at: ago(1, 2), content: 'Friday deploy freeze (company all-hands). Canary deployment window confirmed for Thursday 14:00.' },
    { by: maya, at: ago(0, 3), content: 'Sprint 15 candidates: analytics events, nav flag GA, CMS image cleanup. Vote on Monday.' },
  ].forEach((spec) => note(website, spec));

  // Mobile Application v2 notes
  [
    { isPinned: true, by: priya, at: ago(6, 2), content: 'TestFlight build 0.4.2 (214) is up — testers, please focus on the onboarding skip button and biometric auth.' },
    { by: arjun, at: ago(4, 4), content: 'Push permissions primer: ask AFTER the value pitch screen, conversion doubled in the paper prototype.' },
    { by: maya, at: ago(3, 1), content: 'Offline cache: last-write-wins was signed off by the backend team; no merge fields in v1.' },
    { by: marcus, at: ago(2, 6), content: 'Biometric FaceID integration tested on iOS 18 device farm — sub-50ms token retrieval.' },
    { by: elena, at: ago(1, 4), content: 'Universal App Links verified on production domain. Email link taps now deep-link directly into tasks.' },
    { by: zara, at: ago(0, 5), content: 'Crash-free sessions at 99.4% this week across 1,200 active TestFlight installs.' },
  ].forEach((spec) => note(mobile, spec));

  // Cloud & Infrastructure Hub notes
  [
    { isPinned: true, by: sam, at: ago(8, 1), content: 'Cluster upgrade notice: Valkey 8.0 migration completed with zero dropped connections.' },
    { by: david, at: ago(6, 3), content: 'Prometheus alerts configured: warning at 80% CPU over 5m, critical at 95% over 2m.' },
    { by: elena, at: ago(4, 5), content: 'Automated canary rollback triggered successfully in staging during fault-injection test.' },
    { by: arjun, at: ago(2, 2), content: 'Aurora read-replicas handling 68% of total query volume now; primary CPU load dropped by 45%.' },
    { by: campadmin, at: ago(0, 4), content: 'Monthly infrastructure cost down 18% following Redis to Valkey migration and idle container pruning.' },
  ].forEach((spec) => note(cloud, spec));

  // Customer Success & Analytics notes
  [
    { isPinned: true, by: aisha, at: ago(7, 2), content: 'NPS benchmark: current rolling NPS is +54 across enterprise tier users.' },
    { by: priya, at: ago(5, 4), content: 'Health score algorithm weights: 40% active seats, 30% weekly task movements, 30% ticket frequency.' },
    { by: leo, at: ago(3, 6), content: 'Zendesk ticket webhook integration live: tickets now sync in under 3 seconds.' },
    { by: david, at: ago(2, 1), content: 'Churn risk model flagged 4 enterprise accounts with dropping login trends for customer success outreach.' },
    { by: maya, at: ago(0, 2), content: 'Cohort retention dashboard reviewed: month-3 retention rose from 71% to 84% post-redesign.' },
  ].forEach((spec) => note(analytics, spec));

  /* ---------------------------------------------------------- project discussions */
  const discussion = (project, spec) => {
    const author = spec.by;
    db.comments.push({
      _id: id('C'),
      content: spec.content,
      category: spec.category || 'general',
      project: project._id,
      task: null,
      author: {
        ...snapshotOf(author),
        role: db.memberOf(author._id, project._id) || author.role,
      },
      createdAt: spec.at,
      updatedAt: spec.at,
    });
  };

  // Atlas Web Relaunch discussions
  [
    { by: maya, category: 'idea', at: ago(4, 3), content: 'Should we introduce an interactive pipeline dependency graph right on the tasks tab for complex initiatives? Would make tracking upstream blockers effortless for everyone.' },
    { by: leo, category: 'update', at: ago(3, 5), content: 'Sprint 14 marketing assets and hero illustrations are now staging-ready. Team review scheduled for Thursday 14:00.' },
    { by: priya, category: 'question', at: ago(2, 6), content: 'Do we have a confirmed cutoff date for the legacy CMS blog 301 redirects before DNS cutover to the new edge router?' },
    { by: sam, category: 'blocker', at: ago(1, 4), content: 'Notice: Staging Kubernetes cluster will undergo a brief 15-minute rolling upgrade at 16:00 UTC. Deploys will be temporarily queued.' },
    { by: marcus, category: 'general', at: ago(0, 3), content: 'Tested the touch targets and responsive navigation on both tablet and mobile — buttery smooth experience across all screen sizes!' },
    { by: elena, category: 'idea', at: ago(0, 1), content: 'We should consider adding WebAuthn passkey support after the OAuth2 PKCE launch. Several enterprise beta testers requested it.' },
  ].forEach((spec) => discussion(website, spec));

  // Mobile Application v2 discussions
  [
    { by: priya, category: 'update', at: ago(3, 2), content: 'TestFlight build 0.4.2 reached 1,200 active beta testers with a 99.4% crash-free session rate!' },
    { by: arjun, category: 'idea', at: ago(2, 4), content: 'We can preload offline tasks during initial app splash to make cold boot feel virtually instant.' },
    { by: zara, category: 'question', at: ago(1, 1), content: 'Are we testing on both iOS 17 and iOS 18 devices in our AWS Device Farm automation matrix?' },
    { by: marcus, category: 'general', at: ago(0, 5), content: 'Biometric FaceID response latency came in at under 45ms. Great job on the native bridge wiring.' },
  ].forEach((spec) => discussion(mobile, spec));

  // Cloud & Infrastructure discussions
  [
    { by: sam, category: 'update', at: ago(4, 2), content: 'Valkey 8.0 cluster migration concluded successfully. Memory footprint dropped 22% compared to Redis 7.' },
    { by: david, category: 'blocker', at: ago(2, 3), content: 'AWS quota increase request for additional read-replica instances is currently under review by AWS support.' },
    { by: elena, category: 'idea', at: ago(1, 5), content: 'Let us hook up PagerDuty auto-resolution webhooks with Prometheus alerts to avoid stale notification pings.' },
  ].forEach((spec) => discussion(cloud, spec));

  return db;
}
