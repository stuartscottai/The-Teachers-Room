#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const requireText = (content, value, message) => {
  if (!content.includes(value)) failures.push(message);
};

const liveSchema = read('supabase/live_quiz_challenge.sql');
const hardening = read('supabase/gdpr_hardening.sql');
const retention = read('supabase/gdpr_retention.sql');
const privacyPage = read('pages/InfoPages.tsx');
const joinPage = read('pages/LiveQuizJoin.tsx');
const studentGamePage = read('pages/StudentGame.tsx');
const loginModal = read('components/LoginModal.tsx');

if (/create policy live_quiz_(?:sessions|participants).*?[\s\S]{0,180}?using\s*\(true\)/i.test(liveSchema)) {
  failures.push('The base live-quiz schema must not allow unrestricted session or participant reads.');
}
requireText(hardening, 'get_live_quiz_student_session', 'The student-session privacy function is missing.');
requireText(hardening, 'list_live_quiz_own_submissions', 'Student submissions are not restricted to the current participant.');
requireText(hardening, 'get_student_game_share', 'Take-home QR shares are not restricted to a single link ID.');
requireText(retention, "interval '24 hours'", 'The 24-hour live-quiz retention rule is missing.');
requireText(retention, "interval '12 months'", 'The AI usage retention rule is missing.');
requireText(joinPage, "uses your nickname and answers to run this quiz", 'The short student join privacy notice is missing.');
requireText(joinPage, 'href="/privacy"', 'The student join privacy link is missing.');
requireText(privacyPage, 'after they reach 24 hours old', 'The live-quiz retention notice is missing from the Privacy Policy.');
requireText(studentGamePage, 'stay on this device and are not sent to your teacher', 'The take-home practice privacy notice is missing.');
requireText(studentGamePage, 'href="/privacy"', 'The take-home practice privacy link is missing.');
requireText(privacyPage, 'Take-home student practice', 'Take-home practice handling is missing from the Privacy Policy.');
requireText(privacyPage, '<strong>Stuart Scott</strong>', 'The data controller identity is missing from the Privacy Policy.');
requireText(privacyPage, 'mailto:stuartscottai@gmail.com', 'The privacy contact email is missing.');
requireText(loginModal, 'We use your name and email', 'The signup privacy notice is missing.');
requireText(privacyPage, 'Cloudflare Turnstile', 'Cloudflare Turnstile is missing from the Privacy Policy.');
requireText(privacyPage, 'Vercel provides website hosting', 'Vercel is missing from the Privacy Policy.');

if (failures.length) {
  console.error(`Privacy validation failed with ${failures.length} problem(s):`);
  failures.forEach((message) => console.error(`- ${message}`));
  process.exitCode = 1;
} else {
  console.log('Privacy validation passed.');
}
