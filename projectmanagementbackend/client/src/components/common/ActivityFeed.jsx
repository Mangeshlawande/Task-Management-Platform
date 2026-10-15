import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  CheckCircle2,
  Clock,
  FolderOpen,
  HelpCircle,
  Lightbulb,
  Megaphone,
  MessageSquare,
  StickyNote,
  UserPlus,
  AlertTriangle,
} from 'lucide-react';
import { Avatar, Badge } from '../ui/index.js';
import { fromNow } from '../../lib/format.js';

export function ActivityFeed({
  activities = [],
  title = 'Activity',
  showFilters = true,
  maxItems = 8,
  emptyMessage = 'No recent activity yet.',
  className = '',
}) {
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(false);

  const filtered = activities.filter((act) => {
    if (filter === 'all') return true;
    if (filter === 'tasks') return act.type === 'task' || act.type === 'task_status';
    if (filter === 'comments') return act.type === 'comment';
    if (filter === 'notes') return act.type === 'note';
    if (filter === 'members') return act.type === 'member';
    return true;
  });

  const displayList = expanded ? filtered : filtered.slice(0, maxItems);

  const getActionIcon = (act) => {
    switch (act.type) {
      case 'task_status':
        return act.status === 'done' ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
        ) : (
          <Clock className="h-3.5 w-3.5 text-primary" />
        );
      case 'comment':
        if (act.badge === 'Idea') return <Lightbulb className="h-3.5 w-3.5 text-purple-500" />;
        if (act.badge === 'Blocker') return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
        if (act.badge === 'Update') return <Megaphone className="h-3.5 w-3.5 text-emerald-500" />;
        if (act.badge === 'Question') return <HelpCircle className="h-3.5 w-3.5 text-amber-500" />;
        return <MessageSquare className="h-3.5 w-3.5 text-sky-500" />;
      case 'note':
        return <StickyNote className="h-3.5 w-3.5 text-amber-500" />;
      case 'member':
        return <UserPlus className="h-3.5 w-3.5 text-blue-500" />;
      default:
        return <Activity className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className={`rounded-xl border border-border bg-card shadow-sm dark:border-dark-border dark:bg-dark-card ${className}`}>
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border px-5 py-3.5 dark:border-dark-border">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground dark:text-dark-foreground">
            {title}
          </h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {filtered.length}
          </span>
        </div>

        {/* Filter Pills */}
        {showFilters && activities.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-[11px]">
            {[
              { id: 'all', label: 'All' },
              { id: 'tasks', label: 'Tasks' },
              { id: 'comments', label: 'Discussions' },
              { id: 'notes', label: 'Notes' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded px-2 py-0.5 font-medium transition ${
                  filter === f.id
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Activity Items List */}
      <ul className="divide-y divide-border/60 dark:divide-dark-border/60">
        {displayList.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-3 px-5 py-3.5 text-xs transition hover:bg-muted/40 dark:hover:bg-dark-muted/20"
          >
            <Avatar user={item.actor} size="sm" />

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1 leading-snug">
                <span className="font-semibold text-foreground dark:text-dark-foreground">
                  {item.actor?.fullName || item.actor?.username || 'Team member'}
                </span>
                <span className="text-muted-foreground">{item.action}</span>
                {item.link ? (
                  <Link
                    to={item.link}
                    className="font-medium text-foreground hover:text-primary transition-colors underline decoration-border/60 underline-offset-2 hover:decoration-primary"
                  >
                    {item.target}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">{item.target}</span>
                )}
              </div>

              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  {getActionIcon(item)}
                  <span>{fromNow(item.timestamp)}</span>
                </span>
                {item.projectName && (
                  <>
                    <span>·</span>
                    <span className="truncate max-w-[150px]">{item.projectName}</span>
                  </>
                )}
              </div>
            </div>

            {item.badge && (
              <Badge variant={item.badgeTone || 'neutral'} size="sm" className="shrink-0 text-[10px]">
                {item.badge}
              </Badge>
            )}
          </li>
        ))}

        {filtered.length === 0 && (
          <li className="px-5 py-8 text-center text-xs text-muted-foreground">
            {emptyMessage}
          </li>
        )}
      </ul>

      {/* Expand / Collapse Action */}
      {filtered.length > maxItems && (
        <div className="border-t border-border px-5 py-2.5 text-center dark:border-dark-border">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="text-xs font-medium text-primary hover:underline"
          >
            {expanded ? 'Show less' : `View all ${filtered.length} activities`}
          </button>
        </div>
      )}
    </div>
  );
}
