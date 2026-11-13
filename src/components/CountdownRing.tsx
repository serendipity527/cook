import clsx from 'clsx';
import { formatClock } from '@/runtime/useCountdown';

interface CountdownRingProps {
  remainingMs: number;
  totalMs: number;
  paused?: boolean;
  awaiting?: boolean;
}

export function CountdownRing({
  remainingMs,
  totalMs,
  paused = false,
  awaiting = false,
}: CountdownRingProps) {
  const size = 280;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  const offset = circumference * (1 - ratio);
  const urgent = remainingMs > 0 && remainingMs <= 10_000;
  const color = paused ? 'var(--muted)' : urgent ? 'var(--accent-2)' : 'var(--accent)';

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[min(300px,44dvh)]">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={clsx(
            'transition-[stroke-dashoffset,stroke] duration-200 ease-linear',
            paused && 'opacity-60',
          )}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[clamp(4rem,18vw,6rem)] font-bold tabular-nums tracking-tight">
          {formatClock(remainingMs)}
        </span>
        <span className="mt-2 text-sm text-[var(--muted)]">
          {paused ? '已暂停' : awaiting ? '时间到' : '剩余'}
        </span>
      </div>
    </div>
  );
}
