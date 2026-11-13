import { useMemo, useRef, useState } from 'react';
import { useObject } from '@ai-sdk/react';
import type { DeepPartial } from 'ai';
import { ArrowLeft, Send, Sparkles } from 'lucide-react';
import {
  DraftSpecSchema,
  type DraftRequest,
  type DraftSpec,
  type StepInput,
} from '@shared/schema';
import { normalizeDraft } from '@/ai/normalizeDraft';
import { requestPersistence, saveRecipe } from '@/data/repo';
import { formatSeconds } from '@/lib/format';
import { aiErrorMessage } from '@/lib/aiError';
import { useAppStore } from '@/store/useAppStore';
import { BigButton } from '@/components/BigButton';
import { DraftEditor } from '@/components/DraftEditor';

const example =
  '番茄炒蛋，两个人吃。番茄两个切块，鸡蛋三个加盐打散。先热锅倒油，倒蛋液炒到凝固盛出，再炒番茄出汁，倒回鸡蛋，加盐糖翻匀出锅。';

function getAiSessionId(): string {
  const storageKey = 'kaihuo:ai-session';
  const existing = window.localStorage.getItem(storageKey);

  if (existing) {
    return existing;
  }

  const id =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(storageKey, id);
  return id;
}

export function StudioChat() {
  const navigate = useAppStore((store) => store.navigate);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editedSpec, setEditedSpec] = useState<DraftSpec | null>(null);
  const lastSpecRef = useRef<DraftSpec | null>(null);
  const sessionId = useMemo(() => getAiSessionId(), []);

  const { object, submit, isLoading, error, stop, clear } = useObject<
    typeof DraftSpecSchema,
    DraftSpec,
    DraftRequest
  >({
    api: '/api/recipe/draft',
    schema: DraftSpecSchema,
    onFinish: ({ object: finished, error: finishError }) => {
      if (finishError) {
        return;
      }

      const parsed = DraftSpecSchema.safeParse(finished);

      if (parsed.success) {
        lastSpecRef.current = parsed.data;
        setEditedSpec(parsed.data);
      }
    },
    onError: () => {
      // 生成失败时回到上一版可用草稿，用户输入不白费
      if (lastSpecRef.current) {
        setEditedSpec(lastSpecRef.current);
      }
    },
  });

  const parsedDraft = useMemo(
    () => DraftSpecSchema.safeParse(editedSpec ?? object),
    [editedSpec, object],
  );
  const prep = (object?.prep ?? []).filter((item) => Boolean(item?.text));
  const steps = (object?.steps ?? []).filter((step) => Boolean(step?.text));
  const questions = (object?.questions ?? []).filter(
    (question): question is string => typeof question === 'string' && question.length > 0,
  );

  const handleSend = () => {
    if (isLoading) {
      stop();
      return;
    }

    const text = input.trim();
    if (!text) {
      return;
    }

    const current = DraftSpecSchema.safeParse(editedSpec ?? object);
    lastSpecRef.current = current.success ? current.data : lastSpecRef.current;
    setMessages((currentMessages) => [...currentMessages, text]);
    setEditedSpec(null);
    setInput('');
    setSaveError(null);
    submit({
      draft: current.success ? current.data : null,
      message: text,
      locale: 'zh-CN',
      sessionId,
    });
  };

  const handleSave = async () => {
    if (!parsedDraft.success) {
      setSaveError('菜谱还不完整，再补充一句，或者继续生成。');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const recipe = normalizeDraft(parsedDraft.data);
      await saveRecipe(recipe);
      void requestPersistence().catch(() => undefined);
      navigate({ name: 'detail', recipeId: recipe.id });
    } catch (saveFailure) {
      setSaveError(saveFailure instanceof Error ? saveFailure.message : '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    stop();
    clear();
    setMessages([]);
    setEditedSpec(null);
    lastSpecRef.current = null;
    setInput('');
    setSaveError(null);
  };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-72 pt-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate({ name: 'home' })}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface)]"
          aria-label="返回首页"
        >
          <ArrowLeft size={20} />
        </button>
        {object || messages.length > 0 ? (
          <button
            type="button"
            onClick={handleReset}
            className="rounded-full bg-white/5 px-3 py-2 text-xs text-[var(--muted)]"
          >
            重新开始
          </button>
        ) : null}
      </div>

      <header className="mt-5">
        <p className="text-xs tracking-[0.25em] text-[var(--accent)]">AI STUDIO</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">说一道菜</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          口述你的做法，AI 会整理成备菜清单、步骤和倒计时。
        </p>
      </header>

      {messages.length > 0 ? (
        <div className="mt-6 space-y-2">
          {messages.slice(-3).map((message, index) => (
            <p
              key={`${message}-${index}`}
              className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-[var(--surface)] px-4 py-2.5 text-sm leading-relaxed"
            >
              {message}
            </p>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-4 text-sm leading-relaxed">
          <p className="font-medium text-[var(--danger)]">生成失败了</p>
          <p className="mt-1 text-[var(--muted)]">{aiErrorMessage(error)}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            如果是第一次使用，请确认网关已配置 AI_API_KEY 后重启。
          </p>
        </div>
      ) : null}

      {isLoading && !object ? (
        <section className="mt-8 rounded-3xl bg-[var(--surface)] p-6">
          <div className="flex items-center gap-3">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            <div>
              <p className="text-sm font-medium">正在整理菜谱</p>
              <p className="mt-1 text-xs text-[var(--muted)]">通常需要半分钟，先别关页面。</p>
            </div>
          </div>
        </section>
      ) : null}

      {!object && !isLoading ? (
        <section className="mt-8 rounded-3xl border border-white/10 p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent)]/15 text-[var(--accent-2)]">
            <Sparkles size={20} />
          </div>
          <h2 className="mt-4 text-xl font-semibold">说一遍，就能照着做</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            比如：“番茄炒蛋，两个人吃。番茄两个切块，鸡蛋三个加盐打散……”
          </p>
          <button
            type="button"
            onClick={() => setInput(example)}
            className="mt-4 text-sm text-[var(--accent-2)]"
          >
            用示例填一句
          </button>
        </section>
      ) : null}

      {editedSpec && !isLoading ? (
        <DraftEditor spec={editedSpec} onChange={setEditedSpec} />
      ) : object ? (
        <section className="mt-6 rounded-3xl bg-[var(--surface)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold tracking-tight">
                {typeof object.title === 'string' && object.title.length > 0
                  ? object.title
                  : '正在整理菜谱…'}
              </h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {typeof object.servings === 'number' ? `${object.servings} 人份` : ''}
                {typeof object.estimatedMinutes === 'number'
                  ? ` · 约 ${object.estimatedMinutes} 分钟`
                  : ''}
              </p>
            </div>
            {isLoading ? (
              <span className="shrink-0 rounded-full bg-[var(--accent)]/10 px-3 py-1 text-[11px] text-[var(--accent-2)]">
                生成中…
              </span>
            ) : null}
          </div>

          {prep.length > 0 ? (
            <div className="mt-5">
              <h3 className="text-xs font-medium text-[var(--muted)]">备菜</h3>
              <ul className="mt-2 space-y-2">
                {prep.map((item, index) => (
                  <li key={`${item?.text}-${index}`} className="flex gap-2.5 text-sm leading-relaxed">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                    <span>{item?.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {steps.length > 0 ? (
            <div className="mt-5">
              <h3 className="text-xs font-medium text-[var(--muted)]">步骤</h3>
              <ol className="mt-2 space-y-3">
                {steps.map((step, index) => (
                  <li key={`${step?.text}-${index}`} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5 text-[11px] text-[var(--muted)]">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm leading-relaxed">{step?.text}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--muted)]">{stepLabel(step)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

        </section>
      ) : null}

      {questions.length > 0 ? (
        <div className="mt-5 rounded-2xl bg-[var(--accent-2)]/10 p-4">
          <p className="text-xs font-medium text-[var(--accent-2)]">还可以补充</p>
          <ul className="mt-2 space-y-1.5">
            {questions.map((question) => (
              <li key={question} className="text-sm leading-relaxed text-[var(--text)]">
                · {question}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent">
        <div className="mx-auto w-full max-w-md px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-6">
          {saveError ? <p className="mb-2 text-center text-xs text-[var(--danger)]">{saveError}</p> : null}

          {parsedDraft.success ? (
            <BigButton className="mb-3" onClick={() => void handleSave()} disabled={saving || isLoading}>
              {saving ? '保存中…' : '保存这道菜'}
            </BigButton>
          ) : null}

          <div className="flex items-end gap-2 rounded-3xl bg-[var(--surface)] p-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={1}
              placeholder="继续说：番茄炒蛋，两个人吃…"
              className="max-h-32 min-h-12 flex-1 resize-none bg-transparent px-3 py-3 text-[15px] outline-none placeholder:text-[var(--muted)]"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!isLoading && input.trim().length === 0}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-[#201008] disabled:opacity-40"
              aria-label={isLoading ? '停止生成' : '发送'}
            >
              {isLoading ? <span className="text-xs font-semibold">停</span> : <Send size={18} />}
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-[var(--muted)]">
            AI 只在你录入时联网；做菜时不需要网络
          </p>
        </div>
      </div>
    </main>
  );
}

function stepLabel(step: DeepPartial<StepInput> | undefined): string {
  if (!step) {
    return '看状态';
  }

  if (step.kind === 'timed' && typeof step.durationSec === 'number') {
    return `定时 ${formatSeconds(step.durationSec)}`;
  }

  const range = step.suggestRange;

  if (
    Array.isArray(range) &&
    typeof range[0] === 'number' &&
    typeof range[1] === 'number'
  ) {
    return `建议 ${formatSeconds(range[0])}–${formatSeconds(range[1])}`;
  }

  return '看状态';
}
