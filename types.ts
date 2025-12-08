
export enum GameType {
  SNAKES_LADDERS = 'Snakes and Ladders',
  TRIVIA = 'Trivia Quiz',
  JEOPARDY = 'Jeopardy',
  DARTS = 'Darts',
  PUB_QUIZ = 'Pub Quiz',
  MILLIONAIRE = 'Millionaire Maker',
  TIME_BOMB = 'Time Bomb',
  SURVEY_SHOWDOWN = 'Survey Showdown'
}

export interface UploadedFile {
  name: string;
  data: string; // Base64 string (raw)
  mimeType: string;
}

export interface GameConfig {
  type: GameType;
  title?: string; // User defined title
  questionCount: number; // Used for list-based games
  questionType: 'multiple-choice' | 'gap-fill' | 'open' | 'mixed' | 'ai-decide';
  pointsMode?: 'fixed' | 'ai-random' | 'manual'; // New points configuration
  topic: string; // Still used for non-Jeopardy games
  isAI: boolean;
  isPublic?: boolean; // Visibility Flag
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
}

// New Interface for Runtime Options (Players, Timer, Bonuses)
export interface GameRunOptions {
  players: number;
  timerSeconds: number;
  enableBonuses: boolean;
  strictMode: boolean; // Can override config
  questionLimit?: number; // For Trivia: ensure divisible by players
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
  // New bonus types for hidden tiles
  bonusType?: 'none' | 'double' | 'bust' | 'steal'; 
  difficulty?: 'easy' | 'medium' | 'hard';
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
  title: string;
  authorName?: string; // Display name of creator
  config: GameConfig;
  questions: GeneratedQuestion[]; // For standard games
  jeopardyBoard?: JeopardyCategory[]; // For Jeopardy
  pubQuizRounds?: JeopardyCategory[]; // Reusing structure: Category = Round
}

export type ActivityType = 'wordsearch' | 'matching' | 'gap-fill' | 'sentence-transform' | 'multiple-choice' | 'word-formation' | 'open-ended';

export interface ActivityConfig {
  id: string; // Unique ID for React keys and D&D
  type: ActivityType;
  count: number;
  contextType?: 'sentences' | 'text'; // Moved here for per-activity control
  options?: {
    mcCount?: 2 | 3 | 4; // For multiple choice options
  };
}

export interface WorksheetConfig {
  title?: string; // Optional user-defined title for the worksheet
  topic: string;
  gradeLevel: string;
  customInstructions?: string;
  layout?: 'single' | 'columns'; // New Layout Option
  activities: ActivityConfig[];
  isPublic?: boolean; // Visibility Flag
  files?: UploadedFile[]; // Source material
}

export interface GeneratedWorksheet {
  id?: string;
  createdAt?: string;
  config?: WorksheetConfig;
  title: string;
  authorName?: string;
  content: string; // HTML or structured text representation
  type: string; // Helper for display (e.g. "Mixed", "Wordsearch")
}

export interface BlogPost {
  id: number;
  title: string;
  subtitle: string;
  date: string;
  content: string;
  image: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface DevSettings {
  useExternalApi: boolean;
  externalEndpoint: string;
  apiSecret?: string;
}
