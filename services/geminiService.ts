
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GameConfig, GeneratedGame, WorksheetAiParts, WorksheetConfig, GameType } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
// Always use current origin for API calls to avoid CORS issues with Vercel preview deployments
const DEFAULT_EXTERNAL_API = '/api/generate';
const externalApiUrl = import.meta.env.VITE_EXTERNAL_API_URL;

const tryExternalApi = async <T>(body: Record<string, any>): Promise<T | null> => {
  // If VITE_GEMINI_API_KEY exists, skip external API and use direct client
  if (apiKey) {
    console.log('Using direct Gemini API with client-side key');
    return null;
  }

  // Only use external API if explicitly set or no API key available
  const apiUrl = externalApiUrl || DEFAULT_EXTERNAL_API;

  try {
      console.log('Attempting external API call to:', apiUrl);
      const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
      });

      if (!response.ok) {
          throw new Error(`External API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
  } catch (error) {
      console.error("External API request failed", error);
      return null;
  }
};

// Helper to initialize client safely
const getClient = () => {
  if (!apiKey) {
    console.error("API Key is missing in client environment");
    throw new Error("API Key is missing. If you are using the External API, check your Profile settings.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to clean JSON string from Markdown code blocks
const cleanJson = (text: string): string => {
  if (!text) return "{}";
  // Remove markdown code blocks like ```json ... ```
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
  // Extract the JSON object if there is extra text around it
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

const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // UUID v4 Polyfill
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export const generateGameContent = async (config: GameConfig): Promise<GeneratedGame> => {
  const external = await tryExternalApi<GeneratedGame>({ action: 'game', config });
  if (external) return external;

  // --- INTERNAL GOOGLE SDK PATH ---
  const ai = getClient();
  
  const isJeopardy = config.type === GameType.JEOPARDY;
  const isPubQuiz = config.type === GameType.PUB_QUIZ;
  const isDarts = config.type === GameType.DARTS;
  const isMillionaire = config.type === GameType.MILLIONAIRE;
  const isTimeBomb = config.type === GameType.TIME_BOMB;
  const isSurvey = config.type === GameType.SURVEY_SHOWDOWN;

  const systemInstruction = `You are an expert educational content creator. 
  Create a structured game based on the following parameters.
  
  If the user provides source files (images/PDFs), analyze them thoroughly and base ALL questions/content on that material.

  IMPORTANT: Questions must have a single, unambiguous correct answer. Avoid prompts where multiple answers could be valid (e.g. vague pronouns, subjective opinions, or fill-in-the-blank with multiple correct options). If a question could plausibly have more than one correct answer, rephrase it to be specific and uniquely answerable.
  If a question includes options, the "answer" must EXACTLY match one of the option strings (including articles like "a/an/the", punctuation, and capitalization). Do not paraphrase or drop articles.
  
  CRITICAL JSON RULES:
  1. Return ONLY valid JSON.
  2. STRICTLY escape all special characters in strings. 
  3. NO unescaped newlines, tabs, or control characters inside string values. Use \\n for line breaks.
  
  Ensure questions are appropriate for a classroom setting.
  `;

  let prompt = '';
  
  // Determine Title
  const gameTitle = config.title || `My ${config.type} Game`;

  // Define Schema Parts
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
      // Survey specific
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
    const categories = config.jeopardyCategoryNames || ["Category 1", "Category 2", "Category 3", "Category 4", "Category 5"];
    const qTypeInstruction = config.questionType === 'ai-decide'
        ? "Mix of question types suitable for the category (some open, some multiple choice, etc)"
        : config.questionType;
    const mcInstruction = config.questionType === 'multiple-choice'
        ? ` Each multiple choice question must have exactly ${config.mcOptionCount || 4} options.`
        : '';

    prompt = `
      Create a Jeopardy game with the title "${gameTitle}".
      The game must have exactly ${categories.length} categories.
      The category names are: ${JSON.stringify(categories)}.
      For EACH category, create exactly ${rows} questions with increasing difficulty (e.g. 100, 200, 300, 400, 500).
      Question Style: ${qTypeInstruction}.${mcInstruction}
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
    const roundNames = config.pubQuizRoundNames || ["General Knowledge", "Music", "Science"];
    const qTypeInstruction = config.questionType === 'ai-decide' ? "Varied formats" : config.questionType;
    const mcInstruction = config.questionType === 'multiple-choice'
        ? ` Each multiple choice question must have exactly ${config.mcOptionCount || 4} options.`
        : '';

    prompt = `
      Create a Pub Quiz game titled "${gameTitle}".
      The game must have exactly ${roundCount} rounds.
      The round names are: ${JSON.stringify(roundNames)}.
      For EACH round, create exactly ${questionsPerRound} questions.
      Question Style: ${qTypeInstruction}.${mcInstruction}
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
      const mcInstruction = config.questionType === 'multiple-choice'
          ? ` Each multiple choice question must have exactly ${config.mcOptionCount || 4} options.`
          : '';
      // Add reserve buffer (+10) to ensure rounds can complete if repeats are needed
      const requestedCount = (config.questionCount || 15) + 10;

      prompt = `
      Create a Darts game titled "${gameTitle}" about "${config.topic}".
      Generate a large pool of ${requestedCount} unique questions.
      CRITICAL: You MUST categorize them by difficulty.
      - 33% labeled 'easy' (Simple facts/vocab)
      - 33% labeled 'medium' (Application/sentences)
      - 33% labeled 'hard' (Complex/Analysis)

      Question Style: ${qTypeInstruction}.${mcInstruction}
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
      Create a "Family Feud" / "Family Fortunes" style game titled "${gameTitle}" about "${config.topic}".
      Generate ${config.questionCount} rounds (questions).
      
      FOR EACH QUESTION:
      1. Provide a "survey style" prompt (e.g. "Name something you find in a kitchen", "Name a reason people are late").
      2. Provide EXACTLY 8 "surveyAnswers".
      3. Each answer must have a "text" and a "score".
      4. CRITICAL: Include an "alts" array for each answer containing 3-5 synonyms or acceptable variations (e.g. for "Money", alts=["Cash", "Coins", "Dosh"]).
      5. Rank the answers by score (highest to lowest).
      6. Scores should roughly sum to 100.
      
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
    const mcInstruction = config.questionType === 'multiple-choice'
        ? ` Each multiple choice question must have exactly ${config.mcOptionCount || 4} options.`
        : '';

    // Points Logic
    let pointsInstruction = "Assign 100 points to every question.";
    if (config.pointsMode === 'ai-random') {
        pointsInstruction = "Assign random point values between 5, 10, 15, 20, 25, 30, 35, 40, 45, 50 based on the difficulty of the question.";
    }

    prompt = `
      Create a ${config.type} game titled "${gameTitle}" about "${config.topic}".
      Number of questions: ${config.questionCount}.
      Question Type: ${qTypeInstruction}.${mcInstruction}
      Points Strategy: ${pointsInstruction}
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

  try {
    // Construct payload with potential file attachments
    const parts: any[] = [];
    
    if (config.files && config.files.length > 0) {
        config.files.forEach(file => {
            parts.push({
                inlineData: {
                    mimeType: file.mimeType,
                    data: file.data
                }
            });
        });
        // Add specific instruction to focus on files
        prompt = `IMPORTANT: Analyze the attached files thoroughly. Create the game content based specifically on the information found in these documents.\n\n` + prompt;
    }
    
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const data = JSON.parse(cleanJson(text));

    enforceGameAnswerMatchesOptions(data);
    
    return {
      id: generateUUID(),
      createdAt: new Date().toISOString(),
      title: data.title || config.title,
      config: config,
      questions: data.questions || [],
      jeopardyBoard: data.jeopardyBoard,
      pubQuizRounds: data.pubQuizRounds
    };
  } catch (error) {
    console.error("Error generating game:", error);
    throw error;
  }
};

export const generateWorksheetContent = async (config: WorksheetConfig): Promise<WorksheetAiParts> => {
  const external = await tryExternalApi<WorksheetAiParts>({ action: 'worksheet', config });
  if (external) return external;

  const ai = getClient();
  
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
`;

  const activities = config.activities || [];
  const mcqActivities = activities.filter((a) => a.type === 'multiple-choice');
  const wordSearchActivities = activities.filter((a) => a.type === 'wordsearch');
  const matchingActivities = activities.filter((a) => a.type === 'matching');
  const gapFillActivities = activities.filter((a) => a.type === 'gap-fill');
  const sentenceTransformActivities = activities.filter((a) => a.type === 'sentence-transform');
  const wordFormationActivities = activities.filter((a) => a.type === 'word-formation');
  const openEndedActivities = activities.filter((a) => a.type === 'open-ended');
  const customActivities = activities.filter((a) => a.type === 'custom');
  const tableActivities = activities.filter((a) => a.type === 'table');
  const wantsStory = activities.some(
    (a) => ['gap-fill', 'word-formation', 'multiple-choice'].includes(a.type) && a.contextType === 'text'
  );
  const wantsMcq = mcqActivities.length > 0;
  const wantsWordSearch = wordSearchActivities.length > 0;
  const wantsMatching = matchingActivities.length > 0;
  const wantsGapFill = gapFillActivities.length > 0;
  const wantsSentenceTransform = sentenceTransformActivities.length > 0;
  const wantsWordFormation = wordFormationActivities.length > 0;
  const wantsOpenEnded = openEndedActivities.length > 0;
  const wantsCustom = customActivities.length > 0;
  const wantsTable = tableActivities.length > 0;
  const wantsAnswerKey = Boolean(config.generateAnswerKey) && activities.length > 0;

  const mcqCount = mcqActivities.reduce((sum, a) => sum + (a.count || 0), 0);
  const wordSearchCount = wordSearchActivities.length;
  const matchingCount = matchingActivities.reduce((sum, a) => sum + (a.count || 0), 0);
  const gapFillCount = gapFillActivities.reduce((sum, a) => sum + (a.count || 0), 0);
  const sentenceTransformCount = sentenceTransformActivities.reduce((sum, a) => sum + (a.count || 0), 0);
  const wordFormationCount = wordFormationActivities.reduce((sum, a) => sum + (a.count || 0), 0);
  const openEndedCount = openEndedActivities.reduce((sum, a) => sum + (a.count || 0), 0);
  const customCount = customActivities.length;
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
    .map((a) => {
      const spec = getGridSpec(a, { rows: 4, cols: 3 });
      return `${a.type} (${spec.rows}x${spec.cols})${formatActivityNotes(a.customInstructions)}`;
    })
    .join('; ');

  const orderedActivities = activities.filter((a) =>
    [
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
    .map((a, idx) => {
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

  const exactTitle = config.title || `Worksheet: ${config.topic || 'Untitled'}`;

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
              (a) =>
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
          .map((a) => {
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
          .map((a) => `  - ${a.count || 0} pairs${formatActivityNotes(a.customInstructions)}`)
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
          .map((a) => {
            const context = a.contextType === 'text' ? 'story' : 'sentences';
            return `  - ${a.count || 0} items (${context})${formatActivityNotes(a.customInstructions)}`;
          })
          .join('\n')
    );
  }
  if (wantsSentenceTransform) {
    requestedBlocks.push(
      `- sentenceTransform: ${sentenceTransformCount} sentence transformation prompts. Keep items grouped and in the same order as listed below.`
    );
    requestedBlocks.push(
      '  Sentence Transform groups (count + notes):\n' +
        sentenceTransformActivities
          .map((a) => `  - ${a.count || 0} prompts${formatActivityNotes(a.customInstructions)}`)
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
          .map((a) => {
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
          .map((a) => {
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
          .map((a) => {
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

Only include fields for the requested blocks. Do not include extra fields.

If source files are attached, base requested content on those documents instead of inventing unrelated facts.
`;

  try {
    // Construct payload with potential file attachments
    const parts: any[] = [];
    
    if (config.files && config.files.length > 0) {
        config.files.forEach(file => {
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
        systemInstruction: systemInstruction,
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
            ...(wantsTable ? ["table"] : []),
            ...(wantsAnswerKey ? ["answerKeyHtml"] : [])
          ]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    // Clean and parse
    const result = JSON.parse(cleanJson(text)) as WorksheetAiParts;
    return result;
  } catch (error) {
    console.error("Error generating worksheet:", error);
    throw error;
  }
};

export const chatWithGameWizard = async (message: string, history: {role: string, text: string}[]): Promise<{message: string, suggestion?: GameConfig}> => {
    const external = await tryExternalApi<{message: string, suggestion?: GameConfig}>({
        action: 'chat_wizard',
        message,
        history
    });
    if (external) return external;

    // --- INTERNAL LOCAL PATH ---
    const ai = getClient();
    
    const systemInstruction = `You are "The Teachers' Room AI Assistant", a friendly expert game consultant.
    Your goal is to help teachers choose the best game format for their specific class needs (Topic, Age, Learning Goal).
    
    AVAILABLE GAME TYPES:
    1. Jeopardy (Team strategy, review categories)
    2. Trivia Quiz (Fast paced, general knowledge)
    3. Pub Quiz (Rounds based, structured)
    4. Snakes and Ladders (Fun, luck based, younger kids)
    5. Darts (Accuracy + Knowledge, fun twist)
    6. Millionaire Maker (High stakes, 1 player or class consensus)
    7. Time Bomb (High pressure, pass the device, vocabulary/lists)
    8. Survey Showdown (Family Feud style, popular opinion, guessing)

    BEHAVIOR:
    - If the user's request is vague (e.g. "I want a game"), ask 1-2 clarifying questions (e.g. "What topic? What grade? Do they like competition?").
    - If the user gives enough info, recommend a specific game type and explain why briefly.
    - When you make a recommendation, populate the 'suggestion' field in the JSON response with a valid GameConfig.
    - If no recommendation is ready yet, leave 'suggestion' null.
    - Default to at least 25 questions unless the game format caps it (e.g. Millionaire Maker is always 15) or the user explicitly asks for a different count.
    - For Jeopardy or Pub Quiz, set rows/rounds so the total questions are at least 25 unless the user explicitly asks for fewer.
    
    TONE: Professional, encouraging, concise.
    `;

    // Map internal history format to Gemini SDK format
    const contents = history.map(h => ({
        role: h.role === 'ai' ? 'model' : 'user',
        parts: [{ text: h.text }]
    }));
    
    // Add current message
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
                            // Add extra config fields as optional
                            jeopardyCategories: { type: Type.INTEGER },
                            jeopardyCategoryNames: { type: Type.ARRAY, items: { type: Type.STRING } },
                            pubQuizRoundsCount: { type: Type.INTEGER },
                            pubQuizRoundNames: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["type", "title", "topic"]
                    }
                },
                required: ["message"]
            }
        }
    });

    const text = response.text;
    if (!text) return { message: "I'm having trouble connecting. Please try again." };
    
    return JSON.parse(cleanJson(text));
};

export const chatWithAI = async (message: string, history: string[]): Promise<string> => {
    // Legacy chat function - kept for compatibility if used elsewhere
    // In a real refactor, this might be removed or merged
    return "This feature is being upgraded.";
};

export const generateBlogPost = async (title: string, subtitle: string): Promise<string> => {
  try {
      const ai = getClient();
      const prompt = `
        Write a comprehensive, engaging blog post for teachers.
        Title: "${title}"
        Subtitle: "${subtitle}"
        Target Audience: Teachers and Educators.
        Tone: Professional, inspiring, and helpful.
        Length: 500 words.
        Format: HTML (use <h2>, <p>, <ul>, <li>). 
        IMPORTANT: Return ONLY the raw HTML content. Do not include markdown code blocks (like \`\`\`html). Do not include <html> or <body> tags.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      
      let text = response.text || '';
      text = text.replace(/```html/g, '').replace(/```/g, '');
      return text;
  } catch (error) {
      console.error("Error generating blog post:", error);
      return "<p>Unable to generate article content. Please ensure you have a local API key for this feature or disable External API mode.</p>";
  }
};
