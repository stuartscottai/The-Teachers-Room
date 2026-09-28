// Preview missing/outdated covers: node scripts/backfill-game-covers.mjs --refresh-automatic
// Prepare a reviewable, resumable plan (AI + stock searches, no DB writes): add --plan
// Apply the prepared plan, preserving creator choices: add --apply
import { createClient } from '@supabase/supabase-js';
import { createServer, loadEnv } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const env = loadEnv('development', process.cwd(), '');
for (const [key, value] of Object.entries(env)) if (process.env[key] === undefined) process.env[key] = value;
const apply = process.argv.includes('--apply');
const prepare = apply || process.argv.includes('--plan');
const refreshAutomatic = process.argv.includes('--refresh-automatic');
const reselectPhotos = process.argv.includes('--reselect-photos');
const onlyGameId = process.argv.find(arg => arg.startsWith('--game-id='))?.slice('--game-id='.length);
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://xsefgwhywcuzfnawtyru.supabase.co';
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
const client = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const planPath = 'cover-preview.local/cover-refresh-plan.json';
try {
  const { getGameCoverQuery, selectGameCover } = await vite.ssrLoadModule('/utils/gameCover.ts');
  const { buildCoverBrief, coverSearchPlanParams, parseCoverSearchPlans, COVER_SELECTION_VERSION } = await vite.ssrLoadModule('/utils/gameCoverBrief.ts');
  const { createAiRuntime } = await vite.ssrLoadModule('/api/aiRuntime.ts');
  const { default: stockHandler } = await vite.ssrLoadModule('/api/stock-images.ts');
  const savedPlans = new Map();
  try {
    const saved = JSON.parse(await readFile(planPath, 'utf8'));
    if (saved.version === COVER_SELECTION_VERSION) for (const item of saved.games) savedPlans.set(item.id, item);
  } catch { /* First run. */ }
  const writePlan = async () => {
    await mkdir('cover-preview.local', { recursive: true });
    await writeFile(planPath, JSON.stringify({ version: COVER_SELECTION_VERSION, games: [...savedPlans.values()] }, null, 2));
  };
  const cache = new Map();
  const search = async query => {
    if (cache.has(query)) return cache.get(query);
    let status = 200, result;
    await stockHandler({ method: 'GET', headers: {}, query: { q: query, perPage: '40', strict: 'false' } }, {
      setHeader() {}, status(code) { status = code; return this; }, json(body) { result = body; return this; }, end() {},
    });
    if (status !== 200) throw new Error(`Image search failed (${status}); plan retained for resuming.`);
    cache.set(query, result);
    return result;
  };
  const usageCounts = new Map();
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from('saved_games').select('cover:config->coverImage').eq('is_public', true).order('id').range(offset, offset + 499);
    if (error) throw error;
    for (const row of data) if (row.cover?.stockId) usageCounts.set(row.cover.stockId, (usageCounts.get(row.cover.stockId) || 0) + 1);
    if (data.length < 500) break;
  }
  // Reserve already prepared choices as well, so a resumed run stays diverse.
  for (const plan of savedPlans.values()) if (plan.coverImage?.stockId) usageCounts.set(plan.coverImage.stockId, (usageCounts.get(plan.coverImage.stockId) || 0) + 1);
  let after = '00000000-0000-0000-0000-000000000000';
  let found = 0, changed = 0, skipped = 0, aiCalls = 0, totalTokens = 0;
  const ai = prepare ? createAiRuntime({ action: 'game-cover' }) : null;
  while (true) {
    const { data, error } = await client.from('saved_games')
      .select('id,title,config,questions,jeopardy_board,pub_quiz_rounds,created_at')
      .eq('is_public', true).gt('id', after).order('id').limit(25);
    if (error) throw error;
    if (!data.length) break;
    after = data[data.length - 1].id;
    const games = data.map(row => ({ ...row, config: row.config || {}, jeopardyBoard: row.jeopardy_board, pubQuizRounds: row.pub_quiz_rounds }))
      .filter(game => (!onlyGameId || game.id === onlyGameId) && (!game.config.coverImage || (refreshAutomatic && game.config.coverImage.selection === 'automatic' && ((game.config.coverImage.selectionVersion || 1) < COVER_SELECTION_VERSION || reselectPhotos))));
    found += games.length;
    if (!prepare) { for (const game of games) console.log(`${game.id}: ${getGameCoverQuery(game)}`); continue; }
    const needsPlan = games.filter(game => {
      const previous = savedPlans.get(game.id);
      return !previous || previous.createdAt !== game.created_at || previous.previousStockId !== (game.config.coverImage?.stockId || null);
    });
    for (let i = 0; i < needsPlan.length; i += 8) {
      const batch = needsPlan.slice(i, i + 8);
      const briefs = batch.map(buildCoverBrief);
      const response = await ai.generateContent(coverSearchPlanParams(briefs));
      aiCalls++;
      totalTokens += Number(response.usageMetadata?.totalTokenCount || 0);
      const themes = parseCoverSearchPlans(response.text || '', briefs);
      // A provider may truncate a batch. Retry only missing games individually.
      for (const brief of briefs.filter(b => !themes.some(p => p.key === b.key))) {
        const retry = await ai.generateContent(coverSearchPlanParams([brief]));
        aiCalls++;
        totalTokens += Number(retry.usageMetadata?.totalTokenCount || 0);
        themes.push(...parseCoverSearchPlans(retry.text || '', [brief]));
      }
      if (!briefs.every(b => themes.some(p => p.key === b.key))) throw new Error('Incomplete AI cover plan; earlier batches retained. Rerun to resume.');
      for (const game of batch) {
        const theme = themes.find(p => p.key === game.id);
        if (!theme) throw new Error('Missing game in AI cover plan.');
        const coverImage = await selectGameCover({ ...game, config: { ...game.config, coverImage: undefined } }, search,
          { queries: theme.queries, theme: theme.theme, usageCounts });
        if (!coverImage) { skipped++; continue; }
        usageCounts.set(coverImage.stockId, (usageCounts.get(coverImage.stockId) || 0) + 1);
        savedPlans.set(game.id, { id: game.id, title: game.title, createdAt: game.created_at,
          previousStockId: game.config.coverImage?.stockId || null, queries: theme.queries, coverImage });
        await writePlan();
      }
      console.log(`Prepared ${savedPlans.size} covers; ${aiCalls} AI batches this run.`);
    }
    if (reselectPhotos) {
      for (const game of games) {
        const plan = savedPlans.get(game.id);
        if (!plan) continue;
        const coverImage = await selectGameCover({ ...game, config: { ...game.config, coverImage: undefined } }, search,
          { queries: plan.queries, theme: plan.coverImage.visualTheme, usageCounts });
        if (!coverImage) continue;
        usageCounts.set(coverImage.stockId, (usageCounts.get(coverImage.stockId) || 0) + 1);
        savedPlans.set(game.id, { ...plan, coverImage });
        await writePlan();
      }
      console.log(`Reviewed photo selection for ${found} games.`);
    }
    if (!apply) continue;
    for (const game of games) {
      const plan = savedPlans.get(game.id);
      if (!plan || !game.created_at) { skipped++; continue; }
      const previousCover = game.config.coverImage;
      let update = client.from('saved_games').update({ config: { ...game.config, coverImage: plan.coverImage } })
        .eq('id', game.id).eq('is_public', true).eq('created_at', game.created_at);
      update = previousCover
        ? update.eq('config->coverImage->>selection', 'automatic').eq('config->coverImage->>stockId', previousCover.stockId)
        : update.is('config->coverImage', null);
      const { data: updated, error: updateError } = await update.select('id');
      if (updateError) throw updateError;
      if (updated.length) changed++; else skipped++;
    }
  }
  console.log(JSON.stringify({ mode: apply ? 'apply' : prepare ? 'plan' : 'preview', eligible: found, updated: changed, skipped,
    aiCalls, totalTokens, providerSearches: cache.size, planPath: prepare ? planPath : null }));
} finally { await vite.close(); }
