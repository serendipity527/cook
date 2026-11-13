import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Download, HardDrive, Pencil, Sparkles, Trash2, Upload } from 'lucide-react';
import type { Recipe } from '@shared/schema';
import {
  deleteRecipe,
  exportData,
  getStorageEstimate,
  importData,
  listUserRecipes,
  requestPersistence,
} from '@/data/repo';
import { backupFilename, downloadJson } from '@/lib/download';
import { useInstallPrompt } from '@/pwa/useInstallPrompt';
import { useAppStore } from '@/store/useAppStore';
import { BigButton } from '@/components/BigButton';

const speechRates = [0.9, 1.0, 1.1];

export function Studio() {
  const navigate = useAppStore((state) => state.navigate);
  const speechEnabled = useAppStore((state) => state.speechEnabled);
  const speechRate = useAppStore((state) => state.speechRate);
  const setSpeechEnabled = useAppStore((state) => state.setSpeechEnabled);
  const setSpeechRate = useAppStore((state) => state.setSpeechRate);
  const recipes = useLiveQuery(() => listUserRecipes(), []) ?? [];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const install = useInstallPrompt();
  const [message, setMessage] = useState<string | null>(null);
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
      setMessage(`已导出 ${bundle.recipes.length} 个菜谱、${bundle.sessions.length} 条做菜记录`);
    } catch {
      setMessage('导出失败，请稍后重试');
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
      setMessage(
        `导入完成：新增 ${report.recipesAdded}、更新 ${report.recipesUpdated}、跳过 ${report.recipesSkipped} 个菜谱；新增 ${report.sessionsAdded} 条记录`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '导入失败');
    }
  };

  const handlePersist = async () => {
    try {
      const granted = await requestPersistence();
      setMessage(granted ? '已获得持久化存储，浏览器不会随意清理' : '浏览器没有授予持久化存储');
    } catch {
      setMessage('申请持久化失败');
    }
  };

  const handleDelete = async (recipe: Recipe) => {
    if (!window.confirm(`删除「${recipe.title}」？这条菜谱会被移出列表。`)) {
      return;
    }

    await deleteRecipe(recipe.id);
    setMessage('已删除');
  };

  const handleInstall = async () => {
    const outcome = await install.promptInstall();

    if (outcome === 'accepted') {
      setMessage('已开始安装，请按系统提示完成');
    } else if (outcome === 'dismissed') {
      setMessage('已取消安装');
    } else {
      setMessage('浏览器没有弹出安装入口，请从浏览器菜单选择“安装应用”');
    }
  };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-12 pt-6">
      <button
        type="button"
        onClick={() => navigate({ name: 'home' })}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface)]"
        aria-label="返回首页"
      >
        <ArrowLeft size={20} />
      </button>

      <header className="mt-5">
        <p className="text-xs tracking-[0.25em] text-[var(--accent)]">STUDIO</p>
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
          <span className="mt-0.5 block text-xs text-[var(--muted)]">说一遍做法，生成可开火的步骤</span>
        </span>
      </button>

      {message ? (
        <p className="mt-4 rounded-2xl bg-[var(--surface)] p-4 text-sm leading-relaxed text-[var(--muted)]">
          {message}
        </p>
      ) : null}

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
                  onClick={() => void handleDelete(recipe)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--muted)]"
                  aria-label={`删除 ${recipe.title}`}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-[var(--muted)]">
            还没有自己的菜谱。
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
                  : 'relative h-8 w-14 shrink-0 rounded-full bg-white/10 transition'
              }
            >
              <span
                className={
                  speechEnabled
                    ? 'absolute top-1 left-7 h-6 w-6 rounded-full bg-[#201008] transition'
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
                    ? 'flex-1 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[#201008]'
                    : 'flex-1 rounded-xl bg-white/5 px-3 py-2 text-sm text-[var(--muted)]'
                }
              >
                {rate.toFixed(1)}×
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-[var(--muted)]">安装到主屏</h2>
        <div className="rounded-2xl bg-[var(--surface)] p-4">
          {install.installed ? (
            <p className="text-sm text-[var(--muted)]">已安装，可以从主屏直接打开。</p>
          ) : (
            <>
              {install.canInstall ? (
                <BigButton onClick={() => void handleInstall()}>安装到主屏</BigButton>
              ) : (
                <p className="text-sm leading-relaxed text-[var(--muted)]">
                  {install.isIOS
                    ? 'Safari 里点“分享”，再选“添加到主屏幕”。'
                    : '用 Chrome / Edge 打开后，从浏览器菜单选择“安装应用”或“添加到主屏幕”。'}
                </p>
              )}
              <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
                安装后是全屏体验，断网也能做菜；iOS 上还能避免未安装站点被清理。
              </p>
            </>
          )}
        </div>
      </section>

      <section className="mt-8">
        <BigButton variant="secondary" onClick={() => navigate({ name: 'home' })}>
          回首页
        </BigButton>
      </section>
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
