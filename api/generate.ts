
import { GoogleGenAI, Type } from "@google/genai";
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
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
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
      const gameTitle = config.title || `My ${config.type} Game`;
      
      const systemInstruction = `You are an expert educational content creator. 
      Create a structured game based on the following parameters. 
      Return ONLY valid JSON. Do not use Markdown code blocks.
      Ensure questions are appropriate for a classroom setting.
      FORMATTING RULE: When creating questions, separate the main instruction, the sentence context, and the options (if any) with double line breaks (\\n\\n) so they appear clearly separated on screen.
      
      CRITICAL FOR MULTIPLE CHOICE:
      1. You MUST provide an array of strings in the 'options' field (e.g. ["Apple", "Banana"]).
      2. **IMPORTANT**: Do NOT include the options list in the 'question' text itself. The question text should ONLY contain the question stem. The UI will generate the buttons automatically from the 'options' array.
      3. Do NOT label options with A), B) in the 'options' array. Just provide the raw text.`;

      let prompt = '';

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
          
          Output JSON matching this structure:
          {
            "title": "${gameTitle}",
            "jeopardyBoard": [
              {
                "name": "Category Name",
                "questions": [
                  {
                    "id": 1,
                    "question": "Clue text",
                    "answer": "Answer text",
                    "options": ["Opt1", "Opt2", "Opt3"], // REQUIRED if multiple choice
                    "points": 100,
                    "isBonus": false
                  }
                ]
              }
            ]
          }
        `;
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
          
          Output JSON matching this structure:
          {
            "title": "${gameTitle}",
            "pubQuizRounds": [
              {
                "name": "Round Name",
                "questions": [
                  { 
                    "id": 1, 
                    "question": "Question text", 
                    "answer": "Answer text", 
                    "options": ["Opt1", "Opt2"], // REQUIRED if multiple choice
                    "points": 1, 
                    "isBonus": false 
                  }
                ]
              }
            ]
          }
        `;
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
          
          Output JSON matching this structure:
          {
            "title": "${gameTitle}",
            "questions": [
              {
                "id": 1,
                "question": "Question text",
                "answer": "Answer text",
                "options": ["A", "B", "C", "D"], // REQUIRED if multiple choice
                "points": 10,
                "isBonus": false,
                "category": "General"
              }
            ]
          }
        `;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
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

       const prompt = `
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
       
       STRICT STYLING RULES:
       1. Header: <div class="ws-header"><div class="ws-field">Name: ____________</div></div>
       2. Title: <h1 class="ws-title">Title Here</h1>
       3. Instructions: <p class="ws-instructions">...</p>
       4. Sections: <div class="ws-section"><h3 class="ws-section-title">...</h3></div>
       5. Tables: <table class="ws-table">
       6. Answer Key: <div class="ws-answer-key"><h3>Answer Key</h3>...</div>
       
       Do NOT include <html> or <body> tags.`;

       const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
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

    // 5. Handle CHAT
    if (action === 'chat') {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Context: You are a helpful teaching assistant AI on "The Teachers' Room" website.
            Previous context: ${history.join('\n')}
            User: ${message}`
        });
        
        return res.status(200).json({ text: response.text });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error: any) {
    console.error("Generate API Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
