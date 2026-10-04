import { useState } from 'react';
import { ApiError } from '../api/client.js';

/**
 * Minimal form engine (docs/02 § stack table).
 * - validate(values) → { field: 'message' } client-side; empty object = valid
 * - onSubmit(values): on ApiError, server `fieldErrors` are merged automatically
 *   (client messages kept when the server doesn't contradict them)
 */
export function useForm(initial, validate, onSubmit) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const setFieldValue = (name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
    // clear that field's error as the user types
    setErrors((e) => {
      if (!(name in e)) return e;
      const next = { ...e };
      delete next[name];
      return next;
    });
  };

  const handleChange = (e) => setFieldValue(e.target.name, e.target.value);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (submitting) return; // double-submit guard

    const clientErrors = validate?.(values) || {};
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      await onSubmit(values);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors || {}).length) {
        setErrors((prev) => ({ ...prev, ...err.fieldErrors }));
      } else {
        throw err; // let the caller show a form-level/banner error
      }
    } finally {
      setSubmitting(false);
    }
  };

  return { values, errors, submitting, setFieldValue, handleChange, handleSubmit, setErrors };
}
