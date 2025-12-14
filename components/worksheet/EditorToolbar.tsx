import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Image as ImageIcon,
  Table,
  Scissors,
  Type,
  Palette,
  Minus,
  Undo,
  Redo,
  Maximize2,
  Minimize2,
  WrapText,
} from 'lucide-react';

export interface EditorToolbarProps {
  editor: Editor | null;
  onImageUpload?: () => void;
  className?: string;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  onImageUpload,
  className = '',
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [showLineSpacingPicker, setShowLineSpacingPicker] = useState(false);

  if (!editor) {
    return null;
  }

  const ToolbarButton: React.FC<{
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title?: string;
  }> = ({ onClick, active, disabled, children, title }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded hover:bg-gray-100 transition-colors ${
        active ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );

  return (
    <div
      className={`flex flex-wrap items-center gap-1 p-2 bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}
    >
      {/* Undo/Redo */}
      <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Ctrl+Z)"
        >
          <Undo size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Ctrl+Y)"
        >
          <Redo size={18} />
        </ToolbarButton>
      </div>

      {/* Text Formatting */}
      <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold (Ctrl+B)"
        >
          <Bold size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic (Ctrl+I)"
        >
          <Italic size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Underline size={18} />
        </ToolbarButton>
      </div>

      {/* Text Alignment */}
      <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          active={editor.isActive({ textAlign: 'left' })}
          title="Align Left"
        >
          <AlignLeft size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          active={editor.isActive({ textAlign: 'center' })}
          title="Align Center"
        >
          <AlignCenter size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          active={editor.isActive({ textAlign: 'right' })}
          title="Align Right"
        >
          <AlignRight size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          active={editor.isActive({ textAlign: 'justify' })}
          title="Justify"
        >
          <AlignJustify size={18} />
        </ToolbarButton>
      </div>

      {/* Lists */}
      <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered size={18} />
        </ToolbarButton>
      </div>

      {/* Indentation */}
      <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
        <ToolbarButton
          onClick={() => editor.chain().focus().outdent().run()}
          title="Decrease Indent (Shift+Tab)"
        >
          <Outdent size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().indent().run()}
          title="Increase Indent (Tab)"
        >
          <Indent size={18} />
        </ToolbarButton>
      </div>

      {/* Inline Font Size */}
      <div className="relative border-r border-gray-300 pr-2">
        <button
          onClick={() => setShowFontSizePicker(!showFontSizePicker)}
          title="Text Font Size"
          className="px-3 py-2 rounded hover:bg-gray-100 transition-colors text-gray-700 font-medium text-sm flex items-center gap-1"
        >
          <Type size={16} />
          <span className="text-xs">Size</span>
        </button>
        {showFontSizePicker && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 min-w-[100px]">
            {['8pt', '9pt', '10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '20pt', '24pt', '28pt', '32pt'].map((size) => (
              <button
                key={size}
                className="w-full px-4 py-2 text-left hover:bg-gray-100"
                onClick={() => {
                  editor.chain().focus().setFontSize(size).run();
                  setShowFontSizePicker(false);
                }}
              >
                {size}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Text Color */}
      <div className="relative border-r border-gray-300 pr-2">
        <ToolbarButton
          onClick={() => setShowColorPicker(!showColorPicker)}
          title="Text Color"
        >
          <Palette size={18} />
        </ToolbarButton>
        {showColorPicker && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 p-3">
            <div className="grid grid-cols-5 gap-2">
              {['#000000', '#DC2626', '#EA580C', '#D97706', '#65A30D', '#059669', '#0891B2', '#2563EB', '#7C3AED', '#C026D3'].map((color) => (
                <button
                  key={color}
                  className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-500 transition-colors"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    editor.chain().focus().setColor(color).run();
                    setShowColorPicker(false);
                  }}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Line Spacing */}
      <div className="relative border-r border-gray-300 pr-2">
        <ToolbarButton
          onClick={() => setShowLineSpacingPicker(!showLineSpacingPicker)}
          title="Line Spacing"
        >
          <WrapText size={18} />
        </ToolbarButton>
        {showLineSpacingPicker && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 min-w-[120px]">
            <button
              className="w-full px-4 py-2 text-left hover:bg-gray-100"
              onClick={() => {
                editor.chain().focus().setLineSpacing('1').run();
                setShowLineSpacingPicker(false);
              }}
            >
              Single
            </button>
            <button
              className="w-full px-4 py-2 text-left hover:bg-gray-100"
              onClick={() => {
                editor.chain().focus().setLineSpacing('1.15').run();
                setShowLineSpacingPicker(false);
              }}
            >
              1.15
            </button>
            <button
              className="w-full px-4 py-2 text-left hover:bg-gray-100"
              onClick={() => {
                editor.chain().focus().setLineSpacing('1.5').run();
                setShowLineSpacingPicker(false);
              }}
            >
              1.5
            </button>
            <button
              className="w-full px-4 py-2 text-left hover:bg-gray-100"
              onClick={() => {
                editor.chain().focus().setLineSpacing('2').run();
                setShowLineSpacingPicker(false);
              }}
            >
              Double
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
        <ToolbarButton
          onClick={() => {
            const rows = prompt('How many rows?', '3');
            const cols = prompt('How many columns?', '3');
            if (rows && cols) {
              const numRows = parseInt(rows);
              const numCols = parseInt(cols);
              if (numRows > 0 && numCols > 0) {
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: numRows, cols: numCols, withHeaderRow: true })
                  .run();
              }
            }
          }}
          title="Insert Table"
        >
          <Table size={18} />
        </ToolbarButton>
      </div>

      {/* Image */}
      {onImageUpload && (
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
          <ToolbarButton onClick={onImageUpload} title="Insert Image">
            <ImageIcon size={18} />
          </ToolbarButton>
          {editor.isActive('image') && (
            <>
              <ToolbarButton
                onClick={() => {
                  const currentAttrs = editor.getAttributes('image');
                  const currentWidth = parseInt(currentAttrs.width || '400');
                  editor.chain().focus().updateAttributes('image', {
                    width: `${Math.min(currentWidth + 50, 800)}px`
                  }).run();
                }}
                title="Increase Image Size"
              >
                <Maximize2 size={18} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => {
                  const currentAttrs = editor.getAttributes('image');
                  const currentWidth = parseInt(currentAttrs.width || '400');
                  editor.chain().focus().updateAttributes('image', {
                    width: `${Math.max(currentWidth - 50, 100)}px`
                  }).run();
                }}
                title="Decrease Image Size"
              >
                <Minimize2 size={18} />
              </ToolbarButton>
            </>
          )}
        </div>
      )}

      {/* Page Break */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().setPageBreak().run()}
          title="Insert Page Break (Ctrl+Enter)"
        >
          <Minus size={18} />
        </ToolbarButton>
      </div>
    </div>
  );
};
