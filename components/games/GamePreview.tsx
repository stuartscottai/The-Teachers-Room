import { translateInterfaceText as ui, useInterfaceLanguage as useUiLanguage } from '../../utils/interfaceLanguage';
import { WorkspaceMenu, useWorkspaceDialog } from './GameWorkspace';
import { GameCover, CoverCredit } from '../shared/GameCover';
import { GameWebSources } from './GameWebSources';
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, CheckSquare, Edit3, Layers, List, Play, QrCode, Radio, Save, Share2, Shuffle, Sparkles, Square, X } from 'lucide-react';
import { GeneratedGame, GeneratedQuestion, GameType, JeopardyCategory } from '../../types';
import { resolveGameImageUrl, resolveGameImageUrls, resolveGameQuestionImageUrl, resolveGameQuestionImageUrls } from '../../utils/gameImage';
import { refreshStockImage } from '../../services/stockImageService';
import { getCompatibleGameTypes } from '../../utils/gameCompatibility';

type PreviewItem = {
  id: string;
  title: string;
  points?: number;
  prompt: string;
  answer: string;
  options?: string[];
  group?: string;
  imageUrl?: string | null;
  imageUrls?: string[];
  image?: GeneratedQuestion['image'];
  refreshQuery?: string;
};

const PreviewQuestionImage: React.FC<{
  sources: string[];
  label: string;
  image?: GeneratedQuestion['image'];
  refreshQuery?: string;
}> = ({ sources, label, image, refreshQuery }) => {
  useUiLanguage();
  const initialUrls = useMemo(() => sources.map((src) => String(src || '').trim()).filter(Boolean), [sources]);
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const [refreshAttempted, setRefreshAttempted] = useState(false);
  const src = urls[sourceIndex] || '';

  useEffect(() => {
    setUrls(initialUrls);
    setFailed(false);
    setSourceIndex(0);
    setRefreshAttempted(false);
  }, [initialUrls]);

  if (!src || failed) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
      <img
        src={src}
        alt={ui("Preview image for {label}", { "label": (label) })}
        className="h-24 w-full object-cover"
        onError={async () => {
          if (sourceIndex < urls.length - 1) {
            setSourceIndex((current) => current + 1);
            return;
          }

          if (!refreshAttempted && image?.source === 'stock') {
            setRefreshAttempted(true);
            const refreshed = await refreshStockImage({
              stockId: image.stockId,
              searchQuery: image.searchQuery,
              fallbackQuery: refreshQuery || image.alt || label,
            });
            if (refreshed) {
              const refreshedUrls = resolveGameImageUrls(refreshed.url, refreshed.thumbUrl);
              if (refreshedUrls.length) {
                setUrls(refreshedUrls);
                setSourceIndex(0);
                return;
              }
            }
          }

          setFailed(true);
          console.warn('Preview image failed to load:', { label, sources: urls });
        }}
      />
    </div>
  );
};

const PREVIEW_BACKGROUND_IMAGES: Partial<Record<GameType, string>> = {
  [GameType.TRIVIA]: '/assets/games/trivia.png',
  [GameType.JEOPARDY]: '/assets/games/jeopardy.png',
  [GameType.TIME_BOMB]: '/assets/games/timebomb.png',
  [GameType.WORD_WHEEL]: '/assets/games/wordwheel.png',
  [GameType.BLOCK_BEATERS]: '/assets/games/blockbeaters.png',
  [GameType.PUB_QUIZ]: '/assets/games/pubquiz.png',
  [GameType.SURVEY_SHOWDOWN]: '/assets/games/survey.png',
  [GameType.STOP_THE_FIRE]: '/assets/games/stopthefire.png',
  [GameType.MILLIONAIRE]: '/assets/games/millionaire.png',
  [GameType.DARTS]: '/assets/games/darts.png',
  [GameType.SNAKES_LADDERS]: '/assets/games/snakes.png',
  [GameType.LIVE_QUIZ_CHALLENGE]: '/assets/games/livequiz.png',
};



const formatCreatedDate = (value?: string) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const AI_PROMPT_MODAL_MAX_HEIGHT = 'min(75dvh, calc(100dvh - 2rem))';

const PREVIEW_SCORE_TAG_PATTERN = /\s*\((\d+)\)\s*$/;

const stripPreviewScoreTag = (value: string) =>
  String(value || '').replace(PREVIEW_SCORE_TAG_PATTERN, '').trim();

const normalizePreviewValue = (value: string) =>
  stripPreviewScoreTag(value)
    .replace(/^[A-D]\.\s*/i, '')
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const cleanPreviewAnswerText = (value: string) =>
  String(value || '')
    .split('|')
    .map((segment) => stripPreviewScoreTag(segment))
    .filter(Boolean)
    .join(' | ');

const buildMultipleChoiceAnswerSummary = (question: GeneratedQuestion) => {
  const options = (question.options || []).map((option) => stripPreviewScoreTag(option)).filter(Boolean);
  const rawAnswer = String(question.answer || '').trim();
  const cleanedRawAnswer = stripPreviewScoreTag(rawAnswer);
  const rawSegments = rawAnswer
    .split('|')
    .map((segment) => segment.trim())
    .filter(Boolean);
  const parsedSegments = rawSegments.map((segment) => {
    const scoreMatch = segment.match(PREVIEW_SCORE_TAG_PATTERN);
    return {
      raw: segment,
      clean: stripPreviewScoreTag(segment),
      score: scoreMatch ? Number(scoreMatch[1]) : 0,
    };
  });
  const answerSegments = parsedSegments.map((segment) => segment.clean).filter(Boolean);

  if (options.length === 0) {
    return cleanedRawAnswer || answerSegments[0] || 'No answer saved yet.';
  }

  const scoredMatch = parsedSegments
    .filter((segment) => segment.score > 0)
    .sort((a, b) => b.score - a.score)[0];
  if (scoredMatch?.clean) return scoredMatch.clean;

  const rawAnswerMatch = options.find((option) => normalizePreviewValue(option) === normalizePreviewValue(cleanedRawAnswer));
  if (rawAnswerMatch) return rawAnswerMatch;

  const segmentMatch = answerSegments.find((segment) =>
    options.some((option) => normalizePreviewValue(option) === normalizePreviewValue(segment))
  );
  if (segmentMatch) return segmentMatch;

  return answerSegments[0] || cleanedRawAnswer || 'No answer saved yet.';
};

const buildAnswerSummary = (question: GeneratedQuestion, gameType?: GameType) => {
  const surveyAnswers = (question.surveyAnswers || []).filter((answer) => answer.text?.trim());
  if (gameType === GameType.SURVEY_SHOWDOWN && surveyAnswers.length > 0) {
    return surveyAnswers
      .slice(0, 8)
      .map((answer) => `${stripPreviewScoreTag(answer.text)}${answer.score ? ` (${answer.score})` : ''}`)
      .join(' | ');
  }

  if (Array.isArray(question.options) && question.options.length > 0) {
    return buildMultipleChoiceAnswerSummary(question);
  }

  return cleanPreviewAnswerText(question.answer?.trim() || '') || 'No answer saved yet.';
};

const buildCompactOptionsText = (options?: string[]) =>
  (options || [])
    .slice(0, 4)
    .map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`)
    .join(' | ');

const getLegacyImageRefreshQuery = (question: GeneratedQuestion, gameType?: GameType) => {
  const imageAlt = String(question.image?.alt || '').trim();
  if (imageAlt) return imageAlt;

  const keywords = (question.imageKeywords || []).map((item) => String(item || '').trim()).filter(Boolean);
  if (keywords.length) return keywords.slice(0, 2).join(' ');

  if (gameType === GameType.WORD_WHEEL && question.answer) return question.answer;
  return question.question || question.answer || '';
};

const buildStandardQuestionItem = (question: GeneratedQuestion, index: number, gameType?: GameType): PreviewItem => ({
  id: `std-${index}`,
  title:
    gameType === GameType.WORD_WHEEL && question.letter
      ? `Question ${index + 1} - ${question.letter}`
      : `Question ${index + 1}`,
  points: question.points,
  prompt: question.question?.trim() || 'No prompt saved yet.',
  answer: buildAnswerSummary(question, gameType),
  options: (question.options || []).map((option) => stripPreviewScoreTag(option.trim())).filter(Boolean),
  imageUrl: resolveGameQuestionImageUrl(question.image) || resolveGameImageUrl(question.image?.url, question.image?.thumbUrl),
  imageUrls: resolveGameQuestionImageUrls(question.image).length
    ? resolveGameQuestionImageUrls(question.image)
    : resolveGameImageUrls(question.image?.url, question.image?.thumbUrl),
  image: question.image,
  refreshQuery: question.image?.searchQuery || getLegacyImageRefreshQuery(question, gameType),
});

const buildGroupedItems = (
  groups: JeopardyCategory[],
  prefix: 'jeopardy' | 'pubquiz',
  titleBuilder: (question: GeneratedQuestion, groupIndex: number, questionIndex: number) => string
) =>
  groups.flatMap((group, groupIndex) =>
    group.questions.map((question, questionIndex) => ({
      id: `${prefix}-${groupIndex}-${questionIndex}`,
      title: titleBuilder(question, groupIndex, questionIndex),
      points: question.points,
      group: group.name || (prefix === 'jeopardy' ? `Category ${groupIndex + 1}` : `Round ${groupIndex + 1}`),
      prompt: question.question?.trim() || 'No prompt saved yet.',
      answer: buildAnswerSummary(question, prefix === 'pubquiz' ? GameType.PUB_QUIZ : GameType.JEOPARDY),
      options: (question.options || []).map((option) => stripPreviewScoreTag(option.trim())).filter(Boolean),
      imageUrl: resolveGameQuestionImageUrl(question.image) || resolveGameImageUrl(question.image?.url, question.image?.thumbUrl),
      imageUrls: resolveGameQuestionImageUrls(question.image).length
        ? resolveGameQuestionImageUrls(question.image)
        : resolveGameImageUrls(question.image?.url, question.image?.thumbUrl),
      image: question.image,
      refreshQuery: question.image?.searchQuery || getLegacyImageRefreshQuery(question, prefix === 'pubquiz' ? GameType.PUB_QUIZ : GameType.JEOPARDY),
    }))
  );

const buildStopTheFireItems = (game: GeneratedGame): PreviewItem[] => {
  const manualCategories = (game.stopTheFireCategories || []).map((category) => category.trim()).filter(Boolean);
  if (manualCategories.length > 0) {
    return manualCategories.map((category, index) => ({
      id: `stf-${index}`,
      get title() { return ui("Category {index + 1}", { "index + 1": (index + 1) }); },
      prompt: category,
      answer: '',
    }));
  }

  const roundCategories = (game.stopTheFireRounds || []).flatMap((round, roundIndex) =>
    round.categories
      .map((category) => category.trim())
      .filter(Boolean)
      .map((category, categoryIndex) => ({
        id: `stf-round-${roundIndex}-${categoryIndex}`,
        get title() { return ui("Round {roundIndex + 1}", { "roundIndex + 1": (roundIndex + 1) }); },
        prompt: category,
        answer: `Letter ${round.letter} - ${round.difficulty}`,
      }))
  );

  return roundCategories;
};

const buildPreviewItems = (game: GeneratedGame): PreviewItem[] => {
  if (game.config.type === GameType.JEOPARDY && game.jeopardyBoard?.length) {
    return buildGroupedItems(
      game.jeopardyBoard,
      'jeopardy',
      (_question, _groupIndex, questionIndex) => `Question ${questionIndex + 1}`
    );
  }

  if (game.config.type === GameType.PUB_QUIZ && game.pubQuizRounds?.length) {
    return buildGroupedItems(
      game.pubQuizRounds,
      'pubquiz',
      (_question, _groupIndex, questionIndex) => `Question ${questionIndex + 1}`
    );
  }

  if (game.config.type === GameType.STOP_THE_FIRE) {
    return buildStopTheFireItems(game);
  }

  return (game.questions || []).map((question, index) => buildStandardQuestionItem(question, index, game.config.type));
};

const buildPlayableGameFromSelection = (game: GeneratedGame, selectedIds: Set<string>, allItems: PreviewItem[]) => {
  if (selectedIds.size === 0) return null;
  if (selectedIds.size === allItems.length) return game;

  if (game.config.type === GameType.JEOPARDY && game.jeopardyBoard) {
    const nextBoard = game.jeopardyBoard
      .map((category, categoryIndex) => ({
        ...category,
        questions: category.questions.filter((_, questionIndex) => selectedIds.has(`jeopardy-${categoryIndex}-${questionIndex}`)),
      }))
      .filter((category) => category.questions.length > 0);

    return {
      ...game,
      jeopardyBoard: nextBoard,
      config: {
        ...game.config,
        questionCount: nextBoard.reduce((total, category) => total + category.questions.length, 0),
      },
    };
  }

  if (game.config.type === GameType.PUB_QUIZ && game.pubQuizRounds) {
    const nextRounds = game.pubQuizRounds
      .map((round, roundIndex) => ({
        ...round,
        questions: round.questions.filter((_, questionIndex) => selectedIds.has(`pubquiz-${roundIndex}-${questionIndex}`)),
      }))
      .filter((round) => round.questions.length > 0);

    return {
      ...game,
      pubQuizRounds: nextRounds,
      config: {
        ...game.config,
        questionCount: nextRounds.reduce((total, round) => total + round.questions.length, 0),
      },
    };
  }

  if (game.config.type === GameType.STOP_THE_FIRE) {
    const manualCategories = (game.stopTheFireCategories || []).map((category) => category.trim()).filter(Boolean);
    if (manualCategories.length > 0) {
      const nextCategories = manualCategories.filter((_, index) => selectedIds.has(`stf-${index}`));
      return {
        ...game,
        stopTheFireCategories: nextCategories,
        config: {
          ...game.config,
          questionCount: nextCategories.length,
        },
      };
    }

    const roundCategories = (game.stopTheFireRounds || []).flatMap((round, roundIndex) =>
      round.categories
        .map((category) => category.trim())
        .filter(Boolean)
        .map((category, categoryIndex) => ({
          id: `stf-round-${roundIndex}-${categoryIndex}`,
          text: category,
        }))
    );

    const nextCategories = roundCategories
      .filter((category) => selectedIds.has(category.id))
      .map((category) => category.text);

    return {
      ...game,
      stopTheFireCategories: nextCategories,
      config: {
        ...game.config,
        questionCount: nextCategories.length,
      },
    };
  }

  const nextQuestions = (game.questions || []).filter((_, index) => selectedIds.has(`std-${index}`));
  return {
    ...game,
    questions: nextQuestions,
    config: {
      ...game.config,
      questionCount: nextQuestions.length,
    },
  };
};

interface PreviewCardProps {
  item: PreviewItem;
  isSelected: boolean;
  isFlipped: boolean;
  onToggleSelect: () => void;
  onToggleFlip: () => void;
}

const PreviewCard: React.FC<PreviewCardProps> = ({ item, isSelected, isFlipped, onToggleSelect, onToggleFlip }) => { useUiLanguage(); return ((
  <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-5">
    <div className="mb-3 flex items-start justify-between gap-3">
      <div><h3 className="text-sm font-bold text-slate-700">{item.title}</h3>{item.group && <p className="mt-1 text-xs text-slate-500">{item.group}</p>}</div>
      <label className="flex min-h-8 items-start gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
        <input type="checkbox" checked={isSelected} onChange={onToggleSelect} className="h-5 w-5 rounded border-slate-300 text-sky-700" aria-label={ui("Select {item.title.toLowerCase()}", { "item.title.toLowerCase()": (item.title.toLowerCase()) })} /> {ui(" Include")}</label>
    </div>
    <p className="whitespace-pre-wrap break-words text-[15px] font-medium leading-6 text-slate-800">{item.prompt}</p>
    {!!item.options?.length && <div className="mt-3 space-y-2 text-sm text-slate-600">
      {item.options.map((option, index) => <p key={index} className="break-words"><strong className="mr-2">{String.fromCharCode(65 + index)}</strong>{option}</p>)}
    </div>}
    {item.imageUrl && <PreviewQuestionImage sources={item.imageUrls?.length ? item.imageUrls : [item.imageUrl]} label={item.title} image={item.image} refreshQuery={item.refreshQuery || item.prompt} />}
    {isFlipped && <div className="mt-4 rounded-lg border border-green-100 bg-green-50 p-3" role="status"><p className="text-xs font-bold text-green-800 mb-1">{ui("ANSWER")}</p><p className="whitespace-pre-wrap break-words text-sm leading-6 text-green-900">{item.answer}</p></div>}
    <div className="mt-auto flex items-center justify-between gap-3 pt-4">
      <button type="button" onClick={onToggleFlip} aria-expanded={isFlipped} className="workspace-button">{isFlipped ? ui("Hide answer") : ui("Reveal answer")}</button>
      {item.points != null && <span className="text-xs text-slate-500">{item.points} {ui(" pts")}</span>}
    </div>
  </article>
)); };

interface QuickViewTableProps {
  items: PreviewItem[];
  selectedIds: Set<string>;
  onToggleSelect: (itemId: string) => void;
}

const QuickViewTable: React.FC<QuickViewTableProps> = ({ items, selectedIds, onToggleSelect }) => { useUiLanguage(); return ((
  <div className="workspace-preview-list">
    <div className="workspace-preview-columns"><span aria-hidden="true" /><span>{ui("QUESTION")}</span><span>{ui("ANSWERS")}</span></div>
    {items.map(item => {
      const hasMatchingOption = item.options?.some(option => option.trim() === item.answer.trim());
      return <div key={item.id} className="workspace-preview-row">
        <label className="workspace-preview-pick">
          <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => onToggleSelect(item.id)} aria-label={ui("Select {item.title.toLowerCase()}", { "item.title.toLowerCase()": (item.title.toLowerCase()) })} />
        </label>
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
            <span>{item.title}</span>{item.group && <span>· {item.group}</span>}{item.points != null && <span>· {item.points} {ui(" pts")}</span>}
          </div>
          <p className="text-[15px] leading-6 font-medium text-slate-800 whitespace-pre-wrap break-words">{item.prompt}</p>
          {item.imageUrl && <PreviewQuestionImage sources={item.imageUrls || [item.imageUrl]} label={item.prompt} image={item.image} refreshQuery={item.refreshQuery} />}
        </div>
        <div className="workspace-preview-answers min-w-0">
          {item.options?.length ? item.options.map((option, index) => {
            const correct = option.trim() === item.answer.trim();
            return <div key={index} className={`workspace-preview-option ${correct ? 'is-correct' : ''}`}>
              <span className="font-bold shrink-0">{String.fromCharCode(65 + index)}</span><span className="flex-1">{option}</span>
              {correct && <span className="inline-flex items-center gap-1 text-xs font-bold shrink-0"><Check size={14} /><span className="hidden lg:inline">{ui("Correct")}</span><span className="sr-only lg:hidden">{ui("Correct")}</span></span>}
            </div>;
          }) : <p className="text-[15px] leading-6 text-slate-700 whitespace-pre-wrap break-words">{item.answer || ui("No answer provided")}</p>}
          {!!item.options?.length && !hasMatchingOption && <p className="mt-2 px-2 text-sm text-slate-700 whitespace-pre-wrap break-words"><strong>{ui("Answer:")}</strong> {item.answer || ui("Not set")}</p>}
        </div>
      </div>;
    })}
  </div>
)); };

interface StopTheFireOverviewProps {
  items: PreviewItem[];
  selectedIds: Set<string>;
  onToggleSelect: (itemId: string) => void;
}

const StopTheFireOverview: React.FC<StopTheFireOverviewProps> = ({ items, selectedIds, onToggleSelect }) => {
  useUiLanguage();
  const splitIndex = Math.ceil(items.length / 2);
  const itemColumns = [items.slice(0, splitIndex), items.slice(splitIndex)].filter((column) => column.length > 0);

  const renderTableColumn = (columnItems: PreviewItem[], columnIndex: number) => (
    <div key={`stop-the-fire-column-${columnIndex}`} className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white">
      <div className="hidden grid-cols-[44px_minmax(0,1fr)] items-center gap-x-3 bg-slate-50 px-4 py-2.5 lg:grid">
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{ui("Pick")}</div>
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{ui("Category")}</div>
      </div>

      {columnItems.map((item, index) => {
        const isSelected = selectedIds.has(item.id);
        return (
          <div
            key={item.id}
            onClick={() => onToggleSelect(item.id)}
            className={`cursor-pointer transition-colors ${
              index > 0 ? 'border-t border-slate-200' : ''
            } ${isSelected ? 'bg-slate-50' : 'bg-white hover:bg-slate-50/60'}`}
          >
            <div className="grid grid-cols-[38px_minmax(0,1fr)] gap-x-3 px-3 py-2.5 sm:px-4 lg:grid-cols-[44px_minmax(0,1fr)] lg:items-center">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleSelect(item.id);
                }}
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors lg:h-8 lg:w-8 ${
                  isSelected
                    ? 'border-slate-700 bg-slate-100 text-slate-700'
                    : 'border-slate-200 bg-white text-slate-400 hover:text-slate-600'
                }`}
                aria-label={isSelected ? ui("Deselect category") : ui("Select category")}
              >
                {isSelected ? <CheckSquare size={14} className="lg:h-4 lg:w-4" /> : <Square size={14} className="lg:h-4 lg:w-4" />}
              </button>

              <div className="min-w-0">
                <p className="break-words text-[13px] leading-5 text-slate-700 sm:text-sm lg:text-[15px]">{item.prompt}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        {ui("Choose all the categories you want to include in the game. You can customise the categories for each round on the next screen.")}</div>
      <div className="p-3 sm:p-4 lg:grid lg:grid-cols-2 lg:gap-4">
        {itemColumns.map((columnItems, columnIndex) => renderTableColumn(columnItems, columnIndex))}
      </div>
    </div>
  );
};

interface GamePreviewProps {
  game: GeneratedGame;
  source: 'library' | 'community';
  onBack: () => void;
  onPlay: (game: GeneratedGame) => void;
  onPlayAsDifferent?: (game: GeneratedGame) => void;
  onEdit: () => void;
  onSave?: () => void | Promise<void>;
  onShare?: () => void | Promise<void>;
  onStudentShare?: (selectedItemIds: string[]) => void | Promise<void>;
  onLiveQuiz?: (selectedItemIds: string[]) => void | Promise<void>;
  saveLabel?: string;
}

export const GamePreview: React.FC<GamePreviewProps> = ({ game, source, onBack, onPlay, onPlayAsDifferent, onEdit, onSave, onShare, onStudentShare, onLiveQuiz, saveLabel }) => {
  useUiLanguage();
  const items = useMemo(() => buildPreviewItems(game), [game]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const promptDialogRef = useWorkspaceDialog(isPromptOpen, () => setIsPromptOpen(false));
  const [playChoiceGame, setPlayChoiceGame] = useState<GeneratedGame | null>(null);
  const [viewMode, setViewMode] = useState<'study' | 'quick'>('quick');
  const [randomSelectionCount, setRandomSelectionCount] = useState(20);
  const [showRandomSelection, setShowRandomSelection] = useState(false);

  useEffect(() => {
    setSelectedIds(new Set(items.map((item) => item.id)));
    setFlippedIds(new Set());
    setRandomSelectionCount(Math.min(20, Math.max(1, items.length)));
  }, [items]);

  const selectedCount = selectedIds.size;
  const allSelected = items.length > 0 && selectedCount === items.length;

  const toggleSelected = (itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleFlipped = (itemId: string) => {
    setFlippedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handlePlay = () => {
    const nextGame = buildPlayableGameFromSelection(game, selectedIds, items);
    if (!nextGame) return;
    if (onPlayAsDifferent && getCompatibleGameTypes(nextGame).length > 0) {
      setPlayChoiceGame(nextGame);
      return;
    }
    onPlay(nextGame);
  };

  const handlePlayOriginal = () => {
    if (!playChoiceGame) return;
    setPlayChoiceGame(null);
    onPlay(playChoiceGame);
  };

  const handlePlayDifferent = () => {
    if (!playChoiceGame || !onPlayAsDifferent) return;
    setPlayChoiceGame(null);
    onPlayAsDifferent(playChoiceGame);
  };

  const selectRandomItems = () => {
    const targetCount = Math.max(1, Math.min(items.length, randomSelectionCount || 1));
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    setSelectedIds(new Set(shuffled.slice(0, targetCount).map((item) => item.id)));
  };

  const sourceLabel = source === 'community' ? ui("Community") : ui("My Library");
  const createdByName = game.config.originalCreatorName || game.authorName || 'Teacher';
  const createdDate = formatCreatedDate(game.createdAt);
  const aiPrompt = game.config.customInstructions?.trim();
  const creationLabel = game.config.isAI ? ui("Created using AI") : ui("Created manually");
  const isStopTheFireOverview = game.config.type === GameType.STOP_THE_FIRE;
  const backgroundImage = PREVIEW_BACKGROUND_IMAGES[game.config.type];
  const previewSaveLabel = (saveLabel ? ui(saveLabel) : undefined) || (source === 'community' ? ui("Save a copy") : ui("Save game"));

  return (
    <div className="game-workspace relative min-h-screen">
      <div className="workspace-shell">
        <button onClick={onBack} className="workspace-back"><ArrowLeft size={18} /> {ui(" Back to ")}{sourceLabel}</button>
        <header className="workspace-preview-header">
          <div className="shrink-0">
            <GameCover cover={game.config.coverImage} title={game.title} publicGameId={source === 'community' ? game.id : undefined} fallbackImage={backgroundImage} className="workspace-preview-cover" />
            <CoverCredit cover={game.config.coverImage} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="workspace-eyebrow mb-2">{game.config.type} <span className="px-1 text-slate-300">/</span> {sourceLabel}</p>
            <h1 translate="no" className="notranslate workspace-heading">{game.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
              <span>{ui("By ")}<strong>{createdByName}</strong></span><span>{creationLabel}</span>{createdDate !== "Date unavailable" && <span>{createdDate}</span>}<span>{items.length} {isStopTheFireOverview ? ui("categories") : ui("questions")}</span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" onClick={onEdit} className="workspace-button"><Edit3 size={16} /> {ui(" Edit game")}</button>
              {onSave && <button type="button" onClick={() => void onSave()} className="workspace-button"><Save size={16} /> {previewSaveLabel}</button>}
              {(onShare || onStudentShare) && <WorkspaceMenu label={ui("Share")}>
                {onShare && <button type="button" onClick={() => void onShare()}><Share2 size={16} /> {ui(" Teacher share")}</button>}
                {onStudentShare && <button type="button" disabled={!selectedCount} onClick={() => void onStudentShare(Array.from(selectedIds))}><QrCode size={16} /> {ui(" Student share")}</button>}
              </WorkspaceMenu>}
              {aiPrompt && <WorkspaceMenu label={ui("Details")}>
                <p className="px-3 py-2 text-sm text-slate-600">{creationLabel}</p>
                <button type="button" onClick={() => setIsPromptOpen(true)}><Sparkles size={16} /> {ui(" View instructions")}</button>
              </WorkspaceMenu>}
            </div>
          </div>
        </header>
        <GameWebSources config={game.config} />
        <section className="workspace-toolbar" aria-label={ui("Question selection")}>
          <div className="workspace-toolbar-row justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-bold">{isStopTheFireOverview ? ui("Categories") : ui("Questions")}</h2>
              <span className="text-sm text-slate-600" role="status">{selectedCount} {ui(" of ")}{items.length} {ui(" selected")}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {onLiveQuiz && <button type="button" onClick={() => void onLiveQuiz(Array.from(selectedIds))} disabled={!selectedCount}
                className={`workspace-button ${game.config.type === GameType.LIVE_QUIZ_CHALLENGE ? 'workspace-button-primary' : ''}`}><Radio size={16} /> {ui(" Live quiz")}</button>}
              <button type="button" onClick={handlePlay} disabled={!selectedCount} className="workspace-button workspace-button-play" aria-label={ui("Play selected")}>
                <Play size={16} fill="currentColor" /> {ui(" Play ")}{selectedCount} {isStopTheFireOverview ? ui("categories") : ui("questions")}
              </button>
            </div>
          </div>
          <div className="workspace-toolbar-row mt-3 border-t border-slate-100 pt-3">
            {!isStopTheFireOverview && <div className="workspace-view-switch" aria-label={ui("Question view")}>
              <button type="button" onClick={() => setViewMode('quick')} aria-pressed={viewMode === 'quick'}><List size={16} /> {ui(" List")}</button>
              <button type="button" onClick={() => setViewMode('study')} aria-pressed={viewMode === 'study'}><Layers size={16} /> {ui(" Study cards")}</button>
            </div>}
            <button type="button" onClick={() => setSelectedIds(new Set(items.map(item => item.id)))} disabled={!items.length || allSelected} className="px-2 py-2 text-sm font-semibold text-slate-600 disabled:opacity-40">{ui("Select all")}</button>
            <button type="button" onClick={() => setSelectedIds(new Set())} disabled={!selectedCount} className="px-2 py-2 text-sm font-semibold text-slate-600 disabled:opacity-40">{ui("Clear selection")}</button>
            <button type="button" onClick={() => setShowRandomSelection(!showRandomSelection)} aria-expanded={showRandomSelection} className="workspace-button ml-auto"><Shuffle size={16} /> {ui(" Random selection")}</button>
          </div>
          {showRandomSelection && <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-3">
            <label htmlFor="random-question-count" className="text-sm font-semibold text-slate-700">{ui("Choose at random")}</label>
            <input id="random-question-count" type="number" min={1} max={Math.max(1, items.length)} value={randomSelectionCount}
              onChange={event => setRandomSelectionCount(Math.max(1, Math.min(items.length || 1, Number(event.target.value) || 1)))}
              className="w-20 rounded-lg border-slate-300 text-sm" aria-label={ui("Random question count")} />
            <span className="text-sm text-slate-600">{isStopTheFireOverview ? ui("categories") : ui("questions")}</span>
            <button type="button" disabled={!items.length} className="workspace-button" onClick={() => { selectRandomItems(); setShowRandomSelection(false); }}>{ui("Apply selection")}</button>
          </div>}
          {!selectedCount && <p className="mt-3 text-sm text-slate-600">{ui("Select at least one ")}{isStopTheFireOverview ? ui("category") : ui("question")} {ui(" to play.")}</p>}
        </section>

        {items.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Layers size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-700">{ui("Nothing to preview yet")}</h2>
            <p className="mx-auto mt-2 max-w-lg text-slate-500">
              {ui("This game does not have saved question cards to preview. Open the editor if you want to check or build the content directly.")}</p>
          </div>
        ) : (
          <div translate="no" className="notranslate mt-4">
            {isStopTheFireOverview ? (
              <StopTheFireOverview items={items} selectedIds={selectedIds} onToggleSelect={toggleSelected} />
            ) : viewMode === 'study' ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <PreviewCard
                    key={item.id}
                    item={item}
                    isSelected={selectedIds.has(item.id)}
                    isFlipped={flippedIds.has(item.id)}
                    onToggleSelect={() => toggleSelected(item.id)}
                    onToggleFlip={() => toggleFlipped(item.id)}
                  />
                ))}
              </div>
            ) : (
              <QuickViewTable items={items} selectedIds={selectedIds} onToggleSelect={toggleSelected} />
            )}
          </div>
        )}

        {isPromptOpen && aiPrompt && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
            <div ref={promptDialogRef} role="dialog" aria-modal="true" aria-label={ui("Generation instructions")} tabIndex={-1}
              className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/75 bg-white/90 shadow-[0_24px_48px_rgba(15,23,42,0.16)] backdrop-blur-xl"
              style={{ maxHeight: AI_PROMPT_MODAL_MAX_HEIGHT }}
            >
              <button
                type="button"
                onClick={() => setIsPromptOpen(false)}
                className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label={ui("Close AI prompt")}
              >
                <X size={18} />
              </button>
              <div className="shrink-0 px-6 pt-6 sm:px-8 sm:pt-8">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
                  <Sparkles size={13} />
                  {ui("AI Prompt")}</div>
                <h2 className="pr-10 font-display text-2xl font-bold text-slate-800">{ui("Prompt used to create this game")}</h2>
              </div>
              <div className="min-h-0 overflow-y-auto px-6 pb-6 pt-4 sm:px-8 sm:pb-8">
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
                  {aiPrompt}
                </p>
              </div>
            </div>
          </div>
        )}

        {playChoiceGame && (
          <div className="fixed inset-0 z-[170] flex items-center justify-center bg-sky-950/35 p-4 backdrop-blur-sm">
            <div className="game-play-choice-dialog relative w-full max-w-lg rounded-3xl border border-white bg-gradient-to-b from-white via-sky-50/80 to-yellow-50/60 p-6 shadow-[0_24px_48px_rgba(14,116,144,0.18)]">
              <button
                type="button"
                onClick={() => setPlayChoiceGame(null)}
                className="absolute right-4 top-4 rounded-full border border-sky-100 bg-white/80 p-2 text-slate-400 transition-colors hover:bg-sky-50 hover:text-brand-blue"
                aria-label={ui("Close play menu")}
              >
                <X size={18} />
              </button>
              <h2 className="pr-10 font-display text-2xl font-bold text-slate-900">{ui("Choose how to play")}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                {ui("Use the selected questions in this game, or try the same question set in another compatible game.")}</p>
              <div className="mt-6 grid gap-3">
                <button
                  type="button"
                  onClick={handlePlayOriginal}
                  className="flex items-center justify-between rounded-2xl border border-sky-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-brand-blue hover:bg-sky-50"
                >
                  <span>
                    <span className="block font-bold text-slate-800">{ui("Play ")}{playChoiceGame.config.type}</span>
                    <span className="block text-sm font-semibold text-slate-600">{ui("Use the original game format.")}</span>
                  </span>
                  <span className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-brand-blue">
                    <Play size={18} fill="currentColor" />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handlePlayDifferent}
                  className="flex items-center justify-between rounded-2xl border border-sky-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-brand-blue hover:bg-sky-50"
                >
                  <span>
                    <span className="block font-bold text-slate-800">{ui("Play question set with a different game")}</span>
                    <span className="block text-sm font-semibold text-slate-600">{ui("Choose from compatible games next.")}</span>
                  </span>
                  <span className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-yellow/55 text-slate-900">
                    <Layers size={18} />
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


