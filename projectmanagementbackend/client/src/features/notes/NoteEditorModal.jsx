import { useForm } from '../../lib/useForm.js';
import { Button, Field, Modal } from '../../components/ui/index.js';

const MAX_CONTENT = 5000;

const validate = (values) => {
  const errors = {};
  const content = values.content.trim();
  if (!content) errors.content = 'Note content is required';
  else if (content.length > MAX_CONTENT) {
    errors.content = `Must be at most ${MAX_CONTENT} characters`;
  }
  return errors;
};

/**
 * P4.2 — Create/edit note modal. One shared form for both modes; the client
 * rules mirror the backend (`content` required, ≤5000) and server `errors`
 * merge into the field via useForm.
 */
export function NoteEditorModal({ note, onClose, onSave }) {
  const editing = Boolean(note);

  const form = useForm(
    { content: note?.content ?? '' },
    validate,
    // Field errors merge into useForm; anything else is rethrown for the
    // caller (NotesPage) to surface — it owns the toasts and list state.
    async (values) => onSave(values.content.trim()),
  );

  const { values, errors, submitting, handleChange, handleSubmit } = form;

  // useForm rethrows non-field errors — catch here so a failed save never
  // surfaces as an unhandled rejection; NotesPage already toasted it.
  const submit = async (event) => {
    try {
      await handleSubmit(event);
    } catch {
      /* surfaced by the caller */
    }
  };

  return (
    <Modal
      onClose={onClose}
      title={editing ? 'Edit note' : 'New note'}
      description={
        editing
          ? 'Updating the text stamps "edited" on the note.'
          : 'Visible to everyone in the project.'
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting}>
            {submitting
              ? editing
                ? 'Saving…'
                : 'Creating…'
              : editing
                ? 'Save changes'
                : 'Create note'}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={submit} noValidate>
        <Field
          label="Content"
          htmlFor="note-content"
          error={errors.content}
          hint={`${values.content.length}/${MAX_CONTENT} characters`}
        >
          <textarea
            id="note-content"
            name="content"
            data-autofocus
            className={`app-input ${errors.content ? 'app-input-error' : ''}`}
            rows={7}
            placeholder="Meeting notes, decisions, links…"
            value={values.content}
            onChange={handleChange}
            aria-invalid={!!errors.content}
          />
        </Field>
      </form>
    </Modal>
  );
}
