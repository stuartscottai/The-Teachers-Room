import { translateInterfaceText as ui, useInterfaceLanguage as useUiLanguage } from '../../../utils/interfaceLanguage';
import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Expand, X } from 'lucide-react';

export interface GameTypePageContent {
  slug: string; name: string; intro: string; note: string; heroAlt: string;
  galleryIntro: string; galleryNote: string;
  screenshots: { name: string; title: string; alt: string; text: string }[];
  features: [string, string][]; uses: [string, string][];
  closing: string; closingText: string;
}
const Screenshot = ({ slug, shot }: { slug: string; shot: GameTypePageContent['screenshots'][number] }) => {
  useUiLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const src = `/assets/game-types/${slug}/${shot.name}.jpg`;
  return <figure className="min-w-0">
    <button type="button" onClick={() => dialog.current?.showModal()} aria-label={ui("Enlarge screenshot: {shot.alt}", { "shot.alt": ui(shot.alt) })} className="group relative block w-full border border-slate-200 bg-white text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700">
      <img src={src} alt={ui(shot.alt)} width="1440" height="900" loading="lazy" decoding="async" className="h-auto w-full" />
      <span className="absolute bottom-2 right-2 bg-slate-950/80 p-2 text-white group-hover:bg-sky-800"><Expand size={16} aria-hidden="true" /></span>
    </button>
    <figcaption className="mt-3 text-sm leading-relaxed text-slate-600"><strong className="mr-2 font-bold text-slate-900">{ui(shot.title)}</strong>{ui(shot.text)}</figcaption>
    <dialog ref={dialog} aria-label={ui(shot.alt)} className="m-auto w-[96vw] max-w-6xl overflow-auto border-0 bg-slate-950 p-2 backdrop:bg-slate-950/80" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="flex justify-end pb-2"><button type="button" onClick={() => dialog.current?.close()} aria-label={ui("Close screenshot")} className="p-2 text-white hover:bg-white/20"><X size={22} /></button></div>
      <img src={src} alt={ui(shot.alt)} width="1440" height="900" loading="lazy" className="h-auto w-full" />
    </dialog>
  </figure>;
};
export const GameTypeLandingPage = ({ content: c }: { content: GameTypePageContent }) => {
  useUiLanguage();
  const create = <Link to={`/games?create=${c.slug}`} className="inline-block border border-brand-yellow bg-brand-yellow px-7 py-4 font-bold text-brand-dark transition-colors hover:bg-yellow-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700">{ui("Create a {game} game", {game: c.name})}</Link>;
  return <div className="bg-sky-50 text-brand-dark">
    <section className="mx-auto max-w-[1400px] px-6 pb-10 pt-7 sm:px-10">
      <nav aria-label={ui("Breadcrumb")} className="flex gap-3 text-sm text-slate-600"><Link to="/games" className="underline-offset-4 hover:underline">{ui("Games")}</Link><span aria-hidden="true">/</span><span aria-current="page">{c.name}</span></nav>
      <div className="mt-7 grid items-center gap-6 grid-rows-[minmax(539px,auto)_322px] min-[375px]:grid-rows-[minmax(462px,auto)_322px] sm:grid-rows-[minmax(385px,auto)_408px] lg:grid-cols-[0.7fr_1.3fr] lg:grid-rows-[518px] lg:gap-8">
        <div className="relative z-10 py-3">
          <h1 className="font-display text-[40px] font-black leading-none tracking-tight text-brand-dark sm:text-6xl lg:text-[64px]">{c.name}.</h1>
          <p className="mt-6 max-w-sm text-lg leading-relaxed text-slate-700 sm:text-xl">{ui(c.intro)}</p>
          <div className="mt-8">{create}</div>
          <p className="mt-4 max-w-sm text-sm text-slate-600">{ui(c.note)}</p>
        </div>
        <figure className="grid h-full min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_32px]">
          <img src={`/assets/game-types/${c.slug}/hero-transparent.webp`} alt={c.heroAlt} width="1536" height="1024" loading="eager" decoding="async" className="h-full min-h-0 w-full object-contain" />
          <figcaption className="mt-3 text-center text-xs text-slate-500">{ui("3D illustration based on the real {game} game.", {game: c.name})}</figcaption>
        </figure>
      </div>
    </section>
    <section className="border-t-4 border-brand-yellow bg-white px-6 py-12 sm:px-10 lg:py-16" aria-labelledby={`${c.slug}-gameplay-heading`}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <h2 id={`${c.slug}-gameplay-heading`} className="font-display text-3xl font-bold sm:text-4xl">{ui("Let’s play {game}", {game: c.name})}</h2>
          <p className="max-w-sm text-sm leading-relaxed text-slate-600">{ui(c.galleryIntro)}</p>
        </div>
        <div className="grid items-start gap-8 lg:grid-cols-[1.45fr_1fr] lg:gap-10">
          <div><Screenshot slug={c.slug} shot={c.screenshots[0]} /><p className="mt-7 max-w-md text-base leading-relaxed text-slate-600">{ui(c.galleryNote)}</p></div>
          <div className="grid gap-7">{c.screenshots.slice(1).map(shot => <Screenshot key={shot.name} slug={c.slug} shot={shot} />)}</div>
        </div>
      </div>
    </section>
    <section className="border-t border-sky-100 bg-sky-50 px-6 py-12 sm:px-10 lg:py-16">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:gap-16">
        <div><h2 className="font-display text-3xl font-bold">{ui("Make it your own")}</h2><dl className="mt-6 space-y-5 text-sm leading-relaxed">{c.features.map(([title, text]) => <div key={title}><dt className="font-bold text-sky-800">{ui(title)}</dt><dd className="mt-1 text-slate-600">{ui(text)}</dd></div>)}</dl></div>
        <div className="border-l-4 border-brand-yellow pl-6 sm:pl-8"><h2 className="font-display text-3xl font-bold">{ui("Where will you take it?")}</h2><dl className="mt-6 space-y-5 text-sm leading-relaxed">{c.uses.map(([title, text]) => <div key={title}><dt className="font-bold text-sky-800">{ui(title)}</dt><dd className="mt-1 text-slate-600">{ui(text)}</dd></div>)}</dl></div>
      </div>
    </section>
    <section className="bg-white px-6 py-14 sm:px-10 lg:py-20"><div className="mx-auto max-w-6xl text-center">
      <div aria-hidden="true" className="mx-auto mb-6 h-1 w-12 bg-brand-yellow" />
      <h2 className="font-display text-3xl font-bold sm:text-4xl">{ui(c.closing)}</h2><p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-600">{ui(c.closingText)}</p><div className="mt-7">{create}</div>
    </div></section>
  </div>;
};
