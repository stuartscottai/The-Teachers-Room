
export enum GameType {
  SNAKES_LADDERS = 'Snakes and Ladders',
  TRIVIA = 'Trivia Quiz',
  JEOPARDY = 'Jeopardy',
  DARTS = 'Darts'
}

export interface GameConfig {
  type: GameType;
  title?: string; // User defined title
  questionCount: number; // Used for list-based games
  questionType: 'multiple-choice' | 'gap-fill' | 'open' | 'mixed' | 'ai-decide';
  topic: string; // Still used for non-Jeopardy games
  isAI: boolean;
  customInstructions?: string;
  // Jeopardy specific
  jeopardyCategories?: number; // Columns
  jeopardyCategoryNames?: string[]; // Specific names for columns
  jeopardyRows?: number; // Rows (questions per category)
  strictMode?: boolean; // "What is..." requirement
}

// New Interface for Runtime Options (Players, Timer, Bonuses)
export interface GameRunOptions {
  players: number;
  timerSeconds: number;
  enableBonuses: boolean;
  strictMode: boolean; // Can override config
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
}

export interface WorksheetConfig {
  type: 'wordsearch' | 'matching' | 'gap-fill' | 'sentence-transform';
  topic: string;
  gradeLevel: string;
  customInstructions?: string;
}

export interface GeneratedWorksheet {
  id?: string;
  createdAt?: string;
  config?: WorksheetConfig;
  title: string;
  content: string; // HTML or structured text representation
  type: string;
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