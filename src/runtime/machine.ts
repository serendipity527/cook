import { isTimedStep, type CookSession, type Recipe, type StepLog } from '@shared/schema';

export type Phase = 'prep' | 'cooking' | 'done';
export type StepState = 'running' | 'paused' | 'awaiting' | 'manual';

export interface CookState {
  recipe: Recipe;
  sessionId: string;
  phase: Phase;
  prepChecked: Record<string, boolean>;
  stepIndex: number;
  stepState: StepState | null;
  enteredAt: number;
  timerEndAt: number | null;
  pausedRemainingMs: number | null;
  pausedAt: number | null;
  pausedTotalMs: number;
  logs: StepLog[];
  startedAt: number;
  endedAt: number | null;
  finishedEarly: boolean;
}

export type CookEvent =
  | { type: 'TOGGLE_PREP'; itemId: string }
  | { type: 'SET_ALL_PREP' }
  | { type: 'START_COOKING'; now: number }
  | { type: 'TIMER_DONE'; now: number }
  | { type: 'EXTEND_TIME'; now: number; seconds: number }
  | { type: 'PAUSE'; now: number }
  | { type: 'RESUME'; now: number }
  | { type: 'NEXT'; now: number; skipped?: boolean }
  | { type: 'UNDO_SKIP'; saved: CookState; savedRemainingMs: number; now: number }
  | { type: 'PREV'; now: number }
  | { type: 'FINISH'; now: number }
  | { type: 'ABORT'; now: number };

export function prepareCookState(
  state: CookState | null,
  recipe: Recipe,
  sessionId: string,
  now: number,
): CookState {
  if (state?.phase === 'prep' && state.recipe.id === recipe.id) {
    return state;
  }

  return createInitialState(recipe, sessionId, now);
}

export function createInitialState(recipe: Recipe, sessionId: string, now: number): CookState {
  return {
    recipe,
    sessionId,
    phase: 'prep',
    prepChecked: {},
    stepIndex: 0,
    stepState: null,
    enteredAt: now,
    timerEndAt: null,
    pausedRemainingMs: null,
    pausedAt: null,
    pausedTotalMs: 0,
    logs: [],
    startedAt: now,
    endedAt: null,
    finishedEarly: false,
  };
}

function enterStep(state: CookState, index: number, now: number): CookState {
  const step = state.recipe.steps[index];

  if (!step) {
    return state;
  }

  const timed = isTimedStep(step);

  return {
    ...state,
    stepIndex: index,
    stepState: timed ? 'running' : 'manual',
    enteredAt: now,
    timerEndAt: timed ? now + step.durationSec * 1000 : null,
    pausedRemainingMs: null,
    pausedAt: null,
    pausedTotalMs: 0,
  };
}

function elapsedSeconds(state: CookState, now: number): number {
  const pausedFor = state.pausedAt === null ? 0 : now - state.pausedAt;
  const elapsedMs = now - state.enteredAt - state.pausedTotalMs - pausedFor;
  return Math.max(0, Math.round(elapsedMs / 1000));
}

function upsertLog(logs: StepLog[], log: StepLog): StepLog[] {
  return [...logs.filter((item) => item.stepId !== log.stepId), log];
}

function currentLog(state: CookState, now: number, skipped: boolean): StepLog | null {
  const step = state.recipe.steps[state.stepIndex];

  if (!step) {
    return null;
  }

  return {
    stepId: step.id,
    plannedSec: isTimedStep(step) ? step.durationSec : undefined,
    actualSec: elapsedSeconds(state, now),
    skipped,
  };
}

function finish(state: CookState, now: number, logs: StepLog[], finishedEarly: boolean): CookState {
  return {
    ...state,
    logs,
    phase: 'done',
    stepState: null,
    timerEndAt: null,
    pausedRemainingMs: null,
    pausedAt: null,
    endedAt: now,
    finishedEarly,
  };
}

export function cookReducer(state: CookState, event: CookEvent): CookState {
  switch (event.type) {
    case 'TOGGLE_PREP': {
      if (state.phase !== 'prep') {
        return state;
      }

      return {
        ...state,
        prepChecked: {
          ...state.prepChecked,
          [event.itemId]: !state.prepChecked[event.itemId],
        },
      };
    }

    case 'SET_ALL_PREP': {
      if (state.phase !== 'prep') {
        return state;
      }

      return {
        ...state,
        prepChecked: Object.fromEntries(state.recipe.prep.map((item) => [item.id, true])),
      };
    }

    case 'START_COOKING': {
      if (state.phase !== 'prep') {
        return state;
      }

      return enterStep(
        {
          ...state,
          phase: 'cooking',
          startedAt: event.now,
          logs: [],
          endedAt: null,
          finishedEarly: false,
        },
        0,
        event.now,
      );
    }

    case 'TIMER_DONE': {
      if (state.phase !== 'cooking' || state.stepState !== 'running') {
        return state;
      }

      if (state.timerEndAt === null || event.now < state.timerEndAt) {
        return state;
      }

      return {
        ...state,
        stepState: 'awaiting',
        timerEndAt: null,
        pausedRemainingMs: null,
      };
    }

    case 'EXTEND_TIME': {
      if (state.phase !== 'cooking' || state.stepState === 'manual') {
        return state;
      }

      const step = state.recipe.steps[state.stepIndex];

      if (!step || !isTimedStep(step)) {
        return state;
      }

      const delta = Math.max(1, Math.round(event.seconds)) * 1000;

      if (state.stepState === 'running') {
        if (state.timerEndAt === null) {
          return state;
        }

        return { ...state, timerEndAt: state.timerEndAt + delta };
      }

      if (state.stepState === 'paused') {
        if (state.pausedRemainingMs === null) {
          return state;
        }

        return { ...state, pausedRemainingMs: state.pausedRemainingMs + delta };
      }

      if (state.stepState === 'awaiting') {
        return {
          ...state,
          stepState: 'running',
          timerEndAt: event.now + delta,
          pausedRemainingMs: null,
          pausedAt: null,
        };
      }

      return state;
    }

    case 'PAUSE': {
      if (state.stepState !== 'running' || state.timerEndAt === null) {
        return state;
      }

      return {
        ...state,
        stepState: 'paused',
        pausedRemainingMs: Math.max(0, state.timerEndAt - event.now),
        timerEndAt: null,
        pausedAt: event.now,
      };
    }

    case 'RESUME': {
      if (state.stepState !== 'paused' || state.pausedRemainingMs === null) {
        return state;
      }

      const pausedFor = state.pausedAt === null ? 0 : event.now - state.pausedAt;
      const remaining = state.pausedRemainingMs;

      return {
        ...state,
        stepState: remaining > 0 ? 'running' : 'awaiting',
        timerEndAt: remaining > 0 ? event.now + remaining : null,
        pausedRemainingMs: null,
        pausedAt: null,
        pausedTotalMs: state.pausedTotalMs + pausedFor,
      };
    }

    case 'NEXT': {
      if (state.phase !== 'cooking') {
        return state;
      }

      const log = currentLog(state, event.now, event.skipped ?? false);

      if (!log) {
        return state;
      }

      const logs = upsertLog(state.logs, log);
      const nextIndex = state.stepIndex + 1;

      if (nextIndex >= state.recipe.steps.length) {
        return finish(state, event.now, logs, false);
      }

      return enterStep({ ...state, logs }, nextIndex, event.now);
    }

    case 'UNDO_SKIP': {
      if (state.phase !== 'cooking' || event.saved.phase !== 'cooking') {
        return state;
      }

      const saved = event.saved;
      const restored: CookState = {
        ...saved,
        timerEndAt: null,
        pausedRemainingMs: null,
        pausedAt: null,
      };

      if (saved.stepState === 'running') {
        restored.timerEndAt = event.now + event.savedRemainingMs;
      } else if (saved.stepState === 'paused') {
        restored.pausedRemainingMs = event.savedRemainingMs;
        restored.pausedAt = event.now;
      } else if (saved.stepState === 'manual') {
        restored.enteredAt = event.now - event.savedRemainingMs;
      }

      return restored;
    }

    case 'PREV': {
      if (state.phase !== 'cooking' || state.stepIndex === 0) {
        return state;
      }

      const targetIndex = state.stepIndex - 1;
      const keep = new Set(state.recipe.steps.slice(0, targetIndex).map((step) => step.id));
      const logs = state.logs.filter((log) => keep.has(log.stepId));

      return enterStep({ ...state, logs }, targetIndex, event.now);
    }

    case 'FINISH': {
      if (state.phase !== 'cooking') {
        return state;
      }

      const log = currentLog(state, event.now, true);
      return finish(state, event.now, log ? upsertLog(state.logs, log) : state.logs, true);
    }

    case 'ABORT': {
      if (state.phase === 'done') {
        return state;
      }

      return finish(state, event.now, state.logs, true);
    }

    default:
      return state;
  }
}

export function remainingMs(state: CookState, now: number): number {
  if (state.stepState === 'paused') {
    return state.pausedRemainingMs ?? 0;
  }

  if (state.stepState === 'running' && state.timerEndAt !== null) {
    return Math.max(0, state.timerEndAt - now);
  }

  return 0;
}

export function stepElapsedMs(state: CookState, now: number): number {
  const pausedFor = state.pausedAt === null ? 0 : now - state.pausedAt;
  return Math.max(0, now - state.enteredAt - state.pausedTotalMs - pausedFor);
}

export function reconcileAfterRestore(state: CookState, now: number): CookState {
  if (state.phase !== 'cooking') {
    return state;
  }

  if (state.stepState === 'running' && state.timerEndAt !== null && state.timerEndAt <= now) {
    return {
      ...state,
      stepState: 'awaiting',
      timerEndAt: null,
      pausedRemainingMs: null,
    };
  }

  return state;
}

export function toSession(state: CookState, now: number): CookSession {
  const stepOrder = new Map(state.recipe.steps.map((step, index) => [step.id, index]));
  const steps = [...state.logs].sort(
    (a, b) => (stepOrder.get(a.stepId) ?? 99) - (stepOrder.get(b.stepId) ?? 99),
  );

  return {
    id: state.sessionId,
    recipeId: state.recipe.id,
    recipeUpdatedAt: state.recipe.updatedAt,
    startedAt: state.startedAt,
    endedAt: state.phase === 'done' ? (state.endedAt ?? now) : undefined,
    status: state.phase === 'done' ? (state.finishedEarly ? 'abandoned' : 'completed') : 'active',
    steps,
  };
}
