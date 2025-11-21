
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
      Includes Bonus Questions: false.
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
  
  STRICT STYLING RULES (Do NOT use inline CSS. Use these specific class names):
  1. Header: Wrap the name/date/score block in <div class="ws-header">...</div>. Inside, use <div class="ws-field">Name: ____________</div>.
  2. Title: Use <h1 class="ws-title">Title Here</h1>.
  3. Instructions: Use <p class="ws-instructions">...</p>. Keep instructions concise to save space.
  4. Sections: Wrap distinct parts in <div class="ws-section"> with <h3 class="ws-section-title">Section Title</h3>.
  5. Tables: For grids or matching, use <table class="ws-table">.
  6. Answer Key: Wrap the ENTIRE answer key section in <div class="ws-answer-key">. Inside, use <h3>Answer Key</h3> and then lists.
  
  CONTENT LAYOUT RULES:
  - Fit the QUESTIONS and ACTIVITIES on the first page if possible.
  - The ANSWER KEY is strictly on a separate page (enforced by CSS), so you do not need to fit it on the first page.
  - For multiple choice or short answers, use a 2-column layout where possible by wrapping them in a div with style="columns: 2; gap: 2rem;".
  - Do not include <html>, <head>, or <body> tags, just the inner content.
  `;

  const prompt = `
    Create a "${config.type}" worksheet.
    Topic: ${config.topic}.
    Grade Level: ${config.gradeLevel}.
    Additional Instructions: ${config.customInstructions || "None"}.
    
    Output strictly valid JSON matching this structure:
    {
      "title": "The worksheet title",
      "content": "The HTML string of the worksheet",
      "type": "${config.type}"
    }
  `;

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
    
    const result = JSON.parse(text) as GeneratedWorksheet;
    return {
        ...result,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        config: config
    };
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

export const generateBlogPost = async (title: string, subtitle: string): Promise<string> => {
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

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });
    
    let text = response.text || '';
    // Cleanup markdown if present
    text = text.replace(/```html/g, '').replace(/```/g, '');
    return text;
  } catch (error) {
    console.error("Error generating blog post:", error);
    return "<p>Unable to generate article content at this time.</p>";
  }
};
