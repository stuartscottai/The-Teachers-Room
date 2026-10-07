import { translateInterfaceText as ui, useInterfaceLanguage as useUiLanguage } from '../../utils/interfaceLanguage';
import React, { useEffect, useRef, useState } from 'react';
import type { GameCoverImage, GeneratedGame } from '../../types';
import { ensureGameCover } from '../../services/gameCoverService';
import { getGameCoverQuery, stockImageToCover } from '../../utils/gameCover';
import { optimizeImageForUpload } from '../../utils/imageOptimize';
import { uploadGameAsset } from '../../utils/gameAssetStorage';
import { GameCover, CoverCredit } from '../shared/GameCover';
import { InteractiveGameCover } from './InteractiveGameCover';
import { StockImagePicker } from '../shared/StockImagePicker';

export const GameCoverEditor: React.FC<{
  game: GeneratedGame; userId?: string; disabled?: boolean; compact?: boolean;
  onChange: (cover: GameCoverImage, automatic?: boolean) => void;
  onBusyChange: (busy: boolean) => void;
}> = ({ game, userId, disabled, compact = false, onChange, onBusyChange }) => {
  useUiLanguage();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const revision = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const cover = game.config.coverImage;

  useEffect(() => {
    if (game.config.coverImage) return;
    let cancelled = false;
    const version = revision.current;
    setBusy(true);
    ensureGameCover(game).then(image => {
      if (cancelled || version !== revision.current) return;
      if (image) onChangeRef.current(image, true);
      else setMessage(ui("No automatic cover is available. You can choose or upload one."));
    }).finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
    // Select once on opening a game. Later title edits must not overwrite a cover.
  }, [game.id]);

  const upload = async (file?: File) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 10 * 1024 * 1024) {
      setMessage(ui("Choose a JPG, PNG or WebP image smaller than 10 MB.")); return;
    }
    revision.current += 1;
    setBusy(true); onBusyChange(true); setMessage('');
    try {
      const optimized = await optimizeImageForUpload(file, { maxDimension: 1200, quality: 0.82 });
      let image: GameCoverImage;
      if (userId) {
        const uploaded = await uploadGameAsset({ userId, blob: optimized.blob, contentType: optimized.contentType,
          extension: optimized.extension, kind: 'game-cover', gameId: game.id });
        image = { url: uploaded.signedUrl, storagePath: uploaded.path, source: 'upload', selection: 'creator', get alt() { return ui("Cover for {game.title}", { "game.title": (game.title) }); } };
      } else {
        const url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject;
          reader.readAsDataURL(optimized.blob);
        });
        image = { url, source: 'upload', selection: 'creator', get alt() { return ui("Cover for {game.title}", { "game.title": (game.title) }); } };
      }
      onChange(image); setPickerOpen(false);
    } catch { setMessage(ui("The cover could not be uploaded. Please try again.")); }
    finally { setBusy(false); onBusyChange(false); if (input.current) input.current.value = ''; }
  };

  const controls = <div className="p-4">
    <div className="flex flex-col gap-5 sm:flex-row">
      <div className="w-full shrink-0 sm:w-64">
        <InteractiveGameCover cover={cover} title={game.title} disabled={busy || disabled} onChange={onChange} />
        <CoverCredit cover={cover} />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-bold text-slate-800">{ui("Game cover")}</h2>
        <p className="mt-1 text-sm text-slate-500">{ui("The image teachers see in the community. Your question images stay separate.")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={busy || disabled} onClick={() => setPickerOpen(true)} className="rounded-lg bg-sky-50 px-3 py-2 text-sm font-bold text-sky-700 disabled:opacity-50">{ui("Choose another")}</button>
          <button type="button" disabled={busy || disabled} onClick={() => input.current?.click()} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 disabled:opacity-50">{ui("Upload image")}</button>
        </div>
        <p role="status" className="mt-2 text-xs text-slate-500">{busy ? ui("Preparing your cover…") : message || (cover?.selection === 'automatic' ? ui("Automatically selected for this game. Change it whenever you like.") : ui("Save the game to keep your cover changes."))}</p>

      </div>
    </div>
  </div>;
  return <section className={compact ? 'mb-4' : 'mb-6 rounded-2xl border border-slate-200 bg-white'} aria-label={ui("Game cover")}>
    {compact ? <details className="workspace-cover-compact rounded-xl border border-slate-200 bg-white">
      <summary>
        <GameCover cover={cover} title={game.title} className="workspace-cover-thumbnail h-10 w-16 rounded-md" />
        <span>{ui("Game cover")}</span><span className="workspace-cover-description font-normal text-slate-500 hidden sm:inline">{ui("The image teachers see in the library")}</span>
        <span className="ml-auto text-sky-700">{ui("Change cover")}</span>
      </summary>
      {controls}
    </details> : controls}
    <input ref={input} type="file" aria-label={ui("Upload game cover")} accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => void upload(event.target.files?.[0])} />
    <StockImagePicker isOpen={pickerOpen} initialQuery={getGameCoverQuery(game)} mode="single" onClose={() => setPickerOpen(false)}
      onUpload={() => input.current?.click()} onConfirm={items => {
        const item = items[0]; if (!item) return;
        revision.current += 1;
        onChange(stockImageToCover({ ...item, alt: item.label }, item.searchQuery || getGameCoverQuery(game), 'creator'));
        setMessage(''); setPickerOpen(false);
      }} />
  </section>;
};
