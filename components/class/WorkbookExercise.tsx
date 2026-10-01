import React from 'react';
import type { WorkbookExercise as Exercise } from '../../data/classBooklets';

export function WorkbookExercise({ exercise, value, onChange, readOnly = false }: {
  exercise: Exercise; value: string | string[]; onChange: (value: string | string[]) => void; readOnly?: boolean;
}) {
  const id = `answer-${exercise.id}`;
  const label = `${exercise.number}. ${exercise.prompt}`;
  if (readOnly) {
    if (exercise.kind === 'gaps') {
      const parts = exercise.prompt.split('{{}}');
      const values = Array.isArray(value) ? value : [];
      return <div className="class-saved-exercise"><p className="class-saved-question">Question {exercise.number}</p>
        <p className="class-saved-sentence">{parts.map((part, index) => <React.Fragment key={index}>{part}{index < parts.length - 1 && <span className="class-saved-gap">{values[index] || '________'}</span>}</React.Fragment>)}</p>
      </div>;
    }
    const selected = Array.isArray(value) ? value : value ? [value] : [];
    return <div className={`class-saved-exercise ${exercise.kind === 'long-text' ? 'class-saved-long-answer' : ''}`}>
      <p className="class-saved-question">{label}</p>
      {exercise.example && <p>{exercise.example}</p>}
      {exercise.options && exercise.kind !== 'dropdown' && <ul className="class-saved-options">{exercise.options.map(option => <li key={option}>
        <span>{selected.includes(option) ? '[x]' : '[ ]'}</span> {option}
      </li>)}</ul>}
      <p className="class-saved-answer"><strong>Answer: </strong>{selected.length ? selected.join('; ') : 'Not answered'}</p>
    </div>;
  }
  if (exercise.kind === 'gaps') {
    const values = Array.isArray(value) ? value : [];
    const parts = exercise.prompt.split('{{}}');
    return <fieldset className="class-exercise class-gap-exercise"><legend>Question {exercise.number}</legend>
      <div className="class-gap-sentence">{parts.map((part, index) => <React.Fragment key={index}>{part}{index < parts.length - 1 && <input
        type="text" autoComplete="off" aria-label={`Question ${exercise.number}, gap ${index + 1}: ${exercise.prompt.replaceAll('{{}}', '…')}`}
        value={values[index] || ''} onChange={event => { const next = Array.from({ length: parts.length - 1 }, (_, n) => values[n] || ''); next[index] = event.target.value; onChange(next); }} />}</React.Fragment>)}</div>
    </fieldset>;
  }
  if (exercise.kind === 'radio' || exercise.kind === 'checkbox') return <fieldset className="class-exercise">
    <legend>{label}</legend>
    <div className="class-options">{exercise.options?.map(option => <label key={option} className="class-option">
      <input type={exercise.kind} name={id} value={option}
        checked={exercise.kind === 'radio' ? value === option : Array.isArray(value) && value.includes(option)}
        onChange={event => {
          if (exercise.kind === 'radio') onChange(option);
          else {
            const current = Array.isArray(value) ? value : [];
            onChange(event.target.checked ? [...current, option] : current.filter(item => item !== option));
          }
        }} />
      <span>{option}</span>
    </label>)}</div>
  </fieldset>;
  return <div className="class-exercise">
    <label htmlFor={id}>{label}</label>
    {exercise.example && <p className="class-help">{exercise.example}</p>}
    {exercise.kind === 'dropdown' ? <select id={id} value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value)}>
      <option value="">Choose an option</option>{exercise.options?.map(option => <option key={option}>{option}</option>)}
    </select> : exercise.kind === 'long-text' ? <textarea id={id} rows={6} value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value)} placeholder="Type your answer here…" />
      : <input id={id} type="text" autoComplete="off" value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value)} placeholder="Type your answer…" />}
    {exercise.wordTarget && <p className="class-help class-word-count" aria-live="polite">{typeof value === 'string' && value.trim() ? value.trim().split(/\s+/).length : 0} words · Aim for {exercise.wordTarget}</p>}
  </div>;
}
