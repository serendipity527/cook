import { useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Check } from 'lucide-react';
import { getRecipe } from '@/data/repo';
import { useRequestBack } from '@/navigation/NavigationProvider';
import { useCook } from '@/runtime/CookProvider';
import { useAppStore } from '@/store/useAppStore';
import { BigButton } from '@/components/BigButton';

export function Prep({ recipeId }: { recipeId: string }) {
  const navigate = useAppStore((state) => state.navigate);
  const resetTo = useAppStore((state) => state.resetTo);
  const requestBack = useRequestBack();
  const { begin } = useCook();
  const recipe = useLiveQuery(async () => (await getRecipe(recipeId)) ?? null, [recipeId]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

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
  const prepared = recipe.prep.filter((item) => checked[item.id]).length;
  const remaining = total - prepared;

  const start = () => {
    begin(recipe);
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
        <p className="text-xs tracking-[0.25em] text-[var(--accent)]">PREP</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">备菜</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {recipe.title} · 已备 {prepared} / {total}
        </p>
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
                onClick={() =>
                  setChecked((current) => ({ ...current, [item.id]: !current[item.id] }))
                }
                className="flex w-full items-start gap-4 rounded-3xl bg-[var(--surface)] p-5 text-left transition active:scale-[0.995]"
              >
                <span
                  className={
                    isChecked
                      ? 'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[#201008]'
                      : 'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/20 text-transparent'
                  }
                >
                  <Check size={16} strokeWidth={3} />
                </span>
                <span className={isChecked ? 'text-[15px] leading-relaxed opacity-50' : 'text-[15px] leading-relaxed'}>
                  {item.text}
                  {item.tip ? (
                    <span className="mt-1 block text-xs text-[var(--muted)]">{item.tip}</span>
                  ) : null}
                </span>
              </button>
            );
          })
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent">
        <div className="mx-auto w-full max-w-md px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6">
          <BigButton onClick={handleStart}>
            {remaining > 0 ? `开始做菜（还有 ${remaining} 项没备）` : '开始做菜'}
          </BigButton>
        </div>
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-[var(--surface)] p-6">
            <h2 className="text-xl font-semibold">还有 {remaining} 项没备好</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              炒菜中途没空切葱。建议备完再开火，不然锅里的火不会等你。
            </p>
            <div className="mt-6 space-y-3">
              <BigButton
                onClick={() => {
                  setConfirmOpen(false);
                  start();
                }}
              >
                还是开始
              </BigButton>
              <BigButton variant="secondary" onClick={() => setConfirmOpen(false)}>
                再检查一下
              </BigButton>
            </div>
          </div>
        </div>
      ) : null}
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
