import { b2Pages } from './b2Booklet';
import { b1Pages } from './b1Booklet';
import { c1Pages } from './c1Booklet';
import { c2Pages } from './c2Booklet';
// Temporary teaching booklets, kept separate from the account and game areas.
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
  reading?: { id: string; title: string; text: string; emphasis?: string[]; underlined?: string[] };
  table?: { headings: string[]; rows: string[][] };
  cards?: { label: string; text: string; photo?: { src: string; alt: string; region: [number, number, number, number]; width: number; height: number } }[];
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

export const classBooklets: ClassBookletData[] = [
  { level: 'B1', slug: 'm7q4rx', pages: b1Pages, title: 'Starter · Personal profile', ready: true },
  { level: 'B2', slug: 'v9k2fp', pages: b2Pages, title: 'Starter · Let’s talk', ready: true },
  { level: 'C1', slug: 'h3w8nz', pages: c1Pages, title: 'Starter · Take it from me', ready: true },
  { level: 'C2', slug: 't6j5cs', pages: c2Pages, title: 'Unit 1 · Ring the changes', ready: true }
];
