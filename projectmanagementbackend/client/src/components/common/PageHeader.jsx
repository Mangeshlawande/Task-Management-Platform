import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Consistent page title header with responsive action slots and back navigation.
 */
export function PageHeader({
  title,
  description,
  actions,
  children,
  showBack = false,
  backTo,
  onBack,
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backTo) {
      navigate(backTo);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/projects');
    }
  };

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {showBack && (
          <button
            type="button"
            onClick={handleBack}
            className="group mb-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" aria-hidden />
            <span>Back</span>
          </button>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-dark-foreground sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {(actions || children) && (
        <div className="flex flex-wrap items-center gap-2.5">
          {actions}
          {children}
        </div>
      )}
    </div>
  );
}
