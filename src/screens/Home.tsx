import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, Copy, PenLine, Plus, Settings, Sparkles } from 'lucide-react';
import { forkBuiltin, getRecipe, listAllRecipes, listSessions } from '@/data/repo';
import { useCook } from '@/runtime/CookProvider';
import { useAppStore } from '@/store/useAppStore';
import { ActionSheet, type ActionSheetAction } from '@/components/ActionSheet';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { RecipeCard } from '@/components/RecipeCard';
import { useToast } from '@/components/ToastProvider';

function formatAge(ageMs: number): string {
  if (ageMs < 60 * 60 * 1000) {
    return '不到 1 小时';
  }

  if (ageMs < 24 * 60 * 60 * 1000) {
    return `${Math.round(ageMs / (60 * 60 * 1000))} 小时`;
  }

  return `${Math.round(ageMs / (24 * 60 * 60 * 1000))} 天`;
}

export function Home() {
  const navigate = useAppStore((state) => state.navigate);
  const resetTo = useAppStore((state) => state.resetTo);
  const { resumeInfo, resume, discardResume } = useCook();
  const { showToast } = useToast();
  const [newOpen, setNewOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [resumeConfirmOpen, setResumeConfirmOpen] = useState(false);
  const [recipeMissing, setRecipeMissing] = useState(false);
  const recipeRows = useLiveQuery(() => listAllRecipes(), []);
  const sessionRows = useLiveQuery(() => listSessions(), []);
  const recipes = useMemo(() => recipeRows ?? [], [recipeRows]);
  const sessions = useMemo(() => sessionRows ?? [], [sessionRows]);

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

  useEffect(() => {
    if (!resumeInfo) {
      setRecipeMissing(false);
      return;
    }

    let cancelled = false;

    void getRecipe(resumeInfo.recipeId)
      .then((recipe) => {
        if (!cancelled) {
          setRecipeMissing(!recipe);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRecipeMissing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [resumeInfo]);

  const handleResume = () => {
    if (!resumeInfo) {
      return;
    }

    if (recipeMissing) {
      discardResume();
      showToast({ message: '已丢弃上次的记录' });
      return;
    }

    if (!resumeInfo.fresh) {
      setResumeConfirmOpen(true);
      return;
    }

    if (resume()) {
      resetTo([{ name: 'home' }, { name: 'cook' }]);
    }
  };

  const continueStaleResume = () => {
    setResumeConfirmOpen(false);

    if (resume()) {
      resetTo([{ name: 'home' }, { name: 'cook' }]);
    }
  };

  const discardStaleResume = () => {
    setResumeConfirmOpen(false);
    discardResume();
    showToast({ message: '已丢弃上次的记录' });
  };

  const handleCopyBuiltin = async (recipeId: string) => {
    try {
      const copy = await forkBuiltin(recipeId);
      showToast({ message: '已复制为我的菜谱', tone: 'success' });
      navigate({ name: 'edit', recipeId: copy.id });
    } catch (copyError) {
      console.error('[kaihuo] failed to copy a builtin recipe', copyError);
      showToast({ message: '复制失败，请重试', tone: 'danger' });
    }
  };

  const newActions: ActionSheetAction[] = [
    {
      label: '和 AI 说一道菜',
      description: '口述做法，自动整理成步骤',
      icon: <Sparkles size={18} />,
      onSelect: () => navigate({ name: 'chat' }),
    },
    {
      label: '手动填写',
      description: '适合已经会做的菜',
      icon: <PenLine size={18} />,
      onSelect: () => navigate({ name: 'edit' }),
    },
    {
      label: '从内置复制',
      description: '复制一份再改',
      icon: <Copy size={18} />,
      onSelect: () => setCopyOpen(true),
    },
  ];

  const copyActions: ActionSheetAction[] = builtins.map((recipe) => ({
    label: recipe.title,
    description: `${recipe.steps.length} 步 · ${recipe.servings} 人份`,
    onSelect: () => void handleCopyBuiltin(recipe.id),
  }));

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-8 px-5 pb-12 pt-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.3em] text-[var(--accent)]">KAIHUO</p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight">开火</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">手上有油也能用的做饭助手</p>
        </div>
        <button
          type="button"
          onClick={() => navigate({ name: 'studio' })}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--muted)]"
          aria-label="管理与设置"
        >
          <Settings size={19} />
        </button>
      </header>

      {resumeInfo ? (
        <button
          type="button"
          onClick={handleResume}
          className={
            recipeMissing
              ? 'flex w-full items-center justify-between gap-4 rounded-3xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-5 text-left transition active:scale-[0.995]'
              : 'flex w-full items-center justify-between gap-4 rounded-3xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-5 text-left transition active:scale-[0.995]'
          }
        >
          <span className="min-w-0">
            <span
              className={
                recipeMissing
                  ? 'text-xs text-[var(--danger)]'
                  : 'text-xs text-[var(--accent-2)]'
              }
            >
              {recipeMissing
                ? '上次的菜谱已删除'
                : resumeInfo.fresh
                  ? '上次没做完'
                  : `上次没做完 · ${formatAge(resumeInfo.ageMs)}前`}
            </span>
            <span className="mt-1 block truncate text-lg font-semibold">
              {recipeMissing
                ? '点这里丢弃这条记录'
                : `${resumeInfo.title} · 第 ${resumeInfo.stepIndex + 1}/${resumeInfo.totalSteps} 步`}
            </span>
          </span>
          <ChevronRight
            className={
              recipeMissing ? 'shrink-0 text-[var(--danger)]' : 'shrink-0 text-[var(--accent-2)]'
            }
          />
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => navigate({ name: 'chat' })}
        className="flex w-full items-center gap-4 rounded-3xl border border-[var(--accent)]/25 bg-[var(--accent)]/5 p-5 text-left transition active:scale-[0.995]"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)]/15 text-[var(--accent-2)]">
          <Sparkles size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold">和 AI 说一道菜</span>
          <span className="mt-0.5 block text-xs text-[var(--muted)]">
            口述做法，自动整理成步骤和倒计时
          </span>
        </span>
        <ChevronRight className="shrink-0 text-[var(--muted)]" />
      </button>

      {recent.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-medium text-[var(--muted)]">最近做过</h2>
          <div className="scrollbar-hide -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
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
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-[var(--muted)]">我的菜谱</h2>
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            className="flex min-h-11 items-center gap-1 rounded-full bg-white/5 px-3 text-xs text-[var(--accent-2)]"
          >
            <Plus size={14} />
            新建
          </button>
        </div>
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

      <ActionSheet
        open={newOpen}
        title="新建菜谱"
        actions={newActions}
        onClose={() => setNewOpen(false)}
      />
      <ActionSheet
        open={copyOpen}
        title="复制哪道内置菜？"
        actions={copyActions}
        onClose={() => setCopyOpen(false)}
      />
      <ConfirmSheet
        open={resumeConfirmOpen}
        title="继续上次做菜？"
        description={
          resumeInfo
            ? `「${resumeInfo.title}」停在第 ${resumeInfo.stepIndex + 1}/${resumeInfo.totalSteps} 步，已经过了 ${formatAge(resumeInfo.ageMs)}。继续会按现在的时间补算。`
            : ''
        }
        cancelLabel="继续做"
        confirmLabel="丢弃这次"
        tone="danger"
        onCancel={continueStaleResume}
        onDismiss={() => setResumeConfirmOpen(false)}
        onConfirm={discardStaleResume}
      />
    </main>
  );
}
