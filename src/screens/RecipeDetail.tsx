import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ReactNode } from 'react';
import { ArrowLeft, Clock3, Eye, Flame, ListOrdered, Pencil, Timer, Users } from 'lucide-react';
import clsx from 'clsx';
import { isTimedStep } from '@shared/schema';
import { forkBuiltin, getRecipe } from '@/data/repo';
import { useRequestBack } from '@/navigation/NavigationProvider';
import { formatEstimatedMinutes, formatRange, formatSeconds } from '@/lib/format';
import { useAppStore } from '@/store/useAppStore';
import { BigButton } from '@/components/BigButton';
import { AssetImage } from '@/components/AssetImage';
import { useToast } from '@/components/ToastProvider';

const HEAT_LABELS = {
  low: '小火',
  medium: '中火',
  high: '大火',
} as const;

function splitPrep(text: string): { main: string; detail?: string } {
  const index = text.indexOf('，');
  if (index === -1) {
    return { main: text };
  }

  return { main: text.slice(0, index), detail: text.slice(index + 1) };
}

export function RecipeDetail({ recipeId }: { recipeId: string }) {
  const navigate = useAppStore((state) => state.navigate);
  const resetTo = useAppStore((state) => state.resetTo);
  const requestBack = useRequestBack();
  const { showToast } = useToast();
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
        <BigButton className="mt-6" onClick={() => resetTo([{ name: 'home' }])}>
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
        showToast({ message: '已复制为我的菜谱', tone: 'success' });
        navigate({ name: 'edit', recipeId: copy.id });
        return;
      }

      navigate({ name: 'edit', recipeId: recipe.id });
    } catch (error) {
      console.error('[kaihuo] failed to open the recipe editor', error);
      showToast({ message: '暂时无法编辑这道菜', tone: 'danger' });
    } finally {
      setForking(false);
    }
  };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-32 pt-6">
      <button
        type="button"
        onClick={requestBack}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--text)]"
        aria-label="返回"
      >
        <ArrowLeft size={20} />
      </button>

      <header className="mt-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="min-w-0 text-3xl font-bold tracking-tight">{recipe.title}</h1>
          <button
            type="button"
            onClick={() => void handleEdit()}
            disabled={forking}
            className="mt-0.5 flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-[var(--surface)] px-3.5 text-xs text-[var(--muted)] disabled:opacity-50"
          >
            <Pencil size={14} />
            {forking ? '准备中…' : recipe.source === 'builtin' ? '复制并编辑' : '编辑'}
          </button>
        </div>
        {recipe.subtitle ? (
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">{recipe.subtitle}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--muted)]">
          {estimate ? (
            <span className="flex items-center gap-1.5">
              <Clock3 size={14} />
              {estimate}
            </span>
          ) : null}
          <span className="flex items-center gap-1.5">
            <Users size={14} />
            {recipe.servings} 人份
          </span>
          <span className="flex items-center gap-1.5">
            <ListOrdered size={14} />
            {recipe.steps.length} 步
          </span>
        </div>

        {recipe.tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--accent-2)]">
            {recipe.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
        ) : null}
      </header>

      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium text-[var(--muted)]">备菜</h2>
          {recipe.prep.length > 0 ? (
            <span className="text-xs text-[var(--muted)]">{recipe.prep.length} 项</span>
          ) : null}
        </div>
        {recipe.prep.length > 0 ? (
          <ul className="space-y-2.5 rounded-3xl bg-[var(--surface)] p-5">
            {recipe.prep.map((item) => {
              const { main, detail } = splitPrep(item.text);

              return (
                <li key={item.id} className="flex gap-3 text-[15px] leading-relaxed">
                  <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span>
                    {main}
                    {detail ? (
                      <span className="text-[var(--muted)]">，{detail}</span>
                    ) : null}
                    {item.tip ? (
                      <span className="mt-0.5 block text-xs text-[var(--muted)]">{item.tip}</span>
                    ) : null}
                    <AssetImage
                      assetId={item.photoAssetId}
                      src={item.photoSrc}
                      alt={main}
                      className="mt-2 h-24 w-full max-w-[220px] rounded-xl object-cover"
                    />
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-[var(--muted)]">这道菜不用提前备菜。</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-[var(--muted)]">步骤</h2>
        <ol>
          {recipe.steps.map((step, index) => {
            const timed = isTimedStep(step);
            const meta = timed
              ? formatSeconds(step.durationSec)
              : step.suggestRange
                ? `约 ${formatRange(step.suggestRange)}`
                : '看状态';

            return (
              <li
                key={step.id}
                className="flex gap-3 border-b border-[var(--line)] pb-3.5 last:border-b-0 last:pb-0"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-xs font-semibold text-[var(--muted)]">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium leading-relaxed">{step.text}</p>
                  {step.detail ? (
                    <p className="mt-0.5 text-sm leading-relaxed text-[var(--muted)]">
                      {step.detail}
                    </p>
                  ) : null}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
                    <span
                      className={clsx(
                        'flex items-center gap-1',
                        !timed && 'text-[var(--accent-2)]',
                      )}
                    >
                      {timed ? <Timer size={12} /> : <Eye size={12} />}
                      {meta}
                    </span>
                    {step.heat ? (
                      <span className="flex items-center gap-1">
                        <Flame size={12} />
                        {HEAT_LABELS[step.heat]}
                      </span>
                    ) : null}
                  </div>
                  {step.tip ? (
                    <p className="mt-2 border-l-2 border-[var(--accent)]/40 pl-3 text-xs leading-relaxed text-[var(--muted)]">
                      <span className="text-[var(--accent-2)]">提示 · </span>
                      {step.tip}
                    </p>
                  ) : null}
                  <AssetImage
                    assetId={step.photoAssetId}
                    src={step.photoSrc}
                    alt={`第 ${index + 1} 步`}
                    className="mt-2 h-40 w-full rounded-xl object-cover"
                  />
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
