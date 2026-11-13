import { z } from 'zod';
import { CookSessionSchema, RecipeSchema, type CookSession, type Recipe } from '@shared/schema';

export const EXPORT_FORMAT = 'kaihuo.recipes';
export const EXPORT_VERSION = 1;

export interface ExportBundle {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: number;
  recipes: Recipe[];
  sessions: CookSession[];
}

const EnvelopeSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  version: z.number().int().positive(),
  exportedAt: z.number(),
  recipes: z.array(z.unknown()),
  sessions: z.array(z.unknown()).default([]),
});

export interface ParsedExport {
  recipes: unknown[];
  sessions: unknown[];
  exportedAt: number;
}

export function buildExportBundle(
  recipes: Recipe[],
  sessions: CookSession[],
  now = Date.now(),
): ExportBundle {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: now,
    recipes: recipes.filter(
      (recipe) => recipe.source !== 'builtin' && recipe.deletedAt === undefined,
    ),
    sessions,
  };
}

export function parseExportBundle(text: string): ParsedExport {
  let raw: unknown;

  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('文件不是有效的 JSON');
  }

  const parsed = EnvelopeSchema.safeParse(raw);

  if (!parsed.success) {
    throw new Error('这不是“开火”的备份文件');
  }

  if (parsed.data.version > EXPORT_VERSION) {
    throw new Error('备份版本过新，请先升级应用');
  }

  return {
    recipes: parsed.data.recipes,
    sessions: parsed.data.sessions,
    exportedAt: parsed.data.exportedAt,
  };
}

export interface ImportReport {
  recipesAdded: number;
  recipesUpdated: number;
  recipesSkipped: number;
  sessionsAdded: number;
  sessionsSkipped: number;
}

export interface MergeInput {
  recipes: unknown[];
  sessions: unknown[];
  existingRecipes: Recipe[];
  existingSessionIds: ReadonlySet<string>;
}

export interface MergeResult {
  recipesToPut: Recipe[];
  sessionsToPut: CookSession[];
  report: ImportReport;
}

export function mergeImport({
  recipes,
  sessions,
  existingRecipes,
  existingSessionIds,
}: MergeInput): MergeResult {
  const existingById = new Map(existingRecipes.map((recipe) => [recipe.id, recipe]));
  const recipesToPut: Recipe[] = [];
  let recipesAdded = 0;
  let recipesUpdated = 0;
  let recipesSkipped = 0;

  for (const raw of recipes) {
    const parsed = RecipeSchema.safeParse(raw);

    if (!parsed.success) {
      recipesSkipped += 1;
      continue;
    }

    const recipe = parsed.data;

    if (recipe.source === 'builtin' || recipe.deletedAt !== undefined) {
      recipesSkipped += 1;
      continue;
    }

    const existing = existingById.get(recipe.id);

    if (existing?.deletedAt !== undefined) {
      recipesSkipped += 1;
      continue;
    }

    if (!existing) {
      recipesToPut.push(recipe);
      recipesAdded += 1;
      continue;
    }

    if (recipe.updatedAt > existing.updatedAt) {
      recipesToPut.push(recipe);
      recipesUpdated += 1;
    } else {
      recipesSkipped += 1;
    }
  }

  const sessionsToPut: CookSession[] = [];
  const seenSessions = new Set(existingSessionIds);
  let sessionsAdded = 0;
  let sessionsSkipped = 0;

  for (const raw of sessions) {
    const parsed = CookSessionSchema.safeParse(raw);

    if (!parsed.success || seenSessions.has(parsed.data.id)) {
      sessionsSkipped += 1;
      continue;
    }

    seenSessions.add(parsed.data.id);
    sessionsToPut.push(parsed.data);
    sessionsAdded += 1;
  }

  return {
    recipesToPut,
    sessionsToPut,
    report: {
      recipesAdded,
      recipesUpdated,
      recipesSkipped,
      sessionsAdded,
      sessionsSkipped,
    },
  };
}
