import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DraftSpec } from '@shared/schema';

export interface ChatEntry {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatStore {
  messages: ChatEntry[];
  draft: DraftSpec | null;
  recipeIds: string[];
  appendMessage: (message: ChatEntry) => void;
  setDraft: (draft: DraftSpec | null) => void;
  setRecipeIds: (recipeIds: string[]) => void;
  reset: () => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      messages: [],
      draft: null,
      recipeIds: [],
      appendMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
      setDraft: (draft) => set({ draft }),
      setRecipeIds: (recipeIds) => set({ recipeIds }),
      reset: () => set({ messages: [], draft: null, recipeIds: [] }),
    }),
    {
      name: 'kaihuo:chat',
      partialize: (state) => ({
        messages: state.messages,
        draft: state.draft,
        recipeIds: state.recipeIds,
      }),
    },
  ),
);
