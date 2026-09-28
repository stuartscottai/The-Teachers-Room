import { createClient } from '@supabase/supabase-js';

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
    const cover = game?.config?.coverImage;
    const path = cover?.storagePath;
    const pathMatch = typeof path === 'string' ? path.match(/^games\/([^/]+)\/[^/]+\/game-cover-[^/]+\.(png|jpe?g|webp)$/i) : null;
    if (cover?.source !== 'upload' || !pathMatch || path.includes('..')) {
      return res.status(404).json({ error: 'Cover not found' });
    }
    // A copied game may refer to its original public cover. Never let a
    // creator's editable config turn this endpoint into access to another
    // teacher's private files.
    if (pathMatch[1] !== game.user_id) {
      const { data: original, error: originalError } = await client.from('saved_games').select('id')
        .eq('user_id', pathMatch[1]).eq('is_public', true).eq('config->coverImage->>storagePath', path).limit(1);
      if (originalError || !original?.length) return res.status(404).json({ error: 'Cover not found' });
    }
    const { data, error: downloadError } = await client.storage.from('worksheet-assets').download(path);
    if (downloadError || !data) return res.status(404).json({ error: 'Cover not found' });
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(data.type) || data.size > 10 * 1024 * 1024) {
      return res.status(415).json({ error: 'Unsupported cover image' });
    }
    res.setHeader('Content-Type', data.type);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    return res.status(200).send(Buffer.from(await data.arrayBuffer()));
  } catch { return res.status(502).json({ error: 'Cover temporarily unavailable' }); }
}
