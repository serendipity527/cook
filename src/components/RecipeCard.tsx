import type { Recipe } from '@shared/schema';
import { Clock3, Users } from 'lucide-react';

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
}

export function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-3xl bg-[var(--surface)] p-5 text-left transition active:scale-[0.995]"
    >
      <div className="flex flex-wrap items-center gap-2">
        {recipe.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-[var(--accent)]/10 px-2.5 py-1 text-[11px] text-[var(--accent-2)]"
          >
            {tag}
          </span>
        ))}
      </div>

      <h3 className="mt-3 text-xl font-semibold tracking-tight">{recipe.title}</h3>

      {recipe.subtitle ? (
        <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{recipe.subtitle}</p>
      ) : null}

      <div className="mt-3 flex items-center gap-4 text-xs text-[var(--muted)]">
        <span className="flex items-center gap-1.5">
          <Clock3 size={14} />
          {recipe.estimatedMinutes
            ? `${recipe.estimatedMinutes} 分钟`
            : `${recipe.steps.length} 步`}
        </span>
        <span className="flex items-center gap-1.5">
          <Users size={14} />
          {recipe.servings} 人份
        </span>
        <span>{recipe.steps.length} 步</span>
      </div>
    </button>
  );
}
