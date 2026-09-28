import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Expand, X } from 'lucide-react';

const CreateButton = () => <Link to="/games?create=blockbeaters" className="inline-block border border-brand-yellow bg-brand-yellow px-7 py-4 font-bold text-brand-dark transition-colors hover:bg-yellow-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700">Create a Blockbeaters game</Link>;

const Screenshot = ({ name, alt, title, children }: { name: string; alt: string; title: string; children: React.ReactNode }) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const src = `/assets/game-types/blockbeaters/${name}.jpg`;
  const height = name === 'results' ? 700 : 900;
  return <figure className="min-w-0">
    <button type="button" onClick={() => dialog.current?.showModal()} aria-label={`Enlarge screenshot: ${alt}`} className="group relative block w-full border border-slate-200 bg-white text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700">
      <img src={src} alt={alt} width="1440" height={height} loading="lazy" decoding="async" className="h-auto w-full" />
      <span className="absolute bottom-2 right-2 bg-slate-950/80 p-2 text-white group-hover:bg-sky-800"><Expand size={16} aria-hidden="true" /></span>
    </button>
    <figcaption className="mt-3 text-sm leading-relaxed text-slate-600"><strong className="mr-2 font-bold text-slate-900">{title}</strong>{children}</figcaption>
    <dialog ref={dialog} aria-label={alt} className="m-auto w-[96vw] max-w-6xl overflow-auto border-0 bg-slate-950 p-2 backdrop:bg-slate-950/80" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="flex justify-end pb-2"><button type="button" onClick={() => dialog.current?.close()} aria-label="Close screenshot" className="p-2 text-white hover:bg-white/20"><X size={22} /></button></div>
      <img src={src} alt={alt} width="1440" height={height} loading="lazy" className="h-auto w-full" />
    </dialog>
  </figure>;
};

export const BlockBeatersPage: React.FC = () => <div className="bg-sky-50 text-brand-dark">
  <section className="mx-auto max-w-[1400px] px-6 pb-10 pt-7 sm:px-10">
    <nav aria-label="Breadcrumb" className="flex gap-3 text-sm text-slate-600"><Link to="/games" className="underline-offset-4 hover:underline">Games</Link><span aria-hidden="true">/</span><span aria-current="page">Blockbeaters</span></nav>
    <div className="mt-7 grid items-center gap-6 grid-rows-[minmax(539px,auto)_322px] min-[375px]:grid-rows-[minmax(462px,auto)_322px] sm:grid-rows-[minmax(385px,auto)_408px] lg:grid-cols-[0.7fr_1.3fr] lg:grid-rows-[518px] lg:gap-8">
      <div className="relative z-10 py-3">
        <h1 className="font-display text-[40px] font-black leading-none tracking-tight text-brand-dark sm:text-6xl lg:text-[64px]">Blockbeaters.</h1>
        <p className="mt-6 max-w-sm text-lg leading-relaxed text-slate-700 sm:text-xl">A little knowledge, a little strategy and a race across the board. In Blockbeaters, your students answer questions to claim hexagons and build a path before the other team gets there.</p>
        <div className="mt-8"><CreateButton /></div>
        <p className="mt-4 max-w-sm text-sm text-slate-600">From maths and science to history, languages and beyond, there’s room for whatever you teach.</p>
      </div>
      <figure className="grid h-full min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_32px]">
        <img src="/assets/game-types/blockbeaters/ChatGPT Image Sep 27, 2026, 10_12_53 PM.png" alt="Blockbeaters hexagon game board spelling Beat the Block, with four team panels" width="1448" height="1086" loading="eager" decoding="async" className="h-full min-h-0 w-full object-contain" />
        <figcaption className="mt-3 text-center text-xs text-slate-500">3D illustration inspired by the Blockbeaters game grid.</figcaption>
      </figure>
    </div>
  </section>
  <section className="border-t-4 border-brand-yellow bg-white px-6 py-12 sm:px-10 lg:py-16" aria-labelledby="blockbeaters-gameplay-heading">
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <h2 id="blockbeaters-gameplay-heading" className="font-display text-3xl font-bold sm:text-4xl">Let’s play Blockbeaters</h2>
        <p className="max-w-sm text-sm leading-relaxed text-slate-600">Get your teams together and let them plan their route across the hexagons.</p>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[1.45fr_1fr] lg:gap-10">
        <div>
          <Screenshot name="question" title="Which block will you go for?" alt="Blockbeaters question asking for a scientist who studies stars and planets">Choose a hexagon and answer its question. Get it right and the block becomes your team colour, bringing you one step closer to connecting your sides of the board.</Screenshot>
          <p className="mt-7 max-w-md text-base leading-relaxed text-slate-600">Will your team extend its own path or try to get in the way of an opponent? There is plenty to talk about between questions, so everyone can help decide the next move.</p>
        </div>
        <div className="grid gap-7">
          <Screenshot name="answer" title="Make your move." alt="Blockbeaters reveals Astronomer as the correct answer">Check the answer together and watch your team colour spread across the board. If you allow steals, teams can also challenge for an opponent’s block to change the route.</Screenshot>
          <Screenshot name="results" title="Give your teams a cheer." alt="Blockbeaters podium showing Foxes, Owls and Bears in the final standings">Connecting your sides earns a final question: answer it correctly to win! If you end the game early, scores and correct answers decide the result.</Screenshot>
        </div>
      </div>
    </div>
  </section>
  <section className="border-t border-sky-100 bg-sky-50 px-6 py-12 sm:px-10 lg:py-16">
    <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:gap-16">
      <div>
        <h2 className="font-display text-3xl font-bold">Make it your own</h2>
        <dl className="mt-6 space-y-5 text-sm leading-relaxed">
          <div><dt className="font-bold text-sky-800">Bring along your topic</dt><dd className="mt-1 text-slate-600">Fill the board with questions about what your students are learning, from habitats to historical events. Write your own or ask AI for a draft, then check and edit before playing.</dd></div>
          <div><dt className="font-bold text-sky-800">Play at your pace</dt><dd className="mt-1 text-slate-600">Choose a smaller board for a shorter challenge or a larger one for more room to plan. Set a question timer or leave it off when your group needs time to think.</dd></div>
          <div><dt className="font-bold text-sky-800">Add a little strategy</dt><dd className="mt-1 text-slate-600">Keep the first game simple, then try steals and bonus cards when everyone knows their way around. A shield or an extra turn can give teams a new plan to work with.</dd></div>
        </dl>
      </div>
      <div className="border-l-4 border-brand-yellow pl-6 sm:pl-8">
        <h2 className="font-display text-3xl font-bold">Where will you take it?</h2>
        <dl className="mt-6 space-y-5 text-sm leading-relaxed">
          <div><dt className="font-bold text-sky-800">Welcome everyone back</dt><dd className="mt-1 text-slate-600">Revisit familiar ideas with a smaller board and a few well-chosen questions. Teams can enjoy making a plan while they bring last lesson’s learning back to mind.</dd></div>
          <div><dt className="font-bold text-sky-800">Give teamwork a purpose</dt><dd className="mt-1 text-slate-600">Mix subject questions with decisions about where to go next. Students can help with the answer, suggest a route or spot a block worth defending.</dd></div>
          <div><dt className="font-bold text-sky-800">Round off a topic</dt><dd className="mt-1 text-slate-600">Bring together the main ideas from a unit for a friendly team contest. Pause on any tricky answers and give students a chance to explain how they worked them out.</dd></div>
        </dl>
      </div>
    </div>
  </section>
  <section className="bg-white px-6 py-14 sm:px-10 lg:py-20">
    <div className="mx-auto max-w-6xl text-center">
      <div aria-hidden="true" className="mx-auto mb-6 h-1 w-12 bg-brand-yellow" />
      <h2 className="font-display text-3xl font-bold sm:text-4xl">What will your students play next?</h2>
      <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-600">Choose something you’re teaching and make it a game you can enjoy together.</p>
      <div className="mt-7"><CreateButton /></div>
    </div>
  </section>
</div>;
