import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://xsefgwhywcuzfnawtyru.supabase.co';
const anonKey = process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzZWZnd2h5d2N1emZuYXd0eXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MzMxMDEsImV4cCI6MjA4MDEwOTEwMX0._ZxWGsoU-rN8Yuf_v_7zGrivk2GKgb6QHBbT3QgtrCk';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Cache-Control', 'private, no-store');

  const token = /^Bearer\s+(.+)$/i.exec(String(req.headers.authorization || ''))?.[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Authentication required' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return res.status(503).json({ error: 'AI activity is temporarily unavailable' });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const [countResult, latestResult] = await Promise.all([
    admin.from('generation_usage').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('status', 'success'),
    admin.from('generation_usage').select('created_at')
      .eq('user_id', user.id).eq('status', 'success')
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (countResult.error || latestResult.error) {
    console.error('Could not read AI generation activity', countResult.error || latestResult.error);
    return res.status(503).json({ error: 'AI activity is temporarily unavailable' });
  }

  return res.status(200).json({
    totalAiGenerations: countResult.count || 0,
    lastGeneratedAt: latestResult.data?.created_at || null,
  });
}
