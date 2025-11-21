
import { GoogleGenAI, Type } from "@google/genai";
import { GameConfig, GeneratedGame, WorksheetConfig, GeneratedWorksheet, GameType, GeneratedQuestion, JeopardyCategory } from "../types";

const apiKey = process.env.API_KEY || '';

// Helper to initialize client safely
const getClient = () => {
  if (!apiKey) {
    console.error("API Key is missing");
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateGameContent = async (config: GameConfig): Promise<GeneratedGame> => {
  const ai = getClient();
  
  const isJeopardy = config.type === GameType.JEOPARDY;

  const systemInstruction = `You are an expert educational content creator. 
  Create a structured game based on the following parameters. 
  Return ONLY valid JSON. 
  Ensure questions are appropriate for a classroom setting.
  FORMATTING RULE: When creating questions, separate the main instruction, the sentence context, and the options (if any) with double line breaks (\\n\\n) so they appear clearly separated on screen.`;

  let prompt = '';
  
  // Determine Title
  const gameTitle = config.title || `My ${config.type} Game`;

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
      For EACH category, create exactly ${rows} questions with increasing difficulty and point values (e.g. 100, 200, 300, 400, 500).
      Question Style: ${qTypeInstruction}.
      Strict Mode: ${config.strictMode ? "Answers must be phrased as questions (What is...)" : "Standard answers"}.
      
      Formatting for Multiple Choice: If specific options are needed, include them in the 'question' field separated by newlines (e.g. \\n\\nA) Option 1\\nB) Option 2). 
      Also, ensure the 'answer' field includes the letter AND the text (e.g. "B) The Correct Answer").
      
      Output JSON matching this structure:
      {
        "title": "${gameTitle}",
        "jeopardyBoard": [
          {
            "name": "${categories[0]}",
            "questions": [
              {
                "id": 1,
                "question": "The clue text (include options here if multiple choice)",
                "answer": "The correct response",
                "points": 100,
                "isBonus": false
              }
            ]
          }
        ]
      }
    `;
  } else {
    const qTypeInstruction = config.questionType === 'ai-decide' ? "Varied formats chosen by AI" : config.questionType;
    prompt = `
      Create a ${config.type} game titled "${gameTitle}" about "${config.topic}".
      Number of questions: ${config.questionCount}.
      Question Type: ${qTypeInstruction}.
      Timer per question: ${config.timerSeconds}s.
      Includes Bonus Questions: ${config.bonusQuestions}.
      Custom Instructions: ${config.customInstructions || "None"}.
      
      Output strictly JSON matching this schema structure:
      {
        "title": "${gameTitle}",
        "questions": [
          {
            "id": 1,
            "question": "Question text",
            "answer": "Answer text",
            "options": ["Option A", "Option B", "Option C", "Option D"], // Only if multiple choice
            "points": 10,
            "isBonus": false,
            "category": "History" 
          }
        ]
      }
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const data = JSON.parse(text);
    
    // --- POST PROCESSING FOR HIDDEN BONUSES (Jeopardy Only) ---
    if (isJeopardy && config.hiddenBonuses && data.jeopardyBoard) {
        const board = data.jeopardyBoard as JeopardyCategory[];
        const flatCoords: {c: number, q: number}[] = [];
        
        // Gather all coordinates
        board.forEach((cat, cIdx) => {
            cat.questions.forEach((_, qIdx) => {
                flatCoords.push({ c: cIdx, q: qIdx });
            });
        });

        // Shuffle coordinates
        for (let i = flatCoords.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [flatCoords[i], flatCoords[j]] = [flatCoords[j], flatCoords[i]];
        }

        // Select random spots for bonuses (e.g., 10% of tiles or min 3)
        const bonusCount = Math.max(3, Math.floor(flatCoords.length * 0.1));
        const selectedCoords = flatCoords.slice(0, bonusCount);
        const bonusTypes = ['double', 'bust', 'steal', 'double']; // Weighted types

        selectedCoords.forEach((coord, i) => {
            const type = bonusTypes[i % bonusTypes.length] as 'double' | 'bust' | 'steal';
            const q = board[coord.c].questions[coord.q];
            
            q.bonusType = type;
            q.isBonus = true;
            
            // Rewrite text to describe bonus (for display after reveal)
            if (type === 'double') {
                q.question = "DOUBLE POINTS!";
                q.answer = "You gain 2x the value of this tile.";
            } else if (type === 'bust') {
                q.question = "OH NO! POINT LOSS";
                q.answer = "You lose the value of this tile.";
            } else if (type === 'steal') {
                q.question = "STEAL!";
                q.answer = "Steal this tile's value from the leading team.";
            }
        });
    }

    return {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      title: data.title || config.title,
      config: config,
      questions: data.questions || [],
      jeopardyBoard: data.jeopardyBoard
    };
  } catch (error) {
    console.error("Error generating game:", error);
    throw error;
  }
};

export const generateWorksheetContent = async (config: WorksheetConfig): Promise<GeneratedWorksheet> => {
  const ai = getClient();
  
  const systemInstruction = `You are an expert teacher creating professional worksheets for printing.
  Generate the 'content' as a complete, well-structured HTML string.
  
  Formatting Rules:
  1. Use a clear, 100% width table for the header (Name, Date, Score).
  2. Use <h3> or <h4> for section headings.
  3. For 'wordsearch', create a grid using a table with monospace font, centered text, and borders.
  4. For 'matching', use a 2-column layout.
  5. Use inline CSS styles to ensure it looks good when printed (black text, clear borders, ample padding).
  6. IMPORTANT: Put the Answer Key at the very bottom. Wrap the Answer Key section in a div with class "page-break" so it prints on a new page.
  7. Do not include <html>, <head>, or <body> tags, just the inner content for the worksheet container.
  `;

  const prompt = `
    Create a "${config.type}" worksheet.
    Topic: ${config.topic}.
    Grade Level: ${config.gradeLevel}.
    Additional Instructions: ${config.customInstructions || "None"}.
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
            title: { type: Type.STRING, description: "Title of the worksheet" },
            content: { type: Type.STRING, description: "HTML content of the worksheet including answer key" },
            type: { type: Type.STRING, description: "The type of worksheet generated" }
          },
          required: ["title", "content", "type"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as GeneratedWorksheet;
  } catch (error) {
    console.error("Error generating worksheet:", error);
    throw error;
  }
};

export const chatWithAI = async (message: string, history: string[]): Promise<string> => {
    const ai = getClient();
    // Simple one-off for now, in a real app we'd maintain chat session
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Context: You are a helpful teaching assistant AI on "The Teachers' Room" website.
        Previous context: ${history.join('\n')}
        User: ${message}`
    });
    return response.text || "I'm sorry, I couldn't process that.";
};
