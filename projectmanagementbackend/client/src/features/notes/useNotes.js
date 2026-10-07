import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../api/client.js';
import { notesApi } from '../../api/notes.js';

const PAGE_SIZE = 12;

/**
 * Mirror the server's `{ isPinned: -1, createdAt: -1 }` sort exactly so
 * optimistic updates never disagree with what a refetch would return
 * (a newly pinned note belongs at the top of the pinned group — it's the
 * newest — not at its old position in the list).
 */
const pinnedFirst = (notes) =>
  [...notes].sort(
    (a, b) =>
      (b.isPinned === true) - (a.isPinned === true) ||
      new Date(b.createdAt) - new Date(a.createdAt),
  );

/**
 * Owns the notes page for one project (docs/05 P4).
 * status: loading | ready | error.
 *
 * Pinning is optimistic (4.3): the badge flips immediately and rolls back if
 * the API rejects (403 when a member pins someone else's note, 404 if it was
 * deleted meanwhile). The caller turns the rejection into a toast.
 */
export function useNotes(projectId) {
  const [notes, setNotes] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const payload = await notesApi.list(projectId, {
        page,
        limit: PAGE_SIZE,
      });
      setNotes(payload.notes);
      setPagination(payload.pagination);
      setStatus('ready');
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not load notes.',
      );
      setStatus('error');
    }
  }, [projectId, page]);

  useEffect(() => {
    load();
  }, [load]);

  /** POST → lands on page 1 (newest-first) without a full-page flicker. */
  const createNote = useCallback(
    async (content) => {
      const created = await notesApi.create(projectId, content);
      if (page !== 1) {
        setPage(1); // effect reloads page 1 with the new note
        return created;
      }
      setNotes((list) => pinnedFirst([created, ...list]));
      setPagination((meta) => ({ ...meta, total: meta.total + 1 }));
      return created;
    },
    [projectId, page],
  );

  /**
   * Merge a saved Note into the list. The PUT response carries raw ids for
   * `createdBy`, so the populated author from the list row is kept.
   */
  const patchNote = useCallback((noteId, saved) => {
    setNotes((list) =>
      list.map((n) =>
        n._id === noteId
          ? { ...n, ...saved, createdBy: n.createdBy }
          : n,
      ),
    );
  }, []);

  /** PUT (non-optimistic) → merge the saved note, keeping the populated author. */
  const updateNote = useCallback(
    async (note, patch) => {
      const saved = await notesApi.update(projectId, note._id, patch);
      setNotes((list) =>
        list.map((n) =>
          n._id === note._id
            ? { ...n, ...saved, createdBy: n.createdBy }
            : n,
        ),
      );
      return saved;
    },
    [projectId],
  );

  /** Optimistic pin toggle with rollback on failure (docs/05 P4.3). */
  const togglePin = useCallback(
    async (note) => {
      const previous = note.isPinned;

      setNotes((list) =>
        pinnedFirst(
          list.map((n) =>
            n._id === note._id ? { ...n, isPinned: !previous } : n,
          ),
        ),
      );

      try {
        const saved = await notesApi.update(projectId, note._id, {
          isPinned: !previous,
        });
        setNotes((list) =>
          list.map((n) =>
            n._id === note._id
              ? { ...n, ...saved, createdBy: n.createdBy }
              : n,
          ),
        );
        return saved;
      } catch (err) {
        setNotes((list) =>
          pinnedFirst(
            list.map((n) =>
              n._id === note._id ? { ...n, isPinned: previous } : n,
            ),
          ),
        );
        throw err;
      }
    },
    [projectId],
  );

  /** DELETE → wait for the server, then drop locally; step back a page when the page empties. */
  const removeNote = useCallback(
    async (noteId) => {
      await notesApi.remove(projectId, noteId);
      const remaining = notes.filter((n) => n._id !== noteId);
      setNotes(remaining);
      setPagination((meta) => ({
        ...meta,
        total: Math.max(meta.total - 1, 0),
      }));
      if (remaining.length === 0 && page > 1) setPage(page - 1);
    },
    [projectId, notes, page],
  );

  return {
    notes,
    pagination,
    page,
    setPage,
    pageSize: PAGE_SIZE,
    status,
    error,
    reload: load,
    createNote,
    updateNote,
    patchNote,
    togglePin,
    removeNote,
  };
}
