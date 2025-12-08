
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { FileText, Printer, Sparkles, LayoutTemplate, Save, BookOpen, ArrowLeft, Trash2, LogIn, Check, Edit, Minus, Plus, GripVertical, X, Scissors, Undo, Redo, ChevronDown, ChevronRight, ChevronUp, ZoomIn, ZoomOut, Columns, AlignJustify, Search, Globe, Library, Copy, SortAsc, RefreshCw, AlertTriangle, Paperclip, Image as ImageIcon } from 'lucide-react';
import { WorksheetConfig, GeneratedWorksheet, ActivityType, ActivityConfig, UploadedFile } from '../types';
import { generateWorksheetContent } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';
import { saveWorksheetToLibrary, getSavedWorksheets, deleteSavedWorksheet, getCommunityWorksheets, processFile } from '../utils/gameUtils';

// --- STANDARD WORKSHEET STYLESHEET ---
const WORKSHEET_CSS = `
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
    column-rule: 1px solid #f1f5f9;
  }
  
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
    /* Removed border-bottom as per request */
  }

  /* Typography */
  .ws-title { 
    font-family: 'Fredoka', sans-serif; 
    font-size: 20pt; 
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
    font-size: 11pt;
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
    font-size: 14pt; 
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
    font-size: 11pt;
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
    font-size: 10pt;
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
    font-size: 16pt;
    border-bottom: 2px solid #ef4444;
    padding-bottom: 0.5rem;
  }

  .ws-answer-key p, 
  .ws-answer-key li,
  .ws-answer-key tr {
    break-inside: avoid;
  }

  ul, ol {
      margin-left: 1.5rem;
      margin-bottom: 0.5rem;
  }
  li {
      margin-bottom: 0.4rem;
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
    const [expandedCategory, setExpandedCategory] = useState<string | null>('Grades');
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
    isEditing: boolean,
    layoutMode: 'single' | 'columns',
    logoUrl: string | null,
    logoPos: {x: number, y: number},
    logoWidth: number,
    onLogoDrag: (e: React.MouseEvent) => void,
    onLogoResize: (width: number) => void,
    onHeightChange: (h: number) => void,
    onInput?: (e: React.FormEvent<HTMLDivElement>) => void,
    onClick?: (e: React.MouseEvent) => void
}>(({ htmlContent, fontSize, zoom, isEditing, layoutMode, logoUrl, logoPos, logoWidth, onLogoDrag, onLogoResize, onHeightChange, onInput, onClick }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null);
    React.useImperativeHandle(ref, () => internalRef.current as HTMLDivElement);
    const resizeStartRef = useRef<{x: number, width: number} | null>(null);
    const [isResizing, setIsResizing] = useState(false); // New state to control resize listeners

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
        // Sync HTML content to the editable div
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
        setTimeout(updatePageBreaks, 100);
    };

    // Resize Logic
    const handleResizeStart = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent text selection
        resizeStartRef.current = { x: e.clientX, width: logoWidth };
        setIsResizing(true); // Trigger effect
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
            onClick={onClick}
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
                className={`ws-content ${isEditing ? 'ring-2 ring-blue-200 cursor-text' : ''}`}
                contentEditable={isEditing}
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
        prev.isEditing === next.isEditing &&
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
    onLoad: () => void
}> = ({ config, setConfig, generatedWs, setGeneratedWs }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [isEditing, setIsEditing] = useState(false);
    const [fontSize, setFontSize] = useState(11);
    const [zoom, setZoom] = useState(0.75);
    const contentRef = useRef<HTMLDivElement>(null);
    const [contentHeight, setContentHeight] = useState(0);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const addMenuRef = useRef<HTMLDivElement>(null);
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [historyTimeout, setHistoryTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
    const [isPublic, setIsPublic] = useState(true);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    
    // Logo State
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoPos, setLogoPos] = useState({ x: 20, y: 20 });
    const [logoWidth, setLogoWidth] = useState(150);
    const [isDraggingLogo, setIsDraggingLogo] = useState(false);
    const logoDragOffset = useRef({ x: 0, y: 0 });

    const availableActivities: { type: ActivityType, label: string }[] = [
        { type: 'multiple-choice', label: 'Multiple Choice' },
        { type: 'wordsearch', label: 'Wordsearch' },
        { type: 'matching', label: 'Matching' },
        { type: 'gap-fill', label: 'Gap Fill' },
        { type: 'sentence-transform', label: 'Sentence Transform' },
        { type: 'word-formation', label: 'Word Formation' },
        { type: 'open-ended', label: 'Open Ended' },
    ];

    // Sync visibility state from loaded config
    useEffect(() => {
        if (generatedWs?.config?.isPublic !== undefined) {
            setIsPublic(generatedWs.config.isPublic);
        }
    }, [generatedWs]);

    // Zoom Calculation
    useEffect(() => {
        const calculateZoom = () => {
            if (generatedWs) {
                const container = document.getElementById('preview-wrapper');
                if (container) {
                    const availableWidth = container.clientWidth - 64; 
                    const a4Width = 794; 
                    const newZoom = Math.min(1, availableWidth / a4Width);
                    setZoom(prev => Math.abs(prev - newZoom) > 0.02 ? parseFloat(newZoom.toFixed(2)) : prev);
                }
            }
        };
        const timer = setTimeout(calculateZoom, 100);
        window.addEventListener('resize', calculateZoom);
        return () => {
            window.removeEventListener('resize', calculateZoom);
            clearTimeout(timer);
        }
    }, [generatedWs]);

    // Logo Dragging Logic
    const handleLogoMouseDown = (e: React.MouseEvent) => {
        if (!logoUrl || (e.target as HTMLElement).classList.contains('ws-resize-handle')) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingLogo(true);
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        logoDragOffset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const handleWindowMouseMove = useCallback((e: MouseEvent) => {
        if (isDraggingLogo && contentRef.current) {
            const containerRect = contentRef.current.getBoundingClientRect();
            // Calculate relative position accounting for Zoom
            const rawX = e.clientX - containerRect.left - logoDragOffset.current.x;
            const rawY = e.clientY - containerRect.top - logoDragOffset.current.y;
            
            setLogoPos({
                x: rawX / zoom,
                y: rawY / zoom
            });
        }
    }, [isDraggingLogo, zoom]);

    const handleWindowMouseUp = useCallback(() => {
        setIsDraggingLogo(false);
    }, []);

    useEffect(() => {
        if (isDraggingLogo) {
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
    }, [isDraggingLogo, handleWindowMouseMove, handleWindowMouseUp]);

    // Handle Logo Upload
    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (ev) => {
                setLogoUrl(ev.target?.result as string);
                setLogoPos({ x: 20, y: 20 }); // Reset pos
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
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
        } else if (generatedWs && generatedWs.content !== history[historyIndex] && !isEditing) {
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
        const supportsContext = ['gap-fill', 'multiple-choice', 'word-formation', 'sentence-transform', 'open-ended'].includes(type);
        setConfig(prev => ({
            ...prev,
            activities: [...prev.activities, { 
                id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type, 
                count: 5,
                contextType: supportsContext ? 'sentences' : undefined 
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

    const updateMcOptions = (id: string, optionCount: 2 | 3 | 4) => {
        setConfig(prev => ({ ...prev, activities: prev.activities.map(a => a.id === id ? { ...a, options: { mcCount: optionCount } } : a) }));
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
        if (!config.topic && uploadedFiles.length === 0) { 
            alert("Please enter a topic or upload a source file!"); 
            return; 
        }
        if (config.activities.length === 0 && !window.confirm("Generate blank worksheet?")) return;
        
        setLoading(true);
        setIsEditing(false);
        try {
            const finalConfig = { ...config, files: uploadedFiles };
            const data = await generateWorksheetContent(finalConfig);
            setGeneratedWs(data);
            setSaveStatus('idle');
        } catch (error) { console.error(error); alert("Error generating worksheet."); } 
        finally { setLoading(false); }
    };

    const getCurrentContent = () => {
        const contentDiv = contentRef.current?.querySelector('.ws-content');
        return contentDiv ? contentDiv.innerHTML : (generatedWs?.content || '');
    };

    const handleSave = () => {
        if (!user) { alert("Please log in to save."); return; }
        if (!generatedWs) return;
        const finalWs = { ...generatedWs, content: getCurrentContent(), config: { ...config, isPublic, files: uploadedFiles } };
        setSaveStatus('saving');
        saveWorksheetToLibrary(finalWs, user.id, user.name).then(success => {
            if (success) {
                setSaveStatus('saved');
                setGeneratedWs(finalWs);
                setTimeout(() => setSaveStatus('idle'), 2000);
            } else { alert("Failed to save."); setSaveStatus('idle'); }
        });
    };

    const handlePrint = () => {
        if (!generatedWs) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) { alert("Pop-up blocked!"); return; }
        
        let logoHTML = '';
        if (logoUrl) {
            logoHTML = `<img src="${logoUrl}" class="ws-logo" style="position: absolute; left: ${logoPos.x}px; top: ${logoPos.y}px; width: ${logoWidth}px;" />`;
        }

        const htmlContent = `
            <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${generatedWs.title}</title>
            <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@300;400;500;600&family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>${WORKSHEET_CSS} .ws-container { font-size: ${fontSize}pt; } ${config.layout === 'columns' ? '.ws-container { column-count: 2; column-gap: 10mm; } .ws-header, .ws-title, .ws-instructions, .ws-answer-key { column-span: all; }' : ''} body { padding: 0; margin: 0; }</style></head>
            <body><div class="ws-container ${config.layout === 'columns' ? 'two-column' : ''}">
                ${logoHTML}
                <div class="ws-content">
                ${getCurrentContent()}
                </div>
            </div>
            <script>document.fonts.ready.then(() => { setTimeout(() => { window.print(); }, 500); });</script></body></html>`;
        printWindow.document.open(); printWindow.document.write(htmlContent); printWindow.document.close();
    };

    const insertPageBreak = () => {
        const contentDiv = contentRef.current?.querySelector('.ws-content') as HTMLElement;
        if (!isEditing || !contentDiv) return;
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

    const handlePreviewClick = (e: React.MouseEvent) => {
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
        <div className="flex h-[calc(100vh-140px)] bg-slate-50 overflow-hidden relative">
            {/* Sidebar */}
            <div className="w-96 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-full z-20 shadow-xl">
                <style>{SIDEBAR_CSS}</style>
                <div className="p-6 border-b border-slate-100 flex-shrink-0">
                    <h1 className="font-display text-xl font-bold text-slate-800 flex items-center mb-1">
                        <LayoutTemplate className="mr-2 text-brand-accent" size={20} /> Worksheet Config
                    </h1>
                    <p className="text-xs text-slate-500">Configure parameters for AI generation</p>
                </div>
                <div className="flex-1 overflow-y-auto sidebar-scrollbar p-6 space-y-6 pb-20">
                    <div className="space-y-4">
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
                                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} className="hidden" />
                                    <Plus size={12} className="mr-1" /> Add Document
                                </label>
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className="block text-xs font-bold text-slate-700">Activities</label>
                            <span className="text-[10px] text-slate-400">{config.activities.length} items</span>
                        </div>
                        <div className="space-y-2 mb-3">
                            {config.activities.length === 0 && <div className="text-center p-4 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50"><p className="text-slate-400 text-xs">Add activities below</p></div>}
                            {config.activities.map((act, index) => {
                                const activityLabel = availableActivities.find(a => a.type === act.type)?.label || act.type;
                                const supportsContext = ['gap-fill', 'multiple-choice', 'word-formation', 'sentence-transform', 'open-ended'].includes(act.type);
                                return (
                                    <div key={act.id} draggable onDragStart={(e) => handleDragStart(e, index)} onDragEnd={handleDragEnd} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, index)} className="border border-teal-200 bg-teal-50/30 rounded p-2 relative group cursor-move hover:shadow-sm transition-all active:cursor-grabbing">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center text-slate-700 font-bold text-xs select-none truncate">
                                                <GripVertical size={12} className="text-slate-400 mr-1" /><span className="bg-teal-100 text-teal-800 text-[9px] px-1 py-0.5 rounded mr-1">#{index + 1}</span>{activityLabel}
                                            </div>
                                            <button onClick={(e) => removeActivity(act.id, e)} className="text-slate-300 hover:text-red-500 p-0.5 rounded hover:bg-red-50 transition-colors"><X size={14} /></button>
                                        </div>
                                        <div className="pl-4 flex flex-wrap gap-2">
                                            <div className="flex-1 min-w-[60px]">
                                                <label className="text-[9px] text-slate-500 font-bold uppercase block">Qty</label>
                                                <input type="number" min={1} max={20} value={act.count} onChange={(e) => updateActivityCount(act.id, parseInt(e.target.value))} className="w-full p-1 text-xs border border-slate-300 rounded text-center outline-none" />
                                            </div>
                                            {act.type === 'multiple-choice' && (
                                                <div className="flex-1 min-w-[60px]">
                                                    <label className="text-[9px] text-slate-500 font-bold uppercase block">Opts</label>
                                                    <select value={act.options?.mcCount || 3} onChange={(e) => updateMcOptions(act.id, parseInt(e.target.value) as any)} className="w-full p-1 text-xs border border-slate-300 rounded outline-none"><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option></select>
                                                </div>
                                            )}
                                        </div>
                                        {supportsContext && (
                                            <div className="mt-1 pt-1 border-t border-teal-100 pl-4">
                                                <div className="flex bg-white rounded border border-slate-200 overflow-hidden">
                                                    <button className={`flex-1 text-[9px] py-0.5 ${act.contextType === 'sentences' ? 'bg-teal-100 text-teal-700 font-bold' : 'text-slate-500'}`} onClick={() => updateActivityContext(act.id, 'sentences')}>Sentences</button>
                                                    <button className={`flex-1 text-[9px] py-0.5 ${act.contextType === 'text' ? 'bg-teal-100 text-teal-700 font-bold' : 'text-slate-500'}`} onClick={() => updateActivityContext(act.id, 'text')}>Story</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="relative" ref={addMenuRef}>
                            <button onClick={() => setShowAddMenu(!showAddMenu)} className={`w-full py-2 border-2 border-dashed border-slate-300 text-slate-500 rounded font-bold text-xs hover:border-teal-500 hover:text-teal-600 transition-colors flex items-center justify-center ${showAddMenu ? 'border-teal-500 text-teal-600' : ''}`}><Plus size={14} className="mr-1" /> Add Activity <ChevronDown size={12} className={`ml-1 transition-transform ${showAddMenu ? 'rotate-180' : ''}`} /></button>
                            {showAddMenu && (
                                <div className="absolute top-full left-0 w-full pt-2 z-20">
                                    <div className="bg-white border border-slate-200 shadow-xl rounded-lg p-2 max-h-[250px] overflow-y-auto">
                                        {availableActivities.map(a => (
                                            <button key={a.type} onClick={() => addActivity(a.type)} className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-teal-50 hover:text-teal-700 rounded transition-colors">{a.label}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Instructions</label>
                        <textarea value={config.customInstructions} onChange={(e) => setConfig({...config, customInstructions: e.target.value})} placeholder="E.g. vocabulary..." className="w-full p-2 rounded border border-slate-200 outline-none h-16 resize-none text-xs" />
                    </div>
                    <button onClick={handleGenerate} disabled={loading} className={`w-full py-3 rounded-xl font-bold shadow-md transition-all flex items-center justify-center text-white text-sm ${loading ? 'bg-slate-300 cursor-not-allowed' : 'bg-teal-500 hover:bg-teal-600 hover:shadow-lg'}`}>{loading ? 'Creating...' : <><Sparkles size={16} className="mr-2" /> Generate</>}</button>
                </div>
            </div>

            {/* Preview Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-100/50">
                {generatedWs ? (
                    <div className="flex flex-col h-full">
                        <style>{WORKSHEET_CSS}</style>
                        <div className="flex flex-wrap gap-4 justify-between items-center p-4 border-b border-slate-200 bg-white z-10 shadow-sm flex-shrink-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <button onClick={() => setIsEditing(!isEditing)} className={`flex items-center px-3 py-2 rounded-lg text-sm font-bold transition-colors ${isEditing ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><Edit size={16} className="mr-2" /> {isEditing ? 'Done' : 'Edit'}</button>
                                
                                {/* LOGO UPLOAD BUTTON */}
                                <div className="relative flex items-center">
                                    <label className="flex items-center px-3 py-2 rounded-lg text-sm font-bold transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer" title="Upload Logo">
                                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                                        <ImageIcon size={16} className="mr-2" /> Logo
                                    </label>
                                    {logoUrl && (
                                        <button onClick={() => setLogoUrl(null)} className="ml-1 p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors" title="Remove Logo">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 bg-slate-50 rounded-lg border border-slate-200 p-1 mx-2">
                                    <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700"><Undo size={16} /></button>
                                    <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700"><Redo size={16} /></button>
                                </div>
                                {isEditing && <button onClick={insertPageBreak} className="flex items-center px-3 py-2 rounded-lg text-sm font-bold transition-colors bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100" title="Insert Page Break"><Scissors size={16} className="mr-2 transform rotate-90" /> Break</button>}
                                <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 px-2 py-1">
                                    <button onClick={() => setFontSize(Math.max(8, fontSize - 0.5))} className="p-1 hover:bg-slate-200 rounded"><Minus size={14} /></button>
                                    <span className="mx-2 text-xs font-bold min-w-[40px] text-center">{fontSize.toFixed(1)}pt</span>
                                    <button onClick={() => setFontSize(Math.min(24, fontSize + 0.5))} className="p-1 hover:bg-slate-200 rounded"><Plus size={14} /></button>
                                </div>
                                <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 px-2 py-1">
                                    <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className="p-1 hover:bg-slate-200 rounded"><ZoomOut size={14} /></button>
                                    <span className="mx-2 text-xs font-bold min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
                                    <button onClick={() => setZoom(Math.min(1.5, zoom + 0.1))} className="p-1 hover:bg-slate-200 rounded"><ZoomIn size={14} /></button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div onClick={handleVisibilityToggle} className={`flex items-center bg-slate-100 rounded-lg p-1 cursor-pointer select-none border border-slate-200 ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <div className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${!isPublic ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Private</div>
                                    <div className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${isPublic ? 'bg-green-500 text-white shadow-sm' : 'text-slate-500'}`}>Public</div>
                                </div>
                                <button onClick={handleSave} disabled={saveStatus === 'saving' || saveStatus === 'saved'} className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors border text-sm ${saveStatus === 'saved' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-white text-slate-700 border-slate-200 hover:border-teal-500 hover:text-teal-600'}`}>
                                    {saveStatus === 'saving' && <div className="animate-spin rounded-full h-3 w-3 border-2 border-slate-500 border-t-transparent mr-2"></div>}
                                    {saveStatus === 'saved' && <Check size={16} className="mr-2"/>}
                                    {saveStatus === 'idle' && <Save size={16} className="mr-2" />}
                                    {saveStatus === 'saving' ? 'Saving' : saveStatus === 'saved' ? 'Saved' : 'Save'}
                                </button>
                                <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-brand-yellow hover:bg-yellow-300 rounded-lg text-slate-900 font-bold transition-colors shadow-sm text-sm"><Printer size={16} className="mr-2" /> Print</button>
                            </div>
                        </div>
                        <div id="preview-wrapper" className="flex-1 overflow-y-auto overflow-x-auto p-8 flex justify-center bg-slate-100">
                            <div className="relative shadow-xl h-fit">
                                <PageGuides contentHeight={contentHeight} zoom={zoom} />
                                <EditablePreview 
                                    ref={contentRef} 
                                    htmlContent={generatedWs.content} 
                                    fontSize={fontSize} 
                                    zoom={zoom} 
                                    isEditing={isEditing} 
                                    layoutMode={config.layout || 'single'} 
                                    onHeightChange={handleHeightChange} 
                                    onInput={handleContentInput} 
                                    onClick={handlePreviewClick}
                                    logoUrl={logoUrl}
                                    logoPos={logoPos}
                                    logoWidth={logoWidth}
                                    onLogoDrag={handleLogoMouseDown}
                                    onLogoResize={setLogoWidth}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 border-l border-slate-200 bg-slate-50/50">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm"><LayoutTemplate size={40} className="text-slate-300" /></div>
                        <p className="font-bold text-lg">Your worksheet canvas is empty</p>
                        <p className="text-sm">Configure and generate to preview.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- PERSONAL LIBRARY COMPONENT ---
const WorksheetLibrary: React.FC<{ onLoad: (ws: GeneratedWorksheet) => void }> = ({ onLoad }) => {
    const { user } = useAuth();
    const [worksheets, setWorksheets] = useState<GeneratedWorksheet[]>([]);
    const [loading, setLoading] = useState(true);

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

    if (loading) return <div className="text-center py-20 text-slate-500">Loading library...</div>;

    if (worksheets.length === 0) return (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText size={32} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">No worksheets found</h3>
            <p className="text-slate-400 max-w-sm mx-auto mb-6">Create your first worksheet to see it here.</p>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in pb-12">
            {worksheets.map(ws => (
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
export const Worksheets: React.FC = () => {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState<'create' | 'library' | 'community'>('create');
    const [config, setConfig] = useState<WorksheetConfig>({
        topic: '',
        gradeLevel: '',
        activities: [],
        layout: 'single',
        isPublic: true
    });
    const [generatedWs, setGeneratedWs] = useState<GeneratedWorksheet | null>(null);

    useEffect(() => {
        if (location.state && location.state.tab) {
            setActiveTab(location.state.tab);
        }
    }, [location]);

    const handleLoad = (ws: GeneratedWorksheet) => {
        // Strip ID if loading from community to treat as template
        const isCommunity = activeTab === 'community';
        
        setGeneratedWs({
            ...ws,
            id: isCommunity ? undefined : ws.id, // Keep ID if personal, new ID if community (will be generated on save)
            config: { ...ws.config, isPublic: false } // Reset public status for copy
        });
        setConfig(ws.config || { topic: '', gradeLevel: '', activities: [] });
        setActiveTab('create');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="font-display text-2xl font-bold text-slate-800 flex items-center">
                            <FileText className="mr-2 text-brand-yellow" /> Worksheet Generator
                        </h1>
                    </div>
                    
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveTab('create')}
                            className={`px-4 py-2 rounded-md text-sm font-bold flex items-center transition-all ${activeTab === 'create' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Sparkles size={16} className="mr-2" /> Create
                        </button>
                        <button 
                            onClick={() => setActiveTab('library')}
                            className={`px-4 py-2 rounded-md text-sm font-bold flex items-center transition-all ${activeTab === 'library' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Library size={16} className="mr-2" /> My Library
                        </button>
                        <button 
                            onClick={() => setActiveTab('community')}
                            className={`px-4 py-2 rounded-md text-sm font-bold flex items-center transition-all ${activeTab === 'community' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Globe size={16} className="mr-2" /> Community
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {activeTab === 'create' ? (
                    <WorksheetBuilder 
                        config={config} 
                        setConfig={setConfig} 
                        generatedWs={generatedWs} 
                        setGeneratedWs={setGeneratedWs}
                        onLoad={() => {}} 
                    />
                ) : (
                    <div className="h-full overflow-y-auto p-6 max-w-7xl mx-auto w-full">
                        {activeTab === 'library' && <WorksheetLibrary onLoad={handleLoad} />}
                        {activeTab === 'community' && <CommunityWorksheets onLoad={handleLoad} />}
                    </div>
                )}
            </div>
        </div>
    );
};
