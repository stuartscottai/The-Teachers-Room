
import React, { useState, useRef, useEffect } from 'react';
import { Send, X, User, ArrowRight, Loader2, Mic } from 'lucide-react';
import { GameConfig, GeneratedGame, GameType } from '../../types';
import { chatWithGameWizard, generateGameContent, WizardSuggestion } from '../../services/geminiService';
import { useDictation } from '../../utils/useDictation';
import { useAuth } from '../../contexts/AuthContext';
import { promptSignupForFree, promptUpgradeForAi } from '../../services/accountAccess';

interface AiAssistantChatProps {
    onClose: () => void;
    onGameGenerated: (game: GeneratedGame) => void;
}

interface Message {
    id: string;
    role: 'user' | 'ai';
    text: string;
    suggestion?: WizardSuggestion;
    suggestions?: WizardSuggestion[];
}

export const AiAssistantChat: React.FC<AiAssistantChatProps> = ({ onClose, onGameGenerated }) => {
    const { user } = useAuth();
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
    const MIN_AI_QUESTION_COUNT = 25;
    const dictation = useDictation({ model: 'tiny', language: 'auto' });
    const assistantHeadSrc = '/assets/game_elements/aiassistanthead.png';

    const getUserRequestedQuestionCount = () => {
        const patterns = [
            /\b(\d{1,3})\s*(questions?|qs|q's|rounds?)\b/i,
            /\b(\d{1,3})\s*q\b/i
        ];
        for (const msg of messages) {
            if (msg.role !== 'user') continue;
            for (const pattern of patterns) {
                const match = msg.text.match(pattern);
                if (match) {
                    const value = Number.parseInt(match[1], 10);
                    if (Number.isFinite(value) && value > 0 && value <= 200) {
                        return value;
                    }
                }
            }
        }
        return null;
    };

    const applyAiQuestionDefaults = (config: GameConfig) => {
        const requestedCount = getUserRequestedQuestionCount();
        const targetCount = requestedCount ?? MIN_AI_QUESTION_COUNT;

        if (config.type === GameType.MILLIONAIRE) {
            return { ...config, questionCount: 15 };
        }

        if (config.type === GameType.JEOPARDY) {
            const categories = config.jeopardyCategoryNames?.length || config.jeopardyCategories || 5;
            const rows = config.jeopardyRows || 5;
            const total = categories * rows;
            if (total >= targetCount) return config;
            return {
                ...config,
                jeopardyRows: Math.max(rows, Math.ceil(targetCount / categories))
            };
        }

        if (config.type === GameType.PUB_QUIZ) {
            const rounds = config.pubQuizRoundNames?.length || config.pubQuizRoundsCount || 3;
            const perRound = config.pubQuizQuestionsPerRound || 5;
            const total = rounds * perRound;
            if (total >= targetCount) return config;
            return {
                ...config,
                pubQuizQuestionsPerRound: Math.max(perRound, Math.ceil(targetCount / rounds))
            };
        }

        if (config.type === GameType.WORD_WHEEL) {
            return {
                ...config,
                questionCount: 26,
                questionType: 'open' as const,
                wordWheelScoringMode: config.wordWheelScoringMode || 'classic',
                wordWheelLetterRule: config.wordWheelLetterRule || 'contains-hard'
            };
        }

        const desiredCount = Math.max(config.questionCount || 0, targetCount);
        return { ...config, questionCount: desiredCount };
    };

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim()) return;
        if (!user) {
            promptSignupForFree('Create a free account on the Teacher Plan to use classroom tools and save progress.');
            return;
        }
        if (user.accountType === 'free') {
            promptUpgradeForAi('The AI Assistant is included with the Teacher Plan during early access.');
            return;
        }

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
                suggestion: response.suggestion,
                suggestions: response.suggestions
            };
            
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error(error);
            const text = error instanceof Error ? error.message : "Sorry, I had trouble connecting. Please try again.";
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleClose = () => {
        dictation.stop();
        onClose();
    };

    const toggleDictation = () => {
        void dictation.toggle({
            getValue: () => input,
            onUpdate: (value) => setInput(value)
        });
    };

    const handleCreateGame = async (suggestion: WizardSuggestion) => {
        if (!user) {
            promptSignupForFree('Create a free account on the Teacher Plan to start creating and saving games.');
            return;
        }
        if (user.accountType === 'free') {
            promptUpgradeForAi('AI game generation is included with the Teacher Plan during early access.');
            return;
        }
        setIsGenerating(true);
        try {
            const { reason: _reason, ...configFromSuggestion } = suggestion as WizardSuggestion & { reason?: string };
            const normalizedTopic = String(configFromSuggestion.topic || '').trim() || 'General';
            const baseConfig = configFromSuggestion as GameConfig;

            // Default fallbacks if AI missed something
            const finalConfig = applyAiQuestionDefaults({
                ...baseConfig,
                topic: normalizedTopic,
                questionCount: baseConfig.questionCount || MIN_AI_QUESTION_COUNT,
                questionType: baseConfig.questionType || 'mixed',
                isAI: true
            });
            
            const game = await generateGameContent(finalConfig);
            onGameGenerated(game);
        } catch (error) {
            console.error("Generation failed", error);
            alert(error instanceof Error ? error.message : "Failed to generate the game. Please try again or create manually.");
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-x-0 bottom-0 top-[calc(4rem+env(safe-area-inset-top))] sm:inset-0 z-[200] flex items-start sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg h-full max-h-full sm:h-[600px] sm:max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative animate-slide-up border border-white/20">
                {/* Header */}
                <div className="bg-brand-blue p-4 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 h-11 w-11 rounded-full overflow-hidden shrink-0">
                            <img
                                src={assistantHeadSrc}
                                alt=""
                                aria-hidden="true"
                                className="h-full w-full object-cover"
                            />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg leading-tight">AI Assistant</h3>
                            <p className="text-xs text-sky-100 opacity-80">Game Consultant</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
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
                                
                                {/* Suggestion Cards */}
                                {(() => {
                                    const suggestionList = msg.suggestions?.length
                                        ? msg.suggestions
                                        : msg.suggestion
                                          ? [msg.suggestion]
                                          : [];

                                    if (!suggestionList.length) return null;

                                    return (
                                        <div className="mt-3 space-y-3">
                                            {suggestionList.map((suggestion, index) => (
                                                <div key={`${msg.id}-${suggestion.type}-${index}`} className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-xl border border-indigo-100 shadow-md">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <img
                                                            src={assistantHeadSrc}
                                                            alt=""
                                                            aria-hidden="true"
                                                            className="h-5 w-5 rounded-md object-cover"
                                                        />
                                                        <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">
                                                            {index === 0 ? 'Best Fit' : `Alternative ${index + 1}`}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-display font-bold text-lg text-slate-800 mb-1">{suggestion.title}</h4>
                                                    <div className="flex gap-2 mb-2">
                                                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded font-medium">{suggestion.type}</span>
                                                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded font-medium truncate max-w-[150px]">{suggestion.topic}</span>
                                                    </div>
                                                    {suggestion.reason && (
                                                        <p className="text-xs text-slate-600 mb-3">{suggestion.reason}</p>
                                                    )}
                                                    <button
                                                        onClick={() => handleCreateGame(suggestion)}
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
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                            
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden shrink-0 mt-auto mx-2 shadow-sm
                                ${msg.role === 'user' ? 'bg-sky-100 order-2' : 'bg-indigo-100 order-1'}`}>
                                {msg.role === 'user' ? (
                                    <User size={14} className="text-sky-600" />
                                ) : (
                                    <img
                                        src={assistantHeadSrc}
                                        alt=""
                                        aria-hidden="true"
                                        className="h-full w-full object-cover"
                                    />
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-indigo-100 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden mr-2 order-1">
                                <img
                                    src={assistantHeadSrc}
                                    alt=""
                                    aria-hidden="true"
                                    className="h-full w-full object-cover"
                                />
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
                            className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all text-sm"
                            disabled={isTyping || isGenerating}
                        />
                        <button
                            type="button"
                            onClick={toggleDictation}
                            disabled={isTyping || isGenerating || dictation.isBusy}
                            title={dictation.isListening ? 'Stop dictation' : 'Start dictation'}
                            className={`absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-lg border transition-colors
                                ${dictation.isListening ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-200 text-slate-500 hover:border-brand-blue hover:text-brand-blue'}
                                ${dictation.isBusy ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                            <span className="relative inline-flex">
                                <Mic size={16} />
                                {dictation.isListening && (
                                    <span className="absolute -right-1.5 -top-1.5 h-2 w-2 rounded-full bg-red-500" />
                                )}
                            </span>
                        </button>
                        <button 
                            type="submit"
                            disabled={!input.trim() || isTyping || isGenerating}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-blue text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                    {dictation.statusMessage && (
                        <p className={`mt-2 text-xs ${dictation.isListening || dictation.status === 'error' ? 'font-semibold text-red-600' : 'text-slate-500'}`}>
                            {dictation.statusMessage}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
