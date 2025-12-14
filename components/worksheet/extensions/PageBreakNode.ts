import { Node, mergeAttributes } from '@tiptap/core';

export interface PageBreakOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: {
      setPageBreak: () => ReturnType;
    };
  }
}

export const PageBreak = Node.create<PageBreakOptions>({
  name: 'pageBreak',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  group: 'block',

  atom: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-page-break]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-page-break': 'true',
        class: 'page-break-indicator',
        contenteditable: 'false',
      }),
      'Page Break',
    ];
  },

  addCommands() {
    return {
      setPageBreak: () => ({ commands }) => {
        return commands.insertContent({ type: this.name });
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => this.editor.commands.setPageBreak(),
    };
  },
});
