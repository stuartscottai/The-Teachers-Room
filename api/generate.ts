
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
      const gameTitle = config.title || `My ${config.type} Game`;
      
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
      
      // Ensure ID exists for database
      data.id = randomUUID();
      data.createdAt = new Date().toISOString();
      data.config = config; // Pass config back

      return res.status(200).json(data);
    }

    // 4. Handle WORKSHEET Generation
    if (action === 'worksheet') {
       const activityPrompts = config.activities.map((act: any, index: number) => {
        let details = `Activity ${index + 1}: ${act.type} (${act.count} items).`;
        if (act.type === 'multiple-choice' && act.options?.mcCount) {
            details += ` Provide exactly ${act.options.mcCount} options per question.`;
        }
        if (act.contextType === 'text') {
            details += ` FORMAT: Embedded within a single coherent story/text.`;
        } else if (act.contextType === 'sentences') {
            details += ` FORMAT: Separate numbered sentences.`;
        }
        return details;
       }).join('\n');

       let prompt = `
        Create a worksheet.
        Topic: ${config.topic}.
        Grade: ${config.gradeLevel}.
        Instructions: ${config.customInstructions || "None"}.
        Layout: ${config.layout || 'single'}.
        
        Activities (Create in this order):
        ${activityPrompts}
       `;

       const systemInstruction = `You are an expert teacher creating professional worksheets for printing.
       Generate the 'content' as a complete, well-structured HTML string.
       
       If the user provides source files (images/PDFs), analyze them thoroughly and base the worksheet content/questions specifically on that material.
       
       STRICT STYLING RULES:
       1. Header: <div class="ws-header"><div class="ws-field">Name: ____________</div></div>
       2. Title: <h1 class="ws-title">Title Here</h1>
       3. Instructions: <p class="ws-instructions">...</p>
       4. Sections: <div class="ws-section"><h3 class="ws-section-title">...</h3></div>
       5. Tables: <table class="ws-table">
       6. Answer Key: <div class="ws-answer-key"><h3>Answer Key</h3>...</div>
       
       Do NOT include <html> or <body> tags.`;

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
                    content: { type: Type.STRING },
                    type: { type: Type.STRING }
                },
                required: ["title", "content", "type"]
            }
        }
       });

       const text = response.text;
       const result = JSON.parse(cleanJson(text || "{}"));
       
       return res.status(200).json({
           ...result,
           id: randomUUID(),
           createdAt: new Date().toISOString(),
           config: config
       });
    }

    // 5. Handle WIZARD CHAT (Structured JSON Output)
    if (action === 'chat_wizard') {
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
        - If the user's request is vague (e.g. "I want a game"), ask 1-2 clarifying questions.
        - If the user gives enough info, recommend a specific game type and explain why briefly.
        - When you make a recommendation, populate the 'suggestion' field in the JSON response with a valid GameConfig.
        - If no recommendation is ready yet, leave 'suggestion' null.
        
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
        const data = JSON.parse(cleanJson(text || "{}"));
        return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error: any) {
    console.error("Generate API Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
