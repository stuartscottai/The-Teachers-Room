import { Extension } from '@tiptap/core';

export interface IndentOptions {
  types: string[];
  indentStep: number;
  maxIndent: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType;
      outdent: () => ReturnType;
    };
  }
}

export const IndentExtension = Extension.create<IndentOptions>({
  name: 'indent',
  priority: 1000,

  addOptions() {
    return {
      types: ['paragraph', 'heading', 'listItem'],
      indentStep: 30, // 30px per indent level
      maxIndent: 5,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: element => {
              const paddingLeft = element.style.paddingLeft;
              if (!paddingLeft) return 0;
              return Math.round(parseInt(paddingLeft) / this.options.indentStep);
            },
            renderHTML: attributes => {
              if (!attributes.indent || attributes.indent === 0) {
                return {};
              }
              return {
                style: `padding-left: ${attributes.indent * this.options.indentStep}px`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      indent: () => ({ commands, state }) => {
        const { selection } = state;
        const { $from } = selection;
        const node = $from.node();

        return this.options.types.some(type => {
          if (node.type.name === type) {
            const currentIndent = node.attrs.indent || 0;
            const newIndent = Math.min(currentIndent + 1, this.options.maxIndent);
            return commands.updateAttributes(type, { indent: newIndent });
          }
          return false;
        });
      },
      outdent: () => ({ commands, state }) => {
        const { selection } = state;
        const { $from } = selection;
        const node = $from.node();

        return this.options.types.some(type => {
          if (node.type.name === type) {
            const currentIndent = node.attrs.indent || 0;
            const newIndent = Math.max(currentIndent - 1, 0);
            return commands.updateAttributes(type, { indent: newIndent });
          }
          return false;
        });
      },
    };
  },

  addKeyboardShortcuts() {
    const isInTable = () =>
      this.editor.isActive('table') ||
      this.editor.isActive('tableCell') ||
      this.editor.isActive('tableHeader');

    return {
      Tab: () => {
        if (isInTable()) return false;
        // Insert 4 non-breaking spaces at cursor position
        const tabSpaces = '\u00A0\u00A0\u00A0\u00A0';
        return this.editor.commands.insertContent(tabSpaces);
      },
      'Shift-Tab': () => {
        if (isInTable()) return false;
        // Shift-Tab removes spaces before cursor
        const { state } = this.editor;
        const { selection } = state;
        const { $from } = selection;

        // Get text before cursor in current node
        const textBefore = $from.parent.textBetween(0, $from.parentOffset);

        // Check if there are non-breaking spaces immediately before cursor
        const nbspMatch = textBefore.match(/(\u00A0+)$/);
        const nbspCount = nbspMatch?.[1]?.length || 0;

        if (nbspCount > 0) {
          // Delete up to 4 non-breaking spaces before cursor
          const deleteCount = Math.min(nbspCount, 4);
          const from = $from.pos - deleteCount;
          const to = $from.pos;

          this.editor.chain()
            .deleteRange({ from, to })
            .run();

          return true;
        }

        return false;
      },
    };
  },
});
