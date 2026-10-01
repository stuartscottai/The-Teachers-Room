import { translateInterfaceText as ui, useInterfaceLanguage as useUiLanguage } from '../utils/interfaceLanguage';
import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Expand, X } from 'lucide-react';

const CreateButton = () => { useUiLanguage(); return (<Link to="/games?create=jeopardy" className="inline-block border border-brand-yellow bg-brand-yellow px-7 py-4 font-bold text-brand-dark transition-colors hover:bg-yellow-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700">{ui("Create a Jeopardy game")}</Link>); };

const Screenshot = ({ name, alt, title, children }: { name: string; alt: string; title: string; children: React.ReactNode }) => {
  useUiLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const src = `/assets/game-types/jeopardy/${name}.jpg`;
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

export const JeopardyPage: React.FC = () => { useUiLanguage(); return (<div className="bg-sky-50 text-brand-dark">
  <section className="mx-auto max-w-[1400px] px-6 pb-10 pt-7 sm:px-10">
    <nav aria-label={ui("Breadcrumb")} className="flex gap-3 text-sm text-slate-600"><Link to="/games" className="underline-offset-4 hover:underline">{ui("Games")}</Link><span aria-hidden="true">/</span><span aria-current="page">{ui("Jeopardy")}</span></nav>
    <div className="mt-7 grid items-center gap-6 grid-rows-[minmax(539px,auto)_322px] min-[375px]:grid-rows-[minmax(462px,auto)_322px] sm:grid-rows-[minmax(385px,auto)_408px] lg:grid-cols-[0.7fr_1.3fr] lg:grid-rows-[518px] lg:gap-8">
      <div className="relative z-10 py-3">
        <h1 className="font-display text-[40px] font-black leading-none tracking-tight text-brand-dark sm:text-6xl lg:text-[64px]">{ui("Jeopardy.")}</h1>
        <p className="mt-6 max-w-sm text-lg leading-relaxed text-slate-700 sm:text-xl">{ui("A favourite topic or a bigger challenge? With Jeopardy, your students choose a category and a point value, then put their heads together to earn points for their team.")}</p>
        <div className="mt-8"><CreateButton /></div>
        <p className="mt-4 max-w-sm text-sm text-slate-600">{ui("From maths and science to history, languages and beyond, there’s room for whatever you teach.")}</p>
      </div>
      <figure className="grid h-full min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_32px]">
        <img src="/assets/game-types/jeopardy/hero-transparent.webp" alt={ui("Head-on 3D illustration of the Jeopardy board, with category and point tiles projecting towards the viewer")} width="1587" height="991" loading="eager" decoding="async" className="h-full min-h-0 w-full object-contain" />
        <figcaption className="mt-3 text-center text-xs text-slate-500">{ui("3D illustration based on the Jeopardy game board.")}</figcaption>
      </figure>
    </div>
  </section>
  <section className="border-t-4 border-brand-yellow bg-white px-6 py-12 sm:px-10 lg:py-16" aria-labelledby="jeopardy-gameplay-heading">
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <h2 id="jeopardy-gameplay-heading" className="font-display text-3xl font-bold sm:text-4xl">{ui("Let’s play Jeopardy")}</h2>
        <p className="max-w-sm text-sm leading-relaxed text-slate-600">{ui("Put the board on a shared screen and let your teams decide where to go next.")}</p>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[1.45fr_1fr] lg:gap-10">
        <div>
          <Screenshot name="question" title={ui("Let your team choose.")} alt={ui("Jeopardy geography question with a thirty-second timer")}>{ui("Will they pick a subject they know well or take a chance on something else? Each team chooses a category and point value to reveal its next question.")}</Screenshot>
          <p className="mt-7 max-w-md text-base leading-relaxed text-slate-600">{ui("Build your categories around one topic or bring several subjects together. You can put trickier questions behind the higher values, giving teams a little more to think about when they choose.")}</p>
        </div>
        <div className="grid gap-7">
          <Screenshot name="answer" title={ui("Find out together.")} alt={ui("Jeopardy reveals Pacific Ocean as the answer")}>{ui("Give everyone time to talk it through, then reveal the answer. With open questions, you decide whether the team has earned the points; multiple-choice answers are checked for you.")}</Screenshot>
          <Screenshot name="results" title={ui("Give your teams a cheer.")} alt={ui("Jeopardy podium showing Foxes, Owls and Bears in the final standings")}>{ui("As questions leave the board, teams can see what’s still up for grabs. Finish whenever you’re ready and give the winners — and everyone who joined in — a cheer.")}</Screenshot>
        </div>
      </div>
    </div>
  </section>
  <section className="border-t border-sky-100 bg-sky-50 px-6 py-12 sm:px-10 lg:py-16">
    <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:gap-16">
      <div>
        <h2 className="font-display text-3xl font-bold">{ui("Make it your own")}</h2>
        <dl className="mt-6 space-y-5 text-sm leading-relaxed">
          <div><dt className="font-bold text-sky-800">{ui("Bring along your topic")}</dt><dd className="mt-1 text-slate-600">{ui("Choose your categories and write questions that fit what you’re teaching, or ask AI for a starting point. You can edit the questions and add pictures before you play.")}</dd></div>
          <div><dt className="font-bold text-sky-800">{ui("Play at your pace")}</dt><dd className="mt-1 text-slate-600">{ui("Give teams a little thinking time with the timer, or leave it off for a more relaxed discussion. You can finish the game before the board is cleared.")}</dd></div>
          <div><dt className="font-bold text-sky-800">{ui("Add a few surprises")}</dt><dd className="mt-1 text-slate-600">{ui("Start with a straightforward board while everyone gets comfortable. When you fancy a change, switch on bonus cards for a few surprises along the way.")}</dd></div>
        </dl>
      </div>
      <div className="border-l-4 border-brand-yellow pl-6 sm:pl-8">
        <h2 className="font-display text-3xl font-bold">{ui("Where will you take it?")}</h2>
        <dl className="mt-6 space-y-5 text-sm leading-relaxed">
          <div><dt className="font-bold text-sky-800">{ui("Welcome everyone back")}</dt><dd className="mt-1 text-slate-600">{ui("Make a category for each part of a topic you’ve covered. Let teams choose where to begin and enjoy finding out how much they remember.")}</dd></div>
          <div><dt className="font-bold text-sky-800">{ui("Get them talking and thinking")}</dt><dd className="mt-1 text-slate-600">{ui("Try categories such as fractions, habitats, inventions or famous artworks. Give teams a chance to explain their answers and learn something from each other.")}</dd></div>
          <div><dt className="font-bold text-sky-800">{ui("Round off a topic")}</dt><dd className="mt-1 text-slate-600">{ui("Bring a unit of work together in one board for a friendly revision game. Leave time to revisit any questions that get everyone talking.")}</dd></div>
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
