
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { GameType, GeneratedGame, GeneratedQuestion } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useUnsavedChanges } from '../../contexts/UnsavedChangesContext';
import { getStudentGameShareUrl, saveGameToLibrary } from '../../utils/gameUtils';
import { optimizeImageForUpload } from '../../utils/imageOptimize';
import { createSignedUrlsForGameAssets, uploadGameAsset } from '../../utils/gameAssetStorage';
import { resolveGameQuestionImageUrl } from '../../utils/gameImage';
import { getGameImageQuery } from '../../utils/gameAutoImages';
import { buildLiveQuizQuestionsFromGame } from '../../utils/liveQuizUtils';
import { StockImagePicker, StockImageSelection } from '../shared/StockImagePicker';
import { Avatar } from '../Avatar';
import { Save, Play, Check, AlertCircle, Plus, Trash2, Coins, ArrowLeft, Layers, List, Globe, Lock, Sparkles, X, FileText, Copy, CheckCircle, ChevronLeft, ChevronRight, Share2, QrCode, Calendar, Radio } from 'lucide-react';
import { promptSignupForFree } from '../../services/accountAccess';
import { StudentShareModal } from './StudentShareModal';
import { getPublicAppUrl } from '../../utils/appUrl';

interface GameEditorProps {
    game: GeneratedGame;
    onSave: (g: GeneratedGame) => void;
    onPlay: (g: GeneratedGame) => void;
    onLiveQuiz?: (g: GeneratedGame) => void;
    onBack: () => void;
    imageRepairKeys?: string[];
}

type QuestionImageTarget =
    | { scope: 'standard'; index: number }
    | { scope: 'grouped'; groupIndex: number; questionIndex: number };

const isUuid = (value?: string) => !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const WORD_WHEEL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const WORD_WHEEL_CONTAINS_HARD = new Set(['Q', 'V', 'X', 'Y', 'Z']);
const AI_PROMPT_MODAL_MAX_HEIGHT = 'min(75dvh, calc(100dvh - 2rem))';
const GAME_EDITOR_PAGE_SIZE_KEY = 'teachersRoomGameEditorPageSize';
const GAME_EDITOR_PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];
const editorPageSizeSelectClass = 'w-full pl-9 pr-7 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-blue outline-none appearance-none bg-white text-xs font-bold text-slate-600 cursor-pointer';
const editorPageButtonClass = 'p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

const getSavedEditorPageSize = () => {
    if (typeof window === 'undefined') return 10;
    const saved = Number(window.localStorage.getItem(GAME_EDITOR_PAGE_SIZE_KEY));
    return GAME_EDITOR_PAGE_SIZE_OPTIONS.includes(saved) ? saved : 10;
};

const formatCreatedDate = (value?: string) => {
    if (!value) return 'Date unavailable';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const getWordWheelRuleForLetter = (rule: 'starts-with' | 'contains-hard', letter: string) => {
    if (rule === 'contains-hard' && WORD_WHEEL_CONTAINS_HARD.has(letter)) return 'contains';
    return 'starts-with';
};

const normalizeWordWheelAnswer = (value: string) =>
    String(value || '').toUpperCase().replace(/[^A-Z]/g, '');

const answerMatchesWordWheelRule = (
    answer: string,
    letter: string,
    rule: 'starts-with' | 'contains-hard'
) => {
    const cleanAnswer = normalizeWordWheelAnswer(answer);
    if (!cleanAnswer || !letter) return true;
    const relation = getWordWheelRuleForLetter(rule, letter);
    return relation === 'contains' ? cleanAnswer.includes(letter) : cleanAnswer.startsWith(letter);
};

const getWordWheelRuleHint = (rule: 'starts-with' | 'contains-hard', letter: string) => {
    if (!letter) return 'answer should match the assigned letter rule';
    if (rule === 'contains-hard' && WORD_WHEEL_CONTAINS_HARD.has(letter)) {
        return `answer should contain "${letter}" or start with "${letter}"`;
    }
    return `answer should start with "${letter}"`;
};

export const GameEditor: React.FC<GameEditorProps> = ({ game, onSave, onPlay, onLiveQuiz, onBack, imageRepairKeys = [] }) => {
    const [editedGame, setEditedGame] = useState<GeneratedGame>(game);
    const [activeTab, setActiveTab] = useState<number>(0);
    const [isPublic, setIsPublic] = useState(game.config.isPublic || false); // New Local State for Visibility
    const [showAiPrompt, setShowAiPrompt] = useState(false);
    const [showCopyToast, setShowCopyToast] = useState(false);
    const [showShareToast, setShowShareToast] = useState(false);
    const [studentShareUrl, setStudentShareUrl] = useState('');
    const [hasEdits, setHasEdits] = useState(false);
    const tabsScrollRef = useRef<HTMLDivElement>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(getSavedEditorPageSize);
    const prevIsPublicRef = useRef(isPublic);
    const [bulkCategoryInput, setBulkCategoryInput] = useState('');
    const imageRepairKeySet = new Set(imageRepairKeys);
    const imageRepairCount = imageRepairKeys.length;

    const [imagePickerOpen, setImagePickerOpen] = useState(false);
    const [imagePickerTarget, setImagePickerTarget] = useState<QuestionImageTarget | null>(null);
    const [imagePickerSelection, setImagePickerSelection] = useState<StockImageSelection[]>([]);
    const [imagePickerQuery, setImagePickerQuery] = useState('');
    const [imageUploadTarget, setImageUploadTarget] = useState<QuestionImageTarget | null>(null);
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    
    const { user } = useAuth();
    const { isDirty, setIsDirty, confirmAction } = useUnsavedChanges();
    
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    // Lock body scroll when editor is active
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    useEffect(() => {
        setHasEdits(false);
        prevIsPublicRef.current = game.config.isPublic || false;
    }, [game.id, game.createdAt]);

    useEffect(() => {
        window.localStorage.setItem(GAME_EDITOR_PAGE_SIZE_KEY, String(itemsPerPage));
    }, [itemsPerPage]);

    const didMountRef = useRef(false);

    // Sync isPublic back to editedGame config when changed
    useEffect(() => {
        if (!didMountRef.current) {
            didMountRef.current = true;
            prevIsPublicRef.current = isPublic;
            return;
        }
        if (prevIsPublicRef.current === isPublic) return;
        prevIsPublicRef.current = isPublic;
        setEditedGame(prev => ({
            ...prev,
            config: { ...prev.config, isPublic }
        }));
        setHasEdits(true);
        setIsDirty(true);
    }, [isPublic, setIsDirty]);

    useEffect(() => {
        let cancelled = false;
        const refreshSignedUrls = async () => {
            if (!user) return;

            const paths = new Set<string>();
            const collect = (q?: GeneratedQuestion | null) => {
                const path = q?.image?.storagePath?.trim();
                if (path) paths.add(path);
            };

            (editedGame.questions || []).forEach(collect);
            (editedGame.jeopardyBoard || []).forEach((cat) => {
                (cat?.questions || []).forEach(collect);
            });
            (editedGame.pubQuizRounds || []).forEach((round) => {
                (round?.questions || []).forEach(collect);
            });

            if (!paths.size) return;

            try {
                const signed = await createSignedUrlsForGameAssets(Array.from(paths));
                if (cancelled || signed.size === 0) return;

                const applySigned = (q: GeneratedQuestion) => {
                    const path = q.image?.storagePath;
                    if (!path) return q;
                    const signedUrl = signed.get(path);
                    if (!signedUrl || signedUrl === q.image?.url) return q;
                    return { ...q, image: { ...q.image, url: signedUrl, source: q.image?.source || 'upload' } };
                };

                setEditedGame((prev) => {
                    const nextQuestions = (prev.questions || []).map(applySigned);
                    const nextJeopardy = prev.jeopardyBoard
                        ? prev.jeopardyBoard.map((cat) => ({
                              ...cat,
                              questions: (cat.questions || []).map(applySigned),
                          }))
                        : prev.jeopardyBoard;
                    const nextPubQuiz = prev.pubQuizRounds
                        ? prev.pubQuizRounds.map((round) => ({
                              ...round,
                              questions: (round.questions || []).map(applySigned),
                          }))
                        : prev.pubQuizRounds;

                    return {
                        ...prev,
                        questions: nextQuestions,
                        jeopardyBoard: nextJeopardy,
                        pubQuizRounds: nextPubQuiz,
                    };
                });
            } catch (err) {
                console.warn('Failed to refresh game image URLs:', err);
            }
        };

        void refreshSignedUrls();
        return () => {
            cancelled = true;
        };
    }, [editedGame.id, editedGame.createdAt, user]);

    useEffect(() => {
        if (editedGame.config.type !== GameType.WORD_WHEEL) return;
        setEditedGame((prev) => {
            const byLetter = new Map<string, GeneratedQuestion>();
            (prev.questions || []).forEach((question, index) => {
                const explicit = (question.letter || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1);
                const fallback = (question.answer || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1);
                const letter = explicit || WORD_WHEEL_LETTERS[index] || fallback || '';
                if (!WORD_WHEEL_LETTERS.includes(letter)) return;
                if (byLetter.has(letter)) return;
                byLetter.set(letter, question);
            });

            const nextQuestions: GeneratedQuestion[] = WORD_WHEEL_LETTERS.map((letter, index) => {
                const existing = byLetter.get(letter);
                return {
                    id: index,
                    letter,
                    question: (existing?.question || '').trim(),
                    answer: (existing?.answer || '').trim(),
                    answerAliases: Array.isArray(existing?.answerAliases)
                        ? existing!.answerAliases!.map((entry) => String(entry || '').trim()).filter(Boolean)
                        : [],
                    points: Number(existing?.points) > 0 ? Number(existing?.points) : 10,
                    isBonus: false,
                    image: existing?.image,
                };
            });

            const currentSerialized = JSON.stringify((prev.questions || []).map((q) => ({ ...q, id: undefined })));
            const nextSerialized = JSON.stringify(nextQuestions.map((q) => ({ ...q, id: undefined })));
            if (currentSerialized === nextSerialized) return prev;

            return { ...prev, questions: nextQuestions };
        });
    }, [editedGame.config.type]);

    const handleSave = async (opts?: { overrideIsPublic?: boolean }) => {
        if (editedGame.config.type === GameType.STOP_THE_FIRE && editedGame.config.stopTheFireMode === 'bank') {
            alert('Word Bank games cannot be saved. Switch to Manual or AI to save this game.');
            return null;
        }
        if (!user) {
            promptSignupForFree('Create a free account on the Teacher Plan to save games to your profile.');
            return null;
        }
        setSaveStatus('saving');
        const requestedPublic = opts?.overrideIsPublic ?? isPublic;
        const publishLockedForRemix = Boolean(editedGame.sourceGameId && !hasEdits && requestedPublic);
        const nextPublic = publishLockedForRemix ? false : requestedPublic;
        
        const shouldClearSourceId = hasEdits && Boolean(editedGame.sourceGameId);
        const originalCreatorName = editedGame.config.originalCreatorName || editedGame.authorName || user.name || 'Teacher';
        const originalCreatorId = editedGame.config.originalCreatorId || editedGame.authorId || user.id;
        const originalCreatorAvatar =
            editedGame.config.originalCreatorAvatar ?? editedGame.authorAvatar ?? editedGame.config.authorAvatar ?? user.avatar ?? null;
        const includeEditedBy = !editedGame.sourceGameId || hasEdits;

        const cleanedStopTheFireCategories =
            editedGame.config.type === GameType.STOP_THE_FIRE
                ? Array.from(
                      new Set(
                          (editedGame.stopTheFireCategories || [])
                              .map((cat) => cat.trim())
                              .filter(Boolean)
                      )
                  )
                : undefined;

        // Ensure config is synced
        const finalGame = {
            ...editedGame,
            authorId: user.id,
            authorName: user.name,
            sourceGameId: shouldClearSourceId ? undefined : editedGame.sourceGameId,
            config: {
                ...editedGame.config,
                isPublic: nextPublic,
                authorAvatar: user.avatar || null,
                originalCreatorName,
                originalCreatorId,
                originalCreatorAvatar,
                lastEditorName: includeEditedBy ? user.name : editedGame.config.lastEditorName,
                lastEditorId: includeEditedBy ? user.id : editedGame.config.lastEditorId
            },
            ...(cleanedStopTheFireCategories
                ? { stopTheFireCategories: cleanedStopTheFireCategories }
                : {})
        };

        // Async save with Author Name
        const result = await saveGameToLibrary(finalGame, user.id, user.name, user.schoolAccess?.schoolId);
        
        if (result.success) {
            const savedGame = { ...finalGame, id: result.id ?? finalGame.id };
            setSaveStatus('saved');
            setIsPublic(nextPublic);
            setIsDirty(false);
            setHasEdits(false);
            setEditedGame(savedGame);
            onSave(savedGame);
            if (publishLockedForRemix) {
                alert("Remixed community games stay private until you make a content edit.");
            }
            setTimeout(() => setSaveStatus('idle'), 2000);
            return savedGame;
        } else {
            setSaveStatus('idle');
            alert("Failed to save. Please try again.");
            return null;
        }
    };

    const handlePlay = () => {
        onPlay(editedGame);
    };

    const handleChange = (updater: (prev: GeneratedGame) => GeneratedGame) => {
        setEditedGame(updater);
        setIsDirty(true);
        setHasEdits(true);
        setSaveStatus('idle');
    };

    const handleTitleChange = (title: string) => {
        handleChange((prev) => ({ ...prev, title }));
    };

    const handleItemsPerPageChange = (value: number) => {
        setItemsPerPage(value);
        setCurrentPage(1);
    };

    const handleVisibilityToggle = () => {
        if (!user) {
            promptSignupForFree('Create a free account on the Teacher Plan to publish games to the community.');
            return;
        }
        if (!isPublic && editedGame.sourceGameId && !hasEdits) {
            alert("Make at least one edit before publishing a community game copy.");
            return;
        }
        setIsPublic(!isPublic);
    };

    const handleCopyInstructions = () => {
        navigator.clipboard.writeText(editedGame.config.customInstructions || "");
        setShowCopyToast(true);
        setTimeout(() => setShowCopyToast(false), 2000);
    };

    const handleTabsScroll = (direction: 'left' | 'right') => {
        const el = tabsScrollRef.current;
        if (!el) return;
        const amount = Math.round(el.clientWidth * 0.6);
        el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
    };

    const getShareUrl = (id: string) => {
        const base = (import.meta as any).env?.BASE_URL || '/';
        const normalizedBase = base.endsWith('/') ? base : `${base}/`;
        return `${getPublicAppUrl()}${normalizedBase}share/game/${id}`;
    };

    const handleShare = async () => {
        if (editedGame.config.type === GameType.STOP_THE_FIRE && editedGame.config.stopTheFireMode === 'bank') {
            alert('Word Bank games cannot be shared or saved. Switch to Manual or AI to save this game.');
            return;
        }
        if (!user) {
            promptSignupForFree('Create a free account on the Teacher Plan to share games.');
            return;
        }

        if (!hasEdits && editedGame.sourceGameId) {
            const shareUrl = getShareUrl(editedGame.sourceGameId);
            try {
                await navigator.clipboard.writeText(shareUrl);
                setShowShareToast(true);
                setTimeout(() => setShowShareToast(false), 2000);
            } catch (error) {
                alert(`Copy failed. Share this link:\n${shareUrl}`);
            }
            return;
        }

        let desiredPublic = isPublic;
        if (!desiredPublic) {
            const confirmPublic = window.confirm("This game is private. Make it public to share?");
            if (!confirmPublic) return;
            desiredPublic = true;
            setIsPublic(true);
        }

        let shareGame = editedGame;
        const needsSave = hasEdits;
        if (needsSave) {
            const confirmSave = window.confirm("Save this game to generate a share link?");
            if (!confirmSave) return;
            const saved = await handleSave({ overrideIsPublic: desiredPublic });
            if (!saved) return;
            shareGame = saved;
        } else if (desiredPublic !== shareGame.config.isPublic) {
            const saved = await handleSave({ overrideIsPublic: desiredPublic });
            if (!saved) return;
            shareGame = saved;
        } else if (!isUuid(shareGame.id)) {
            const saved = await handleSave({ overrideIsPublic: desiredPublic });
            if (!saved) return;
            shareGame = saved;
        }

        if (!shareGame.id || !isUuid(shareGame.id)) {
            alert("Please save this game before sharing.");
            return;
        }

        const shareUrl = getShareUrl(shareGame.id);
        try {
            await navigator.clipboard.writeText(shareUrl);
            setShowShareToast(true);
            setTimeout(() => setShowShareToast(false), 2000);
        } catch (error) {
            alert(`Copy failed. Share this link:\n${shareUrl}`);
        }
    };

    const handleStudentShare = async () => {
        if ([GameType.STOP_THE_FIRE, GameType.SURVEY_SHOWDOWN].includes(editedGame.config.type)) {
            alert('Student practice sharing is not available for this game type.');
            return;
        }

        if (!user) {
            promptSignupForFree('Create a free account on the Teacher Plan to share games with students.');
            return;
        }

        if (!hasEdits && editedGame.sourceGameId) {
            setStudentShareUrl(getStudentGameShareUrl(editedGame.sourceGameId));
            return;
        }

        let desiredPublic = isPublic;
        if (!desiredPublic) {
            const confirmPublic = window.confirm('This game must be public for student practice links. Make it public?');
            if (!confirmPublic) return;
            desiredPublic = true;
            setIsPublic(true);
        }

        let shareGame = editedGame;
        const needsSave = hasEdits;
        if (needsSave) {
            const confirmSave = window.confirm('Save this game to generate a student practice link?');
            if (!confirmSave) return;
            const saved = await handleSave({ overrideIsPublic: desiredPublic });
            if (!saved) return;
            shareGame = saved;
        } else if (desiredPublic !== shareGame.config.isPublic || !isUuid(shareGame.id)) {
            const saved = await handleSave({ overrideIsPublic: desiredPublic });
            if (!saved) return;
            shareGame = saved;
        }

        if (!shareGame.id || !isUuid(shareGame.id)) {
            alert('Please save this game before sharing it with students.');
            return;
        }

        setStudentShareUrl(getStudentGameShareUrl(shareGame.id));
    };

    const openImagePicker = (target: QuestionImageTarget, question?: GeneratedQuestion | null) => {
        setImagePickerTarget(target);
        const existingImageUrl = resolveGameQuestionImageUrl(question?.image);
        const initialSelection: StockImageSelection[] = question?.image?.stockId || existingImageUrl
            ? [{
                id: question.image?.stockId || existingImageUrl,
                url: existingImageUrl,
                thumbUrl: question.image?.thumbUrl || existingImageUrl,
                label: question.image?.alt || '',
                searchQuery: question.image?.searchQuery || '',
                provider: question.image?.provider,
                photographer: question.image?.photographer,
                sourcePageUrl: question.image?.sourcePageUrl,
            }]
            : [];
        setImagePickerSelection(initialSelection);
        const nextQuery = question?.image?.searchQuery || (question ? getGameImageQuery(question, editedGame.config) : '');
        setImagePickerQuery(nextQuery || editedGame.config.topic || '');
        setImagePickerOpen(true);
    };

    const closeImagePicker = () => {
        setImagePickerOpen(false);
        setImagePickerTarget(null);
    };

    const updateQuestionImage = (target: QuestionImageTarget, image?: GeneratedQuestion['image'] | null) => {
        handleChange((prev) => {
            if (target.scope === 'standard') {
                const newQuestions = [...prev.questions];
                if (!newQuestions[target.index]) return prev;
                newQuestions[target.index] = { ...newQuestions[target.index], image: image || undefined };
                return { ...prev, questions: newQuestions };
            }

            const isJeopardy = prev.config.type === GameType.JEOPARDY;
            const groups = isJeopardy ? [...(prev.jeopardyBoard || [])] : [...(prev.pubQuizRounds || [])];
            const group = groups[target.groupIndex];
            if (!group || !group.questions?.[target.questionIndex]) return prev;
            const nextQuestions = [...group.questions];
            nextQuestions[target.questionIndex] = { ...nextQuestions[target.questionIndex], image: image || undefined };
            groups[target.groupIndex] = { ...group, questions: nextQuestions };

            return isJeopardy ? { ...prev, jeopardyBoard: groups } : { ...prev, pubQuizRounds: groups };
        });
    };

    const handleImagePickerConfirm = (selection: StockImageSelection[]) => {
        const target = imagePickerTarget;
        if (!target) {
            closeImagePicker();
            return;
        }
        const first = selection[0];
        if (first) {
            updateQuestionImage(target, {
                url: first.url,
                thumbUrl: first.thumbUrl,
                source: 'stock',
                stockId: first.id,
                searchQuery: first.searchQuery || imagePickerQuery || first.label,
                alt: first.label,
                provider: first.provider || (/^pexels:/i.test(first.id) ? 'pexels' : 'pixabay'),
                photographer: first.photographer,
                sourcePageUrl: first.sourcePageUrl,
            });
        }
        closeImagePicker();
    };

    const handleImagePickerUpload = () => {
        if (!imagePickerTarget) return;
        setImageUploadTarget(imagePickerTarget);
        imageInputRef.current?.click();
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const target = imageUploadTarget;
        const file = e.target.files?.[0];
        if (!target || !file) {
            e.target.value = '';
            return;
        }

        (async () => {
            try {
                if (user) {
                    const optimized = await optimizeImageForUpload(file, { maxDimension: 1400, quality: 0.85, preferAlpha: true });
                    const uploaded = await uploadGameAsset({
                        userId: user.id,
                        blob: optimized.blob,
                        contentType: optimized.contentType,
                        extension: optimized.extension,
                        kind: 'question-image',
                        gameId: editedGame.id,
                    });
                    updateQuestionImage(target, {
                        url: uploaded.signedUrl,
                        storagePath: uploaded.path,
                        source: 'upload',
                        alt: file.name,
                    });
                } else {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        const dataUrl = ev.target?.result as string;
                        updateQuestionImage(target, {
                            url: dataUrl,
                            source: 'upload',
                            alt: file.name,
                        });
                    };
                    reader.readAsDataURL(file);
                }
            } catch (err) {
                console.error('Image upload failed:', err);
                alert('Failed to upload image. Please try again.');
            } finally {
                setImageUploadTarget(null);
                if (imagePickerOpen) {
                    closeImagePicker();
                }
            }
        })();

        e.target.value = '';
    };

    const addQuestion = () => {
        handleChange(prev => ({
            ...prev,
            questions: [
                ...prev.questions,
                {
                    id: prev.questions.length,
                    letter: (prev.config.type === GameType.WORD_WHEEL || (prev.config.type === GameType.BLOCK_BEATERS && prev.config.blockBeatersMode !== 'numbers')) ? (WORD_WHEEL_LETTERS[prev.questions.length % WORD_WHEEL_LETTERS.length] || '') : undefined,
                    question: '',
                    answer: '',
                    answerAliases: prev.config.type === GameType.WORD_WHEEL ? [] : undefined,
                    points: (prev.config.type === GameType.WORD_WHEEL || prev.config.type === GameType.BLOCK_BEATERS) ? 10 : prev.config.type === GameType.LIVE_QUIZ_CHALLENGE ? 1000 : 100,
                    isBonus: false,
                    difficulty: prev.config.type === GameType.DARTS ? 'easy' : undefined,
                    options: prev.config.type === GameType.LIVE_QUIZ_CHALLENGE ? ["", "", "", ""] : undefined,
                    surveyAnswers: prev.config.type === GameType.SURVEY_SHOWDOWN ? Array.from({ length: 10 }, () => ({ text: "", score: 0 })) : undefined
                }
            ]
        }));
        setCurrentPage(Math.ceil((displayQuestions.length + 1) / itemsPerPage));
    };

    const removeQuestion = (index: number) => {
        confirmAction("Delete this question permanently?", () => {
            handleChange(prev => ({
                ...prev,
                questions: prev.questions.filter((_, i) => i !== index)
            }));
        });
    };

    const getDefaultMcOptionCount = () => {
        if (editedGame.config.type === GameType.MILLIONAIRE || editedGame.config.type === GameType.LIVE_QUIZ_CHALLENGE) return 4;

        const parsed = Number(editedGame.config.mcOptionCount);
        const fixedCount = Number.isFinite(parsed) ? Math.min(4, Math.max(2, Math.round(parsed))) : 4;
        const strategy = editedGame.config.mcOptionStrategy;
        if (strategy === 'fixed') return fixedCount;
        if (!strategy && editedGame.config.questionType === 'multiple-choice') return fixedCount;
        return 3;
    };

    // --- STANDARD EDITOR HELPERS ---
    const updateQuestionType = (index: number, type: 'open' | 'multiple-choice') => {
        handleChange(prev => {
            const newQuestions = [...prev.questions];
            if (type === 'open') {
                newQuestions[index].options = undefined;
            } else {
                if (!newQuestions[index].options || newQuestions[index].options.length === 0) {
                    newQuestions[index].options = Array(getDefaultMcOptionCount()).fill("");
                }
            }
            return { ...prev, questions: newQuestions };
        });
    };

    const updateQuestionOptionCount = (index: number, count: number) => {
        handleChange(prev => {
            const newQuestions = [...prev.questions];
            const current = newQuestions[index].options || [];
            if (count > current.length) {
                const added = Array(count - current.length).fill("");
                newQuestions[index].options = [...current, ...added];
            } else {
                newQuestions[index].options = current.slice(0, count);
            }
            return { ...prev, questions: newQuestions };
        });
    };

    const updateQuestionDifficulty = (index: number, difficulty: string) => {
        handleChange(prev => {
            const newQuestions = [...prev.questions];
            newQuestions[index].difficulty = difficulty as 'easy' | 'medium' | 'hard';
            return { ...prev, questions: newQuestions };
        });
    };

    // --- JEOPARDY / PUB QUIZ EDITOR HELPERS ---
    const updateGroupedType = (qIdx: number, type: 'open' | 'multiple-choice') => {
        handleChange(prev => {
            const isJeopardy = prev.config.type === GameType.JEOPARDY;
            const groups = isJeopardy ? [...prev.jeopardyBoard!] : [...prev.pubQuizRounds!];
            
            // Shallow copy the group object
            groups[activeTab] = { ...groups[activeTab], questions: [...groups[activeTab].questions] };
            const q = groups[activeTab].questions[qIdx];
            
            if (type === 'open') {
                q.options = undefined;
            } else {
                if (!q.options || q.options.length === 0) {
                    q.options = Array(getDefaultMcOptionCount()).fill("");
                }
            }
            
            if (isJeopardy) return {...prev, jeopardyBoard: groups};
            else return {...prev, pubQuizRounds: groups};
        });
    };

    const updateGroupedOptionCount = (qIdx: number, count: number) => {
        handleChange(prev => {
            const isJeopardy = prev.config.type === GameType.JEOPARDY;
            const groups = isJeopardy ? [...prev.jeopardyBoard!] : [...prev.pubQuizRounds!];
            
            // Shallow copy the group object
            groups[activeTab] = { ...groups[activeTab], questions: [...groups[activeTab].questions] };
            const q = groups[activeTab].questions[qIdx];
            
            const current = q.options || [];
            if (count > current.length) {
                q.options = [...current, ...Array(count - current.length).fill("")];
            } else {
                q.options = current.slice(0, count);
            }
            
            if (isJeopardy) return {...prev, jeopardyBoard: groups};
            else return {...prev, pubQuizRounds: groups};
        });
    };

    const moveGroupedQuestion = (questionIndex: number, targetGroupIndex: number) => {
        if (targetGroupIndex === activeTab) return;

        handleChange(prev => {
            const isJeopardy = prev.config.type === GameType.JEOPARDY;
            const groups = isJeopardy ? [...(prev.jeopardyBoard || [])] : [...(prev.pubQuizRounds || [])];
            const sourceGroup = groups[activeTab];
            const targetGroup = groups[targetGroupIndex];
            if (!sourceGroup || !targetGroup || !sourceGroup.questions[questionIndex]) return prev;

            const sourceQuestions = [...sourceGroup.questions];
            const [movedQuestion] = sourceQuestions.splice(questionIndex, 1);
            const targetQuestions = [
                ...targetGroup.questions,
                {
                    ...movedQuestion,
                    category: targetGroup.name,
                },
            ];

            groups[activeTab] = { ...sourceGroup, questions: sourceQuestions };
            groups[targetGroupIndex] = { ...targetGroup, questions: targetQuestions };

            return isJeopardy ? { ...prev, jeopardyBoard: groups } : { ...prev, pubQuizRounds: groups };
        });
        setActiveTab(targetGroupIndex);
    };

    // Determine Group Data Source (Jeopardy or Pub Quiz)
    const isGrouped = editedGame.config.type === GameType.JEOPARDY || editedGame.config.type === GameType.PUB_QUIZ;
    const isStopTheFire = editedGame.config.type === GameType.STOP_THE_FIRE;
    const isStopTheFireBank = isStopTheFire && editedGame.config.stopTheFireMode === 'bank';
    const groups = editedGame.config.type === GameType.JEOPARDY ? editedGame.jeopardyBoard : editedGame.pubQuizRounds;
    const groupLabel = editedGame.config.type === GameType.JEOPARDY ? "Category" : "Round";
    const isMillionaire = editedGame.config.type === GameType.MILLIONAIRE;
    const isSurvey = editedGame.config.type === GameType.SURVEY_SHOWDOWN;
    const isWordWheel = editedGame.config.type === GameType.WORD_WHEEL;
    const isBlockBeatersLetters = editedGame.config.type === GameType.BLOCK_BEATERS && editedGame.config.blockBeatersMode !== 'numbers';
    const isLetterAnswerGame = isWordWheel || isBlockBeatersLetters;
    const isLiveQuiz = editedGame.config.type === GameType.LIVE_QUIZ_CHALLENGE;
    const liveQuizCompatibleCount = buildLiveQuizQuestionsFromGame(editedGame, []).questions.length;
    const canPlayLiveQuiz = Boolean(onLiveQuiz && liveQuizCompatibleCount > 0);
    const liveQuizSavedForHosting = Boolean(isUuid(editedGame.sourceGameId || editedGame.id)) && !hasEdits && saveStatus !== 'saving';
    const liveQuizNeedsSave = canPlayLiveQuiz && !liveQuizSavedForHosting;
    const createdById = editedGame.config.originalCreatorId || editedGame.authorId;
    const createdByName = editedGame.config.originalCreatorName || editedGame.authorName;
    const createdByAvatar = editedGame.config.originalCreatorAvatar || editedGame.authorAvatar || editedGame.config.authorAvatar || null;
    const editedByName = editedGame.config.lastEditorName;
    const createdDate = formatCreatedDate(editedGame.createdAt);
    const showEditedBy = Boolean(editedByName && createdByName && editedByName !== createdByName);
    const showCreatorAttribution = Boolean(createdByName || editedByName || editedGame.sourceGameId);
    const publicToggleLocked = Boolean(!isPublic && editedGame.sourceGameId && !hasEdits);

    // For Darts, we hide the reserve questions in the editor view (but keep them in data)
    // The main questions are indices 0 to config.questionCount - 1
    const baseQuestions = editedGame.questions ?? [];
    const displayQuestions = (editedGame.config.type === GameType.DARTS) 
        ? baseQuestions.slice(0, editedGame.config.questionCount) 
        : baseQuestions;
    const groupedQuestions = groups?.[activeTab]?.questions ?? [];
    const activeQuestionCount = isGrouped ? groupedQuestions.length : displayQuestions.length;
    const totalPages = Math.max(1, Math.ceil(activeQuestionCount / itemsPerPage));
    const pageStart = (currentPage - 1) * itemsPerPage;
    const pagedQuestions = displayQuestions.slice(pageStart, pageStart + itemsPerPage);
    const pagedGroupedQuestions = groupedQuestions.slice(pageStart, pageStart + itemsPerPage);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, itemsPerPage]);

    useEffect(() => {
        const firstKey = imageRepairKeys[0];
        if (!firstKey) return;
        const [scope, firstIndex, secondIndex] = firstKey.split(':');

        if (scope === 'standard') {
            const questionIndex = Number(firstIndex);
            if (Number.isFinite(questionIndex)) setCurrentPage(Math.floor(questionIndex / itemsPerPage) + 1);
            return;
        }

        const groupIndex = Number(firstIndex);
        const questionIndex = Number(secondIndex);
        if (!Number.isFinite(groupIndex) || !Number.isFinite(questionIndex)) return;
        setActiveTab(groupIndex);
        setCurrentPage(Math.floor(questionIndex / itemsPerPage) + 1);
    }, [imageRepairKeys, itemsPerPage]);

    return (
        <div className="fixed inset-0 top-16 bg-slate-50 z-50 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto px-4 py-8 relative z-20">
                        <div className="flex flex-col gap-4 mb-6">
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={onBack}
                                    className="self-start text-slate-500 hover:text-sky-600 flex items-center font-bold text-sm transition-colors cursor-pointer bg-slate-50 hover:bg-white px-3 py-2 rounded-lg border border-transparent hover:border-slate-200"
                                >
                                    <ArrowLeft size={18} className="mr-1" /> Back to Config
                                </button>
                                
                                {editedGame.config.isAI && (
                                    <button 
                                        onClick={() => setShowAiPrompt(true)}
                                        className="self-start text-indigo-500 hover:text-indigo-700 flex items-center font-bold text-sm transition-colors cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg border border-indigo-100"
                                        title="View AI Instructions"
                                    >
                                        <Sparkles size={16} className="mr-1" /> AI Prompt
                                    </button>
                                )}
                            </div>

                            {imageRepairCount > 0 && (
                                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-amber-900">
                                    <AlertCircle size={20} className="mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-black">
                                            {imageRepairCount} {imageRepairCount === 1 ? 'image needs' : 'images need'} replacing
                                        </p>
                                        <p className="mt-0.5 text-sm font-semibold text-amber-800">
                                            Review the question images below and use the image picker to choose replacements before playing.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <h1 className="font-display text-3xl font-bold text-slate-800 truncate">
                                            Editor: {editedGame.title}
                                        </h1>
                                        <span className="shrink-0 text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                                            {editedGame.config.type}
                                        </span>
                                    </div>
                                    {showCreatorAttribution && (
                                        <div className="mt-2 text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                                            <span>Originally created by</span>
                                            <Avatar
                                                name={createdByName || 'Unknown creator'}
                                                src={createdByAvatar}
                                                className="w-4 h-4"
                                                textClassName="text-[7px]"
                                            />
                                            {createdByName ? (
                                                <Link
                                                    to="/games"
                                                    state={
                                                        createdById
                                                            ? { view: 'community', creatorFilter: { id: createdById, name: createdByName } }
                                                            : { view: 'community', searchQuery: createdByName }
                                                    }
                                                    className="font-bold text-slate-700 hover:text-brand-blue hover:underline"
                                                    title={`View all games by ${createdByName}`}
                                                >
                                                    {createdByName}
                                                </Link>
                                            ) : (
                                                <span className="font-bold text-slate-700">Unknown creator</span>
                                            )}
                                            {showEditedBy && (
                                                <>
                                                    <span>, edited by</span>
                                                    <span className="font-bold text-slate-700">{editedByName}</span>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                                        <Calendar size={13} />
                                        <span>Date created: <span className="font-bold text-slate-700">{createdDate}</span></span>
                                    </div>
                                    <div className="mt-4 max-w-3xl">
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Game title</label>
                                        <input
                                            type="text"
                                            value={editedGame.title}
                                            onChange={(event) => handleTitleChange(event.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xl font-black text-slate-900 outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-sky-100"
                                            placeholder="Enter game title"
                                        />
                                    </div>
                                </div>
                                
                                <div className="w-full shrink-0 grid grid-cols-2 gap-2 pb-1 sm:grid-cols-3 lg:w-auto lg:min-w-[430px] lg:grid-cols-2 lg:pb-0 xl:min-w-[780px] xl:grid-cols-6">
                                    {/* VISIBILITY TOGGLE */}
                                    <div
                                        className={`w-full min-w-0 flex items-center bg-slate-200 rounded-full select-none p-0.5 h-10 lg:h-9 ${!user || publicToggleLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                                        onClick={handleVisibilityToggle}
                                        title={publicToggleLocked ? 'Make at least one edit before setting this game to Public.' : undefined}
                                    >
                                        <div className={`flex-1 min-w-0 flex items-center justify-center rounded-full font-bold leading-none transition-all px-1 py-2 text-[10px] sm:px-2 sm:py-1.5 sm:text-[9px] ${!isPublic ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
                                            <Lock size={10} className="mr-0.5 sm:mr-1 shrink-0" /> Pvt
                                        </div>
                                        <div className={`flex-1 min-w-0 flex items-center justify-center rounded-full font-bold leading-none transition-all px-1 py-2 text-[10px] sm:px-2 sm:py-1.5 sm:text-[9px] ${isPublic ? 'bg-green-500 text-white shadow-sm' : 'text-slate-500'}`}>
                                            <Globe size={10} className="mr-0.5 sm:mr-1 shrink-0" /> Pub
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleShare}
                                        disabled={saveStatus === 'saving' || isStopTheFireBank}
                                        className={`w-full min-w-0 h-10 lg:h-9 bg-white text-slate-700 font-bold leading-none shadow-sm border border-slate-300 hover:bg-slate-50 hover:border-brand-blue flex items-center justify-center gap-0.5 sm:gap-1.5 px-1 sm:px-2 cursor-pointer rounded-xl text-[12px] sm:text-[11px] tracking-tight ${isStopTheFireBank ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        title="Teacher share"
                                        aria-label="Teacher share"
                                    >
                                        <Share2 size={13} className="shrink-0 sm:hidden" />
                                        <Share2 size={12} className="hidden shrink-0 sm:block" />
                                        <span className="truncate">Teacher share</span>
                                    </button>

                                    <button
                                        onClick={handleStudentShare}
                                        disabled={saveStatus === 'saving' || [GameType.STOP_THE_FIRE, GameType.SURVEY_SHOWDOWN].includes(editedGame.config.type)}
                                        className={`w-full min-w-0 h-10 lg:h-9 bg-white text-slate-700 font-bold leading-none shadow-sm border border-slate-300 hover:bg-slate-50 hover:border-brand-blue flex items-center justify-center gap-0.5 sm:gap-1.5 px-1 sm:px-2 cursor-pointer rounded-xl text-[12px] sm:text-[11px] tracking-tight ${[GameType.STOP_THE_FIRE, GameType.SURVEY_SHOWDOWN].includes(editedGame.config.type) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        title="Student share"
                                        aria-label="Student share"
                                    >
                                        <QrCode size={13} className="shrink-0 sm:hidden" />
                                        <QrCode size={12} className="hidden shrink-0 sm:block" />
                                        <span className="truncate">Student share</span>
                                    </button>

                                    <button 
                                        onClick={handleSave} 
                                        disabled={saveStatus === 'saving' || isStopTheFireBank}
                                        className={`w-full min-w-0 h-10 lg:h-9 font-bold leading-none flex items-center justify-center gap-0.5 sm:gap-1.5 px-1 sm:px-2 transition-all shadow-sm border cursor-pointer rounded-xl text-[12px] sm:text-[11px] tracking-tight
                                            ${saveStatus === 'saved' 
                                                ? 'bg-green-50 text-green-600 border-green-200' 
                                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-brand-blue'} ${isStopTheFireBank ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        title={isStopTheFireBank ? 'Save disabled' : saveStatus === 'saving' ? 'Saving' : saveStatus === 'saved' ? 'Saved' : 'Save game'}
                                        aria-label={isStopTheFireBank ? 'Save disabled' : saveStatus === 'saving' ? 'Saving' : saveStatus === 'saved' ? 'Saved' : 'Save game'}
                                    >
                                        {saveStatus === 'saving' && <div className="animate-spin rounded-full h-3 w-3 border-2 border-slate-400 border-t-transparent shrink-0"></div>}
                                        {saveStatus === 'saved' && <Check size={13} className="shrink-0 sm:hidden" />}
                                        {saveStatus === 'saved' && <Check size={12} className="hidden shrink-0 sm:block" />}
                                        {saveStatus === 'idle' && <Save size={13} className="shrink-0 sm:hidden" />}
                                        {saveStatus === 'idle' && <Save size={12} className="hidden shrink-0 sm:block" />}
                                        <span className="truncate">{isStopTheFireBank ? 'Save Off' : saveStatus === 'saving' ? 'Saving' : saveStatus === 'saved' ? 'Saved' : 'Save'}</span>
                                    </button>
                                    {canPlayLiveQuiz && (
                                        <button
                                            onClick={() => onLiveQuiz?.(editedGame)}
                                            disabled={liveQuizNeedsSave}
                                            className={`w-full min-w-0 h-10 lg:h-9 font-bold leading-none shadow-md flex items-center justify-center gap-1.5 px-2 transition-transform rounded-xl text-[12px] sm:text-[11px] tracking-tight ${isLiveQuiz ? 'sm:col-span-2 lg:col-span-1' : ''} ${
                                                liveQuizNeedsSave
                                                    ? 'cursor-not-allowed bg-slate-200 text-slate-500 shadow-none'
                                                    : 'cursor-pointer bg-brand-blue text-white hover:bg-sky-600 hover:scale-[1.02]'
                                            }`}
                                            title={liveQuizNeedsSave ? 'Save this game before starting a live quiz' : 'Play live quiz'}
                                            aria-label="Play live quiz"
                                        >
                                            <Radio size={13} className="shrink-0 sm:hidden" />
                                            <Radio size={12} className="hidden shrink-0 sm:block" />
                                            <span className="truncate">{liveQuizNeedsSave ? 'Save first' : 'Live quiz'}</span>
                                        </button>
                                    )}
                                    {!isLiveQuiz && (
                                    <button 
                                        onClick={handlePlay} 
                                        className="w-full min-w-0 h-10 lg:h-9 bg-brand-yellow text-slate-900 font-bold leading-none shadow-md hover:bg-yellow-300 flex items-center justify-center gap-1.5 px-2 hover:scale-[1.02] transition-transform cursor-pointer rounded-xl text-[12px] sm:text-[11px] tracking-tight"
                                        title="Play game"
                                        aria-label="Play game"
                                    >
                                        <Play size={13} className="shrink-0 sm:hidden" />
                                        <Play size={12} className="hidden shrink-0 sm:block" />
                                        <span className="truncate">Play</span>
                                    </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {!user && (
                        <div className="mb-6 bg-sky-50 p-4 rounded-xl flex items-center text-sky-800 text-sm border border-sky-100">
                            <AlertCircle size={16} className="mr-2" />
                            <span>You are editing as a guest. Log in to save this game permanently to your profile and share it with the community.</span>
                        </div>
                        )}

                        {isStopTheFire ? (
                            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                                <div className="p-8">
                                    {(editedGame.config.stopTheFireMode === 'manual' || editedGame.config.stopTheFireMode === 'ai') ? (
                                        <div className="space-y-6">
                                            <div className="flex items-start gap-4">
                                                <div className="bg-orange-100 text-orange-700 p-3 rounded-xl">
                                                    <Sparkles size={22} />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold text-slate-800">Custom Categories</h2>
                                                    <p className="text-slate-600 mt-1">
                                                        These categories are your word bank. Every save updates this bank.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Add multiple categories</label>
                                                <textarea
                                                    value={bulkCategoryInput}
                                                    onChange={(e) => setBulkCategoryInput(e.target.value)}
                                                    placeholder="Paste categories here, one per line."
                                                    className="w-full min-h-[90px] p-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-200 outline-none"
                                                />
                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const incoming = bulkCategoryInput
                                                                .split(/\r?\n|,/)
                                                                .map((cat) => cat.trim())
                                                                .filter(Boolean);
                                                            if (incoming.length === 0) return;
                                                            handleChange((prev) => {
                                                                const existing = (prev.stopTheFireCategories || [])
                                                                    .map((cat) => cat.trim())
                                                                    .filter(Boolean);
                                                                const merged = Array.from(new Set([...existing, ...incoming]));
                                                                return { ...prev, stopTheFireCategories: merged };
                                                            });
                                                            setBulkCategoryInput('');
                                                        }}
                                                        className="px-4 py-2 rounded-lg bg-orange-500 text-white font-bold text-sm hover:bg-orange-600"
                                                    >
                                                        Add to Bank
                                                    </button>
                                                    <span className="text-xs text-slate-400">
                                                        Tips: one category per line. Duplicates are ignored.
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-2">
                                                {(editedGame.stopTheFireCategories || ['']).map((cat, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-400 w-6">{idx + 1}.</span>
                                                        <input
                                                            type="text"
                                                            value={cat}
                                                            onChange={(e) => handleChange(prev => {
                                                                const next = [...(prev.stopTheFireCategories || [])];
                                                                while (next.length <= idx) next.push('');
                                                                next[idx] = e.target.value;
                                                                return { ...prev, stopTheFireCategories: next };
                                                            })}
                                                            className="flex-1 p-2 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-orange-300 outline-none"
                                                            placeholder="e.g., Things in a kitchen"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleChange(prev => {
                                                                const next = (prev.stopTheFireCategories || []).filter((_, i) => i !== idx);
                                                                return { ...prev, stopTheFireCategories: next.length ? next : [''] };
                                                            })}
                                                            className="px-2 py-1 text-xs font-bold text-slate-500 hover:text-red-600"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleChange(prev => ({
                                                    ...prev,
                                                    stopTheFireCategories: [...(prev.stopTheFireCategories || []), '']
                                                }))}
                                                className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 font-bold hover:border-orange-300 hover:text-orange-600 transition-colors"
                                            >
                                                + Add Category
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-4">
                                            <div className="bg-orange-100 text-orange-700 p-3 rounded-xl">
                                                <Sparkles size={22} />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-slate-800">Stop the Fire uses a built-in category bank</h2>
                                                <p className="text-slate-600 mt-1">
                                                    You will choose difficulty, category count, timer, and the round letter inside the game setup card.
                                                </p>
                                                <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
                                                    Tip: Use the in-game setup side to preview the letter before starting the round.
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                        /* GROUPED EDITOR (JEOPARDY / PUB QUIZ) */
                        isGrouped && groups ? (
                            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                                {/* Tabs */}
                            <div className="relative">
                                <div ref={tabsScrollRef} className="flex overflow-x-auto bg-slate-100 border-b border-slate-200 no-scrollbar">
                                    {groups.map((cat, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => setActiveTab(idx)}
                                            className={`px-4 py-3 sm:px-6 sm:py-4 font-bold text-xs sm:text-sm whitespace-normal sm:whitespace-nowrap text-center sm:text-left leading-tight break-words transition-colors min-w-[110px] sm:min-w-[120px] max-w-[140px] sm:max-w-none border-r border-slate-200 sm:border-r-0 cursor-pointer last:border-r-0
                                                ${activeTab === idx 
                                                    ? 'bg-white text-sky-600 border-t-2 border-t-sky-600 shadow-sm relative z-10' 
                                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                                        >
                                            {cat.name || `${groupLabel} ${idx + 1}`}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleTabsScroll('left')}
                                    className="sm:hidden absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/90 border border-slate-200 text-slate-400 shadow-sm hover:text-slate-600 transition-colors"
                                    aria-label="Scroll tabs left"
                                >
                                    <ChevronLeft size={16} className="mx-auto" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleTabsScroll('right')}
                                    className="sm:hidden absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/90 border border-slate-200 text-slate-400 shadow-sm hover:text-slate-600 transition-colors"
                                    aria-label="Scroll tabs right"
                                >
                                    <ChevronRight size={16} className="mx-auto" />
                                </button>
                            </div>

                                <div className="p-6">
                                    <div className="mb-8">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Current {groupLabel} Name</label>
                                        <input 
                                            type="text" 
                                            value={groups[activeTab].name} 
                                            onChange={(e) => handleChange(prev => {
                                                const newGroups = editedGame.config.type === GameType.JEOPARDY ? [...prev.jeopardyBoard!] : [...prev.pubQuizRounds!];
                                                // Create a shallow copy of the object to avoid mutation
                                                newGroups[activeTab] = { ...newGroups[activeTab], name: e.target.value };
                                                return editedGame.config.type === GameType.JEOPARDY 
                                                    ? {...prev, jeopardyBoard: newGroups} 
                                                    : {...prev, pubQuizRounds: newGroups};
                                            })}
                                            className="w-full p-4 text-xl font-bold border border-slate-200 rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-sky-100 outline-none transition-all bg-slate-50/50"
                                            placeholder={`Enter ${groupLabel} Name`}
                                        />
                                    </div>

                                    <div className="mb-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                                        <p className="text-xs font-medium text-slate-500">
                                            Showing {groupedQuestions.length === 0 ? 0 : pageStart + 1}-{Math.min(pageStart + itemsPerPage, groupedQuestions.length)} of {groupedQuestions.length} questions
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                                disabled={currentPage === 1}
                                                className={editorPageButtonClass}
                                            >
                                                <ChevronLeft size={18} />
                                            </button>
                                            <span className="text-sm font-bold text-slate-600">
                                                Page {currentPage} of {totalPages}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                                disabled={currentPage === totalPages}
                                                className={editorPageButtonClass}
                                            >
                                                <ChevronRight size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {pagedGroupedQuestions.map((q, index) => {
                                            const qIdx = pageStart + index;
                                            const repairKey = `${editedGame.config.type === GameType.JEOPARDY ? 'jeopardy' : 'pubquiz'}:${activeTab}:${qIdx}`;
                                            const needsImageRepair = imageRepairKeySet.has(repairKey);
                                            const imageUrl = resolveGameQuestionImageUrl(q.image);
                                            const imageAlt = q.image?.alt || 'Question image';
                                            return (
                                            <div key={qIdx} className={`bg-slate-50 p-6 rounded-xl border transition-colors ${needsImageRepair ? 'border-amber-400 ring-4 ring-amber-100' : 'border-slate-200 hover:border-sky-200'}`}>
                                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-bold text-sky-700 bg-sky-100 px-3 py-1 rounded-full text-sm">
                                                            {editedGame.config.type === GameType.JEOPARDY ? `${q.points} Points` : `Question ${qIdx + 1}`}
                                                        </span>
                                                        {needsImageRepair && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">Replace this image</span>}
                                                    </div>
                                                    
                                                    {/* TYPE TOGGLE */}
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {groups && groups.length > 1 && (
                                                            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1">
                                                                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{groupLabel}</span>
                                                                <select
                                                                    value={activeTab}
                                                                    onChange={(event) => moveGroupedQuestion(qIdx, Number(event.target.value))}
                                                                    className="max-w-[180px] bg-transparent text-xs font-bold text-slate-700 outline-none"
                                                                >
                                                                    {groups.map((group, groupIndex) => (
                                                                        <option key={`${group.name}-${groupIndex}`} value={groupIndex}>
                                                                            {group.name || `${groupLabel} ${groupIndex + 1}`}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </label>
                                                        )}
                                                        <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-slate-200">
                                                            <button 
                                                                onClick={() => updateGroupedType(qIdx, 'open')}
                                                                className={`px-2 py-1 text-[10px] font-bold rounded ${!q.options ? 'bg-slate-100 text-slate-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                                disabled={!q.options}
                                                            >
                                                                Open
                                                            </button>
                                                            <button 
                                                                onClick={() => updateGroupedType(qIdx, 'multiple-choice')}
                                                                className={`px-2 py-1 text-[10px] font-bold rounded ${q.options ? 'bg-sky-100 text-sky-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                                disabled={!!q.options}
                                                            >
                                                                Multi-Choice
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Question / Clue</label>
                                                        <textarea 
                                                            value={q.question}
                                                            onChange={(e) => handleChange(prev => {
                                                                const newGroups = editedGame.config.type === GameType.JEOPARDY ? [...prev.jeopardyBoard!] : [...prev.pubQuizRounds!];
                                                                // Deep copy questions array for this group
                                                                newGroups[activeTab] = { 
                                                                    ...newGroups[activeTab], 
                                                                    questions: [...newGroups[activeTab].questions] 
                                                                };
                                                                newGroups[activeTab].questions[qIdx] = { 
                                                                    ...newGroups[activeTab].questions[qIdx], 
                                                                    question: e.target.value 
                                                                };
                                                                return editedGame.config.type === GameType.JEOPARDY ? {...prev, jeopardyBoard: newGroups} : {...prev, pubQuizRounds: newGroups};
                                                            })}
                                                            className="w-full p-3 rounded-lg border border-slate-300 text-sm h-28 resize-none focus:ring-2 focus:ring-sky-200 outline-none transition-all"
                                                            placeholder="Enter the question here..."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Answer</label>
                                                        <textarea 
                                                            value={q.answer}
                                                            onChange={(e) => handleChange(prev => {
                                                                const newGroups = editedGame.config.type === GameType.JEOPARDY ? [...prev.jeopardyBoard!] : [...prev.pubQuizRounds!];
                                                                newGroups[activeTab] = { 
                                                                    ...newGroups[activeTab], 
                                                                    questions: [...newGroups[activeTab].questions] 
                                                                };
                                                                newGroups[activeTab].questions[qIdx] = { 
                                                                    ...newGroups[activeTab].questions[qIdx], 
                                                                    answer: e.target.value 
                                                                };
                                                                return editedGame.config.type === GameType.JEOPARDY ? {...prev, jeopardyBoard: newGroups} : {...prev, pubQuizRounds: newGroups};
                                                            })}
                                                            className="w-full p-3 rounded-lg border border-slate-300 text-sm h-28 resize-none focus:ring-2 focus:ring-green-200 outline-none transition-all"
                                                            placeholder="Enter the answer here..."
                                                        />
                                                    </div>
                                                </div>

                                                <div className="mt-4 pt-4 border-t border-slate-200">
                                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Question Image (optional)</label>
                                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                                        <div className="w-full md:w-56">
                                                            {imageUrl ? (
                                                                <div className="relative w-full aspect-video bg-white border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center">
                                                                    <img
                                                                        src={imageUrl}
                                                                        alt={imageAlt}
                                                                        className="max-h-full max-w-full object-contain"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="w-full aspect-video bg-white border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-xs text-slate-400 font-bold">
                                                                    No image selected
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => openImagePicker({ scope: 'grouped', groupIndex: activeTab, questionIndex: qIdx }, q)}
                                                                className="px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                                                            >
                                                                Pick from library
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setImageUploadTarget({ scope: 'grouped', groupIndex: activeTab, questionIndex: qIdx });
                                                                    imageInputRef.current?.click();
                                                                }}
                                                                className="px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                                                            >
                                                                Upload
                                                            </button>
                                                            {imageUrl && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateQuestionImage({ scope: 'grouped', groupIndex: activeTab, questionIndex: qIdx }, null)}
                                                                    className="px-3 py-2 rounded-lg text-xs font-bold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                                                >
                                                                    Remove
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* OPTIONS EDITOR */}
                                                {q.options && q.options.length > 0 && (
                                                    <div className="mt-4 pt-4 border-t border-slate-200 animate-fade-in">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <label className="block text-xs font-bold text-slate-500 uppercase">Multiple Choice Options</label>
                                                            <div className="flex bg-white rounded border border-slate-200 overflow-hidden">
                                                                {[2, 3, 4].map(num => (
                                                                    <button 
                                                                        key={num}
                                                                        onClick={() => updateGroupedOptionCount(qIdx, num)}
                                                                        className={`px-2 py-0.5 text-[10px] font-bold transition-colors ${q.options!.length === num ? 'bg-brand-yellow text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
                                                                    >
                                                                        {num} Opts
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            {q.options.map((opt, optIdx) => (
                                                                <div key={optIdx} className="relative">
                                                                    <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold bg-slate-100 px-1.5 py-0.5 rounded">{String.fromCharCode(65 + optIdx)}</span>
                                                                    <input
                                                                        type="text"
                                                                        value={opt}
                                                                        onChange={(e) => handleChange(prev => {
                                                                            const newGroups = editedGame.config.type === GameType.JEOPARDY ? [...prev.jeopardyBoard!] : [...prev.pubQuizRounds!];
                                                                            newGroups[activeTab] = { ...newGroups[activeTab], questions: [...newGroups[activeTab].questions] };
                                                                            const newOptions = [...(newGroups[activeTab].questions[qIdx].options || [])];
                                                                            newOptions[optIdx] = e.target.value;
                                                                            newGroups[activeTab].questions[qIdx] = { ...newGroups[activeTab].questions[qIdx], options: newOptions };
                                                                            return editedGame.config.type === GameType.JEOPARDY ? {...prev, jeopardyBoard: newGroups} : {...prev, pubQuizRounds: newGroups};
                                                                        })}
                                                                        className="w-full pl-10 p-2 rounded border border-slate-300 text-sm outline-none focus:border-brand-blue"
                                                                        placeholder={`Option ${optIdx + 1}`}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )})}
                                    </div>

                                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                                disabled={currentPage === 1}
                                                className={editorPageButtonClass}
                                            >
                                                <ChevronLeft size={18} />
                                            </button>
                                            <span className="text-sm font-bold text-slate-600">
                                                Page {currentPage} of {totalPages}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                                disabled={currentPage === totalPages}
                                                className={editorPageButtonClass}
                                            >
                                                <ChevronRight size={18} />
                                            </button>
                                        </div>
                                        <div className="relative ml-auto min-w-[120px]">
                                            <List className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <select
                                                value={itemsPerPage}
                                                onChange={(event) => handleItemsPerPageChange(Number(event.target.value))}
                                                className={editorPageSizeSelectClass}
                                            >
                                                {GAME_EDITOR_PAGE_SIZE_OPTIONS.map((size) => (
                                                    <option key={size} value={size}>{size} per page</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // STANDARD EDITOR (Trivia, Snakes, Darts, Millionaire, Survey)
                            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden p-6">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
                                    <p className="text-xs text-slate-500 font-medium">
                                        Showing {displayQuestions.length === 0 ? 0 : pageStart + 1}-{Math.min(pageStart + itemsPerPage, displayQuestions.length)} of {displayQuestions.length} questions
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className={editorPageButtonClass}
                                        >
                                            <ChevronLeft size={18} />
                                        </button>
                                        <span className="text-sm font-bold text-slate-600">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage === totalPages}
                                            className={editorPageButtonClass}
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {pagedQuestions.map((q, index) => {
                                        const questionIndex = pageStart + index;
                                        const needsImageRepair = imageRepairKeySet.has(`standard:${questionIndex}`);
                                        const imageUrl = resolveGameQuestionImageUrl(q.image);
                                        const imageAlt = q.image?.alt || 'Question image';
                                        const wordWheelLetter = (q.letter || WORD_WHEEL_LETTERS[questionIndex % WORD_WHEEL_LETTERS.length] || '').toUpperCase();
                                        const wordWheelRule = (editedGame.config.wordWheelLetterRule || 'contains-hard') as 'starts-with' | 'contains-hard';
                                        const activeLetterRule = isWordWheel ? wordWheelRule : 'starts-with';
                                        const wordWheelRuleHint = getWordWheelRuleHint(activeLetterRule, wordWheelLetter);
                                        const answerFitsWordWheelRule = !isLetterAnswerGame || answerMatchesWordWheelRule(q.answer, wordWheelLetter, activeLetterRule);
                                        return (
                                        <div key={questionIndex} className={`bg-slate-50 p-6 rounded-xl border relative transition-colors ${needsImageRepair ? 'border-amber-400 ring-4 ring-amber-100' : 'border-slate-200 hover:border-sky-200'}`}>
                                            {!isWordWheel && (
                                                <button 
                                                    onClick={() => removeQuestion(questionIndex)}
                                                    className="absolute top-4 right-4 text-slate-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                                    title="Delete Question"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                            <div className="flex items-center justify-between mb-4 pr-10">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-slate-200 text-slate-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                                                        {questionIndex + 1}
                                                    </span>
                                                    {needsImageRepair && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">Replace this image</span>}

                                                    {isLetterAnswerGame && (
                                                        <span className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-xs font-bold uppercase ml-1">
                                                            Letter {wordWheelLetter || '?'}
                                                        </span>
                                                    )}
                                                    
                                                    {/* Millionaire Label */}
                                                    {isMillionaire && (
                                                        <span className="bg-brand-yellow text-slate-900 px-3 py-1 rounded-full text-xs font-bold uppercase ml-2">
                                                            Level {questionIndex + 1}
                                                        </span>
                                                    )}

                                                    {/* Points Editor (Hidden for Darts, Millionaire, Survey, Word Wheel) */}
                                                    {editedGame.config.type !== GameType.DARTS && !isMillionaire && !isSurvey && !isLetterAnswerGame && (
                                                        <div className="flex items-center ml-2 bg-white px-2 py-1 rounded border border-slate-200">
                                                            <Coins size={14} className="text-brand-yellow mr-2" />
                                                            <input 
                                                                type="number"
                                                                value={q.points}
                                                                onChange={(e) => handleChange(prev => {
                                                                    const newQuestions = [...prev.questions];
                                                                    newQuestions[questionIndex].points = parseInt(e.target.value) || 0;
                                                                    return {...prev, questions: newQuestions};
                                                                })}
                                                                className="w-12 p-0.5 text-xs border-none text-center focus:ring-0 outline-none font-bold"
                                                            />
                                                            <span className="text-[10px] font-bold text-slate-400 ml-1">pts</span>
                                                        </div>
                                                    )}

                                                    {/* Darts Difficulty Selector */}
                                                    {editedGame.config.type === GameType.DARTS && (
                                                        <div className="flex items-center ml-2">
                                                            <select 
                                                                value={q.difficulty || 'easy'}
                                                                onChange={(e) => updateQuestionDifficulty(questionIndex, e.target.value)}
                                                                className={`text-xs font-bold uppercase py-1 px-2 rounded border border-slate-200 outline-none
                                                                    ${q.difficulty === 'hard' ? 'text-red-600 bg-red-50' : 
                                                                      q.difficulty === 'medium' ? 'text-yellow-600 bg-yellow-50' : 
                                                                      'text-green-600 bg-green-50'}`}
                                                            >
                                                                <option value="easy">Easy</option>
                                                                <option value="medium">Medium</option>
                                                                <option value="hard">Hard</option>
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* QUESTION TYPE TOGGLE BAR - Hidden for Millionaire, Survey, and Word Wheel */}
                                            {!isMillionaire && !isSurvey && !isLetterAnswerGame && (
                                                <div className="flex flex-wrap items-center gap-4 mb-4 bg-slate-100 p-2 rounded-lg border border-slate-200">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Format:</span>
                                                        <div className="flex bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
                                                            <button 
                                                                onClick={() => updateQuestionType(questionIndex, 'open')}
                                                                className={`px-3 py-1 text-xs font-bold transition-colors ${!q.options || q.options.length === 0 ? 'bg-brand-blue text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                                                            >
                                                                Open
                                                            </button>
                                                            <button 
                                                                onClick={() => updateQuestionType(questionIndex, 'multiple-choice')}
                                                                className={`px-3 py-1 text-xs font-bold transition-colors ${q.options && q.options.length > 0 ? 'bg-brand-blue text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                                                            >
                                                                Multi-Choice
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    {q.options && q.options.length > 0 && (
                                                        <div className="flex items-center gap-2 animate-fade-in">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Options:</span>
                                                            <div className="flex bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
                                                                {[2, 3, 4].map(num => (
                                                                    <button 
                                                                        key={num}
                                                                        onClick={() => updateQuestionOptionCount(questionIndex, num)}
                                                                        className={`px-3 py-1 text-xs font-bold transition-colors ${q.options!.length === num ? 'bg-brand-yellow text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
                                                                    >
                                                                        {num}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Question / Prompt</label>
                                                    <textarea 
                                                        value={q.question}
                                                        onChange={(e) => handleChange(prev => {
                                                            const newQuestions = [...prev.questions];
                                                            newQuestions[questionIndex].question = e.target.value;
                                                            return {...prev, questions: newQuestions};
                                                        })}
                                                        className="w-full p-3 rounded-lg border border-slate-300 text-sm h-24 resize-none focus:ring-2 focus:ring-sky-200 outline-none"
                                                        placeholder="Type question here..."
                                                    />
                                                </div>
                                                {!isSurvey && (
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Answer {isMillionaire && <span className="text-red-500">(Must match option text)</span>}</label>
                                                    <textarea 
                                                        value={q.answer}
                                                        onChange={(e) => handleChange(prev => {
                                                            const newQuestions = [...prev.questions];
                                                            newQuestions[questionIndex].answer = e.target.value;
                                                            return {...prev, questions: newQuestions};
                                                        })}
                                                        className="w-full p-3 rounded-lg border border-slate-300 text-sm h-24 resize-none focus:ring-2 focus:ring-green-200 outline-none"
                                                            placeholder="Type answer here..."
                                                        />
                                                        {isLetterAnswerGame && wordWheelLetter && (
                                                            <p className={`mt-2 text-xs font-semibold ${answerFitsWordWheelRule ? 'text-teal-700' : 'text-red-600'}`}>
                                                                Rule for {wordWheelLetter}: {wordWheelRuleHint}
                                                            </p>
                                                        )}
                                                        {isLetterAnswerGame && wordWheelLetter && !answerFitsWordWheelRule && q.answer.trim() && (
                                                            <p className="mt-1 text-xs text-red-500">
                                                                Current answer does not match this letter rule.
                                                            </p>
                                                        )}
                                                    </div>
                                                )}

                                                {!isSurvey && !isLetterAnswerGame && (
                                                    <div className="md:col-span-2">
                                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Category</label>
                                                        <input
                                                            type="text"
                                                            value={q.category || ''}
                                                            onChange={(e) => handleChange(prev => {
                                                                const newQuestions = [...prev.questions];
                                                                newQuestions[questionIndex].category = e.target.value;
                                                                return { ...prev, questions: newQuestions };
                                                            })}
                                                            className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                                                            placeholder="Optional, e.g. Past perfect 1"
                                                        />
                                                        <p className="mt-1 text-xs font-semibold text-slate-400">
                                                            Used when this question set is played as Jeopardy or Pub Quiz.
                                                        </p>
                                                    </div>
                                                )}
                                                
                                                {/* SURVEY ANSWERS EDITOR */}
                                                {isSurvey && (
                                                    <div className="col-span-1 md:col-span-2 bg-white rounded border border-slate-200 p-4">
                                                        <label className="block text-xs font-bold text-slate-500 mb-3 uppercase">Top 10 Survey Answers</label>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                                            {(q.surveyAnswers || Array.from({ length: 10 }, () => ({text:"", score:0}))).map((ans, aIdx) => (
                                                                <div key={aIdx} className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2 items-start sm:items-center">
                                                                    <div className="w-7 sm:w-8 flex items-center justify-center font-bold text-slate-400">#{aIdx+1}</div>
                                                                    <textarea 
                                                                        value={ans.text} 
                                                                        placeholder="Answer"
                                                                        rows={2}
                                                                        onChange={(e) => handleChange(prev => {
                                                                            const newQuestions = [...prev.questions];
                                                                            const newAnswers = [...(newQuestions[questionIndex].surveyAnswers || [])];
                                                                            // Ensure array size
                                                                            while(newAnswers.length <= aIdx) newAnswers.push({text:"", score:0});
                                                                            newAnswers[aIdx] = { ...newAnswers[aIdx], text: e.target.value };
                                                                            newQuestions[questionIndex].surveyAnswers = newAnswers;
                                                                            return {...prev, questions: newQuestions};
                                                                        })}
                                                                        className="w-full min-w-0 p-2 text-sm border border-slate-300 rounded leading-snug resize-none"
                                                                    />
                                                                    <input 
                                                                        type="number" 
                                                                        value={ans.score} 
                                                                        placeholder="Pts"
                                                                        onChange={(e) => handleChange(prev => {
                                                                            const newQuestions = [...prev.questions];
                                                                            const newAnswers = [...(newQuestions[questionIndex].surveyAnswers || [])];
                                                                            while(newAnswers.length <= aIdx) newAnswers.push({text:"", score:0});
                                                                            newAnswers[aIdx] = { ...newAnswers[aIdx], score: parseInt(e.target.value) || 0 };
                                                                            newQuestions[questionIndex].surveyAnswers = newAnswers;
                                                                            return {...prev, questions: newQuestions};
                                                                        })}
                                                                        className="w-16 sm:w-16 p-2 text-sm border border-slate-300 rounded text-center"
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {isLetterAnswerGame && (
                                                <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Letter</label>
                                                        <input
                                                            type="text"
                                                            value={(q.letter || WORD_WHEEL_LETTERS[questionIndex % WORD_WHEEL_LETTERS.length] || '').toUpperCase()}
                                                            onChange={(e) => handleChange(prev => {
                                                                const newQuestions = [...prev.questions];
                                                                newQuestions[questionIndex].letter = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1);
                                                                return { ...prev, questions: newQuestions };
                                                            })}
                                                            className="w-full p-3 rounded-lg border border-slate-300 text-sm uppercase tracking-wider font-bold focus:ring-2 focus:ring-teal-200 outline-none"
                                                            maxLength={1}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Accepted Variants (comma separated)</label>
                                                        <input
                                                            type="text"
                                                            value={(q.answerAliases || []).join(', ')}
                                                            onChange={(e) => handleChange(prev => {
                                                                const newQuestions = [...prev.questions];
                                                                newQuestions[questionIndex].answerAliases = e.target.value
                                                                    .split(',')
                                                                    .map((item) => item.trim())
                                                                    .filter(Boolean);
                                                                return { ...prev, questions: newQuestions };
                                                            })}
                                                            className="w-full p-3 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-200 outline-none"
                                                            placeholder="e.g., automobile, car"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-4 pt-4 border-t border-slate-200">
                                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Question Image (optional)</label>
                                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                                    <div className="w-full md:w-56">
                                                        {imageUrl ? (
                                                            <div className="relative w-full aspect-video bg-white border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center">
                                                                <img
                                                                    src={imageUrl}
                                                                    alt={imageAlt}
                                                                    className="max-h-full max-w-full object-contain"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="w-full aspect-video bg-white border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-xs text-slate-400 font-bold">
                                                                No image selected
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => openImagePicker({ scope: 'standard', index: questionIndex }, q)}
                                                            className="px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                                                        >
                                                            Pick from library
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setImageUploadTarget({ scope: 'standard', index: questionIndex });
                                                                imageInputRef.current?.click();
                                                            }}
                                                            className="px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                                                        >
                                                            Upload
                                                        </button>
                                                        {imageUrl && (
                                                            <button
                                                                type="button"
                                                                onClick={() => updateQuestionImage({ scope: 'standard', index: questionIndex }, null)}
                                                                className="px-3 py-2 rounded-lg text-xs font-bold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                                            >
                                                                Remove
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* OPTIONS EDITOR (MC) */}
                                            {q.options && q.options.length > 0 && !isSurvey && !isLetterAnswerGame && (
                                                <div className="mt-4 pt-4 border-t border-slate-200 animate-fade-in">
                                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Multiple Choice Options</label>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {q.options.map((opt, optIdx) => (
                                                            <div key={optIdx} className="relative">
                                                                <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold bg-slate-100 px-1.5 py-0.5 rounded">{String.fromCharCode(65 + optIdx)}</span>
                                                                <input
                                                                    type="text"
                                                                    value={opt}
                                                                    onChange={(e) => handleChange(prev => {
                                                                        const newQuestions = [...prev.questions];
                                                                        const newOptions = [...(newQuestions[questionIndex].options || [])];
                                                                        newOptions[optIdx] = e.target.value;
                                                                        newQuestions[questionIndex].options = newOptions;
                                                                        return {...prev, questions: newQuestions};
                                                                    })}
                                                                    className="w-full pl-10 p-2 rounded border border-slate-300 text-sm outline-none focus:border-brand-blue"
                                                                    placeholder={`Option ${optIdx + 1}`}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )})}
                                </div>

                                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className={editorPageButtonClass}
                                        >
                                            <ChevronLeft size={18} />
                                        </button>
                                        <span className="text-sm font-bold text-slate-600">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage === totalPages}
                                            className={editorPageButtonClass}
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                    <div className="relative ml-auto min-w-[120px]">
                                        <List className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <select
                                            value={itemsPerPage}
                                            onChange={(event) => handleItemsPerPageChange(Number(event.target.value))}
                                            className={editorPageSizeSelectClass}
                                        >
                                            {GAME_EDITOR_PAGE_SIZE_OPTIONS.map((size) => (
                                                <option key={size} value={size}>{size} per page</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                
                                {!isWordWheel && (
                                    <button 
                                        onClick={addQuestion}
                                        className="mt-8 w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:border-sky-400 hover:text-sky-600 transition-colors flex items-center justify-center cursor-pointer"
                                    >
                                        <Plus size={20} className="mr-2" /> Add New Question Pair
                                    </button>
                                )}
                            </div>
                        ))}
                </div>
            </div>

            {showShareToast && (
                <div className="fixed top-24 right-6 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 animate-fade-in z-[120]">
                    <CheckCircle size={14} className="text-green-400" /> Share link copied!
                </div>
            )}

            {/* AI Prompt Info Modal */}
            {showAiPrompt && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div
                        className="relative flex max-w-lg w-full flex-col overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-2xl animate-slide-up"
                        style={{ maxHeight: AI_PROMPT_MODAL_MAX_HEIGHT }}
                    >
                        <button onClick={() => setShowAiPrompt(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                            <X size={24} />
                        </button>
                        <div className="shrink-0 px-8 pt-8">
                            <div className="mb-6 flex items-center pr-10">
                                <div className="bg-indigo-100 p-3 rounded-full mr-4 text-indigo-600">
                                    <Sparkles size={24} />
                                </div>
                                <h2 className="font-display text-2xl font-bold text-slate-800">AI Generation Info</h2>
                            </div>
                        </div>

                        <div className="min-h-0 overflow-y-auto px-8 pb-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Original Topic</label>
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 font-medium">
                                        {editedGame.config.topic || "N/A (Jeopardy/Pub Quiz Mode)"}
                                    </div>
                                </div>

                                <div className="relative">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex justify-between items-center">
                                        Custom Instructions
                                        <button 
                                            onClick={handleCopyInstructions}
                                            className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold flex items-center"
                                            title="Copy Instructions"
                                        >
                                            <Copy size={12} className="mr-1" /> Copy
                                        </button>
                                    </label>
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 text-sm min-h-[80px]">
                                        {editedGame.config.customInstructions || <span className="italic text-slate-400">No custom instructions provided.</span>}
                                    </div>
                                    {showCopyToast && (
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1.5 animate-fade-in z-[110]">
                                            <CheckCircle size={12} className="text-green-400" /> Instructions Copied!
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between items-center pt-2 text-xs text-slate-400">
                                    <div className="flex items-center">
                                        <FileText size={14} className="mr-1" />
                                        <span>Questions: {editedGame.config.questionCount || 'Auto'}</span>
                                    </div>
                                    <div className="uppercase font-bold tracking-wider">Generated by AI</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
            />
            <StockImagePicker
                isOpen={imagePickerOpen}
                mode="single"
                initialQuery={imagePickerQuery}
                initialSelection={imagePickerSelection}
                onClose={closeImagePicker}
                onConfirm={handleImagePickerConfirm}
                onUpload={handleImagePickerUpload}
            />
            <StudentShareModal
                isOpen={Boolean(studentShareUrl)}
                url={studentShareUrl}
                title={editedGame.title}
                onClose={() => setStudentShareUrl('')}
            />
        </div>
    );
};
