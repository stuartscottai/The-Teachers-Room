
import React, { useState, useEffect, useRef } from 'react';
import { GeneratedGame, GameRunOptions } from '../../types';
import { playSound } from '../../utils/gameUtils';
import { ArrowLeft, Phone, Users, Trophy, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';

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
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sanity check for questions
    const questions = game.questions || [];
    const currentQuestion = questions[currentLevel];

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
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // --- RENDER HELPERS ---
    const getOptionClass = (index: number) => {
        if (hiddenOptions.includes(index)) return "invisible";
        
        let base = "relative flex items-center w-full border-2 rounded-full transition-all duration-200 font-bold text-left group overflow-hidden ";
        
        // Responsive Sizing based on Fullscreen
        base += isFullscreen ? "p-6 md:p-8 text-3xl md:text-5xl" : "p-4 md:p-6 text-xl md:text-3xl";
        
        if (gameState === 'reveal' || gameState === 'result') {
            if (index === correctOption) return base + " bg-green-600 border-green-400 text-white animate-pulse shadow-[0_0_30px_rgba(34,197,94,0.8)] z-20 scale-105";
            if (index === selectedOption && index !== correctOption) return base + " bg-red-600 border-red-400 text-white";
        }
        
        if (index === selectedOption) return base + " bg-orange-500 border-white text-white shadow-[0_0_20px_rgba(249,115,22,0.8)] z-10 scale-105";
        
        return base + " bg-slate-900 border-indigo-300/50 text-white hover:bg-indigo-800 hover:border-yellow-400 hover:shadow-[0_0_15px_rgba(234,179,8,0.4)]";
    };

    // Helper for dynamic question font size
    const getQuestionFontSizeClass = (text: string) => {
        const len = text ? text.length : 0;
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
        if (len > 60) return isFullscreen ? "text-lg md:text-xl leading-tight" : "text-xs md:text-sm leading-tight";
        if (len > 30) return isFullscreen ? "text-xl md:text-2xl leading-tight" : "text-sm md:text-base leading-tight";
        return isFullscreen ? "text-3xl md:text-5xl" : "text-xl md:text-3xl"; 
    }

    // Dynamic Container Class - Z-Index 9999 to cover Navbar absolutely
    const containerClass = isFullscreen 
        ? "fixed inset-0 z-[9999] bg-black text-white flex flex-col overflow-hidden h-screen w-screen top-0 left-0"
        : "relative h-[calc(100vh-64px)] w-full bg-black text-white flex flex-col overflow-hidden";

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
                    <div className="absolute top-4 left-4">
                        <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors bg-white/10 p-2 rounded-full hover:bg-white/20 flex items-center gap-2 px-4">
                            <ArrowLeft size={24} /> <span className="font-bold hidden md:inline">Back</span>
                        </button>
                    </div>
                    <div className="absolute top-4 right-4">
                        <button onClick={toggleFullscreen} className="text-slate-400 hover:text-white p-2">
                            {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
                        </button>
                    </div>

                    <div className="text-center animate-fade-in max-w-4xl w-full">
                        <div className="relative mb-12">
                            <div className="absolute inset-0 bg-indigo-500 blur-[100px] opacity-20 rounded-full"></div>
                            <Trophy size={160} className="text-yellow-400 mx-auto drop-shadow-[0_0_30px_rgba(250,204,21,0.6)] relative z-10" />
                        </div>
                        <h1 className="text-6xl md:text-8xl font-display font-black text-white mb-6 tracking-wider uppercase text-shadow">
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
                        
                        <div className="text-7xl md:text-9xl font-black text-yellow-400 mb-16 drop-shadow-xl font-mono" style={{ animation: winnings === 1000000 ? 'pulse-gold 2s infinite' : 'none' }}>
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
                <div className={`relative z-10 flex flex-wrap md:flex-nowrap justify-between items-center p-4 gap-4 bg-gradient-to-b from-black via-black/80 to-transparent shrink-0 w-full transition-all duration-300 ${isFullscreen ? 'pt-8 pb-8' : 'pt-4'}`}>
                    {/* Back Button */}
                    <div className="flex items-center gap-4 w-auto shrink-0 order-1">
                        <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors bg-white/10 p-2 rounded-full hover:bg-white/20 flex items-center gap-2 px-4">
                            <ArrowLeft size={24} /> <span className="font-bold hidden md:inline">Back</span>
                        </button>
                    </div>
                    
                    {/* LIFELINES - CENTERED FLEX */}
                    <div className="flex gap-3 md:gap-8 justify-center flex-1 order-3 md:order-2 w-full md:w-auto mt-2 md:mt-0">
                        <button 
                            onClick={useFiftyFifty} 
                            disabled={used5050 || isProcessing}
                            className={`w-20 h-12 md:w-28 md:h-16 rounded-full flex items-center justify-center font-bold border-2 transition-all relative overflow-hidden group
                                ${used5050 ? 'border-slate-800 text-slate-700 bg-slate-900 cursor-not-allowed' : 'border-indigo-400 text-indigo-300 hover:bg-indigo-600 hover:text-white hover:border-white shadow-[0_0_15px_rgba(99,102,241,0.6)] bg-black'}`}
                            title="50:50"
                        >
                            <span className="font-black text-sm md:text-xl font-mono text-sky-300 group-hover:text-white" style={{letterSpacing: '-1px'}}>50:50</span>
                            {used5050 && <div className="absolute inset-0 flex items-center justify-center text-red-600 text-4xl font-black bg-black/80">X</div>}
                        </button>
                        
                        <button 
                            onClick={usePhone} 
                            disabled={usedPhone || isProcessing}
                            className={`w-20 h-12 md:w-28 md:h-16 rounded-full flex items-center justify-center font-bold border-2 transition-all relative overflow-hidden
                                ${usedPhone ? 'border-slate-800 text-slate-700 bg-slate-900 cursor-not-allowed' : 'border-indigo-400 text-indigo-300 hover:bg-indigo-600 hover:text-white hover:border-white shadow-[0_0_15px_rgba(99,102,241,0.6)] bg-black'}`}
                            title="Phone a Friend"
                        >
                            <Phone size={20} className="md:w-8 md:h-8" />
                            {usedPhone && <div className="absolute inset-0 flex items-center justify-center text-red-600 text-4xl font-black bg-black/80">X</div>}
                        </button>
                        
                        <button 
                            onClick={useAudience} 
                            disabled={usedAudience || isProcessing}
                            className={`w-20 h-12 md:w-28 md:h-16 rounded-full flex items-center justify-center font-bold border-2 transition-all relative overflow-hidden
                                ${usedAudience ? 'border-slate-800 text-slate-700 bg-slate-900 cursor-not-allowed' : 'border-indigo-400 text-indigo-300 hover:bg-indigo-600 hover:text-white hover:border-white shadow-[0_0_15px_rgba(99,102,241,0.6)] bg-black'}`}
                            title="Ask the Audience"
                        >
                            <Users size={20} className="md:w-8 md:h-8" />
                            {usedAudience && <div className="absolute inset-0 flex items-center justify-center text-red-600 text-4xl font-black bg-black/80">X</div>}
                        </button>
                    </div>

                    <div className="flex gap-2 w-auto shrink-0 order-2 md:order-3">
                        <button onClick={() => setIsMuted(!isMuted)} className="text-slate-400 hover:text-white p-2">
                            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                        </button>
                        <button onClick={toggleFullscreen} className="text-slate-400 hover:text-white p-2">
                            {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
                        </button>
                    </div>
                </div>

                {/* MAIN GAME AREA */}
                <div className="flex-1 relative z-10 flex flex-col md:flex-row h-full overflow-hidden">
                    
                    {/* CENTER STAGE */}
                    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
                        
                        {/* QUESTION BOX - Adjusted for no scrolling */}
                        <div className="w-full max-w-6xl bg-black/90 border-2 border-indigo-400 rounded-[2rem] p-6 md:p-10 mb-4 md:mb-8 text-center relative shadow-[0_0_50px_rgba(79,70,229,0.3)] z-20 flex-shrink-0 flex items-center justify-center min-h-[20vh] overflow-hidden">
                            {/* Decorative side bars */}
                            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 md:w-4 h-24 bg-indigo-500 rounded-r-lg shadow-[0_0_15px_rgba(99,102,241,0.8)]"></div>
                            <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 md:w-4 h-24 bg-indigo-500 rounded-l-lg shadow-[0_0_15px_rgba(99,102,241,0.8)]"></div>
                            
                            <h2 className={`font-bold text-white leading-tight font-display tracking-wide drop-shadow-md ${getQuestionFontSizeClass(currentQuestion?.question || "Loading...")}`}>
                                {currentQuestion?.question || "Loading..."}
                            </h2>
                        </div>

                        {/* OPTIONS GRID */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full max-w-6xl relative z-20 flex-shrink-0">
                            {optionsList.map((opt, idx) => (
                                <button 
                                    key={idx}
                                    disabled={hiddenOptions.includes(idx) || selectedOption !== null || isProcessing}
                                    onClick={() => handleAnswer(idx)}
                                    className={getOptionClass(idx)}
                                >
                                    <span className={`text-yellow-500 mr-4 group-hover:text-white transition-colors font-display ${isFullscreen ? 'text-3xl md:text-5xl' : 'text-xl md:text-3xl'}`}>
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

                        {/* WALK AWAY BUTTON - Preserved layout space to prevent shifting */}
                        {currentLevel > 0 && (
                            <div className={`mt-8 transition-opacity duration-300 ${gameState === 'question' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                <button 
                                    onClick={handleWalkAway}
                                    className="text-slate-400 hover:text-white text-lg font-bold uppercase tracking-widest border-2 border-slate-700 px-8 py-3 rounded-full hover:bg-slate-800 transition-colors bg-black/50 backdrop-blur-md"
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
            </div>

            {/* LIFELINE OVERLAYS (MODALS) */}
            
            {/* Phone A Friend */}
            {(isCalling || phoneHint) && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4">
                    <div className="bg-slate-900 border-4 border-indigo-500 rounded-[3rem] p-12 max-w-4xl w-full text-center shadow-[0_0_50px_rgba(79,70,229,0.5)] relative">
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-8 py-2 rounded-full font-bold text-xl uppercase tracking-widest border-4 border-slate-900">
                            Phone-A-Friend
                        </div>
                        
                        {isCalling ? (
                            <div className="flex flex-col items-center py-10">
                                <Phone size={80} className="text-white mb-8 animate-bounce" />
                                <h3 className="text-6xl font-display font-bold text-white animate-pulse">Dialing...</h3>
                            </div>
                        ) : (
                            <div className="animate-slide-up">
                                <div className="text-left bg-slate-800 p-10 rounded-3xl relative mt-4 border border-slate-700">
                                    <div className="absolute -left-4 -top-4 bg-yellow-500 text-black font-bold px-6 py-2 rounded-lg text-lg transform -rotate-2">FRIEND SAYS:</div>
                                    <p className="text-3xl md:text-5xl font-medium text-white leading-relaxed font-display">
                                        "{phoneHint}"
                                    </p>
                                </div>
                                <button onClick={() => setPhoneHint(null)} className="mt-10 bg-white text-slate-900 px-10 py-4 rounded-full font-bold text-xl hover:bg-slate-200 transition-colors">
                                    Thanks, hang up
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Audience Vote */}
            {(isPolling || audienceStats) && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4">
                    <div className="bg-slate-900 border-4 border-indigo-500 rounded-[3rem] p-8 md:p-12 max-w-5xl w-full text-center shadow-[0_0_50px_rgba(79,70,229,0.5)] relative">
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-8 py-2 rounded-full font-bold text-xl uppercase tracking-widest border-4 border-slate-900">
                            Audience Vote
                        </div>

                        {isPolling ? (
                            <div className="flex flex-col items-center py-20">
                                <Users size={100} className="text-white mb-8 animate-pulse" />
                                <h3 className="text-5xl font-bold text-white mb-4">Polling Audience...</h3>
                                <div className="w-full max-w-md h-4 bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 animate-[width_3s_ease-in-out] w-full"></div>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-slide-up w-full flex flex-col items-center">
                                <div className="flex items-end justify-center gap-6 md:gap-12 w-full h-[50vh] px-4 md:px-12 pb-4">
                                    {audienceStats && audienceStats.map((stat, i) => (
                                        <div key={i} className="flex flex-col items-center h-full justify-end group w-20 md:w-32">
                                            <div className="text-3xl font-black text-white mb-4 opacity-0 animate-[fade-in_0.5s_0.5s_forwards]">{stat}%</div>
                                            <div 
                                                className="w-full bg-gradient-to-t from-blue-900 via-blue-500 to-cyan-400 rounded-t-xl transition-all duration-[1500ms] ease-out shadow-[0_0_20px_rgba(56,189,248,0.5)] border-t-4 border-white/50 relative overflow-hidden"
                                                style={{ height: '0%', animation: `grow-bar-${i} 1s forwards` }}
                                            >
                                                {/* Bar Stripes Effect */}
                                                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_25%,rgba(255,255,255,0.1)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.1)_75%,transparent_100%)] bg-[length:20px_20px] opacity-50"></div>
                                                <style>{`@keyframes grow-bar-${i} { from { height: 0%; } to { height: ${stat}%; } }`}</style>
                                            </div>
                                            <div className="text-4xl md:text-6xl font-black mt-6 text-yellow-400 font-display border-t-2 border-slate-700 w-full pt-2">{['A','B','C','D'][i]}</div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => setAudienceStats(null)} className="mx-auto mt-8 bg-white text-slate-900 px-12 py-4 rounded-full font-bold text-xl hover:bg-slate-200 transition-colors shadow-lg">
                                    Close Results
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};
