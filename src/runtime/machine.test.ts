import { describe, expect, it } from 'vitest';
import type { Recipe } from '@shared/schema';
import {
  cookReducer,
  createInitialState,
  prepareCookState,
  reconcileAfterRestore,
  remainingMs,
  stepElapsedMs,
  toSession,
  type CookEvent,
  type CookState,
} from './machine';

const recipe: Recipe = {
  schemaVersion: 1,
  id: 'r_test',
  title: '测试菜',
  servings: 1,
  tags: [],
  prep: [{ id: 'p1', text: '备菜' }],
  steps: [
    { id: 's1', text: '热油', kind: 'timed', durationSec: 10 },
    { id: 's2', text: '下蛋', kind: 'judgment', suggestRange: [5, 10] },
    { id: 's3', text: '出锅', kind: 'timed', durationSec: 20 },
  ],
  source: 'user',
  createdAt: 0,
  updatedAt: 0,
};

const initial = () => createInitialState(recipe, 'sess_test', 1000);

function send(state: CookState, ...events: CookEvent[]): CookState {
  return events.reduce(cookReducer, state);
}

function started(now = 1000): CookState {
  return cookReducer(initial(), { type: 'START_COOKING', now });
}

describe('createInitialState', () => {
  it('starts in prep with the first step pending', () => {
    const state = initial();
    expect(state.phase).toBe('prep');
    expect(state.stepIndex).toBe(0);
    expect(state.stepState).toBeNull();
    expect(state.logs).toEqual([]);
  });
});

describe('prep', () => {
  it('toggles a prep item', () => {
    const checked = cookReducer(initial(), { type: 'TOGGLE_PREP', itemId: 'p1' });
    expect(checked.prepChecked.p1).toBe(true);

    const unchecked = cookReducer(checked, { type: 'TOGGLE_PREP', itemId: 'p1' });
    expect(unchecked.prepChecked.p1).toBe(false);
  });

  it('checks every prep item at once', () => {
    const checked = cookReducer(initial(), { type: 'SET_ALL_PREP' });
    expect(checked.prepChecked).toEqual({ p1: true });
  });

  it('keeps prep checks when preparing the same recipe again', () => {
    const checked = cookReducer(initial(), { type: 'TOGGLE_PREP', itemId: 'p1' });
    const prepared = prepareCookState(checked, recipe, 'new_session', 2000);

    expect(prepared).toBe(checked);
    expect(prepared.prepChecked.p1).toBe(true);
  });

  it('starts a fresh prep state for another recipe', () => {
    const checked = cookReducer(initial(), { type: 'TOGGLE_PREP', itemId: 'p1' });
    const other: Recipe = { ...recipe, id: 'r_other', title: '另一道菜' };
    const prepared = prepareCookState(checked, other, 'new_session', 2000);

    expect(prepared.recipe.id).toBe('r_other');
    expect(prepared.prepChecked).toEqual({});
    expect(prepared.phase).toBe('prep');
  });
});

describe('start cooking', () => {
  it('enters the first timed step with an absolute end timestamp', () => {
    const state = started(1000);
    expect(state.phase).toBe('cooking');
    expect(state.stepIndex).toBe(0);
    expect(state.stepState).toBe('running');
    expect(state.timerEndAt).toBe(11000);
    expect(state.startedAt).toBe(1000);
  });

  it('enters a judgment step in manual mode', () => {
    const judgmentFirst: Recipe = {
      ...recipe,
      steps: [{ id: 's0', text: '看状态', kind: 'judgment' }],
    };
    const state = cookReducer(createInitialState(judgmentFirst, 'sess', 1000), {
      type: 'START_COOKING',
      now: 1000,
    });
    expect(state.stepState).toBe('manual');
    expect(state.timerEndAt).toBeNull();
  });

  it('ignores START_COOKING when already cooking', () => {
    const state = started();
    expect(cookReducer(state, { type: 'START_COOKING', now: 2000 })).toBe(state);
  });
});

describe('timed step lifecycle', () => {
  it('moves to awaiting when the timer fires', () => {
    const state = send(started(), { type: 'TIMER_DONE', now: 11000 });
    expect(state.stepState).toBe('awaiting');
    expect(state.timerEndAt).toBeNull();
  });

  it('ignores TIMER_DONE on a manual step', () => {
    const atJudgment = send(started(), { type: 'NEXT', now: 2000 });
    expect(cookReducer(atJudgment, { type: 'TIMER_DONE', now: 3000 })).toBe(atJudgment);
  });

  it('pauses and resumes with the remaining time', () => {
    const paused = send(started(1000), { type: 'PAUSE', now: 4000 });
    expect(paused.stepState).toBe('paused');
    expect(paused.pausedRemainingMs).toBe(7000);
    expect(remainingMs(paused, 4000)).toBe(7000);

    const resumed = send(paused, { type: 'RESUME', now: 9000 });
    expect(resumed.stepState).toBe('running');
    expect(resumed.timerEndAt).toBe(16000);
    expect(resumed.pausedTotalMs).toBe(5000);
  });

  it('ignores RESUME when not paused', () => {
    const state = started();
    expect(cookReducer(state, { type: 'RESUME', now: 2000 })).toBe(state);
  });

  it('extends a running timer', () => {
    const state = send(started(1000), { type: 'EXTEND_TIME', now: 2000, seconds: 30 });

    expect(state.stepState).toBe('running');
    expect(state.timerEndAt).toBe(41000);
    expect(remainingMs(state, 2000)).toBe(39000);
  });

  it('extends a paused timer', () => {
    const paused = send(started(1000), { type: 'PAUSE', now: 4000 });
    const state = send(paused, { type: 'EXTEND_TIME', now: 5000, seconds: 30 });

    expect(state.stepState).toBe('paused');
    expect(state.pausedRemainingMs).toBe(37000);
  });

  it('restarts a finished timer for the extension', () => {
    const awaiting = send(started(1000), { type: 'TIMER_DONE', now: 11000 });
    const state = send(awaiting, { type: 'EXTEND_TIME', now: 12000, seconds: 30 });

    expect(state.stepState).toBe('running');
    expect(state.timerEndAt).toBe(42000);
    expect(remainingMs(state, 12000)).toBe(30000);
  });

  it('ignores EXTEND_TIME on a manual step', () => {
    const manual = send(started(1000), { type: 'NEXT', now: 2000 });
    expect(cookReducer(manual, { type: 'EXTEND_TIME', now: 3000, seconds: 30 })).toBe(manual);
  });

  it('ignores a stale TIMER_DONE after an extension', () => {
    const extended = send(started(1000), { type: 'EXTEND_TIME', now: 5000, seconds: 30 });
    const state = send(extended, { type: 'TIMER_DONE', now: 11000 });

    expect(state.stepState).toBe('running');
    expect(state.timerEndAt).toBe(41000);
  });
});

describe('advancing steps', () => {
  it('logs planned and actual seconds when moving on', () => {
    const state = send(started(1000), { type: 'NEXT', now: 17000 });
    expect(state.stepIndex).toBe(1);
    expect(state.stepState).toBe('manual');
    expect(state.logs).toEqual([{ stepId: 's1', plannedSec: 10, actualSec: 16, skipped: false }]);
  });

  it('does not count paused time as actual cooking time', () => {
    const state = send(
      started(1000),
      { type: 'PAUSE', now: 4000 },
      { type: 'RESUME', now: 9000 },
      { type: 'NEXT', now: 17000 },
    );
    expect(state.logs[0]?.actualSec).toBe(11);
  });

  it('marks a skipped step', () => {
    const state = send(started(1000), { type: 'NEXT', now: 3000, skipped: true });
    expect(state.logs[0]?.skipped).toBe(true);
  });

  it('undoes a skip with the original remaining time', () => {
    const before = started(1000);
    const skipped = send(before, { type: 'NEXT', now: 3000, skipped: true });
    const restored = cookReducer(skipped, {
      type: 'UNDO_SKIP',
      saved: before,
      savedRemainingMs: 8000,
      now: 5000,
    });

    expect(restored.stepIndex).toBe(0);
    expect(restored.logs).toEqual([]);
    expect(restored.stepState).toBe('running');
    expect(restored.timerEndAt).toBe(13000);
    expect(remainingMs(restored, 5000)).toBe(8000);
  });

  it('undoes a skip from a paused step', () => {
    const paused = send(started(1000), { type: 'PAUSE', now: 4000 });
    const skipped = send(paused, { type: 'NEXT', now: 5000, skipped: true });
    const restored = cookReducer(skipped, {
      type: 'UNDO_SKIP',
      saved: paused,
      savedRemainingMs: 7000,
      now: 8000,
    });

    expect(restored.stepState).toBe('paused');
    expect(restored.pausedRemainingMs).toBe(7000);
    expect(restored.pausedAt).toBe(8000);
  });

  it('undoes a skip from a manual step without counting the snackbar time', () => {
    const manual = send(started(1000), { type: 'NEXT', now: 2000 });
    const skipped = send(manual, { type: 'NEXT', now: 5000, skipped: true });
    const restored = cookReducer(skipped, {
      type: 'UNDO_SKIP',
      saved: manual,
      savedRemainingMs: 3000,
      now: 8000,
    });

    expect(restored.stepState).toBe('manual');
    expect(stepElapsedMs(restored, 8000)).toBe(3000);
  });

  it('finishes after the last step', () => {
    const state = send(
      started(1000),
      { type: 'NEXT', now: 2000 },
      { type: 'NEXT', now: 3000 },
      { type: 'NEXT', now: 4000 },
    );
    expect(state.phase).toBe('done');
    expect(state.stepState).toBeNull();
    expect(state.endedAt).toBe(4000);
    expect(state.finishedEarly).toBe(false);
    expect(state.logs).toHaveLength(3);
  });

  it('goes back and re-times the previous step', () => {
    const state = send(started(1000), { type: 'NEXT', now: 2000 }, { type: 'PREV', now: 6000 });
    expect(state.stepIndex).toBe(0);
    expect(state.stepState).toBe('running');
    expect(state.timerEndAt).toBe(16000);
    expect(state.logs).toEqual([]);
  });

  it('ignores PREV on the first step', () => {
    const state = started();
    expect(cookReducer(state, { type: 'PREV', now: 2000 })).toBe(state);
  });
});

describe('ending early', () => {
  it('finishes early and marks the current step skipped', () => {
    const state = send(started(1000), { type: 'FINISH', now: 5000 });
    expect(state.phase).toBe('done');
    expect(state.finishedEarly).toBe(true);
    expect(state.logs).toEqual([{ stepId: 's1', plannedSec: 10, actualSec: 4, skipped: true }]);
  });

  it('aborts without logging the current step', () => {
    const state = send(started(1000), { type: 'ABORT', now: 5000 });
    expect(state.phase).toBe('done');
    expect(state.finishedEarly).toBe(true);
    expect(state.logs).toEqual([]);
  });
});

describe('restore', () => {
  it('moves an expired running timer to awaiting', () => {
    const state = reconcileAfterRestore(started(1000), 12000);
    expect(state.stepState).toBe('awaiting');
    expect(state.timerEndAt).toBeNull();
  });

  it('keeps a running timer that has not expired', () => {
    const state = started(1000);
    expect(reconcileAfterRestore(state, 5000)).toBe(state);
  });

  it('keeps a paused step paused', () => {
    const paused = send(started(1000), { type: 'PAUSE', now: 4000 });
    expect(reconcileAfterRestore(paused, 9000)).toBe(paused);
  });
});

describe('toSession', () => {
  it('maps an active cook to an active session', () => {
    const session = toSession(started(1000), 5000);
    expect(session.status).toBe('active');
    expect(session.endedAt).toBeUndefined();
    expect(session.recipeId).toBe(recipe.id);
  });

  it('maps a natural finish to completed', () => {
    const state = send(
      started(1000),
      { type: 'NEXT', now: 2000 },
      { type: 'NEXT', now: 3000 },
      { type: 'NEXT', now: 4000 },
    );
    expect(toSession(state, 5000).status).toBe('completed');
  });

  it('maps an early finish to abandoned', () => {
    const state = send(started(1000), { type: 'FINISH', now: 5000 });
    expect(toSession(state, 5000).status).toBe('abandoned');
  });
});
