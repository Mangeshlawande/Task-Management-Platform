import { construction } from './placeholder-data.js';

/**
 * P3 placeholder — the kanban board ships in the next pass (docs/05 P3).
 * The route already exists so the shell's tabs are complete and deep-linkable.
 */
export function BoardPage() {
  return (
    <div className="app-card grid place-items-center px-6 py-16 text-center">
      <div>
        <p className="text-4xl" aria-hidden>
          {construction.emoji}
        </p>
        <h2 className="mt-3 text-lg font-semibold text-foreground dark:text-dark-foreground">
          {construction.title}
        </h2>
        <p className="mt-1 max-w-sm text-sm text-muted dark:text-dark-muted">
          {construction.description}
        </p>
      </div>
    </div>
  );
}
