import clsx from 'clsx';

interface StepProgressProps {
  total: number;
  current: number;
}

export function StepProgress({ total, current }: StepProgressProps) {
  return (
    <div
      className="flex gap-1.5"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current + 1}
      aria-label={`第 ${current + 1} 步，共 ${total} 步`}
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={clsx(
            'h-1.5 flex-1 rounded-full transition-colors',
            index < current
              ? 'bg-[var(--accent)]'
              : index === current
                ? 'bg-[var(--accent-2)]'
                : 'bg-[var(--surface)]',
          )}
        />
      ))}
    </div>
  );
}
