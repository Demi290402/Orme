import { useRef, useEffect } from 'react';
import {
    Bold, Italic, Underline, Strikethrough,
    AlignLeft, AlignCenter, AlignRight,
    List, ListOrdered, Indent, Outdent,
    Undo2, Redo2,
    Link, Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
    value: string;
    onChange: (val: string) => void;
    minHeight?: string;
    placeholder?: string;
}

export default function RichTextEditor({ value, onChange, minHeight = '150px', placeholder }: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const execCmd = (cmd: string, val?: string) => {
        editorRef.current?.focus();
        document.execCommand(cmd, false, val ?? undefined);
        if (editorRef.current) onChange(editorRef.current.innerHTML);
    };

    const insertImage = () => {
        const url = prompt('Inserisci URL immagine:');
        if (url) execCmd('insertImage', url);
    };

    const insertLink = () => {
        const url = prompt('Inserisci URL link:');
        if (url) execCmd('createLink', url);
    };

    const handleInput = () => {
        if (editorRef.current) onChange(editorRef.current.innerHTML);
    };

    const Separator = () => <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-0.5 shrink-0" />;

    const Btn = ({ onClick, children, title }: { onClick: () => void; children: React.ReactNode; title: string }) => (
        <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onClick(); }}
            title={title}
            className="p-1.5 hover:bg-white dark:hover:bg-gray-600 hover:shadow-sm rounded-lg text-gray-600 dark:text-gray-300 transition-all active:scale-95"
        >
            {children}
        </button>
    );

    return (
        <div className="border border-gray-200 dark:border-gray-600 rounded-2xl overflow-hidden bg-white dark:bg-gray-800 flex flex-col hover:border-scout-blue transition-colors focus-within:border-scout-blue focus-within:ring-2 focus-within:ring-scout-blue/20">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-gray-100 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">

                {/* Undo / Redo */}
                <Btn onClick={() => execCmd('undo')} title="Annulla"><Undo2 size={15} /></Btn>
                <Btn onClick={() => execCmd('redo')} title="Ripristina"><Redo2 size={15} /></Btn>

                <Separator />

                {/* Paragraph style */}
                <select
                    onMouseDown={(e) => e.stopPropagation()}
                    onChange={(e) => { execCmd('formatBlock', e.target.value); (e.target as HTMLSelectElement).value = ''; }}
                    defaultValue=""
                    className="h-7 px-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs outline-none focus:ring-1 focus:ring-scout-blue text-gray-600 dark:text-gray-200 cursor-pointer"
                    title="Stile paragrafo"
                >
                    <option value="" disabled>Stile</option>
                    <option value="h1">Titolo 1</option>
                    <option value="h2">Titolo 2</option>
                    <option value="h3">Titolo 3</option>
                    <option value="p">Paragrafo</option>
                </select>

                <Separator />

                {/* Format */}
                <Btn onClick={() => execCmd('bold')} title="Grassetto (Ctrl+B)"><Bold size={15} /></Btn>
                <Btn onClick={() => execCmd('italic')} title="Corsivo (Ctrl+I)"><Italic size={15} /></Btn>
                <Btn onClick={() => execCmd('underline')} title="Sottolineato (Ctrl+U)"><Underline size={15} /></Btn>
                <Btn onClick={() => execCmd('strikeThrough')} title="Barrato"><Strikethrough size={15} /></Btn>

                <Separator />

                {/* Font size */}
                <select
                    onMouseDown={(e) => e.stopPropagation()}
                    onChange={(e) => { execCmd('fontSize', e.target.value); (e.target as HTMLSelectElement).value = ''; }}
                    defaultValue=""
                    className="h-7 px-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs outline-none focus:ring-1 focus:ring-scout-blue text-gray-600 dark:text-gray-200 cursor-pointer"
                    title="Dimensione testo"
                >
                    <option value="" disabled>Dim.</option>
                    <option value="1">XS</option>
                    <option value="2">S</option>
                    <option value="3">M</option>
                    <option value="4">L</option>
                    <option value="5">XL</option>
                    <option value="6">XXL</option>
                    <option value="7">XXXL</option>
                </select>

                {/* Text color */}
                <label className="relative w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm cursor-pointer transition-all" title="Colore testo">
                    <span className="text-xs font-black text-gray-700 select-none">A</span>
                    <input
                        type="color"
                        defaultValue="#000000"
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        onChange={(e) => execCmd('foreColor', e.target.value)}
                    />
                </label>

                {/* Highlight / background color */}
                <label className="relative w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm cursor-pointer transition-all" title="Evidenziatore">
                    <span className="text-xs font-black select-none" style={{ color: '#b45309' }}>H</span>
                    <input
                        type="color"
                        defaultValue="#fde68a"
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        onChange={(e) => execCmd('hiliteColor', e.target.value)}
                    />
                </label>

                <Separator />

                {/* Lists & indent */}
                <Btn onClick={() => execCmd('insertUnorderedList')} title="Elenco puntato"><List size={15} /></Btn>
                <Btn onClick={() => execCmd('insertOrderedList')} title="Elenco numerato"><ListOrdered size={15} /></Btn>
                <Btn onClick={() => execCmd('indent')} title="Aumenta rientro"><Indent size={15} /></Btn>
                <Btn onClick={() => execCmd('outdent')} title="Diminuisci rientro"><Outdent size={15} /></Btn>

                <Separator />

                {/* Alignment */}
                <Btn onClick={() => execCmd('justifyLeft')} title="Allinea a sinistra"><AlignLeft size={15} /></Btn>
                <Btn onClick={() => execCmd('justifyCenter')} title="Allinea al centro"><AlignCenter size={15} /></Btn>
                <Btn onClick={() => execCmd('justifyRight')} title="Allinea a destra"><AlignRight size={15} /></Btn>

                <Separator />

                {/* Insert */}
                <Btn onClick={insertLink} title="Inserisci link"><Link size={15} /></Btn>
                <Btn onClick={insertImage} title="Inserisci immagine"><ImageIcon size={15} /></Btn>
            </div>

            {/* Editable area */}
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onBlur={handleInput}
                data-placeholder={placeholder}
                className={cn(
                    "p-4 overflow-y-auto outline-none text-gray-800 dark:text-gray-100 dark:bg-gray-800",
                    "prose prose-sm max-w-none dark:prose-invert",
                    "prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-base prose-headings:my-1",
                    "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
                    "[&_li]:my-0.5",
                    "prose-img:max-h-32 prose-img:m-0 prose-img:inline-block prose-p:m-0",
                    "empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 dark:empty:before:text-gray-500 empty:before:pointer-events-none"
                )}
                style={{ minHeight }}
                onPaste={(e) => {
                    e.preventDefault();
                    const html = e.clipboardData.getData('text/html');
                    const text = e.clipboardData.getData('text/plain');
                    if (html) {
                        const div = document.createElement('div');
                        div.innerHTML = html;
                        const allowed = new Set(['b', 'i', 'u', 's', 'strong', 'em', 'ul', 'ol', 'li', 'p', 'br', 'h1', 'h2', 'h3', 'a', 'span']);
                        Array.from(div.querySelectorAll('*')).reverse().forEach(el => {
                            if (!allowed.has(el.tagName.toLowerCase())) {
                                el.replaceWith(...Array.from(el.childNodes));
                            } else {
                                const keep = el.tagName.toLowerCase() === 'a' ? ['href'] : [];
                                Array.from(el.attributes).forEach(a => {
                                    if (!keep.includes(a.name)) el.removeAttribute(a.name);
                                });
                            }
                        });
                        document.execCommand('insertHTML', false, div.innerHTML);
                    } else {
                        document.execCommand('insertText', false, text);
                    }
                    if (editorRef.current) onChange(editorRef.current.innerHTML);
                }}
            />
        </div>
    );
}
