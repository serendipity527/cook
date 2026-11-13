import type { Recipe } from '@shared/schema';
import { Flame } from 'lucide-react';
import { formatAgeLabel } from '@/lib/format';

interface RecipeRowProps {
  recipe: Recipe;
  lastCookedAt?: number;
  matchedTags?: string[];
  onOpen: () => void;
  onFire?: () => void;
}

function sourceLabel(source: Recipe['source']): string {
  if (source === 'builtin') {
    return '内置';
  }

  return source === 'ai' ? 'AI' : '手动';
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
}: RecipeRowProps) {
  const segments = [
    ...matchedTags.map((tag) => `#${tag}`),
    sourceLabel(recipe.source),
    ...(lastCookedAt ? [formatAgeLabel(Date.now() - lastCookedAt)] : []),
  ];

  return (
    <div className="flex items-center gap-2 rounded-2xl bg-[var(--surface)] p-2 pl-4">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 py-1.5 text-left">
        <span className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate text-[15px] font-medium">{recipe.title}</span>
          <span className="shrink-0 text-xs text-[var(--muted)]">{statsLabel(recipe)}</span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">
          {segments.join(' · ')}
        </span>
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
    </div>
  );
}
