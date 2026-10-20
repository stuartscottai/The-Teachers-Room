import React from 'react';
import { QuestionCardMotion } from './QuestionCardMotion';
import { motion, useReducedMotion } from 'framer-motion';
import { Clock, RotateCcw, CheckCircle, XCircle, X, Check } from 'lucide-react';
import { GeneratedQuestion, GameRunOptions } from '../../../types';
import { translateInterfaceText as ui, displayTeamName } from '../../../utils/interfaceLanguage';
import { QuestionCardZoomButton } from '../QuestionCardZoomButton';
import './question-feedback.css';
import { useWrittenAnswer, WrittenAnswerInput, WrittenAnswerReview, WrittenAnswerContinue } from './WrittenAnswer';

export interface SharedQuestionFlipCardProps {
  questionOverlayTopClass: string;
  isFlipped: boolean;
  isBonus: boolean;
  writtenAnswer: ReturnType<typeof useWrittenAnswer>;
  setIsFlipped: React.Dispatch<React.SetStateAction<boolean>>;
  activeQuestionIndex: number;
  activeQ: GeneratedQuestion;
  teamNames: string[];
  currentTeam: number;
  hasOptions: boolean;
  questionImageUrl: string;
  isMobileViewport: boolean;
  questionImageAlt: string;
  setResizeTick: React.Dispatch<React.SetStateAction<number>>;
  openImageZoom: (event?: React.SyntheticEvent) => void;
  handleImageKeyDown: (event: React.KeyboardEvent) => void;
  questionWrapRef: React.RefObject<HTMLDivElement>;
  questionTextRef: React.RefObject<HTMLDivElement>;
  questionFontSize: number;
  getQuestionFontSizeClass: (text: string) => string;
  optionGridRef: React.RefObject<HTMLDivElement>;
  stripOptionPrefix: (value: string) => string;
  optionFontSize: number;
  getOptionFontSizeClass: (text: string) => string;
  handleMcSelect: (selectedOption: string) => void;
  optionMeasureRef: React.RefObject<HTMLDivElement>;
  options: GameRunOptions;
  isTimesUp: boolean;
  timerProgress: number;
  timeLeft: number;
  isPositiveBonus: boolean;
  isNegativeBonus: boolean;
  getBonusEffectSizeClass: (text: string) => string;
  bonusEffectText: string;
  getBonusDetailSizeClass: (text: string) => string;
  bonusDetailText: string;
  handleBonusAction: () => void;
  answerWrapRef: React.RefObject<HTMLDivElement>;
  mcResult: 'correct' | 'incorrect' | null;
  answerTextRef: React.RefObject<HTMLDivElement>;
  answerFontSize: number;
  getAnswerFontSizeClass: (text: string) => string;
  isProcessing: boolean;
  handleAnswer: (correct: boolean) => void;
  rewardLabel?: React.ReactNode;
  autoAdvance?: boolean;
  playfulMotion?: boolean;
  springFlip?: boolean;
  exiting?: boolean;
  onExitComplete?: () => void;
}

/** The existing Trivia flip card, shared without changing its layout or answer controls. */
export function SharedQuestionFlipCard({
  questionOverlayTopClass,
  isFlipped,
  isBonus,
  writtenAnswer,
  setIsFlipped,
  activeQuestionIndex,
  activeQ,
  teamNames,
  currentTeam,
  hasOptions,
  questionImageUrl,
  isMobileViewport,
  questionImageAlt,
  setResizeTick,
  openImageZoom,
  handleImageKeyDown,
  questionWrapRef,
  questionTextRef,
  questionFontSize,
  getQuestionFontSizeClass,
  optionGridRef,
  stripOptionPrefix,
  optionFontSize,
  getOptionFontSizeClass,
  handleMcSelect,
  optionMeasureRef,
  options,
  isTimesUp,
  timerProgress,
  timeLeft,
  isPositiveBonus,
  isNegativeBonus,
  getBonusEffectSizeClass,
  bonusEffectText,
  getBonusDetailSizeClass,
  bonusDetailText,
  handleBonusAction,
  answerWrapRef,
  mcResult,
  answerTextRef,
  answerFontSize,
  getAnswerFontSizeClass,
  isProcessing,
  handleAnswer,
  rewardLabel,
  autoAdvance=false,
  playfulMotion=false,
  springFlip=playfulMotion,
  exiting=false,
  onExitComplete
}: SharedQuestionFlipCardProps) {
  const reduced=useReducedMotion();
  return (<div data-playful-motion={playfulMotion || undefined} data-card-exiting={exiting || undefined} role="dialog" aria-modal="true" aria-label={ui("Question")} data-shared-question-card data-written-question-overlay data-question-below-scoreboard className={`fixed inset-x-0 bottom-0 ${questionOverlayTopClass} z-[500] flex items-center justify-center bg-slate-900/50 backdrop-blur-md p-3 sm:p-4 ${playfulMotion?'':'animate-fade-in'} overflow-hidden`}>
                    <QuestionCardMotion enabled={playfulMotion} exiting={exiting} onExitComplete={onExitComplete}
                      className="w-full max-w-[420px] h-full max-h-full sm:max-w-[560px] sm:h-full sm:max-h-[90vh] md:max-w-6xl md:h-auto md:max-h-full md:aspect-[16/9] [perspective:1000px]">
                        <QuestionCardZoomButton />
                        <motion.div
                            data-question-flip={springFlip || undefined}
                            animate={springFlip?{rotateY:isFlipped?180:0}:undefined}
                            transition={reduced?{duration:.1}:exiting?{type:'spring',stiffness:85,damping:17,mass:1.15}:{type:'spring',stiffness:130,damping:15,mass:.8}}
                            className={`relative w-full h-full ${springFlip?'':'transition-all duration-700'} [transform-style:preserve-3d]
                            ${!springFlip && isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
                        >
                            {/* FRONT (QUESTION) */}
                            <div data-question-face="front" className={`absolute inset-0 [backface-visibility:hidden] [transform:translateZ(0)] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full
                                ${isBonus ? 'relative bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-700 border-4 border-yellow-300/80 bonus-glow bonus-pulse' : 'bg-white'} ${isFlipped ? 'pointer-events-none' : ''} ${writtenAnswer.writing ? 'written-answer-card' : ''}`}>

                                {isBonus ? (
                                    <div
                                        className="relative p-4 sm:p-8 md:p-12 text-center flex flex-col items-center justify-center h-full cursor-pointer"
                                        onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
                                        title={ui("Reveal bonus")}
                                    >
                                        <div className="absolute inset-0 bonus-sparkle bonus-shine opacity-60 pointer-events-none"></div>
                                        <div className="bonus-shimmer text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 via-amber-300 to-yellow-200 font-display font-black text-5xl sm:text-7xl md:text-9xl tracking-[0.15em] drop-shadow-[0_8px_20px_rgba(250,204,21,0.6)]">
                                            {ui("BONUS")}</div>
                                    </div>
                                ) : (
                                    <>
                                        {/* HEADER BAR (Blue) */}
                                        <div data-question-section="header" className="bg-brand-blue text-white p-3 md:p-4 flex justify-between items-center h-[clamp(72px,12vh,96px)] sm:h-20 md:h-24 flex-shrink-0 relative z-10">
                                            <div className="font-bold text-sm sm:text-xl opacity-80">{ui("Question {number}", { number: activeQuestionIndex! + 1 })}</div>
                                            <div className="font-black text-2xl sm:text-4xl">{rewardLabel ?? (activeQ.points || 100)}</div>
                                            <div className="font-bold text-sm sm:text-xl opacity-80 text-right max-w-[35%] truncate">{displayTeamName(teamNames[currentTeam])}</div>
                                        </div>

                                        {/* CONTENT BODY (White) */}
                                        <div data-question-section="body" className={`bg-white flex-grow w-full flex flex-col px-0 ${hasOptions ? 'pt-3 sm:pt-4 md:pt-6 pb-0' : 'py-3 sm:py-4 md:py-6'} relative overflow-hidden z-0`}>
                                            {questionImageUrl && hasOptions ? (
                                                <div className="flex flex-col flex-1 min-h-0">
                                                    <div
                                                        className={`flex flex-1 min-h-0 ${isMobileViewport ? 'flex-col' : 'flex-row'} gap-3 px-4 sm:px-6 md:px-8`}
                                                        style={isMobileViewport ? { flex: '2 1 0%' } : undefined}
                                                    >
                                                        <div className={isMobileViewport ? 'w-full h-32 sm:h-36 flex items-center justify-center flex-none' : 'flex-1 min-h-0 flex items-center justify-center'}>
                                                            <img
                                                                src={questionImageUrl}
                                                                alt={questionImageAlt}
                                                                onLoad={() => setResizeTick((prev) => prev + 1)}
                                                                onClick={isMobileViewport ? undefined : openImageZoom}
                                                                onKeyDown={isMobileViewport ? undefined : handleImageKeyDown}
                                                                role={isMobileViewport ? undefined : 'button'}
                                                                tabIndex={isMobileViewport ? -1 : 0}
                                                                title={isMobileViewport ? undefined : ui("Click to zoom")}
                                                                className={`h-full w-full rounded-xl object-contain border border-slate-200/70 bg-white shadow-sm ${isMobileViewport ? '' : 'cursor-zoom-in'}`}
                                                            />
                                                        </div>
                                                        <div
                                                            ref={questionWrapRef}
                                                            className={`flex-1 min-h-0 flex items-center justify-center ${isMobileViewport ? 'text-center' : 'text-left'}`}
                                                        >
                                                            <div
                                                                ref={questionTextRef}
                                                                style={questionFontSize ? { fontSize: `${questionFontSize}px`, lineHeight: '1.15' } : undefined}
                                                                className={`font-display font-bold text-slate-800 leading-tight w-full whitespace-pre-wrap break-normal hyphens-none ${isMobileViewport ? 'text-center' : 'text-left'} ${getQuestionFontSizeClass(activeQ.question)}`}
                                                            >
                                                                {activeQ.question}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {hasOptions && !isFlipped && (
                                                        <div
                                                            className="w-full flex-1 min-h-0 mt-2 sm:mt-4 relative z-10 overflow-hidden"
                                                            style={isMobileViewport ? { flex: '1 1 0%' } : undefined}
                                                        >
                                                            <div ref={optionGridRef} data-mcq-theme="trivia" className="game-mcq-options grid grid-cols-2 w-full h-full auto-rows-fr">
                                                                {(() => {
                                                                    const longestText = activeQ.options!.reduce(
                                                                        (a, b) => (stripOptionPrefix(a).length > stripOptionPrefix(b).length ? a : b),
                                                                        ''
                                                                    );
                                                                    const uniformSize = optionFontSize ? '' : getOptionFontSizeClass(stripOptionPrefix(longestText));
                                                                    return activeQ.options!.map((opt, i) => {
                                                                        const optionLabel = String.fromCharCode(65 + i);
                                                                        const displayOpt = stripOptionPrefix(opt);
                                                                        return (
                                                                            <button
                                                                                key={i}
                                                                                onClick={(e) => { e.stopPropagation(); handleMcSelect(opt); }}
                                                                                style={optionFontSize ? { fontSize: `${optionFontSize}px`, lineHeight: '1.2' } : undefined}
                                                                                className={`relative p-4 sm:p-6 bg-slate-50 border border-slate-200 rounded-none font-bold text-slate-800 sm:hover:bg-brand-yellow sm:hover:border-yellow-400 sm:hover:text-slate-900 transition-all text-center flex items-center justify-center w-full h-full ${uniformSize} cursor-pointer z-50 whitespace-normal break-normal hyphens-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0`}
                                                                            >
                                                                                <span
                                                                                    aria-hidden="true"
                                                                                    data-option-label="true"
                                                                                    className="hidden sm:inline-flex absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 items-center justify-center w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 text-slate-900 text-base sm:text-lg md:text-xl font-black border-2 border-amber-100/80 shadow-[0_8px_16px_rgba(245,158,11,0.35)] ring-2 ring-amber-200/60"
                                                                                >
                                                                                    {optionLabel}
                                                                                </span>
                                                                                <span
                                                                                    data-option-text="true"
                                                                                    className="w-full text-center sm:pl-12 md:pl-16"
                                                                                >
                                                                                    {displayOpt}
                                                                                </span>
                                                                            </button>
                                                                        );
                                                                    });
                                                                })()}
                                                            </div>
                                                            <div
                                                                ref={optionMeasureRef}
                                                                aria-hidden="true"
                                                                className="absolute -left-[9999px] -top-[9999px] invisible"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ) : questionImageUrl ? (
                                                <div className="flex flex-col flex-1 min-h-0 items-center justify-center gap-4 px-4 sm:px-6 md:px-8 text-center">
                                                    <img
                                                        src={questionImageUrl}
                                                        alt={questionImageAlt}
                                                        onLoad={() => setResizeTick((prev) => prev + 1)}
                                                        onClick={isMobileViewport ? undefined : openImageZoom}
                                                        onKeyDown={isMobileViewport ? undefined : handleImageKeyDown}
                                                        role={isMobileViewport ? undefined : 'button'}
                                                        tabIndex={isMobileViewport ? -1 : 0}
                                                        title={isMobileViewport ? undefined : ui("Click to zoom")}
                                                        className={`h-44 sm:h-52 md:h-60 w-full rounded-xl object-contain border border-slate-200/70 bg-white shadow-sm ${isMobileViewport ? '' : 'cursor-zoom-in'}`}
                                                    />
                                                    <div
                                                        ref={questionWrapRef}
                                                        className="w-full flex-1 min-h-0 flex items-center justify-center"
                                                    >
                                                        <div
                                                            ref={questionTextRef}
                                                            style={questionFontSize ? { fontSize: `${questionFontSize}px`, lineHeight: '1.15' } : undefined}
                                                            className={`font-display font-bold text-slate-800 leading-tight text-center w-full whitespace-pre-wrap break-normal hyphens-none ${getQuestionFontSizeClass(activeQ.question)}`}
                                                        >
                                                            {activeQ.question}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col flex-1 min-h-0">
                                                    <div
                                                        ref={questionWrapRef}
                                                        className={`w-full flex-1 min-h-0 flex flex-col items-center overflow-hidden px-4 sm:px-6 md:px-8 ${hasOptions ? 'justify-start mb-1 sm:mb-3' : 'justify-center'}`}
                                                    >
                                                        <div
                                                            ref={questionTextRef}
                                                            style={questionFontSize ? { fontSize: `${questionFontSize}px`, lineHeight: '1.15' } : undefined}
                                                            className={`font-display font-bold text-slate-800 leading-tight text-center w-full whitespace-pre-wrap break-normal hyphens-none ${getQuestionFontSizeClass(activeQ.question)}`}
                                                        >
                                                            {activeQ.question}
                                                        </div>
                                                    </div>

                                                    {hasOptions && !isFlipped && (
                                                        <div className="w-full flex-1 min-h-0 mt-2 sm:mt-4 relative z-10 overflow-hidden">
                                                            <div ref={optionGridRef} data-mcq-theme="trivia" className="game-mcq-options grid grid-cols-2 w-full h-full auto-rows-fr">
                                                                {(() => {
                                                                    const longestText = activeQ.options!.reduce(
                                                                        (a, b) => (stripOptionPrefix(a).length > stripOptionPrefix(b).length ? a : b),
                                                                        ''
                                                                    );
                                                                    const uniformSize = optionFontSize ? '' : getOptionFontSizeClass(stripOptionPrefix(longestText));
                                                                    return activeQ.options!.map((opt, i) => {
                                                                        const optionLabel = String.fromCharCode(65 + i);
                                                                        const displayOpt = stripOptionPrefix(opt);
                                                                        return (
                                                                            <button
                                                                                key={i}
                                                                                onClick={(e) => { e.stopPropagation(); handleMcSelect(opt); }}
                                                                                style={optionFontSize ? { fontSize: `${optionFontSize}px`, lineHeight: '1.2' } : undefined}
                                                                                className={`relative p-4 sm:p-6 bg-slate-50 border border-slate-200 rounded-none font-bold text-slate-800 sm:hover:bg-brand-yellow sm:hover:border-yellow-400 sm:hover:text-slate-900 transition-all text-center flex items-center justify-center w-full h-full ${uniformSize} cursor-pointer z-50 whitespace-normal break-normal hyphens-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0`}
                                                                            >
                                                                                <span
                                                                                    aria-hidden="true"
                                                                                    data-option-label="true"
                                                                                    className="hidden sm:inline-flex absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 items-center justify-center w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 text-slate-900 text-base sm:text-lg md:text-xl font-black border-2 border-amber-100/80 shadow-[0_8px_16px_rgba(245,158,11,0.35)] ring-2 ring-amber-200/60"
                                                                                >
                                                                                    {optionLabel}
                                                                                </span>
                                                                                <span
                                                                                    data-option-text="true"
                                                                                    className="w-full text-center sm:pl-12 md:pl-16"
                                                                                >
                                                                                    {displayOpt}
                                                                                </span>
                                                                            </button>
                                                                        );
                                                                    });
                                                                })()}
                                                            </div>
                                                            <div
                                                                ref={optionMeasureRef}
                                                                aria-hidden="true"
                                                                className="absolute -left-[9999px] -top-[9999px] invisible"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* FOOTER BAR */}
                                        <WrittenAnswerInput state={writtenAnswer} disabled={isFlipped} onReveal={() => { setIsFlipped(true); }} />
                                        <div data-written-footer className={`flex flex-col relative flex-shrink-0 z-50 bg-white ${hasOptions ? 'h-[clamp(38px,6.5vh,46px)] sm:h-[clamp(32px,5.5vh,40px)] px-0 py-0' : 'h-[clamp(76px,12vh,104px)] sm:h-[clamp(88px,14vh,120px)] px-3 sm:px-4 md:px-8 py-1 sm:py-2 md:py-0'}`}>

                                            {options.timerSeconds > 0 && (
                                                <div className={`relative ${hasOptions ? 'h-full' : 'h-[clamp(38px,6.5vh,46px)] sm:h-[clamp(32px,5.5vh,40px)] -mx-3 sm:-mx-4 md:-mx-8'} bg-white overflow-hidden flex items-center justify-start pointer-events-none`}>
                                                    {!isTimesUp && (
                                                        <div
                                                            className="absolute inset-y-0 left-0 bg-brand-blue transition-all duration-1000"
                                                            style={{ width: `${timerProgress * 100}%` }}
                                                        />
                                                    )}
                                                    <div className="absolute inset-0 flex items-center justify-center text-sm sm:text-lg md:text-xl font-black text-slate-900 tracking-wider">
                                                        {isTimesUp ? ui("TIME'S UP!") : (
                                                            <><Clock size={18} className="mr-2" /> {timeLeft}s</>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {!hasOptions && (
                                                <div data-written-reveal className="w-full flex-1 flex items-center justify-center py-2 sm:py-3">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
                                                        data-question-section="check" className="bg-brand-blue text-white px-6 sm:px-12 py-2 rounded-full font-bold text-base sm:text-xl shadow-lg hover:bg-brand-blue/90 hover:scale-105 transition-transform relative z-50 flex items-center cursor-pointer"
                                                    >
                                                        {ui("Check")}</button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* BACK (ANSWER) */}
                            <div data-question-face="back" className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full
                                ${isBonus ? (isPositiveBonus ? 'bg-gradient-to-br from-yellow-100 via-amber-200 to-yellow-300 border-4 border-yellow-300/80 bonus-glow bonus-shimmer' : 'bg-gradient-to-br from-red-200 via-rose-200 to-red-300 border-4 border-red-300') : 'bg-slate-50'} ${!isFlipped ? 'pointer-events-none' : ''}`}>

                                {isBonus ? (
                                    <div className="flex-grow flex flex-col items-center justify-center p-4 sm:p-8 md:p-12 text-center overflow-hidden">
                                        <div className="w-full flex flex-col items-center justify-center gap-6">
                                            <div className={`font-display font-black leading-tight break-words ${isNegativeBonus ? 'text-red-900' : 'text-slate-800'} ${getBonusEffectSizeClass(bonusEffectText)}`}>
                                                {bonusEffectText}
                                            </div>
                                            <div className={`font-semibold leading-tight break-words max-w-5xl ${isNegativeBonus ? 'text-red-800' : 'text-slate-700'} ${getBonusDetailSizeClass(bonusDetailText)}`}>
                                                {bonusDetailText}
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleBonusAction(); }}
                                            className={`mt-6 px-6 sm:px-10 py-3 sm:py-4 ${isNegativeBonus ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded-xl font-bold text-base sm:text-xl transition-colors shadow-lg cursor-pointer relative z-50`}
                                        >
                                            {ui("Apply Effect")}</button>
                                    </div>
                                ) : (
                                    <>
                                        {/* HEADER (Gray) */}
                                        <div data-question-section="header" className="bg-slate-200 text-slate-600 p-3 md:p-4 flex justify-between items-center h-[clamp(72px,12vh,96px)] sm:h-20 md:h-24 flex-shrink-0 relative z-10">
                                            <div className="font-bold text-base sm:text-xl opacity-80">{ui("Answer")}</div>

                                            {/* ALWAYS SHOW FLIP BACK BUTTON */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
                                                className="p-2 bg-white rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer relative z-50"
                                                title={ui("Flip back to question")}
                                            >
                                                <RotateCcw size={18} className="sm:w-5 sm:h-5" />
                                            </button>
                                        </div>

                                        {/* CONTENT (White) */}
                                        <div data-question-section="body" className="written-answer-result-body flex-grow flex flex-col items-center justify-center p-4 sm:p-6 md:p-12 bg-white text-center overflow-hidden w-full relative z-0">
                                            <div ref={answerWrapRef} className="written-answer-result-content flex-1 overflow-hidden flex flex-col items-center justify-center w-full min-h-0">
                                                <WrittenAnswerReview state={writtenAnswer} />
                                                {/* Multiple Choice Result UI */}
                                                {hasOptions && mcResult ? (
                                                    <div className="question-choice-feedback" data-testid="question-result-feedback">
                                                        {mcResult === 'correct' ? (
                                                            <div className="flex flex-col items-center">
                                                                <CheckCircle data-testid="question-result-icon" size={56} className="text-green-500" />
                                                                <h2 className="text-3xl sm:text-6xl font-black text-green-500 uppercase tracking-widest">{ui("Correct!")}</h2>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center">
                                                                <XCircle data-testid="question-result-icon" size={56} className="text-red-500" />
                                                                <h2 className="text-3xl sm:text-6xl font-black text-red-500 uppercase tracking-widest">{ui("Incorrect")}</h2>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : null}

                                                <div
                                                    ref={answerTextRef}
                                                    style={answerFontSize ? { fontSize: `${answerFontSize}px`, lineHeight: '1.15' } : undefined}
                                                    className={`font-display font-bold text-slate-800 leading-tight whitespace-pre-wrap break-words ${getAnswerFontSizeClass(activeQ.answer)}`}
                                                >
                                                    {activeQ.answer}
                                                </div>
                                            </div>
                                        </div>

                                        {/* FOOTER (Buttons) */}
                                        <div className={autoAdvance && (writtenAnswer.writing || hasOptions) ? 'hidden' : 'h-[clamp(88px,14vh,120px)] flex flex-shrink-0 relative z-50'}>
                                            {autoAdvance && (writtenAnswer.writing || hasOptions) ? null : writtenAnswer.writing ? (<WrittenAnswerContinue key={writtenAnswer.key} state={writtenAnswer} disabled={isProcessing} onContinue={() => handleAnswer(writtenAnswer.matches)} />) : hasOptions ? (
                                                // Multiple Choice Footer
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleAnswer(mcResult === 'correct'); }}
                                                    className={`flex-1 text-white font-black text-2xl sm:text-4xl transition-colors flex items-center justify-center border-t-4 active:border-t-0 cursor-pointer relative z-50
                                                        ${mcResult === 'correct'
                                                            ? 'bg-green-500 hover:bg-green-600 border-green-700'
                                                            : 'bg-red-500 hover:bg-red-600 border-red-700'}`}
                                                >
                                                    {ui("Continue")}</button>
                                            ) : (
                                                // Standard Footer
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleAnswer(false); }}
                                                        className="flex-1 bg-red-500 text-white font-bold text-lg sm:text-2xl hover:bg-red-600 transition-colors flex items-center justify-center border-t-4 border-red-700 active:border-t-0 cursor-pointer relative z-50"
                                                    >
                                                        <X size={24} className="mr-2 sm:w-8 sm:h-8 sm:mr-3" /> {ui(" Oops")}</button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleAnswer(true); }}
                                                        className="flex-1 bg-green-500 text-white font-bold text-lg sm:text-2xl hover:bg-green-600 transition-colors flex items-center justify-center border-t-4 border-green-700 active:border-t-0 cursor-pointer relative z-50"
                                                    >
                                                        <Check size={24} className="mr-2 sm:w-8 sm:h-8 sm:mr-3" /> {ui(" OK")}</button>
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </QuestionCardMotion>
                </div>);
}
