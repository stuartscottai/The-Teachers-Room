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

const resolveMcqOptionLabelType = (note?: string): 'A' | '1' => {
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
  const words = puzzle.words || [];
  const rows = grid
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell || ''))}</td>`).join('')}</tr>`)
    .join('');
  const wordList = words
    .map((w) => `<span class="ws-wordsearch-word">${escapeHtml(toPlainText(String(w)))}</span>`)
    .join(', ');

  return sanitizeHtml(
    `<div><h3>Wordsearch</h3><table class="ws-table ws-wordsearch-table"><tbody>${rows}</tbody></table><div class="ws-wordsearch-words"><strong>Words:</strong> ${wordList}</div></div>`
  );
};

export const matchingToHtml = (items: WorksheetAiResultV1['matching']): string => {
  const safeItems = items ?? [];
  const rows = safeItems
    .map((item) => {
      const left = escapeHtml(toPlainText(item?.left || ''));
      const right = escapeHtml(toPlainText(item?.right || ''));
      return `<tr><td>${left}</td><td></td><td>${right}</td></tr>`;
    })
    .join('');

  return sanitizeHtml(
    `<div><h3>Matching</h3><table class="ws-matching-table"><tbody>${rows}</tbody></table></div>`
  );
};

export const gapFillToHtml = (items: WorksheetAiResultV1['gapFill']): string => {
  const safeItems = items ?? [];
  const li = safeItems
    .map((item) => {
      const sentence = escapeHtml(toPlainText(item?.sentence || ''));
      return `<li>${sentence}</li>`;
    })
    .join('');

  return sanitizeHtml(`<div><h3>Gap Fill</h3><ol class="ws-gap-fill">${li}</ol></div>`);
};

export const sentenceTransformToHtml = (items: WorksheetAiResultV1['sentenceTransform']): string => {
  const safeItems = items ?? [];
  const li = safeItems
    .map((item) => {
      const prompt = escapeHtml(toPlainText(item?.prompt || ''));
      return `<li><div>${prompt}</div><div>________________________________</div></li>`;
    })
    .join('');

  return sanitizeHtml(`<div><h3>Sentence Transformation</h3><ol class="ws-sentence-transform">${li}</ol></div>`);
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
    .map((item) => `<p>${escapeHtml(toPlainText(item?.text || ''))}</p>`)
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
  if (block.type === 'matching') {
    if (block.payload?.html) return sanitizeHtml(String(block.payload.html));
    return matchingToHtml(block.payload?.items ?? []);
  }
  if (block.type === 'gap-fill') {
    if (block.payload?.html) return sanitizeHtml(String(block.payload.html));
    return gapFillToHtml(block.payload?.items ?? []);
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

  const titleText = String(ai?.title ?? '').trim();
  if (titleText) {
    blocks.push({
      id: createId(),
      type: 'title',
      title: 'Title',
      payload: { text: titleText },
      previewHtml: sanitizeHtml(`<div style="font-weight:800;font-size:14px;">${escapeHtml(titleText)}</div>`),
    });
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

  const activities = config?.activities ?? [];
  const mcqItems = Array.isArray(ai?.mcq) ? ai.mcq : [];
  const wordSearchItems = Array.isArray(ai?.wordSearch) ? ai.wordSearch : [];
  const matchingItems = Array.isArray(ai?.matching) ? ai.matching : [];
  const gapFillItems = Array.isArray(ai?.gapFill) ? ai.gapFill : [];
  const sentenceTransformItems = Array.isArray(ai?.sentenceTransform) ? ai.sentenceTransform : [];
  const wordFormationItems = Array.isArray(ai?.wordFormation) ? ai.wordFormation : [];
  const openEndedItems = Array.isArray(ai?.openEnded) ? ai.openEnded : [];
  const infoSectionItems = Array.isArray(ai?.infoSections) ? ai.infoSections : [];
  const customItems = Array.isArray(ai?.custom) ? ai.custom : [];
  let mcqIndex = 0;
  let wordSearchIndex = 0;
  let matchingIndex = 0;
  let gapFillIndex = 0;
  let sentenceTransformIndex = 0;
  let wordFormationIndex = 0;
  let openEndedIndex = 0;
  let infoSectionIndex = 0;
  let customIndex = 0;
  let tableInserted = false;

  const pushInfoSectionBlock = (section: any) => {
    const title = toPlainText(section?.title ?? '').trim();
    const bodyHtml = String(section?.bodyHtml ?? '').trim();
    const titleHtml = title ? `<h3>${escapeHtml(title)}</h3>` : '';
    const fallbackBody = `<p>${escapeHtml(title ? '' : 'Information')}</p>`;
    const html = sanitizeHtml(`<div>${titleHtml}${bodyHtml || fallbackBody}</div>`);
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
      payload: { html },
      previewHtml: preview,
    });
  };

  const maybeInsertTable = () => {
    if (tableInserted) return;
    if (ai?.table?.headers?.length || ai?.table?.rows?.length) {
      blocks.push({
        id: createId(),
        type: 'table',
        title: 'Table',
        payload: ai.table,
        previewHtml: tableToHtml(ai.table),
      });
      tableInserted = true;
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
          blocks.push({
            id: createId(),
            type: 'wordsearch',
            title: 'Wordsearch',
            payload: { puzzle },
            previewHtml: sanitizeHtml('<div style="font-weight:700;">Wordsearch</div>'),
          });
        }
        return;
      }
      if (act.type === 'matching') {
        const slice = matchingItems.slice(matchingIndex, matchingIndex + count);
        matchingIndex += slice.length;
        if (slice.length > 0) {
          const first = slice[0];
          const preview = sanitizeHtml(
            `<div><div style="font-weight:700;margin-bottom:6px;">Matching</div><div style="font-size:12px;opacity:.85;">${escapeHtml(
              `${toPlainText(first?.left ?? '')} -> ${toPlainText(first?.right ?? '')}`
            )}</div></div>`
          );
          blocks.push({
            id: createId(),
            type: 'matching',
            title: `Matching (${slice.length})`,
            payload: { items: slice },
            previewHtml: preview,
          });
        }
        return;
      }
      if (act.type === 'gap-fill') {
        const slice = gapFillItems.slice(gapFillIndex, gapFillIndex + count);
        gapFillIndex += slice.length;
        if (slice.length > 0) {
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
            payload: { items: slice },
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
        infoSectionIndex += slice.length;
        if (slice.length > 0) {
          slice.forEach(pushInfoSectionBlock);
        }
        return;
      }
      if (act.type === 'custom') {
        const item = customItems[customIndex];
        customIndex += 1;
        if (item) {
          const preview = sanitizeHtml(
            `<div><div style="font-weight:700;margin-bottom:6px;">Custom</div><div style="font-size:12px;opacity:.85;">${escapeHtml(
              toPlainText(item?.text ?? '')
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
        blocks.push({
          id: createId(),
          type: 'wordsearch',
          title: 'Wordsearch',
          payload: { puzzle },
          previewHtml: sanitizeHtml('<div style="font-weight:700;">Wordsearch</div>'),
        });
      }
    }
    if (matchingItems.length > 0) {
      const first = matchingItems[0];
      const preview = sanitizeHtml(
        `<div><div style="font-weight:700;margin-bottom:6px;">Matching</div><div style="font-size:12px;opacity:.85;">${escapeHtml(
          `${toPlainText(first?.left ?? '')} -> ${toPlainText(first?.right ?? '')}`
        )}</div></div>`
      );
      blocks.push({
        id: createId(),
        type: 'matching',
        title: `Matching (${matchingItems.length})`,
        payload: { items: matchingItems },
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
      const preview = sanitizeHtml(
        `<div><div style="font-weight:700;margin-bottom:6px;">Custom</div><div style="font-size:12px;opacity:.85;">${escapeHtml(
          toPlainText(first?.text ?? '')
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
    if (ai?.table?.headers?.length || ai?.table?.rows?.length) {
      blocks.push({
        id: createId(),
        type: 'table',
        title: 'Table',
        payload: ai.table,
        previewHtml: tableToHtml(ai.table),
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
  const w = block.type === 'image' ? baseW : Math.max(200, Math.round(pageInnerSize.width));
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
