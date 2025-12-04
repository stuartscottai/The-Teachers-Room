
export enum GameType {
  SNAKES_LADDERS = 'Snakes and Ladders',
  TRIVIA = 'Trivia Quiz',
  JEOPARDY = 'Jeopardy',
  DARTS = 'Darts',
  PUB_QUIZ = 'Pub Quiz'
}

export interface GameConfig {
  type: GameType;
  title?: string; // User defined title
  questionCount: number; // Used for list-based games
  questionType: 'multiple-choice' | 'gap-fill' | 'open' | 'mixed' | 'ai-decide';
  pointsMode?: 'fixed' | 'ai-random' | 'manual'; // New points configuration
  topic: string; // Still used for non-Jeopardy games
  isAI: boolean;
  customInstructions?: string;
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
  // Darts specific runtime options
  dartsLegs?: number; // How many rounds per game
  dartsMode?: 'high-score' | '301';
}

export interface GeneratedQuestion {
  id: number;
  question: string;
  answer: string;
  options?: string[];
  points: number;
  isBonus: boolean;
  category?: string;
  // New bonus types for hidden tiles
  bonusType?: 'none' | 'double' | 'bust' | 'steal'; 
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface JeopardyCategory {
  name: string;
  questions: GeneratedQuestion[];
}

export interface GeneratedGame {
  id?: string; // For saving
  createdAt?: string; // For saving
  title: string;
  config: GameConfig;
  questions: GeneratedQuestion[]; // For standard games
  jeopardyBoard?: JeopardyCategory[]; // For Jeopardy
  pubQuizRounds?: JeopardyCategory[]; // Reusing structure: Category = Round
}

export type ActivityType = 'wordsearch' | 'matching' | 'gap-fill' | 'sentence-transform' | 'multiple-choice' | 'word-formation';

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
  topic: string;
  gradeLevel: string;
  customInstructions?: string;
  layout?: 'single' | 'columns'; // New Layout Option
  activities: ActivityConfig[]; 
}

export interface GeneratedWorksheet {
  id?: string;
  createdAt?: string;
  config?: WorksheetConfig;
  title: string;
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
