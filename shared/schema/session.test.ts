import { describe, expect, it } from 'vitest';
import { CookSessionSchema, StepLogSchema } from './session';

const validSession = {
  id: 'sess_1',
  recipeId: 'r_tomato_egg',
  recipeUpdatedAt: 0,
  startedAt: 1000,
  endedAt: 2000,
  status: 'completed',
  steps: [{ stepId: 's1', plannedSec: 45, actualSec: 50 }],
};

describe('StepLogSchema', () => {
  it('defaults skipped to false', () => {
    const log = StepLogSchema.parse({ stepId: 's1', actualSec: 10 });
    expect(log.skipped).toBe(false);
  });

  it('rejects negative actual durations', () => {
    const result = StepLogSchema.safeParse({ stepId: 's1', actualSec: -1 });
    expect(result.success).toBe(false);
  });
});

describe('CookSessionSchema', () => {
  it('accepts a completed session', () => {
    const session = CookSessionSchema.parse(validSession);
    expect(session.status).toBe('completed');
    expect(session.steps).toHaveLength(1);
  });

  it('rejects an unknown status', () => {
    const result = CookSessionSchema.safeParse({ ...validSession, status: 'paused' });
    expect(result.success).toBe(false);
  });

  it('allows an active session without endedAt', () => {
    const { endedAt: _endedAt, ...active } = validSession;
    const result = CookSessionSchema.safeParse({ ...active, status: 'active' });
    expect(result.success).toBe(true);
  });
});
