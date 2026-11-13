import { useEffect, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft } from 'lucide-react';
import { DraftSpecSchema, type DraftSpec } from '@shared/schema';
import { normalizeDraft } from '@/ai/normalizeDraft';
import { getRecipe, saveRecipe } from '@/data/repo';
import { recipeToDraft } from '@/lib/recipeToDraft';
import { useAppStore } from '@/store/useAppStore';
import { BigButton } from '@/components/BigButton';
import { DraftEditor } from '@/components/DraftEditor';

export function RecipeEditor({ recipeId }: { recipeId: string }) {
  const navigate = useAppStore((store) => store.navigate);
  const recipe = useLiveQuery(async () => (await getRecipe(recipeId)) ?? null, [recipeId]);
  const [spec, setSpec] = useState<DraftSpec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (recipe) {
      setSpec(recipeToDraft(recipe));
    }
  }, [recipe]);

  if (recipe === undefined || (recipe !== null && !spec)) {
    return <Centered>加载中…</Centered>;
  }

  if (recipe === null) {
    return (
      <Centered>
        <p className="text-lg font-semibold">菜谱找不到了</p>
        <BigButton className="mt-6" onClick={() => navigate({ name: 'home' })}>
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
        <BigButton
          className="mt-6"
          onClick={() => navigate({ name: 'detail', recipeId: recipe.id })}
        >
          返回菜谱
        </BigButton>
      </Centered>
    );
  }

  if (!spec) {
    return <Centered>加载中…</Centered>;
  }

  const handleSave = async () => {
    const parsed = DraftSpecSchema.safeParse(spec);

    if (!parsed.success) {
      setError('还有字段不完整，检查一下再保存。');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updated = normalizeDraft(parsed.data, recipe);
      await saveRecipe(updated);
      navigate({ name: 'detail', recipeId: updated.id });
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
        onClick={() => navigate({ name: 'detail', recipeId })}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface)]"
        aria-label="返回菜谱"
      >
        <ArrowLeft size={20} />
      </button>

      <header className="mt-5">
        <p className="text-xs tracking-[0.25em] text-[var(--accent)]">EDIT</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">编辑菜谱</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{recipe.title}</p>
      </header>

      {error ? (
        <p className="mt-4 rounded-2xl bg-[var(--danger)]/10 p-4 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      <DraftEditor spec={spec} onChange={setSpec} heading="修改内容" />

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent">
        <div className="mx-auto w-full max-w-md px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6">
          <BigButton onClick={() => void handleSave()} disabled={saving}>
            {saving ? '保存中…' : '保存修改'}
          </BigButton>
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
