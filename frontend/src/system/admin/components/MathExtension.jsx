import React from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import katex from 'katex';

const MathComponent = (props) => {
  const { latex, displayMode } = props.node.attrs;
  
  let rendered = '';
  try {
      rendered = katex.renderToString(latex || '', { 
          throwOnError: false, 
          displayMode: displayMode 
      });
  } catch(e) {
      rendered = latex;
  }

  return (
    <NodeViewWrapper 
        as="span" 
        className={`math-tex cursor-pointer ${displayMode ? 'block text-center my-2' : 'inline-block'}`}
        dangerouslySetInnerHTML={{ __html: rendered || '<em>empty math</em>' }}
    />
  );
};

export const MathExtension = Node.create({
  name: 'math',
  
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: { default: '' },
      displayMode: { 
          default: false,
          parseHTML: element => element.getAttribute('data-display-mode') === 'true'
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-latex]',
        getAttrs: (element) => ({
          latex: element.getAttribute('data-latex'),
          displayMode: element.getAttribute('data-display-mode') === 'true'
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 
        'data-latex': HTMLAttributes.latex,
        'data-display-mode': HTMLAttributes.displayMode ? 'true' : 'false'
    }), ''];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathComponent);
  },
});
