import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

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

export default async function handler(req: Request) {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body = await req.json();
    const { action, config, message, history } = body;

    // 2. Handle GAME Generation
    if (action === 'game') {
      const isJeopardy = config.type === 'Jeopardy';
      const isPubQuiz = config.type === 'Pub Quiz';
      const gameTitle = config.title || `My ${config.type} Game`;
      
      let systemInstruction = `You are an expert educational content creator. 
      Create a structured game based on the following parameters. 
      Return ONLY valid JSON. Do not use Markdown code blocks.
      Ensure questions are appropriate for a classroom setting.`;

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
                "isBonus": false
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
      data.id = crypto.randomUUID();
      data.createdAt = new Date().toISOString();
      data.config = config; // Pass config back

      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 3. Handle WORKSHEET Generation
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
       
       return new Response(JSON.stringify({
           ...result,
           id: crypto.randomUUID(),
           createdAt: new Date().toISOString(),
           config: config
       }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 4. Handle CHAT
    if (action === 'chat') {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Context: You are a helpful teaching assistant AI.
            Previous context: ${history.join('\n')}
            User: ${message}`
        });
        
        return new Response(JSON.stringify({ text: response.text }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });

  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}