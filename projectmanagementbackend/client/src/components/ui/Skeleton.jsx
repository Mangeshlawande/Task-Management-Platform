/**
 * Loading placeholder. `aria-hidden` because the surrounding region announces
 * its own busy state — skeletons are decorative.
 */
export function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-border/70 dark:bg-dark-border/60 ${className}`}
      aria-hidden
    />
  );
}
