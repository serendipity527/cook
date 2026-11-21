import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft } from 'lucide-react';
import { DraftSpecSchema, type DraftSpec } from '@shared/schema';
import { normalizeDraft } from '@/ai/normalizeDraft';
import { getRecipe, newId, saveRecipe } from '@/data/repo';
import { recipeToDraft } from '@/lib/recipeToDraft';
import { toTimedDraft } from '@/lib/timedSteps';
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
    steps: [{ text: '', kind: 'timed', durationSec: 30 }],
    questions: [],
  };
}

/** 把 zod 的校验路径翻译成用户看得懂的字段名，供报错和定位使用。 */
function draftIssueField(path: PropertyKey[]): { label: string; target: string } {
  const [root, index, field] = path;

  if (root === 'title') {
    return { label: '菜谱名', target: '菜谱名' };
  }

  if (root === 'servings') {
    return { label: '份量', target: '份量' };
  }

  if (root === 'estimatedMinutes') {
    return { label: '预计分钟', target: '预计分钟' };
  }

  if (root === 'tags') {
    const position = typeof index === 'number' ? index + 1 : null;
    return {
      label: position ? `第 ${position} 个标签` : '标签',
      target: '新标签',
    };
  }

  if (root === 'prep' && typeof index === 'number') {
    return { label: `第 ${index + 1} 项备菜`, target: `备菜 ${index + 1}` };
  }

  if (root === 'steps' && typeof index === 'number') {
    const position = index + 1;

    if (field === 'text') {
      return { label: `第 ${position} 步文案`, target: `第 ${position} 步文案` };
    }

    if (field === 'durationSec') {
      return { label: `第 ${position} 步时长`, target: `第 ${position} 步时长` };
    }

    if (field === 'detail') {
      return {
        label: `第 ${position} 步补充说明`,
        target: `第 ${position} 步补充说明`,
      };
    }

    return { label: `第 ${position} 步`, target: `第 ${position} 步文案` };
  }

  return { label: '菜谱内容', target: '' };
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
  const recipeIdRef = useRef<string>(recipeId ?? newId('r'));
  const baselineRef = useRef<string | null>(isNew ? JSON.stringify(createBlankSpec()) : null);
  const seededIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isNew && recipe && seededIdRef.current !== recipe.id) {
      const next = toTimedDraft(recipeToDraft(recipe));
      seededIdRef.current = recipe.id;
      baselineRef.current = JSON.stringify(next);
      setSpec(next);
    }
  }, [isNew, recipe]);

  const dirty = Boolean(
    spec && baselineRef.current && JSON.stringify(spec) !== baselineRef.current,
  );

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
      const fields = parsed.error.issues.map((issue) => draftIssueField(issue.path));
      const labels = [...new Set(fields.map((field) => field.label))];
      const summary = labels.slice(0, 4).join('、');

      setError(
        `还有 ${labels.length} 处需要补全或修改：${summary}${labels.length > 4 ? ' 等' : ''}`,
      );

      const target = fields.find((field) => field.target)?.target;

      if (target) {
        window.requestAnimationFrame(() => {
          const element = document.querySelector<HTMLElement>(`[aria-label="${target}"]`);
          element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
          element?.focus({ preventScroll: true });
        });
      }

      return;
    }

    setSaving(true);
    setError(null);

    try {
      const normalized = normalizeDraft(parsed.data, baseRecipe);
      const updated = {
        ...normalized,
        id: recipeIdRef.current,
        ...(isNew ? { source: 'user' as const } : {}),
      };
      await saveRecipe(updated);
      showToast({
        message: isNew ? '菜谱已创建' : '修改已保存',
        tone: 'success',
      });
      resetTo([{ name: 'home' }, { name: 'detail', recipeId: updated.id }]);
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

      {error ? (
        <p className="mt-4 rounded-2xl bg-[var(--danger)]/10 p-4 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      <DraftEditor
        spec={spec}
        onChange={setSpec}
        heading={isNew ? '菜谱内容' : '修改内容'}
        recipeId={recipeIdRef.current}
      />

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
