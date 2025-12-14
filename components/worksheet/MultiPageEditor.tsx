import React, { useEffect, useState, useRef } from 'react';
import { Editor, EditorContent } from '@tiptap/react';

interface MultiPageEditorProps {
  editor: Editor | null;
  fontSize: number;
  zoom: number;
  logoUrl: string | null;
  logoPos: { x: number; y: number };
  logoWidth: number;
  onLogoDrag: (e: React.MouseEvent) => void;
}

const PAGE_HEIGHT_MM = 297; // A4 height in mm
const PAGE_WIDTH_MM = 210; // A4 width in mm
const PADDING_MM = 20; // Padding in mm
const CONTENT_HEIGHT_MM = PAGE_HEIGHT_MM - (PADDING_MM * 2); // 257mm
const PAGE_GAP_MM = 10; // Gap between pages in mm (like Word)

export const MultiPageEditor: React.FC<MultiPageEditorProps> = ({
  editor,
  fontSize,
  zoom,
  logoUrl,
  logoPos,
  logoWidth,
  onLogoDrag,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  if (!editor) return null;

  return (
    <div style={{ backgroundColor: '#e5e7eb', padding: '40px 0', minHeight: '100vh' }}>
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
        }

        /* Print-aware page break rules */
        .worksheet-editor-content p,
        .worksheet-editor-content ul,
        .worksheet-editor-content ol,
        .worksheet-editor-content .worksheet-table,
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

      <div
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
          transition: 'transform 0.2s ease',
        }}
      >
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
                  className="ws-logo-container"
                  style={{
                    position: 'absolute',
                    left: `${logoPos.x}px`,
                    top: `${logoPos.y}px`,
                    width: `${logoWidth}px`,
                    cursor: 'grab',
                    zIndex: 50,
                  }}
                  onMouseDown={onLogoDrag}
                >
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="ws-logo"
                    style={{ width: '100%', height: 'auto', pointerEvents: 'none' }}
                  />
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
                }}
              >
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
