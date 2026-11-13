import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, Copy, PenLine, Plus, Settings, Sparkles } from 'lucide-react';
import { forkBuiltin, listAllRecipes, listSessions } from '@/data/repo';
import { useCook } from '@/runtime/CookProvider';
import { useAppStore } from '@/store/useAppStore';
import { ActionSheet, type ActionSheetAction } from '@/components/ActionSheet';
import { RecipeCard } from '@/components/RecipeCard';
import { useToast } from '@/components/ToastProvider';

export function Home() {
  const navigate = useAppStore((state) => state.navigate);
  const { hasResume, resume } = useCook();
  const { showToast } = useToast();
  const [newOpen, setNewOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
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

  const handleResume = () => {
    if (resume()) {
      navigate({ name: 'cook' });
    }
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
    </main>
  );
}
