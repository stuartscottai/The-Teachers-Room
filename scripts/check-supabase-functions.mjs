import { existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const functionsDirectory = fileURLToPath(new URL('../supabase/functions/', import.meta.url));
const entryPoints = readdirSync(functionsDirectory, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => join(functionsDirectory, entry.name, 'index.ts'))
  .filter(existsSync)
  .sort();

if (!entryPoints.length) throw new Error('No Supabase function entry points found.');

// Use the pinned local Deno wrapper on Windows and Linux. Checking resolves
// imports but never starts the functions or sends any emails.
const result = spawnSync(process.execPath, [
  require.resolve('deno/bin.cjs'), 'check',
  '--config', join(functionsDirectory, 'deno.json'),
  '--frozen-lockfile', ...entryPoints,
], { stdio: 'inherit' });

if (result.error) throw result.error;
process.exit(result.status ?? 1);
