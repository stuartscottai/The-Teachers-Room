<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1_wScMm1K3obxR1cj5TveAzh3syvzOUtz

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Create an `.env.local` file in the project root (or update the existing one) and add:
   ```
   # Point localhost at the hosted Vercel API so dev generations are logged too
   VITE_EXTERNAL_API_URL=https://the-teachers-room.vercel.app/api/generate
   ```
3. Run the app:
   `npm run dev`

## Required Server Env Vars

Set these in Vercel for authenticated server-side generation and usage logging:

```
GEMINI_API_KEY=your_gemini_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```
