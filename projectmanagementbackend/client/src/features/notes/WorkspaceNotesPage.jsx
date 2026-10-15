import { useEffect, useState, useMemo } from 'react';
import {
  StickyNote,
  Plus,
  Search,
  Pin,
  Trash2,
  Save,
  Eye,
  Edit3,
  FolderOpen,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { projectsApi } from '../../api/projects.js';
import { notesApi } from '../../api/notes.js';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { Button, Skeleton } from '../../components/ui/index.js';
import { renderMarkdown } from './renderMarkdown.js';
import { toast } from '../../stores/uiStore.js';
import { fromNow } from '../../lib/format.js';

const titleOf = (content = '') => {
  const first = content.split('\n').find((l) => l.trim()) || 'Untitled Note';
  return first.replace(/^#+\s*/, '').slice(0, 60);
};

export function WorkspaceNotesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [draftContent, setDraftContent] = useState('');
  const [activeTab, setActiveTab] = useState('edit'); // 'edit' | 'preview'
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  // Load projects & their notes
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const pList = await projectsApi.list();
        if (cancelled) return;

        const projs = Array.isArray(pList) ? pList.map((p) => p.project) : [];
        setProjects(projs);

        // Fetch notes for all projects
        const notePromises = projs.map((p) =>
          notesApi
            .list(p._id, { limit: 50 })
            .then((res) => ({ projectId: p._id, projectName: p.name, notes: res?.notes || [] }))
            .catch(() => ({ projectId: p._id, projectName: p.name, notes: [] }))
        );

        const results = await Promise.all(notePromises);
        if (cancelled) return;

        const allNotes = [];
        results.forEach((r) => {
          r.notes.forEach((n) => {
            allNotes.push({
              ...n,
              projectId: r.projectId,
              projectName: r.projectName,
            });
          });
        });

        // Sort: pinned first, then newest
        allNotes.sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
        });

        setNotes(allNotes);
        if (allNotes.length > 0) {
          setSelectedNoteId(allNotes[0]._id);
          setDraftContent(allNotes[0].content || '');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load workspace notes.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter notes based on project selection & search query
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchProject = selectedProjectId === 'all' || n.projectId === selectedProjectId;
      const matchQuery =
        !searchQuery.trim() ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.projectName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchProject && matchQuery;
    });
  }, [notes, selectedProjectId, searchQuery]);

  const selectedNote = notes.find((n) => n._id === selectedNoteId) || null;

  const handleSelectNote = (note) => {
    setSelectedNoteId(note._id);
    setDraftContent(note.content || '');
  };

  const handleSave = async () => {
    if (!selectedNote) return;
    setSaving(true);
    try {
      const updated = await notesApi.update(selectedNote.projectId, selectedNote._id, {
        content: draftContent,
      });

      setNotes((prev) =>
        prev.map((n) =>
          n._id === selectedNote._id
            ? { ...n, content: draftContent, updatedAt: updated?.updatedAt || new Date().toISOString() }
            : n
        )
      );
      toast.success('Note saved');
    } catch (err) {
      toast.error(err.message || 'Could not save note');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePin = async () => {
    if (!selectedNote) return;
    try {
      const nextPin = !selectedNote.isPinned;
      await notesApi.update(selectedNote.projectId, selectedNote._id, {
        isPinned: nextPin,
      });

      setNotes((prev) => {
        const next = prev.map((n) => (n._id === selectedNote._id ? { ...n, isPinned: nextPin } : n));
        return next.sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
        });
      });

      toast.success(nextPin ? 'Note pinned' : 'Note unpinned');
    } catch (err) {
      toast.error(err.message || 'Failed to toggle pin');
    }
  };

  const handleDelete = async () => {
    if (!selectedNote) return;
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    try {
      await notesApi.remove(selectedNote.projectId, selectedNote._id);
      const remaining = notes.filter((n) => n._id !== selectedNote._id);
      setNotes(remaining);

      if (remaining.length > 0) {
        setSelectedNoteId(remaining[0]._id);
        setDraftContent(remaining[0].content || '');
      } else {
        setSelectedNoteId(null);
        setDraftContent('');
      }

      toast.success('Note deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete note');
    }
  };

  const handleCreateNote = async () => {
    const targetProject =
      selectedProjectId !== 'all'
        ? projects.find((p) => p._id === selectedProjectId)
        : projects[0];

    if (!targetProject) {
      toast.error('Please create a project first before adding notes.');
      return;
    }

    setCreating(true);
    try {
      const initialTemplate = '# New Document\n\nStart jotting down project ideas, meeting notes, or tasks…';
      const created = await notesApi.create(targetProject._id, initialTemplate);

      const newNote = {
        ...created,
        projectId: targetProject._id,
        projectName: targetProject.name,
      };

      setNotes((prev) => [newNote, ...prev]);
      setSelectedNoteId(newNote._id);
      setDraftContent(newNote.content);
      setActiveTab('edit');
      toast.success(`Note created in "${targetProject.name}"`);
    } catch (err) {
      toast.error(err.message || 'Failed to create note');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Skeleton className="h-[600px] rounded-xl" />
          <Skeleton className="h-[600px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/10 p-6 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-danger" />
        <h3 className="mt-2 text-base font-semibold text-danger">Failed to load notes</h3>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">{error}</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspace Notes"
        description="Markdown documentation, specs, and memos across all your projects."
        actions={
          <Button
            size="sm"
            onClick={handleCreateNote}
            loading={creating}
            className="flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New note</span>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* ── Left Pane: Project Filter, Search, Note List ──── */}
        <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm dark:border-dark-border dark:bg-dark-card">
          {/* Filter & Search Bar */}
          <div className="border-b border-border/70 p-3.5 space-y-2.5 dark:border-dark-border/70">
            {/* Project Select */}
            <div className="relative">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                aria-label="Filter notes by project"
                className="w-full rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-xs font-medium text-foreground transition focus:border-primary focus:outline-none dark:border-dark-border dark:bg-dark-surface-alt dark:text-dark-foreground"
              >
                <option value="all">All projects ({notes.length} notes)</option>
                {projects.map((p) => {
                  const pNotesCount = notes.filter((n) => n.projectId === p._id).length;
                  return (
                    <option key={p._id} value={p._id}>
                      {p.name} ({pNotesCount})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted dark:text-dark-muted" />
              <input
                type="text"
                placeholder="Search notes…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-alt pl-8 pr-3 py-1.5 text-xs text-foreground placeholder-muted transition focus:border-primary focus:outline-none dark:border-dark-border dark:bg-dark-surface-alt dark:text-dark-foreground dark:placeholder-dark-muted"
              />
            </div>
          </div>

          {/* Notes List */}
          <div className="flex-1 divide-y divide-border/60 overflow-y-auto max-h-[680px] dark:divide-dark-border/60">
            {filteredNotes.map((n) => {
              const active = selectedNoteId === n._id;
              return (
                <button
                  key={n._id}
                  type="button"
                  onClick={() => handleSelectNote(n)}
                  className={`w-full p-3.5 text-left transition ${
                    active
                      ? 'bg-primary/10 dark:bg-primary/20'
                      : 'hover:bg-surface-alt/60 dark:hover:bg-dark-surface-alt/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <span
                      className={`line-clamp-1 text-sm font-medium ${
                        active
                          ? 'text-primary dark:text-dark-primary'
                          : 'text-foreground dark:text-dark-foreground'
                      }`}
                    >
                      {titleOf(n.content)}
                    </span>
                    {n.isPinned && (
                      <Pin className="h-3.5 w-3.5 shrink-0 fill-amber-500 text-amber-500" />
                    )}
                  </div>

                  <p className="mt-1 line-clamp-2 text-xs text-muted dark:text-dark-muted">
                    {n.content.replace(/^#+\s*/gm, '').trim() || 'Empty note'}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted dark:text-dark-muted">
                    <span className="truncate max-w-[150px] font-medium text-foreground/80 dark:text-dark-foreground/80">
                      {n.projectName}
                    </span>
                    <span>{fromNow(n.updatedAt || n.createdAt)}</span>
                  </div>
                </button>
              );
            })}

            {filteredNotes.length === 0 && (
              <div className="p-8 text-center text-xs text-muted dark:text-dark-muted">
                <StickyNote className="mx-auto h-7 w-7 text-muted/60 dark:text-dark-muted/60" />
                <p className="mt-2 font-medium">No notes found</p>
                <p className="mt-0.5">Try a different search or create a new note.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Pane: Active Note Editor & Preview ──────── */}
        {selectedNote ? (
          <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm dark:border-dark-border dark:bg-dark-card min-h-[600px]">
            {/* Editor Action Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 p-4 dark:border-dark-border/70">
              <div className="min-w-0 flex-1">
                <h2 className="line-clamp-1 text-lg font-semibold text-foreground dark:text-dark-foreground">
                  {titleOf(draftContent)}
                </h2>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted dark:text-dark-muted">
                  <span className="flex items-center gap-1">
                    <FolderOpen className="h-3 w-3" />
                    {selectedNote.projectName}
                  </span>
                  <span>·</span>
                  <span>Updated {fromNow(selectedNote.updatedAt || selectedNote.createdAt)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTogglePin}
                  title={selectedNote.isPinned ? 'Unpin note' : 'Pin note to top'}
                  className={`rounded-lg p-2 transition ${
                    selectedNote.isPinned
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'text-muted hover:bg-surface-alt hover:text-foreground dark:text-dark-muted dark:hover:bg-dark-surface-alt dark:hover:text-dark-foreground'
                  }`}
                >
                  <Pin className={`h-4 w-4 ${selectedNote.isPinned ? 'fill-amber-500' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  title="Delete note"
                  className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger dark:text-dark-muted"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <Button
                  size="sm"
                  onClick={handleSave}
                  loading={saving}
                  className="flex items-center gap-1.5"
                >
                  <Save className="h-4 w-4" />
                  <span>Save</span>
                </Button>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2 dark:border-dark-border/60">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  activeTab === 'edit'
                    ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-dark-primary'
                    : 'text-muted hover:text-foreground dark:text-dark-muted dark:hover:text-dark-foreground'
                }`}
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Write (Markdown)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  activeTab === 'preview'
                    ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-dark-primary'
                    : 'text-muted hover:text-foreground dark:text-dark-muted dark:hover:text-dark-foreground'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Preview</span>
              </button>
            </div>

            {/* Editor Textarea or Live Preview */}
            <div className="flex-1 p-5 overflow-y-auto">
              {activeTab === 'edit' ? (
                <textarea
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  placeholder="Write your note in Markdown (# Title, ## Section, - List item, `code`, **bold**)..."
                  className="h-full min-h-[500px] w-full resize-none border-0 bg-transparent font-mono text-sm leading-relaxed text-foreground placeholder-muted outline-none focus:ring-0 dark:text-dark-foreground dark:placeholder-dark-muted"
                />
              ) : (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-foreground dark:text-dark-foreground leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(draftContent) }}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-12 text-center dark:border-dark-border">
            <FileText className="h-12 w-12 text-muted dark:text-dark-muted" />
            <h3 className="mt-3 text-base font-semibold text-foreground dark:text-dark-foreground">
              No Note Selected
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted dark:text-dark-muted">
              Choose an existing document from the left list or create a new markdown note to start documenting.
            </p>
            <Button size="sm" onClick={handleCreateNote} className="mt-4 flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Create new note</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
