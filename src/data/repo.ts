import { CookSessionSchema, RecipeSchema, type CookSession, type Recipe } from '@shared/schema';
import {
  buildExportBundle,
  mergeImport,
  parseExportBundle,
  type ExportBundle,
  type ImportReport,
} from './backup';
import { builtinRecipeMap, builtinRecipes } from './builtin';
import { db } from './db';

export function newId(prefix: string): string {
  const uuid =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

  return `${prefix}_${uuid}`;
}

export function isBuiltinRecipe(id: string): boolean {
  return builtinRecipeMap.has(id);
}

export async function listUserRecipes(): Promise<Recipe[]> {
  const recipes = await db.recipes.toArray();
  return recipes.filter((recipe) => recipe.deletedAt === undefined);
}

export async function listAllRecipes(): Promise<Recipe[]> {
  return [...builtinRecipes, ...(await listUserRecipes())];
}

export async function getRecipe(id: string): Promise<Recipe | undefined> {
  const builtin = builtinRecipeMap.get(id);
  if (builtin) {
    return builtin;
  }

  const recipe = await db.recipes.get(id);
  if (!recipe || recipe.deletedAt !== undefined) {
    return undefined;
  }

  return recipe;
}

export async function saveRecipe(input: Recipe): Promise<Recipe> {
  const recipe = RecipeSchema.parse(input);

  if (recipe.source === 'builtin') {
    throw new Error('内置菜谱不能写入个人菜谱库');
  }

  await db.recipes.put(recipe);
  return recipe;
}

export async function deleteRecipe(id: string): Promise<void> {
  if (isBuiltinRecipe(id)) {
    throw new Error('内置菜谱不能删除');
  }

  const recipe = await db.recipes.get(id);
  if (!recipe) {
    return;
  }

  const now = Date.now();
  await db.recipes.put({ ...recipe, updatedAt: now, deletedAt: now });
}

export async function restoreRecipe(id: string): Promise<Recipe | undefined> {
  if (isBuiltinRecipe(id)) {
    throw new Error('内置菜谱不能恢复');
  }

  const recipe = await db.recipes.get(id);

  if (!recipe || recipe.deletedAt === undefined) {
    return recipe;
  }

  const restored = { ...recipe, updatedAt: Date.now(), deletedAt: undefined };
  await db.recipes.put(restored);
  return restored;
}

export async function duplicateRecipe(id: string): Promise<Recipe> {
  if (isBuiltinRecipe(id)) {
    return forkBuiltin(id);
  }

  const recipe = await getRecipe(id);

  if (!recipe) {
    throw new Error('菜谱不存在');
  }

  const now = Date.now();
  return saveRecipe({
    ...recipe,
    id: newId('r'),
    title: `${recipe.title} 副本`.slice(0, 40),
    source: 'user',
    createdAt: now,
    updatedAt: now,
    deletedAt: undefined,
  });
}

export async function forkBuiltin(id: string): Promise<Recipe> {
  const builtin = builtinRecipeMap.get(id);

  if (!builtin) {
    throw new Error('内置菜谱不存在');
  }

  const now = Date.now();
  return saveRecipe({
    ...builtin,
    id: newId('r'),
    source: 'user',
    createdAt: now,
    updatedAt: now,
  });
}

export async function saveSession(input: CookSession): Promise<CookSession> {
  const session = CookSessionSchema.parse(input);
  await db.sessions.put(session);
  return session;
}

export async function getSession(id: string): Promise<CookSession | undefined> {
  return db.sessions.get(id);
}

export async function listSessions(recipeId?: string): Promise<CookSession[]> {
  const sessions = recipeId
    ? await db.sessions.where('recipeId').equals(recipeId).toArray()
    : await db.sessions.toArray();

  return sessions.sort((a, b) => b.startedAt - a.startedAt);
}

export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return false;
  }

  return navigator.storage.persist();
}

export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return null;
  }

  const estimate = await navigator.storage.estimate();
  return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 };
}

export async function exportData(now = Date.now()): Promise<ExportBundle> {
  const [recipes, sessions] = await Promise.all([listUserRecipes(), listSessions()]);
  return buildExportBundle(recipes, sessions, now);
}

export async function importData(text: string): Promise<ImportReport> {
  const parsed = parseExportBundle(text);
  const [allRecipes, allSessions] = await Promise.all([
    db.recipes.toArray(),
    db.sessions.toArray(),
  ]);

  const { recipesToPut, sessionsToPut, report } = mergeImport({
    recipes: parsed.recipes,
    sessions: parsed.sessions,
    existingRecipes: allRecipes,
    existingSessionIds: new Set(allSessions.map((session) => session.id)),
  });

  await db.transaction('rw', db.recipes, db.sessions, async () => {
    if (recipesToPut.length > 0) {
      await db.recipes.bulkPut(recipesToPut);
    }

    if (sessionsToPut.length > 0) {
      await db.sessions.bulkPut(sessionsToPut);
    }
  });

  return report;
}
