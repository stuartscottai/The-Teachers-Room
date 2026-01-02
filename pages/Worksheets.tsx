
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { FileText, Printer, Sparkles, LayoutTemplate, Save, BookOpen, ArrowLeft, Trash2, LogIn, Check, Edit, Minus, Plus, GripVertical, X, Scissors, Undo, Redo, ChevronDown, ChevronRight, ChevronUp, ZoomIn, ZoomOut, Columns, AlignJustify, Search, Globe, Library, Copy, SortAsc, RefreshCw, AlertTriangle, Paperclip, Image as ImageIcon, Bold, Italic, Underline, Type, AlignLeft, AlignCenter, AlignRight, Palette, Download, ChevronLeft, ImagePlus } from 'lucide-react';
import { WorksheetConfig, GeneratedWorksheet, ActivityType, ActivityConfig, UploadedFile } from '../types';
import { generateWorksheetContent } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';
import { saveWorksheetToLibrary, getSavedWorksheets, deleteSavedWorksheet, getCommunityWorksheets, processFile } from '../utils/gameUtils';
import { optimizeImageForUpload } from '../utils/imageOptimize';
import { uploadWorksheetAsset, createSignedUrlForWorksheetAsset, resolveWorksheetHtmlAssetUrls } from '../utils/worksheetAssetStorage';
import { WorksheetDesigner } from '../components/worksheet/designer/WorksheetDesigner';
import { blocksFromAi, imageToHtml, sanitizeHtml } from '../components/worksheet/designer/designerHelpers';
import { WorksheetAiResultV1, WorksheetDesignerDocV1, WorksheetDesignerSettings, createEmptyDoc, tryParseDesignerDoc, WorksheetBlock, WorksheetDesignerPage, WorksheetPlacedElement, createId } from '../components/worksheet/designer/designerTypes';

// --- TIPTAP EDITOR STYLESHEET ---
const TIPTAP_EDITOR_CSS = `
  /* TipTap Editor Styles */
  .ProseMirror {
    outline: none;
    min-height: 200px;
  }

  .ProseMirror p {
    margin: 0.5rem 0;
  }

  .ProseMirror h1, .ProseMirror h2, .ProseMirror h3 {
    margin: 1rem 0 0.5rem 0;
    font-weight: 600;
  }

  .ProseMirror ul, .ProseMirror ol {
    padding-left: 1.5rem;
    margin: 0.5rem 0;
  }

  .ProseMirror li {
    margin-bottom: 0.25rem;
  }

  .worksheet-table {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
  }

  .worksheet-table td,
  .worksheet-table th {
    border: 1px solid #cbd5e1;
    padding: 0.5rem;
    text-align: left;
    min-width: 50px;
  }

  .worksheet-table th {
    background-color: #f1f5f9;
    font-weight: 600;
  }

  .worksheet-image {
    max-width: 100%;
    height: auto;
    display: inline-block;
    margin: 1rem 0;
    cursor: pointer;
    border: 2px solid transparent;
    transition: border-color 0.2s;
  }

  .worksheet-image:hover {
    border-color: #3b82f6;
  }

  .worksheet-image.ProseMirror-selectednode {
    border-color: #3b82f6;
    outline: none;
  }

  /* Make images resizable */
  .ProseMirror img.worksheet-image {
    resize: both;
    overflow: hidden;
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
`;

// --- STANDARD WORKSHEET STYLESHEET (Original for existing features) ---
const LEGACY_WORKSHEET_CSS = `
  @page { 
    size: A4; 
    margin: 0mm; 
  } 
  
  html, body {
    margin: 0;
    padding: 0;
    background: #e2e8f0; 
    -webkit-print-color-adjust: exact; 
    print-color-adjust: exact;
  }

  .ws-container { 
    font-family: 'Quicksand', sans-serif; 
    color: #1e293b; 
    line-height: 1.5; 
    text-rendering: optimizeLegibility;
    width: 210mm; 
    min-height: 297mm;
    padding: 20mm; /* Consistent padding for content */
    background: white;
    box-sizing: border-box;
    margin: 0 auto;
    position: relative;
    word-wrap: break-word;
  }

  /* List Styles - Override Tailwind Reset */
  .ws-container ul { 
    list-style-type: disc; 
    padding-left: 1.5rem; 
    margin-bottom: 1rem; 
  }
  .ws-container ol { 
    list-style-type: decimal; 
    padding-left: 1.5rem; 
    margin-bottom: 1rem; 
  }
  .ws-container li { 
    margin-bottom: 0.5rem; 
  }

  /* Draggable Logo Style */
  .ws-logo-container {
    position: absolute;
    z-index: 50;
    cursor: grab;
    user-select: none;
    display: inline-block;
  }
  .ws-logo-container:active {
    cursor: grabbing;
  }
  .ws-logo {
    width: 100%;
    height: auto;
    display: block;
    pointer-events: none;
  }
  /* Resize Handle */
  .ws-resize-handle {
    width: 12px;
    height: 12px;
    background: #3b82f6;
    position: absolute;
    bottom: -5px;
    right: -5px;
    cursor: se-resize;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    z-index: 60;
    display: none; /* Hidden by default, shown on hover */
  }
  .ws-logo-container:hover .ws-resize-handle,
  .ws-logo-container:active .ws-resize-handle {
    display: block;
  }

  /* Two Column Layout Mode */
  .ws-container.two-column {
    column-count: 2;
    column-gap: 10mm;
    column-rule: 1px solid #e2e8f0;
    column-fill: balance; /* Attempt to balance heights */
  }
  
  /* Force headers to span across columns */
  .ws-container.two-column > .ws-content > .ws-header,
  .ws-container.two-column > .ws-content > .ws-title,
  .ws-container.two-column > .ws-content > .ws-instructions,
  .ws-container.two-column > .ws-content > .ws-answer-key,
  .ws-container.two-column > .ws-content > .forced-page-break {
    column-span: all;
    -webkit-column-span: all;
  }
  
  /* Header Block */
  .ws-header { 
    display: flex; 
    justify-content: space-between; 
    align-items: center;
    margin-bottom: 2rem; 
    padding-bottom: 0.5rem;
    font-size: 0.9em;
    break-inside: avoid;
  }
  .ws-field { 
    font-weight: 600; 
    color: #475569; 
    min-width: 150px;
    display: inline-block;
  }

  /* Typography */
  .ws-title { 
    font-family: 'Fredoka', sans-serif; 
    font-size: 2em; 
    font-weight: 700; 
    text-align: center; 
    color: #0f172a; 
    margin: 0 0 1rem 0; 
    text-transform: uppercase; 
    letter-spacing: 0.05em; 
    line-height: 1.2;
    break-after: avoid;
  }
  .ws-instructions { 
    font-style: italic; 
    color: #475569; 
    margin-bottom: 2rem; 
    text-align: center; 
    max-width: 90%; 
    margin-left: auto; 
    margin-right: auto; 
    font-size: 1.1em;
    line-height: 1.4;
  }

  /* Sections */
  .ws-section { 
    margin-bottom: 2.5rem; 
    display: block;
    break-inside: auto; 
  }
  .ws-section p {
    margin-bottom: 1rem; 
  }
  .ws-section-title { 
    font-family: 'Fredoka', sans-serif; 
    font-size: 1.4em;
    font-weight: 600; 
    color: #0284c7; 
    border-bottom: 2px solid #e0f2fe; 
    padding-bottom: 0.2rem; 
    margin-bottom: 1rem; 
    break-after: avoid;
  }

  /* Tables & Grids */
  .ws-table { 
    width: 100%; 
    border-collapse: collapse; 
    margin: 1rem 0; 
    font-size: 1em;
    break-inside: auto;
  }
  .ws-table td, .ws-table th { 
    border: 1px solid #cbd5e1; 
    padding: 0.5rem 0.7rem; 
    text-align: left; 
    vertical-align: middle;
  }
  .ws-table th { 
    background-color: #f1f5f9; 
    font-weight: 700; 
    font-family: 'Fredoka', sans-serif;
    color: #334155;
  }
  
  li, tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  
  /* Answer Key */
  .ws-answer-key { 
    page-break-before: always;
    break-before: page;
    display: block;
    margin-top: 0; 
    padding-top: 2rem; 
    border-top: none; 
    background-color: #fff;
    column-count: 2;
    column-gap: 3rem;
    column-fill: balance;
    font-size: 0.9em;
    line-height: 1.4;
    min-height: 50vh;
  }
  
  .ws-answer-key h3 { 
    column-span: all;
    color: #ef4444; 
    text-transform: uppercase; 
    font-weight: bold;
    margin-bottom: 1.5rem;
    text-align: center;
    font-size: 1.5em; /* Relative sizing */
    border-bottom: 2px solid #ef4444;
    padding-bottom: 0.5rem;
  }

  .ws-answer-key p, 
  .ws-answer-key li,
  .ws-answer-key tr {
    break-inside: avoid;
  }
  
  /* Forced Page Break Class */
  .forced-page-break {
    page-break-after: always;
    break-after: page;
    margin: 0;
    border: none;
    display: flex;
    background-image: repeating-linear-gradient(
      45deg,
      #fff7ed,
      #fff7ed 10px,
      #ffedd5 10px,
      #ffedd5 20px
    );
    border-bottom: 2px dashed #f97316;
    align-items: flex-start;
    justify-content: center;
    padding-top: 8px;
    box-sizing: border-box;
    position: relative;
    width: 100%;
    overflow: hidden;
  }

  /* Print Overrides */
  @media print {
    html, body { 
        background: white !important; 
        background-color: white !important; 
    }
    
    .ws-container { 
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 20mm !important; 
        box-shadow: none; 
        background-image: none !important;
        background-color: white !important;
        transform: none !important; 
        min-height: 0;
    }
    
    .ws-answer-key {
        background-color: white !important;
    }
    
    /* Hide UI helpers */
    .forced-page-break {
        height: 0 !important;
        border: none !important;
        background: none !important;
        margin: 0 !important;
        padding: 0 !important;
    }
    .forced-page-break::after,
    .delete-break-btn,
    .break-line,
    .break-label,
    .ws-resize-handle {
        display: none !important;
    }
  }

  /* SCREEN PREVIEW MODE ONLY */
  @media screen {
     .ws-container {
        /* Shadow for paper effect */
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        margin-bottom: 2rem; 
        transform-origin: top center; 
        
        /* 
           VISUAL GUIDES:
           Blue Dashed Line: Page Break Markers (297mm)
        */
        background-image: 
            linear-gradient(to bottom, transparent calc(297mm - 1px), #3b82f6 calc(297mm - 1px), #3b82f6 297mm);
        background-size: 100% 297mm; 
        background-repeat: repeat-y;
     }
     
     .break-label {
        color: #f97316;
        font-size: 10px;
        font-weight: bold;
        padding: 4px 10px;
        text-transform: uppercase;
        background: rgba(255,255,255,0.8);
        border-radius: 4px;
     }
     .delete-break-btn {
        position: absolute;
        right: 4px;
        top: 4px;
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 50%;
        width: 18px;
        height: 18px;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: 0.8;
        z-index: 10;
     }
     .delete-break-btn:hover {
        opacity: 1;
        background: #dc2626;
     }
  }
`;

const SIDEBAR_CSS = `
  .sidebar-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .sidebar-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .sidebar-scrollbar::-webkit-scrollbar-thumb {
    background-color: #cbd5e1;
    border-radius: 3px;
  }
  .sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: #94a3b8;
  }
`;

// --- DATA: GRADE LEVELS ---
const GRADE_CATEGORIES = {
    'CEFR Levels': ['A1 (Beginner)', 'A2 (Elementary)', 'B1 (Intermediate)', 'B2 (Upper Int)', 'C1 (Advanced)', 'C2 (Proficiency)'],
    'Proficiency': ['Beginner', 'Elementary', 'Pre-Intermediate', 'Intermediate', 'Upper-Intermediate', 'Advanced', 'Proficiency'],
    'Grades': ['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade'],
    'Ages': ['3-5 years', '6-8 years', '9-11 years', '12-14 years', '15-18 years', 'Adults']
};

// --- COMPONENT: GRADE SELECTOR ---
const GradeSelector: React.FC<{ value: string, onChange: (val: string) => void }> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [expandedCategory, setExpandedCategory] = useState<string | null>('CEFR Levels');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={containerRef}>
            <label className="block text-xs font-bold text-slate-700 mb-1">Target Level</label>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-2 rounded border border-slate-200 bg-white text-left text-sm flex justify-between items-center focus:ring-1 focus:ring-teal-400 outline-none"
            >
                <span className={value ? 'text-slate-800' : 'text-slate-400'}>{value || 'Select Grade / Level'}</span>
                <ChevronDown size={16} className="text-slate-400" />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
                    {Object.entries(GRADE_CATEGORIES).map(([category, items]) => (
                        <div key={category} className="border-b border-slate-100 last:border-0">
                            <button
                                onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                                className="w-full px-3 py-2 flex justify-between items-center bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 uppercase tracking-wide"
                            >
                                {category}
                                {expandedCategory === category ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            
                            {expandedCategory === category && (
                                <div className="bg-white py-1">
                                    {items.map(item => (
                                        <button
                                            key={item}
                                            onClick={() => handleSelect(item)}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-teal-50 hover:text-teal-700 transition-colors ${value === item ? 'bg-teal-50 text-teal-700 font-bold' : 'text-slate-600'}`}
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Page Guides Component (Sidebar Labels)
const PageGuides: React.FC<{ contentHeight: number; zoom: number }> = ({ contentHeight, zoom }) => {
    const pageHeightPx = 1122.5; // Approx 297mm @ 96dpi
    const pageCount = Math.max(1, Math.ceil(contentHeight / pageHeightPx));
    
    return (
        <div className="absolute top-0 -left-24 h-full hidden xl:block pointer-events-none select-none" style={{ transform: `scale(${zoom})`, transformOrigin: 'top right' }}>
             {Array.from({ length: pageCount }).map((_, i) => (
                <div 
                    key={i} 
                    className="text-right text-xs font-bold text-slate-400 flex items-end justify-end pr-4 border-b border-dashed border-slate-300/50 relative"
                    style={{ height: '297mm' }}
                >
                    <span className="bg-slate-100 px-2 py-1 rounded shadow-sm mb-2">Page {i + 1}</span>
                </div>
             ))}
        </div>
    );
};

// Memoized Preview Component
const EditablePreview = React.memo(React.forwardRef<HTMLDivElement, { 
    htmlContent: string, 
    fontSize: number, 
    zoom: number,
    layoutMode: 'single' | 'columns',
    logoUrl: string | null,
    logoPos: {x: number, y: number},
    logoWidth: number,
    onLogoDrag: (e: React.MouseEvent) => void,
    onLogoResize: (width: number) => void,
    onHeightChange: (h: number) => void,
    onInput?: (e: React.FormEvent<HTMLDivElement>) => void,
    onClick?: (e: React.MouseEvent) => void,
    onInteract?: () => void
}>(({ htmlContent, fontSize, zoom, layoutMode, logoUrl, logoPos, logoWidth, onLogoDrag, onLogoResize, onHeightChange, onInput, onClick, onInteract }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null);
    React.useImperativeHandle(ref, () => internalRef.current as HTMLDivElement);
    const resizeStartRef = useRef<{x: number, width: number} | null>(null);
    const [isResizing, setIsResizing] = useState(false);
    const breakTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const updatePageBreaks = useCallback(() => {
        if (!internalRef.current) return;
        const breaks = internalRef.current.querySelectorAll('.forced-page-break');
        const PAGE_HEIGHT = 1122.5; // 297mm in pixels

        breaks.forEach(b => (b as HTMLElement).style.height = '24px');

        breaks.forEach(b => {
            const el = b as HTMLElement;
            const top = el.offsetTop;
            const nextBoundary = Math.ceil((top + 10) / PAGE_HEIGHT) * PAGE_HEIGHT;
            let gap = nextBoundary - top;
            
            if (gap < 24) gap += PAGE_HEIGHT;
            el.style.height = `${gap - 1}px`;
        });
    }, []);

    useEffect(() => {
        const contentDiv = internalRef.current?.querySelector('.ws-content');
        if (contentDiv && htmlContent) {
            if (contentDiv.innerHTML !== htmlContent) {
                contentDiv.innerHTML = htmlContent;
            }
            requestAnimationFrame(updatePageBreaks);
        }
    }, [htmlContent, updatePageBreaks]);

    useEffect(() => {
        if (!internalRef.current) return;
        const observer = new ResizeObserver((entries) => {
            window.requestAnimationFrame(() => {
                if (!internalRef.current) return;
                for (const entry of entries) {
                    onHeightChange(entry.contentRect.height);
                    updatePageBreaks();
                }
            });
        });
        observer.observe(internalRef.current);
        return () => observer.disconnect();
    }, [onHeightChange, updatePageBreaks]);

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        if (onInput) onInput(e);
        if (onInteract) onInteract();
        
        // Debounce expensive page break calculation
        if (breakTimeoutRef.current) clearTimeout(breakTimeoutRef.current);
        breakTimeoutRef.current = setTimeout(() => {
            updatePageBreaks();
        }, 500);
    };

    const handleResizeStart = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault(); 
        resizeStartRef.current = { x: e.clientX, width: logoWidth };
        setIsResizing(true);
    };

    const handleInteraction = (e: React.SyntheticEvent) => {
        if (onInteract) onInteract();
        if (onClick && e.type === 'click') onClick(e as React.MouseEvent);
    };

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (resizeStartRef.current) {
                const deltaX = (e.clientX - resizeStartRef.current.x) / zoom;
                const newWidth = Math.max(50, resizeStartRef.current.width + deltaX);
                onLogoResize(newWidth);
            }
        };
        const handleMouseUp = () => {
            setIsResizing(false);
            resizeStartRef.current = null;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
    }, [isResizing, zoom, onLogoResize]); 

    return (
        <div 
            ref={internalRef}
            className={`ws-container ${layoutMode === 'columns' ? 'two-column' : ''} outline-none transition-all`}
            style={{ fontSize: `${fontSize}pt`, transform: `scale(${zoom})` }}
            onClick={handleInteraction}
            onKeyUp={handleInteraction}
            onMouseUp={handleInteraction}
        >
            {logoUrl && (
                <div 
                    className="ws-logo-container" 
                    style={{ left: logoPos.x, top: logoPos.y, width: logoWidth }}
                    onMouseDown={onLogoDrag}
                >
                    <img src={logoUrl} className="ws-logo" alt="Worksheet Logo" />
                    <div className="ws-resize-handle" onMouseDown={handleResizeStart} />
                </div>
            )}
            <div 
                className="ws-content cursor-text"
                contentEditable={true}
                suppressContentEditableWarning={true}
                onInput={handleInput}
                dangerouslySetInnerHTML={{ __html: htmlContent }} 
            />
        </div>
    );
}), (prev, next) => {
    return (
        prev.htmlContent === next.htmlContent &&
        prev.fontSize === next.fontSize &&
        prev.zoom === next.zoom && 
        prev.layoutMode === next.layoutMode &&
        prev.logoUrl === next.logoUrl &&
        prev.logoPos.x === next.logoPos.x &&
        prev.logoPos.y === next.logoPos.y && 
        prev.logoWidth === next.logoWidth
    );
});

// --- SUB-COMPONENT: BUILDER ---
const WorksheetBuilder: React.FC<{ 
    config: WorksheetConfig, 
    setConfig: React.Dispatch<React.SetStateAction<WorksheetConfig>>,
    generatedWs: GeneratedWorksheet | null,
    setGeneratedWs: React.Dispatch<React.SetStateAction<GeneratedWorksheet | null>>,
    onLoad: () => void,
    onDirtyChange?: (dirty: boolean) => void
}> = ({ config, setConfig, generatedWs, setGeneratedWs, onDirtyChange }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [fontSize, setFontSize] = useState(11);
    const [zoom, setZoom] = useState(1);
    const contentRef = useRef<HTMLDivElement>(null);
    const [contentHeight, setContentHeight] = useState(0);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const addMenuRef = useRef<HTMLDivElement>(null);
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [historyTimeout, setHistoryTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
    const [isPublic, setIsPublic] = useState(true);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // --- NEW DESIGNER STATE ---
    const [pages, setPages] = useState<WorksheetDesignerPage[]>(() => createEmptyDoc().pages);
    const [blocks, setBlocks] = useState<WorksheetBlock[]>([]);
    const [elements, setElements] = useState<WorksheetPlacedElement[]>([]);
    const [designerSettings, setDesignerSettings] = useState<WorksheetDesignerSettings>(() => createEmptyDoc().settings || {});
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const lastLoadedWorksheetKeyRef = useRef<string>('');
    
    // Active Formats State for Toolbar
    const [activeFormats, setActiveFormats] = useState({
        bold: false,
        italic: false,
        underline: false,
        justifyLeft: false,
        justifyCenter: false,
        justifyRight: false,
    });
    
    // Logo State
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoPos, setLogoPos] = useState({ x: 20, y: 20 });
    const [logoWidth, setLogoWidth] = useState(150);
    const [logoHeight, setLogoHeight] = useState(90);
    const [logoStoragePath, setLogoStoragePath] = useState<string | null>(null);
    const [logoSelected, setLogoSelected] = useState(false);
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const [isDraggingLogo, setIsDraggingLogo] = useState(false);
    const logoDragOffset = useRef({ x: 0, y: 0 });
    const [isResizingLogo, setIsResizingLogo] = useState(false);
    const lastLoadedLogoKeyRef = useRef<string>('');
    const pendingLogoUploadRef = useRef<{
        objectUrl?: string;
        blob: Blob;
        contentType: string;
        extension: string;
        width: number;
        height: number;
    } | null>(null);
    const logoResizeStartRef = useRef<{
        x: number;
        y: number;
        width: number;
        height: number;
        posX: number;
        posY: number;
        handle: 'e' | 'w' | 'n' | 's' | 'ne' | 'nw' | 'se' | 'sw';
    } | null>(null);

    useEffect(() => {
        const key = generatedWs?.id || generatedWs?.createdAt || generatedWs?.title || '';
        if (!generatedWs || !key) return;
        if (lastLoadedWorksheetKeyRef.current === key) return;
        lastLoadedWorksheetKeyRef.current = key;

        const doc = typeof generatedWs.content === 'string' ? tryParseDesignerDoc(generatedWs.content) : null;
        if (doc) {
            setPages(doc.pages?.length ? doc.pages : createEmptyDoc().pages);
            setBlocks(Array.isArray(doc.blocks) ? doc.blocks : []);
            setElements(Array.isArray(doc.elements) ? doc.elements : []);
            setDesignerSettings(doc.settings || createEmptyDoc().settings || {});
            setSelectedElementId(null);
            onDirtyChange?.(false);
            return;
        }

        // Legacy HTML fallback: load as a single Story block + placed element
        const sanitizedLegacy = sanitizeHtml(String(generatedWs.content || ''));
        const seed = createEmptyDoc();
        const legacyBlock: WorksheetBlock = {
            id: seed.pages[0]?.id ? `${seed.pages[0].id}-legacy` : 'legacy',
            type: 'story',
            title: 'Legacy HTML',
            payload: { html: sanitizedLegacy },
            previewHtml: sanitizedLegacy,
        };

        setPages(seed.pages);
        setBlocks([legacyBlock]);
        setElements([{
            id: `${legacyBlock.id}-el`,
            pageId: seed.pages[0].id,
            type: 'story',
            x: 0,
            y: 0,
            w: 620,
            h: 860,
            html: sanitizedLegacy,
            styles: {
                fontFamily: 'Quicksand, sans-serif',
                fontSize: '14px',
                fontWeight: '400',
                fontStyle: 'normal',
                textDecoration: 'none',
                textAlign: 'left',
                lineHeight: '1.35',
                color: '#0f172a',
                backgroundColor: '#ffffff',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: '#e2e8f0',
                borderRadius: '10px',
                padding: '12px',
                boxShadow: 'none',
            },
        }]);
        setSelectedElementId(`${legacyBlock.id}-el`);
        setDesignerSettings(seed.settings || {});
        onDirtyChange?.(false);
    }, [generatedWs, onDirtyChange]);

    const getWorksheetPageRect = () => {
        const el = document.querySelector('.worksheet-page-content') as HTMLElement | null;
        return el?.getBoundingClientRect() ?? null;
    };

    const placeLogoTopRight = (opts?: { width?: number; height?: number }) => {
        const DEFAULT_WIDTH = opts?.width ?? 180;
        const DEFAULT_HEIGHT = opts?.height;
        const PADDING_MM = 20;
        const DEFAULT_MARGIN_PX = (PADDING_MM / 25.4) * 96; // 20mm @ 96dpi
        const rect = getWorksheetPageRect();

        const pageWidth = rect ? rect.width / zoom : 794; // fallback A4 width at ~96dpi
        const pageHeight = rect ? rect.height / zoom : 1122; // fallback A4 height at ~96dpi

        setLogoWidth(DEFAULT_WIDTH);
        setLogoHeight((prev) => {
            if (typeof DEFAULT_HEIGHT === 'number' && Number.isFinite(DEFAULT_HEIGHT)) {
                return Math.max(30, DEFAULT_HEIGHT);
            }
            const ratio = logoWidth > 0 ? (logoHeight / logoWidth) : 0.6;
            const next = DEFAULT_WIDTH * (Number.isFinite(ratio) && ratio > 0 ? ratio : 0.6);
            return Math.max(30, next);
        });
        setLogoPos({
            // Ensure logo sits inside the 20mm padding area (not in the top/right margins)
            x: Math.max(DEFAULT_MARGIN_PX, pageWidth - DEFAULT_WIDTH - DEFAULT_MARGIN_PX),
            y: DEFAULT_MARGIN_PX,
        });
    };

    const handleRemoveLogo = useCallback(() => {
        const pending = pendingLogoUploadRef.current;
        if (pending?.objectUrl) {
            try { URL.revokeObjectURL(pending.objectUrl); } catch { /* ignore */ }
        }
        pendingLogoUploadRef.current = null;
        setLogoUrl(null);
        setLogoStoragePath(null);
        setLogoSelected(false);
        setBlocks((prev) => prev.filter((b) => b?.payload?.kind !== 'logo'));
    }, []);

    useEffect(() => {
        if (!logoUrl) return;

        setBlocks((prev) => {
            const without = prev.filter((b) => b?.payload?.kind !== 'logo');
            return [
                {
                    id: `logo-${createId()}`,
                    type: 'image',
                    title: 'Logo',
                    payload: { url: logoUrl, kind: 'logo' },
                    previewHtml: imageToHtml(logoUrl),
                } as WorksheetBlock,
                ...without,
            ];
        });
        onDirtyChange?.(true);
    }, [logoUrl, onDirtyChange]);

    useEffect(() => {
        const pending = pendingLogoUploadRef.current;
        const worksheetId = generatedWs?.id;
        const shouldUpload = Boolean(user) && (config.storeWorksheetAssets ?? true);
        if (!pending || !worksheetId || !shouldUpload || !user) return;

        const upload = async () => {
            try {
                const uploaded = await uploadWorksheetAsset({
                    userId: user.id,
                    blob: pending.blob,
                    contentType: pending.contentType,
                    extension: pending.extension,
                    kind: 'logo',
                    worksheetId,
                });

                if (pending.objectUrl) {
                    try { URL.revokeObjectURL(pending.objectUrl); } catch { /* ignore */ }
                }

                pendingLogoUploadRef.current = null;
                setLogoUrl(uploaded.signedUrl);
                setLogoStoragePath(uploaded.path);
            } catch (e) {
                console.warn('Deferred logo upload failed:', e);
            }
        };

        void upload();
    }, [generatedWs?.id, user, config.storeWorksheetAssets]);

    useEffect(() => {
        if (!logoSelected) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Delete') return;

            const target = e.target as HTMLElement | null;
            const active = document.activeElement as HTMLElement | null;
            const tag = target?.tagName?.toUpperCase?.() ?? '';
            const isForm = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
            const isEditable = Boolean((target as any)?.isContentEditable);
            const isInEditor = Boolean(active?.closest?.('.ProseMirror'));
            if (isForm || isEditable || isInEditor) return;

            e.preventDefault();
            handleRemoveLogo();
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [logoSelected, handleRemoveLogo]);

    // Selection Persistence Ref
    const selectionRange = useRef<Range | null>(null);

    const availableActivities: { type: ActivityType, label: string }[] = [
        { type: 'multiple-choice', label: 'Multiple Choice' },
        { type: 'wordsearch', label: 'Wordsearch' },
        { type: 'matching', label: 'Matching' },
        { type: 'gap-fill', label: 'Gap Fill' },
        { type: 'sentence-transform', label: 'Sentence Transform' },
        { type: 'word-formation', label: 'Word Formation' },
        { type: 'open-ended', label: 'Open Ended' },
        { type: 'table', label: 'Table' },
        { type: 'custom', label: 'Custom' },
    ];

    // Sync visibility state from loaded config
    useEffect(() => {
        if (generatedWs?.config?.isPublic !== undefined) {
            setIsPublic(generatedWs.config.isPublic);
        }
    }, [generatedWs]);

    useEffect(() => {
        const logo = generatedWs?.config?.logo || null;
        const key = logo ? JSON.stringify(logo) : 'none';
        if (key === lastLoadedLogoKeyRef.current) return;
        lastLoadedLogoKeyRef.current = key;

        if (!logo) {
            setLogoUrl(null);
            setLogoStoragePath(null);
            setLogoPos({ x: 20, y: 20 });
            setLogoWidth(150);
            setLogoHeight(90);
            setLogoSelected(false);
            return;
        }

        const apply = async () => {
            let nextUrl = logo.url || null;
            if (logo.storagePath && user) {
                try {
                    nextUrl = await createSignedUrlForWorksheetAsset(logo.storagePath);
                } catch {
                    nextUrl = logo.url || null;
                }
            }

            setLogoUrl(nextUrl);
            setLogoStoragePath(logo.storagePath || null);
            setLogoPos(logo.pos || { x: 20, y: 20 });
            setLogoWidth(logo.width || 150);
            setLogoHeight(logo.height || 90);
            setLogoSelected(false);
        };

        void apply();
    }, [generatedWs?.config?.logo, user]);

    // Logo Dragging Logic
    const handleLogoMouseDown = (e: React.MouseEvent) => {
        if (!logoUrl || (e.target as HTMLElement).classList.contains('ws-logo-resize-handle')) return;
        e.preventDefault();
        e.stopPropagation();
        setLogoSelected(true);
        setIsDraggingLogo(true);
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        logoDragOffset.current = {
            x: (e.clientX - rect.left) / zoom,
            y: (e.clientY - rect.top) / zoom
        };
    };

    const handleWindowMouseMove = useCallback((e: MouseEvent) => {
        if (isDraggingLogo) {
            const rect = getWorksheetPageRect();
            if (!rect) return;

            const rawX = (e.clientX - rect.left) / zoom - logoDragOffset.current.x;
            const rawY = (e.clientY - rect.top) / zoom - logoDragOffset.current.y;

            setLogoPos({
                x: rawX,
                y: rawY
            });
        }

        if (isResizingLogo && logoResizeStartRef.current) {
            const deltaX = (e.clientX - logoResizeStartRef.current.x) / zoom;
            const deltaY = (e.clientY - logoResizeStartRef.current.y) / zoom;
            const startWidth = logoResizeStartRef.current.width;
            const startHeight = logoResizeStartRef.current.height || 1;
            const startPosX = logoResizeStartRef.current.posX;
            const startPosY = logoResizeStartRef.current.posY;
            const handle = logoResizeStartRef.current.handle;
            const east = handle === 'e' || handle === 'ne' || handle === 'se';
            const west = handle === 'w' || handle === 'nw' || handle === 'sw';
            const north = handle === 'n' || handle === 'nw' || handle === 'ne';
            const south = handle === 's' || handle === 'sw' || handle === 'se';

            let newWidth = startWidth;
            let newHeight = startHeight;
            let newPosX = startPosX;
            let newPosY = startPosY;

            const minSize = 30;
            const isCorner = handle === 'nw' || handle === 'ne' || handle === 'sw' || handle === 'se';

            // Corner handles: maintain original aspect ratio.
            if (isCorner) {
                const aspectRatio = startWidth / startHeight;
                const widthFromX = startWidth + (east ? deltaX : -deltaX);
                const heightFromY = startHeight + (south ? deltaY : -deltaY);
                const widthFromY = heightFromY * aspectRatio;

                newWidth = Math.abs(widthFromX - startWidth) > Math.abs(widthFromY - startWidth)
                    ? widthFromX
                    : widthFromY;
                newWidth = Math.max(minSize, newWidth);
                newHeight = Math.max(minSize, newWidth / aspectRatio);
            } else {
                // Edge handles: allow squashing (resize one dimension only).
                if (east) {
                    newWidth = startWidth + deltaX;
                } else if (west) {
                    newWidth = startWidth - deltaX;
                }

                if (south) {
                    newHeight = startHeight + deltaY;
                } else if (north) {
                    newHeight = startHeight - deltaY;
                }

                newWidth = Math.max(minSize, newWidth);
                newHeight = Math.max(minSize, newHeight);
            }

            if (west) {
                const applied = startWidth - newWidth;
                newPosX = startPosX + applied;
            }
            if (north) {
                const applied = startHeight - newHeight;
                newPosY = startPosY + applied;
            }

            setLogoWidth(newWidth);
            setLogoHeight(newHeight);
            setLogoPos({ x: newPosX, y: newPosY });
        }
    }, [isDraggingLogo, isResizingLogo, zoom]);

    const handleWindowMouseUp = useCallback(() => {
        setIsDraggingLogo(false);
        setIsResizingLogo(false);
        logoResizeStartRef.current = null;
    }, []);

    useEffect(() => {
        if (isDraggingLogo || isResizingLogo) {
            window.addEventListener('mousemove', handleWindowMouseMove);
            window.addEventListener('mouseup', handleWindowMouseUp);
        } else {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
        };
    }, [isDraggingLogo, isResizingLogo, handleWindowMouseMove, handleWindowMouseUp]);

    // Handle Logo Upload
    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            (async () => {
                try {
                    // If enabled + logged in, optimize and upload to Supabase Storage (smallest files).
                    const shouldUpload = Boolean(user) && (config.storeWorksheetAssets ?? true);
                    if (shouldUpload && user) {
                        const optimized = await optimizeImageForUpload(file, { maxDimension: 900, quality: 0.82, preferAlpha: true });

                        // If we don't yet have a worksheet id (before generation), defer upload until we do.
                        if (!generatedWs?.id) {
                            const objectUrl = URL.createObjectURL(optimized.blob);
                            pendingLogoUploadRef.current = {
                                objectUrl,
                                blob: optimized.blob,
                                contentType: optimized.contentType,
                                extension: optimized.extension,
                                width: optimized.width,
                                height: optimized.height,
                            };

                            setLogoUrl(objectUrl);
                            setLogoStoragePath(null);
                            setLogoSelected(true);

                            const width = 180;
                            const height = Math.max(30, width * (optimized.height / optimized.width));
                            setTimeout(() => placeLogoTopRight({ width, height }), 0);
                            return;
                        }

                        const uploaded = await uploadWorksheetAsset({
                            userId: user.id,
                            blob: optimized.blob,
                            contentType: optimized.contentType,
                            extension: optimized.extension,
                            kind: 'logo',
                            worksheetId: generatedWs?.id,
                        });

                        setLogoUrl(uploaded.signedUrl);
                        setLogoStoragePath(uploaded.path);
                        setLogoSelected(true);

                        const width = 180;
                        const height = Math.max(30, width * (optimized.height / optimized.width));
                        setTimeout(() => placeLogoTopRight({ width, height }), 0);
                        return;
                    }

                    // Fallback: store inline base64 (works offline/guest but is larger)
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        const dataUrl = ev.target?.result as string;
                        setLogoUrl(dataUrl);
                        setLogoStoragePath(null);
                        setLogoSelected(true);

                        const img = new Image();
                        img.onload = () => {
                            const naturalW = img.naturalWidth || 1;
                            const naturalH = img.naturalHeight || 1;
                            const width = 180;
                            const height = Math.max(30, width * (naturalH / naturalW));
                            setTimeout(() => placeLogoTopRight({ width, height }), 0);
                        };
                        img.onerror = () => {
                            setTimeout(() => placeLogoTopRight({ width: 180, height: 90 }), 0);
                        };
                        img.src = dataUrl;
                    };
                    reader.readAsDataURL(file);
                } catch (err) {
                    console.error('Logo upload failed:', err);
                    alert('Failed to upload logo. Please try again.');
                }
            })();
        }
        e.target.value = '';
    };

    const handleAddImageClick = () => {
        imageInputRef.current?.click();
    };

    const addImageBlock = useCallback((url: string, storagePath?: string) => {
        setBlocks((prev) => [
            {
                id: `image-${createId()}`,
                type: 'image',
                title: 'Image',
                payload: { url, storagePath },
                previewHtml: imageToHtml(url, storagePath),
            } as WorksheetBlock,
            ...prev,
        ]);
        onDirtyChange?.(true);
    }, [onDirtyChange, setBlocks]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            (async () => {
                try {
                    const shouldUpload = Boolean(user) && (config.storeWorksheetAssets ?? true);
                    if (shouldUpload && user) {
                        const optimized = await optimizeImageForUpload(file, { maxDimension: 1400, quality: 0.85, preferAlpha: true });
                        const uploaded = await uploadWorksheetAsset({
                            userId: user.id,
                            blob: optimized.blob,
                            contentType: optimized.contentType,
                            extension: optimized.extension,
                            kind: 'image',
                            worksheetId: generatedWs?.id,
                        });
                        addImageBlock(uploaded.signedUrl, uploaded.path);
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        const dataUrl = ev.target?.result as string;
                        addImageBlock(dataUrl);
                    };
                    reader.readAsDataURL(file);
                } catch (err) {
                    console.error('Image upload failed:', err);
                    alert('Failed to add image. Please try again.');
                }
            })();
        }
        e.target.value = '';
    };

    const handleLogoResizeMouseDown = (e: React.MouseEvent, handle: 'e' | 'w' | 'n' | 's' | 'ne' | 'nw' | 'se' | 'sw') => {
        e.stopPropagation();
        e.preventDefault();
        setLogoSelected(true);
        const container = (e.currentTarget as HTMLElement).parentElement as HTMLElement | null;
        const rect = container?.getBoundingClientRect();
        const startWidth = rect ? rect.width / zoom : logoWidth;
        const startHeight = rect ? rect.height / zoom : logoHeight;
        logoResizeStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            width: startWidth,
            height: startHeight,
            posX: logoPos.x,
            posY: logoPos.y,
            handle,
        };
        setIsResizingLogo(true);
    };

    // Add Menu Click Outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
                setShowAddMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // History & Undo/Redo Logic
    const addToHistory = (content: string) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(content);
        if (newHistory.length > 20) newHistory.shift();
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            if (generatedWs) setGeneratedWs({ ...generatedWs, content: history[newIndex] });
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            if (generatedWs) setGeneratedWs({ ...generatedWs, content: history[newIndex] });
        }
    };

    const handleContentInput = (e: React.FormEvent<HTMLDivElement>) => {
        const currentContent = e.currentTarget.innerHTML;
        if (historyTimeout) clearTimeout(historyTimeout);
        const timeout = setTimeout(() => {
            if (currentContent !== history[historyIndex]) {
                addToHistory(currentContent);
                if (generatedWs) setGeneratedWs(prev => prev ? ({ ...prev, content: currentContent }) : null);
            }
        }, 1000);
        setHistoryTimeout(timeout);
    };

    useEffect(() => {
        if (generatedWs && history.length === 0) {
            setHistory([generatedWs.content]);
            setHistoryIndex(0);
        } else if (generatedWs && generatedWs.content !== history[historyIndex]) {
            setHistory([generatedWs.content]);
            setHistoryIndex(0);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [generatedWs?.id]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles: UploadedFile[] = [];
            const MAX_SIZE = 4 * 1024 * 1024; // 4MB
            
            for (let i = 0; i < e.target.files.length; i++) {
                const file = e.target.files[i];
                if (file.size > MAX_SIZE) {
                    alert(`File "${file.name}" exceeds the 4MB limit.`);
                    continue;
                }
                if (uploadedFiles.length + newFiles.length >= 3) {
                    alert("Maximum 3 files allowed.");
                    break;
                }
                try {
                    const processed = await processFile(file);
                    newFiles.push(processed);
                } catch (err) {
                    console.error("Error reading file", err);
                    alert(`Failed to read file: ${file.name}`);
                }
            }
            setUploadedFiles(prev => [...prev, ...newFiles]);
            e.target.value = '';
        }
    };

    const removeFile = (index: number) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Activity Management
    const addActivity = (type: ActivityType) => {
        const supportsContext = ['gap-fill', 'word-formation', 'multiple-choice'].includes(type);
        const defaultCount =
            type === 'wordsearch' ? 10 : type === 'matching' ? 8 : type === 'table' ? 4 : type === 'custom' ? 1 : 5;
        const defaultOptions =
            type === 'multiple-choice'
                ? { mcCount: 4 as const }
                : type === 'wordsearch'
                    ? { rows: 10, cols: 10 }
                    : type === 'table'
                        ? { rows: 4, cols: 3 }
                        : undefined;
        setConfig(prev => ({
            ...prev,
            activities: [...prev.activities, { 
                id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type, 
                count: defaultCount,
                contextType: supportsContext ? 'sentences' : undefined,
                options: defaultOptions,
                customInstructions: ''
            }]
        }));
        setShowAddMenu(false);
    };

    const removeActivity = (id: string, e?: React.MouseEvent) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        setConfig(prev => ({ ...prev, activities: prev.activities.filter(a => a.id !== id) }));
    };

    const updateActivityCount = (id: string, count: number) => {
        setConfig(prev => ({ ...prev, activities: prev.activities.map(a => a.id === id ? { ...a, count } : a) }));
    };

    const updateActivityContext = (id: string, contextType: 'sentences' | 'text') => {
         setConfig(prev => ({ ...prev, activities: prev.activities.map(a => a.id === id ? { ...a, contextType } : a) }));
    };

    const updateActivityInstructions = (id: string, customInstructions: string) => {
        setConfig(prev => ({ ...prev, activities: prev.activities.map(a => a.id === id ? { ...a, customInstructions } : a) }));
    };

    const updateMcOptions = (id: string, optionCount: 2 | 3 | 4) => {
        setConfig(prev => ({ ...prev, activities: prev.activities.map(a => a.id === id ? { ...a, options: { ...(a.options || {}), mcCount: optionCount } } : a) }));
    };

    const updateActivityGrid = (id: string, patch: { rows?: number; cols?: number }) => {
        setConfig(prev => ({
            ...prev,
            activities: prev.activities.map(a => {
                if (a.id !== id) return a;
                const nextOptions = { ...(a.options || {}), ...patch };
                const nextCount = a.type === 'table' && typeof patch.rows === 'number' ? patch.rows : a.count;
                return { ...a, options: nextOptions, count: nextCount };
            })
        }));
    };

    // Drag & Drop
    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.setData("text/plain", index.toString());
        e.dataTransfer.effectAllowed = "move";
        (e.target as HTMLElement).style.opacity = '0.5';
    };
    const handleDragEnd = (e: React.DragEvent) => { (e.target as HTMLElement).style.opacity = '1'; }
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        const sourceIndex = parseInt(e.dataTransfer.getData("text/plain"));
        if (sourceIndex === targetIndex) return;
        const newActivities = [...config.activities];
        const [movedItem] = newActivities.splice(sourceIndex, 1);
        newActivities.splice(targetIndex, 0, movedItem);
        setConfig(prev => ({ ...prev, activities: newActivities }));
    };

    // Generate & Save
    const handleGenerate = async () => {
        if (generatedWs?.content?.trim()) {
            const ok = window.confirm("Generating new blocks will replace the current blocks/pages. Any unsaved changes will be lost. Continue?");
            if (!ok) return;
        }

        if (!config.topic && uploadedFiles.length === 0) {
            alert("Please enter a topic or upload a source file!");
            return;
        }

        setLoading(true);
        try {
            const finalConfig = { ...config, files: uploadedFiles };
            const ai = (await generateWorksheetContent(finalConfig)) as WorksheetAiResultV1;

            if (finalConfig.title) ai.title = finalConfig.title;

            const nextBlocks = blocksFromAi(ai, finalConfig);
            const seed = createEmptyDoc();
            const nextDoc = {
                kind: 'worksheet-designer',
                version: 1,
                settings: seed.settings,
                pages: seed.pages,
                blocks: nextBlocks,
                elements: [],
            } satisfies WorksheetDesignerDocV1;

            setPages(nextDoc.pages);
            setBlocks(nextDoc.blocks);
            setElements(nextDoc.elements);
            setDesignerSettings(nextDoc.settings || {});
            setSelectedElementId(null);

            setGeneratedWs({
                id: generatedWs?.id || createId(),
                createdAt: new Date().toISOString(),
                title: ai.title || finalConfig.title || 'Worksheet',
                content: JSON.stringify(nextDoc),
                answerKey: ai.answerKeyHtml || null,
                type: 'Designer',
                config: finalConfig,
            });
            setSaveStatus('idle');
            onDirtyChange?.(true);
        } catch (error) {
            console.error(error);
            alert("Error generating worksheet.");
        } finally {
            setLoading(false);
        }
    };

    const getCurrentDocString = () => {
        const doc: WorksheetDesignerDocV1 = {
            kind: 'worksheet-designer',
            version: 1,
            settings: designerSettings,
            pages,
            blocks,
            elements,
        };
        return JSON.stringify(doc);
    };

    const handleSave = () => {
        if (!user) { alert("Please log in to save."); return; }
        if (!generatedWs) return;
        const finalWs = {
            ...generatedWs,
            title: config.title || generatedWs.title,
            content: getCurrentDocString(),
            type: 'Designer',
            config: { ...config, isPublic, files: uploadedFiles },
        };
        setSaveStatus('saving');
        saveWorksheetToLibrary(finalWs, user.id, user.name).then(success => {
            if (success) {
                setSaveStatus('saved');
                setGeneratedWs(finalWs);
                setTimeout(() => setSaveStatus('idle'), 2000);
                onDirtyChange?.(false);
            } else { alert("Failed to save."); setSaveStatus('idle'); }
        });
    };

    const handlePrint = () => {
        window.print();
    };

    const insertPageBreak = () => {
        const contentDiv = contentRef.current?.querySelector('.ws-content') as HTMLElement;
        if (!contentDiv) return;
        contentDiv.focus();
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (contentDiv.contains(range.commonAncestorContainer)) {
                const div = document.createElement('div');
                div.className = 'forced-page-break';
                div.contentEditable = 'false';
                div.innerHTML = `<span class="break-label">PAGE BREAK</span><button class="delete-break-btn" title="Remove">×</button>`;
                range.deleteContents(); range.insertNode(div); range.setStartAfter(div); range.setEndAfter(div);
                selection.removeAllRanges(); selection.addRange(range);
                addToHistory(contentDiv.innerHTML);
            }
        }
    };

    // Check formatting state of current selection
    const checkFormats = () => {
        setActiveFormats({
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline'),
            justifyLeft: document.queryCommandState('justifyLeft'),
            justifyCenter: document.queryCommandState('justifyCenter'),
            justifyRight: document.queryCommandState('justifyRight'),
        });
    };

    // --- SELECTION PERSISTENCE LOGIC ---
    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            selectionRange.current = sel.getRangeAt(0);
        }
    };

    const restoreSelection = () => {
        const sel = window.getSelection();
        if (sel && selectionRange.current) {
            sel.removeAllRanges();
            sel.addRange(selectionRange.current);
        }
    };

    // Rich Text Formatting Helper
    const formatSelection = (command: string, value?: string) => {
        restoreSelection(); // Restore range before executing command
        document.execCommand(command, false, value);
        const contentDiv = contentRef.current?.querySelector('.ws-content');
        if (contentDiv) addToHistory(contentDiv.innerHTML);
        checkFormats(); 
    };

    // Helper to prevent losing focus when clicking tool buttons
    const preventLoss = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    // For complex inputs that steal focus (e.g. Color Picker)
    const handleComplexInputStart = () => {
        saveSelection();
    };

    const handlePreviewClick = (e: React.MouseEvent) => {
        checkFormats();
        saveSelection(); // Save on click too to ensure we have latest valid selection
        if ((e.target as HTMLElement).classList.contains('delete-break-btn')) {
            (e.target as HTMLElement).closest('.forced-page-break')?.remove();
            const contentDiv = contentRef.current?.querySelector('.ws-content');
            if (contentDiv) addToHistory(contentDiv.innerHTML);
        }
    };

    const handleHeightChange = useCallback((height: number) => setContentHeight(height), []);

    const handleVisibilityToggle = () => {
        if (!user) { alert("Please log in to share."); return; }
        setIsPublic(!isPublic);
    };

    return (
        <div className="flex bg-slate-50 relative items-stretch">
            {/* Sidebar */}
            <div className={`no-print ${isSidebarCollapsed ? 'w-14' : 'w-96'} flex-shrink-0 bg-white border-r border-slate-200 z-20 shadow-xl transition-[width] duration-200`}>
                <style>{SIDEBAR_CSS}</style>
                <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-2">
                    <div className={isSidebarCollapsed ? 'hidden' : ''}>
                        <h1 className="font-display text-xl font-bold text-slate-800 flex items-center mb-1">
                            <LayoutTemplate className="mr-2 text-brand-accent" size={20} /> Worksheet Config
                        </h1>
                        <p className="text-xs text-slate-500">Configure parameters for AI generation</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsSidebarCollapsed(v => !v)}
                        title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        className="p-2 rounded hover:bg-slate-100 text-slate-600"
                    >
                        {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>
                {!isSidebarCollapsed && (
                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Worksheet Title</label>
                            <input type="text" value={config.title || ''} onChange={(e) => setConfig({...config, title: e.target.value})} placeholder="e.g. The Solar System" className="w-full p-2 rounded border border-slate-200 text-sm focus:ring-1 focus:ring-teal-400 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Topic</label>
                            <input type="text" value={config.topic} onChange={(e) => setConfig({...config, topic: e.target.value})} placeholder="e.g. Space" className="w-full p-2 rounded border border-slate-200 text-sm focus:ring-1 focus:ring-teal-400 outline-none" />
                        </div>
                        {/* Grade Selector */}
                        <GradeSelector value={config.gradeLevel} onChange={(val) => setConfig({...config, gradeLevel: val})} />
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Page Layout</label>
                            <div className="flex bg-slate-100 rounded-lg p-1">
                                <button onClick={() => setConfig({...config, layout: 'single'})} className={`flex-1 flex items-center justify-center py-1.5 rounded text-xs font-bold transition-all ${config.layout === 'single' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500'}`}><AlignJustify size={14} className="mr-1" /> Single</button>
                                <button onClick={() => setConfig({...config, layout: 'columns'})} className={`flex-1 flex items-center justify-center py-1.5 rounded text-xs font-bold transition-all ${config.layout === 'columns' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500'}`}><Columns size={14} className="mr-1" /> Two Cols</button>
                            </div>
                        </div>

                        {/* Difficulty Level */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Difficulty Level</label>
                            <select
                                value={config.difficultyLevel || 'medium'}
                                onChange={(e) => setConfig({...config, difficultyLevel: e.target.value as 'easy' | 'medium' | 'hard' | 'mixed'})}
                                className="w-full p-2 rounded border border-slate-200 bg-white text-sm focus:ring-1 focus:ring-teal-400 outline-none"
                            >
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                                <option value="mixed">Mixed (Progressive)</option>
                            </select>
                            <p className="text-xs text-slate-500 mt-1">Adjusts vocabulary complexity and question difficulty</p>
                        </div>

                        {/* Answer Key Toggle */}
                        <div>
                            <label className="flex items-start gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.generateAnswerKey || false}
                                    onChange={(e) => setConfig({...config, generateAnswerKey: e.target.checked})}
                                    className="mt-1"
                                />
                                <div>
                                    <span className="block text-xs font-bold text-slate-700">Generate Answer Key</span>
                                    <p className="text-xs text-slate-500 mt-1">Includes complete answers at the end of the worksheet</p>
                                </div>
                            </label>
                        </div>

                        {/* Header Toggle */}
                        <div>
                            <label className="flex items-start gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.includeHeader || false}
                                    onChange={(e) => setConfig({...config, includeHeader: e.target.checked})}
                                    className="mt-1"
                                />
                                <div>
                                    <span className="block text-xs font-bold text-slate-700">Include Name & Date Header</span>
                                    <p className="text-xs text-slate-500 mt-1">Adds Name and Date fields at the top of the worksheet</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* LOGO SECTION */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center">
                            <ImageIcon size={14} className="mr-1 text-teal-600" /> Logo (Optional)
                        </label>
                        <p className="text-[10px] text-slate-500 mb-2">Defaults to top-right at a fixed size.</p>

                        {user && (
                            <label className="flex items-center gap-2 text-[10px] text-slate-600 mb-2 select-none">
                                <input
                                    type="checkbox"
                                    checked={config.storeWorksheetAssets ?? true}
                                    onChange={(e) => setConfig(prev => ({ ...prev, storeWorksheetAssets: e.target.checked }))}
                                />
                                Optimize & store images online (smaller files)
                            </label>
                        )}

                        <div className="flex items-center gap-2">
                            <label className="flex-1 cursor-pointer">
                                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                                <div className="flex items-center justify-center p-2 border-2 border-dashed border-slate-300 rounded hover:border-teal-500 hover:bg-white cursor-pointer transition-colors text-slate-500 font-bold text-[10px]">
                                    <ImagePlus size={12} className="mr-1" /> {logoUrl ? 'Replace Logo' : 'Add Logo'}
                                </div>
                            </label>
                            {logoUrl && (
                                <button
                                    type="button"
                                    onClick={handleRemoveLogo}
                                    className="p-2 rounded border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 transition-colors text-red-600"
                                    title="Remove logo"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {logoUrl && (
                            <div className="mt-2 flex items-center gap-2">
                                <img src={logoUrl} alt="Logo preview" className="w-10 h-10 object-contain border border-slate-200 rounded bg-white" />
                                <div className="text-[10px] text-slate-500 leading-snug">
                                    Drag to move. Use the handles to resize (or click and press Delete).
                                    <button
                                        type="button"
                                        className="ml-2 text-teal-600 font-bold hover:underline"
                                        onClick={() => placeLogoTopRight({ width: 180 })}
                                    >
                                        Reset position
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* FILE UPLOAD SECTION */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center">
                            <Paperclip size={14} className="mr-1 text-teal-600" /> Source Material
                        </label>
                        <p className="text-[10px] text-slate-500 mb-2">Upload PDFs/Images (Max 3, 4MB each).</p>
                        
                        <div className="space-y-2">
                            {uploadedFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white p-1.5 rounded border border-slate-200 text-xs">
                                    <div className="flex items-center truncate">
                                        <FileText size={12} className="text-slate-400 mr-1.5 flex-shrink-0" />
                                        <span className="text-slate-600 truncate max-w-[150px]">{file.name}</span>
                                    </div>
                                    <button onClick={() => removeFile(idx)} className="text-red-400 hover:text-red-600 p-0.5">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                            
                            {uploadedFiles.length < 3 && (
                                <label className="flex items-center justify-center p-2 border-2 border-dashed border-slate-300 rounded hover:border-teal-500 hover:bg-white cursor-pointer transition-colors text-slate-500 font-bold text-[10px]">
                                    <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} className="hidden" />
                                    <Plus size={12} className="mr-1" /> Add Document
                                </label>
                            )}
                        </div>
                    </div>

                    {/* ACTIVITIES SECTION */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold text-slate-700 flex items-center">
                                <LayoutTemplate size={14} className="mr-1 text-teal-600" /> Activities
                            </label>
                            <span className="text-[10px] text-slate-400">{config.activities.length} items</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-2">Add one or more activity blocks (drag to reorder).</p>

                        <div className="relative" ref={addMenuRef}>
                            <button
                                type="button"
                                onClick={() => setShowAddMenu(!showAddMenu)}
                                className={`w-full flex items-center justify-center p-2 border-2 border-dashed border-slate-300 rounded hover:border-teal-500 hover:bg-white cursor-pointer transition-colors text-slate-500 font-bold text-[10px] ${showAddMenu ? 'border-teal-500 text-teal-600 bg-white' : ''}`}
                            >
                                <Plus size={12} className="mr-1" /> Add Activity
                                <ChevronDown size={12} className={`ml-1 transition-transform ${showAddMenu ? 'rotate-180' : ''}`} />
                            </button>
                            {showAddMenu && (
                                <div className="absolute top-full left-0 w-full pt-2 z-20">
                                    <div className="bg-white border border-slate-200 shadow-xl rounded-lg p-2 max-h-[250px] overflow-y-auto">
                                        {availableActivities.map(a => (
                                            <button
                                                key={a.type}
                                                onClick={() => addActivity(a.type)}
                                                className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-teal-50 hover:text-teal-700 rounded transition-colors"
                                            >
                                                {a.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 mt-3">
                            {config.activities.map((act, index) => {
                                const activityLabel = availableActivities.find(a => a.type === act.type)?.label || act.type;
                                const supportsContext = ['gap-fill', 'word-formation', 'multiple-choice'].includes(act.type);
                                const isMcq = act.type === 'multiple-choice';
                                const showCount = !['table', 'custom'].includes(act.type);
                                const countLabel =
                                    act.type === 'wordsearch'
                                        ? 'Words'
                                        : act.type === 'matching'
                                            ? 'Pairs'
                                            : 'Qty';
                                const showGrid = ['wordsearch', 'table'].includes(act.type);
                                const gridDefaults = act.type === 'wordsearch'
                                    ? { rows: 10, cols: 10 }
                                    : { rows: 4, cols: 3 };
                                const gridRows = act.options?.rows ?? gridDefaults.rows;
                                const gridCols = act.options?.cols ?? gridDefaults.cols;
                                const mcCount = Math.min(4, Math.max(2, Math.round(act.options?.mcCount ?? 4)));
                                return (
                                    <div key={act.id} draggable onDragStart={(e) => handleDragStart(e, index)} onDragEnd={handleDragEnd} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, index)} className="border border-teal-200 bg-teal-50/30 rounded p-2 relative group cursor-move hover:shadow-sm transition-all active:cursor-grabbing">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center text-slate-700 font-bold text-xs select-none truncate">
                                                <GripVertical size={12} className="text-slate-400 mr-1" /><span className="bg-teal-100 text-teal-800 text-[9px] px-1 py-0.5 rounded mr-1">#{index + 1}</span>{activityLabel}
                                            </div>
                                            <button onClick={(e) => removeActivity(act.id, e)} className="text-slate-300 hover:text-red-500 p-0.5 rounded hover:bg-red-50 transition-colors"><X size={14} /></button>
                                        </div>
                                        <div className="pl-4 flex flex-wrap gap-2">
                                            {showCount && (
                                                <div className="flex-1 min-w-[60px]">
                                                    <label className="text-[9px] text-slate-500 font-bold uppercase block">{countLabel}</label>
                                                    <input type="number" min={1} max={50} value={act.count} onChange={(e) => updateActivityCount(act.id, parseInt(e.target.value))} className="w-full p-1 text-xs border border-slate-300 rounded text-center outline-none" />
                                                </div>
                                            )}
                                            {act.type === 'multiple-choice' && (
                                                <div className="flex-1 min-w-[60px]">
                                                    <label className="text-[9px] text-slate-500 font-bold uppercase block">Opts</label>
                                                    <select value={mcCount} onChange={(e) => updateMcOptions(act.id, parseInt(e.target.value, 10) as any)} className="w-full p-1 text-xs border border-slate-300 rounded outline-none"><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option></select>
                                                </div>
                                            )}
                                            {showGrid && (
                                                <>
                                                    <div className="flex-1 min-w-[60px]">
                                                        <label className="text-[9px] text-slate-500 font-bold uppercase block">Rows</label>
                                                        <input type="number" min={2} max={30} value={gridRows} onChange={(e) => updateActivityGrid(act.id, { rows: parseInt(e.target.value) })} className="w-full p-1 text-xs border border-slate-300 rounded text-center outline-none" />
                                                    </div>
                                                    <div className="flex-1 min-w-[60px]">
                                                        <label className="text-[9px] text-slate-500 font-bold uppercase block">Cols</label>
                                                        <input type="number" min={2} max={30} value={gridCols} onChange={(e) => updateActivityGrid(act.id, { cols: parseInt(e.target.value) })} className="w-full p-1 text-xs border border-slate-300 rounded text-center outline-none" />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        {supportsContext && (
                                            <div className="mt-1 pt-1 border-t border-teal-100 pl-4">
                                                <div className="flex bg-white rounded border border-slate-200 overflow-hidden">
                                                    <button
                                                        type="button"
                                                        className={`flex-1 text-[9px] py-0.5 ${act.contextType === 'sentences' ? 'bg-teal-100 text-teal-700 font-bold' : 'text-slate-500'}`}
                                                        onClick={() => updateActivityContext(act.id, 'sentences')}
                                                    >
                                                        {isMcq ? 'Questions Only' : 'Sentences'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`flex-1 text-[9px] py-0.5 ${act.contextType === 'text' ? 'bg-teal-100 text-teal-700 font-bold' : 'text-slate-500'}`}
                                                        onClick={() => updateActivityContext(act.id, 'text')}
                                                    >
                                                        Story
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        <div className="mt-1 pl-4 w-full">
                                            <label className="text-[9px] text-slate-500 font-bold uppercase block">Notes</label>
                                            <textarea
                                                value={act.customInstructions || ''}
                                                onChange={(e) => updateActivityInstructions(act.id, e.target.value)}
                                                placeholder="Specific instructions for this activity..."
                                                className="w-full p-1.5 text-[11px] border border-slate-300 rounded outline-none resize-none"
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Instructions</label>
                        <textarea value={config.customInstructions} onChange={(e) => setConfig({...config, customInstructions: e.target.value})} placeholder="E.g. vocabulary..." className="w-full p-2 rounded border border-slate-200 outline-none h-16 resize-none text-xs" />
                    </div>
                    <button onClick={handleGenerate} disabled={loading} className={`w-full py-3 rounded-xl font-bold shadow-md transition-all flex items-center justify-center text-white text-sm ${loading ? 'bg-slate-300 cursor-not-allowed' : 'bg-teal-500 hover:bg-teal-600 hover:shadow-lg'}`}>{loading ? 'Creating...' : <><Sparkles size={16} className="mr-2" /> Generate</>}</button>
                </div>
                )}
            </div>

            {/* Canvas + Blocks Tray + Properties */}
            <div className="flex-1 flex min-w-0 border-l border-slate-200">
                <input
                    ref={imageInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    onChange={handleImageUpload}
                    className="hidden"
                />
                <WorksheetDesigner
                    pages={pages}
                    setPages={setPages}
                    blocks={blocks}
                    setBlocks={setBlocks}
                    elements={elements}
                    setElements={setElements}
                    settings={designerSettings}
                    setSettings={setDesignerSettings}
                    selectedElementId={selectedElementId}
                    setSelectedElementId={setSelectedElementId}
                    onDirty={onDirtyChange}
                    onSave={handleSave}
                    saveStatus={saveStatus}
                    onAddImage={handleAddImageClick}
                    isPublic={isPublic}
                    onTogglePublic={handleVisibilityToggle}
                />
            </div>
        </div>
    );
};

// --- PERSONAL LIBRARY COMPONENT ---
const WorksheetLibrary: React.FC<{ onLoad: (ws: GeneratedWorksheet) => void }> = ({ onLoad }) => {
    const { user } = useAuth();
    const [worksheets, setWorksheets] = useState<GeneratedWorksheet[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('newest');

    const loadWorksheets = async () => {
        setLoading(true);
        const data = await getSavedWorksheets(user?.id);
        setWorksheets(data);
        setLoading(false);
    };

    useEffect(() => {
        loadWorksheets();
    }, [user]);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if(window.confirm("Are you sure you want to delete this worksheet?")) {
            await deleteSavedWorksheet(id, user?.id);
            loadWorksheets();
        }
    };

    const filteredWorksheets = worksheets.filter(ws => {
        if (search) {
            const term = search.toLowerCase();
            const matchesTitle = ws.title.toLowerCase().includes(term);
            const matchesTopic = ws.config?.topic?.toLowerCase().includes(term);
            if (!matchesTitle && !matchesTopic) return false;
        }
        return true;
    }).sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        if (sortBy === 'oldest') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        if (sortBy === 'az') return a.title.localeCompare(b.title);
        if (sortBy === 'za') return b.title.localeCompare(a.title);
        return 0;
    });

    return (
        <div className="animate-fade-in pb-12">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-slate-800">My Saved Worksheets</h2>
            </div>

            {/* Control Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-grow w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search my worksheets..." 
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-teal-400 outline-none text-sm"
                    />
                </div>

                <div className="relative min-w-[160px] w-full md:w-auto">
                    <SortAsc className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full pl-10 pr-8 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-teal-400 outline-none appearance-none bg-white text-sm cursor-pointer"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="az">A-Z (Title)</option>
                        <option value="za">Z-A (Title)</option>
                    </select>
                </div>
            </div>

            <div className="mb-4 text-sm text-slate-500 font-bold">
                Showing {filteredWorksheets.length} worksheet{filteredWorksheets.length !== 1 ? 's' : ''}
            </div>

            {loading ? (
                <div className="text-center py-20 text-slate-500">Loading library...</div>
            ) : filteredWorksheets.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">No worksheets found</h3>
                    <p className="text-slate-400 max-w-sm mx-auto mb-6">
                        {worksheets.length === 0 ? "Create your first worksheet to see it here." : "Try changing your search terms."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredWorksheets.map(ws => (
                        <div key={ws.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all p-5 cursor-pointer group relative" onClick={() => onLoad(ws)}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="bg-teal-50 text-teal-700 text-xs font-bold px-2 py-1 rounded border border-teal-100 uppercase tracking-wide">{ws.type}</span>
                                    {ws.config?.isPublic && <span className="bg-green-50 text-green-600 text-xs font-bold px-2 py-1 rounded border border-green-100 flex items-center"><Globe size={10} className="mr-1" /> Public</span>}
                                </div>
                                <button onClick={(e) => handleDelete(e, ws.id!)} className="text-slate-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={16} /></button>
                            </div>
                            <h3 className="font-display font-bold text-lg text-slate-800 mb-1 truncate" title={ws.title}>{ws.title}</h3>
                            <p className="text-sm text-slate-500 mb-4 truncate">{ws.config?.topic || 'General Topic'}</p>
                            <div className="pt-4 border-t border-slate-50 flex justify-between items-center text-xs text-slate-400 font-medium">
                                <span>{new Date(ws.createdAt || Date.now()).toLocaleDateString()}</span>
                                {ws.config?.gradeLevel && <span>{ws.config.gradeLevel}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- COMMUNITY LIBRARY COMPONENT ---
const CommunityWorksheets: React.FC<{ onLoad: (ws: GeneratedWorksheet) => void }> = ({ onLoad }) => {
    const [worksheets, setWorksheets] = useState<GeneratedWorksheet[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchWorksheets = async () => {
        setLoading(true);
        const { data } = await getCommunityWorksheets(1, 30, search);
        setWorksheets(data);
        setLoading(false);
    };

    useEffect(() => {
        const timer = setTimeout(fetchWorksheets, 500);
        return () => clearTimeout(timer);
    }, [search]);

    return (
        <div className="animate-fade-in pb-12">
            <div className="mb-8 relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                    placeholder="Search community worksheets..." 
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-teal-400 shadow-sm" 
                />
            </div>

            {loading ? (
                <div className="text-center py-20 text-slate-500">Loading community...</div>
            ) : worksheets.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
                    <Globe size={40} className="text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">No worksheets found matching your search.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {worksheets.map(ws => (
                        <div key={ws.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all p-5 cursor-pointer group" onClick={() => onLoad(ws)}>
                            <div className="flex justify-between items-start mb-3">
                                <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded border border-indigo-100 uppercase tracking-wide">{ws.type}</span>
                                <span className="text-slate-400 text-xs flex items-center"><Globe size={12} className="mr-1" /> Community</span>
                            </div>
                            <h3 className="font-display font-bold text-lg text-slate-800 mb-1 truncate" title={ws.title}>{ws.title}</h3>
                            <p className="text-xs text-slate-400 mb-3">By {ws.authorName || 'Teacher'}</p>
                            
                            <div className="pt-4 border-t border-slate-50 flex justify-between items-center mt-2">
                                <button className="text-xs font-bold text-teal-600 bg-teal-50 px-3 py-1.5 rounded hover:bg-teal-100 transition-colors flex items-center">
                                    <Copy size={12} className="mr-1" /> Use Template
                                </button>
                                {ws.config?.gradeLevel && <span className="text-xs text-slate-500 font-medium">{ws.config.gradeLevel}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---
const INITIAL_WORKSHEET_CONFIG: WorksheetConfig = {
    title: '',
    topic: '',
    gradeLevel: '',
    activities: [],
    layout: 'single',
    isPublic: true,
    storeWorksheetAssets: true,
    logo: null,
};

export const Worksheets: React.FC = () => {
    const location = useLocation();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'create' | 'library' | 'community'>('create');
    const [config, setConfig] = useState<WorksheetConfig>(INITIAL_WORKSHEET_CONFIG);
    const [generatedWs, setGeneratedWs] = useState<GeneratedWorksheet | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const resetCreateState = useCallback(() => {
        setGeneratedWs(null);
        setConfig(INITIAL_WORKSHEET_CONFIG);
        setHasUnsavedChanges(false);
    }, []);

    const confirmLoseUnsaved = useCallback(() => {
        if (!hasUnsavedChanges) return true;
        return window.confirm("You have unsaved work. If you leave, your changes will be lost. Continue?");
    }, [hasUnsavedChanges]);

    const handleTabChange = useCallback((nextTab: 'create' | 'library' | 'community') => {
        if (activeTab === nextTab) return;

        if (activeTab === 'create' && nextTab !== 'create') {
            if (!confirmLoseUnsaved()) return;
            resetCreateState();
        }

        setActiveTab(nextTab);
    }, [activeTab, confirmLoseUnsaved, resetCreateState]);

    useEffect(() => {
        if (location.state && location.state.tab) {
            setActiveTab(location.state.tab);
        }
    }, [location]);

    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (activeTab === 'create' && hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [activeTab, hasUnsavedChanges]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (activeTab !== 'create' || !hasUnsavedChanges) return;

            const target = e.target as HTMLElement | null;
            const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
            if (!anchor) return;
            if (anchor.target === '_blank' || e.defaultPrevented) return;

            const href = anchor.getAttribute('href') || '';
            if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

            const url = new URL(anchor.href, window.location.href);
            const isSamePage =
                url.origin === window.location.origin &&
                url.pathname === window.location.pathname &&
                url.search === window.location.search &&
                url.hash === window.location.hash;

            if (isSamePage) return;

            const ok = confirmLoseUnsaved();
            if (!ok) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            resetCreateState();
        };

        document.addEventListener('click', handler, true);
        return () => document.removeEventListener('click', handler, true);
    }, [activeTab, hasUnsavedChanges, confirmLoseUnsaved, resetCreateState]);

    const handleLoad = async (ws: GeneratedWorksheet) => {
        // Strip ID if loading from community to treat as template
        const isCommunity = activeTab === 'community';

        const nextIsPublic = isCommunity ? false : (ws.config?.isPublic ?? true);

        let nextContent = ws.content;
        if (user && typeof ws.content === 'string') {
            const doc = tryParseDesignerDoc(ws.content);
            if (doc) {
                const nextElements = await Promise.all(
                    (doc.elements || []).map(async (el) => {
                        if (typeof el?.html === 'string' && el.html.includes('data-storage-path')) {
                            return { ...el, html: await resolveWorksheetHtmlAssetUrls(el.html) };
                        }
                        return el;
                    })
                );

                const nextBlocks = await Promise.all(
                    (doc.blocks || []).map(async (b) => {
                        if (b?.type === 'image' && b?.payload?.storagePath && user) {
                            try {
                                const signedUrl = await createSignedUrlForWorksheetAsset(b.payload.storagePath);
                                return {
                                    ...b,
                                    payload: { ...b.payload, url: signedUrl },
                                    previewHtml: imageToHtml(signedUrl, b.payload.storagePath),
                                };
                            } catch {
                                // fall back to stored url
                            }
                        }
                        if (typeof b?.previewHtml === 'string' && b.previewHtml.includes('data-storage-path')) {
                            return { ...b, previewHtml: await resolveWorksheetHtmlAssetUrls(b.previewHtml) };
                        }
                        const payloadHtml = typeof b?.payload?.html === 'string' ? b.payload.html : null;
                        if (payloadHtml && payloadHtml.includes('data-storage-path')) {
                            return { ...b, payload: { ...b.payload, html: await resolveWorksheetHtmlAssetUrls(payloadHtml) } };
                        }
                        return b;
                    })
                );

                nextContent = JSON.stringify({ ...doc, elements: nextElements, blocks: nextBlocks });
            } else if (ws.content.includes('data-storage-path')) {
                nextContent = await resolveWorksheetHtmlAssetUrls(ws.content);
            }
        }

        const nextLogo = ws.config?.logo;
        let resolvedLogoUrl = nextLogo?.url;
        if (nextLogo?.storagePath && user) {
            try {
                resolvedLogoUrl = await createSignedUrlForWorksheetAsset(nextLogo.storagePath);
            } catch {
                // fall back to stored url
            }
        }
        
        setGeneratedWs({
            ...ws,
            content: nextContent,
            id: isCommunity ? createId() : ws.id, // New ID for community copy so it saves as a new entry (and assets can be tied to it)
            config: {
                ...ws.config,
                isPublic: nextIsPublic,
                logo: nextLogo
                    ? { ...nextLogo, url: resolvedLogoUrl || nextLogo.url }
                    : nextLogo,
            } // Keep visibility for personal; force private when copying from community
        });
        setConfig(ws.config || INITIAL_WORKSHEET_CONFIG);

        setHasUnsavedChanges(false);
        setActiveTab('create');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {/* Header - EXACT MATCH of Games.tsx GameHub structure */}
            <div className="no-print max-w-7xl mx-auto px-4 py-8 w-full shrink-0">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div className="text-center md:text-left">
                        <h1 className="font-display text-4xl font-bold text-slate-800 mb-1">Worksheet Builder</h1>
                        <p className="text-slate-500">Create, edit, and print educational resources.</p>
                    </div>
                    
                    {/* Tabs */}
                    <div className="bg-white p-1.5 rounded-2xl md:rounded-full flex flex-wrap md:flex-nowrap shadow-md border border-slate-100 gap-1 w-full md:w-auto justify-center">
                        <button 
                            onClick={() => handleTabChange('create')}
                            className={`px-3 py-2 md:px-6 md:py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 md:gap-2 whitespace-nowrap
                                ${activeTab === 'create' ? 'bg-brand-blue text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                        >
                            <Sparkles size={16} /> Create New
                        </button>
                        <button 
                            onClick={() => handleTabChange('community')}
                            className={`px-3 py-2 md:px-6 md:py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 md:gap-2 whitespace-nowrap
                                ${activeTab === 'community' ? 'bg-brand-blue text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                        >
                            <Globe size={16} /> Community
                        </button>
                        <button 
                            onClick={() => handleTabChange('library')}
                            className={`px-3 py-2 md:px-6 md:py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 md:gap-2 whitespace-nowrap
                                ${activeTab === 'library' ? 'bg-brand-blue text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                        >
                            <Library size={16} /> My Library
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area - Naturally expanding */}
            <div
                className={`flex flex-col w-full pb-8 ${
                    activeTab === 'create' ? 'px-0' : 'max-w-7xl mx-auto px-4'
                }`}
            >
                {activeTab === 'create' ? (
                    <div className="bg-white shadow-xl border border-slate-200 flex flex-col relative w-full">
                        <WorksheetBuilder
                            config={config}
                            setConfig={setConfig}
                            generatedWs={generatedWs}
                            setGeneratedWs={setGeneratedWs}
                            onLoad={() => {}}
                            onDirtyChange={setHasUnsavedChanges}
                        />
                    </div>
                ) : (
                    <div>
                        {activeTab === 'library' && <WorksheetLibrary onLoad={handleLoad} />}
                        {activeTab === 'community' && <CommunityWorksheets onLoad={handleLoad} />}
                    </div>
                )}
            </div>
        </div>
    );
};
