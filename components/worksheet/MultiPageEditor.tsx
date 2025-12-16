import React, { useEffect, useState, useRef } from 'react';
import { Editor, EditorContent } from '@tiptap/react';

interface MultiPageEditorProps {
  editor: Editor | null;
  fontSize: number;
  logoUrl: string | null;
  logoPos: { x: number; y: number };
  logoWidth: number;
  logoHeight: number;
  onLogoDrag: (e: React.MouseEvent) => void;
  onLogoResize: (e: React.MouseEvent, handle: 'e' | 'w' | 'n' | 's' | 'ne' | 'nw' | 'se' | 'sw') => void;
  logoSelected?: boolean;
  onLogoSelect?: (selected: boolean) => void;
  onLogoRemove?: () => void;
}

const PAGE_HEIGHT_MM = 297; // A4 height in mm
const PAGE_WIDTH_MM = 210; // A4 width in mm
const PADDING_MM = 20; // Padding in mm
const CONTENT_HEIGHT_MM = PAGE_HEIGHT_MM - (PADDING_MM * 2); // 257mm
const PAGE_GAP_MM = 10; // Gap between pages in mm (like Word)

export const MultiPageEditor: React.FC<MultiPageEditorProps> = ({
  editor,
  fontSize,
  logoUrl,
  logoPos,
  logoWidth,
  logoHeight,
  onLogoDrag,
  onLogoResize,
  logoSelected = false,
  onLogoSelect,
  onLogoRemove,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  if (!editor) return null;

  return (
    <div style={{ backgroundColor: '#e5e7eb', padding: '40px 0' }}>
      <style>{`
        /* Page container wrapper with gray background for margins */
        .worksheet-page-wrapper {
          position: relative;
          background-color: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        /* Visual margin overlays - uses a single background with repeating pattern */
        .worksheet-margin-overlays {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 0;
          background-image: repeating-linear-gradient(
            to bottom,
            rgba(229, 231, 235, 0.5) 0,
            rgba(229, 231, 235, 0.5) ${PADDING_MM}mm,
            transparent ${PADDING_MM}mm,
            transparent calc(${PAGE_HEIGHT_MM}mm - ${PADDING_MM}mm),
            rgba(229, 231, 235, 0.5) calc(${PAGE_HEIGHT_MM}mm - ${PADDING_MM}mm),
            rgba(229, 231, 235, 0.5) ${PAGE_HEIGHT_MM}mm
          );
        }

        /* Page break line indicators */
        .worksheet-page-dividers {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 0;
          background-image: repeating-linear-gradient(
            to bottom,
            transparent 0,
            transparent calc(${PAGE_HEIGHT_MM}mm - 2px),
            #6b7280 calc(${PAGE_HEIGHT_MM}mm - 2px),
            #6b7280 calc(${PAGE_HEIGHT_MM}mm + 2px),
            transparent calc(${PAGE_HEIGHT_MM}mm + 2px)
          );
        }

        /* Content area */
        .worksheet-page-content {
          position: relative;
          z-index: 10;
          padding: ${PADDING_MM}mm;
          min-height: 297mm;
          box-sizing: border-box;
        }

        /* Logo overlay */
        .ws-logo-container {
          position: absolute;
          z-index: 50;
          cursor: grab;
          user-select: none;
          display: inline-block;
        }
        .ws-logo-container:hover,
        .ws-logo-container:active,
        .ws-logo-container.ws-logo-selected {
          outline: 2px solid rgba(59, 130, 246, 0.9);
          outline-offset: 2px;
        }
        .ws-logo-container:active {
          cursor: grabbing;
        }
        .ws-logo {
          width: 100%;
          height: 100%;
          display: block;
          pointer-events: none;
          object-fit: fill;
        }
        .ws-resize-handle,
        .ws-logo-resize-handle {
          width: 12px;
          height: 12px;
          background: #3b82f6;
          position: absolute;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          z-index: 60;
          display: none;
        }
        .ws-logo-container:hover .ws-logo-resize-handle,
        .ws-logo-container:active .ws-logo-resize-handle,
        .ws-logo-container.ws-logo-selected .ws-logo-resize-handle {
          display: block;
        }
        .ws-logo-resize-handle[data-handle="se"] { bottom: -6px; right: -6px; cursor: se-resize; }
        .ws-logo-resize-handle[data-handle="sw"] { bottom: -6px; left: -6px; cursor: sw-resize; }
        .ws-logo-resize-handle[data-handle="ne"] { top: -6px; right: -6px; cursor: ne-resize; }
        .ws-logo-resize-handle[data-handle="nw"] { top: -6px; left: -6px; cursor: nw-resize; }
        .ws-logo-resize-handle[data-handle="n"] { top: -6px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
        .ws-logo-resize-handle[data-handle="s"] { bottom: -6px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
        .ws-logo-resize-handle[data-handle="e"] { top: 50%; right: -6px; transform: translateY(-50%); cursor: ew-resize; }
        .ws-logo-resize-handle[data-handle="w"] { top: 50%; left: -6px; transform: translateY(-50%); cursor: ew-resize; }
        .ws-logo-delete {
          position: absolute;
          top: -10px;
          right: -10px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ef4444;
          color: white;
          display: none;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          line-height: 1;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          z-index: 70;
          cursor: pointer;
          pointer-events: auto;
        }
        .ws-logo-container.ws-logo-selected .ws-logo-delete {
          display: flex;
        }
        @media print {
          .ws-resize-handle,
          .ws-logo-resize-handle {
            display: none !important;
          }
          .ws-logo-delete {
            display: none !important;
          }
        }

        /* Print-aware page break rules */
        .worksheet-editor-content p,
        .worksheet-editor-content ul,
        .worksheet-editor-content ol,
        .worksheet-editor-content .worksheet-table,
        .worksheet-editor-content .ws-table,
        .worksheet-editor-content table,
        .worksheet-editor-content .worksheet-image {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .worksheet-editor-content h1,
        .worksheet-editor-content h2,
        .worksheet-editor-content h3 {
          page-break-after: avoid;
          page-break-inside: avoid;
          break-after: avoid;
          break-inside: avoid;
        }

        .worksheet-editor-content li,
        .worksheet-editor-content td,
        .worksheet-editor-content th {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        /* Clean print output */
        @media print {
          .worksheet-margin-overlays,
          .worksheet-page-dividers {
            display: none !important;
          }
          .worksheet-page-wrapper {
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="mx-auto" style={{ maxWidth: '210mm' }}>
        <div
          className="worksheet-page-wrapper"
          style={{
            width: '210mm',
            position: 'relative',
          }}
        >
          {/* Visual margin overlays */}
          <div className="worksheet-margin-overlays" />

          {/* Page break divider lines */}
          <div className="worksheet-page-dividers" />

          {/* Content area with padding */}
          <div className="worksheet-page-content">
            {/* Logo Overlay */}
            {logoUrl && (
              <div
                className={`ws-logo-container ${logoSelected ? 'ws-logo-selected' : ''}`}
                style={{
                  position: 'absolute',
                  left: `${logoPos.x}px`,
                  top: `${logoPos.y}px`,
                  width: `${logoWidth}px`,
                  height: `${logoHeight}px`,
                  cursor: 'grab',
                  zIndex: 50,
                }}
                onMouseDown={(e) => {
                  onLogoSelect?.(true);
                  onLogoDrag(e);
                }}
              >
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="ws-logo"
                  crossOrigin={logoUrl?.startsWith('http') ? 'anonymous' : undefined}
                  style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
                />
                {onLogoRemove && (
                  <button
                    type="button"
                    className="ws-logo-delete"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onLogoRemove();
                      onLogoSelect?.(false);
                    }}
                    aria-label="Remove logo"
                    title="Remove logo"
                  >
                    ×
                  </button>
                )}
                {(['nw', 'ne', 'sw', 'se', 'w', 'e', 'n', 's'] as const).map((handle) => (
                  <div
                    key={handle}
                    className="ws-logo-resize-handle"
                    data-handle={handle}
                    onMouseDown={(e) => {
                      onLogoSelect?.(true);
                      onLogoResize(e, handle);
                    }}
                  />
                ))}
              </div>
            )}

            {/* Editor Content */}
            <div
              ref={contentRef}
              className="worksheet-editor-content"
              style={{
                fontSize: `${fontSize}pt`,
                fontFamily: 'Quicksand, sans-serif',
                lineHeight: '1.5',
                width: '100%',
                maxWidth: '100%',
                position: 'relative',
                zIndex: 1,
              } as any}
            >
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
