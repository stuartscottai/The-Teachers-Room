/**
 * Updated WorksheetBuilder component with TipTap integration
 * This replaces the EditablePreview and old toolbar system
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { WorksheetConfig, GeneratedWorksheet, UploadedFile } from '../../types';
import { useTipTapEditor } from './TipTapEditor';
import { EditorContent } from '@tiptap/react';
import { EditorToolbar } from './EditorToolbar';
import { MobileToolbar } from './MobileToolbar';
import { generatePDF, generateDOCX, downloadFile, PDFMetadata } from '../../utils/worksheetPDF';
import { Printer, Download, Save, ZoomIn, ZoomOut, Check, ChevronUp, ChevronDown, X, AlertTriangle, FileText, Globe, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { saveWorksheetToLibrary } from '../../utils/gameUtils';
import { MultiPageEditor } from './MultiPageEditor';
import { normalizeHtmlForTiptap } from '../../utils/normalizeHtmlForTiptap';
import { optimizeImageForUpload } from '../../utils/imageOptimize';
import { uploadWorksheetAsset, createSignedUrlForWorksheetAsset, createSignedUrlsForWorksheetAssets, stripSignedUrlsButKeepStoragePaths } from '../../utils/worksheetAssetStorage';

interface WorksheetEditorProps {
  generatedWs: GeneratedWorksheet | null;
  setGeneratedWs: React.Dispatch<React.SetStateAction<GeneratedWorksheet | null>>;
  config: WorksheetConfig;
  fontSize: number;
  setFontSize: React.Dispatch<React.SetStateAction<number>>;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  logoUrl: string | null;
  logoStoragePath?: string | null;
  logoPos: { x: number; y: number };
  logoWidth: number;
  logoHeight: number;
  onLogoDrag: (e: React.MouseEvent) => void;
  onLogoResize: (e: React.MouseEvent, handle: 'e' | 'w' | 'n' | 's' | 'ne' | 'nw' | 'se' | 'sw') => void;
  logoSelected: boolean;
  onLogoSelect: (selected: boolean) => void;
  onLogoRemove: () => void;
  isPublic: boolean;
  onTogglePublic?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
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
  logoStoragePath,
  logoPos,
  logoWidth,
  logoHeight,
  onLogoDrag,
  onLogoResize,
  logoSelected,
  onLogoSelect,
  onLogoRemove,
  isPublic,
  onTogglePublic,
  onDirtyChange,
}) => {
  const { user } = useAuth();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingDOCX, setIsGeneratingDOCX] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastEditorHtmlRef = useRef<string | null>(null);
  const isPreviewZoomActive = zoom > 1.001;
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const zoomTargetRef = useRef<HTMLDivElement>(null);
  const fixedHScrollRef = useRef<HTMLDivElement>(null);
  const fixedHScrollInnerRef = useRef<HTMLDivElement>(null);
  const isSyncingScrollRef = useRef<'preview' | 'fixed' | null>(null);
  const [showFixedHScroll, setShowFixedHScroll] = useState(false);
  const [fixedHScrollRect, setFixedHScrollRect] = useState<{ left: number; width: number } | null>(null);
  const lastSavedHtmlRef = useRef<string>('');
  const dirtyRef = useRef(false);

  // Initialize TipTap editor
  const editor = useTipTapEditor(
    generatedWs?.content || '',
    (html) => {
      lastEditorHtmlRef.current = html;
      setGeneratedWs((prev) => (prev ? { ...prev, content: html } : prev));

      const nextDirty = html !== lastSavedHtmlRef.current;
      if (dirtyRef.current !== nextDirty) {
        dirtyRef.current = nextDirty;
        onDirtyChange?.(nextDirty);
      }
    }
  );

  // Update editor content when worksheet changes
  useEffect(() => {
    if (!editor || !generatedWs) return;

    if (generatedWs.content && generatedWs.content === lastEditorHtmlRef.current) {
      return;
    }

    const normalized = normalizeHtmlForTiptap(generatedWs.content);
    if (normalized && editor.getHTML() !== normalized) {
      editor.commands.setContent(normalized);
    }

    lastSavedHtmlRef.current = normalized || editor.getHTML() || '';
    if (dirtyRef.current) {
      dirtyRef.current = false;
      onDirtyChange?.(false);
    }
  }, [generatedWs?.content, generatedWs?.id, editor]);

  const updateHorizontalScrollbar = useCallback(() => {
    const preview = previewScrollRef.current;

    const shouldShow = zoom > 1.001;
    setShowFixedHScroll(shouldShow);
    if (!shouldShow) return;

    const zoomTarget = zoomTargetRef.current;
    const fixed = fixedHScrollRef.current;
    const inner = fixedHScrollInnerRef.current;
    if (!preview || !zoomTarget || !fixed || !inner) return;

    const zoomTargetWidth = zoomTarget ? zoomTarget.getBoundingClientRect().width : 0;
    const baseWidth = preview.clientWidth || 0;
    const expectedZoomedWidth = Math.ceil(baseWidth * Math.max(zoom, 1));
    const scrollWidth = Math.max(preview.scrollWidth, Math.ceil(zoomTargetWidth), expectedZoomedWidth);
    inner.style.width = `${scrollWidth}px`;

    if (isSyncingScrollRef.current !== 'preview') {
      fixed.scrollLeft = preview.scrollLeft;
    }

    const previewRect = preview.getBoundingClientRect();
    if (previewRect.width > 0) {
      setFixedHScrollRect({
        left: Math.max(0, previewRect.left),
        width: Math.max(0, Math.min(previewRect.width, window.innerWidth)),
      });
    }
  }, [zoom]);

  useEffect(() => {
    updateHorizontalScrollbar();

    const preview = previewScrollRef.current;
    if (!preview) return;

    const onResize = () => updateHorizontalScrollbar();
    window.addEventListener('resize', onResize);

    const ro = new ResizeObserver(() => {
      window.requestAnimationFrame(updateHorizontalScrollbar);
    });
    ro.observe(preview);

    return () => {
      window.removeEventListener('resize', onResize);
      ro.disconnect();
    };
  }, [updateHorizontalScrollbar, zoom, fontSize, generatedWs?.content, logoUrl, logoPos.x, logoPos.y, logoWidth, logoHeight]);

  useEffect(() => {
    updateHorizontalScrollbar();
  }, [showFixedHScroll, updateHorizontalScrollbar]);

  useEffect(() => {
    if (!showFixedHScroll) return;

    let rafId: number | null = null;
    const tick = () => {
      const preview = previewScrollRef.current;
      if (preview) {
        const rect = preview.getBoundingClientRect();
        if (rect.width > 0) {
          setFixedHScrollRect({
            left: Math.max(0, rect.left),
            width: Math.max(0, Math.min(rect.width, window.innerWidth)),
          });
        }
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [showFixedHScroll]);

  const handleSave = async () => {
    if (!generatedWs || !user) return;

    setSaveStatus('saving');
    try {
      const rawHtml = editor?.getHTML() || generatedWs.content;
      const shouldStrip =
        Boolean(user) &&
        (config.storeWorksheetAssets ?? true) &&
        typeof rawHtml === 'string' &&
        rawHtml.includes('data-storage-path');
      const safeHtml = shouldStrip ? stripSignedUrlsButKeepStoragePaths(rawHtml) : rawHtml;

      const configWithLogo = {
        ...config,
        isPublic,
        logo: (logoUrl || logoStoragePath)
          ? {
              // Store only the storage path for persisted assets (signed URLs expire).
              url: logoStoragePath ? '' : (logoUrl as string),
              storagePath: logoStoragePath || undefined,
              pos: logoPos,
              width: logoWidth,
              height: logoHeight,
            }
          : null,
      };

      const ok = await saveWorksheetToLibrary(
        {
          ...generatedWs,
          content: safeHtml,
          config: configWithLogo,
        },
        user.id,
        (user as any)?.user_metadata?.full_name || (user as any)?.user_metadata?.name || user.email || 'Teacher'
      );

      if (!ok) {
        throw new Error('Save failed');
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);

      lastSavedHtmlRef.current = editor?.getHTML() || lastSavedHtmlRef.current;
      if (dirtyRef.current) {
        dirtyRef.current = false;
        onDirtyChange?.(false);
      }
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

      const exportWrapper = document.createElement('div');
      exportWrapper.style.width = '210mm';
      exportWrapper.style.background = 'white';
      exportWrapper.style.boxSizing = 'border-box';
      const clonedWorksheet = worksheetElement.cloneNode(true) as HTMLElement;

      // Refresh signed URLs on cloned content so export works even if URLs expired.
      try {
        const imgs = Array.from(clonedWorksheet.querySelectorAll('img[data-storage-path]')) as HTMLImageElement[];
        const paths = Array.from(
          new Set(
            imgs
              .map((img) => img.getAttribute('data-storage-path') || '')
              .map((p) => p.trim())
              .filter(Boolean)
          )
        );
        if (paths.length) {
          const signed = await createSignedUrlsForWorksheetAssets(paths);
          for (const img of imgs) {
            const p = (img.getAttribute('data-storage-path') || '').trim();
            const url = p ? signed.get(p) : null;
            if (url) img.setAttribute('src', url);
          }
        }

        if (logoStoragePath) {
          const signedLogo = await createSignedUrlForWorksheetAsset(logoStoragePath);
          const logoImg = clonedWorksheet.querySelector('.ws-logo-container img') as HTMLImageElement | null;
          if (logoImg && signedLogo) {
            logoImg.setAttribute('src', signedLogo);
          }
        }
      } catch (e) {
        console.warn('Failed to refresh signed URLs for PDF export:', e);
      }

      // If the document ends with a forced page-break node, html2pdf will often
      // emit an extra blank trailing page. Strip trailing breaks for export.
      const trailingBreaks = Array.from(clonedWorksheet.querySelectorAll('.page-break-indicator'));
      for (let i = trailingBreaks.length - 1; i >= 0; i--) {
        const el = trailingBreaks[i] as HTMLElement;
        if (!el.parentElement) continue;
        const parent = el.parentElement;
        if (parent.lastElementChild === el) {
          el.remove();
        } else {
          break;
        }
      }

      exportWrapper.appendChild(clonedWorksheet);

      if (includeAnswerKey && generatedWs?.answerKey) {
        const answerPage = document.createElement('div');
        answerPage.className = 'worksheet-page-content';
        answerPage.style.width = '210mm';
        answerPage.style.minHeight = '297mm';
        answerPage.style.padding = '20mm';
        answerPage.style.boxSizing = 'border-box';
        (answerPage.style as any).breakBefore = 'page';
        (answerPage.style as any).pageBreakBefore = 'always';

        const answerKeyWrapper = document.createElement('div');
        answerKeyWrapper.className = 'ws-answer-key';

        const titleEl = document.createElement('h2');
        titleEl.className = 'ws-answer-title';
        titleEl.textContent = `${generatedWs.title} - Answer Sheet`;

        const answerBody = document.createElement('div');
        answerBody.innerHTML = generatedWs.answerKey;

        answerKeyWrapper.appendChild(titleEl);
        answerKeyWrapper.appendChild(answerBody);
        answerPage.appendChild(answerKeyWrapper);

        exportWrapper.appendChild(answerPage);
      }

      console.log('=== Export PDF Handler (Direct DOM) ===');
      console.log('Capturing actual preview element');
      console.log('Element dimensions:', worksheetElement.clientWidth, 'x', worksheetElement.scrollHeight);

      const metadata: PDFMetadata = {
        headerContent: '',
        footerContent: '',
        // Logo is already present in the exported DOM (if enabled)
        logoUrl: null,
        logoPos: logoPos,
        logoSize: { width: logoWidth, height: logoHeight },
        fontSize: fontSize,
      };

      // Pass the ACTUAL DOM element for 100% WYSIWYG
      const blob = await generatePDF(exportWrapper as HTMLElement, metadata, setPdfProgress);
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
    const selection = editor?.state.selection;
    const insertRange = selection ? { from: selection.from, to: selection.to } : null;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && editor) {
        const defaultWidth = 240;
        let posX = 80;
        let posY = 80;
        try {
          const coords = editor.view.coordsAtPos(insertRange?.from ?? editor.state.selection.from);
          const contentEl = document.querySelector('.worksheet-editor-content') as HTMLElement | null;
          if (contentEl) {
            const rect = contentEl.getBoundingClientRect();
            posX = (coords.left - rect.left) / zoom - defaultWidth / 2;
            posY = (coords.top - rect.top) / zoom;
          }
        } catch {
          // ignore
        }

        let roundedX = Math.round(posX);
        let roundedY = Math.round(posY);
        if (roundedX === 0 && roundedY === 0) roundedX = 1;

        const shouldUpload = Boolean(user) && (config.storeWorksheetAssets ?? true);
        if (shouldUpload && user) {
          try {
            const optimized = await optimizeImageForUpload(file, { maxDimension: 1600, quality: 0.82, preferAlpha: true });
            const uploaded = await uploadWorksheetAsset({
              userId: user.id,
              blob: optimized.blob,
              contentType: optimized.contentType,
              extension: optimized.extension,
              kind: 'image',
              worksheetId: generatedWs?.id,
            });

            const chain = editor.chain().focus();
            if (insertRange) chain.setTextSelection(insertRange);
            chain.setImage({ src: uploaded.signedUrl, storagePath: uploaded.path, width: defaultWidth, posX: roundedX, posY: roundedY }).run();
          } catch (err) {
            console.error('Image upload failed, falling back to inline base64:', err);
            const reader = new FileReader();
            reader.onload = (ev) => {
              const base64 = ev.target?.result as string;
              const chain = editor.chain().focus();
              if (insertRange) chain.setTextSelection(insertRange);
              chain.setImage({ src: base64, width: defaultWidth, posX: roundedX, posY: roundedY }).run();
            };
            reader.readAsDataURL(file);
          }
        } else {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const base64 = ev.target?.result as string;
            const chain = editor.chain().focus();
            if (insertRange) chain.setTextSelection(insertRange);
            chain.setImage({ src: base64, width: defaultWidth, posX: roundedX, posY: roundedY }).run();
          };
          reader.readAsDataURL(file);
        }
      }
      input.remove();
    };

    document.body.appendChild(input);
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
    <div className="flex flex-col min-w-0">
      <style>{TIPTAP_EDITOR_CSS}</style>

      <style>{`
        .ws-fixed-hscroll::-webkit-scrollbar {
          height: 10px;
        }
        .ws-fixed-hscroll::-webkit-scrollbar-track {
          background: rgba(148, 163, 184, 0.15);
          border-radius: 9999px;
        }
        .ws-fixed-hscroll::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.35);
          border-radius: 9999px;
        }
        .ws-fixed-hscroll::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.55);
        }
        .ws-hide-x-scrollbar {
          scrollbar-width: none;
        }
        .ws-hide-x-scrollbar::-webkit-scrollbar {
          height: 0px;
        }

        .ws-answer-title {
          font-size: 14pt;
          font-weight: 700;
          text-decoration: underline;
          margin: 0 0 1.5rem 0;
        }
      `}</style>

      <div className="sticky top-16 z-30 bg-white border-b border-slate-200 shadow-sm">
        {/* Action Bar */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800">{generatedWs.title}</h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="hidden md:flex items-center gap-2 border-r border-slate-200 pr-3">
              <button
                onClick={() => setZoom((z) => Number(Math.max(0.5, z - 0.1).toFixed(2)))}
                className="p-2 hover:bg-slate-100 rounded transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={18} />
              </button>
              <span className="text-sm font-medium text-slate-600 w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Number(Math.min(1.5, z + 0.1).toFixed(2)))}
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
                onClick={() => handleExportPDF(showAnswerKey)}
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
              <>
                {/* VISIBILITY TOGGLE (match Games UI) */}
                <div
                  className={`flex items-center bg-slate-200 rounded-full p-1 cursor-pointer select-none`}
                  onClick={onTogglePublic}
                  title={isPublic ? 'Public (visible in Community when saved)' : 'Private (only in My Library)'}
                >
                  <div className={`flex items-center px-3 py-1.5 rounded-full text-xs font-bold transition-all ${!isPublic ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
                    <Lock size={12} className="mr-1" /> Private
                  </div>
                  <div className={`flex items-center px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isPublic ? 'bg-green-500 text-white shadow-sm' : 'text-slate-500'}`}>
                    <Globe size={12} className="mr-1" /> Public
                  </div>
                </div>

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
              </>
            )}
          </div>
        </div>

        {/* Desktop Toolbar */}
        <div className="hidden md:block px-4 py-2 bg-slate-50 border-t border-slate-200">
          <EditorToolbar editor={editor} onImageUpload={handleImageUpload} />
        </div>
      </div>

      {/* Mobile Toolbar (FAB) */}
      <div className="md:hidden">
        <MobileToolbar editor={editor} onImageUpload={handleImageUpload} />
      </div>

      {/* Editor Container */}
      <div
        ref={containerRef}
        className="bg-slate-100 p-4 min-w-0"
        id="preview-wrapper"
      >
        <div
          ref={previewScrollRef}
          onMouseDownCapture={(e) => {
            const target = e.target as HTMLElement | null;
            if (!target) return;
            if (target.closest('.ws-logo-container')) return;
            if (logoSelected) onLogoSelect(false);
          }}
          onScroll={() => {
            const preview = previewScrollRef.current;
            const fixed = fixedHScrollRef.current;
            if (!preview || !fixed) return;
            if (isSyncingScrollRef.current === 'fixed') return;

            isSyncingScrollRef.current = 'preview';
            fixed.scrollLeft = preview.scrollLeft;
            window.requestAnimationFrame(() => {
              if (isSyncingScrollRef.current === 'preview') isSyncingScrollRef.current = null;
            });
          }}
          className={`mx-auto w-full max-w-[210mm] min-w-0 overflow-y-visible ${
            isPreviewZoomActive ? 'overflow-x-auto overscroll-x-contain' : ''
          } ${showFixedHScroll ? 'ws-hide-x-scrollbar' : ''}`}
        >
          <div ref={zoomTargetRef} className="w-fit mx-auto" style={{ zoom } as any}>
            <MultiPageEditor
              editor={editor}
              fontSize={fontSize}
              logoUrl={logoUrl}
              logoPos={logoPos}
              logoWidth={logoWidth}
              logoHeight={logoHeight}
              onLogoDrag={onLogoDrag}
              onLogoResize={onLogoResize}
              logoSelected={logoSelected}
              onLogoSelect={onLogoSelect}
              onLogoRemove={onLogoRemove}
            />

            {showAnswerKey && generatedWs.answerKey && (
              <div className="mt-6 mx-auto" style={{ width: '210mm' }}>
                <div className="bg-white shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
                  <div className="p-[20mm] min-h-[297mm]">
                    <div className="ws-answer-key">
                      <h2 className="ws-answer-title">{generatedWs.title} - Answer Sheet</h2>
                      <div dangerouslySetInnerHTML={{ __html: generatedWs.answerKey }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

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
              <div className="mt-2 text-xs text-amber-700">
                Answer key is shown as an extra page in the preview and will be included in the PDF export while it’s open.
              </div>
            )}

          </div>
        )}
      </div>

      {showFixedHScroll &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed bottom-2 z-[9999] pointer-events-none"
            style={
              fixedHScrollRect
                ? { left: `${fixedHScrollRect.left}px`, width: `${fixedHScrollRect.width}px` }
                : { left: '50%', transform: 'translateX(-50%)', width: 'min(96vw,210mm)' }
            }
          >
            <div
              ref={fixedHScrollRef}
              className="ws-fixed-hscroll pointer-events-auto h-4 overflow-x-auto overflow-y-hidden bg-white/70 backdrop-blur border border-slate-200 rounded-full shadow-sm"
              onScroll={() => {
                const preview = previewScrollRef.current;
                const fixed = fixedHScrollRef.current;
                if (!preview || !fixed) return;
                if (isSyncingScrollRef.current === 'preview') return;

                isSyncingScrollRef.current = 'fixed';
                preview.scrollLeft = fixed.scrollLeft;
                window.requestAnimationFrame(() => {
                  if (isSyncingScrollRef.current === 'fixed') isSyncingScrollRef.current = null;
                });
              }}
            >
              <div ref={fixedHScrollInnerRef} style={{ height: 1 }} />
            </div>
          </div>,
          document.body
        )}
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

  .ProseMirror .ws-instructions {
    font-style: italic;
    text-align: center;
    color: #475569;
    margin: 0 0 1.5rem 0;
  }

  .worksheet-table {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
    page-break-inside: avoid;
  }

  .ws-table, .ProseMirror table, table {
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

  .ws-table td,
  .ws-table th,
  .ProseMirror table td,
  .ProseMirror table th,
  table td,
  table th {
    border: 1px solid #cbd5e1;
    padding: 0.5rem;
    text-align: left;
    min-width: 50px;
    page-break-inside: avoid;
    vertical-align: top;
  }

  .worksheet-table th {
    background-color: #f1f5f9;
    font-weight: 600;
  }

  .ws-table th,
  .ProseMirror table th,
  table th {
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

  /* TipTap table resizing visuals */
  .ProseMirror .tableWrapper {
    overflow-x: auto;
  }

  .ProseMirror table {
    table-layout: fixed;
    width: 100%;
  }

  .ProseMirror .column-resize-handle {
    position: absolute;
    right: -2px;
    top: 0;
    bottom: -2px;
    width: 4px;
    background-color: rgba(59, 130, 246, 0.65);
    pointer-events: none;
    opacity: 0;
  }

  .ProseMirror.resize-cursor {
    cursor: col-resize;
  }

  .ProseMirror table:hover .column-resize-handle {
    opacity: 1;
  }

  @media print {
    .ProseMirror .column-resize-handle {
      display: none !important;
    }
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
