# Optional game web search

The AI configure screen has a Web search checkbox directly below AI Instructions. New configurations default to false. The Boolean travels in GameConfig to /api/generate for game generation and Stop the Fire category generation. No database migration is required; evidence is stored inside the existing game config JSON.

With the OpenAI provider, the Responses request uses tools: [{ type: "web_search", external_web_access: true }], tool_choice: "required", and include: ["web_search_call.action.sources"]. The existing configured model and strict game JSON schema are retained. Search is not enabled for covers, images, or other actions. Without explicit Boolean true, no tools are added.

The server requires a completed search and usable HTTP(S) source URLs. An error is surfaced instead of falling back to unsearched generation. Gemini and the legacy client fallback do not silently ignore the setting. Retry attempts also require search. Only the accepted response's source evidence is kept; client-supplied or previous evidence is discarded.

Instructions provide today's UTC date, require authoritative sources, honour requested periods, prohibit silently replacing current statistics with an older season, and distinguish illustrative survey points from real statistics. Search improves grounding; it does not guarantee that every generated fact is correct.

Source links and the search date appear in game preview and editor. These are references returned by the search service, not model-invented URLs. Searching again requires regeneration; playing a saved game does not perform another search.

Official reference: https://developers.openai.com/api/docs/guides/tools-web-search
Search has provider tool charges in addition to model tokens. The existing token-based usage estimate does not include these tool charges.

Validation:
- node scripts/test-game-web-search.mjs: search omitted by default/false, explicit true requires live search, strict structured output preserved, unsafe source links discarded, missing search rejected.
- node scripts/test-game-web-search.mjs --live: uses .env.local credentials without printing them; verified gpt-6-luna with a small Premier League question and official sources.
- Browser check: configure checkbox defaults off; both true and false reach the generation request; mobile layout checked at 390px. Browser generation requests were intercepted; no game saved.
- npm run build passed. Type checking still reports unrelated pre-existing repository errors, with none in the changed files.

Rejected marketing assets remain deferred for cleanup until the remaining game pages are finished, as requested.
