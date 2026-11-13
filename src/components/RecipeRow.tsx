import type { Recipe } from '@shared/schema';
import { Flame } from 'lucide-react';
import { formatAgeLabel } from '@/lib/format';

interface RecipeRowProps {
  recipe: Recipe;
  lastCookedAt?: number;
  onOpen: () => void;
  onFire?: () => void;
}

function sourceLabel(source: Recipe['source']): string {
  if (source === 'builtin') {
    return '内置';
  }

  return source === 'ai' ? 'AI' : '手动';
}

export function RecipeRow({ recipe, lastCookedAt, onOpen, onFire }: RecipeRowProps) {
  const meta = lastCookedAt
    ? `${sourceLabel(recipe.source)} · ${formatAgeLabel(Date.now() - lastCookedAt)}`
    : sourceLabel(recipe.source);

  return (
    <div className="flex items-center gap-2 rounded-2xl bg-[var(--surface)] p-2 pl-4">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 py-1.5 text-left">
        <p className="truncate text-[15px] font-medium">{recipe.title}</p>
        <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{meta}</p>
      </button>
      {onFire ? (
        <button
          type="button"
          onClick={onFire}
          aria-label={`开火做 ${recipe.title}`}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent-2)]"
        >
          <Flame size={19} />
        </button>
      ) : null}
    </div>
  );
}
