import {
  GameType,
  GeneratedGame,
  GeneratedQuestion,
  LiveQuizParticipant,
  LiveQuizQuestion,
  LiveQuizSession,
  LiveQuizSessionStatus,
  LiveQuizSubmission,
  StudentSafeLiveQuizQuestion,
} from '../types';
import { supabase } from '../services/supabase';
import { getPublicAppUrl } from './appUrl';
import { isUUID } from './gameUtils';
import { createSignedUrlForGameAsset, createSignedUrlsForGameAssets } from './gameAssetStorage';

const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LIVE_QUIZ_PLAYER_STORAGE_KEY = 'liveQuizPlayersBySession';

const normalizeValue = (value: string) =>
  String(value || '')
    .replace(/\s*\((\d+)\)\s*$/g, '')
    .replace(/^[A-D]\.\s*/i, '')
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const normalizeAnswerLetter = (value: string) => {
  const match = String(value || '').trim().match(/^([A-D])(?:[.)\s]|$)/i);
  return match ? match[1].toUpperCase().charCodeAt(0) - 65 : -1;
};

const normalizeLiveQuizImage = (value: any): LiveQuizQuestion['image'] | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') {
    const url = value.trim();
    return url ? { url } : undefined;
  }
  if (typeof value !== 'object') return undefined;

  const url = String(value.url || value.src || value.href || value.image || '').trim();
  const thumbUrl = String(value.thumbUrl || value.thumbnailUrl || value.thumbnail || value.previewUrl || '').trim();
  const storagePath = String(value.storagePath || value.storage_path || '').trim();
  if (!url && !thumbUrl && !storagePath) return undefined;

  return {
    url: url || thumbUrl,
    thumbUrl: thumbUrl || url || undefined,
    storagePath: storagePath || undefined,
    source: value.source === 'upload' ? 'upload' : value.source === 'stock' ? 'stock' : undefined,
    alt: value.alt ? String(value.alt) : undefined,
  };
};

const withSignedLiveQuizImages = async <T extends { image?: LiveQuizQuestion['image'] }>(items: T[]): Promise<T[]> => {
  const paths = Array.from(
    new Set(items.map((item) => item.image?.storagePath).filter((path): path is string => Boolean(path)))
  );
  if (!paths.length) return items;

  try {
    const signed = await createSignedUrlsForGameAssets(paths);
    return items.map((item) => {
      const path = item.image?.storagePath;
      const signedUrl = path ? signed.get(path) : '';
      return signedUrl ? { ...item, image: { ...item.image, url: signedUrl } } : item;
    });
  } catch {
    return items;
  }
};

const withSignedLiveQuizImage = async <T extends { image?: LiveQuizQuestion['image'] }>(item: T | null): Promise<T | null> => {
  if (!item?.image?.storagePath) return item;
  try {
    const signedUrl = await createSignedUrlForGameAsset(item.image.storagePath);
    return { ...item, image: { ...item.image, url: signedUrl } };
  } catch {
    return item;
  }
};

const makeJoinCode = () =>
  Array.from({ length: 6 }, () => JOIN_CODE_ALPHABET[Math.floor(Math.random() * JOIN_CODE_ALPHABET.length)]).join('');

const mapSession = (row: any): LiveQuizSession => ({
  id: row.id,
  teacherId: row.teacher_id,
  sourceGameId: row.source_game_id,
  title: row.title,
  joinCode: row.join_code,
  status: row.status,
  currentQuestionIndex: Number(row.current_question_index || 0),
  timerSeconds: Number(row.timer_seconds || 20),
  selectedItems: Array.isArray(row.selected_items) ? row.selected_items : [],
  questionStartedAt: row.question_started_at,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  hostLastSeenAt: row.host_last_seen_at,
  createdAt: row.created_at,
});

const mapParticipant = (row: any): LiveQuizParticipant => ({
  id: row.id,
  sessionId: row.session_id,
  displayName: row.display_name,
  score: Number(row.score || 0),
  joinedAt: row.joined_at,
  lastSeenAt: row.last_seen_at,
});

const readStoredLiveQuizPlayers = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LIVE_QUIZ_PLAYER_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const rememberLiveQuizParticipant = (sessionId: string, participantId: string) => {
  if (typeof window === 'undefined' || !sessionId || !participantId) return;
  const stored = readStoredLiveQuizPlayers();
  stored[sessionId] = participantId;
  window.localStorage.setItem(LIVE_QUIZ_PLAYER_STORAGE_KEY, JSON.stringify(stored));
};

export const forgetLiveQuizParticipant = (sessionId: string) => {
  if (typeof window === 'undefined' || !sessionId) return;
  const stored = readStoredLiveQuizPlayers();
  delete stored[sessionId];
  window.localStorage.setItem(LIVE_QUIZ_PLAYER_STORAGE_KEY, JSON.stringify(stored));
};

export const getRememberedLiveQuizParticipantId = (sessionId: string): string => {
  if (!sessionId) return '';
  return readStoredLiveQuizPlayers()[sessionId] || '';
};

const mapSubmission = (row: any): LiveQuizSubmission => ({
  id: row.id,
  sessionId: row.session_id,
  participantId: row.participant_id,
  questionIndex: Number(row.question_index || 0),
  answer: row.answer,
  isCorrect: Boolean(row.is_correct),
  responseMs: Number(row.response_ms || 0),
  pointsAwarded: Number(row.points_awarded || 0),
  submittedAt: row.submitted_at,
});

const mapQuestion = (row: any): LiveQuizQuestion => ({
  id: row.id,
  sessionId: row.session_id,
  questionIndex: Number(row.question_index || 0),
  sourceItemId: row.source_item_id,
  question: row.question,
  options: Array.isArray(row.options) ? row.options : [],
  answer: row.answer,
  points: Number(row.points || 1000),
  category: row.category,
  image: normalizeLiveQuizImage(row.image),
});

const mapStudentQuestion = (row: any): StudentSafeLiveQuizQuestion => ({
  questionIndex: Number(row.question_index || 0),
  question: row.question,
  options: Array.isArray(row.options) ? row.options : [],
  points: Number(row.points || 1000),
  category: row.category,
  image: normalizeLiveQuizImage(row.image),
  revealedAnswer: row.revealed_answer || null,
});

const answerMatchesOptions = (question: GeneratedQuestion) => {
  const options = (question.options || []).map((option) => String(option || '').trim()).filter(Boolean);
  const answer = String(question.answer || '').trim();
  const answerIndex = normalizeAnswerLetter(answer);
  return options.length >= 2 && (
    options.some((option) => normalizeValue(option) === normalizeValue(answer)) ||
    (answerIndex >= 0 && answerIndex < options.length)
  );
};

const toLiveQuestion = (
  question: GeneratedQuestion,
  questionIndex: number,
  sourceItemId: string,
  category?: string
): LiveQuizQuestion | null => {
  if (!question?.question?.trim() || !answerMatchesOptions(question)) return null;
  const options = (question.options || []).map((option) => String(option || '').trim()).filter(Boolean);
  const answerIndex = normalizeAnswerLetter(String(question.answer || ''));
  const answer = options.find((option) => normalizeValue(option) === normalizeValue(question.answer)) ||
    (answerIndex >= 0 && answerIndex < options.length ? options[answerIndex] : question.answer);
  return {
    questionIndex,
    sourceItemId,
    question: question.question.trim(),
    options,
    answer,
    points: Math.max(1000, Number(question.points || 1000)),
    category: category || question.category,
    image: normalizeLiveQuizImage(question.image),
  };
};

export const isLiveQuizCompatibleQuestion = answerMatchesOptions;

export const buildLiveQuizQuestionsFromGame = (
  game: GeneratedGame,
  selectedItemIds: string[] = []
): { questions: LiveQuizQuestion[]; skipped: number } => {
  const selected = new Set(selectedItemIds.filter(Boolean));
  const useSelection = selected.size > 0;
  const raw: Array<{ itemId: string; question: GeneratedQuestion; category?: string }> = [];

  if (game.config.type === GameType.JEOPARDY && game.jeopardyBoard) {
    game.jeopardyBoard.forEach((category, categoryIndex) => {
      category.questions.forEach((question, questionIndex) => {
        const itemId = `jeopardy-${categoryIndex}-${questionIndex}`;
        if (!useSelection || selected.has(itemId)) raw.push({ itemId, question, category: category.name });
      });
    });
  } else if (game.config.type === GameType.PUB_QUIZ && game.pubQuizRounds) {
    game.pubQuizRounds.forEach((round, roundIndex) => {
      round.questions.forEach((question, questionIndex) => {
        const itemId = `pubquiz-${roundIndex}-${questionIndex}`;
        if (!useSelection || selected.has(itemId)) raw.push({ itemId, question, category: round.name });
      });
    });
  } else {
    (game.questions || []).forEach((question, questionIndex) => {
      const itemId = `std-${questionIndex}`;
      if (!useSelection || selected.has(itemId)) raw.push({ itemId, question, category: question.category });
    });
  }

  const questions = raw
    .map((entry, index) => toLiveQuestion(entry.question, index, entry.itemId, entry.category))
    .filter((question): question is LiveQuizQuestion => Boolean(question));

  return { questions, skipped: raw.length - questions.length };
};

export const getLiveQuizJoinUrl = (joinCode: string) => {
  const base = (import.meta as any).env?.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${getPublicAppUrl()}${normalizedBase}live/join/${joinCode}`;
};

export const createLiveQuizSession = async (
  game: GeneratedGame,
  teacherId: string,
  selectedItemIds: string[],
  options?: { timerSeconds?: number; randomize?: boolean }
): Promise<{ success: boolean; sessionId?: string; joinCode?: string; skipped?: number; error?: string }> => {
  const built = buildLiveQuizQuestionsFromGame(game, selectedItemIds);
  const questions = options?.randomize ? [...built.questions].sort(() => Math.random() - 0.5) : built.questions;
  if (questions.length === 0) {
    return { success: false, skipped: built.skipped, error: 'No compatible multiple-choice questions were selected.' };
  }

  let joinCode = makeJoinCode();
  let sessionRow: any = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from('live_quiz_sessions')
      .insert({
        teacher_id: teacherId,
        source_game_id: isUUID(game.sourceGameId || game.id) ? game.sourceGameId || game.id : null,
        title: game.title,
        join_code: joinCode,
        timer_seconds: options?.timerSeconds || 20,
        selected_items: selectedItemIds,
      })
      .select('*')
      .single();

    if (!error && data) {
      sessionRow = data;
      break;
    }

    if (String(error?.code || '') !== '23505') {
      return { success: false, skipped: built.skipped, error: error?.message || 'Failed to create live quiz.' };
    }
    joinCode = makeJoinCode();
  }

  if (!sessionRow) return { success: false, skipped: built.skipped, error: 'Failed to create a unique join code.' };

  const questionRows = questions.map((question, index) => ({
    session_id: sessionRow.id,
    question_index: index,
    source_item_id: question.sourceItemId,
    question: question.question,
    options: question.options,
    answer: question.answer,
    points: question.points,
    category: question.category || null,
    image: question.image || null,
  }));

  const { error: questionError } = await supabase.from('live_quiz_questions').insert(questionRows);
  if (questionError) {
    await supabase.from('live_quiz_sessions').delete().eq('id', sessionRow.id);
    return { success: false, skipped: built.skipped, error: questionError.message };
  }

  return { success: true, sessionId: sessionRow.id, joinCode: sessionRow.join_code, skipped: built.skipped };
};

export const getLiveQuizSession = async (sessionId: string): Promise<LiveQuizSession | null> => {
  const { data, error } = await supabase.from('live_quiz_sessions').select('*').eq('id', sessionId).single();
  if (error || !data) return null;
  return mapSession(data);
};

export const getLiveQuizSessionByCode = async (joinCode: string): Promise<LiveQuizSession | null> => {
  const { data, error } = await supabase
    .from('live_quiz_sessions')
    .select('*')
    .eq('join_code', joinCode.trim().toUpperCase())
    .neq('status', 'ended')
    .single();
  if (error || !data) return null;
  return mapSession(data);
};

export const getLiveQuizQuestionsForTeacher = async (sessionId: string): Promise<LiveQuizQuestion[]> => {
  const { data, error } = await supabase
    .from('live_quiz_questions')
    .select('*')
    .eq('session_id', sessionId)
    .order('question_index', { ascending: true });
  if (error || !data) return [];
  return withSignedLiveQuizImages(data.map(mapQuestion));
};

export const getCurrentStudentQuestion = async (sessionId: string): Promise<StudentSafeLiveQuizQuestion | null> => {
  const { data, error } = await supabase.rpc('get_live_quiz_student_question', { p_session_id: sessionId });
  if (error || !Array.isArray(data) || !data[0]) return null;
  return withSignedLiveQuizImage(mapStudentQuestion(data[0]));
};

export const getLiveQuizParticipants = async (sessionId: string): Promise<LiveQuizParticipant[]> => {
  const { data, error } = await supabase
    .from('live_quiz_participants')
    .select('*')
    .eq('session_id', sessionId)
    .order('score', { ascending: false })
    .order('joined_at', { ascending: true });
  if (error || !data) return [];
  return data.map(mapParticipant);
};

export const reconnectLiveQuizParticipant = async (
  sessionId: string,
  participantId: string
): Promise<{ success: boolean; participant?: LiveQuizParticipant; error?: string }> => {
  if (!sessionId || !participantId) return { success: false, error: 'No saved player was found for this quiz.' };

  const session = await getLiveQuizSession(sessionId);
  if (!session || session.status === 'ended') {
    forgetLiveQuizParticipant(sessionId);
    return { success: false, error: 'This live quiz has ended.' };
  }

  const { data, error } = await supabase
    .from('live_quiz_participants')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .eq('id', participantId)
    .select('*')
    .single();

  if (error || !data) {
    forgetLiveQuizParticipant(sessionId);
    return { success: false, error: 'Your previous player could not be found. Join again to continue as a new player.' };
  }

  return { success: true, participant: mapParticipant(data) };
};

export const getLiveQuizSubmissions = async (sessionId: string): Promise<LiveQuizSubmission[]> => {
  const { data, error } = await supabase
    .from('live_quiz_submissions')
    .select('*')
    .eq('session_id', sessionId)
    .order('submitted_at', { ascending: true });
  if (error || !data) return [];
  return data.map(mapSubmission);
};

export const joinLiveQuizSession = async (
  sessionId: string,
  displayName: string
): Promise<{ success: boolean; participant?: LiveQuizParticipant; error?: string }> => {
  const cleanName = displayName.trim().slice(0, 40);
  if (!cleanName) return { success: false, error: 'Enter a name to join.' };
  const { data, error } = await supabase
    .from('live_quiz_participants')
    .insert({ session_id: sessionId, display_name: cleanName })
    .select('*')
    .single();
  if (error || !data) {
    const message = String(error?.message || '');
    if (message.toLowerCase().includes('row-level security')) {
      return { success: false, error: 'This live quiz is not accepting new players right now.' };
    }
    return { success: false, error: message || 'Unable to join this game.' };
  }
  rememberLiveQuizParticipant(sessionId, data.id);
  return { success: true, participant: mapParticipant(data) };
};

export const updateLiveQuizParticipantDisplayName = async (
  sessionId: string,
  participantId: string,
  displayName: string
): Promise<{ success: boolean; participant?: LiveQuizParticipant; error?: string }> => {
  const cleanName = displayName.trim().slice(0, 40);
  if (!cleanName) return { success: false, error: 'Enter a name to join.' };

  const { data, error } = await supabase
    .from('live_quiz_participants')
    .update({ display_name: cleanName, last_seen_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .eq('id', participantId)
    .select('*')
    .single();

  return {
    success: !error && Boolean(data),
    participant: data ? mapParticipant(data) : undefined,
    error: error?.message || (!data ? 'Could not update your avatar.' : undefined),
  };
};

export const removeLiveQuizParticipant = async (
  sessionId: string,
  participantId: string
): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase.rpc('remove_live_quiz_participant', {
    p_session_id: sessionId,
    p_participant_id: participantId,
  });
  return { success: !error, error: error?.message };
};

export const updateLiveQuizStatus = async (
  sessionId: string,
  status: LiveQuizSessionStatus,
  values: Partial<Pick<LiveQuizSession, 'currentQuestionIndex'>> = {}
) => {
  const { error: rpcError } = await supabase.rpc('update_live_quiz_status', {
    p_session_id: sessionId,
    p_status: status,
    p_current_question_index: typeof values.currentQuestionIndex === 'number' ? values.currentQuestionIndex : null,
  });

  if (!rpcError) {
    return { success: true };
  }

  const payload: Record<string, any> = { status };
  if (typeof values.currentQuestionIndex === 'number') {
    payload.current_question_index = values.currentQuestionIndex;
  }
  if (status === 'question') {
    payload.question_started_at = new Date().toISOString();
    payload.started_at = new Date().toISOString();
  }
  if (status === 'ended') {
    payload.ended_at = new Date().toISOString();
  }
  const { error } = await supabase.from('live_quiz_sessions').update(payload).eq('id', sessionId);
  return { success: !error, error: error?.message };
};

export const updateLiveQuizHostHeartbeat = async (sessionId: string): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from('live_quiz_sessions')
    .update({ host_last_seen_at: new Date().toISOString() })
    .eq('id', sessionId);
  return { success: !error, error: error?.message };
};

export const submitLiveQuizAnswer = async (
  sessionId: string,
  participantId: string,
  questionIndex: number,
  answer: string
): Promise<{ success: boolean; isCorrect?: boolean; pointsAwarded?: number; responseMs?: number; error?: string }> => {
  const { data, error } = await supabase.rpc('submit_live_quiz_answer', {
    p_session_id: sessionId,
    p_participant_id: participantId,
    p_question_index: questionIndex,
    p_answer: answer,
  });
  if (error || !Array.isArray(data) || !data[0]) {
    return { success: false, error: error?.message || 'Answer could not be submitted.' };
  }
  return {
    success: true,
    isCorrect: Boolean(data[0].is_correct),
    pointsAwarded: Number(data[0].points_awarded || 0),
    responseMs: Number(data[0].response_ms || 0),
  };
};

export const resetLiveQuizSession = async (sessionId: string): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase.rpc('reset_live_quiz_session', { p_session_id: sessionId });
  return { success: !error, error: error?.message };
};
