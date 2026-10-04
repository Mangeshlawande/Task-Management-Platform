import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring/40 shadow-sm',
  outline:
    'border border-border bg-card text-foreground hover:bg-surface-alt dark:border-dark-border dark:bg-dark-card dark:text-dark-foreground dark:hover:bg-dark-surface-alt focus-visible:ring-ring/40',
  ghost:
    'text-muted hover:bg-surface-alt hover:text-foreground dark:text-dark-muted dark:hover:bg-dark-surface-alt dark:hover:text-dark-foreground',
  danger: 'bg-danger text-white hover:bg-danger/90 focus-visible:ring-danger/40',
};

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  children,
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition
        focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60
        ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
