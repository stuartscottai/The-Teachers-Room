import type { SupabaseClient } from '@supabase/supabase-js';

type PublicGame = { user_id: string; config: { coverImage?: { source?: string; storagePath?: string } } };
type CoverResult = { bytes: Buffer; contentType: string } | { status: number };

// Shared by the library cover endpoint and social previews. Storage stays private.
export const downloadPublicGameUpload = async (client: SupabaseClient, game: PublicGame): Promise<CoverResult> => {
  const cover = game?.config?.coverImage;
  const path = cover?.storagePath;
  const pathMatch = typeof path === 'string' ? path.match(/^games\/([^/]+)\/[^/]+\/game-cover-[^/]+\.(png|jpe?g|webp)$/i) : null;
  if (cover?.source !== 'upload' || !pathMatch || path!.includes('..')) return { status: 404 };
  // Copies can use an original cover only while that original is public.
  if (pathMatch[1] !== game.user_id) {
    const { data: original, error } = await client.from('saved_games').select('id')
      .eq('user_id', pathMatch[1]).eq('is_public', true).eq('config->coverImage->>storagePath', path).limit(1);
    if (error || !original?.length) return { status: 404 };
  }
  const { data, error } = await client.storage.from('worksheet-assets').download(path!);
  if (error || !data) return { status: 404 };
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(data.type) || data.size > 10 * 1024 * 1024) {
    return { status: 415 };
  }
  return { bytes: Buffer.from(await data.arrayBuffer()), contentType: data.type };
};
