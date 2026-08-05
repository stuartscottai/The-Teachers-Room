#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'services', 'supabase.ts'), 'utf8');
const url = process.env.VITE_SUPABASE_URL || source.match(/https:\/\/[a-z]+\.supabase\.co/)?.[0];
const key = process.env.VITE_SUPABASE_ANON_KEY || source.match(/'(eyJhbGciOiJIUzI1Ni[^']+)'/)?.[1];

if (!url || !key) throw new Error('The public Supabase configuration could not be found.');

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const failures = [];

for (const table of ['live_quiz_sessions', 'live_quiz_participants', 'live_quiz_submissions', 'student_game_shares']) {
  const { data, error } = await client.from(table).select('id').limit(1);
  if (!error && Array.isArray(data) && data.length > 0) {
    failures.push(`Anonymous direct access can still retrieve rows from ${table}.`);
  }
}

const functionChecks = [
  ['get_live_quiz_session_by_code', { p_join_code: '__PRIVACY_CHECK__' }],
  [
    'get_live_quiz_student_session',
    {
      p_session_id: '00000000-0000-0000-0000-000000000000',
      p_participant_id: '00000000-0000-0000-0000-000000000000',
    },
  ],
  [
    'list_live_quiz_own_submissions',
    {
      p_session_id: '00000000-0000-0000-0000-000000000000',
      p_participant_id: '00000000-0000-0000-0000-000000000000',
    },
  ],
  ['get_student_game_share', { p_share_id: '00000000-0000-0000-0000-000000000000' }],
];

for (const [name, args] of functionChecks) {
  const { error } = await client.rpc(name, args);
  const missing = String(error?.code || '') === 'PGRST202' || String(error?.message || '').includes('Could not find the function');
  if (missing) failures.push(`The protected function ${name} is not installed.`);
}

if (failures.length) {
  console.error(`Production live-quiz privacy verification failed with ${failures.length} problem(s):`);
  failures.forEach((message) => console.error(`- ${message}`));
  process.exitCode = 1;
} else {
  console.log('Production student-access privacy verification passed. Anonymous table reads are blocked.');
}
