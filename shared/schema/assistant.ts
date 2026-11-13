import { z } from 'zod';
import { ChatMessageSchema, DraftSpecSchema } from './draft';

export const AssistantIntentSchema = z.enum([
  'chat',
  'help',
  'create_recipe',
  'update_recipe',
  'list_recipes',
  'show_recipe',
]);

export const RecipeIndexItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(60),
  tags: z.array(z.string()).max(10).default([]),
  estimatedMinutes: z.number().int().positive().optional(),
  source: z.enum(['builtin', 'user', 'ai']),
});

export const AssistantTurnSchema = z
  .object({
    intent: AssistantIntentSchema,
    reply: z.string().min(1).max(1500),
    draft: DraftSpecSchema.nullable().optional(),
    recipeIds: z.array(z.string().min(1)).max(20).optional(),
  })
  .superRefine((turn, ctx) => {
    const needsDraft = turn.intent === 'create_recipe' || turn.intent === 'update_recipe';

    if (needsDraft && !turn.draft) {
      ctx.addIssue({
        code: 'custom',
        path: ['draft'],
        message: '创建或修改菜谱时必须提供 draft',
      });
    }
  });

export const AssistantRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  draft: DraftSpecSchema.nullable().optional(),
  history: z.array(ChatMessageSchema).max(12).default([]),
  recipes: z.array(RecipeIndexItemSchema).max(50).default([]),
  locale: z.string().max(20).default('zh-CN'),
  sessionId: z.string().min(1).max(120).optional(),
});

export type AssistantIntent = z.infer<typeof AssistantIntentSchema>;
export type AssistantTurn = z.infer<typeof AssistantTurnSchema>;
export type AssistantRequest = z.infer<typeof AssistantRequestSchema>;
export type RecipeIndexItem = z.infer<typeof RecipeIndexItemSchema>;
