import Dexie, { type EntityTable } from 'dexie';
import type { Asset, CookSession, Draft, Recipe } from '@shared/schema';

export interface MetaRow {
  key: string;
  value: unknown;
}

export const db = new Dexie('kaihuo') as Dexie & {
  recipes: EntityTable<Recipe, 'id'>;
  assets: EntityTable<Asset, 'id'>;
  sessions: EntityTable<CookSession, 'id'>;
  drafts: EntityTable<Draft, 'id'>;
  meta: EntityTable<MetaRow, 'key'>;
};

db.version(1).stores({
  recipes: 'id, updatedAt, title, source, deletedAt',
  assets: 'id, recipeId, kind',
  sessions: 'id, recipeId, startedAt, status',
  drafts: 'id, updatedAt',
  meta: 'key',
});
