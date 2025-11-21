import React, { useState, useEffect, useRef } from 'react';
import { GeneratedGame } from '../../types';
import { playSound } from '../../utils/gameUtils';
import { ArrowLeft, Maximize2, Minimize2, AlertTriangle, RotateCcw, X, Check, Trophy, Sparkles } from 'lucide-react';

interface JeopardyGameProps {
    game: GeneratedGame;
    onBack: () => void;
    onFinish: () => void;
}

export const JeopardyGame: React.FC<JeopardyGameProps> = ({ game, onBack, onFinish }) => {
    const [scores, setScores] = useState<number[]>(Array(game.config.players).fill(0));
    const [currentTeam, setCurrentTeam] = useState(0);
    const [selectedQuestion, setSelectedQuestion] = useState<{ categoryIndex: number, questionIndex: number } | null>(null);
    const [answeredQuestions, setAnsweredQuestions] = useState<string[]>([]);
    const [isFlipped, setIsFlipped] = useState(false);
    const [winner, setWinner] = useState<number | null>(null);
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    
    // Fullscreen logic
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Timer State
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const timerRef = useRef<any>(null);

    const strictMode = game.config.strictMode;

    // Toggle Fullscreen
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Timer Effect
    useEffect(() => {
        if (selectedQuestion && !isFlipped && !winner) {
            // Start timer when question opens (and isn't flipped yet)
            const q = game.jeopardyBoard![selectedQuestion.categoryIndex].questions[selectedQuestion.questionIndex];
            if (!q.isBonus || q.bonusType === 'none') {
                 // Use global config timer or default
                 const duration = game.config.timerSeconds || 0;
                 if (duration > 0) {
                    setTimeLeft(duration);
                    timerRef.current = setInterval(() => {
                        setTimeLeft(prev => {
                            if (prev <= 1) {
                                clearInterval(timerRef.current!);
                                return 0;
                            }
                            return prev - 1;
                        });
                    }, 1000);
                 }
            }
        } else {
            // Clear timer if flipped or closed
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [selectedQuestion, isFlipped]);


    const handleQuestionSelect = (cIdx: number, qIdx: number) => {
        if (answeredQuestions.includes(`${cIdx}-${qIdx}`)) return;
        
        const q = game.jeopardyBoard![cIdx].questions[qIdx];
        
        if (q.bonusType && q.bonusType !== 'none') {
             playSound('bonus');
        } else {
             playSound('select');
        }
        
        setSelectedQuestion({ categoryIndex: cIdx, questionIndex: qIdx });
        setIsFlipped(false);
    };

    const handleAnswer = (correct: boolean) => {
        if (!selectedQuestion) return;
        const { categoryIndex, questionIndex } = selectedQuestion;
        const q = game.jeopardyBoard![categoryIndex].questions[questionIndex];
        const points = q.points;

        playSound(correct ? 'correct' : 'incorrect');

        const newScores = [...scores];
        if (correct) {
            newScores[currentTeam] += points;
        } else {
            newScores[currentTeam] -= points;
        }
        setScores(newScores);
        finalizeTurn(categoryIndex, questionIndex);
    };

    const handleBonusAction = () => {
        if (!selectedQuestion) return;
        const { categoryIndex, questionIndex } = selectedQuestion;
        const q = game.jeopardyBoard![categoryIndex].questions[questionIndex];
        const type = q.bonusType;
        const points = q.points;
        const newScores = [...scores];

        if (type === 'double') {
            newScores[currentTeam] += (points * 2);
        } else if (type === 'bust') {
            newScores[currentTeam] -= points;
        } else if (type === 'steal') {
             let victimIdx = -1;
             let maxS = -Infinity;
             scores.forEach((s, i) => {
                 if (i !== currentTeam && s > maxS) {
                     maxS = s;
                     victimIdx = i;
                 }
             });

             if (victimIdx !== -1) {
                 newScores[victimIdx] -= points;
                 newScores[currentTeam] += points;
             } else {
                 newScores[currentTeam] += points;
             }
        }

        setScores(newScores);
        finalizeTurn(categoryIndex, questionIndex);
    };

    const finalizeTurn = (cIdx: number, qIdx: number) => {
        setAnsweredQuestions(prev => [...prev, `${cIdx}-${qIdx}`]);
        setTimeout(() => {
            setSelectedQuestion(null);
            setCurrentTeam((prev) => (prev + 1) % game.config.players);
        }, 1500);
    };

    const checkWinner = () => {
        if (!game.jeopardyBoard) return;
        const totalQuestions = game.jeopardyBoard.reduce((acc, cat) => acc + cat.questions.length, 0);
        if (totalQuestions > 0 && answeredQuestions.length >= totalQuestions) {
             const winningScore = Math.max(...scores);
             const winnerIdx = scores.indexOf(winningScore);
             setWinner(winnerIdx);
             playSound('win');
        }
    };

    useEffect(() => {
        checkWinner();
    }, [answeredQuestions]);

    if (!game.jeopardyBoard) return <div>Error: Invalid Jeopardy Data</div>;

    if (winner !== null) {
        return (
            <div className="fixed inset-0 bg-slate-900 z-50 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    {Array.from({length: 50}).map((_, i) => (
                        <div key={i} className="absolute w-3 h-3 bg-brand-yellow rounded-full animate-bounce" style={{
                            top: Math.random() * 100 + '%',
                            left: Math.random() * 100 + '%',
                            animationDelay: Math.random() + 's',
                            animationDuration: (Math.random() * 2 + 1) + 's'
                        }} />
                    ))}
                </div>
                <div className="text-center z-10 text-white">
                    <Trophy size={100} className="mx-auto text-brand-yellow mb-6 animate-pulse" />
                    <h1 className="font-display text-6xl font-bold mb-4">Team {winner + 1} Wins!</h1>
                    <p className="text-2xl text-sky-200 mb-8">Score: {scores[winner]}</p>
                    <button onClick={onFinish} className="px-8 py-3 bg-white text-slate-900 rounded-full font-bold hover:bg-brand-yellow transition-colors">Back to Library</button>
                </div>
            </div>
        );
    }

    const activeQ = selectedQuestion ? game.jeopardyBoard[selectedQuestion.categoryIndex].questions[selectedQuestion.questionIndex] : null;
    const isBonus = activeQ?.isBonus && activeQ.bonusType !== 'none';
    const initialTimer = game.config.timerSeconds || 30;

    return (
        <div ref={containerRef} className={`bg-slate-900 flex flex-col ${isFullscreen ? 'h-screen p-0' : 'min-h-screen p-4'}`}>
            {/* Header */}
            <div className="flex justify-between items-center mb-4 bg-slate-800 p-3 rounded-xl shrink-0">
                <div className="flex items-center space-x-4">
                    <button 
                        onClick={() => setShowQuitConfirm(true)} 
                        className="text-slate-400 hover:text-white flex items-center text-sm bg-slate-700 hover:bg-red-900 px-3 py-1 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={16} className="mr-1" /> Quit Game
                    </button>
                    <h1 className="text-white font-display font-bold text-xl truncate max-w-[200px]">{game.title}</h1>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="text-brand-yellow font-bold text-lg animate-pulse">Turn: Team {currentTeam + 1}</div>
                    <button onClick={toggleFullscreen} className="text-slate-400 hover:text-white">
                        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                    </button>
                </div>
            </div>

            {/* Scoreboard */}
            <div className="flex flex-wrap justify-center gap-4 mb-4 shrink-0">
                {scores.map((score, idx) => (
                    <div 
                        key={idx} 
                        className={`px-4 py-2 rounded-lg text-center transition-all border-2 min-w-[100px] ${currentTeam === idx ? 'bg-brand-blue border-white text-white scale-105 shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                    >
                        <div className="text-[10px] uppercase font-bold">Team {idx + 1}</div>
                        <div className="text-xl font-black font-mono">{score}</div>
                    </div>
                ))}
            </div>

            {/* Game Board Grid (Flex Grow to fill space) */}
            <div className="flex-grow flex flex-col min-h-0">
                <div 
                    className="grid gap-2 max-w-full mx-auto w-full mb-2"
                    style={{ gridTemplateColumns: `repeat(${game.jeopardyBoard.length}, minmax(0, 1fr))` }}
                >
                    {game.jeopardyBoard.map((cat, idx) => (
                        <div key={`cat-${idx}`} className="bg-brand-blue text-white p-2 rounded flex items-center justify-center text-center shadow-sm border-b-4 border-sky-700 h-full">
                            <h3 className="font-display font-bold text-xs md:text-sm lg:text-lg leading-tight line-clamp-2">{cat.name}</h3>
                        </div>
                    ))}
                </div>
                
                <div className="flex-grow flex gap-2 max-w-full mx-auto w-full min-h-0">
                    {game.jeopardyBoard.map((cat, cIdx) => (
                        <div key={`col-${cIdx}`} className="flex-1 flex flex-col gap-2 min-h-0">
                            {cat.questions.map((q, qIdx) => {
                                const isAnswered = answeredQuestions.includes(`${cIdx}-${qIdx}`);
                                return (
                                    <button 
                                        key={`q-${cIdx}-${qIdx}`}
                                        disabled={isAnswered}
                                        onClick={() => handleQuestionSelect(cIdx, qIdx)}
                                        className={`
                                            flex-1 rounded flex items-center justify-center text-xl md:text-3xl font-black font-mono transition-all
                                            ${isAnswered 
                                                ? 'bg-slate-800/50 text-slate-700 cursor-not-allowed' 
                                                : 'bg-brand-yellow text-slate-900 hover:bg-white hover:scale-105 shadow-sm border-b-4 border-yellow-600'}
                                        `}
                                    >
                                        {isAnswered ? '' : q.points}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Quit Confirmation Modal (Custom for Fullscreen support) */}
            {showQuitConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-white text-slate-900 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
                        <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Quit current game?</h2>
                        <p className="text-slate-500 mb-6">Your progress will be lost if you haven't saved.</p>
                        <div className="flex space-x-4">
                            <button 
                                onClick={() => setShowQuitConfirm(false)}
                                className="flex-1 py-3 bg-slate-200 font-bold rounded-lg hover:bg-slate-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => { setShowQuitConfirm(false); onBack(); }}
                                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors"
                            >
                                Quit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Question/Bonus Modal */}
            {activeQ && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-5xl perspective-1000 h-[80vh]">
                        <div 
                            className={`relative w-full h-full transition-all duration-700 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
                            onClick={() => {
                                // Only flip if not already flipped (for the question side)
                                if (!isFlipped && !isBonus) setIsFlipped(true);
                            }}
                        >
                            {/* Front (Clue) */}
                            <div className={`absolute inset-0 backface-hidden rounded-3xl border-8 shadow-2xl flex flex-col items-center justify-center p-12 text-center
                                ${isBonus ? 'bg-purple-600 border-purple-300' : 'bg-brand-blue border-white'}`}>
                                
                                {isBonus ? (
                                    <div className="animate-bounce">
                                        <Sparkles size={120} className="text-yellow-300 mb-8 mx-auto" />
                                        <h3 className="text-white font-display font-bold text-6xl">BONUS TILE!</h3>
                                    </div>
                                ) : (
                                    <>
                                        <h3 className="text-sky-200 uppercase tracking-widest font-bold mb-4 text-xl">
                                            {game.jeopardyBoard[selectedQuestion!.categoryIndex].name} • {activeQ.points}
                                        </h3>
                                        {/* Question Text with whitespace-pre-wrap to respect AI spacing */}
                                        <div className="flex-grow flex items-center justify-center w-full">
                                             <p className="text-3xl md:text-5xl lg:text-6xl font-display font-bold text-white leading-tight whitespace-pre-wrap max-w-4xl">
                                                {activeQ.question}
                                            </p>
                                        </div>
                                        
                                        <div className="mt-8 w-full max-w-3xl">
                                            {game.config.timerSeconds > 0 && (
                                                <div className="w-full h-4 bg-sky-900/50 rounded-full overflow-hidden border border-sky-500/30">
                                                    <div 
                                                        className={`h-full transition-all duration-1000 ${timeLeft < 5 ? 'bg-red-500' : 'bg-brand-yellow'}`}
                                                        style={{ width: `${(timeLeft / initialTimer) * 100}%` }}
                                                    />
                                                </div>
                                            )}
                                            <p className="mt-2 text-sky-300 text-sm">Tap card to reveal answer</p>
                                        </div>
                                        {strictMode && <p className="mt-4 text-brand-yellow font-bold text-lg uppercase bg-brand-yellow/10 px-4 py-2 rounded-full border border-brand-yellow/30">Strict Mode: "What is..." required</p>}
                                    </>
                                )}
                                {isBonus && (
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
                                        className="mt-8 px-8 py-4 bg-white text-purple-900 rounded-full font-bold text-xl hover:bg-purple-100"
                                     >
                                        Reveal
                                     </button>
                                )}
                            </div>

                            {/* Back (Answer/Effect) */}
                            <div className={`absolute inset-0 backface-hidden rotate-y-180 rounded-3xl border-8 shadow-2xl flex flex-col items-center justify-center p-12 text-center
                                ${isBonus ? 'bg-purple-50 border-purple-600' : 'bg-white border-brand-yellow'}`}>
                                
                                {isBonus ? (
                                    <>
                                        <h3 className="text-slate-500 uppercase tracking-widest font-bold mb-4">EFFECT</h3>
                                        <p className="text-4xl md:text-6xl font-display font-bold text-slate-800 leading-tight mb-8">
                                            {activeQ.question}
                                        </p>
                                        <p className="text-2xl text-slate-600 mb-12">{activeQ.answer}</p>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleBonusAction(); }}
                                            className="px-12 py-6 bg-purple-600 text-white rounded-2xl font-bold text-xl hover:bg-purple-700 transition-colors shadow-lg"
                                        >
                                            Apply Effect
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
                                            className="absolute top-8 right-8 p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500"
                                            title="Flip back to question"
                                        >
                                            <RotateCcw size={24} />
                                        </button>

                                        <h3 className="text-slate-400 uppercase tracking-widest font-bold mb-8 text-xl">Answer</h3>
                                        <div className="flex-grow flex items-center justify-center">
                                            <p className="text-3xl md:text-5xl lg:text-6xl font-display font-bold text-slate-800 leading-tight whitespace-pre-wrap">
                                                {activeQ.answer}
                                            </p>
                                        </div>
                                        
                                        <div className="flex gap-6 w-full max-w-xl mt-8" onClick={(e) => e.stopPropagation()}>
                                            <button 
                                                onClick={() => handleAnswer(false)}
                                                className="flex-1 flex items-center justify-center py-6 bg-red-100 text-red-600 rounded-2xl font-bold text-xl hover:bg-red-200 transition-colors border-2 border-red-200"
                                            >
                                                <X size={32} className="mr-3" /> Incorrect
                                            </button>
                                            <button 
                                                onClick={() => handleAnswer(true)}
                                                className="flex-1 flex items-center justify-center py-6 bg-green-100 text-green-600 rounded-2xl font-bold text-xl hover:bg-green-200 transition-colors border-2 border-green-200"
                                            >
                                                <Check size={32} className="mr-3" /> Correct
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .perspective-1000 { perspective: 1000px; }
                .transform-style-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
                /* Hide scrollbar for cleaner fullscreen look */
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-track { background: #1e293b; }
                ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
            `}</style>
        </div>
    );
};
