
export enum GameType {
  SNAKES_LADDERS = 'Snakes and Ladders',
  TRIVIA = 'Trivia Quiz',
  JEOPARDY = 'Jeopardy',
  DARTS = 'Darts',
  PUB_QUIZ = 'Pub Quiz',
  MILLIONAIRE = 'Millionaire Maker',
  TIME_BOMB = 'Time Bomb',
  SURVEY_SHOWDOWN = 'Survey Showdown',
  STOP_THE_FIRE = 'Stop the Fire!',
  WORD_WHEEL = 'Word Wheel',
  BLOCK_BEATERS = 'Block Beaters',
  LIVE_QUIZ_CHALLENGE = 'Live Quiz Challenge'
}

export interface UploadedFile {
  name: string;
  data: string; // Base64 string (raw)
  mimeType: string;
  source?: 'upload' | 'school-storage';
  schoolStorageFileId?: string;
  sizeBytes?: number;
  savedToSchoolStorage?: boolean;
}

export interface GameConfig {
  type: GameType;
  title?: string; // User defined title
  questionCount: number; // Used for list-based games
  questionType: 'multiple-choice' | 'gap-fill' | 'open' | 'mixed' | 'ai-decide';
  mcOptionStrategy?: 'fixed' | 'vary'; // Fixed option count for every MCQ or let AI vary between 2-4
  mcOptionCount?: 2 | 3 | 4; // Number of options for multiple choice questions
  pointsMode?: 'fixed' | 'ai-random' | 'manual'; // New points configuration
  topic: string; // Still used for non-Jeopardy games
  isAI: boolean;
  isPublic?: boolean; // Visibility Flag
  authorAvatar?: string | null; // Optional avatar URL for community display
  customInstructions?: string;
  files?: UploadedFile[]; // Source material
  // Jeopardy specific
  jeopardyCategories?: number; // Columns
  jeopardyCategoryNames?: string[]; // Specific names for columns
  jeopardyRows?: number; // Rows (questions per category)
  strictMode?: boolean; // "What is..." requirement
  // Pub Quiz specific
  pubQuizRoundsCount?: number;
  pubQuizQuestionsPerRound?: number;
  pubQuizRoundNames?: string[];
  // Word Wheel specific
  wordWheelScoringMode?: 'classic' | 'speed-bonus';
  wordWheelLetterRule?: 'starts-with' | 'contains-hard';
  // Block Beaters specific
  blockBeatersMode?: 'letters' | 'numbers';
  blockBeatersBoardSize?: 'small' | 'medium' | 'large';
  // Stop the Fire specific
  stopTheFireMode?: 'manual' | 'bank' | 'ai';
  stopTheFireCategories?: string[];
  // Optional AI image settings
  includeImages?: boolean;
  imageMode?: 'auto' | 'manual';
  // Provenance metadata for remixes/copies
  originalCreatorName?: string;
  originalCreatorId?: string;
  originalCreatorAvatar?: string | null;
  lastEditorName?: string;
  lastEditorId?: string;
}

export type StopTheFireDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface StopTheFireRound {
  letter: string;
  categories: string[];
  difficulty: StopTheFireDifficulty;
}

export interface StopTheFireCategory {
  text: string;
  difficulty: StopTheFireDifficulty;
  tags?: string[];
}

// New Interface for Runtime Options (Players, Timer, Bonuses)
export interface GameRunOptions {
  players: number;
  timerSeconds: number;
  enableBonuses: boolean;
  bonusOptions?: BonusCardType[];
  snakesLaddersBonusOptions?: SnakesLaddersBonusType[];
  strictMode: boolean; // Can override config
  questionLimit?: number; // For Trivia: ensure divisible by players
  triviaRandomPoints?: boolean; // Trivia-only runtime option
  teamNames?: string[]; // Optional custom team names
  muted: boolean; // Sound preference
  soundConfig?: {
    correct: string;
    incorrect: string;
    select: string;
    win: string;
    bonus: string;
    timesUp: string;
  };
  randomizeQuestions?: boolean; // Order of questions (Sequential vs Random)
  // Darts specific runtime options
  dartsLegs?: number; // How many rounds per game
  dartsMode?: 'high-score' | '301';
  // Time Bomb specific
  bombDuration?: number; // Starting time for the bomb
  teamLives?: number; // How many lives per team
  // Stop the Fire specific (optional defaults)
  stopTheFireDifficulty?: StopTheFireDifficulty;
  stopTheFireCategoryCount?: number;
  // Word Wheel
  wordWheelScoringMode?: 'classic' | 'speed-bonus';
  wordWheelLetterRule?: 'starts-with' | 'contains-hard';
  // Block Beaters
  blockBeatersMode?: 'letters' | 'numbers';
  blockBeatersBoardSize?: 'small' | 'medium' | 'large';
  blockBeatersPoints?: number;
  blockBeatersSteals?: boolean;
  studentPractice?: boolean;
}

export type BonusCardType = 'double' | 'bust' | 'steal' | 'lose-all' | 'reset-score' | 'first-place' | 'last-place';

export type SnakesLaddersBonusType =
  | 'move-forward'
  | 'move-five'
  | 'swap-positions'
  | 'extra-turn'
  | 'skip-next'
  | 'move-rival-back'
  | 'send-rival-to-snake';

export type LiveQuizSessionStatus = 'lobby' | 'question' | 'locked' | 'reveal' | 'leaderboard' | 'ended';

export interface LiveQuizQuestion {
  id?: string;
  sessionId?: string;
  questionIndex: number;
  sourceItemId?: string;
  question: string;
  options: string[];
  answer?: string;
  points: number;
  category?: string;
  image?: GeneratedQuestion['image'];
}

export type StudentSafeLiveQuizQuestion = Omit<LiveQuizQuestion, 'answer'> & {
  revealedAnswer?: string | null;
};

export interface LiveQuizSession {
  id: string;
  teacherId?: string;
  sourceGameId?: string | null;
  title: string;
  joinCode: string;
  status: LiveQuizSessionStatus;
  currentQuestionIndex: number;
  timerSeconds: number;
  selectedItems?: string[];
  questionStartedAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  hostLastSeenAt?: string | null;
  createdAt?: string;
}

export interface LiveQuizParticipant {
  id: string;
  sessionId: string;
  displayName: string;
  score: number;
  joinedAt?: string;
  lastSeenAt?: string;
}

export interface LiveQuizSubmission {
  id: string;
  sessionId: string;
  participantId: string;
  questionIndex: number;
  answer: string;
  isCorrect: boolean;
  responseMs: number;
  pointsAwarded: number;
  submittedAt?: string;
}

export interface PracticeReviewItem {
  id: string;
  question: string;
  correctAnswer: string;
  studentAnswer?: string;
  context?: string;
}

export interface SurveyAnswer {
  text: string;
  score: number;
  alts?: string[]; // Synonyms for fuzzy matching
}

export interface GeneratedQuestion {
  id: number;
  question: string;
  answer: string; // Keep for backward compatibility or as a "top answer"
  options?: string[];
  points: number;
  isBonus: boolean;
  category?: string;
  image?: {
    url?: string;
    storagePath?: string;
    thumbUrl?: string;
    source?: 'stock' | 'upload';
    stockId?: string;
    searchQuery?: string;
    alt?: string;
    photographer?: string;
    sourcePageUrl?: string;
    provider?: 'pexels' | 'pixabay';
    preparedUrl?: string;
  };
  imageKeywords?: string[];
  visualSearch?: {
    primaryQuery?: string;
    backupQuery?: string;
    avoidTerms?: string[];
    answerRevealRisk?: 'low' | 'medium' | 'high';
    imageIntent?: string;
  };
  // New bonus types for hidden tiles
  bonusType?: 'none' | BonusCardType; 
  difficulty?: 'easy' | 'medium' | 'hard';
  // Word Wheel specific
  letter?: string;
  answerAliases?: string[];
  // Survey Showdown specific
  surveyAnswers?: SurveyAnswer[];
}

export interface JeopardyCategory {
  name: string;
  questions: GeneratedQuestion[];
}

export interface GeneratedGame {
  id?: string; // For saving
  createdAt?: string; // For saving
  playCount?: number; // Optional metric for community/trending ranking
  title: string;
  authorId?: string; // User ID for community filtering
  authorName?: string; // Display name of creator
  authorAvatar?: string; // Optional avatar URL for creator
  sourceGameId?: string; // Optional origin for shared/remixed games (client-only)
  config: GameConfig;
  questions: GeneratedQuestion[]; // For standard games
  jeopardyBoard?: JeopardyCategory[]; // For Jeopardy
  pubQuizRounds?: JeopardyCategory[]; // Reusing structure: Category = Round
  stopTheFireRounds?: StopTheFireRound[]; // Optional seeded rounds
  stopTheFireCategories?: string[]; // Manual category pool for Stop the Fire
}


export interface BlogPost {
  id: number;
  title: string;
  subtitle: string;
  date: string;
  content: string;
  image: string;
  heroImage?: string;
  heroImageFit?: 'cover' | 'contain';
}

export type AccountType = 'free' | 'teacher' | 'school';
export type SchoolRole = 'admin' | 'teacher';

export interface UserSchoolAccess {
  schoolId: string;
  schoolName: string;
  role: SchoolRole;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  accountType: AccountType;
  canUseAi: boolean;
  schoolAccess: UserSchoolAccess | null;
}
