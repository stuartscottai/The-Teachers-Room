import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckSquare, Edit3, Globe, ImageIcon, Layers, Library, Play, RotateCcw, Sparkles, Square, X } from 'lucide-react';
import { GeneratedGame, GeneratedQuestion, GameType, JeopardyCategory } from '../../types';
import { Avatar } from '../Avatar';
import { resolveGameImageUrl } from '../../utils/gameImage';

type PreviewItem = {
  id: string;
  title: string;
  points?: number;
  prompt: string;
  answer: string;
  options?: string[];
  group?: string;
  imageUrl?: string | null;
};

const cleanPreviewAnswerText = (value: string) =>
  String(value || '').replace(/\s+\(\d+\)\s*$/, '').trim();

const buildAnswerSummary = (question: GeneratedQuestion) => {
  const surveyAnswers = (question.surveyAnswers || []).filter((answer) => answer.text?.trim());
  if (surveyAnswers.length > 0) {
    return surveyAnswers
      .slice(0, 8)
      .map((answer) => `${answer.text}${answer.score ? ` (${answer.score})` : ''}`)
      .join(' | ');
  }

  return cleanPreviewAnswerText(question.answer?.trim() || '') || 'No answer saved yet.';
};

const buildStandardQuestionItem = (question: GeneratedQuestion, index: number): PreviewItem => ({
  id: `std-${index}`,
  title: `Question ${index + 1}`,
  points: question.points,
  prompt: question.question?.trim() || 'No prompt saved yet.',
  answer: buildAnswerSummary(question),
  options: (question.options || []).map((option) => option.trim()).filter(Boolean),
  imageUrl: resolveGameImageUrl(question.image?.url, question.image?.thumbUrl),
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
      answer: buildAnswerSummary(question),
      options: (question.options || []).map((option) => option.trim()).filter(Boolean),
      imageUrl: resolveGameImageUrl(question.image?.url, question.image?.thumbUrl),
    }))
  );

const buildStopTheFireItems = (game: GeneratedGame): PreviewItem[] => {
  const manualCategories = (game.stopTheFireCategories || []).map((category) => category.trim()).filter(Boolean);
  if (manualCategories.length > 0) {
    return manualCategories.map((category, index) => ({
      id: `stf-${index}`,
      title: `Category ${index + 1}`,
      prompt: category,
      answer: 'This category will be used to build a Stop the Fire round.',
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

  return (game.questions || []).map(buildStandardQuestionItem);
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
  <div className={`relative rounded-2xl border bg-white shadow-sm transition-all ${isSelected ? 'border-brand-blue shadow-md shadow-sky-100/60' : 'border-slate-200'}`}>
    <button
      type="button"
      onClick={onToggleSelect}
      className={`absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
        isSelected
          ? 'border-brand-blue bg-sky-50 text-brand-blue'
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
          className={`col-start-1 row-start-1 rounded-2xl bg-slate-50 p-4 transition-opacity duration-200 ${
            isFlipped ? 'invisible opacity-0 pointer-events-none' : 'visible opacity-100'
          }`}
        >
          <div className="mb-3">
            {item.group && (
              <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                {item.group}
              </div>
            )}
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-lg font-bold leading-snug break-words text-slate-800">
                {item.title}
              </h3>
              <div className="flex shrink-0 items-center gap-2">
                {item.points ? (
                  <span className="inline-flex min-w-[72px] items-center justify-center rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">
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
                  <span className="font-bold text-slate-400">{String.fromCharCode(65 + index)}.</span> {option}
                </p>
              ))}
            </div>
          )}

          {item.imageUrl && (
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              <img src={item.imageUrl} alt="" className="h-24 w-full object-cover" />
            </div>
          )}
        </div>

        <div
          className={`col-start-1 row-start-1 rounded-2xl bg-brand-blue p-4 text-white transition-opacity duration-200 ${
            isFlipped ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none'
          }`}
        >
          <div className="mb-3">
            {item.group && (
              <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-sky-200">
                {item.group}
              </div>
            )}
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-lg font-bold leading-snug break-words text-white">
                {item.title}
              </h3>
              <div className="flex shrink-0 items-center gap-2">
                {item.points ? (
                  <span className="inline-flex min-w-[72px] items-center justify-center rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-sky-100 border border-white/15">
                    {item.points} pts
                  </span>
                ) : null}
                {item.imageUrl && <ImageIcon size={14} className="text-sky-200" />}
              </div>
            </div>
          </div>

          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-sky-200">Answer Side</div>
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-white/95">{item.answer}</p>
        </div>
      </div>

      <div className={`mt-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] ${
        isFlipped
          ? 'bg-brand-blue text-sky-100'
          : 'border border-slate-200 bg-white text-slate-500'
      }`}>
        <RotateCcw size={13} />
        {isFlipped ? 'Click card to flip back' : 'Click card to show answer'}
      </div>
    </div>
  </div>
);

interface GamePreviewProps {
  game: GeneratedGame;
  source: 'library' | 'community';
  onBack: () => void;
  onPlay: (game: GeneratedGame) => void;
  onEdit: () => void;
}

export const GamePreview: React.FC<GamePreviewProps> = ({ game, source, onBack, onPlay, onEdit }) => {
  const items = useMemo(() => buildPreviewItems(game), [game]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());
  const [isPromptOpen, setIsPromptOpen] = useState(false);

  useEffect(() => {
    setSelectedIds(new Set(items.map((item) => item.id)));
    setFlippedIds(new Set());
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
    onPlay(nextGame);
  };

  const sourceLabel = source === 'community' ? 'Community' : 'My Library';
  const sourceIcon = source === 'community' ? <Globe size={14} /> : <Library size={14} />;
  const createdByName = game.config.originalCreatorName || game.authorName || 'Teacher';
  const createdByAvatar = game.config.originalCreatorAvatar || game.authorAvatar || game.config.authorAvatar;
  const aiPrompt = game.config.customInstructions?.trim();
  const creationLabel = game.config.isAI ? 'Created using AI' : 'Created manually';
  const instructionText = 'Click cards to flip. Tick cards to include.';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <button onClick={onBack} className="mb-6 flex items-center text-slate-500 hover:text-sky-600">
          <ArrowLeft size={18} className="mr-2" /> Back to {sourceLabel}
        </button>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600">
                {sourceIcon}
                {sourceLabel}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold uppercase text-sky-700 border border-sky-100">
                {game.config.type}
              </span>
              {game.config.isAI ? (
                <button
                  type="button"
                  onClick={() => aiPrompt && setIsPromptOpen(true)}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase border transition-colors ${
                    aiPrompt
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:border-indigo-300 hover:bg-indigo-100 cursor-pointer'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                  }`}
                  title={aiPrompt ? 'Click to view AI prompt' : undefined}
                >
                  <Sparkles size={13} />
                  {creationLabel}
                </button>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-700 border border-slate-200">
                  <Edit3 size={13} />
                  {creationLabel}
                </span>
              )}
            </div>

            <h1 className="font-display text-3xl font-bold text-slate-800 sm:text-4xl">{game.title}</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">{instructionText}</p>

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
              <span className="font-semibold text-slate-600">{items.length} preview card{items.length === 1 ? '' : 's'}</span>
              <span className="hidden text-slate-300 sm:inline">|</span>
              <span className="font-semibold text-slate-600">{selectedCount} selected</span>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds(new Set(items.map((item) => item.id)))}
                disabled={items.length === 0 || allSelected}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:border-brand-blue hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckSquare size={15} /> Select all
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                disabled={selectedCount === 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:border-brand-blue hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Square size={15} /> Clear
              </button>
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:border-brand-blue hover:text-brand-blue"
              >
                <Edit3 size={16} /> Edit game
              </button>
              <button
                type="button"
                onClick={handlePlay}
                disabled={selectedCount === 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-yellow px-4 py-2.5 text-sm font-bold text-slate-900 shadow-md transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play size={16} fill="currentColor" /> Play selected
              </button>
            </div>
          </div>
        </div>

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
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
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
        )}

        {isPromptOpen && aiPrompt && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
              <button
                type="button"
                onClick={() => setIsPromptOpen(false)}
                className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close AI prompt"
              >
                <X size={18} />
              </button>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-700 border border-indigo-100">
                <Sparkles size={13} />
                AI Prompt
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-800">Prompt used to create this game</h2>
              <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
                {aiPrompt}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


