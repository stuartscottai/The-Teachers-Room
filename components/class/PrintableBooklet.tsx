import { workbookText } from '../../utils/workbookText';
import React from 'react';
import type { ClassBookletData, WorkbookExercise } from '../../data/classBooklets';

// Keep only entered answers, retaining gap positions when a sentence is unfinished.
function answerText(exercise: WorkbookExercise, value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value.flatMap((answer, index) => answer.trim()
      ? [exercise.kind === 'gaps' ? `Gap ${index + 1}: ${answer.trim()}` : answer.trim()]
      : []).join('; ');
  }
  return value?.trim() || '';
}

export function PrintableBooklet({ booklet, answers }: {
  booklet: ClassBookletData; answers: Record<string, string | string[]>;
}) {
  const pages = booklet.pages.map((page, index) => {
    const groups = [
      { id: page.id, title: '', number: undefined, exercises: page.exercises },
      ...(page.sections || [])
    ].map(group => ({
      ...group,
      rows: (group.exercises || []).flatMap(exercise => {
        const answer = answerText(exercise, answers[exercise.id]);
        return answer ? [{ id: exercise.id, number: exercise.number, answer }] : [];
      })
    })).filter(group => group.rows.length > 0);
    return { ...page, pageNumber: page.sourcePage || index + 1, groups };
  }).filter(page => page.groups.length > 0);

  return <div className="class-saved-copy notranslate" translate="no" lang="en" data-testid="saved-booklet">
    <header className="class-answer-header">
      <h1>{workbookText("The Teachers' Room - {level} answers", { level: booklet.level })}</h1>
      <p>Only entered answers are included.</p>
    </header>
    {pages.length === 0 && <p>No answers entered yet.</p>}
    <div className="class-answer-pages">{pages.map(page => <article className="class-saved-page" key={page.id}>
      <h2>{workbookText('Page {number}', { number: page.pageNumber })}</h2>
      {page.groups.map(group => <section key={group.id} className="class-answer-group">
        {group.title && <h3>{group.number ? `Exercise ${group.number.split('\u00b7')[0].trim()} - ` : ''}{group.title}</h3>}
        <dl>{group.rows.map(row => <div className="class-answer-row" key={row.id}>
          <dt>{group.title ? `${row.number}.` : `Exercise ${row.number}`}</dt>
          <dd>{row.answer}</dd>
        </div>)}</dl>
      </section>)}
    </article>)}</div>
  </div>;
}
