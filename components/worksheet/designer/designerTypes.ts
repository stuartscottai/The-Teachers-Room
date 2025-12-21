export type WorksheetBlockType =
  | 'title'
  | 'header'
  | 'story'
  | 'mcq'
  | 'wordsearch'
  | 'matching'
  | 'gap-fill'
  | 'sentence-transform'
  | 'word-formation'
  | 'open-ended'
  | 'custom'
  | 'table'
  | 'answer-key'
  | 'image';

export type BorderStyle = 'none' | 'solid' | 'dashed' | 'dotted';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';

export interface WorksheetBlock {
  id: string;
  type: WorksheetBlockType;
  title: string;
  payload: any;
  previewHtml: string;
}

export interface WorksheetDesignerPage {
  id: string;
}

export interface WorksheetElementStyles {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  textAlign?: TextAlign;
  lineHeight?: string;
  color?: string;
  backgroundColor?: string;
  borderWidth?: string;
  borderStyle?: BorderStyle;
  borderColor?: string;
  borderRadius?: string;
  padding?: string;
  boxShadow?: string;
}

export interface WorksheetPlacedElement {
  id: string;
  pageId: string;
  type: WorksheetBlockType;
  x: number;
  y: number;
  w: number;
  h: number;
  html: string;
  styles: WorksheetElementStyles;
  splitGroupId?: string;
  splitIndex?: number;
}

export type WorksheetAiResultV1 = import('../../../types').WorksheetAiParts;

export interface WorksheetDesignerDocV1 {
  kind: 'worksheet-designer';
  version: 1;
  settings?: WorksheetDesignerSettings;
  pages: WorksheetDesignerPage[];
  blocks: WorksheetBlock[];
  elements: WorksheetPlacedElement[];
}

export type WorksheetMarginPreset = 'narrow' | 'normal' | 'wide';

export interface WorksheetDesignerSettings {
  marginPreset?: WorksheetMarginPreset;
}

export const createId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as any).randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const createEmptyDoc = (): WorksheetDesignerDocV1 => ({
  kind: 'worksheet-designer',
  version: 1,
  settings: { marginPreset: 'normal' },
  pages: [{ id: createId() }],
  blocks: [],
  elements: [],
});

export const tryParseDesignerDoc = (raw: string): WorksheetDesignerDocV1 | null => {
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.kind === 'worksheet-designer' && parsed?.version === 1) return parsed as WorksheetDesignerDocV1;
    return null;
  } catch {
    return null;
  }
};
