const isBoldFontWeight = (fontWeight: string) => {
  if (!fontWeight) return false;
  const normalized = fontWeight.trim().toLowerCase();
  if (normalized === 'bold' || normalized === 'bolder') return true;
  const numeric = Number.parseInt(normalized, 10);
  return Number.isFinite(numeric) && numeric >= 600;
};

const hasUnderline = (textDecoration: string) => {
  if (!textDecoration) return false;
  return textDecoration.toLowerCase().includes('underline');
};

const wrapElementChildren = (doc: Document, element: Element, wrapper: HTMLElement) => {
  while (element.firstChild) {
    wrapper.appendChild(element.firstChild);
  }
  element.appendChild(wrapper);
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
      const textDecoration = element.style.textDecoration || (element.style as any).textDecorationLine || '';

      const shouldAddFontSizeMark = Boolean(fontSize);
      const shouldAddBoldMark = isBoldFontWeight(fontWeight);
      const shouldAddUnderlineMark = hasUnderline(textDecoration);

      if (!shouldAddFontSizeMark && !shouldAddBoldMark && !shouldAddUnderlineMark) return;

      if (shouldAddFontSizeMark) element.style.fontSize = '';
      if (shouldAddBoldMark) element.style.fontWeight = '';
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

      if (shouldAddUnderlineMark) {
        const underline = doc.createElement('u');
        wrapElementChildren(doc, element, underline);
      }
    });

    return doc.body.innerHTML;
  } catch {
    return html;
  }
};

