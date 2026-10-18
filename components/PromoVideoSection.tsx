import React, { useRef, useState } from 'react';
import { Play, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { translateInterfaceText as ui, useInterfaceLanguage } from '../utils/interfaceLanguage';

export const PromoVideoSection: React.FC = () => {
  const { language } = useInterfaceLanguage();
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);

  const start = () => {
    setStarted(true);
    // Mount the source only after an explicit click; the homepage downloads no video upfront.
    requestAnimationFrame(() => {
      if (video.current) {
        video.current.volume = 0.65;
        void video.current.play().catch(() => video.current?.focus());
      }
    });
  };

  return (
    <section aria-labelledby="game-promo-title" className="relative bg-slate-50 px-4 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-sky-700">{ui('See the games in action')}</p>
          <h2 id="game-promo-title" className="font-display text-3xl font-bold text-slate-800 md:text-4xl">{ui('One classroom. So many ways to play.')}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">{ui('Watch 12 game modes turn everyday lessons into moments worth cheering for.')}</p>
        </div>
        <div className="relative isolate aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-xl md:rounded-3xl">
          <video ref={video} className="h-full w-full object-contain" controls={started} playsInline preload="none"
            poster="/assets/promo/directors-cut-poster.webp?v=5" aria-label={ui('The Teachers Room game modes promotional video')}
            onError={() => setFailed(true)}>
            {started && <source src="/assets/promo/classroom-games-directors-cut.mp4?v=5" type="video/mp4" />}
            {started && <track key={language} kind="captions" src={`/assets/promo/directors-cut-${language === 'es' ? 'es' : 'en'}.vtt?v=5`} srcLang={language === 'es' ? 'es' : 'en'} label={language === 'es' ? 'Español' : 'English'} />}
          </video>
          {!started && <button type="button" onClick={start} aria-label={ui('Play the game modes video with sound')}
            className="absolute inset-0 flex flex-col items-center justify-end gap-3 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent pb-5 text-white focus-visible:outline focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-yellow-300 sm:pb-10">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-yellow text-slate-900 shadow-lg transition-transform motion-safe:hover:scale-110 sm:h-20 sm:w-20"><Play className="ml-1 h-6 w-6 sm:h-8 sm:w-8" fill="currentColor" /></span>
            <span className="text-sm font-bold sm:text-lg">{ui('Watch the games in action')} <span className="font-normal opacity-80">· {ui('61 seconds')}</span></span>
          </button>}
          {failed && <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-center text-white">
            <p>{ui('The video could not load. Please try again.')}</p>
            <button type="button" className="rounded-full bg-brand-yellow px-5 py-2 font-bold text-slate-900" onClick={() => { setFailed(false); video.current?.load(); void video.current?.play().catch(() => {}); }}>{ui('Try again')}</button>
          </div>}
        </div>
        <div className="mt-6 flex justify-center sm:justify-end">
          <Link to="/games" className="inline-flex items-center gap-2 font-bold text-sky-700 hover:text-sky-900">{ui('Explore the games')}<ArrowRight size={18} /></Link>
        </div>
      </div>
    </section>
  );
};
