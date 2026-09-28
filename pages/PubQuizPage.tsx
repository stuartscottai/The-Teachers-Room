import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Expand, X } from 'lucide-react';

const CreateButton = () => <Link to="/games?create=pub-quiz" className="inline-block border border-brand-yellow bg-brand-yellow px-7 py-4 font-bold text-brand-dark transition-colors hover:bg-yellow-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700">Create a Pub Quiz game</Link>;

const Screenshot = ({ name, alt, title, children }: { name: string; alt: string; title: string; children: React.ReactNode }) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const src = `/assets/game-types/pub-quiz/${name}.jpg`;
  const height = 900;
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

export const PubQuizPage: React.FC = () => <div className="bg-sky-50 text-brand-dark">
  <section className="mx-auto max-w-[1400px] px-6 pb-10 pt-7 sm:px-10">
    <nav aria-label="Breadcrumb" className="flex gap-3 text-sm text-slate-600"><Link to="/games" className="underline-offset-4 hover:underline">Games</Link><span aria-hidden="true">/</span><span aria-current="page">Pub Quiz</span></nav>
    <div className="mt-7 grid items-center gap-6 grid-rows-[minmax(539px,auto)_322px] min-[375px]:grid-rows-[minmax(462px,auto)_322px] sm:grid-rows-[minmax(385px,auto)_408px] lg:grid-cols-[0.7fr_1.3fr] lg:grid-rows-[518px] lg:gap-8">
      <div className="relative z-10 py-3">
        <h1 className="font-display text-[40px] font-black leading-none tracking-tight text-brand-dark sm:text-6xl lg:text-[64px]">Pub Quiz.</h1>
        <p className="mt-6 max-w-sm text-lg leading-relaxed text-slate-700 sm:text-xl">Get your teams together and see what they know. Pub Quiz brings your questions into themed rounds, with time to talk, compare ideas and enjoy a little friendly competition.</p>
        <div className="mt-8"><CreateButton /></div>
        <p className="mt-4 max-w-sm text-sm text-slate-600">One shared screen, a few teams and whatever you’re teaching. Students can jot down answers together as you play.</p>
      </div>
      <figure className="grid h-full min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_32px]">
        <img src="/assets/game-types/pub-quiz/hero-rounds-transparent.webp" alt="Pub Quiz round cards and team scores floating above the pub scene" width="1672" height="941" loading="eager" decoding="async" className="h-full min-h-0 w-full object-contain" />
        <figcaption className="mt-3 text-center text-xs text-slate-500">3D illustration based on the real Pub Quiz screen.</figcaption>
      </figure>
    </div>
  </section>
  <section className="border-t-4 border-brand-yellow bg-white px-6 py-12 sm:px-10 lg:py-16" aria-labelledby="pub-quiz-gameplay-heading">
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <h2 id="pub-quiz-gameplay-heading" className="font-display text-3xl font-bold sm:text-4xl">Let’s play Pub Quiz</h2>
        <p className="max-w-sm text-sm leading-relaxed text-slate-600">Pick a round, give your teams a moment to think and let the conversation begin.</p>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[1.45fr_1fr] lg:gap-10">
        <div>
          <Screenshot name="question" title="Put your heads together." alt="Pub Quiz question asking for the largest ocean on Earth">Show a question and let teams talk it through. Move at your own pace, or add a timer when your class is ready for a quicker challenge.</Screenshot>
          <p className="mt-7 max-w-md text-base leading-relaxed text-slate-600">You can reveal an answer as you go, or save the checking for the end of the round. Either way, there is time to hear how your students arrived at their answers.</p>
        </div>
        <div className="grid gap-7">
          <Screenshot name="rounds" title="Something for every team." alt="Pub Quiz round selection with Our planet, Science, Maths, History and The arts">Choose the next round from your topic cards. Keep everything around one subject or mix things up so different students have a chance to shine.</Screenshot>
          <Screenshot name="results" title="Give them a cheer." alt="Pub Quiz final podium celebrating Foxes, Owls and Bears">Check answers together and add the team points. At the end, celebrate your winners and the good ideas that came up along the way.</Screenshot>
        </div>
      </div>
    </div>
  </section>
  <section className="border-t border-sky-100 bg-sky-50 px-6 py-12 sm:px-10 lg:py-16">
    <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:gap-16">
      <div>
        <h2 className="font-display text-3xl font-bold">Make it your own</h2>
        <dl className="mt-6 space-y-5 text-sm leading-relaxed">
          <div><dt className="font-bold text-sky-800">Build your own rounds</dt><dd className="mt-1 text-slate-600">Choose topics that fit your lesson, from fractions and forces to art and literature. Write the questions yourself or ask AI for a draft, then check and edit before playing.</dd></div>
          <div><dt className="font-bold text-sky-800">Give them time to think</dt><dd className="mt-1 text-slate-600">Use open questions for a team discussion or offer multiple-choice answers. Add a timer for a little urgency, or leave it off when the thinking matters more than the speed.</dd></div>
          <div><dt className="font-bold text-sky-800">Keep the scoring simple</dt><dd className="mt-1 text-slate-600">Award points after an answer or review the whole round before updating the scores. You stay in charge of checking answers and giving teams their credit.</dd></div>
        </dl>
      </div>
      <div className="border-l-4 border-brand-yellow pl-6 sm:pl-8">
        <h2 className="font-display text-3xl font-bold">Where will you take it?</h2>
        <dl className="mt-6 space-y-5 text-sm leading-relaxed">
          <div><dt className="font-bold text-sky-800">Bring a topic together</dt><dd className="mt-1 text-slate-600">Give each part of a unit its own round. Students can revisit the main ideas and spot the bits they would like to practise again.</dd></div>
          <div><dt className="font-bold text-sky-800">Make room for teamwork</dt><dd className="mt-1 text-slate-600">Encourage teams to explain their choices before settling on an answer. Someone might remember a fact, while someone else helps put the pieces together.</dd></div>
          <div><dt className="font-bold text-sky-800">End on a shared experience</dt><dd className="mt-1 text-slate-600">Mix a few favourite topics for an end-of-term quiz, a revision lesson or a group celebration. A varied set of rounds gives everyone something to contribute.</dd></div>
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
