import { z } from 'zod';

export const PREP_ITEM_MAX = 20;
export const STEP_MAX = 40;
/** 单步最长 30 天，最短 3 秒。 */
export const STEP_DURATION_MIN_SEC = 3;
export const STEP_DURATION_MAX_SEC = 30 * 24 * 60 * 60;

export const PrepInputSchema = z.object({
  text: z.string().min(1).max(80),
  tip: z.string().max(120).optional(),
  photoAssetId: z.string().min(1).optional(),
  photoSrc: z.string().min(1).max(300).optional(),
});

export const PrepItemSchema = PrepInputSchema.extend({
  id: z.string().min(1),
});

const stepFields = {
  text: z.string().min(1).max(200),
  detail: z.string().max(200).optional(),
  speak: z.string().max(60).optional(),
  kind: z.enum(['timed', 'judgment']),
  durationSec: z.number().int().min(STEP_DURATION_MIN_SEC).max(STEP_DURATION_MAX_SEC).optional(),
  suggestRange: z.tuple([z.number().int().positive(), z.number().int().positive()]).optional(),
  heat: z.enum(['low', 'medium', 'high']).optional(),
  tip: z.string().max(160).optional(),
  ingredients: z.array(z.string().max(40)).optional(),
  assetId: z.string().min(1).optional(),
  photoAssetId: z.string().min(1).optional(),
  photoSrc: z.string().min(1).max(300).optional(),
};

type StepShape = {
  kind: 'timed' | 'judgment';
  durationSec?: number;
  suggestRange?: [number, number];
};

function refineStep(step: StepShape, ctx: z.RefinementCtx) {
  if (step.kind === 'timed' && step.durationSec === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['durationSec'],
      message: '定时步骤必须填写时长',
    });
  }

  if (step.kind === 'judgment' && step.durationSec !== undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['durationSec'],
      message: '判断型步骤不能填写固定时长',
    });
  }

  if (step.suggestRange && step.suggestRange[0] > step.suggestRange[1]) {
    ctx.addIssue({
      code: 'custom',
      path: ['suggestRange'],
      message: '建议时长的下限不能大于上限',
    });
  }
}

export const StepInputSchema = z.object(stepFields).superRefine(refineStep);

export const StepSchema = z
  .object({
    id: z.string().min(1),
    ...stepFields,
  })
  .superRefine(refineStep);

export const RecipeSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  title: z.string().min(1).max(40),
  subtitle: z.string().max(80).optional(),
  servings: z.number().int().min(1).max(20),
  tags: z.array(z.string().min(1).max(12)).max(10).default([]),
  coverAssetId: z.string().min(1).optional(),
  prep: z.array(PrepItemSchema).max(PREP_ITEM_MAX),
  steps: z.array(StepSchema).min(1).max(STEP_MAX),
  source: z.enum(['builtin', 'user', 'ai']),
  estimatedMinutes: z.number().int().positive().optional(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  deletedAt: z.number().int().nonnegative().optional(),
});

export type PrepInput = z.infer<typeof PrepInputSchema>;
export type PrepItem = z.infer<typeof PrepItemSchema>;
export type Step = z.infer<typeof StepSchema>;
export type StepInput = z.infer<typeof StepInputSchema>;
export type Recipe = z.infer<typeof RecipeSchema>;
export type RecipeSource = Recipe['source'];

export type TimedStep = Step & { kind: 'timed'; durationSec: number };

export function isTimedStep(step: Step): step is TimedStep {
  return step.kind === 'timed' && step.durationSec !== undefined;
}
