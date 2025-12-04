import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GameConfig, GeneratedGame, WorksheetConfig, GeneratedWorksheet, GameType, DevSettings } from "../types";

const apiKey = process.env.API_KEY || '';

// Helper to initialize client safely
const getClient = () => {
  if (!apiKey) {
    console.error("API Key is missing in client environment");
    throw new Error("API Key is missing. If you are using the External API, check your Profile settings.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to get Dev Settings
const getDevSettings = (): DevSettings => {
    try {
        const settings = localStorage.getItem('ttr_dev_settings');
        return settings ? JSON.parse(settings) : { useExternalApi: false, externalEndpoint: '' };
    } catch (e) {
        return { useExternalApi: false, externalEndpoint: '' };
    }
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
  const settings = getDevSettings();

  // --- EXTERNAL API PATH ---
  if (settings.useExternalApi) {
      if (!settings.externalEndpoint) {
          throw new Error("External API mode is enabled, but no Endpoint URL is configured in Profile.");
      }

      console.log("Routing to External API:", settings.externalEndpoint);
      try {
          const response = await fetch(settings.externalEndpoint, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  ...(settings.apiSecret ? { 'Authorization': `Bearer ${settings.apiSecret}` } : {})
              },
              body: JSON.stringify({
                  action: 'game',
                  config: config
              })
          });

          if (!response.ok) {
              const errText = await response.text();
              let errMsg = `External API Error: ${response.status} ${response.statusText}`;
              try {
                  const jsonErr = JSON.parse(errText);
                  if (jsonErr.error) errMsg = `Server Error: ${jsonErr.error}`;
              } catch(e) { /* ignore */ }
              
              console.error(errMsg);
              throw new Error(errMsg);
          }

          const data = await response.json();
          // Ensure ID exists
          if (!data.id) data.id = generateUUID();
          if (!data.createdAt) data.createdAt = new Date().toISOString();
          
          return data as GeneratedGame;
      } catch (error) {
          console.error("External API Failed", error);
          throw error;
      }
  }

  // --- INTERNAL GOOGLE SDK PATH ---
  const ai = getClient();
  
  const isJeopardy = config.type === GameType.JEOPARDY;
  const isPubQuiz = config.type === GameType.PUB_QUIZ;
  const isDarts = config.type === GameType.DARTS;

  const systemInstruction = `You are an expert educational content creator. 
  Create a structured game based on the following parameters. 
  
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
      bonusType: { type: Type.STRING }
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

  } else {
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
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
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
  const settings = getDevSettings();

  // --- EXTERNAL API PATH ---
  if (settings.useExternalApi) {
      if (!settings.externalEndpoint) throw new Error("External API enabled but no Endpoint URL provided.");
      
      try {
          const response = await fetch(settings.externalEndpoint, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  ...(settings.apiSecret ? { 'Authorization': `Bearer ${settings.apiSecret}` } : {})
              },
              body: JSON.stringify({
                  action: 'worksheet',
                  config: config
              })
          });

          if (!response.ok) {
              const errText = await response.text();
              throw new Error(`External API Error: ${response.status} ${errText}`);
          }

          const data = await response.json();
          if (!data.id) data.id = generateUUID();
          
          return data as GeneratedWorksheet;
      } catch (error) {
          console.error("External API Failed", error);
          throw error;
      }
  }

  const ai = getClient();
  
  const systemInstruction = `You are an expert teacher creating professional worksheets for printing.
  Generate the 'content' as a complete, well-structured HTML string.
  
  STRICT STYLING RULES (Do NOT use inline CSS. Use these specific class names):
  1. Header: Wrap the name/date/score block in <div class="ws-header">...</div>. Inside, use <div class="ws-field">Name: ____________</div>.
  2. Title: Use <h1 class="ws-title">Title Here</h1>.
  3. Instructions: Use <p class="ws-instructions">...</p>. Keep instructions concise.
  4. Sections: Wrap distinct activities in <div class="ws-section"> with <h3 class="ws-section-title">Section Title</h3>.
  5. Tables: For grids or matching, use <table class="ws-table">.
  6. Answer Key: Wrap the ENTIRE answer key section in <div class="ws-answer-key">. Inside, use <h3>Answer Key</h3> and then lists.
  
  LAYOUT NOTE: 
  The user has selected layout mode: ${config.layout || 'single'}. 
  - If 'columns', avoid wide tables that might break in a narrow column.
  - The CSS handles the actual columns, just provide standard semantic HTML.
  
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

  const prompt = `
    Create a "${displayType}" worksheet.
    Topic: ${config.topic}.
    Grade Level: ${config.gradeLevel}.
    Additional Instructions: ${config.customInstructions || "None"}.
    
    Included Activities (Create them in this specific order):
    ${activityPrompts}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
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

export const chatWithAI = async (message: string, history: string[]): Promise<string> => {
    const settings = getDevSettings();

    // --- EXTERNAL API PATH ---
    if (settings.useExternalApi) {
        if (!settings.externalEndpoint) return "Error: External API enabled but no endpoint configured.";
        try {
            const response = await fetch(settings.externalEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(settings.apiSecret ? { 'Authorization': `Bearer ${settings.apiSecret}` } : {})
                },
                body: JSON.stringify({
                    action: 'chat',
                    message,
                    history
                })
            });

            if (!response.ok) throw new Error(`External API Error: ${response.statusText}`);
            const data = await response.json();
            return data.text || "No response";
        } catch (error) {
            return "Error contacting external AI service.";
        }
    }

    const ai = getClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Context: You are a helpful teaching assistant AI on "The Teachers' Room" website.
        Previous context: ${history.join('\n')}
        User: ${message}`
    });
    return response.text || "I'm sorry, I couldn't process that.";
};

export const generateBlogPost = async (title: string, subtitle: string): Promise<string> => {
  // Always use local client for this demo feature, or implement external if needed
  // For safety in this hybrid mode, we can try client first
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
