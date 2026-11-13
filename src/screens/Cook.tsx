import { useEffect, useState, type ReactNode } from 'react';
import { isTimedStep } from '@shared/schema';
import { useBackGuard } from '@/navigation/NavigationProvider';
import { formatRange, formatSeconds } from '@/lib/format';
import { useCook } from '@/runtime/CookProvider';
import { stepElapsedMs, remainingMs } from '@/runtime/machine';
import { formatClock, useNow } from '@/runtime/useCountdown';
import { useAppStore } from '@/store/useAppStore';
import { BigButton } from '@/components/BigButton';
import { CountdownRing } from '@/components/CountdownRing';
import { StepProgress } from '@/components/StepProgress';

const heatLabels = {
  low: '小火',
  medium: '中火',
  high: '大火',
} as const;

export function Cook() {
  const navigate = useAppStore((state) => state.navigate);
  const resetTo = useAppStore((state) => state.resetTo);
  const { state, dispatch } = useCook();
  const [abortOpen, setAbortOpen] = useState(false);

  useBackGuard(() => {
    if (abortOpen) {
      setAbortOpen(false);
      return true;
    }

    if (state?.phase === 'cooking') {
      setAbortOpen(true);
      return true;
    }

    return false;
  });

  useEffect(() => {
    if (state?.phase === 'done') {
      resetTo([{ name: 'home' }, { name: 'done' }]);
    }
  }, [state?.phase, resetTo]);

  const ticking =
    state?.phase === 'cooking' &&
    (state.stepState === 'running' || state.stepState === 'manual');
  const now = useNow(ticking, 200);

  useEffect(() => {
    if (!state || state.phase !== 'cooking' || state.stepState !== 'running') {
      return;
    }

    if (remainingMs(state, now) <= 0) {
      dispatch({ type: 'TIMER_DONE', now: Date.now() });
    }
  }, [state, now, dispatch]);

  if (!state) {
    return (
      <Centered>
        <p className="text-lg font-semibold">还没有正在做的菜</p>
        <BigButton className="mt-6" onClick={() => navigate({ name: 'home' })}>
          回首页
        </BigButton>
      </Centered>
    );
  }

  if (state.phase === 'done') {
    return null;
  }

  const step = state.recipe.steps[state.stepIndex];

  if (!step) {
    return (
      <Centered>
        <p className="text-lg font-semibold">步骤数据不完整</p>
        <BigButton className="mt-6" onClick={() => navigate({ name: 'home' })}>
          回首页
        </BigButton>
      </Centered>
    );
  }

  const timed = isTimedStep(step);
  const remaining = timed ? remainingMs(state, now) : 0;
  const elapsed = timed ? 0 : stepElapsedMs(state, now);
  const next = state.recipe.steps[state.stepIndex + 1];
  const heat = step.heat ? heatLabels[step.heat] : null;

  const primary = (() => {
    switch (state.stepState) {
      case 'running':
        return { label: '暂停', onClick: () => dispatch({ type: 'PAUSE', now: Date.now() }) };
      case 'paused':
        return { label: '继续', onClick: () => dispatch({ type: 'RESUME', now: Date.now() }) };
      case 'awaiting':
        return { label: '开始下一步', onClick: () => dispatch({ type: 'NEXT', now: Date.now() }) };
      case 'manual':
        return { label: '好了，下一步', onClick: () => dispatch({ type: 'NEXT', now: Date.now() }) };
      default:
        return null;
    }
  })();

  const canSkip =
    state.stepState === 'running' || state.stepState === 'paused' || state.stepState === 'manual';

  const handleAbort = () => {
    setAbortOpen(false);
    dispatch({ type: 'ABORT', now: Date.now() });
    resetTo([{ name: 'home' }]);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-6 pt-6">
      <header>
        <div className="flex items-center justify-between gap-4">
          <p className="min-w-0 truncate text-sm text-[var(--muted)]">{state.recipe.title}</p>
          <button
            type="button"
            onClick={() => setAbortOpen(true)}
            className="shrink-0 rounded-full bg-white/5 px-3 py-2 text-xs text-[var(--muted)]"
          >
            结束
          </button>
        </div>

        <div className="mt-3">
          <StepProgress total={state.recipe.steps.length} current={state.stepIndex} />
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          第 {state.stepIndex + 1} / {state.recipe.steps.length} 步
        </p>
      </header>

      <section className="flex flex-1 flex-col justify-center gap-6 py-8">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {timed ? (
              <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs text-[var(--accent-2)]">
                定时 {formatSeconds(step.durationSec)}
              </span>
            ) : (
              <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs text-[var(--muted)]">
                {step.suggestRange ? `建议 ${formatRange(step.suggestRange)}` : '看状态'}
              </span>
            )}
            {heat ? (
              <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs text-[var(--muted)]">
                {heat}
              </span>
            ) : null}
          </div>

          <h1 className="mt-4 text-3xl font-bold leading-snug tracking-tight">{step.text}</h1>

          {step.tip ? (
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{step.tip}</p>
          ) : null}
        </div>

        {timed ? (
          <CountdownRing
            remainingMs={remaining}
            totalMs={step.durationSec * 1000}
            paused={state.stepState === 'paused'}
            awaiting={state.stepState === 'awaiting'}
          />
        ) : (
          <div className="text-center">
            <p className="text-6xl font-bold tabular-nums tracking-tight">
              {formatClock(elapsed)}
            </p>
            <p className="mt-3 text-sm text-[var(--muted)]">
              {step.suggestRange
                ? `建议 ${formatRange(step.suggestRange)}，看状态决定`
                : '看状态，好了就点下一步'}
            </p>
          </div>
        )}

        {state.stepState === 'awaiting' ? (
          <div className="rounded-2xl bg-[var(--surface)] p-4">
            <p className="text-xs text-[var(--muted)]">{next ? '下一步' : '最后一步'}</p>
            <p className="mt-1 text-lg font-medium">
              {next ? next.text : '做完这道菜了，可以出锅装盘。'}
            </p>
          </div>
        ) : null}
      </section>

      <footer className="space-y-3">
        {primary ? <BigButton onClick={primary.onClick}>{primary.label}</BigButton> : null}

        <div className="flex gap-3">
          {state.stepIndex > 0 ? (
            <BigButton
              variant="ghost"
              onClick={() => dispatch({ type: 'PREV', now: Date.now() })}
            >
              上一步
            </BigButton>
          ) : null}

          {canSkip ? (
            <BigButton
              variant="ghost"
              onClick={() => dispatch({ type: 'NEXT', now: Date.now(), skipped: true })}
            >
              跳过
            </BigButton>
          ) : null}
        </div>
      </footer>

      {abortOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-[var(--surface)] p-6">
            <h2 className="text-xl font-semibold">结束这次做菜？</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              已完成的步骤会保留记录，这道菜可以下次再做。
            </p>
            <div className="mt-6 space-y-3">
              <BigButton variant="danger" onClick={handleAbort}>
                结束
              </BigButton>
              <BigButton variant="secondary" onClick={() => setAbortOpen(false)}>
                继续做
              </BigButton>
            </div>
          </div>
        </div>
      ) : null}
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
