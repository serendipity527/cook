import { beforeEach, describe, expect, it } from 'vitest';
import type { CookSession, Recipe } from '@shared/schema';
import { builtinRecipes } from './builtin';
import { db } from './db';
import {
  deleteRecipe,
  duplicateRecipe,
  exportData,
  forkBuiltin,
  getRecipe,
  importData,
  listAllRecipes,
  listSessions,
  restoreRecipe,
  saveRecipe,
  saveSession,
} from './repo';

const firstBuiltin = builtinRecipes[0]!;

const userRecipe: Recipe = {
  ...firstBuiltin,
  id: 'r_user_1',
  title: '我的番茄炒蛋',
  source: 'user',
  createdAt: 10,
  updatedAt: 10,
};

const completedSession: CookSession = {
  id: 'sess_1',
  recipeId: 'r_user_1',
  recipeUpdatedAt: 10,
  startedAt: 100,
  endedAt: 200,
  status: 'completed',
  steps: [{ stepId: 's1', plannedSec: 30, actualSec: 35, skipped: false }],
};

beforeEach(async () => {
  await db.recipes.clear();
  await db.sessions.clear();
});

describe('recipe repository', () => {
  it('lists builtin recipes even when the user store is empty', async () => {
    const recipes = await listAllRecipes();
    expect(recipes).toHaveLength(builtinRecipes.length);
  });

  it('saves a valid user recipe and lists it', async () => {
    await saveRecipe(userRecipe);

    const recipes = await listAllRecipes();
    expect(recipes).toHaveLength(builtinRecipes.length + 1);
    expect(recipes.some((recipe) => recipe.id === userRecipe.id)).toBe(true);
  });

  it('rejects an invalid recipe without writing it', async () => {
    await expect(saveRecipe({ ...userRecipe, steps: [] })).rejects.toThrow();
    expect(await db.recipes.get(userRecipe.id)).toBeUndefined();
  });

  it('reads builtin and user recipes by id', async () => {
    await saveRecipe(userRecipe);

    expect((await getRecipe(firstBuiltin.id))?.source).toBe('builtin');
    expect((await getRecipe(userRecipe.id))?.source).toBe('user');
    expect(await getRecipe('missing')).toBeUndefined();
  });

  it('soft deletes a user recipe', async () => {
    await saveRecipe(userRecipe);
    await deleteRecipe(userRecipe.id);

    expect(await getRecipe(userRecipe.id)).toBeUndefined();
    const recipes = await listAllRecipes();
    expect(recipes.some((recipe) => recipe.id === userRecipe.id)).toBe(false);
  });

  it('forks a builtin recipe into a user copy', async () => {
    const copy = await forkBuiltin(firstBuiltin.id);

    expect(copy.id).not.toBe(firstBuiltin.id);
    expect(copy.source).toBe('user');
    expect(copy.title).toBe(firstBuiltin.title);
    expect(await getRecipe(firstBuiltin.id)).toBeDefined();
    expect(await db.recipes.get(copy.id)).toBeDefined();
  });

  it('restores a soft-deleted recipe', async () => {
    await saveRecipe(userRecipe);
    await deleteRecipe(userRecipe.id);

    const restored = await restoreRecipe(userRecipe.id);

    expect(restored?.id).toBe(userRecipe.id);
    expect(restored?.deletedAt).toBeUndefined();
    expect((await getRecipe(userRecipe.id))?.title).toBe(userRecipe.title);
    expect(await db.recipes.get(userRecipe.id)).toMatchObject({ id: userRecipe.id });
  });

  it('returns undefined when restoring a missing recipe', async () => {
    expect(await restoreRecipe('missing')).toBeUndefined();
  });

  it('duplicates a user recipe without touching the original', async () => {
    await saveRecipe(userRecipe);

    const copy = await duplicateRecipe(userRecipe.id);

    expect(copy.id).not.toBe(userRecipe.id);
    expect(copy.source).toBe('user');
    expect(copy.title).toBe('我的番茄炒蛋 副本');
    expect((await getRecipe(userRecipe.id))?.title).toBe(userRecipe.title);
    expect(await getRecipe(copy.id)).toBeDefined();
  });
});

describe('session repository', () => {
  it('stores and reads a completed session', async () => {
    await saveSession(completedSession);

    expect(await listSessions()).toHaveLength(1);
    expect((await db.sessions.get('sess_1'))?.status).toBe('completed');
  });

  it('rejects an invalid session', async () => {
    await expect(
      saveSession({ ...completedSession, id: 'bad', status: 'paused' as never }),
    ).rejects.toThrow();
  });
});

describe('backup repository', () => {
  it('round-trips user recipes and sessions', async () => {
    await saveRecipe(userRecipe);
    await saveSession(completedSession);

    const bundle = await exportData(777);
    expect(bundle.recipes.map((recipe) => recipe.id)).toEqual([userRecipe.id]);

    await db.recipes.clear();
    await db.sessions.clear();

    const report = await importData(JSON.stringify(bundle));
    expect(report.recipesAdded).toBe(1);
    expect(report.sessionsAdded).toBe(1);
    expect((await getRecipe(userRecipe.id))?.title).toBe(userRecipe.title);
    expect(await listSessions()).toHaveLength(1);
  });

  it('is idempotent when the same backup is imported twice', async () => {
    await saveRecipe(userRecipe);
    await saveSession(completedSession);
    const text = JSON.stringify(await exportData(777));

    await db.recipes.clear();
    await db.sessions.clear();

    await importData(text);
    const second = await importData(text);

    expect(second.recipesAdded).toBe(0);
    expect(second.recipesSkipped).toBe(1);
    expect(second.sessionsAdded).toBe(0);
    expect(second.sessionsSkipped).toBe(1);
    expect(await listSessions()).toHaveLength(1);
  });

  it('rejects a file that is not a backup', async () => {
    await expect(importData('{"hello":"world"}')).rejects.toThrow('这不是“开火”的备份文件');
  });
});
