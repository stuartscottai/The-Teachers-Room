import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Expand, X } from 'lucide-react';

const CreateButton = () => <Link to="/games?create=trivia" className="inline-block border border-brand-yellow bg-brand-yellow px-7 py-4 font-bold text-brand-dark transition-colors hover:bg-yellow-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700">Create a Trivia game</Link>;

const Screenshot = ({ name, alt, title, children }: { name: string; alt: string; title: string; children: React.ReactNode }) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const src = `/assets/game-types/trivia/${name}.jpg`;
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

export const TriviaPage: React.FC = () => <div className="bg-sky-50 text-brand-dark">
  <section className="mx-auto max-w-[1400px] px-6 pb-10 pt-7 sm:px-10">
    <nav aria-label="Breadcrumb" className="flex gap-3 text-sm text-slate-600"><Link to="/games" className="underline-offset-4 hover:underline">Games</Link><span aria-hidden="true">/</span><span aria-current="page">Trivia</span></nav>
    <div className="mt-7 grid items-center gap-6 grid-rows-[minmax(539px,auto)_322px] min-[375px]:grid-rows-[minmax(462px,auto)_322px] sm:grid-rows-[minmax(385px,auto)_408px] lg:grid-cols-[0.7fr_1.3fr] lg:grid-rows-[518px] lg:gap-8">
      <div className="relative z-10 py-3">
        <h1 className="font-display text-[40px] font-black leading-none tracking-tight text-brand-dark sm:text-6xl lg:text-[64px]">Trivia.</h1>
        <p className="mt-6 max-w-sm text-lg leading-relaxed text-slate-700 sm:text-xl">Give your next lesson a little friendly competition. With Trivia, your students work together, share what they know and cheer each other on as they play.</p>
        <div className="mt-8"><CreateButton /></div>
        <p className="mt-4 max-w-sm text-sm text-slate-600">From maths and science to history, languages and beyond, there’s room for whatever you teach.</p>
      </div>
      <figure className="grid h-full min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_32px]">
        <img src="/assets/game-types/trivia/hero-transparent.webp" alt="Head-on 3D illustration of the Trivia board, with numbered tiles projecting towards the viewer" width="1774" height="886" loading="eager" decoding="async" className="h-full min-h-0 w-full object-contain" />
        <figcaption className="mt-3 text-center text-xs text-slate-500">3D illustration based on the Trivia game board.</figcaption>
      </figure>
    </div>
  </section>
  <section className="border-t-4 border-brand-yellow bg-white px-6 py-12 sm:px-10 lg:py-16" aria-labelledby="trivia-gameplay-heading">
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <h2 id="trivia-gameplay-heading" className="font-display text-3xl font-bold sm:text-4xl">Let’s play Trivia</h2>
        <p className="max-w-sm text-sm leading-relaxed text-slate-600">Gather your teams around a shared screen and see what’s behind the next number.</p>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[1.45fr_1fr] lg:gap-10">
        <div>
          <Screenshot name="question" title="Pick a number and have a go." alt="Trivia question with four answer choices and a thirty-second timer">Each team takes a turn choosing a number to reveal a question. Give them a moment to talk it through and agree on an answer before time runs out.</Screenshot>
          <p className="mt-7 max-w-md text-base leading-relaxed text-slate-600">You can give students a choice of answers or let them come up with their own. A tricky question is a lovely chance to pause, hear their ideas and work through it together.</p>
        </div>
        <div className="grid gap-7">
          <Screenshot name="answer" title="Find out together." alt="Trivia reveals Mars as the correct answer">Reveal the answer and take a moment to talk about it. Teams gain points for a correct answer and lose points for a wrong one, so there’s plenty to keep everyone guessing.</Screenshot>
          <Screenshot name="results" title="Give your teams a cheer." alt="Trivia podium showing Foxes, Owls and Bears in the final standings">When you’re ready to wrap up, the podium reveals the winning team. It’s a chance to celebrate their efforts before moving on with your lesson.</Screenshot>
        </div>
      </div>
    </div>
  </section>
  <section className="border-t border-sky-100 bg-sky-50 px-6 py-12 sm:px-10 lg:py-16">
    <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:gap-16">
      <div>
        <h2 className="font-display text-3xl font-bold">Make it your own</h2>
        <dl className="mt-6 space-y-5 text-sm leading-relaxed">
          <div><dt className="font-bold text-sky-800">Bring along your topic</dt><dd className="mt-1 text-slate-600">Write your own questions or let AI help you get started. You can check and change everything, and add pictures to bring your topic to life.</dd></div>
          <div><dt className="font-bold text-sky-800">Play at your pace</dt><dd className="mt-1 text-slate-600">Have five minutes to spare or a whole lesson to revisit a topic? Choose how many questions to play and how much thinking time your students need.</dd></div>
          <div><dt className="font-bold text-sky-800">Add a few surprises</dt><dd className="mt-1 text-slate-600">Keep things simple while everyone gets the hang of it, or try bonus cards and surprise point values when your group is ready for a twist.</dd></div>
        </dl>
      </div>
      <div className="border-l-4 border-brand-yellow pl-6 sm:pl-8">
        <h2 className="font-display text-3xl font-bold">Where will you take it?</h2>
        <dl className="mt-6 space-y-5 text-sm leading-relaxed">
          <div><dt className="font-bold text-sky-800">Welcome everyone back</dt><dd className="mt-1 text-slate-600">Start with a few questions about your last lesson. It’s an easy way to get everyone thinking again and see what they remember.</dd></div>
          <div><dt className="font-bold text-sky-800">Get them talking and thinking</dt><dd className="mt-1 text-slate-600">Try a maths puzzle, identify an animal or explore a moment in history. Ask teams how they reached their answer — the conversation can be as useful as the points.</dd></div>
          <div><dt className="font-bold text-sky-800">Round off a topic</dt><dd className="mt-1 text-slate-600">Bring together what you’ve been learning for a final team challenge. You’ll soon spot what’s clicked and what might need another look.</dd></div>
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
