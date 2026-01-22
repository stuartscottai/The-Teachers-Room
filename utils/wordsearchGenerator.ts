const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

type WordEntry = {
  label: string;
  key: string;
  index: number;
};

const sanitizeWord = (value: string): string => value.replace(/[^A-Za-z]/g, '').toUpperCase();

const randomLetter = (): string => LETTERS[Math.floor(Math.random() * LETTERS.length)];

const directionsFor = (allowDiagonals: boolean) => {
  const base = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: -1, dc: 0 },
  ];
  if (!allowDiagonals) return base;
  return [
    ...base,
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
    { dr: -1, dc: 1 },
    { dr: -1, dc: -1 },
  ];
};

const canPlace = (
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dr: number,
  dc: number
) => {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  for (let i = 0; i < word.length; i += 1) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (r < 0 || c < 0 || r >= rows || c >= cols) return false;
    const cell = grid[r][c];
    if (cell && cell !== word[i]) return false;
  }
  return true;
};

const placeWord = (
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dr: number,
  dc: number
) => {
  for (let i = 0; i < word.length; i += 1) {
    const r = row + dr * i;
    const c = col + dc * i;
    grid[r][c] = word[i];
  }
};

const fitsGrid = (word: string, rows: number, cols: number) =>
  word.length <= rows || word.length <= cols;

export const generateWordSearchPuzzle = (
  words: string[],
  rows: number,
  cols: number,
  allowDiagonals: boolean
): { grid: string[][]; words: string[] } => {
  const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));
  const entries: WordEntry[] = words
    .map((label, index) => ({ label, key: sanitizeWord(label), index }))
    .filter((entry) => entry.key.length >= 2)
    .filter((entry) => fitsGrid(entry.key, rows, cols));

  const sorted = [...entries].sort((a, b) => b.key.length - a.key.length);
  const placed = new Set<number>();
  const directions = directionsFor(allowDiagonals);
  const maxAttempts = 300;

  sorted.forEach((entry) => {
    if (!entry.key) return;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const row = Math.floor(Math.random() * rows);
      const col = Math.floor(Math.random() * cols);
      if (!canPlace(grid, entry.key, row, col, dir.dr, dir.dc)) continue;
      placeWord(grid, entry.key, row, col, dir.dr, dir.dc);
      placed.add(entry.index);
      return;
    }
  });

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (!grid[r][c]) grid[r][c] = randomLetter();
    }
  }

  const placedWords = entries
    .filter((entry) => placed.has(entry.index))
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.label);

  return { grid, words: placedWords };
};
