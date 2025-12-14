/**
 * Updated WorksheetBuilder component with TipTap integration
 * This replaces the EditablePreview and old toolbar system
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { WorksheetConfig, GeneratedWorksheet, UploadedFile } from '../../types';
import { useTipTapEditor } from './TipTapEditor';
import { EditorContent } from '@tiptap/react';
import { EditorToolbar } from './EditorToolbar';
import { MobileToolbar } from './MobileToolbar';
import { generatePDF, generateDOCX, downloadFile, PDFMetadata } from '../../utils/worksheetPDF';
import { Printer, Download, Save, ZoomIn, ZoomOut, Check, ChevronUp, ChevronDown, X, AlertTriangle, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { saveWorksheetToLibrary } from '../../utils/gameUtils';
import { MultiPageEditor } from './MultiPageEditor';

interface WorksheetEditorProps {
  generatedWs: GeneratedWorksheet | null;
  setGeneratedWs: React.Dispatch<React.SetStateAction<GeneratedWorksheet | null>>;
  config: WorksheetConfig;
  fontSize: number;
  setFontSize: React.Dispatch<React.SetStateAction<number>>;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  logoUrl: string | null;
  logoPos: { x: number; y: number };
  logoWidth: number;
  onLogoDrag: (e: React.MouseEvent) => void;
  isPublic: boolean;
}

export const WorksheetEditorSection: React.FC<WorksheetEditorProps> = ({
  generatedWs,
  setGeneratedWs,
  config,
  fontSize,
  setFontSize,
  zoom,
  setZoom,
  logoUrl,
  logoPos,
  logoWidth,
  onLogoDrag,
  isPublic,
}) => {
  const { user } = useAuth();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingDOCX, setIsGeneratingDOCX] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize TipTap editor
  const editor = useTipTapEditor(
    generatedWs?.content || '',
    (html) => {
      if (generatedWs) {
        setGeneratedWs({ ...generatedWs, content: html });
      }
    }
  );

  // Update editor content when worksheet changes
  useEffect(() => {
    if (editor && generatedWs?.content && editor.getHTML() !== generatedWs.content) {
      editor.commands.setContent(generatedWs.content);
    }
  }, [generatedWs?.content, editor]);

  const handleSave = async () => {
    if (!generatedWs || !user) return;

    setSaveStatus('saving');
    try {
      await saveWorksheetToLibrary({
        ...generatedWs,
        content: editor?.getHTML() || generatedWs.content,
        config: { ...config, isPublic },
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save:', error);
      setSaveStatus('idle');
      alert('Failed to save worksheet');
    }
  };

  const handleExportPDF = async (includeAnswerKey: boolean) => {
    if (!editor || !containerRef.current) {
      console.error('Editor or container ref is null - cannot export PDF');
      return;
    }

    setIsGeneratingPDF(true);
    setPdfProgress(0);

    try {
      // Find the actual worksheet-page-content element that has the padding (matches PDF structure)
      const worksheetElement = containerRef.current.querySelector('.worksheet-page-content');

      if (!worksheetElement) {
        throw new Error('Could not find worksheet preview element');
      }

      console.log('=== Export PDF Handler (Direct DOM) ===');
      console.log('Capturing actual preview element');
      console.log('Element dimensions:', worksheetElement.clientWidth, 'x', worksheetElement.scrollHeight);

      const metadata: PDFMetadata = {
        headerContent: '',
        footerContent: '',
        logoUrl: logoUrl,
        logoPos: logoPos,
        logoSize: { width: logoWidth, height: logoWidth },
        fontSize: fontSize,
      };

      // Pass the ACTUAL DOM element for 100% WYSIWYG
      const blob = await generatePDF(worksheetElement as HTMLElement, metadata, setPdfProgress);
      downloadFile(blob, `${generatedWs?.title || 'worksheet'}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleExportDOCX = async () => {
    if (!editor) {
      console.error('Editor is null - cannot export DOCX');
      return;
    }

    setIsGeneratingDOCX(true);

    try {
      const content = editor.getHTML();
      console.log('=== Export DOCX Handler ===');
      console.log('Editor exists:', !!editor);
      console.log('Content length:', content.length);
      console.log('Content preview:', content.substring(0, 300));
      console.log('Title:', generatedWs?.title);
      console.log('Font size:', fontSize);

      const blob = await generateDOCX(content, generatedWs?.title || 'Worksheet', fontSize);
      downloadFile(blob, `${generatedWs?.title || 'worksheet'}.docx`);
    } catch (error) {
      console.error('DOCX generation failed:', error);
      alert('Failed to generate DOCX. Please try again.');
    } finally {
      setIsGeneratingDOCX(false);
    }
  };

  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && editor) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const base64 = ev.target?.result as string;
          editor.chain().focus().setImage({ src: base64 }).run();
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  if (!generatedWs) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center text-slate-400">
          <FileText size={64} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg">Generate a worksheet to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <style>{TIPTAP_EDITOR_CSS}</style>

      {/* Action Bar - Sticky */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-slate-800">{generatedWs.title}</h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="hidden md:flex items-center gap-2 border-r border-slate-200 pr-3">
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              className="p-2 hover:bg-slate-100 rounded transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={18} />
            </button>
            <span className="text-sm font-medium text-slate-600 w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}
              className="p-2 hover:bg-slate-100 rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={18} />
            </button>
          </div>

          {/* Export Buttons */}
          <button
            onClick={handleExportDOCX}
            disabled={isGeneratingDOCX}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Download size={16} />
            <span className="hidden sm:inline">
              {isGeneratingDOCX ? 'Generating...' : 'DOCX'}
            </span>
          </button>

          <div className="relative">
            <button
              onClick={() => handleExportPDF(false)}
              disabled={isGeneratingPDF}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Printer size={16} />
              <span className="hidden sm:inline">
                {isGeneratingPDF ? `${Math.round(pdfProgress)}%` : 'PDF'}
              </span>
            </button>
          </div>

          {user && (
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saveStatus === 'saved' ? (
                <>
                  <Check size={16} />
                  <span className="hidden sm:inline">Saved</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span className="hidden sm:inline">
                    {saveStatus === 'saving' ? 'Saving...' : 'Save'}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Desktop Toolbar - Sticky */}
      <div className="hidden md:block sticky top-[61px] z-20 px-4 py-2 bg-slate-50 border-b border-slate-200">
        <EditorToolbar
          editor={editor}
          onImageUpload={handleImageUpload}
        />
      </div>

      {/* Mobile Toolbar (FAB) */}
      <div className="md:hidden">
        <MobileToolbar editor={editor} onImageUpload={handleImageUpload} />
      </div>

      {/* Editor Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-slate-100 p-4"
        id="preview-wrapper"
      >
        <MultiPageEditor
          editor={editor}
          fontSize={fontSize}
          zoom={zoom}
          logoUrl={logoUrl}
          logoPos={logoPos}
          logoWidth={logoWidth}
          onLogoDrag={onLogoDrag}
        />

        {/* Answer Key Section */}
        {generatedWs.answerKey && (
          <div className="max-w-[210mm] mx-auto mt-6">
            <button
              onClick={() => setShowAnswerKey(!showAnswerKey)}
              className="flex items-center justify-between w-full px-4 py-3 bg-amber-50 hover:bg-amber-100 rounded-lg font-bold text-amber-800 transition-colors border-2 border-dashed border-amber-300"
            >
              <span className="flex items-center gap-2">
                <Check size={20} />
                Answer Key
              </span>
              {showAnswerKey ? <ChevronUp /> : <ChevronDown />}
            </button>

            {showAnswerKey && (
              <div
                className="mt-3 p-6 bg-yellow-50 rounded-lg border-l-4 border-yellow-400"
                dangerouslySetInnerHTML={{ __html: generatedWs.answerKey }}
              />
            )}

            {/* Export with Answer Key Button */}
            {showAnswerKey && (
              <button
                onClick={() => handleExportPDF(true)}
                disabled={isGeneratingPDF}
                className="mt-3 w-full px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Printer size={16} />
                Export PDF with Answer Key
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const TIPTAP_EDITOR_CSS = `
  /* Override Tailwind prose max-width */
  .prose, .prose-sm, .prose-lg, .prose-xl {
    max-width: none !important;
  }

  .ProseMirror {
    outline: none;
    min-height: 200px;
    font-size: 11pt;
    width: 100% !important;
    max-width: none !important;
    box-sizing: border-box;
  }

  .ProseMirror p {
    margin: 0.5rem 0;
    font-size: inherit;
    width: 100%;
    max-width: 100%;
    page-break-inside: avoid;
    orphans: 2;
    widows: 2;
  }

  .ProseMirror h1, .ProseMirror h2, .ProseMirror h3 {
    margin: 1rem 0 0.5rem 0;
    font-weight: 600;
    width: 100%;
    max-width: 100%;
    page-break-after: avoid;
    page-break-inside: avoid;
  }

  .ProseMirror strong {
    font-weight: 700;
  }

  .ProseMirror em {
    font-style: italic;
  }

  .ProseMirror u {
    text-decoration: underline;
  }

  .ProseMirror ul, .ProseMirror ol {
    padding-left: 1.5rem;
    margin: 0.5rem 0;
    list-style-position: outside;
    page-break-inside: avoid;
  }

  .ProseMirror li {
    margin-bottom: 0.25rem;
    page-break-inside: avoid;
  }

  .worksheet-table {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
    page-break-inside: avoid;
  }

  .worksheet-table td,
  .worksheet-table th {
    border: 1px solid #cbd5e1;
    padding: 0.5rem;
    text-align: left;
    min-width: 50px;
    page-break-inside: avoid;
  }

  .worksheet-table th {
    background-color: #f1f5f9;
    font-weight: 600;
  }

  .worksheet-image {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 1rem 0;
    page-break-inside: avoid;
  }

  .page-break-indicator {
    height: 40px;
    margin: 20px 0;
    background: repeating-linear-gradient(
      45deg, #fff7ed, #fff7ed 10px,
      #ffedd5 10px, #ffedd5 20px
    );
    border: 2px dashed #f97316;
    display: flex;
    align-items: center;
    justify-center;
    color: #f97316;
    font-weight: bold;
    user-select: none;
  }

  @media print {
    .page-break-indicator {
      height: 0 !important;
      border: none !important;
      page-break-after: always !important;
    }
  }

  .ws-logo-container:active {
    cursor: grabbing;
  }
`;
