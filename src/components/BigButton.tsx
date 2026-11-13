import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'default' | 'compact';

const styles: Record<Variant, string> = {
  primary: 'bg-[var(--accent)] text-[#201008] shadow-lg shadow-orange-950/30',
  secondary: 'bg-[var(--surface)] text-[var(--text)]',
  ghost: 'border border-white/10 bg-transparent text-[var(--text)]',
  danger: 'bg-[var(--danger)]/15 text-[var(--danger)]',
};

export function BigButton({
  variant = 'primary',
  size = 'default',
  type = 'button',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type={type}
      className={clsx(
        'flex w-full items-center justify-center rounded-2xl px-5 font-semibold transition',
        'active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40',
        size === 'default' ? 'min-h-[72px] text-lg' : 'min-h-[52px] text-base',
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
