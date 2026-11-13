import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from './useAppStore';

const home = { name: 'home' } as const;
const detail = { name: 'detail', recipeId: 'r1' } as const;
const studio = { name: 'studio' } as const;

beforeEach(() => {
  useAppStore.setState({ view: home, stack: [] });
});

describe('useAppStore navigation', () => {
  it('pushes the current view and pops back', () => {
    const { navigate, back } = useAppStore.getState();

    navigate(detail);

    expect(useAppStore.getState().view).toEqual(detail);
    expect(useAppStore.getState().stack).toEqual([home]);

    expect(back()).toBe(true);
    expect(useAppStore.getState().view).toEqual(home);
    expect(useAppStore.getState().stack).toEqual([]);
    expect(back()).toBe(false);
  });

  it('does nothing when navigating to the current view', () => {
    const { navigate } = useAppStore.getState();

    navigate(home);

    expect(useAppStore.getState().stack).toEqual([]);
  });

  it('replaces the current view without growing the stack', () => {
    const { navigate } = useAppStore.getState();

    navigate(detail);
    navigate(studio, { replace: true });

    expect(useAppStore.getState().view).toEqual(studio);
    expect(useAppStore.getState().stack).toEqual([home]);
  });

  it('resetTo sets the whole path', () => {
    const { resetTo, back } = useAppStore.getState();

    resetTo([home, detail]);

    expect(useAppStore.getState().view).toEqual(detail);
    expect(useAppStore.getState().stack).toEqual([home]);

    back();
    expect(useAppStore.getState().view).toEqual(home);
  });

  it('does not persist the navigation stack', () => {
    const { navigate } = useAppStore.getState();
    navigate(detail);

    const persisted = JSON.parse(window.localStorage.getItem('kaihuo:settings') ?? '{}') as {
      state?: Record<string, unknown>;
    };

    expect(persisted.state).not.toHaveProperty('view');
    expect(persisted.state).not.toHaveProperty('stack');
  });
});
