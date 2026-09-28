import React, { useState } from 'react';
import { BookOpen, Sparkles } from 'lucide-react';
import type { GameCoverImage } from '../../types';
import { resolveGameImageUrl } from '../../utils/gameImage';
import { buildStockImageIdProxyPath } from '../../utils/stockImageUrl';

export const GameCover: React.FC<{ cover?: GameCoverImage; title: string; publicGameId?: string; fallbackImage?: string; priority?: boolean; className?: string }> = ({ cover, title, publicGameId, fallbackImage, priority = false, className = '' }) => {
  const [failedUrl, setFailedUrl] = useState('');
  const [failedBackup, setFailedBackup] = useState('');
  const uploadedPublicCover = publicGameId && cover?.storagePath && cover.source === 'upload';
  const primary = uploadedPublicCover
    ? `/api/game-cover?id=${encodeURIComponent(publicGameId)}&v=${encodeURIComponent(cover.storagePath!)}`
    : resolveGameImageUrl(cover?.provider === 'pixabay' ? cover.thumbUrl || cover.url : cover?.url || cover?.thumbUrl);
  const backup = cover?.stockId ? buildStockImageIdProxyPath(cover.stockId) : uploadedPublicCover ? resolveGameImageUrl(cover?.url) : '';
  const src = primary && failedUrl !== primary ? primary : backup && failedBackup !== backup ? backup : '';
  return <div className={`relative isolate overflow-hidden bg-slate-100 ${className}`}>
    {!src && !fallbackImage && <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-sky-100 via-indigo-100 to-amber-100">
      <div className="absolute -right-6 -top-16 h-56 w-56 rounded-full bg-white/40" />
      <div className="absolute -bottom-16 left-8 h-40 w-40 rounded-full bg-sky-300/25" />
      <BookOpen className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 -rotate-12 text-indigo-400" strokeWidth={1.2} />
      <Sparkles className="absolute right-[28%] top-[25%] h-7 w-7 text-amber-500" />
    </div>}
    {!src && fallbackImage && <img src={fallbackImage} alt="" aria-hidden="true" loading="lazy" decoding="async"
      className="absolute inset-0 h-full w-full object-cover" />}
    {src && <img src={src} alt={cover?.alt || `Cover for ${title}`} loading={priority ? 'eager' : 'lazy'} decoding="async"
      className="absolute inset-0 h-full w-full object-cover"
      draggable={false}
      style={{ objectPosition: `${cover?.positionX ?? 50}% ${cover?.positionY ?? 50}%`,
        transformOrigin: `${cover?.positionX ?? 50}% ${cover?.positionY ?? 50}%`,
        transform: `scale(${Math.min(4, Math.max(1, cover?.zoom || 1))})` }}
      onError={() => src === primary ? setFailedUrl(src) : setFailedBackup(src)} />}
  </div>;
};

export const CoverCredit: React.FC<{ cover?: GameCoverImage }> = ({ cover }) => {
  if (cover?.source !== 'stock' || !cover.provider) return null;
  const provider = cover.provider === 'pexels' ? 'Pexels' : 'Pixabay';
  const href = cover.provider === 'pexels' ? 'https://www.pexels.com' : 'https://pixabay.com';
  return <a href={href} target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-500 hover:text-slate-700 hover:underline">
    Photo from {provider}
  </a>;
};
