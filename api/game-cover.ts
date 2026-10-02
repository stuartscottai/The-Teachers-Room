import { createClient } from '@supabase/supabase-js';
import { downloadPublicGameUpload } from '../server/publicGameCover.js';

// Only expose the cover of a currently public game. The asset bucket stays private.
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const id = String(req.query?.id || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return res.status(400).json({ error: 'Invalid game' });
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return res.status(503).json({ error: 'Cover storage is unavailable' });
  const client = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://xsefgwhywcuzfnawtyru.supabase.co', key,
    { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { data: game, error } = await client.from('saved_games').select('config,user_id').eq('id', id).eq('is_public', true).maybeSingle();
    if (error) return res.status(502).json({ error: 'Cover temporarily unavailable' });
    const cover = await downloadPublicGameUpload(client, game);
    if ('status' in cover) return res.status(cover.status).json({ error: cover.status === 415 ? 'Unsupported cover image' : 'Cover not found' });
    res.setHeader('Content-Type', cover.contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    return res.status(200).send(cover.bytes);
  } catch { return res.status(502).json({ error: 'Cover temporarily unavailable' }); }
}
