import { describe, expect, it } from 'vitest';
import type { CookSession, Recipe } from '@shared/schema';
import { buildExportBundle, mergeImport, parseExportBundle } from './backup';

const userRecipe: Recipe = {
  schemaVersion: 1,
  id: 'r_user',
  title: '我的菜',
  servings: 2,
  tags: [],
  prep: [],
  steps: [{ id: 's1', text: '炒', kind: 'timed', durationSec: 60 }],
  source: 'user',
  createdAt: 1,
  updatedAt: 10,
};

const builtinRecipe: Recipe = { ...userRecipe, id: 'r_builtin', source: 'builtin' };
const deletedRecipe: Recipe = { ...userRecipe, id: 'r_deleted', deletedAt: 20 };

const session: CookSession = {
  id: 'sess_1',
  recipeId: 'r_user',
  recipeUpdatedAt: 10,
  startedAt: 100,
  endedAt: 200,
  status: 'completed',
  steps: [{ stepId: 's1', plannedSec: 60, actualSec: 65, skipped: false }],
};

describe('buildExportBundle', () => {
  it('exports only user recipes and includes sessions', () => {
    const bundle = buildExportBundle([userRecipe, builtinRecipe, deletedRecipe], [session], 1234);

    expect(bundle.format).toBe('kaihuo.recipes');
    expect(bundle.version).toBe(1);
    expect(bundle.exportedAt).toBe(1234);
    expect(bundle.recipes.map((recipe) => recipe.id)).toEqual(['r_user']);
    expect(bundle.sessions).toHaveLength(1);
  });
});

describe('parseExportBundle', () => {
  it('accepts a generated bundle', () => {
    const bundle = buildExportBundle([userRecipe], [session], 1234);
    const parsed = parseExportBundle(JSON.stringify(bundle));

    expect(parsed.recipes).toHaveLength(1);
    expect(parsed.sessions).toHaveLength(1);
  });

  it('rejects malformed JSON', () => {
    expect(() => parseExportBundle('{oops')).toThrow('文件不是有效的 JSON');
  });

  it('rejects a foreign file', () => {
    expect(() => parseExportBundle(JSON.stringify({ hello: 'world' }))).toThrow(
      '这不是“开火”的备份文件',
    );
  });

  it('rejects a newer format version', () => {
    const bundle = { ...buildExportBundle([userRecipe], [], 1), version: 2 };
    expect(() => parseExportBundle(JSON.stringify(bundle))).toThrow('备份版本过新');
  });
});

describe('mergeImport', () => {
  const base = {
    sessions: [] as unknown[],
    existingRecipes: [] as Recipe[],
    existingSessionIds: new Set<string>(),
  };

  it('adds a new recipe', () => {
    const result = mergeImport({ ...base, recipes: [userRecipe] });

    expect(result.recipesToPut).toHaveLength(1);
    expect(result.report.recipesAdded).toBe(1);
  });

  it('updates a recipe when the import is newer', () => {
    const existing = { ...userRecipe, updatedAt: 5 };
    const result = mergeImport({ ...base, recipes: [userRecipe], existingRecipes: [existing] });

    expect(result.recipesToPut).toHaveLength(1);
    expect(result.report.recipesUpdated).toBe(1);
  });

  it('skips an older recipe', () => {
    const existing = { ...userRecipe, updatedAt: 99 };
    const result = mergeImport({ ...base, recipes: [userRecipe], existingRecipes: [existing] });

    expect(result.recipesToPut).toEqual([]);
    expect(result.report.recipesSkipped).toBe(1);
  });

  it('skips builtin, deleted and invalid recipes', () => {
    const result = mergeImport({
      ...base,
      recipes: [builtinRecipe, deletedRecipe, { id: 'broken' }],
    });

    expect(result.recipesToPut).toEqual([]);
    expect(result.report.recipesSkipped).toBe(3);
  });

  it('does not resurrect a locally deleted recipe', () => {
    const existing = { ...userRecipe, updatedAt: 1, deletedAt: 50 };
    const result = mergeImport({ ...base, recipes: [userRecipe], existingRecipes: [existing] });

    expect(result.recipesToPut).toEqual([]);
    expect(result.report.recipesSkipped).toBe(1);
  });

  it('adds new sessions and skips duplicates', () => {
    const result = mergeImport({
      ...base,
      recipes: [],
      sessions: [session, session],
    });

    expect(result.sessionsToPut).toHaveLength(1);
    expect(result.report.sessionsAdded).toBe(1);
    expect(result.report.sessionsSkipped).toBe(1);
  });
});
