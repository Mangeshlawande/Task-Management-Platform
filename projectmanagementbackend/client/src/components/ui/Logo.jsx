import { Boxes } from 'lucide-react';

export function Logo({ size = 'md' }) {
  const box = size === 'lg' ? 'h-10 w-10' : 'h-8 w-8';
  const text = size === 'lg' ? 'text-xl' : 'text-base';
  return (
    <div className="flex items-center gap-2">
      <span
        className={`grid ${box} place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm`}
      >
        <Boxes className="h-5 w-5" aria-hidden />
      </span>
      <span className={`font-semibold tracking-tight text-foreground dark:text-dark-foreground ${text}`}>
        Project&nbsp;Camp
      </span>
    </div>
  );
}
