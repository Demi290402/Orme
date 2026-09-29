import { useRef, useEffect, useState, useCallback } from 'react';
import {
    Bold, Italic, Underline, Strikethrough,
    AlignLeft, AlignCenter, AlignRight,
    List, ListOrdered, Indent, Outdent,
    Undo2, Redo2,
    Link, Image as ImageIcon,
    Table as TableIcon,
    Plus, Trash2, Palette,
    Check, X, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
    value: string;
    onChange: (val: string) => void;
    minHeight?: string;
    placeholder?: string;
}

// Stili predefiniti Word-like per tabelle
export interface TableStylePreset {
    id: string;
    label: string;
    description: string;
    headerBg: string;
    headerTextColor: string;
    borderColor: string;
    borderStyle: 'solid' | 'dashed' | 'dotted';
    borderWidth: number;
    borderType: 'all' | 'horizontal' | 'outer' | 'none';
    zebraStriping: boolean;
    zebraBg: string;
}

export const TABLE_PRESETS: TableStylePreset[] = [
    {
        id: 'classic',
        label: 'Griglia Classica',
        description: 'Bordi grigi sottili, testata grigio chiaro',
        headerBg: '#f3f4f6',
        headerTextColor: '#111827',
        borderColor: '#d1d5db',
        borderStyle: 'solid',
        borderWidth: 1,
        borderType: 'all',
        zebraStriping: false,
        zebraBg: '#ffffff'
    },
    {
        id: 'scout_blue',
        label: 'Scout Blu',
        description: 'Header blu scout, righe alternate azzurre',
        headerBg: '#2563eb',
        headerTextColor: '#ffffff',
        borderColor: '#93c5fd',
        borderStyle: 'solid',
        borderWidth: 1,
        borderType: 'all',
        zebraStriping: true,
        zebraBg: '#f0f9ff'
    },
    {
        id: 'scout_green',
        label: 'Scout Verde',
        description: 'Header verde bosco, righe alternate menta',
        headerBg: '#059669',
        headerTextColor: '#ffffff',
        borderColor: '#a7f3d0',
        borderStyle: 'solid',
        borderWidth: 1,
        borderType: 'all',
        zebraStriping: true,
        zebraBg: '#f0fdf4'
    },
    {
        id: 'scout_brown',
        label: 'Scout Cuoio',
        description: 'Header cuoio, righe calde ambrate',
        headerBg: '#78350f',
        headerTextColor: '#ffffff',
        borderColor: '#fde68a',
        borderStyle: 'solid',
        borderWidth: 1,
        borderType: 'all',
        zebraStriping: true,
        zebraBg: '#fffbeb'
    },
    {
        id: 'dark',
        label: 'Elegante Scuro',
        description: 'Header scuro antracite, righe chiare',
        headerBg: '#1f2937',
        headerTextColor: '#ffffff',
        borderColor: '#e5e7eb',
        borderStyle: 'solid',
        borderWidth: 1,
        borderType: 'all',
        zebraStriping: true,
        zebraBg: '#f9fafb'
    },
    {
        id: 'horizontal_only',
        label: 'Linee Orizzontali (Minimal)',
        description: 'Solo righe orizzontali, senza bordi verticali',
        headerBg: 'transparent',
        headerTextColor: '#111827',
        borderColor: '#e5e7eb',
        borderStyle: 'solid',
        borderWidth: 1,
        borderType: 'horizontal',
        zebraStriping: false,
        zebraBg: '#ffffff'
    },
    {
        id: 'none',
        label: 'Senza Bordi (Trasparente)',
        description: 'Griglia invisibile per incolonnare dati e firme',
        headerBg: 'transparent',
        headerTextColor: '#111827',
        borderColor: 'transparent',
        borderStyle: 'solid',
        borderWidth: 0,
        borderType: 'none',
        zebraStriping: false,
        zebraBg: '#ffffff'
    }
];

export default function RichTextEditor({ value, onChange, minHeight = '150px', placeholder }: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);

    // Stato tabella attiva
    const [activeTable, setActiveTable] = useState<HTMLTableElement | null>(null);
    const [activeCell, setActiveCell] = useState<HTMLTableCellElement | null>(null);
    const [activeRow, setActiveRow] = useState<HTMLTableRowElement | null>(null);

    // Popover Inserisci Tabella
    const [showInsertPopover, setShowInsertPopover] = useState(false);
    const [gridHover, setGridHover] = useState<{ rows: number; cols: number }>({ rows: 3, cols: 3 });
    const [numRows, setNumRows] = useState(3);
    const [numCols, setNumCols] = useState(3);
    const [includeHeader, setIncludeHeader] = useState(true);
    const [selectedPresetId, setSelectedPresetId] = useState('classic');

    // Modale Personalizza Tabella
    const [showCustomizeModal, setShowCustomizeModal] = useState(false);
    const [customPreset, setCustomPreset] = useState<string>('classic');
    const [borderType, setBorderType] = useState<'all' | 'horizontal' | 'outer' | 'none'>('all');
    const [borderWidth, setBorderWidth] = useState<number>(1);
    const [borderStyle, setBorderStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
    const [borderColor, setBorderColor] = useState<string>('#d1d5db');
    const [headerBg, setHeaderBg] = useState<string>('#f3f4f6');
    const [headerTextColor, setHeaderTextColor] = useState<string>('#111827');
    const [zebraStriping, setZebraStriping] = useState<boolean>(false);
    const [zebraBg, setZebraBg] = useState<string>('#f9fafb');
    const [cellHighlightColor, setCellHighlightColor] = useState<string>('');
    const [tableWidth, setTableWidth] = useState<'100%' | '75%' | '50%' | 'auto'>('100%');
    const [tableAlign, setTableAlign] = useState<'left' | 'center' | 'right'>('center');
    const [cellPadding, setCellPadding] = useState<'compact' | 'normal' | 'spacious'>('normal');
    const [fontFamily, setFontFamily] = useState<'inherit' | 'sans-serif' | 'serif' | 'monospace'>('inherit');
    const [cellTextAlign, setCellTextAlign] = useState<'left' | 'center' | 'right'>('left');

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const triggerChange = useCallback(() => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    }, [onChange]);

    // Trova il contesto della tabella in cui si trova il cursore o la selezione
    const updateActiveTableContext = useCallback(() => {
        const sel = window.getSelection();
        if (!sel || !sel.anchorNode || !editorRef.current) {
            setActiveTable(null);
            setActiveCell(null);
            setActiveRow(null);
            return;
        }

        let node: Node | null = sel.anchorNode;
        if (node.nodeType === Node.TEXT_NODE) {
            node = node.parentNode;
        }

        if (!node || !editorRef.current.contains(node)) {
            setActiveTable(null);
            setActiveCell(null);
            setActiveRow(null);
            return;
        }

        const cell = (node as Element).closest('td, th') as HTMLTableCellElement | null;
        const row = cell?.closest('tr') as HTMLTableRowElement | null;
        const table = row?.closest('table') as HTMLTableElement | null;

        if (table && editorRef.current.contains(table)) {
            setActiveTable(table);
            setActiveCell(cell);
            setActiveRow(row);
        } else {
            setActiveTable(null);
            setActiveCell(null);
            setActiveRow(null);
        }
    }, []);

    // Ascolta eventi di selezione nel documento
    useEffect(() => {
        const handleSelectionChange = () => {
            if (document.activeElement === editorRef.current || editorRef.current?.contains(document.activeElement)) {
                updateActiveTableContext();
            }
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, [updateActiveTableContext]);

    const execCmd = (cmd: string, val?: string) => {
        editorRef.current?.focus();
        document.execCommand(cmd, false, val ?? undefined);
        triggerChange();
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
        triggerChange();
        updateActiveTableContext();
    };

    // ─── Table Creation ───────────────────────────────────────────────
    const handleInsertTable = (rowsCount: number, colsCount: number) => {
        const preset = TABLE_PRESETS.find(p => p.id === selectedPresetId) || TABLE_PRESETS[0];
        
        let html = `<table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;" data-table-preset="${preset.id}">`;
        
        // Calcolo padding e bordo base
        const pad = '8px 12px';
        const bStyle = `${preset.borderWidth}px ${preset.borderStyle} ${preset.borderColor}`;

        if (includeHeader) {
            html += `<thead><tr style="background-color: ${preset.headerBg};">`;
            for (let c = 0; c < colsCount; c++) {
                html += `<th style="border: ${bStyle}; padding: ${pad}; text-align: left; font-weight: bold; color: ${preset.headerTextColor};">Colonna ${c + 1}</th>`;
            }
            html += `</tr></thead>`;
        }

        html += `<tbody>`;
        const bodyRows = includeHeader ? Math.max(1, rowsCount - 1) : rowsCount;
        for (let r = 0; r < bodyRows; r++) {
            const isZebra = preset.zebraStriping && r % 2 === 1;
            const rowBg = isZebra ? preset.zebraBg : 'transparent';
            html += `<tr style="${rowBg !== 'transparent' ? `background-color: ${rowBg};` : ''}">`;
            for (let c = 0; c < colsCount; c++) {
                html += `<td style="border: ${bStyle}; padding: ${pad}; min-height: 28px;">Cella ${r + 1},${c + 1}</td>`;
            }
            html += `</tr>`;
        }
        html += `</tbody></table><p><br></p>`;

        editorRef.current?.focus();
        document.execCommand('insertHTML', false, html);
        setShowInsertPopover(false);
        triggerChange();
        setTimeout(updateActiveTableContext, 50);
    };

    // ─── Table Structural Manipulations ──────────────────────────────
    const insertRowAbove = () => {
        if (!activeTable || !activeRow) return;
        const colsCount = activeRow.cells.length;
        const newRow = document.createElement('tr');
        
        const bStyle = activeRow.cells[0]?.style.border || '1px solid #d1d5db';
        const pad = activeRow.cells[0]?.style.padding || '8px 12px';

        for (let i = 0; i < colsCount; i++) {
            const td = document.createElement('td');
            td.style.border = bStyle;
            td.style.padding = pad;
            td.innerHTML = '<br>';
            newRow.appendChild(td);
        }

        activeRow.parentNode?.insertBefore(newRow, activeRow);
        triggerChange();
        updateActiveTableContext();
    };

    const insertRowBelow = () => {
        if (!activeTable || !activeRow) return;
        const colsCount = activeRow.cells.length;
        const newRow = document.createElement('tr');
        
        const bStyle = activeRow.cells[0]?.style.border || '1px solid #d1d5db';
        const pad = activeRow.cells[0]?.style.padding || '8px 12px';

        for (let i = 0; i < colsCount; i++) {
            const td = document.createElement('td');
            td.style.border = bStyle;
            td.style.padding = pad;
            td.innerHTML = '<br>';
            newRow.appendChild(td);
        }

        activeRow.parentNode?.insertBefore(newRow, activeRow.nextSibling);
        triggerChange();
        updateActiveTableContext();
    };

    const deleteCurrentRow = () => {
        if (!activeTable || !activeRow) return;
        const tbody = activeRow.parentNode;
        activeRow.remove();
        if (!tbody || tbody.children.length === 0 || activeTable.rows.length === 0) {
            activeTable.remove();
            setActiveTable(null);
            setActiveCell(null);
            setActiveRow(null);
        }
        triggerChange();
        updateActiveTableContext();
    };

    const insertColLeft = () => {
        if (!activeTable || !activeCell || !activeRow) return;
        const colIdx = activeCell.cellIndex;
        
        Array.from(activeTable.rows).forEach(row => {
            const isHeader = row.closest('thead') !== null;
            const newCell = document.createElement(isHeader ? 'th' : 'td');
            const siblingCell = row.cells[colIdx] || row.cells[0];
            if (siblingCell) {
                newCell.style.border = siblingCell.style.border;
                newCell.style.padding = siblingCell.style.padding;
                if (siblingCell.style.color) newCell.style.color = siblingCell.style.color;
                if (siblingCell.style.backgroundColor) newCell.style.backgroundColor = siblingCell.style.backgroundColor;
            } else {
                newCell.style.border = '1px solid #d1d5db';
                newCell.style.padding = '8px 12px';
            }
            newCell.innerHTML = isHeader ? 'Nuova Colonna' : '<br>';
            row.insertBefore(newCell, row.cells[colIdx]);
        });

        triggerChange();
        updateActiveTableContext();
    };

    const insertColRight = () => {
        if (!activeTable || !activeCell || !activeRow) return;
        const colIdx = activeCell.cellIndex;

        Array.from(activeTable.rows).forEach(row => {
            const isHeader = row.closest('thead') !== null;
            const newCell = document.createElement(isHeader ? 'th' : 'td');
            const siblingCell = row.cells[colIdx] || row.cells[0];
            if (siblingCell) {
                newCell.style.border = siblingCell.style.border;
                newCell.style.padding = siblingCell.style.padding;
                if (siblingCell.style.color) newCell.style.color = siblingCell.style.color;
                if (siblingCell.style.backgroundColor) newCell.style.backgroundColor = siblingCell.style.backgroundColor;
            } else {
                newCell.style.border = '1px solid #d1d5db';
                newCell.style.padding = '8px 12px';
            }
            newCell.innerHTML = isHeader ? 'Nuova Colonna' : '<br>';
            const target = row.cells[colIdx + 1];
            if (target) {
                row.insertBefore(newCell, target);
            } else {
                row.appendChild(newCell);
            }
        });

        triggerChange();
        updateActiveTableContext();
    };

    const deleteCurrentCol = () => {
        if (!activeTable || !activeCell) return;
        const colIdx = activeCell.cellIndex;

        Array.from(activeTable.rows).forEach(row => {
            if (row.cells[colIdx]) {
                row.cells[colIdx].remove();
            }
        });

        if (activeTable.rows[0]?.cells.length === 0) {
            activeTable.remove();
            setActiveTable(null);
            setActiveCell(null);
            setActiveRow(null);
        }

        triggerChange();
        updateActiveTableContext();
    };

    const deleteEntireTable = () => {
        if (!activeTable) return;
        if (confirm('Sei sicuro di voler eliminare questa tabella?')) {
            activeTable.remove();
            setActiveTable(null);
            setActiveCell(null);
            setActiveRow(null);
            triggerChange();
        }
    };

    // ─── Table Customization Application ──────────────────────────────
    const openCustomizeModal = () => {
        if (!activeTable) return;
        // Inizializza gli stati con le proprietà correnti della tabella
        setTableWidth((activeTable.style.width as any) || '100%');
        setShowCustomizeModal(true);
    };

    const handleApplyPreset = (preset: TableStylePreset) => {
        setCustomPreset(preset.id);
        setBorderType(preset.borderType);
        setBorderWidth(preset.borderWidth);
        setBorderStyle(preset.borderStyle);
        setBorderColor(preset.borderColor);
        setHeaderBg(preset.headerBg);
        setHeaderTextColor(preset.headerTextColor);
        setZebraStriping(preset.zebraStriping);
        setZebraBg(preset.zebraBg);
    };

    const handleSaveCustomization = () => {
        if (!activeTable) return;

        // 1. Larghezza e Allineamento
        activeTable.style.width = tableWidth === 'auto' ? 'auto' : tableWidth;
        activeTable.style.borderCollapse = 'collapse';
        if (tableAlign === 'center') {
            activeTable.style.marginLeft = 'auto';
            activeTable.style.marginRight = 'auto';
        } else if (tableAlign === 'right') {
            activeTable.style.marginLeft = 'auto';
            activeTable.style.marginRight = '0';
        } else {
            activeTable.style.marginLeft = '0';
            activeTable.style.marginRight = 'auto';
        }

        // 2. Font family
        if (fontFamily !== 'inherit') {
            activeTable.style.fontFamily = fontFamily;
        } else {
            activeTable.style.fontFamily = '';
        }

        // 3. Padding
        let padStr = '8px 12px';
        if (cellPadding === 'compact') padStr = '4px 8px';
        if (cellPadding === 'spacious') padStr = '12px 16px';

        // 4. Stile bordi
        const borderRule = borderType === 'none' 
            ? 'none' 
            : `${borderWidth}px ${borderStyle} ${borderColor}`;

        // Applica a testata
        const thead = activeTable.querySelector('thead');
        const thCells = activeTable.querySelectorAll('th');
        if (thead) {
            thead.style.backgroundColor = headerBg;
        }
        thCells.forEach(th => {
            th.style.backgroundColor = headerBg;
            th.style.color = headerTextColor;
            th.style.padding = padStr;
            th.style.textAlign = cellTextAlign;

            if (borderType === 'none') {
                th.style.border = 'none';
            } else if (borderType === 'horizontal') {
                th.style.borderLeft = 'none';
                th.style.borderRight = 'none';
                th.style.borderTop = borderRule;
                th.style.borderBottom = `${Math.max(2, borderWidth + 1)}px ${borderStyle} ${borderColor}`;
            } else if (borderType === 'outer') {
                th.style.border = 'none';
                th.style.borderTop = borderRule;
            } else {
                th.style.border = borderRule;
            }
        });

        // Applica a corpo (tbody)
        const tbodyRows = activeTable.querySelectorAll('tbody tr');
        tbodyRows.forEach((row, rIdx) => {
            const isZebra = zebraStriping && rIdx % 2 === 1;
            const rowEl = row as HTMLTableRowElement;
            if (isZebra) {
                rowEl.style.backgroundColor = zebraBg;
            } else {
                rowEl.style.backgroundColor = 'transparent';
            }

            Array.from(rowEl.cells).forEach(cell => {
                cell.style.padding = padStr;
                cell.style.textAlign = cellTextAlign;

                if (borderType === 'none') {
                    cell.style.border = 'none';
                } else if (borderType === 'horizontal') {
                    cell.style.borderLeft = 'none';
                    cell.style.borderRight = 'none';
                    cell.style.borderTop = 'none';
                    cell.style.borderBottom = borderRule;
                } else if (borderType === 'outer') {
                    cell.style.border = 'none';
                } else {
                    cell.style.border = borderRule;
                }
            });
        });

        // Se bordo perimetro esterno
        if (borderType === 'outer') {
            activeTable.style.border = borderRule;
        } else {
            activeTable.style.border = 'none';
        }

        // Evidenziazione cella attiva se selezionata
        if (cellHighlightColor && activeCell) {
            activeCell.style.backgroundColor = cellHighlightColor;
        }

        triggerChange();
        setShowCustomizeModal(false);
    };

    // ─── Keyboard Navigation Inside Table ─────────────────────────────
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Tab') {
            if (activeTable && activeCell) {
                e.preventDefault();
                const allCells = Array.from(activeTable.querySelectorAll('td, th')) as HTMLElement[];
                const curIdx = allCells.indexOf(activeCell);

                if (curIdx !== -1) {
                    if (e.shiftKey) {
                        // Cella precedente
                        if (curIdx > 0) {
                            allCells[curIdx - 1].focus();
                        }
                    } else {
                        // Cella successiva
                        if (curIdx < allCells.length - 1) {
                            allCells[curIdx + 1].focus();
                        } else {
                            // Ultima cella: aggiungi nuova riga come su Word!
                            insertRowBelow();
                            setTimeout(() => {
                                const newCells = Array.from(activeTable.querySelectorAll('td, th')) as HTMLElement[];
                                newCells[curIdx + 1]?.focus();
                            }, 50);
                        }
                    }
                }
            }
        }
    };

    const Separator = () => <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-0.5 shrink-0" />;

    const Btn = ({ onClick, children, title, active }: { onClick: () => void; children: React.ReactNode; title: string; active?: boolean }) => (
        <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onClick(); }}
            title={title}
            className={cn(
                "p-1.5 rounded-lg text-gray-600 dark:text-gray-300 transition-all active:scale-95 cursor-pointer",
                active 
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200" 
                    : "hover:bg-white dark:hover:bg-gray-600 hover:shadow-sm"
            )}
        >
            {children}
        </button>
    );

    return (
        <div className="border border-gray-200 dark:border-gray-600 rounded-2xl overflow-hidden bg-white dark:bg-gray-800 flex flex-col hover:border-scout-blue transition-colors focus-within:border-scout-blue focus-within:ring-2 focus-within:ring-scout-blue/20 relative">
            
            {/* ─── Main Toolbar ────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-gray-100 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 relative z-20">

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
                <label className="relative w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-gray-650 hover:shadow-sm cursor-pointer transition-all text-gray-700 dark:text-gray-200" title="Colore testo">
                    <span className="text-xs font-black select-none">A</span>
                    <input
                        type="color"
                        defaultValue="#000000"
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        onChange={(e) => execCmd('foreColor', e.target.value)}
                    />
                </label>

                {/* Highlight / background color */}
                <label className="relative w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-gray-650 hover:shadow-sm cursor-pointer transition-all text-gray-700 dark:text-gray-200" title="Evidenziatore">
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

                {/* Insert Link / Image */}
                <Btn onClick={insertLink} title="Inserisci link"><Link size={15} /></Btn>
                <Btn onClick={insertImage} title="Inserisci immagine"><ImageIcon size={15} /></Btn>

                <Separator />

                {/* ─── TABELLA (Word-like Table Button) ────────────────── */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowInsertPopover(p => !p)}
                        title="Inserisci Tabella (Word Style)"
                        className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                            showInsertPopover || activeTable
                                ? "bg-blue-600 text-white shadow-xs"
                                : "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300"
                        )}
                    >
                        <TableIcon size={14} />
                        <span>Tabella</span>
                        <ChevronDown size={12} className={cn("transition-transform", showInsertPopover && "rotate-180")} />
                    </button>

                    {/* Popover Inserimento Tabella */}
                    {showInsertPopover && (
                        <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50 animate-in zoom-in-95 duration-150 space-y-3">
                            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                                <span className="font-extrabold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                                    <TableIcon size={14} className="text-blue-600" />
                                    Inserisci Tabella
                                </span>
                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full">
                                    {gridHover.rows} × {gridHover.cols}
                                </span>
                            </div>

                            {/* Griglia Interattiva Word-Style */}
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Trascina per scegliere le dimensioni:</span>
                                <div 
                                    className="grid grid-cols-8 gap-1 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200/60 dark:border-gray-700 select-none cursor-pointer"
                                    onMouseLeave={() => setGridHover({ rows: numRows, cols: numCols })}
                                >
                                    {Array.from({ length: 8 }).map((_, r) =>
                                        Array.from({ length: 8 }).map((_, c) => {
                                            const isSelected = r < gridHover.rows && c < gridHover.cols;
                                            return (
                                                <div
                                                    key={`${r}-${c}`}
                                                    onMouseEnter={() => setGridHover({ rows: r + 1, cols: c + 1 })}
                                                    onClick={() => handleInsertTable(r + 1, c + 1)}
                                                    className={cn(
                                                        "w-5 h-5 rounded-xs border transition-colors",
                                                        isSelected
                                                            ? "bg-blue-500 border-blue-600"
                                                            : "bg-white dark:bg-gray-800 border-gray-250 dark:border-gray-700 hover:border-blue-300"
                                                    )}
                                                />
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Selezione Rapida Input Numerici */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Righe:</label>
                                    <input 
                                        type="number" 
                                        min={1} 
                                        max={30} 
                                        value={numRows} 
                                        onChange={e => {
                                            const v = Math.max(1, parseInt(e.target.value) || 1);
                                            setNumRows(v);
                                            setGridHover(h => ({ ...h, rows: v }));
                                        }}
                                        className="w-full px-2 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Colonne:</label>
                                    <input 
                                        type="number" 
                                        min={1} 
                                        max={15} 
                                        value={numCols} 
                                        onChange={e => {
                                            const v = Math.max(1, parseInt(e.target.value) || 1);
                                            setNumCols(v);
                                            setGridHover(h => ({ ...h, cols: v }));
                                        }}
                                        className="w-full px-2 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                                    />
                                </div>
                            </div>

                            {/* Opzioni */}
                            <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-gray-700 text-xs">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={includeHeader} 
                                        onChange={e => setIncludeHeader(e.target.checked)}
                                        className="accent-blue-600 rounded"
                                    />
                                    <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Includi riga intestazione</span>
                                </label>

                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-400 mb-1">Stile iniziale:</label>
                                    <select
                                        value={selectedPresetId}
                                        onChange={e => setSelectedPresetId(e.target.value)}
                                        className="w-full px-2 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs cursor-pointer"
                                    >
                                        {TABLE_PRESETS.map(p => (
                                            <option key={p.id} value={p.id}>{p.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleInsertTable(numRows, numCols)}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                                Inserisci {numRows} × {numCols} Tabella
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Contextual Word-Style "Strumenti Tabella" Bar ─────── */}
            {activeTable && (
                <div className="flex flex-wrap items-center gap-1 px-3 py-1.5 bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-200/60 dark:border-blue-900/50 text-xs text-blue-900 dark:text-blue-200 animate-in slide-in-from-top-1 duration-150">
                    <div className="flex items-center gap-1 font-bold text-[11px] text-blue-700 dark:text-blue-300 mr-2 uppercase tracking-wider">
                        <TableIcon size={13} />
                        <span>Strumenti Tabella:</span>
                    </div>

                    {/* Riga */}
                    <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg p-0.5 border border-blue-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={insertRowAbove}
                            title="Inserisci riga sopra quella selezionata"
                            className="px-2 py-1 hover:bg-blue-50 dark:hover:bg-gray-700 rounded text-[11px] font-bold text-gray-700 dark:text-gray-200 cursor-pointer flex items-center gap-0.5"
                        >
                            <Plus size={11} className="text-blue-600" />
                            Riga Sopra
                        </button>
                        <button
                            type="button"
                            onClick={insertRowBelow}
                            title="Inserisci riga sotto quella selezionata"
                            className="px-2 py-1 hover:bg-blue-50 dark:hover:bg-gray-700 rounded text-[11px] font-bold text-gray-700 dark:text-gray-200 cursor-pointer flex items-center gap-0.5"
                        >
                            <Plus size={11} className="text-blue-600" />
                            Riga Sotto
                        </button>
                        <button
                            type="button"
                            onClick={deleteCurrentRow}
                            title="Elimina la riga attiva"
                            className="px-2 py-1 hover:bg-red-50 text-red-600 dark:hover:bg-red-950/40 dark:text-red-400 rounded text-[11px] font-bold cursor-pointer"
                        >
                            Elimina Riga
                        </button>
                    </div>

                    {/* Colonna */}
                    <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg p-0.5 border border-blue-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={insertColLeft}
                            title="Inserisci colonna a sinistra"
                            className="px-2 py-1 hover:bg-blue-50 dark:hover:bg-gray-700 rounded text-[11px] font-bold text-gray-700 dark:text-gray-200 cursor-pointer flex items-center gap-0.5"
                        >
                            <Plus size={11} className="text-blue-600" />
                            Col. Sinistra
                        </button>
                        <button
                            type="button"
                            onClick={insertColRight}
                            title="Inserisci colonna a destra"
                            className="px-2 py-1 hover:bg-blue-50 dark:hover:bg-gray-700 rounded text-[11px] font-bold text-gray-700 dark:text-gray-200 cursor-pointer flex items-center gap-0.5"
                        >
                            <Plus size={11} className="text-blue-600" />
                            Col. Destra
                        </button>
                        <button
                            type="button"
                            onClick={deleteCurrentCol}
                            title="Elimina la colonna attiva"
                            className="px-2 py-1 hover:bg-red-50 text-red-600 dark:hover:bg-red-950/40 dark:text-red-400 rounded text-[11px] font-bold cursor-pointer"
                        >
                            Elimina Col.
                        </button>
                    </div>

                    {/* Personalizza Design & Stile Tabella */}
                    <button
                        type="button"
                        onClick={openCustomizeModal}
                        title="Personalizza Stili, Bordi, Colori e Dimensioni della tabella"
                        className="px-2.5 py-1 bg-scout-blue hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer ml-auto"
                    >
                        <Palette size={13} />
                        Personalizza Tabella
                    </button>

                    {/* Elimina intera tabella */}
                    <button
                        type="button"
                        onClick={deleteEntireTable}
                        title="Rimuovi l'intera tabella dal testo"
                        className="p-1 hover:bg-red-100 text-red-600 dark:hover:bg-red-950/50 dark:text-red-400 rounded-lg cursor-pointer"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            )}

            {/* ─── Editable content area ───────────────────────────────── */}
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onBlur={handleInput}
                onKeyUp={updateActiveTableContext}
                onClick={updateActiveTableContext}
                onKeyDown={handleKeyDown}
                data-placeholder={placeholder}
                className={cn(
                    "p-4 overflow-y-auto outline-none text-gray-800 dark:text-gray-100 dark:bg-gray-800",
                    "prose prose-sm max-w-none dark:prose-invert",
                    "prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-base prose-headings:my-1",
                    "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
                    "[&_li]:my-0.5",
                    "prose-img:max-h-32 prose-img:m-0 prose-img:inline-block prose-p:m-0",
                    // Tabella responsive e curata
                    "[&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:my-2",
                    "[&_td]:transition-colors [&_th]:transition-colors",
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
                        // Consente elementi formattati e tabelle complete
                        const allowed = new Set([
                            'b', 'i', 'u', 's', 'strong', 'em', 'ul', 'ol', 'li', 
                            'p', 'br', 'h1', 'h2', 'h3', 'a', 'span',
                            'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td'
                        ]);
                        Array.from(div.querySelectorAll('*')).reverse().forEach(el => {
                            if (!allowed.has(el.tagName.toLowerCase())) {
                                el.replaceWith(...Array.from(el.childNodes));
                            } else {
                                const keep = el.tagName.toLowerCase() === 'a' 
                                    ? ['href'] 
                                    : ['style', 'class', 'colspan', 'rowspan', 'width', 'align', 'border'];
                                Array.from(el.attributes).forEach(a => {
                                    if (!keep.includes(a.name)) el.removeAttribute(a.name);
                                });
                            }
                        });
                        document.execCommand('insertHTML', false, div.innerHTML);
                    } else {
                        document.execCommand('insertText', false, text);
                    }
                    triggerChange();
                    updateActiveTableContext();
                }}
            />

            {/* ─── Modal Personalizza Tabella (Word-Like Table Design) ─── */}
            {showCustomizeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div 
                        className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-6"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
                            <div className="flex items-center gap-2">
                                <Palette className="w-5 h-5 text-blue-600" />
                                <h3 className="font-black text-base text-gray-900 dark:text-white">
                                    Personalizza Tabella (Stile Word)
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCustomizeModal(false)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* 1. Stili Predefiniti Rapidi */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                                1. Stili Rapidi Predefiniti
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {TABLE_PRESETS.map(p => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => handleApplyPreset(p)}
                                        className={cn(
                                            "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20",
                                            customPreset === p.id 
                                                ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20"
                                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-gray-50/50 dark:bg-gray-900/50"
                                        )}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <span className="text-xs font-bold text-gray-900 dark:text-white truncate">{p.label}</span>
                                            {customPreset === p.id && <Check size={12} className="text-blue-600 shrink-0" />}
                                        </div>
                                        {/* Miniatura visuale stile Word */}
                                        <div className="w-full h-7 rounded border overflow-hidden flex flex-col" style={{ borderColor: p.borderColor }}>
                                            <div className="h-2.5 w-full" style={{ backgroundColor: p.headerBg }} />
                                            <div className="flex-1 flex">
                                                <div className="flex-1 border-r" style={{ borderColor: p.borderColor, backgroundColor: '#ffffff' }} />
                                                <div className="flex-1" style={{ backgroundColor: p.zebraStriping ? p.zebraBg : '#ffffff' }} />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Bordi */}
                        <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                            <label className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                                2. Bordi & Griglia
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">Tipo bordi</label>
                                    <select
                                        value={borderType}
                                        onChange={(e) => setBorderType(e.target.value as any)}
                                        className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer"
                                    >
                                        <option value="all">Tutti i bordi</option>
                                        <option value="horizontal">Solo orizzontali</option>
                                        <option value="outer">Solo perimetro</option>
                                        <option value="none">Nessun bordo</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">Spessore</label>
                                    <select
                                        value={borderWidth}
                                        onChange={(e) => setBorderWidth(Number(e.target.value))}
                                        className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer"
                                    >
                                        <option value={1}>1 px (Sottile)</option>
                                        <option value={2}>2 px (Medio)</option>
                                        <option value={3}>3 px (Marcato)</option>
                                        <option value={4}>4 px (Spesso)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">Stile linea</label>
                                    <select
                                        value={borderStyle}
                                        onChange={(e) => setBorderStyle(e.target.value as any)}
                                        className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer"
                                    >
                                        <option value="solid">Continua (Solid)</option>
                                        <option value="dashed">Tratteggiata</option>
                                        <option value="dotted">Punteggiata</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">Colore bordo</label>
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="color"
                                            value={borderColor}
                                            onChange={(e) => setBorderColor(e.target.value)}
                                            className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                                        />
                                        <span className="text-[10px] font-mono text-gray-500 uppercase">{borderColor}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Colori & Sfondo */}
                        <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                            <label className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                                3. Colori & Campitura
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">Sfondo Intestazione</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={headerBg === 'transparent' ? '#ffffff' : headerBg}
                                            onChange={(e) => setHeaderBg(e.target.value)}
                                            className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setHeaderBg('transparent')}
                                            className="text-[10px] text-gray-500 hover:text-gray-700 underline"
                                        >
                                            Trasparente
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">Testo Intestazione</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={headerTextColor}
                                            onChange={(e) => setHeaderTextColor(e.target.value)}
                                            className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                                        />
                                        <div className="flex gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setHeaderTextColor('#ffffff')}
                                                className="px-1.5 py-0.5 bg-gray-900 text-white rounded text-[10px] font-bold"
                                            >
                                                Bianco
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setHeaderTextColor('#111827')}
                                                className="px-1.5 py-0.5 bg-gray-100 border text-gray-800 rounded text-[10px] font-bold"
                                            >
                                                Nero
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">Sfondo Cella Corrente</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={cellHighlightColor || '#ffffff'}
                                            onChange={(e) => setCellHighlightColor(e.target.value)}
                                            className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                                        />
                                        {cellHighlightColor && (
                                            <button
                                                type="button"
                                                onClick={() => setCellHighlightColor('')}
                                                className="text-[10px] text-red-500 hover:underline"
                                            >
                                                Rimuovi
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Righe Alternate (Zebra) */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl text-xs">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={zebraStriping}
                                        onChange={(e) => setZebraStriping(e.target.checked)}
                                        className="accent-blue-600 rounded"
                                    />
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                                        Righe alternate (effetto zebra)
                                    </span>
                                </label>
                                {zebraStriping && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-gray-500">Colore riga pari:</span>
                                        <input
                                            type="color"
                                            value={zebraBg}
                                            onChange={(e) => setZebraBg(e.target.value)}
                                            className="w-7 h-7 rounded border border-gray-200 cursor-pointer"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 4. Dimensioni, Allineamento & Spaziatura */}
                        <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                            <label className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                                4. Dimensioni, Allineamento & Spaziatura
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">Larghezza tabella</label>
                                    <select
                                        value={tableWidth}
                                        onChange={(e) => setTableWidth(e.target.value as any)}
                                        className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer"
                                    >
                                        <option value="100%">100% (Larghezza intera)</option>
                                        <option value="75%">75% (Tre quarti)</option>
                                        <option value="50%">50% (Metà pagina)</option>
                                        <option value="auto">Automatica (in base al contenuto)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">Allineamento nel foglio</label>
                                    <select
                                        value={tableAlign}
                                        onChange={(e) => setTableAlign(e.target.value as any)}
                                        className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer"
                                    >
                                        <option value="left">A Sinistra</option>
                                        <option value="center">Al Centro</option>
                                        <option value="right">A Destra</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">Spaziatura celle (Padding)</label>
                                    <select
                                        value={cellPadding}
                                        onChange={(e) => setCellPadding(e.target.value as any)}
                                        className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer"
                                    >
                                        <option value="compact">Compatto (4px)</option>
                                        <option value="normal">Normale (8px)</option>
                                        <option value="spacious">Spazioso (12px)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 5. Font & Allineamento Testo */}
                        <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                            <label className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                                5. Font & Testo delle Celle
                            </label>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">Font delle celle</label>
                                    <select
                                        value={fontFamily}
                                        onChange={(e) => setFontFamily(e.target.value as any)}
                                        className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer"
                                    >
                                        <option value="inherit">Predefinito</option>
                                        <option value="sans-serif">Sans-serif (Moderno)</option>
                                        <option value="serif">Serif (Formale/Scout)</option>
                                        <option value="monospace">Monospace (Dati numerici)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">Allineamento testo</label>
                                    <select
                                        value={cellTextAlign}
                                        onChange={(e) => setCellTextAlign(e.target.value as any)}
                                        className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer"
                                    >
                                        <option value="left">Sinistra</option>
                                        <option value="center">Centro</option>
                                        <option value="right">Destra</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Azioni Modal */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={() => setShowCustomizeModal(false)}
                                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                            >
                                Annulla
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveCustomization}
                                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                <Check size={14} />
                                Applica Modifiche
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
