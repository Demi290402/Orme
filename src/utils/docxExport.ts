import { 
    Document, Packer, Paragraph, TextRun, AlignmentType, 
    Table, TableRow, TableCell, WidthType, BorderStyle,
    ImageRun, Header, Footer, VerticalAlign, UnderlineType, PageNumber
} from 'docx';
import { saveAs } from 'file-saver';
import { Verbale, MembroCoCa, User } from '@/types';

/**
 * Fetches an image from a URL and returns it as an ArrayBuffer
 */
async function fetchImageAsBuffer(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Image fetch failed");
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("image")) {
        throw new Error(`Target URL returned non-image content type: ${contentType}`);
    }
    return await response.arrayBuffer();
}

/**
 * Strips XML invalid control characters that corrupt DOCX files
 */
function sanitizeDocxText(text: string): string {
    if (!text) return "";
    return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

/**
 * Parses CSS colors into 6-digit hex string without '#'
 */
function parseColorToHex(colorStr?: string): string | undefined {
    if (!colorStr) return undefined;
    const s = colorStr.trim();
    if (s.startsWith('#')) {
        const hex = s.replace('#', '').toUpperCase();
        if (hex.length === 3) {
            return hex.split('').map(c => c + c).join('');
        }
        if (hex.length === 6) return hex;
    }
    const rgbMatch = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (rgbMatch) {
        const r = parseInt(rgbMatch[1], 10).toString(16).padStart(2, '0');
        const g = parseInt(rgbMatch[2], 10).toString(16).padStart(2, '0');
        const b = parseInt(rgbMatch[3], 10).toString(16).padStart(2, '0');
        return `${r}${g}${b}`.toUpperCase();
    }
    return undefined;
}

/**
 * Strips HTML tags and sanitizes text for XML (DOCX)
 */
function cleanText(html: string): string {
    if (!html) return "";
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    const text = tmp.textContent || tmp.innerText || "";
    return sanitizeDocxText(text);
}

interface InlineStyle {
    bold?: boolean;
    italics?: boolean;
    underline?: boolean;
    strike?: boolean;
    color?: string;
    size?: number; // half-points (20 = 10pt)
    font?: string;
}

/**
 * Recursively parses inline formatting (bold, italics, underline, color, breaks) into TextRun[]
 */
function parseInlineRuns(node: Node, currentStyle: InlineStyle = {}): TextRun[] {
    const runs: TextRun[] = [];

    if (node.nodeType === Node.TEXT_NODE) {
        const text = sanitizeDocxText(node.textContent || "");
        if (text) {
            runs.push(new TextRun({
                text: text,
                bold: currentStyle.bold,
                italics: currentStyle.italics,
                underline: currentStyle.underline ? { type: UnderlineType.SINGLE } : undefined,
                strike: currentStyle.strike,
                color: currentStyle.color,
                size: currentStyle.size || 20,
                font: currentStyle.font || "Roboto"
            }));
        }
        return runs;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();

        if (tag === 'br') {
            runs.push(new TextRun({ break: 1, size: currentStyle.size || 20, font: currentStyle.font || "Roboto" }));
            return runs;
        }

        const nextStyle: InlineStyle = { ...currentStyle };

        if (tag === 'strong' || tag === 'b' || el.style.fontWeight === 'bold' || parseInt(el.style.fontWeight, 10) >= 600) {
            nextStyle.bold = true;
        }
        if (tag === 'em' || tag === 'i' || el.style.fontStyle === 'italic') {
            nextStyle.italics = true;
        }
        if (tag === 'u' || el.style.textDecoration?.includes('underline')) {
            nextStyle.underline = true;
        }
        if (tag === 's' || tag === 'del' || tag === 'strike' || el.style.textDecoration?.includes('line-through')) {
            nextStyle.strike = true;
        }
        if (el.style.color) {
            const hex = parseColorToHex(el.style.color);
            if (hex) nextStyle.color = hex;
        }

        Array.from(el.childNodes).forEach(child => {
            runs.push(...parseInlineRuns(child, nextStyle));
        });
    }

    return runs;
}

/**
 * Parses an HTML table element into a fully compliant docx.Table
 */
function parseHtmlTable(tableEl: HTMLTableElement, baseOptions: any = {}): Table | null {
    const rows = Array.from(tableEl.rows);
    if (rows.length === 0) return null;

    let maxCols = 0;
    rows.forEach(r => {
        let cols = 0;
        Array.from(r.cells).forEach(c => cols += (c.colSpan || 1));
        maxCols = Math.max(maxCols, cols);
    });
    if (maxCols === 0) return null;

    let tableBorderColor = "D1D5DB";
    let isHorizontalOnly = false;
    let isNone = false;

    const presetAttr = tableEl.getAttribute('data-table-preset');
    if (presetAttr === 'horizontal_only') isHorizontalOnly = true;
    if (presetAttr === 'none') isNone = true;

    const borderStyleStr = tableEl.style.border || (rows[0]?.cells[0]?.style.border) || "";
    if (borderStyleStr.includes('none') || borderStyleStr.includes('transparent')) {
        if (!borderStyleStr.includes('solid')) isNone = true;
    }
    const colorMatch = borderStyleStr.match(/#([0-9a-fA-F]{3,6})/);
    if (colorMatch) {
        tableBorderColor = colorMatch[1].toUpperCase();
    }

    // A4 net content width with 800 dxa margins: 11906 - 1600 = 10306 dxa
    const totalTableWidthDxa = 10306;
    const colWidthDxa = Math.floor(totalTableWidthDxa / maxCols);

    const docxRows: TableRow[] = [];

    rows.forEach(row => {
        const isHeaderRow = row.closest('thead') !== null || Array.from(row.cells).every(c => c.tagName.toLowerCase() === 'th');
        const docxCells: TableCell[] = [];

        Array.from(row.cells).forEach(cell => {
            const isTh = cell.tagName.toLowerCase() === 'th';
            const isHeader = isHeaderRow || isTh;

            let fillHex: string | undefined = undefined;
            if (cell.style.backgroundColor) {
                fillHex = parseColorToHex(cell.style.backgroundColor);
            } else if (row.style.backgroundColor) {
                fillHex = parseColorToHex(row.style.backgroundColor);
            }

            if (!fillHex && isHeader) {
                fillHex = "F3F4F6";
            }

            const cellParagraphs: Paragraph[] = [];
            const blockChildren = Array.from(cell.children).filter(c => ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'].includes(c.tagName));

            if (blockChildren.length > 0) {
                blockChildren.forEach(child => {
                    const runs = parseInlineRuns(child, {
                        bold: isHeader ? true : undefined,
                        size: baseOptions.textRun?.size || 18,
                        font: baseOptions.textRun?.font || "Roboto"
                    });
                    cellParagraphs.push(new Paragraph({
                        children: runs.length > 0 ? runs : [new TextRun({ text: " ", size: 18 })],
                        spacing: { before: 40, after: 40 }
                    }));
                });
            } else {
                const runs = parseInlineRuns(cell, {
                    bold: isHeader ? true : undefined,
                    size: baseOptions.textRun?.size || 18,
                    font: baseOptions.textRun?.font || "Roboto"
                });
                cellParagraphs.push(new Paragraph({
                    children: runs.length > 0 ? runs : [new TextRun({ text: " ", size: 18 })],
                    spacing: { before: 40, after: 40 }
                }));
            }

            const colSpan = cell.colSpan || 1;
            const cellWidthDxa = colWidthDxa * colSpan;

            docxCells.push(new TableCell({
                columnSpan: colSpan > 1 ? colSpan : undefined,
                width: { size: cellWidthDxa, type: WidthType.DXA },
                children: cellParagraphs.length > 0 ? cellParagraphs : [new Paragraph({ children: [new TextRun({ text: " ", size: 18 })] })],
                shading: fillHex ? { fill: fillHex } : undefined,
                margins: { top: 120, bottom: 120, left: 160, right: 160 }
            }));
        });

        if (docxCells.length > 0) {
            docxRows.push(new TableRow({
                children: docxCells,
                tableHeader: isHeaderRow
            }));
        }
    });

    if (docxRows.length === 0) return null;

    const bordersConfig = isNone ? {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
    } : isHorizontalOnly ? {
        top: { style: BorderStyle.SINGLE, size: 4, color: tableBorderColor },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: tableBorderColor },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: tableBorderColor },
        insideVertical: { style: BorderStyle.NONE },
    } : {
        top: { style: BorderStyle.SINGLE, size: 4, color: tableBorderColor },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: tableBorderColor },
        left: { style: BorderStyle.SINGLE, size: 4, color: tableBorderColor },
        right: { style: BorderStyle.SINGLE, size: 4, color: tableBorderColor },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: tableBorderColor },
        insideVertical: { style: BorderStyle.SINGLE, size: 4, color: tableBorderColor },
    };

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: Array(maxCols).fill(colWidthDxa),
        borders: bordersConfig,
        rows: docxRows
    });
}

/**
 * Recursively parses DOM nodes into DOCX Paragraphs and Tables
 */
function parseNodeToDocxBlocks(node: Node, baseOptions: any = {}): (Paragraph | Table)[] {
    const result: (Paragraph | Table)[] = [];

    if (node.nodeType === Node.TEXT_NODE) {
        const text = sanitizeDocxText(node.textContent || "").trim();
        if (text) {
            result.push(new Paragraph({
                children: [new TextRun({ text, ...baseOptions.textRun })],
                ...(baseOptions.paragraph || {}),
                spacing: { before: 80, after: 80 }
            }));
        }
        return result;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return result;

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === 'table') {
        const table = parseHtmlTable(el as HTMLTableElement, baseOptions);
        if (table) result.push(table);
        return result;
    }

    if (tag === 'ul' || tag === 'ol') {
        Array.from(el.children).forEach((li, idx) => {
            if (li.tagName.toLowerCase() === 'li') {
                const runs = parseInlineRuns(li, baseOptions.textRun);
                result.push(new Paragraph({
                    children: [
                        new TextRun({ text: tag === 'ol' ? `${idx + 1}. ` : "• ", bold: true, ...baseOptions.textRun }),
                        ...runs
                    ],
                    indent: { left: 400 },
                    spacing: { before: 40, after: 40 }
                }));
            }
        });
        return result;
    }

    // Check if element contains any nested tables or lists or headings
    const hasNestedBlock = el.querySelector('table, ul, ol, h1, h2, h3, h4, h5, h6');
    if (hasNestedBlock) {
        Array.from(el.childNodes).forEach(child => {
            result.push(...parseNodeToDocxBlocks(child, baseOptions));
        });
        return result;
    }

    // Leaf block
    const runs = parseInlineRuns(el, baseOptions.textRun);
    if (runs.length > 0) {
        let beforeSpacing = 80;
        let afterSpacing = 80;
        let isHeading = false;
        let headingSize = 20;

        if (tag === 'h1') { isHeading = true; headingSize = 28; beforeSpacing = 240; afterSpacing = 120; }
        else if (tag === 'h2') { isHeading = true; headingSize = 24; beforeSpacing = 200; afterSpacing = 100; }
        else if (tag === 'h3') { isHeading = true; headingSize = 22; beforeSpacing = 160; afterSpacing = 80; }

        if (isHeading) {
            runs.forEach(r => { (r as any).options.size = headingSize; (r as any).options.bold = true; });
        }

        result.push(new Paragraph({
            children: runs,
            ...(baseOptions.paragraph || {}),
            spacing: { before: beforeSpacing, after: afterSpacing }
        }));
    }

    return result;
}

/**
 * Parses basic HTML to an array of DOCX Paragraphs and Tables
 */
function parseHtmlToDocxParagraphs(html: string, baseOptions: any = {}): (Paragraph | Table)[] {
    if (!html || !html.trim()) return [];

    const container = document.createElement("DIV");
    container.innerHTML = html;

    const result: (Paragraph | Table)[] = [];
    Array.from(container.childNodes).forEach(child => {
        result.push(...parseNodeToDocxBlocks(child, baseOptions));
    });

    return result;
}

export const exportVerbaleToDocx = async (verbale: Verbale, membri: MembroCoCa[], currentUser: User) => {
    let logoBuffer: ArrayBuffer | null = null;
    let footerLogosBuffer: ArrayBuffer | null = null;
    try {
        logoBuffer = await fetchImageAsBuffer(window.location.origin + '/turi_1_no_bg.png');
    } catch (e) {
        console.error("Could not load logo for DOCX", e);
    }
    try {
        footerLogosBuffer = await fetchImageAsBuffer(window.location.origin + '/footer_logos.png');
    } catch (e) {
        console.error("Could not load footer logos for DOCX", e);
    }

    const getMembroNome = (id: string) => membri.find(m => m.id === id)?.nome || verbale.presentiNomi?.[id] || 'Capo';

    const presentMembri = (verbale.presenti || []).map(id => ({
        id,
        nome: getMembroNome(id)
    })).sort((a,b) => a.nome.localeCompare(b.nome));

    const absentMembri = (verbale.assenti || []).map(id => ({
        id,
        nome: getMembroNome(id)
    })).sort((a,b) => a.nome.localeCompare(b.nome));
    
    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: 1800,      // 90pt (dxa): leaves comfortable room for header without colliding with body
                        right: 800,     // 40pt (dxa): matches PDF export margin
                        bottom: 1500,   // 75pt (dxa): room for footer
                        left: 800,      // 40pt (dxa): matches PDF export margin
                        header: 500,    // 25pt (dxa): header offset from top edge
                        footer: 500,    // 25pt (dxa): footer offset from bottom edge
                    },
                },
            },
            headers: {
                default: new Header({
                    children: [
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: {
                                top: { style: BorderStyle.NONE },
                                bottom: { style: BorderStyle.SINGLE, size: 12, color: "45387E" },
                                left: { style: BorderStyle.NONE },
                                right: { style: BorderStyle.NONE },
                                insideHorizontal: { style: BorderStyle.NONE },
                                insideVertical: { style: BorderStyle.NONE },
                            },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            width: { size: 30, type: WidthType.PERCENTAGE },
                                            children: [
                                                ...(logoBuffer ? [
                                                    new Paragraph({
                                                        alignment: AlignmentType.LEFT,
                                                        children: [
                                                            new ImageRun({
                                                                data: new Uint8Array(logoBuffer),
                                                                transformation: { width: 60, height: 60 },
                                                                type: 'png',
                                                            }),
                                                        ],
                                                    })
                                                ] : [
                                                    new Paragraph({ 
                                                        children: [new TextRun({ text: "AGESCI TURI 1", bold: true, color: "45387E", font: "Georgia", size: 28 })],
                                                        alignment: AlignmentType.LEFT 
                                                    })
                                                ])
                                            ],
                                        }),
                                        new TableCell({
                                            width: { size: 70, type: WidthType.PERCENTAGE },
                                            children: [
                                                new Paragraph({
                                                    alignment: AlignmentType.RIGHT,
                                                    children: [new TextRun({ text: `Gruppo ${currentUser.groupName || 'Turi 1'}`, bold: true, size: 22, font: "Tahoma", color: "45387E" })],
                                                    spacing: { after: 20 }
                                                }),
                                                new Paragraph({
                                                    alignment: AlignmentType.RIGHT,
                                                    children: [new TextRun({ text: "Associazione Guide e Scouts Cattolici Italiani", bold: true, size: 20, font: "Tahoma", color: "45387E" })],
                                                    spacing: { after: 20 }
                                                }),
                                                new Paragraph({
                                                    alignment: AlignmentType.RIGHT,
                                                    children: [new TextRun({ text: "Strada Mola 4 – 70010 Turi BA", size: 18, font: "Tahoma", color: "45387E" })],
                                                    spacing: { after: 20 }
                                                }),
                                                new Paragraph({
                                                    alignment: AlignmentType.RIGHT,
                                                    children: [new TextRun({ text: "turi1@puglia.agesci.it", size: 18, font: "Tahoma", color: "45387E", underline: { type: UnderlineType.SINGLE } })],
                                                    spacing: { after: 20 }
                                                }),
                                                new Paragraph({
                                                    alignment: AlignmentType.RIGHT,
                                                    children: [new TextRun({ text: "Codice fiscale: 91120250724", size: 18, font: "Tahoma", color: "45387E" })],
                                                    spacing: { after: 20 }
                                                }),
                                                new Paragraph({
                                                    alignment: AlignmentType.RIGHT,
                                                    children: [new TextRun({ text: "N. Iscr. R.U.N.T.S.: 64984", size: 18, font: "Tahoma", color: "45387E" })],
                                                    spacing: { after: 40 }
                                                }),
                                            ],
                                        }),
                                    ],
                                }),
                            ],
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "WOSM / WAGGGS Member - Iscritta al Registro Nazionale APS n.72", size: 16, color: "999999", italics: true, font: "Tahoma" }),
                            ],
                            spacing: { before: 80, after: 60 },
                        }),
                    ],
                }),
            },
            children: [
                new Paragraph({ text: "", spacing: { before: 100 } }),
                
                // LINEAR METADATA (MATCHING SCREEN 2 & PDF)
                new Paragraph({
                    children: [new TextRun({ text: verbale.data || '', bold: true, font: "Roboto", size: 20 })],
                    spacing: { after: 100 },
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Oggetto: ", bold: true, font: "Roboto", size: 20 }),
                        new TextRun({ text: cleanText(verbale.titolo), font: "Roboto", size: 20 }),
                    ],
                    spacing: { after: 100 },
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Presenti: ", bold: true, font: "Roboto", size: 20 }),
                        new TextRun({ 
                            text: presentMembri.map(m => {
                                const isLate = verbale.ritardi?.includes(m.id);
                                const exit = verbale.usciteAnticipate?.find(u => u.membroId === m.id);
                                let suffix = "";
                                if (isLate && exit) suffix = ` (R e esc. ore ${exit.ora})`;
                                else if (isLate) suffix = " (R)";
                                else if (exit) suffix = ` (esc. ore ${exit.ora})`;
                                return cleanText(m.nome) + suffix;
                            }).join(', '), 
                            font: "Roboto", 
                            size: 20,
                            italics: true 
                        }),
                        ...(verbale.ospiti && verbale.ospiti.length > 0 ? [
                            new TextRun({ text: ", " + verbale.ospiti.map(o => `${cleanText(o.nome)} (${cleanText(o.ruolo || '')})`).join(', '), font: "Roboto", size: 20, italics: true })
                        ] : []),
                    ],
                    spacing: { after: 100 },
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Assenti: ", bold: true, font: "Roboto", size: 20 }),
                        new TextRun({ text: absentMembri.map(m => cleanText(m.nome)).join(', ') || 'Nessuno', font: "Roboto", size: 20, italics: true }),
                    ],
                    spacing: { after: 100 },
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "ODG:", bold: true, font: "Roboto", size: 20 }),
                    ],
                    spacing: { after: 100, before: 200 },
                }),
                ...verbale.odg.map(p => new Paragraph({
                    children: [new TextRun({ text: `• ${cleanText(p.titolo)}`, bold: true, font: "Roboto", size: 20 })],
                    indent: { left: 720 },
                    spacing: { after: 50 },
                })),
                ...(verbale.sezioniAttive || []).map(sez => {
                    let title = "";
                    if (sez === 'ritorni' && verbale.ritorni && verbale.ritorni.length > 0) title = "Ritorni dalle branche";
                    if (sez === 'date_importanti' && verbale.dateImportanti && verbale.dateImportanti.length > 0) title = "Date importanti";
                    if (sez === 'cassa' && verbale.cassa && verbale.cassa.length > 0) title = "Movimenti di cassa di gruppo";
                    if (sez === 'posti_azione' && verbale.postiAzione && verbale.postiAzione.length > 0) title = "Posti d'Azione";
                    if (sez === 'prossimi_impegni' && verbale.prossimiImpegni && verbale.prossimiImpegni.length > 0) title = "Prossimi impegni";
                    if (sez === 'varie' && verbale.varie && verbale.varie.trim().length > 0) title = "Varie ed Eventuali";
                    
                    if (!title) return null;
                    return new Paragraph({
                        children: [new TextRun({ text: `• ${title}`, bold: true, font: "Roboto", size: 20 })],
                        indent: { left: 720 },
                        spacing: { after: 50 },
                    });
                }).filter(Boolean) as Paragraph[],

                new Paragraph({ text: "", spacing: { before: 400 } }),

                // ODG CONTENT
                ...verbale.odg.map((punto) => [
                    new Paragraph({
                        children: [
                            new TextRun({ text: `• ${cleanText(punto.titolo)}`, bold: true, size: 20, font: "Roboto" })
                        ],
                        spacing: { before: 400, after: 100 },
                    }),
                    ...parseHtmlToDocxParagraphs(punto.contenuto, {
                        textRun: { size: 20, font: "Roboto" },
                        paragraph: { alignment: AlignmentType.BOTH, indent: { left: 720 }, spacing: { before: 100, after: 100 } }
                    })
                ]).flat(),

                // SECTIONS
                ...(verbale.sezioniAttive?.includes('ritorni') && verbale.ritorni && verbale.ritorni.length > 0 ? [
                    new Paragraph({
                        children: [new TextRun({ text: "RITORNI DALLE BRANCHE", bold: true, size: 20, color: "45387E", font: "Georgia" })],
                        spacing: { before: 800 },
                        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" } },
                    }),
                    ...verbale.ritorni.map(r => [
                        new Paragraph({
                            children: [new TextRun({ text: `- ${r.branca}`, bold: true, font: "Georgia" })],
                            spacing: { before: 200 },
                            indent: { left: 400 },
                        }),
                        ...parseHtmlToDocxParagraphs(r.contenuto, {
                            textRun: { italics: true, font: "Georgia", size: 22 },
                            paragraph: { alignment: AlignmentType.BOTH, indent: { left: 800 }, spacing: { before: 100 } }
                        })
                    ]).flat(),
                ] : []),

                ...(verbale.sezioniAttive?.includes('date_importanti') && verbale.dateImportanti && verbale.dateImportanti.length > 0 ? [
                    new Paragraph({
                        children: [new TextRun({ text: "DATE IMPORTANTI", bold: true, size: 20, color: "45387E", font: "Georgia" })],
                        spacing: { before: 800 },
                        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" } },
                    }),
                    ...verbale.dateImportanti.map(d => [
                        new Paragraph({
                            children: [new TextRun({ text: `${d.evento}`, bold: true, font: "Georgia", size: 22 })],
                            spacing: { before: 200 },
                            indent: { left: 400 },
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ 
                                    text: `${new Date(d.dataInizio).toLocaleDateString('it-IT')}${d.dataFine ? ' - ' + new Date(d.dataFine).toLocaleDateString('it-IT') : ''}${d.luogo ? ' • ' + cleanText(d.luogo) : ''}`, 
                                    font: "Georgia", 
                                    color: "666666", 
                                    size: 18 
                                })
                            ],
                            spacing: { before: 50 },
                            indent: { left: 800 },
                        }),
                        ...(d.note ? [
                           new Paragraph({
                               children: [new TextRun({ text: cleanText(d.note), italics: true, font: "Georgia", size: 20 })],
                               spacing: { before: 50 },
                               indent: { left: 800 },
                           })
                        ] : []),
                    ]).flat(),
                ] : []),

                ...(verbale.cassa && verbale.cassa.length > 0 ? [
                    new Paragraph({
                        children: [new TextRun({ text: "MOVIMENTI DI CASSA DI GRUPPO", bold: true, size: 20, color: "45387E", font: "Georgia" })],
                        spacing: { before: 800, after: 200 },
                        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" } },
                    }),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        columnWidths: [2200, 2200, 3906, 2000],
                        borders: {
                            top: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
                            bottom: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
                            left: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
                            right: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
                            insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
                            insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
                        },
                        rows: [
                            new TableRow({
                                tableHeader: true,
                                children: [
                                    new TableCell({ width: { size: 2200, type: WidthType.DXA }, shading: { fill: "F3F4F6" }, margins: { top: 120, bottom: 120, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: "Branca", bold: true, size: 18 })] })] }),
                                    new TableCell({ width: { size: 2200, type: WidthType.DXA }, shading: { fill: "F3F4F6" }, margins: { top: 120, bottom: 120, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: "Tipo", bold: true, size: 18 })] })] }),
                                    new TableCell({ width: { size: 3906, type: WidthType.DXA }, shading: { fill: "F3F4F6" }, margins: { top: 120, bottom: 120, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: "Causale", bold: true, size: 18 })] })] }),
                                    new TableCell({ width: { size: 2000, type: WidthType.DXA }, shading: { fill: "F3F4F6" }, margins: { top: 120, bottom: 120, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: "Importo", bold: true, size: 18 })], alignment: AlignmentType.RIGHT })] }),
                                ],
                            }),
                            ...verbale.cassa.map(m => new TableRow({
                                children: [
                                    new TableCell({ width: { size: 2200, type: WidthType.DXA }, margins: { top: 120, bottom: 120, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: cleanText(m.branca), font: "Georgia", size: 18 })] })] }),
                                    new TableCell({ width: { size: 2200, type: WidthType.DXA }, margins: { top: 120, bottom: 120, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: cleanText(m.tipo || 'Versamento'), font: "Georgia", size: 18 })] })] }),
                                    new TableCell({ width: { size: 3906, type: WidthType.DXA }, margins: { top: 120, bottom: 120, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: cleanText(m.note), italics: true, font: "Georgia", size: 18 })] })] }),
                                    new TableCell({ width: { size: 2000, type: WidthType.DXA }, margins: { top: 120, bottom: 120, left: 160, right: 160 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `€ ${m.importo.toFixed(2)}`, bold: true, font: "Georgia", size: 18 })] })] }),
                                ],
                            })),
                        ],
                    }),
                ] : []),

                ...(verbale.sezioniAttive?.includes('posti_azione') && verbale.postiAzione && verbale.postiAzione.length > 0 ? [
                    new Paragraph({
                        children: [new TextRun({ text: "POSTI D'AZIONE", bold: true, size: 20, color: "45387E", font: "Georgia" })],
                        spacing: { before: 800 },
                        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" } },
                    }),
                    ...verbale.postiAzione.map(pa => new Paragraph({
                        children: [
                            new TextRun({ text: `• ${cleanText(pa.cosa)}`, bold: true, font: "Georgia", size: 22 }),
                            new TextRun({ 
                                text: ` — Resp: ${(pa.chiIds || []).map(id => cleanText(getMembroNome(id))).join(', ') || '—'}${pa.quando ? ` (${cleanText(pa.quando)})` : ''}`, 
                                font: "Georgia", color: "666666", size: 20 
                            }),
                        ],
                        indent: { left: 720 },
                        spacing: { before: 200 },
                    })),
                ] : []),

                ...(verbale.sezioniAttive?.includes('prossimi_impegni') && verbale.prossimiImpegni && verbale.prossimiImpegni.length > 0 ? [
                    new Paragraph({
                        children: [new TextRun({ text: "PROSSIMI IMPEGNI", bold: true, size: 20, color: "45387E", font: "Georgia" })],
                        spacing: { before: 800 },
                        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" } },
                    }),
                    ...verbale.prossimiImpegni.map(imp => new Paragraph({
                        children: [
                            new TextRun({ text: `• ${cleanText(imp.evento)}`, bold: true, font: "Georgia", size: 22 }),
                            new TextRun({ 
                                text: ` — ${imp.dataInizio ? new Date(imp.dataInizio).toLocaleDateString('it-IT') : ''}${imp.note ? ' ore ' + cleanText(imp.note) : ''}`, 
                                font: "Georgia", 
                                color: "666666", 
                                size: 20 
                            }),
                        ],
                        indent: { left: 720 },
                        spacing: { before: 200 },
                    })),
                ] : []),

                ...(verbale.sezioniAttive?.includes('varie') && verbale.varie && verbale.varie.trim().length > 0 ? [
                    new Paragraph({
                        children: [new TextRun({ text: "VARIE ED EVENTUALI", bold: true, size: 20, color: "45387E", font: "Georgia" })],
                        spacing: { before: 800 },
                        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" } },
                    }),
                    ...parseHtmlToDocxParagraphs(verbale.varie, {
                        textRun: { size: 20, font: "Roboto" },
                        paragraph: { alignment: AlignmentType.BOTH, indent: { left: 400 }, spacing: { before: 200 } }
                    })
                ] : []),
            ],
            footers: {
                default: new Footer({
                    children: [
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: {
                                top: { style: BorderStyle.SINGLE, size: 6, color: "E5E7EB" },
                                bottom: { style: BorderStyle.NONE },
                                left: { style: BorderStyle.NONE },
                                right: { style: BorderStyle.NONE },
                                insideHorizontal: { style: BorderStyle.NONE },
                                insideVertical: { style: BorderStyle.NONE },
                            },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            width: { size: 70, type: WidthType.PERCENTAGE },
                                            verticalAlign: VerticalAlign.CENTER,
                                            children: [
                                                new Paragraph({
                                                    children: [
                                                        new TextRun({ 
                                                            text: "WAGGGS / WOSM Member • Iscritta al Registro Nazionale delle Associazioni di Promozione Sociale n.72 - Legge 383/2000", 
                                                            size: 16, 
                                                            color: "999999",
                                                            font: "Tahoma"
                                                        })
                                                    ],
                                                }),
                                            ],
                                        }),
                                        new TableCell({
                                            width: { size: 30, type: WidthType.PERCENTAGE },
                                            verticalAlign: VerticalAlign.CENTER,
                                            children: [
                                                ...(footerLogosBuffer ? [
                                                    new Paragraph({
                                                        alignment: AlignmentType.RIGHT,
                                                        children: [
                                                            new ImageRun({
                                                                data: new Uint8Array(footerLogosBuffer),
                                                                transformation: { width: 100, height: 33 },
                                                                type: 'png',
                                                            })
                                                        ],
                                                    })
                                                ] : []),
                                            ],
                                        }),
                                    ],
                                }),
                            ],
                        }),
                        new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                                new TextRun({ text: "Pagina ", size: 16, color: "999999", font: "Tahoma" }),
                                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "999999", font: "Tahoma" }),
                                new TextRun({ text: " di ", size: 16, color: "999999", font: "Tahoma" }),
                                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "999999", font: "Tahoma" }),
                            ],
                            spacing: { before: 80, after: 40 },
                        }),
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun({ 
                                    text: `Verbale ufficiale di Comunità Capi - Certificato il ${new Date().toLocaleDateString('it-IT')}`, 
                                    size: 14, 
                                    italics: true, 
                                    color: "CCCCCC",
                                    font: "Tahoma"
                                })
                            ],
                            spacing: { before: 40 },
                        }),
                    ],
                }),
            },
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Verbale_${verbale.data}_N${verbale.numero}.docx`);
};
