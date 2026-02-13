
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { randomUUID } from "node:crypto";

// Helper to clean JSON
const cleanJson = (text: string): string => {
  if (!text) return "{}";
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
  const firstOpen = cleaned.indexOf('{');
  const lastClose = cleaned.lastIndexOf('}');
  if (firstOpen !== -1 && lastClose !== -1) {
    cleaned = cleaned.substring(firstOpen, lastClose + 1);
  }
  return cleaned.trim();
};

const stripOptionPrefix = (value: string) => (value || '').replace(/^[A-D]\)\s*/i, '').trim();
const normalizeOption = (value: string) => stripOptionPrefix(value).toLowerCase();
const normalizeOptionWithoutArticle = (value: string) => normalizeOption(value).replace(/^(a|an|the)\s+/i, '');

const enforceAnswerMatchesOptions = (question: any) => {
  if (!question || typeof question.answer !== 'string' || !Array.isArray(question.options)) return;
  const options = question.options.filter((opt: any) => typeof opt === 'string');
  if (options.length === 0) return;
  if (options.includes(question.answer)) return;

  const normalizedAnswer = normalizeOption(question.answer);
  const normalizedArticleAnswer = normalizeOptionWithoutArticle(question.answer);

  const directMatch = options.find((opt: string) => normalizeOption(opt) === normalizedAnswer);
  if (directMatch) {
    question.answer = directMatch;
    return;
  }

  const articleMatches = options.filter((opt: string) => normalizeOptionWithoutArticle(opt) === normalizedArticleAnswer);
  if (articleMatches.length === 1) {
    question.answer = articleMatches[0];
  }
};

const enforceGameAnswerMatchesOptions = (data: any) => {
  if (!data) return;
  const apply = (questions?: any[]) => {
    if (!Array.isArray(questions)) return;
    questions.forEach(enforceAnswerMatchesOptions);
  };

  apply(data.questions);
  if (Array.isArray(data.pubQuizRounds)) {
    data.pubQuizRounds.forEach((round: any) => apply(round?.questions));
  }
  if (Array.isArray(data.jeopardyBoard)) {
    data.jeopardyBoard.forEach((category: any) => apply(category?.questions));
  }
};

const WORD_WHEEL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const WORD_WHEEL_CONTAINS_HARD = new Set(['Q', 'V', 'X', 'Y', 'Z']);

type WordWheelLetterRule = 'starts-with' | 'contains-hard';

const normalizeWordWheelAnswer = (value: any) =>
  String(value || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');

const answerMatchesWordWheelRule = (
  answer: string,
  letter: string,
  rule: WordWheelLetterRule
) => {
  const cleanAnswer = normalizeWordWheelAnswer(answer);
  if (!cleanAnswer || !letter) return false;
  if (rule === 'contains-hard' && WORD_WHEEL_CONTAINS_HARD.has(letter)) {
    return cleanAnswer.includes(letter);
  }
  return cleanAnswer.startsWith(letter);
};

const normalizeWordWheelQuestions = (
  rawQuestions: any[],
  rule: WordWheelLetterRule = 'contains-hard'
) => {
  const byLetter = new Map<string, any>();

  const normalizeLetter = (value: any) => {
    const text = String(value || '').toUpperCase();
    return text.replace(/[^A-Z]/g, '').slice(0, 1);
  };

  const normalizeAliases = (aliases: any, answer: string) => {
    if (!Array.isArray(aliases)) return [];
    const answerNorm = answer.trim().toLowerCase();
    const unique = new Set<string>();
    for (const alias of aliases) {
      const value = String(alias || '').trim();
      if (!value) continue;
      if (value.toLowerCase() === answerNorm) continue;
      unique.add(value);
      if (unique.size >= 8) break;
    }
    return Array.from(unique);
  };

  (rawQuestions || []).forEach((q: any, index: number) => {
    if (!q) return;
    const answer = String(q.answer || '').trim();
    const fallbackLetter = normalizeLetter(answer);
    const letter = normalizeLetter(q.letter) || WORD_WHEEL_LETTERS[index] || fallbackLetter || '';
    if (!WORD_WHEEL_LETTERS.includes(letter)) return;
    if (byLetter.has(letter)) return;

    const answerFitsRule = answerMatchesWordWheelRule(answer, letter, rule);

    byLetter.set(letter, {
      id: typeof q.id === 'number' ? q.id : index,
      letter,
      question: answerFitsRule ? String(q.question || '').trim() : '',
      answer: answerFitsRule ? answer : '',
      answerAliases: answerFitsRule ? normalizeAliases(q.answerAliases, answer) : [],
      points: Number.isFinite(q.points) && Number(q.points) > 0 ? Number(q.points) : 10,
      isBonus: false,
      imageKeywords: Array.isArray(q.imageKeywords)
        ? q.imageKeywords.map((entry: any) => String(entry || '').trim()).filter(Boolean).slice(0, 6)
        : undefined
    });
  });

  return WORD_WHEEL_LETTERS.map((letter, index) => {
    const existing = byLetter.get(letter);
    if (existing) return { ...existing, id: index, letter };
    return {
      id: index,
      letter,
      question: '',
      answer: '',
      answerAliases: [],
      points: 10,
      isBonus: false
    };
  });
};

export default async function handler(req: any, res: any) {
  // 1. Handle CORS manually for Vercel Node Functions
  // Allow requests from any Vercel preview URL or production domain
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 2. Initialize AI Client safely inside the request
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error("Server Error: API_KEY or GEMINI_API_KEY environment variable is missing.");
      return res.status(500).json({ 
        error: "Server Configuration Error: API Key is missing. Please add API_KEY to Vercel Environment Variables." 
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Vercel parses JSON body automatically for Node functions
    const { action, config, message, history } = req.body;

    console.log(`Processing action: ${action}`);

    // 3. Handle GAME Generation
    if (action === 'game') {
      const isJeopardy = config.type === 'Jeopardy';
      const isPubQuiz = config.type === 'Pub Quiz';
      const isDarts = config.type === 'Darts';
      const isMillionaire = config.type === 'Millionaire Maker';
      const isTimeBomb = config.type === 'Time Bomb';
      const isSurvey = config.type === 'Survey Showdown';
      const isWordWheel = config.type === 'Word Wheel';
      const wordWheelLetterRule = config.wordWheelLetterRule || 'contains-hard';
      const gameTitle = config.title || `My ${config.type} Game`;
      
      const systemInstruction = `You are an expert educational content creator. 
      Create a structured game based on the following parameters.
      
      If the user provides source files (images/PDFs), analyze them thoroughly and base ALL questions/content on that material.

      IMPORTANT: Questions must have a single, unambiguous correct answer. Avoid prompts where multiple answers could be valid (e.g. vague pronouns, subjective opinions, or fill-in-the-blank with multiple correct options). If a question could plausibly have more than one correct answer, rephrase it to be specific and uniquely answerable.
      CRITICAL: For multiple-choice questions, distribute the correct answer position evenly across the options. Do NOT overuse option A. Use an equal balance across A/B/C/D (or however many options are used).
      CRITICAL: Only ONE option can be correct. Ensure the question is specific enough that only one option is unambiguously correct (e.g., add context or time reference for grammar questions).
      If a question includes options, the "answer" must EXACTLY match one of the option strings (including articles like "a/an/the", punctuation, and capitalization). Do not paraphrase or drop articles.
      
      CRITICAL JSON RULES:
      1. Return ONLY valid JSON.
      2. STRICTLY escape all special characters in strings. 
      3. NO unescaped newlines, tabs, or control characters inside string values. Use \\n for line breaks.
      
      Ensure questions are appropriate for a classroom setting.
      If images are requested, include imageKeywords (2-4 concise, concrete keywords) for each question.
      Prefer concrete objects/scenes and avoid abstract terms like "education", "concept", "background".
      If the question is generic (e.g., "Choose the correct sentence"), derive keywords from the answer/options.
      `;

      let prompt = '';
      
      // Define base question schema
      const questionSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          question: { type: Type.STRING },
          answer: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          points: { type: Type.INTEGER },
          isBonus: { type: Type.BOOLEAN },
          category: { type: Type.STRING },
          difficulty: { type: Type.STRING },
          bonusType: { type: Type.STRING },
          letter: { type: Type.STRING },
          answerAliases: { type: Type.ARRAY, items: { type: Type.STRING } },
          imageKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          surveyAnswers: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    text: { type: Type.STRING },
                    score: { type: Type.INTEGER },
                    alts: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["text", "score"]
            }
          }
        },
        required: ["id", "question", "answer", "points"]
      };

      let responseSchema: Schema;

      if (isJeopardy) {
        const rows = config.jeopardyRows || 5;
        const categories = config.jeopardyCategoryNames || ["Cat 1", "Cat 2", "Cat 3", "Cat 4", "Cat 5"];
        const qTypeInstruction = config.questionType === 'ai-decide' 
            ? "Mix of question types suitable for the category (some open, some multiple choice, etc)" 
            : config.questionType;

        prompt = `
          Create a Jeopardy game with the title "${gameTitle}".
          The game must have exactly ${categories.length} categories.
          The category names are: ${JSON.stringify(categories)}.
          For EACH category, create exactly ${rows} questions with increasing difficulty (e.g. 100, 200, 300, 400, 500).
          Question Style: ${qTypeInstruction}.
          Strict Mode: ${config.strictMode ? "Answers must be phrased as questions (What is...)" : "Standard answers"}.
          Custom Instructions: ${config.customInstructions || "None"}.
        `;
        
        responseSchema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                jeopardyBoard: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            questions: { type: Type.ARRAY, items: questionSchema }
                        },
                        required: ["name", "questions"]
                    }
                }
            },
            required: ["title", "jeopardyBoard"]
        };

      } else if (isPubQuiz) {
        const roundCount = config.pubQuizRoundsCount || 3;
        const questionsPerRound = config.pubQuizQuestionsPerRound || 5;
        const roundNames = config.pubQuizRoundNames || ["Round 1", "Round 2", "Round 3"];
        const qTypeInstruction = config.questionType === 'ai-decide' ? "Varied formats" : config.questionType;

        prompt = `
          Create a Pub Quiz game titled "${gameTitle}".
          The game must have exactly ${roundCount} rounds.
          The round names are: ${JSON.stringify(roundNames)}.
          For EACH round, create exactly ${questionsPerRound} questions.
          Question Style: ${qTypeInstruction}.
          Custom Instructions: ${config.customInstructions || "None"}.
        `;

        responseSchema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                pubQuizRounds: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            questions: { type: Type.ARRAY, items: questionSchema }
                        },
                        required: ["name", "questions"]
                    }
                }
            },
            required: ["title", "pubQuizRounds"]
        };

      } else if (isMillionaire) {
          prompt = `
          Create a "Who Wants to Be a Millionaire" style game titled "${gameTitle}" about "${config.topic}".
          Generate EXACTLY 15 questions.
          
          CRITICAL STRUCTURE RULES:
          1. SORT questions by difficulty:
             - Questions 1-5: Very Easy (General knowledge / Basic facts)
             - Questions 6-10: Medium (More specific / Application)
             - Questions 11-15: Hard/Expert (Obscure facts / Complex analysis)
          2. EACH question MUST have exactly 4 options.
          3. The 'answer' field must match one of the options exactly.
          
          Custom Instructions: ${config.customInstructions || "None"}.
          `;

          responseSchema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                questions: { type: Type.ARRAY, items: questionSchema }
            },
            required: ["title", "questions"]
          };

      } else if (isDarts) {
          const qTypeInstruction = config.questionType === 'ai-decide' ? "Mixed formats" : config.questionType;
          const requestedCount = (config.questionCount || 15) + 10;
          
          prompt = `
          Create a Darts game titled "${gameTitle}" about "${config.topic}".
          Generate a large pool of ${requestedCount} unique questions.
          CRITICAL: You MUST categorize them by difficulty.
          - 33% labeled 'easy'
          - 33% labeled 'medium'
          - 33% labeled 'hard'
          
          Question Style: ${qTypeInstruction}.
          Custom Instructions: ${config.customInstructions || "None"}.
          `;

          responseSchema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                questions: { type: Type.ARRAY, items: questionSchema }
            },
            required: ["title", "questions"]
          };

      } else if (isSurvey) {
          prompt = `
          Create a "Family Feud" style game titled "${gameTitle}" about "${config.topic}".
          Generate ${config.questionCount} rounds.
          
          FOR EACH QUESTION:
          1. Provide a "survey style" prompt.
          2. Provide EXACTLY 8 "surveyAnswers".
          3. Each answer must have a "text" and a "score".
          4. Include an "alts" array for fuzzy matching.
          
          Custom Instructions: ${config.customInstructions || "None"}.
          `;

          responseSchema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                questions: { type: Type.ARRAY, items: questionSchema }
            },
            required: ["title", "questions"]
          };

      } else if (isWordWheel) {
          const letterRuleInstruction =
              wordWheelLetterRule === 'contains-hard'
                  ? 'For letters Q, V, X, Y, Z: the answer may START with the letter OR CONTAIN it. Prefer CONTAINS only when it still gives a natural, age-appropriate word; STARTS WITH is fully valid. For all other letters: the answer must START with the letter.'
                  : 'For every letter A-Z: the answer must START with the letter.';

          prompt = `
          Create a classroom "Word Wheel" game titled "${gameTitle}" about "${config.topic}".
          Generate EXACTLY 26 clue entries, one for each English letter A-Z.

          CRITICAL RULES:
          1. Include a "letter" field for each entry using a single uppercase letter.
          2. Cover each letter exactly once from A through Z.
          3. "question" must be a concise clue (ideally <= 140 characters).
          4. "answer" must be a single canonical answer and obey this letter rule: ${letterRuleInstruction}
          5. Add "answerAliases" with 0-5 accepted alternatives/spellings where useful.
          6. Use points=10 for every entry.
          7. Do NOT include multiple-choice options for this game.

          Custom Instructions: ${config.customInstructions || "None"}.
          `;

          responseSchema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                questions: { type: Type.ARRAY, items: questionSchema }
            },
            required: ["title", "questions"]
          };

      } else {
        // Standard Game
        const qTypeInstruction = config.questionType === 'ai-decide' ? "Varied formats chosen by AI" : config.questionType;
        
        // Points Logic
        let pointsInstruction = "Assign 100 points to every question.";
        if (config.pointsMode === 'ai-random') {
            pointsInstruction = "Assign random point values between 5, 10, 15, 20, 25, 30, 35, 40, 45, 50 based on the difficulty of the question.";
        }

        prompt = `
          Create a ${config.type} game titled "${gameTitle}" about "${config.topic}".
          Number of questions: ${config.questionCount}.
          Question Type: ${qTypeInstruction}.
          Points Strategy: ${pointsInstruction}.
          Includes Bonus Questions: false.
          Custom Instructions: ${config.customInstructions || "None"}.
        `;
        
        if (isTimeBomb) {
            prompt += `
            STYLE: Generate questions that are short, snappy, and suitable for rapid-fire answers.
            Avoid long reading passages.
            `;
        }

        responseSchema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                questions: { type: Type.ARRAY, items: questionSchema }
            },
            required: ["title", "questions"]
        };
      }

      if (config.includeImages) {
        prompt += `
          IMPORTANT: Include imageKeywords (2-4 concise, concrete keywords) for EACH question.
          Use specific objects/scenes and avoid abstract tags (e.g., avoid "education", "concept", "background").
          If the prompt is generic (e.g., "Choose the correct sentence"), derive keywords from the ANSWER or options instead of the question text.
        `;
      }

      // Handle Files
      const parts: any[] = [];
      if (config.files && config.files.length > 0) {
          config.files.forEach((file: any) => {
              parts.push({
                  inlineData: {
                      mimeType: file.mimeType,
                      data: file.data
                  }
              });
          });
          prompt = `IMPORTANT: Analyze the attached files thoroughly. Create the game content based specifically on the information found in these documents.\n\n` + prompt;
      }
      parts.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      });

      const text = response.text;
      const data = JSON.parse(cleanJson(text || "{}"));

      enforceGameAnswerMatchesOptions(data);
      if (isWordWheel) {
        data.questions = normalizeWordWheelQuestions(data.questions || [], wordWheelLetterRule as WordWheelLetterRule);
      }
      
      // Ensure ID exists for database
      data.id = randomUUID();
      data.createdAt = new Date().toISOString();
      data.config = config; // Pass config back

      return res.status(200).json(data);
    }

    // 4. Handle WORKSHEET Generation
    if (action === 'worksheet') {
       const exactTitle = config.title || `Worksheet: ${config.topic || 'Untitled'}`;
       const activities = config.activities || [];
       const mcqActivities = activities.filter((a: any) => a.type === 'multiple-choice');
       const wordSearchActivities = activities.filter((a: any) => a.type === 'wordsearch');
       const matchingActivities = activities.filter((a: any) => a.type === 'matching');
       const gapFillActivities = activities.filter((a: any) => a.type === 'gap-fill');
       const sentenceTransformActivities = activities.filter((a: any) => a.type === 'sentence-transform');
       const wordFormationActivities = activities.filter((a: any) => a.type === 'word-formation');
       const openEndedActivities = activities.filter((a: any) => a.type === 'open-ended');
       const infoSheetActivities = activities.filter((a: any) => a.type === 'information-sheet');
       const customActivities = activities.filter((a: any) => a.type === 'custom');
       const tableActivities = activities.filter((a: any) => a.type === 'table');
       const wantsStory = activities.some(
         (a: any) => ['gap-fill', 'word-formation', 'multiple-choice', 'open-ended'].includes(a.type) && a.contextType === 'text'
       );
       const wantsMcq = mcqActivities.length > 0;
       const wantsWordSearch = wordSearchActivities.length > 0;
       const wantsMatching = matchingActivities.length > 0;
       const wantsGapFill = gapFillActivities.length > 0;
       const wantsSentenceTransform = sentenceTransformActivities.length > 0;
       const wantsWordFormation = wordFormationActivities.length > 0;
       const wantsOpenEnded = openEndedActivities.length > 0;
       const wantsInfoSheet = infoSheetActivities.length > 0;
       const wantsCustom = customActivities.length > 0;
       const wantsTable = tableActivities.length > 0;
       const wantsAnswerKey = Boolean(config.generateAnswerKey) && activities.some((a: any) => a.type !== 'information-sheet');

       const mcqCount = mcqActivities.reduce((sum: number, a: any) => sum + (a.count || 0), 0);
       const wordSearchCount = wordSearchActivities.length;
       const matchingCount = matchingActivities.reduce((sum: number, a: any) => sum + (a.count || 0), 0);
       const gapFillCount = gapFillActivities.reduce((sum: number, a: any) => sum + (a.count || 0), 0);
       const sentenceTransformCount = sentenceTransformActivities.reduce((sum: number, a: any) => sum + (a.count || 0), 0);
       const wordFormationCount = wordFormationActivities.reduce((sum: number, a: any) => sum + (a.count || 0), 0);
       const openEndedCount = openEndedActivities.reduce((sum: number, a: any) => sum + (a.count || 0), 0);
       const customCount = customActivities.length;
       const gapFillEmbedInStory = gapFillActivities.some((a: any) => a.contextType === 'text' && a.options?.embedInStory);
       const formatActivityNotes = (note?: string) => {
         const trimmed = (note || '').trim();
         return trimmed ? ` notes: ${trimmed}` : '';
       };
       const clampMcCount = (value?: number) => {
         const parsed = typeof value === 'number' ? value : Number(value);
         if (!Number.isFinite(parsed)) return 4;
         return Math.min(4, Math.max(2, Math.round(parsed)));
       };

       const getGridSpec = (activity: any, fallback: { rows: number; cols: number }) => {
         const rows = Math.max(2, Math.floor(activity?.options?.rows ?? fallback.rows));
         const cols = Math.max(2, Math.floor(activity?.options?.cols ?? fallback.cols));
         return { rows, cols };
       };

       const tableActivitySummary = tableActivities
         .map((a: any) => {
           const spec = getGridSpec(a, { rows: 4, cols: 3 });
           return `${a.type} (${spec.rows}x${spec.cols})${formatActivityNotes(a.customInstructions)}`;
         })
         .join('; ');

       const orderedActivities = activities.filter((a: any) =>
         [
           'information-sheet',
           'multiple-choice',
           'wordsearch',
           'matching',
           'gap-fill',
           'sentence-transform',
           'word-formation',
           'open-ended',
           'custom',
           'table',
         ].includes(a.type)
       );

       const activityOrder = orderedActivities
         .map((a: any, idx: number) => {
           const activityCount = a.type === 'custom' ? 1 : a.count || 0;
           let contextNote = '';
           if (['gap-fill', 'word-formation'].includes(a.type)) {
             const context = a.contextType === 'text' ? 'story' : 'sentences';
             contextNote = `, context: ${context}`;
           } else if (a.type === 'multiple-choice' && a.contextType === 'text') {
             contextNote = ', context: story';
           }
           const optionsNote = a.type === 'multiple-choice' ? `, options: ${clampMcCount(a.options?.mcCount)}` : '';
           const gridNote =
             a.type === 'wordsearch' || a.type === 'table'
               ? (() => {
                   const spec = getGridSpec(a, a.type === 'wordsearch' ? { rows: 10, cols: 10 } : { rows: 4, cols: 3 });
                   return `, size: ${spec.rows}x${spec.cols}`;
                 })()
               : '';
           return `${idx + 1}. ${a.type} (${activityCount}${contextNote}${optionsNote}${gridNote})${formatActivityNotes(
             a.customInstructions
           )}`;
         })
         .join('\n');

       const requestedBlocks: string[] = [];
       if (wantsStory) {
         requestedBlocks.push(
           '- storyHtml: a short reading passage or lesson text suitable for the grade level (2-6 short paragraphs).'
         );
       }
       if (wantsMcq) {
         requestedBlocks.push(
           `- mcq: ${mcqCount} multiple-choice questions based on the story/topic. Keep question groups in the same order as listed below.`
         );
         if (mcqActivities.length > 0) {
           requestedBlocks.push(
             '  MCQ groups (count + options per question):\n' +
             mcqActivities
               .map(
                 (a: any) =>
                   `  - ${a.count || 0} questions with ${clampMcCount(a.options?.mcCount)} options${formatActivityNotes(
                     a.customInstructions
                   )}`
               )
               .join('\n')
           );
         }
       }
       if (wantsWordSearch) {
         requestedBlocks.push(
           `- wordSearch: ${wordSearchCount} wordsearch puzzle(s). Provide one puzzle per wordsearch activity in the same order.`
         );
         requestedBlocks.push(
           '  Wordsearch specs (rows x cols, word count, notes):\n' +
             wordSearchActivities
               .map((a: any) => {
                 const spec = getGridSpec(a, { rows: 10, cols: 10 });
                 return `  - ${spec.rows}x${spec.cols}, ${a.count || 0} words${formatActivityNotes(a.customInstructions)}`;
               })
               .join('\n')
         );
         requestedBlocks.push('  If notes include a word list, use it. Otherwise, generate words to match the requested count.');
       }
       if (wantsMatching) {
         requestedBlocks.push(
           `- matching: ${matchingCount} matching pairs. Keep items grouped and in the same order as listed below.`
         );
         requestedBlocks.push(
           '  Matching groups (count + notes):\n' +
             matchingActivities
               .map((a: any) => `  - ${a.count || 0} pairs${formatActivityNotes(a.customInstructions)}`)
               .join('\n')
         );
         requestedBlocks.push('  Matching is rendered as a 3-column table (left item, blank middle, right item). Provide left/right pairs only.');
       }
        if (wantsGapFill) {
          requestedBlocks.push(
            `- gapFill: ${gapFillCount} gap-fill items. Keep items grouped and in the same order as listed below.`
          );
         requestedBlocks.push(
           '  Gap Fill groups (count + context):\n' +
             gapFillActivities
               .map((a: any) => {
                 const context = a.contextType === 'text' ? 'story' : 'sentences';
                 return `  - ${a.count || 0} items (${context})${formatActivityNotes(a.customInstructions)}`;
                })
                .join('\n')
          );
          requestedBlocks.push(
            '  If context is story with embed enabled, distribute blanks across the entire story (multiple paragraphs/sentences), not mostly in the first paragraph.'
          );
        }
       if (wantsSentenceTransform) {
         requestedBlocks.push(
           `- sentenceTransform: ${sentenceTransformCount} sentence transformation prompts. Keep items grouped and in the same order as listed below.`
         );
         requestedBlocks.push(
           '  Sentence Transform groups (count + notes):\n' +
             sentenceTransformActivities
               .map((a: any) => `  - ${a.count || 0} prompts${formatActivityNotes(a.customInstructions)}`)
               .join('\n')
         );
       }
       if (wantsWordFormation) {
         requestedBlocks.push(
           `- wordFormation: ${wordFormationCount} word-formation items. Keep items grouped and in the same order as listed below.`
         );
         requestedBlocks.push(
           '  Word Formation groups (count + context):\n' +
             wordFormationActivities
               .map((a: any) => {
                 const context = a.contextType === 'text' ? 'story' : 'sentences';
                 return `  - ${a.count || 0} items (${context})${formatActivityNotes(a.customInstructions)}`;
               })
               .join('\n')
         );
       }
       if (wantsOpenEnded) {
         requestedBlocks.push(
           `- openEnded: ${openEndedCount} open-ended questions. Keep items grouped and in the same order as listed below.`
         );
         requestedBlocks.push(
           '  Open Ended groups (count + notes):\n' +
             openEndedActivities
               .map((a: any) => {
                 return `  - ${a.count || 0} questions${formatActivityNotes(a.customInstructions)}`;
               })
               .join('\n')
         );
       }
       if (wantsCustom) {
         requestedBlocks.push(
           `- custom: ${customCount} custom text outputs. Provide one text output per custom activity in the same order.`
         );
         requestedBlocks.push(
           '  Custom groups (notes only):\n' +
             customActivities
               .map((a: any) => {
                 const notes = (a.customInstructions || '').trim();
                 return notes ? `  - notes: ${notes}` : '  - notes: none';
               })
               .join('\n')
         );
       }
       if (wantsTable) {
         const activityLine = tableActivitySummary
           ? `- table: Create a table with the specified size(s): ${tableActivitySummary}. Use the first size if multiple are listed.`
           : '- table: Create a table with the requested rows/columns.';
         requestedBlocks.push(activityLine);
         if (tableActivities[0]) {
           const spec = getGridSpec(tableActivities[0], { rows: 4, cols: 3 });
           requestedBlocks.push(`  Use exactly ${spec.rows} body rows and ${spec.cols} columns (headers length must equal columns).`);
         }
       }
       if (wantsInfoSheet) {
         const infoCount = infoSheetActivities.reduce((sum: number, a: any) => sum + (a.count || 0), 0);
         requestedBlocks.push(
           `- infoSections: ${infoCount} information sections with title + bodyHtml (safe HTML). Keep sections in the same order as listed below.`
         );
         requestedBlocks.push(
           '  Information Sheet groups (count + notes):\n' +
             infoSheetActivities
               .map((a: any) => `  - ${a.count || 0} sections${formatActivityNotes(a.customInstructions)}`)
               .join('\n')
         );
       }
       if (wantsAnswerKey) {
         requestedBlocks.push(
           '- answerKeyHtml: A complete answer key for all requested activities (include answers for MCQ, wordsearch, matching, gap-fill, sentence-transform, word-formation, and sample answers for open-ended/custom).'
         );
       }
       if (requestedBlocks.length === 0) {
         requestedBlocks.push('- No activity blocks requested. Return only the title.');
       }

       let prompt = `
Use this exact title: ${exactTitle}

Topic: ${config.topic || 'N/A'}
Grade Level: ${config.gradeLevel || 'N/A'}
Difficulty: ${config.difficultyLevel || 'medium'}
Additional Instructions: ${config.customInstructions || 'None'}

${activityOrder ? `Activities (in order):\n${activityOrder}\n` : ''}
Requested Blocks:
${requestedBlocks.join('\n')}

${gapFillEmbedInStory
  ? 'Gap Fill embedded-story mode: storyHtml must include the gap-fill blanks (use "_____"), with blanks distributed across the full story rather than front-loaded in paragraph one.\n'
  : ''}
Only include fields for the requested blocks. Do not include extra fields.

If source files are attached, base requested content on those documents instead of inventing unrelated facts.
       `;

       const systemInstruction = `You are an expert teacher generating worksheet PARTS for a drag-and-drop worksheet designer.

Return ONLY valid JSON that matches the provided schema (no markdown).

RULES:
1. Only include fields for the requested blocks. Omit all other fields.
2. storyHtml must be safe, simple HTML (use <p>, <strong>, <em>, <u>, <ul>, <ol>, <li>, <br>, <h3>).
3. No <html>, <head>, <body>, <script>, <style>, or inline CSS styles.
4. All non-HTML text fields must be plain text only (no HTML tags or entities).
5. mcq must contain clear questions and answer options appropriate for the grade level.
6. wordSearch items use { grid, words } where grid is rows x cols of single letters and words lists the target words.
7. matching items use { left, right } pairs.
8. gapFill items use { sentence, answer } where sentence includes a "_____" blank.
9. sentenceTransform items use { prompt, answer? }.
10. wordFormation items use { base, sentence, answer } where sentence includes a "_____" blank.
11. openEnded items use { question, sampleAnswer? }.
12. custom items use { text }.
13. answerKeyHtml (if requested) must be safe, simple HTML (use <div>, <h3>, <p>, <ol>, <ul>, <li>, <strong>, <em>, <br>).
14. table should match the requested activity types and fit on an A4 page when possible.
15. If gap-fill is embedded in storyHtml, spread blanks across the full story (across paragraphs/sentences); do not cluster most blanks at the beginning.
       `;

       // Handle Files
       const parts: any[] = [];
       if (config.files && config.files.length > 0) {
           config.files.forEach((file: any) => {
               parts.push({
                   inlineData: {
                       mimeType: file.mimeType,
                       data: file.data
                   }
               });
           });
           prompt = `IMPORTANT: Analyze the attached files thoroughly. Create the worksheet content based specifically on the information found in these documents.\n\n` + prompt;
       }
       parts.push({ text: prompt });

       const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    ...(wantsStory ? { storyHtml: { type: Type.STRING } } : {}),
                    ...(wantsMcq
                      ? {
                          mcq: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                q: { type: Type.STRING },
                                options: { type: Type.ARRAY, items: { type: Type.STRING } }
                              },
                              required: ["q", "options"]
                            }
                          }
                        }
                      : {}),
                    ...(wantsWordSearch
                      ? {
                          wordSearch: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                grid: {
                                  type: Type.ARRAY,
                                  items: { type: Type.ARRAY, items: { type: Type.STRING } }
                                },
                                words: { type: Type.ARRAY, items: { type: Type.STRING } }
                              },
                              required: ["grid", "words"]
                            }
                          }
                        }
                      : {}),
                    ...(wantsMatching
                      ? {
                          matching: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                left: { type: Type.STRING },
                                right: { type: Type.STRING }
                              },
                              required: ["left", "right"]
                            }
                          }
                        }
                      : {}),
                    ...(wantsTable
                      ? {
                          table: {
                            type: Type.OBJECT,
                            properties: {
                              headers: { type: Type.ARRAY, items: { type: Type.STRING } },
                              rows: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } }
                            },
                            required: ["headers", "rows"]
                          }
                        }
                      : {}),
                    ...(wantsGapFill
                      ? {
                          gapFill: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                sentence: { type: Type.STRING },
                                answer: { type: Type.STRING }
                              },
                              required: ["sentence", "answer"]
                            }
                          }
                        }
                      : {}),
                    ...(wantsSentenceTransform
                      ? {
                          sentenceTransform: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                prompt: { type: Type.STRING },
                                answer: { type: Type.STRING }
                              },
                              required: ["prompt"]
                            }
                          }
                        }
                      : {}),
                    ...(wantsWordFormation
                      ? {
                          wordFormation: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                base: { type: Type.STRING },
                                sentence: { type: Type.STRING },
                                answer: { type: Type.STRING }
                              },
                              required: ["base", "sentence", "answer"]
                            }
                          }
                        }
                      : {}),
                    ...(wantsOpenEnded
                      ? {
                          openEnded: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                question: { type: Type.STRING },
                                sampleAnswer: { type: Type.STRING }
                              },
                              required: ["question"]
                            }
                          }
                        }
                      : {}),
                    ...(wantsCustom
                      ? {
                          custom: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                text: { type: Type.STRING }
                              },
                              required: ["text"]
                            }
                          }
                        }
                      : {}),
                    ...(wantsInfoSheet
                      ? {
                          infoSections: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                title: { type: Type.STRING },
                                bodyHtml: { type: Type.STRING }
                              },
                              required: ["title", "bodyHtml"]
                            }
                          }
                        }
                      : {}),
                    ...(wantsAnswerKey ? { answerKeyHtml: { type: Type.STRING } } : {})
                },
                required: [
                  "title",
                  ...(wantsStory ? ["storyHtml"] : []),
                  ...(wantsMcq ? ["mcq"] : []),
                  ...(wantsWordSearch ? ["wordSearch"] : []),
                  ...(wantsMatching ? ["matching"] : []),
                  ...(wantsGapFill ? ["gapFill"] : []),
                  ...(wantsSentenceTransform ? ["sentenceTransform"] : []),
                  ...(wantsWordFormation ? ["wordFormation"] : []),
                  ...(wantsOpenEnded ? ["openEnded"] : []),
                  ...(wantsCustom ? ["custom"] : []),
                  ...(wantsInfoSheet ? ["infoSections"] : []),
                  ...(wantsTable ? ["table"] : []),
                  ...(wantsAnswerKey ? ["answerKeyHtml"] : [])
                ]
            }
        }
       });

       const text = response.text;
       const result = JSON.parse(cleanJson(text || "{}"));

       const coerceArray = (value: any) => (Array.isArray(value) ? value : []);
       const escapeHtml = (value: string) =>
         value
           .replace(/&/g, "&amp;")
           .replace(/</g, "&lt;")
           .replace(/>/g, "&gt;");
       const fallbackInfoText = (notes: string) => {
         const trimmed = (notes || '').trim();
         if (!trimmed) return "<p>Information to be added.</p>";
         return `<p>${escapeHtml(trimmed).replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
       };

       if (wantsStory && typeof result.storyHtml !== "string") {
         const fromNotes = activities.map((a: any) => a.customInstructions).filter(Boolean).join("\n");
         result.storyHtml = fallbackInfoText(fromNotes);
       }
       if (wantsMcq) {
         result.mcq = coerceArray(result.mcq);
         if (result.mcq.length === 0 && mcqCount > 0) {
           result.mcq = Array.from({ length: mcqCount }, (_, idx) => ({
             q: `Question ${idx + 1}`,
             options: ["Option A", "Option B", "Option C", "Option D"].slice(0, clampMcCount(mcqActivities[0]?.options?.mcCount))
           }));
         }
       }
       if (wantsGapFill) {
         result.gapFill = coerceArray(result.gapFill);
         if (result.gapFill.length === 0 && gapFillCount > 0) {
           result.gapFill = Array.from({ length: gapFillCount }, () => ({
             sentence: "_____",
             answer: ""
           }));
         }
       }
       if (wantsWordSearch) {
         result.wordSearch = coerceArray(result.wordSearch);
       }
       if (wantsMatching) {
         result.matching = coerceArray(result.matching);
       }
       if (wantsSentenceTransform) {
         result.sentenceTransform = coerceArray(result.sentenceTransform);
       }
       if (wantsWordFormation) {
         result.wordFormation = coerceArray(result.wordFormation);
       }
       if (wantsOpenEnded) {
         result.openEnded = coerceArray(result.openEnded);
       }
       if (wantsCustom) {
         result.custom = coerceArray(result.custom);
       }
       if (wantsInfoSheet) {
         result.infoSections = coerceArray(result.infoSections);
         if (result.infoSections.length === 0) {
           const notes = infoSheetActivities.map((a: any) => a.customInstructions).filter(Boolean).join("\n");
           result.infoSections = [
             {
               title: "Information",
               bodyHtml: fallbackInfoText(notes)
             }
           ];
         }
       }
       
       return res.status(200).json(result);
    }

    // 5. Handle WIZARD CHAT (Structured JSON Output)
    if (action === 'chat_wizard') {
        const systemInstruction = `You are "The Teachers' Room AI Assistant", a friendly expert game consultant.
        Your goal is to help teachers choose the best game format for their specific class needs (Topic, Age, Learning Goal).
        
        AVAILABLE GAME TYPES AND BEST LEARNING FIT:
        1. Jeopardy (category-based retrieval practice, revision across units, team reasoning)
        2. Trivia Quiz (quick knowledge checks, mixed recall, broad coverage)
        3. Pub Quiz (round-based progression, themed revision, cumulative practice)
        4. Snakes and Ladders (low-pressure repetition, younger learners, engagement-first recall)
        5. Darts (targeted challenge rounds, focused retrieval, motivation through competition)
        6. Millionaire Maker (progressive difficulty, multiple-choice reasoning, exam confidence)
        7. Time Bomb (rapid fluency drills, verbal recall, quick vocabulary/list retrieval)
        8. Survey Showdown (prediction, discussion, social reasoning and speaking)
        9. Word Wheel (A-Z clue race, excellent for definitions, glossary terms, key vocabulary and terminology recall)

        BEHAVIOR:
        - If the user's request is vague (e.g. "I want a game"), ask 1-2 clarifying questions.
        - If the user gives enough info, provide 2 or 3 ranked recommendations so the teacher can choose.
        - Put recommendations in 'suggestions' (array). Include a short 'reason' for each item.
        - Keep 'suggestion' as the single best option (same as suggestions[0]) for backward compatibility.
        - If the user asks for definitions, vocabulary, glossary, terminology, or key terms, prioritize Word Wheel in the top 1-2 options.
        - Default to at least 25 questions unless the game format caps it (e.g. Millionaire Maker is always 15) or the user explicitly asks for a different count.
        - For Jeopardy or Pub Quiz, set rows/rounds so the total questions are at least 25 unless the user explicitly asks for fewer.
        
        TONE: Professional, encouraging, concise.
        `;

        // Map history from client
        const contents = history.map((h: any) => ({
            role: h.role === 'ai' ? 'model' : 'user',
            parts: [{ text: h.text }]
        }));
        
        contents.push({
            role: 'user',
            parts: [{ text: message }]
        });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        message: { type: Type.STRING },
                        suggestion: {
                            type: Type.OBJECT,
                            nullable: true,
                            properties: {
                                type: { type: Type.STRING },
                                title: { type: Type.STRING },
                                topic: { type: Type.STRING },
                                questionCount: { type: Type.INTEGER },
                                questionType: { type: Type.STRING },
                                customInstructions: { type: Type.STRING },
                                reason: { type: Type.STRING },
                                jeopardyCategories: { type: Type.INTEGER },
                                jeopardyCategoryNames: { type: Type.ARRAY, items: { type: Type.STRING } },
                                pubQuizRoundsCount: { type: Type.INTEGER },
                                pubQuizRoundNames: { type: Type.ARRAY, items: { type: Type.STRING } },
                                wordWheelScoringMode: { type: Type.STRING },
                                wordWheelLetterRule: { type: Type.STRING }
                            },
                            required: ["type", "title", "topic"]
                        },
                        suggestions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    type: { type: Type.STRING },
                                    title: { type: Type.STRING },
                                    topic: { type: Type.STRING },
                                    questionCount: { type: Type.INTEGER },
                                    questionType: { type: Type.STRING },
                                    customInstructions: { type: Type.STRING },
                                    reason: { type: Type.STRING },
                                    jeopardyCategories: { type: Type.INTEGER },
                                    jeopardyCategoryNames: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    pubQuizRoundsCount: { type: Type.INTEGER },
                                    pubQuizRoundNames: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    wordWheelScoringMode: { type: Type.STRING },
                                    wordWheelLetterRule: { type: Type.STRING }
                                },
                                required: ["type", "title", "topic"]
                            }
                        }
                    },
                    required: ["message"]
                }
            }
        });

        const text = response.text;
        const data = JSON.parse(cleanJson(text || "{}"));
        return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error: any) {
    console.error("Generate API Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
