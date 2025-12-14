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
    return {
      Tab: () => this.editor.commands.indent(),
      'Shift-Tab': () => this.editor.commands.outdent(),
    };
  },
});
