import { afterEach, describe, expect, it } from 'vitest';
import { applyTheme, readStoredTheme, SETTINGS_STORAGE_KEY } from './theme';

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.colorScheme = '';
});

describe('theme', () => {
  it('defaults to dark without stored settings', () => {
    expect(readStoredTheme()).toBe('dark');
  });

  it('reads a persisted light theme', () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ state: { theme: 'light' }, version: 0 }),
    );

    expect(readStoredTheme()).toBe('light');
  });

  it('falls back to dark when the stored value is malformed', () => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, '{not json');

    expect(readStoredTheme()).toBe('dark');
  });

  it('applies the theme to the document', () => {
    applyTheme('light');

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');

    applyTheme('dark');

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });
});
