import React, { useEffect, useMemo, useRef, useState } from 'react';
import interact from 'interactjs';
import { ChevronLeft, ChevronRight, ImagePlus } from 'lucide-react';
import { BlocksTray } from './BlocksTray';
import { PagesCanvas } from './PagesCanvas';
import { CanvasToolbar } from './CanvasToolbar';
import { blockFromElement, createElementFromBlock, escapeHtml, sanitizeHtml } from './designerHelpers';
import { WorksheetBlock, WorksheetBlockType, WorksheetDesignerDocV1, WorksheetDesignerPage, WorksheetDesignerSettings, WorksheetPlacedElement, createId } from './designerTypes';

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
  onSave?: (docOverride?: WorksheetDesignerDocV1) => void;
  saveStatus?: 'idle' | 'saving' | 'saved';
  onAddImage?: () => void;
  isPublic?: boolean;
  onTogglePublic?: () => void;
  rightSidebarMode?: 'auto' | 'collapsed' | 'expanded';
  isMobile?: boolean;
  infoTemplate?: 'classic' | 'split' | 'grid' | 'minimal' | 'poster' | 'editorial' | 'playful';
  infoTheme?: 'ocean' | 'sunset' | 'studio' | 'retro' | 'mint' | 'midnight';
  layoutMode?: 'single' | 'columns';
  infoLayoutKey?: string | null;
  autoLayoutKey?: string | null;
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
  rightSidebarMode = 'auto',
  isMobile = false,
  infoTemplate = 'classic',
  infoTheme = 'ocean',
  layoutMode = 'single',
  infoLayoutKey = null,
  autoLayoutKey = null,
}) => {
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const printableRef = useRef<HTMLDivElement | null>(null);
  const didMountRef = useRef(false);
  const dragGhostByTargetRef = useRef(new Map<HTMLElement, { ghost: HTMLElement; startRect: DOMRect }>());
  const trayRef = useRef<HTMLDivElement | null>(null);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [toolbarBounds, setToolbarBounds] = useState<{ left: number; width: number } | null>(null);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);
  const [pageScale, setPageScale] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);
  const lastInfoLayoutKeyRef = useRef<string | null>(null);
  const lastAutoLayoutKeyRef = useRef<string | null>(null);
  const lastLayoutModeRef = useRef(layoutMode);
  const undoStackRef = useRef<WorksheetDesignerDocV1[]>([]);
  const redoStackRef = useRef<WorksheetDesignerDocV1[]>([]);
  const liveEditRef = useRef(new Map<string, { html: string; height?: number }>());
  const copiedStylesRef = useRef<WorksheetPlacedElement['styles'] | null>(null);
  const [styleMenu, setStyleMenu] = useState<{ x: number; y: number; targetId: string } | null>(null);
  const styleMenuRef = useRef<HTMLDivElement | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const resolvedRightSidebarCollapsed =
    rightSidebarMode === 'collapsed' ? true : rightSidebarMode === 'expanded' ? false : isRightSidebarCollapsed;
  const canToggleRightSidebar = rightSidebarMode === 'auto';
  const rightSidebarWidthClass = resolvedRightSidebarCollapsed
    ? rightSidebarMode === 'auto'
      ? 'w-14'
      : 'w-0 md:w-14'
    : 'w-80 max-w-[360px]';
  const measureRef = useRef<HTMLDivElement | null>(null);
  const marginPreset = settings?.marginPreset || 'normal';
  const marginMm = marginPreset === 'narrow' ? 12 : marginPreset === 'wide' ? 30 : 20;
  const mobileScaleEnabled = Boolean(isMobile);

  useEffect(() => {
    const el = printableRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (!rect.width) return;
      setToolbarBounds({ left: rect.left, width: rect.width });
      if (isPrinting) {
        setPageScale((prev) => (prev === 1 ? prev : 1));
        return;
      }
      if (mobileScaleEnabled) {
        const available = Math.max(0, rect.width - 32);
        const a4WidthPx = (210 / 25.4) * 96;
        const nextScale = Math.min(1, available / a4WidthPx);
        const safeScale = Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1;
        setPageScale((prev) => (Math.abs(prev - safeScale) < 0.001 ? prev : safeScale));
      } else {
        setPageScale((prev) => (prev === 1 ? prev : 1));
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [resolvedRightSidebarCollapsed, mobileScaleEnabled, isPrinting]);

  useEffect(() => {
    const handleBefore = () => setIsPrinting(true);
    const handleAfter = () => setIsPrinting(false);
    window.addEventListener('beforeprint', handleBefore);
    window.addEventListener('afterprint', handleAfter);
    return () => {
      window.removeEventListener('beforeprint', handleBefore);
      window.removeEventListener('afterprint', handleAfter);
    };
  }, []);

  useEffect(() => {
    if (!onDirty) return;
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    onDirty(true);
  }, [pages, blocks, elements, onDirty]);

  useEffect(() => {
    if (!styleMenu) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (styleMenuRef.current && styleMenuRef.current.contains(target)) return;
      setStyleMenu(null);
    };
    const onScroll = () => setStyleMenu(null);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setStyleMenu(null);
    };
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [styleMenu]);

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
        pushUndoSnapshot();

        const rect = pageInner.getBoundingClientRect();
        const dragEvent = (event as any).dragEvent as any;
        const pointer = lastPointerRef.current;
        const clientX = dragEvent?.clientX ?? dragEvent?.pageX ?? pointer?.x ?? rect.left + 20;
        const clientY = dragEvent?.clientY ?? dragEvent?.pageY ?? pointer?.y ?? rect.top + 20;
        const scale = Math.max(0.1, pageScale || 1);
        const dropX = (clientX - rect.left) / scale;
        const dropY = (clientY - rect.top) / scale;
        const pageWidth = rect.width / scale;
        const pageHeight = rect.height / scale;

        const x = Math.max(0, Math.min(dropX, pageWidth - 20));
        const y = Math.max(0, Math.min(dropY, pageHeight - 20));

        const next = createElementFromBlock({
          block,
          pageId,
          x,
          y,
          pageInnerSize: { width: pageWidth, height: pageHeight },
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
  }, [blocks, pageScale, setBlocks, setElements, setSelectedElementId]);

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
        pushUndoSnapshot();
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

  const latestStateRef = useRef({ settings, pages, blocks, elements });

  useEffect(() => {
    latestStateRef.current = { settings, pages, blocks, elements };
  }, [settings, pages, blocks, elements]);

  const isApplyingSnapshotRef = useRef(false);

  const commitElement = (
    id: string,
    patch: Partial<WorksheetPlacedElement>,
    opts?: { skipHistory?: boolean }
  ) => {
    if (!opts?.skipHistory && !isApplyingSnapshotRef.current) {
      pushUndoSnapshot();
    }
    setElements((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...patch } : e));
      latestStateRef.current = { ...latestStateRef.current, elements: next };
      return next;
    });
  };

  const cloneSnapshot = <T,>(value: T): T => {
    if (typeof structuredClone === 'function') {
      try {
        return structuredClone(value);
      } catch {
        // fall through
      }
    }
    return JSON.parse(JSON.stringify(value));
  };

  const captureSnapshot = (): WorksheetDesignerDocV1 => {
    const snapshot = latestStateRef.current;
    return {
      kind: 'worksheet-designer',
      version: 1,
      settings: cloneSnapshot(snapshot.settings || {}),
      pages: cloneSnapshot(snapshot.pages),
      blocks: cloneSnapshot(snapshot.blocks),
      elements: cloneSnapshot(snapshot.elements),
    };
  };

  const syncHistoryState = () => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  };

  const pushUndoSnapshot = () => {
    if (isApplyingSnapshotRef.current) return;
    undoStackRef.current.push(captureSnapshot());
    redoStackRef.current = [];
    syncHistoryState();
  };

  const applySnapshot = (snapshot: WorksheetDesignerDocV1) => {
    isApplyingSnapshotRef.current = true;
    setPages(snapshot.pages);
    setBlocks(snapshot.blocks);
    setElements(snapshot.elements);
    setSettings(snapshot.settings || {});
    setSelectedElementId(null);
    setEditingElementId(null);
    window.requestAnimationFrame(() => {
      isApplyingSnapshotRef.current = false;
    });
  };

  const handleUndo = () => {
    const stack = undoStackRef.current;
    if (!stack.length) return;
    const current = captureSnapshot();
    const previous = stack.pop()!;
    redoStackRef.current.push(current);
    applySnapshot(previous);
    syncHistoryState();
  };

  const handleRedo = () => {
    const stack = redoStackRef.current;
    if (!stack.length) return;
    const current = captureSnapshot();
    const next = stack.pop()!;
    undoStackRef.current.push(current);
    applySnapshot(next);
    syncHistoryState();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName))) return;

      if (editingElementId) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        handleRedo();
        return;
      }

      if (!selectedElementId) return;

      const step = 1;
      let dx = 0;
      let dy = 0;
      if (event.key === 'ArrowLeft') dx = -step;
      if (event.key === 'ArrowRight') dx = step;
      if (event.key === 'ArrowUp') dy = -step;
      if (event.key === 'ArrowDown') dy = step;
      if (!dx && !dy) return;

      event.preventDefault();
      pushUndoSnapshot();
      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== selectedElementId) return el;
          return { ...el, x: el.x + dx, y: el.y + dy };
        })
      );
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingElementId, handleRedo, handleUndo, selectedElementId, setElements]);

  const changeSelectedStyles = (patch: any) => {
    if (!selected) return;
    commitElement(selected.id, { styles: { ...(selected.styles || {}), ...patch } });
  };

  const copyStylesFrom = (id: string) => {
    const element = elements.find((el) => el.id === id);
    if (!element) return;
    copiedStylesRef.current = { ...(element.styles || {}) };
  };

  const applyCopiedStylesTo = (id: string) => {
    const styles = copiedStylesRef.current;
    if (!styles) return;
    pushUndoSnapshot();
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, styles: { ...(el.styles || {}), ...styles } } : el))
    );
  };

  const applyCopiedStylesToAll = () => {
    const styles = copiedStylesRef.current;
    if (!styles) return;
    pushUndoSnapshot();
    setElements((prev) =>
      prev.map((el) =>
        el.type === 'image' ? el : { ...el, styles: { ...(el.styles || {}), ...styles } }
      )
    );
  };

  const deleteSelected = () => {
    if (!selected) return;
    pushUndoSnapshot();
    setElements((prev) => prev.filter((e) => e.id !== selected.id));
    setSelectedElementId(null);
    setEditingElementId(null);
  };

  const sendSelectedToTray = () => {
    if (!selected) return;
    pushUndoSnapshot();
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
  const findMergeCandidate = (base: WorksheetPlacedElement) => {
    if (base.type === 'image') return null;
    const samePage = elements.filter((el) => el.pageId === base.pageId && el.id !== base.id);
    const sameType = samePage.filter((el) => el.type === base.type && el.type !== 'image');
    if (!sameType.length) return null;
    const overlaps = sameType.filter((el) => {
      const overlapLeft = Math.max(el.x, base.x);
      const overlapRight = Math.min(el.x + el.w, base.x + base.w);
      return overlapRight - overlapLeft > Math.min(el.w, base.w) * 0.3;
    });
    const candidates = overlaps.length ? overlaps : sameType;
    const withDistance = candidates.map((el) => {
      const belowGap = el.y - (base.y + base.h);
      const aboveGap = base.y - (el.y + el.h);
      const gap = belowGap >= 0 ? belowGap : aboveGap >= 0 ? aboveGap : Math.abs(belowGap);
      return { el, gap };
    });
    withDistance.sort((a, b) => a.gap - b.gap);
    return withDistance[0]?.el || null;
  };

  const canMergeSelected = Boolean(
    selected &&
      (elements.some((el) => el.splitGroupId === selected?.splitGroupId && el.id !== selected?.id) ||
        findMergeCandidate(selected))
  );

  const splitSelectedElement = () => {
    if (!selected || !isSplittableType(selected.type)) return;
    const pageInner = document.querySelector(`[data-page-id="${selected.pageId}"]`) as HTMLElement | null;
    if (!pageInner) return;
    const rect = pageInner.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const scale = Math.max(0.1, pageScale || 1);
    const styles = window.getComputedStyle(pageInner);
    const padLeft = parseFloat(styles.paddingLeft || '0') || 0;
    const padRight = parseFloat(styles.paddingRight || '0') || 0;
    const padTop = parseFloat(styles.paddingTop || '0') || 0;
    const padBottom = parseFloat(styles.paddingBottom || '0') || 0;
    const pageWidth = rect.width / scale;
    const pageHeight = rect.height / scale;
    const contentWidth = Math.max(0, pageWidth - padLeft - padRight);
    const contentHeight = Math.max(0, pageHeight - padTop - padBottom);
    if (!contentWidth || !contentHeight) return;
    const originX = padLeft;
    const originY = padTop;
    const maxY = originY + contentHeight;

    const firstMaxHeight = Math.max(50, pageHeight - selected.y);
    const chunks = splitIntoChunks({
      html: selected.html,
      styles: selected.styles,
      width: selected.w,
      firstMaxHeight,
      fullMaxHeight: pageHeight,
    });

    if (chunks.length <= 1) return;

    pushUndoSnapshot();
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
    if (!selected) return;
    const mergeGroupId = selected.splitGroupId || null;
    const group = mergeGroupId ? elements.filter((el) => el.splitGroupId === mergeGroupId) : [];
    if (mergeGroupId && group.length >= 2) {
      pushUndoSnapshot();
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
        const without = prev.filter((el) => el.splitGroupId !== mergeGroupId);
        return [...without, mergedElement];
      });
      setSelectedElementId(mergedElement.id);
      setEditingElementId(null);
      return;
    }

    const candidate = findMergeCandidate(selected);
    if (!candidate) return;
    pushUndoSnapshot();
    const ordered = [selected, candidate].sort((a, b) => a.y - b.y);
    const mergedHtml = mergeSplitHtml(ordered.map((el) => el.html));
    const mergedX = Math.min(selected.x, candidate.x);
    const mergedY = Math.min(selected.y, candidate.y);
    const mergedW = Math.max(selected.x + selected.w, candidate.x + candidate.w) - mergedX;
    const mergedHeight = measureElementHeight(mergedHtml, selected.styles, mergedW);
    const base = ordered[0];
    const mergedElement: WorksheetPlacedElement = {
      ...base,
      id: createId(),
      pageId: selected.pageId,
      x: mergedX,
      y: mergedY,
      w: mergedW,
      html: mergedHtml,
      h: Math.max(50, mergedHeight || base.h),
      splitGroupId: undefined,
      splitIndex: undefined,
    };
    setElements((prev) => {
      const without = prev.filter((el) => el.id !== selected.id && el.id !== candidate.id);
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

  useEffect(() => {
    if (!infoLayoutKey) return;
    if (lastInfoLayoutKeyRef.current === infoLayoutKey) return;

    const infoBlocks = blocks.filter(
      (b) => b?.payload?.kind === 'info-section' || b?.payload?.kind === 'info-header'
    );
    const isInfoElement = (el: WorksheetPlacedElement) =>
      typeof el.html === 'string' && (el.html.includes('ws-info-card') || el.html.includes('ws-info-header'));
    const infoElements = elements.filter(isInfoElement);
    if (infoBlocks.length === 0 && infoElements.length === 0) return;
    lastInfoLayoutKeyRef.current = infoLayoutKey;

    const template = infoTemplate || 'classic';
    const theme = infoTheme || 'ocean';
    const layoutColumns = layoutMode === 'columns' ? 2 : 1;
    const ensureTemplateClass = (html: string, baseClass: string, templateClass: string) => {
      if (!html.includes(baseClass)) return html;
      const withVariant = html.replace(new RegExp(`${baseClass}--[a-z-]+`, 'g'), `${baseClass}--${templateClass}`);
      if (withVariant.includes(`${baseClass}--${templateClass}`)) return withVariant;
      return withVariant.replace(baseClass, `${baseClass} ${baseClass}--${templateClass}`);
    };
    const ensureThemeClass = (html: string, baseClass: string, themeClass: string) => {
      if (!html.includes(baseClass)) return html;
      const withVariant = html.replace(/ws-info-theme--[a-z-]+/g, `ws-info-theme--${themeClass}`);
      if (withVariant.includes(`ws-info-theme--${themeClass}`)) return withVariant;
      return withVariant.replace(baseClass, `${baseClass} ws-info-theme--${themeClass}`);
    };
    const ensureVariantClass = (html: string, baseClass: string, variantClass?: string) => {
      if (!html.includes(baseClass)) return html;
      let next = html.replace(/ws-info-card--variant-[a-z-]+/g, '').replace(/\s{2,}/g, ' ');
      if (!variantClass) return next;
      if (next.includes(`ws-info-card--variant-${variantClass}`)) return next;
      return next.replace(baseClass, `${baseClass} ws-info-card--variant-${variantClass}`);
    };
    const updateInfoTemplate = (html: string) => {
      let next = ensureTemplateClass(html, 'ws-info-header', template);
      next = ensureTemplateClass(next, 'ws-info-card', template);
      next = ensureThemeClass(next, 'ws-info-header', theme);
      next = ensureThemeClass(next, 'ws-info-card', theme);
      return next;
    };

    const infoBlockSource =
      infoBlocks.length > 0
        ? infoBlocks.map((b) => ({
            ...b,
            payload: {
              ...(b.payload || {}),
              template,
              theme,
              html: updateInfoTemplate(String(b.payload?.html ?? b.previewHtml ?? '')),
            },
          }))
        : infoElements.map((el) => {
            const html = updateInfoTemplate(String(el.html || ''));
            const kind = html.includes('ws-info-header') ? 'info-header' : 'info-section';
            return {
              id: createId(),
              type: 'custom' as const,
              title: kind === 'info-header' ? 'Infographic Header' : 'Information',
              payload: { html, kind, template, theme, styles: el.styles },
              previewHtml: html,
            };
          });

    const headerBlock = infoBlockSource.find((b) => b?.payload?.kind === 'info-header') || null;
    const rawSectionBlocks = infoBlockSource.filter((b) => b?.payload?.kind === 'info-section');
    const railCount =
      template === 'editorial' && layoutColumns === 2 ? Math.min(2, rawSectionBlocks.length) : 0;
    const sectionBlocks = rawSectionBlocks.map((block, index) => {
      const baseHtml = String(block.payload?.html ?? block.previewHtml ?? '');
      let variant = '';
      if (template === 'poster') {
        variant = index === 0 ? 'hero' : index === 1 ? 'spotlight' : '';
      } else if (template === 'editorial') {
        variant = index < railCount ? 'rail' : 'main';
      } else if (template === 'playful') {
        const variants = ['playful-a', 'playful-b', 'playful-c'];
        variant = variants[index % variants.length];
      }
      const html = ensureVariantClass(baseHtml, 'ws-info-card', variant || undefined);
      return {
        ...block,
        payload: {
          ...(block.payload || {}),
          html,
          variant: variant || undefined,
        },
        previewHtml: html,
      };
    });

    const columnsBase = layoutColumns;
    const gap =
      template === 'grid'
        ? 14
        : template === 'minimal'
          ? 12
          : template === 'poster'
            ? 22
            : template === 'editorial'
              ? 20
              : template === 'playful'
                ? 16
                : 18;
    const headerGap = template === 'poster' ? 22 : template === 'editorial' ? 18 : 16;
    const headerMinHeight = template === 'poster' ? 96 : template === 'editorial' ? 84 : 70;
    const cardMinHeight = template === 'poster' ? 130 : template === 'playful' ? 110 : template === 'editorial' ? 100 : 90;
    const railMinHeight = template === 'editorial' ? 80 : cardMinHeight;
    const heroMinHeight = template === 'poster' ? 180 : cardMinHeight;

    const pageWidth = (210 / 25.4) * 96;
    const pageHeight = (297 / 25.4) * 96;
    const marginPx = (marginMm / 25.4) * 96;
    const contentWidth = pageWidth - marginPx * 2;
    const contentHeight = pageHeight - marginPx * 2;
    const maxY = marginPx + contentHeight;

    const pageInnerSize = { width: contentWidth, height: contentHeight };
    const isLogoBlock = (block: WorksheetBlock) => block.type === 'image' && block.payload?.kind === 'logo';
    const isLogoElement = (el: WorksheetPlacedElement) =>
      el.type === 'image' && /data-kind=["']logo["']/.test(String(el.html || ''));
    const logoBlock = blocks.find(isLogoBlock) || null;
    const nonInfoElements = elements.filter((el) => !isInfoElement(el));
    const hasLogoElement = nonInfoElements.some(isLogoElement);
    const basePages = pages.length ? [...pages] : [{ id: createId() }];
    const pagesNext: WorksheetDesignerPage[] =
      nonInfoElements.length > 0 ? basePages : [{ id: basePages[0]?.id ?? createId() }];
    const elementsNext: WorksheetPlacedElement[] = [...nonInfoElements];

    let pageIndex = 0;
    let startY = marginPx;

    if (logoBlock && !hasLogoElement) {
      const element = createElementFromBlock({
        block: logoBlock,
        pageId: pagesNext[0].id,
        x: marginPx,
        y: marginPx,
        pageInnerSize,
      });
      const maxLogoWidth = Math.min(140, Math.max(90, Math.round(contentWidth * 0.2)));
      const targetW = Math.min(element.w, maxLogoWidth);
      const ratio = element.w > 0 ? element.h / element.w : 0.6;
      const targetH = Math.max(40, Math.round(targetW * (Number.isFinite(ratio) && ratio > 0 ? ratio : 0.6)));
      const x = marginPx + Math.max(0, contentWidth - targetW);
      elementsNext.push({
        ...element,
        pageId: pagesNext[0].id,
        x,
        y: marginPx,
        w: targetW,
        h: targetH,
      });
      startY = marginPx + targetH + 12;
    }
    const getColumnOffset = (index: number) => (template === 'playful' ? (index % 2 === 1 ? 18 : 0) : 0);
    const placeFullWidthBlock = (block: WorksheetBlock, yStart: number, minHeight: number) => {
      let y = yStart;
      let base = createElementFromBlock({
        block,
        pageId: pagesNext[pageIndex].id,
        x: marginPx,
        y,
        pageInnerSize,
      });
      let measured = measureElementHeight(base.html, base.styles, contentWidth);
      let height = Math.max(minHeight, Math.min(measured || base.h, contentHeight));

      if (y + height > maxY && y > marginPx) {
        pageIndex += 1;
        pagesNext.push({ id: createId() });
        y = marginPx;
        base = createElementFromBlock({
          block,
          pageId: pagesNext[pageIndex].id,
          x: marginPx,
          y,
          pageInnerSize,
        });
        measured = measureElementHeight(base.html, base.styles, contentWidth);
        height = Math.max(minHeight, Math.min(measured || base.h, contentHeight));
      }

      elementsNext.push({
        ...base,
        pageId: pagesNext[pageIndex].id,
        x: marginPx,
        y,
        w: contentWidth,
        h: height,
      });
      return y + height + gap;
    };
    const placeBlockInColumn = (
      block: WorksheetBlock,
      columnIndex: number,
      columnDefs: Array<{ x: number; width: number }>,
      columnYs: number[],
      minHeight: number
    ) => {
      let x = columnDefs[columnIndex].x;
      let width = columnDefs[columnIndex].width;
      let y = columnYs[columnIndex];

      let base = createElementFromBlock({
        block,
        pageId: pagesNext[pageIndex].id,
        x,
        y,
        pageInnerSize,
      });
      let measured = measureElementHeight(base.html, base.styles, width);
      let height = Math.max(minHeight, Math.min(measured || base.h, contentHeight));

      if (y + height > maxY && y > marginPx) {
        pageIndex += 1;
        pagesNext.push({ id: createId() });
        columnYs = columnDefs.map((_, idx) => marginPx + getColumnOffset(idx));
        x = columnDefs[columnIndex].x;
        width = columnDefs[columnIndex].width;
        y = columnYs[columnIndex];
        base = createElementFromBlock({
          block,
          pageId: pagesNext[pageIndex].id,
          x,
          y,
          pageInnerSize,
        });
        measured = measureElementHeight(base.html, base.styles, width);
        height = Math.max(minHeight, Math.min(measured || base.h, contentHeight));
      }

      elementsNext.push({
        ...base,
        pageId: pagesNext[pageIndex].id,
        x,
        y,
        w: width,
        h: height,
      });
      columnYs[columnIndex] = y + height + gap;
      return columnYs;
    };

    if (headerBlock) {
      const headerY = startY;
      const base = createElementFromBlock({
        block: headerBlock,
        pageId: pagesNext[0].id,
        x: marginPx,
        y: headerY,
        pageInnerSize,
      });
      const headerHeight = Math.max(headerMinHeight, measureElementHeight(base.html, base.styles, contentWidth));
      elementsNext.push({
        ...base,
        pageId: pagesNext[0].id,
        x: marginPx,
        y: headerY,
        w: contentWidth,
        h: Math.min(headerHeight, contentHeight),
      });
      startY = headerY + headerHeight + headerGap;
    }

    let remainingSections = sectionBlocks;
    if (template === 'poster' && sectionBlocks.length > 0) {
      startY = placeFullWidthBlock(sectionBlocks[0], startY, heroMinHeight);
      remainingSections = sectionBlocks.slice(1);
    }

    if (template === 'editorial' && layoutColumns === 2) {
      const railBlocks = sectionBlocks.slice(0, railCount);
      const mainBlocks = sectionBlocks.slice(railCount);
      const minRailWidth = 170;
      const targetRailWidth = Math.max(minRailWidth, Math.floor(contentWidth * 0.32));
      const railWidth = Math.min(targetRailWidth, Math.max(minRailWidth, contentWidth - 240));
      const mainWidth = Math.max(200, contentWidth - railWidth - gap);
      const columnDefs = [
        { x: marginPx, width: railWidth },
        { x: marginPx + railWidth + gap, width: mainWidth },
      ];
      let columnYs = columnDefs.map((_, idx) => startY + getColumnOffset(idx));

      railBlocks.forEach((block) => {
        columnYs = placeBlockInColumn(block, 0, columnDefs, columnYs, railMinHeight);
      });
      mainBlocks.forEach((block) => {
        columnYs = placeBlockInColumn(block, 1, columnDefs, columnYs, cardMinHeight);
      });
    } else if (remainingSections.length > 0) {
      const columns = template === 'poster' ? (layoutColumns === 2 && remainingSections.length > 1 ? 2 : 1) : columnsBase;
      const columnWidth =
        columns === 1 ? contentWidth : Math.max(160, (contentWidth - gap * (columns - 1)) / columns);
      const columnDefs = Array.from({ length: columns }, (_, idx) => ({
        x: marginPx + idx * (columnWidth + gap),
        width: columnWidth,
      }));
      let columnYs = columnDefs.map((_, idx) => startY + getColumnOffset(idx));

      remainingSections.forEach((block) => {
        const colIndex = columns === 1 ? 0 : columnYs.indexOf(Math.min(...columnYs));
        columnYs = placeBlockInColumn(block, colIndex, columnDefs, columnYs, cardMinHeight);
      });
    }

    const remainingBlocks = blocks.filter(
      (b) =>
        b?.payload?.kind !== 'info-section' &&
        b?.payload?.kind !== 'info-header' &&
        !(logoBlock && isLogoBlock(b))
    );
    pushUndoSnapshot();
    setPages(pagesNext);
    setElements(elementsNext);
    setBlocks(remainingBlocks);
    setSelectedElementId(null);
    setEditingElementId(null);
  }, [
    blocks,
    elements,
    infoLayoutKey,
    infoTemplate,
    infoTheme,
    layoutMode,
    marginMm,
    pages,
    setBlocks,
    setElements,
    setPages,
  ]);

  function buildSplitSpec(html: string) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;

    const maybeContainer =
      wrapper.children.length === 1 && wrapper.firstElementChild instanceof HTMLElement
        ? (wrapper.firstElementChild as HTMLElement)
        : wrapper;
    const containerEl = maybeContainer !== wrapper ? maybeContainer : null;
    const containerTag = containerEl ? containerEl.tagName.toLowerCase() : '';
    const containerAttrParts = containerEl
      ? Array.from(containerEl.attributes).map(
          (attr) => `${attr.name}="${String(attr.value).replace(/"/g, '&quot;')}"`
        )
      : [];
    const containerOpen = containerEl
      ? `<${containerTag}${containerAttrParts.length ? ` ${containerAttrParts.join(' ')}` : ''}>`
      : '';
    const containerClose = containerEl ? `</${containerTag}>` : '';
    const wrapWithContainer = (inner: string) => (containerEl ? `${containerOpen}${inner}${containerClose}` : inner);

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
              const body = `${includeHeading ? headingHtml : ''}${open}${chunkItems.join('')}${listClose}`;
              return wrapWithContainer(body);
            },
          };
        }
      }
    }

    const nodes = Array.from(maybeContainer.childNodes).filter(
      (node) => (node.textContent || '').trim().length > 0
    );
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
      build: (chunkItems: string[]) => wrapWithContainer(chunkItems.join('')),
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

  const performAutoLayout = async (opts?: { columns?: number; confirm?: boolean }) => {
    const columnsRequested =
      typeof opts?.columns === 'number' && Number.isFinite(opts.columns) ? Math.max(1, Math.round(opts.columns)) : 1;
    const columns = Math.min(2, Math.max(1, columnsRequested));
    if (blocks.length === 0 && elements.length === 0) return;
    if (opts?.confirm) {
      const ok = window.confirm('This will reflow all placed elements and blocks. Continue?');
      if (!ok) return;
    }

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
    const scale = Math.max(0.1, pageScale || 1);
    const styles = window.getComputedStyle(pageInner);
    const padLeft = parseFloat(styles.paddingLeft || '0') || 0;
    const padRight = parseFloat(styles.paddingRight || '0') || 0;
    const padTop = parseFloat(styles.paddingTop || '0') || 0;
    const padBottom = parseFloat(styles.paddingBottom || '0') || 0;
    const pageWidth = rect.width / scale;
    const pageHeight = rect.height / scale;
    const contentWidth = Math.max(0, pageWidth - padLeft - padRight);
    const contentHeight = Math.max(0, pageHeight - padTop - padBottom);
    if (!contentWidth || !contentHeight) return;
    const originX = padLeft;
    const originY = padTop;
    const maxY = originY + contentHeight;
    pushUndoSnapshot();

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
    if (columns === 1) {
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
    } else {
      const columnWidth = Math.max(160, (contentWidth - gap) / 2);
      const columnDefs = [
        { x: originX, width: columnWidth },
        { x: originX + columnWidth + gap, width: columnWidth },
      ];
      let columnYs = columnDefs.map(() => cursorY);
      const placeChunk = (opts: {
        base: WorksheetPlacedElement;
        html: string;
        height: number;
        width: number;
        columnIndex: number;
        splitGroupId?: string;
        splitIndex?: number;
      }) => {
        const { base, html, height, width, columnIndex, splitGroupId, splitIndex } = opts;
        const column = columnDefs[columnIndex];
        let y = columnYs[columnIndex];
        if (y + height > maxY && y > originY) {
          pageIndex += 1;
          nextPages.push({ id: createId() });
          columnYs = columnDefs.map(() => originY);
          y = originY;
        }
        const h = Math.max(minHeight, Math.min(height, contentHeight));
        if (h >= contentHeight) overflowed = true;
        nextElements.push({
          ...base,
          id: createId(),
          pageId: nextPages[pageIndex].id,
          x: column.x + Math.max(0, Math.round((column.width - width) / 2)),
          y,
          w: width,
          h,
          html,
          splitGroupId,
          splitIndex,
        });
        columnYs[columnIndex] = y + h + gap;
      };
      const pickColumnIndex = () => {
        const minY = Math.min(...columnYs);
        return columnYs.indexOf(minY);
      };

      contentBlocks.forEach((block) => {
        const colIndex = pickColumnIndex();
        const column = columnDefs[colIndex];
        let element = createElementFromBlock({
          block,
          pageId: nextPages[pageIndex].id,
          x: column.x,
          y: columnYs[colIndex],
          pageInnerSize,
        });
        const w = block.type === 'image' ? Math.min(column.width, element.w) : column.width;
        const isSplittable = isSplittableType(block.type);

        if (isSplittable) {
          let available = maxY - columnYs[colIndex];
          if (available < minHeight) {
            const altIndex = colIndex === 0 ? 1 : 0;
            if (columnYs[altIndex] + minHeight <= maxY || columnYs[altIndex] === originY) {
              available = maxY - columnYs[altIndex];
            } else {
              pageIndex += 1;
              nextPages.push({ id: createId() });
              columnYs = columnDefs.map(() => originY);
              available = contentHeight;
            }
          }

          const chunks = splitIntoChunks({
            html: element.html,
            styles: element.styles,
            width: w,
            firstMaxHeight: Math.max(minHeight, available),
            fullMaxHeight: contentHeight,
          });

          if (chunks.length > 1) {
            const groupId = createId();
            chunks.forEach((chunk, idx) => {
              let targetCol = pickColumnIndex();
              if (columnYs[targetCol] + chunk.height > maxY && columnYs[targetCol] > originY) {
                const altIndex = targetCol === 0 ? 1 : 0;
                if (columnYs[altIndex] + chunk.height <= maxY || columnYs[altIndex] === originY) {
                  targetCol = altIndex;
                } else {
                  pageIndex += 1;
                  nextPages.push({ id: createId() });
                  columnYs = columnDefs.map(() => originY);
                  targetCol = 0;
                }
              }
              placeChunk({
                base: element,
                html: chunk.html,
                height: chunk.height,
                width: w,
                columnIndex: targetCol,
                splitGroupId: groupId,
                splitIndex: idx,
              });
            });
            return;
          }
        }

        const measuredHeight =
          block.type === 'image' ? element.h : measureElementHeight(element.html, element.styles, w);
        let h = Math.max(minHeight, measuredHeight || element.h);
        let targetCol = pickColumnIndex();
        if (columnYs[targetCol] + h > maxY && columnYs[targetCol] > originY) {
          const altIndex = targetCol === 0 ? 1 : 0;
          if (columnYs[altIndex] + h <= maxY || columnYs[altIndex] === originY) {
            targetCol = altIndex;
          } else {
            pageIndex += 1;
            nextPages.push({ id: createId() });
            columnYs = columnDefs.map(() => originY);
            targetCol = 0;
          }
        }
        if (h > contentHeight) {
          h = contentHeight;
          overflowed = true;
        }
        placeChunk({
          base: element,
          html: element.html,
          height: h,
          width: w,
          columnIndex: targetCol,
        });
      });
    }

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

  const suggestOptimalDistribution = async () => {
    await performAutoLayout({ columns: layoutMode === 'columns' ? 2 : 1, confirm: true });
  };

  useEffect(() => {
    if (lastLayoutModeRef.current === layoutMode) return;
    lastLayoutModeRef.current = layoutMode;
    if (blocks.length === 0 && elements.length === 0) return;
    const hasInfoBlocks = blocks.some(
      (b) => b?.payload?.kind === 'info-section' || b?.payload?.kind === 'info-header'
    );
    const hasInfoElements = elements.some(
      (el) => typeof el.html === 'string' && (el.html.includes('ws-info-card') || el.html.includes('ws-info-header'))
    );
    if (hasInfoBlocks || hasInfoElements) return;
    void performAutoLayout({ columns: layoutMode === 'columns' ? 2 : 1, confirm: false });
  }, [layoutMode]);

  useEffect(() => {
    if (!autoLayoutKey) return;
    if (lastAutoLayoutKeyRef.current === autoLayoutKey) return;
    lastAutoLayoutKeyRef.current = autoLayoutKey;
    if (blocks.length === 0) return;
    const hasInfoBlocks = blocks.some(
      (b) => b?.payload?.kind === 'info-section' || b?.payload?.kind === 'info-header'
    );
    const hasInfoElements = elements.some(
      (el) => typeof el.html === 'string' && (el.html.includes('ws-info-card') || el.html.includes('ws-info-header'))
    );
    if (hasInfoBlocks || hasInfoElements) return;
    void performAutoLayout({ columns: layoutMode === 'columns' ? 2 : 1, confirm: false });
  }, [autoLayoutKey, blocks, elements, layoutMode]);

  const applyPendingPatch = (
    doc: WorksheetDesignerDocV1,
    pending?: { id: string; patch: Partial<WorksheetPlacedElement> } | null
  ): WorksheetDesignerDocV1 => {
    if (!pending) return doc;
    return {
      ...doc,
      elements: doc.elements.map((el) => (el.id === pending.id ? { ...el, ...pending.patch } : el)),
    };
  };

  const applyLiveEdits = (doc: WorksheetDesignerDocV1): WorksheetDesignerDocV1 => {
    if (!liveEditRef.current.size) return doc;
    const nextElements = doc.elements.map((el) => {
      const draft = liveEditRef.current.get(el.id);
      if (!draft) return el;
      const safe = sanitizeHtml(draft.html || '');
      let next = el;
      if (safe !== el.html) {
        next = { ...next, html: safe };
      }
      if (el.type !== 'image' && draft.height) {
        const measured = Math.max(50, Math.ceil(draft.height));
        const finalH = measured < el.h - 12 ? measured : el.h;
        if (finalH !== el.h) {
          next = { ...next, h: finalH };
        }
      }
      return next;
    });
    return { ...doc, elements: nextElements };
  };

  const buildPrintMarkup = (doc: WorksheetDesignerDocV1) => {
    const preset = doc.settings?.marginPreset || settings?.marginPreset || 'normal';
    const printMarginMm = preset === 'narrow' ? 12 : preset === 'wide' ? 30 : 20;
    const templateClass = infoTemplate ? `ws-template--${infoTemplate}` : '';
    const themeClass = infoTheme ? `ws-theme--${infoTheme}` : '';
    const resolveElementKind = (html: string) => {
      if (html.includes('ws-info-header')) return 'info-header';
      if (html.includes('ws-info-card')) return 'info';
      return '';
    };
    const renderElement = (el: WorksheetPlacedElement) => {
      const s = el.styles || {};
      const borderStyle = s.borderStyle && s.borderStyle !== 'none' ? s.borderStyle : 'none';
      const borderWidth = borderStyle === 'none' ? '0px' : s.borderWidth || '1px';
      const borderColor = s.borderColor || '#e2e8f0';
      const kind = resolveElementKind(String(el.html || ''));
      const styleVars: string[] = [];
      if (kind === 'info-header') {
        if (s.backgroundColor && s.backgroundColor !== 'transparent') {
          styleVars.push(`--ws-info-header-from:${s.backgroundColor}`);
          styleVars.push(`--ws-info-header-to:${s.backgroundColor}`);
        }
        if (s.color) {
          styleVars.push(`--ws-info-header-ink:${s.color}`);
        }
      }
      if (kind === 'info') {
        if (s.backgroundColor && s.backgroundColor !== 'transparent') {
          styleVars.push(`--ws-info-card-bg:${s.backgroundColor}`);
          styleVars.push(`--ws-info-card-from:${s.backgroundColor}`);
          styleVars.push(`--ws-info-card-to:${s.backgroundColor}`);
        }
        if (s.borderColor) {
          styleVars.push(`--ws-info-card-border:${s.borderColor}`);
        }
        if (s.color) {
          styleVars.push(`--ws-info-ink:${s.color}`);
          styleVars.push(`--ws-info-title:${s.color}`);
        }
      }
      const wrapperStyle = [
        'position:absolute',
        'left:0',
        'top:0',
        `width:${el.w}px`,
        `height:${el.h}px`,
        `transform:translate(${el.x}px, ${el.y}px)`,
        `border-style:${borderStyle}`,
        `border-width:${borderWidth}`,
        `border-color:${borderColor}`,
        `border-radius:${s.borderRadius || '10px'}`,
        `background-color:${s.backgroundColor || 'transparent'}`,
        `box-shadow:${s.boxShadow || 'none'}`,
        'overflow:hidden',
        ...styleVars,
      ].join(';');
      const isImage = el.type === 'image';
      const contentStyle = [
        `font-family:${s.fontFamily || 'Quicksand, sans-serif'}`,
        `font-size:${s.fontSize || '14px'}`,
        `font-weight:${s.fontWeight || '400'}`,
        `font-style:${s.fontStyle || 'normal'}`,
        `text-decoration:${s.textDecoration || 'none'}`,
        `text-align:${s.textAlign || 'left'}`,
        `line-height:${s.lineHeight || '1.35'}`,
        `color:${s.color || '#0f172a'}`,
        `padding:${isImage ? '0px' : s.padding || '12px'}`,
        'width:100%',
        'height:100%',
        'box-sizing:border-box',
        'overflow:hidden',
      ].join(';');
      const kindAttr = kind ? ` data-element-kind="${escapeHtml(kind)}"` : '';
      const html = sanitizeHtml(String(el.html || ''));
      return `<div class="ws-placed-element" data-element-id="${escapeHtml(
        el.id
      )}" data-element-type="${escapeHtml(el.type)}"${kindAttr} style="${wrapperStyle}"><div class="ws-element-content" style="${contentStyle}">${html}</div></div>`;
    };
    const pagesHtml = (doc.pages || []).map((page) => {
      const pageStyle = `--ws-page-pad:${printMarginMm}mm;background:white;`;
      const pageElements = (doc.elements || [])
        .filter((el) => el.pageId === page.id)
        .map(renderElement)
        .join('');
      return `<div class="ws-page" style="${pageStyle}"><div class="ws-page-scale"><div class="ws-page-inner" data-page-id="${escapeHtml(
        page.id
      )}">${pageElements}</div></div></div>`;
    });
    return `<div class="ws-pages-wrap ${templateClass} ${themeClass}" style="--ws-page-scale:1;--ws-page-overflow:visible;">${pagesHtml.join(
      ''
    )}</div>`;
  };

  const handlePrint = () => {
    const pending = commitEditingElement();
    const snapshot = applyLiveEdits(applyPendingPatch(captureSnapshot(), pending));
    const markup = buildPrintMarkup(snapshot);
    const fonts = `<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@300;400;500;600&family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">`;
    const html = `<!doctype html><html><head><meta charset="utf-8" /><title>Print Worksheet</title>${fonts}<style>body{margin:0;background:white;}${DESIGNER_CSS}</style></head><body>${markup}</body></html>`;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      const trigger = () => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch {
          // ignore
        }
      };
      printWindow.onload = () => window.setTimeout(trigger, 80);
      return;
    }
    setIsPrinting(true);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.print();
      });
    });
  };

  const addPage = () => {
    pushUndoSnapshot();
    setPages((prev) => [...prev, { id: createId() }]);
  };

  const deletePage = (pageId: string) => {
    pushUndoSnapshot();
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

  const commitEditingElement = (): { id: string; patch: Partial<WorksheetPlacedElement> } | null => {
    if (!editingElementId) return null;
    const element = elements.find((el) => el.id === editingElementId);
    if (!element) {
      setEditingElementId(null);
      return null;
    }
    const root = document.querySelector(`[data-element-id="${editingElementId}"]`) as HTMLElement | null;
    const content = root?.querySelector('.ws-element-content') as HTMLElement | null;
    if (!content) {
      setEditingElementId(null);
      return null;
    }
    const raw = content.innerHTML || '';
    const safe = sanitizeHtml(raw);
    const measured = content.scrollHeight ?? 0;
    const nextH = measured ? Math.max(50, Math.ceil(measured)) : element.h;
    const finalH = nextH < element.h - 12 ? nextH : element.h;
    const patch: Partial<WorksheetPlacedElement> = { html: safe, h: finalH };
    commitElement(element.id, patch, { skipHistory: true });
    liveEditRef.current.delete(editingElementId);
    setEditingElementId(null);
    return { id: element.id, patch };
  };

  const handleSaveClick = () => {
    const pending = commitEditingElement();
    const snapshot = applyLiveEdits(applyPendingPatch(captureSnapshot(), pending));
    onSave?.(snapshot);
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
          onLiveEdit={(id, html, height) => {
            liveEditRef.current.set(id, { html, height });
          }}
          onOpenStyleMenu={(id, pos) => {
            setSelectedElementId(id);
            const padding = 12;
            const menuW = 190;
            const menuH = 140;
            const nextX = Math.min(pos.x, window.innerWidth - menuW - padding);
            const nextY = Math.min(pos.y, window.innerHeight - menuH - padding);
            setStyleMenu({ x: nextX, y: nextY, targetId: id });
          }}
          onAddPage={addPage}
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
          pageScale={pageScale}
          designTemplate={infoTemplate}
          designTheme={infoTheme}
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
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={canUndo}
            canRedo={canRedo}
            onCopyStyles={() => copyStylesFrom(selected.id)}
            onPasteStyles={() => applyCopiedStylesTo(selected.id)}
            onPasteStylesAll={applyCopiedStylesToAll}
            canPasteStyles={Boolean(copiedStylesRef.current)}
          />
            </div>
          </div>
        ) : null}

        {styleMenu && (
          <div
            ref={styleMenuRef}
            className="no-print ws-style-menu fixed z-[11000] w-44 rounded-xl border border-slate-200 bg-white shadow-xl p-1 text-xs font-bold text-slate-700"
            style={{ left: styleMenu.x, top: styleMenu.y }}
          >
            <button
              type="button"
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100"
              onClick={() => {
                copyStylesFrom(styleMenu.targetId);
                setStyleMenu(null);
              }}
            >
              Copy styles
            </button>
            <button
              type="button"
              className={`w-full text-left px-3 py-2 rounded-lg ${
                copiedStylesRef.current ? 'hover:bg-slate-100' : 'opacity-50 cursor-not-allowed'
              }`}
              onClick={() => {
                if (!copiedStylesRef.current) return;
                applyCopiedStylesTo(styleMenu.targetId);
                setStyleMenu(null);
              }}
              disabled={!copiedStylesRef.current}
            >
              Apply to this section
            </button>
            <button
              type="button"
              className={`w-full text-left px-3 py-2 rounded-lg ${
                copiedStylesRef.current ? 'hover:bg-slate-100' : 'opacity-50 cursor-not-allowed'
              }`}
              onClick={() => {
                if (!copiedStylesRef.current) return;
                applyCopiedStylesToAll();
                setStyleMenu(null);
              }}
              disabled={!copiedStylesRef.current}
            >
              Apply to all sections
            </button>
          </div>
        )}
      </div>

      <div
        className={`no-print ${rightSidebarWidthClass} border-l border-slate-200 bg-white flex flex-col shrink-0 sticky self-start overflow-hidden`}
        style={{ top: '4rem' }}
      >
        <div className="px-3 py-2 border-b border-slate-200 bg-white flex items-center justify-between sticky top-0 z-30">
          {!resolvedRightSidebarCollapsed && <div className="text-xs font-bold text-slate-600">Tools</div>}
          {canToggleRightSidebar && (
            <button
              type="button"
              onClick={() => setIsRightSidebarCollapsed((prev) => !prev)}
              title={resolvedRightSidebarCollapsed ? 'Expand toolbar' : 'Collapse toolbar'}
              aria-label={resolvedRightSidebarCollapsed ? 'Expand toolbar' : 'Collapse toolbar'}
              className="p-2 rounded hover:bg-slate-100 text-slate-600"
            >
              {resolvedRightSidebarCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
          )}
        </div>

        {!resolvedRightSidebarCollapsed && (
          <div className="flex-1">
            <div className="px-3 py-2 border-b border-slate-200 bg-white space-y-2">
              <button
                type="button"
                onClick={suggestOptimalDistribution}
                className="w-full py-2 rounded-lg text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 md:py-2.5 md:rounded-xl md:text-sm md:font-extrabold"
              >
                Suggest Optimal Distribution
              </button>

              <div className="flex items-center gap-2">
                {onSave && (
                  <button
                    type="button"
                    onClick={handleSaveClick}
                    className="flex-1 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm md:py-2 md:rounded-xl md:text-sm md:font-extrabold"
                  >
                    {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white bg-brand-blue hover:bg-sky-500 shadow-sm md:py-2 md:rounded-xl md:text-sm md:font-extrabold"
                >
                  Print / PDF
                </button>
              </div>

              {onAddImage && (
                <button
                  type="button"
                  onClick={onAddImage}
                  className="w-full py-2 rounded-lg text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-2 md:py-2.5 md:rounded-xl md:text-sm md:font-extrabold"
                >
                  <ImagePlus size={16} /> Add Image
                </button>
              )}

              <button
                type="button"
                onClick={addPage}
                className="w-full py-2 rounded-lg text-xs font-bold bg-white border-2 border-dashed border-slate-300 hover:bg-slate-50 text-slate-700 md:py-2.5 md:rounded-xl md:text-sm md:font-extrabold"
                title="Add a new A4 page"
              >
                + Add Page ({pages.length})
              </button>

              <label className="flex items-center justify-between gap-2 text-[11px] font-bold text-slate-700 pt-1 md:text-xs">
                <span>Print margins</span>
                <select
                  value={marginPreset}
                  onChange={(e) => {
                    pushUndoSnapshot();
                    setSettings((prev) => ({ ...prev, marginPreset: e.target.value as any }));
                  }}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-700 md:p-2 md:rounded-xl md:text-xs md:font-extrabold"
                  title="Page margin preset"
                >
                  <option value="narrow">Narrow</option>
                  <option value="normal">Normal</option>
                  <option value="wide">Wide</option>
                </select>
              </label>

              <div className="pt-1">
                <div className="text-[10px] font-extrabold text-slate-600 mb-1 md:text-[11px]">Pages</div>
                <div className="space-y-1">
                  {pages.map((p, idx) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] md:text-xs"
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
                          className="px-2 py-1 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 text-[10px] font-bold text-red-700 md:text-[11px] md:font-extrabold"
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
                    className={`px-2 py-1 rounded-full text-[10px] font-bold border md:px-3 md:py-1.5 md:text-[11px] md:font-extrabold ${
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
                  if (window.confirm('Clear all blocks?')) {
                    pushUndoSnapshot();
                    setBlocks([]);
                  }
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
    width: calc(210mm * var(--ws-page-scale, 1));
    height: calc(297mm * var(--ws-page-scale, 1));
    border-radius: 16px;
    overflow: var(--ws-page-overflow, visible);
  }

  .ws-page-scale {
    width: 210mm;
    height: 297mm;
    transform: scale(var(--ws-page-scale, 1));
    transform-origin: top left;
    position: relative;
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
  .ws-element-content .ws-activity-instructions {
    margin: 0 0 8px 0;
    font-size: 12px;
    font-weight: 600;
  }
  .ws-word-bank {
    margin: 0 0 8px 0;
    font-size: 12px;
  }
  .ws-word-bank-item {
    margin-right: 6px;
  }
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
  .ws-element-content ol.ws-mcq {
    list-style-position: outside;
    padding-left: 1.5rem;
  }
  .ws-element-content .ws-q { display: inline; }

  .ws-theme--ocean,
  .ws-info-theme--ocean {
    --ws-info-header-from: #1e3a8a;
    --ws-info-header-to: #0ea5e9;
    --ws-info-header-ink: #ffffff;
    --ws-info-card-from: #f8fafc;
    --ws-info-card-to: #e2e8f0;
    --ws-info-card-bg: #ffffff;
    --ws-info-card-border: #cbd5f0;
    --ws-info-title: #0f172a;
    --ws-info-ink: #0f172a;
    --ws-info-accent: #0ea5e9;
    --ws-info-accent-strong: #1e3a8a;
    --ws-info-shadow: rgba(15, 23, 42, 0.12);
    --ws-info-fun-1: #dbeafe;
    --ws-info-fun-2: #e0f2fe;
    --ws-info-fun-3: #cffafe;
    --ws-info-paper: #f8fafc;
  }
  .ws-theme--sunset,
  .ws-info-theme--sunset {
    --ws-info-header-from: #f97316;
    --ws-info-header-to: #f59e0b;
    --ws-info-header-ink: #ffffff;
    --ws-info-card-from: #fff7ed;
    --ws-info-card-to: #fed7aa;
    --ws-info-card-bg: #fff7ed;
    --ws-info-card-border: #fdba74;
    --ws-info-title: #b45309;
    --ws-info-ink: #7c2d12;
    --ws-info-accent: #f97316;
    --ws-info-accent-strong: #c2410c;
    --ws-info-shadow: rgba(124, 45, 18, 0.12);
    --ws-info-fun-1: #ffedd5;
    --ws-info-fun-2: #fde68a;
    --ws-info-fun-3: #fecaca;
    --ws-info-paper: #fff7ed;
  }
  .ws-theme--studio,
  .ws-info-theme--studio {
    --ws-info-header-from: #0f172a;
    --ws-info-header-to: #334155;
    --ws-info-header-ink: #ffffff;
    --ws-info-card-from: #f8fafc;
    --ws-info-card-to: #e2e8f0;
    --ws-info-card-bg: #f8fafc;
    --ws-info-card-border: #cbd5e1;
    --ws-info-title: #0f172a;
    --ws-info-ink: #0f172a;
    --ws-info-accent: #334155;
    --ws-info-accent-strong: #0f172a;
    --ws-info-shadow: rgba(15, 23, 42, 0.12);
    --ws-info-fun-1: #f1f5f9;
    --ws-info-fun-2: #e2e8f0;
    --ws-info-fun-3: #cbd5e1;
    --ws-info-paper: #ffffff;
  }
  .ws-theme--retro,
  .ws-info-theme--retro {
    --ws-info-header-from: #be123c;
    --ws-info-header-to: #f472b6;
    --ws-info-header-ink: #ffffff;
    --ws-info-card-from: #fff1f2;
    --ws-info-card-to: #ffe4e6;
    --ws-info-card-bg: #fff1f2;
    --ws-info-card-border: #fda4af;
    --ws-info-title: #9f1239;
    --ws-info-ink: #7f1d1d;
    --ws-info-accent: #f472b6;
    --ws-info-accent-strong: #be123c;
    --ws-info-shadow: rgba(159, 18, 57, 0.12);
    --ws-info-fun-1: #ffe4e6;
    --ws-info-fun-2: #fbcfe8;
    --ws-info-fun-3: #fecdd3;
    --ws-info-paper: #fff1f2;
  }
  .ws-theme--mint,
  .ws-info-theme--mint {
    --ws-info-header-from: #10b981;
    --ws-info-header-to: #14b8a6;
    --ws-info-header-ink: #ffffff;
    --ws-info-card-from: #ecfdf5;
    --ws-info-card-to: #ccfbf1;
    --ws-info-card-bg: #ecfdf5;
    --ws-info-card-border: #a7f3d0;
    --ws-info-title: #065f46;
    --ws-info-ink: #064e3b;
    --ws-info-accent: #10b981;
    --ws-info-accent-strong: #0f766e;
    --ws-info-shadow: rgba(6, 95, 70, 0.12);
    --ws-info-fun-1: #d1fae5;
    --ws-info-fun-2: #ccfbf1;
    --ws-info-fun-3: #ecfeff;
    --ws-info-paper: #ecfdf5;
  }
  .ws-theme--midnight,
  .ws-info-theme--midnight {
    --ws-info-header-from: #1e1b4b;
    --ws-info-header-to: #0f172a;
    --ws-info-header-ink: #ffffff;
    --ws-info-card-from: #0f172a;
    --ws-info-card-to: #1e293b;
    --ws-info-card-bg: #111827;
    --ws-info-card-border: #334155;
    --ws-info-title: #f8fafc;
    --ws-info-ink: #f8fafc;
    --ws-info-accent: #6366f1;
    --ws-info-accent-strong: #4338ca;
    --ws-info-shadow: rgba(15, 23, 42, 0.3);
    --ws-info-fun-1: #1f2937;
    --ws-info-fun-2: #1e293b;
    --ws-info-fun-3: #334155;
    --ws-info-paper: #0f172a;
  }
  .ws-theme--crimson,
  .ws-info-theme--crimson {
    --ws-info-header-from: #7f1d1d;
    --ws-info-header-to: #be123c;
    --ws-info-header-ink: #ffffff;
    --ws-info-card-from: #fff1f2;
    --ws-info-card-to: #ffe4e6;
    --ws-info-card-bg: #fff1f2;
    --ws-info-card-border: #fecdd3;
    --ws-info-title: #7f1d1d;
    --ws-info-ink: #7f1d1d;
    --ws-info-accent: #e11d48;
    --ws-info-accent-strong: #be123c;
    --ws-info-shadow: rgba(127, 29, 29, 0.16);
    --ws-info-fun-1: #ffe4e6;
    --ws-info-fun-2: #fecdd3;
    --ws-info-fun-3: #fbcfe8;
    --ws-info-paper: #fff1f2;
  }
  .ws-theme--forest,
  .ws-info-theme--forest {
    --ws-info-header-from: #0b2b1a;
    --ws-info-header-to: #14532d;
    --ws-info-header-ink: #ffffff;
    --ws-info-card-from: #f6f3ee;
    --ws-info-card-to: #eef3e7;
    --ws-info-card-bg: #f6f3ee;
    --ws-info-card-border: #cbd7c4;
    --ws-info-title: #0f2a1a;
    --ws-info-ink: #143222;
    --ws-info-accent: #14532d;
    --ws-info-accent-strong: #0b2b1a;
    --ws-info-shadow: rgba(20, 50, 34, 0.12);
    --ws-info-fun-1: #eef3e7;
    --ws-info-fun-2: #e4eadc;
    --ws-info-fun-3: #dbe3d2;
    --ws-info-paper: #f6f3ee;
  }

  .ws-info-header {
    border-radius: 16px;
    padding: 14px 18px;
    text-align: center;
    box-shadow: 0 6px 16px var(--ws-info-shadow, rgba(15, 23, 42, 0.15));
    background: linear-gradient(135deg, var(--ws-info-header-from, #1e3a8a), var(--ws-info-header-to, #0ea5e9));
    color: var(--ws-info-header-ink, #ffffff);
  }
  .ws-info-header__title {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .ws-info-header__subtitle {
    margin-top: 6px;
    font-size: 12px;
    opacity: 0.85;
  }
  .ws-info-header--classic {
    border-radius: 16px;
  }
  .ws-info-header--split {
    border-radius: 20px;
  }
  .ws-info-header--grid {
    border-radius: 14px;
  }
  .ws-info-header--minimal {
    background: var(--ws-info-accent-strong, #0f172a);
    box-shadow: none;
  }
  .ws-info-header--poster {
    border-radius: 26px;
    padding: 20px 26px;
    position: relative;
    overflow: hidden;
    background:
      repeating-linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.2) 0,
        rgba(255, 255, 255, 0.2) 8px,
        rgba(255, 255, 255, 0) 8px,
        rgba(255, 255, 255, 0) 16px
      ),
      linear-gradient(135deg, var(--ws-info-header-from, #1e3a8a), var(--ws-info-header-to, #0ea5e9));
  }
  .ws-info-header--poster .ws-info-header__title {
    font-size: 24px;
    letter-spacing: 0.08em;
  }
  .ws-info-header--poster::after {
    content: '';
    position: absolute;
    left: 10%;
    right: 10%;
    bottom: 8px;
    height: 3px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.55);
  }
  .ws-info-header--editorial {
    background: var(--ws-info-card-bg, #ffffff);
    color: var(--ws-info-ink, #0f172a);
    border: 1px solid var(--ws-info-card-border, #e2e8f0);
    box-shadow: none;
    text-align: left;
    padding: 16px 18px 20px;
    position: relative;
    overflow: hidden;
  }
  .ws-info-header--editorial .ws-info-header__title {
    text-transform: none;
    letter-spacing: 0.02em;
  }
  .ws-info-header--editorial::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 4px;
    background: linear-gradient(90deg, var(--ws-info-accent, #0ea5e9), var(--ws-info-header-to, #0ea5e9));
  }
  .ws-info-header--playful {
    border-radius: 999px;
    box-shadow: 0 10px 18px var(--ws-info-shadow, rgba(15, 23, 42, 0.15));
  }
  .ws-info-header--playful .ws-info-header__title {
    text-transform: none;
    letter-spacing: 0.03em;
  }

  .ws-info-card {
    border-radius: 18px;
    padding: 14px 16px;
    border: 1px solid var(--ws-info-card-border, #e2e8f0);
    background: var(--ws-info-card-bg, #ffffff);
    box-shadow: 0 6px 16px var(--ws-info-shadow, rgba(15, 23, 42, 0.08));
    color: var(--ws-info-ink, #0f172a);
  }
  .ws-info-card__title {
    font-weight: 700;
    font-size: 14px;
    margin-bottom: 6px;
    color: var(--ws-info-title, #0f172a);
  }
  .ws-info-card__body p {
    margin: 0 0 6px 0;
  }
  .ws-info-card__body ul,
  .ws-info-card__body ol {
    margin: 4px 0 6px 0;
    padding-left: 1.1rem;
  }

  .ws-info-card--classic {
    background: linear-gradient(135deg, var(--ws-info-card-from, #f8fafc), var(--ws-info-card-to, #e2e8f0));
    border-color: var(--ws-info-card-border, #cbd5f0);
  }

  .ws-info-card--split {
    background: var(--ws-info-card-bg, #fff7ed);
    border-color: var(--ws-info-card-border, #fed7aa);
    border-left: 5px solid var(--ws-info-accent, #fb923c);
  }

  .ws-info-card--grid {
    background: var(--ws-info-card-bg, #f8fafc);
    border-color: var(--ws-info-card-border, #cbd5e1);
    box-shadow: 0 4px 10px var(--ws-info-shadow, rgba(15, 23, 42, 0.08));
  }

  .ws-info-card--minimal {
    background: var(--ws-info-card-bg, #ffffff);
    border-color: var(--ws-info-card-border, #e2e8f0);
    box-shadow: none;
  }

  .ws-info-card--poster {
    border-radius: 22px;
    border: 2px solid var(--ws-info-accent, #0ea5e9);
    background: var(--ws-info-paper, #ffffff);
    position: relative;
    overflow: hidden;
    box-shadow: 0 14px 26px var(--ws-info-shadow, rgba(15, 23, 42, 0.18));
  }
  .ws-info-card--poster::before {
    content: '';
    position: absolute;
    inset: 0;
    border-top: 8px solid var(--ws-info-accent-strong, #1e3a8a);
    pointer-events: none;
  }
  .ws-info-card--poster::after {
    content: '';
    position: absolute;
    right: 12px;
    top: 12px;
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.75);
  }

  .ws-info-card--editorial {
    border-radius: 14px;
    border: 1px solid var(--ws-info-card-border, #e2e8f0);
    border-top: 4px solid var(--ws-info-accent, #0ea5e9);
    background: var(--ws-info-paper, #ffffff);
    box-shadow: none;
  }

  .ws-info-card--playful {
    border-radius: 20px;
    border: 2px dashed var(--ws-info-accent, #10b981);
    background: var(--ws-info-card-bg, #ecfdf5);
    box-shadow: 0 8px 18px var(--ws-info-shadow, rgba(6, 95, 70, 0.12));
    position: relative;
  }
  .ws-info-card--playful::before {
    content: '';
    position: absolute;
    top: 12px;
    right: 12px;
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: var(--ws-info-accent, #10b981);
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2);
  }

  .ws-info-card--variant-hero {
    background: linear-gradient(135deg, var(--ws-info-accent-strong, #1e3a8a), var(--ws-info-accent, #0ea5e9));
    color: #ffffff;
    border: none;
    box-shadow: 0 18px 30px var(--ws-info-shadow, rgba(15, 23, 42, 0.25));
  }
  .ws-info-card--variant-hero::after {
    display: none;
  }
  .ws-info-card--variant-hero .ws-info-card__title {
    color: #ffffff;
    font-size: 18px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .ws-info-card--variant-hero .ws-info-card__body {
    font-size: 13px;
  }

  .ws-info-card--variant-spotlight {
    border-left: 6px solid var(--ws-info-accent, #0ea5e9);
    background: var(--ws-info-card-bg, #ffffff);
    box-shadow: 0 10px 20px var(--ws-info-shadow, rgba(15, 23, 42, 0.16));
  }

  .ws-info-card--variant-rail {
    border-radius: 16px;
    border-style: dashed;
    background: var(--ws-info-card-from, #f8fafc);
    font-size: 12px;
  }
  .ws-info-card--variant-rail .ws-info-card__title {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 11px;
  }
  .ws-info-card--variant-main .ws-info-card__title {
    font-size: 16px;
    letter-spacing: 0.04em;
  }

  .ws-info-card--variant-playful-a {
    background: var(--ws-info-fun-1, #dbeafe);
  }
  .ws-info-card--variant-playful-b {
    background: var(--ws-info-fun-2, #e0f2fe);
  }
  .ws-info-card--variant-playful-c {
    background: var(--ws-info-fun-3, #cffafe);
  }

  .ws-pages-wrap .ws-element-content h1,
  .ws-pages-wrap .ws-element-content h2,
  .ws-pages-wrap .ws-element-content h3 {
    color: var(--ws-info-accent-strong, #0f172a);
  }

  .ws-theme--midnight .ws-placed-element:not([data-element-kind]) .ws-element-content {
    color: var(--ws-info-ink, #f8fafc) !important;
  }
  .ws-theme--midnight .ws-placed-element:not([data-element-kind]) .ws-element-content h1,
  .ws-theme--midnight .ws-placed-element:not([data-element-kind]) .ws-element-content h2,
  .ws-theme--midnight .ws-placed-element:not([data-element-kind]) .ws-element-content h3 {
    color: #ffffff !important;
  }

  .ws-template--classic .ws-placed-element[data-element-type]:not([data-element-type="image"]):not([data-element-kind]) {
    background: var(--ws-info-card-bg, #ffffff) !important;
    border: 1px solid var(--ws-info-card-border, #e2e8f0) !important;
    box-shadow: 0 6px 16px var(--ws-info-shadow, rgba(15, 23, 42, 0.08)) !important;
    border-radius: 16px !important;
  }

  .ws-template--split .ws-placed-element[data-element-type]:not([data-element-type="image"]):not([data-element-kind]) {
    background: var(--ws-info-card-bg, #ffffff) !important;
    border: 1px solid var(--ws-info-card-border, #e2e8f0) !important;
    border-left: 6px solid var(--ws-info-accent, #0ea5e9) !important;
    border-radius: 14px !important;
    box-shadow: 0 4px 12px var(--ws-info-shadow, rgba(15, 23, 42, 0.08)) !important;
  }

  .ws-template--grid .ws-placed-element[data-element-type]:not([data-element-type="image"]):not([data-element-kind]) {
    background: var(--ws-info-card-bg, #ffffff) !important;
    border: 1px solid var(--ws-info-card-border, #e2e8f0) !important;
    border-radius: 12px !important;
    box-shadow: none !important;
  }

  .ws-template--minimal .ws-placed-element[data-element-type]:not([data-element-type="image"]):not([data-element-kind]) {
    background: transparent !important;
    border: none !important;
    border-bottom: 1px solid var(--ws-info-card-border, #e2e8f0) !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  .ws-template--poster .ws-placed-element[data-element-type]:not([data-element-type="image"]):not([data-element-kind]) {
    background: linear-gradient(135deg, var(--ws-info-card-from, #f8fafc), var(--ws-info-card-to, #e2e8f0)) !important;
    border: 2px solid var(--ws-info-accent, #0ea5e9) !important;
    border-radius: 22px !important;
    box-shadow: 0 14px 26px var(--ws-info-shadow, rgba(15, 23, 42, 0.18)) !important;
  }

  .ws-template--editorial .ws-placed-element[data-element-type]:not([data-element-type="image"]):not([data-element-kind]) {
    background: var(--ws-info-paper, #ffffff) !important;
    border: 1px solid var(--ws-info-card-border, #e2e8f0) !important;
    border-top: 4px solid var(--ws-info-accent, #0ea5e9) !important;
    border-radius: 10px !important;
    box-shadow: none !important;
  }

  .ws-template--playful .ws-placed-element[data-element-type]:not([data-element-type="image"]):not([data-element-kind]) {
    background: var(--ws-info-fun-1, #dbeafe) !important;
    border: 2px dashed var(--ws-info-accent, #0ea5e9) !important;
    border-radius: 20px !important;
    box-shadow: 0 10px 20px var(--ws-info-shadow, rgba(15, 23, 42, 0.12)) !important;
  }

  .ws-template--poster .ws-element-content h3 {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--ws-info-accent, #0ea5e9);
    color: #ffffff;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 11px;
  }

  .ws-template--editorial .ws-element-content h3 {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 11px;
    border-bottom: 1px solid var(--ws-info-card-border, #e2e8f0);
    padding-bottom: 4px;
  }

  .ws-template--playful .ws-element-content h3 {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 8px;
    background: var(--ws-info-fun-2, #e0f2fe);
    color: var(--ws-info-accent-strong, #0f172a);
  }

  .ws-pages-wrap .ws-element-content .ws-table th {
    background: var(--ws-info-card-from, #f8fafc);
    color: var(--ws-info-ink, #0f172a);
  }
  .ws-template--poster .ws-element-content .ws-table th {
    background: var(--ws-info-accent-strong, #1e3a8a);
    color: #ffffff;
  }

  .ws-theme--midnight .ws-page,
  .ws-theme--midnight .ws-page-inner {
    background: var(--ws-info-paper, #0f172a) !important;
  }
  .ws-theme--midnight .ws-page {
    border-color: #1f2937 !important;
  }
  .ws-theme--midnight .ws-page-margin-guides {
    border-color: rgba(148, 163, 184, 0.35) !important;
  }
  .ws-theme--forest .ws-page,
  .ws-theme--forest .ws-page-inner {
    background: var(--ws-info-paper, #f6f3ee) !important;
  }
  .ws-theme--forest .ws-page {
    border-color: #e4e0d6 !important;
  }

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
  .ws-element-content .ws-table {
    width: 100%;
    height: 100%;
    table-layout: fixed;
    border-collapse: collapse;
  }

  .ws-element-content .ws-wordsearch-table td {
    text-align: center;
    font-weight: 600;
    letter-spacing: 0.08em;
  }
  .ws-element-content .ws-wordsearch {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .ws-element-content .ws-wordsearch-grid {
    flex: 1;
    min-height: 0;
    width: 100%;
  }
  .ws-element-content .ws-wordsearch-table {
    width: 100%;
    height: 100%;
    table-layout: fixed;
  }
  .ws-element-content .ws-wordsearch-words-box {
    padding: 4px 0;
    background: transparent;
  }
  .ws-wordsearch-words { font-size: inherit; }
  .ws-wordsearch-word { margin-right: 6px; }
  .ws-wordsearch-words-title {
    font-weight: 600;
    margin-bottom: 6px;
  }
  .ws-wordsearch-words-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
    gap: 8px;
  }
  .ws-wordsearch-word-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 6px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: #ffffff;
    text-align: center;
  }
  .ws-wordsearch-word-card--text {
    justify-content: center;
    font-weight: 600;
    min-height: 70px;
  }
  .ws-wordsearch-word-img {
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    border-radius: 6px;
  }
  .ws-wordsearch-word-label {
    font-size: 10px;
    font-weight: 600;
    color: inherit;
  }

  .ws-transform-instructions {
    font-size: 12px;
    font-weight: 600;
    margin: 0 0 8px 0;
  }
  .ws-transform-keyword {
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin: 4px 0 6px 0;
  }

  .ws-element-content .ws-matching-table {
    width: 100%;
    border-collapse: collapse;
  }
  .ws-element-content .ws-matching-table td {
    border: 1px solid transparent;
    padding: 6px 8px;
    vertical-align: middle;
  }
  .ws-matching-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ws-matching-image {
    width: 48px;
    height: 48px;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
  }
  .ws-matching-label {
    font-size: 11px;
    font-weight: 600;
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

  .ws-add-page {
    width: calc(210mm * var(--ws-page-scale, 1));
  }

  @media print {
    @page { size: A4; margin: 0; }
    html, body { background: white !important; }

    .ws-page {
      box-shadow: none !important;
      border: none !important;
      break-after: page;
      page-break-after: always;
      width: 210mm !important;
      height: 297mm !important;
      margin: 0 !important;
      overflow: visible !important;
    }
    .ws-pages-wrap > .ws-page:last-of-type { break-after: auto; page-break-after: auto; }
    .ws-page-inner { overflow: visible; }
    .ws-page-scale { transform: none !important; width: 210mm !important; height: 297mm !important; }
    .ws-element-drag-handle, .ws-resize-handle, .ws-placed-element { box-shadow: none !important; }
    .ws-element-drag-handle, .ws-resize-handle { display: none !important; }
    .ws-canvas { background: white !important; overflow: visible !important; }
    .ws-pages-wrap {
      display: block !important;
      --ws-page-scale: 1 !important;
      --ws-page-overflow: visible !important;
      padding: 0 !important;
      gap: 0 !important;
      align-items: flex-start !important;
      overflow: visible !important;
    }

    .no-print { display: none !important; }
    #printable-area { width: 100% !important; }

    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
`;
