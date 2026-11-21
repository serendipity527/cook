import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChefHat, ChevronRight, Copy, Pencil, Plus, Search, Sparkles } from 'lucide-react';
import type { Recipe } from '@shared/schema';
import {
  deleteRecipe,
  duplicateRecipe,
  forkBuiltin,
  getRecipe,
  listAllRecipes,
  listSessions,
  restoreRecipe,
} from '@/data/repo';
import { buildLibrary, matchesSearch } from '@/lib/library';
import { formatAge, formatAgeLabel } from '@/lib/format';
import { useCook } from '@/runtime/CookProvider';
import { useAppStore } from '@/store/useAppStore';
import { ActionSheet, type ActionSheetAction } from '@/components/ActionSheet';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { RecipeRow, type RecipeRowAction } from '@/components/RecipeRow';
import { useToast } from '@/components/ToastProvider';

export function Home() {
  const navigate = useAppStore((state) => state.navigate);
  const resetTo = useAppStore((state) => state.resetTo);
  const { resumeInfo, resume, discardResume } = useCook();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [resumeConfirmOpen, setResumeConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Recipe | null>(null);
  const [recipeMissing, setRecipeMissing] = useState(false);
  const recipeRows = useLiveQuery(() => listAllRecipes(), []);
  const sessionRows = useLiveQuery(() => listSessions(), []);
  const recipes = useMemo(() => recipeRows ?? [], [recipeRows]);
  const sessions = useMemo(() => sessionRows ?? [], [sessionRows]);
  const loading = recipeRows === undefined || sessionRows === undefined;
  const library = useMemo(() => buildLibrary(recipes, sessions), [recipes, sessions]);
  const visibleLibrary = useMemo(
    () => library.filter((entry) => matchesSearch(entry.recipe, query)),
    [library, query],
  );
  const mine = recipes.filter((recipe) => recipe.source !== 'builtin');
  const builtins = recipes.filter((recipe) => recipe.source === 'builtin');
  const showGuide =
    !loading && mine.length === 0 && sessions.length === 0 && query.trim() === '';
  const queryKey = query.trim().toLowerCase();

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

  const handleEdit = async (recipe: Recipe) => {
    if (recipe.source !== 'builtin') {
      navigate({ name: 'edit', recipeId: recipe.id });
      return;
    }

    try {
      const copy = await forkBuiltin(recipe.id);
      showToast({ message: '已复制为我的菜谱，可以开始修改', tone: 'success' });
      navigate({ name: 'edit', recipeId: copy.id });
    } catch (copyError) {
      console.error('[kaihuo] failed to copy a builtin recipe', copyError);
      showToast({ message: '复制失败，请重试', tone: 'danger' });
    }
  };

  const handleDuplicate = async (recipe: Recipe) => {
    try {
      const copy =
        recipe.source === 'builtin'
          ? await forkBuiltin(recipe.id)
          : await duplicateRecipe(recipe.id);
      showToast({ message: `已复制「${copy.title}」`, tone: 'success' });
      navigate({ name: 'detail', recipeId: copy.id });
    } catch (duplicateError) {
      console.error('[kaihuo] failed to duplicate a recipe', duplicateError);
      showToast({
        message: duplicateError instanceof Error ? duplicateError.message : '复制失败，请重试',
        tone: 'danger',
      });
    }
  };

  const handleDelete = async () => {
    const recipe = pendingDelete;

    if (!recipe) {
      return;
    }

    setPendingDelete(null);

    try {
      await deleteRecipe(recipe.id);
      showToast({
        message: `已删除「${recipe.title}」`,
        action: {
          label: '撤销',
          onClick: () => {
            void restoreRecipe(recipe.id)
              .then(() => showToast({ message: '已恢复', tone: 'success' }))
              .catch(() => showToast({ message: '恢复失败，请重试', tone: 'danger' }));
          },
        },
      });
    } catch (deleteError) {
      console.error('[kaihuo] failed to delete a recipe', deleteError);
      showToast({ message: '删除失败，请重试', tone: 'danger' });
    }
  };

  const rowActions = (recipe: Recipe): RecipeRowAction[] =>
    recipe.source === 'builtin'
      ? [
          { label: '复制并编辑', onSelect: () => void handleEdit(recipe) },
          { label: '复制一份', onSelect: () => void handleDuplicate(recipe) },
        ]
      : [
          { label: '编辑', onSelect: () => void handleEdit(recipe) },
          { label: '复制一份', onSelect: () => void handleDuplicate(recipe) },
          {
            label: '删除',
            tone: 'danger',
            onSelect: () => setPendingDelete(recipe),
          },
        ];

  const newActions: ActionSheetAction[] = [
    {
      label: '告诉 AI 一道菜',
      description: '打几行字，自动整理成步骤',
      icon: <Sparkles size={18} />,
      onSelect: () => navigate({ name: 'chat' }),
    },
    {
      label: '手动填写',
      description: '适合已经会做的菜',
      icon: <Pencil size={18} />,
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
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 pb-8 pt-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">开火</h1>
        <button
          type="button"
          onClick={() => navigate({ name: 'studio' })}
          className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-[var(--surface)] px-4 text-sm text-[var(--muted)]"
          aria-label="我的厨房"
        >
          <ChefHat size={18} />
          厨房
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
                recipeMissing ? 'text-xs text-[var(--danger)]' : 'text-xs text-[var(--accent-2)]'
              }
            >
              {recipeMissing
                ? '上次的菜谱已删除'
                : `上次没做完 · ${formatAgeLabel(resumeInfo.ageMs)}`}
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

      {showGuide ? (
        <div className="flex items-center gap-3 rounded-3xl border border-[var(--accent)]/25 bg-[var(--accent)]/5 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent-2)]">
            <Sparkles size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">第一次用开火？</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-[var(--muted)]">
              告诉 AI 一道菜，或直接试下面的内置菜。
            </span>
          </span>
          <button
            type="button"
            onClick={() => navigate({ name: 'chat' })}
            className="min-h-12 shrink-0 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-contrast)]"
          >
            告诉 AI
          </button>
        </div>
      ) : null}

      <div className="relative flex items-center">
        <Search
          size={18}
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--muted)]"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="搜索菜谱"
          placeholder="搜索菜名、标签或食材…"
          className="min-h-12 w-full rounded-2xl bg-[var(--surface)] pr-24 pl-11 text-base outline-none placeholder:text-[var(--muted)]"
        />
        <button
          type="button"
          onClick={() => setNewOpen(true)}
          aria-label="新建菜谱"
          className="absolute top-0 right-0 flex h-12 items-center gap-1 rounded-2xl px-3 text-sm text-[var(--muted)]"
        >
          <Plus size={18} />
          新建
        </button>
      </div>

      {loading ? (
        <div className="space-y-1.5" aria-hidden="true">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="flex animate-pulse items-center gap-3 rounded-2xl bg-[var(--surface)] p-4"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded-full bg-[var(--tint-strong)]" />
                <div className="h-3 w-1/2 rounded-full bg-[var(--tint)]" />
              </div>
            </div>
          ))}
        </div>
      ) : visibleLibrary.length > 0 ? (
        <div className="space-y-1.5">
          {visibleLibrary.map((entry) => {
            const matchedTags = queryKey
              ? entry.recipe.tags.filter((tag) => tag.toLowerCase().includes(queryKey))
              : [];

            return (
              <RecipeRow
                key={entry.recipe.id}
                recipe={entry.recipe}
                lastCookedAt={entry.lastCookedAt}
                matchedTags={matchedTags}
                onOpen={() => navigate({ name: 'detail', recipeId: entry.recipe.id })}
                onFire={
                  entry.lastCookedAt
                    ? () => navigate({ name: 'prep', recipeId: entry.recipe.id })
                    : undefined
                }
                actions={rowActions(entry.recipe)}
              />
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-[var(--line)] p-5 text-sm leading-relaxed text-[var(--muted)]">
          {query.trim() ? '没有匹配的菜谱。' : '还没有菜谱。'}
        </div>
      )}

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
        open={Boolean(pendingDelete)}
        title={pendingDelete ? `删除「${pendingDelete.title}」？` : '删除这道菜？'}
        description="菜谱会从列表移除，做菜记录不受影响。"
        cancelLabel="取消"
        confirmLabel="删除"
        tone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void handleDelete()}
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
