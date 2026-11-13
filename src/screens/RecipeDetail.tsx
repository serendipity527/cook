import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ReactNode } from 'react';
import { ArrowLeft, Clock3, Pencil, Users } from 'lucide-react';
import { isTimedStep } from '@shared/schema';
import { forkBuiltin, getRecipe } from '@/data/repo';
import { formatEstimatedMinutes, formatRange, formatSeconds } from '@/lib/format';
import { useAppStore } from '@/store/useAppStore';
import { BigButton } from '@/components/BigButton';

export function RecipeDetail({ recipeId }: { recipeId: string }) {
  const navigate = useAppStore((state) => state.navigate);
  const recipe = useLiveQuery(async () => (await getRecipe(recipeId)) ?? null, [recipeId]);
  const [forking, setForking] = useState(false);

  if (recipe === undefined) {
    return <Centered>加载中…</Centered>;
  }

  if (recipe === null) {
    return (
      <Centered>
        <p className="text-lg font-semibold">菜谱找不到了</p>
        <p className="mt-2 text-sm text-[var(--muted)]">它可能已经被删除。</p>
        <BigButton className="mt-6" onClick={() => navigate({ name: 'home' })}>
          回首页
        </BigButton>
      </Centered>
    );
  }

  const estimate = formatEstimatedMinutes(recipe.estimatedMinutes);

  const handleEdit = async () => {
    try {
      if (recipe.source === 'builtin') {
        setForking(true);
        const copy = await forkBuiltin(recipe.id);
        navigate({ name: 'edit', recipeId: copy.id });
        return;
      }

      navigate({ name: 'edit', recipeId: recipe.id });
    } catch (error) {
      console.error('[kaihuo] failed to open the recipe editor', error);
      window.alert('暂时无法编辑这道菜');
    } finally {
      setForking(false);
    }
  };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-32 pt-6">
      <button
        type="button"
        onClick={() => navigate({ name: 'home' })}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--text)]"
        aria-label="返回首页"
      >
        <ArrowLeft size={20} />
      </button>

      <header className="mt-5">
        <div className="flex flex-wrap gap-2">
          {recipe.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[var(--accent)]/10 px-2.5 py-1 text-[11px] text-[var(--accent-2)]"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-3 flex items-start justify-between gap-3">
          <h1 className="min-w-0 text-3xl font-bold tracking-tight">{recipe.title}</h1>
          <button
            type="button"
            onClick={() => void handleEdit()}
            disabled={forking}
            className="mt-1 flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 py-2 text-xs text-[var(--muted)] disabled:opacity-50"
          >
            <Pencil size={14} />
            {forking ? '准备中…' : recipe.source === 'builtin' ? '复制并编辑' : '编辑'}
          </button>
        </div>
        {recipe.subtitle ? (
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{recipe.subtitle}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[var(--muted)]">
          <span className="flex items-center gap-1.5">
            <Clock3 size={14} />
            {estimate ?? `${recipe.steps.length} 步`}
          </span>
          <span className="flex items-center gap-1.5">
            <Users size={14} />
            {recipe.servings} 人份
          </span>
          <span>{recipe.steps.length} 步</span>
        </div>
      </header>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-[var(--muted)]">备菜</h2>
        {recipe.prep.length > 0 ? (
          <ul className="space-y-2.5 rounded-3xl bg-[var(--surface)] p-5">
            {recipe.prep.map((item) => (
              <li key={item.id} className="flex gap-3 text-[15px] leading-relaxed">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                <span>
                  {item.text}
                  {item.tip ? (
                    <span className="mt-0.5 block text-xs text-[var(--muted)]">{item.tip}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--muted)]">这道菜不用提前备菜。</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-[var(--muted)]">步骤</h2>
        <ol className="space-y-4">
          {recipe.steps.map((step, index) => {
            const meta = isTimedStep(step)
              ? formatSeconds(step.durationSec)
              : step.suggestRange
                ? `约 ${formatRange(step.suggestRange)}`
                : '看状态';

            return (
              <li key={step.id} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-xs font-semibold text-[var(--muted)]">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] leading-relaxed">{step.text}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{meta}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent">
        <div className="mx-auto w-full max-w-md px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6">
          <BigButton onClick={() => navigate({ name: 'prep', recipeId })}>开始做菜</BigButton>
        </div>
      </div>
    </main>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-8 text-center">
      {children}
    </main>
  );
}
