import { useEffect, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { ApiError } from '../../api/client.js';
import { useForm } from '../../lib/useForm.js';
import { statusLabel } from '../../lib/format.js';
import { Button, Field, Modal } from '../../components/ui/index.js';
import { toast } from '../../stores/uiStore.js';
import { useProject } from '../../components/layout/ProjectLayout.jsx';

/* Attachment rules — mirror multer (src/middlewares/multer.middleware.js):
   field "attachments", ≤5 files, ≤1MB each, jpeg/jpg/png/webp. */
const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const STATUSES = ['todo', 'in_progress', 'done'];
const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'];

const validate = (values) => {
  const errors = {};
  const title = values.title.trim();
  if (!title) errors.title = 'Task title is required';
  else if (title.length > 200) errors.title = 'Must be at most 200 characters';
  return errors;
};

/**
 * P3.3 — Task create modal. Text fields ride `useForm` (client rules mirror
 * the backend, server `errors` merge into the fields); files live in their
 * own state because FormData needs the raw File objects.
 */
export function TaskCreateModal({ onClose, onCreate }) {
  const { members } = useProject();
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [previews, setPreviews] = useState([]);

  // Object URLs for thumbnails — revoked whenever the selection changes.
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const form = useForm(
    {
      title: '',
      description: '',
      assignedTo: '',
      status: 'todo',
      priority: 'MEDIUM',
      dueDate: '',
    },
    validate,
    async (values) => {
      setFormError(null);

      const fd = new FormData();
      fd.append('title', values.title.trim());
      if (values.description.trim()) fd.append('description', values.description.trim());
      if (values.assignedTo) fd.append('assignedTo', values.assignedTo);
      fd.append('status', values.status);
      fd.append('priority', values.priority);
      if (values.dueDate) {
        fd.append('dueDate', new Date(`${values.dueDate}T00:00:00`).toISOString());
      }
      files.forEach((file) => fd.append('attachments', file));

      try {
        await onCreate(fd);
      } catch (err) {
        // Field errors go back into useForm; everything else (multer's
        // "file too large", 403 …) renders as a form-level message.
        if (err instanceof ApiError && Object.keys(err.fieldErrors || {}).length) {
          throw err;
        }
        setFormError(err?.message || 'Could not create the task. Please try again.');
        return;
      }

      toast.success('Task created.');
      onClose();
    },
  );

  const { values, errors, submitting, handleChange, handleSubmit } = form;

  const handleFiles = (event) => {
    const incoming = Array.from(event.target.files || []);
    event.target.value = ''; // allow re-picking the same file after a removal
    if (!incoming.length) return;

    const bad = incoming.find(
      (file) => !ALLOWED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE,
    );
    if (bad) {
      setFileError('Only jpeg, png or webp images up to 1MB are allowed.');
      return;
    }
    if (files.length + incoming.length > MAX_ATTACHMENTS) {
      setFileError(`You can attach up to ${MAX_ATTACHMENTS} images.`);
      return;
    }

    setFileError(null);
    setFiles((prev) => [...prev, ...incoming]);
  };

  const removeFile = (index) => setFiles((prev) => prev.filter((_, i) => i !== index));

  return (
    <Modal
      onClose={onClose}
      title="New task"
      description="Everyone in the project can see it once created."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            {submitting ? 'Creating…' : 'Create task'}
          </Button>
        </>
      }
    >
      {formError && (
        <div
          className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
          role="alert"
        >
          {formError}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <Field label="Title" htmlFor="task-title" error={errors.title}>
          <input
            id="task-title"
            name="title"
            data-autofocus
            className={`app-input ${errors.title ? 'app-input-error' : ''}`}
            placeholder="Design the landing page"
            value={values.title}
            onChange={handleChange}
            aria-invalid={!!errors.title}
            maxLength={200}
          />
        </Field>

        <Field label="Description" htmlFor="task-description" error={errors.description}>
          <textarea
            id="task-description"
            name="description"
            rows={3}
            className="app-input"
            placeholder="Optional details, links, acceptance criteria…"
            value={values.description}
            onChange={handleChange}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Assignee" htmlFor="task-assignee" hint="Must be a project member.">
            <select
              id="task-assignee"
              name="assignedTo"
              className="app-input"
              value={values.assignedTo}
              onChange={handleChange}
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.user._id} value={member.user._id}>
                  {member.user.fullName || member.user.username}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status" htmlFor="task-status">
            <select
              id="task-status"
              name="status"
              className="app-input"
              value={values.status}
              onChange={handleChange}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Priority" htmlFor="task-priority">
            <select
              id="task-priority"
              name="priority"
              className="app-input"
              value={values.priority}
              onChange={handleChange}
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority.charAt(0) + priority.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Due date" htmlFor="task-due" hint="Optional.">
            <input
              id="task-due"
              name="dueDate"
              type="date"
              className="app-input"
              value={values.dueDate}
              onChange={handleChange}
            />
          </Field>
        </div>

        <Field
          label="Attachments"
          htmlFor="task-files"
          error={fileError}
          hint="Up to 5 images — jpeg, png or webp, 1MB each."
        >
          <div className="flex flex-wrap items-center gap-2">
            {previews.map((url, index) => (
              <div
                key={url}
                className="relative h-16 w-16 overflow-hidden rounded-lg border border-border dark:border-dark-border"
              >
                <img src={url} alt={`Attachment ${index + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  aria-label={`Remove attachment ${index + 1}`}
                  className="absolute right-0.5 top-0.5 rounded-md bg-slate-900/70 p-1 text-white transition hover:bg-slate-900"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </div>
            ))}

            {files.length < MAX_ATTACHMENTS && (
              <label className="inline-flex h-16 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 text-xs text-muted transition hover:text-foreground dark:border-dark-border dark:text-dark-muted dark:hover:text-dark-foreground">
                <ImagePlus className="h-4 w-4" aria-hidden />
                Add images
                <input
                  id="task-files"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  onChange={handleFiles}
                />
              </label>
            )}
          </div>
        </Field>
      </form>
    </Modal>
  );
}
