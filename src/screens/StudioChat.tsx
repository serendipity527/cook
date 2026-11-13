import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useObject } from '@ai-sdk/react';
import { ArrowLeft, Send, Sparkles } from 'lucide-react';
import {
  AssistantTurnSchema,
  DraftSpecSchema,
  type AssistantRequest,
  type AssistantTurn,
  type DraftSpec,
} from '@shared/schema';
import { normalizeDraft } from '@/ai/normalizeDraft';
import { listAllRecipes, requestPersistence, saveRecipe } from '@/data/repo';
import { aiErrorMessage } from '@/lib/aiError';
import { useRequestBack } from '@/navigation/NavigationProvider';
import { useAppStore } from '@/store/useAppStore';
import { useChatStore } from '@/store/useChatStore';
import { BigButton } from '@/components/BigButton';
import { DraftEditor } from '@/components/DraftEditor';
import { RecipeCard } from '@/components/RecipeCard';

const quickActions = ['你好', '我有哪些菜谱', '帮我录一道番茄炒蛋', '今天吃什么'];

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
  const resetTo = useAppStore((store) => store.resetTo);
  const requestBack = useRequestBack();
  const recipeRows = useLiveQuery(() => listAllRecipes(), []);
  const recipes = useMemo(() => recipeRows ?? [], [recipeRows]);
  const messages = useChatStore((state) => state.messages);
  const editedSpec = useChatStore((state) => state.draft);
  const visibleRecipeIds = useChatStore((state) => state.recipeIds);
  const appendMessage = useChatStore((state) => state.appendMessage);
  const setDraft = useChatStore((state) => state.setDraft);
  const setRecipeIds = useChatStore((state) => state.setRecipeIds);
  const resetChat = useChatStore((state) => state.reset);
  const [input, setInput] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const lastSpecRef = useRef<DraftSpec | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const sessionId = useMemo(getAiSessionId, []);

  const recipeIndex = useMemo(
    () =>
      recipes.map((recipe) => ({
        id: recipe.id,
        title: recipe.title,
        tags: recipe.tags,
        estimatedMinutes: recipe.estimatedMinutes,
        source: recipe.source,
      })),
    [recipes],
  );

  const { object, submit, isLoading, error, stop, clear } = useObject<
    typeof AssistantTurnSchema,
    AssistantTurn,
    AssistantRequest
  >({
    api: '/api/assistant',
    schema: AssistantTurnSchema,
    onFinish: ({ object: finished, error: finishError }) => {
      if (finishError) {
        return;
      }

      const parsed = AssistantTurnSchema.safeParse(finished);

      if (!parsed.success) {
        return;
      }

      const turn = parsed.data;
      appendMessage({ role: 'assistant', content: turn.reply });

      if (turn.draft) {
        lastSpecRef.current = turn.draft;
        setDraft(turn.draft);
      }

      if (turn.intent === 'list_recipes') {
        setRecipeIds(
          turn.recipeIds?.length ? turn.recipeIds : recipes.map((recipe) => recipe.id),
        );
      } else if (turn.intent === 'show_recipe') {
        setRecipeIds(turn.recipeIds ?? []);
      } else {
        setRecipeIds([]);
      }
    },
    onError: () => {
      if (lastSpecRef.current) {
        setDraft(lastSpecRef.current);
      }
    },
  });

  const parsedDraft = useMemo(() => DraftSpecSchema.safeParse(editedSpec), [editedSpec]);
  const partialReply = typeof object?.reply === 'string' ? object.reply : '';
  const visibleRecipes = useMemo(
    () => recipes.filter((recipe) => visibleRecipeIds.includes(recipe.id)),
    [recipes, visibleRecipeIds],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading, partialReply]);

  const sendMessage = (rawText: string) => {
    const text = rawText.trim();

    if (!text || isLoading) {
      return;
    }

    setInput('');
    setSaveError(null);

    if (error) {
      clear();
    }

    const history = messages.slice(-10);
    appendMessage({ role: 'user', content: text });

    const currentDraft = DraftSpecSchema.safeParse(editedSpec);

    if (currentDraft.success) {
      lastSpecRef.current = currentDraft.data;
    }

    submit({
      message: text,
      draft: currentDraft.success ? currentDraft.data : null,
      history,
      recipes: recipeIndex.slice(0, 50),
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
      resetChat();
      lastSpecRef.current = null;
      resetTo([{ name: 'home' }, { name: 'detail', recipeId: recipe.id }]);
    } catch (saveFailure) {
      setSaveError(saveFailure instanceof Error ? saveFailure.message : '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    stop();
    clear();
    resetChat();
    lastSpecRef.current = null;
    setInput('');
    setSaveError(null);
  };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-72 pt-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={requestBack}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface)]"
          aria-label="返回"
        >
          <ArrowLeft size={20} />
        </button>
        {messages.length > 0 || editedSpec ? (
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
        <h1 className="mt-1 text-3xl font-bold tracking-tight">厨房助手</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">可以聊天、查菜谱、录新菜。</p>
      </header>

      {messages.length === 0 && !editedSpec ? (
        <section className="mt-8 rounded-3xl border border-white/10 p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent)]/15 text-[var(--accent-2)]">
            <Sparkles size={20} />
          </div>
          <h2 className="mt-4 text-xl font-semibold">先说句话，或者直接说一道菜</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            比如：“我有哪些菜谱？”、“帮我录一道番茄炒蛋”，或者只是打个招呼。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => sendMessage(action)}
                className="rounded-full bg-white/5 px-3 py-2 text-xs text-[var(--text)]"
              >
                {action}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-6 space-y-3">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
          >
            <p
              className={
                message.role === 'user'
                  ? 'max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-[var(--accent)] px-4 py-3 text-sm leading-relaxed text-[#201008]'
                  : 'max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-[var(--surface)] px-4 py-3 text-sm leading-relaxed'
              }
            >
              {message.content}
            </p>
          </div>
        ))}

        {isLoading ? (
          <div className="flex justify-start">
            <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-[var(--surface)] px-4 py-3 text-sm leading-relaxed">
              {partialReply || <span className="text-[var(--muted)]">正在想…</span>}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-4 text-sm leading-relaxed">
            <p className="font-medium text-[var(--danger)]">刚才没成功</p>
            <p className="mt-1 text-[var(--muted)]">{aiErrorMessage(error)}</p>
          </div>
        ) : null}

        <div ref={endRef} />
      </div>

      {visibleRecipes.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-medium text-[var(--muted)]">相关菜谱</h2>
          <div className="space-y-2">
            {visibleRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() => navigate({ name: 'detail', recipeId: recipe.id })}
              />
            ))}
          </div>
        </section>
      ) : null}

      {editedSpec ? (
        <DraftEditor spec={editedSpec} onChange={setDraft} heading="菜谱草稿" />
      ) : null}

      {editedSpec && editedSpec.questions.length > 0 ? (
        <div className="mt-5 rounded-2xl bg-[var(--accent-2)]/10 p-4">
          <p className="text-xs font-medium text-[var(--accent-2)]">还可以补充</p>
          <ul className="mt-2 space-y-1.5">
            {editedSpec.questions.map((question) => (
              <li key={question} className="text-sm leading-relaxed text-[var(--text)]">
                · {question}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent">
        <div className="mx-auto w-full max-w-md px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-6">
          {saveError ? (
            <p className="mb-2 text-center text-xs text-[var(--danger)]">{saveError}</p>
          ) : null}

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
              placeholder="聊两句，或者说说想做的菜…"
              className="max-h-32 min-h-12 flex-1 resize-none bg-transparent px-3 py-3 text-[15px] outline-none placeholder:text-[var(--muted)]"
            />
            <button
              type="button"
              onClick={() => (isLoading ? stop() : sendMessage(input))}
              disabled={!isLoading && input.trim().length === 0}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-[#201008] disabled:opacity-40"
              aria-label={isLoading ? '停止生成' : '发送'}
            >
              {isLoading ? <span className="text-xs font-semibold">停</span> : <Send size={18} />}
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-[var(--muted)]">
            AI 只在你对话时联网；做菜时不需要网络
          </p>
        </div>
      </div>
    </main>
  );
}
