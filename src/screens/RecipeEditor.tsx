import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft } from 'lucide-react';
import { DraftSpecSchema, type DraftSpec } from '@shared/schema';
import { normalizeDraft } from '@/ai/normalizeDraft';
import { getRecipe, saveRecipe } from '@/data/repo';
import { recipeToDraft } from '@/lib/recipeToDraft';
import { useBackGuard, useRequestBack } from '@/navigation/NavigationProvider';
import { useAppStore } from '@/store/useAppStore';
import { BigButton } from '@/components/BigButton';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { DraftEditor } from '@/components/DraftEditor';
import { useToast } from '@/components/ToastProvider';

function createBlankSpec(): DraftSpec {
  return {
    title: '',
    servings: 2,
    prep: [],
    steps: [{ text: '', kind: 'judgment', suggestRange: [30, 60] }],
    questions: [],
  };
}

export function RecipeEditor({ recipeId }: { recipeId?: string }) {
  const isNew = !recipeId;
  const resetTo = useAppStore((store) => store.resetTo);
  const back = useAppStore((store) => store.back);
  const requestBack = useRequestBack();
  const { showToast } = useToast();
  const recipe = useLiveQuery(
    async () => (recipeId ? ((await getRecipe(recipeId)) ?? null) : null),
    [recipeId],
  );
  const [spec, setSpec] = useState<DraftSpec | null>(() => (isNew ? createBlankSpec() : null));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const baselineRef = useRef<string | null>(isNew ? JSON.stringify(createBlankSpec()) : null);
  const seededIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isNew && recipe && seededIdRef.current !== recipe.id) {
      const next = recipeToDraft(recipe);
      seededIdRef.current = recipe.id;
      baselineRef.current = JSON.stringify(next);
      setSpec(next);
    }
  }, [isNew, recipe]);

  const dirty = Boolean(spec && baselineRef.current && JSON.stringify(spec) !== baselineRef.current);

  useBackGuard(() => {
    if (discardOpen) {
      setDiscardOpen(false);
      return true;
    }

    if (!dirty) {
      return false;
    }

    setDiscardOpen(true);
    return true;
  });

  const leaveWithoutSaving = () => {
    setDiscardOpen(false);

    if (!back()) {
      resetTo([{ name: 'home' }]);
    }
  };

  if (!isNew) {
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

    if (recipe.source === 'builtin') {
      return (
        <Centered>
          <p className="text-lg font-semibold">内置菜谱不能直接编辑</p>
          <p className="mt-2 text-sm text-[var(--muted)]">请从菜谱详情页复制一份再编辑。</p>
          <BigButton className="mt-6" onClick={requestBack}>
            返回菜谱
          </BigButton>
        </Centered>
      );
    }
  }

  if (!spec) {
    return <Centered>加载中…</Centered>;
  }

  const baseRecipe = !isNew && recipe ? recipe : undefined;

  const handleSave = async () => {
    const parsed = DraftSpecSchema.safeParse(spec);

    if (!parsed.success) {
      setError('还有字段不完整，检查一下再保存。');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updated = normalizeDraft(parsed.data, baseRecipe);
      const saved = isNew ? { ...updated, source: 'user' as const } : updated;
      await saveRecipe(saved);
      showToast({
        message: isNew ? '菜谱已创建' : '修改已保存',
        tone: 'success',
      });
      resetTo([{ name: 'home' }, { name: 'detail', recipeId: saved.id }]);
    } catch (saveFailure) {
      setError(saveFailure instanceof Error ? saveFailure.message : '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-36 pt-6">
      <button
        type="button"
        onClick={requestBack}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface)]"
        aria-label={isNew ? '返回' : '返回菜谱'}
      >
        <ArrowLeft size={20} />
      </button>

      <header className="mt-5">
        <p className="text-xs tracking-[0.25em] text-[var(--accent)]">EDIT</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {isNew ? '新建菜谱' : '编辑菜谱'}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {isNew ? '手动填写，保存后就能开火' : (baseRecipe?.title ?? '')}
        </p>
      </header>

      {error ? (
        <p className="mt-4 rounded-2xl bg-[var(--danger)]/10 p-4 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      <DraftEditor spec={spec} onChange={setSpec} heading={isNew ? '菜谱内容' : '修改内容'} />

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent">
        <div className="mx-auto w-full max-w-md px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6">
          <BigButton onClick={() => void handleSave()} disabled={saving}>
            {saving ? '保存中…' : isNew ? '保存菜谱' : '保存修改'}
          </BigButton>
        </div>
      </div>

      <ConfirmSheet
        open={discardOpen}
        title="还有修改没保存"
        description="离开后这次修改会丢失。"
        cancelLabel="继续编辑"
        confirmLabel="放弃修改"
        tone="danger"
        onCancel={() => setDiscardOpen(false)}
        onConfirm={leaveWithoutSaving}
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
