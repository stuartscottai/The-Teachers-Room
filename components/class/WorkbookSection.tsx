import { workbookText } from '../../utils/workbookText';
import React from 'react';
import type { WorkbookSection as Section } from '../../data/classBooklets';
import { WorkbookExercise } from './WorkbookExercise';
import { ReadingPassage, type TextMark } from './ReadingPassage';

export function WorkbookSection({ section, answers, marks, onAnswer, onMarks, onReference, readOnly = false }: {
  section: Section; answers: Record<string, string | string[]>; marks: Record<string, TextMark[]>;
  onAnswer: (id: string, value: string | string[]) => void;
  onMarks: (id: string, value: TextMark[]) => void;
  onReference: (sourcePage: number) => void;
  readOnly?: boolean;
}) {
  const textRanges = (phrases?: string[]) => phrases?.flatMap(phrase => {
    const start = section.reading!.text.indexOf(phrase);
    return start < 0 ? [] : [{ start, end: start + phrase.length }];
  });
  const emphasis = section.reading?.emphasis ? textRanges(section.reading.emphasis) : section.reading?.id === 'b2-suitcase' ? ['While', 'when I bumped'].map(phrase => {
    const start = section.reading!.text.indexOf(phrase);
    return { start, end: start + (phrase === 'While' ? 5 : 4) };
  }) : undefined;
  const headingId = `${readOnly ? 'saved-' : ''}section-${section.id}`;
  return <section className="class-unit-section" aria-labelledby={headingId}>
    <div className="class-section-title"><h3 id={headingId}>{section.title}</h3>
      {!readOnly && section.relatedPage && <button type="button" onClick={() => onReference(section.relatedPage!)}>{workbookText("Read textbook page {number}", { number: section.relatedPage })}</button>}
      {!readOnly && section.referencePage && <button type="button" onClick={() => onReference(section.referencePage!)}>{"Grammar reference"} · {section.referencePage}</button>}</div>
    {section.instructions && <div className="class-task"><span className="class-task-number">{section.number}</span><p>{section.instructions}</p></div>}
    {section.paragraphs?.map((text, i) => <p key={i} className="class-section-copy">{text}</p>)}
    {section.bullets && <ul className="class-bullets">{section.bullets.map(text => <li key={text}>{text}</li>)}</ul>}
    {section.table && <div className="class-table-scroll" tabIndex={readOnly ? undefined : 0} role="region" aria-label={workbookText("{title} table", { title: section.title })}><table>
      <thead><tr>{section.table.headings.map(heading => <th key={heading} scope="col">{heading}</th>)}</tr></thead>
      <tbody>{section.table.rows.map((row, i) => <tr key={i}>{row.map((cell, n) => n === 0 ? <th key={n} scope="row">{cell}</th> : <td key={n}>{cell}</td>)}</tr>)}</tbody>
    </table></div>}
    {section.cards && <div className={`class-content-cards ${section.id === 'p9-vocabulary-2' ? 'class-emoji-cards' : ''}`}>{section.cards.map(card => <div className="class-content-card" key={card.label}>
      <span className="class-card-label">{card.label}</span>
      {card.photo && <svg className="class-photo" role="img" aria-label={card.photo.alt} viewBox={card.photo.region.join(' ')} width={card.photo.region[2]} height={card.photo.region[3]}>
        <defs><clipPath id={`photo-${section.id}-${card.label.replace(/\W/g, '-')}`}>
          <rect x={card.photo.region[0]} y={card.photo.region[1]} width={card.photo.region[2]} height={card.photo.region[3]} />
        </clipPath></defs>
        <image href={card.photo.src} width={card.photo.width} height={card.photo.height} preserveAspectRatio="none" clipPath={`url(#photo-${section.id}-${card.label.replace(/\W/g, '-')})`} />
      </svg>}
      {card.text && <p>{card.text}</p>}
    </div>)}</div>}
    {section.reading && <ReadingPassage title={section.reading.title} text={section.reading.text} marks={marks[section.reading.id] || []}
      emphasis={emphasis} sourceUnderlines={textRanges(section.reading.underlined)}
      readOnly={readOnly}
      onChange={value => onMarks(section.reading!.id, value)} />}
    {section.exercises?.length ? <div className="class-answers">{section.exercises.map(exercise => <WorkbookExercise key={exercise.id} exercise={exercise}
      value={answers[exercise.id] || ''} readOnly={readOnly} onChange={value => onAnswer(exercise.id, value)} />)}</div> : null}
  </section>;
}
