import { useState } from 'react';
import { useForm } from '../../lib/useForm.js';
import { Button, Field, Modal } from '../../components/ui/index.js';
import { renderMarkdown } from './renderMarkdown.js';

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
  const [tab, setTab] = useState('write');

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
          : 'Supports Markdown formatting (# headings, **bold**, *italic*, - lists).'
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
        <div className="flex items-center justify-between">
          <div className="flex rounded-lg border border-border p-0.5 text-xs dark:border-dark-border">
            <button
              type="button"
              onClick={() => setTab('write')}
              className={`rounded px-2.5 py-1 font-medium transition ${
                tab === 'write'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted hover:text-foreground dark:text-dark-muted dark:hover:text-dark-foreground'
              }`}
            >
              Write
            </button>
            <button
              type="button"
              onClick={() => setTab('preview')}
              className={`rounded px-2.5 py-1 font-medium transition ${
                tab === 'preview'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted hover:text-foreground dark:text-dark-muted dark:hover:text-dark-foreground'
              }`}
            >
              Preview
            </button>
          </div>
          <span className="text-xs text-muted dark:text-dark-muted">
            {values.content.length}/{MAX_CONTENT}
          </span>
        </div>

        <Field
          label="Content"
          htmlFor="note-content"
          error={errors.content}
        >
          <div className={tab === 'write' ? 'block' : 'hidden'}>
            <textarea
              id="note-content"
              name="content"
              data-autofocus
              className={`app-input ${errors.content ? 'app-input-error' : ''}`}
              rows={8}
              placeholder="# Meeting notes\n\n- Key decision 1\n- Action items..."
              value={values.content}
              onChange={handleChange}
              aria-invalid={!!errors.content}
            />
          </div>

          <div
            className={`app-input min-h-[180px] overflow-y-auto whitespace-pre-wrap ${
              tab === 'preview' ? 'block' : 'hidden'
            }`}
            dangerouslySetInnerHTML={{
              __html:
                renderMarkdown(values.content) ||
                '<p class="italic text-muted dark:text-dark-muted">Nothing to preview yet.</p>',
            }}
          />
        </Field>
      </form>
    </Modal>
  );
}

