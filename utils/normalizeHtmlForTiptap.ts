const isBoldFontWeight = (fontWeight: string) => {
  if (!fontWeight) return false;
  const normalized = fontWeight.trim().toLowerCase();
  if (normalized === 'bold' || normalized === 'bolder') return true;
  const numeric = Number.parseInt(normalized, 10);
  return Number.isFinite(numeric) && numeric >= 600;
};

const isItalicFontStyle = (fontStyle: string) => {
  if (!fontStyle) return false;
  const normalized = fontStyle.trim().toLowerCase();
  return normalized === 'italic' || normalized === 'oblique';
};

const hasUnderline = (textDecoration: string) => {
  if (!textDecoration) return false;
  return textDecoration.toLowerCase().includes('underline');
};

const isBlankText = (text: string) => {
  return (text || '').replace(/\u00a0/g, '').trim().length === 0;
};

const ensureTitleSpacing = (doc: Document) => {
  const title = doc.body.querySelector('h2');
  if (!title) return;
  if (title.closest('.ws-answer-key')) return;

  let node = title.nextSibling;
  let blankParagraphs = 0;

  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.tagName.toLowerCase() === 'p' && isBlankText(el.textContent || '')) {
        blankParagraphs += 1;
        node = node.nextSibling;
        continue;
      }
      break;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      if (isBlankText(node.textContent || '')) {
        node = node.nextSibling;
        continue;
      }
      break;
    }

    break;
  }

  const needed = Math.max(0, 2 - blankParagraphs);
  if (needed === 0) return;

  for (let i = 0; i < needed; i++) {
    const spacer = doc.createElement('p');
    spacer.textContent = '\u00A0';
    if (title.parentNode) {
      title.parentNode.insertBefore(spacer, title.nextSibling);
    }
  }
};

const looksLikeInstructions = (text: string) => {
  const trimmed = (text || '').replace(/\s+/g, ' ').trim();
  if (!trimmed) return false;
  if (trimmed.length > 320) return false;

  const lower = trimmed.toLowerCase();
  const starts = [
    'instructions',
    'read',
    'answer',
    'complete',
    'write',
    'choose',
    'circle',
    'fill',
    'match',
    'use the',
    'as you read',
    'as you work',
    'you will',
  ];

  return starts.some((s) => lower.startsWith(s)) || /\b(read|answer|complete|write|choose|circle|fill|match)\b/.test(lower);
};

const wrapElementChildren = (doc: Document, element: Element, wrapper: HTMLElement) => {
  while (element.firstChild) {
    wrapper.appendChild(element.firstChild);
  }
  element.appendChild(wrapper);
};

const ensureItalicized = (doc: Document, element: HTMLElement) => {
  const hasEm = Boolean(element.querySelector('em,i'));
  const hasOnlyEmChild =
    element.childNodes.length === 1 &&
    element.firstChild instanceof HTMLElement &&
    ['em', 'i'].includes(element.firstChild.tagName.toLowerCase());
  if (hasEm || hasOnlyEmChild) return;

  const em = doc.createElement('em');
  wrapElementChildren(doc, element, em);
};

export const normalizeHtmlForTiptap = (html: string) => {
  if (!html) return html;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const candidates = doc.body.querySelectorAll<HTMLElement>('[style]');
    candidates.forEach((element) => {
      const tag = element.tagName.toLowerCase();
      const canWrapChildren = tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'p' || tag === 'li' || tag === 'span';
      if (!canWrapChildren) return;

      const fontSize = element.style.fontSize;
      const fontWeight = element.style.fontWeight;
      const fontStyle = element.style.fontStyle;
      const textDecoration = element.style.textDecoration || (element.style as any).textDecorationLine || '';

      const shouldAddFontSizeMark = Boolean(fontSize);
      const shouldAddBoldMark = isBoldFontWeight(fontWeight);
      const shouldAddItalicMark = isItalicFontStyle(fontStyle);
      const shouldAddUnderlineMark = hasUnderline(textDecoration);

      if (!shouldAddFontSizeMark && !shouldAddBoldMark && !shouldAddItalicMark && !shouldAddUnderlineMark) return;

      if (shouldAddFontSizeMark) element.style.fontSize = '';
      if (shouldAddBoldMark) element.style.fontWeight = '';
      if (shouldAddItalicMark) element.style.fontStyle = '';
      if (shouldAddUnderlineMark) {
        element.style.textDecoration = '';
        (element.style as any).textDecorationLine = '';
      }

      if (!element.getAttribute('style')?.trim()) {
        element.removeAttribute('style');
      }

      if (shouldAddFontSizeMark) {
        const span = doc.createElement('span');
        span.style.fontSize = fontSize;
        wrapElementChildren(doc, element, span);
      }

      if (shouldAddBoldMark) {
        const strong = doc.createElement('strong');
        wrapElementChildren(doc, element, strong);
      }

      if (shouldAddItalicMark) {
        const em = doc.createElement('em');
        wrapElementChildren(doc, element, em);
      }

      if (shouldAddUnderlineMark) {
        const underline = doc.createElement('u');
        wrapElementChildren(doc, element, underline);
      }
    });

    // Backfill italics for instruction blocks when AI forgets.
    doc.body.querySelectorAll<HTMLElement>('.ws-instructions').forEach((element) => {
      ensureItalicized(doc, element);
    });

    doc.body.querySelectorAll<HTMLElement>('.ws-section').forEach((section) => {
      const paragraphs = Array.from(section.querySelectorAll<HTMLParagraphElement>('p'));
      const candidate = paragraphs.find((p) => looksLikeInstructions(p.textContent || '')) ?? paragraphs[0];
      if (!candidate) return;
      ensureItalicized(doc, candidate);
    });

    // If the AI forgot the `ws-instructions` class entirely, treat the first
    // top-level paragraph before the first section as main instructions.
    const hasMainInstructions = Boolean(doc.body.querySelector('.ws-instructions'));
    if (!hasMainInstructions) {
      const firstSection = doc.body.querySelector('.ws-section');
      const blocks = Array.from(doc.body.querySelectorAll<HTMLElement>('p,div')).filter((el) => {
        if (el.closest('.ws-section')) return false;
        if (el.closest('.ws-answer-key')) return false;
        if (el.closest('.ws-header')) return false;
        return true;
      });

      const candidate = blocks.find((p) => {
        if (!firstSection) return true;
        return Boolean(p.compareDocumentPosition(firstSection) & Node.DOCUMENT_POSITION_FOLLOWING);
      });

      if (candidate) {
        candidate.classList.add('ws-instructions');
        if (looksLikeInstructions(candidate.textContent || '') || candidate.tagName.toLowerCase() === 'p') {
          ensureItalicized(doc, candidate);
        }
      }
    }

    // Ensure consistent blank space between title and first content block.
    ensureTitleSpacing(doc);

    return doc.body.innerHTML;
  } catch {
    return html;
  }
};
