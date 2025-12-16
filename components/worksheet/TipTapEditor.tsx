import React from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TextAlign } from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Underline } from '@tiptap/extension-underline';
import { LineSpacing } from './extensions/LineSpacingExtension';
import { IndentExtension } from './extensions/IndentExtension';
import { PageBreak } from './extensions/PageBreakNode';
import { FontSize } from './extensions/FontSizeExtension';
import { ResizableImage } from './extensions/ResizableImageExtension';

export interface TipTapEditorProps {
  content?: string;
  onUpdate?: (html: string, editor: Editor) => void;
  editable?: boolean;
  className?: string;
  placeholder?: string;
}

export const TipTapEditor: React.FC<TipTapEditorProps> = ({
  content = '',
  onUpdate,
  editable = true,
  className = '',
  placeholder = 'Start typing...',
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextStyle,
      Color,
      FontSize,
      Underline,
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'worksheet-table',
        },
      }),
      TableRow,
      TableCell,
      TableHeader,
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'worksheet-image',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      LineSpacing.configure({
        types: ['paragraph', 'heading'],
        defaultLineHeight: '1.5',
      }),
      IndentExtension.configure({
        types: ['paragraph', 'heading', 'listItem'],
        indentStep: 30,
        maxIndent: 5,
      }),
      PageBreak,
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none ${className}`,
        placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        onUpdate(editor.getHTML(), editor);
      }
    },
  });

  return (
    <div className="tiptap-editor-wrapper">
      <EditorContent editor={editor} />
    </div>
  );
};

export const useTipTapEditor = (
  content: string = '',
  onUpdate?: (html: string) => void
) => {
  const onUpdateRef = React.useRef(onUpdate);

  React.useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  return useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextStyle,
      Color,
      FontSize,
      Underline,
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'worksheet-table',
        },
      }),
      TableRow,
      TableCell,
      TableHeader,
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'worksheet-image',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      LineSpacing.configure({
        types: ['paragraph', 'heading'],
        defaultLineHeight: '1.5',
      }),
      IndentExtension.configure({
        types: ['paragraph', 'heading', 'listItem'],
        indentStep: 30,
        maxIndent: 5,
      }),
      PageBreak,
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      onUpdateRef.current?.(editor.getHTML());
    },
  });
};
