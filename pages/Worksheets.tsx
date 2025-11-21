import React, { useState } from 'react';
import { FileText, Download, Printer, Sparkles, LayoutTemplate } from 'lucide-react';
import { WorksheetConfig, GeneratedWorksheet } from '../types';
import { generateWorksheetContent } from '../services/geminiService';

export const Worksheets: React.FC = () => {
    const [config, setConfig] = useState<WorksheetConfig>({
        type: 'wordsearch',
        topic: '',
        gradeLevel: 'Elementary',
        customInstructions: ''
    });
    const [generatedWs, setGeneratedWs] = useState<GeneratedWorksheet | null>(null);
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        if (!config.topic) {
            alert("Please enter a topic!");
            return;
        }
        setLoading(true);
        try {
            const data = await generateWorksheetContent(config);
            setGeneratedWs(data);
        } catch (error) {
            alert("Error generating worksheet. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Sidebar Form - Hidden when printing */}
                <div className="lg:col-span-1 no-print">
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
                        <div className="bg-white shadow-lg p-8 min-h-[800px] print:shadow-none print:p-0 print:w-full">
                            <div className="flex justify-between items-center mb-8 no-print">
                                <h2 className="text-xl font-bold text-slate-400">Preview</h2>
                                <div className="flex space-x-2">
                                    <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition-colors">
                                        <Printer size={18} className="mr-2" /> Print
                                    </button>
                                    <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-brand-yellow hover:bg-yellow-200 rounded-lg text-slate-800 font-medium transition-colors">
                                        <Download size={18} className="mr-2" /> Save as PDF
                                    </button>
                                </div>
                            </div>
                            
                            {/* The actual content to print */}
                            <div 
                                className="prose max-w-none print:prose-sm"
                                dangerouslySetInnerHTML={{ __html: generatedWs.content }} 
                            />
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[400px] border-2 border-dashed border-slate-200 rounded-2xl no-print">
                            <FileText size={48} className="mb-4 opacity-50" />
                            <p>Your generated worksheet will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};