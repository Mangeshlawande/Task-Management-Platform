import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Boxes,
  KanbanSquare,
  Sparkles,
  ListChecks,
  StickyNote,
  Users,
  ArrowRight,
  Github,
  Twitter,
  Command,
  ShieldCheck,
  FolderKanban,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { ThemeToggle } from '../../components/ui/ThemeToggle.jsx';
import { useAuthStore } from '../../stores/authStore.js';

export function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = Boolean(user);
  return (
    <div className="min-h-screen bg-surface text-foreground dark:bg-dark-surface dark:text-dark-foreground">
      {/* Sticky Glass Navbar */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-surface/80 backdrop-blur-xl dark:border-dark-border/70 dark:bg-dark-surface/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Boxes className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight text-foreground dark:text-dark-foreground">
              Work<span className="text-primary font-bold">Pulse</span>
            </span>
          </Link>

          <nav className="hidden gap-8 text-sm text-muted dark:text-dark-muted md:flex">
            <a href="#features" className="transition hover:text-foreground dark:hover:text-dark-foreground">
              Features
            </a>
            <a href="#workflow" className="transition hover:text-foreground dark:hover:text-dark-foreground">
              Workflow
            </a>
            <a href="#pricing" className="transition hover:text-foreground dark:hover:text-dark-foreground">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isAuthenticated ? (
              <Link to="/projects">
                <Button size="sm" className="flex items-center gap-1.5">
                  Go to workspace <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-muted hover:text-foreground dark:text-dark-muted dark:hover:text-dark-foreground"
                >
                  Sign in
                </Link>
                <Link to="/register">
                  <Button size="sm" className="flex items-center gap-1.5">
                    Get started <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40 dark:opacity-20 pointer-events-none" />
        <div className="absolute left-1/2 top-0 -z-10 h-[500px] w-[1000px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px] dark:bg-dark-primary/15" />
        <div className="mx-auto max-w-7xl px-6 pt-20 pb-16 md:pt-28 md:pb-28">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1 text-xs text-muted backdrop-blur dark:border-dark-border dark:bg-dark-card/80 dark:text-dark-muted shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Fast, focused project management for engineering teams</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl md:text-7xl dark:text-dark-foreground">
              The home base for
              <br />
              your <span className="bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">projects</span>.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base text-muted sm:text-lg dark:text-dark-muted">
              WorkPulse brings your team&apos;s tasks, notes, checklists, and milestones into one fast workspace.
              Clean Kanban, zero clutter, instant performance.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {isAuthenticated ? (
                <Link to="/projects">
                  <Button size="lg" className="flex items-center gap-1.5">
                    Open workspace <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" className="flex items-center gap-1.5">
                      Start free <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button size="lg" variant="outline">
                      Live demo
                    </Button>
                  </Link>
                </>
              )}
            </div>
            <p className="mt-4 text-xs text-muted dark:text-dark-muted">
              No credit card required · Free for teams under 10
            </p>
          </motion.div>

          {/* Hero Preview Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative mx-auto mt-14 max-w-5xl"
          >
            <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-primary/30 to-indigo-500/20 opacity-50 blur-2xl" />
            <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-2xl dark:border-dark-border dark:bg-dark-card">
              <div className="flex items-center gap-1.5 border-b border-border bg-surface-alt/70 px-4 py-3 dark:border-dark-border dark:bg-dark-surface-alt/70">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-3 text-xs text-muted dark:text-dark-muted font-mono">
                  workpulse.io / atlas-relaunch
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
                {[
                  { col: 'To Do', count: 3, dot: 'bg-slate-400' },
                  { col: 'In Progress', count: 4, dot: 'bg-primary' },
                  { col: 'Done', count: 2, dot: 'bg-success' },
                ].map((column) => (
                  <div
                    key={column.col}
                    className="rounded-lg border border-border/80 bg-surface/50 p-3 dark:border-dark-border/80 dark:bg-dark-surface/50"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${column.dot}`} />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted dark:text-dark-muted">
                          {column.col}
                        </span>
                      </div>
                      <span className="rounded bg-surface-alt px-1.5 py-0.5 text-[10px] font-medium text-muted dark:bg-dark-surface-alt dark:text-dark-muted">
                        {column.count}
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {[...Array(column.count)].map((_, i) => (
                        <div
                          key={i}
                          className="rounded-md border border-border bg-card p-3 shadow-xs dark:border-dark-border dark:bg-dark-card"
                        >
                          <div className="h-2.5 w-3/4 rounded bg-surface-alt dark:bg-dark-surface-alt" />
                          <div className="mt-2 h-2 w-1/2 rounded bg-surface-alt/60 dark:bg-dark-surface-alt/60" />
                          <div className="mt-3 flex items-center gap-1">
                            <div className="h-5 w-5 rounded-full bg-primary/80" />
                            <div className="h-5 w-5 -ml-2 rounded-full bg-indigo-500/80 ring-2 ring-card dark:ring-dark-card" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Live Workspace Stats & Active Projects Section */}
      <section className="border-t border-border bg-card/60 py-16 dark:border-dark-border dark:bg-dark-card/40">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Live Workspace Metrics</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-4xl">
              Active projects &amp; team capacity
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted dark:text-dark-muted">
              Real-time snapshot of active engineering projects, leadership coverage, and team members.
            </p>
          </div>

          {/* Stats Counters */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs transition hover:border-primary/40 dark:border-dark-border dark:bg-dark-card">
              <div className="flex items-center justify-between text-muted dark:text-dark-muted">
                <span className="text-xs font-semibold uppercase tracking-wider">Active Projects</span>
                <FolderKanban className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-foreground dark:text-dark-foreground">4</div>
              <p className="mt-1 text-xs text-muted dark:text-dark-muted">Core initiatives in active delivery</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-xs transition hover:border-primary/40 dark:border-dark-border dark:bg-dark-card">
              <div className="flex items-center justify-between text-muted dark:text-dark-muted">
                <span className="text-xs font-semibold uppercase tracking-wider">Team Members</span>
                <Users className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-foreground dark:text-dark-foreground">11</div>
              <p className="mt-1 text-xs text-muted dark:text-dark-muted">Engineers, designers &amp; analysts</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-xs transition hover:border-primary/40 dark:border-dark-border dark:bg-dark-card">
              <div className="flex items-center justify-between text-muted dark:text-dark-muted">
                <span className="text-xs font-semibold uppercase tracking-wider">Project Admins</span>
                <ShieldCheck className="h-5 w-5 text-indigo-500" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-foreground dark:text-dark-foreground">4</div>
              <p className="mt-1 text-xs text-muted dark:text-dark-muted">Scrum masters &amp; project leads</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-xs transition hover:border-primary/40 dark:border-dark-border dark:bg-dark-card">
              <div className="flex items-center justify-between text-muted dark:text-dark-muted">
                <span className="text-xs font-semibold uppercase tracking-wider">Tasks &amp; Subtasks</span>
                <CheckCircle2 className="h-5 w-5 text-amber-500" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-foreground dark:text-dark-foreground">65+</div>
              <p className="mt-1 text-xs text-muted dark:text-dark-muted">33 tasks · 32 subtasks tracked</p>
            </div>
          </div>

          {/* Active Projects Cards */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                name: 'Atlas Web Relaunch',
                desc: 'Enterprise marketing platform rebuild with updated brand system, CMS, and high performance.',
                members: 11,
                admins: 3,
                tasks: 14,
                status: 'Active',
                tag: 'Web & CMS',
              },
              {
                name: 'Mobile Application v2',
                desc: 'Next-gen mobile client — onboarding, biometric auth, and offline cache for field teams.',
                members: 8,
                admins: 2,
                tasks: 8,
                status: 'Active',
                tag: 'iOS & Android',
              },
              {
                name: 'Cloud & Infrastructure Hub',
                desc: 'Multi-region Kubernetes deployment, automated zero-downtime CI/CD pipelines, and observability.',
                members: 7,
                admins: 2,
                tasks: 6,
                status: 'Active',
                tag: 'DevOps & K8s',
              },
              {
                name: 'Customer Success & Analytics',
                desc: 'Customer telemetry ingestion, real-time NPS tracking, health score dashboards, and Zendesk sync.',
                members: 6,
                admins: 2,
                tasks: 5,
                status: 'Active',
                tag: 'Data & Telemetry',
              },
            ].map((proj) => (
              <div
                key={proj.name}
                className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 transition hover:shadow-md hover:border-primary/50 dark:border-dark-border dark:bg-dark-card"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {proj.tag}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {proj.status}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-foreground dark:text-dark-foreground">
                    {proj.name}
                  </h3>
                  <p className="mt-1 text-xs text-muted line-clamp-2 dark:text-dark-muted leading-relaxed">
                    {proj.desc}
                  </p>
                </div>

                <div className="mt-4 border-t border-border/60 pt-3 text-xs text-muted dark:border-dark-border/60 dark:text-dark-muted">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{proj.members} members</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                      <span>{proj.admins} admins</span>
                    </span>
                    <span className="font-medium text-foreground dark:text-dark-foreground">
                      {proj.tasks} tasks
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="border-t border-border bg-surface-alt/40 dark:border-dark-border dark:bg-dark-surface-alt/30">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="mb-16 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Features</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
              Everything your team needs.
              <br />
              <span className="text-muted dark:text-dark-muted">Nothing it doesn&apos;t.</span>
            </h2>
          </div>
          <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border dark:border-dark-border dark:bg-dark-border md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: KanbanSquare,
                title: 'Kanban that just works',
                desc: 'Drag, drop, done. Native fluid motion, keyboard support, and zero latency.',
              },
              {
                icon: ListChecks,
                title: 'Subtasks & checklists',
                desc: 'Break big items into smaller steps. Live progress bars roll up automatically.',
              },
              {
                icon: StickyNote,
                title: 'Notes with markdown',
                desc: 'Project-scoped docs with real-time preview. Searchable, structured, and fast.',
              },
              {
                icon: Users,
                title: 'Members & roles',
                desc: 'Admin, project_admin, member permissions that stay transparent and out of your way.',
              },
              {
                icon: Command,
                title: 'Command palette',
                desc: 'Type ⌘K to jump anywhere — projects, tasks, or settings — in two keystrokes.',
              },
              {
                icon: Sparkles,
                title: 'Optimistic updates',
                desc: 'Instant visual response across tasks and notes, keeping the flow unbroken.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group bg-surface p-6 transition hover:bg-card dark:bg-dark-surface dark:hover:bg-dark-card"
              >
                <f.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-4 text-base font-semibold text-foreground dark:text-dark-foreground">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-muted dark:text-dark-muted leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow & Progress Section */}
      <section id="workflow" className="border-t border-border dark:border-dark-border">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Workflow</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
                A workspace that gets out of your way.
              </h2>
              <p className="mt-6 text-muted dark:text-dark-muted leading-relaxed">
                We obsess over the seconds — the time it takes to create a task, move a card, or find last week&apos;s
                notes. Every interaction is fast, responsive, and predictable.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  'Type ⌘K to jump between projects instantly',
                  'Drag tasks across columns with fluid feedback',
                  'Subtasks automatically roll up to project progress',
                  'Markdown notes scoped cleanly per project',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="mt-1 grid h-5 w-5 place-items-center rounded-full bg-primary/15 text-primary">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    </div>
                    <span className="text-sm text-foreground dark:text-dark-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent blur-2xl" />
              <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-xl dark:border-dark-border dark:bg-dark-card">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted dark:text-dark-muted">
                  Project progress
                </div>
                <div className="mt-3 text-3xl font-bold">68%</div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-alt dark:bg-dark-surface-alt">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: '68%' }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    viewport={{ once: true }}
                    className="h-full bg-gradient-to-r from-primary to-indigo-400"
                  />
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Done', val: 32, bar: 'bg-success' },
                    { label: 'Active', val: 14, bar: 'bg-primary' },
                    { label: 'Backlog', val: 8, bar: 'bg-muted' },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lg border border-border p-3 dark:border-dark-border"
                    >
                      <div className={`mb-2 h-1.5 w-6 rounded-full ${stat.bar}`} />
                      <div className="text-xl font-bold">{stat.val}</div>
                      <div className="text-xs text-muted dark:text-dark-muted">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / Call to Action */}
      <section id="pricing" className="border-t border-border bg-surface-alt/20 dark:border-dark-border dark:bg-dark-surface-alt/10">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Pitch the tent.
            <br />
            Ship the work.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-muted dark:text-dark-muted">
            Free for teams under 10. Start managing your projects with speed and clarity today.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/register">
              <Button size="lg" className="flex items-center gap-1.5">
                Create your workspace <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border dark:border-dark-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted dark:text-dark-muted md:flex-row">
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-primary" />
            <span>© 2026 WorkPulse</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter" className="hover:text-foreground dark:hover:text-dark-foreground">
              <Twitter className="h-4 w-4" />
            </a>
            <a href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub" className="hover:text-foreground dark:hover:text-dark-foreground">
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
