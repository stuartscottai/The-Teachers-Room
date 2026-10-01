import { translateInterfaceText as ui, useInterfaceLanguage as useUiLanguage } from '../utils/interfaceLanguage';
import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Expand, X } from 'lucide-react';

const CreateButton = () => { useUiLanguage(); return (<Link to="/games?create=time-bomb" className="inline-block border border-brand-yellow bg-brand-yellow px-7 py-4 font-bold text-brand-dark transition-colors hover:bg-yellow-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700">{ui("Create a Time Bomb game")}</Link>); };

const Screenshot = ({ name, alt, title, children }: { name: string; alt: string; title: string; children: React.ReactNode }) => {
  useUiLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const src = `/assets/game-types/time-bomb/${name}.jpg`;
  const height = name === 'results' ? 700 : 900;
  return <figure className="min-w-0">
    <button type="button" onClick={() => dialog.current?.showModal()} aria-label={ui("Enlarge screenshot: {alt}", { "alt": (alt) })} className="group relative block w-full border border-slate-200 bg-white text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700">
      <img src={src} alt={alt} width="1440" height={height} loading="lazy" decoding="async" className="h-auto w-full" />
      <span className="absolute bottom-2 right-2 bg-slate-950/80 p-2 text-white group-hover:bg-sky-800"><Expand size={16} aria-hidden="true" /></span>
    </button>
    <figcaption className="mt-3 text-sm leading-relaxed text-slate-600"><strong className="mr-2 font-bold text-slate-900">{title}</strong>{children}</figcaption>
    <dialog ref={dialog} aria-label={alt} className="m-auto w-[96vw] max-w-6xl overflow-auto border-0 bg-slate-950 p-2 backdrop:bg-slate-950/80" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="flex justify-end pb-2"><button type="button" onClick={() => dialog.current?.close()} aria-label={ui("Close screenshot")} className="p-2 text-white hover:bg-white/20"><X size={22} /></button></div>
      <img src={src} alt={alt} width="1440" height={height} loading="lazy" className="h-auto w-full" />
    </dialog>
  </figure>;
};

export const TimeBombPage: React.FC = () => { useUiLanguage(); return (<div className="bg-sky-50 text-brand-dark">
  <section className="mx-auto max-w-[1400px] px-6 pb-10 pt-7 sm:px-10">
    <nav aria-label={ui("Breadcrumb")} className="flex gap-3 text-sm text-slate-600"><Link to="/games" className="underline-offset-4 hover:underline">{ui("Games")}</Link><span aria-hidden="true">/</span><span aria-current="page">{ui("Time Bomb")}</span></nav>
    <div className="mt-7 grid items-center gap-6 grid-rows-[minmax(539px,auto)_322px] min-[375px]:grid-rows-[minmax(462px,auto)_322px] sm:grid-rows-[minmax(385px,auto)_408px] lg:grid-cols-[0.7fr_1.3fr] lg:grid-rows-[518px] lg:gap-8">
      <div className="relative z-10 py-3">
        <h1 className="font-display text-[40px] font-black leading-none tracking-tight text-brand-dark sm:text-6xl lg:text-[64px]">{ui("Time Bomb.")}</h1>
        <p className="mt-6 max-w-sm text-lg leading-relaxed text-slate-700 sm:text-xl">{ui("The clock is ticking, and nobody wants to be left holding the bomb! Get your students thinking on their feet as they answer questions and pass it to the next team.")}</p>
        <div className="mt-8"><CreateButton /></div>
        <p className="mt-4 max-w-sm text-sm text-slate-600">{ui("From maths and science to history, languages and beyond, there’s room for whatever you teach.")}</p>
      </div>
      <figure className="grid h-full min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_32px]">
        <img src="/assets/game-types/time-bomb/hero-transparent.webp" alt={ui("3D illustration of the Time Bomb bursting apart in a splash of yellow slime")} width="1536" height="1024" loading="eager" decoding="async" className="h-full min-h-0 w-full object-contain" />
        <figcaption className="mt-3 text-center text-xs text-slate-500">{ui("3D illustration inspired by the Time Bomb game artwork.")}</figcaption>
      </figure>
    </div>
  </section>
  <section className="border-t-4 border-brand-yellow bg-white px-6 py-12 sm:px-10 lg:py-16" aria-labelledby="time-bomb-gameplay-heading">
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <h2 id="time-bomb-gameplay-heading" className="font-display text-3xl font-bold sm:text-4xl">{ui("Let’s play Time Bomb")}</h2>
        <p className="max-w-sm text-sm leading-relaxed text-slate-600">{ui("Gather your teams, start the countdown and see who can keep their cool.")}</p>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[1.45fr_1fr] lg:gap-10">
        <div>
          <Screenshot name="question" title={ui("Quick, can you answer this one?")} alt={ui("Time Bomb question with answer choices and a ticking countdown")}>{ui("The team holding the bomb answers the question on screen. Get it right and the bomb moves on to the next team, but the countdown keeps going.")}</Screenshot>
          <p className="mt-7 max-w-md text-base leading-relaxed text-slate-600">{ui("Choose questions your students can tackle fairly quickly, so everyone gets a turn. A few familiar questions are a great way to help them settle into the game before you add a challenge.")}</p>
        </div>
        <div className="grid gap-7">
          <Screenshot name="explosion" title={ui("Who is holding the bomb?")} alt={ui("Time Bomb explosion showing a team losing a life")}>{ui("A wrong answer takes ten seconds off the clock. When time runs out, the team holding the bomb loses a life. Take a breath, then get ready for the next round!")}</Screenshot>
          <Screenshot name="results" title={ui("Give your teams a cheer.")} alt={ui("Time Bomb podium showing Foxes, Owls and Bears in the final standings")}>{ui("Teams keep playing while they have lives left, with the last team standing taking the win. You can also end the game early when it is time to move on.")}</Screenshot>
        </div>
      </div>
    </div>
  </section>
  <section className="border-t border-sky-100 bg-sky-50 px-6 py-12 sm:px-10 lg:py-16">
    <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:gap-16">
      <div>
        <h2 className="font-display text-3xl font-bold">{ui("Make it your own")}</h2>
        <dl className="mt-6 space-y-5 text-sm leading-relaxed">
          <div><dt className="font-bold text-sky-800">{ui("Bring along your topic")}</dt><dd className="mt-1 text-slate-600">{ui("Try times tables, scientific facts, historical figures or anything your group has been learning. Write your own questions or ask AI for a draft, then make it your own.")}</dd></div>
          <div><dt className="font-bold text-sky-800">{ui("Play at your pace")}</dt><dd className="mt-1 text-slate-600">{ui("Choose the starting countdown and how many lives each team gets. You can pause during play whenever your students need a moment to talk something through.")}</dd></div>
          <div><dt className="font-bold text-sky-800">{ui("Choose how they answer")}</dt><dd className="mt-1 text-slate-600">{ui("Offer multiple-choice answers for a quick decision, or use open questions and let students say their answers aloud. You decide what works best for your group.")}</dd></div>
        </dl>
      </div>
      <div className="border-l-4 border-brand-yellow pl-6 sm:pl-8">
        <h2 className="font-display text-3xl font-bold">{ui("Where will you take it?")}</h2>
        <dl className="mt-6 space-y-5 text-sm leading-relaxed">
          <div><dt className="font-bold text-sky-800">{ui("Welcome everyone back")}</dt><dd className="mt-1 text-slate-600">{ui("Warm up with a few things your students already know. Short questions and a ticking clock can bring a little energy to the start of a lesson.")}</dd></div>
          <div><dt className="font-bold text-sky-800">{ui("Build confidence with practice")}</dt><dd className="mt-1 text-slate-600">{ui("Revisit facts, calculations or key words you have practised together. Keep the challenge within reach so students can enjoy putting what they know to use.")}</dd></div>
          <div><dt className="font-bold text-sky-800">{ui("Round off a topic")}</dt><dd className="mt-1 text-slate-600">{ui("Finish a topic with a lively team challenge. Afterwards, come back to any questions that caught people out and work through them together.")}</dd></div>
        </dl>
      </div>
    </div>
  </section>
  <section className="bg-white px-6 py-14 sm:px-10 lg:py-20">
    <div className="mx-auto max-w-6xl text-center">
      <div aria-hidden="true" className="mx-auto mb-6 h-1 w-12 bg-brand-yellow" />
      <h2 className="font-display text-3xl font-bold sm:text-4xl">{ui("What will your students play next?")}</h2>
      <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-600">{ui("Choose something you’re teaching and make it a game you can enjoy together.")}</p>
      <div className="mt-7"><CreateButton /></div>
    </div>
  </section>
</div>); };
