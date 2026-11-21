import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme } from '@/lib/theme';

export type View =
  | { name: 'home' }
  | { name: 'detail'; recipeId: string }
  | { name: 'prep'; recipeId: string }
  | { name: 'cook' }
  | { name: 'done' }
  | { name: 'studio' }
  | { name: 'chat' }
  | { name: 'edit'; recipeId?: string };

interface NavigateOptions {
  replace?: boolean;
}

interface AppState {
  view: View;
  stack: View[];
  theme: Theme;
  speechEnabled: boolean;
  speechRate: number;
  navigate: (view: View, options?: NavigateOptions) => void;
  back: () => boolean;
  resetTo: (views: View[]) => void;
  setTheme: (theme: Theme) => void;
  setSpeechEnabled: (enabled: boolean) => void;
  setSpeechRate: (rate: number) => void;
}

function sameView(a: View, b: View): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      view: { name: 'home' },
      stack: [],
      theme: 'dark',
      speechEnabled: true,
      speechRate: 1.0,
      navigate: (view, options) =>
        set((state) => {
          if (sameView(state.view, view)) {
            return state;
          }

          return {
            view,
            stack: options?.replace ? state.stack : [...state.stack, state.view],
          };
        }),
      back: () => {
        const { stack } = get();
        const previous = stack[stack.length - 1];

        if (!previous) {
          return false;
        }

        set({ view: previous, stack: stack.slice(0, -1) });
        return true;
      },
      resetTo: (views) => {
        const target = views[views.length - 1];

        if (!target) {
          return;
        }

        set({ view: target, stack: views.slice(0, -1) });
      },
      setTheme: (theme) => set({ theme }),
      setSpeechEnabled: (speechEnabled) => set({ speechEnabled }),
      setSpeechRate: (speechRate) => set({ speechRate }),
    }),
    {
      name: 'kaihuo:settings',
      partialize: (state) => ({
        theme: state.theme,
        speechEnabled: state.speechEnabled,
        speechRate: state.speechRate,
      }),
    },
  ),
);
