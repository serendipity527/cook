import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type View =
  | { name: 'home' }
  | { name: 'detail'; recipeId: string }
  | { name: 'prep'; recipeId: string }
  | { name: 'cook' }
  | { name: 'done' }
  | { name: 'studio' }
  | { name: 'chat' };

interface AppState {
  view: View;
  speechEnabled: boolean;
  speechRate: number;
  navigate: (view: View) => void;
  setSpeechEnabled: (enabled: boolean) => void;
  setSpeechRate: (rate: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      view: { name: 'home' },
      speechEnabled: true,
      speechRate: 1.05,
      navigate: (view) => set({ view }),
      setSpeechEnabled: (speechEnabled) => set({ speechEnabled }),
      setSpeechRate: (speechRate) => set({ speechRate }),
    }),
    {
      name: 'kaihuo:settings',
      partialize: (state) => ({
        speechEnabled: state.speechEnabled,
        speechRate: state.speechRate,
      }),
    },
  ),
);
