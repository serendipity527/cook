import { useEffect, useRef, useState } from 'react';
import type { Recipe } from '@shared/schema';
import { Flame, MoreVertical } from 'lucide-react';
import { formatAgeLabel } from '@/lib/format';

export interface RecipeRowAction {
  label: string;
  tone?: 'default' | 'danger';
  onSelect: () => void;
}

interface RecipeRowProps {
  recipe: Recipe;
  lastCookedAt?: number;
  matchedTags?: string[];
  onOpen: () => void;
  onFire?: () => void;
  actions?: RecipeRowAction[];
}

function statsLabel(recipe: Recipe): string {
  const parts: string[] = [];

  if (recipe.estimatedMinutes) {
    parts.push(`${recipe.estimatedMinutes} 分钟`);
  }

  parts.push(`${recipe.servings} 人份`, `${recipe.steps.length} 步`);
  return parts.join(' · ');
}

export function RecipeRow({
  recipe,
  lastCookedAt,
  matchedTags = [],
  onOpen,
  onFire,
  actions = [],
}: RecipeRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const segments = [
    ...matchedTags.map((tag) => `#${tag}`),
    ...(lastCookedAt ? [formatAgeLabel(Date.now() - lastCookedAt)] : []),
  ];

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <div
      ref={rootRef}
      className="relative flex items-center gap-2 rounded-2xl bg-[var(--surface)] p-2 pl-4"
    >
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 py-1.5 text-left">
        <span className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate text-[15px] font-medium">{recipe.title}</span>
          <span className="shrink-0 text-xs text-[var(--muted)]">{statsLabel(recipe)}</span>
        </span>
        {segments.length > 0 ? (
          <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">
            {segments.join(' · ')}
          </span>
        ) : null}
      </button>
      {onFire ? (
        <button
          type="button"
          onClick={onFire}
          aria-label={`开火做 ${recipe.title}`}
          className="flex min-h-12 shrink-0 items-center gap-1.5 rounded-xl bg-[var(--accent)]/15 px-3 text-sm font-semibold text-[var(--accent-2)]"
        >
          <Flame size={16} />
          开火
        </button>
      ) : null}
      {actions.length > 0 ? (
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={`更多操作 ${recipe.title}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className={
              menuOpen
                ? 'flex min-h-12 w-9 items-center justify-center rounded-xl text-[var(--text)]'
                : 'flex min-h-12 w-9 items-center justify-center rounded-xl text-[var(--muted)]'
            }
          >
            <MoreVertical size={18} />
          </button>

          {menuOpen ? (
            <div
              role="menu"
              aria-label={`${recipe.title} 操作`}
              className="absolute top-full right-0 z-20 mt-1 w-28 overflow-hidden rounded-xl bg-[var(--surface-2)] p-1 shadow-xl ring-1 ring-[var(--line-strong)]"
            >
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    action.onSelect();
                  }}
                  className={
                    action.tone === 'danger'
                      ? 'block w-full rounded-lg px-3 py-2 text-left text-xs text-[var(--danger)] active:bg-[var(--tint-strong)]'
                      : 'block w-full rounded-lg px-3 py-2 text-left text-xs text-[var(--text)] active:bg-[var(--tint-strong)]'
                  }
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
