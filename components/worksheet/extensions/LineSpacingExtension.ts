import { Extension } from '@tiptap/core';

export interface LineSpacingOptions {
  types: string[];
  defaultLineHeight: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lineSpacing: {
      setLineSpacing: (lineHeight: string) => ReturnType;
    };
  }
}

export const LineSpacing = Extension.create<LineSpacingOptions>({
  name: 'lineSpacing',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
      defaultLineHeight: '1.5',
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: this.options.defaultLineHeight,
            parseHTML: element => element.style.lineHeight || this.options.defaultLineHeight,
            renderHTML: attributes => {
              if (!attributes.lineHeight) {
                return {};
              }
              return {
                style: `line-height: ${attributes.lineHeight}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineSpacing: (lineHeight: string) => ({ commands }) => {
        return this.options.types.every(type =>
          commands.updateAttributes(type, { lineHeight })
        );
      },
    };
  },
});
