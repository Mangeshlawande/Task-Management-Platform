import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

/**
 * Status breakdown chart for project dashboard.
 * Uses the same Recharts donut/pie chart as TaskDistributionChart in DashboardPage.
 */
export function StatusBreakdownChart({ stats }) {
  const total = stats?.total ?? 0;

  const statusData = [
    {
      name: 'To Do',
      value: stats?.todo ?? 0,
      fill: 'oklch(0.6 0.02 264)',
    },
    {
      name: 'In Progress',
      value: stats?.in_progress ?? 0,
      fill: 'oklch(0.72 0.18 277)',
    },
    {
      name: 'Done',
      value: stats?.done ?? 0,
      fill: 'oklch(0.62 0.16 155)',
    },
  ];

  const hasData = total > 0;
  const chartData = hasData
    ? statusData.filter((d) => d.value > 0)
    : [{ name: 'No tasks', value: 1, fill: 'oklch(0.6 0.02 264 / 0.15)' }];

  return (
    <div className="w-full min-w-0 app-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Status breakdown</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {total > 0
              ? `${total} task${total === 1 ? '' : 's'} across the board`
              : 'No tasks yet'}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={40}
                outerRadius={70}
                strokeWidth={2}
                stroke="var(--color-card)"
              >
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Pie>
              {hasData && (
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-popover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    fontSize: 12,
                    color: 'var(--color-popover-foreground)',
                  }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2.5">
          {statusData.map((s) => {
            const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
            return (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-foreground font-medium">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.fill }} />
                  {s.name}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{s.value}</span>
                  <span className="w-10 text-right text-muted-foreground text-[11px]">
                    ({pct}%)
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
