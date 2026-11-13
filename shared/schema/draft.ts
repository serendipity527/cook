import { z } from 'zod';
import { PREP_ITEM_MAX, PrepInputSchema, STEP_MAX, StepInputSchema } from './recipe';

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
});

export const DraftSpecSchema = z.object({
  title: z.string().min(1).max(40),
  servings: z.number().int().min(1).max(20),
  estimatedMinutes: z.number().int().positive().optional(),
  prep: z.array(PrepInputSchema).max(PREP_ITEM_MAX),
  steps: z.array(StepInputSchema).min(1).max(STEP_MAX),
  questions: z.array(z.string().min(1).max(120)).max(3),
});

export const DraftSchema = z.object({
  id: z.string().min(1),
  baseRecipeId: z.string().min(1).optional(),
  spec: DraftSpecSchema,
  messages: z.array(ChatMessageSchema).max(20).default([]),
  updatedAt: z.number().int().nonnegative(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type DraftSpec = z.infer<typeof DraftSpecSchema>;
export type Draft = z.infer<typeof DraftSchema>;
