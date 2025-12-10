
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GameConfig, GeneratedGame, WorksheetConfig, GeneratedWorksheet, GameType } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
// Always use current origin for API calls to avoid CORS issues with Vercel preview deployments
const DEFAULT_EXTERNAL_API = '/api/generate';
const externalApiUrl = import.meta.env.VITE_EXTERNAL_API_URL || DEFAULT_EXTERNAL_API;

const tryExternalApi = async <T>(body: Record<string, any>): Promise<T | null> => {
  if (!externalApiUrl) return null;
  try {
      const response = await fetch(externalApiUrl, {
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
    const roundNames = config.pubQuizRoundNames || ["General Knowledge", "Music", "Science"];
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
      // Add reserve buffer (+10) to ensure rounds can complete if repeats are needed
      const requestedCount = (config.questionCount || 15) + 10;
      
      prompt = `
      Create a Darts game titled "${gameTitle}" about "${config.topic}".
      Generate a large pool of ${requestedCount} unique questions.
      CRITICAL: You MUST categorize them by difficulty.
      - 33% labeled 'easy' (Simple facts/vocab)
      - 33% labeled 'medium' (Application/sentences)
      - 33% labeled 'hard' (Complex/Analysis)
      
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
    
    // Points Logic
    let pointsInstruction = "Assign 100 points to every question.";
    if (config.pointsMode === 'ai-random') {
        pointsInstruction = "Assign random point values between 5, 10, 15, 20, 25, 30, 35, 40, 45, 50 based on the difficulty of the question.";
    }

    prompt = `
      Create a ${config.type} game titled "${gameTitle}" about "${config.topic}".
      Number of questions: ${config.questionCount}.
      Question Type: ${qTypeInstruction}.
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

export const generateWorksheetContent = async (config: WorksheetConfig): Promise<GeneratedWorksheet> => {
  const external = await tryExternalApi<GeneratedWorksheet>({ action: 'worksheet', config });
  if (external) return external;

  const ai = getClient();
  
  const systemInstruction = `You are an expert teacher creating professional worksheets for printing.
  Generate the 'content' as a complete, well-structured HTML string.
  
  If the user provides source files (images/PDFs), analyze them thoroughly and base the worksheet content/questions specifically on that material.
  
  STRICT STYLING RULES (Do NOT use inline CSS. Use these specific class names):
  1. Header: Wrap the top block in <div class="ws-header">...</div>. 
     - Use justify-content-between to separate Name and Date.
     - Inside, put Name on the left: <div class="ws-field">Name: ____________</div>
     - Inside, put Date on the right: <div class="ws-field">Date: ____________</div>
     - CRITICAL: Do NOT add an underline (<u> tag or CSS style) to the words "Name" and "Date" themselves. The dotted lines provided are sufficient.
     - Do NOT include a Score field unless explicitly requested.
  2. Title: Use <h1 class="ws-title">Title Here</h1>.
  3. Instructions (Main): Use <p class="ws-instructions">...</p> ONLY for the main worksheet intro/description (Centered).
  4. Sections: Wrap distinct activities in <div class="ws-section">.
     - Start with <h3 class="ws-section-title">Section Title</h3>.
     - Follow immediately with <p>Activity specific instructions...</p>. Do NOT use the 'ws-instructions' class here; use a standard paragraph (Left Aligned).
  5. Tables: For grids or matching, use <table class="ws-table">.
  6. Answer Key: Wrap the ENTIRE answer key section in <div class="ws-answer-key">. Inside, use <h3>Answer Key</h3> and then lists.
  
  LAYOUT NOTE: 
  The user has selected layout mode: ${config.layout || 'single'}. 
  - If 'columns', avoid wide tables that might break in a narrow column.
  - The CSS handles the actual columns, just provide standard semantic HTML.
  
  PRIORITY OVERRIDE:
  If the user's "Additional Instructions" (provided below) specify custom header details (e.g., "Add a class period field", "No header", "Put Title on left"), YOU MUST FOLLOW THE USER'S INSTRUCTIONS instead of the default header rules above.

  CONTENT LAYOUT RULES:
  - Follow the EXACT ORDER of activities provided in the prompt.
  - The ANSWER KEY is strictly on a separate page (enforced by CSS).
  - Do not include <html>, <head>, or <body> tags, just the inner content.
  `;

  // Construct specific activity instructions based on config.activities
  const activityPrompts = config.activities.map((act, index) => {
    let details = `Activity ${index + 1} (ORDER ${index + 1}): ${act.type} - ${act.count} items.`;
    
    if (act.type === 'multiple-choice' && act.options?.mcCount) {
        details += ` Provide exactly ${act.options.mcCount} options per question.`;
    }
    if (act.type === 'word-formation') {
        details += ` Format: Sentence with gap ________ (ROOT).`;
    }
    if (act.type === 'open-ended') {
        details += ` Format: Question followed by 3-4 underlines or empty lines for students to write answers.`;
    }
    
    if (act.contextType === 'text') {
        details += ` FORMAT CONTEXT: Present these questions embedded within a single coherent story, narrative, or text passage.`;
    } else if (act.contextType === 'sentences') {
        details += ` FORMAT CONTEXT: Present these as separate, unrelated, numbered sentences.`;
    } else {
        details += ` Format: Standard layout for ${act.type}.`;
    }

    return details;
  }).join('\n');

  const displayType = config.activities.length > 1 
    ? "Mixed Activities" 
    : (config.activities[0]?.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || "Custom Worksheet");

  let prompt = `
    Create a "${displayType}" worksheet.
    Topic: ${config.topic}.
    Grade Level: ${config.gradeLevel}.
    Additional Instructions: ${config.customInstructions || "None"}.
    
    Included Activities (Create them in this specific order):
    ${activityPrompts}
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
            content: { type: Type.STRING },
            type: { type: Type.STRING }
          },
          required: ["title", "content", "type"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    // Clean and parse
    const result = JSON.parse(cleanJson(text)) as GeneratedWorksheet;
    return {
        ...result,
        id: generateUUID(),
        createdAt: new Date().toISOString(),
        config: config
    };
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
