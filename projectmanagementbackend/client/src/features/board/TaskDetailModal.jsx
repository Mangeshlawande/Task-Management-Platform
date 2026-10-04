import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, ListChecks, Plus, Trash2 } from 'lucide-react';
import { ApiError } from '../../api/client.js';
import { tasksApi } from '../../api/tasks.js';
import {
  canManageContent,
  formatDate,
  priorityBadgeVariant,
  statusLabel,
} from '../../lib/format.js';
import { Avatar, Badge, Button, Field, Modal, Skeleton } from '../../components/ui/index.js';
import { toast } from '../../stores/uiStore.js';
import { useProject } from '../../components/layout/ProjectLayout.jsx';
import { useAuthStore } from '../../stores/authStore.js';

const STATUSES = ['todo', 'in_progress', 'done'];
const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'];

const priorityLabel = (priority) => priority.charAt(0) + priority.slice(1).toLowerCase();

/**
 * P3.4 — Task detail modal.
 * - Fetches `GET …/tasks/:taskId` on open: the board list rows carry no
 *   `subTasks`, so the checklist lives here.
 * - Edit form is shown for the task owner (assignedBy) or project admins —
 *   matching the backend's update/delete guard; everyone else gets read-only
 *   text but can still tick subtasks (docs/03 permission matrix).
 * - Delete uses an inline two-step confirm (no nested <dialog>).
 */
export function TaskDetailModal({ task, onClose, onSaved, onDeleted }) {
  const { project, members, myRole } = useProject();
  const projectId = project._id;
  const currentUserId = useAuthStore((s) => s.user?._id);

  const [detail, setDetail] = useState(null);
  const [loadStatus, setLoadStatus] = useState('loading');
  const [loadError, setLoadError] = useState(null);

  const [form, setForm] = useState(null); // { title, description, status, priority, dueDate, assignedTo }
  const [base, setBase] = useState(null); // last-saved copy → dirty check
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const canEdit =
    canManageContent(myRole) || task.assignedBy?._id === currentUserId;

  const load = useCallback(async () => {
    setLoadStatus('loading');
    setLoadError(null);
    try {
      const full = await tasksApi.get(projectId, task._id);
      setDetail(full);
      const next = {
        title: full.title ?? '',
        description: full.description ?? '',
        status: full.status ?? 'todo',
        priority: full.priority ?? 'MEDIUM',
        dueDate: full.dueDate ? String(full.dueDate).slice(0, 10) : '',
        assignedTo: full.assignedTo?._id ?? '',
      };
      setForm(next);
      setBase(next);
      setLoadStatus('ready');
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : 'Could not load this task.',
      );
      setLoadStatus('error');
    }
  }, [projectId, task._id]);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const dirty = form && base && JSON.stringify(form) !== JSON.stringify(base);
  const subTasks = detail?.subTasks ?? [];
  const subtasksDone = subTasks.filter((s) => s.isCompleted).length;

  /* ---------------------------------------------------------- save (edit) */

  const handleSave = async () => {
    if (saving || !form) return;

    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = 'Task title is required';
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    setFormError(null);

    const patch = {
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate
        ? new Date(`${form.dueDate}T00:00:00`).toISOString()
        : null,
      assignedTo: form.assignedTo || null, // null = unassign (docs/03)
    };

    try {
      const saved = await tasksApi.update(projectId, task._id, patch);
      // The PUT response returns raw ids — resolve the assignee back to a
      // populated user so the board card keeps rendering its avatar.
      const assignedUser = saved.assignedTo
        ? members.find((m) => m.user._id === String(saved.assignedTo))?.user ??
          task.assignedTo ??
          null
        : null;
      const merged = {
        ...saved,
        assignedTo: assignedUser,
        assignedBy: task.assignedBy,
      };

      setDetail((prev) => ({ ...(prev ?? task), ...merged }));
      setForm((prev) => ({ ...prev }));
      setBase(form);
      onSaved(task._id, merged);
      toast.success('Task saved.');
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors || {}).length) {
        setErrors(err.fieldErrors);
      } else {
        setFormError(err?.message || 'Could not save the task.');
      }
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------------------------------------ subtasks */

  const toggleSubtask = async (sub) => {
    const next = !sub.isCompleted;
    setDetail((prev) => ({
      ...prev,
      subTasks: prev.subTasks.map((s) =>
        s._id === sub._id ? { ...s, isCompleted: next } : s,
      ),
    }));
    try {
      await tasksApi.updateSubtask(projectId, task._id, sub._id, {
        isCompleted: next,
      });
    } catch (err) {
      setDetail((prev) => ({
        ...prev,
        subTasks: prev.subTasks.map((s) =>
          s._id === sub._id ? { ...s, isCompleted: !next } : s,
        ),
      }));
      toast.error(err?.message || 'Could not update the subtask.');
    }
  };

  const addSubtask = async (event) => {
    event.preventDefault();
    const title = subtaskTitle.trim();
    if (!title || addingSubtask) return;

    setAddingSubtask(true);
    try {
      const created = await tasksApi.createSubtask(projectId, task._id, title);
      setDetail((prev) => ({
        ...prev,
        subTasks: [...(prev.subTasks ?? []), created],
      }));
      setSubtaskTitle('');
    } catch (err) {
      toast.error(err?.message || 'Could not add the subtask.');
    } finally {
      setAddingSubtask(false);
    }
  };

  const deleteSubtask = async (sub) => {
    try {
      await tasksApi.removeSubtask(projectId, task._id, sub._id);
      setDetail((prev) => ({
        ...prev,
        subTasks: prev.subTasks.filter((s) => s._id !== sub._id),
      }));
    } catch (err) {
      toast.error(err?.message || 'Could not delete the subtask.');
    }
  };

  /* -------------------------------------------------------- delete task */

  const handleDelete = async () => {
    if (confirmingDelete) return;
    setConfirmingDelete(true);
    try {
      await tasksApi.remove(projectId, task._id);
      onDeleted(task._id);
      toast.success('Task deleted.');
      onClose();
    } catch (err) {
      setConfirmingDelete(false);
      toast.error(err?.message || 'Could not delete the task.');
    }
  };

  /* ---------------------------------------------------------------- render */

  return (
    <Modal
      size="lg"
      onClose={onClose}
      title={task.title}
      description={
        detail ? undefined : 'Loading task…'
      }
      footer={
        <>
          {canEdit && (
            <Button
              variant="ghost"
              onClick={handleDelete}
              loading={confirmingDelete}
              className="mr-auto text-danger hover:bg-danger/10"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {confirmingDelete ? 'Confirm delete' : 'Delete task'}
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Close
          </Button>
          {canEdit && (
            <Button onClick={handleSave} loading={saving} disabled={!dirty}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          )}
        </>
      }
    >
      {loadStatus === 'loading' && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading task">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {loadStatus === 'error' && (
        <div className="space-y-4 text-center" role="alert">
          <p className="text-sm text-muted dark:text-dark-muted">{loadError}</p>
          <Button variant="outline" onClick={load}>
            Try again
          </Button>
        </div>
      )}

      {loadStatus === 'ready' && form && (
        <div className="space-y-6">
          {formError && (
            <div
              className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
              role="alert"
            >
              {formError}
            </div>
          )}

          {/* ---- details ---- */}
          <section className="space-y-4" aria-label="Task details">
            {canEdit ? (
              <>
                <Field label="Title" htmlFor="detail-title" error={errors.title}>
                  <input
                    id="detail-title"
                    name="title"
                    data-autofocus
                    className={`app-input ${errors.title ? 'app-input-error' : ''}`}
                    value={form.title}
                    onChange={(e) => setField('title', e.target.value)}
                    maxLength={200}
                  />
                </Field>

                <Field label="Description" htmlFor="detail-description">
                  <textarea
                    id="detail-description"
                    name="description"
                    rows={3}
                    className="app-input"
                    placeholder="No description yet."
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Status" htmlFor="detail-status">
                    <select
                      id="detail-status"
                      name="status"
                      className="app-input"
                      value={form.status}
                      onChange={(e) => setField('status', e.target.value)}
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Priority" htmlFor="detail-priority">
                    <select
                      id="detail-priority"
                      name="priority"
                      className="app-input"
                      value={form.priority}
                      onChange={(e) => setField('priority', e.target.value)}
                    >
                      {PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {priorityLabel(priority)}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Due date" htmlFor="detail-due">
                    <input
                      id="detail-due"
                      name="dueDate"
                      type="date"
                      className="app-input"
                      value={form.dueDate}
                      onChange={(e) => setField('dueDate', e.target.value)}
                    />
                  </Field>

                  <Field label="Assignee" htmlFor="detail-assignee">
                    <select
                      id="detail-assignee"
                      name="assignedTo"
                      className="app-input"
                      value={form.assignedTo}
                      onChange={(e) => setField('assignedTo', e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {members.map((member) => (
                        <option key={member.user._id} value={member.user._id}>
                          {member.user.fullName || member.user.username}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </>
            ) : (
              /* read-only view for plain members */
              <div className="space-y-3">
                <p className="text-sm text-foreground dark:text-dark-foreground">
                  {detail.description || (
                    <span className="text-muted dark:text-dark-muted">
                      No description yet.
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted dark:text-dark-muted">
                  <Badge variant={priorityBadgeVariant(detail.priority)}>
                    {priorityLabel(detail.priority)}
                  </Badge>
                  <span>{statusLabel(detail.status)}</span>
                  {detail.dueDate && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                      Due {formatDate(detail.dueDate)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Avatar user={detail.assignedTo ?? {}} size="sm" />
                    {detail.assignedTo
                      ? detail.assignedTo.fullName || detail.assignedTo.username
                      : 'Unassigned'}
                  </span>
                </div>
              </div>
            )}

            {/* attachments (read-only — the API only accepts them on create) */}
            {detail.attachments?.length > 0 && (
              <div>
                <h3 className="app-label">Attachments</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {detail.attachments.map((file) => (
                    <li key={file.url}>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block h-20 w-20 overflow-hidden rounded-lg border border-border transition hover:opacity-80 dark:border-dark-border"
                        title={file.url.split('/').pop()}
                      >
                        <img
                          src={file.url}
                          alt="Task attachment"
                          className="h-full w-full object-cover"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* ---- subtasks ---- */}
          <section aria-label="Subtasks">
            <div className="flex items-center justify-between gap-3">
              <h3 className="app-label inline-flex items-center gap-1.5">
                <ListChecks className="h-4 w-4" aria-hidden />
                Subtasks
                {subTasks.length > 0 && (
                  <span className="font-normal normal-case text-muted dark:text-dark-muted">
                    · {subtasksDone}/{subTasks.length} done
                  </span>
                )}
              </h3>
            </div>

            {subTasks.length === 0 ? (
              <p className="mt-2 text-sm text-muted dark:text-dark-muted">
                No subtasks yet.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {subTasks.map((sub) => {
                  const canDelete =
                    canManageContent(myRole) ||
                    sub.createdBy?._id === currentUserId;
                  return (
                    <li
                      key={sub._id}
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 dark:border-dark-border"
                    >
                      <input
                        id={`sub-${sub._id}`}
                        type="checkbox"
                        checked={!!sub.isCompleted}
                        onChange={() => toggleSubtask(sub)}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                      <label
                        htmlFor={`sub-${sub._id}`}
                        className={`flex-1 cursor-pointer text-sm ${
                          sub.isCompleted
                            ? 'text-muted line-through dark:text-dark-muted'
                            : 'text-foreground dark:text-dark-foreground'
                        }`}
                      >
                        {sub.title}
                      </label>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => deleteSubtask(sub)}
                          aria-label={`Delete subtask ${sub.title}`}
                          className="rounded p-1 text-muted transition hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {canEdit && (
              <form className="mt-3 flex gap-2" onSubmit={addSubtask}>
                <input
                  className="app-input flex-1"
                  placeholder="Add a subtask…"
                  aria-label="New subtask title"
                  value={subtaskTitle}
                  onChange={(e) => setSubtaskTitle(e.target.value)}
                  maxLength={200}
                />
                <Button
                  type="submit"
                  variant="outline"
                  loading={addingSubtask}
                  disabled={!subtaskTitle.trim()}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Add
                </Button>
              </form>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}
