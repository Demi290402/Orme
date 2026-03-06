import { useRef, useEffect } from 'react';
import { Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RichTextEditor({ value, onChange }: { value: string, onChange: (val: string) => void }) {
    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const execCmd = (cmd: string, val: string | undefined = undefined) => {
        document.execCommand(cmd, false, val);
        editorRef.current?.focus();
        if (editorRef.current) onChange(editorRef.current.innerHTML);
    };

    const insertImage = () => {
        const url = prompt('Inserisci URL immagine:');
        if (url) {
            execCmd('insertImage', url);
        }
    };

    const handleInput = () => {
        if (editorRef.current) onChange(editorRef.current.innerHTML);
    };

    const ToolbarButton = ({ onClick, children, title }: any) => (
        <button
            type="button"
            className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors"
            onClick={(e) => { e.preventDefault(); onClick(); }}
            title={title}
        >
            {children}
        </button>
    );

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white flex flex-col hover:border-scout-blue transition-colors focus-within:border-scout-blue focus-within:ring-1 focus-within:ring-scout-blue">
            <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-100 bg-gray-50/50">
                <ToolbarButton onClick={() => execCmd('bold')} title="Grassetto"><Bold size={16} /></ToolbarButton>
                <ToolbarButton onClick={() => execCmd('italic')} title="Corsivo"><Italic size={16} /></ToolbarButton>
                <ToolbarButton onClick={() => execCmd('underline')} title="Sottolineato"><Underline size={16} /></ToolbarButton>
                <ToolbarButton onClick={() => execCmd('strikeThrough')} title="Barrato"><Strikethrough size={16} /></ToolbarButton>
                
                <div className="w-px h-4 bg-gray-200 mx-1" />
                
                <select 
                    onChange={(e) => execCmd('fontSize', e.target.value)} 
                    className="p-1 bg-transparent border border-gray-200 rounded text-xs outline-none focus:ring-1 focus:ring-scout-blue text-gray-600"
                    title="Dimensione"
                    defaultValue="3"
                >
                    <option value="1">Molto Piccolo</option>
                    <option value="2">Piccolo</option>
                    <option value="3">Normale</option>
                    <option value="4">Medio</option>
                    <option value="5">Grande</option>
                    <option value="6">Molto Grande</option>
                    <option value="7">Enorme</option>
                </select>

                <div className="w-px h-4 bg-gray-200 mx-1" />

                <input 
                    type="color" 
                    onChange={(e) => execCmd('foreColor', e.target.value)}
                    className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
                    title="Colore Testo"
                />

                <div className="w-px h-4 bg-gray-200 mx-1" />
                
                <ToolbarButton onClick={() => execCmd('justifyLeft')} title="Allinea a sinistra"><AlignLeft size={16} /></ToolbarButton>
                <ToolbarButton onClick={() => execCmd('justifyCenter')} title="Allinea al centro"><AlignCenter size={16} /></ToolbarButton>
                <ToolbarButton onClick={() => execCmd('justifyRight')} title="Allinea a destra"><AlignRight size={16} /></ToolbarButton>
                
                <div className="w-px h-4 bg-gray-200 mx-1" />

                <ToolbarButton onClick={insertImage} title="Inserisci Immagine"><ImageIcon size={16} /></ToolbarButton>
            </div>
            
            <div
                ref={editorRef}
                className={cn(
                    "p-4 min-h-[150px] max-h-[400px] overflow-y-auto outline-none prose prose-sm max-w-none text-gray-800",
                    "prose-img:max-h-32 prose-img:m-0 prose-img:inline-block prose-p:m-0"
                )}
                contentEditable
                onInput={handleInput}
                onBlur={handleInput}
            />
        </div>
    );
}
