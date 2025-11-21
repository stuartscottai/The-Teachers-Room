
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FileText, Printer, Sparkles, LayoutTemplate, Save, BookOpen, ArrowLeft, Trash2, LogIn, Check } from 'lucide-react';
import { WorksheetConfig, GeneratedWorksheet } from '../types';
import { generateWorksheetContent } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';
import { saveWorksheetToLibrary, getSavedWorksheets, deleteSavedWorksheet } from '../utils/gameUtils';

// --- STANDARD WORKSHEET STYLESHEET ---
const WORKSHEET_CSS = `
  @page { size: A4; margin: 0.5in; } 
  
  .ws-container { 
    font-family: 'Quicksand', sans-serif; 
    color: #1e293b; 
    line-height: 1.3; 
    width: 100%; 
    max-width: 100%; 
    background: white;
  }
  
  /* Header Block */
  .ws-header { 
    display: flex; 
    justify-content: space-between; 
    align-items: center;
    margin-bottom: 1rem; 
    padding: 0.5rem 1rem; 
    border: 2px solid #e2e8f0; 
    border-radius: 0.5rem; 
    background-color: #f8fafc; 
    font-size: 0.9rem;
  }
  .ws-field { 
    font-weight: 600; 
    color: #475569; 
    min-width: 120px;
    border-bottom: 1px solid #cbd5e1;
    display: inline-block;
    padding-bottom: 0.2rem;
  }

  /* Typography */
  .ws-title { 
    font-family: 'Fredoka', sans-serif; 
    font-size: 2rem; 
    font-weight: 700; 
    text-align: center; 
    color: #0f172a; 
    margin: 0 0 0.5rem 0; 
    text-transform: uppercase; 
    letter-spacing: 0.05em; 
    line-height: 1.1;
  }
  .ws-instructions { 
    font-style: italic; 
    color: #475569; 
    margin-bottom: 1.5rem; 
    text-align: center; 
    max-width: 90%; 
    margin-left: auto; 
    margin-right: auto; 
    font-size: 0.95rem;
    line-height: 1.4;
  }

  /* Sections */
  .ws-section { 
    margin-bottom: 1.5rem; 
    break-inside: avoid; 
  }
  .ws-section-title { 
    font-family: 'Fredoka', sans-serif; 
    font-size: 1.2rem; 
    font-weight: 600; 
    color: #0284c7; 
    border-bottom: 2px solid #e0f2fe; 
    padding-bottom: 0.25rem; 
    margin-bottom: 0.75rem; 
  }

  /* Tables & Grids */
  .ws-table { 
    width: 100%; 
    border-collapse: collapse; 
    margin: 0.5rem 0; 
    font-size: 0.95rem;
  }
  .ws-table td, .ws-table th { 
    border: 1px solid #cbd5e1; 
    padding: 0.5rem 0.75rem; 
    text-align: left; 
    vertical-align: middle;
  }
  .ws-table th { 
    background-color: #f1f5f9; 
    font-weight: 700; 
    font-family: 'Fredoka', sans-serif;
    color: #334155;
  }
  /* Center align for wordsearch grids */
  .ws-table.grid td {
      text-align: center;
      font-family: monospace;
      font-size: 1.1rem;
      padding: 0.25rem;
      width: 2rem;
      height: 2rem;
  }

  /* Answer Key - ALWAYS ON SEPARATE PAGE */
  .ws-answer-key { 
    /* Force page break */
    page-break-before: always;
    break-before: page;
    display: block;
    
    /* Reset layout for new page */
    margin-top: 0; 
    padding-top: 2rem; 
    border-top: none; 
    background-color: #fff;
    
    /* Multi-column layout for answers */
    column-count: 2;
    column-gap: 3rem;
    column-fill: balance;
    
    font-size: 0.9rem;
    line-height: 1.5;
  }
  
  .ws-answer-key h3 { 
    column-span: all;
    color: #ef4444; 
    text-transform: uppercase; 
    font-weight: bold;
    margin-bottom: 1.5rem;
    text-align: center;
    font-size: 1.5rem;
    border-bottom: 2px solid #ef4444;
    padding-bottom: 0.5rem;
  }

  /* Prevent split elements in columns */
  .ws-answer-key p, 
  .ws-answer-key li,
  .ws-answer-key tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .ws-answer-key ul, .ws-answer-key ol {
      margin-top: 0;
      margin-bottom: 0.5rem;
      padding-left: 1.5rem;
  }

  /* List Styling */
  ul, ol {
      margin-left: 1.5rem;
      margin-bottom: 0.5rem;
  }
  li {
      margin-bottom: 0.2rem;
  }

  /* Print Overrides */
  @media print {
    body { margin: 0; padding: 0; background: white; }
    .ws-container { width: 100%; max-width: none; border: none; }
    .ws-header { border: 1px solid #94a3b8; background: none; }
    .ws-section-title { color: #000; border-bottom-color: #cbd5e1; }
    
    /* Enforce separate page for answer key */
    .ws-answer-key {
        page-break-before: always !important;
        break-before: page !important;
        margin-top: 0 !important;
    }

    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
`;

// Library Component
const LibraryView: React.FC<{ onBack: () => void, onLoad: (ws: GeneratedWorksheet) => void }> = ({ onBack, onLoad }) => {
    const [savedWorksheets, setSavedWorksheets] = useState<GeneratedWorksheet[]>([]);
    const { user } = useAuth();

    useEffect(() => {
        setSavedWorksheets(getSavedWorksheets());
    }, []);

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("Delete this worksheet?")) {
            deleteSavedWorksheet(id);
            setSavedWorksheets(prev => prev.filter(w => w.id !== id));
        }
    };

    if (!user) {
        return (
             <div className="max-w-4xl mx-auto px-4 py-12 text-center">
                <button onClick={onBack} className="flex items-center text-slate-500 hover:text-teal-600 mb-8 mx-auto">
                    <ArrowLeft size={18} className="mr-2" /> Back to Builder
                </button>
                <div className="bg-white p-12 rounded-3xl shadow-lg border border-slate-100">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <LogIn size={40} className="text-slate-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Please Log In</h2>
                    <p className="text-slate-500 mb-6">You need to be logged in to view your saved worksheets.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-12">
            <button onClick={onBack} className="flex items-center text-slate-500 hover:text-teal-600 mb-8">
                <ArrowLeft size={18} className="mr-2" /> Back to Builder
            </button>
            
            <h1 className="font-display text-3xl font-bold text-slate-800 mb-8">My Saved Worksheets</h1>
            
            {savedWorksheets.length === 0 ? (
                 <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 border-dashed">
                    <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-400 text-lg">No worksheets saved yet.</p>
                    <p className="text-slate-400 text-sm mt-2">Create one in the Builder and click Save!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {savedWorksheets.map((ws) => (
                        <div key={ws.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 p-6 relative group">
                             <div className="flex justify-between items-start mb-4">
                                <div className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
                                    {ws.type}
                                </div>
                                <button 
                                    onClick={(e) => handleDelete(ws.id!, e)}
                                    className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                            <h3 className="font-bold text-xl text-slate-800 mb-2 line-clamp-1">{ws.title}</h3>
                            <p className="text-slate-500 text-sm mb-1">Topic: {ws.config?.topic || 'Unknown'}</p>
                            <p className="text-slate-400 text-xs mb-6">
                                Created: {new Date(ws.createdAt || Date.now()).toLocaleDateString()}
                            </p>
                            <button 
                                onClick={() => onLoad(ws)}
                                className="w-full py-3 bg-white border-2 border-teal-500 text-teal-600 font-bold rounded-lg hover:bg-teal-50 transition-colors"
                            >
                                Open Worksheet
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const Worksheets: React.FC = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [view, setView] = useState<'builder' | 'library'>('builder');
    const [config, setConfig] = useState<WorksheetConfig>({
        type: 'wordsearch',
        topic: '',
        gradeLevel: 'Elementary',
        customInstructions: ''
    });
    const [generatedWs, setGeneratedWs] = useState<GeneratedWorksheet | null>(null);
    const [loading, setLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    useEffect(() => {
        if (location.state && location.state.view === 'library') {
            setView('library');
        }
    }, [location]);

    const handleGenerate = async () => {
        if (!config.topic) {
            alert("Please enter a topic!");
            return;
        }
        setLoading(true);
        try {
            const data = await generateWorksheetContent(config);
            setGeneratedWs(data);
            setSaveStatus('idle');
        } catch (error) {
            console.error(error);
            alert("Error generating worksheet. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = () => {
        if (!user) {
            alert("Please log in to save worksheets.");
            return;
        }
        if (!generatedWs) return;

        setSaveStatus('saving');
        setTimeout(() => {
            const success = saveWorksheetToLibrary(generatedWs);
            if (success) {
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
            } else {
                alert("Failed to save worksheet.");
                setSaveStatus('idle');
            }
        }, 800);
    };

    const handleLoad = (ws: GeneratedWorksheet) => {
        setGeneratedWs(ws);
        if (ws.config) setConfig(ws.config);
        setView('builder');
        setSaveStatus('saved'); // It's already saved
    };

    const handlePrint = () => {
        if (!generatedWs) return;

        const printWindow = window.open('', '_blank');
        
        if (!printWindow) {
            alert("Pop-up blocked! Please allow pop-ups for this site to print.");
            return;
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>${generatedWs.title}</title>
                <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@300;400;500;600&family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    ${WORKSHEET_CSS}
                    body { padding: 0; margin: 0; }
                    @media print {
                       body { -webkit-print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <div class="ws-container">
                    ${generatedWs.content}
                </div>
                <script>
                    document.fonts.ready.then(() => {
                        setTimeout(() => {
                            window.print();
                        }, 500);
                    });
                </script>
            </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    if (view === 'library') {
        return <LibraryView onBack={() => setView('builder')} onLoad={handleLoad} />;
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12">
            {/* Header Area */}
            <div className="max-w-7xl mx-auto px-4 mb-8 flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div>
                    <h1 className="font-display text-3xl font-bold text-slate-800">Worksheet Builder</h1>
                    <p className="text-slate-500">Create custom printables in seconds.</p>
                </div>
                <button 
                    onClick={() => setView('library')}
                    className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold hover:border-teal-500 hover:text-teal-600 transition-colors flex items-center shadow-sm"
                >
                    {user ? <BookOpen size={20} className="mr-2" /> : <LogIn size={20} className="mr-2" />}
                    {user ? 'My Saved Worksheets' : 'Log in to View Saved'}
                </button>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Sidebar Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24">
                        <h2 className="font-display text-2xl font-bold text-slate-800 mb-6 flex items-center">
                            <LayoutTemplate className="mr-2 text-brand-accent" />
                            Builder
                        </h2>
                        
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Activity Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['wordsearch', 'matching', 'gap-fill', 'sentence-transform'].map(t => (
                                        <button 
                                            key={t}
                                            onClick={() => setConfig({...config, type: t as any})}
                                            className={`p-2 rounded-lg text-sm capitalize border transition-colors
                                            ${config.type === t 
                                                ? 'bg-teal-50 border-teal-500 text-teal-700 font-bold' 
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {t.replace('-', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Topic</label>
                                <input 
                                    type="text" 
                                    value={config.topic}
                                    onChange={(e) => setConfig({...config, topic: e.target.value})}
                                    placeholder="e.g. Space Exploration"
                                    className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-teal-400 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Grade Level</label>
                                <select 
                                    value={config.gradeLevel}
                                    onChange={(e) => setConfig({...config, gradeLevel: e.target.value})}
                                    className="w-full p-3 rounded-lg border border-slate-200 outline-none bg-white"
                                >
                                    <option value="Elementary">Elementary (A1-A2)</option>
                                    <option value="Intermediate">Intermediate (B1-B2)</option>
                                    <option value="Advanced">Advanced (C1-C2)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Custom Instructions</label>
                                <textarea 
                                    value={config.customInstructions}
                                    onChange={(e) => setConfig({...config, customInstructions: e.target.value})}
                                    placeholder="Specific vocabulary to include..."
                                    className="w-full p-3 rounded-lg border border-slate-200 outline-none h-24 resize-none"
                                />
                            </div>

                            <button 
                                onClick={handleGenerate}
                                disabled={loading}
                                className={`w-full py-3 rounded-xl font-bold shadow-md transition-all flex items-center justify-center text-white
                                ${loading ? 'bg-slate-300 cursor-not-allowed' : 'bg-teal-500 hover:bg-teal-600 hover:shadow-lg'}`}
                            >
                                {loading ? 'Creating...' : <><Sparkles size={18} className="mr-2" /> Generate Worksheet</>}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Preview Area */}
                <div className="lg:col-span-2">
                    {generatedWs ? (
                        <div className="bg-white shadow-lg p-8 min-h-[800px] relative">
                            {/* Inject Styles for Preview */}
                            <style>{WORKSHEET_CSS}</style>

                            {/* Toolbar */}
                            <div className="flex justify-between items-center mb-8 no-print">
                                <h2 className="text-xl font-bold text-slate-400">Preview</h2>
                                <div className="flex space-x-2">
                                    <button 
                                        onClick={handleSave}
                                        disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                                        className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors border
                                            ${saveStatus === 'saved' 
                                                ? 'bg-green-50 text-green-600 border-green-200' 
                                                : 'bg-white text-slate-700 border-slate-200 hover:border-teal-500 hover:text-teal-600'}`}
                                    >
                                        {saveStatus === 'saved' ? <Check size={18} className="mr-2"/> : <Save size={18} className="mr-2" />}
                                        {saveStatus === 'saved' ? 'Saved' : 'Save'}
                                    </button>
                                    <div className="group relative">
                                        <button 
                                            onClick={handlePrint} 
                                            className="flex items-center px-4 py-2 bg-brand-yellow hover:bg-yellow-300 rounded-lg text-slate-900 font-bold transition-colors shadow-sm"
                                        >
                                            <Printer size={18} className="mr-2" /> Print / Save PDF
                                        </button>
                                        <div className="absolute top-full mt-2 right-0 w-48 bg-slate-800 text-white text-xs p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                            Opens a print dialog. Allow pop-ups if blocked.
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* The actual content (Preview only) */}
                            <div className="ws-container">
                                <div 
                                    dangerouslySetInnerHTML={{ __html: generatedWs.content }} 
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[400px] border-2 border-dashed border-slate-200 rounded-2xl">
                            <FileText size={48} className="mb-4 opacity-50" />
                            <p>Your generated worksheet will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
