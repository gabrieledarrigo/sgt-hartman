import { Database } from 'bun:sqlite';
import { join } from 'node:path';

const DB_FILENAME = join(__dirname, '../../data/sgt.hartman.sqlite');

export const db = new Database(DB_FILENAME, {
  create: true,
  strict: true,
});
