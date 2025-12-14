import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Type,
  X,
  Table,
  Image as ImageIcon,
  Minus,
} from 'lucide-react';

export interface MobileToolbarProps {
  editor: Editor | null;
  onImageUpload?: () => void;
}

export const MobileToolbar: React.FC<MobileToolbarProps> = ({
  editor,
  onImageUpload,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [, forceRerender] = useState(0);

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

    editor.on('selectionUpdate', scheduleRerender);
    editor.on('transaction', scheduleRerender);

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      editor.off('selectionUpdate', scheduleRerender);
      editor.off('transaction', scheduleRerender);
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  const ToolButton: React.FC<{
    onClick: () => void;
    active?: boolean;
    icon: React.ReactNode;
    label: string;
  }> = ({ onClick, active, icon, label }) => (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-3 rounded-lg transition-colors ${
        active
          ? 'bg-blue-100 text-blue-700'
          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
      }`}
    >
      {icon}
      <span className="text-xs mt-1">{label}</span>
    </button>
  );

  return (
    <>
      {/* Floating Action Button */}
      <button
        className="fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full bg-blue-600 shadow-lg flex items-center justify-center text-white hover:bg-blue-700 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle formatting toolbar"
      >
        {isOpen ? <X size={24} /> : <Type size={24} />}
      </button>

      {/* Bottom Sheet */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-25 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-40 max-h-[70vh] overflow-y-auto"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">
                  Formatting Tools
                </h3>
              </div>

              {/* Toolbar Content */}
              <div className="p-4 space-y-6">
                {/* Text Formatting */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Text Style
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
                    <ToolButton
                      icon={<Bold size={20} />}
                      label="Bold"
                      active={editor.isActive('bold')}
                      onClick={() => {
                        editor.chain().focus().toggleBold().run();
                      }}
                    />
                    <ToolButton
                      icon={<Italic size={20} />}
                      label="Italic"
                      active={editor.isActive('italic')}
                      onClick={() => {
                        editor.chain().focus().toggleItalic().run();
                      }}
                    />
                    <ToolButton
                      icon={<Underline size={20} />}
                      label="Strike"
                      active={editor.isActive('strike')}
                      onClick={() => {
                        editor.chain().focus().toggleStrike().run();
                      }}
                    />
                  </div>
                </div>

                {/* Alignment */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Alignment
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <ToolButton
                      icon={<AlignLeft size={20} />}
                      label="Left"
                      active={editor.isActive({ textAlign: 'left' })}
                      onClick={() => {
                        editor.chain().focus().setTextAlign('left').run();
                      }}
                    />
                    <ToolButton
                      icon={<AlignCenter size={20} />}
                      label="Center"
                      active={editor.isActive({ textAlign: 'center' })}
                      onClick={() => {
                        editor.chain().focus().setTextAlign('center').run();
                      }}
                    />
                    <ToolButton
                      icon={<AlignRight size={20} />}
                      label="Right"
                      active={editor.isActive({ textAlign: 'right' })}
                      onClick={() => {
                        editor.chain().focus().setTextAlign('right').run();
                      }}
                    />
                  </div>
                </div>

                {/* Lists */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Lists
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <ToolButton
                      icon={<List size={20} />}
                      label="Bullet"
                      active={editor.isActive('bulletList')}
                      onClick={() => {
                        editor.chain().focus().toggleBulletList().run();
                      }}
                    />
                    <ToolButton
                      icon={<ListOrdered size={20} />}
                      label="Numbered"
                      active={editor.isActive('orderedList')}
                      onClick={() => {
                        editor.chain().focus().toggleOrderedList().run();
                      }}
                    />
                  </div>
                </div>

                {/* Line Spacing */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Line Spacing
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
                    {['1', '1.15', '1.5', '2'].map((spacing) => (
                      <button
                        key={spacing}
                        onClick={() => {
                          editor.chain().focus().setLineSpacing(spacing).run();
                        }}
                        className="px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-medium"
                      >
                        {spacing === '1'
                          ? 'Single'
                          : spacing === '2'
                          ? 'Double'
                          : spacing}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Insert */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Insert
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <ToolButton
                      icon={<Table size={20} />}
                      label="Table"
                      active={false}
                      onClick={() => {
                        editor
                          .chain()
                          .focus()
                          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                          .run();
                        setIsOpen(false);
                      }}
                    />
                    {onImageUpload && (
                      <ToolButton
                        icon={<ImageIcon size={20} />}
                        label="Image"
                        active={false}
                        onClick={() => {
                          onImageUpload();
                          setIsOpen(false);
                        }}
                      />
                    )}
                    <ToolButton
                      icon={<Minus size={20} />}
                      label="Page Break"
                      active={false}
                      onClick={() => {
                        editor.chain().focus().setPageBreak().run();
                        setIsOpen(false);
                      }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
