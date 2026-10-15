const variants = {
  neutral:
    'bg-secondary text-secondary-foreground border-border',
  secondary:
    'bg-secondary text-secondary-foreground border-border',
  primary:
    'bg-primary/15 text-primary border-primary/30 font-semibold',
  success:
    'bg-success/15 text-success border-success/30 font-semibold',
  warning:
    'bg-warning/15 text-warning border-warning/30 font-semibold',
  danger:
    'bg-destructive/15 text-destructive border-destructive/30 font-semibold',
  destructive:
    'bg-destructive/15 text-destructive border-destructive/30 font-semibold',
  default:
    'bg-primary text-primary-foreground border-transparent',
  outline:
    'bg-transparent text-foreground border-border',
};

const sizes = { sm: 'px-2 py-0.5 text-[11px]', md: 'px-2.5 py-1 text-xs' };

export function Badge({ variant = 'neutral', size = 'sm', className = '', children }) {
  const badgeStyle = variants[variant] || variants.neutral;
  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${badgeStyle} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
}
