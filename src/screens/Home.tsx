import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight } from 'lucide-react';
import { listAllRecipes, listSessions } from '@/data/repo';
import { useCook } from '@/runtime/CookProvider';
import { useAppStore } from '@/store/useAppStore';
import { RecipeCard } from '@/components/RecipeCard';

export function Home() {
  const navigate = useAppStore((state) => state.navigate);
  const { hasResume, resume } = useCook();
  const recipes = useLiveQuery(() => listAllRecipes(), []) ?? [];
  const sessions = useLiveQuery(() => listSessions(), []) ?? [];

  const mine = recipes.filter((recipe) => recipe.source !== 'builtin');
  const builtins = recipes.filter((recipe) => recipe.source === 'builtin');

  const recent = useMemo(() => {
    const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));
    const seen = new Set<string>();
    const result = [];

    for (const session of sessions) {
      if (seen.has(session.recipeId)) {
        continue;
      }

      const recipe = byId.get(session.recipeId);
      if (recipe) {
        seen.add(session.recipeId);
        result.push(recipe);
      }

      if (result.length === 3) {
        break;
      }
    }

    return result;
  }, [recipes, sessions]);

  const handleResume = () => {
    if (resume()) {
      navigate({ name: 'cook' });
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-8 px-5 pb-12 pt-10">
      <header>
        <p className="text-xs font-medium tracking-[0.3em] text-[var(--accent)]">KAIHUO</p>
        <h1 className="mt-1 text-4xl font-bold tracking-tight">开火</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">手上有油也能用的做饭助手</p>
      </header>

      {hasResume ? (
        <button
          type="button"
          onClick={handleResume}
          className="flex w-full items-center justify-between gap-4 rounded-3xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-5 text-left transition active:scale-[0.995]"
        >
          <span>
            <span className="text-xs text-[var(--accent-2)]">上次没做完</span>
            <span className="mt-1 block text-lg font-semibold">继续回到灶台</span>
          </span>
          <ChevronRight className="text-[var(--accent-2)]" />
        </button>
      ) : null}

      {recent.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-medium text-[var(--muted)]">最近做过</h2>
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
            {recent.map((recipe) => (
              <div key={recipe.id} className="w-72 shrink-0">
                <RecipeCard
                  recipe={recipe}
                  onClick={() => navigate({ name: 'detail', recipeId: recipe.id })}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-medium text-[var(--muted)]">我的菜谱</h2>
        {mine.length > 0 ? (
          <div className="space-y-3">
            {mine.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() => navigate({ name: 'detail', recipeId: recipe.id })}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 p-5 text-sm leading-relaxed text-[var(--muted)]">
            还没有自己的菜谱。先从下面的内置菜谱开始，熟悉一下节奏。
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-[var(--muted)]">内置菜谱</h2>
        <div className="space-y-3">
          {builtins.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => navigate({ name: 'detail', recipeId: recipe.id })}
            />
          ))}
        </div>
      </section>

      <footer className="pt-2 text-center text-xs text-[var(--muted)]">
        数据存在这台设备 · 断网也能做菜
      </footer>
    </main>
  );
}
