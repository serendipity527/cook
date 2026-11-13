import { z } from 'zod';

export const SessionStatusSchema = z.enum(['active', 'completed', 'abandoned']);

export const StepLogSchema = z.object({
  stepId: z.string().min(1),
  plannedSec: z.number().int().positive().optional(),
  actualSec: z.number().min(0),
  skipped: z.boolean().default(false),
});

export const CookSessionSchema = z.object({
  id: z.string().min(1),
  recipeId: z.string().min(1),
  recipeUpdatedAt: z.number().int().nonnegative(),
  startedAt: z.number().int().nonnegative(),
  endedAt: z.number().int().nonnegative().optional(),
  status: SessionStatusSchema,
  steps: z.array(StepLogSchema),
  note: z.string().max(200).optional(),
});

export type StepLog = z.infer<typeof StepLogSchema>;
export type CookSession = z.infer<typeof CookSessionSchema>;
export type SessionStatus = z.infer<typeof SessionStatusSchema>;
