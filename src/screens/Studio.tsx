import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft,
  Download,
  HardDrive,
  Moon,
  Pencil,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-react';
import type { CookSession, Recipe } from '@shared/schema';
import {
  deleteRecipe,
  exportData,
  getStorageEstimate,
  importData,
  listAllRecipes,
  listSessions,
  listUserRecipes,
  requestPersistence,
  restoreRecipe,
} from '@/data/repo';
import { backupFilename, downloadJson } from '@/lib/download';
import { formatAgeLabel, formatSeconds } from '@/lib/format';
import { useRequestBack } from '@/navigation/NavigationProvider';
import { audio } from '@/runtime/audio';
import { useAppStore } from '@/store/useAppStore';
import { BigButton } from '@/components/BigButton';
import { BottomSheet } from '@/components/BottomSheet';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { useToast } from '@/components/ToastProvider';

const speechRates = [0.9, 1.0, 1.1];

function sessionStatusLabel(status: CookSession['status']): string {
  if (status === 'completed') {
    return '完成';
  }

  if (status === 'abandoned') {
    return '提前结束';
  }

  return '进行中';
}

function sessionActualSeconds(session: CookSession): number {
  return session.steps.reduce((total, step) => total + step.actualSec, 0);
}

function formatStartedAt(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${date.getMonth() + 1} 月 ${date.getDate()} 日 ${hours}:${minutes}`;
}

export function Studio() {
  const navigate = useAppStore((state) => state.navigate);
  const resetTo = useAppStore((state) => state.resetTo);
  const requestBack = useRequestBack();
  const theme = useAppStore((state) => state.theme);
  const speechEnabled = useAppStore((state) => state.speechEnabled);
  const speechRate = useAppStore((state) => state.speechRate);
  const setTheme = useAppStore((state) => state.setTheme);
  const setSpeechEnabled = useAppStore((state) => state.setSpeechEnabled);
  const setSpeechRate = useAppStore((state) => state.setSpeechRate);
  const recipes = useLiveQuery(() => listUserRecipes(), []) ?? [];
  const allRecipes = useLiveQuery(() => listAllRecipes(), []);
  const sessionRows = useLiveQuery(() => listSessions(), []);
  const [historySession, setHistorySession] = useState<CookSession | null>(null);
  const recipeMap = useMemo(
    () => new Map((allRecipes ?? []).map((recipe) => [recipe.id, recipe])),
    [allRecipes],
  );
  const history = useMemo(
    () =>
      (sessionRows ?? [])
        .filter((session) => session.status !== 'active' && session.steps.length > 0)
        .slice(0, 10),
    [sessionRows],
  );
  const historyRecipe = historySession
    ? recipeMap.get(historySession.recipeId)
    : undefined;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const [pendingDelete, setPendingDelete] = useState<Recipe | null>(null);
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => {
    void getStorageEstimate()
      .then(setEstimate)
      .catch(() => setEstimate(null));
  }, []);

  const handleExport = async () => {
    try {
      const bundle = await exportData();
      downloadJson(backupFilename(), bundle);
      showToast({
        message: `已导出 ${bundle.recipes.length} 个菜谱、${bundle.sessions.length} 条做菜记录`,
        tone: 'success',
      });
    } catch {
      showToast({ message: '导出失败，请稍后重试', tone: 'danger' });
    }
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      const report = await importData(await file.text());
      showToast({
        message: `导入完成：新增 ${report.recipesAdded}、更新 ${report.recipesUpdated}、跳过 ${report.recipesSkipped} 个菜谱；新增 ${report.sessionsAdded} 条记录`,
        tone: 'success',
        durationMs: 5000,
      });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : '导入失败',
        tone: 'danger',
        durationMs: 5000,
      });
    }
  };

  const handlePersist = async () => {
    try {
      const granted = await requestPersistence();
      showToast({
        message: granted ? '已获得持久化存储，浏览器不会随意清理' : '浏览器没有授予持久化存储',
        tone: granted ? 'success' : 'default',
      });
    } catch {
      showToast({ message: '申请持久化失败', tone: 'danger' });
    }
  };

  const handleTestSpeech = () => {
    if (!audio.isSpeechSupported()) {
      showToast({ message: '当前浏览器不支持语音播报', tone: 'danger' });
      return;
    }

    if (!speechEnabled) {
      showToast({ message: '语音播报已关闭，先打开开关再试', tone: 'danger' });
      return;
    }

    void audio.unlock();
    audio.speak('语音播报正常，开始做菜后会念出当前步骤。', {
      enabled: true,
      rate: speechRate,
    });
    showToast({
      message: '已发送试听；如果没声音，检查媒体音量和系统中文语音',
      durationMs: 5000,
    });
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
    } catch {
      showToast({ message: '删除失败，请重试', tone: 'danger' });
    }
  };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-12 pt-6">
      <button
        type="button"
        onClick={requestBack}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface)]"
        aria-label="返回"
      >
        <ArrowLeft size={20} />
      </button>

      <header className="mt-5">
        <p className="text-xs tracking-[0.25em] text-[var(--accent-ink)]">STUDIO</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">管理与设置</h1>
      </header>

      <button
        type="button"
        onClick={() => navigate({ name: 'chat' })}
        className="mt-5 flex w-full items-center gap-3 rounded-3xl border border-[var(--accent)]/25 bg-[var(--accent)]/5 p-4 text-left transition active:scale-[0.995]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)]/15 text-[var(--accent-2)]">
          <Sparkles size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">用 AI 新建菜谱</span>
          <span className="mt-0.5 block text-xs text-[var(--muted)]">
            打几行字，生成可开火的步骤
          </span>
        </span>
      </button>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-[var(--muted)]">我的菜谱</h2>
        {recipes.length > 0 ? (
          <div className="space-y-2">
            {recipes.map((recipe) => (
              <div
                key={recipe.id}
                className="flex items-center gap-2 rounded-2xl bg-[var(--surface)] p-2 pl-4"
              >
                <button
                  type="button"
                  onClick={() => navigate({ name: 'detail', recipeId: recipe.id })}
                  className="min-w-0 flex-1 py-2 text-left"
                >
                  <p className="truncate text-[15px] font-medium">{recipe.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{recipe.steps.length} 步</p>
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ name: 'edit', recipeId: recipe.id })}
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--muted)]"
                  aria-label={`编辑 ${recipe.title}`}
                >
                  <Pencil size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(recipe)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--muted)]"
                  aria-label={`删除 ${recipe.title}`}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-[var(--line)] p-5 text-sm text-[var(--muted)]">
            还没有自己的菜谱。
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-[var(--muted)]">做菜记录</h2>
        {history.length > 0 ? (
          <div className="space-y-2">
            {history.map((session) => {
              const recipe = recipeMap.get(session.recipeId);
              const skipped = session.steps.filter((step) => step.skipped).length;

              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setHistorySession(session)}
                  className="w-full rounded-2xl bg-[var(--surface)] p-4 text-left transition active:scale-[0.995]"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-[15px] font-medium">
                      {recipe?.title ?? '已删除的菜谱'}
                    </span>
                    <span className="shrink-0 text-xs text-[var(--muted)]">
                      {formatAgeLabel(Date.now() - session.startedAt)}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-[var(--muted)]">
                    {sessionStatusLabel(session.status)} · 实际{' '}
                    {formatSeconds(sessionActualSeconds(session))}
                    {session.steps.length > 0 ? ` · ${session.steps.length} 步` : ''}
                    {skipped > 0 ? ` · 跳过 ${skipped}` : ''}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-[var(--line)] p-5 text-sm text-[var(--muted)]">
            完成一次做菜后，这里会留下用时和跳过记录。
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-[var(--muted)]">数据</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void handleExport()}
            className="flex items-center gap-2 rounded-2xl bg-[var(--surface)] p-4 text-sm"
          >
            <Download size={17} />
            导出备份
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-2xl bg-[var(--surface)] p-4 text-sm"
          >
            <Upload size={17} />
            导入备份
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => void handleImport(event)}
        />

        <div className="mt-2 rounded-2xl bg-[var(--surface)] p-4">
          <div className="flex items-center gap-2 text-sm">
            <HardDrive size={17} />
            <span>本地存储</span>
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">
            {estimate
              ? `${formatBytes(estimate.usage)} / ${formatBytes(estimate.quota)}`
              : '浏览器未提供用量信息'}
          </p>
          <button
            type="button"
            onClick={() => void handlePersist()}
            className="mt-3 text-xs text-[var(--accent-2)]"
          >
            申请持久化存储
          </button>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-[var(--muted)]">外观</h2>
        <div className="rounded-2xl bg-[var(--surface)] p-4">
          <p className="text-sm font-medium">主题</p>
          <p className="mt-1 text-xs text-[var(--muted)]">深色适合夜里，浅色适合白天</p>
          <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="主题">
            <button
              type="button"
              aria-pressed={theme === 'dark'}
              onClick={() => setTheme('dark')}
              className={
                theme === 'dark'
                  ? 'flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-sm font-medium text-[var(--accent-contrast)]'
                  : 'flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--tint)] text-sm text-[var(--muted)]'
              }
            >
              <Moon size={16} />
              深色
            </button>
            <button
              type="button"
              aria-pressed={theme === 'light'}
              onClick={() => setTheme('light')}
              className={
                theme === 'light'
                  ? 'flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-sm font-medium text-[var(--accent-contrast)]'
                  : 'flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--tint)] text-sm text-[var(--muted)]'
              }
            >
              <Sun size={16} />
              浅色
            </button>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-[var(--muted)]">语音播报</h2>
        <div className="rounded-2xl bg-[var(--surface)] p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">步骤播报</p>
              <p className="mt-1 text-xs text-[var(--muted)]">做菜时念出当前步骤</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={speechEnabled}
              aria-label="步骤播报"
              onClick={() => setSpeechEnabled(!speechEnabled)}
              className={
                speechEnabled
                  ? 'relative h-8 w-14 shrink-0 rounded-full bg-[var(--accent)] transition'
                  : 'relative h-8 w-14 shrink-0 rounded-full bg-[var(--tint-strong)] transition'
              }
            >
              <span
                className={
                  speechEnabled
                    ? 'absolute top-1 left-7 h-6 w-6 rounded-full bg-[var(--accent-contrast)] transition'
                    : 'absolute top-1 left-1 h-6 w-6 rounded-full bg-[var(--muted)] transition'
                }
              />
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            {speechRates.map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setSpeechRate(rate)}
                className={
                  speechRate === rate
                    ? 'flex-1 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--accent-contrast)]'
                    : 'flex-1 rounded-xl bg-[var(--tint)] px-3 py-2 text-sm text-[var(--muted)]'
                }
              >
                {rate.toFixed(1)}×
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleTestSpeech}
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--tint)] text-sm text-[var(--accent-2)]"
          >
            <Volume2 size={16} />
            试听语音
          </button>
          <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
            没声音时，先检查手机媒体音量、静音模式，以及系统是否安装了中文语音。
          </p>
        </div>
      </section>

      <section className="mt-8">
        <BigButton variant="secondary" onClick={() => resetTo([{ name: 'home' }])}>
          回首页
        </BigButton>
      </section>

      <BottomSheet
        open={Boolean(historySession)}
        title={historySession ? (historyRecipe?.title ?? '已删除的菜谱') : '做菜记录'}
        onClose={() => setHistorySession(null)}
      >
        {historySession ? (
          <>
            <p className="text-xs leading-relaxed text-[var(--muted)]">
              {formatStartedAt(historySession.startedAt)} · {sessionStatusLabel(historySession.status)}
              {' · '}实际 {formatSeconds(sessionActualSeconds(historySession))}
              {historySession.steps.some((step) => step.skipped)
                ? ` · 跳过 ${historySession.steps.filter((step) => step.skipped).length} 步`
                : ''}
            </p>
            {historySession.steps.length > 0 ? (
              <ol className="mt-4 space-y-2">
                {historySession.steps.map((log, index) => {
                  const step = historyRecipe?.steps.find((item) => item.id === log.stepId);

                  return (
                    <li key={`${log.stepId}-${index}`} className="rounded-2xl bg-[var(--tint)] p-3">
                      <p className="text-sm leading-relaxed">
                        <span className="mr-1 text-[var(--muted)]">{index + 1}.</span>
                        {step?.text ?? `第 ${index + 1} 步`}
                      </p>
                      <p
                        className={
                          log.skipped
                            ? 'mt-1 text-xs text-[var(--accent-2)]'
                            : 'mt-1 text-xs text-[var(--muted)]'
                        }
                      >
                        {log.skipped
                          ? '跳过'
                          : log.plannedSec
                            ? `计划 ${formatSeconds(log.plannedSec)} · 实际 ${formatSeconds(log.actualSec)}`
                            : `实际 ${formatSeconds(log.actualSec)}`}
                      </p>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="mt-4 rounded-2xl bg-[var(--tint)] p-4 text-sm text-[var(--muted)]">
                这次没有完成任何步骤。
              </p>
            )}
            <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">
              记录只保存在这台设备，导出备份时会一起导出。
            </p>
          </>
        ) : null}
      </BottomSheet>

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
    </main>
  );
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return '0 MB';
  }

  const megabytes = bytes / 1024 / 1024;
  return megabytes >= 1024 ? `${(megabytes / 1024).toFixed(1)} GB` : `${megabytes.toFixed(1)} MB`;
}
