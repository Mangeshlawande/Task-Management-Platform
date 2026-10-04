import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useUiStore } from '../../stores/uiStore.js';

const icons = {
  success: <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />,
  error: <XCircle className="h-5 w-5 text-danger" aria-hidden />,
  info: <Info className="h-5 w-5 text-primary" aria-hidden />,
};

export function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);

  if (!toasts.length) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="app-card pointer-events-auto flex w-full max-w-sm items-start gap-3 p-3 shadow-lg"
          role="status"
        >
          {icons[t.type] ?? icons.info}
          <p className="flex-1 text-sm text-foreground dark:text-dark-foreground">{t.message}</p>
          <button
            onClick={() => dismiss(t.id)}
            className="text-muted transition hover:text-foreground dark:text-dark-muted dark:hover:text-dark-foreground"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
