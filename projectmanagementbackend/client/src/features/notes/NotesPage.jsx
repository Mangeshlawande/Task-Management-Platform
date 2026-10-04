import { construction } from '../board/placeholder-data.js';

/**
 * P4 placeholder — the notes grid ships in the P4 pass (docs/05 P4).
 * The route already exists so the shell's tabs are complete and deep-linkable.
 */
export function NotesPage() {
  return (
    <div className="app-card grid place-items-center px-6 py-16 text-center">
      <div>
        <p className="text-4xl" aria-hidden>
          {construction.emoji}
        </p>
        <h2 className="mt-3 text-lg font-semibold text-foreground dark:text-dark-foreground">
          Notes — coming in the P4 pass
        </h2>
        <p className="mt-1 max-w-sm text-sm text-muted dark:text-dark-muted">
          Paginated notes grid with pinning and role-gated editing arrives with
          the notes feature.
        </p>
      </div>
    </div>
  );
}
