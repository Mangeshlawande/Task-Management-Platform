import { Monitor, Moon, Sun } from 'lucide-react';
import { useUiStore } from '../../stores/uiStore.js';

const options = [
  { value: 'light', icon: Sun, label: 'Light theme' },
  { value: 'dark', icon: Moon, label: 'Dark theme' },
  { value: 'system', icon: Monitor, label: 'System theme' },
];

export function ThemeToggle() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);

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
