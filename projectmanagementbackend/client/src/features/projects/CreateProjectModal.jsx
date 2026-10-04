import { useState } from 'react';
import { FolderPlus } from 'lucide-react';
import { ApiError } from '../../api/client.js';
import { projectsApi } from '../../api/projects.js';
import { useForm } from '../../lib/useForm.js';
import { Button, Field, Modal } from '../../components/ui/index.js';
import { toast } from '../../stores/uiStore.js';

const initial = { name: '', description: '' };

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
 * P2.2 — Create project.
 * Contract: POST /projects → 201 (bare Project). Names are unique *per creator*,
 * so the duplicate arrives as 409 with an empty `errors` array rather than a
 * field map — it is routed to the name field here, like the register duplicate.
 *
 * Mounted only while open, so each opening starts from a clean form.
 */
export function CreateProjectModal({ onClose, onCreated }) {
  const [formError, setFormError] = useState(null);

  const form = useForm(initial, validate, async (values) => {
    setFormError(null);

    try {
      const project = await projectsApi.create(values);
      toast.success(`“${project.name}” created.`);
      onCreated(project);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        form.setErrors((errors) => ({
          ...errors,
          name: err.message || 'You already have a project with this name',
        }));
        return;
      }
      // 400 field errors never reach here — useForm maps them already.
      setFormError(
        err?.message || 'Could not create the project. Please try again.',
      );
    }
  });

  return (
    <Modal
      onClose={onClose}
      title="New project"
      description="Give it a name you'll recognise — you can change it later."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={form.submitting}>
            Cancel
          </Button>
          <Button onClick={form.handleSubmit} loading={form.submitting}>
            {form.submitting ? 'Creating…' : 'Create project'}
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

      <form className="space-y-4" onSubmit={form.handleSubmit} noValidate>
        <Field
          label="Name"
          htmlFor="project-name"
          error={form.errors.name}
          hint="3–100 characters — must be unique among your own projects"
        >
          <div className="relative">
            <FolderPlus
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              id="project-name"
              name="name"
              type="text"
              required
              maxLength={100}
              autoComplete="off"
              data-autofocus
              className={`app-input pl-9 ${form.errors.name ? 'app-input-error' : ''}`}
              placeholder="Website redesign"
              value={form.values.name}
              onChange={form.handleChange}
              aria-invalid={!!form.errors.name}
            />
          </div>
        </Field>

        <Field
          label="Description"
          htmlFor="project-description"
          error={form.errors.description}
          hint="Optional — up to 1000 characters"
        >
          <textarea
            id="project-description"
            name="description"
            rows={3}
            maxLength={1000}
            className={`app-input resize-none ${form.errors.description ? 'app-input-error' : ''}`}
            placeholder="What is this project about?"
            value={form.values.description}
            onChange={form.handleChange}
          />
        </Field>
      </form>
    </Modal>
  );
}
