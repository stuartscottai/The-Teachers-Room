import type { GameCoverImage, GeneratedGame } from '../types';
import type { StockImageResult } from '../services/stockImageService';
import { COVER_SELECTION_VERSION } from './gameCoverBrief';

const gameHash = (game: GeneratedGame) => Array.from(`${game.id || ''}:${game.title}`)
  .reduce((n, char) => (Math.imul(n, 31) + char.charCodeAt(0)) >>> 0, 0);

// Short visual concepts work better than lesson names or complete quiz titles.
const subjects: Array<[RegExp, string]> = [
  [/\b(run|running|athletics|racing)\b/i, 'running track'],
  [/\b(football|premier league|soccer)\b/i, 'football stadium'],
  [/\b(food|cooking|fruit|vegetables|restaurant)\b/i, 'colourful food'],
  [/\b(animal|animals|wildlife|pets)\b/i, 'wildlife animals'],
  [/\b(travel|holiday|holidays|tourism|vacation)\b/i, 'travel landscape'],
  [/\b(environment|climate|ecology|recycling)\b/i, 'green forest'],
  [/\b(space|planet|planets|astronomy)\b/i, 'space planets'],
  [/\b(ocean|sea|marine)\b/i, 'ocean underwater'],
  [/\b(sport|sports|exercise|fitness)\b/i, 'sports equipment'],
  [/\b(music|musical|instruments)\b/i, 'musical instruments'],
  [/\b(science|chemistry|physics|biology)\b/i, 'science laboratory'],
  [/\b(history|ancient|civilisation|civilization)\b/i, 'ancient architecture'],
  [/\b(geography|countries|capitals|world)\b/i, 'world globe'],
  [/\b(math|maths|mathematics|numbers|arithmetic)\b/i, 'mathematics numbers'],
  [/\b(christmas|reyes)\b/i, 'christmas decorations'],
  [/\b(halloween)\b/i, 'halloween pumpkins'],
  [/\b(easter)\b/i, 'easter eggs'],
  [/\b(fallas|festival|festivals|parties|celebration)\b/i, 'festival fireworks'],
  [/\b(hospital|medical|health|healthy|medicine)\b/i, 'medical equipment'],
  [/\b(house|houses|homes|home|buildings)\b/i, 'colourful houses'],
  [/\b(film|films|movies|cinema)\b/i, 'cinema popcorn'],
  [/\b(weather|seasons)\b/i, 'weather clouds'],
  [/\b(chocolate)\b/i, 'chocolate'],
];

export const getGameCoverQuery = (game: GeneratedGame): string => {
  const heading = `${game.title || ''} ${game.config.topic || ''}`;
  const match = subjects.find(([pattern]) => pattern.test(game.title || ''))
    || subjects.find(([pattern]) => pattern.test(game.config.topic || ''));
  if (match) return match[1];
  const questions = [...(game.questions || []),
    ...(game.jeopardyBoard || []).flatMap(group => group.questions || []),
    ...(game.pubQuizRounds || []).flatMap(group => group.questions || [])];
  // A recurring subject is more representative than a single stray question.
  const recurring = subjects.map(([pattern, query]) => ({ query,
    count: questions.slice(0, 24).filter(q => pattern.test(`${q.question} ${q.category || ''}`)).length,
  })).sort((a, b) => b.count - a.count)[0];
  if (recurring && recurring.count >= Math.max(2, Math.ceil(Math.min(questions.length, 24) / 3))) return recurring.query;
  if (/\b(conditional|conditionals|wish|choices)\b/i.test(heading)) return 'forked forest path';
  if (/\b(future|plans|ambitions)\b/i.test(heading)) return 'journey horizon';
  if (/\b(comparatives|superlatives|comparison)\b/i.test(heading)) return 'different size stones';
  if (/\b(grammar|vocabulary|english|reading|literature|language|super ?minds?|b2|b1|a2|a1|c1|c2|general knowledge|revision|difficulty|various|gmrc)\b/i.test(heading)) {
    const metaphors = ['crossroads signpost', 'colorful conversation', 'jigsaw puzzle', 'city market', 'travel compass', 'colorful hot air balloons'];
    return metaphors[gameHash(game) % metaphors.length];
  }
  const topic = String(game.config.topic || '').trim();
  const text = topic && !/^(general|english|none|n\/?a|-)$/i.test(topic) ? topic : game.title;
  const keywords = String(text || '').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/)
    .filter(word => word.length > 2 && !/^(quiz|game|games|unit|lesson|review|test|trivia|the|and|for|with|use)$/i.test(word));
  return keywords.slice(0, 3).join(' ') || 'creative learning';
};

// Use a card-sized image, keeping its natural ratio so the creator can reposition it.
const coverImageUrl = (value: string): string => {
  try {
    const outer = new URL(value, 'https://local.invalid');
    const nested = outer.pathname === '/api/stock-image-proxy' ? outer.searchParams.get('url') : null;
    const source = new URL(nested || value);
    if (source.hostname === 'images.pexels.com') {
      source.searchParams.set('w', '960'); source.searchParams.delete('h');
      if (nested) { outer.searchParams.set('url', source.toString()); return `${outer.pathname}${outer.search}`; }
      return source.toString();
    }
  } catch { /* Other provider URLs are already suitable. */ }
  return value;
};

export const stockImageToCover = (item: StockImageResult, query: string, selection: GameCoverImage['selection']): GameCoverImage => ({
  source: 'stock', stockId: item.id, url: coverImageUrl(item.url), thumbUrl: item.thumbUrl,
  alt: item.alt || query, provider: item.provider, photographer: item.photographer,
  sourcePageUrl: item.sourcePageUrl, searchQuery: query, selection, positionX: 50, positionY: 50,
});

export const selectGameCover = async (game: GeneratedGame,
  search: (query: string) => Promise<{ items: StockImageResult[] }>,
  options: { queries?: string[]; theme?: string; usageCounts?: ReadonlyMap<string, number> } = {},
): Promise<GameCoverImage | undefined> => {
  if (game.config.coverImage) return game.config.coverImage;
  const queries = [...new Set([...(options.queries || []), getGameCoverQuery(game)])].filter(Boolean).slice(0, 4);
  const landscape = (item: StockImageResult) => item.url && (!item.width || !item.height || item.width >= item.height);
  const usedCandidates: Array<{ item: StockImageResult; query: string }> = [];
  for (const query of queries) {
    const { items } = await search(query);
    const runningTheme = /\b(run|running|athletics|runners?|sprint)\b/i.test(`${game.title} ${options.theme || ''} ${query}`);
    const candidatesInFrame = items.filter(landscape).filter(item => !runningTheme || !/\b(moto\w*|cars?|bikes?|bicycl\w*|cycl\w*|velodrome|formula|nascar|rally)\b/i.test(`${item.alt} ${item.tags || ''}`));
    // Search providers already rank their results. Refine using descriptive
    // nouns without demanding a literal match for every adjective in an AI query.
    const tokens = query.toLowerCase().split(/\s+/).filter(word => word.length > 2 && !/^(colorful|colourful|bright|beautiful|sunny|modern|lifestyle|neighborhood|panorama|scene|landscape)$/.test(word))
      .map(word => word.replace(/s$/, ''));
    const scored = candidatesInFrame.map(item => ({ item, score: tokens.reduce((score, token) =>
      score + (`${item.alt} ${item.tags || ''}`.toLowerCase().includes(token) ? 1 : 0), 0) }));
    const bestScore = Math.max(0, ...scored.map(entry => entry.score));
    const candidates = scored.filter(entry => bestScore === 0 || entry.score >= Math.max(1, bestScore - 1)).map(entry => entry.item);
    const photos = candidates.filter(item => !item.kind || item.kind === 'photo');
    const unused = photos.filter(item => !options.usageCounts?.get(item.id));
    if (unused.length) {
      const item = unused[gameHash(game) % unused.length];
      return { ...stockImageToCover(item, query, 'automatic'), selectionVersion: COVER_SELECTION_VERSION, visualTheme: options.theme };
    }
    usedCandidates.push(...candidates.map(item => ({ item, query })));
  }
  // Relevant reuse is preferable to an unrelated photo when all candidates are used.
  if (!usedCandidates.length) return undefined;
  const photos = usedCandidates.filter(({ item }) => !item.kind || item.kind === 'photo');
  const relevant = photos.length ? photos : usedCandidates;
  const minimum = Math.min(...relevant.map(({ item }) => options.usageCounts?.get(item.id) || 0));
  const leastUsed = relevant.filter(({ item }) => (options.usageCounts?.get(item.id) || 0) === minimum);
  const chosen = leastUsed[gameHash(game) % leastUsed.length];
  return { ...stockImageToCover(chosen.item, chosen.query, 'automatic'), selectionVersion: COVER_SELECTION_VERSION, visualTheme: options.theme };
};
