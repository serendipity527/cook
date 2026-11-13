import { describe, expect, it } from 'vitest';
import { backupFilename } from './download';

describe('backupFilename', () => {
  it('uses the local date in YYYYMMDD form', () => {
    expect(backupFilename(new Date(2026, 10, 13))).toBe('kaihuo-backup-20261113.json');
  });
});
