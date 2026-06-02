import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calendar, CheckSquare, Edit3, Globe, ImageIcon, Layers, Library, List, Play, QrCode, Radio, RotateCcw, Save, Share2, Shuffle, Sparkles, Square, X } from 'lucide-react';
import { GeneratedGame, GeneratedQuestion, GameType, JeopardyCategory } from '../../types';
import { Avatar } from '../Avatar';
import { resolveGameImageUrl, resolveGameImageUrls } from '../../utils/gameImage';
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
        alt={`Preview image for ${label}`}
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
  [GameType.PUB_QUIZ]: '/assets/games/pubquiz.png',
  [GameType.SURVEY_SHOWDOWN]: '/assets/games/survey.png',
  [GameType.STOP_THE_FIRE]: '/assets/games/stopthefire.png',
  [GameType.MILLIONAIRE]: '/assets/games/millionaire.png',
  [GameType.DARTS]: '/assets/games/darts.png',
  [GameType.SNAKES_LADDERS]: '/assets/games/snakes.png',
  [GameType.LIVE_QUIZ_CHALLENGE]: '/assets/games/livequiz.png',
};

const PREVIEW_PAGE_THEME = {
  pageBackground: '#f8fafc',
  panelBackground: '#ffffff',
  panelBorder: 'rgba(241, 245, 249, 1)',
  panelShadow: '0 10px 24px rgba(15, 23, 42, 0.06)',
  imageShellBackground: 'transparent',
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
  imageUrl: resolveGameImageUrl(question.image?.url, question.image?.thumbUrl),
  imageUrls: resolveGameImageUrls(question.image?.url, question.image?.thumbUrl),
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
      imageUrl: resolveGameImageUrl(question.image?.url, question.image?.thumbUrl),
      imageUrls: resolveGameImageUrls(question.image?.url, question.image?.thumbUrl),
      image: question.image,
      refreshQuery: question.image?.searchQuery || getLegacyImageRefreshQuery(question, prefix === 'pubquiz' ? GameType.PUB_QUIZ : GameType.JEOPARDY),
    }))
  );

const buildStopTheFireItems = (game: GeneratedGame): PreviewItem[] => {
  const manualCategories = (game.stopTheFireCategories || []).map((category) => category.trim()).filter(Boolean);
  if (manualCategories.length > 0) {
    return manualCategories.map((category, index) => ({
      id: `stf-${index}`,
      title: `Category ${index + 1}`,
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
        title: `Round ${roundIndex + 1}`,
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

const PreviewCard: React.FC<PreviewCardProps> = ({ item, isSelected, isFlipped, onToggleSelect, onToggleFlip }) => (
  <div
    className="relative rounded-[1.75rem] bg-white/80 backdrop-blur-sm transition-all"
    style={{
      border: `1px solid ${isSelected ? 'rgba(51, 65, 85, 0.24)' : 'rgba(203, 213, 225, 0.88)'}`,
      boxShadow: isSelected
        ? '0 0 0 1px rgba(30, 41, 59, 0.08), 0 18px 42px rgba(30, 58, 138, 0.18)'
        : '0 14px 34px rgba(30, 58, 138, 0.12)',
    }}
  >
    <button
      type="button"
      onClick={onToggleSelect}
      className={`absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
        isSelected
          ? 'border-slate-700 bg-slate-100 text-slate-700'
          : 'border-slate-200 bg-white text-slate-400 hover:text-slate-600'
      }`}
      aria-label={isSelected ? 'Deselect item' : 'Select item'}
      title={isSelected ? 'Selected for play' : 'Select for play'}
    >
      {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
    </button>

    <div
      className="cursor-pointer p-4 pr-14"
      role="button"
      tabIndex={0}
      onClick={onToggleFlip}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onToggleFlip();
        }
      }}
      aria-label={isFlipped ? 'Flip card back to question' : 'Flip card to answer'}
    >
      <div className="grid">
        <div
          className={`col-start-1 row-start-1 rounded-2xl p-4 transition-opacity duration-200 ${
            isFlipped ? 'invisible opacity-0 pointer-events-none' : 'visible opacity-100'
          }`}
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.92) 100%)',
            border: '1px solid rgba(203, 213, 225, 0.88)',
          }}
        >
          <div className="mb-3">
            {item.group && (
              <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                {item.group}
              </div>
            )}
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-lg font-bold leading-snug break-words text-slate-800">
                {item.title}
              </h3>
              <div className="flex shrink-0 items-center gap-2">
                {item.points ? (
                  <span
                    className="inline-flex min-w-[72px] items-center justify-center rounded-full px-3 py-1 text-xs font-bold"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(241,245,249,0.96) 100%)',
                      color: '#334155',
                      boxShadow: 'inset 0 0 0 1px rgba(203, 213, 225, 0.95)',
                    }}
                  >
                    {item.points} pts
                  </span>
                ) : null}
                {item.imageUrl && <ImageIcon size={14} className="text-slate-400" />}
              </div>
            </div>
          </div>

          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{item.prompt}</p>

          {item.options && item.options.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs leading-5 text-slate-500">
              {item.options.slice(0, 4).map((option, index) => (
                <p key={`${item.id}-option-${index}`} className="break-words">
                  <span className="font-bold text-slate-700">{String.fromCharCode(65 + index)}.</span> {option}
                </p>
              ))}
            </div>
          )}

          {item.imageUrl && (
            <PreviewQuestionImage
              sources={item.imageUrls?.length ? item.imageUrls : [item.imageUrl]}
              label={item.title}
              image={item.image}
              refreshQuery={item.refreshQuery || item.prompt}
            />
          )}
        </div>

        <div
          className={`col-start-1 row-start-1 rounded-2xl p-4 text-white transition-opacity duration-200 ${
            isFlipped ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none'
          }`}
          style={{
            background: 'linear-gradient(180deg, rgba(71,85,105,0.96) 0%, rgba(51,65,85,0.94) 100%)',
            border: '1px solid rgba(100, 116, 139, 0.62)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <div className="mb-3">
            {item.group && (
              <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300">
                {item.group}
              </div>
            )}
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-lg font-bold leading-snug break-words text-white">
                {item.title}
              </h3>
              <div className="flex shrink-0 items-center gap-2">
                {item.points ? (
                  <span
                    className="inline-flex min-w-[72px] items-center justify-center rounded-full px-3 py-1 text-xs font-bold border"
                    style={{
                      background: 'rgba(255,255,255,0.10)',
                      color: '#f8fafc',
                      borderColor: 'rgba(255,255,255,0.14)',
                    }}
                  >
                    {item.points} pts
                  </span>
                ) : null}
                {item.imageUrl && <ImageIcon size={14} className="text-slate-200" />}
              </div>
            </div>
          </div>

          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300">Answer</div>
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-white/95">{item.answer}</p>
        </div>
      </div>

      <div
        className="mt-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.14em]"
        style={
          isFlipped
            ? { background: 'rgba(51,65,85,0.96)', color: '#f8fafc' }
            : { border: '1px solid rgba(203, 213, 225, 0.9)', background: '#fff', color: '#475569' }
        }
      >
        <RotateCcw size={13} />
        {isFlipped ? 'Click card to flip back' : 'Click card to show answer'}
      </div>
    </div>
  </div>
);

interface QuickViewTableProps {
  items: PreviewItem[];
  selectedIds: Set<string>;
  onToggleSelect: (itemId: string) => void;
}

const QuickViewTable: React.FC<QuickViewTableProps> = ({ items, selectedIds, onToggleSelect }) => (
  <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
    <div className="hidden md:grid md:grid-cols-[48px_minmax(0,2fr)_minmax(0,1.15fr)_minmax(0,1fr)] md:items-center md:gap-x-3 md:bg-slate-50 md:px-4 md:py-3">
      <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Pick</div>
      <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Question</div>
      <div className="border-l border-slate-200 pl-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Options</div>
      <div className="border-l border-slate-200 pl-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Answer</div>
    </div>

    {items.map((item, index) => {
      const isSelected = selectedIds.has(item.id);
      const optionsText = buildCompactOptionsText(item.options);

      return (
        <div
          key={item.id}
          onClick={() => onToggleSelect(item.id)}
          className={`cursor-pointer transition-colors ${
            index > 0 ? 'border-t border-slate-200' : ''
          } ${isSelected ? 'bg-slate-50/90' : 'bg-white hover:bg-slate-50/60'}`}
        >
          <div className="grid grid-cols-[42px_minmax(0,1fr)] gap-x-3 gap-y-2 px-3 py-3 sm:px-4 md:grid-cols-[48px_minmax(0,2fr)_minmax(0,1.15fr)_minmax(0,1fr)] md:items-start md:gap-y-0">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleSelect(item.id);
              }}
              className={`row-span-3 mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors md:row-span-1 ${
                isSelected
                  ? 'border-slate-700 bg-slate-100 text-slate-700'
                  : 'border-slate-200 bg-white text-slate-400 hover:text-slate-600'
              }`}
              aria-label={isSelected ? 'Deselect item' : 'Select item'}
            >
              {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
            </button>

            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h3
                    className="font-display font-bold leading-tight text-slate-800"
                    style={{ fontSize: 'clamp(13px, 0.85vw, 16px)' }}
                  >
                    {item.title}
                  </h3>
                {item.group && (
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    {item.group}
                  </span>
                )}
                {item.points ? (
                  <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200">
                    {item.points} pts
                  </span>
                ) : null}
                {item.imageUrl && <ImageIcon size={12} className="text-slate-400" />}
              </div>
              <p
                className="break-words text-slate-600"
                style={{ fontSize: 'clamp(11px, 0.78vw, 14px)', lineHeight: 1.4 }}
                title={item.prompt}
              >
                {item.prompt}
              </p>
            </div>

            <div className="min-w-0 md:border-l md:border-slate-200 md:pl-4 md:pt-0.5">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 md:hidden">Options</div>
              <p
                className="break-words text-slate-600"
                style={{ fontSize: 'clamp(11px, 0.74vw, 13px)', lineHeight: 1.4 }}
                title={optionsText || 'Open response'}
              >
                {optionsText || 'Open response'}
              </p>
            </div>

            <div className="min-w-0 md:border-l md:border-slate-200 md:pl-4 md:pt-0.5">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 md:hidden">Answer</div>
              <p
                className="break-words text-slate-700"
                style={{ fontSize: 'clamp(11px, 0.74vw, 13px)', lineHeight: 1.4 }}
                title={item.answer}
              >
                {item.answer}
              </p>
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

interface StopTheFireOverviewProps {
  items: PreviewItem[];
  selectedIds: Set<string>;
  onToggleSelect: (itemId: string) => void;
}

const StopTheFireOverview: React.FC<StopTheFireOverviewProps> = ({ items, selectedIds, onToggleSelect }) => {
  const splitIndex = Math.ceil(items.length / 2);
  const itemColumns = [items.slice(0, splitIndex), items.slice(splitIndex)].filter((column) => column.length > 0);

  const renderTableColumn = (columnItems: PreviewItem[], columnIndex: number) => (
    <div key={`stop-the-fire-column-${columnIndex}`} className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white">
      <div className="hidden grid-cols-[44px_minmax(0,1fr)] items-center gap-x-3 bg-slate-50 px-4 py-2.5 lg:grid">
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Pick</div>
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Category</div>
      </div>

      {columnItems.map((item, index) => {
        const isSelected = selectedIds.has(item.id);
        return (
          <div
            key={item.id}
            onClick={() => onToggleSelect(item.id)}
            className={`cursor-pointer transition-colors ${
              index > 0 ? 'border-t border-slate-200' : ''
            } ${isSelected ? 'bg-slate-50/90' : 'bg-white hover:bg-slate-50/60'}`}
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
                aria-label={isSelected ? 'Deselect category' : 'Select category'}
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
        Choose all the categories you want to include in the game. You can customise the categories for each round on the next screen.
      </div>
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
  const items = useMemo(() => buildPreviewItems(game), [game]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [playChoiceGame, setPlayChoiceGame] = useState<GeneratedGame | null>(null);
  const [viewMode, setViewMode] = useState<'study' | 'quick'>('quick');
  const [randomSelectionCount, setRandomSelectionCount] = useState(20);

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

  const sourceLabel = source === 'community' ? 'Community' : 'My Library';
  const sourceIcon = source === 'community' ? <Globe size={14} /> : <Library size={14} />;
  const createdByName = game.config.originalCreatorName || game.authorName || 'Teacher';
  const createdByAvatar = game.config.originalCreatorAvatar || game.authorAvatar || game.config.authorAvatar;
  const createdDate = formatCreatedDate(game.createdAt);
  const aiPrompt = game.config.customInstructions?.trim();
  const creationLabel = game.config.isAI ? 'Created using AI' : 'Created manually';
  const isStopTheFireOverview = game.config.type === GameType.STOP_THE_FIRE;
  const instructionText =
    isStopTheFireOverview
      ? 'Category Overview: tick categories to include, then play or edit.'
      : viewMode === 'study'
      ? 'Study Mode: click cards to flip. Tick cards to include.'
      : 'Quick View: scan rows and tick questions to include.';
  const backgroundImage = PREVIEW_BACKGROUND_IMAGES[game.config.type];
  const pageTheme = PREVIEW_PAGE_THEME;
  const previewSaveLabel = saveLabel || (source === 'community' ? 'Save copy' : 'Save game');
  const secondaryActionButtonClass =
    'inline-flex h-12 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white/86 px-2.5 text-[11px] font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-3 sm:text-sm';
  const selectActionButtonClass =
    'inline-flex h-12 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-700 transition-colors hover:border-brand-blue hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-3 sm:text-sm';
  const liveQuizActionButtonClass =
    'inline-flex h-12 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-sky-500 bg-sky-600 px-2.5 text-[11px] font-bold text-white shadow-md transition-colors hover:border-sky-600 hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-4 sm:text-sm';
  const playActionButtonClass =
    'inline-flex h-12 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-brand-yellow px-2.5 text-[11px] font-bold text-slate-900 shadow-md transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-3 sm:text-sm';
  const topActionCount = [onSave, onShare, onStudentShare].filter(Boolean).length + 1;
  const topActionGridClass =
    topActionCount === 4
      ? 'grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3'
      : 'grid grid-cols-3 gap-2 sm:gap-3';
  const selectionActionGridClass = onLiveQuiz
    ? 'grid grid-cols-2 gap-2 sm:grid-cols-[1.05fr_0.85fr_1.08fr_1.1fr_1.18fr] sm:gap-3'
    : 'grid grid-cols-2 gap-2 sm:grid-cols-[0.85fr_0.85fr_1fr_1.25fr] sm:gap-3';

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50" style={{ background: pageTheme.pageBackground }}>
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <button onClick={onBack} className="mb-6 flex items-center text-slate-500 hover:text-sky-600">
          <ArrowLeft size={18} className="mr-2" /> Back to {sourceLabel}
        </button>

        <div
          className="relative overflow-hidden rounded-[2rem] border p-6 shadow-sm sm:p-8"
          style={{
            background: pageTheme.panelBackground,
            borderColor: pageTheme.panelBorder,
            boxShadow: pageTheme.panelShadow,
          }}
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_400px]">
            <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600">
                {sourceIcon}
                {sourceLabel}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-bold uppercase text-slate-600">
                {game.config.type}
              </span>
              {game.config.isAI ? (
                <button
                  type="button"
                  onClick={() => aiPrompt && setIsPromptOpen(true)}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase border transition-colors ${
                    aiPrompt ? 'cursor-pointer' : ''
                  }`}
                  style={{
                    background: aiPrompt ? 'rgba(255,255,255,0.82)' : 'rgba(248,250,252,0.84)',
                    color: '#475569',
                    borderColor: aiPrompt ? 'rgba(148, 163, 184, 0.36)' : 'rgba(203, 213, 225, 0.9)',
                  }}
                  title={aiPrompt ? 'Click to view AI prompt' : undefined}
                >
                  <Sparkles size={13} />
                  {creationLabel}
                </button>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-bold uppercase text-slate-600">
                  <Edit3 size={13} />
                  {creationLabel}
                </span>
              )}
            </div>

            <h1 className="font-display text-3xl font-bold text-slate-800 sm:text-4xl">{game.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <div className="inline-flex items-center gap-2">
                <Avatar
                  name={createdByName}
                  src={createdByAvatar}
                  className="h-7 w-7"
                  textClassName="text-[10px]"
                />
                <span>
                  Created by <span className="font-bold text-slate-700">{createdByName}</span>
                </span>
              </div>
              <span className="hidden text-slate-300 sm:inline">|</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600">
                <Calendar size={14} />
                Created {createdDate}
              </span>
              <span className="hidden text-slate-300 sm:inline">|</span>
              <span className="font-semibold text-slate-600">{items.length} question{items.length === 1 ? '' : 's'}</span>
              <span className="hidden text-slate-300 sm:inline">|</span>
              <span className="font-semibold text-slate-600">{selectedCount} selected</span>
            </div>

            <div className="mt-5 space-y-3">
              <div className={topActionGridClass}>
                <button
                  type="button"
                  onClick={onEdit}
                  className={secondaryActionButtonClass}
                  aria-label="Edit game"
                  title="Edit game"
                >
                  <Edit3 size={16} />
                  <span className="hidden sm:inline">Edit game</span>
                </button>
                {onSave && (
                  <button
                    type="button"
                    onClick={() => void onSave()}
                    className={secondaryActionButtonClass}
                    aria-label={previewSaveLabel}
                    title={previewSaveLabel}
                  >
                    <Save size={16} />
                    <span className="hidden sm:inline">{previewSaveLabel}</span>
                  </button>
                )}
                {onShare && (
                  <button
                    type="button"
                    onClick={() => void onShare()}
                    className={secondaryActionButtonClass}
                    aria-label="Teacher share"
                    title="Teacher share"
                  >
                    <Share2 size={16} />
                    <span className="hidden sm:inline">Teacher share</span>
                  </button>
                )}
                {onStudentShare && (
                  <button
                    type="button"
                    onClick={() => void onStudentShare(Array.from(selectedIds))}
                    disabled={selectedCount === 0}
                    className={secondaryActionButtonClass}
                    aria-label="Student share"
                    title="Student share"
                  >
                    <QrCode size={16} />
                    <span className="hidden sm:inline">Student share</span>
                  </button>
                )}
              </div>
              <div className={selectionActionGridClass}>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set(items.map((item) => item.id)))}
                  disabled={items.length === 0 || allSelected}
                  className={secondaryActionButtonClass}
                >
                  <CheckSquare size={17} className="shrink-0" />
                  <span>Select all</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  disabled={selectedCount === 0}
                  className={selectActionButtonClass}
                >
                  <Square size={17} className="shrink-0" />
                  <span>Clear</span>
                </button>
                <div className="flex h-12 min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, items.length)}
                    value={randomSelectionCount}
                    onChange={(event) => setRandomSelectionCount(Math.max(1, Math.min(items.length || 1, Number(event.target.value) || 1)))}
                    className="min-w-0 flex-1 border-0 px-2 text-center text-sm font-black text-slate-700 outline-none"
                    aria-label="Random question count"
                    title="How many questions to choose"
                  />
                  <button
                    type="button"
                    onClick={selectRandomItems}
                    disabled={items.length === 0}
                    className="inline-flex w-12 items-center justify-center border-l border-slate-200 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Choose random questions"
                    title="Choose random questions"
                  >
                    <Shuffle size={15} />
                  </button>
                </div>
                {onLiveQuiz && (
                  <button
                    type="button"
                    onClick={() => void onLiveQuiz(Array.from(selectedIds))}
                    disabled={selectedCount === 0}
                    className={liveQuizActionButtonClass}
                    aria-label="Live quiz"
                    title="Live quiz"
                  >
                    <Radio size={16} className="shrink-0" />
                    <span className="hidden sm:inline">Live quiz</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePlay}
                  disabled={selectedCount === 0}
                  className={playActionButtonClass}
                  style={{ boxShadow: '0 16px 30px rgba(250, 204, 21, 0.24)' }}
                  aria-label="Play selected"
                  title="Play selected"
                >
                  <Play size={17} className="shrink-0" fill="currentColor" />
                  <span className="hidden sm:inline">Play selected</span>
                </button>
              </div>
            </div>
          </div>

            {backgroundImage ? (
              <div className="relative hidden min-h-[240px] items-center justify-center overflow-hidden rounded-[1.75rem] lg:flex">
                <div
                  className="absolute inset-0"
                  style={{
                    background: pageTheme.imageShellBackground,
                  }}
                />
                <img
                  src={backgroundImage}
                  alt=""
                  className="relative z-10 h-full w-full scale-[1.01] object-contain"
                  style={{
                    WebkitMaskImage:
                      'radial-gradient(ellipse 72% 72% at center, rgba(0,0,0,1) 34%, rgba(0,0,0,0.96) 50%, rgba(0,0,0,0.72) 66%, rgba(0,0,0,0.28) 82%, transparent 96%)',
                    maskImage:
                      'radial-gradient(ellipse 72% 72% at center, rgba(0,0,0,1) 34%, rgba(0,0,0,0.96) 50%, rgba(0,0,0,0.72) 66%, rgba(0,0,0,0.28) 82%, transparent 96%)',
                  }}
                />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0)_36%,rgba(255,255,255,0.08)_56%,rgba(255,255,255,0.36)_74%,rgba(255,255,255,0.84)_92%,rgba(255,255,255,1)_100%)]" />
              </div>
            ) : null}
          </div>
        </div>

        {!isStopTheFireOverview && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('quick')}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                viewMode === 'quick'
                  ? 'border-brand-blue bg-sky-50 text-brand-blue'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800'
              }`}
              aria-pressed={viewMode === 'quick'}
            >
              <List size={15} />
              Quick View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('study')}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                viewMode === 'study'
                  ? 'border-brand-blue bg-sky-50 text-brand-blue'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800'
              }`}
              aria-pressed={viewMode === 'study'}
            >
              <Layers size={15} />
              Study Mode
            </button>
            <span className="max-w-full text-sm font-semibold text-slate-500">
              {instructionText}
            </span>
          </div>
        )}

        {items.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Layers size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-700">Nothing to preview yet</h2>
            <p className="mx-auto mt-2 max-w-lg text-slate-500">
              This game does not have saved question cards to preview. Open the editor if you want to check or build the content directly.
            </p>
          </div>
        ) : (
          <div className="mt-8">
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
            <div
              className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/75 bg-white/90 shadow-[0_24px_48px_rgba(15,23,42,0.16)] backdrop-blur-xl"
              style={{ maxHeight: AI_PROMPT_MODAL_MAX_HEIGHT }}
            >
              <button
                type="button"
                onClick={() => setIsPromptOpen(false)}
                className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close AI prompt"
              >
                <X size={18} />
              </button>
              <div className="shrink-0 px-6 pt-6 sm:px-8 sm:pt-8">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
                  <Sparkles size={13} />
                  AI Prompt
                </div>
                <h2 className="pr-10 font-display text-2xl font-bold text-slate-800">Prompt used to create this game</h2>
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
            <div className="relative w-full max-w-lg rounded-3xl border border-white bg-gradient-to-b from-white via-sky-50/80 to-yellow-50/60 p-6 shadow-[0_24px_48px_rgba(14,116,144,0.18)]">
              <button
                type="button"
                onClick={() => setPlayChoiceGame(null)}
                className="absolute right-4 top-4 rounded-full border border-sky-100 bg-white/80 p-2 text-slate-400 transition-colors hover:bg-sky-50 hover:text-brand-blue"
                aria-label="Close play menu"
              >
                <X size={18} />
              </button>
              <h2 className="pr-10 font-display text-2xl font-bold text-slate-900">Choose how to play</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                Use the selected questions in this game, or try the same question set in another compatible game.
              </p>
              <div className="mt-6 grid gap-3">
                <button
                  type="button"
                  onClick={handlePlayOriginal}
                  className="flex items-center justify-between rounded-2xl border border-sky-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-brand-blue hover:bg-sky-50"
                >
                  <span>
                    <span className="block font-bold text-slate-800">Play {playChoiceGame.config.type}</span>
                    <span className="block text-sm font-semibold text-slate-600">Use the original game format.</span>
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
                    <span className="block font-bold text-slate-800">Play question set with a different game</span>
                    <span className="block text-sm font-semibold text-slate-600">Choose from compatible games next.</span>
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


