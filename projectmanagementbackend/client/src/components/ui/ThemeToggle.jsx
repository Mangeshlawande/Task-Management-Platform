import { Monitor, Moon, Sun } from 'lucide-react';
import { useUiStore } from '../../stores/uiStore.js';

const options = [
  { value: 'light', icon: Sun, label: 'Light theme' },
  { value: 'dark', icon: Moon, label: 'Dark theme' },
  { value: 'system', icon: Monitor, label: 'System theme' },
];

export function ThemeToggle({ compact = false }) {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);

  if (compact) {
    const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    const CurrentIcon = theme === 'dark' ? Moon : theme === 'system' ? Monitor : Sun;
    return (
      <button
        type="button"
        onClick={() => setTheme(nextTheme)}
        aria-label={`Toggle theme (currently ${theme})`}
        title={`Theme: ${theme} (click to toggle)`}
        className="flex h-10 w-10 items-center justify-center rounded-md text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors"
      >
        <CurrentIcon className="h-4 w-4" aria-hidden />
      </button>
    );
  }

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5 dark:border-dark-border dark:bg-dark-card"
      role="group"
      aria-label="Theme"
    >
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          aria-label={label}
          aria-pressed={theme === value}
          className={`rounded-md p-1.5 transition ${
            theme === value
              ? 'bg-primary/10 text-primary dark:text-dark-primary'
              : 'text-muted hover:text-foreground dark:text-dark-muted dark:hover:text-dark-foreground'
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </button>
      ))}
    </div>
  );
}
