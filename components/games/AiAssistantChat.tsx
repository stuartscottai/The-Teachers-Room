
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, User, ArrowRight, Loader2 } from 'lucide-react';
import { GameConfig, GeneratedGame } from '../../types';
import { chatWithGameWizard, generateGameContent } from '../../services/geminiService';

interface AiAssistantChatProps {
    onClose: () => void;
    onGameGenerated: (game: GeneratedGame) => void;
}

interface Message {
    id: string;
    role: 'user' | 'ai';
    text: string;
    suggestion?: GameConfig;
}

export const AiAssistantChat: React.FC<AiAssistantChatProps> = ({ onClose, onGameGenerated }) => {
    const [messages, setMessages] = useState<Message[]>([
        { 
            id: 'init', 
            role: 'ai', 
            text: "Hi! I'm your Game Design Assistant. Tell me a bit about your class, topic, or learning goals, and I'll recommend the best game for you." 
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            // Convert internal history to simple format for API
            const history = messages.map(m => ({ role: m.role, text: m.text }));
            
            const response = await chatWithGameWizard(userMsg.text, history);
            
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                text: response.message,
                suggestion: response.suggestion
            };
            
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: "Sorry, I had trouble connecting. Please try again." }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleCreateGame = async (config: GameConfig) => {
        setIsGenerating(true);
        try {
            // Default fallbacks if AI missed something
            const finalConfig = {
                ...config,
                questionCount: config.questionCount || 10,
                questionType: config.questionType || 'mixed',
                isAI: true
            };
            
            const game = await generateGameContent(finalConfig);
            onGameGenerated(game);
        } catch (error) {
            console.error("Generation failed", error);
            alert("Failed to generate the game. Please try again or create manually.");
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg h-[600px] max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative animate-slide-up border border-white/20">
                {/* Header */}
                <div className="bg-brand-blue p-4 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-full">
                            <Sparkles size={20} className="text-brand-yellow" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg leading-tight">AI Assistant</h3>
                            <p className="text-xs text-sky-100 opacity-80">Game Consultant</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Chat Area */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-1' : 'order-2'}`}>
                                <div 
                                    className={`px-4 py-3 rounded-2xl text-sm shadow-sm
                                    ${msg.role === 'user' 
                                        ? 'bg-brand-blue text-white rounded-br-none' 
                                        : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'}`}
                                >
                                    {msg.text}
                                </div>
                                
                                {/* Suggestion Card */}
                                {msg.suggestion && (
                                    <div className="mt-3 bg-gradient-to-br from-indigo-50 to-white p-4 rounded-xl border border-indigo-100 shadow-md">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Sparkles size={16} className="text-indigo-500" />
                                            <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Recommendation</span>
                                        </div>
                                        <h4 className="font-display font-bold text-lg text-slate-800 mb-1">{msg.suggestion.title}</h4>
                                        <div className="flex gap-2 mb-3">
                                            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded font-medium">{msg.suggestion.type}</span>
                                            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded font-medium truncate max-w-[150px]">{msg.suggestion.topic}</span>
                                        </div>
                                        <button 
                                            onClick={() => handleCreateGame(msg.suggestion!)}
                                            disabled={isGenerating}
                                            className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm shadow-sm hover:bg-indigo-700 transition-colors flex items-center justify-center"
                                        >
                                            {isGenerating ? (
                                                <><Loader2 size={16} className="animate-spin mr-2" /> Creating...</>
                                            ) : (
                                                <>Generate This Game <ArrowRight size={16} className="ml-2" /></>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                            
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-auto mx-2 shadow-sm
                                ${msg.role === 'user' ? 'bg-sky-100 order-2' : 'bg-indigo-100 order-1'}`}>
                                {msg.role === 'user' ? <User size={14} className="text-sky-600" /> : <Bot size={14} className="text-indigo-600" />}
                            </div>
                        </div>
                    ))}
                    
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-indigo-100 w-8 h-8 rounded-full flex items-center justify-center mr-2 order-1">
                                <Bot size={14} className="text-indigo-600" />
                            </div>
                            <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-none text-slate-400 text-sm flex items-center order-2">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce mr-1"></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce mr-1 delay-100"></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-100">
                    <form onSubmit={handleSend} className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Describe your lesson topic..."
                            className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all text-sm"
                            disabled={isTyping || isGenerating}
                        />
                        <button 
                            type="submit"
                            disabled={!input.trim() || isTyping || isGenerating}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-blue text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
