import { useEffect, useRef, useState, type ReactNode } from 'react';
import { isTimedStep } from '@shared/schema';
import { Volume2, VolumeX } from 'lucide-react';
import { useBackGuard } from '@/navigation/NavigationProvider';
import { formatRange, formatSeconds } from '@/lib/format';
import { audio } from '@/runtime/audio';
import { useCook } from '@/runtime/CookProvider';
import { remainingMs, stepElapsedMs, type CookState } from '@/runtime/machine';
import { formatClock, useNow } from '@/runtime/useCountdown';
import { useAppStore } from '@/store/useAppStore';
import { BigButton } from '@/components/BigButton';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { CountdownRing } from '@/components/CountdownRing';
import { StepProgress } from '@/components/StepProgress';
import { useToast } from '@/components/ToastProvider';

const heatLabels = {
  low: '小火',
  medium: '中火',
  high: '大火',
} as const;

export function Cook() {
  const resetTo = useAppStore((state) => state.resetTo);
  const speechEnabled = useAppStore((state) => state.speechEnabled);
  const speechRate = useAppStore((state) => state.speechRate);
  const setSpeechEnabled = useAppStore((state) => state.setSpeechEnabled);
  const { state, dispatch } = useCook();
  const { showToast } = useToast();
  const [abortOpen, setAbortOpen] = useState(false);
  const [prevOpen, setPrevOpen] = useState(false);
  const skipUndoRef = useRef<{ saved: CookState; remainingMs: number } | null>(null);
  const lastAdvanceRef = useRef(0);
  const stateRef = useRef<CookState | null>(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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

  useBackGuard(() => {
    if (prevOpen) {
      setPrevOpen(false);
      return true;
    }

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

  if (!state) {
    return (
      <Centered>
        <p className="text-lg font-semibold">还没有正在做的菜</p>
        <BigButton className="mt-6" onClick={() => resetTo([{ name: 'home' }])}>
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
        <BigButton className="mt-6" onClick={() => resetTo([{ name: 'home' }])}>
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
  const isLastStep = state.stepIndex === state.recipe.steps.length - 1;

  const canAdvance = () => {
    const timestamp = Date.now();

    if (timestamp - lastAdvanceRef.current < 300) {
      return false;
    }

    lastAdvanceRef.current = timestamp;
    return true;
  };

  const primary = (() => {
    switch (state.stepState) {
      case 'running':
        return {
          label: '暂停',
          advance: false,
          onClick: () => dispatch({ type: 'PAUSE', now: Date.now() }),
        };
      case 'paused':
        return {
          label: '继续',
          advance: false,
          onClick: () => dispatch({ type: 'RESUME', now: Date.now() }),
        };
      case 'awaiting':
        return {
          label: isLastStep ? '完成，出锅' : '开始下一步',
          advance: true,
          onClick: () => dispatch({ type: 'NEXT', now: Date.now() }),
        };
      case 'manual':
        return {
          label: isLastStep ? '好了，出锅' : '好了，下一步',
          advance: true,
          onClick: () => dispatch({ type: 'NEXT', now: Date.now() }),
        };
      default:
        return null;
    }
  })();

  const canSkip =
    !isLastStep &&
    (state.stepState === 'running' ||
      state.stepState === 'paused' ||
      state.stepState === 'manual');

  const handlePrimary = () => {
    if (!primary) {
      return;
    }

    if (primary.advance && !canAdvance()) {
      return;
    }

    primary.onClick();
  };

  const handleExtend = () => {
    if (!timed || state.stepState === 'manual') {
      return;
    }

    dispatch({ type: 'EXTEND_TIME', now: Date.now(), seconds: 30 });
    showToast({ message: state.stepState === 'awaiting' ? '再来 30 秒' : '加 30 秒' });
  };

  const handleSkip = () => {
    if (!canAdvance()) {
      return;
    }

    const timestamp = Date.now();
    const saved = state;
    const savedRemaining = timed ? remainingMs(state, timestamp) : stepElapsedMs(state, timestamp);

    skipUndoRef.current = { saved, remainingMs: savedRemaining };
    dispatch({ type: 'NEXT', now: timestamp, skipped: true });
    showToast({
      message: `已跳过第 ${state.stepIndex + 1} 步`,
      action: {
        label: '撤销',
        onClick: () => {
          const undo = skipUndoRef.current;
          const current = stateRef.current;

          if (!undo || !current || current.stepIndex !== undo.saved.stepIndex + 1) {
            return;
          }

          skipUndoRef.current = null;
          dispatch({
            type: 'UNDO_SKIP',
            saved: undo.saved,
            savedRemainingMs: undo.remainingMs,
            now: Date.now(),
          });
          showToast({ message: `已回到第 ${undo.saved.stepIndex + 1} 步` });
        },
      },
    });
  };

  const handlePrev = () => {
    if (state.stepIndex === 0) {
      return;
    }

    if (stepElapsedMs(state, Date.now()) > 10_000) {
      setPrevOpen(true);
      return;
    }

    if (!canAdvance()) {
      return;
    }

    dispatch({ type: 'PREV', now: Date.now() });
  };

  const handleRelisten = () => {
    if (!speechEnabled) {
      showToast({ message: '语音已关闭' });
      return;
    }

    void audio.unlock();
    audio.speak(step.speak ?? step.text, { enabled: true, rate: speechRate });
  };

  const toggleSpeech = () => {
    const nextEnabled = !speechEnabled;
    setSpeechEnabled(nextEnabled);

    if (!nextEnabled) {
      audio.stopSpeak();
    }

    showToast({ message: nextEnabled ? '语音已开启' : '语音已关闭' });
  };

  const handleAbort = () => {
    setAbortOpen(false);
    dispatch({ type: 'ABORT', now: Date.now() });
    resetTo([{ name: 'home' }]);
    showToast({ message: '已结束' });
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-6 pt-6">
      <header>
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 flex-1 truncate text-sm text-[var(--muted)]">
            {state.recipe.title}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={toggleSpeech}
              aria-label={speechEnabled ? '关闭语音播报' : '开启语音播报'}
              aria-pressed={speechEnabled}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-[var(--muted)]"
            >
              {speechEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}
            </button>
            <button
              type="button"
              onClick={() => setAbortOpen(true)}
              className="min-h-11 rounded-full bg-white/5 px-3 text-xs text-[var(--muted)]"
            >
              结束
            </button>
          </div>
        </div>

        <div className="mt-3">
          <StepProgress total={state.recipe.steps.length} current={state.stepIndex} />
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          第 {state.stepIndex + 1} / {state.recipe.steps.length} 步
        </p>
        <p className="sr-only" aria-live="assertive">
          {state.stepState === 'awaiting' ? '时间到' : ''}
        </p>
      </header>

      <section className="flex flex-1 flex-col justify-center gap-5 py-6">
        <div aria-live="polite" aria-atomic="true">
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

          <h1 className="mt-4 text-[clamp(1.75rem,8vw,2.5rem)] font-bold leading-snug tracking-tight">
            {step.text}
          </h1>

          {step.tip ? (
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{step.tip}</p>
          ) : null}
        </div>

        {timed ? (
          <div className="space-y-3">
            <CountdownRing
              remainingMs={remaining}
              totalMs={step.durationSec * 1000}
              paused={state.stepState === 'paused'}
              awaiting={state.stepState === 'awaiting'}
            />
            {state.stepState !== 'manual' ? (
              <button
                type="button"
                onClick={handleExtend}
                className="mx-auto flex min-h-11 items-center justify-center rounded-full bg-white/5 px-4 text-sm text-[var(--accent-2)]"
              >
                {state.stepState === 'awaiting' ? '再来 30 秒' : '+30 秒'}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="text-center">
            <p className="text-[clamp(3.5rem,16vw,5.5rem)] font-bold tabular-nums tracking-tight">
              {formatClock(elapsed)}
            </p>
            <p className="mt-3 text-sm text-[var(--muted)]">
              {step.suggestRange
                ? `建议 ${formatRange(step.suggestRange)}，看状态决定`
                : '看状态，好了就点下一步'}
            </p>
          </div>
        )}

        <div
          className={
            state.stepState === 'awaiting'
              ? 'rounded-2xl bg-[var(--surface)] p-4'
              : 'px-1'
          }
        >
          <p className="text-xs text-[var(--muted)]">
            {state.stepState === 'awaiting' ? '时间到 · 下一步' : '下一步'}
          </p>
          <p
            className={
              state.stepState === 'awaiting'
                ? 'mt-1 text-lg font-medium'
                : 'mt-1 truncate text-sm text-[var(--muted)]'
            }
          >
            {next ? next.text : '最后一步了，准备出锅。'}
          </p>
        </div>
      </section>

      <footer className="space-y-3">
        {primary ? <BigButton onClick={handlePrimary}>{primary.label}</BigButton> : null}

        <div className="flex gap-2">
          {state.stepIndex > 0 ? (
            <BigButton
              variant="ghost"
              size="compact"
              className="flex-1"
              onClick={handlePrev}
            >
              上一步
            </BigButton>
          ) : null}

          <BigButton
            variant="ghost"
            size="compact"
            className="flex-1"
            onClick={handleRelisten}
          >
            重听
          </BigButton>

          {canSkip ? (
            <BigButton
              variant="ghost"
              size="compact"
              className="flex-1"
              onClick={handleSkip}
            >
              跳过
            </BigButton>
          ) : null}
        </div>
      </footer>

      <ConfirmSheet
        open={abortOpen}
        title="要结束这次做菜吗？"
        description="已完成的步骤会保存，这道菜可以下次再做。"
        cancelLabel="继续做"
        confirmLabel="结束并保存"
        tone="danger"
        onCancel={() => setAbortOpen(false)}
        onConfirm={handleAbort}
      />

      <ConfirmSheet
        open={prevOpen}
        title={`回到第 ${Math.max(1, state.stepIndex)} 步？`}
        description="当前步骤的计时会重新开始，这一步的记录会作废。"
        cancelLabel="继续当前步骤"
        confirmLabel="回到上一步"
        tone="danger"
        onCancel={() => setPrevOpen(false)}
        onConfirm={() => {
          setPrevOpen(false);
          dispatch({ type: 'PREV', now: Date.now() });
          showToast({ message: `回到第 ${Math.max(1, state.stepIndex)} 步，重新计时` });
        }}
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
