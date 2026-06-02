
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GameType, GeneratedGame, GeneratedQuestion, GameRunOptions, JeopardyCategory } from '../types';
import { Dice5, Target, Grid, HelpCircle, Sparkles, BookOpen, LogIn, Trash2, Beer, DollarSign, Timer, List, ArrowRight, ArrowLeft, Search, Play, Globe, Filter, SortAsc, SortDesc, ChevronLeft, ChevronRight, HardDrive, Cloud, User, RefreshCw, AlertTriangle, Library, Plus, Copy, Layers, PenTool, Flame, GraduationCap, X, ImageIcon, Shuffle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUnsavedChanges } from '../contexts/UnsavedChangesContext';
import { createSelectedStudentGameShare, deleteSavedGame, gameHasQuestionImages, getCommunityGames, getGameShareUrl, getSavedGames, getSelectedStudentGameShareUrl, getSharedGame, isUUID, prepareGameForLibrarySave, recordGamePlay, saveGameToLibrary } from '../utils/gameUtils';
import { createLiveQuizSession } from '../utils/liveQuizUtils';
import { promptSignupForFree, promptUpgradeForAi } from '../services/accountAccess';
import { convertGameForTemporaryPlay, flattenGameQuestions, getCompatibleGameTypes } from '../utils/gameCompatibility';

import { GameEditor } from '../components/games/GameEditor';
import { GamePreview } from '../components/games/GamePreview';
import { GameConfigurator, ModeSelector } from '../components/games/GameConfigurator';
import { GameSetup } from '../components/games/GameSetup';
import { AiAssistantChat } from '../components/games/AiAssistantChat';
import { LazyGameRunner } from '../components/games/LazyGameRunner';
import { Avatar } from '../components/Avatar';
import { StudentShareModal } from '../components/games/StudentShareModal';
import { LiveQuizSetupModal } from '../components/games/LiveQuizSetupModal';

// Helper to extract stats for display
const getGameStats = (game: GeneratedGame) => {
    const type = game.config.type;
    const stats = [];

    // Counts
    if (type === GameType.JEOPARDY) {
        const cats = game.jeopardyBoard?.length || 0;
        const qs = game.jeopardyBoard?.reduce((acc: number, cat: any) => acc + (cat.questions?.length || 0), 0) || 0;
        stats.push({ label: 'Cats', value: cats, icon: <Grid size={12} /> });
        stats.push({ label: 'Qs', value: qs, icon: <HelpCircle size={12} /> });
    } else if (type === GameType.PUB_QUIZ) {
        const rounds = game.pubQuizRounds?.length || 0;
        const qs = game.pubQuizRounds?.reduce((acc: number, rnd: any) => acc + (rnd.questions?.length || 0), 0) || 0;
        stats.push({ label: 'Rounds', value: rounds, icon: <Layers size={12} /> });
        stats.push({ label: 'Qs', value: qs, icon: <HelpCircle size={12} /> });
    } else if (type === GameType.SURVEY_SHOWDOWN) {
        const rounds = game.questions?.length || 0;
        stats.push({ label: 'Rounds', value: rounds, icon: <List size={12} /> });
    } else if (type === GameType.STOP_THE_FIRE) {
        const cats = game.stopTheFireCategories?.length || game.config.stopTheFireCategories?.length || 0;
        stats.push({ label: 'Cats', value: cats, icon: <List size={12} /> });
    } else if (type === GameType.WORD_WHEEL) {
        const count = game.questions?.length || 0;
        stats.push({ label: 'Letters', value: count, icon: <RefreshCw size={12} /> });
    } else {
        const count = game.questions?.length || 0;
        stats.push({ label: 'Qs', value: count, icon: <HelpCircle size={12} /> });
    }

    // Type Detail
    if (game.config.questionType === 'multiple-choice') {
         stats.push({ label: 'MC', value: '', icon: <List size={12} /> });
    }

    return stats;
};

const gameThumbnailSets: Partial<Record<GameType, string[]>> = {
    [GameType.SNAKES_LADDERS]: [
        "/assets/games/snakes.png",
        "/assets/games/snakes1.png",
        "/assets/games/snakes2.png"
    ],
    [GameType.TRIVIA]: [
        "/assets/games/trivia.png",
        "/assets/games/trivia1..png",
        "/assets/games/trivia2.png"
    ],
    [GameType.JEOPARDY]: [
        "/assets/games/jeopardy.png",
        "/assets/games/jeopardy1.png",
        "/assets/games/jeopardy2.png"
    ],
    [GameType.PUB_QUIZ]: [
        "/assets/games/pubquiz.png",
        "/assets/games/pubquiz1.png",
        "/assets/games/pubquiz2.png"
    ],
    [GameType.DARTS]: [
        "/assets/games/darts.png",
        "/assets/games/darts1.png",
        "/assets/games/darts2.png"
    ],
    [GameType.MILLIONAIRE]: [
        "/assets/games/millionaire.png",
        "/assets/games/millionaire1.png",
        "/assets/games/millionaire2.png"
    ],
    [GameType.TIME_BOMB]: [
        "/assets/games/timebomb.png",
        "/assets/games/timebomb1.png",
        "/assets/games/timebomb2.png"
    ],
    [GameType.SURVEY_SHOWDOWN]: [
        "/assets/games/survey.png",
        "/assets/games/survey1.png"
    ],
    [GameType.STOP_THE_FIRE]: [
        "/assets/games/stopthefire.png",
        "/assets/games/stopthefire1.png",
        "/assets/games/stopthefire2.png"
    ],
    [GameType.WORD_WHEEL]: [
        "/assets/games/wordwheel.png",
        "/assets/games/wordwheel1.png",
        "/assets/games/wordwheel2.png"
    ],
    [GameType.LIVE_QUIZ_CHALLENGE]: [
        "/assets/games/livequiz.png",
        "/assets/games/livequiz1.png",
        "/assets/games/livequiz2.png",
        "/assets/games/livequiz3.png"
    ]
};

const getGameThumbnails = (type: GameType) => gameThumbnailSets[type] ?? [];

const getCompatibilityHint = (type: GameType, questionCount: number) => {
    if (type === GameType.JEOPARDY) return 'Choose categories and question layout next.';
    if (type === GameType.PUB_QUIZ) return 'Choose rounds and question layout next.';
    if (type === GameType.MILLIONAIRE) return 'Uses multiple-choice questions.';
    if (type === GameType.LIVE_QUIZ_CHALLENGE) return 'Uses multiple-choice questions.';
    if (type === GameType.DARTS) return `${questionCount} questions available for setup.`;
    if (type === GameType.TRIVIA) return `${questionCount} questions available.`;
    return `${questionCount} questions available.`;
};

const CompatibleGameChooser: React.FC<{
    sourceGame: GeneratedGame;
    onBack: () => void;
    onSelect: (type: GameType) => void;
}> = ({ sourceGame, onBack, onSelect }) => {
    const compatibleTypes = getCompatibleGameTypes(sourceGame);

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-8">
            <div className="mx-auto max-w-6xl">
                <button
                    type="button"
                    onClick={onBack}
                    className="mb-6 inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm hover:border-sky-200 hover:text-brand-blue"
                >
                    <ArrowLeft size={16} className="mr-2" /> Back to Preview
                </button>

                <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
                    <h1 className="font-display text-3xl font-black text-slate-900 sm:text-4xl">Choose a compatible game</h1>
                    <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                        Pick a game format, then adjust the setup before playing.
                    </p>
                </div>

                {compatibleTypes.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                        <h2 className="text-xl font-bold text-slate-700">No compatible games available</h2>
                        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
                            This question set cannot be converted into another game format yet.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {compatibleTypes.map((type) => {
                            const thumbnails = getGameThumbnails(type);
                            const image = thumbnails[0] || '/assets/games/trivia.png';
                            const questionCount = flattenGameQuestions(sourceGame).length;
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => onSelect(type)}
                                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
                                >
                                    <div className="relative aspect-[3/2] overflow-hidden bg-slate-100">
                                        <img
                                            src={image}
                                            alt={type}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                                        <div className="absolute bottom-4 left-4 right-4">
                                            <h2 className="font-display text-xl font-bold text-white drop-shadow">{type}</h2>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-5">
                                        <span>
                                            <span className="block text-sm font-bold text-slate-700">Set up this game</span>
                                            <span className="mt-1 block text-xs font-semibold text-slate-500">{getCompatibilityHint(type, questionCount)}</span>
                                        </span>
                                        <Play size={17} className="text-brand-blue" fill="currentColor" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

const makeDefaultGroupName = (game: GeneratedGame, index: number, total: number) => {
    const base = (game.config.topic || game.title || 'Questions').trim();
    return total > 1 ? `${base} ${index + 1}` : base;
};

const getInitialGroupNames = (game: GeneratedGame, targetType: GameType, count: number) => {
    const fallback = Array.from({ length: count }, (_, index) => makeDefaultGroupName(game, index, count));
    const existing = Array.from(
        new Set(
            flattenGameQuestions(game)
                .map((question) => String(question.category || '').trim())
                .filter(Boolean)
        )
    );
    const labels = targetType === GameType.JEOPARDY ? 'Category' : 'Round';

    return fallback.map((name, index) => existing[index] || name || `${labels} ${index + 1}`);
};

const CategoryFormatSetup: React.FC<{
    sourceGame: GeneratedGame;
    targetType: GameType.JEOPARDY | GameType.PUB_QUIZ;
    onBack: () => void;
    onStart: (groups: JeopardyCategory[]) => void;
}> = ({ sourceGame, targetType, onBack, onStart }) => {
    const questions = useMemo(() => flattenGameQuestions(sourceGame), [sourceGame]);
    const isJeopardy = targetType === GameType.JEOPARDY;
    const groupLabel = isJeopardy ? 'Category' : 'Round';
    const groupLabelPlural = isJeopardy ? 'Categories' : 'Rounds';
    const defaultGroupCount = Math.max(1, Math.min(isJeopardy ? 5 : 3, Math.floor(questions.length / (isJeopardy ? 4 : 5)) || 1));
    const [groupCount, setGroupCount] = useState(defaultGroupCount);
    const [questionsPerGroup, setQuestionsPerGroup] = useState(Math.max(1, Math.min(isJeopardy ? 5 : 8, Math.floor(questions.length / defaultGroupCount) || 1)));
    const [groupNames, setGroupNames] = useState<string[]>(() => getInitialGroupNames(sourceGame, targetType, defaultGroupCount));
    const [selectedQuestionIndexes, setSelectedQuestionIndexes] = useState<Set<number>>(() =>
        new Set(questions.slice(0, defaultGroupCount * Math.max(1, Math.min(isJeopardy ? 5 : 8, Math.floor(questions.length / defaultGroupCount) || 1))).map((_, index) => index))
    );
    const [assignments, setAssignments] = useState<Record<number, number>>(() =>
        Object.fromEntries(questions.map((_, index) => [index, index % defaultGroupCount]))
    );

    const totalNeeded = groupCount * questionsPerGroup;
    const maxGroupCount = Math.max(1, Math.min(isJeopardy ? 6 : 6, questions.length));
    const maxQuestionsPerGroup = Math.max(1, Math.min(isJeopardy ? 6 : 10, Math.floor(questions.length / groupCount) || 1));
    const buildBalancedAssignments = (questionIndexes: number[]) =>
        Object.fromEntries(
            questionIndexes.map((questionIndex, position) => [
                questionIndex,
                Math.min(groupCount - 1, Math.floor(position / questionsPerGroup)),
            ])
        );

    const applyBalancedSelection = (randomize = false) => {
        const questionIndexes = questions.map((_, index) => index);
        if (randomize) {
            for (let index = questionIndexes.length - 1; index > 0; index -= 1) {
                const swapIndex = Math.floor(Math.random() * (index + 1));
                [questionIndexes[index], questionIndexes[swapIndex]] = [questionIndexes[swapIndex], questionIndexes[index]];
            }
        }

        const selectedIndexes = questionIndexes.slice(0, totalNeeded);
        setSelectedQuestionIndexes(new Set(selectedIndexes));
        setAssignments((current) => ({
            ...current,
            ...buildBalancedAssignments(selectedIndexes),
        }));
    };

    useEffect(() => {
        setGroupNames((current) =>
            Array.from({ length: groupCount }, (_, index) => current[index] || getInitialGroupNames(sourceGame, targetType, groupCount)[index])
        );
        setAssignments((current) => {
            const next: Record<number, number> = {};
            questions.forEach((_, index) => {
                next[index] = Math.min(current[index] ?? index % groupCount, groupCount - 1);
            });
            return next;
        });
    }, [groupCount, questions, sourceGame, targetType]);

    useEffect(() => {
        if (questionsPerGroup <= maxQuestionsPerGroup) return;
        setQuestionsPerGroup(maxQuestionsPerGroup);
    }, [maxQuestionsPerGroup, questionsPerGroup]);

    useEffect(() => {
        applyBalancedSelection(false);
    }, [groupCount, questions, questionsPerGroup, totalNeeded]);

    const groupCounts = Array.from({ length: groupCount }, (_, groupIndex) =>
        Array.from(selectedQuestionIndexes).filter((questionIndex) => assignments[questionIndex] === groupIndex).length
    );
    const selectedCount = selectedQuestionIndexes.size;
    const hasEnoughQuestions = questions.length >= totalNeeded;
    const countsAreReady = selectedCount === totalNeeded && groupCounts.every((count) => count === questionsPerGroup);
    const canStart = hasEnoughQuestions && countsAreReady;

    const toggleQuestion = (questionIndex: number) => {
        const nextGroupIndex = groupCounts.findIndex((count) => count < questionsPerGroup);
        setSelectedQuestionIndexes((current) => {
            const next = new Set(current);
            if (next.has(questionIndex)) {
                next.delete(questionIndex);
                return next;
            }
            if (next.size >= totalNeeded) return next;
            next.add(questionIndex);
            return next;
        });
        if (!selectedQuestionIndexes.has(questionIndex) && nextGroupIndex >= 0) {
            setAssignments((current) => ({ ...current, [questionIndex]: nextGroupIndex }));
        }
    };

    const updateAssignment = (questionIndex: number, groupIndex: number) => {
        setAssignments((current) => ({ ...current, [questionIndex]: groupIndex }));
        setSelectedQuestionIndexes((current) => new Set(current).add(questionIndex));
    };

    const buildGroups = (): JeopardyCategory[] =>
        Array.from({ length: groupCount }, (_, groupIndex) => ({
            name: groupNames[groupIndex]?.trim() || `${groupLabel} ${groupIndex + 1}`,
            questions: questions
                .map((question, questionIndex) => ({ question, questionIndex }))
                .filter(({ questionIndex }) => selectedQuestionIndexes.has(questionIndex) && assignments[questionIndex] === groupIndex)
                .slice(0, questionsPerGroup)
                .map(({ question }, questionIndex) => ({
                    ...question,
                    id: questionIndex,
                    category: groupNames[groupIndex]?.trim() || `${groupLabel} ${groupIndex + 1}`,
                    points: isJeopardy ? (questionIndex + 1) * 100 : question.points || 1,
                    isBonus: false,
                })),
        }));

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-8">
            <div className="mx-auto max-w-6xl">
                <button
                    type="button"
                    onClick={onBack}
                    className="mb-6 inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm hover:border-sky-200 hover:text-brand-blue"
                >
                    <ArrowLeft size={16} className="mr-2" /> Back to Games
                </button>

                <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                    <p className="mb-2 text-sm font-black uppercase tracking-wide text-brand-blue">{targetType}</p>
                    <h1 className="font-display text-3xl font-black text-slate-900 sm:text-4xl">Set up {groupLabelPlural.toLowerCase()}</h1>
                    <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                        Choose the layout, name each {groupLabel.toLowerCase()}, then assign exactly {questionsPerGroup} question{questionsPerGroup === 1 ? '' : 's'} to each one.
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                    <div className="space-y-5">
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="mb-4 font-display text-xl font-black text-slate-900">Layout</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">{groupLabelPlural}</label>
                                    <select
                                        value={groupCount}
                                        onChange={(event) => setGroupCount(Number(event.target.value))}
                                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-blue"
                                    >
                                        {Array.from({ length: maxGroupCount }, (_, index) => index + 1).map((count) => (
                                            <option key={count} value={count}>{count}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Questions per {groupLabel.toLowerCase()}</label>
                                    <select
                                        value={questionsPerGroup}
                                        onChange={(event) => setQuestionsPerGroup(Number(event.target.value))}
                                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-blue"
                                    >
                                        {Array.from({ length: maxQuestionsPerGroup }, (_, index) => index + 1).map((count) => (
                                            <option key={count} value={count}>{count}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-600">
                                    Need {totalNeeded} questions. {selectedCount} selected.
                                </div>
                                {!hasEnoughQuestions && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-600">
                                        Not enough selected questions for this layout. Go back to Preview and select more questions.
                                    </div>
                                )}
                                {hasEnoughQuestions && !countsAreReady && (
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-700">
                                        Each {groupLabel.toLowerCase()} needs exactly {questionsPerGroup} question{questionsPerGroup === 1 ? '' : 's'}.
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="mb-4 font-display text-xl font-black text-slate-900">{groupLabel} names</h2>
                            <div className="space-y-3">
                                {Array.from({ length: groupCount }, (_, groupIndex) => (
                                    <div key={groupIndex}>
                                        <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
                                            {groupLabel} {groupIndex + 1} ({groupCounts[groupIndex]}/{questionsPerGroup})
                                        </label>
                                        <input
                                            type="text"
                                            value={groupNames[groupIndex] || ''}
                                            onChange={(event) => {
                                                const next = [...groupNames];
                                                next[groupIndex] = event.target.value;
                                                setGroupNames(next);
                                            }}
                                            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-blue"
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <h2 className="font-display text-xl font-black text-slate-900">Questions</h2>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => applyBalancedSelection(true)}
                                    disabled={!hasEnoughQuestions}
                                    className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm hover:border-brand-blue hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Shuffle size={16} className="mr-2" /> Random fill
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onStart(buildGroups())}
                                    disabled={!canStart}
                                    className="inline-flex items-center rounded-xl bg-brand-blue px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Play size={16} className="mr-2" fill="currentColor" /> Continue
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
                            {questions.map((question: GeneratedQuestion, questionIndex) => {
                                const isSelected = selectedQuestionIndexes.has(questionIndex);
                                const selectedLimitReached = !isSelected && selectedCount >= totalNeeded;
                                return (
                                    <div
                                        key={questionIndex}
                                        className={`rounded-xl border p-3 transition-colors ${
                                            isSelected ? 'border-sky-200 bg-sky-50' : 'border-slate-200 bg-white'
                                        }`}
                                    >
                                        <div className="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)_220px] md:items-start">
                                            <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    disabled={selectedLimitReached}
                                                    onChange={() => toggleQuestion(questionIndex)}
                                                    className="h-4 w-4 rounded border-slate-300 text-brand-blue"
                                                />
                                                {questionIndex + 1}
                                            </label>
                                            <div className="min-w-0">
                                                <p className="break-words text-sm font-semibold leading-6 text-slate-700">
                                                    {question.question || 'Untitled question'}
                                                </p>
                                                <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-400">
                                                    Answer: {question.answer || 'No answer saved'}
                                                </p>
                                            </div>
                                            <select
                                                value={assignments[questionIndex] ?? 0}
                                                onChange={(event) => updateAssignment(questionIndex, Number(event.target.value))}
                                                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-blue disabled:opacity-50"
                                            >
                                                {Array.from({ length: groupCount }, (_, groupIndex) => (
                                                    <option key={groupIndex} value={groupIndex}>
                                                        {groupNames[groupIndex] || `${groupLabel} ${groupIndex + 1}`}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

// Robust Card Component handles Image Errors Gracefully
const GameCard: React.FC<{ 
    game: { type: GameType, icon: React.ReactNode, desc: string, image: string, previewImages?: string[], color: string },
    onSelect: (type: GameType) => void 
}> = ({ game, onSelect }) => {
    const [hasError, setHasError] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [visibleFrameIndex, setVisibleFrameIndex] = useState(0);
    const previewImages = game.previewImages ?? [];
    const previewCount = previewImages.length;
    const frames = [
        { src: game.image, isPreview: false },
        ...previewImages.map(src => ({ src, isPreview: true }))
    ];

    useEffect(() => {
        if (!isPreviewing || previewCount === 0) {
            setVisibleFrameIndex(0);
            return;
        }

        setVisibleFrameIndex(1);

        const intervalId = window.setInterval(() => {
            setVisibleFrameIndex(prev => {
                if (prev <= 0 || prev >= previewCount) return 1;
                return prev + 1;
            });
        }, 2000);

        return () => window.clearInterval(intervalId);
    }, [isPreviewing, previewCount]);

    useEffect(() => {
        setHasError(false);
        setVisibleFrameIndex(0);
    }, [game.image]);

    const getImageClassName = (frameIsPreview: boolean, isVisible: boolean) =>
        `${frameIsPreview ? 'absolute top-0 left-1/2 h-full w-auto max-w-none -translate-x-1/2' : 'absolute inset-0 w-full h-full object-cover group-hover:scale-110'} transition-[opacity,transform] duration-[1200ms] ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`;

    return (
        <button 
            onClick={() => onSelect(game.type)}
            onMouseEnter={() => setIsPreviewing(true)}
            onMouseLeave={() => setIsPreviewing(false)}
            onFocus={() => setIsPreviewing(true)}
            onBlur={() => setIsPreviewing(false)}
            className="group relative flex flex-col text-left bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-200 transition-all duration-300 overflow-hidden h-full hover:-translate-y-1"
        >
            {/* Image Container */}
            <div className={`aspect-[3/2] w-full relative overflow-hidden ${hasError ? game.color : 'bg-transparent'}`}>
                {!hasError && frames.map((frame, index) => (
                    <img
                        key={`${game.type}-${frame.src}`}
                        crossOrigin="anonymous"
                        src={frame.src}
                        alt={game.type}
                        className={getImageClassName(frame.isPreview, index === visibleFrameIndex)}
                        onError={() => {
                            if (index === 0) {
                                setHasError(true);
                            }
                        }}
                    />
                ))}
                
                {hasError && (
                    // Fallback State - Beautiful Gradient and Icon
                    <div className="w-full h-full flex flex-col items-center justify-center text-white/80 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                        <div className="scale-150 mb-2 transform group-hover:scale-125 transition-transform duration-500">
                            {game.icon}
                        </div>
                    </div>
                )}

                {/* Decoration Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-80 transition-opacity" />
                
                {/* Floating Icon Badge (only show if image loaded to avoid double icon) */}
                {!hasError && (
                    <div className="absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md bg-white/20 border border-white/30 text-white shadow-lg">
                        {game.icon}
                    </div>
                )}
                
                {/* Title Overlay */}
                <div className="absolute bottom-4 left-4 right-4">
                     <h3 className="font-display font-bold text-xl text-white mb-1 drop-shadow-md">{game.type}</h3>
                </div>
            </div>
            
            {/* Content Body */}
            <div className="p-6 flex-grow flex flex-col">
                <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-grow">{game.desc}</p>
                
                <div className="text-brand-blue font-bold text-sm flex items-center group-hover:translate-x-1 transition-transform mt-auto">
                    Create Game <ArrowRight size={16} className="ml-1" />
                </div>
            </div>
        </button>
    );
};

// Icons Helper
const getIcon = (type: string) => {
    switch(type) {
        case GameType.JEOPARDY: return <Grid size={18} />;
        case GameType.TRIVIA: return <HelpCircle size={18} />;
        case GameType.PUB_QUIZ: return <Beer size={18} />;
        case GameType.MILLIONAIRE: return <DollarSign size={18} />;
        case GameType.DARTS: return <Target size={18} />;
        case GameType.TIME_BOMB: return <Timer size={18} />;
        case GameType.SURVEY_SHOWDOWN: return <List size={18} />;
        case GameType.STOP_THE_FIRE: return <Flame size={18} />;
        case GameType.WORD_WHEEL: return <RefreshCw size={18} />;
        case GameType.LIVE_QUIZ_CHALLENGE: return <GraduationCap size={18} />;
        default: return <Dice5 size={18} />;
    }
};

const TourPopup: React.FC<{
    title: string;
    text: string;
    detail?: string;
    onClose: () => void;
    onHeightChange?: (height: number) => void;
}> = ({ title, text, detail, onClose, onHeightChange }) => {
    const popupRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!onHeightChange) return;
        const node = popupRef.current;
        if (!node) return;

        const measure = () => onHeightChange(node.offsetHeight);
        measure();

        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', measure);
            return () => window.removeEventListener('resize', measure);
        }

        const observer = new ResizeObserver(measure);
        observer.observe(node);
        return () => observer.disconnect();
    }, [detail, onHeightChange, text, title]);

    return (
    <div
        ref={popupRef}
        className="fixed z-[180] left-3 right-3 top-[4.5rem] bottom-auto sm:left-auto sm:right-6 sm:top-auto sm:bottom-4 sm:w-[min(94vw,420px)] bg-white border border-slate-200 rounded-2xl shadow-2xl p-3.5 sm:p-4 animate-slide-up"
    >
        <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-700"
            aria-label="Close tour"
        >
            <X size={16} />
        </button>
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-yellow/30 text-slate-800 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide mb-2">
            <span className="inline-flex items-center justify-center bg-brand-yellow rounded-full p-1">
                <GraduationCap size={11} className="text-sky-900" />
            </span>
            Site Tour
        </div>
        <h3 className="font-display text-lg sm:text-xl font-bold text-slate-800 pr-7">{title}</h3>
        <p className="mt-1 text-[13px] sm:text-sm leading-relaxed text-slate-700 break-words">{text}</p>
        {detail && <p className="mt-2 text-[11px] sm:text-xs leading-relaxed text-slate-500 break-words">{detail}</p>}
    </div>
    );
};

// --- PERSONAL LIBRARY COMPONENT ---
const PersonalLibrary: React.FC<{ onLoadGame: (game: GeneratedGame) => void }> = ({ onLoadGame }) => {
    const { user } = useAuth();
    const [games, setGames] = useState<GeneratedGame[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [sourceFilter, setSourceFilter] = useState<'all' | 'ai' | 'manual'>('all');
    const [imageFilter, setImageFilter] = useState<'all' | 'with-images' | 'without-images'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const pageSizeOptions = [10, 20, 30, 40, 50];

    const loadGames = async () => {
        setLoading(true);
        const data = await getSavedGames(user?.id);
        setGames(data);
        setLoading(false);
    };

    useEffect(() => {
        loadGames();
    }, [user]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, typeFilter, sortBy, sourceFilter, imageFilter, itemsPerPage]);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if(window.confirm("Are you sure you want to delete this game?")) {
            await deleteSavedGame(id, user?.id);
            loadGames();
        }
    };

    // Client-side Filtering & Sorting
    const filteredGames = games.filter(g => {
        // Search
        if (search) {
            const term = search.toLowerCase();
            const matchesTitle = g.title.toLowerCase().includes(term);
            const matchesTopic = g.config.topic?.toLowerCase().includes(term);
            if (!matchesTitle && !matchesTopic) return false;
        }

        // Type
        if (typeFilter !== 'all' && g.config.type !== typeFilter) return false;

        // Source
        if (sourceFilter === 'ai' && !g.config.isAI) return false;
        if (sourceFilter === 'manual' && g.config.isAI) return false;

        // Image status
        if (imageFilter === 'with-images' && !gameHasQuestionImages(g)) return false;
        if (imageFilter === 'without-images' && gameHasQuestionImages(g)) return false;

        return true;
    }).sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        if (sortBy === 'oldest') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        if (sortBy === 'az') return a.title.localeCompare(b.title);
        if (sortBy === 'za') return b.title.localeCompare(a.title);
        return 0;
    });

    const totalPages = Math.max(1, Math.ceil(filteredGames.length / itemsPerPage));
    const pageStart = (currentPage - 1) * itemsPerPage;
    const pageEnd = Math.min(pageStart + itemsPerPage, filteredGames.length);
    const pagedGames = filteredGames.slice(pageStart, pageEnd);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-slate-800">My Saved Games</h2>
            </div>

            {/* Control Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6">
                <div className="flex w-full gap-2">
                    <div className="relative min-w-0 flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="text" 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search my games..." 
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none text-sm"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowMobileFilters((value) => !value)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
                    >
                        <Filter size={18} />
                        Filters
                    </button>
                </div>

                <div className={`${showMobileFilters ? 'grid' : 'hidden'} mt-3 grid-cols-1 gap-3 md:mt-4 md:grid-cols-4 xl:grid-cols-5`}>
                <div className="relative min-w-[160px] w-full md:w-auto">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select 
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full pl-10 pr-8 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none appearance-none bg-white text-sm cursor-pointer"
                    >
                        <option value="all">All Types</option>
                        {Object.values(GameType).map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>

                <div className="relative min-w-[160px] w-full md:w-auto">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {sourceFilter === 'ai' ? <Sparkles size={18} /> : <PenTool size={18} />}
                    </div>
                    <select 
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value as 'all' | 'ai' | 'manual')}
                        className="w-full pl-10 pr-8 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none appearance-none bg-white text-sm cursor-pointer"
                    >
                        <option value="all">All Sources</option>
                        <option value="ai">AI Generated</option>
                        <option value="manual">Handcrafted</option>
                    </select>
                </div>

                <div className="relative min-w-[170px] w-full md:w-auto">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select
                        value={imageFilter}
                        onChange={(e) => setImageFilter(e.target.value as 'all' | 'with-images' | 'without-images')}
                        className="w-full pl-10 pr-8 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none appearance-none bg-white text-sm cursor-pointer"
                    >
                        <option value="all">Any Image Status</option>
                        <option value="with-images">With Images</option>
                        <option value="without-images">Without Images</option>
                    </select>
                </div>

                <div className="relative min-w-[160px] w-full md:w-auto">
                    <SortAsc className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full pl-10 pr-8 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none appearance-none bg-white text-sm cursor-pointer"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="az">A-Z (Title)</option>
                        <option value="za">Z-A (Title)</option>
                    </select>
                </div>

                </div>
            </div>

            <div className="mb-4 text-sm text-slate-500 font-bold text-center md:text-left">
                Showing {filteredGames.length === 0 ? 0 : pageStart + 1}-{pageEnd} of {filteredGames.length} game{filteredGames.length !== 1 ? 's' : ''}
            </div>
            {filteredGames.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="text-sm font-bold text-slate-600">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-center py-20">
                    <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500">Loading library...</p>
                </div>
            ) : filteredGames.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 border-dashed">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BookOpen size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">No games found</h3>
                    <p className="text-slate-400 max-w-sm mx-auto mb-6">
                        {games.length === 0 ? "Create your first game to see it here." : "Try changing your filters."}
                    </p>
                </div>
            ) : (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pagedGames.map(game => (
                        <div key={game.id} className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-lg transition-all p-5 flex flex-col group relative cursor-pointer" onClick={() => onLoadGame(game)}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2 max-w-[70%]">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase truncate max-w-full">
                                        {getIcon(game.config.type)} <span className="truncate">{game.config.type}</span>
                                    </div>
                                    {game.config.isAI && (
                                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200" title="AI Generated">
                                            <Sparkles size={10} /> AI
                                        </div>
                                    )}
                                </div>
                                <button 
                                    onClick={(e) => handleDelete(e, game.id!)}
                                    className="text-slate-300 hover:text-red-500 p-2 -mr-2 -mt-2 rounded-full hover:bg-red-50 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            
                            <h3 className="font-display font-bold text-lg text-slate-800 mb-1 line-clamp-1" title={game.title}>{game.title}</h3>
                            <p className="text-sm text-slate-500 mb-2 line-clamp-1">Topic: {game.config.topic || 'General'}</p>
                            
                            {/* STATS BADGES */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                {getGameStats(game).map((stat, i) => (
                                    <div key={i} className="flex items-center text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                                        <span className="mr-1.5 opacity-50">{stat.icon}</span>
                                        <span>{stat.value} {stat.label}</span>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 font-bold">
                                    {new Date(game.createdAt || Date.now()).toLocaleDateString()}
                                </span>
                                <div className="flex items-center gap-2">
                                    {game.config.isPublic ? (
                                        <div className="flex items-center text-green-600 text-[10px] font-bold bg-green-50 px-2 py-1 rounded">
                                            <Globe size={10} className="mr-1" /> Public
                                        </div>
                                    ) : (
                                        <div className="text-slate-300 text-[10px] font-bold uppercase flex items-center">
                                            <div className="w-2 h-2 bg-slate-300 rounded-full mr-1"></div> Private
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {filteredGames.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 py-6">
                    <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-sm font-bold text-slate-600">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight size={18} />
                    </button>
                    <div className="relative min-w-[120px] ml-auto">
                        <List className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            className="w-full pl-9 pr-7 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none appearance-none bg-white text-xs font-bold text-slate-600 cursor-pointer"
                        >
                            {pageSizeOptions.map((size) => (
                                <option key={size} value={size}>{size} per page</option>
                            ))}
                        </select>
                    </div>
                </div>
                )}
                </>
            )}
        </div>
    );
};

// --- COMMUNITY LIBRARY COMPONENT ---
const COMMUNITY_LIBRARY_STATE_KEY = 'ttr-community-library-state-v1';

type CommunityImageFilter = 'all' | 'with-images' | 'without-images';
type CommunitySourceFilter = 'all' | 'ai' | 'manual';
type CommunityScopeFilter = 'all' | 'school';

interface CommunityLibraryState {
    searchInput: string;
    searchQuery: string;
    isSearchAutoFilled: boolean;
    typeFilter: string;
    sortBy: string;
    sourceFilter: CommunitySourceFilter;
    imageFilter: CommunityImageFilter;
    communityScope: CommunityScopeFilter;
    authorFilter: { id: string; name: string } | null;
    currentPage: number;
    itemsPerPage: number;
}

const communityLibraryDefaults: CommunityLibraryState = {
    searchInput: '',
    searchQuery: '',
    isSearchAutoFilled: false,
    typeFilter: 'all',
    sortBy: 'newest',
    sourceFilter: 'all',
    imageFilter: 'all',
    communityScope: 'all',
    authorFilter: null,
    currentPage: 1,
    itemsPerPage: 10
};

const readCommunityLibraryState = (): CommunityLibraryState => {
    if (typeof window === 'undefined') return communityLibraryDefaults;

    try {
        const raw = window.localStorage.getItem(COMMUNITY_LIBRARY_STATE_KEY);
        if (!raw) return communityLibraryDefaults;

        const parsed = JSON.parse(raw) as Partial<CommunityLibraryState>;
        return {
            ...communityLibraryDefaults,
            ...parsed,
            searchInput: typeof parsed.searchInput === 'string' ? parsed.searchInput : '',
            searchQuery: typeof parsed.searchQuery === 'string' ? parsed.searchQuery : '',
            typeFilter: typeof parsed.typeFilter === 'string' ? parsed.typeFilter : 'all',
            sortBy: typeof parsed.sortBy === 'string' ? parsed.sortBy : 'newest',
            sourceFilter: ['all', 'ai', 'manual'].includes(parsed.sourceFilter || '') ? parsed.sourceFilter as CommunitySourceFilter : 'all',
            imageFilter: ['all', 'with-images', 'without-images'].includes(parsed.imageFilter || '') ? parsed.imageFilter as CommunityImageFilter : 'all',
            communityScope: ['all', 'school'].includes(parsed.communityScope || '') ? parsed.communityScope as CommunityScopeFilter : 'all',
            authorFilter: parsed.authorFilter?.id && parsed.authorFilter?.name ? parsed.authorFilter : null,
            currentPage: Number.isFinite(parsed.currentPage) && Number(parsed.currentPage) > 0 ? Number(parsed.currentPage) : 1,
            itemsPerPage: [10, 20, 30, 40, 50].includes(Number(parsed.itemsPerPage)) ? Number(parsed.itemsPerPage) : 10
        };
    } catch {
        return communityLibraryDefaults;
    }
};

const CommunityLibrary: React.FC<{
    onLoadGame: (game: GeneratedGame) => void;
    initialAuthorFilter?: { id?: string; name: string } | null;
    initialSearch?: string;
}> = ({ onLoadGame, initialAuthorFilter, initialSearch }) => {
    const { user } = useAuth();
    const savedState = useRef(readCommunityLibraryState()).current;
    const [games, setGames] = useState<GeneratedGame[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState(savedState.searchInput);
    const [searchQuery, setSearchQuery] = useState(savedState.searchQuery);
    const [isSearchAutoFilled, setIsSearchAutoFilled] = useState(savedState.isSearchAutoFilled);
    const [typeFilter, setTypeFilter] = useState(savedState.typeFilter);
    const [sortBy, setSortBy] = useState(savedState.sortBy);
    const [sourceFilter, setSourceFilter] = useState<CommunitySourceFilter>(savedState.sourceFilter);
    const [imageFilter, setImageFilter] = useState<CommunityImageFilter>(savedState.imageFilter);
    const [communityScope, setCommunityScope] = useState<CommunityScopeFilter>(savedState.communityScope);
    const [authorFilter, setAuthorFilter] = useState<{ id: string; name: string } | null>(savedState.authorFilter);
    const [currentPage, setCurrentPage] = useState(savedState.currentPage);
    const [totalCount, setTotalCount] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [itemsPerPage, setItemsPerPage] = useState(savedState.itemsPerPage);
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const hasMountedForPageReset = useRef(false);
    const pageSizeOptions = [10, 20, 30, 40, 50];
    const schoolCommunityId = user?.accountType === 'school' ? user.schoolAccess?.schoolId : undefined;
    const schoolCommunityName = user?.accountType === 'school' ? user.schoolAccess?.schoolName : '';
    const canFilterBySchool = Boolean(schoolCommunityId);
    
    const fetchGames = async () => {
        setLoading(true);
        setError(null);
        
        // Strictly fetch PUBLIC games from Database
        const { data, count, error: fetchError } = await getCommunityGames(
            currentPage,
            itemsPerPage,
            searchQuery,
            typeFilter,
            sortBy,
            sourceFilter,
            imageFilter,
            authorFilter?.id,
            communityScope === 'school' ? schoolCommunityId : undefined
        );
        
        if (fetchError) {
            setError(fetchError);
            setLoading(false);
            return;
        }

        setGames(data);
        setTotalCount(count);
        setLoading(false);
    };

    useEffect(() => {
        if (!hasMountedForPageReset.current) {
            hasMountedForPageReset.current = true;
            return;
        }
        setCurrentPage(1);
    }, [searchQuery, typeFilter, sortBy, sourceFilter, imageFilter, itemsPerPage, authorFilter, communityScope]);

    useEffect(() => {
        try {
            window.localStorage.setItem(COMMUNITY_LIBRARY_STATE_KEY, JSON.stringify({
                searchInput,
                searchQuery,
                isSearchAutoFilled,
                typeFilter,
                sortBy,
                sourceFilter,
                imageFilter,
                communityScope,
                authorFilter,
                currentPage,
                itemsPerPage
            }));
        } catch {
            // Local storage is a convenience only; the library still works without it.
        }
    }, [searchInput, searchQuery, isSearchAutoFilled, typeFilter, sortBy, sourceFilter, imageFilter, communityScope, authorFilter, currentPage, itemsPerPage]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchGames();
        }, 500); 
        return () => clearTimeout(timer);
    }, [currentPage, searchQuery, typeFilter, sortBy, sourceFilter, imageFilter, itemsPerPage, authorFilter, communityScope, schoolCommunityId]);

    useEffect(() => {
        if (!canFilterBySchool && communityScope === 'school') {
            setCommunityScope('all');
        }
    }, [canFilterBySchool, communityScope]);

    const applyAuthorFilter = (id: string, name: string) => {
        setAuthorFilter({ id, name });
        setSearchInput(name);
        setSearchQuery('');
        setIsSearchAutoFilled(true);
    };

    const clearAuthorFilter = () => {
        setAuthorFilter(null);
        if (isSearchAutoFilled) {
            setSearchInput('');
            setSearchQuery('');
            setIsSearchAutoFilled(false);
        }
    };

    useEffect(() => {
        const seedName = initialAuthorFilter?.name?.trim();
        const seedId = initialAuthorFilter?.id?.trim();
        const seedSearch = (initialSearch || '').trim();

        if (seedId && seedName) {
            setAuthorFilter({ id: seedId, name: seedName });
            setSearchInput(seedName);
            setSearchQuery('');
            setIsSearchAutoFilled(true);
            setCurrentPage(1);
            return;
        }

        if (seedSearch) {
            setAuthorFilter(null);
            setSearchInput(seedSearch);
            setSearchQuery(seedSearch);
            setIsSearchAutoFilled(false);
            setCurrentPage(1);
        }
    }, [initialAuthorFilter?.id, initialAuthorFilter?.name, initialSearch]);

    const totalPages = Math.ceil(totalCount / itemsPerPage);
    const pageStart = (currentPage - 1) * itemsPerPage + 1;
    const pageEnd = Math.min(currentPage * itemsPerPage, totalCount);

    return (
        <div className="animate-fade-in">
            {/* Control Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-8">
                <div className="flex w-full gap-2">
                    <div className="relative min-w-0 flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="text" 
                            value={searchInput}
                            onChange={(e) => {
                                setSearchInput(e.target.value);
                                setSearchQuery(e.target.value);
                                setIsSearchAutoFilled(false);
                            }}
                            placeholder="Search community games..." 
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none text-sm"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowMobileFilters((value) => !value)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
                    >
                        <Filter size={18} />
                        Filters
                    </button>
                </div>

                <div className={`${showMobileFilters ? 'grid' : 'hidden'} mt-3 grid-cols-1 gap-3 md:mt-4 md:grid-cols-3 xl:grid-cols-6`}>
                <div className="relative min-w-[160px] w-full md:w-auto">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select 
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full pl-10 pr-8 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none appearance-none bg-white text-sm cursor-pointer"
                    >
                        <option value="all">All Types</option>
                        {Object.values(GameType).map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>

                <div className="relative min-w-[160px] w-full md:w-auto">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {sourceFilter === 'ai' ? <Sparkles size={18} /> : <PenTool size={18} />}
                    </div>
                    <select 
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value as 'all' | 'ai' | 'manual')}
                        className="w-full pl-10 pr-8 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none appearance-none bg-white text-sm cursor-pointer"
                    >
                        <option value="all">All Sources</option>
                        <option value="ai">AI Generated</option>
                        <option value="manual">Handcrafted</option>
                    </select>
                </div>

                <div className="relative min-w-[170px] w-full md:w-auto">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select
                        value={imageFilter}
                        onChange={(e) => setImageFilter(e.target.value as 'all' | 'with-images' | 'without-images')}
                        className="w-full pl-10 pr-8 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none appearance-none bg-white text-sm cursor-pointer"
                    >
                        <option value="all">Any Image Status</option>
                        <option value="with-images">With Images</option>
                        <option value="without-images">Without Images</option>
                    </select>
                </div>

                <div className="relative min-w-[160px] w-full md:w-auto">
                    <SortAsc className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full pl-10 pr-8 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none appearance-none bg-white text-sm cursor-pointer"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="az">A-Z (Title)</option>
                        <option value="za">Z-A (Title)</option>
                    </select>
                </div>

                {canFilterBySchool && (
                    <div className="relative min-w-[170px] w-full md:w-auto">
                        <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            value={communityScope}
                            onChange={(e) => setCommunityScope(e.target.value as 'all' | 'school')}
                            className="w-full pl-10 pr-8 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none appearance-none bg-white text-sm cursor-pointer"
                        >
                            <option value="all">All Community</option>
                            <option value="school">{schoolCommunityName || 'My School'}</option>
                        </select>
                    </div>
                )}


                <button 
                    onClick={fetchGames}
                    className="flex w-full items-center justify-center p-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors border border-slate-200 md:w-auto"
                    title="Refresh List"
                >
                    <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                </button>
                </div>
            </div>
            {authorFilter && (
                <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-slate-500 font-semibold">Filtering by:</span>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100 font-bold">
                        {authorFilter.name}
                        <button
                            type="button"
                            onClick={clearAuthorFilter}
                            className="text-sky-700 hover:text-sky-900"
                            aria-label="Clear author filter"
                        >
                            x
                        </button>
                    </span>
                </div>
            )}
            {canFilterBySchool && communityScope === 'school' && (
                <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-slate-500 font-semibold">School scope:</span>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 font-bold">
                        {schoolCommunityName || 'My School'}
                        <button
                            type="button"
                            onClick={() => setCommunityScope('all')}
                            className="text-amber-700 hover:text-amber-900"
                            aria-label="Show all community games"
                        >
                            x
                        </button>
                    </span>
                </div>
            )}

            {!loading && !error && totalCount > 0 && (
                <>
                <div className="mb-4 text-sm text-slate-500 font-bold text-center md:text-left">
                    Showing {pageStart}-{pageEnd} of {totalCount} {communityScope === 'school' ? 'school community games' : 'games'}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="text-sm font-bold text-slate-600">
                            Page {currentPage} of {totalPages || 1}
                        </span>
                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
                </>
            )}

            {loading ? (
                <div className="text-center py-20">
                    <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500">Loading community games...</p>
                </div>
            ) : error ? (
                <div className="text-center py-20 bg-red-50 rounded-2xl border border-red-100">
                    <AlertTriangle size={32} className="text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-red-700 mb-2">Connection Error</h3>
                    <p className="text-red-600 max-w-sm mx-auto mb-6">{error}</p>
                    <button onClick={fetchGames} className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors">Try Again</button>
                </div>
            ) : games.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 border-dashed">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Globe size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">No public games found</h3>
                    <p className="text-slate-400 max-w-sm mx-auto mb-6">
                        {communityScope === 'school'
                            ? `No public games found for ${schoolCommunityName || 'your school'} yet.`
                            : 'Be the first to publish a game to the community!'}
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {games.map(game => (
                            <div key={game.id} className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-lg transition-all p-5 flex flex-col group relative">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2 max-w-[60%]">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase truncate max-w-full">
                                            {getIcon(game.config.type)} <span className="truncate">{game.config.type}</span>
                                        </div>
                                        {game.config.isAI && (
                                            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200" title="AI Generated">
                                                <Sparkles size={10} /> AI
                                            </div>
                                        )}
                                    </div>
                                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-sky-50 text-sky-600 border border-sky-100">
                                        <Globe size={12} />
                                    </div>
                                </div>
                                
                                <h3 className="font-display font-bold text-lg text-slate-800 mb-1 line-clamp-1" title={game.title}>{game.title}</h3>
                                <p className="text-sm text-slate-500 mb-1 line-clamp-1">Topic: {game.config.topic || 'General'}</p>
                                <div className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                                    <span>By</span>
                                    <Avatar
                                        name={game.authorName || 'Teacher'}
                                        src={game.authorAvatar || game.config.authorAvatar}
                                        className="w-4 h-4"
                                        textClassName="text-[7px]"
                                    />
                                    {game.authorId ? (
                                        <button
                                            type="button"
                                            onClick={() => applyAuthorFilter(game.authorId!, game.authorName || 'Teacher')}
                                            className="truncate text-slate-600 hover:text-brand-blue hover:underline"
                                            title={`View all by ${game.authorName || 'Teacher'}`}
                                        >
                                            {game.authorName || 'Teacher'}
                                        </button>
                                    ) : (
                                        <span className="truncate">{game.authorName || 'Teacher'}</span>
                                    )}
                                </div>
                                
                                {/* STATS BADGES */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {getGameStats(game).map((stat, i) => (
                                        <div key={i} className="flex items-center text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                                            <span className="mr-1.5 opacity-50">{stat.icon}</span>
                                            <span>{stat.value} {stat.label}</span>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="mt-auto pt-4 border-t border-slate-50 flex items-center">
                                    <button 
                                        onClick={() => onLoadGame(game)}
                                        className="w-full px-3 py-2 bg-white border-2 border-slate-200 text-slate-600 rounded-lg font-bold hover:border-brand-blue hover:text-brand-blue transition-colors flex items-center justify-center gap-2 text-sm"
                                        title="Open Preview"
                                    >
                                        <HelpCircle size={14} /> Preview
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {totalCount > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="text-sm font-bold text-slate-600">
                            Page {currentPage} of {totalPages || 1}
                        </span>
                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={18} />
                        </button>
                        <div className="relative min-w-[120px] ml-auto">
                            <List className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="w-full pl-9 pr-7 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none appearance-none bg-white text-xs font-bold text-slate-600 cursor-pointer"
                            >
                                {pageSizeOptions.map((size) => (
                                    <option key={size} value={size}>{size} per page</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    )}
                </>
            )}
        </div>
    );
};

// --- MAIN GAME HUB ---
const GameHub: React.FC<{ 
    onSelect: (type: GameType) => void, 
    initialTab?: 'create' | 'community' | 'library',
    onLoadCommunityGame: (game: GeneratedGame) => void,
    onLoadPersonalGame: (game: GeneratedGame) => void,
    onOpenAiAssistant: () => void,
    initialCommunityAuthorFilter?: { id?: string; name: string } | null,
    initialCommunitySearch?: string
}> = ({ onSelect, initialTab = 'create', onLoadCommunityGame, onLoadPersonalGame, onOpenAiAssistant, initialCommunityAuthorFilter, initialCommunitySearch }) => {
    const [activeTab, setActiveTab] = useState<'create' | 'community' | 'library'>(initialTab);
    
    // Sync internal state with prop changes (e.g. from Nav link)
    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    // Game Types Data
    const games = [
        { 
            type: GameType.LIVE_QUIZ_CHALLENGE,
            icon: <GraduationCap size={24} />,
            desc: "Kahoot-style live quiz with QR joining and speed scoring.",
            image: getGameThumbnails(GameType.LIVE_QUIZ_CHALLENGE)[0],
            previewImages: getGameThumbnails(GameType.LIVE_QUIZ_CHALLENGE).slice(1),
            color: "bg-cyan-700"
        },
        { 
            type: GameType.TRIVIA, 
            icon: <HelpCircle size={24} />, 
            desc: "Fast-paced questions to test knowledge.",
            image: getGameThumbnails(GameType.TRIVIA)[0],
            previewImages: getGameThumbnails(GameType.TRIVIA).slice(1),
            color: "bg-purple-600"
        },
        { 
            type: GameType.JEOPARDY, 
            icon: <Grid size={24} />, 
            desc: "Strategic team quiz based on categories.",
            image: getGameThumbnails(GameType.JEOPARDY)[0],
            previewImages: getGameThumbnails(GameType.JEOPARDY).slice(1),
            color: "bg-blue-600"
        },
        { 
            type: GameType.TIME_BOMB, 
            icon: <Timer size={24} />, 
            desc: "Pass the bomb before time runs out!",
            image: getGameThumbnails(GameType.TIME_BOMB)[0],
            previewImages: getGameThumbnails(GameType.TIME_BOMB).slice(1),
            color: "bg-slate-900"
        },
        { 
            type: GameType.WORD_WHEEL, 
            icon: <RefreshCw size={24} />, 
            desc: "Letter-by-letter clue race with pass-or-play pressure.",
            image: getGameThumbnails(GameType.WORD_WHEEL)[0],
            previewImages: getGameThumbnails(GameType.WORD_WHEEL).slice(1),
            color: "bg-teal-600"
        },
        { 
            type: GameType.PUB_QUIZ, 
            icon: <Beer size={24} />, 
            desc: "Round-based quiz with manual scoring.",
            image: getGameThumbnails(GameType.PUB_QUIZ)[0],
            previewImages: getGameThumbnails(GameType.PUB_QUIZ).slice(1),
            color: "bg-slate-700"
        },
        { 
            type: GameType.SURVEY_SHOWDOWN, 
            icon: <List size={24} />, 
            desc: "Guess top answers in this survey game!",
            image: getGameThumbnails(GameType.SURVEY_SHOWDOWN)[0],
            previewImages: getGameThumbnails(GameType.SURVEY_SHOWDOWN).slice(1),
            color: "bg-emerald-600"
        },
        { 
            type: GameType.STOP_THE_FIRE, 
            icon: <Flame size={24} />, 
            desc: "Fast word race inspired by Scattergories.",
            image: getGameThumbnails(GameType.STOP_THE_FIRE)[0],
            previewImages: getGameThumbnails(GameType.STOP_THE_FIRE).slice(1),
            color: "bg-[#0f4c81]"
        },
        { 
            type: GameType.MILLIONAIRE, 
            icon: <DollarSign size={24} />, 
            desc: "Climb the ladder to win big.",
            image: getGameThumbnails(GameType.MILLIONAIRE)[0],
            previewImages: getGameThumbnails(GameType.MILLIONAIRE).slice(1),
            color: "bg-indigo-700"
        },
        { 
            type: GameType.DARTS, 
            icon: <Target size={24} />, 
            desc: "Hit the target by answering correctly.",
            image: getGameThumbnails(GameType.DARTS)[0],
            previewImages: getGameThumbnails(GameType.DARTS).slice(1),
            color: "bg-red-600"
        },
        { 
            type: GameType.SNAKES_LADDERS, 
            icon: <Dice5 size={24} />, 
            desc: "Classic board game fun with a learning twist.",
            image: getGameThumbnails(GameType.SNAKES_LADDERS)[0],
            previewImages: getGameThumbnails(GameType.SNAKES_LADDERS).slice(1),
            color: "bg-orange-500"
        },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div className="text-center md:text-left">
                    <h1 className="font-display text-4xl font-bold text-slate-800 mb-1">AI Classroom Game Maker</h1>
                    <p className="text-slate-500">Create classroom games from any topic. Choose trivia, live quiz, Jeopardy-style games, word games, board games, and more.</p>
                </div>
                
                {/* PROMINENT TABS */}
                <div className="bg-white p-1.5 rounded-2xl md:rounded-full flex flex-wrap md:flex-nowrap shadow-md border border-slate-100 gap-1 w-full md:w-auto justify-center">
                    <button 
                        onClick={() => setActiveTab('create')}
                        className={`px-3 py-2 md:px-6 md:py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 md:gap-2 whitespace-nowrap
                            ${activeTab === 'create' ? 'bg-brand-blue text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                    >
                        <Sparkles size={16} /> Create New
                    </button>
                    <button 
                        onClick={() => setActiveTab('community')}
                        className={`px-3 py-2 md:px-6 md:py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 md:gap-2 whitespace-nowrap
                            ${activeTab === 'community' ? 'bg-brand-blue text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                    >
                        <Globe size={16} /> Community
                    </button>
                    <button 
                        onClick={() => setActiveTab('library')}
                        className={`px-3 py-2 md:px-6 md:py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 md:gap-2 whitespace-nowrap
                            ${activeTab === 'library' ? 'bg-brand-blue text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                    >
                        <Library size={16} /> My Library
                    </button>
                </div>
            </div>
            
            {activeTab === 'create' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-fade-in">
                        {games.map((game) => (
                            <GameCard key={game.type} game={game} onSelect={onSelect} />
                        ))}
                    </div>

                    {/* AI Chatbot Teaser */}
                    <div className="mt-20 bg-brand-blue rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between shadow-xl shadow-sky-100 overflow-hidden relative animate-slide-up">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-yellow/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

                        <div className="md:w-2/3 mb-8 md:mb-0 relative z-10">
                            <h3 className="font-display text-3xl font-bold text-white mb-4">
                                Can't decide? Let AI help you.
                            </h3>
                            <p className="text-sky-100 mb-8 text-lg max-w-xl leading-relaxed">
                                Describe your lesson topic, student level, or learning goals, and our AI will recommend the perfect game format and generate content for you instantly.
                            </p>
                            <button 
                                onClick={onOpenAiAssistant}
                                className="bg-white text-brand-blue px-8 py-4 rounded-xl font-bold hover:bg-sky-50 transition-colors shadow-lg flex items-center"
                            >
                                <img
                                    src="/assets/game_elements/aiassistanthead.png"
                                    alt=""
                                    aria-hidden="true"
                                    className="mr-3 h-12 w-12 rounded-xl object-cover"
                                />
                                Open AI Assistant
                            </button>
                        </div>
                        <div className="md:w-1/3 flex justify-center relative z-10">
                             <div className="relative">
                                <div className="absolute inset-0 bg-brand-yellow blur-[60px] opacity-40 rounded-full animate-pulse"></div>
                                <img
                                    src="/assets/game_elements/aiassistant.png"
                                    alt="AI Assistant"
                                    className="rounded-2xl border-4 border-white/20 shadow-2xl relative z-10 w-72 h-72 md:w-80 md:h-80 object-cover"
                                />
                             </div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'community' && (
                <CommunityLibrary
                    onLoadGame={onLoadCommunityGame}
                    initialAuthorFilter={initialCommunityAuthorFilter}
                    initialSearch={initialCommunitySearch}
                />
            )}

            {activeTab === 'library' && (
                <PersonalLibrary onLoadGame={onLoadPersonalGame} />
            )}
        </div>
    );
};

// MAIN COMPONENT
export const Games: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState<'hub' | 'mode' | 'config' | 'preview' | 'choose-format' | 'format-setup' | 'editor' | 'setup' | 'play'>('hub');
    const [selectedType, setSelectedType] = useState<GameType | null>(null);
    const [pendingFormatType, setPendingFormatType] = useState<GameType.JEOPARDY | GameType.PUB_QUIZ | null>(null);
    const [creationMode, setCreationMode] = useState<'ai' | 'manual' | 'bank'>('ai');
    const [generatedGame, setGeneratedGame] = useState<GeneratedGame | null>(null);
    const [sessionGame, setSessionGame] = useState<GeneratedGame | null>(null);
    const [playOptions, setPlayOptions] = useState<GameRunOptions | null>(null);
    const [editorReturnStep, setEditorReturnStep] = useState<'config' | 'hub' | 'preview'>('hub');
    const [playReturnStep, setPlayReturnStep] = useState<'editor' | 'preview'>('editor');
    const [hubTab, setHubTab] = useState<'create' | 'community' | 'library'>('create');
    const [communitySeedAuthorFilter, setCommunitySeedAuthorFilter] = useState<{ id?: string; name: string } | null>(null);
    const [communitySeedSearch, setCommunitySeedSearch] = useState('');
    const [isAssistantOpen, setIsAssistantOpen] = useState(false);
    const [isTourActive, setIsTourActive] = useState(false);
    const [isMobileTourViewport, setIsMobileTourViewport] = useState(false);
    const [tourPopupHeight, setTourPopupHeight] = useState(0);
    const [studentShareUrl, setStudentShareUrl] = useState('');
    const [studentShareTitle, setStudentShareTitle] = useState('');
    const [liveQuizSelectedItems, setLiveQuizSelectedItems] = useState<string[] | null>(null);

    const location = useLocation();
    const { setIsDirty, confirmAction } = useUnsavedChanges();

    useEffect(() => {
        const navState: any = location.state || {};
        if (navState?.tour) return;

        if (navState?.view === 'library') {
            setIsDirty(false); 
            setCommunitySeedAuthorFilter(null);
            setCommunitySeedSearch('');
            setHubTab('library');
            setStep('hub');
            return;
        }

        if (navState?.view === 'community') {
            setIsDirty(false);
            setIsAssistantOpen(false);
            setHubTab('community');
            setStep('hub');

            const creator = navState.creatorFilter as { id?: string; name?: string } | undefined;
            if (creator?.name) {
                setCommunitySeedAuthorFilter({ id: creator.id, name: creator.name });
                setCommunitySeedSearch('');
                return;
            }

            const search = typeof navState.searchQuery === 'string' ? navState.searchQuery.trim() : '';
            setCommunitySeedAuthorFilter(null);
            setCommunitySeedSearch(search);
        }
    }, [location, setIsDirty]);

    useEffect(() => {
        const navState: any = location.state || {};
        const previewGameId = typeof navState?.previewGameId === 'string' ? navState.previewGameId.trim() : '';
        if (!previewGameId) return;

        let isCancelled = false;

        const openPreviewGame = async () => {
            const shared = await getSharedGame(previewGameId);
            if (isCancelled || !shared) return;

            const safeGame: GeneratedGame = {
                ...shared,
                id: undefined,
                sourceGameId: shared.id,
                config: {
                    ...shared.config,
                    isPublic: false,
                    originalCreatorName: shared.config.originalCreatorName || shared.authorName || 'Teacher',
                    originalCreatorId: shared.config.originalCreatorId || shared.authorId,
                    originalCreatorAvatar: shared.config.originalCreatorAvatar || shared.authorAvatar || shared.config.authorAvatar || null,
                    lastEditorName: undefined,
                    lastEditorId: undefined
                }
            };

            setIsDirty(false);
            setIsAssistantOpen(false);
            setCommunitySeedAuthorFilter(null);
            setCommunitySeedSearch('');
            setGeneratedGame(safeGame);
            setSessionGame(null);
            setSelectedType(shared.config.type);
            setHubTab('community');
            setStep('preview');
        };

        void openPreviewGame();

        return () => {
            isCancelled = true;
        };
    }, [location.state, setIsDirty]);

    useEffect(() => {
        if (location.state?.tour === 'games') {
            setIsDirty(false);
            setHubTab('create');
            setStep('hub');
            setIsAssistantOpen(false);
            setIsTourActive(true);
        }
    }, [location.state, setIsDirty]);

    useEffect(() => {
        if (!isTourActive) return;
        if (step !== 'hub' && step !== 'mode' && step !== 'config') {
            setIsTourActive(false);
        }
    }, [isTourActive, step]);

    useEffect(() => {
        const media = window.matchMedia('(max-width: 639px)');
        const updateViewport = () => setIsMobileTourViewport(media.matches);
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

    const handleSelect = (type: GameType) => {
        if (!user) {
            promptSignupForFree('Create a free account on the Teacher Plan to start creating games.');
            return;
        }
        setSelectedType(type);
        setGeneratedGame(null);
        setSessionGame(null);
        // Enable mode selection for all games
        setStep('mode');
    };

    const handleModeSelect = (mode: 'ai' | 'manual' | 'bank') => {
        if (mode === 'ai' && user?.accountType === 'free') {
            promptUpgradeForAi('AI game generation is included with the Teacher Plan during early access.');
            return;
        }
        setCreationMode(mode);
        setStep('config');
    };

    const handleConfigProceed = (game: GeneratedGame) => {
        setGeneratedGame(game);
        setSessionGame(null);
        setEditorReturnStep('config');
        setStep('editor');
        setIsDirty(true);
    };

    const trackStartedGame = (game?: GeneratedGame | null) => {
        const gameIdToTrack = game?.sourceGameId || game?.id;
        if (!gameIdToTrack) return;
        void recordGamePlay(gameIdToTrack);
    };

    const handleEditorSave = (updatedGame: GeneratedGame) => {
        setGeneratedGame(updatedGame);
    };

    const handleEditorPlay = (updatedGame: GeneratedGame) => {
        setGeneratedGame(updatedGame);
        setSessionGame(updatedGame);
        setPlayReturnStep('editor');
        setIsDirty(false);

        if (updatedGame.config.type === GameType.LIVE_QUIZ_CHALLENGE) {
            if (!user) {
                promptSignupForFree('Create a free account on the Teacher Plan to host live quiz challenges.');
                return;
            }
            if (!isUUID(updatedGame.sourceGameId || updatedGame.id)) {
                alert('Please save this game to your library before starting a live quiz.');
                return;
            }
            setLiveQuizSelectedItems([]);
            return;
        }
        
        if (updatedGame.config.type === GameType.MILLIONAIRE) {
             setPlayOptions({
                 players: 1,
                 timerSeconds: 0,
                 enableBonuses: false,
                 strictMode: false,
                 muted: false
             });
             trackStartedGame(updatedGame);
             setStep('play');
        } else if (updatedGame.config.type === GameType.STOP_THE_FIRE) {
             setPlayOptions({
                 players: 2,
                 timerSeconds: 60,
                 enableBonuses: false,
                 strictMode: false,
                 muted: false,
                 stopTheFireCategoryCount: 10,
                 stopTheFireDifficulty: 'beginner'
             });
             trackStartedGame(updatedGame);
             setStep('play');
        } else if (updatedGame.config.type === GameType.SURVEY_SHOWDOWN) {
             setPlayOptions({
                 players: 2, 
                 timerSeconds: 0, 
                 enableBonuses: false,
                 strictMode: false,
                 muted: false
             });
             setStep('setup');
        } else {
             setStep('setup');
        }
    };

    const handlePreviewPlayAsDifferent = (gameToConvert: GeneratedGame) => {
        setSessionGame(gameToConvert);
        setPlayReturnStep('preview');
        setIsDirty(false);
        setStep('choose-format');
    };

    const handleCompatibleGameSelect = (targetType: GameType) => {
        const sourceGame = sessionGame || generatedGame;
        if (!sourceGame) return;

        if (targetType === GameType.JEOPARDY || targetType === GameType.PUB_QUIZ) {
            setPendingFormatType(targetType);
            setSelectedType(targetType);
            setStep('format-setup');
            return;
        }

        const converted = convertGameForTemporaryPlay(sourceGame, targetType);
        if (!converted) {
            alert('This question set cannot be used with that game yet.');
            return;
        }

        setSessionGame(converted);
        setSelectedType(targetType);
        setPlayReturnStep('preview');

        if (converted.config.type === GameType.LIVE_QUIZ_CHALLENGE) {
            if (!user) {
                promptSignupForFree('Create a free account on the Teacher Plan to host live quiz challenges.');
                return;
            }
            setLiveQuizSelectedItems([]);
            return;
        }

        if (converted.config.type === GameType.MILLIONAIRE) {
            setPlayOptions({
                players: 1,
                timerSeconds: 0,
                enableBonuses: false,
                strictMode: false,
                muted: false
            });
            trackStartedGame(sourceGame);
            setStep('play');
            return;
        }

        setStep('setup');
    };

    const handleCategoryFormatStart = (groups: JeopardyCategory[]) => {
        const sourceGame = sessionGame || generatedGame;
        if (!sourceGame || !pendingFormatType) return;

        const converted = convertGameForTemporaryPlay(sourceGame, pendingFormatType, { groups });
        if (!converted) {
            alert('This question set cannot be used with that game yet.');
            return;
        }

        setSessionGame(converted);
        setSelectedType(pendingFormatType);
        setPlayReturnStep('preview');
        setPendingFormatType(null);
        setStep('setup');
    };

    const handleEditorLiveQuiz = (updatedGame: GeneratedGame) => {
        setGeneratedGame(updatedGame);
        setSessionGame(updatedGame);
        setIsDirty(false);

        if (!user) {
            promptSignupForFree('Create a free account on the Teacher Plan to host live quiz challenges.');
            return;
        }

        if (!isUUID(updatedGame.sourceGameId || updatedGame.id)) {
            alert('Please save this game to your library before starting a live quiz.');
            return;
        }

        setLiveQuizSelectedItems([]);
    };

    const handleGameStart = (options: GameRunOptions) => {
        trackStartedGame(sessionGame || generatedGame);
        setPlayOptions(options);
        setStep('play');
    };

    const handleLoadPersonalGame = (game: GeneratedGame) => {
        if (!user) {
            promptSignupForFree('Create a free account on the Teacher Plan to use saved game features.');
            return;
        }
        setGeneratedGame(game);
        setSessionGame(null);
        setSelectedType(game.config.type);
        setHubTab('library'); // Remember tab
        setStep('preview');
        setIsDirty(false); 
    };

    const handleLoadCommunityGame = (game: GeneratedGame) => {
        if (!user) {
            promptSignupForFree('Create a free account on the Teacher Plan to copy and play community games.');
            return;
        }
        // Strip ID to treat as template (avoid overwriting public game or confusing local store)
        // Also ensure visibility is reset to private for the remixer
        const safeGame = { 
            ...game, 
            id: undefined,
            sourceGameId: game.id,
            config: {
                ...game.config,
                isPublic: false,
                originalCreatorName: game.config.originalCreatorName || game.authorName || 'Teacher',
                originalCreatorId: game.config.originalCreatorId || game.authorId,
                originalCreatorAvatar: game.config.originalCreatorAvatar || game.authorAvatar || game.config.authorAvatar || null,
                lastEditorName: undefined,
                lastEditorId: undefined
            } 
        };
        
        setGeneratedGame(safeGame);
        setSessionGame(null);
        setSelectedType(game.config.type);
        setHubTab('community'); // Remember tab
        setStep('preview');
        setIsDirty(false);
    };

    const copyPreviewShareLink = async (gameId: string) => {
        const shareUrl = getGameShareUrl(gameId);
        try {
            await navigator.clipboard.writeText(shareUrl);
            alert('Share link copied!');
        } catch (error) {
            alert(`Copy failed. Share this link:\n${shareUrl}`);
        }
    };

    const persistPreviewGame = async (gameToSave: GeneratedGame, opts?: { overrideIsPublic?: boolean }) => {
        if (gameToSave.config.type === GameType.STOP_THE_FIRE && gameToSave.config.stopTheFireMode === 'bank') {
            alert('Word Bank games cannot be shared or saved. Switch to Manual or AI to save this game.');
            return null;
        }

        const nextGame = prepareGameForLibrarySave(gameToSave, user, opts?.overrideIsPublic);
        const result = await saveGameToLibrary(nextGame, user?.id, user?.name, user?.schoolAccess?.schoolId);
        if (!result.success) {
            alert('Failed to save. Please try again.');
            return null;
        }

        const savedGame = { ...nextGame, id: result.id ?? nextGame.id };
        setGeneratedGame(savedGame);
        setSessionGame(null);
        return savedGame;
    };

    const handlePreviewSave = async () => {
        if (!generatedGame) return;
        if (!user) {
            promptSignupForFree('Create a free account on the Teacher Plan to save games to your library.');
            return;
        }
        const savedGame = await persistPreviewGame(generatedGame);
        if (!savedGame) return;
        alert(hubTab === 'community' ? 'Game saved to your library.' : 'Game saved.');
    };

    const handlePreviewShare = async () => {
        if (!generatedGame) return;

        if (generatedGame.config.type === GameType.STOP_THE_FIRE && generatedGame.config.stopTheFireMode === 'bank') {
            alert('Word Bank games cannot be shared or saved. Switch to Manual or AI to save this game.');
            return;
        }

        if (generatedGame.sourceGameId && isUUID(generatedGame.sourceGameId)) {
            await copyPreviewShareLink(generatedGame.sourceGameId);
            return;
        }

        if (!user) {
            promptSignupForFree('Create a free account on the Teacher Plan to share games with colleagues.');
            return;
        }

        let shareGame = generatedGame;
        if (!shareGame.config.isPublic) {
            const confirmPublic = window.confirm('This game is private. Make it public to share?');
            if (!confirmPublic) return;
            const savedGame = await persistPreviewGame(shareGame, { overrideIsPublic: true });
            if (!savedGame) return;
            shareGame = savedGame;
        } else if (!isUUID(shareGame.id)) {
            const savedGame = await persistPreviewGame(shareGame);
            if (!savedGame) return;
            shareGame = savedGame;
        }

        if (!shareGame.id || !isUUID(shareGame.id)) {
            alert('Please save this game before sharing.');
            return;
        }

        await copyPreviewShareLink(shareGame.id);
    };

    const handlePreviewStudentShare = async (selectedItemIds: string[]) => {
        if (!generatedGame) return;

        if ([GameType.STOP_THE_FIRE, GameType.SURVEY_SHOWDOWN].includes(generatedGame.config.type)) {
            alert('Student practice sharing is not available for this game type.');
            return;
        }

        if (selectedItemIds.length === 0) {
            alert('Select at least one question before sharing with students.');
            return;
        }

        if (!user) {
            promptSignupForFree('Create a free account on the Teacher Plan to share games with students.');
            return;
        }

        if (generatedGame.sourceGameId && isUUID(generatedGame.sourceGameId)) {
            const result = await createSelectedStudentGameShare(generatedGame.sourceGameId, user.id, generatedGame.title, selectedItemIds);
            if (!result.success || !result.id) {
                alert('Failed to create student practice link. Please try again.');
                return;
            }
            setStudentShareUrl(getSelectedStudentGameShareUrl(result.id));
            setStudentShareTitle(generatedGame.title);
            return;
        }

        let shareGame = generatedGame;
        if (!shareGame.config.isPublic) {
            const confirmPublic = window.confirm('This game must be public for student practice links. Make it public?');
            if (!confirmPublic) return;
            const savedGame = await persistPreviewGame(shareGame, { overrideIsPublic: true });
            if (!savedGame) return;
            shareGame = savedGame;
        } else if (!isUUID(shareGame.id)) {
            const savedGame = await persistPreviewGame(shareGame);
            if (!savedGame) return;
            shareGame = savedGame;
        }

        if (!shareGame.id || !isUUID(shareGame.id)) {
            alert('Please save this game before sharing it with students.');
            return;
        }

        const result = await createSelectedStudentGameShare(shareGame.id, user.id, shareGame.title, selectedItemIds);
        if (!result.success || !result.id) {
            alert('Failed to create student practice link. Please try again.');
            return;
        }

        setStudentShareUrl(getSelectedStudentGameShareUrl(result.id));
        setStudentShareTitle(shareGame.title);
    };

    const handlePreviewLiveQuiz = (selectedItemIds: string[]) => {
        if (!generatedGame) return;

        if (!user) {
            promptSignupForFree('Create a free account on the Teacher Plan to host live quiz challenges.');
            return;
        }

        if (selectedItemIds.length === 0) {
            alert('Select at least one question before starting a live quiz.');
            return;
        }

        if (!isUUID(generatedGame.sourceGameId || generatedGame.id)) {
            alert('Please save this game to your library before starting a live quiz.');
            return;
        }

        setLiveQuizSelectedItems(selectedItemIds);
    };

    const handleCreateLiveQuiz = async (options: { timerSeconds: number; randomize: boolean }) => {
        if (!generatedGame || !user || !liveQuizSelectedItems) return;
        const liveQuizGame = liveQuizSelectedItems.length === 0 && sessionGame ? sessionGame : generatedGame;
        const result = await createLiveQuizSession(liveQuizGame, user.id, liveQuizSelectedItems, {
            timerSeconds: options.timerSeconds,
            randomize: options.randomize,
        });

        if (!result.success || !result.sessionId) {
            alert(result.error || 'Failed to create live quiz. Make sure selected questions are multiple choice with a saved correct answer.');
            return;
        }

        if (result.skipped && result.skipped > 0) {
            alert(`${result.skipped} selected question${result.skipped === 1 ? ' was' : 's were'} skipped because live quiz currently requires multiple-choice questions with one correct option.`);
        }

        setLiveQuizSelectedItems(null);
        navigate(`/live/host/${result.sessionId}`);
    };

    const handlePreviewEdit = () => {
        if (!generatedGame) return;
        setEditorReturnStep('preview');
        setStep('editor');
        setIsDirty(Boolean(generatedGame.sourceGameId));
    };

    const handlePreviewPlay = (gameToPlay: GeneratedGame) => {
        setSessionGame(gameToPlay);
        setPlayReturnStep('preview');
        setIsDirty(false);

        if (gameToPlay.config.type === GameType.LIVE_QUIZ_CHALLENGE) {
            if (!user) {
                promptSignupForFree('Create a free account on the Teacher Plan to host live quiz challenges.');
                return;
            }
            setLiveQuizSelectedItems([]);
            return;
        }

        if (gameToPlay.config.type === GameType.MILLIONAIRE) {
            setPlayOptions({
                players: 1,
                timerSeconds: 0,
                enableBonuses: false,
                strictMode: false,
                muted: false
            });
            trackStartedGame(gameToPlay);
            setStep('play');
        } else if (gameToPlay.config.type === GameType.STOP_THE_FIRE) {
            setPlayOptions({
                players: 2,
                timerSeconds: 60,
                enableBonuses: false,
                strictMode: false,
                muted: false,
                stopTheFireCategoryCount: 10,
                stopTheFireDifficulty: 'beginner'
            });
            trackStartedGame(gameToPlay);
            setStep('play');
        } else if (gameToPlay.config.type === GameType.SURVEY_SHOWDOWN) {
            setPlayOptions({
                players: 2,
                timerSeconds: 0,
                enableBonuses: false,
                strictMode: false,
                muted: false
            });
            setStep('setup');
        } else {
            setStep('setup');
        }
    };

    const handleBack = () => {
        const performBack = () => {
            setIsDirty(false);
            if (step === 'play') {
                if (selectedType === GameType.MILLIONAIRE || selectedType === GameType.STOP_THE_FIRE) setStep('editor');
                else setStep('setup');
            } else if (step === 'setup') {
                setStep(playReturnStep);
            } else if (step === 'editor') {
                setStep(editorReturnStep);
            } else if (step === 'preview') {
                setStep('hub');
            } else if (step === 'config') {
                setStep('mode');
            } else if (step === 'mode') {
                setStep('hub');
            } else {
                setStep('hub');
            }
        };

        if (step === 'editor') {
             confirmAction("Leave editor? Any unsaved changes will be lost.", performBack);
        } else {
            performBack();
        }
    };

    const handleGameEnd = () => {
        setStep(playReturnStep); 
    };

    const handleReplay = () => {
        setIsDirty(false);
        const replayGame = sessionGame || generatedGame;
        if (selectedType === GameType.MILLIONAIRE) {
             setStep(playReturnStep); 
             setTimeout(() => {
                trackStartedGame(replayGame);
                setStep('play');
             }, 50); 
        } else if (selectedType === GameType.STOP_THE_FIRE) {
             setStep(playReturnStep);
             setTimeout(() => {
                trackStartedGame(replayGame);
                setStep('play');
             }, 50);
        } else {
             setStep('setup');
        }
    };

    // Handler for when the AI Chat creates a game
    const handleAiGameGenerated = (game: GeneratedGame) => {
        setIsAssistantOpen(false);
        setGeneratedGame(game);
        setSessionGame(null);
        setSelectedType(game.config.type);
        setEditorReturnStep('hub');
        setStep('editor');
        setIsDirty(true);
    };

    useEffect(() => {
        if (step === 'play') {
            document.body.classList.add('gameplay-active');
        } else {
            document.body.classList.remove('gameplay-active');
        }
        return () => {
            document.body.classList.remove('gameplay-active');
        };
    }, [step]);

    useEffect(() => {
        if (step === 'setup' || step === 'play') {
            window.scrollTo(0, 0);
        }
    }, [step]);

    const getTourConfigCopy = () => {
        if (creationMode === 'manual') {
            if (selectedType === GameType.STOP_THE_FIRE) {
                return {
                    text: 'Configure your game: add a title and your categories, then click "Open Editor".',
                    detail: 'Manual mode means you will type content yourself in the editor.'
                };
            }
            return {
                text: 'Configure your game basics, then click "Open Editor" to build questions manually.',
                detail: 'Manual mode gives full control and usually needs less setup.'
            };
        }

        if (creationMode === 'bank') {
            return {
                text: 'Configure the word-bank options shown, then continue to the editor.',
                detail: 'Bank mode uses prebuilt categories, so setup is quick.'
            };
        }

        const compactTypes = [GameType.MILLIONAIRE, GameType.WORD_WHEEL, GameType.SURVEY_SHOWDOWN, GameType.STOP_THE_FIRE];
        const detail = compactTypes.includes(selectedType as GameType)
            ? 'This game type needs fewer inputs. Fill the visible fields and click "Create Game".'
            : 'Give your game a title, topic, question style, image options, AI instructions, then click "Create Game".';

        return {
            text: 'Configure your game for AI generation.',
            detail
        };
    };

    const isFloatingTourVisible =
        isTourActive &&
        ((step === 'hub' && !isAssistantOpen) || step === 'mode' || step === 'config');
    const mobileTourSpacerHeight = isMobileTourViewport && isFloatingTourVisible ? tourPopupHeight + 20 : 0;

    return (
        <div className="min-h-screen bg-slate-50">
            {mobileTourSpacerHeight > 0 && (
                <div className="sm:hidden" style={{ height: `${mobileTourSpacerHeight}px` }} aria-hidden />
            )}
            {step === 'hub' && (
                <GameHub 
                    onSelect={handleSelect} 
                    initialTab={hubTab}
                    onLoadCommunityGame={handleLoadCommunityGame}
                    onLoadPersonalGame={handleLoadPersonalGame}
                    onOpenAiAssistant={() => {
                        if (!user) {
                            promptSignupForFree('Create a free account on the Teacher Plan to use the AI Assistant.');
                            return;
                        }
                        if (user.accountType === 'free') {
                            promptUpgradeForAi('The AI Assistant is included with the Teacher Plan during early access.');
                            return;
                        }
                        setIsAssistantOpen(true);
                    }}
                    initialCommunityAuthorFilter={communitySeedAuthorFilter}
                    initialCommunitySearch={communitySeedSearch}
                />
            )}

            {step === 'preview' && generatedGame && (
                <GamePreview
                    game={generatedGame}
                    source={hubTab === 'community' ? 'community' : 'library'}
                    onBack={() => setStep('hub')}
                    onEdit={handlePreviewEdit}
                    onPlay={handlePreviewPlay}
                    onPlayAsDifferent={handlePreviewPlayAsDifferent}
                    onSave={handlePreviewSave}
                    onShare={handlePreviewShare}
                    onStudentShare={handlePreviewStudentShare}
                    onLiveQuiz={handlePreviewLiveQuiz}
                />
            )}

            {step === 'choose-format' && (sessionGame || generatedGame) && (
                <CompatibleGameChooser
                    sourceGame={sessionGame || generatedGame!}
                    onBack={() => setStep('preview')}
                    onSelect={handleCompatibleGameSelect}
                />
            )}

            {step === 'format-setup' && (sessionGame || generatedGame) && pendingFormatType && (
                <CategoryFormatSetup
                    sourceGame={sessionGame || generatedGame!}
                    targetType={pendingFormatType}
                    onBack={() => setStep('choose-format')}
                    onStart={handleCategoryFormatStart}
                />
            )}
            
            {step === 'mode' && selectedType && (
                <ModeSelector
                    type={selectedType}
                    onBack={() => setStep('hub')}
                    onModeSelect={handleModeSelect}
                    mobileTopInset={isMobileTourViewport && isTourActive && step === 'mode' ? mobileTourSpacerHeight : 0}
                />
            )}

            {step === 'config' && selectedType && (
                <GameConfigurator 
                    type={selectedType} 
                    mode={creationMode}
                    onBack={handleBack} 
                    onProceed={handleConfigProceed} 
                    initialConfig={generatedGame?.config}
                    mobileTopInset={isMobileTourViewport && isTourActive && step === 'config' ? mobileTourSpacerHeight : 0}
                />
            )}
            
            {step === 'editor' && generatedGame && (
                <GameEditor 
                    game={generatedGame} 
                    onSave={handleEditorSave} 
                    onPlay={handleEditorPlay} 
                    onLiveQuiz={handleEditorLiveQuiz}
                    onBack={handleBack}
                />
            )}

            {step === 'setup' && generatedGame && (
                <GameSetup 
                    game={sessionGame || generatedGame}
                    onBack={() => setStep(playReturnStep)}
                    onStart={handleGameStart}
                    backLabel={playReturnStep === 'preview' ? 'Back to Preview' : 'Back to Editor'}
                />
            )}

            {step === 'play' && (sessionGame || generatedGame) && playOptions && (
                <LazyGameRunner
                    game={sessionGame || generatedGame!}
                    options={playOptions}
                    onBack={handleGameEnd}
                    onFinish={() => setStep('hub')}
                    onReplay={handleReplay}
                />
            )}

            {isAssistantOpen && (
                <AiAssistantChat 
                    onClose={() => setIsAssistantOpen(false)} 
                    onGameGenerated={handleAiGameGenerated} 
                />
            )}

            <LiveQuizSetupModal
                isOpen={Boolean(liveQuizSelectedItems)}
                game={liveQuizSelectedItems?.length === 0 && sessionGame ? sessionGame : generatedGame}
                selectedItemIds={liveQuizSelectedItems || []}
                onClose={() => setLiveQuizSelectedItems(null)}
                onStart={handleCreateLiveQuiz}
            />

            {isTourActive && step === 'hub' && !isAssistantOpen && (
                <TourPopup
                    title="Step 1"
                    text='To create a new game, choose a game card or use "Open AI Assistant". You can also browse existing games in the Community tab.'
                    onClose={() => setIsTourActive(false)}
                    onHeightChange={setTourPopupHeight}
                />
            )}

            {isTourActive && step === 'mode' && (
                <TourPopup
                    title="Step 2"
                    text='Choose how to create your game: Manually or using AI Assistant.'
                    onClose={() => setIsTourActive(false)}
                    onHeightChange={setTourPopupHeight}
                />
            )}

            {isTourActive && step === 'config' && (
                <TourPopup
                    title="Step 3"
                    text={getTourConfigCopy().text}
                    detail={getTourConfigCopy().detail}
                    onClose={() => setIsTourActive(false)}
                    onHeightChange={setTourPopupHeight}
                />
            )}

            <StudentShareModal
                isOpen={Boolean(studentShareUrl)}
                url={studentShareUrl}
                title={studentShareTitle || 'Student practice'}
                onClose={() => setStudentShareUrl('')}
            />
        </div>
    );
};
