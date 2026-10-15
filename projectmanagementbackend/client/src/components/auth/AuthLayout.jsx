import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle.jsx';

export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col justify-between px-6 py-8 sm:px-12 md:py-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-[oklch(0.62_0.2_310)] text-primary-foreground shadow-sm">
              <Activity className="h-4 w-4" />
            </div>
            <span className="font-display text-sm font-semibold tracking-tight text-foreground">
              Work<span className="text-primary font-bold">Pulse</span>
            </span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="my-auto w-full max-w-sm self-center py-10">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          )}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-muted-foreground">{footer}</div>}
        </div>

        <div className="text-xs text-muted-foreground">© 2026 WorkPulse</div>
      </div>

      {/* Decorative side */}
      <div className="relative hidden overflow-hidden border-l border-border bg-gradient-to-br from-[oklch(0.2_0.05_277)] to-[oklch(0.18_0.04_310)] lg:block">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-[oklch(0.5_0.25_310)]/30 blur-3xl animate-pulse" />
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <blockquote className="font-display text-2xl font-light leading-snug">
            &ldquo;WorkPulse replaced four tools for our team. The pipeline board is the fastest I&rsquo;ve used &mdash; and &#x2318;K feels like cheating.&rdquo;
          </blockquote>
          <div className="mt-6 text-sm opacity-80">&mdash; Jordan Lee, Head of Product</div>
        </div>
      </div>
    </div>
  );
}
