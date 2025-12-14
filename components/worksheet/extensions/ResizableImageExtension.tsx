import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useState, useRef, useEffect } from 'react';

// React component for the image node view
const ResizableImageComponent = ({ node, updateAttributes, selected }: any) => {
  const [isResizing, setIsResizing] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [hoverHandle, setHoverHandle] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });

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
    };
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSelected(true);
  };

  const handleImageDragStart = (e: React.MouseEvent) => {
    // Only start dragging if not clicking on a resize handle
    if ((e.target as HTMLElement).classList.contains('resize-handle')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    setIsSelected(true);

    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      width: node.attrs.width || 0,
      height: node.attrs.height || 0,
      posX: node.attrs.posX || 0,
      posY: node.attrs.posY || 0,
    };
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsSelected(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSelected && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        // The node will be deleted by TipTap's built-in behavior
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSelected]);

  // Handle dragging to reposition
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startPos.current.x;
      const deltaY = e.clientY - startPos.current.y;

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

      const deltaX = e.clientX - startPos.current.x;
      const deltaY = e.clientY - startPos.current.y;

      let newWidth = startPos.current.width;
      let newHeight = startPos.current.height;

      // Calculate new dimensions based on which handle is being dragged
      if (resizeHandle === 'se' || resizeHandle === 'nw' || resizeHandle === 'ne' || resizeHandle === 'sw') {
        // Corner resize - maintain aspect ratio
        const aspectRatio = startPos.current.width / startPos.current.height;

        if (resizeHandle === 'se') {
          newWidth = startPos.current.width + deltaX;
        } else if (resizeHandle === 'nw') {
          newWidth = startPos.current.width - deltaX;
        } else if (resizeHandle === 'ne') {
          newWidth = startPos.current.width + deltaX;
        } else if (resizeHandle === 'sw') {
          newWidth = startPos.current.width - deltaX;
        }

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

      // Update the attributes
      updateAttributes({
        width: Math.round(newWidth),
        height: Math.round(newHeight),
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
  const showHandles = isSelected || isResizing || isDragging;

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
    maxWidth: '100%',
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
        onClick={handleImageClick}
        onMouseDown={handleImageDragStart}
        draggable={false}
        style={{
          width: width ? `${width}px` : 'auto',
          height: height ? `${height}px` : 'auto',
          display: 'block',
          cursor: isDragging ? 'grabbing' : (isSelected ? 'grab' : 'pointer'),
          border: showHandles ? '2px solid #3b82f6' : '2px solid transparent',
          userSelect: 'none',
        }}
      />

      {/* Resize handles - only show when selected and hide in print */}
      {showHandles && (
        <div className="image-resize-handles" style={{ display: 'block' }}>
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
              cursor: getCursor('nw'),
              zIndex: 10,
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
              cursor: getCursor('ne'),
              zIndex: 10,
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
              cursor: getCursor('se'),
              zIndex: 10,
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
              cursor: getCursor('sw'),
              zIndex: 10,
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
              width: '40px',
              height: '12px',
              backgroundColor: '#3b82f6',
              border: '2px solid white',
              borderRadius: '6px',
              cursor: getCursor('n'),
              zIndex: 10,
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
              width: '40px',
              height: '12px',
              backgroundColor: '#3b82f6',
              border: '2px solid white',
              borderRadius: '6px',
              cursor: getCursor('s'),
              zIndex: 10,
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
              height: '40px',
              backgroundColor: '#3b82f6',
              border: '2px solid white',
              borderRadius: '6px',
              cursor: getCursor('e'),
              zIndex: 10,
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
              height: '40px',
              backgroundColor: '#3b82f6',
              border: '2px solid white',
              borderRadius: '6px',
              cursor: getCursor('w'),
              zIndex: 10,
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
          .resizable-image-wrapper img {
            border: none !important;
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
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
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

  addCommands() {
    return {
      setImage: (options: { src: string; alt?: string; title?: string; width?: number; height?: number; posX?: number; posY?: number }) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },
});
