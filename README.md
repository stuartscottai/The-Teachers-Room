<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy The Teachers' Room

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1_wScMm1K3obxR1cj5TveAzh3syvzOUtz

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Create an `.env.local` file in the project root (or update the existing one). Choose one provider with `AI_PROVIDER` and keep both keys available so you can switch easily:
   ```
   AI_PROVIDER=openai
   OPENAI_API_KEY=your_openai_key
   OPENAI_MODEL=gpt-5.6-luna

   GEMINI_API_KEY=your_gemini_key
   GEMINI_MODEL=gemini-2.5-flash

   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   VITE_APP_URL=https://www.theteachersroom.app
   ```
3. Run the full local app, including the local `/api` functions:
   `npm run dev:full`

After changing `AI_PROVIDER`, stop and restart `npm run dev:full`. Use `AI_PROVIDER=gemini` to test Gemini or `AI_PROVIDER=openai` to test GPT-5.6 Luna. API keys do not use the `VITE_` prefix because they must remain private on the server.

`npm run dev` still starts the visual front end only. AI generation requires `npm run dev:full`.

## Required Server Env Vars

Set these in Vercel for authenticated server-side generation and usage logging:

```
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
AI_PROVIDER=gemini
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```
