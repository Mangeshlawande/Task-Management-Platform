import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Save } from 'lucide-react';
import { ApiError } from '../../api/client.js';
import { useForm } from '../../lib/useForm.js';
import { canManageProject } from '../../lib/format.js';
import { Button, Field, Modal } from '../../components/ui/index.js';
import { toast } from '../../stores/uiStore.js';
import { useProject } from '../../components/layout/ProjectLayout.jsx';

/** Mirrors the Project model: name 3–100 (required), description ≤ 1000. */
const validate = (values) => {
  const errors = {};
  const name = values.name.trim();

  if (!name) {
    errors.name = 'Project name is required';
  } else if (name.length < 3) {
    errors.name = 'Must be at least 3 characters';
  } else if (name.length > 100) {
    errors.name = 'Must be at most 100 characters';
  }

  if (values.description.trim().length > 1000) {
    errors.description = 'Must be at most 1000 characters';
  }

  return errors;
};

/**
 * P2.4 — Settings tab (inside the project shell).
 * - Rename / description form: visible to all, editable by admin only
 *   (members see read-only inputs, per docs/05 P2.4).
 * - Danger zone (delete): project admin only, with a confirm modal that
 *   requires typing the project name (irreversible cascade delete).
 */
export function ProjectSettingsTab() {
  const navigate = useNavigate();
  const { project, myRole, updateProject, removeProject } = useProject();
  const canEdit = canManageProject(myRole);

  const [formError, setFormError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // `key`-less sync: seed values from the project, then let the form own them.
  const form = useForm(
    { name: project?.name ?? '', description: project?.description ?? '' },
    validate,
    async (values) => {
      setFormError(null);
      setSaved(false);

      try {
        const updated = await updateProject({
          name: values.name.trim(),
          description: values.description.trim(),
        });
        setSaved(true);
        toast.success(`Project renamed to “${updated.name}”.`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          form.setErrors((errors) => ({
            ...errors,
            name: err.message || 'You already have a project with this name',
          }));
          return;
        }
        setFormError(err?.message || 'Could not save changes. Please try again.');
      }
    },
  );

  // Keep the form in sync if the project changes underneath us (rename by
  // another admin, project deleted server-side).
  const [seededFor, setSeededFor] = useState(project?._id);
  if (project && seededFor !== project._id) {
    setSeededFor(project._id);
    form.setFieldValue('name', project.name ?? '');
    form.setFieldValue('description', project.description ?? '');
  }

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await removeProject();
      toast.success(`“${project.name}” deleted.`);
      navigate('/projects', { replace: true });
    } catch (err) {
      setConfirmingDelete(false);
      setFormError(err?.message || 'Could not delete the project.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <section className="app-card p-6">
        <h2 className="font-medium text-foreground dark:text-dark-foreground">
          General
        </h2>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">
          {canEdit
            ? 'Rename the project or update its description.'
            : 'Only the project admin can change these settings — you have read-only access.'}
        </p>

        {formError && (
          <div
            className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
            role="alert"
          >
            {formError}
          </div>
        )}

        <form className="mt-4 space-y-4" onSubmit={form.handleSubmit} noValidate>
          <Field
            label="Name"
            htmlFor="project-settings-name"
            error={form.errors.name}
            hint={canEdit ? '3–100 characters — must be unique among your own projects' : undefined}
          >
            <input
              id="project-settings-name"
              name="name"
              type="text"
              maxLength={100}
              className={`app-input ${form.errors.name ? 'app-input-error' : ''}`}
              value={form.values.name}
              onChange={form.handleChange}
              disabled={!canEdit}
              aria-invalid={!!form.errors.name}
            />
          </Field>

          <Field
            label="Description"
            htmlFor="project-settings-description"
            error={form.errors.description}
            hint={canEdit ? 'Optional — up to 1000 characters' : undefined}
          >
            <textarea
              id="project-settings-description"
              name="description"
              rows={3}
              maxLength={1000}
              className={`app-input resize-none ${form.errors.description ? 'app-input-error' : ''}`}
              value={form.values.description}
              onChange={form.handleChange}
              disabled={!canEdit}
            />
          </Field>

          {canEdit && (
            <div className="flex items-center gap-3">
              <Button type="submit" loading={form.submitting}>
                <Save className="h-4 w-4" aria-hidden />
                Save changes
              </Button>
              {saved && !form.submitting && (
                <span className="text-sm text-success" role="status">
                  Saved.
                </span>
              )}
            </div>
          )}
        </form>
      </section>

      {canEdit && (
        <section className="app-card border-danger/30 p-6 dark:border-danger/40">
          <h2 className="font-medium text-danger">Danger zone</h2>
          <p className="mt-1 text-sm text-muted dark:text-dark-muted">
            Deleting <strong>{project.name}</strong> permanently removes its
            tasks, subtasks, notes and memberships. This cannot be undone.
          </p>
          <Button
            variant="danger"
            className="mt-4"
            onClick={() => setConfirmingDelete(true)}
          >
            <AlertTriangle className="h-4 w-4" aria-hidden />
            Delete project
          </Button>
        </section>
      )}

      {confirmingDelete && (
        <DeleteProjectModal
          project={project}
          busy={deleting}
          onClose={() => setConfirmingDelete(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

/** Confirm modal — requires the exact project name before enabling Delete. */
function DeleteProjectModal({ project, busy, onClose, onConfirm }) {
  const [confirmation, setConfirmation] = useState('');
  const matches = confirmation.trim() === project.name;

  return (
    <Modal
      onClose={onClose}
      title="Delete this project?"
      description="This will permanently delete the project and everything in it."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={busy} disabled={!matches}>
            Delete permanently
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted dark:text-dark-muted">
        Type <strong className="text-foreground dark:text-dark-foreground">{project.name}</strong>{' '}
        to confirm:
      </p>
      <input
        type="text"
        data-autofocus
        autoComplete="off"
        className="app-input mt-2"
        aria-label="Project name confirmation"
        placeholder={project.name}
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
      />
    </Modal>
  );
}
