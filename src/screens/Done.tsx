import { useEffect, useState } from 'react';
import { isTimedStep, type Recipe } from '@shared/schema';
import { applyDurationSuggestions, suggestDurations } from '@/lib/calibration';
import { formatSeconds } from '@/lib/format';
import { saveRecipe } from '@/data/repo';
import { useCook } from '@/runtime/CookProvider';
import { useAppStore } from '@/store/useAppStore';
import { BigButton } from '@/components/BigButton';

export function Done() {
  const { state, begin, reset } = useCook();
  const resetTo = useAppStore((store) => store.resetTo);
  const [updatedRecipe, setUpdatedRecipe] = useState<Recipe | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (!state || state.phase !== 'done') {
      resetTo([{ name: 'home' }]);
    }
  }, [state, resetTo]);

  if (!state || state.phase !== 'done') {
    return null;
  }

  const recipe = updatedRecipe ?? state.recipe;
  const suggestions = recipe.source === 'builtin' ? [] : suggestDurations(recipe, state.logs);
  const endedAt = state.endedAt ?? Date.now();
  const actualTotal = Math.max(0, Math.round((endedAt - state.startedAt) / 1000));
  const plannedTotal = recipe.steps.reduce(
    (total, step) => total + (step.durationSec ?? 0),
    0,
  );
  const logByStep = new Map(state.logs.map((log) => [log.stepId, log]));

  const handleCalibrate = async () => {
    setSaveState('saving');

    try {
      const updated = applyDurationSuggestions(state.recipe, suggestions);
      await saveRecipe(updated);
      setUpdatedRecipe(updated);
      setSaveState('saved');
    } catch (error) {
      console.error('[kaihuo] failed to calibrate recipe', error);
      setSaveState('error');
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-12">
      <header className="text-center">
        <p className="text-xs font-medium tracking-[0.3em] text-[var(--accent)]">DONE</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">开饭了</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{state.recipe.title}</p>
        {state.finishedEarly ? (
          <p className="mt-3 inline-block rounded-full bg-[var(--accent-2)]/10 px-3 py-1 text-xs text-[var(--accent-2)]">
            这次提前结束了
          </p>
        ) : null}
      </header>

      <section className="mt-8 grid grid-cols-2 gap-3">
        <Stat label="实际用时" value={formatSeconds(actualTotal)} />
        <Stat label="计划用时" value={plannedTotal > 0 ? formatSeconds(plannedTotal) : '—'} />
      </section>

      {suggestions.length > 0 ? (
        <section className="mt-6 rounded-3xl border border-[var(--accent-2)]/30 bg-[var(--accent-2)]/5 p-5">
          <h2 className="text-sm font-medium text-[var(--accent-2)]">这次有些步骤比计划慢</h2>
          <ul className="mt-3 space-y-2">
            {suggestions.map((suggestion) => {
              const index = recipe.steps.findIndex((step) => step.id === suggestion.stepId);

              return (
                <li
                  key={suggestion.stepId}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 text-[var(--muted)]">第 {index + 1} 步</span>
                  <span className="shrink-0 tabular-nums">
                    {formatSeconds(suggestion.plannedSec)} → {formatSeconds(suggestion.nextSec)}
                  </span>
                </li>
              );
            })}
          </ul>
          <BigButton
            className="mt-4"
            onClick={() => void handleCalibrate()}
            disabled={saveState === 'saving'}
          >
            {saveState === 'saving' ? '保存中…' : '用实测更新菜谱'}
          </BigButton>
          {saveState === 'error' ? (
            <p className="mt-2 text-xs text-[var(--danger)]">更新失败，菜谱没有改动。</p>
          ) : null}
        </section>
      ) : null}

      {saveState === 'saved' ? (
        <p className="mt-4 text-center text-xs text-[var(--ok)]">已更新，下次做会更准。</p>
      ) : null}

      <section className="mt-8">
        <h2 className="text-sm font-medium text-[var(--muted)]">步骤回顾</h2>
        <ul className="mt-3 space-y-2">
          {recipe.steps.map((step, index) => {
            const log = logByStep.get(step.id);
            const planned = isTimedStep(step) ? step.durationSec : undefined;
            const deviation = log && planned ? Math.round(log.actualSec - planned) : 0;
            const warn = Boolean(
              log &&
                !log.skipped &&
                planned &&
                (deviation >= 10 || deviation >= planned * 0.25),
            );

            let status = '未完成';
            if (log?.skipped) {
              status = '跳过';
            } else if (log) {
              status = planned
                ? `计划 ${formatSeconds(planned)} · 实际 ${formatSeconds(log.actualSec)}`
                : `实际 ${formatSeconds(log.actualSec)}`;
            }

            return (
              <li key={step.id} className="rounded-2xl bg-[var(--surface)] p-4">
                <p className="text-[15px] leading-relaxed">
                  <span className="mr-1 text-[var(--muted)]">{index + 1}.</span>
                  {step.text}
                </p>
                <p
                  className={
                    warn
                      ? 'mt-1 text-xs text-[var(--accent-2)]'
                      : 'mt-1 text-xs text-[var(--muted)]'
                  }
                >
                  {status}
                  {warn && deviation > 0 ? `（慢了 ${formatSeconds(deviation)}）` : ''}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-auto space-y-3 pt-8">
        <BigButton
          onClick={() => {
            begin(recipe);
            resetTo([{ name: 'home' }, { name: 'cook' }]);
          }}
        >
          再做一次
        </BigButton>
        <BigButton
          variant="secondary"
          onClick={() => {
            reset();
            resetTo([{ name: 'home' }]);
          }}
        >
          回首页
        </BigButton>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--surface)] p-4 text-center">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
