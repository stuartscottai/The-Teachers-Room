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
  WrapText,
  ScanText,
  ChevronDown,
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
  const [showOrderedListMenu, setShowOrderedListMenu] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [currentFontSize, setCurrentFontSize] = useState('12pt');
  const [, forceRerender] = useState(0);
  const [selectionStyle, setSelectionStyle] = useState({
    bold: false,
    italic: false,
    underline: false,
  });

  const colorPickerRef = React.useRef<HTMLDivElement>(null);
  const fontSizePickerRef = React.useRef<HTMLDivElement>(null);
  const lineSpacingPickerRef = React.useRef<HTMLDivElement>(null);
  const orderedListMenuRef = React.useRef<HTMLDivElement>(null);
  const tableMenuRef = React.useRef<HTMLDivElement>(null);

  // Update font size when selection changes
  React.useEffect(() => {
    if (!editor) return;

    let rafId: number | null = null;

    const scheduleRerender = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        forceRerender((n) => n + 1);
      });
    };

    const getComputedStyleAtSelection = () => {
      const { from } = editor.state.selection;
      const { node } = editor.view.domAtPos(from);
      const element =
        node instanceof Element ? node : (node as any)?.parentElement instanceof Element ? (node as any).parentElement : null;
      if (!element) return null;
      return window.getComputedStyle(element as Element);
    };

    const updateToolbarState = () => {
      const attrs = editor.getAttributes('textStyle');

      const computed = getComputedStyleAtSelection();
      const computedFontSizePx = computed ? Number.parseFloat(computed.fontSize || '') : NaN;
      const computedFontSizePt = Number.isFinite(computedFontSizePx)
        ? Math.round(((computedFontSizePx * 72) / 96) * 10) / 10
        : NaN;

      const computedBold = computed
        ? (() => {
            const weight = computed.fontWeight?.toLowerCase?.() ?? '';
            if (weight === 'bold' || weight === 'bolder') return true;
            const numeric = Number.parseInt(weight, 10);
            return Number.isFinite(numeric) && numeric >= 600;
          })()
        : false;

      const computedItalic = computed ? computed.fontStyle === 'italic' || computed.fontStyle === 'oblique' : false;

      const computedUnderline = computed
        ? (computed.textDecorationLine || computed.textDecoration || '').toLowerCase().includes('underline')
        : false;

      setCurrentFontSize(
        attrs.fontSize ||
          (Number.isFinite(computedFontSizePt) ? `${computedFontSizePt}pt` : '12pt')
      );

      setSelectionStyle({
        bold: editor.isActive('bold') || computedBold,
        italic: editor.isActive('italic') || computedItalic,
        underline: editor.isActive('underline') || computedUnderline,
      });
      scheduleRerender();
    };

    editor.on('selectionUpdate', updateToolbarState);
    editor.on('transaction', updateToolbarState);
    updateToolbarState();

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      editor.off('selectionUpdate', updateToolbarState);
      editor.off('transaction', updateToolbarState);
    };
  }, [editor]);

  // Click outside handlers
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
      if (fontSizePickerRef.current && !fontSizePickerRef.current.contains(event.target as Node)) {
        setShowFontSizePicker(false);
      }
      if (lineSpacingPickerRef.current && !lineSpacingPickerRef.current.contains(event.target as Node)) {
        setShowLineSpacingPicker(false);
      }
      if (orderedListMenuRef.current && !orderedListMenuRef.current.contains(event.target as Node)) {
        setShowOrderedListMenu(false);
      }
      if (tableMenuRef.current && !tableMenuRef.current.contains(event.target as Node)) {
        setShowTableMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!editor) {
    return null;
  }

  const getContinueNumberStart = () => {
    const { state } = editor;
    const { $from } = state.selection;

    let currentListPos: number | null = null;
    for (let depth = $from.depth; depth > 0; depth--) {
      const node = $from.node(depth);
      if (node.type.name === 'orderedList') {
        currentListPos = $from.before(depth);
        break;
      }
    }

    if (currentListPos === null) return null;

    let previousList: { start: number; count: number } | null = null;
    state.doc.descendants((node, pos) => {
      if (node.type.name !== 'orderedList') return;
      if (pos >= currentListPos!) return;

      const startAttr =
        (node.attrs as any)?.start ?? (node.attrs as any)?.order ?? 1;
      const start = Number(startAttr) || 1;
      const count = node.childCount;
      previousList = { start, count };
    });

    if (!previousList) return null;
    return previousList.start + previousList.count;
  };

  const applyContinueNumbering = () => {
    const start = getContinueNumberStart();
    if (!start) return;
    editor.chain().focus().updateAttributes('orderedList', { start }).run();
  };

  const restartNumbering = () => {
    editor.chain().focus().updateAttributes('orderedList', { start: 1 }).run();
  };

  const ToolbarButton: React.FC<{
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title?: string;
  }> = ({ onClick, active, disabled, children, title }) => (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
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
        <ToolbarButton
          onClick={() => editor.chain().focus().selectAll().run()}
          title="Select All (Ctrl+A)"
        >
          <ScanText size={18} />
        </ToolbarButton>
      </div>

      {/* Text Formatting */}
      <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={selectionStyle.bold}
          title="Bold (Ctrl+B)"
        >
          <Bold size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={selectionStyle.italic}
          title="Italic (Ctrl+I)"
        >
          <Italic size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={selectionStyle.underline}
          title="Underline (Ctrl+U)"
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
        <div className="relative" ref={orderedListMenuRef}>
          <div className="flex items-center">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive('orderedList')}
              title="Numbered List"
            >
              <ListOrdered size={18} />
            </ToolbarButton>
            <button
              type="button"
              title="Numbered list options"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={() => setShowOrderedListMenu((v) => !v)}
              className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-700"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {showOrderedListMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-20 min-w-[210px] overflow-hidden">
              <button
                type="button"
                className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => {
                  editor.chain().focus().toggleOrderedList().run();
                  setShowOrderedListMenu(false);
                }}
              >
                Toggle numbered list
              </button>
              <button
                type="button"
                disabled={!editor.isActive('orderedList') || !getContinueNumberStart()}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm disabled:opacity-50 disabled:hover:bg-white"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => {
                  applyContinueNumbering();
                  setShowOrderedListMenu(false);
                }}
              >
                Continue numbering from previous
              </button>
              <button
                type="button"
                disabled={!editor.isActive('orderedList')}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm disabled:opacity-50 disabled:hover:bg-white"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => {
                  restartNumbering();
                  setShowOrderedListMenu(false);
                }}
              >
                Restart numbering at 1
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Indentation - Paragraph Level */}
      <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
        <ToolbarButton
          onClick={() => editor.chain().focus().outdent().run()}
          title="Decrease Paragraph Indent"
        >
          <Outdent size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().indent().run()}
          title="Increase Paragraph Indent"
        >
          <Indent size={18} />
        </ToolbarButton>
      </div>

      {/* Inline Font Size */}
      <div className="relative border-r border-gray-300 pr-2" ref={fontSizePickerRef}>
        <button
          type="button"
          onClick={() => setShowFontSizePicker(!showFontSizePicker)}
          onMouseDown={(e) => e.preventDefault()}
          title="Text Font Size"
          className="px-3 py-2 rounded hover:bg-gray-100 transition-colors text-gray-700 font-medium text-sm flex items-center gap-1"
        >
          <Type size={16} />
          <span className="text-xs">{currentFontSize}</span>
        </button>
        {showFontSizePicker && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 min-w-[100px]">
            {['8pt', '9pt', '10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '20pt', '24pt', '28pt', '32pt'].map((size) => {
              const isActive = currentFontSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  className={`w-full px-4 py-2 text-left hover:bg-gray-100 ${isActive ? 'bg-blue-50 text-blue-700' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    editor.chain().focus().setFontSize(size).run();
                    setShowFontSizePicker(false);
                  }}
                >
                  {size}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Text Color */}
      <div className="relative border-r border-gray-300 pr-2" ref={colorPickerRef}>
        <ToolbarButton
          onClick={() => setShowColorPicker(!showColorPicker)}
          title="Text Color"
        >
          <Palette size={18} />
        </ToolbarButton>
            {showColorPicker && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 p-4 w-64">
            {/* Theme Colors */}
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Theme Colors</h4>
              <div className="grid grid-cols-10 gap-1">
                {[
                  // Row 1: Main theme colors
                  '#FFFFFF', '#000000', '#E7E5E4', '#44403C', '#1C4ED8', '#0891B2', '#EA580C', '#16A34A', '#0EA5E9', '#A855F7',
                  // Row 2: 80% tint
                  '#F5F5F4', '#292524', '#D6D3D1', '#57534E', '#3B82F6', '#06B6D4', '#F97316', '#22C55E', '#38BDF8', '#C084FC',
                  // Row 3: 60% tint
                  '#E7E5E4', '#44403C', '#A8A29E', '#78716C', '#60A5FA', '#22D3EE', '#FB923C', '#4ADE80', '#7DD3FC', '#D8B4FE',
                  // Row 4: 40% tint
                  '#D6D3D1', '#57534E', '#78716C', '#A8A29E', '#93C5FD', '#67E8F9', '#FDBA74', '#86EFAC', '#BAE6FD', '#E9D5FF',
                  // Row 5: Lighter tints
                  '#A8A29E', '#78716C', '#57534E', '#D6D3D1', '#DBEAFE', '#CFFAFE', '#FED7AA', '#BBF7D0', '#E0F2FE', '#F3E8FF',
                ].map((color, idx) => (
                  <button
                    key={`theme-${idx}`}
                    type="button"
                    className="w-5 h-5 rounded border border-gray-300 hover:border-gray-500 transition-colors"
                    style={{ backgroundColor: color }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      editor.chain().focus().setColor(color).run();
                      setShowColorPicker(false);
                    }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Standard Colors */}
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Standard Colors</h4>
              <div className="grid grid-cols-10 gap-1">
                {[
                  '#C00000', '#FF0000', '#FFC000', '#FFFF00', '#92D050', '#00B050', '#00B0F0', '#0070C0', '#002060', '#7030A0',
                ].map((color, idx) => (
                  <button
                    key={`standard-${idx}`}
                    type="button"
                    className="w-5 h-5 rounded border border-gray-300 hover:border-gray-500 transition-colors"
                    style={{ backgroundColor: color }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      editor.chain().focus().setColor(color).run();
                      setShowColorPicker(false);
                    }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Automatic/Reset button */}
            <button
              type="button"
              className="w-full mt-3 px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.chain().focus().unsetColor().run();
                setShowColorPicker(false);
              }}
            >
              Automatic (Black)
            </button>
          </div>
        )}
      </div>

      {/* Line Spacing */}
      <div className="relative border-r border-gray-300 pr-2" ref={lineSpacingPickerRef}>
        <ToolbarButton
          onClick={() => setShowLineSpacingPicker(!showLineSpacingPicker)}
          title="Line Spacing"
        >
          <WrapText size={18} />
        </ToolbarButton>
        {showLineSpacingPicker && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 min-w-[120px]">
            <button
              type="button"
              className="w-full px-4 py-2 text-left hover:bg-gray-100"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.chain().focus().setLineSpacing('1').run();
                setShowLineSpacingPicker(false);
              }}
            >
              Single
            </button>
            <button
              type="button"
              className="w-full px-4 py-2 text-left hover:bg-gray-100"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.chain().focus().setLineSpacing('1.15').run();
                setShowLineSpacingPicker(false);
              }}
            >
              1.15
            </button>
            <button
              type="button"
              className="w-full px-4 py-2 text-left hover:bg-gray-100"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.chain().focus().setLineSpacing('1.5').run();
                setShowLineSpacingPicker(false);
              }}
            >
              1.5
            </button>
            <button
              type="button"
              className="w-full px-4 py-2 text-left hover:bg-gray-100"
              onMouseDown={(e) => e.preventDefault()}
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
      <div className="flex items-center gap-1 border-r border-gray-300 pr-2" ref={tableMenuRef}>
        <ToolbarButton
          onClick={() => {
            const rows = prompt('How many rows?', '3');
            const cols = prompt('How many columns?', '3');
            if (rows && cols) {
              const numRows = parseInt(rows, 10);
              const numCols = parseInt(cols, 10);
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
        <button
          type="button"
          title="Table options"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={() => setShowTableMenu((v) => !v)}
          className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-700"
        >
          <ChevronDown size={16} />
        </button>

        {showTableMenu && (
          <div className="absolute mt-10 bg-white border border-gray-200 rounded shadow-lg z-30 min-w-[240px] overflow-hidden">
            <div className="px-3 py-2 text-[11px] font-bold text-gray-500 border-b border-gray-100">
              Table
            </div>

            <button
              type="button"
              className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={() => {
                const rows = prompt('How many rows?', '3');
                const cols = prompt('How many columns?', '3');
                if (rows && cols) {
                  const numRows = parseInt(rows, 10);
                  const numCols = parseInt(cols, 10);
                  if (numRows > 0 && numCols > 0) {
                    editor
                      .chain()
                      .focus()
                      .insertTable({ rows: numRows, cols: numCols, withHeaderRow: true })
                      .run();
                  }
                }
                setShowTableMenu(false);
              }}
            >
              Insert table…
            </button>

            <div className="border-t border-gray-100" />

            {[
              { label: 'Add row above', run: () => editor.chain().focus().addRowBefore().run(), can: () => editor.can().addRowBefore() },
              { label: 'Add row below', run: () => editor.chain().focus().addRowAfter().run(), can: () => editor.can().addRowAfter() },
              { label: 'Delete row', run: () => editor.chain().focus().deleteRow().run(), can: () => editor.can().deleteRow() },
              { label: 'Add column left', run: () => editor.chain().focus().addColumnBefore().run(), can: () => editor.can().addColumnBefore() },
              { label: 'Add column right', run: () => editor.chain().focus().addColumnAfter().run(), can: () => editor.can().addColumnAfter() },
              { label: 'Delete column', run: () => editor.chain().focus().deleteColumn().run(), can: () => editor.can().deleteColumn() },
              { label: 'Toggle header row', run: () => editor.chain().focus().toggleHeaderRow().run(), can: () => editor.can().toggleHeaderRow() },
              { label: 'Toggle header column', run: () => editor.chain().focus().toggleHeaderColumn().run(), can: () => editor.can().toggleHeaderColumn() },
              { label: 'Merge cells', run: () => editor.chain().focus().mergeCells().run(), can: () => editor.can().mergeCells() },
              { label: 'Split cell', run: () => editor.chain().focus().splitCell().run(), can: () => editor.can().splitCell() },
              { label: 'Delete table', run: () => editor.chain().focus().deleteTable().run(), can: () => editor.can().deleteTable() },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                disabled={!editor.isActive('table') || !item.can()}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm disabled:opacity-50 disabled:hover:bg-white"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => {
                  item.run();
                  setShowTableMenu(false);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Image */}
      {onImageUpload && (
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
          <ToolbarButton onClick={onImageUpload} title="Insert Image">
            <ImageIcon size={18} />
          </ToolbarButton>
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
