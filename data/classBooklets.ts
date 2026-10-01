import { b2Pages } from './b2Booklet';
// Temporary teaching booklets. Other levels remain UI samples until supplied.
export type WorkbookExercise = {
  id: string;
  number: string;
  prompt: string;
  kind: 'text' | 'long-text' | 'radio' | 'checkbox' | 'dropdown' | 'gaps';
  options?: string[];
  example?: string;
  wordTarget?: string;
};
export type WorkbookSection = {
  id: string; title: string; number?: string; instructions?: string;
  paragraphs?: string[]; bullets?: string[];
  reading?: { id: string; title: string; text: string };
  table?: { headings: string[]; rows: string[][] };
  cards?: { label: string; text: string }[];
  exercises?: WorkbookExercise[];
  referencePage?: number;
  relatedPage?: number;
};
export type WorkbookPage = {
  id: string;
  title: string;
  instructions: string;
  reading?: { id: string; title: string; text: string };
  exercises: WorkbookExercise[];
  sourcePage?: number;
  sections?: WorkbookSection[];
  reference?: boolean;
};
export type ClassBookletData = { slug: string; level: string; pages: WorkbookPage[]; title?: string; ready?: boolean };

const placeholderPages: WorkbookPage[] = [
  {
    id: 'reading', title: 'Reading & annotations',
    instructions: 'Interface sample: select some of the text below, then use Highlight, Underline or Remove marks. Try typing in the answer box too.',
    reading: { id: 'sample-passage', title: 'Sample text — awaiting textbook content', text: 'This is placeholder text for testing the reading tools. Select any words or sentences to highlight or underline them.\n\nYour teacher will provide the real reading passage for this page. Your marks and answers stay in this browser tab; they are not shared with anyone.' },
    exercises: [{ id: 'reading-answer', number: '1', kind: 'text', prompt: 'Sample answer box' }]
  },
  {
    id: 'choices', title: 'Multiple choice', instructions: 'Interface sample: select one option. No answers are marked or scored.',
    exercises: [{ id: 'choice', number: '1', kind: 'radio', prompt: 'Sample single-choice control', options: ['Option A', 'Option B', 'Option C'] }]
  },
  {
    id: 'selections', title: 'Dropdowns & checkboxes', instructions: 'Interface sample: choose from the dropdown and tick more than one box.',
    exercises: [
      { id: 'dropdown', number: '1', kind: 'dropdown', prompt: 'Sample dropdown control', options: ['Option A', 'Option B', 'Option C'] },
      { id: 'checkboxes', number: '2', kind: 'checkbox', prompt: 'Sample multiple-selection control', options: ['Option A', 'Option B', 'Option C'] }
    ]
  },
  {
    id: 'gaps', title: 'Short answers', instructions: 'Interface sample: type in each numbered gap. These are empty controls awaiting the textbook exercises.',
    exercises: [1, 2, 3].map(n => ({ id: `gap-${n}`, number: `${n}`, kind: 'text' as const, prompt: `Sample gap ${n}` }))
  },
  {
    id: 'writing', title: 'Written answers', instructions: 'Interface sample: use the larger answer area for a longer response.',
    exercises: [{ id: 'writing', number: '1', kind: 'long-text', prompt: 'Sample open-answer control' }]
  },
  { id: 'pending', title: 'Content coming soon', instructions: 'This page is reserved for textbook content. Your teacher will supply the exercises.', exercises: [] }
];

export const classBooklets: ClassBookletData[] = [
  { level: 'B1', slug: 'm7q4rx', pages: placeholderPages },
  { level: 'B2', slug: 'v9k2fp', pages: b2Pages, title: 'Starter · Let’s talk', ready: true },
  { level: 'C1', slug: 'h3w8nz', pages: placeholderPages },
  { level: 'C2', slug: 't6j5cs', pages: placeholderPages }
];
