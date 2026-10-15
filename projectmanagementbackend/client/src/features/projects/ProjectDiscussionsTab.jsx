import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  AtSign,
  Eye,
  HelpCircle,
  Lightbulb,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { useProject } from '../../components/layout/ProjectLayout.jsx';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Skeleton,
} from '../../components/ui/index.js';
import { commentsApi } from '../../api/comments.js';
import { fromNow, roleBadgeVariant, roleLabel } from '../../lib/format.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useCacheStore } from '../../stores/cacheStore.js';
import { toast } from '../../stores/uiStore.js';
import { renderMarkdown } from '../notes/renderMarkdown.js';

const CATEGORIES = [
  {
    id: 'general',
    label: 'General',
    icon: MessageSquare,
    badgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
    color: 'text-sky-600 dark:text-sky-400',
    description: 'General thoughts and team discussions',
  },
  {
    id: 'idea',
    label: 'Idea / Suggestion',
    icon: Lightbulb,
    badgeClass: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20',
    color: 'text-violet-600 dark:text-violet-400',
    description: 'Proposals, design perspectives, and innovations',
  },
  {
    id: 'update',
    label: 'Project Update',
    icon: Megaphone,
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    color: 'text-emerald-600 dark:text-emerald-400',
    description: 'Status milestones, releases, and announcements',
  },
  {
    id: 'question',
    label: 'Question',
    icon: HelpCircle,
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    color: 'text-amber-600 dark:text-amber-400',
    description: 'Clarifications, technical questions, and help needed',
  },
  {
    id: 'blocker',
    label: 'Blocker / Risk',
    icon: AlertTriangle,
    badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
    color: 'text-rose-600 dark:text-rose-400',
    description: 'Roadblocks, risks, and external dependencies',
  },
];

const categoryMeta = (cat) =>
  CATEGORIES.find((c) => c.id === cat) || CATEGORIES[0];

/**
 * Render rich sanitized Markdown with headers, code blocks, lists, quotes, links, and @mentions.
 */
function FormattedContent({ text }) {
  if (!text) return null;
  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 dark:text-dark-foreground/90 leading-relaxed break-words"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
    />
  );
}

export function ProjectDiscussionsTab() {
  const { project, members, tasks, myRole } = useProject();
  const currentUser = useAuthStore((s) => s.user);

  const projectId = project?._id;
  const cached = useCacheStore.getState().get(`/api/v1/projects/${projectId}/comments`);

  const [comments, setComments] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);

  // Compose State
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [composeTab, setComposeTab] = useState('write'); // 'write' | 'preview'

  // Filters
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [authorFilter, setAuthorFilter] = useState('all');

  const loadComments = async (silent = false) => {
    if (!projectId) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await commentsApi.listProjectComments(projectId);
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      if (!silent) {
        setError(err?.message || 'Could not load project discussions.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadComments(Boolean(cached));
  }, [projectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error('Please enter a comment or viewpoint.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await commentsApi.addProjectComment(projectId, {
        content: content.trim(),
        category,
        taskId: selectedTaskId || undefined,
      });

      // Optimistically add to top of feed
      setComments((prev) => [created, ...prev.filter((c) => c._id !== created._id)]);
      setContent('');
      setSelectedTaskId('');
      toast.success('Your viewpoint has been posted.');
    } catch (err) {
      toast.error(err?.message || 'Failed to post viewpoint.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Delete this viewpoint?')) return;
    try {
      await commentsApi.deleteProjectComment(projectId, commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
      toast.success('Discussion item removed.');
    } catch (err) {
      toast.error(err?.message || 'Could not delete discussion item.');
    }
  };

  const handleMentionClick = (username) => {
    setContent((prev) => {
      const mention = `@${username} `;
      return prev.endsWith(' ') || prev.length === 0 ? prev + mention : prev + ' ' + mention;
    });
  };

  // Filtered comments
  const filteredComments = useMemo(() => {
    return comments.filter((c) => {
      if (filterCategory !== 'all' && (c.category || 'general') !== filterCategory) {
        return false;
      }
      if (authorFilter !== 'all' && c.author?._id !== authorFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const contentMatch = c.content?.toLowerCase().includes(query);
        const authorMatch =
          c.author?.fullName?.toLowerCase().includes(query) ||
          c.author?.username?.toLowerCase().includes(query);
        const taskMatch = c.task?.title?.toLowerCase().includes(query);
        if (!contentMatch && !authorMatch && !taskMatch) return false;
      }
      return true;
    });
  }, [comments, filterCategory, authorFilter, searchQuery]);

  const canDeleteComment = (c) => {
    if (!currentUser) return false;
    const isAuthor = c.author?._id === currentUser._id;
    const isProjectAdmin =
      myRole === 'admin' || myRole === 'project_admin' || currentUser.role === 'admin';
    return isAuthor || isProjectAdmin;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-border bg-gradient-to-r from-card to-card/60 p-6 shadow-sm dark:border-dark-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageSquare className="h-4 w-4" />
              </span>
              <h2 className="text-xl font-bold tracking-tight text-foreground dark:text-dark-foreground">
                Comments &amp; Team Views
              </h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              An open space for everyone in <strong className="text-foreground">{project?.name}</strong> to point their views, share ideas, ask questions, or report blockers &mdash; kept separate from task assignments so all team members have equal access to share feedback.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadComments(false)}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Compose Viewpoint Box */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm dark:border-dark-border">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-foreground dark:text-dark-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Share your perspective or feedback
            </span>
            <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-muted/30 p-0.5 dark:border-dark-border">
              <button
                type="button"
                onClick={() => setComposeTab('write')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  composeTab === 'write'
                    ? 'bg-card text-foreground shadow-xs font-semibold dark:bg-dark-card'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Write
              </button>
              <button
                type="button"
                onClick={() => setComposeTab('preview')}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  composeTab === 'preview'
                    ? 'bg-card text-foreground shadow-xs font-semibold dark:bg-dark-card'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Eye className="h-3 w-3" />
                Preview
              </button>
            </div>
          </div>

          {/* Perspective Category Selectors */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    isSelected
                      ? `${cat.badgeClass} ring-2 ring-primary/40 font-semibold shadow-xs`
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground dark:bg-dark-muted/30'
                  }`}
                  title={cat.description}
                >
                  <Icon className={`h-3.5 w-3.5 ${isSelected ? cat.color : ''}`} />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Text Area or Live Markdown Preview */}
          {composeTab === 'write' ? (
            <div className="space-y-1.5">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's your point of view? Share ideas, discuss architecture, raise questions, or highlight concerns... (Markdown and @mentions supported)"
                rows={3}
                className="w-full resize-y rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background dark:text-dark-foreground"
              />
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="font-medium">Markdown hints:</span>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">**bold**</code>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">*italic*</code>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">`inline code`</code>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">&gt; quote</code>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">- bullet</code>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">[link](url)</code>
              </div>
            </div>
          ) : (
            <div className="min-h-[5.5rem] rounded-lg border border-border/70 bg-muted/20 p-3 text-sm dark:border-dark-border/70">
              {content.trim() ? (
                <FormattedContent text={content} />
              ) : (
                <p className="italic text-muted-foreground text-xs">
                  Nothing to preview yet. Switch to the Write tab to type your perspective.
                </p>
              )}
            </div>
          )}

          {/* Teammate Mention Quick-Pills & Optional Task Link */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            {/* Quick Mentions */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground flex items-center gap-1">
                <AtSign className="h-3 w-3" /> Mention:
              </span>
              {members?.slice(0, 5).map((m) => {
                const u = m.user;
                if (!u || u._id === currentUser?._id) return null;
                return (
                  <button
                    key={u._id}
                    type="button"
                    onClick={() => handleMentionClick(u.username)}
                    className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-foreground transition hover:bg-primary/20 hover:text-primary dark:bg-dark-muted/40"
                  >
                    <span>@{u.username}</span>
                  </button>
                );
              })}
            </div>

            {/* Optional Task Connection */}
            {tasks && tasks.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Tag className="h-3 w-3 text-muted-foreground" />
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background"
                >
                  <option value="">Project-wide (No specific task)</option>
                  {tasks.map((t) => (
                    <option key={t._id} value={t._id}>
                      Task: {t.title.slice(0, 40)}
                      {t.title.length > 40 ? '…' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60 dark:border-dark-border/60">
            {content && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setContent('')}
              >
                Clear
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !content.trim()}
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              {submitting ? 'Posting...' : 'Post Perspective'}
            </Button>
          </div>
        </form>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              filterCategory === 'all'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground dark:bg-dark-muted/30'
            }`}
          >
            All Views ({comments.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = comments.filter(
              (c) => (c.category || 'general') === cat.id
            ).length;
            const isSelected = filterCategory === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilterCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  isSelected
                    ? `${cat.badgeClass} ring-2 ring-primary/40 font-semibold shadow-xs`
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground dark:bg-dark-muted/30'
                }`}
              >
                <Icon className="h-3 w-3" />
                {cat.label} {count > 0 && <span className="opacity-75">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search perspectives…"
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Discussion Feed */}
      {loading ? (
        <div className="space-y-4" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3 dark:border-dark-border">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-5 text-sm text-destructive flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadComments(false)}>
            Retry
          </Button>
        </div>
      ) : filteredComments.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={
            searchQuery || filterCategory !== 'all'
              ? 'No perspectives found matching filters'
              : 'No project discussions yet'
          }
          description={
            searchQuery || filterCategory !== 'all'
              ? 'Try adjusting your search terms or selecting another category filter.'
              : 'Every team member can point their view, share ideas, and raise questions. Post the first perspective above!'
          }
          action={
            (searchQuery || filterCategory !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterCategory('all');
                  setSearchQuery('');
                  setAuthorFilter('all');
                }}
              >
                Reset filters
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredComments.map((comment) => {
            const meta = categoryMeta(comment.category);
            const CatIcon = meta.icon;
            const canDelete = canDeleteComment(comment);
            const author = comment.author;

            return (
              <div
                key={comment._id}
                className="group relative rounded-xl border border-border bg-card p-5 shadow-xs transition hover:border-primary/30 dark:border-dark-border dark:hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Author Header */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar user={author} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground dark:text-dark-foreground truncate">
                          {author?.fullName || author?.username || 'Team Member'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          @{author?.username}
                        </span>
                        {author?.role && (
                          <Badge variant={roleBadgeVariant(author.role)}>
                            {roleLabel(author.role)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{fromNow(comment.createdAt)}</span>
                        <span>·</span>
                        {/* Category Badge */}
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${meta.badgeClass}`}
                        >
                          <CatIcon className="h-3 w-3" />
                          {meta.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(comment._id)}
                        className="rounded-md p-1.5 text-muted-foreground opacity-70 transition hover:bg-destructive/10 hover:text-destructive hover:opacity-100 group-hover:opacity-100"
                        title="Delete this viewpoint"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Optional Connected Task Badge */}
                {comment.task && (
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground dark:border-dark-border">
                    <Tag className="h-3 w-3 text-primary" />
                    <span>Referencing task:</span>
                    <span className="font-medium text-foreground dark:text-dark-foreground">
                      {typeof comment.task === 'object'
                        ? comment.task.title
                        : `Task ${comment.task}`}
                    </span>
                  </div>
                )}

                {/* Comment Content */}
                <div className="mt-3">
                  <FormattedContent text={comment.content} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
