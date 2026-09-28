import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Expand, X } from 'lucide-react';

const CreateButton = () => <Link to="/games?create=live-quiz" className="inline-block border border-brand-yellow bg-brand-yellow px-7 py-4 font-bold text-brand-dark transition-colors hover:bg-yellow-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700">Create a Live Quiz game</Link>;

const Screenshot = ({ name, alt, title, children }: { name: string; alt: string; title: string; children: React.ReactNode }) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const src = `/assets/game-types/live-quiz/${name}.jpg`;
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

export const LiveQuizPage: React.FC = () => <div className="bg-sky-50 text-brand-dark">
  <section className="mx-auto max-w-[1400px] px-6 pb-10 pt-7 sm:px-10">
    <nav aria-label="Breadcrumb" className="flex gap-3 text-sm text-slate-600"><Link to="/games" className="underline-offset-4 hover:underline">Games</Link><span aria-hidden="true">/</span><span aria-current="page">Live Quiz</span></nav>
    <div className="mt-7 grid items-center gap-6 grid-rows-[minmax(539px,auto)_322px] min-[375px]:grid-rows-[minmax(462px,auto)_322px] sm:grid-rows-[minmax(385px,auto)_408px] lg:grid-cols-[0.7fr_1.3fr] lg:grid-rows-[518px] lg:gap-8">
      <div className="relative z-10 py-3">
        <h1 className="font-display text-[40px] font-black leading-none tracking-tight text-brand-dark sm:text-6xl lg:text-[64px]">Live Quiz.</h1>
        <p className="mt-6 max-w-sm text-lg leading-relaxed text-slate-700 sm:text-xl">Everyone has an answer. Let’s hear yours. With Live Quiz, your students join on their own devices and answer together, while you lead the questions and enjoy a little friendly competition.</p>
        <div className="mt-8"><CreateButton /></div>
        <p className="mt-4 max-w-sm text-sm text-slate-600">Bring a topic from any subject. Students will need a device and an internet connection to join in.</p>
      </div>
      <figure className="grid h-full min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_32px]">
        <img src="/assets/game-types/live-quiz/hero-exploded.webp" alt="Live Quiz question and colourful answer tiles lifted forward beside the leaderboard" width="1586" height="992" loading="eager" decoding="async" className="h-full min-h-0 w-full object-contain" />
        <figcaption className="mt-3 text-center text-xs text-slate-500">3D illustration based on the real Live Quiz screen.</figcaption>
      </figure>
    </div>
  </section>
  <section className="border-t-4 border-brand-yellow bg-white px-6 py-12 sm:px-10 lg:py-16" aria-labelledby="live-quiz-gameplay-heading">
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <h2 id="live-quiz-gameplay-heading" className="font-display text-3xl font-bold sm:text-4xl">Let’s play Live Quiz</h2>
        <p className="max-w-sm text-sm leading-relaxed text-slate-600">Share the joining code, welcome your players and you’re ready for the first question.</p>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[1.45fr_1fr] lg:gap-10">
        <div>
          <Screenshot name="question" title="A question for everyone." alt="Live Quiz host screen with an ocean question, four answer choices and live standings">Put the question on the shared screen and let students choose an answer on their own device. You can see how many have answered, then reveal the answer together.</Screenshot>
          <p className="mt-7 max-w-md text-base leading-relaxed text-slate-600">There is room for a conversation between questions, too. Ask what helped students decide, talk through a tempting wrong answer, and move on when you are ready.</p>
        </div>
        <div className="grid gap-7">
          <Screenshot name="lobby" title="Come on in." alt="Live Quiz lobby with a joining code, QR code and six example players">Students scan the QR code or enter your joining code. Their names appear as they arrive, so you can wait until everyone is ready before starting.</Screenshot>
          <Screenshot name="results" title="Finish with a cheer." alt="Live Quiz final podium celebrating the example players">Follow the standings as you play and celebrate the final podium together. Then take a moment to revisit anything your class would like another go at.</Screenshot>
        </div>
      </div>
    </div>
  </section>
  <section className="border-t border-sky-100 bg-sky-50 px-6 py-12 sm:px-10 lg:py-16">
    <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:gap-16">
      <div>
        <h2 className="font-display text-3xl font-bold">Make it your own</h2>
        <dl className="mt-6 space-y-5 text-sm leading-relaxed">
          <div><dt className="font-bold text-sky-800">Your lesson, your questions</dt><dd className="mt-1 text-slate-600">Build a multiple-choice quiz around whatever you teach. Write your own questions or ask AI for a starting point, then check and edit them to suit your class.</dd></div>
          <div><dt className="font-bold text-sky-800">You lead the way</dt><dd className="mt-1 text-slate-600">Choose the answer time before you start. During the game, you can lock answers, reveal the result and decide when to move to the next question.</dd></div>
          <div><dt className="font-bold text-sky-800">Make everyone feel part of it</dt><dd className="mt-1 text-slate-600">Welcome players by name, add some lobby music and follow the live standings. Everyone gets a chance to answer, including those who rarely put a hand up.</dd></div>
        </dl>
      </div>
      <div className="border-l-4 border-brand-yellow pl-6 sm:pl-8">
        <h2 className="font-display text-3xl font-bold">Where will you take it?</h2>
        <dl className="mt-6 space-y-5 text-sm leading-relaxed">
          <div><dt className="font-bold text-sky-800">Find your starting point</dt><dd className="mt-1 text-slate-600">Open a topic with a few questions and see what your students already know. Their choices can help you decide what to spend more time on.</dd></div>
          <div><dt className="font-bold text-sky-800">Bring revision to life</dt><dd className="mt-1 text-slate-600">Mix familiar ideas with a few trickier questions, whether you are revisiting fractions, ecosystems, historical events or vocabulary.</dd></div>
          <div><dt className="font-bold text-sky-800">Leave time to talk</dt><dd className="mt-1 text-slate-600">A surprising answer can be the start of a useful discussion. Pause between rounds to hear students’ reasoning before you carry on.</dd></div>
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
