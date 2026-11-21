export type Theme = 'dark' | 'light';

export const SETTINGS_STORAGE_KEY = 'kaihuo:settings';

const THEME_COLORS: Record<Theme, string> = {
  dark: '#0b0f14',
  light: '#f5f1e8',
};

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  themeColor?.setAttribute('content', THEME_COLORS[theme]);

  const statusBar = document.querySelector<HTMLMetaElement>(
    'meta[name="apple-mobile-web-app-status-bar-style"]',
  );
  statusBar?.setAttribute('content', theme === 'light' ? 'default' : 'black-translucent');
}

export function readStoredTheme(): Theme {
  if (typeof localStorage === 'undefined') {
    return 'dark';
  }

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!raw) {
      return 'dark';
    }

    const parsed = JSON.parse(raw) as { state?: { theme?: unknown } };
    return parsed.state?.theme === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}
