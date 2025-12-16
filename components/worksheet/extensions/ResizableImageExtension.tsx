import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import React, { useState, useRef, useEffect } from 'react';

// React component for the image node view
const ResizableImageComponent = ({ node, updateAttributes, selected, editor, getPos }: any) => {
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [hoverHandle, setHoverHandle] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0, scale: 1 });

  const toCssSize = (value: any) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number' && Number.isFinite(value)) return `${value}px`;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (/^\d+(\.\d+)?$/.test(trimmed)) return `${trimmed}px`;
      return trimmed;
    }
    return undefined;
  };

  const getScale = () => {
    const img = imageRef.current;
    if (!img) return 1;
    const rect = img.getBoundingClientRect();
    const ow = img.offsetWidth || 0;
    if (!ow) return 1;
    const scale = rect.width / ow;
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
  };

  const selectNode = () => {
    try {
      const pos = typeof getPos === 'function' ? getPos() : getPos;
      if (typeof pos === 'number') {
        editor?.commands?.focus?.();
        editor?.commands?.setNodeSelection?.(pos);
      }
    } catch {
      // ignore
    }
  };

  const handleMouseDown = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    setResizeHandle(handle);

    const img = imageRef.current;
    if (!img) return;

    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      width: img.offsetWidth,
      height: img.offsetHeight,
      posX: node.attrs.posX || 0,
      posY: node.attrs.posY || 0,
      scale: getScale(),
    };

    selectNode();
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    selectNode();
  };

  const handleImageDragStart = (e: React.MouseEvent) => {
    // Only start dragging if not clicking on a resize handle
    if ((e.target as HTMLElement).classList.contains('resize-handle')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    selectNode();

    const img = imageRef.current;
    const width = img ? img.offsetWidth : parseInt(node.attrs.width || '0');
    const height = img ? img.offsetHeight : parseInt(node.attrs.height || '0');

    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      width,
      height,
      posX: node.attrs.posX || 0,
      posY: node.attrs.posY || 0,
      scale: getScale(),
    };
  };

  useEffect(() => {
    // keep local interaction states consistent if selection changes elsewhere
    if (!selected && !isResizing && !isDragging) {
      setResizeHandle(null);
    }
  }, [selected, isResizing, isDragging]);

  // Handle dragging to reposition
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = (e.clientX - startPos.current.x) / (startPos.current.scale || 1);
      const deltaY = (e.clientY - startPos.current.y) / (startPos.current.scale || 1);

      updateAttributes({
        posX: startPos.current.posX + deltaX,
        posY: startPos.current.posY + deltaY,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, updateAttributes]);

  // Handle resizing
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!imageRef.current || !resizeHandle) return;

      const deltaX = (e.clientX - startPos.current.x) / (startPos.current.scale || 1);
      const deltaY = (e.clientY - startPos.current.y) / (startPos.current.scale || 1);

      let newWidth = startPos.current.width;
      let newHeight = startPos.current.height;
      let newPosX = startPos.current.posX;
      let newPosY = startPos.current.posY;

      // Calculate new dimensions based on which handle is being dragged
      if (resizeHandle === 'se' || resizeHandle === 'nw' || resizeHandle === 'ne' || resizeHandle === 'sw') {
        // Corner resize - maintain aspect ratio
        const safeStartHeight = startPos.current.height || 1;
        const aspectRatio = startPos.current.width / safeStartHeight;

        const east = resizeHandle === 'se' || resizeHandle === 'ne';
        const south = resizeHandle === 'se' || resizeHandle === 'sw';
        const widthFromX = startPos.current.width + (east ? deltaX : -deltaX);
        const heightFromY = safeStartHeight + (south ? deltaY : -deltaY);
        const widthFromY = heightFromY * aspectRatio;

        newWidth = Math.abs(widthFromX - startPos.current.width) > Math.abs(widthFromY - startPos.current.width)
          ? widthFromX
          : widthFromY;
        newHeight = newWidth / aspectRatio;
      } else if (resizeHandle === 'e' || resizeHandle === 'w') {
        // Horizontal edge resize
        newWidth = resizeHandle === 'e'
          ? startPos.current.width + deltaX
          : startPos.current.width - deltaX;
      } else if (resizeHandle === 'n' || resizeHandle === 's') {
        // Vertical edge resize
        newHeight = resizeHandle === 's'
          ? startPos.current.height + deltaY
          : startPos.current.height - deltaY;
      }

      // Enforce minimum size
      newWidth = Math.max(50, newWidth);
      newHeight = Math.max(50, newHeight);

      // For positioned images, keep the opposite corner fixed when resizing from west/north handles
      const isPositioned = (startPos.current.posX || 0) !== 0 || (startPos.current.posY || 0) !== 0;
      if (isPositioned) {
        const west = resizeHandle === 'w' || resizeHandle === 'nw' || resizeHandle === 'sw';
        const north = resizeHandle === 'n' || resizeHandle === 'nw' || resizeHandle === 'ne';

        if (west) {
          newPosX = startPos.current.posX + (startPos.current.width - newWidth);
        }
        if (north) {
          newPosY = startPos.current.posY + (startPos.current.height - newHeight);
        }
      }

      // Update the attributes
      updateAttributes({
        width: Math.round(newWidth),
        height: Math.round(newHeight),
        posX: Math.round(newPosX),
        posY: Math.round(newPosY),
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeHandle(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeHandle, updateAttributes]);

  const width = node.attrs.width;
  const height = node.attrs.height;
  const posX = node.attrs.posX || 0;
  const posY = node.attrs.posY || 0;
  const showHandles = selected || isResizing || isDragging;

  // Check if image has been positioned (non-zero posX or posY)
  const isPositioned = posX !== 0 || posY !== 0;

  const getCursor = (handle: string) => {
    const cursors: { [key: string]: string } = {
      'nw': 'nwse-resize',
      'n': 'ns-resize',
      'ne': 'nesw-resize',
      'e': 'ew-resize',
      'se': 'nwse-resize',
      's': 'ns-resize',
      'sw': 'nesw-resize',
      'w': 'ew-resize',
    };
    return cursors[handle] || 'default';
  };

  const wrapperStyle: React.CSSProperties = {
    lineHeight: 0,
    display: 'inline-block',
    maxWidth: isPositioned ? 'none' : '100%',
    outline: showHandles ? '2px solid rgba(59, 130, 246, 0.9)' : '2px solid transparent',
    outlineOffset: showHandles ? '2px' : '0px',
    padding: 0,
    margin: 0,
  };

  if (isPositioned) {
    wrapperStyle.position = 'absolute';
    wrapperStyle.left = `${posX}px`;
    wrapperStyle.top = `${posY}px`;
    wrapperStyle.zIndex = 20;
  } else {
    wrapperStyle.position = 'relative';
  }

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className="resizable-image-wrapper"
      style={wrapperStyle}
    >
      <img
        ref={imageRef}
        src={node.attrs.src}
        alt={node.attrs.alt || ''}
        crossOrigin={typeof node.attrs.src === 'string' && node.attrs.src.startsWith('http') ? 'anonymous' : undefined}
        onClick={handleImageClick}
        onMouseDown={handleImageDragStart}
        draggable={false}
        style={{
          width: toCssSize(width) || 'auto',
          height: toCssSize(height) || 'auto',
          maxWidth: 'none',
          maxHeight: 'none',
          display: 'block',
          margin: 0,
          padding: 0,
          cursor: isDragging ? 'grabbing' : (selected ? 'grab' : 'pointer'),
          border: '2px solid transparent',
          userSelect: 'none',
          objectFit: 'fill',
        }}
      />

      {/* Resize handles - only show when selected and hide in print */}
      {showHandles && (
        <div
          className="image-resize-handles"
          style={{
            display: 'block',
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
          }}
        >
          <button
            type="button"
            aria-label="Remove image"
            title="Remove image"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              selectNode();
              try {
                editor?.chain?.().focus().deleteSelection().run();
              } catch {
                // ignore
              }
            }}
            style={{
              position: 'absolute',
              top: '-10px',
              right: '-10px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: '#ef4444',
              color: '#ffffff',
              WebkitTextFillColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 700,
              lineHeight: 1,
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              zIndex: 70,
              cursor: 'pointer',
              pointerEvents: 'auto',
              padding: 0,
            }}
          >
            ×
          </button>

          {/* Corner handles */}
          <div
            className="resize-handle"
            onMouseDown={(e) => handleMouseDown(e, 'nw')}
            onMouseEnter={() => setHoverHandle('nw')}
            onMouseLeave={() => setHoverHandle(null)}
            style={{
              position: 'absolute',
              left: '-6px',
              top: '-6px',
              width: '12px',
              height: '12px',
              backgroundColor: '#3b82f6',
              border: '2px solid white',
              borderRadius: '50%',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              cursor: getCursor('nw'),
              zIndex: 10,
              pointerEvents: 'auto',
            }}
          />
          <div
            className="resize-handle"
            onMouseDown={(e) => handleMouseDown(e, 'ne')}
            onMouseEnter={() => setHoverHandle('ne')}
            onMouseLeave={() => setHoverHandle(null)}
            style={{
              position: 'absolute',
              right: '-6px',
              top: '-6px',
              width: '12px',
              height: '12px',
              backgroundColor: '#3b82f6',
              border: '2px solid white',
              borderRadius: '50%',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              cursor: getCursor('ne'),
              zIndex: 10,
              pointerEvents: 'auto',
            }}
          />
          <div
            className="resize-handle"
            onMouseDown={(e) => handleMouseDown(e, 'se')}
            onMouseEnter={() => setHoverHandle('se')}
            onMouseLeave={() => setHoverHandle(null)}
            style={{
              position: 'absolute',
              right: '-6px',
              bottom: '-6px',
              width: '12px',
              height: '12px',
              backgroundColor: '#3b82f6',
              border: '2px solid white',
              borderRadius: '50%',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              cursor: getCursor('se'),
              zIndex: 10,
              pointerEvents: 'auto',
            }}
          />
          <div
            className="resize-handle"
            onMouseDown={(e) => handleMouseDown(e, 'sw')}
            onMouseEnter={() => setHoverHandle('sw')}
            onMouseLeave={() => setHoverHandle(null)}
            style={{
              position: 'absolute',
              left: '-6px',
              bottom: '-6px',
              width: '12px',
              height: '12px',
              backgroundColor: '#3b82f6',
              border: '2px solid white',
              borderRadius: '50%',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              cursor: getCursor('sw'),
              zIndex: 10,
              pointerEvents: 'auto',
            }}
          />

          {/* Edge handles */}
          <div
            className="resize-handle"
            onMouseDown={(e) => handleMouseDown(e, 'n')}
            onMouseEnter={() => setHoverHandle('n')}
            onMouseLeave={() => setHoverHandle(null)}
            style={{
              position: 'absolute',
              left: '50%',
              top: '-6px',
              transform: 'translateX(-50%)',
              width: '12px',
              height: '12px',
              backgroundColor: '#3b82f6',
              border: '2px solid white',
              borderRadius: '50%',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              cursor: getCursor('n'),
              zIndex: 10,
              pointerEvents: 'auto',
            }}
          />
          <div
            className="resize-handle"
            onMouseDown={(e) => handleMouseDown(e, 's')}
            onMouseEnter={() => setHoverHandle('s')}
            onMouseLeave={() => setHoverHandle(null)}
            style={{
              position: 'absolute',
              left: '50%',
              bottom: '-6px',
              transform: 'translateX(-50%)',
              width: '12px',
              height: '12px',
              backgroundColor: '#3b82f6',
              border: '2px solid white',
              borderRadius: '50%',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              cursor: getCursor('s'),
              zIndex: 10,
              pointerEvents: 'auto',
            }}
          />
          <div
            className="resize-handle"
            onMouseDown={(e) => handleMouseDown(e, 'e')}
            onMouseEnter={() => setHoverHandle('e')}
            onMouseLeave={() => setHoverHandle(null)}
            style={{
              position: 'absolute',
              right: '-6px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '12px',
              height: '12px',
              backgroundColor: '#3b82f6',
              border: '2px solid white',
              borderRadius: '50%',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              cursor: getCursor('e'),
              zIndex: 10,
              pointerEvents: 'auto',
            }}
          />
          <div
            className="resize-handle"
            onMouseDown={(e) => handleMouseDown(e, 'w')}
            onMouseEnter={() => setHoverHandle('w')}
            onMouseLeave={() => setHoverHandle(null)}
            style={{
              position: 'absolute',
              left: '-6px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '12px',
              height: '12px',
              backgroundColor: '#3b82f6',
              border: '2px solid white',
              borderRadius: '50%',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              cursor: getCursor('w'),
              zIndex: 10,
              pointerEvents: 'auto',
            }}
          />
        </div>
      )}

      {/* CSS to hide handles in print */}
      <style>{`
        @media print {
          .image-resize-handles {
            display: none !important;
          }
          .resizable-image-wrapper {
            outline: none !important;
          }
        }
      `}</style>
    </NodeViewWrapper>
  );
};

export const ResizableImage = Node.create({
  name: 'image',

  addOptions() {
    return {
      inline: false,
      allowBase64: true,
      HTMLAttributes: {},
    };
  },

  inline() {
    return this.options.inline;
  },

  group() {
    return 'block';
  },

  draggable: false,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      storagePath: {
        default: null,
        parseHTML: element => {
          return element.getAttribute('data-storage-path') || null;
        },
        renderHTML: attributes => {
          if (!attributes.storagePath) {
            return {};
          }
          return { 'data-storage-path': attributes.storagePath };
        },
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
        parseHTML: element => {
          const raw = element.getAttribute('width') || element.style.width || null;
          if (!raw) return null;
          const trimmed = raw.trim();
          const px = trimmed.match(/^(\d+(\.\d+)?)px$/i);
          if (px) return parseFloat(px[1]);
          const num = trimmed.match(/^(\d+(\.\d+)?)$/);
          if (num) return parseFloat(num[1]);
          return trimmed;
        },
        renderHTML: attributes => {
          if (!attributes.width) {
            return {};
          }
          return {
            width: typeof attributes.width === 'number' ? `${attributes.width}px` : attributes.width,
          };
        },
      },
      height: {
        default: null,
        parseHTML: element => {
          const raw = element.getAttribute('height') || element.style.height || null;
          if (!raw) return null;
          const trimmed = raw.trim();
          const px = trimmed.match(/^(\d+(\.\d+)?)px$/i);
          if (px) return parseFloat(px[1]);
          const num = trimmed.match(/^(\d+(\.\d+)?)$/);
          if (num) return parseFloat(num[1]);
          return trimmed;
        },
        renderHTML: attributes => {
          if (!attributes.height) {
            return {};
          }
          return {
            height: typeof attributes.height === 'number' ? `${attributes.height}px` : attributes.height,
          };
        },
      },
      posX: {
        default: 0,
        parseHTML: element => {
          return parseInt(element.getAttribute('data-pos-x') || '0');
        },
        renderHTML: attributes => {
          return {
            'data-pos-x': attributes.posX,
          };
        },
      },
      posY: {
        default: 0,
        parseHTML: element => {
          return parseInt(element.getAttribute('data-pos-y') || '0');
        },
        renderHTML: attributes => {
          return {
            'data-pos-y': attributes.posY,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: this.options.allowBase64
          ? 'img[src]'
          : 'img[src]:not([src^="data:"])',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },

  addKeyboardShortcuts() {
    const selectImageBeforeCursor = (editor: any) => {
      const { state, view } = editor;
      const { selection } = state;
      if (!selection.empty) return false;
      if (selection instanceof NodeSelection) return false;

      const { $from } = selection;
      const nodeBefore = $from.nodeBefore;
      if (!nodeBefore || nodeBefore.type.name !== this.name) return false;

      const pos = $from.pos - nodeBefore.nodeSize;
      view.dispatch(state.tr.setSelection(NodeSelection.create(state.doc, pos)));
      return true;
    };

    const selectImageAfterCursor = (editor: any) => {
      const { state, view } = editor;
      const { selection } = state;
      if (!selection.empty) return false;
      if (selection instanceof NodeSelection) return false;

      const { $from } = selection;
      const nodeAfter = $from.nodeAfter;
      if (!nodeAfter || nodeAfter.type.name !== this.name) return false;

      const pos = $from.pos;
      view.dispatch(state.tr.setSelection(NodeSelection.create(state.doc, pos)));
      return true;
    };

    return {
      Backspace: ({ editor }) => selectImageBeforeCursor(editor),
      Delete: ({ editor }) => selectImageAfterCursor(editor),
    };
  },

  addCommands() {
    return {
      setImage: (options: { src: string; storagePath?: string; alt?: string; title?: string; width?: number; height?: number; posX?: number; posY?: number }) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },
});
