import { useEffect, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Check } from 'lucide-react';
import { getRecipe } from '@/data/repo';
import { useRequestBack } from '@/navigation/NavigationProvider';
import { useCook } from '@/runtime/CookProvider';
import { useAppStore } from '@/store/useAppStore';
import { BigButton } from '@/components/BigButton';
import { AssetImage } from '@/components/AssetImage';
import { ConfirmSheet } from '@/components/ConfirmSheet';

export function Prep({ recipeId }: { recipeId: string }) {
  const navigate = useAppStore((state) => state.navigate);
  const resetTo = useAppStore((state) => state.resetTo);
  const requestBack = useRequestBack();
  const { state, prepare, begin, startCooking, dispatch } = useCook();
  const recipe = useLiveQuery(async () => (await getRecipe(recipeId)) ?? null, [recipeId]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (recipe) {
      prepare(recipe);
    }
  }, [prepare, recipe]);

  if (recipe === undefined) {
    return <Centered>加载中…</Centered>;
  }

  if (recipe === null) {
    return (
      <Centered>
        <p className="text-lg font-semibold">菜谱找不到了</p>
        <BigButton className="mt-6" onClick={() => resetTo([{ name: 'home' }])}>
          回首页
        </BigButton>
      </Centered>
    );
  }

  const total = recipe.prep.length;
  const checked =
    state?.phase === 'prep' && state.recipe.id === recipe.id ? state.prepChecked : {};
  const prepared = recipe.prep.filter((item) => checked[item.id]).length;
  const remaining = total - prepared;
  const allChecked = total > 0 && remaining === 0;

  const start = () => {
    setConfirmOpen(false);

    if (state?.phase === 'prep' && state.recipe.id === recipe.id) {
      startCooking();
    } else {
      begin(recipe);
    }

    navigate({ name: 'cook' });
  };

  const handleStart = () => {
    if (remaining > 0) {
      setConfirmOpen(true);
      return;
    }

    start();
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-32 pt-6">
      <button
        type="button"
        onClick={requestBack}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface)]"
        aria-label="返回菜谱"
      >
        <ArrowLeft size={20} />
      </button>

      <header className="mt-5">
        <p className="text-xs tracking-[0.25em] text-[var(--accent-ink)]">PREP</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">备菜</h1>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--muted)]">
            {recipe.title} · 已备 {prepared} / {total}
          </p>
          {total > 0 ? (
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_ALL_PREP' })}
              disabled={allChecked}
              className="min-h-11 shrink-0 rounded-full bg-[var(--tint)] px-3 text-xs text-[var(--accent-2)] disabled:opacity-40"
            >
              全部勾选
            </button>
          ) : null}
        </div>
      </header>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[var(--surface)]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all"
          style={{ width: total === 0 ? '100%' : `${(prepared / total) * 100}%` }}
        />
      </div>

      <section className="mt-6 space-y-3">
        {total === 0 ? (
          <p className="rounded-3xl bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">
            这道菜不用提前备菜，直接开火。
          </p>
        ) : (
          recipe.prep.map((item) => {
            const isChecked = Boolean(checked[item.id]);

            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={isChecked}
                onClick={() => dispatch({ type: 'TOGGLE_PREP', itemId: item.id })}
                className="flex w-full items-start gap-4 rounded-3xl bg-[var(--surface)] p-5 text-left transition active:scale-[0.995]"
              >
                <span
                  className={
                    isChecked
                      ? 'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-contrast)]'
                      : 'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--line-strong)] text-transparent'
                  }
                >
                  <Check size={16} strokeWidth={3} />
                </span>
                <span
                  className={
                    isChecked
                      ? 'min-w-0 flex-1 text-[15px] leading-relaxed opacity-50'
                      : 'min-w-0 flex-1 text-[15px] leading-relaxed'
                  }
                >
                  {item.text}
                  {item.tip ? (
                    <span className="mt-1 block text-xs text-[var(--muted)]">{item.tip}</span>
                  ) : null}
                  <AssetImage
                    assetId={item.photoAssetId}
                    src={item.photoSrc}
                    alt={item.text}
                    className="mt-2 h-20 w-28 rounded-xl object-cover"
                  />
                </span>
              </button>
            );
          })
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent">
        <div className="mx-auto w-full max-w-md px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6">
          <BigButton onClick={handleStart}>
            {total === 0
              ? '直接开火'
              : remaining > 0
                ? `开始做菜（还有 ${remaining} 项没备）`
                : '开始做菜'}
          </BigButton>
        </div>
      </div>

      <ConfirmSheet
        open={confirmOpen}
        title={`还有 ${remaining} 项没备好`}
        description="锅里的火不会等人，建议备齐再开火。现在开火也可以，中途缺什么就得自己补。"
        cancelLabel="回去备齐"
        confirmLabel="仍然开火"
        tone="danger"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={start}
      />
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
