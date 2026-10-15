import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Native <dialog>-based modal (docs/05 P0.5). The browser gives us real focus
 * trapping, Esc-to-close, inert background and top-layer stacking for free —
 * no manual key handling to get wrong.
 *
 * Rendered only while open (mount → showModal). Mark the element that should
 * receive focus with `data-autofocus`.
 */
export function Modal({ open = true, onClose, title, description, children, footer, size = 'md' }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const dialog = ref.current;
    if (!dialog) return;

    if (!dialog.open) {
      dialog.showModal();
      // showModal() focuses the first focusable child (our close button) —
      // prefer the element that asked for it.
      dialog.querySelector('[data-autofocus]')?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const dialog = ref.current;
    if (!dialog) return undefined;

    // Esc fires `cancel`; keep it in React's hands so state can't drift.
    const handleCancel = (event) => {
      event.preventDefault();
      onClose?.();
    };

    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl',
    full: 'max-w-6xl',
  }[size] || 'max-w-lg';

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // p-0 so any click landing on the dialog itself is a backdrop click.
      className={`m-auto w-[calc(100vw-2rem)] ${sizeClass} max-h-[90vh] overflow-hidden rounded-xl border border-border bg-card p-0
        text-foreground shadow-xl backdrop:bg-slate-900/50
        dark:border-dark-border dark:bg-dark-card dark:text-dark-foreground flex flex-col`}
      onClick={(event) => {
        if (event.target === ref.current) onClose?.();
      }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 dark:border-dark-border">
        <div>
          <h2 id={titleId} className="font-semibold text-foreground">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="overflow-y-auto px-5 py-4 max-h-[calc(90vh-130px)]">{children}</div>

      {footer && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4 dark:border-dark-border">
          {footer}
        </div>
      )}
    </dialog>
  );
}
