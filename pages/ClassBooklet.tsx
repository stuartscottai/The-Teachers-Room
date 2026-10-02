import { workbookText } from '../utils/workbookText';
import React, { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { BookOpen, GraduationCap } from 'lucide-react';
import { BrandName } from '../components/BrandName';
import { ReadingPassage, type TextMark } from '../components/class/ReadingPassage';
import { WorkbookExercise } from '../components/class/WorkbookExercise';
import { WorkbookSection } from '../components/class/WorkbookSection';
import { PrintableBooklet } from '../components/class/PrintableBooklet';
import type { ClassBookletData } from '../data/classBooklets';
import './ClassBooklet.css';

type BookletState = { page: number; lessonPage?: number; answers: Record<string, string | string[]>; marks: Record<string, TextMark[]> };
const emptyState = (): BookletState => ({ page: 0, answers: {}, marks: {} });
const storageKey = (slug: string) => `teachers-room:temporary-class:v1:${slug}`;

function readState(booklet: ClassBookletData): BookletState {
  try {
    const stored = JSON.parse(sessionStorage.getItem(storageKey(booklet.slug)) || 'null');
    if (!stored || !Number.isInteger(stored.page) || stored.page < 0 || stored.page >= booklet.pages.length) return emptyState();
    const state = emptyState();
    state.page = stored.page;
    if (Number.isInteger(stored.lessonPage) && stored.lessonPage >= 0 && stored.lessonPage < booklet.pages.filter(page => !page.reference).length) state.lessonPage = stored.lessonPage;
    for (const page of booklet.pages) {
      for (const exercise of [...page.exercises, ...(page.sections?.flatMap(section => section.exercises || []) || [])]) {
        const value = stored.answers?.[exercise.id];
        if (typeof value === 'string' || (Array.isArray(value) && value.every(item => typeof item === 'string'))) state.answers[exercise.id] = value;
      }
      for (const reading of [page.reading, ...(page.sections?.map(section => section.reading) || [])].filter(Boolean)) {
        const marks = stored.marks?.[reading!.id];
        if (Array.isArray(marks)) state.marks[reading!.id] = marks.filter(mark => mark && Number.isInteger(mark.start) && Number.isInteger(mark.end)
          && mark.start >= 0 && mark.end > mark.start && mark.end <= reading!.text.length && typeof mark.highlight === 'boolean' && typeof mark.underline === 'boolean');
      }
    }
    return state;
  } catch { return emptyState(); }
}

export default function ClassBooklet({ booklet }: { booklet: ClassBookletData }) {
  const [state, setState] = useState(() => readState(booklet));
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [printing, setPrinting] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const page = booklet.pages[state.page];
  const lessonPages = booklet.pages.filter(item => !item.reference);
  const referencePages = booklet.pages.filter(item => item.reference);
  const visiblePages = page.reference ? referencePages : lessonPages;
  const visibleIndex = visiblePages.indexOf(page);
  useEffect(() => {
    try { sessionStorage.setItem(storageKey(booklet.slug), JSON.stringify(state)); }
    catch { setStorageUnavailable(true); }
  }, [booklet.slug, state]);
  useEffect(() => {
    // Include Ctrl/Cmd+P as well as the button, and mount the answer record before capture.
    const beforePrint = () => flushSync(() => setPrinting(true));
    const afterPrint = () => setPrinting(false);
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => {
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, []);

  function goToPage(index: number) {
    setState(current => ({ ...current, page: index, lessonPage: !booklet.pages[current.page].reference ? current.page : current.lessonPage }));
    window.getSelection()?.removeAllRanges();
    requestAnimationFrame(() => { heading.current?.focus(); heading.current?.scrollIntoView({ block: 'start' }); });
  }
  function reset() {
    if (!window.confirm("Clear all answers and reading marks in this booklet?")) return;
    window.getSelection()?.removeAllRanges();
    setState(emptyState());
  }

  return <div className="class-workbook notranslate" translate="no" lang="en">
    <header className="class-brand"><GraduationCap size={26} aria-hidden="true" /><BrandName /></header>
    <main className="class-shell">
      <div className="class-heading-row">
        <div><p className="class-eyebrow"><BookOpen size={16} aria-hidden="true" /> {"Temporary online class"}</p>
          <h1>{workbookText("{level} Workbook", { level: booklet.level })}</h1><p className="class-subtitle">{booklet.title || "Your lesson, one page at a time."}</p></div>
        <div className="class-actions"><button type="button" onClick={() => window.print()} aria-describedby="class-save-help">{"Save a copy"}</button>
          <button type="button" className="class-reset" onClick={reset}>{"Reset booklet"}</button></div>
      </div>
      <p id="class-save-help" className="class-help class-save-help">{"Save a copy opens your device’s print options. Choose Save as PDF (or your device’s PDF/share option) to keep a short record of your entered answers, with page and exercise numbers. Unanswered items are omitted."}</p>
      {!booklet.ready && <div className="class-notice"><strong>{"Placeholder booklet"}</strong> · {"These are interface samples. Textbook content will be added after your teacher supplies the pages."}</div>}
      <nav className="class-page-nav" aria-label={"Booklet pages"}>
        {lessonPages.map((item, index) => <button key={item.id} type="button" aria-label={workbookText("Page {number}: {title}", { number: index + 1, title: item.title })} title={item.title} aria-current={item === page ? 'page' : undefined} onClick={() => goToPage(booklet.pages.indexOf(item))}>{index + 1}</button>)}
      </nav>
      {referencePages.length > 0 && <nav className="class-reference-nav" aria-label={"Grammar reference"}>
        {referencePages.map(item => <button key={item.id} type="button" aria-current={item === page ? 'page' : undefined} onClick={() => goToPage(booklet.pages.indexOf(item))}>{workbookText("Reference {number}", { number: item.sourcePage })} · {item.title}</button>)}
        {page.reference && <button type="button" onClick={() => goToPage(state.lessonPage || 0)}>{"← Back to lesson"}</button>}
      </nav>}
      <article className="class-paper">
        <div className="class-page-heading"><p className="class-eyebrow" aria-live="polite">{workbookText(page.reference ? "Grammar reference {number} of {total}" : "Page {number} of {total}", { number: visibleIndex + 1, total: visiblePages.length })}</p>
          {page.sourcePage && <p className="class-source-page">{workbookText("Textbook page {number}", { number: page.sourcePage })}</p>}
          <h2 ref={heading} tabIndex={-1}>{page.title}</h2></div>
        <div className="class-instructions"><strong>{"Instructions"}</strong><p>{page.instructions}</p></div>
        {page.reading && <ReadingPassage key={page.id} title={page.reading.title} text={page.reading.text} marks={state.marks[page.reading.id] || []}
          onChange={marks => setState(current => ({ ...current, marks: { ...current.marks, [page.reading!.id]: marks } }))} />}
        <section className="class-answers" aria-label={"Answer areas"}>
          {page.exercises.map(exercise => <WorkbookExercise key={exercise.id} exercise={exercise} value={state.answers[exercise.id] || ''}
            onChange={value => setState(current => ({ ...current, answers: { ...current.answers, [exercise.id]: value } }))} />)}
        </section>
        {page.sections?.map(section => <WorkbookSection key={section.id} section={section} answers={state.answers} marks={state.marks}
          onAnswer={(id, value) => setState(current => ({ ...current, answers: { ...current.answers, [id]: value } }))}
          onMarks={(id, value) => setState(current => ({ ...current, marks: { ...current.marks, [id]: value } }))}
          onReference={sourcePage => goToPage(booklet.pages.findIndex(item => item.sourcePage === sourcePage))} />)}
      </article>
      <div className="class-footer-nav">
        <button type="button" disabled={visibleIndex === 0} onClick={() => goToPage(booklet.pages.indexOf(visiblePages[visibleIndex - 1]))}>{"← Previous"}</button>
        <span>{visibleIndex + 1} / {visiblePages.length}</span>
        <button type="button" disabled={visibleIndex === visiblePages.length - 1} onClick={() => goToPage(booklet.pages.indexOf(visiblePages[visibleIndex + 1]))}>{"Next →"}</button>
      </div>
      <p className="class-local-note" role="status">{storageUnavailable ? "Browser storage is unavailable. Your work lasts until you reload or leave this page." : "Answers and marks stay in this browser tab, including after a refresh. Closing the tab ends this session."}</p>
      {printing && <PrintableBooklet booklet={booklet} answers={state.answers} />}
    </main>
  </div>;
}
