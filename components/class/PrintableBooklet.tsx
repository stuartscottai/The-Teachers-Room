import React from 'react';
import type { ClassBookletData } from '../../data/classBooklets';
import type { TextMark } from './ReadingPassage';
import { ReadingPassage } from './ReadingPassage';
import { WorkbookExercise } from './WorkbookExercise';
import { WorkbookSection } from './WorkbookSection';

const noChange = () => {};

// Render answers as ordinary text: print engines can clip textareas and omit selections.
export function PrintableBooklet({ booklet, answers, marks }: {
  booklet: ClassBookletData; answers: Record<string, string | string[]>; marks: Record<string, TextMark[]>;
}) {
  const lessons = booklet.pages.filter(page => !page.reference);
  const references = booklet.pages.filter(page => page.reference);
  return <div className="class-saved-copy" data-testid="saved-booklet">
    {booklet.pages.map(page => <article className="class-saved-page" key={page.id}>
      <header><p className="class-eyebrow">The Teachers' Room · {booklet.level} Workbook</p>
        {booklet.title && <p>{booklet.title}</p>}
        <p className="class-source-page">{page.reference ? `Grammar reference ${references.indexOf(page) + 1} of ${references.length}` : `Lesson page ${lessons.indexOf(page) + 1} of ${lessons.length}`}{page.sourcePage ? ` · Textbook page ${page.sourcePage}` : ''}</p>
        <h2>{page.title}</h2>
        <p className="class-help">Saved copy of your answers and reading marks. Blank answers are marked “Not answered” or left as gaps.</p>
      </header>
      <p className="class-section-copy">{page.instructions}</p>
      {page.reading && <ReadingPassage title={page.reading.title} text={page.reading.text} marks={marks[page.reading.id] || []} onChange={noChange} readOnly />}
      <div className="class-answers">{page.exercises.map(exercise => <WorkbookExercise key={exercise.id} exercise={exercise} value={answers[exercise.id] || ''} onChange={noChange} readOnly />)}</div>
      {page.sections?.map(section => <WorkbookSection key={section.id} section={section} answers={answers} marks={marks} onAnswer={noChange} onMarks={noChange} onReference={noChange} readOnly />)}
    </article>)}
  </div>;
}
