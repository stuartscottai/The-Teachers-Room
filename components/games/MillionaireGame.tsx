
import React, { useState, useEffect, useRef } from 'react';
import { GeneratedGame, GameRunOptions } from '../../types';
import { playSound } from '../../utils/gameUtils';
import { resolveGameImageUrl } from '../../utils/gameImage';
import { ArrowLeft, Phone, Users, Trophy, Volume2, VolumeX, Maximize2, Minimize2, AlertTriangle } from 'lucide-react';

interface MillionaireGameProps {
    game: GeneratedGame;
    options: GameRunOptions;
    onBack: () => void;
    onFinish: () => void;
    onReplay: () => void;
}

const MONEY_LADDER = [
    100, 200, 300, 500, 1000, 
    2000, 4000, 8000, 16000, 32000, 
    64000, 125000, 250000, 500000, 1000000
];

const SAFETY_NETS = [4, 9]; // Indices for 1000 and 32000

export const MillionaireGame: React.FC<MillionaireGameProps> = ({ game, options, onBack, onFinish, onReplay }) => {
    const [currentLevel, setCurrentLevel] = useState(0);
    const [isGameOver, setIsGameOver] = useState(false);
    const [winnings, setWinnings] = useState(0);
    const [gameState, setGameState] = useState<'intro' | 'question' | 'reveal' | 'result' | 'walkaway'>('intro');
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [correctOption, setCorrectOption] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false); // Prevent double clicks
    
    // Lifelines
    const [used5050, setUsed5050] = useState(false);
    const [usedPhone, setUsedPhone] = useState(false);
    const [usedAudience, setUsedAudience] = useState(false);
    
    // Lifeline States
    const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
    const [audienceStats, setAudienceStats] = useState<number[] | null>(null);
    const [phoneHint, setPhoneHint] = useState<string | null>(null);
    const [isCalling, setIsCalling] = useState(false);
    const [isPolling, setIsPolling] = useState(false);

    // Audio & Fullscreen
    const [isMuted, setIsMuted] = useState(options.muted);
    const [isImageZoomOpen, setIsImageZoomOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);

    // Sanity check for questions
    const questions = game.questions || [];
    const currentQuestion = questions[currentLevel];
    const questionImageUrl = resolveGameImageUrl(currentQuestion?.image?.url, currentQuestion?.image?.thumbUrl);
    const questionImageAlt = currentQuestion?.image?.alt || '';

    // Ensure options exist and find correct index
    const optionsList = currentQuestion?.options || ["A", "B", "C", "D"];
    
    // Helper to find the index of the correct answer within the options array
    const getCorrectIndex = () => {
        if (!currentQuestion) return -1;
        const correctText = currentQuestion.answer.toLowerCase().trim();
        return optionsList.findIndex(opt => opt.toLowerCase().trim() === correctText);
    };

    // Lock body scroll to prevent footer access
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    useEffect(() => {
        if (gameState === 'intro') {
            playSound('select', isMuted); // Intro sound placeholder
        }
    }, [gameState, isMuted]);

    // Handle Fullscreen Change Event (User presses Esc)
    useEffect(() => {
        const handleFsChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    useEffect(() => {
        const media = window.matchMedia('(max-width: 639px)');
        const updateViewport = () => setIsMobileViewport(media.matches);
        updateViewport();
        if (media.addEventListener) {
            media.addEventListener('change', updateViewport);
        } else {
            media.addListener(updateViewport);
        }
        return () => {
            if (media.removeEventListener) {
                media.removeEventListener('change', updateViewport);
            } else {
                media.removeListener(updateViewport);
            }
        };
    }, []);

    useEffect(() => {
        if (!isImageZoomOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsImageZoomOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isImageZoomOpen]);

    useEffect(() => {
        if (!questionImageUrl && isImageZoomOpen) {
            setIsImageZoomOpen(false);
        }
    }, [questionImageUrl, isImageZoomOpen]);

    useEffect(() => {
        if (isMobileViewport && isImageZoomOpen) {
            setIsImageZoomOpen(false);
        }
    }, [isMobileViewport, isImageZoomOpen]);

    // Reset state per question
    useEffect(() => {
        setHiddenOptions([]);
        setAudienceStats(null);
        setPhoneHint(null);
        setSelectedOption(null);
        setCorrectOption(null);
        setIsCalling(false);
        setIsPolling(false);
        setIsProcessing(false);
    }, [currentLevel]);

    const handleAnswer = (index: number) => {
        if (gameState !== 'question' || isProcessing) return;
        setIsProcessing(true);
        
        setSelectedOption(index);
        playSound('select', isMuted);
        
        // Dramatic Pause
        setGameState('reveal');
        
        setTimeout(() => {
            const correctIdx = getCorrectIndex();
            setCorrectOption(correctIdx);
            
            if (index === correctIdx) {
                // Correct
                playSound('correct', isMuted);
                setTimeout(() => {
                    if (currentLevel === 14) {
                        setWinnings(1000000);
                        setGameState('result');
                        setIsGameOver(true);
                        playSound('win', isMuted);
                    } else {
                        setCurrentLevel(prev => prev + 1);
                        setGameState('question');
                    }
                }, 3000);
            } else {
                // Incorrect
                playSound('incorrect', isMuted);
                setTimeout(() => {
                    // Calculate drop to safety net
                    let safeAmount = 0;
                    if (currentLevel > 9) safeAmount = 32000;
                    else if (currentLevel > 4) safeAmount = 1000;
                    
                    setWinnings(safeAmount);
                    setGameState('result');
                    setIsGameOver(true);
                }, 4000);
            }
        }, 3000); // 3s tension
    };

    const handleWalkAway = () => {
        if (isProcessing) return;
        setIsProcessing(true);
        const currentAmount = currentLevel > 0 ? MONEY_LADDER[currentLevel - 1] : 0;
        setWinnings(currentAmount);
        setGameState('walkaway');
        setIsGameOver(true);
        playSound('win', isMuted); // Mild win sound
    };

    const useFiftyFifty = () => {
        if (used5050 || gameState !== 'question' || isProcessing) return;
        playSound('bonus', isMuted);
        setUsed5050(true);
        
        const correctIdx = getCorrectIndex();
        const incorrectIndices = [0, 1, 2, 3].filter(i => i !== correctIdx);
        
        // Remove 2 random incorrects
        const toRemove = [];
        while (toRemove.length < 2) {
            const r = incorrectIndices[Math.floor(Math.random() * incorrectIndices.length)];
            if (!toRemove.includes(r)) toRemove.push(r);
        }
        setHiddenOptions(toRemove);
    };

    const useAudience = () => {
        if (usedAudience || gameState !== 'question' || isProcessing) return;
        playSound('bonus', isMuted);
        setUsedAudience(true);
        setIsPolling(true);
        
        // Polling simulation delay
        setTimeout(() => {
            const correctIdx = getCorrectIndex();
            // Probability based on difficulty
            let correctChance = 0.85;
            if (currentLevel > 4) correctChance = 0.60;
            if (currentLevel > 9) correctChance = 0.40;
            
            const stats = [0, 0, 0, 0];
            // Assign to correct
            stats[correctIdx] = Math.floor(Math.random() * 15) + (correctChance * 100); 
            
            // Distribute remaining to others
            let remaining = 100 - stats[correctIdx];
            if (remaining < 0) {
                 stats[correctIdx] = 100;
                 remaining = 0;
            }
            
            // Randomly fill others
            for(let i=0; i<4; i++) {
                if (i !== correctIdx) {
                    const share = Math.floor(Math.random() * remaining);
                    stats[i] = share;
                    remaining -= share;
                }
            }
            // Dump remainder on last non-correct
            const lastIdx = stats.findIndex((v, i) => i !== correctIdx && v === 0);
            if (lastIdx !== -1) stats[lastIdx] += remaining;
            
            setAudienceStats(stats);
            setIsPolling(false);
        }, 3000);
    };

    const usePhone = () => {
        if (usedPhone || gameState !== 'question' || isProcessing) return;
        playSound('bonus', isMuted);
        setUsedPhone(true);
        setIsCalling(true);
        
        setTimeout(() => {
            const correctIdx = getCorrectIndex();
            const correctLetter = ['A', 'B', 'C', 'D'][correctIdx];
            
            // Confidence level based on difficulty
            const confidence = currentLevel < 5 ? "100%" : currentLevel < 10 ? "80%" : "50%";
            const text = `I'm about ${confidence} sure the answer is ${correctLetter}... but don't blame me if I'm wrong!`;
            
            setPhoneHint(text);
            setIsCalling(false);
        }, 4000); // 4s Ringing delay
    };

    const toggleFullscreen = () => {
        if (isMobileViewport) return;
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const openImageZoom = (event?: React.SyntheticEvent) => {
        if (event) {
            event.stopPropagation();
        }
        if (questionImageUrl && !isMobileViewport) {
            setIsImageZoomOpen(true);
        }
    };

    const handleImageKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openImageZoom(event);
        }
    };

    // --- RENDER HELPERS ---
    const getOptionClass = (index: number) => {
        if (hiddenOptions.includes(index)) return "invisible";
        
        let base = "relative flex items-center w-full border-2 rounded-full transition-all duration-200 font-bold text-left group overflow-hidden focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ";
        
        // Responsive Sizing based on Fullscreen
        if (isMobileViewport) {
            base += "p-3 text-sm sm:text-xl";
        } else {
            base += isFullscreen ? "p-6 md:p-8 text-3xl md:text-5xl" : "p-4 md:p-6 text-xl md:text-3xl";
        }
        
        if (gameState === 'reveal' || gameState === 'result') {
            if (gameState === 'reveal' && correctOption === null && index === selectedOption) {
                return base + " bg-indigo-800 border-yellow-400 text-white shadow-[0_0_15px_rgba(234,179,8,0.4)] z-10 scale-105";
            }
            if (index === correctOption) return base + " bg-green-600 border-green-400 text-white animate-pulse shadow-[0_0_30px_rgba(34,197,94,0.8)] z-20 scale-105";
            if (index === selectedOption && index !== correctOption) return base + " bg-red-600 border-red-400 text-white";
        }
        
        if (index === selectedOption) return base + " bg-orange-500 border-white text-white shadow-[0_0_20px_rgba(249,115,22,0.8)] z-10 scale-105";
        
        return base + " bg-slate-900 border-indigo-300/50 text-white sm:hover:bg-indigo-800 sm:hover:border-yellow-400 sm:hover:shadow-[0_0_15px_rgba(234,179,8,0.4)]";
    };

    // Helper for dynamic question font size
    const getQuestionFontSizeClass = (text: string) => {
        const len = text ? text.length : 0;
        if (isMobileViewport) {
            if (len < 40) return 'text-[clamp(1.4rem,6vw,2rem)]';
            if (len < 80) return 'text-[clamp(1.2rem,5vw,1.7rem)]';
            if (len < 150) return 'text-[clamp(1rem,4.5vw,1.4rem)]';
            return 'text-[clamp(0.9rem,4vw,1.2rem)]';
        }
        if (isFullscreen) {
             if (len < 40) return 'text-5xl md:text-7xl';
             if (len < 80) return 'text-4xl md:text-6xl';
             if (len < 150) return 'text-3xl md:text-5xl';
             if (len < 250) return 'text-2xl md:text-4xl';
             return 'text-xl md:text-3xl';
        } else {
             if (len < 40) return 'text-3xl md:text-5xl';
             if (len < 80) return 'text-2xl md:text-4xl';
             if (len < 150) return 'text-xl md:text-3xl';
             if (len < 250) return 'text-lg md:text-2xl';
             return 'text-base md:text-xl';
        }
    };

    // Helper for dynamic answer font size to allow wrapping
    const getAnswerFontSize = (text: string) => {
        const len = text.length;
        if (isMobileViewport) {
            if (len > 60) return "text-[clamp(0.7rem,2.8vw,0.95rem)] leading-tight";
            if (len > 30) return "text-[clamp(0.8rem,3.2vw,1.05rem)] leading-tight";
            return "text-[clamp(0.9rem,3.6vw,1.2rem)]";
        }
        if (len > 60) return isFullscreen ? "text-lg md:text-xl leading-tight" : "text-xs md:text-sm leading-tight";
        if (len > 30) return isFullscreen ? "text-xl md:text-2xl leading-tight" : "text-sm md:text-base leading-tight";
        return isFullscreen ? "text-3xl md:text-5xl" : "text-xl md:text-3xl"; 
    }

    // Dynamic Container Class - Z-Index 9999 to cover Navbar absolutely
    const containerClass = isFullscreen 
        ? "fixed inset-0 z-[9999] bg-black text-white flex flex-col overflow-hidden h-screen w-screen top-0 left-0"
        : "fixed inset-x-0 bottom-0 top-16 z-[50] bg-black text-white flex flex-col overflow-hidden";

    const mobileLadderVisibleCols = 5;
    const mobileLadderCenterIndex = Math.floor(mobileLadderVisibleCols / 2);
    const mobileLadderMaxStart = Math.max(0, MONEY_LADDER.length - mobileLadderVisibleCols);
    const mobileLadderWindowStart = Math.min(
        mobileLadderMaxStart,
        Math.max(0, currentLevel - mobileLadderCenterIndex)
    );
    const mobileLadderWindow = MONEY_LADDER.slice(
        mobileLadderWindowStart,
        mobileLadderWindowStart + mobileLadderVisibleCols
    );

    return (
        <div ref={containerRef} className={containerClass}>
            {/* GLOBAL STYLES */}
            <style>
                {`
                @keyframes money-fall {
                    0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
                }
                .money-bill {
                    position: absolute;
                    top: -50px;
                    width: 60px;
                    height: 30px;
                    background-color: #85bb65;
                    border: 1px solid #4a7c2e;
                    animation: money-fall linear infinite;
                    z-index: 0;
                    opacity: 0.8;
                }
                @keyframes pulse-gold {
                    0%, 100% { text-shadow: 0 0 20px #eab308; transform: scale(1); }
                    50% { text-shadow: 0 0 50px #fff; transform: scale(1.05); }
                }
                `}
            </style>

            {/* INTRO SCREEN */}
            {gameState === 'intro' && (
                <div className="absolute inset-0 flex items-center justify-center p-4 bg-gradient-to-b from-indigo-950 to-black z-30">
                    <div className="absolute top-4 left-4 z-40 pointer-events-auto">
                        <button onClick={() => setShowQuitConfirm(true)} className="text-slate-400 hover:text-white transition-colors bg-white/10 p-2 rounded-full hover:bg-white/20 flex items-center gap-2 px-4">
                            <ArrowLeft size={24} /> <span className="font-bold hidden md:inline">Back</span>
                        </button>
                    </div>
                    {!isMobileViewport && (
                        <div className="absolute top-4 right-4">
                            <button onClick={toggleFullscreen} className="text-slate-400 hover:text-white p-2">
                                {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
                            </button>
                        </div>
                    )}

                    <div className="text-center animate-fade-in max-w-4xl w-full">
                        <div className="relative mb-12">
                            <div className="absolute inset-0 bg-indigo-500 blur-[100px] opacity-20 rounded-full"></div>
                            <Trophy size={160} className="text-yellow-400 mx-auto drop-shadow-[0_0_30px_rgba(250,204,21,0.6)] relative z-10" />
                        </div>
                        <h1 className="text-[clamp(2.4rem,8vw,4.5rem)] sm:text-6xl md:text-8xl font-display font-black text-white mb-6 tracking-wider uppercase text-shadow leading-tight break-words">
                            Millionaire Maker
                        </h1>
                        <p className="text-indigo-200 text-2xl md:text-3xl mb-16 font-light">15 Questions. 3 Lifelines. One Million Dollars.</p>
                        <button 
                            onClick={() => setGameState('question')}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-3xl font-bold py-6 px-16 rounded-full shadow-[0_0_40px_rgba(79,70,229,0.6)] transition-all hover:scale-105 active:scale-95 border-4 border-indigo-400"
                        >
                            Let's Play
                        </button>
                    </div>
                </div>
            )}

            {/* WIN/LOSE SCREEN */}
            {(gameState === 'result' || gameState === 'walkaway') && (
                <div className="absolute inset-0 flex items-center justify-center p-4 text-center z-30 bg-black/80 backdrop-blur-md">
                    {/* Money Rain Effect */}
                    {winnings >= 32000 && Array.from({length: 50}).map((_, i) => (
                        <div key={i} className="money-bill" style={{
                            left: `${Math.random() * 100}%`,
                            animationDuration: `${Math.random() * 3 + 2}s`,
                            animationDelay: `${Math.random() * 5}s`,
                            transform: `rotate(${Math.random() * 360}deg)`
                        }} />
                    ))}

                    <div className="bg-slate-800/90 backdrop-blur-xl p-16 rounded-[3rem] border-2 border-indigo-500/50 shadow-2xl max-w-4xl w-full animate-slide-up relative z-10">
                        <h2 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
                            {winnings === 1000000 ? "ULTIMATE CHAMPION!" : "GAME OVER"}
                        </h2>
                        <p className="text-indigo-300 text-xl md:text-2xl mb-12 uppercase tracking-widest font-bold">
                            {gameState === 'walkaway' ? "You walked away with" : "You go home with"}
                        </p>
                        
                        <div
                            className={`font-black text-yellow-400 mb-16 drop-shadow-xl font-mono leading-none max-w-full ${isMobileViewport ? 'text-[clamp(32px,10vw,72px)]' : 'text-7xl md:text-9xl'}`}
                            style={{ animation: winnings === 1000000 ? 'pulse-gold 2s infinite' : 'none' }}
                        >
                            ${winnings.toLocaleString()}
                        </div>
                        
                        <div className="flex gap-6 justify-center">
                            <button 
                                onClick={onReplay}
                                className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-bold text-2xl hover:bg-indigo-500 transition-colors shadow-lg hover:shadow-indigo-500/30"
                            >
                                Play Again
                            </button>
                            <button 
                                onClick={onFinish}
                                className="bg-slate-700 text-white px-10 py-5 rounded-2xl font-bold text-2xl hover:bg-slate-600 transition-colors shadow-lg"
                            >
                                Exit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN GAME INTERFACE */}
            <div className={`flex flex-col h-full w-full relative z-10 transition-opacity duration-500 ${(gameState === 'result' || gameState === 'walkaway') ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
                {/* CENTRAL SPOTLIGHT BACKGROUND */}
                <div className="absolute inset-0 pointer-events-none z-0">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] bg-indigo-900/20 blur-[120px] rounded-full"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vh] bg-blue-600/10 blur-[80px] rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_10%,#000_85%)]"></div>
                </div>

                {/* TOP BAR - Increased padding for safe area */}
                <div className={`relative z-10 flex flex-wrap md:flex-nowrap justify-between items-center bg-gradient-to-b from-black via-black/80 to-transparent shrink-0 w-full transition-all duration-300 ${isMobileViewport ? 'px-2 py-2 gap-2' : 'p-4 gap-4'} ${isFullscreen ? 'pt-8 pb-8' : ''}`}>
                    {/* Back Button */}
                    <div className="flex items-center gap-4 w-auto shrink-0 order-1">
                        <button onClick={() => setShowQuitConfirm(true)} className={`text-slate-400 hover:text-white transition-colors bg-white/10 rounded-full hover:bg-white/20 flex items-center gap-2 ${isMobileViewport ? 'p-2' : 'p-2 px-4'}`}>
                            <ArrowLeft size={isMobileViewport ? 18 : 24} /> <span className="font-bold hidden md:inline">Back</span>
                        </button>
                    </div>
                    
                    {/* LIFELINES - CENTERED FLEX */}
                    <div className="flex gap-3 md:gap-8 justify-center flex-1 order-3 md:order-2 w-full md:w-auto mt-2 md:mt-0">
                        <button 
                            onClick={useFiftyFifty} 
                            disabled={used5050 || isProcessing}
                            className={`${isMobileViewport ? 'w-12 h-9 text-xs' : 'w-20 h-12 md:w-28 md:h-16'} rounded-full flex items-center justify-center font-bold border-2 transition-all relative overflow-hidden group
                                ${used5050 ? 'border-slate-800 text-slate-700 bg-slate-900 cursor-not-allowed' : 'border-indigo-400 text-indigo-300 hover:bg-indigo-600 hover:text-white hover:border-white shadow-[0_0_15px_rgba(99,102,241,0.6)] bg-black'}`}
                            title="50:50"
                        >
                            <span className="font-black text-sm md:text-xl font-mono text-sky-300 group-hover:text-white" style={{letterSpacing: '-1px'}}>50:50</span>
                            {used5050 && <div className="absolute inset-0 flex items-center justify-center text-red-600 text-4xl font-black bg-black/80">X</div>}
                        </button>
                        
                        <button 
                            onClick={usePhone} 
                            disabled={usedPhone || isProcessing}
                            className={`${isMobileViewport ? 'w-12 h-9 text-xs' : 'w-20 h-12 md:w-28 md:h-16'} rounded-full flex items-center justify-center font-bold border-2 transition-all relative overflow-hidden
                                ${usedPhone ? 'border-slate-800 text-slate-700 bg-slate-900 cursor-not-allowed' : 'border-indigo-400 text-indigo-300 hover:bg-indigo-600 hover:text-white hover:border-white shadow-[0_0_15px_rgba(99,102,241,0.6)] bg-black'}`}
                            title="Phone a Friend"
                        >
                            <Phone size={20} className="md:w-8 md:h-8" />
                            {usedPhone && <div className="absolute inset-0 flex items-center justify-center text-red-600 text-4xl font-black bg-black/80">X</div>}
                        </button>
                        
                        <button 
                            onClick={useAudience} 
                            disabled={usedAudience || isProcessing}
                            className={`${isMobileViewport ? 'w-12 h-9 text-xs' : 'w-20 h-12 md:w-28 md:h-16'} rounded-full flex items-center justify-center font-bold border-2 transition-all relative overflow-hidden
                                ${usedAudience ? 'border-slate-800 text-slate-700 bg-slate-900 cursor-not-allowed' : 'border-indigo-400 text-indigo-300 hover:bg-indigo-600 hover:text-white hover:border-white shadow-[0_0_15px_rgba(99,102,241,0.6)] bg-black'}`}
                            title="Ask the Audience"
                        >
                            <Users size={20} className="md:w-8 md:h-8" />
                            {usedAudience && <div className="absolute inset-0 flex items-center justify-center text-red-600 text-4xl font-black bg-black/80">X</div>}
                        </button>
                    </div>

                    <div className="flex gap-2 w-auto shrink-0 order-2 md:order-3">
                        <button onClick={() => setIsMuted(!isMuted)} className="text-slate-400 hover:text-white p-2">
                            {isMuted ? <VolumeX size={isMobileViewport ? 18 : 24} /> : <Volume2 size={isMobileViewport ? 18 : 24} />}
                        </button>
                        {!isMobileViewport && (
                            <button onClick={toggleFullscreen} className="text-slate-400 hover:text-white p-2">
                                {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
                            </button>
                        )}
                    </div>
                </div>

                {/* MAIN GAME AREA */}
                <div className="flex-1 relative z-10 flex flex-col md:flex-row min-h-0 overflow-hidden">
                    
                    {/* CENTER STAGE */}
                    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">

                        <div className="w-full max-w-6xl flex flex-col flex-1 min-h-0 gap-3 md:gap-6">
                        {/* QUESTION BOX - Adjusted for no scrolling */}
                        <div
                            className={`w-full bg-black/90 border-2 border-indigo-400 rounded-[2rem] ${isMobileViewport ? 'p-4 min-h-[18vh]' : 'p-6 md:p-10 min-h-[20vh]'} text-center relative shadow-[0_0_50px_rgba(79,70,229,0.3)] z-20 flex items-center justify-center overflow-hidden`}
                            style={isMobileViewport && questionImageUrl ? { flex: '2 1 0%' } : undefined}
                        >
                            {/* Decorative side bars */}
                            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 md:w-4 h-24 bg-indigo-500 rounded-r-lg shadow-[0_0_15px_rgba(99,102,241,0.8)]"></div>
                            <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 md:w-4 h-24 bg-indigo-500 rounded-l-lg shadow-[0_0_15px_rgba(99,102,241,0.8)]"></div>
                            {questionImageUrl ? (
                                <div className={`w-full flex ${isMobileViewport ? 'flex-col' : 'flex-row'} items-center justify-center gap-4`}>
                                    <div className={isMobileViewport ? 'w-full h-28 sm:h-32 flex items-center justify-center flex-none' : 'flex-1 min-h-0 flex items-center justify-center'}>
                                        <img
                                            src={questionImageUrl}
                                            alt={questionImageAlt}
                                            onClick={isMobileViewport ? undefined : openImageZoom}
                                            onKeyDown={isMobileViewport ? undefined : handleImageKeyDown}
                                            role={isMobileViewport ? undefined : 'button'}
                                            tabIndex={isMobileViewport ? -1 : 0}
                                            title={isMobileViewport ? undefined : 'Click to zoom'}
                                            className={`max-h-full w-auto rounded-xl object-contain border border-indigo-300/40 bg-black/60 shadow-sm ${isMobileViewport ? '' : 'cursor-zoom-in'}`}
                                        />
                                    </div>
                                    <div className={`flex-1 min-h-0 flex items-center justify-center ${isMobileViewport ? 'text-center' : 'text-left'}`}>
                                        <h2 className={`font-bold text-white leading-tight font-display tracking-wide drop-shadow-md w-full ${isMobileViewport ? 'text-center' : 'text-left'} ${getQuestionFontSizeClass(currentQuestion?.question || "Loading...")}`}>
                                            {currentQuestion?.question || "Loading..."}
                                        </h2>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full flex flex-col items-center justify-center gap-3">
                                    <h2 className={`font-bold text-white leading-tight font-display tracking-wide drop-shadow-md ${getQuestionFontSizeClass(currentQuestion?.question || "Loading...")}`}>
                                        {currentQuestion?.question || "Loading..."}
                                    </h2>
                                </div>
                            )}
                        </div>

                        {/* OPTIONS GRID */}
                        <div
                            className={`grid grid-cols-2 md:grid-cols-2 ${isMobileViewport ? 'gap-3' : 'gap-4 md:gap-6'} w-full flex-1 min-h-0 relative z-20`}
                            style={isMobileViewport && questionImageUrl ? { flex: '1 1 0%' } : undefined}
                        >
                            {optionsList.map((opt, idx) => (
                                <button 
                                    key={idx}
                                    disabled={hiddenOptions.includes(idx) || selectedOption !== null || isProcessing}
                                    onClick={() => handleAnswer(idx)}
                                    className={getOptionClass(idx)}
                                >
                                    <span className={`text-yellow-500 mr-3 sm:group-hover:text-white transition-colors font-display ${isMobileViewport ? 'text-base' : (isFullscreen ? 'text-3xl md:text-5xl' : 'text-xl md:text-3xl')}`}>
                                        {['A', 'B', 'C', 'D'][idx]}:
                                    </span>
                                    <span className={`drop-shadow-sm w-full leading-tight text-left ${getAnswerFontSize(opt)}`}>
                                        {opt}
                                    </span>
                                    
                                    {/* Line connecting to center (Visual Polish) */}
                                    <div className="absolute top-1/2 -left-6 w-6 h-0.5 bg-indigo-500/50 hidden md:block opacity-50"></div>
                                    <div className="absolute top-1/2 -right-6 w-6 h-0.5 bg-indigo-500/50 hidden md:block opacity-50"></div>
                                </button>
                            ))}
                        </div>
                        </div>

                        {/* WALK AWAY BUTTON - Preserved layout space to prevent shifting */}
                        {currentLevel > 0 && (
                            <div className={`mt-6 sm:mt-8 transition-opacity duration-300 ${gameState === 'question' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                <button 
                                    onClick={handleWalkAway}
                                    className={`text-slate-400 hover:text-white font-bold uppercase tracking-widest border-2 border-slate-700 rounded-full hover:bg-slate-800 transition-colors bg-black/50 backdrop-blur-md ${isMobileViewport ? 'text-xs px-4 py-2' : 'text-lg px-8 py-3'}`}
                                >
                                    Walk Away: ${MONEY_LADDER[currentLevel-1].toLocaleString()}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* MONEY LADDER (RIGHT SIDE) - Hide on mobile unless tall screen? */}
                    <div className={`hidden lg:flex w-64 xl:w-80 bg-black/40 border-l border-white/10 p-4 xl:p-6 flex-col justify-center backdrop-blur-sm z-30 shrink-0`}>
                        <div className="space-y-1 h-full flex flex-col justify-center">
                            {[...MONEY_LADDER].reverse().map((amount, idx) => {
                                const levelIndex = 14 - idx;
                                const isCurrent = levelIndex === currentLevel;
                                const isCompleted = levelIndex < currentLevel;
                                const isSafe = SAFETY_NETS.includes(levelIndex);
                                
                                return (
                                    <div 
                                        key={levelIndex} 
                                        className={`flex justify-between items-center px-4 py-1.5 rounded-lg font-mono transition-all duration-500
                                            ${isCurrent ? 'bg-orange-500 text-white font-black scale-110 shadow-[0_0_20px_rgba(249,115,22,0.8)] z-10 border-2 border-white' : ''}
                                            ${isCompleted ? 'text-green-500 opacity-60' : ''}
                                            ${!isCurrent && !isCompleted ? (isSafe ? 'text-white font-bold' : 'text-orange-400/70') : ''}
                                        `}
                                    >
                                        <span className="text-xs xl:text-sm mr-4 opacity-50">{levelIndex + 1}</span>
                                        <span className={`text-lg xl:text-xl ${isCurrent ? 'text-xl xl:text-2xl' : ''}`}>${amount.toLocaleString()}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {isMobileViewport && (
                    <div className="sm:hidden w-full shrink-0 px-3 pb-3">
                        <div className="mx-auto w-full max-w-sm bg-slate-950/90 border border-indigo-400/60 rounded-xl px-3 py-2 shadow-[0_0_28px_rgba(15,23,42,0.9)] backdrop-blur-sm">
                            <div className="text-[10px] uppercase tracking-widest text-slate-200 font-bold text-center mb-2">Money Ladder</div>
                            <div className="grid grid-cols-5 gap-2 transition-all duration-300 ease-out">
                                {mobileLadderWindow.map((amount, i) => {
                                    const globalIndex = mobileLadderWindowStart + i;
                                    const isCurrent = globalIndex === currentLevel;
                                    const isSafe = SAFETY_NETS.includes(globalIndex);
                                    return (
                                        <div
                                            key={`${amount}-${globalIndex}`}
                                            className={`h-[40px] flex flex-col items-center justify-center rounded-lg font-mono text-[10px] leading-tight transition-all duration-300 ease-out ${
                                                isCurrent
                                                    ? 'bg-orange-500 text-white font-black shadow-[0_0_12px_rgba(249,115,22,0.7)] scale-[1.02]'
                                                    : isSafe
                                                        ? 'bg-slate-900/70 text-white font-bold'
                                                        : 'bg-slate-900/60 text-slate-200'
                                            }`}
                                        >
                                            <span className="opacity-80">{globalIndex + 1}</span>
                                            <div className="flex items-center gap-1">
                                                <span className="h-3 w-px bg-slate-200/40" />
                                                <span>${amount.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {isImageZoomOpen && questionImageUrl && (
                <div
                    className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={() => setIsImageZoomOpen(false)}
                >
                    <div
                        className="relative w-full max-w-[90vw] max-h-[90vh] flex items-center justify-center overflow-visible"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            onClick={() => setIsImageZoomOpen(false)}
                            className="absolute -top-4 -right-4 bg-white text-slate-900 rounded-full w-9 h-9 flex items-center justify-center shadow-lg"
                            title="Close"
                        >
                            <span className="text-lg font-bold leading-none">X</span>
                        </button>
                        <img
                            src={questionImageUrl}
                            alt={questionImageAlt}
                            onClick={() => setIsImageZoomOpen(false)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    setIsImageZoomOpen(false);
                                }
                            }}
                            role="button"
                            tabIndex={0}
                            title="Click to close"
                            style={{
                                transform: 'scale(2)',
                                transformOrigin: 'center',
                                maxWidth: '25vw',
                                maxHeight: 'calc((100vh - 4rem - env(safe-area-inset-top)) * 0.25)'
                            }}
                            className="rounded-2xl object-contain border border-white/10 shadow-2xl cursor-zoom-out"
                        />
                    </div>
                </div>
            )}

            {/* LIFELINE OVERLAYS (MODALS) */}
            
            {/* Phone A Friend */}
            {(isCalling || phoneHint) && (
                <div className={`${isFullscreen ? 'fixed inset-0' : 'fixed inset-x-0 bottom-0 top-16'} z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-3 sm:p-4`}>
                    <div className={`bg-slate-900 border-4 border-indigo-500 w-full text-center shadow-[0_0_50px_rgba(79,70,229,0.5)] relative ${isMobileViewport ? 'rounded-2xl p-4 w-[90vw] max-w-[90vw] h-[50vh] max-h-[50vh] overflow-hidden flex items-center justify-center pt-8' : 'rounded-[3rem] p-12 max-w-4xl'}`}>
                        <div className={`absolute left-1/2 -translate-x-1/2 bg-indigo-600 text-white font-bold uppercase tracking-widest border-4 border-slate-900 ${isMobileViewport ? 'top-2 px-4 py-1 rounded-full text-xs' : '-top-10 px-8 py-2 rounded-full text-xl'}`}>
                            Phone-A-Friend
                        </div>
                        
                        {isCalling ? (
                            <div className={`flex flex-col items-center w-full ${isMobileViewport ? 'h-[75%] justify-center' : 'py-10'}`}>
                                <Phone size={isMobileViewport ? 48 : 80} className="text-white mb-6 animate-bounce" />
                                <h3 className={`font-display font-bold text-white animate-pulse ${isMobileViewport ? 'text-3xl' : 'text-6xl'}`}>Dialing...</h3>
                            </div>
                        ) : (
                            <div className={`animate-slide-up w-full ${isMobileViewport ? 'h-[75%] flex flex-col justify-center' : ''}`}>
                                <div className={`text-left bg-slate-800 rounded-3xl relative mt-3 border border-slate-700 ${isMobileViewport ? 'p-4' : 'p-10'}`}>
                                    <div className={`absolute bg-yellow-500 text-black font-bold transform -rotate-2 ${isMobileViewport ? 'left-3 -top-3 px-3 py-1 rounded-md text-xs' : '-left-4 -top-4 px-6 py-2 rounded-lg text-lg'}`}>FRIEND SAYS:</div>
                                    <p className={`font-medium text-white leading-snug font-display ${isMobileViewport ? 'text-[clamp(1rem,4vw,1.3rem)]' : 'text-3xl md:text-5xl'}`}>
                                        "{phoneHint}"
                                    </p>
                                </div>
                                <button onClick={() => setPhoneHint(null)} className={`bg-white text-slate-900 rounded-full font-bold hover:bg-slate-200 transition-colors ${isMobileViewport ? 'mt-5 w-full px-5 py-3 text-sm' : 'mt-10 px-10 py-4 text-xl'}`}>
                                    Thanks, hang up
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Audience Vote */}
            {(isPolling || audienceStats) && (
                <div className={`${isFullscreen ? 'fixed inset-0' : 'fixed inset-x-0 bottom-0 top-16'} z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-3 sm:p-4`}>
                    <div className={`bg-slate-900 border-4 border-indigo-500 w-full text-center shadow-[0_0_50px_rgba(79,70,229,0.5)] relative ${isMobileViewport ? 'rounded-2xl p-4 w-[90vw] max-w-[90vw] h-[50vh] max-h-[50vh] overflow-hidden flex items-center justify-center pt-8' : 'rounded-[3rem] p-8 md:p-12 max-w-5xl'}`}>
                        <div className={`absolute left-1/2 -translate-x-1/2 bg-indigo-600 text-white font-bold uppercase tracking-widest border-4 border-slate-900 ${isMobileViewport ? 'top-2 px-4 py-1 rounded-full text-xs' : '-top-10 px-8 py-2 rounded-full text-xl'}`}>
                            Audience Vote
                        </div>

                        {isPolling ? (
                            <div className={`flex flex-col items-center w-full ${isMobileViewport ? 'h-[75%] justify-center' : 'py-20'}`}>
                                <Users size={isMobileViewport ? 60 : 100} className="text-white mb-6 animate-pulse" />
                                <h3 className={`font-bold text-white mb-3 ${isMobileViewport ? 'text-xl' : 'text-5xl'}`}>Polling Audience...</h3>
                                <div className={`w-full max-w-md h-3 ${isMobileViewport ? 'max-w-[200px]' : ''} bg-slate-700 rounded-full overflow-hidden`}>
                                    <div className="h-full bg-indigo-500 animate-[width_3s_ease-in-out] w-full"></div>
                                </div>
                            </div>
                        ) : (
                            <div className={`animate-slide-up w-full flex flex-col items-center ${isMobileViewport ? 'h-[75%] justify-center' : ''}`}>
                                <div className={`flex items-end justify-center w-full pb-4 ${isMobileViewport ? 'gap-3 h-[22vh] px-2' : 'gap-6 md:gap-12 h-[50vh] px-4 md:px-12'}`}>
                                    {audienceStats && audienceStats.map((stat, i) => (
                                        <div key={i} className={`flex flex-col items-center h-full justify-end group ${isMobileViewport ? 'w-12' : 'w-20 md:w-32'}`}>
                                            <div className={`font-black text-white mb-2 opacity-0 animate-[fade-in_0.5s_0.5s_forwards] ${isMobileViewport ? 'text-base' : 'text-3xl'}`}>{stat}%</div>
                                            <div 
                                                className="w-full bg-gradient-to-t from-blue-900 via-blue-500 to-cyan-400 rounded-t-xl transition-all duration-[1500ms] ease-out shadow-[0_0_20px_rgba(56,189,248,0.5)] border-t-4 border-white/50 relative overflow-hidden"
                                                style={{ height: '0%', animation: `grow-bar-${i} 1s forwards` }}
                                            >
                                                {/* Bar Stripes Effect */}
                                                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_25%,rgba(255,255,255,0.1)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.1)_75%,transparent_100%)] bg-[length:20px_20px] opacity-50"></div>
                                                <style>{`@keyframes grow-bar-${i} { from { height: 0%; } to { height: ${stat}%; } }`}</style>
                                            </div>
                                            <div className={`font-black mt-3 text-yellow-400 font-display border-t-2 border-slate-700 w-full pt-2 ${isMobileViewport ? 'text-xl' : 'text-4xl md:text-6xl'}`}>{['A','B','C','D'][i]}</div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => setAudienceStats(null)} className={`mx-auto bg-white text-slate-900 rounded-full font-bold hover:bg-slate-200 transition-colors shadow-lg ${isMobileViewport ? 'mt-4 px-5 py-2.5 text-sm' : 'mt-8 px-12 py-4 text-xl'}`}>
                                    Close Results
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Quit Confirmation Modal */}
            {showQuitConfirm && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white text-slate-900 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl border border-slate-100">
                        <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Quit current game?</h2>
                        <p className="text-slate-500 mb-6">Your progress will be lost if you haven't saved.</p>
                        <div className="flex space-x-4">
                            <button
                                onClick={() => setShowQuitConfirm(false)}
                                className="flex-1 py-3 bg-slate-100 font-bold rounded-lg hover:bg-slate-200 transition-colors text-slate-700"
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

        </div>
    );
};

