import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  StickyNote,
  Trash2,
} from 'lucide-react';
import { useProject } from '../../components/layout/ProjectLayout.jsx';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Modal,
  Skeleton,
} from '../../components/ui/index.js';
import { canManageContent, fromNow } from '../../lib/format.js';
import { useAuthStore } from '../../stores/authStore.js';
import { consumePendingCreate, toast, useUiStore } from '../../stores/uiStore.js';
import { useNotes } from './useNotes.js';
import { NoteEditorModal } from './NoteEditorModal.jsx';

/**
 * P4 — Notes tab (docs/05 P4).
 * - Pinned-first grid, server pagination (12/page) with page controls
 * - Create/edit via NoteEditorModal — admin / project_admin only (4.2)
 * - Optimistic pin toggle with rollback (4.3)
 * - Delete with confirm modal; owner or project admin per docs/03
 * - Every view state ships: loading skeletons, empty, error + retry
 *
 * `canManageContent(myRole)` mirrors the backend gate (create requires
 * admin|project_admin); edit/delete/pin additionally allow the note's author.
 */
export function NotesPage() {
  const { project, myRole } = useProject();
  const currentUserId = useAuthStore((s) => s.user?._id);
  const notes = useNotes(project._id);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null); // Note being edited
  const [deleting, setDeleting] = useState(null); // Note pending delete
  const [deleteBusy, setDeleteBusy] = useState(false);

  const canCreate = canManageContent(myRole);

  // ⌘K palette "Write note" → open the modal on arrival (one-shot). Role-gated
  // so a plain member never sees a modal their role can't submit.
  const pendingCreate = useUiStore((s) => s.pendingCreate);
  useEffect(() => {
    if (pendingCreate && consumePendingCreate('note') && canCreate) setCreating(true);
  }, [pendingCreate, canCreate]);
  const canTouch = (note) =>
    canManageContent(myRole) || note.createdBy?._id === currentUserId;

  const handleCreate = async (content) => {
    try {
      await notes.createNote(content);
      toast.success('Note added.');
      setCreating(false);
    } catch (err) {
      toast.error(err?.message || 'Could not create the note.');
      throw err; // field errors land inline in the modal
    }
  };

  const handleUpdate = async (content) => {
    try {
      await notes.updateNote(editing, { content });
      toast.success('Note updated.');
      setEditing(null);
    } catch (err) {
      toast.error(err?.message || 'Could not save the note.');
      throw err;
    }
  };

  const handlePin = async (note) => {
    try {
      await notes.togglePin(note);
    } catch (err) {
      toast.error(err?.message || 'Could not update the pin.');
    }
  };

  const handleDelete = async () => {
    if (deleteBusy) return;
    setDeleteBusy(true);
    try {
      await notes.removeNote(deleting._id);
      toast.success('Note deleted.');
      setDeleting(null);
    } catch (err) {
      toast.error(err?.message || 'Could not delete the note.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const { status, error, pagination, page, setPage, pageSize } = notes;
  const totalPages = Math.max(pagination.totalPages, 1);

  /* Header — count + primary action (hidden for plain members) */
  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted dark:text-dark-muted">
        {status === 'ready'
          ? `${pagination.total} note${pagination.total === 1 ? '' : 's'} in this project`
          : 'Shared notes for the whole project.'}
      </p>
      {canCreate && (
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" aria-hidden />
          New note
        </Button>
      )}
    </div>
  );

  /* Loading — skeletons for the grid (no layout shift on page change) */
  if (status === 'loading') {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading notes">
        {header}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="app-card p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="mt-3 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-5/6" />
              <Skeleton className="mt-4 h-3 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* Error — banner with retry, header still usable for the create action */
  if (status === 'error') {
    return (
      <div className="space-y-4">
        {header}
        <div className="app-card p-6 text-center" role="alert">
          <AlertCircle
            className="mx-auto h-8 w-8 text-danger"
            aria-hidden
          />
          <p className="mt-3 font-medium text-foreground dark:text-dark-foreground">
            Couldn&rsquo;t load the notes
          </p>
          <p className="mt-1 text-sm text-muted dark:text-dark-muted">{error}</p>
          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={notes.reload}>
              <RefreshCw className="h-4 w-4" aria-hidden />
              Try again
            </Button>
          </div>
        </div>
        {creating && (
          <NoteEditorModal onClose={() => setCreating(false)} onSave={handleCreate} />
        )}
      </div>
    );
  }

  /* Empty — next-action CTA for admins, neutral copy for members (P5.3) */
  if (notes.notes.length === 0) {
    return (
      <div className="space-y-4">
        {header}
        <EmptyState
          icon={StickyNote}
          title="No notes yet"
          description={
            canCreate
              ? 'Capture meeting notes, decisions and links the whole team can see.'
              : 'No notes here yet — a project admin will add the first one.'
          }
          action={
            canCreate ? (
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                Write the first note
              </Button>
            ) : undefined
          }
        />
        {creating && (
          <NoteEditorModal onClose={() => setCreating(false)} onSave={handleCreate} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}

      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {notes.notes.map((note) => {
          const author = note.createdBy ?? {};
          const mine = author._id === currentUserId;
          const touchable = canTouch(note);

          return (
            <li
              key={note._id}
              className={`app-card flex flex-col p-4 ${
                note.isPinned ? 'ring-1 ring-primary/40' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                {note.isPinned ? (
                  <Badge variant="primary">
                    <Pin className="h-3 w-3" aria-hidden />
                    Pinned
                  </Badge>
                ) : (
                  <span className="text-xs text-muted dark:text-dark-muted">
                    {note.editedAt ? 'Edited' : 'Created'} {fromNow(note.editedAt ?? note.createdAt)}
                  </span>
                )}

                {touchable && (
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={
                        note.isPinned ? 'Unpin this note' : 'Pin this note'
                      }
                      onClick={() => handlePin(note)}
                    >
                      {note.isPinned ? (
                        <PinOff className="h-4 w-4" aria-hidden />
                      ) : (
                        <Pin className="h-4 w-4" aria-hidden />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Edit this note"
                      onClick={() => setEditing(note)}
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Delete this note"
                      onClick={() => setDeleting(note)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                )}
              </div>

              <p className="mt-3 flex-1 whitespace-pre-wrap break-words text-sm text-foreground dark:text-dark-foreground">
                {note.content}
              </p>

              <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 dark:border-dark-border">
                <Avatar user={author} size="sm" />
                <span className="min-w-0 flex-1 truncate text-xs text-muted dark:text-dark-muted">
                  {author.fullName || author.username || 'Unknown user'}
                  {mine && ' (you)'}
                </span>
                {note.isPinned && (
                  <span className="text-xs text-muted dark:text-dark-muted">
                    {fromNow(note.editedAt ?? note.createdAt)}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Pagination — mirrors the backend `pagination` meta (4.1) */}
      {pagination.total > pageSize && (
        <nav
          className="flex flex-wrap items-center justify-between gap-3"
          aria-label="Notes pages"
        >
          <p className="text-xs text-muted dark:text-dark-muted">
            Page {page} of {totalPages} · {pagination.total} notes
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </nav>
      )}

      {creating && (
        <NoteEditorModal onClose={() => setCreating(false)} onSave={handleCreate} />
      )}

      {editing && (
        <NoteEditorModal
          note={editing}
          onClose={() => setEditing(null)}
          onSave={handleUpdate}
        />
      )}

      {deleting && (
        <Modal
          onClose={() => setDeleting(null)}
          title="Delete note?"
          description="This removes it for everyone in the project."
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setDeleting(null)}
                disabled={deleteBusy}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete} loading={deleteBusy}>
                {deleteBusy ? 'Deleting…' : 'Delete note'}
              </Button>
            </>
          }
        >
          <p className="whitespace-pre-wrap break-words text-sm text-muted dark:text-dark-muted">
            {deleting.content.length > 200
              ? `${deleting.content.slice(0, 200)}…`
              : deleting.content}
          </p>
        </Modal>
      )}
    </div>
  );
}
