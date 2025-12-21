import React, { useEffect, useMemo, useRef, useState } from 'react';
import interact from 'interactjs';
import { ChevronLeft, ChevronRight, ImagePlus } from 'lucide-react';
import { BlocksTray } from './BlocksTray';
import { PagesCanvas } from './PagesCanvas';
import { CanvasToolbar } from './CanvasToolbar';
import { blockFromElement, createElementFromBlock, escapeHtml } from './designerHelpers';
import { WorksheetBlock, WorksheetBlockType, WorksheetDesignerPage, WorksheetDesignerSettings, WorksheetPlacedElement, createId } from './designerTypes';

export const WorksheetDesigner: React.FC<{
  pages: WorksheetDesignerPage[];
  setPages: React.Dispatch<React.SetStateAction<WorksheetDesignerPage[]>>;
  blocks: WorksheetBlock[];
  setBlocks: React.Dispatch<React.SetStateAction<WorksheetBlock[]>>;
  elements: WorksheetPlacedElement[];
  setElements: React.Dispatch<React.SetStateAction<WorksheetPlacedElement[]>>;
  settings: WorksheetDesignerSettings;
  setSettings: React.Dispatch<React.SetStateAction<WorksheetDesignerSettings>>;
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  onDirty?: (dirty: boolean) => void;
  onSave?: () => void;
  saveStatus?: 'idle' | 'saving' | 'saved';
  onAddImage?: () => void;
  isPublic?: boolean;
  onTogglePublic?: () => void;
}> = ({
  pages,
  setPages,
  blocks,
  setBlocks,
  elements,
  setElements,
  settings,
  setSettings,
  selectedElementId,
  setSelectedElementId,
  onDirty,
  onSave,
  saveStatus,
  onAddImage,
  isPublic,
  onTogglePublic,
}) => {
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const printableRef = useRef<HTMLDivElement | null>(null);
  const didMountRef = useRef(false);
  const dragGhostByTargetRef = useRef(new Map<HTMLElement, { ghost: HTMLElement; startRect: DOMRect }>());
  const trayRef = useRef<HTMLDivElement | null>(null);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [toolbarBounds, setToolbarBounds] = useState<{ left: number; width: number } | null>(null);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const marginPreset = settings?.marginPreset || 'normal';
  const marginMm = marginPreset === 'narrow' ? 12 : marginPreset === 'wide' ? 30 : 20;

  useEffect(() => {
    const el = printableRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (!rect.width) return;
      setToolbarBounds({ left: rect.left, width: rect.width });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [isRightSidebarCollapsed]);

  useEffect(() => {
    if (!onDirty) return;
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    onDirty(true);
  }, [pages, blocks, elements, onDirty]);

  useEffect(() => {
    return () => {
      if (measureRef.current) {
        try {
          measureRef.current.remove();
        } catch {
          // ignore
        }
        measureRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Tray blocks draggable (they snap back after drop)
    const draggable = interact('.ws-block-card').draggable({
      inertia: true,
      listeners: {
        start(event) {
          const target = event.target as HTMLElement;
          target.classList.add('ring-2', 'ring-brand-blue');

          const rect = target.getBoundingClientRect();
          const ghost = target.cloneNode(true) as HTMLElement;
          ghost.classList.add('ws-block-ghost');
          ghost.style.left = `${rect.left}px`;
          ghost.style.top = `${rect.top}px`;
          ghost.style.width = `${rect.width}px`;
          ghost.style.height = `${rect.height}px`;
          ghost.style.transform = 'translate(0px, 0px)';
          ghost.setAttribute('data-x', '0');
          ghost.setAttribute('data-y', '0');
          document.body.appendChild(ghost);
          dragGhostByTargetRef.current.set(target, { ghost, startRect: rect });

          // Keep the *real* draggable moving (for dropzone hit-testing),
          // but visually hide it because it can get clipped by the tray scroll container.
          target.setAttribute('data-x', '0');
          target.setAttribute('data-y', '0');
          target.style.transform = 'translate(0px, 0px)';
          target.style.opacity = '0';
          target.style.willChange = 'transform';
        },
        move(event) {
          const target = event.target as HTMLElement;
          const entry = dragGhostByTargetRef.current.get(target);
          const ghost = entry?.ghost;
          const x = (parseFloat(target.getAttribute('data-x') || '0') || 0) + event.dx;
          const y = (parseFloat(target.getAttribute('data-y') || '0') || 0) + event.dy;

          // Move real draggable for accurate dropzone detection
          target.style.transform = `translate(${x}px, ${y}px)`;
          target.setAttribute('data-x', String(x));
          target.setAttribute('data-y', String(y));

          // Move ghost for the user to see
          if (ghost) {
            ghost.style.transform = `translate(${x}px, ${y}px)`;
            ghost.setAttribute('data-x', String(x));
            ghost.setAttribute('data-y', String(y));
          }

          const pe = event as any;
          const clientX =
            pe?.clientX ??
            pe?.pageX ??
            pe?.interaction?.coords?.cur?.client?.x ??
            pe?.interaction?.coords?.cur?.page?.x ??
            0;
          const clientY =
            pe?.clientY ??
            pe?.pageY ??
            pe?.interaction?.coords?.cur?.client?.y ??
            pe?.interaction?.coords?.cur?.page?.y ??
            0;
          if (clientX && clientY) lastPointerRef.current = { x: clientX, y: clientY };
        },
        end(event) {
          const target = event.target as HTMLElement;
          target.classList.remove('ring-2', 'ring-brand-blue');
          const entry = dragGhostByTargetRef.current.get(target);
          if (entry?.ghost) {
            try {
              entry.ghost.remove();
            } catch {
              // ignore
            }
          }
          dragGhostByTargetRef.current.delete(target);

          // Reset real draggable
          target.style.transform = 'translate(0px, 0px)';
          target.style.opacity = '';
          target.style.willChange = '';
          target.setAttribute('data-x', '0');
          target.setAttribute('data-y', '0');
        },
      },
    });

    // Pages dropzones
    const dropzone = interact('.ws-page-inner').dropzone({
      accept: '.ws-block-card',
      overlap: 0.15,
      ondrop(event) {
        const pageInner = event.target as HTMLElement;
        const pageId = pageInner.getAttribute('data-page-id') || '';
        const related = event.relatedTarget as HTMLElement;
        const blockId = related?.getAttribute('data-block-id') || '';
        const block = blocks.find((b) => b.id === blockId);
        if (!pageId || !block) return;

        const rect = pageInner.getBoundingClientRect();
        const dragEvent = (event as any).dragEvent as any;
        const pointer = lastPointerRef.current;
        const clientX = dragEvent?.clientX ?? dragEvent?.pageX ?? pointer?.x ?? rect.left + 20;
        const clientY = dragEvent?.clientY ?? dragEvent?.pageY ?? pointer?.y ?? rect.top + 20;
        const dropX = clientX - rect.left;
        const dropY = clientY - rect.top;

        const x = Math.max(0, Math.min(dropX, rect.width - 20));
        const y = Math.max(0, Math.min(dropY, rect.height - 20));

        const next = createElementFromBlock({
          block,
          pageId,
          x,
          y,
          pageInnerSize: { width: rect.width, height: rect.height },
        });
        setElements((prev) => [...prev, next]);
        setSelectedElementId(next.id);
        setBlocks((prev) => prev.filter((b) => b.id !== blockId));
      },
    });

    return () => {
      draggable.unset();
      dropzone.unset();
      for (const entry of dragGhostByTargetRef.current.values()) {
        try {
          entry.ghost.remove();
        } catch {
          // ignore
        }
      }
      dragGhostByTargetRef.current.clear();
    };
  }, [blocks, setBlocks, setElements, setSelectedElementId]);

  useEffect(() => {
    if (!trayRef.current) return;
    const dropzone = interact(trayRef.current).dropzone({
      accept: '.ws-placed-element',
      overlap: 'pointer',
      ondrop(event) {
        const target = event.relatedTarget as HTMLElement | null;
        const id = target?.getAttribute('data-element-id') || '';
        if (!id) return;
        const element = elements.find((e) => e.id === id);
        if (!element) return;
        const block = blockFromElement(element);
        setBlocks((prev) => [block, ...prev]);
        setElements((prev) => prev.filter((e) => e.id !== id));
        if (selectedElementId === id) setSelectedElementId(null);
        if (editingElementId === id) setEditingElementId(null);
      },
    });

    return () => {
      dropzone.unset();
    };
  }, [elements, editingElementId, selectedElementId, setBlocks, setElements, setSelectedElementId]);

  const selected = useMemo(
    () => (selectedElementId ? elements.find((e) => e.id === selectedElementId) ?? null : null),
    [elements, selectedElementId]
  );

  const commitElement = (id: string, patch: Partial<WorksheetPlacedElement>) => {
    setElements((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedElementId || editingElementId) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName))) return;

      const step = 1;
      let dx = 0;
      let dy = 0;
      if (event.key === 'ArrowLeft') dx = -step;
      if (event.key === 'ArrowRight') dx = step;
      if (event.key === 'ArrowUp') dy = -step;
      if (event.key === 'ArrowDown') dy = step;
      if (!dx && !dy) return;

      event.preventDefault();
      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== selectedElementId) return el;
          return { ...el, x: el.x + dx, y: el.y + dy };
        })
      );
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingElementId, selectedElementId, setElements]);

  const changeSelectedStyles = (patch: any) => {
    if (!selected) return;
    commitElement(selected.id, { styles: { ...(selected.styles || {}), ...patch } });
  };

  const deleteSelected = () => {
    if (!selected) return;
    setElements((prev) => prev.filter((e) => e.id !== selected.id));
    setSelectedElementId(null);
    setEditingElementId(null);
  };

  const sendSelectedToTray = () => {
    if (!selected) return;
    const block = blockFromElement(selected);
    setBlocks((prev) => [block, ...prev]);
    setElements((prev) => prev.filter((e) => e.id !== selected.id));
    setSelectedElementId(null);
    setEditingElementId(null);
  };

  function isSplittableType(type?: WorksheetBlockType) {
    return [
      'story',
      'mcq',
      'gap-fill',
      'sentence-transform',
      'word-formation',
      'open-ended',
      'custom',
      'answer-key',
    ].includes(type || '');
  }

  const canSplitSelected = Boolean(selected && isSplittableType(selected.type) && !selected.splitGroupId);
  const canMergeSelected =
    Boolean(selected?.splitGroupId) &&
    elements.some((el) => el.splitGroupId === selected?.splitGroupId && el.id !== selected?.id);

  const splitSelectedElement = () => {
    if (!selected || !isSplittableType(selected.type)) return;
    const pageInner = document.querySelector(`[data-page-id="${selected.pageId}"]`) as HTMLElement | null;
    if (!pageInner) return;
    const rect = pageInner.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const styles = window.getComputedStyle(pageInner);
    const padLeft = parseFloat(styles.paddingLeft || '0') || 0;
    const padRight = parseFloat(styles.paddingRight || '0') || 0;
    const padTop = parseFloat(styles.paddingTop || '0') || 0;
    const padBottom = parseFloat(styles.paddingBottom || '0') || 0;
    const contentWidth = Math.max(0, rect.width - padLeft - padRight);
    const contentHeight = Math.max(0, rect.height - padTop - padBottom);
    if (!contentWidth || !contentHeight) return;
    const originX = padLeft;
    const originY = padTop;
    const maxY = originY + contentHeight;

    const firstMaxHeight = Math.max(50, rect.height - selected.y);
    const chunks = splitIntoChunks({
      html: selected.html,
      styles: selected.styles,
      width: selected.w,
      firstMaxHeight,
      fullMaxHeight: rect.height,
    });

    if (chunks.length <= 1) return;

    const groupId = createId();
    const pageIds = pages.map((p) => p.id);
    let pageIndex = pageIds.indexOf(selected.pageId);
    if (pageIndex < 0) pageIndex = 0;

    const nextPages = [...pages];
    const nextElements: WorksheetPlacedElement[] = [];
    let cursorY = selected.y;

    chunks.forEach((chunk, idx) => {
      if (idx > 0) {
        pageIndex += 1;
        if (!nextPages[pageIndex]) {
          nextPages.push({ id: createId() });
        }
        cursorY = 0;
      }
      nextElements.push({
        ...selected,
        id: createId(),
        pageId: nextPages[pageIndex].id,
        y: cursorY,
        h: Math.max(50, chunk.height || selected.h),
        html: chunk.html,
        splitGroupId: groupId,
        splitIndex: idx,
      });
    });

    setPages(nextPages);
    setElements((prev) => {
      const without = prev.filter((e) => e.id !== selected.id);
      return [...without, ...nextElements];
    });
    setSelectedElementId(nextElements[0]?.id || null);
    setEditingElementId(null);
  };

  const mergeSelectedGroup = () => {
    if (!selected?.splitGroupId) return;
    const groupId = selected.splitGroupId;
    const group = elements.filter((el) => el.splitGroupId === groupId);
    if (group.length < 2) return;

    const pageOrder = new Map(pages.map((p, idx) => [p.id, idx]));
    const ordered = [...group].sort((a, b) => {
      const pageA = pageOrder.get(a.pageId) ?? 0;
      const pageB = pageOrder.get(b.pageId) ?? 0;
      if (pageA !== pageB) return pageA - pageB;
      if ((a.splitIndex ?? 0) !== (b.splitIndex ?? 0)) return (a.splitIndex ?? 0) - (b.splitIndex ?? 0);
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });

    const mergedHtml = mergeSplitHtml(ordered.map((el) => el.html));
    const first = ordered[0];
    const mergedHeight = measureElementHeight(mergedHtml, first.styles, first.w);

    const mergedElement: WorksheetPlacedElement = {
      ...first,
      id: createId(),
      html: mergedHtml,
      h: Math.max(50, mergedHeight || first.h),
      splitGroupId: undefined,
      splitIndex: undefined,
    };

    setElements((prev) => {
      const without = prev.filter((el) => el.splitGroupId !== groupId);
      return [...without, mergedElement];
    });
    setSelectedElementId(mergedElement.id);
    setEditingElementId(null);
  };

  const measureElementHeight = (html: string, styles: WorksheetPlacedElement['styles'], width: number) => {
    if (!measureRef.current) {
      const el = document.createElement('div');
      el.style.position = 'fixed';
      el.style.left = '-10000px';
      el.style.top = '0';
      el.style.visibility = 'hidden';
      el.style.pointerEvents = 'none';
      el.style.zIndex = '-1';
      el.style.boxSizing = 'border-box';
      el.className = 'ws-element-content ws-measure-content';
      document.body.appendChild(el);
      measureRef.current = el;
    }

    const el = measureRef.current;
    if (el.className !== 'ws-element-content ws-measure-content') {
      el.className = 'ws-element-content ws-measure-content';
    }
    const s = styles || {};
    el.style.width = `${Math.max(0, width)}px`;
    el.style.fontFamily = s.fontFamily || 'Quicksand, sans-serif';
    el.style.fontSize = s.fontSize || '12px';
    el.style.fontWeight = s.fontWeight || '400';
    el.style.fontStyle = s.fontStyle || 'normal';
    el.style.textDecoration = s.textDecoration || 'none';
    el.style.textAlign = s.textAlign || 'left';
    el.style.lineHeight = s.lineHeight || '1.35';
    el.style.color = s.color || '#0f172a';
    el.style.padding = s.padding || '12px';
    el.style.boxSizing = 'border-box';
    el.style.whiteSpace = 'normal';
    el.style.overflow = 'visible';
    el.innerHTML = html;
    return Math.ceil(el.scrollHeight || 0);
  };

  function buildSplitSpec(html: string) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;

    const maybeContainer =
      wrapper.children.length === 1 && wrapper.firstElementChild instanceof HTMLElement
        ? (wrapper.firstElementChild as HTMLElement)
        : wrapper;

    const listChild = Array.from(maybeContainer.children).find(
      (el) => el.tagName === 'OL' || el.tagName === 'UL'
    ) as HTMLElement | undefined;

    if (listChild) {
      const listIndex = Array.from(maybeContainer.children).indexOf(listChild);
      const trailing = Array.from(maybeContainer.children)
        .slice(listIndex + 1)
        .filter((el) => (el.textContent || '').trim().length > 0);

      if (trailing.length === 0) {
        const headingNodes = Array.from(maybeContainer.childNodes)
          .slice(0, listIndex)
          .filter((node) => (node.textContent || '').trim().length > 0);
        const headingHtml = headingNodes
          .map((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              return `<p>${escapeHtml(node.textContent || '')}</p>`;
            }
            return (node as Element).outerHTML || '';
          })
          .join('');

        const items = Array.from(listChild.children)
          .filter((node) => (node as HTMLElement).tagName === 'LI')
          .map((li) => (li as HTMLElement).outerHTML || '')
          .filter(Boolean);

        if (items.length > 1) {
          const tag = listChild.tagName.toLowerCase();
          const rawStart = tag === 'ol' ? listChild.getAttribute('start') : null;
          const baseStart =
            tag === 'ol'
              ? Math.max(1, Number.parseInt(rawStart || '1', 10) || 1)
              : 1;
          const attrParts = Array.from(listChild.attributes)
            .filter((attr) => !(tag === 'ol' && attr.name.toLowerCase() === 'start'))
            .map((attr) => `${attr.name}="${String(attr.value).replace(/"/g, '&quot;')}"`);
          const listClose = `</${tag}>`;
          return {
            kind: 'list' as const,
            items,
            baseStart,
            tag,
            build: (chunkItems: string[], includeHeading: boolean, startIndex?: number) => {
              const parts = [...attrParts];
              if (tag === 'ol') {
                const effectiveStart =
                  typeof startIndex === 'number' && Number.isFinite(startIndex)
                    ? Math.max(1, Math.floor(startIndex))
                    : baseStart;
                if (effectiveStart > 1) {
                  parts.push(`start="${effectiveStart}"`);
                }
              }
              const open = `<${tag}${parts.length ? ` ${parts.join(' ')}` : ''}>`;
              return `${includeHeading ? headingHtml : ''}${open}${chunkItems.join('')}${listClose}`;
            },
          };
        }
      }
    }

    const nodes = Array.from(wrapper.childNodes).filter((node) => (node.textContent || '').trim().length > 0);
    const units = nodes.map((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return `<p>${escapeHtml(node.textContent || '')}</p>`;
      }
      return (node as Element).outerHTML || '';
    });

    if (units.length <= 1) return null;

    return {
      kind: 'nodes' as const,
      items: units,
      build: (chunkItems: string[]) => chunkItems.join(''),
    };
  };

  function splitIntoChunks(opts: {
    html: string;
    styles: WorksheetPlacedElement['styles'];
    width: number;
    firstMaxHeight: number;
    fullMaxHeight: number;
  }) {
    const spec = buildSplitSpec(opts.html);
    if (!spec) return [{ html: opts.html, height: measureElementHeight(opts.html, opts.styles, opts.width) }];

    const chunks: Array<{ html: string; height: number }> = [];
    let index = 0;
    let chunkIndex = 0;

    while (index < spec.items.length) {
      const maxHeight = chunkIndex === 0 ? opts.firstMaxHeight : opts.fullMaxHeight;
      let chunkItems: string[] = [];
      let bestHtml = '';
      let bestHeight = 0;
      const chunkStartIndex = index;

      while (index < spec.items.length) {
        chunkItems.push(spec.items[index]);
        const testHtml =
          spec.kind === 'list'
            ? spec.build(
                chunkItems,
                chunkIndex === 0,
                (spec as any).baseStart ? (spec as any).baseStart + chunkStartIndex : undefined
              )
            : spec.build(chunkItems);
        const height = measureElementHeight(testHtml, opts.styles, opts.width);
        if (height <= maxHeight || chunkItems.length === 1) {
          bestHtml = testHtml;
          bestHeight = height;
          index += 1;
          if (height > maxHeight && chunkItems.length === 1) {
            break;
          }
        } else {
          chunkItems.pop();
          break;
        }
      }

      if (!bestHtml && index < spec.items.length) {
        const fallbackItems = [spec.items[index]];
        const fallbackHtml =
          spec.kind === 'list'
            ? spec.build(
                fallbackItems,
                chunkIndex === 0,
                (spec as any).baseStart ? (spec as any).baseStart + index : undefined
              )
            : spec.build(fallbackItems);
        bestHtml = fallbackHtml;
        bestHeight = measureElementHeight(bestHtml, opts.styles, opts.width);
        index += 1;
      }

      chunks.push({ html: bestHtml, height: bestHeight });
      chunkIndex += 1;
    }

    return chunks;
  }

  function mergeSplitHtml(parts: string[]) {
    if (parts.length === 0) return '';
    const parsed = parts.map((html) => {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = html;
      const list = wrapper.querySelector('ol, ul') as HTMLElement | null;
      return { wrapper, list };
    });

    const allList = parsed.every((p) => p.list);
    const listTag = parsed[0]?.list?.tagName;

    if (allList && listTag && parsed.every((p) => p.list?.tagName === listTag)) {
      const firstWrapper = parsed[0].wrapper;
      const firstList = parsed[0].list!;
      const headingWrapper = firstWrapper.cloneNode(true) as HTMLElement;
      const headingList = headingWrapper.querySelector('ol, ul');
      if (headingList) headingList.remove();
      const headingHtml = headingWrapper.innerHTML;

      const attrs = Array.from(firstList.attributes)
        .map((attr) => `${attr.name}="${String(attr.value).replace(/"/g, '&quot;')}"`)
        .join(' ');
      const tag = listTag.toLowerCase();
      const listOpen = `<${tag}${attrs ? ` ${attrs}` : ''}>`;
      const listClose = `</${tag}>`;

      const items = parsed
        .flatMap((p) => Array.from(p.list!.children))
        .filter((node) => (node as HTMLElement).tagName === 'LI')
        .map((li) => (li as HTMLElement).outerHTML || '')
        .filter(Boolean)
        .join('');

      return `${headingHtml}${listOpen}${items}${listClose}`;
    }

    return parts.join('');
  }

  const suggestOptimalDistribution = async () => {
    if (blocks.length === 0 && elements.length === 0) return;
    const ok = window.confirm('This will reflow all placed elements and blocks. Continue?');
    if (!ok) return;

    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {
        // ignore font loading errors
      }
    }

    const pageInner = document.querySelector('.ws-page-inner') as HTMLElement | null;
    if (!pageInner) return;
    const rect = pageInner.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const styles = window.getComputedStyle(pageInner);
    const padLeft = parseFloat(styles.paddingLeft || '0') || 0;
    const padRight = parseFloat(styles.paddingRight || '0') || 0;
    const padTop = parseFloat(styles.paddingTop || '0') || 0;
    const padBottom = parseFloat(styles.paddingBottom || '0') || 0;
    const contentWidth = Math.max(0, rect.width - padLeft - padRight);
    const contentHeight = Math.max(0, rect.height - padTop - padBottom);
    if (!contentWidth || !contentHeight) return;
    const originX = padLeft;
    const originY = padTop;
    const maxY = originY + contentHeight;

    const pageOrder = new Map(pages.map((p, idx) => [p.id, idx]));
    const orderedElements = [...elements].sort((a, b) => {
      const pageA = pageOrder.get(a.pageId) ?? 0;
      const pageB = pageOrder.get(b.pageId) ?? 0;
      if (pageA !== pageB) return pageA - pageB;
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });

    const orderedBlocks = [...orderedElements.map(blockFromElement), ...blocks];
    const isLogoBlock = (block: WorksheetBlock) => block.type === 'image' && block.payload?.kind === 'logo';
    const logoBlock = orderedBlocks.find(isLogoBlock) || null;
    const headerBlock = orderedBlocks.find((b) => b.type === 'header') || null;
    const titleBlock = orderedBlocks.find((b) => b.type === 'title') || null;
    const answerKeyBlocks = orderedBlocks.filter((b) => b.type === 'answer-key');
    const handledIds = new Set<string>();
    if (logoBlock) handledIds.add(logoBlock.id);
    if (headerBlock) handledIds.add(headerBlock.id);
    if (titleBlock) handledIds.add(titleBlock.id);
    for (const b of answerKeyBlocks) handledIds.add(b.id);
    const pageInnerSize = { width: contentWidth, height: contentHeight };
    const gap = 16;
    const minHeight = 50;
    let overflowed = false;

    const nextPages: WorksheetDesignerPage[] = [
      { id: pages[0]?.id ?? createId() },
    ];
    const nextElements: WorksheetPlacedElement[] = [];
    let pageIndex = 0;
    let cursorY = originY;
    let rowBottom = originY;
    let logoPlacedWidth = 0;
    let logoPlacedHeight = 0;

    if (logoBlock) {
      const element = createElementFromBlock({
        block: logoBlock,
        pageId: nextPages[pageIndex].id,
        x: originX,
        y: originY,
        pageInnerSize,
      });
      const maxLogoWidth = Math.min(140, Math.max(90, Math.round(contentWidth * 0.2)));
      const targetW = Math.min(element.w, maxLogoWidth);
      const ratio = element.w > 0 ? element.h / element.w : 0.6;
      const targetH = Math.max(40, Math.round(targetW * (Number.isFinite(ratio) && ratio > 0 ? ratio : 0.6)));
      const x = originX + Math.max(0, contentWidth - targetW);
      nextElements.push({
        ...element,
        pageId: nextPages[pageIndex].id,
        x,
        y: originY,
        w: targetW,
        h: targetH,
      });
      logoPlacedWidth = targetW;
      logoPlacedHeight = targetH;
      rowBottom = Math.max(rowBottom, originY + targetH);
    }

    if (headerBlock) {
      const element = createElementFromBlock({
        block: headerBlock,
        pageId: nextPages[pageIndex].id,
        x: originX,
        y: originY,
        pageInnerSize,
      });
      const headerWidth = Math.max(200, contentWidth - (logoPlacedWidth ? logoPlacedWidth + gap : 0));
      const measuredHeight = measureElementHeight(element.html, element.styles, headerWidth);
      const h = Math.max(minHeight, measuredHeight || element.h);
      nextElements.push({
        ...element,
        pageId: nextPages[pageIndex].id,
        x: originX,
        y: originY,
        w: headerWidth,
        h,
      });
      rowBottom = Math.max(rowBottom, originY + h, originY + logoPlacedHeight);
    }

    if (logoBlock || headerBlock) {
      cursorY = rowBottom + gap;
    }

    if (titleBlock) {
      const element = createElementFromBlock({
        block: titleBlock,
        pageId: nextPages[pageIndex].id,
        x: originX,
        y: cursorY,
        pageInnerSize,
      });
      const w = contentWidth;
      const measuredHeight = measureElementHeight(element.html, element.styles, w);
      const h = Math.max(minHeight, measuredHeight || element.h);
      nextElements.push({
        ...element,
        pageId: nextPages[pageIndex].id,
        x: originX,
        y: cursorY,
        w,
        h,
      });
      cursorY += h + gap;
    }

    const contentBlocks = orderedBlocks.filter((b) => !handledIds.has(b.id));

    contentBlocks.forEach((block) => {
      let element = createElementFromBlock({
        block,
        pageId: nextPages[pageIndex].id,
        x: originX,
        y: cursorY,
        pageInnerSize,
      });

      const w = block.type === 'image' ? Math.min(contentWidth, element.w) : contentWidth;
      let x = originX;
      if (block.type === 'image' && w < contentWidth) {
        x = originX + Math.max(0, Math.round((contentWidth - w) / 2));
      }

      const isSplittable = isSplittableType(block.type);
      if (isSplittable) {
        let firstMaxHeight = maxY - cursorY;
        if (firstMaxHeight < minHeight) {
          pageIndex += 1;
          nextPages.push({ id: createId() });
          cursorY = originY;
          firstMaxHeight = contentHeight;
        }

        const chunks = splitIntoChunks({
          html: element.html,
          styles: element.styles,
          width: w,
          firstMaxHeight: Math.max(minHeight, firstMaxHeight),
          fullMaxHeight: contentHeight,
        });

        if (chunks.length > 1) {
          const groupId = createId();
          chunks.forEach((chunk, idx) => {
            if (cursorY + chunk.height > maxY && cursorY > originY) {
              pageIndex += 1;
              nextPages.push({ id: createId() });
              cursorY = originY;
            }
            const h = Math.max(minHeight, Math.min(chunk.height || element.h, contentHeight));
            if (h >= contentHeight) overflowed = true;

            nextElements.push({
              ...element,
              id: createId(),
              pageId: nextPages[pageIndex].id,
              x,
              y: cursorY,
              w,
              h,
              html: chunk.html,
              splitGroupId: groupId,
              splitIndex: idx,
            });
            cursorY += h + gap;
          });
          return;
        }
      }

      const measuredHeight =
        block.type === 'image' ? element.h : measureElementHeight(element.html, element.styles, w);
      let h = Math.max(minHeight, measuredHeight || element.h);

      if (cursorY + h > maxY && cursorY > originY) {
        pageIndex += 1;
        nextPages.push({ id: createId() });
        cursorY = originY;
      }

      if (h > contentHeight) {
        h = contentHeight;
        overflowed = true;
      }

      x = Math.max(originX, Math.min(x, originX + Math.max(0, contentWidth - w)));
      element = { ...element, pageId: nextPages[pageIndex].id, x, y: cursorY, w, h };
      nextElements.push(element);
      cursorY += element.h + gap;
    });

    if (answerKeyBlocks.length > 0) {
      if (nextElements.length > 0) {
        pageIndex += 1;
        nextPages.push({ id: createId() });
        cursorY = originY;
      }

      answerKeyBlocks.forEach((block) => {
        let element = createElementFromBlock({
          block,
          pageId: nextPages[pageIndex].id,
          x: originX,
          y: cursorY,
          pageInnerSize,
        });

        const w = Math.min(contentWidth, element.w);
        const measuredHeight = measureElementHeight(element.html, element.styles, w);
        let h = Math.max(minHeight, measuredHeight || element.h);

        if (cursorY + h > maxY && cursorY > originY) {
          pageIndex += 1;
          nextPages.push({ id: createId() });
          cursorY = originY;
        }

        if (h > contentHeight) {
          h = contentHeight;
          overflowed = true;
        }

        element = { ...element, pageId: nextPages[pageIndex].id, x: originX, y: cursorY, w, h };
        nextElements.push(element);
        cursorY += element.h + gap;
      });
    }

    setPages(nextPages);
    setElements(nextElements);
    setBlocks([]);
    setSelectedElementId(null);
    setEditingElementId(null);

    if (overflowed) {
      window.alert('Some blocks are longer than a single page. They were capped to fit within the margins.');
    }
  };

  const deletePage = (pageId: string) => {
    setPages((prev) => {
      const next = prev.filter((p) => p.id !== pageId);
      return next.length ? next : prev;
    });
    setElements((prev) => prev.filter((e) => e.pageId !== pageId));
    if (selected?.pageId === pageId) {
      setSelectedElementId(null);
      setEditingElementId(null);
    }
  };

  const focusSelectedContent = () => {
    if (!selected) return;
    setEditingElementId(selected.id);
    window.setTimeout(() => {
      const root = document.querySelector(`[data-element-id="${selected.id}"]`) as HTMLElement | null;
      const content = root?.querySelector('.ws-element-content') as HTMLElement | null;
      content?.focus();
    }, 0);
  };

  const selectElementId = (id: string | null) => {
    setSelectedElementId(id);
    setEditingElementId((prev) => (id && prev === id ? prev : null));
  };

  return (
    <div className="flex-1 flex min-w-0">
      <style>{DESIGNER_CSS}</style>

      <div id="printable-area" ref={printableRef} className="flex-1 min-w-0 relative">
        <PagesCanvas
          pages={pages}
          elements={elements}
          marginMm={marginMm}
          selectedElementId={selectedElementId}
          onSelectElementId={selectElementId}
          onCommitElement={commitElement}
          onAddPage={() => setPages((prev) => [...prev, { id: createId() }])}
          onDeletePage={deletePage}
          editingElementId={editingElementId}
          onStartEditing={(id) => {
            setSelectedElementId(id);
            setEditingElementId(id);
            window.setTimeout(() => {
              const root = document.querySelector(`[data-element-id="${id}"]`) as HTMLElement | null;
              const content = root?.querySelector('.ws-element-content') as HTMLElement | null;
              content?.focus();
            }, 0);
          }}
          onStopEditing={() => setEditingElementId(null)}
        />

        {selected ? (
          <div
            className="no-print ws-toolbar-fixed pointer-events-none"
            style={{
              left: toolbarBounds?.left ?? 0,
              width: toolbarBounds?.width ?? '100%',
            }}
          >
            <div className="pointer-events-auto">
              <CanvasToolbar
                selected={selected}
                editing={editingElementId === selected?.id}
                onChangeStyles={changeSelectedStyles}
                onDelete={deleteSelected}
                onFocusContent={focusSelectedContent}
                onSendToTray={sendSelectedToTray}
                onSplit={splitSelectedElement}
                onMerge={mergeSelectedGroup}
                canSplit={canSplitSelected}
                canMerge={canMergeSelected}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div
        className={`no-print ${isRightSidebarCollapsed ? 'w-14' : 'w-80 max-w-[360px]'} border-l border-slate-200 bg-white flex flex-col shrink-0 sticky self-start`}
        style={{ top: '4rem' }}
      >
        <div className="px-3 py-2 border-b border-slate-200 bg-white flex items-center justify-between sticky top-0 z-30">
          {!isRightSidebarCollapsed && <div className="text-xs font-bold text-slate-600">Tools</div>}
          <button
            type="button"
            onClick={() => setIsRightSidebarCollapsed((prev) => !prev)}
            title={isRightSidebarCollapsed ? 'Expand toolbar' : 'Collapse toolbar'}
            aria-label={isRightSidebarCollapsed ? 'Expand toolbar' : 'Collapse toolbar'}
            className="p-2 rounded hover:bg-slate-100 text-slate-600"
          >
            {isRightSidebarCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        {!isRightSidebarCollapsed && (
          <div className="flex-1">
            <div className="px-3 py-2 border-b border-slate-200 bg-white space-y-2">
              <button
                type="button"
                onClick={suggestOptimalDistribution}
                className="w-full py-2.5 rounded-xl font-extrabold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
              >
                Suggest Optimal Distribution
              </button>

              <div className="flex items-center gap-2">
                {onSave && (
                  <button
                    type="button"
                    onClick={onSave}
                    className="flex-1 py-2 rounded-xl font-extrabold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm"
                  >
                    {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-2 rounded-xl font-extrabold text-white bg-brand-blue hover:bg-sky-500 shadow-sm"
                >
                  Print / PDF
                </button>
              </div>

              {onAddImage && (
                <button
                  type="button"
                  onClick={onAddImage}
                  className="w-full py-2.5 rounded-xl font-extrabold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-2"
                >
                  <ImagePlus size={16} /> Add Image
                </button>
              )}

              <button
                type="button"
                onClick={() => setPages((prev) => [...prev, { id: createId() }])}
                className="w-full py-2.5 rounded-xl font-extrabold bg-white border-2 border-dashed border-slate-300 hover:bg-slate-50 text-slate-700"
                title="Add a new A4 page"
              >
                + Add Page ({pages.length})
              </button>

              <label className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700 pt-1">
                <span>Print margins</span>
                <select
                  value={marginPreset}
                  onChange={(e) => setSettings((prev) => ({ ...prev, marginPreset: e.target.value as any }))}
                  className="p-2 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-700"
                  title="Page margin preset"
                >
                  <option value="narrow">Narrow</option>
                  <option value="normal">Normal</option>
                  <option value="wide">Wide</option>
                </select>
              </label>

              <div className="pt-1">
                <div className="text-[11px] font-extrabold text-slate-600 mb-1">Pages</div>
                <div className="space-y-1">
                  {pages.map((p, idx) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                    >
                      <span className="font-bold text-slate-700">Page {idx + 1}</span>
                      {pages.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete page ${idx + 1}? Elements on this page will be removed.`)) {
                              deletePage(p.id);
                            }
                          }}
                          className="px-2 py-1 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 text-[11px] font-extrabold text-red-700"
                          title="Delete page"
                        >
                          Delete
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">-</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {onTogglePublic && (
              <div className="px-3 py-2 border-b border-slate-200 bg-white">
                <label className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700">
                  <span>Community visibility</span>
                  <button
                    type="button"
                    onClick={onTogglePublic}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold border ${
                      isPublic
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                    title="Toggle public/private"
                  >
                    {isPublic ? 'Public' : 'Private'}
                  </button>
                </label>
              </div>
            )}

            <div ref={trayRef} className="flex-1 min-h-0">
              <BlocksTray
                blocks={blocks}
                onClear={() => {
                  if (window.confirm('Clear all blocks?')) setBlocks([]);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DESIGNER_CSS = `
  .ws-page {
    width: 210mm;
    height: 297mm;
    border-radius: 16px;
    overflow: visible;
  }

  .ws-page-inner {
    width: 100%;
    height: 100%;
    padding: var(--ws-page-pad, 20mm);
    box-sizing: border-box;
    position: relative;
    overflow: visible;
  }

  .ws-page-chrome {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 20;
  }

  .ws-page-margin-guides {
    position: absolute;
    inset: var(--ws-page-pad, 20mm);
    border: 1px dashed rgba(148, 163, 184, 0.9);
    border-radius: 10px;
  }

  .ws-ruler {
    position: absolute;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(6px);
    border-color: rgba(226, 232, 240, 0.9);
  }

  .ws-ruler-top, .ws-ruler-bottom {
    left: 0;
    right: 0;
    height: 14px;
    border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  }
  .ws-ruler-top { top: 0; }
  .ws-ruler-bottom {
    bottom: 0;
    border-top: 1px solid rgba(226, 232, 240, 0.9);
    border-bottom: none;
  }

  .ws-ruler-left, .ws-ruler-right {
    top: 0;
    bottom: 0;
    width: 14px;
    border-right: 1px solid rgba(226, 232, 240, 0.9);
  }
  .ws-ruler-left { left: 0; }
  .ws-ruler-right {
    right: 0;
    border-left: 1px solid rgba(226, 232, 240, 0.9);
    border-right: none;
  }

  .ws-ruler-top, .ws-ruler-bottom {
    background-image:
      repeating-linear-gradient(
        to right,
        rgba(148, 163, 184, 0.0) 0,
        rgba(148, 163, 184, 0.0) 9mm,
        rgba(100, 116, 139, 0.65) 9mm,
        rgba(100, 116, 139, 0.65) 10mm
      ),
      repeating-linear-gradient(
        to right,
        rgba(148, 163, 184, 0.0) 0,
        rgba(148, 163, 184, 0.0) 4mm,
        rgba(148, 163, 184, 0.55) 4mm,
        rgba(148, 163, 184, 0.55) 5mm
      );
  }

  .ws-ruler-left, .ws-ruler-right {
    background-image:
      repeating-linear-gradient(
        to bottom,
        rgba(148, 163, 184, 0.0) 0,
        rgba(148, 163, 184, 0.0) 9mm,
        rgba(100, 116, 139, 0.65) 9mm,
        rgba(100, 116, 139, 0.65) 10mm
      ),
      repeating-linear-gradient(
        to bottom,
        rgba(148, 163, 184, 0.0) 0,
        rgba(148, 163, 184, 0.0) 4mm,
        rgba(148, 163, 184, 0.55) 4mm,
        rgba(148, 163, 184, 0.55) 5mm
      );
  }

  .ws-placed-element {
    box-sizing: border-box;
    touch-action: none;
  }

  .ws-placed-element.is-active::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 1px solid #cbd5e1;
    border-radius: inherit;
    pointer-events: none;
  }

  .ws-element-content h1, .ws-element-content h2, .ws-element-content h3 {
    margin: 0 0 8px 0;
    font-weight: 800;
  }

  .ws-element-content p { margin: 0 0 8px 0; }
  .ws-element-content ul, .ws-element-content ol {
    padding-left: 1.25rem;
    margin: 0 0 8px 0;
    list-style-position: inside;
  }
  .ws-element-content ul { list-style-type: disc; }
  .ws-element-content ol { list-style-type: decimal; }
  .ws-element-content ol.ws-options { list-style-type: upper-alpha; margin-top: 4px; }
  .ws-element-content ol.ws-options.ws-options-numeric { list-style-type: decimal; }
  .ws-element-content li { margin: 0 0 4px 0; }

  .ws-header-fields {
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }
  .ws-header-fields div {
    flex: 1;
    display: flex;
    align-items: flex-end;
    gap: 8px;
  }
  .ws-line {
    flex: 1;
    min-width: 120px;
    height: 0.9em;
    border-bottom: 1px solid #94a3b8;
  }

  .ws-element-content .ws-table td, .ws-element-content .ws-table th {
    border: 1px solid #cbd5e1;
    padding: 6px;
    vertical-align: top;
  }
  .ws-element-content .ws-table th {
    background: #f1f5f9;
    font-weight: 700;
  }

  .ws-element-content .ws-wordsearch-table td {
    text-align: center;
    font-weight: 600;
    letter-spacing: 0.08em;
  }
  .ws-wordsearch-words { margin-top: 8px; font-size: 12px; }
  .ws-wordsearch-word { margin-right: 6px; }

  .ws-element-content .ws-matching-table {
    width: 100%;
    border-collapse: collapse;
  }
  .ws-element-content .ws-matching-table td {
    border: 1px solid transparent;
    padding: 6px 8px;
    vertical-align: middle;
  }

  .ws-element-content .ws-image {
    width: 100%;
    height: 100%;
    display: block;
  }
  .ws-element-content .ws-image-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center;
    display: block;
  }

  .ws-block-ghost {
    position: fixed;
    z-index: 999999;
    pointer-events: none;
    box-shadow: 0 18px 40px rgba(15,23,42,0.18);
    border-radius: 12px;
    opacity: 0.98;
  }

  .ws-canvas-toolbar {
    width: 100%;
  }

  .ws-toolbar-fixed {
    position: fixed;
    bottom: 14px;
    z-index: 10050;
    display: flex;
    justify-content: center;
    padding: 0 16px;
  }

  @media print {
    @page { size: A4; margin: 0; }
    html, body { background: white !important; }

    .ws-page {
      box-shadow: none !important;
      border: none !important;
      break-after: page;
      page-break-after: always;
    }
    .ws-page:last-child { break-after: auto; page-break-after: auto; }
    .ws-page-inner { overflow: visible; }
    .ws-element-drag-handle, .ws-resize-handle, .ws-placed-element { box-shadow: none !important; }
    .ws-element-drag-handle, .ws-resize-handle { display: none !important; }
    .ws-canvas { background: white !important; overflow: visible !important; }
    .ws-pages-wrap { padding: 0 !important; gap: 0 !important; align-items: flex-start !important; }

    .no-print { display: none !important; }
    #printable-area { width: 100% !important; }

    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
`;
