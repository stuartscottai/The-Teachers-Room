import { translateInterfaceText as ui, useInterfaceLanguage as useUiLanguage } from '../../utils/interfaceLanguage';
import { WorkspaceMenu, QuestionEditorPanel, AnswerOptions, useWorkspaceDialog } from './GameWorkspace';
import { GameWebSources } from './GameWebSources';

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
import { Save, Play, Check, AlertCircle, Plus, Trash2, Coins, ArrowLeft, List, Globe, Lock, Sparkles, X, FileText, Copy, CheckCircle, ChevronLeft, ChevronRight, Share2, QrCode, Radio } from 'lucide-react';
import { promptSignupForFree } from '../../services/accountAccess';
import { StudentShareModal } from './StudentShareModal';
import { getPublicAppUrl } from '../../utils/appUrl';
import { GameCoverEditor } from './GameCoverEditor';

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
  useUiLanguage();
    const [editedGame, setEditedGame] = useState<GeneratedGame>(game);
    const [coverUploading, setCoverUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<number>(0);
    const [isPublic, setIsPublic] = useState(game.config.isPublic || false); // New Local State for Visibility
    const [showAiPrompt, setShowAiPrompt] = useState(false);
    const promptDialogRef = useWorkspaceDialog(showAiPrompt, () => setShowAiPrompt(false));
    const [showCopyToast, setShowCopyToast] = useState(false);
    const [showShareToast, setShowShareToast] = useState(false);
    const [studentShareUrl, setStudentShareUrl] = useState('');
    const [hasEdits, setHasEdits] = useState(false);
    const tabsScrollRef = useRef<HTMLDivElement>(null);
    const optionCountDraftsRef = useRef(new Map<string, { options: string[]; removedAnswer: string }>());
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
        optionCountDraftsRef.current.clear();
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
        if (coverUploading) return null;
        if (editedGame.config.type === GameType.STOP_THE_FIRE && editedGame.config.stopTheFireMode === 'bank') {
            alert(ui("Word Bank games cannot be saved. Switch to Manual or AI to save this game."));
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
            const savedGame = { ...finalGame, id: result.id ?? finalGame.id, config: { ...finalGame.config, ...(result.coverImage ? { coverImage: result.coverImage } : {}) } };
            setSaveStatus('saved');
            setIsPublic(nextPublic);
            setIsDirty(false);
            setHasEdits(false);
            setEditedGame(savedGame);
            onSave(savedGame);
            if (publishLockedForRemix) {
                alert(ui("Remixed community games stay private until you make a content edit."));
            }
            return savedGame;
        } else {
            setSaveStatus('idle');
            alert(ui("Failed to save. Please try again."));
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
            alert(ui("Make at least one edit before publishing a community game copy."));
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
            alert(ui("Word Bank games cannot be shared or saved. Switch to Manual or AI to save this game."));
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
                alert(ui("Copy failed. Share this link: {shareUrl}", { "shareUrl": (shareUrl) }));
            }
            return;
        }

        let desiredPublic = isPublic;
        if (!desiredPublic) {
            const confirmPublic = window.confirm(ui("This game is private. Make it public to share?"));
            if (!confirmPublic) return;
            desiredPublic = true;
            setIsPublic(true);
        }

        let shareGame = editedGame;
        const needsSave = hasEdits;
        if (needsSave) {
            const confirmSave = window.confirm(ui("Save this game to generate a share link?"));
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
            alert(ui("Please save this game before sharing."));
            return;
        }

        const shareUrl = getShareUrl(shareGame.id);
        try {
            await navigator.clipboard.writeText(shareUrl);
            setShowShareToast(true);
            setTimeout(() => setShowShareToast(false), 2000);
        } catch (error) {
            alert(ui("Copy failed. Share this link: {shareUrl}", { "shareUrl": (shareUrl) }));
        }
    };

    const handleStudentShare = async () => {
        if ([GameType.STOP_THE_FIRE, GameType.SURVEY_SHOWDOWN].includes(editedGame.config.type)) {
            alert(ui("Student practice sharing is not available for this game type."));
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
            const confirmPublic = window.confirm(ui("This game must be public for student practice links. Make it public?"));
            if (!confirmPublic) return;
            desiredPublic = true;
            setIsPublic(true);
        }

        let shareGame = editedGame;
        const needsSave = hasEdits;
        if (needsSave) {
            const confirmSave = window.confirm(ui("Save this game to generate a student practice link?"));
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
            alert(ui("Please save this game before sharing it with students."));
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
                alert(ui("Failed to upload image. Please try again."));
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
        confirmAction(ui("Delete this question permanently?"), () => {
            optionCountDraftsRef.current.clear();
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
    const resizeQuestionOptions = (question: GeneratedQuestion, count: number, key: string): GeneratedQuestion => {
        const current = question.options || [];
        if (current.length === count) return question;

        const draft = optionCountDraftsRef.current.get(key);
        const remembered = [...current, ...(draft?.options.slice(current.length) || [])];
        if (count < current.length) {
            const options = current.slice(0, count);
            const removedAnswer = current.includes(question.answer) && !options.includes(question.answer)
                ? question.answer : draft?.removedAnswer || '';
            optionCountDraftsRef.current.set(key, { options: remembered, removedAnswer });
            return { ...question, options, answer: removedAnswer === question.answer ? '' : question.answer };
        }

        const options = [...remembered.slice(0, count), ...Array(Math.max(0, count - remembered.length)).fill('')];
        const answer = !question.answer && draft?.removedAnswer && options.includes(draft.removedAnswer)
            ? draft.removedAnswer : question.answer;
        optionCountDraftsRef.current.set(key, { options: remembered, removedAnswer: answer ? '' : draft?.removedAnswer || '' });
        return { ...question, options, answer };
    };

    const updateQuestionType = (index: number, type: 'open' | 'multiple-choice') => {
        handleChange(prev => {
            const newQuestions = [...prev.questions];
            if (type === 'open') {
                newQuestions[index].options = undefined;
            } else {
                if (!newQuestions[index].options || newQuestions[index].options.length === 0) {
                    newQuestions[index].options = [newQuestions[index].answer || '', ...Array(getDefaultMcOptionCount() - 1).fill('')];
                }
            }
            return { ...prev, questions: newQuestions };
        });
    };

    const updateQuestionOptionCount = (index: number, count: number) => {
        const resized = resizeQuestionOptions(editedGame.questions[index], count, `standard:${index}`);
        handleChange(prev => {
            const newQuestions = [...prev.questions];
            newQuestions[index] = resized;
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
            const q = { ...groups[activeTab].questions[qIdx] };
            groups[activeTab].questions[qIdx] = q;

            if (type === 'open') {
                q.options = undefined;
            } else {
                if (!q.options || q.options.length === 0) {
                    q.options = [q.answer || '', ...Array(getDefaultMcOptionCount() - 1).fill('')];
                }
            }

            if (isJeopardy) return {...prev, jeopardyBoard: groups};
            else return {...prev, pubQuizRounds: groups};
        });
    };

    const updateGroupedOptionCount = (qIdx: number, count: number) => {
        const sourceGroups = editedGame.config.type === GameType.JEOPARDY ? editedGame.jeopardyBoard : editedGame.pubQuizRounds;
        const resized = resizeQuestionOptions(sourceGroups![activeTab].questions[qIdx], count, `group:${activeTab}:${qIdx}`);
        handleChange(prev => {
            const isJeopardy = prev.config.type === GameType.JEOPARDY;
            const groups = isJeopardy ? [...prev.jeopardyBoard!] : [...prev.pubQuizRounds!];

            // Shallow copy the group object
            groups[activeTab] = { ...groups[activeTab], questions: [...groups[activeTab].questions] };
            groups[activeTab].questions[qIdx] = resized;

            if (isJeopardy) return {...prev, jeopardyBoard: groups};
            else return {...prev, pubQuizRounds: groups};
        });
    };

    const moveGroupedQuestion = (questionIndex: number, targetGroupIndex: number) => {
        if (targetGroupIndex === activeTab) return;
        optionCountDraftsRef.current.clear();

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
    const groupLabel = editedGame.config.type === GameType.JEOPARDY ? ui("Category") : ui("Round");
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
        <div className="game-workspace fixed inset-0 top-16 z-50 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
                <div className="workspace-shell relative z-20">
                        <button onClick={onBack} className="workspace-back"><ArrowLeft size={18} /> {ui(" Back")}</button>
                        <header className="workspace-editor-top">
                          <div className="workspace-editor-title">
                            <h1 className="sr-only">{ui("Edit game")}</h1><div className="workspace-eyebrow mb-1">{ui("Edit game ")}<span className="px-1 text-slate-300">/</span> {editedGame.config.type}</div>
                            <label htmlFor="editor-game-title" className="sr-only">{ui("Game title")}</label>
                            <input id="editor-game-title" value={editedGame.title} onChange={event => handleTitleChange(event.target.value)} placeholder={ui("Enter game title")} />
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                              {showCreatorAttribution && <span>{ui("Originally by ")}{createdByName ? <Link to="/games" state={{ view: 'community', ...(createdById ? { creatorFilter: { id: createdById, name: createdByName } } : { searchQuery: createdByName }) }} className="font-semibold hover:underline">{createdByName}</Link> : ui("Unknown creator")}{showEditedBy && <> {ui(" · Edited by ")}{editedByName}</>}</span>}
                              {createdDate !== "Date unavailable" && <span>{createdDate}</span>}<span>{isPublic ? ui("Public") : ui("Private")}</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 lg:items-end">
                            <div className="workspace-editor-actions">
                              <WorkspaceMenu label={ui("Game details")}>
                                <button type="button" onClick={handleVisibilityToggle} disabled={!user || publicToggleLocked} title={publicToggleLocked ? ui("Make an edit before making this copy public.") : undefined}>
                                  {isPublic ? <Lock size={16} /> : <Globe size={16} />}
                                  <span><strong className="block">{isPublic ? ui("Make game private") : ui("Make game public")}</strong><small className="block font-normal text-slate-500">{ui("Currently ")}{isPublic ? ui("public") : ui("private")}</small></span>
                                </button>
                                {editedGame.config.isAI && <button type="button" onClick={() => setShowAiPrompt(true)}><Sparkles size={16} /> {ui(" Generation instructions")}</button>}
                              </WorkspaceMenu>
                              <WorkspaceMenu label={ui("Share")}>
                                <button type="button" onClick={handleShare} disabled={coverUploading || saveStatus === 'saving' || isStopTheFireBank}><Share2 size={16} /> {ui(" Teacher share")}</button>
                                <button type="button" onClick={handleStudentShare} disabled={coverUploading || saveStatus === 'saving' || [GameType.STOP_THE_FIRE, GameType.SURVEY_SHOWDOWN].includes(editedGame.config.type)}><QrCode size={16} /> {ui(" Student share")}</button>
                              </WorkspaceMenu>
                              <button type="button" onClick={() => void handleSave()} disabled={coverUploading || saveStatus === 'saving' || isStopTheFireBank} className="workspace-button workspace-button-primary">
                                {saveStatus === 'saved' ? <Check size={16} /> : <Save size={16} />}{saveStatus === 'saving' ? ui("Saving...") : ui("Save changes")}
                              </button>
                              {canPlayLiveQuiz && <button type="button" onClick={() => onLiveQuiz?.(editedGame)} disabled={liveQuizNeedsSave} className="workspace-button" title={liveQuizNeedsSave ? ui("Save this game before starting a live quiz") : ui("Play live quiz")}><Radio size={16} /> {ui(" Live quiz")}</button>}
                              {!isLiveQuiz && <button type="button" onClick={handlePlay} className="workspace-button workspace-button-play"><Play size={16} fill="currentColor" /> {ui(" Play")}</button>}
                            </div>
                            <p className="text-xs text-slate-600" role="status">{isStopTheFireBank ? ui("Built-in bank · saving is unavailable") : saveStatus === 'saving' ? ui("Saving your game...") : isDirty ? ui("Unsaved changes") : saveStatus === 'saved' ? ui("Saved") : ui("Save when ready")}{liveQuizNeedsSave && ' · Save before hosting a live quiz'}</p>
                          </div>
                        </header>
                        {imageRepairCount > 0 && <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertCircle size={18} className="shrink-0" /> {imageRepairCount} {imageRepairCount === 1 ? ui("image needs") : ui("images need")} {ui(" replacing. Open the marked questions to choose replacements.")}</div>}

                        <GameWebSources config={editedGame.config} />
                        <GameCoverEditor compact game={editedGame} userId={user?.id} disabled={coverUploading || saveStatus === 'saving'} onBusyChange={setCoverUploading}
                            onChange={(coverImage, automatic) => {
                                setEditedGame(prev => ({ ...prev, config: { ...prev.config, coverImage } }));
                                if (!automatic) { setIsDirty(true); setSaveStatus('idle'); }
                            }} />

                        {!user && (
                        <div className="mb-4 bg-sky-50 p-3 rounded-lg flex items-center text-sky-800 text-sm border border-sky-100">
                            <AlertCircle size={16} className="mr-2 shrink-0" />
                            <span>{ui("Guest editing. Sign in to save to your library and share your game.")}</span>
                        </div>
                        )}

                        {isStopTheFire ? (
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                <div className="p-4 sm:p-5">
                                    {(editedGame.config.stopTheFireMode === 'manual' || editedGame.config.stopTheFireMode === 'ai') ? (
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-4">
                                                <div className="bg-orange-100 text-orange-700 p-3 rounded-xl">
                                                    <Sparkles size={22} />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold text-slate-800">{ui("Custom Categories")}</h2>
                                                    <p className="text-slate-600 mt-1">
                                                        {ui("These categories are your word bank. Every save updates this bank.")}</p>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{ui("Add multiple categories")}</label>
                                                <textarea
                                                    value={bulkCategoryInput}
                                                    onChange={(e) => setBulkCategoryInput(e.target.value)}
                                                    placeholder={ui("Paste categories here, one per line.")}
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
                                                        {ui("Add to Bank")}</button>
                                                    <span className="text-xs text-slate-400">
                                                        {ui("Tips: one category per line. Duplicates are ignored.")}</span>
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
                                                            placeholder={ui("e.g., Things in a kitchen")}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleChange(prev => {
                                                                const next = (prev.stopTheFireCategories || []).filter((_, i) => i !== idx);
                                                                return { ...prev, stopTheFireCategories: next.length ? next : [''] };
                                                            })}
                                                            className="px-2 py-1 text-xs font-bold text-slate-500 hover:text-red-600"
                                                        >
                                                            {ui("Remove")}</button>
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
                                                {ui("+ Add Category")}</button>
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-4">
                                            <div className="bg-orange-100 text-orange-700 p-3 rounded-xl">
                                                <Sparkles size={22} />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-slate-800">{ui("Stop the Fire uses a built-in category bank")}</h2>
                                                <p className="text-slate-600 mt-1">
                                                    {ui("You will choose difficulty, category count, timer, and the round letter inside the game setup card.")}</p>
                                                <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
                                                    {ui("Tip: Use the in-game setup side to preview the letter before starting the round.")}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                        /* GROUPED EDITOR (JEOPARDY / PUB QUIZ) */
                        isGrouped && groups ? (
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
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
                                    aria-label={ui("Scroll tabs left")}
                                >
                                    <ChevronLeft size={16} className="mx-auto" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleTabsScroll('right')}
                                    className="sm:hidden absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/90 border border-slate-200 text-slate-400 shadow-sm hover:text-slate-600 transition-colors"
                                    aria-label={ui("Scroll tabs right")}
                                >
                                    <ChevronRight size={16} className="mx-auto" />
                                </button>
                            </div>

                                <div className="p-3 sm:p-4">
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{ui("Current ")}{groupLabel} {ui(" Name")}</label>
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
                                            placeholder={ui("Enter {groupLabel} Name", { "groupLabel": (groupLabel) })}
                                        />
                                    </div>

                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                        <p className="text-xs font-medium text-slate-500">
                                            {ui("Showing ")}{groupedQuestions.length === 0 ? 0 : pageStart + 1}-{Math.min(pageStart + itemsPerPage, groupedQuestions.length)} {ui(" of ")}{groupedQuestions.length} {ui(" questions")}</p>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                aria-label={ui("Previous page")}
                                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                                disabled={currentPage === 1}
                                                className={editorPageButtonClass}
                                            >
                                                <ChevronLeft size={18} />
                                            </button>
                                            <span className="text-sm font-bold text-slate-600">
                                                {ui("Page ")}{currentPage} {ui(" of ")}{totalPages}
                                            </span>
                                            <button
                                                type="button"
                                                aria-label={ui("Next page")}
                                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                                disabled={currentPage === totalPages}
                                                className={editorPageButtonClass}
                                            >
                                                <ChevronRight size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {pagedGroupedQuestions.map((q, index) => {
                                            const qIdx = pageStart + index;
                                            const repairKey = `${editedGame.config.type === GameType.JEOPARDY ? 'jeopardy' : 'pubquiz'}:${activeTab}:${qIdx}`;
                                            const needsImageRepair = imageRepairKeySet.has(repairKey);
                                            const imageUrl = resolveGameQuestionImageUrl(q.image);
                                            const imageAlt = q.image?.alt || 'Question image';
                                            return (
                                            <QuestionEditorPanel key={`${activeTab}-${q.id ?? qIdx}`} number={qIdx + 1} question={q.question} answer={q.answer} format={q.options?.length ? ui("{count} options · {points} pts", {count: q.options.length, points: q.points}) : ui("Open answer · {points} pts", {points: q.points})} warning={needsImageRepair ? ui("Replace image") : q.options?.length && !q.options.some(option => option.trim() && option.trim() === q.answer.trim()) ? ui("Choose a correct answer") : undefined} initiallyOpen={index === 0}>
                                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-bold text-sky-700 bg-sky-100 px-3 py-1 rounded-full text-sm">
                                                            {editedGame.config.type === GameType.JEOPARDY ? ui("{q.points} Points", { "q.points": (q.points) }) : ui("Question {qIdx + 1}", { "qIdx + 1": (qIdx + 1) })}
                                                        </span>
                                                        {needsImageRepair && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">{ui("Replace this image")}</span>}
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
                                                                {ui("Open")}</button>
                                                            <button
                                                                onClick={() => updateGroupedType(qIdx, 'multiple-choice')}
                                                                className={`px-2 py-1 text-[10px] font-bold rounded ${q.options ? 'bg-sky-100 text-sky-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                                disabled={!!q.options}
                                                            >
                                                                {ui("Multi-Choice")}</button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">{ui("Question / Clue")}</label>
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
                                                            placeholder={ui("Enter the question here...")}
                                                        />
                                                    </div>
                                                {/* OPTIONS EDITOR */}
                                                {q.options && q.options.length > 0 && (
                                                    <div className="min-w-0">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-sm font-semibold text-slate-600">{ui("Number of options")}</span>
                                                            <div className="flex bg-white rounded border border-slate-200 overflow-hidden">
                                                                {[2, 3, 4].map(num => (
                                                                    <button
                                                                        key={num}
                                                                        onClick={() => updateGroupedOptionCount(qIdx, num)}
                                                                        className={`px-2 py-0.5 text-[10px] font-bold transition-colors ${q.options!.length === num ? 'bg-brand-yellow text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
                                                                    >
                                                                        {num} {ui(" Opts")}</button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <AnswerOptions options={q.options} answer={q.answer} onChange={(options, answer) => handleChange(prev => {
                                                          const key = prev.config.type === GameType.JEOPARDY ? 'jeopardyBoard' : 'pubQuizRounds';
                                                          const nextGroups = [...prev[key]!];
                                                          nextGroups[activeTab] = { ...nextGroups[activeTab], questions: nextGroups[activeTab].questions.map((question, i) => i === qIdx ? { ...question, options, answer } : question) };
                                                          return { ...prev, [key]: nextGroups };
                                                        })} />
                                                    </div>
                                                )}
                                                    {!q.options?.length && <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">{ui("Answer")}</label>
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
                                                            placeholder={ui("Enter the answer here...")}
                                                        />
                                                    </div>}
                                                </div>

                                                <details className="mt-4 pt-4 border-t border-slate-200" open={needsImageRepair ? true : undefined}>
                                                    <summary className="cursor-pointer text-sm font-semibold text-slate-600 mb-3">{ui("Question image ")}<span className="font-normal">{imageUrl ? ui("(image added)") : ui("(optional)")}</span></summary>
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
                                                                    {ui("No image selected")}</div>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => openImagePicker({ scope: 'grouped', groupIndex: activeTab, questionIndex: qIdx }, q)}
                                                                className="px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                                                            >
                                                                {ui("Pick from library")}</button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setImageUploadTarget({ scope: 'grouped', groupIndex: activeTab, questionIndex: qIdx });
                                                                    imageInputRef.current?.click();
                                                                }}
                                                                className="px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                                                            >
                                                                {ui("Upload")}</button>
                                                            {imageUrl && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateQuestionImage({ scope: 'grouped', groupIndex: activeTab, questionIndex: qIdx }, null)}
                                                                    className="px-3 py-2 rounded-lg text-xs font-bold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                                                >
                                                                    {ui("Remove")}</button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </details>

                                            </QuestionEditorPanel>
                                        )})}
                                    </div>

                                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                aria-label={ui("Previous page")}
                                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                                disabled={currentPage === 1}
                                                className={editorPageButtonClass}
                                            >
                                                <ChevronLeft size={18} />
                                            </button>
                                            <span className="text-sm font-bold text-slate-600">
                                                {ui("Page ")}{currentPage} {ui(" of ")}{totalPages}
                                            </span>
                                            <button
                                                type="button"
                                                aria-label={ui("Next page")}
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
                                                aria-label={ui("Questions per page")}
                                            value={itemsPerPage}
                                                onChange={(event) => handleItemsPerPageChange(Number(event.target.value))}
                                                className={editorPageSizeSelectClass}
                                            >
                                                {GAME_EDITOR_PAGE_SIZE_OPTIONS.map((size) => (
                                                    <option key={size} value={size}>{size} {ui(" per page")}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // STANDARD EDITOR (Trivia, Snakes, Darts, Millionaire, Survey)
                            <div className="workspace-editor-questions">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
                                    <p className="text-xs text-slate-500 font-medium">
                                        {ui("Showing ")}{displayQuestions.length === 0 ? 0 : pageStart + 1}-{Math.min(pageStart + itemsPerPage, displayQuestions.length)} {ui(" of ")}{displayQuestions.length} {ui(" questions")}</p>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            aria-label={ui("Previous page")}
                                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className={editorPageButtonClass}
                                        >
                                            <ChevronLeft size={18} />
                                        </button>
                                        <span className="text-sm font-bold text-slate-600">
                                            {ui("Page ")}{currentPage} {ui(" of ")}{totalPages}
                                        </span>
                                        <button
                                            type="button"
                                            aria-label={ui("Next page")}
                                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage === totalPages}
                                            className={editorPageButtonClass}
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
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
                                        <QuestionEditorPanel key={q.id ?? questionIndex} number={questionIndex + 1} question={q.question} answer={isSurvey ? (q.surveyAnswers?.[0]?.text || '') : q.answer} format={isSurvey ? ui("Survey answers") : isLetterAnswerGame ? ui("Letter {letter}", {letter: wordWheelLetter}) : q.options?.length ? ui("{count} answer options", {count: q.options.length}) : ui("Open answer")} warning={needsImageRepair ? ui("Replace image") : q.options?.length && !q.options.some(option => option.trim() && option.trim() === q.answer.trim()) ? ui("Choose a correct answer") : undefined} initiallyOpen={index === 0}>
                                            {!isWordWheel && (
                                                <button
                                                    onClick={() => removeQuestion(questionIndex)}
                                                    className="absolute top-4 right-4 text-slate-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                                    title={ui("Delete Question")}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                            <div className="workspace-question-controls flex items-center justify-between mb-4 pr-10">
                                                <div className="flex items-center gap-2">
                                                    {needsImageRepair && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">{ui("Replace this image")}</span>}

                                                    {isLetterAnswerGame && (
                                                        <span className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-xs font-bold uppercase ml-1">
                                                            {ui("Letter ")}{wordWheelLetter || '?'}
                                                        </span>
                                                    )}

                                                    {/* Millionaire Label */}
                                                    {isMillionaire && (
                                                        <span className="bg-brand-yellow text-slate-900 px-3 py-1 rounded-full text-xs font-bold uppercase ml-2">
                                                            {ui("Level ")}{questionIndex + 1}
                                                        </span>
                                                    )}

                                                    {/* Points Editor (Hidden for Darts, Millionaire, Survey, Word Wheel) */}
                                                    {editedGame.config.type !== GameType.DARTS && !isMillionaire && !isSurvey && !isLetterAnswerGame && !isLiveQuiz && (
                                                        <div className="flex items-center ml-2 bg-white px-2 py-1 rounded border border-slate-200">
                                                            <Coins size={14} className="text-brand-yellow mr-2" />
                                                            <input
                                                                type="number"
                                                                aria-label={ui("Question points")}
                                                                value={q.points}
                                                                onChange={(e) => handleChange(prev => {
                                                                    const newQuestions = [...prev.questions];
                                                                    newQuestions[questionIndex].points = parseInt(e.target.value) || 0;
                                                                    return {...prev, questions: newQuestions};
                                                                })}
                                                                className="w-12 p-0.5 text-xs border-none text-center focus:ring-0 outline-none font-bold"
                                                            />
                                                            <span className="text-[10px] font-bold text-slate-400 ml-1">{ui("pts")}</span>
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
                                                                <option value="easy">{ui("Easy")}</option>
                                                                <option value="medium">{ui("Medium")}</option>
                                                                <option value="hard">{ui("Hard")}</option>
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* QUESTION TYPE TOGGLE BAR - Hidden for Millionaire, Survey, and Word Wheel */}
                                            {!isMillionaire && !isSurvey && !isLetterAnswerGame && !isLiveQuiz && (
                                                <div className="workspace-question-format flex flex-wrap items-center gap-4 mb-4 bg-slate-100 p-2 rounded-lg border border-slate-200">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{ui("Format:")}</span>
                                                        <div className="flex bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
                                                            <button
                                                                onClick={() => updateQuestionType(questionIndex, 'open')}
                                                                className={`px-3 py-1 text-xs font-bold transition-colors ${!q.options || q.options.length === 0 ? 'bg-brand-blue text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                                                            >
                                                                {ui("Open")}</button>
                                                            <button
                                                                onClick={() => updateQuestionType(questionIndex, 'multiple-choice')}
                                                                className={`px-3 py-1 text-xs font-bold transition-colors ${q.options && q.options.length > 0 ? 'bg-brand-blue text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                                                            >
                                                                {ui("Multi-Choice")}</button>
                                                        </div>
                                                    </div>

                                                    {q.options && q.options.length > 0 && (
                                                        <div className="flex items-center gap-2 animate-fade-in">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{ui("Options:")}</span>
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

                                            {isLiveQuiz && q.options && q.options.length > 0 && (
                                                <div className="mb-4 flex flex-wrap items-center gap-3">
                                                    <span className="text-sm font-semibold text-slate-700">{ui("Answer choices")}</span>
                                                    <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 bg-white" role="group" aria-label={ui("Number of answer choices")}>
                                                        {[2, 3, 4].map(count => (
                                                            <button
                                                                key={count}
                                                                type="button"
                                                                onClick={() => updateQuestionOptionCount(questionIndex, count)}
                                                                aria-pressed={q.options!.length === count}
                                                                className={`min-h-10 min-w-11 px-3 text-sm font-bold ${q.options!.length === count ? 'bg-sky-50 text-sky-800' : 'text-slate-600 hover:bg-slate-50'}`}
                                                            >
                                                                {count}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">{ui("Question / Prompt")}</label>
                                                    <textarea
                                                        value={q.question}
                                                        onChange={(e) => handleChange(prev => {
                                                            const newQuestions = [...prev.questions];
                                                            newQuestions[questionIndex].question = e.target.value;
                                                            return {...prev, questions: newQuestions};
                                                        })}
                                                        className="w-full p-3 rounded-lg border border-slate-300 text-sm h-24 resize-none focus:ring-2 focus:ring-sky-200 outline-none"
                                                        placeholder={ui("Type question here...")}
                                                    />
                                                </div>
                                            {/* OPTIONS EDITOR (MC) */}
                                            {q.options && q.options.length > 0 && !isSurvey && !isLetterAnswerGame && (
                                                <div className="min-w-0">
                                                  <AnswerOptions options={q.options} answer={q.answer} onChange={(options, answer) => handleChange(prev => ({
                                                    ...prev, questions: prev.questions.map((question, i) => i === questionIndex ? { ...question, options, answer } : question)
                                                  }))} />
                                                </div>
                                            )}
                                                {!isSurvey && (!q.options?.length || isLetterAnswerGame) && (
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">{ui("Answer ")}{isMillionaire && <span className="text-red-500">{ui("(Must match option text)")}</span>}</label>
                                                    <textarea
                                                        value={q.answer}
                                                        onChange={(e) => handleChange(prev => {
                                                            const newQuestions = [...prev.questions];
                                                            newQuestions[questionIndex].answer = e.target.value;
                                                            return {...prev, questions: newQuestions};
                                                        })}
                                                        className="w-full p-3 rounded-lg border border-slate-300 text-sm h-24 resize-none focus:ring-2 focus:ring-green-200 outline-none"
                                                            placeholder={ui("Type answer here...")}
                                                        />
                                                        {isLetterAnswerGame && wordWheelLetter && (
                                                            <p className={`mt-2 text-xs font-semibold ${answerFitsWordWheelRule ? 'text-teal-700' : 'text-red-600'}`}>
                                                                {ui("Rule for ")}{wordWheelLetter}: {wordWheelRuleHint}
                                                            </p>
                                                        )}
                                                        {isLetterAnswerGame && wordWheelLetter && !answerFitsWordWheelRule && q.answer.trim() && (
                                                            <p className="mt-1 text-xs text-red-500">
                                                                {ui("Current answer does not match this letter rule.")}</p>
                                                        )}
                                                    </div>
                                                )}

                                                {!isSurvey && !isLetterAnswerGame && (
                                                    <details className="md:col-span-2">
                                                        <summary className="cursor-pointer text-sm font-semibold text-slate-600 mb-2">{ui("Category ")}<span className="font-normal">{q.category ? `: ${q.category}` : ui("(optional)")}</span></summary>
                                                        <input
                                                            type="text"
                                                            value={q.category || ''}
                                                            onChange={(e) => handleChange(prev => {
                                                                const newQuestions = [...prev.questions];
                                                                newQuestions[questionIndex].category = e.target.value;
                                                                return { ...prev, questions: newQuestions };
                                                            })}
                                                            className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                                                            placeholder={ui("Optional, e.g. Past perfect 1")}
                                                        />
                                                        <p className="mt-1 text-xs font-semibold text-slate-400">
                                                            {ui("Used when this question set is played as Jeopardy or Pub Quiz.")}</p>
                                                    </details>
                                                )}

                                                {/* SURVEY ANSWERS EDITOR */}
                                                {isSurvey && (
                                                    <div className="col-span-1 md:col-span-2 bg-white rounded border border-slate-200 p-4">
                                                        <label className="block text-xs font-bold text-slate-500 mb-3 uppercase">{ui("Top 10 Survey Answers")}</label>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                                            {(q.surveyAnswers || Array.from({ length: 10 }, () => ({text:"", score:0}))).map((ans, aIdx) => (
                                                                <div key={aIdx} className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2 items-start sm:items-center">
                                                                    <div className="w-7 sm:w-8 flex items-center justify-center font-bold text-slate-400">#{aIdx+1}</div>
                                                                    <textarea
                                                                        value={ans.text}
                                                                        placeholder={ui("Answer")}
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
                                                                        placeholder={ui("Pts")}
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
                                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">{ui("Letter")}</label>
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
                                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">{ui("Accepted Variants (comma separated)")}</label>
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
                                                            placeholder={ui("e.g., automobile, car")}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <details className="mt-4 pt-4 border-t border-slate-200" open={needsImageRepair ? true : undefined}>
                                                <summary className="cursor-pointer text-sm font-semibold text-slate-600 mb-3">{ui("Question image ")}<span className="font-normal">{imageUrl ? ui("(image added)") : ui("(optional)")}</span></summary>
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
                                                                {ui("No image selected")}</div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => openImagePicker({ scope: 'standard', index: questionIndex }, q)}
                                                            className="px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                                                        >
                                                            {ui("Pick from library")}</button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setImageUploadTarget({ scope: 'standard', index: questionIndex });
                                                                imageInputRef.current?.click();
                                                            }}
                                                            className="px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                                                        >
                                                            {ui("Upload")}</button>
                                                        {imageUrl && (
                                                            <button
                                                                type="button"
                                                                onClick={() => updateQuestionImage({ scope: 'standard', index: questionIndex }, null)}
                                                                className="px-3 py-2 rounded-lg text-xs font-bold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                                            >
                                                                {ui("Remove")}</button>
                                                        )}
                                                    </div>
                                                </div>
                                            </details>

                                        </QuestionEditorPanel>
                                    )})}
                                </div>

                                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            aria-label={ui("Previous page")}
                                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className={editorPageButtonClass}
                                        >
                                            <ChevronLeft size={18} />
                                        </button>
                                        <span className="text-sm font-bold text-slate-600">
                                            {ui("Page ")}{currentPage} {ui(" of ")}{totalPages}
                                        </span>
                                        <button
                                            type="button"
                                            aria-label={ui("Next page")}
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
                                            aria-label={ui("Questions per page")}
                                            value={itemsPerPage}
                                            onChange={(event) => handleItemsPerPageChange(Number(event.target.value))}
                                            className={editorPageSizeSelectClass}
                                        >
                                            {GAME_EDITOR_PAGE_SIZE_OPTIONS.map((size) => (
                                                <option key={size} value={size}>{size} {ui(" per page")}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {!isWordWheel && (
                                    <button
                                        onClick={addQuestion}
                                        className="mt-8 w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:border-sky-400 hover:text-sky-600 transition-colors flex items-center justify-center cursor-pointer"
                                    >
                                        <Plus size={20} className="mr-2" /> {ui(" Add question")}</button>
                                )}
                            </div>
                        ))}
                </div>
            </div>

            {showShareToast && (
                <div className="fixed top-24 right-6 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 animate-fade-in z-[120]">
                    <CheckCircle size={14} className="text-green-400" /> {ui(" Share link copied!")}</div>
            )}

            {/* AI Prompt Info Modal */}
            {showAiPrompt && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div ref={promptDialogRef} role="dialog" aria-modal="true" aria-label={ui("Generation instructions")} tabIndex={-1}
                        className="relative flex max-w-lg w-full flex-col overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-2xl animate-slide-up"
                        style={{ maxHeight: AI_PROMPT_MODAL_MAX_HEIGHT }}
                    >
                        <button aria-label={ui("Close generation instructions")} onClick={() => setShowAiPrompt(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                            <X size={24} />
                        </button>
                        <div className="shrink-0 px-8 pt-8">
                            <div className="mb-6 flex items-center pr-10">
                                <div className="bg-indigo-100 p-3 rounded-full mr-4 text-indigo-600">
                                    <Sparkles size={24} />
                                </div>
                                <h2 className="font-display text-2xl font-bold text-slate-800">{ui("AI Generation Info")}</h2>
                            </div>
                        </div>

                        <div className="min-h-0 overflow-y-auto px-8 pb-8">
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{ui("Original Topic")}</label>
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 font-medium">
                                        {editedGame.config.topic || "N/A (Jeopardy/Pub Quiz Mode)"}
                                    </div>
                                </div>

                                <div className="relative">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex justify-between items-center">
                                        {ui("Custom Instructions")}<button
                                            onClick={handleCopyInstructions}
                                            className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold flex items-center"
                                            title={ui("Copy Instructions")}
                                        >
                                            <Copy size={12} className="mr-1" /> {ui(" Copy")}</button>
                                    </label>
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 text-sm min-h-[80px]">
                                        {editedGame.config.customInstructions || <span className="italic text-slate-400">{ui("No custom instructions provided.")}</span>}
                                    </div>
                                    {showCopyToast && (
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1.5 animate-fade-in z-[110]">
                                            <CheckCircle size={12} className="text-green-400" /> {ui(" Instructions Copied!")}</div>
                                    )}
                                </div>

                                <div className="flex justify-between items-center pt-2 text-xs text-slate-400">
                                    <div className="flex items-center">
                                        <FileText size={14} className="mr-1" />
                                        <span>{ui("Questions: ")}{editedGame.config.questionCount || 'Auto'}</span>
                                    </div>
                                    <div className="uppercase font-bold tracking-wider">{ui("Generated by AI")}</div>
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
