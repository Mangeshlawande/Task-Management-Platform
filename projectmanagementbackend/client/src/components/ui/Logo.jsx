import { Activity } from 'lucide-react';

export function Logo({ size = 'md' }) {
  const box = size === 'lg' ? 'h-10 w-10' : 'h-8 w-8';
  const iconSize = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  const text = size === 'lg' ? 'text-xl' : 'text-base';
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`grid ${box} place-items-center rounded-lg bg-gradient-to-br from-primary to-[oklch(0.62_0.2_310)] text-primary-foreground shadow-sm`}
      >
        <Activity className={iconSize} aria-hidden />
      </span>
      <span className={`font-semibold tracking-tight text-foreground ${text}`}>
        Work<span className="text-primary font-bold">Pulse</span>
      </span>
    </div>
  );
}
