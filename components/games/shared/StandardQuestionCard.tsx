import { createPortal } from 'react-dom';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GameConfig, GameRunOptions, GeneratedQuestion } from '../../../types';
import { translateInterfaceText as ui } from '../../../utils/interfaceLanguage';
import { resolveGameQuestionImageUrl } from '../../../utils/gameImage';
import { useWrittenAnswer } from './WrittenAnswer';
import { PlinkoFaceIcon } from '../PlinkoIcons';
import type { PlinkoSound } from '../../../utils/plinkoAudio';
import { SharedQuestionFlipCard } from './SharedQuestionFlipCard';
import { useQuestionCardSounds } from './useQuestionCardSounds';

/** Plinkemoji's question turn uses the same flip-card renderer as Trivia. */
export function StandardQuestionCard({ question, config, options, turn, teamName, chipFace=0, paused=false, onSound, onAnswer }: {
  question: GeneratedQuestion; config: GameConfig; options: GameRunOptions; turn: number;
  teamName: string; chipFace?:number; paused?:boolean; onSound?:(cue:PlinkoSound)=>void; onAnswer: (correct: boolean) => void;
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [mcResult, setMcResult] = useState<'correct' | 'incorrect' | null>(null);
  const [timeLeft, setTimeLeft] = useState(options.timerSeconds);
  const [isImageZoomOpen, setIsImageZoomOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [resizeTick, setResizeTick] = useState(0);
  const [questionFontSize, setQuestionFontSize] = useState<number | null>(null);
  const [answerFontSize, setAnswerFontSize] = useState<number | null>(null);
  const [optionFontSize, setOptionFontSize] = useState<number | null>(null);
  const questionWrapRef = useRef<HTMLDivElement>(null);
  const questionTextRef = useRef<HTMLDivElement>(null);
  const answerWrapRef = useRef<HTMLDivElement>(null);
  const answerTextRef = useRef<HTMLDivElement>(null);
  const optionGridRef = useRef<HTMLDivElement>(null);
  const optionMeasureRef = useRef<HTMLDivElement>(null);
  const committed = useRef(false);
  const resolvedAnswer=useRef(false);
  const [exiting,setExiting]=useState(false);
  const soundRef=useRef(onSound);soundRef.current=onSound;
  const isTimesUp = options.timerSeconds > 0 && timeLeft === 0;
  const writtenAnswer = useWrittenAnswer(question, config, options, turn);
  const activeQ = { ...question, options: question.options || [] };
  const hasOptions = Boolean(question.options?.length);
  const optionKey = question.options?.join('|') || '';
  const activeQuestionIndex = turn;
  const isBonus = false;
  const currentTeam = 0;
  const teamNames = [teamName];
  const questionImageUrl = resolveGameQuestionImageUrl(question.image);
  const questionImageAlt = question.image?.alt || '';
  const timerProgress = options.timerSeconds > 0 ? timeLeft / options.timerSeconds : 0;
  const questionOverlayTopClass = 'top-[210px]';
  const isPositiveBonus = false, isNegativeBonus = false, isProcessing = exiting;
  const bonusEffectText = '', bonusDetailText = '';
  const handleBonusAction = () => {};
  const openImageZoom = (event?: React.SyntheticEvent) => { event?.stopPropagation(); setIsImageZoomOpen(true); };
  const handleImageKeyDown = (event: React.KeyboardEvent) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openImageZoom(event); } };
  const handleMcSelect = (selected: string) => {
    const clean = (text: string) => text.replace(/^[A-D][).]\s*/i, '').trim().toLocaleLowerCase();
    setMcResult(clean(selected) === clean(question.answer) ? 'correct' : 'incorrect');
    setIsFlipped(true);
  };
  const handleAnswer = (correct: boolean) => {
    if (committed.current) return;
    if (!hasOptions && !writtenAnswer.writing) soundRef.current?.(correct ? 'correct' : 'wrong');
    committed.current = true;
    resolvedAnswer.current=correct;
    setExiting(true);
  };
  useQuestionCardSounds({questionKey:turn,isFlipped,exiting,writing:writtenAnswer.writing,matches:writtenAnswer.matches,hasOptions,mcResult,onSound});
  useEffect(() => {
    const media = window.matchMedia('(max-width: 639px)');
    const resize = () => { setIsMobileViewport(media.matches); setResizeTick(t => t + 1); };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  useEffect(() => {
    if (paused || isFlipped || isTimesUp || options.timerSeconds <= 0) return;
    const timer = window.setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(timer);
  }, [paused, isFlipped, isTimesUp, options.timerSeconds]);
    // Helper for dynamic font size to avoid scrollbars on cards
    const getQuestionFontSizeClass = (text: string) => {
        const len = text ? text.length : 0;
        if (len < 30) return 'text-6xl md:text-7xl';
        if (len < 60) return 'text-5xl md:text-6xl';
        if (len < 110) return 'text-4xl md:text-5xl';
        if (len < 180) return 'text-3xl md:text-4xl';
        if (len < 260) return 'text-2xl md:text-3xl';
        if (len < 360) return 'text-xl md:text-2xl';
        return 'text-lg md:text-xl';
    };

    const getAnswerFontSizeClass = (text: string) => {
        const len = text ? text.length : 0;
        if (len < 30) return 'text-6xl md:text-7xl';
        if (len < 70) return 'text-5xl md:text-6xl';
        if (len < 130) return 'text-4xl md:text-5xl';
        if (len < 200) return 'text-3xl md:text-4xl';
        if (len < 300) return 'text-2xl md:text-3xl';
        if (len < 420) return 'text-xl md:text-2xl';
        return 'text-lg md:text-xl';
    };

    const getBonusEffectSizeClass = (text: string) => {
        const len = text ? text.length : 0;
        if (len < 14) return 'text-7xl md:text-8xl';
        if (len < 22) return 'text-6xl md:text-7xl';
        return 'text-5xl md:text-6xl';
    };

    const getBonusDetailSizeClass = (text: string) => {
        const len = text ? text.length : 0;
        if (len < 60) return 'text-3xl md:text-4xl';
        if (len < 120) return 'text-2xl md:text-3xl';
        return 'text-xl md:text-2xl';
    };

    // Helper for option font size - Conservative to prevent overflow
    const getOptionFontSizeClass = (text: string) => {
        const len = text ? text.length : 0;
        if (len < 20) return 'text-3xl md:text-5xl';
        if (len < 35) return 'text-2xl md:text-4xl';
        if (len < 60) return 'text-xl md:text-3xl';
        return 'text-lg md:text-2xl';
    };

    const stripOptionPrefix = (value: string) => value.replace(/^[A-D]\)\s*/i, '').trim();

    useLayoutEffect(() => {
        if (!activeQ || isBonus || isFlipped) {
            setQuestionFontSize(null);
            return;
        }
        const wrap = questionWrapRef.current;
        const textEl = questionTextRef.current;
        if (!wrap || !textEl) return;
        const availableHeight = wrap.clientHeight;
        const availableWidth = textEl.clientWidth;
        if (availableHeight === 0 || availableWidth === 0) return;
        const maxSize = Math.min(hasOptions ? 48 : 72, Math.max(22, Math.floor(window.innerWidth / (hasOptions ? 9 : 7))));
        const minSize = 12;
        let size = maxSize;
        textEl.style.lineHeight = '1.15';
        textEl.style.fontSize = `${size}px`;
        while ((textEl.scrollHeight > availableHeight || textEl.scrollWidth > availableWidth) && size > minSize) {
            size -= 1;
            textEl.style.fontSize = `${size}px`;
        }
        setQuestionFontSize(size);
    }, [isMobileViewport, hasOptions, activeQ?.question, activeQ?.options?.length, isBonus, isFlipped, resizeTick, writtenAnswer.writing, writtenAnswer.layoutTick]);

    useLayoutEffect(() => {
        if (!activeQ || isBonus || !isFlipped) {
            setAnswerFontSize(null);
            return;
        }
        const wrap = answerWrapRef.current;
        const textEl = answerTextRef.current;
        if (!wrap || !textEl) return;
        const feedback = wrap.querySelector<HTMLElement>('.question-choice-feedback, .written-answer-review');
        const feedbackHeight = feedback ? feedback.offsetHeight + parseFloat(getComputedStyle(feedback).marginBottom || '0') : 0;
        const availableHeight = Math.max(0, wrap.clientHeight - feedbackHeight);

        if (availableHeight === 0) return;
        const maxSize = isMobileViewport ? Math.min(44, Math.max(22, Math.floor(window.innerWidth / 9.2))) : 72;
        const minSize = 12;
        let size = maxSize;
        textEl.style.lineHeight = '1.15';
        textEl.style.fontSize = `${size}px`;
        while ((textEl.scrollHeight > availableHeight || textEl.scrollWidth > wrap.clientWidth) && size > minSize) {
            size -= 1;
            textEl.style.fontSize = `${size}px`;
        }
        setAnswerFontSize(size);
    }, [isMobileViewport, activeQ?.answer, isBonus, isFlipped, mcResult, resizeTick, writtenAnswer.writing, writtenAnswer.layoutTick]);

    useLayoutEffect(() => {
        if (!hasOptions || !activeQ?.options || isBonus || isFlipped) {
            setOptionFontSize(null);
            return;
        }
        const gridEl = optionGridRef.current;
        const measureEl = optionMeasureRef.current;
        if (!gridEl || !measureEl) return;
        const sampleCell = gridEl.firstElementChild as HTMLElement | null;
        if (!sampleCell) return;

        const rect = sampleCell.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const styles = window.getComputedStyle(sampleCell);
        const paddingX = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
        const paddingY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
        const innerWidth = Math.max(0, rect.width - paddingX);
        const innerHeight = Math.max(0, rect.height - paddingY);
        if (innerWidth === 0 || innerHeight === 0) return;

        const textEl = sampleCell.querySelector('[data-option-text="true"]') as HTMLElement | null;
        const textStyles = textEl ? window.getComputedStyle(textEl) : null;

        measureEl.style.width = `${innerWidth}px`;
        measureEl.style.boxSizing = 'border-box';
        measureEl.style.fontFamily = styles.fontFamily;
        measureEl.style.fontWeight = styles.fontWeight;
        measureEl.style.letterSpacing = styles.letterSpacing;
        measureEl.style.whiteSpace = 'normal';
        measureEl.style.wordBreak = 'normal';
        measureEl.style.overflowWrap = 'normal';
        measureEl.style.hyphens = 'none';
        measureEl.style.paddingLeft = textStyles?.paddingLeft || '0px';
        measureEl.style.paddingRight = textStyles?.paddingRight || '0px';

        const lineHeight = 1.2;
        const maxSize = Math.min(48, Math.max(14, Math.floor(innerHeight * 0.85)));
        const minSize = 12;
        let size = maxSize;

        const fitsAll = (fontSize: number) => {
            measureEl.style.fontSize = `${fontSize}px`;
            measureEl.style.lineHeight = `${lineHeight}`;
            return activeQ.options!.every((opt) => {
                measureEl.textContent = stripOptionPrefix(opt);
                return measureEl.scrollHeight <= innerHeight && measureEl.scrollWidth <= innerWidth + 1;
            });
        };

        while (size > minSize && !fitsAll(size)) {
            size -= 1;
        }
        setOptionFontSize(size);
    }, [hasOptions, optionKey, isBonus, isFlipped, isMobileViewport, resizeTick]);


  return <>
    <SharedQuestionFlipCard playfulMotion exiting={exiting} onExitComplete={()=>onAnswer(resolvedAnswer.current)} questionOverlayTopClass={questionOverlayTopClass} isFlipped={isFlipped} isBonus={isBonus} writtenAnswer={writtenAnswer} setIsFlipped={setIsFlipped} activeQuestionIndex={activeQuestionIndex} activeQ={activeQ} teamNames={teamNames} currentTeam={currentTeam} hasOptions={hasOptions} questionImageUrl={questionImageUrl} isMobileViewport={isMobileViewport} questionImageAlt={questionImageAlt} setResizeTick={setResizeTick} openImageZoom={openImageZoom} handleImageKeyDown={handleImageKeyDown} questionWrapRef={questionWrapRef} questionTextRef={questionTextRef} questionFontSize={questionFontSize} getQuestionFontSizeClass={getQuestionFontSizeClass} optionGridRef={optionGridRef} stripOptionPrefix={stripOptionPrefix} optionFontSize={optionFontSize} getOptionFontSizeClass={getOptionFontSizeClass} handleMcSelect={handleMcSelect} optionMeasureRef={optionMeasureRef} options={options} isTimesUp={isTimesUp} timerProgress={timerProgress} timeLeft={timeLeft} isPositiveBonus={isPositiveBonus} isNegativeBonus={isNegativeBonus} getBonusEffectSizeClass={getBonusEffectSizeClass} bonusEffectText={bonusEffectText} getBonusDetailSizeClass={getBonusDetailSizeClass} bonusDetailText={bonusDetailText} handleBonusAction={handleBonusAction} answerWrapRef={answerWrapRef} mcResult={mcResult} answerTextRef={answerTextRef} answerFontSize={answerFontSize} getAnswerFontSizeClass={getAnswerFontSizeClass} isProcessing={isProcessing} handleAnswer={handleAnswer} rewardLabel={<span className="flex items-center gap-2" aria-label={ui('You earned a chip!')}><PlinkoFaceIcon face={chipFace} size={48}/>1</span>} />
    {isImageZoomOpen && questionImageUrl && createPortal(<div role="dialog" aria-modal="true" aria-label={ui('Close image')} className="plinko-image-zoom" onClick={() => setIsImageZoomOpen(false)} onKeyDown={event=>{if(event.key==='Escape')setIsImageZoomOpen(false);}}><button autoFocus className="text-white font-bold px-6 py-3" onClick={() => setIsImageZoomOpen(false)}>{ui('Close image')}</button><img src={questionImageUrl} alt={questionImageAlt} /></div>, document.fullscreenElement ?? document.body)}
  </>;
}
