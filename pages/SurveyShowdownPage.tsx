import { translateInterfaceText as ui, useInterfaceLanguage as useUiLanguage } from '../utils/interfaceLanguage';
import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Expand, X } from 'lucide-react';

const CreateButton = () => { useUiLanguage(); return (<Link to="/games?create=survey-showdown" className="inline-block border border-brand-yellow bg-brand-yellow px-7 py-4 font-bold text-brand-dark transition-colors hover:bg-yellow-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700">{ui("Create a Survey Showdown game")}</Link>); };

const Screenshot = ({ name, alt, title, children }: { name: string; alt: string; title: string; children: React.ReactNode }) => {
  useUiLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const src = `/assets/game-types/survey-showdown/${name}.jpg`;
  const height = 900;
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

export const SurveyShowdownPage: React.FC = () => { useUiLanguage(); return (<div className="bg-sky-50 text-brand-dark">
  <section className="mx-auto max-w-[1400px] px-6 pb-10 pt-7 sm:px-10">
    <nav aria-label={ui("Breadcrumb")} className="flex gap-3 text-sm text-slate-600"><Link to="/games" className="underline-offset-4 hover:underline">{ui("Games")}</Link><span aria-hidden="true">/</span><span aria-current="page">{ui("Survey Showdown")}</span></nav>
    <div className="mt-7 grid items-center gap-6 grid-rows-[minmax(539px,auto)_322px] min-[375px]:grid-rows-[minmax(462px,auto)_322px] sm:grid-rows-[minmax(385px,auto)_408px] lg:grid-cols-[0.7fr_1.3fr] lg:grid-rows-[518px] lg:gap-8">
      <div className="relative z-10 py-3">
        <h1 className="font-display text-[40px] font-black leading-none tracking-tight text-brand-dark sm:text-6xl lg:text-[64px]">{ui("Survey Showdown.")}</h1>
        <p className="mt-6 max-w-sm text-lg leading-relaxed text-slate-700 sm:text-xl">{ui("What do you think is hiding on the board? In Survey Showdown, teams take turns guessing answers, revealing tiles and collecting points. Every new guess gives the class something to talk about.")}</p>
        <div className="mt-8"><CreateButton /></div>
        <p className="mt-4 max-w-sm text-sm text-slate-600">{ui("Bring your teams, a shared screen and a topic they know. You enter their guesses as they play.")}</p>
      </div>
      <figure className="grid h-full min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_32px]">
        <img src="/assets/game-types/survey-showdown/hero-exploded.webp" alt={ui("Survey Showdown blue and gold answer board with Paper and Cardboard tiles bursting forward")} width="1587" height="991" loading="eager" decoding="async" className="h-full min-h-0 w-full object-contain" />
        <figcaption className="mt-3 text-center text-xs text-slate-500">{ui("3D illustration based on the real Survey Showdown screen.")}</figcaption>
      </figure>
    </div>
  </section>
  <section className="border-t-4 border-brand-yellow bg-white px-6 py-12 sm:px-10 lg:py-16" aria-labelledby="survey-showdown-gameplay-heading">
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <h2 id="survey-showdown-gameplay-heading" className="font-display text-3xl font-bold sm:text-4xl">{ui("Let’s play Survey Showdown")}</h2>
        <p className="max-w-sm text-sm leading-relaxed text-slate-600">{ui("Start with one question and see how many hidden answers your teams can uncover.")}</p>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[1.45fr_1fr] lg:gap-10">
        <div>
          <Screenshot name="countries-answers" title={ui("Is it on the board?")} alt={ui("Survey Showdown geography question with five European countries revealed")}>{ui("Enter a team's guess and see whether it matches a hidden answer. A match reveals the tile and adds its points to that team's score, then the turn moves on.")}</Screenshot>
          <p className="mt-7 max-w-md text-base leading-relaxed text-slate-600">{ui("There can be plenty of sensible ideas beyond the answers you prepared. Use those surprises to ask why students chose them and widen the conversation.")}</p>
        </div>
        <div className="grid gap-7">
          <Screenshot name="wrong-answer" title={ui("Not on the board this time!")} alt={ui("Survey Showdown red X appearing after an incorrect guess")}>{ui("A guess that does not match brings up the red X and earns a strike. The turn passes to the next team; three strikes put a team out for the rest of the round.")}</Screenshot>
          <Screenshot name="results" title={ui("Celebrate the guesses that paid off.")} alt={ui("Survey Showdown final podium with Foxes and Owls")}>{ui("Keep uncovering answers and collecting points across your rounds. Finish with a cheer for your teams and another look at the answers that surprised them.")}</Screenshot>
        </div>
      </div>
    </div>
  </section>
  <section className="border-t border-sky-100 bg-sky-50 px-6 py-12 sm:px-10 lg:py-16">
    <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:gap-16">
      <div>
        <h2 className="font-display text-3xl font-bold">{ui("Make it your own")}</h2>
        <dl className="mt-6 space-y-5 text-sm leading-relaxed">
          <div><dt className="font-bold text-sky-800">{ui("Choose a question with possibilities")}</dt><dd className="mt-1 text-slate-600">{ui("Try materials people recycle, animals in a habitat or things found in an ancient city. A question with several possible answers gives teams room to think.")}</dd></div>
          <div><dt className="font-bold text-sky-800">{ui("Make the answer list yours")}</dt><dd className="mt-1 text-slate-600">{ui("Write your own answers and point values, or ask AI for a draft and check it before playing. These are your game's answers and scores; they do not need to come from a real survey.")}</dd></div>
          <div><dt className="font-bold text-sky-800">{ui("Keep everyone involved")}</dt><dd className="mt-1 text-slate-600">{ui("Let teammates compare ideas before you enter a guess. Turns move between teams, so everyone has a chance to help uncover the board.")}</dd></div>
        </dl>
      </div>
      <div className="border-l-4 border-brand-yellow pl-6 sm:pl-8">
        <h2 className="font-display text-3xl font-bold">{ui("Where will you take it?")}</h2>
        <dl className="mt-6 space-y-5 text-sm leading-relaxed">
          <div><dt className="font-bold text-sky-800">{ui("Get a topic talking")}</dt><dd className="mt-1 text-slate-600">{ui("Start with something familiar and hear what comes to mind. The guesses can help bring earlier learning back into the room.")}</dd></div>
          <div><dt className="font-bold text-sky-800">{ui("Practise making connections")}</dt><dd className="mt-1 text-slate-600">{ui("Ask teams to explain how their answer fits the question. It is a chance to sort ideas into categories and listen to different ways of thinking.")}</dd></div>
          <div><dt className="font-bold text-sky-800">{ui("Round off a lesson together")}</dt><dd className="mt-1 text-slate-600">{ui("Turn key ideas from your lesson into a final guessing challenge. Reveal what is left at the end of the round and talk through anything your class missed.")}</dd></div>
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
