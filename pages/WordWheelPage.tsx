import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Expand, X } from 'lucide-react';

const CreateButton = () => <Link to="/games?create=wordwheel" className="inline-block border border-brand-yellow bg-brand-yellow px-7 py-4 font-bold text-brand-dark transition-colors hover:bg-yellow-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700">Create a Wordwheel game</Link>;

const Screenshot = ({ name, alt, title, children }: { name: string; alt: string; title: string; children: React.ReactNode }) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const src = `/assets/game-types/wordwheel/${name}.jpg`;
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

export const WordWheelPage: React.FC = () => <div className="bg-sky-50 text-brand-dark">
  <section className="mx-auto max-w-[1400px] px-6 pb-10 pt-7 sm:px-10">
    <nav aria-label="Breadcrumb" className="flex gap-3 text-sm text-slate-600"><Link to="/games" className="underline-offset-4 hover:underline">Games</Link><span aria-hidden="true">/</span><span aria-current="page">Wordwheel</span></nav>
    <div className="mt-7 grid items-center gap-6 grid-rows-[minmax(539px,auto)_322px] min-[375px]:grid-rows-[minmax(462px,auto)_322px] sm:grid-rows-[minmax(385px,auto)_408px] lg:grid-cols-[0.7fr_1.3fr] lg:grid-rows-[518px] lg:gap-8">
      <div className="relative z-10 py-3">
        <h1 className="font-display text-[40px] font-black leading-none tracking-tight text-brand-dark sm:text-6xl lg:text-[64px]">Wordwheel.</h1>
        <p className="mt-6 max-w-sm text-lg leading-relaxed text-slate-700 sm:text-xl">A letter, a clue and a little teamwork. Take your students around the alphabet as they work out the answers, collect points and see how much of the wheel they can complete.</p>
        <div className="mt-8"><CreateButton /></div>
        <p className="mt-4 max-w-sm text-sm text-slate-600">From maths and science to history, languages and beyond, there’s room for whatever you teach.</p>
      </div>
      <figure className="grid h-full min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_32px]">
        <img src="/assets/game-types/wordwheel/hero-vivid.webp" alt="Transparent 3D illustration of the Wordwheel with letter tokens floating towards the viewer" width="1586" height="992" loading="eager" decoding="async" className="h-full min-h-0 w-full object-contain" />
        <figcaption className="mt-3 text-center text-xs text-slate-500">3D illustration inspired by the Wordwheel game.</figcaption>
      </figure>
    </div>
  </section>
  <section className="border-t-4 border-brand-yellow bg-white px-6 py-12 sm:px-10 lg:py-16" aria-labelledby="wordwheel-gameplay-heading">
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <h2 id="wordwheel-gameplay-heading" className="font-display text-3xl font-bold sm:text-4xl">Let’s play Wordwheel</h2>
        <p className="max-w-sm text-sm leading-relaxed text-slate-600">Bring everyone together around the wheel and see where the next letter takes you.</p>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[1.45fr_1fr] lg:gap-10">
        <div>
          <Screenshot name="question" title="What could the answer be?" alt="Wordwheel letter A clue asking for a scientist who studies stars and planets">Each letter comes with a clue. Read it together, think of an answer that fits the letter, then type it in and find out whether your team has got it right.</Screenshot>
          <p className="mt-7 max-w-md text-base leading-relaxed text-slate-600">An A could be an astronomer, a C could be a circle and an H could be a habitat. Build a wheel around what you teach, or mix topics for a little of everything.</p>
        </div>
        <div className="grid gap-7">
          <Screenshot name="answer" title="Enjoy those lightbulb moments." alt="Wordwheel reveals Astronomer as the correct answer">A correct answer earns points and marks the letter as solved. Stuck on a clue? Use a hint to uncover some letters, or pass and come back to it later.</Screenshot>
          <Screenshot name="results" title="Give your teams a cheer." alt="Wordwheel podium showing Foxes, Owls and Bears in the final standings">Watch the wheel change as you work through the clues, then celebrate your teams at the end. You can finish early if your lesson needs to move on.</Screenshot>
        </div>
      </div>
    </div>
  </section>
  <section className="border-t border-sky-100 bg-sky-50 px-6 py-12 sm:px-10 lg:py-16">
    <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:gap-16">
      <div>
        <h2 className="font-display text-3xl font-bold">Make it your own</h2>
        <dl className="mt-6 space-y-5 text-sm leading-relaxed">
          <div><dt className="font-bold text-sky-800">Bring along your topic</dt><dd className="mt-1 text-slate-600">Write clues for the ideas, people and words your students have been learning, or let AI help with a first draft. Check the answers and make the clues suit your group.</dd></div>
          <div><dt className="font-bold text-sky-800">Play at your pace</dt><dd className="mt-1 text-slate-600">Add a timer for a lively challenge, or leave it off and give everyone time to think. You can pause the timer while you talk through an idea.</dd></div>
          <div><dt className="font-bold text-sky-800">Lend a helping hand</dt><dd className="mt-1 text-slate-600">Teams have a limited supply of clues to reveal letters when they need a nudge. Choose straightforward scoring or try the mode that rewards quicker answers.</dd></div>
        </dl>
      </div>
      <div className="border-l-4 border-brand-yellow pl-6 sm:pl-8">
        <h2 className="font-display text-3xl font-bold">Where will you take it?</h2>
        <dl className="mt-6 space-y-5 text-sm leading-relaxed">
          <div><dt className="font-bold text-sky-800">Welcome everyone back</dt><dd className="mt-1 text-slate-600">Bring back familiar ideas from previous lessons with a few letter clues. It is a friendly way to get everyone thinking and sharing what they remember.</dd></div>
          <div><dt className="font-bold text-sky-800">Put names to ideas</dt><dd className="mt-1 text-slate-600">Explore scientific terms, historical figures, musical instruments or geographical features. After an answer, ask your students what else they know about it.</dd></div>
          <div><dt className="font-bold text-sky-800">Round off a topic</dt><dd className="mt-1 text-slate-600">Turn the key ideas from a topic into an alphabet challenge. Come back to the clues that caused a pause and give everyone a chance to explain their thinking.</dd></div>
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

