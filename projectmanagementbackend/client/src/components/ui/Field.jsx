import { AlertCircle } from 'lucide-react';

/**
 * Form field wrapper: label + control (as children) + inline error.
 * Errors come from the backend `errors: { field: [msgs] }` mapping or client
 * validation — always rendered as a list for accessibility.
 */
export function Field({ label, htmlFor, error, hint, children }) {
  const first = Array.isArray(error) ? error[0] : error;
  return (
    <div>
      {label && (
        <label className="app-label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {hint && !first && <p className="mt-1 text-xs text-muted dark:text-dark-muted">{hint}</p>}
      {first && (
        <p className="mt-1 flex items-center gap-1 text-xs text-danger" role="alert">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {first}
        </p>
      )}
    </div>
  );
}

/** Merge client-side and server-side errors for one field. */
export const fieldError = (errors, name) => errors?.[name];
