
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
  WORD_WHEEL = 'Word Wheel'
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
    url: string;
    storagePath?: string;
    thumbUrl?: string;
    source?: 'stock' | 'upload';
    alt?: string;
  };
  imageKeywords?: string[];
  // New bonus types for hidden tiles
  bonusType?: 'none' | 'double' | 'bust' | 'steal'; 
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

export type ActivityType =
  | 'wordsearch'
  | 'matching'
  | 'gap-fill'
  | 'sentence-transform'
  | 'multiple-choice'
  | 'word-formation'
  | 'open-ended'
  | 'information-sheet'
  | 'table'
  | 'custom';

export interface ActivityConfig {
  id: string; // Unique ID for React keys and D&D
  type: ActivityType;
  count: number;
  contextType?: 'sentences' | 'text'; // Moved here for per-activity control
  options?: {
    mcCount?: 2 | 3 | 4; // For multiple choice options
    rows?: number; // For wordsearch/table
    cols?: number; // For wordsearch/table
    allowDiagonals?: boolean; // For wordsearch
    wordBank?: boolean; // For gap-fill
    embedInStory?: boolean; // For story-based activities
    useImages?: boolean; // Use image bank for wordsearch/matching
    imageBank?: {
      items: Array<{
        id: string;
        url: string;
        thumbUrl?: string;
        label: string;
      }>;
    };
  };
  customInstructions?: string;
}

export interface WorksheetConfig {
  title?: string; // Optional user-defined title for the worksheet
  topic: string;
  gradeLevel: string;
  customInstructions?: string;
  layout?: 'single' | 'columns'; // New Layout Option
  infoTemplate?: 'classic' | 'split' | 'grid' | 'minimal' | 'poster' | 'editorial' | 'playful';
  infoTheme?: 'ocean' | 'sunset' | 'studio' | 'retro' | 'mint' | 'midnight' | 'crimson' | 'forest';
  activities: ActivityConfig[];
  isPublic?: boolean; // Visibility Flag
  authorAvatar?: string | null; // Optional avatar URL for community display
  files?: UploadedFile[]; // Source material
  difficultyLevel?: 'easy' | 'medium' | 'hard' | 'mixed'; // Difficulty control
  generateAnswerKey?: boolean; // Answer key generation toggle
  includeHeader?: boolean; // Include Name/Date header fields
  storeWorksheetAssets?: boolean; // When true, upload images/logos to Supabase Storage
  logo?: {
    url: string;
    storagePath?: string;
    pos: { x: number; y: number };
    width: number;
    height: number;
  } | null;
}

export interface GeneratedWorksheet {
  id?: string;
  createdAt?: string;
  config?: WorksheetConfig;
  title: string;
  authorId?: string;
  authorName?: string;
  authorAvatar?: string;
  content: string; // HTML or structured text representation
  answerKey?: string | null; // Answer key content (HTML)
  type: string; // Helper for display (e.g. "Mixed", "Wordsearch")
}

export interface WorksheetAiParts {
  title: string;
  storyHtml?: string;
  mcq?: Array<{ q: string; options: string[] }>;
  wordSearch?: Array<{ grid: string[][]; words: string[] }>;
  matching?: Array<{ left: string; right: string }>;
  matchingMeta?: Array<{ title: string; instructions?: string }>;
  sentenceTransform?: Array<{ prompt: string; keyword?: string; answer?: string }>;
  infoSections?: Array<{ title: string; bodyHtml: string }>;
  custom?: Array<{ text?: string; html?: string }>;
  table?: { headers: string[]; rows: string[][] };
  tables?: Array<{ headers: string[]; rows: string[][] }>;
  gapFill?: Array<{ sentence: string; answer: string }>;
  wordFormation?: Array<{ base: string; sentence: string; answer: string }>;
  openEnded?: Array<{ question: string; sampleAnswer?: string }>;
  answerKeyHtml?: string;
  image?: { url: string } | null;
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
