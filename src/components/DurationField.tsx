import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  DURATION_UNITS,
  pickDurationUnit,
  toDurationSeconds,
  toDurationValue,
  type DurationUnit,
} from '@/lib/duration';

interface DurationFieldProps {
  seconds?: number;
  label: string;
  onChange: (seconds: number | undefined) => void;
}

/** 时长输入：数值 + 秒 / 分钟 / 小时 / 天。 */
export function DurationField({ seconds, label, onChange }: DurationFieldProps) {
  const [unit, setUnit] = useState<DurationUnit>(() =>
    seconds === undefined ? 'sec' : pickDurationUnit(seconds),
  );
  const [text, setText] = useState(() =>
    seconds === undefined ? '' : String(toDurationValue(seconds, unit)),
  );

  useEffect(() => {
    setText(seconds === undefined ? '' : String(toDurationValue(seconds, unit)));
  }, [seconds, unit]);

  const commit = (raw: string) => {
    setText(raw);

    if (raw.trim() === '') {
      onChange(undefined);
      return;
    }

    const value = Number(raw);

    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    onChange(toDurationSeconds(value, unit));
  };

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-xs text-[var(--muted)]">时长</span>

      <div className="flex h-10 min-w-0 items-center rounded-xl bg-[var(--inset)] pl-2.5 pr-1 ring-1 ring-inset ring-[var(--line)] focus-within:ring-[var(--line-strong)]">
        <input
          aria-label={label}
          type="number"
          min={0}
          step="any"
          inputMode="decimal"
          value={text}
          onChange={(event) => commit(event.target.value)}
          className="w-14 min-w-0 bg-transparent text-sm tabular-nums text-[var(--text)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />

        <span className="mx-1 h-4 w-px shrink-0 bg-[var(--line)]" />

        <div className="relative shrink-0">
          <select
            aria-label={`${label}单位`}
            value={unit}
            onChange={(event) => setUnit(event.target.value as DurationUnit)}
            className="appearance-none bg-transparent py-2 pl-1.5 pr-5 text-xs text-[var(--muted)] outline-none"
          >
            {DURATION_UNITS.map((item) => (
              <option key={item.unit} value={item.unit} className="bg-[var(--surface-2)]">
                {item.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="pointer-events-none absolute right-0.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
          />
        </div>
      </div>
    </div>
  );
}
