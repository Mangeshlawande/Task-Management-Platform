import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Boxes,
  KanbanSquare,
  Sparkles,
  ListChecks,
  StickyNote,
  Users,
  ArrowRight,
  Command,
  ShieldCheck,
  FolderKanban,
  CheckCircle2,
  Briefcase,
  Palette,
  Megaphone,
  TrendingUp,
  Rocket,
  Globe,
  Terminal,
  Mail,
  MessageSquare,
  Send,
  Check,
  HelpCircle,
  Compass,
  Code2,
  Heart,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { ThemeToggle } from '../../components/ui/ThemeToggle.jsx';
import { useAuthStore } from '../../stores/authStore.js';

export function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = Boolean(user);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface text-foreground dark:bg-dark-surface dark:text-dark-foreground">
      {/* Sticky Glass Navbar */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-surface/80 backdrop-blur-xl dark:border-dark-border/70 dark:bg-dark-surface/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Boxes className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight text-foreground dark:text-dark-foreground">
              Work<span className="text-primary font-bold">Pulse</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden gap-8 text-sm text-muted dark:text-dark-muted md:flex">
            <a href="#features" className="transition hover:text-foreground dark:hover:text-dark-foreground">
              Features
            </a>
            <a href="#solutions" className="transition hover:text-foreground dark:hover:text-dark-foreground">
              Solutions
            </a>
            <a href="#workflow" className="transition hover:text-foreground dark:hover:text-dark-foreground">
              Workflow
            </a>
            <a href="#help" className="transition hover:text-foreground dark:hover:text-dark-foreground">
              Help
            </a>
            <a href="#pricing" className="transition hover:text-foreground dark:hover:text-dark-foreground">
              Pricing
            </a>
            <a href="#contact" className="transition hover:text-foreground dark:hover:text-dark-foreground">
              Contact
            </a>
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-3">
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

          {/* Mobile Right Controls: Theme Toggle & Hamburger Drawer Button */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open mobile navigation menu"
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative ml-auto z-10 flex h-full w-72 max-w-[85vw] flex-col bg-surface p-6 shadow-2xl dark:bg-dark-surface border-l border-border dark:border-dark-border"
            >
              <div className="flex items-center justify-between pb-4 border-b border-border dark:border-dark-border">
                <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                    <Boxes className="h-4 w-4" />
                  </div>
                  <span className="font-semibold tracking-tight text-foreground dark:text-dark-foreground">
                    Work<span className="text-primary font-bold">Pulse</span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close mobile menu"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex flex-col gap-1 py-4 text-sm font-medium">
                <a
                  href="#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-muted hover:bg-surface-alt hover:text-foreground dark:text-dark-muted dark:hover:bg-dark-surface-alt dark:hover:text-dark-foreground transition"
                >
                  Features
                </a>
                <a
                  href="#solutions"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-muted hover:bg-surface-alt hover:text-foreground dark:text-dark-muted dark:hover:bg-dark-surface-alt dark:hover:text-dark-foreground transition"
                >
                  Solutions
                </a>
                <a
                  href="#workflow"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-muted hover:bg-surface-alt hover:text-foreground dark:text-dark-muted dark:hover:bg-dark-surface-alt dark:hover:text-dark-foreground transition"
                >
                  Workflow
                </a>
                <a
                  href="#help"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-muted hover:bg-surface-alt hover:text-foreground dark:text-dark-muted dark:hover:bg-dark-surface-alt dark:hover:text-dark-foreground transition"
                >
                  Help &amp; System Guide
                </a>
                <a
                  href="#pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-muted hover:bg-surface-alt hover:text-foreground dark:text-dark-muted dark:hover:bg-dark-surface-alt dark:hover:text-dark-foreground transition"
                >
                  Pricing
                </a>
                <a
                  href="#contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-muted hover:bg-surface-alt hover:text-foreground dark:text-dark-muted dark:hover:bg-dark-surface-alt dark:hover:text-dark-foreground transition"
                >
                  Contact
                </a>
              </nav>

              <div className="mt-auto border-t border-border pt-4 dark:border-dark-border space-y-2.5">
                {isAuthenticated ? (
                  <Link to="/projects" onClick={() => setMobileMenuOpen(false)} className="w-full block">
                    <Button className="w-full flex items-center justify-center gap-1.5">
                      Go to workspace <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="w-full block">
                      <Button variant="outline" className="w-full">
                        Sign in
                      </Button>
                    </Link>
                    <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="w-full block">
                      <Button className="w-full flex items-center justify-center gap-1.5">
                        Get started <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      {/* Solutions by Team Section */}
      <section id="solutions" className="border-t border-border bg-card/40 py-24 dark:border-dark-border dark:bg-dark-card/30">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Solutions by Team</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-5xl dark:text-dark-foreground">
              Built for the way modern teams ship.
            </h2>
            <p className="mt-4 text-base text-muted dark:text-dark-muted">
              Whether you are orchestrating product sprints, syncing global design reviews, or deploying cloud infrastructure, WorkPulse adapts to your domain.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Briefcase,
                team: 'Product Management',
                color: 'from-blue-500/10 to-indigo-500/10 text-blue-500 dark:text-blue-400',
                border: 'hover:border-blue-500/40',
                badge: 'Roadmap & Sprints',
                desc: 'Turn product strategy into granular, trackable execution across cross-functional teams.',
                useCases: [
                  'Feature backlog refinement & priority tagging',
                  'Subtask completion rollups for release tracking',
                  'Sprint retro discussions in Markdown notes',
                  'Batch task status updates & CSV roadmap export',
                ],
              },
              {
                icon: Palette,
                team: 'Design Teams',
                color: 'from-pink-500/10 to-rose-500/10 text-pink-500 dark:text-pink-400',
                border: 'hover:border-pink-500/40',
                badge: 'Visual Review & Specs',
                desc: 'Centralize UX specs, design asset reviews, and iterative feedback without lost files.',
                useCases: [
                  'Multi-image attachment lightboxes (up to 5 × 1MB)',
                  'Design specification docs with inline markdown',
                  'Component checklist tracking per user story',
                  'Figma & prototype link discussions in task cards',
                ],
              },
              {
                icon: Megaphone,
                team: 'Marketing Teams',
                color: 'from-amber-500/10 to-orange-500/10 text-amber-500 dark:text-amber-400',
                border: 'hover:border-amber-500/40',
                badge: 'Campaigns & Content',
                desc: 'Coordinate go-to-market initiatives, content calendars, and partner launches seamlessly.',
                useCases: [
                  'Multi-channel product launch campaign boards',
                  'Editorial calendar management with due-date alerts',
                  'Cross-functional deliverables & asset sign-off',
                  'Executive campaign summary exports via JSON/CSV',
                ],
              },
              {
                icon: TrendingUp,
                team: 'Management & Leadership',
                color: 'from-emerald-500/10 to-teal-500/10 text-emerald-500 dark:text-emerald-400',
                border: 'hover:border-emerald-500/40',
                badge: 'Portfolio & Workload',
                desc: 'Gain instant high-level visibility into team bandwidth, initiative health, and velocity.',
                useCases: [
                  'Real-time status breakdown charts & project health',
                  'Member capacity and workload balance monitoring',
                  'Role-based governance (Admin, Project Admin, Member)',
                  'One-click data export for stakeholder reporting',
                ],
              },
              {
                icon: Rocket,
                team: 'Startups & Scale-ups',
                color: 'from-violet-500/10 to-purple-500/10 text-violet-500 dark:text-violet-400',
                border: 'hover:border-violet-500/40',
                badge: 'Fast Agile Execution',
                desc: 'Skip bloated enterprise tools. Onboard in seconds and keep everyone aligned on key milestones.',
                useCases: [
                  'Zero-friction onboarding (no verification email gate)',
                  'Rapid task capture via ⌘K keyboard shortcuts',
                  'Fluid, low-latency drag-and-drop Kanban workflow',
                  'All-in-one workspaces eliminating multi-tool sprawl',
                ],
              },
              {
                icon: Globe,
                team: 'Remote & Distributed Teams',
                color: 'from-cyan-500/10 to-sky-500/10 text-cyan-500 dark:text-cyan-400',
                border: 'hover:border-cyan-500/40',
                badge: 'Async Collaboration',
                desc: 'Empower asynchronous alignment across time zones with transparent project ownership.',
                useCases: [
                  'Self-documenting markdown notes replacing standup meetings',
                  'Connection resilience banner with automated background sync',
                  'Transparent task assignments and progress rings',
                  'Optimistic UI keeping team flow uninterrupted anywhere',
                ],
              },
              {
                icon: Terminal,
                team: 'DevOps & Engineering',
                color: 'from-primary/10 to-indigo-500/10 text-primary dark:text-indigo-400',
                border: 'hover:border-primary/40',
                badge: 'Deployments & Incidents',
                desc: 'Track infrastructure migrations, deployment gates, and runbooks with developer speed.',
                useCases: [
                  'Incident mitigation workflows with priority flags',
                  'Release checklist subtasks with instant toggle updates',
                  'Swagger / OpenAPI integration via REST endpoints',
                  'Keyboard-first navigation matching developer IDE speed',
                ],
              },
            ].map((sol) => (
              <div
                key={sol.team}
                className={`group flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-xs transition-all hover:shadow-md dark:border-dark-border dark:bg-dark-card ${sol.border}`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className={`grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br ${sol.color}`}>
                      <sol.icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-surface-alt px-2.5 py-1 text-[11px] font-medium text-muted dark:bg-dark-surface-alt dark:text-dark-muted">
                      {sol.badge}
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-foreground dark:text-dark-foreground">
                    {sol.team}
                  </h3>
                  <p className="mt-1.5 text-xs text-muted dark:text-dark-muted leading-relaxed">
                    {sol.desc}
                  </p>

                  <div className="mt-5 space-y-2 border-t border-border/60 pt-4 dark:border-dark-border/60">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Key Use Cases
                    </p>
                    {sol.useCases.map((uc) => (
                      <div key={uc} className="flex items-start gap-2 text-xs text-foreground dark:text-dark-foreground">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span>{uc}</span>
                      </div>
                    ))}
                  </div>
                </div>
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

      {/* Help & System Workflow Overview Section */}
      <section id="help" className="border-t border-border bg-card/60 py-24 dark:border-dark-border dark:bg-dark-card/40">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
              <Compass className="h-3.5 w-3.5" />
              <span>System Overview &amp; Help Center</span>
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl dark:text-dark-foreground">
              Master the WorkPulse workflow.
            </h2>
            <p className="mt-4 text-base text-muted dark:text-dark-muted">
              Everything you need to know about how projects, Kanban pipelines, 3-tier RBAC permissions, and keyboard workflows operate together.
            </p>
          </div>

          {/* 4-Step System Workflow Lifecycle */}
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: '01',
                title: 'Workspace & Setup',
                subtitle: 'Projects & Team Roster',
                icon: Boxes,
                color: 'text-primary bg-primary/10 border-primary/20',
                desc: 'Instant zero-wait sign-up. Create isolated project containers and invite team members with role-based access.',
                highlights: [
                  'Zero email verification gate',
                  'Admin, Project Admin & Member roles',
                  'Project-scoped data boundaries',
                ],
              },
              {
                step: '02',
                title: 'Kanban Sprint',
                subtitle: 'Optimistic Drag-and-Drop',
                icon: KanbanSquare,
                color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
                desc: 'Move cards with @dnd-kit zero latency. Tasks carry priorities, due dates, attachments, and rolling subtask progress.',
                highlights: [
                  'Subtask progress rings on cards',
                  'Multi-image lightbox attachments',
                  'Automatic network rollback on error',
                ],
              },
              {
                step: '03',
                title: 'Docs & Discussions',
                subtitle: 'Markdown Knowledge Base',
                icon: StickyNote,
                color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
                desc: 'Keep RFCs, specs, and sprint retrospectives directly in context. Pin critical documentation to the top of the grid.',
                highlights: [
                  'Markdown live editor with preview',
                  'Optimistic note pinning & sorting',
                  'Server-mirrored 12/page pagination',
                ],
              },
              {
                step: '04',
                title: '⌘K Speed & Sync',
                subtitle: 'Keyboard Navigation & Health',
                icon: Command,
                color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
                desc: 'Jump anywhere in 2 keystrokes with the command palette. Ambient connection banner monitors backend health automatically.',
                highlights: [
                  'Global ⌘K / Ctrl+K fuzzy launcher',
                  '5s healthcheck probe & live recovery',
                  'One-click CSV & JSON reporting',
                ],
              },
            ].map((card) => (
              <div
                key={card.step}
                className="relative flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-xs transition hover:shadow-md hover:border-primary/40 dark:border-dark-border dark:bg-dark-card"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-muted-foreground">{card.step}</span>
                    <div className={`grid h-9 w-9 place-items-center rounded-lg border ${card.color}`}>
                      <card.icon className="h-4 w-4" />
                    </div>
                  </div>

                  <h3 className="mt-4 text-base font-bold text-foreground dark:text-dark-foreground">
                    {card.title}
                  </h3>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    {card.subtitle}
                  </div>
                  <p className="mt-2 text-xs text-muted dark:text-dark-muted leading-relaxed">
                    {card.desc}
                  </p>
                </div>

                <div className="mt-5 space-y-1.5 border-t border-border/60 pt-4 dark:border-dark-border/60">
                  {card.highlights.map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs text-foreground dark:text-dark-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Quick FAQ / System Concepts */}
          <div className="mt-16 rounded-2xl border border-border bg-surface-alt/40 p-6 md:p-10 dark:border-dark-border dark:bg-dark-surface-alt/30">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <HelpCircle className="h-4 w-4" />
              <span>Frequently Asked Questions &amp; System Concepts</span>
            </div>
            <h3 className="mt-2 text-xl font-bold sm:text-2xl text-foreground dark:text-dark-foreground">
              Everything you need to know before shipping.
            </h3>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-5 dark:border-dark-border dark:bg-dark-card">
                <h4 className="font-semibold text-foreground dark:text-dark-foreground">
                  How do optimistic updates work during network lag?
                </h4>
                <p className="mt-2 text-xs text-muted dark:text-dark-muted leading-relaxed">
                  When you drag a Kanban task or toggle a subtask, the client Zustand store updates the DOM immediately without waiting for a server round-trip. The native API client syncs in the background. If a network error occurs, the action automatically reverts to its original position and raises a non-blocking toast alert.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 dark:border-dark-border dark:bg-dark-card">
                <h4 className="font-semibold text-foreground dark:text-dark-foreground">
                  How does the 3-tier Role-Based Access Control (RBAC) work?
                </h4>
                <p className="mt-2 text-xs text-muted dark:text-dark-muted leading-relaxed">
                  Permissions are validated per-project via server middleware (validateProjectPermission). Admins have complete project authority; Project Admins manage tasks, notes, and member invites; and Team Members can view everything and update their own assigned task completion status.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 dark:border-dark-border dark:bg-dark-card">
                <h4 className="font-semibold text-foreground dark:text-dark-foreground">
                  Can I evaluate the app without configuring MongoDB?
                </h4>
                <p className="mt-2 text-xs text-muted dark:text-dark-muted leading-relaxed">
                  Yes! WorkPulse ships with a zero-dependency <strong>Mock Mode</strong>. Running <code className="rounded bg-surface-alt px-1 py-0.5 text-[11px] font-mono">npm run dev:mock</code> intercepts network requests in the browser, providing instant access to seeded projects, tasks, member pipelines, and notes without requiring local databases.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 dark:border-dark-border dark:bg-dark-card">
                <h4 className="font-semibold text-foreground dark:text-dark-foreground">
                  How is sensitive authentication token data secured?
                </h4>
                <p className="mt-2 text-xs text-muted dark:text-dark-muted leading-relaxed">
                  WorkPulse uses dual JWT tokens: short-lived 15-minute access tokens and 7-day refresh tokens stored in <code className="rounded bg-surface-alt px-1 py-0.5 text-[11px] font-mono">httpOnly</code>, <code className="rounded bg-surface-alt px-1 py-0.5 text-[11px] font-mono">SameSite=Lax</code> cookies inaccessible to malicious client scripts. Silent token rotation occurs automatically before token expiration.
                </p>
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

      {/* Contact Section */}
      <section id="contact" className="border-t border-border bg-surface-alt/30 py-24 dark:border-dark-border dark:bg-dark-surface-alt/20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Get in Touch</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-5xl dark:text-dark-foreground">
              Let&apos;s build something great together.
            </h2>
            <p className="mt-4 text-base text-muted dark:text-dark-muted">
              Have questions about WorkPulse, want to request features, or interested in collaborating? Connect directly with the creator.
            </p>
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-12">
            {/* Quick Contact Cards */}
            <div className="space-y-4 lg:col-span-5">
              <a
                href="mailto:mangeshlawande223@gmail.com"
                className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 transition hover:border-primary/50 hover:shadow-md dark:border-dark-border dark:bg-dark-card"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted dark:text-dark-muted">
                    Direct Email
                  </div>
                  <div className="mt-1 font-medium text-foreground dark:text-dark-foreground">
                    mangeshlawande223@gmail.com
                  </div>
                  <p className="mt-1 text-xs text-muted dark:text-dark-muted">
                    Response time: within 24 hours
                  </p>
                </div>
              </a>

              <a
                href="#help"
                className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 transition hover:border-primary/50 hover:shadow-md dark:border-dark-border dark:bg-dark-card"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-indigo-500/10 text-indigo-500 transition group-hover:bg-indigo-500 group-hover:text-white">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted dark:text-dark-muted">
                    System Architecture Guide
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 font-medium text-foreground dark:text-dark-foreground">
                    Explore WorkPulse System Workflow
                    <ArrowRight className="h-3.5 w-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="mt-1 text-xs text-muted dark:text-dark-muted">
                    Learn data flow, RBAC permissions &amp; keyboard shortcuts
                  </p>
                </div>
              </a>

              <div className="rounded-xl border border-border bg-card p-5 dark:border-dark-border dark:bg-dark-card">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground dark:text-dark-foreground">
                      Mangesh Lawande
                    </h4>
                    <p className="text-xs text-muted dark:text-dark-muted">
                      Full-Stack Software Engineer &amp; Creator
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted dark:text-dark-muted leading-relaxed">
                  Open for full-time software engineering roles, high-impact consulting, and tech discussions.
                </p>
              </div>
            </div>

            {/* Interactive Message / Feedback Box */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm dark:border-dark-border dark:bg-dark-card lg:col-span-7">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface-alt/40 pt-16 pb-12 dark:border-dark-border dark:bg-dark-surface-alt/20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
            {/* Col 1: Brand & Creator */}
            <div className="lg:col-span-2 space-y-4">
              <Link to="/" className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                  <Boxes className="h-4 w-4" />
                </div>
                <span className="text-lg font-bold tracking-tight text-foreground dark:text-dark-foreground">
                  Work<span className="text-primary font-bold">Pulse</span>
                </span>
              </Link>
              <p className="max-w-sm text-xs text-muted dark:text-dark-muted leading-relaxed">
                Modern full-stack collaborative workspace engineered for engineering, design, marketing, and leadership teams. Focused on speed, optimistic UI, and keyboard-first simplicity.
              </p>
              <div className="pt-2 text-xs text-muted dark:text-dark-muted">
                Designed &amp; Engineered by{' '}
                <span className="font-semibold text-foreground dark:text-dark-foreground">
                  Mangesh Lawande
                </span>
              </div>
            </div>

            {/* Col 2: Product & Features */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground dark:text-dark-foreground">
                Product
              </h4>
              <ul className="space-y-2 text-xs text-muted dark:text-dark-muted">
                <li><a href="#features" className="hover:text-foreground dark:hover:text-dark-foreground transition">Kanban Pipeline</a></li>
                <li><a href="#workflow" className="hover:text-foreground dark:hover:text-dark-foreground transition">⌘K Command Palette</a></li>
                <li><a href="#features" className="hover:text-foreground dark:hover:text-dark-foreground transition">Markdown Notes</a></li>
                <li><a href="#workflow" className="hover:text-foreground dark:hover:text-dark-foreground transition">Status Donut Chart</a></li>
                <li><a href="#features" className="hover:text-foreground dark:hover:text-dark-foreground transition">CSV &amp; JSON Export</a></li>
              </ul>
            </div>

            {/* Col 3: Solutions */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground dark:text-dark-foreground">
                Solutions
              </h4>
              <ul className="space-y-2 text-xs text-muted dark:text-dark-muted">
                <li><a href="#solutions" className="hover:text-foreground dark:hover:text-dark-foreground transition">Product Management</a></li>
                <li><a href="#solutions" className="hover:text-foreground dark:hover:text-dark-foreground transition">Design Teams</a></li>
                <li><a href="#solutions" className="hover:text-foreground dark:hover:text-dark-foreground transition">Marketing Teams</a></li>
                <li><a href="#solutions" className="hover:text-foreground dark:hover:text-dark-foreground transition">DevOps &amp; Engineering</a></li>
                <li><a href="#solutions" className="hover:text-foreground dark:hover:text-dark-foreground transition">Remote &amp; Startups</a></li>
              </ul>
            </div>

            {/* Col 4: Help & Resources */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground dark:text-dark-foreground">
                Help &amp; Resources
              </h4>
              <ul className="space-y-2 text-xs text-muted dark:text-dark-muted">
                <li><a href="#help" className="hover:text-foreground dark:hover:text-dark-foreground transition">System Workflow Guide</a></li>
                <li><a href="#contact" className="hover:text-foreground dark:hover:text-dark-foreground transition">Get in Touch</a></li>
                <li><span className="text-[11px] text-muted-foreground">Swagger API (/api-docs)</span></li>
                <li><span className="text-[11px] text-muted-foreground">MIT Licensed Open Source</span></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-xs text-muted dark:border-dark-border dark:text-dark-muted md:flex-row">
            <div className="flex items-center gap-1.5">
              <span>© 2026 WorkPulse. Built with React 19, Express 5 &amp; MongoDB by Mangesh Lawande.</span>
            </div>
            <div className="flex items-center gap-5">
              <a
                href="mailto:mangeshlawande223@gmail.com"
                className="hover:text-foreground dark:hover:text-dark-foreground transition"
              >
                mangeshlawande223@gmail.com
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    role: 'Recruiter / Hiring Manager',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center p-6">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
          <Check className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-xl font-bold text-foreground dark:text-dark-foreground">Message received!</h3>
        <p className="mt-2 max-w-sm text-sm text-muted dark:text-dark-muted">
          Thank you for reaching out, {formData.name}. We will get back to you at {formData.email} shortly.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-6"
          onClick={() => {
            setSubmitted(false);
            setFormData({ name: '', email: '', message: '', role: 'Recruiter / Hiring Manager' });
          }}
        >
          Send another note
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground dark:text-dark-foreground">
        <MessageSquare className="h-4 w-4 text-primary" />
        <span>Send a Quick Message or Feedback</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground dark:text-dark-foreground">Your Name</label>
          <input
            type="text"
            required
            placeholder="Alex Johnson"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary dark:border-dark-border dark:bg-dark-surface"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground dark:text-dark-foreground">Your Email</label>
          <input
            type="email"
            required
            placeholder="alex@company.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary dark:border-dark-border dark:bg-dark-surface"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground dark:text-dark-foreground">You are a...</label>
        <select
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary dark:border-dark-border dark:bg-dark-surface"
        >
          <option>Recruiter / Hiring Manager</option>
          <option>Engineering Lead / CTO</option>
          <option>Product / Design Collaborator</option>
          <option>Fellow Open-Source Developer</option>
          <option>Other</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground dark:text-dark-foreground">Message</label>
        <textarea
          rows={4}
          required
          placeholder="Hi Mangesh, loved the WorkPulse project! Would love to connect about..."
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary dark:border-dark-border dark:bg-dark-surface resize-none"
        />
      </div>

      <Button type="submit" className="w-full justify-center gap-2">
        <Send className="h-4 w-4" /> Send Message
      </Button>
    </form>
  );
}
