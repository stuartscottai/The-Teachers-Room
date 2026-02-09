import DOMPurify from 'dompurify';
import {
  WorksheetAiResultV1,
  WorksheetBlock,
  WorksheetBlockType,
  WorksheetElementStyles,
  WorksheetPlacedElement,
  createId,
} from './designerTypes';
import { WorksheetConfig } from '../../../types';

export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'script'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseenter', 'onmouseover', 'style'],
    // Allow safe image sources used in local uploads and previews.
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|ftp|tel|data|blob):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
};

export const escapeHtml = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const toPlainText = (value: string): string => {
  if (!value) return '';
  try {
    const doc = new DOMParser().parseFromString(value, 'text/html');
    return doc.body.textContent || '';
  } catch {
    return value.replace(/<[^>]*>/g, ' ');
  }
};

const stripLeadingLabel = (value: string): string => {
  return value.replace(/^\s*([A-Za-z]|\d{1,2})\s*[\)\.\-:]\s*/g, '').trim();
};

type ImageBankItem = {
  url: string;
  thumbUrl?: string;
  label: string;
};

const normalizeImageLabel = (value: string): string => value.toLowerCase().trim();

const shouldProxyImageUrl = (value: string): boolean => /pixabay\.com/i.test(value);

const resolveImageUrl = (value: string): string => {
  if (!value) return '';
  if (!shouldProxyImageUrl(value)) return value;
  const cleaned = value.replace(/^https?:\/\//i, '');
  return `https://images.weserv.nl/?url=${encodeURIComponent(cleaned)}`;
};

const buildImageBankLookup = (items?: ImageBankItem[]) => {
  const lookup = new Map<string, ImageBankItem>();
  (items || []).forEach((item) => {
    const key = normalizeImageLabel(String(item?.label || ''));
    if (!key || !item?.url) return;
    lookup.set(key, item);
  });
  return lookup;
};

export const resolveMcqOptionLabelType = (note?: string): 'A' | '1' => {
  const text = (note || '').toLowerCase();
  if (!text) return 'A';
  if (/(numbers?|numeric|digits?|1-4|1 to 4|1-3|1 to 3|1-2|1 to 2)/.test(text)) {
    return '1';
  }
  return 'A';
};

export const mcqToHtml = (
  items: WorksheetAiResultV1['mcq'],
  opts?: { optionLabelType?: 'A' | '1' }
): string => {
  const safeItems = items ?? [];
  const optionLabelType = opts?.optionLabelType === '1' ? '1' : 'A';
  const optionClass =
    optionLabelType === '1' ? 'ws-options ws-options-numeric' : 'ws-options ws-options-alpha';
  const li = safeItems
    .map((item) => {
      const q = escapeHtml(stripLeadingLabel(toPlainText(item.q || '')));
      const options = (item.options || []).map((o) =>
        escapeHtml(stripLeadingLabel(toPlainText(String(o))))
      );
      const optionLis = options.map((o) => `<li>${o}</li>`).join('');
      return `<li><div class="ws-q">${q}</div><ol class="${optionClass}" type="${optionLabelType}">${optionLis}</ol></li>`;
    })
    .join('');

  return sanitizeHtml(
    `<div><h3 style="margin:0 0 8px 0;font-weight:700;">Questions</h3><ol class="ws-mcq">${li}</ol></div>`
  );
};

export const wordSearchToHtml = (puzzle?: { grid: string[][]; words: string[] }): string => {
  if (!puzzle) return '';
  const grid = puzzle.grid || [];
  const rows = grid
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell || ''))}</td>`).join('')}</tr>`)
    .join('');

  return sanitizeHtml(
    `<div class="ws-wordsearch"><h3>Wordsearch</h3><div class="ws-wordsearch-grid"><table class="ws-table ws-wordsearch-table"><tbody>${rows}</tbody></table></div></div>`
  );
};

export const wordSearchWordsToHtml = (words?: string[], imageBank?: ImageBankItem[]): string => {
  const safeWords = words ?? [];
  const lookup = buildImageBankLookup(imageBank);
  const cards = safeWords.map((w) => {
    const label = toPlainText(String(w));
    const key = normalizeImageLabel(label);
    const img = lookup.get(key);
    if (img) {
      return `<div class="ws-wordsearch-word-card"><img class="ws-wordsearch-word-img" src="${escapeHtml(
        resolveImageUrl(img.url)
      )}" alt="${escapeHtml(label)}" /><div class="ws-wordsearch-word-label">${escapeHtml(label)}</div></div>`;
    }
    return `<div class="ws-wordsearch-word-card ws-wordsearch-word-card--text">${escapeHtml(label)}</div>`;
  });

  const listFallback = safeWords
    .map((w) => `<span class="ws-wordsearch-word">${escapeHtml(toPlainText(String(w)))}</span>`)
    .join(', ');

  const bodyHtml = lookup.size
    ? `<div class="ws-wordsearch-words-title"><strong>Words:</strong></div><div class="ws-wordsearch-words-grid">${cards.join(
        ''
      )}</div>`
    : `<div class="ws-wordsearch-words"><strong>Words:</strong> ${listFallback}</div>`;

  return sanitizeHtml(`<div class="ws-wordsearch-words-box">${bodyHtml}</div>`);
};

export const matchingToHtml = (
  items: WorksheetAiResultV1['matching'],
  opts?: { title?: string; instructions?: string; imageBank?: ImageBankItem[] }
): string => {
  const safeItems = items ?? [];
  const lookup = buildImageBankLookup(opts?.imageBank);
  const renderCell = (value: string) => {
    const label = toPlainText(value || '');
    const key = normalizeImageLabel(label);
    const img = lookup.get(key);
    if (!img) return escapeHtml(label);
    return `<div class="ws-matching-item"><img class="ws-matching-image" src="${escapeHtml(
      resolveImageUrl(img.url)
    )}" alt="${escapeHtml(label)}" /><div class="ws-matching-label">${escapeHtml(label)}</div></div>`;
  };
  const rows = safeItems
    .map((item) => {
      const left = renderCell(item?.left || '');
      const right = renderCell(item?.right || '');
      return `<tr><td>${left}</td><td></td><td>${right}</td></tr>`;
    })
    .join('');

  const title = escapeHtml(toPlainText(opts?.title || 'Match the pairs'));
  const instructions = escapeHtml(
    toPlainText(opts?.instructions || 'Draw lines or write the correct matches.')
  );

  return sanitizeHtml(
    `<div><h3>${title}</h3><div class="ws-activity-instructions">${instructions}</div><table class="ws-matching-table"><tbody>${rows}</tbody></table></div>`
  );
};

export const gapFillToHtml = (
  items: WorksheetAiResultV1['gapFill'],
  opts?: { wordBank?: string[] }
): string => {
  const safeItems = items ?? [];
  const li = safeItems
    .map((item) => {
      const sentence = escapeHtml(toPlainText(item?.sentence || ''));
      return `<li>${sentence}</li>`;
    })
    .join('');

  const wordBankItems = (opts?.wordBank || []).filter(Boolean);
  const wordBankHtml = wordBankItems.length
    ? `<div class="ws-word-bank"><strong>Word bank:</strong> ${wordBankItems
        .map((w) => `<span class="ws-word-bank-item">${escapeHtml(toPlainText(String(w)))}</span>`)
        .join(', ')}</div>`
    : '';

  return sanitizeHtml(`<div><h3>Gap Fill</h3>${wordBankHtml}<ol class="ws-gap-fill">${li}</ol></div>`);
};

export const sentenceTransformToHtml = (items: WorksheetAiResultV1['sentenceTransform']): string => {
  const safeItems = items ?? [];
  const li = safeItems
    .map((item) => {
      const prompt = escapeHtml(toPlainText(item?.prompt || ''));
      const keyword = escapeHtml(toPlainText((item as any)?.keyword || ''));
      const keywordHtml = keyword ? `<div class="ws-transform-keyword">${keyword}</div>` : '';
      return `<li><div class="ws-transform-prompt">${prompt}</div>${keywordHtml}<div class="ws-transform-line">________________________________</div></li>`;
    })
    .join('');

  return sanitizeHtml(
    `<div><h3>Sentence Transformation</h3><div class="ws-transform-instructions">Rewrite the sentence using the keyword. Do not change the keyword.</div><ol class="ws-sentence-transform">${li}</ol></div>`
  );
};

export const wordFormationToHtml = (items: WorksheetAiResultV1['wordFormation']): string => {
  const safeItems = items ?? [];
  const li = safeItems
    .map((item) => {
      const base = escapeHtml(toPlainText(item?.base || ''));
      const sentence = escapeHtml(toPlainText(item?.sentence || ''));
      return `<li><div><strong>Base:</strong> ${base}</div><div>${sentence}</div></li>`;
    })
    .join('');

  return sanitizeHtml(`<div><h3>Word Formation</h3><ol class="ws-word-formation">${li}</ol></div>`);
};

export const openEndedToHtml = (items: WorksheetAiResultV1['openEnded']): string => {
  const safeItems = items ?? [];
  const li = safeItems
    .map((item) => {
      const question = escapeHtml(toPlainText(item?.question || ''));
      return `<li><div>${question}</div><div>________________________________</div></li>`;
    })
    .join('');

  return sanitizeHtml(`<div><h3>Open Ended</h3><ol class="ws-open-ended">${li}</ol></div>`);
};

export const customToHtml = (items: WorksheetAiResultV1['custom']): string => {
  const safeItems = items ?? [];
  const blocks = safeItems
    .map((item) => {
      const html = (item as any)?.html;
      if (html) {
        return String(html);
      }
      const raw = toPlainText((item as any)?.text || '');
      const paragraphs = raw
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);
      if (paragraphs.length <= 1) {
        return `<p>${escapeHtml(raw)}</p>`;
      }
      return paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
    })
    .join('');

  return sanitizeHtml(`<div><h3>Custom</h3>${blocks}</div>`);
};

export const tableToHtml = (table: WorksheetAiResultV1['table']): string => {
  const headers = table?.headers ?? [];
  const rows = table?.rows ?? [];

  const thead = headers.length
    ? `<thead><tr>${headers.map((h) => `<th>${escapeHtml(toPlainText(String(h)))}</th>`).join('')}</tr></thead>`
    : '';

  const tbody = `<tbody>${rows
    .map((r) => `<tr>${(r || []).map((c) => `<td>${escapeHtml(toPlainText(String(c)))}</td>`).join('')}</tr>`)
    .join('')}</tbody>`;

  return sanitizeHtml(`<table class="ws-table" style="width:100%;border-collapse:collapse;">${thead}${tbody}</table>`);
};

export const imageToHtml = (url: string, storagePath?: string, kind?: string): string => {
  const safe = escapeHtml(url);
  const storageAttr = storagePath ? ` data-storage-path="${escapeHtml(storagePath)}"` : '';
  const kindAttr = kind ? ` data-kind="${escapeHtml(kind)}"` : '';
  return sanitizeHtml(
    `<div class="ws-image"><img class="ws-image-img" src="${safe}"${storageAttr}${kindAttr} alt="" /></div>`
  );
};

export const normalizeInfoBodyHtml = (value: string): string => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  // If a full info card was passed, extract just the body contents.
  if (/ws-info-card\b/.test(trimmed)) {
    try {
      const doc = new DOMParser().parseFromString(trimmed, 'text/html');
      const body = doc.querySelector('.ws-info-card__body');
      if (body) {
        const inner = body.innerHTML.trim();
        if (inner) return sanitizeHtml(inner);
      }
    } catch {
      // fall through to normal parsing
    }
  }
  if (/<(p|ul|ol|table|h3|h4|h5|div|br)\b/i.test(trimmed)) {
    return sanitizeHtml(trimmed);
  }
  const lines = trimmed
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return sanitizeHtml(`<p>${escapeHtml(trimmed)}</p>`);
  }
  const bulletLike = (line: string) => /^(?:[-*•]|\d+[\).\s])\s+/.test(line);
  const bulletCount = lines.filter(bulletLike).length;
  if (bulletCount >= Math.max(2, Math.ceil(lines.length * 0.4))) {
    const items = lines
      .map((line) => line.replace(/^(?:[-*•]|\d+[\).\s])\s+/, '').trim())
      .filter(Boolean);
    return sanitizeHtml(`<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`);
  }
  return sanitizeHtml(lines.map((line) => `<p>${escapeHtml(line)}</p>`).join(''));
};

export const blockToElementHtml = (block: WorksheetBlock): string => {
  if (block.type === 'title') {
    const text = String(block.payload?.text ?? block.payload?.title ?? block.title ?? '').trim();
    return sanitizeHtml(`<h1 style="margin:0;font-weight:800;font-size:28px;line-height:1.1;">${escapeHtml(text)}</h1>`);
  }
  if (block.type === 'header') {
    return sanitizeHtml(String(block.payload?.html ?? block.previewHtml ?? ''));
  }
  if (block.type === 'story') {
    return sanitizeHtml(String(block.payload?.html ?? block.payload?.storyHtml ?? block.previewHtml ?? ''));
  }
  if (block.type === 'mcq') {
    if (block.payload?.html) return sanitizeHtml(String(block.payload.html));
    return mcqToHtml(block.payload?.items ?? [], { optionLabelType: block.payload?.optionLabelType });
  }
  if (block.type === 'wordsearch') {
    if (block.payload?.html) return sanitizeHtml(String(block.payload.html));
    return wordSearchToHtml(block.payload?.puzzle);
  }
  if (block.type === 'wordsearch-words') {
    if (block.payload?.html) return sanitizeHtml(String(block.payload.html));
    const words = block.payload?.words ?? block.payload?.puzzle?.words ?? [];
    const imageBank = block.payload?.imageBank?.items ?? block.payload?.imageBank;
    return wordSearchWordsToHtml(words, imageBank);
  }
  if (block.type === 'matching') {
    if (block.payload?.html) return sanitizeHtml(String(block.payload.html));
    return matchingToHtml(block.payload?.items ?? [], {
      title: block.payload?.title,
      instructions: block.payload?.instructions,
      imageBank: block.payload?.imageBank?.items ?? block.payload?.imageBank,
    });
  }
  if (block.type === 'gap-fill') {
    if (block.payload?.html) return sanitizeHtml(String(block.payload.html));
    return gapFillToHtml(block.payload?.items ?? [], { wordBank: block.payload?.wordBank });
  }
  if (block.type === 'sentence-transform') {
    if (block.payload?.html) return sanitizeHtml(String(block.payload.html));
    return sentenceTransformToHtml(block.payload?.items ?? []);
  }
  if (block.type === 'word-formation') {
    if (block.payload?.html) return sanitizeHtml(String(block.payload.html));
    return wordFormationToHtml(block.payload?.items ?? []);
  }
  if (block.type === 'open-ended') {
    if (block.payload?.html) return sanitizeHtml(String(block.payload.html));
    return openEndedToHtml(block.payload?.items ?? []);
  }
  if (block.type === 'custom') {
    if (block.payload?.html) return sanitizeHtml(String(block.payload.html));
    return customToHtml(block.payload?.items ?? []);
  }
  if (block.type === 'table') {
    if (block.payload?.html) return sanitizeHtml(String(block.payload.html));
    return tableToHtml(block.payload ?? { headers: [], rows: [] });
  }
  if (block.type === 'answer-key') {
    if (block.payload?.html) return sanitizeHtml(String(block.payload.html));
    return sanitizeHtml(String(block.previewHtml ?? ''));
  }
  if (block.type === 'image') {
    return imageToHtml(String(block.payload?.url ?? ''), block.payload?.storagePath, block.payload?.kind);
  }
  return sanitizeHtml(String(block.previewHtml ?? ''));
};

export const defaultStylesForType = (type: WorksheetBlockType): WorksheetElementStyles => {
  const base: WorksheetElementStyles = {
    fontFamily: 'Quicksand, sans-serif',
    fontSize: '12px',
    fontWeight: '400',
    fontStyle: 'normal',
    textDecoration: 'none',
    textAlign: 'left',
    lineHeight: '1.35',
    color: '#0f172a',
    backgroundColor: 'transparent',
    borderWidth: '0px',
    borderStyle: 'none',
    borderColor: 'transparent',
    borderRadius: '10px',
    padding: '12px',
    boxShadow: 'none',
  };

  if (type === 'title') {
    return { ...base, fontSize: '24px', fontWeight: '800', padding: '10px' };
  }
  if (type === 'image') {
    return { ...base, padding: '0px' };
  }
  if (type === 'wordsearch-words') {
    return { ...base, fontSize: '10px', lineHeight: '1.3', padding: '0px' };
  }
  return base;
};

export const defaultSizeForType = (
  type: WorksheetBlockType,
  pageInner: { width: number; height: number }
): { w: number; h: number } => {
  const maxW = Math.max(200, pageInner.width - 10);
  const clampW = (w: number) => Math.min(maxW, Math.max(180, w));

  if (type === 'title') return { w: clampW(340), h: 56 };
  if (type === 'header') return { w: clampW(620), h: 60 };
  if (type === 'story') return { w: clampW(620), h: 240 };
  if (type === 'mcq') return { w: clampW(620), h: 320 };
  if (type === 'wordsearch') return { w: clampW(620), h: 360 };
  if (type === 'wordsearch-words') return { w: clampW(420), h: 120 };
  if (type === 'matching') return { w: clampW(620), h: 260 };
  if (type === 'gap-fill') return { w: clampW(620), h: 260 };
  if (type === 'sentence-transform') return { w: clampW(620), h: 260 };
  if (type === 'word-formation') return { w: clampW(620), h: 260 };
  if (type === 'open-ended') return { w: clampW(620), h: 260 };
  if (type === 'custom') return { w: clampW(620), h: 240 };
  if (type === 'table') return { w: clampW(620), h: 220 };
  if (type === 'answer-key') return { w: clampW(620), h: 260 };
  if (type === 'image') return { w: clampW(320), h: 220 };
  return { w: clampW(500), h: 200 };
};

export const blocksFromAi = (ai: WorksheetAiResultV1, config?: WorksheetConfig): WorksheetBlock[] => {
  const blocks: WorksheetBlock[] = [];

  const activities = config?.activities ?? [];
  const infoTemplate = config?.infoTemplate || 'classic';
  const infoTheme = config?.infoTheme || 'ocean';
  const infoSectionItems = Array.isArray(ai?.infoSections) ? ai.infoSections : [];
  const requestedInfoSectionCount = activities
    .filter((a) => a.type === 'information-sheet')
    .reduce((sum, a) => sum + (a.count || 0), 0);
  const hasInfoSections = infoSectionItems.length > 0 || requestedInfoSectionCount > 0;
  const infoBlockStyles = {
    padding: '0px',
    backgroundColor: 'transparent',
    borderStyle: 'none',
    borderWidth: '0px',
    borderColor: 'transparent',
    borderRadius: '0px',
    boxShadow: 'none',
  };

  const buildInfoHeaderBlock = (title: string, subtitle?: string) => {
    const safeTitle = escapeHtml(toPlainText(title || ''));
    const safeSubtitle = escapeHtml(toPlainText(subtitle || ''));
    const subtitleHtml = safeSubtitle ? `<div class="ws-info-header__subtitle">${safeSubtitle}</div>` : '';
    const html = sanitizeHtml(
      `<div class="ws-info-header ws-info-header--${escapeHtml(infoTemplate)} ws-info-theme--${escapeHtml(infoTheme)}"><div class="ws-info-header__title">${safeTitle}</div>${subtitleHtml}</div>`
    );
    blocks.push({
      id: createId(),
      type: 'custom',
      title: 'Infographic Header',
      payload: { html, kind: 'info-header', template: infoTemplate, theme: infoTheme, styles: infoBlockStyles },
      previewHtml: html,
    });
  };

  const pushInfoSectionBlock = (section: any) => {
    const title = toPlainText(section?.title ?? '').trim();
    const rawBody = String(section?.bodyHtml ?? '');
    const bodyHtml = normalizeInfoBodyHtml(rawBody);
    const titleHtml = title ? `<div class="ws-info-card__title">${escapeHtml(title)}</div>` : '';
    const fallbackBody = `<p>${escapeHtml(title ? '' : 'Information')}</p>`;
    const html = sanitizeHtml(
      `<div class="ws-info-card ws-info-card--${escapeHtml(infoTemplate)} ws-info-theme--${escapeHtml(infoTheme)}">${titleHtml}<div class="ws-info-card__body">${
        bodyHtml || fallbackBody
      }</div></div>`
    );
    const previewText = title || toPlainText(bodyHtml) || 'Information';
    const preview = sanitizeHtml(
      `<div><div style="font-weight:700;margin-bottom:6px;">Info</div><div style="font-size:12px;opacity:.85;">${escapeHtml(
        previewText
      )}</div></div>`
    );
    blocks.push({
      id: createId(),
      type: 'custom',
      title: title ? `Info: ${title}` : 'Information',
      payload: { html, kind: 'info-section', template: infoTemplate, theme: infoTheme, styles: infoBlockStyles },
      previewHtml: preview,
    });
  };

  const buildFallbackInfoSection = (note: string, index: number) => {
    const fallbackTitle = note ? note.split('\n')[0].trim() : '';
    const title = fallbackTitle || (config?.topic ? String(config.topic) : '') || `Information ${index + 1}`;
    const bodyText =
      note ||
      (config?.topic
        ? `Key points about ${String(config.topic)}.`
        : 'Add your key information here.');
    return {
      title,
      bodyHtml: normalizeInfoBodyHtml(bodyText),
    };
  };

  const titleText = String(ai?.title ?? '').trim();
  if (titleText) {
    if (hasInfoSections) {
      buildInfoHeaderBlock(titleText, config?.topic || '');
    } else {
      blocks.push({
        id: createId(),
        type: 'title',
        title: 'Title',
        payload: { text: titleText },
        previewHtml: sanitizeHtml(`<div style="font-weight:800;font-size:14px;">${escapeHtml(titleText)}</div>`),
      });
    }
  }

  if (config?.includeHeader) {
    const headerHtml =
      '<div class="ws-header-fields"><div><strong>Name:</strong> <span class="ws-line"></span></div><div><strong>Date:</strong> <span class="ws-line"></span></div></div>';
    const safeHeader = sanitizeHtml(headerHtml);
    blocks.push({
      id: createId(),
      type: 'header',
      title: 'Name & Date',
      payload: { html: safeHeader },
      previewHtml: safeHeader,
    });
  }

  const storyHtml = String(ai?.storyHtml ?? '').trim();
  if (storyHtml) {
    blocks.push({
      id: createId(),
      type: 'story',
      title: 'Story / Text',
      payload: { html: sanitizeHtml(storyHtml) },
      previewHtml: sanitizeHtml(storyHtml),
    });
  }

  const mcqItems = Array.isArray(ai?.mcq) ? ai.mcq : [];
  const wordSearchItems = Array.isArray(ai?.wordSearch) ? ai.wordSearch : [];
  const matchingItems = Array.isArray(ai?.matching) ? ai.matching : [];
  const matchingMeta = Array.isArray((ai as any)?.matchingMeta) ? (ai as any).matchingMeta : [];
  const gapFillItems = Array.isArray(ai?.gapFill) ? ai.gapFill : [];
  const sentenceTransformItems = Array.isArray(ai?.sentenceTransform) ? ai.sentenceTransform : [];
  const wordFormationItems = Array.isArray(ai?.wordFormation) ? ai.wordFormation : [];
  const openEndedItems = Array.isArray(ai?.openEnded) ? ai.openEnded : [];
  const customItems = Array.isArray(ai?.custom) ? ai.custom : [];
  let mcqIndex = 0;
  let wordSearchIndex = 0;
  let matchingIndex = 0;
  let matchingGroupIndex = 0;
  let gapFillIndex = 0;
  let sentenceTransformIndex = 0;
  let wordFormationIndex = 0;
  let openEndedIndex = 0;
  let infoSectionIndex = 0;
  let customIndex = 0;
  const tableItems = Array.isArray(ai?.tables)
    ? ai.tables
    : ai?.table
      ? [ai.table]
      : [];
  let tableIndex = 0;

  const maybeInsertTable = () => {
    const table = tableItems[tableIndex];
    if (!table) return;
    tableIndex += 1;
    if (table?.headers?.length || table?.rows?.length) {
      blocks.push({
        id: createId(),
        type: 'table',
        title: 'Table',
        payload: table,
        previewHtml: tableToHtml(table),
      });
    }
  };

  if (activities.length > 0) {
    activities.forEach((act) => {
      const count = Math.max(0, act.count || 0);
      if (act.type === 'multiple-choice') {
        const slice = mcqItems.slice(mcqIndex, mcqIndex + count);
        mcqIndex += slice.length;
        if (slice.length > 0) {
          const first = slice[0];
          const preview = sanitizeHtml(
            `<div><div style="font-weight:700;margin-bottom:6px;">MCQ</div><div style="font-size:12px;opacity:.85;">${escapeHtml(
              toPlainText(first?.q ?? '')
            )}</div></div>`
          );
          blocks.push({
            id: createId(),
            type: 'mcq',
            title: `MCQ (${slice.length})`,
            payload: { items: slice, optionLabelType: resolveMcqOptionLabelType(act.customInstructions) },
            previewHtml: preview,
          });
        }
        return;
      }
      if (act.type === 'wordsearch') {
        const puzzle = wordSearchItems[wordSearchIndex];
        wordSearchIndex += 1;
        if (puzzle?.grid?.length) {
          const words = Array.isArray(puzzle.words) ? puzzle.words : [];
          const imageBankItems =
            act.options?.useImages && Array.isArray(act.options?.imageBank?.items)
              ? act.options.imageBank.items
              : [];
          blocks.push({
            id: createId(),
            type: 'wordsearch',
            title: 'Wordsearch',
            payload: { puzzle },
            previewHtml: sanitizeHtml('<div style="font-weight:700;">Wordsearch</div>'),
          });
          if (words.length > 0) {
            blocks.push({
              id: createId(),
              type: 'wordsearch-words',
              title: 'Wordsearch Words',
              payload: {
                words,
                ...(imageBankItems.length ? { imageBank: { items: imageBankItems } } : {}),
              },
              previewHtml: wordSearchWordsToHtml(words, imageBankItems),
            });
          }
        }
        return;
      }
      if (act.type === 'matching') {
        const slice = matchingItems.slice(matchingIndex, matchingIndex + count);
        matchingIndex += slice.length;
        if (slice.length > 0) {
          const meta = matchingMeta[matchingGroupIndex] || null;
          matchingGroupIndex += 1;
          const imageBankItems =
            act.options?.useImages && Array.isArray(act.options?.imageBank?.items)
              ? act.options.imageBank.items
              : [];
          const first = slice[0];
          const preview = sanitizeHtml(
            `<div><div style="font-weight:700;margin-bottom:6px;">Match the pairs</div><div style="font-size:12px;opacity:.85;">${escapeHtml(
              `${toPlainText(first?.left ?? '')} -> ${toPlainText(first?.right ?? '')}`
            )}</div></div>`
          );
          blocks.push({
            id: createId(),
            type: 'matching',
            title: meta?.title || `Pairs (${slice.length})`,
            payload: {
              items: slice,
              ...(meta?.title ? { title: meta.title } : {}),
              ...(meta?.instructions ? { instructions: meta.instructions } : {}),
              ...(imageBankItems.length ? { imageBank: { items: imageBankItems } } : {}),
            },
            previewHtml: preview,
          });
        }
        return;
      }
      if (act.type === 'gap-fill') {
        const slice = gapFillItems.slice(gapFillIndex, gapFillIndex + count);
        gapFillIndex += slice.length;
        if (slice.length > 0) {
          const wordBank = act.options?.wordBank
            ? Array.from(new Set(slice.map((item) => toPlainText(item?.answer || '')).filter(Boolean)))
            : undefined;
          const hasStory = typeof ai?.storyHtml === 'string' && String(ai.storyHtml).trim().length > 0;
          if (act.contextType === 'text' && act.options?.embedInStory && hasStory) {
            return;
          }
          const first = slice[0];
          const preview = sanitizeHtml(
            `<div><div style="font-weight:700;margin-bottom:6px;">Gap Fill</div><div style="font-size:12px;opacity:.85;">${escapeHtml(
              toPlainText(first?.sentence ?? '')
            )}</div></div>`
          );
          blocks.push({
            id: createId(),
            type: 'gap-fill',
            title: `Gap Fill (${slice.length})`,
            payload: { items: slice, ...(wordBank ? { wordBank } : {}) },
            previewHtml: preview,
          });
        }
        return;
      }
      if (act.type === 'sentence-transform') {
        const slice = sentenceTransformItems.slice(sentenceTransformIndex, sentenceTransformIndex + count);
        sentenceTransformIndex += slice.length;
        if (slice.length > 0) {
          const first = slice[0];
          const preview = sanitizeHtml(
            `<div><div style="font-weight:700;margin-bottom:6px;">Sentence Transformation</div><div style="font-size:12px;opacity:.85;">${escapeHtml(
              toPlainText(first?.prompt ?? '')
            )}</div></div>`
          );
          blocks.push({
            id: createId(),
            type: 'sentence-transform',
            title: `Sentence Transform (${slice.length})`,
            payload: { items: slice },
            previewHtml: preview,
          });
        }
        return;
      }
      if (act.type === 'word-formation') {
        const slice = wordFormationItems.slice(wordFormationIndex, wordFormationIndex + count);
        wordFormationIndex += slice.length;
        if (slice.length > 0) {
          if (act.contextType === 'text' && (act.options?.embedInStory ?? true)) {
            return;
          }
          const first = slice[0];
          const previewText = toPlainText(first?.sentence || first?.base || '');
          const preview = sanitizeHtml(
            `<div><div style="font-weight:700;margin-bottom:6px;">Word Formation</div><div style="font-size:12px;opacity:.85;">${escapeHtml(
              previewText
            )}</div></div>`
          );
          blocks.push({
            id: createId(),
            type: 'word-formation',
            title: `Word Formation (${slice.length})`,
            payload: { items: slice },
            previewHtml: preview,
          });
        }
        return;
      }
      if (act.type === 'open-ended') {
        const slice = openEndedItems.slice(openEndedIndex, openEndedIndex + count);
        openEndedIndex += slice.length;
        if (slice.length > 0) {
          const first = slice[0];
          const preview = sanitizeHtml(
            `<div><div style="font-weight:700;margin-bottom:6px;">Open Ended</div><div style="font-size:12px;opacity:.85;">${escapeHtml(
              toPlainText(first?.question ?? '')
            )}</div></div>`
          );
          blocks.push({
            id: createId(),
            type: 'open-ended',
            title: `Open Ended (${slice.length})`,
            payload: { items: slice },
            previewHtml: preview,
          });
        }
        return;
      }
      if (act.type === 'information-sheet') {
        const slice = infoSectionItems.slice(infoSectionIndex, infoSectionIndex + count);
        infoSectionIndex += count;
        if (count > 0) {
          for (let i = 0; i < count; i += 1) {
            const section = slice[i] || buildFallbackInfoSection(act.customInstructions || '', i);
            pushInfoSectionBlock(section);
          }
        } else if (slice.length > 0) {
          slice.forEach(pushInfoSectionBlock);
        }
        return;
      }
      if (act.type === 'custom') {
        const item = customItems[customIndex];
        customIndex += 1;
        if (item) {
          const html = (item as any)?.html;
          const previewSource = html ? toPlainText(String(html)) : toPlainText(item?.text ?? '');
          const preview = sanitizeHtml(
            `<div><div style="font-weight:700;margin-bottom:6px;">Custom</div><div style="font-size:12px;opacity:.85;">${escapeHtml(
              previewSource
            )}</div></div>`
          );
          blocks.push({
            id: createId(),
            type: 'custom',
            title: 'Custom',
            payload: { items: [item] },
            previewHtml: preview,
          });
        }
        return;
      }
      if (act.type === 'table') {
        maybeInsertTable();
      }
    });
  } else {
    if (mcqItems.length > 0) {
      const first = mcqItems[0];
      const preview = sanitizeHtml(
        `<div><div style="font-weight:700;margin-bottom:6px;">MCQ</div><div style="font-size:12px;opacity:.85;">${escapeHtml(
          toPlainText(first?.q ?? '')
        )}</div></div>`
      );
      blocks.push({
        id: createId(),
        type: 'mcq',
        title: `MCQ (${mcqItems.length})`,
        payload: { items: mcqItems, optionLabelType: 'A' },
        previewHtml: preview,
      });
    }
    if (wordSearchItems.length > 0) {
      const puzzle = wordSearchItems[0];
      if (puzzle?.grid?.length) {
        const words = Array.isArray(puzzle.words) ? puzzle.words : [];
        blocks.push({
          id: createId(),
          type: 'wordsearch',
          title: 'Wordsearch',
          payload: { puzzle },
          previewHtml: sanitizeHtml('<div style="font-weight:700;">Wordsearch</div>'),
        });
        if (words.length > 0) {
          blocks.push({
            id: createId(),
            type: 'wordsearch-words',
            title: 'Wordsearch Words',
            payload: { words },
            previewHtml: wordSearchWordsToHtml(words),
          });
        }
      }
    }
    if (matchingItems.length > 0) {
      const first = matchingItems[0];
      const meta = matchingMeta[0] || null;
      const preview = sanitizeHtml(
        `<div><div style="font-weight:700;margin-bottom:6px;">Match the pairs</div><div style="font-size:12px;opacity:.85;">${escapeHtml(
          `${toPlainText(first?.left ?? '')} -> ${toPlainText(first?.right ?? '')}`
        )}</div></div>`
      );
      blocks.push({
        id: createId(),
        type: 'matching',
        title: meta?.title || `Pairs (${matchingItems.length})`,
        payload: {
          items: matchingItems,
          ...(meta?.title ? { title: meta.title } : {}),
          ...(meta?.instructions ? { instructions: meta.instructions } : {}),
        },
        previewHtml: preview,
      });
    }
    if (gapFillItems.length > 0) {
      const first = gapFillItems[0];
      const preview = sanitizeHtml(
        `<div><div style="font-weight:700;margin-bottom:6px;">Gap Fill</div><div style="font-size:12px;opacity:.85;">${escapeHtml(
          toPlainText(first?.sentence ?? '')
        )}</div></div>`
      );
      blocks.push({
        id: createId(),
        type: 'gap-fill',
        title: `Gap Fill (${gapFillItems.length})`,
        payload: { items: gapFillItems },
        previewHtml: preview,
      });
    }
    if (sentenceTransformItems.length > 0) {
      const first = sentenceTransformItems[0];
      const preview = sanitizeHtml(
        `<div><div style="font-weight:700;margin-bottom:6px;">Sentence Transformation</div><div style="font-size:12px;opacity:.85;">${escapeHtml(
          toPlainText(first?.prompt ?? '')
        )}</div></div>`
      );
      blocks.push({
        id: createId(),
        type: 'sentence-transform',
        title: `Sentence Transform (${sentenceTransformItems.length})`,
        payload: { items: sentenceTransformItems },
        previewHtml: preview,
      });
    }
    if (wordFormationItems.length > 0) {
      const first = wordFormationItems[0];
      const previewText = toPlainText(first?.sentence || first?.base || '');
      const preview = sanitizeHtml(
        `<div><div style="font-weight:700;margin-bottom:6px;">Word Formation</div><div style="font-size:12px;opacity:.85;">${escapeHtml(
          previewText
        )}</div></div>`
      );
      blocks.push({
        id: createId(),
        type: 'word-formation',
        title: `Word Formation (${wordFormationItems.length})`,
        payload: { items: wordFormationItems },
        previewHtml: preview,
      });
    }
    if (openEndedItems.length > 0) {
      const first = openEndedItems[0];
      const preview = sanitizeHtml(
        `<div><div style="font-weight:700;margin-bottom:6px;">Open Ended</div><div style="font-size:12px;opacity:.85;">${escapeHtml(
          toPlainText(first?.question ?? '')
        )}</div></div>`
      );
      blocks.push({
        id: createId(),
        type: 'open-ended',
        title: `Open Ended (${openEndedItems.length})`,
        payload: { items: openEndedItems },
        previewHtml: preview,
      });
    }
    if (infoSectionItems.length > 0) {
      infoSectionItems.forEach(pushInfoSectionBlock);
    }
    if (customItems.length > 0) {
      const first = customItems[0];
      const html = (first as any)?.html;
      const previewSource = html ? toPlainText(String(html)) : toPlainText(first?.text ?? '');
      const preview = sanitizeHtml(
        `<div><div style="font-weight:700;margin-bottom:6px;">Custom</div><div style="font-size:12px;opacity:.85;">${escapeHtml(
          previewSource
        )}</div></div>`
      );
      blocks.push({
        id: createId(),
        type: 'custom',
        title: 'Custom',
        payload: { items: customItems },
        previewHtml: preview,
      });
    }
    if (tableItems.length > 0) {
      tableItems.forEach((table) => {
        if (!table?.headers?.length && !table?.rows?.length) return;
        blocks.push({
          id: createId(),
          type: 'table',
          title: 'Table',
          payload: table,
          previewHtml: tableToHtml(table),
        });
      });
    }
  }

  const answerKeyHtml = String(ai?.answerKeyHtml ?? '').trim();
  if (answerKeyHtml) {
    const safeAnswerKey = sanitizeHtml(answerKeyHtml);
    blocks.push({
      id: createId(),
      type: 'answer-key',
      title: 'Answer Key',
      payload: { html: safeAnswerKey },
      previewHtml: sanitizeHtml('<div style="font-weight:700;">Answer Key</div>'),
    });
  }

  const url = ai?.image?.url ? String(ai.image.url).trim() : '';
  if (url) {
    blocks.push({
      id: createId(),
      type: 'image',
      title: 'Image',
      payload: { url },
      previewHtml: imageToHtml(url),
    });
  }

  return blocks;
};

export const createElementFromBlock = (opts: {
  block: WorksheetBlock;
  pageId: string;
  x: number;
  y: number;
  pageInnerSize: { width: number; height: number };
}): WorksheetPlacedElement => {
  const { block, pageId, x, y, pageInnerSize } = opts;
  const defaults = defaultSizeForType(block.type, pageInnerSize);
  const baseW = typeof block.payload?.w === 'number' ? block.payload.w : defaults.w;
  const w =
    block.type === 'image' || block.type === 'wordsearch-words'
      ? baseW
      : Math.max(200, Math.round(pageInnerSize.width));
  const h = typeof block.payload?.h === 'number' ? block.payload.h : defaults.h;
  return {
    id: createId(),
    pageId,
    type: block.type,
    x,
    y,
    w,
    h,
    html: blockToElementHtml(block),
    styles: { ...defaultStylesForType(block.type), ...(block.payload?.styles || {}) },
  };
};

export const blockFromElement = (el: WorksheetPlacedElement): WorksheetBlock => {
  const type = el.type;
  const basePayload = { styles: el.styles, w: el.w, h: el.h };

  if (type === 'image') {
    const match = el.html.match(/<img[^>]+src=["']([^"']+)["']/i);
    const url = match?.[1] ? String(match[1]).trim() : '';
    const safeUrl = url || '';
    const storageMatch = el.html.match(/data-storage-path=["']([^"']+)["']/i);
    const storagePath = storageMatch?.[1] ? String(storageMatch[1]).trim() : '';
    const kindMatch = el.html.match(/data-kind=["']([^"']+)["']/i);
    const kind = kindMatch?.[1] ? String(kindMatch[1]).trim() : undefined;
    return {
      id: createId(),
      type,
      title: 'Image',
      payload: { ...basePayload, url: safeUrl, storagePath: storagePath || undefined, kind },
      previewHtml: safeUrl ? imageToHtml(safeUrl, storagePath || undefined) : sanitizeHtml(el.html),
    };
  }

  if (type === 'title') {
    const text = stripHtml(el.html).trim() || 'Title';
    return {
      id: createId(),
      type,
      title: 'Title',
      payload: { ...basePayload, text },
      previewHtml: sanitizeHtml(`<div style="font-weight:800;font-size:14px;">${escapeHtml(text)}</div>`),
    };
  }

  const html = sanitizeHtml(el.html);
  return {
    id: createId(),
    type,
    title:
      type === 'story'
        ? 'Story / Text'
        : type === 'header'
          ? 'Name & Date'
          : type === 'mcq'
            ? 'MCQ'
            : type === 'wordsearch'
              ? 'Wordsearch'
              : type === 'wordsearch-words'
                ? 'Wordsearch Words'
              : type === 'matching'
                ? 'Matching'
                : type === 'gap-fill'
                  ? 'Gap Fill'
                  : type === 'sentence-transform'
                    ? 'Sentence Transform'
                    : type === 'word-formation'
                      ? 'Word Formation'
                      : type === 'open-ended'
                        ? 'Open Ended'
                        : type === 'custom'
                          ? 'Custom'
                          : type === 'answer-key'
                            ? 'Answer Key'
                            : type === 'table'
                              ? 'Table'
                              : 'Block',
    payload: { ...basePayload, html },
    previewHtml: html,
  };
};

const stripHtml = (html: string): string => {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  } catch {
    return html.replace(/<[^>]*>/g, ' ');
  }
};
