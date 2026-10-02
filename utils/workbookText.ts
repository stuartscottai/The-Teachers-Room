/** English-only workbook labels. Insert page numbers without localising any text. */
export const workbookText = (english: string, values: Record<string, unknown>): string =>
  english.replace(/\{([^{}]+)\}/g, (token, name: string) =>
    Object.hasOwn(values, name) ? String(values[name] ?? '') : token);
