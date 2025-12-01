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
      
      let systemInstruction = `You are an expert educational content creator. 
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
        prompt = `
          Create a Jeopardy game with the title "${gameTitle}".
          Categories: ${JSON.stringify(categories)}.
          For EACH category, create exactly ${rows} questions with increasing difficulty (100-${rows * 100}).
          Question Style: ${config.questionType}.
          Strict Mode: ${config.strictMode}.
          Custom Instructions: ${config.customInstructions || "None"}.
          
          Output JSON matching:
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
                    "options": ["Opt1", "Opt2", "Opt3"],
                    "points": 100,
                    "isBonus": false
                  }
                ]
              }
            ]
          }
        `;
      } else if (isPubQuiz) {
        prompt = `
          Create a Pub Quiz game titled "${gameTitle}".
          Rounds: ${config.pubQuizRoundsCount}.
          Round Names: ${JSON.stringify(config.pubQuizRoundNames)}.
          Questions per round: ${config.pubQuizQuestionsPerRound}.
          Question Style: ${config.questionType}.
          Custom Instructions: ${config.customInstructions || "None"}.
          
          Output JSON matching:
          {
            "title": "${gameTitle}",
            "pubQuizRounds": [
              {
                "name": "Round Name",
                "questions": [
                  { "id": 1, "question": "...", "answer": "...", "options": [], "points": 1, "isBonus": false }
                ]
              }
            ]
          }
        `;
      } else {
        // Standard Game
        prompt = `
          Create a ${config.type} game titled "${gameTitle}" about "${config.topic}".
          Questions: ${config.questionCount}.
          Type: ${config.questionType}.
          Points: ${config.pointsMode}.
          Instructions: ${config.customInstructions || "None"}.
          
          Output JSON matching:
          {
            "title": "${gameTitle}",
            "questions": [
              {
                "id": 1,
                "question": "Question...",
                "answer": "Answer...",
                "options": ["A", "B", "C", "D"],
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
        return `Activity ${index + 1}: ${act.type} (${act.count} items). ${act.contextType || ''}`;
       }).join('\n');

       const prompt = `
        Create a worksheet.
        Topic: ${config.topic}.
        Grade: ${config.gradeLevel}.
        Instructions: ${config.customInstructions}.
        Layout: ${config.layout}.
        
        Activities:
        ${activityPrompts}
       `;

       const systemInstruction = `You are an expert teacher. Generate HTML content for a worksheet.
       Do NOT include <html> or <body> tags. Use classes: .ws-header, .ws-title, .ws-section, .ws-table, .ws-answer-key.`;

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
            contents: `Context: You are a helpful teaching assistant AI.
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