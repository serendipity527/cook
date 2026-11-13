import { beforeEach, describe, expect, it } from 'vitest';
import { builtinRecipes } from '@/data/builtin';
import { cookReducer, createInitialState, type CookState } from './machine';
import {
  SNAPSHOT_KEY,
  SNAPSHOT_MAX_AGE_MS,
  clearSnapshot,
  loadSnapshot,
  peekSnapshot,
  saveSnapshot,
} from './snapshot';

const recipe = builtinRecipes[0]!;

function activeCook(): CookState {
  return cookReducer(createInitialState(recipe, 'sess_snapshot', 1000), {
    type: 'START_COOKING',
    now: 1000,
  });
}

beforeEach(() => {
  localStorage.clear();
});

describe('cook snapshot', () => {
  it('round-trips an active cook', () => {
    const state = activeCook();
    saveSnapshot(state, 2000);

    const snapshot = loadSnapshot(3000);
    expect(snapshot?.savedAt).toBe(2000);
    expect(snapshot?.state.recipe.id).toBe(recipe.id);
    expect(snapshot?.state.stepIndex).toBe(0);
    expect(snapshot?.state.stepState).toBe('running');
  });

  it('keeps a stale snapshot for the home recovery bar', () => {
    saveSnapshot(activeCook(), 1000);
    const now = 1000 + SNAPSHOT_MAX_AGE_MS + 1;

    expect(loadSnapshot(now)).toBeNull();

    const peek = peekSnapshot(now);
    expect(peek?.fresh).toBe(false);
    expect(peek?.ageMs).toBe(SNAPSHOT_MAX_AGE_MS + 1);
    expect(localStorage.getItem(SNAPSHOT_KEY)).not.toBeNull();
  });

  it('treats exactly 24 hours as fresh', () => {
    saveSnapshot(activeCook(), 1000);
    const peek = peekSnapshot(1000 + SNAPSHOT_MAX_AGE_MS);

    expect(peek?.fresh).toBe(true);
  });

  it('returns null for malformed data', () => {
    localStorage.setItem(SNAPSHOT_KEY, '{not-json');
    expect(peekSnapshot(2000)).toBeNull();
    expect(localStorage.getItem(SNAPSHOT_KEY)).toBeNull();
  });

  it('does not offer a finished cook', () => {
    const done: CookState = { ...activeCook(), phase: 'done', endedAt: 5000 };
    saveSnapshot(done, 5000);

    expect(peekSnapshot(6000)).toBeNull();
    expect(localStorage.getItem(SNAPSHOT_KEY)).toBeNull();
  });

  it('clears the snapshot on demand', () => {
    saveSnapshot(activeCook(), 1000);
    clearSnapshot();

    expect(peekSnapshot(2000)).toBeNull();
  });
});
