const variants = {
  neutral:
    'bg-surface-alt text-muted border-border dark:bg-dark-surface-alt dark:text-dark-muted dark:border-dark-border',
  primary: 'bg-primary/10 text-primary border-primary/20 dark:text-dark-primary',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  danger: 'bg-danger/10 text-danger border-danger/20',
};

const sizes = { sm: 'px-2 py-0.5 text-[11px]', md: 'px-2.5 py-1 text-xs' };

export function Badge({ variant = 'neutral', size = 'sm', className = '', children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
}
