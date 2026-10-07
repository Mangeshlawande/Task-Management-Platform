/**
 * Status breakdown donut — docs/07 § 2.4 / TESTCASES DASH-01 + DASH-03.
 *
 * Hand-rolled SVG (stroke-dasharray), no chart library: docs/02's stack table
 * has no charting dep and adding one needs approval. Numbers come from the
 * dashboard endpoint (`stats`), so segments always match the kanban columns.
 *
 * Empty project (total === 0): renders a zeroed ring + "No tasks yet" —
 * no NaN, no blank (DASH-03).
 */
const SEGMENTS = [
  { key: 'todo', label: 'To do', className: 'stroke-slate-400 dark:stroke-slate-500' },
  { key: 'in_progress', label: 'In progress', className: 'stroke-primary' },
  { key: 'done', label: 'Done', className: 'stroke-success' },
];

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 263.9

export function StatusBreakdownChart({ stats }) {
  const total = stats.total ?? 0;
  const safeTotal = total > 0 ? total : 1; // avoid /0 — only used for widths

  let offset = 0;
  const segments = SEGMENTS.map((segment) => {
    const count = stats[segment.key] ?? 0;
    const fraction = count / safeTotal;
    const dash = fraction * CIRCUMFERENCE;
    const segmentData = {
      ...segment,
      count,
      percent: total > 0 ? Math.round(fraction * 100) : 0,
      dashOffset: -offset,
    };
    offset += dash;
    return segmentData;
  });

  return (
    <div className="app-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground dark:text-dark-foreground">
            Status breakdown
          </h2>
          <p className="mt-0.5 text-xs text-muted dark:text-dark-muted">
            {total > 0
              ? `${total} task${total === 1 ? '' : 's'} across the board`
              : 'No tasks yet'}
          </p>
        </div>

        <div className="flex items-center gap-5">
          {/* Legend */}
          <ul className="space-y-1.5">
            {segments.map((segment) => (
              <li
                key={segment.key}
                className="flex items-center gap-2 text-xs text-muted dark:text-dark-muted"
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    {
                      todo: 'bg-slate-400 dark:bg-slate-500',
                      in_progress: 'bg-primary',
                      done: 'bg-success',
                    }[segment.key]
                  }`}
                  aria-hidden
                />
                <span className="w-20">{segment.label}</span>
                <span className="font-medium text-foreground dark:text-dark-foreground">
                  {segment.count}
                </span>
                <span className="w-9 text-right">{segment.percent}%</span>
              </li>
            ))}
          </ul>

          {/* Donut */}
          <svg
            viewBox="0 0 100 100"
            className="h-28 w-28 shrink-0 -rotate-90"
            role="img"
            aria-label={
              total > 0
                ? `Task status: ${segments
                    .map((s) => `${s.count} ${s.label}`)
                    .join(', ')}`
                : 'No tasks yet'
            }
          >
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              className="fill-none stroke-border/60 dark:stroke-dark-border/60"
              strokeWidth="10"
            />
            {total > 0 &&
              segments
                .filter((segment) => segment.count > 0)
                .map((segment) => (
                  <circle
                    key={segment.key}
                    cx="50"
                    cy="50"
                    r={RADIUS}
                    className={`fill-none ${segment.className}`}
                    strokeWidth="10"
                    strokeLinecap="butt"
                    strokeDasharray={`${segment.dash} ${CIRCUMFERENCE - segment.dash}`}
                    strokeDashoffset={segment.dashOffset}
                  />
                ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
