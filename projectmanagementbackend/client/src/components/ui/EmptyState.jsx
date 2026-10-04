/**
 * Shared empty/error state block. Every list view ships one (docs/05 § P5.3)
 * so "nothing here yet" always pairs with a next action.
 */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="app-card grid place-items-center px-6 py-16 text-center">
      {Icon && <Icon className="h-10 w-10 text-muted dark:text-dark-muted" aria-hidden />}
      <h2 className="mt-4 text-lg font-semibold text-foreground dark:text-dark-foreground">
        {title}
      </h2>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted dark:text-dark-muted">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
