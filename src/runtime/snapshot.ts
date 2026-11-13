import { z } from 'zod';
import { RecipeSchema, StepLogSchema } from '@shared/schema';
import type { CookState } from './machine';

export const SNAPSHOT_KEY = 'kaihuo:cook-session';
export const SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

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

export interface SnapshotPeek extends CookSnapshot {
  ageMs: number;
  fresh: boolean;
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

/**
 * 只读取，不按年龄删除。过期的快照仍要留给首页恢复条。
 */
export function peekSnapshot(now = Date.now()): SnapshotPeek | null {
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

    if (parsed.data.state.phase === 'done') {
      clearSnapshot();
      return null;
    }

    const ageMs = Math.max(0, now - parsed.data.savedAt);

    return {
      ...parsed.data,
      ageMs,
      fresh: ageMs <= SNAPSHOT_MAX_AGE_MS,
    };
  } catch {
    clearSnapshot();
    return null;
  }
}

/**
 * 自动恢复只接受 24 小时内的快照；过期快照由用户从首页确认。
 */
export function loadSnapshot(now = Date.now()): CookSnapshot | null {
  const peek = peekSnapshot(now);

  if (!peek?.fresh) {
    return null;
  }

  return { state: peek.state, savedAt: peek.savedAt };
}

export function clearSnapshot(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.removeItem(SNAPSHOT_KEY);
}
