import { z } from 'zod';

export const AssetKindSchema = z.enum(['stepAudio', 'cover', 'photo']);

export const AssetSchema = z.object({
  id: z.string().min(1),
  recipeId: z.string().min(1),
  stepId: z.string().min(1).optional(),
  kind: AssetKindSchema,
  mime: z.string().min(1),
  blob: z.instanceof(Blob),
  durationSec: z.number().positive().optional(),
  createdAt: z.number().int().nonnegative(),
});

export type Asset = z.infer<typeof AssetSchema>;
export type AssetKind = z.infer<typeof AssetKindSchema>;
