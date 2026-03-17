import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import ImageResize from 'tiptap-extension-resize-image';
import { 
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, 
  AlignLeft, AlignCenter, AlignRight, Link as LinkIcon, 
  Image as ImageIcon, Sigma, Code, Quote, Type, Minus, 
  ChevronDown, X, Check, Subscript as SubIcon, Superscript as SuperIcon,
  Eraser, Type as TypeIcon
} from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const SmartEditor = ({ value, onChange, placeholder = "Start typing...", isDarkMode = false }) => {
  const [showMathModal, setShowMathModal] = useState(false);
  const [mathValue, setMathValue] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Subscript,
      Superscript,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
      Image.configure({ inline: true, allowBase64: true }),
      ImageResize,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none min-h-[150px] p-4 ${
          isDarkMode ? 'text-white' : 'text-slate-900'
        }`,
      },
      handlePaste: (view, event) => {
        const items = (event.clipboardData || event.originalEvent.clipboardData).items;
        for (const item of items) {
          if (item.type.indexOf('image') === 0) {
            const file = item.getAsFile();
            const reader = new FileReader();
            reader.onload = (e) => {
               editor.chain().focus().setImage({ src: e.target.result }).run();
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      }
    },
  });

  // Update editor content if value changes externally (but not from editor itself)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) return null;

  const ToolbarButton = ({ onClick, isActive = false, icon: Icon, title }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded transition-all ${
        isActive 
          ? 'bg-blue-600 text-white' 
          : isDarkMode ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon size={18} />
    </button>
  );

  const insertMath = () => {
    if (mathValue) {
      const rendered = katex.renderToString(mathValue, { throwOnError: false });
      // We wrap it in a span with a special class for later processing if needed
      editor.chain().focus().insertContent(`<span class="math-tex">${rendered}</span>&nbsp;`).run();
      setMathValue('');
      setShowMathModal(false);
    }
  };

  return (
    <div className={`rounded-[5px] border overflow-hidden transition-all duration-300 ${
      isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200'
    } focus-within:border-blue-500`}>
      {/* Toolbar */}
      <div className={`p-1 flex flex-wrap gap-1 border-b sticky top-0 z-10 ${
        isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-1 pr-2 border-r border-slate-200/50 dark:border-white/10">
           <ToolbarButton 
             onClick={() => editor.chain().focus().toggleBold().run()}
             isActive={editor.isActive('bold')}
             icon={Bold}
             title="Bold"
           />
           <ToolbarButton 
             onClick={() => editor.chain().focus().toggleItalic().run()}
             isActive={editor.isActive('italic')}
             icon={Italic}
             title="Italic"
           />
           <ToolbarButton 
             onClick={() => editor.chain().focus().toggleUnderline().run()}
             isActive={editor.isActive('underline')}
             icon={UnderlineIcon}
             title="Underline"
           />
        </div>

        <div className="flex items-center gap-1 px-2 border-r border-slate-200/50 dark:border-white/10">
           <ToolbarButton 
             onClick={() => editor.chain().focus().toggleBulletList().run()}
             isActive={editor.isActive('bulletList')}
             icon={List}
             title="Bullet List"
           />
           <ToolbarButton 
             onClick={() => editor.chain().focus().toggleOrderedList().run()}
             isActive={editor.isActive('orderedList')}
             icon={ListOrdered}
             title="Ordered List"
           />
        </div>

        <div className="flex items-center gap-1 px-2 border-r border-slate-200/50 dark:border-white/10">
           <ToolbarButton 
             onClick={() => editor.chain().focus().setTextAlign('left').run()}
             isActive={editor.isActive({ textAlign: 'left' })}
             icon={AlignLeft}
             title="Align Left"
           />
           <ToolbarButton 
             onClick={() => editor.chain().focus().setTextAlign('center').run()}
             isActive={editor.isActive({ textAlign: 'center' })}
             icon={AlignCenter}
             title="Align Center"
           />
           <ToolbarButton 
             onClick={() => editor.chain().focus().setTextAlign('right').run()}
             isActive={editor.isActive({ textAlign: 'right' })}
             icon={AlignRight}
             title="Align Right"
           />
        </div>

        <div className="flex items-center gap-1 px-2 border-r border-slate-200/50 dark:border-white/10">
           <ToolbarButton 
             onClick={() => editor.chain().focus().toggleSubscript().run()}
             isActive={editor.isActive('subscript')}
             icon={SubIcon}
             title="Subscript"
           />
           <ToolbarButton 
             onClick={() => editor.chain().focus().toggleSuperscript().run()}
             isActive={editor.isActive('superscript')}
             icon={SuperIcon}
             title="Superscript"
           />
        </div>

        <div className="flex items-center gap-1 px-2">
           <ToolbarButton 
             onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = (e) => {
                  editor.chain().focus().setImage({ src: e.target.result }).run();
                };
                reader.readAsDataURL(file);
              };
              input.click();
             }}
             icon={ImageIcon}
             title="Insert Image"
           />
           <ToolbarButton 
             onClick={() => setShowMathModal(true)}
             icon={Sigma}
             title="Insert Formula"
           />
           <ToolbarButton 
             onClick={() => editor.commands.clearContent()}
             icon={Eraser}
             title="Clear Everything"
           />
        </div>
      </div>

      {/* Editor Content */}
      <div className="relative">
        <style>
          {`
            .tiptap p.is-editor-empty:first-child::before {
              content: attr(data-placeholder);
              float: left;
              color: #adb5bd;
              pointer-events: none;
              height: 0;
            }
            .tiptap img {
              display: block;
              max-width: 100%;
              height: auto;
              transition: all 0.2s;
            }
            .tiptap img.ProseMirror-selectednode {
              outline: 3px solid #3b82f6;
              cursor: move;
            }
            .math-tex {
              display: inline-block;
              padding: 2px 4px;
              border-radius: 4px;
              background: rgba(59, 130, 246, 0.1);
            }
          `}
        </style>
        <EditorContent editor={editor} />
      </div>

      {/* Math Modal */}
      {showMathModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMathModal(false)} />
          <div className={`relative w-full max-w-xl rounded-[5px] overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#10141D]' : 'bg-white'}`}>
             <div className="bg-blue-600 p-6 flex justify-between items-center text-white">
                <div className="flex items-center gap-3">
                    <Sigma size={24} />
                    <h3 className="font-black uppercase tracking-widest text-sm">LaTeX Formula</h3>
                </div>
                <button onClick={() => setShowMathModal(false)}><X size={20} /></button>
             </div>
             <div className="p-8 space-y-6">
                <textarea
                  value={mathValue}
                  onChange={(e) => setMathValue(e.target.value)}
                  placeholder="e.g. E = mc^2"
                  className={`w-full h-32 p-4 rounded-[5px] border font-mono outline-none ${
                    isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
                <button 
                  onClick={insertMath}
                  className="w-full bg-blue-600 text-white font-black py-4 rounded-[5px] hover:bg-blue-700 uppercase tracking-widest text-xs"
                >
                  Insert Equation
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartEditor;
