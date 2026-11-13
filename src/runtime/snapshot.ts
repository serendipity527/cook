import { z } from 'zod';
import { RecipeSchema, StepLogSchema } from '@shared/schema';
import type { CookState } from './machine';

export const SNAPSHOT_KEY = 'kaihuo:cook-session';
export const SNAPSHOT_MAX_AGE_MS = 4 * 60 * 60 * 1000;

const CookStateSnapshotSchema = z.object({
  recipe: RecipeSchema,
  sessionId: z.string().min(1),
  phase: z.enum(['prep', 'cooking', 'done']),
  prepChecked: z.record(z.string(), z.boolean()),
  stepIndex: z.number().int().nonnegative(),
  stepState: z.enum(['running', 'paused', 'awaiting', 'manual']).nullable(),
  enteredAt: z.number(),
  timerEndAt: z.number().nullable(),
  pausedRemainingMs: z.number().nullable(),
  pausedAt: z.number().nullable(),
  pausedTotalMs: z.number().nonnegative(),
  logs: z.array(StepLogSchema),
  startedAt: z.number(),
  endedAt: z.number().nullable(),
  finishedEarly: z.boolean(),
});

const SnapshotSchema = z.object({
  state: CookStateSnapshotSchema,
  savedAt: z.number(),
});

export interface CookSnapshot {
  state: CookState;
  savedAt: number;
}

export function saveSnapshot(state: CookState, now = Date.now()): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ state, savedAt: now }));
  } catch {
    // 配额满或隐私模式：内存中的烹饪继续，不打断用户
  }
}

export function loadSnapshot(now = Date.now()): CookSnapshot | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(SNAPSHOT_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = SnapshotSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      clearSnapshot();
      return null;
    }

    if (now - parsed.data.savedAt > SNAPSHOT_MAX_AGE_MS) {
      clearSnapshot();
      return null;
    }

    if (parsed.data.state.phase === 'done') {
      clearSnapshot();
      return null;
    }

    return parsed.data as CookSnapshot;
  } catch {
    clearSnapshot();
    return null;
  }
}

export function clearSnapshot(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.removeItem(SNAPSHOT_KEY);
}
