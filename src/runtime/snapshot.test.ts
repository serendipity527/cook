import { beforeEach, describe, expect, it } from 'vitest';
import { builtinRecipes } from '@/data/builtin';
import { cookReducer, createInitialState, type CookState } from './machine';
import { clearSnapshot, loadSnapshot, saveSnapshot } from './snapshot';

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

  it('drops a snapshot older than four hours', () => {
    saveSnapshot(activeCook(), 1000);

    expect(loadSnapshot(1000 + 4 * 60 * 60 * 1000 + 1)).toBeNull();
    expect(localStorage.getItem('kaihuo:cook-session')).toBeNull();
  });

  it('returns null for malformed data', () => {
    localStorage.setItem('kaihuo:cook-session', '{not-json');
    expect(loadSnapshot(2000)).toBeNull();
  });

  it('does not offer a finished cook', () => {
    const done: CookState = { ...activeCook(), phase: 'done', endedAt: 5000 };
    saveSnapshot(done, 5000);

    expect(loadSnapshot(6000)).toBeNull();
  });

  it('clears the snapshot on demand', () => {
    saveSnapshot(activeCook(), 1000);
    clearSnapshot();

    expect(loadSnapshot(2000)).toBeNull();
  });
});
