import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import htmlToPdfmake from 'html-to-pdfmake';
import { Verbale, MembroCoCa } from '@/types';

// Inizializza i font virtuali per pdfMake (Roboto by default)
const pdfMakeAny = pdfMake as any;
const vfs = (pdfFonts as any).pdfMake ? (pdfFonts as any).pdfMake.vfs : (pdfFonts as any).vfs;

if (pdfMakeAny && !pdfMakeAny.vfs && vfs) {
    try {
        pdfMakeAny.vfs = vfs;
    } catch (e) {
        console.warn("PDF Export Engine: Unable to set vfs directly on pdfMake, ignoring (might be handled globally).", e);
    }
}

/**
 * Sanitizza ricorsivamente l'albero AST generato da html-to-pdfmake
 * per garantire che pdfMake non fallisca in nessun caso limite:
 * - Rimuove proprietà `font` non registrate nel VFS (es. 'Inherit', 'Sans-serif', 'Arial')
 * - Normalizza e bilancia tutte le tabelle (evita "Malformed table row, a cell is undefined" o righe vuote)
 * - Sostituisce immagini remote non caricate nel VFS per evitare crash di pdfMake
 */
function sanitizePdfMakeDoc(node: any): any {
    if (!node) return node;

    if (Array.isArray(node)) {
        return node.map(sanitizePdfMakeDoc).filter(Boolean);
    }

    if (typeof node === 'object') {
        // 1. Rimuovi font non definiti nel VFS di pdfMake (supporta nativamente Roboto)
        if (node.font && node.font !== 'Roboto') {
            delete node.font;
        }

        // 2. Normalizza e convalida le tabelle
        if (node.table) {
            if (!Array.isArray(node.table.body) || node.table.body.length === 0) {
                // Tabella senza righe: riga neutra valida per evitare TypeError di pdfMake
                node.table.body = [[{ text: '' }]];
            } else {
                let maxCols = 0;
                node.table.body.forEach((row: any) => {
                    if (Array.isArray(row)) {
                        maxCols = Math.max(maxCols, row.length);
                    }
                });

                if (maxCols === 0) {
                    node.table.body = [[{ text: '' }]];
                    maxCols = 1;
                } else {
                    node.table.body = node.table.body.map((row: any) => {
                        if (!Array.isArray(row)) return Array(maxCols).fill({ text: '' });
                        const newRow = [...row];
                        while (newRow.length < maxCols) {
                            newRow.push({ text: '' });
                        }
                        return newRow.map((cell: any) => sanitizePdfMakeDoc(cell));
                    });
                }

                // Assicura che widths sia sincronizzato con maxCols
                if (!node.table.widths || !Array.isArray(node.table.widths) || node.table.widths.length !== maxCols) {
                    node.table.widths = Array(maxCols).fill('*');
                }
            }
        }

        // 3. Gestisci immagini: se non sono dataURL e non sono presenti nel VFS, sostituiscile con placeholder
        if (node.image && typeof node.image === 'string') {
            if (!node.image.startsWith('data:image/')) {
                if (!pdfMakeAny.vfs || !pdfMakeAny.vfs[node.image]) {
                    return { text: '[Immagine]', italics: true, color: '#666666' };
                }
            }
        }

        // 4. Ricorsione sui contenitori annidati
        if (Array.isArray(node.stack)) {
            node.stack = node.stack.map(sanitizePdfMakeDoc).filter(Boolean);
        }
        if (Array.isArray(node.columns)) {
            node.columns = node.columns.map(sanitizePdfMakeDoc).filter(Boolean);
        }
        if (Array.isArray(node.text)) {
            node.text = node.text.map(sanitizePdfMakeDoc);
        }
    }

    return node;
}

/**
 * Fallback di emergenza basato su html2pdf.js nel caso in cui la generazione vettoriale pdfMake fallisca.
 */
async function fallbackExportWithHtml2Pdf(contentHtml: string, filename: string): Promise<void> {
    console.warn("PDF Export Engine: Attivazione fallback robusto con html2pdf.js...");
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '750px';
    container.style.background = '#ffffff';
    container.style.color = '#111111';
    container.style.padding = '30px';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.fontSize = '12px';
    container.style.lineHeight = '1.5';
    container.innerHTML = contentHtml;
    document.body.appendChild(container);

    try {
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = (html2pdfModule.default || html2pdfModule) as any;
        const opt = {
            margin: [10, 10, 10, 10],
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        await html2pdf().set(opt).from(container).save();
        console.log("PDF Export Fallback: Generato e scaricato con successo!");
    } finally {
        if (container.parentNode) {
            container.parentNode.removeChild(container);
        }
    }
}

/**
 * Genera e scarica un PDF vettoriale (testo selezionabile e multi-pagina) del verbale
 * usando pdfmake e html-to-pdfmake. Questo aggira qualsiasi limitazione del rendering CSS su Canvas.
 */
export async function exportVerbaleToPdf(
    verbale: Partial<Verbale>,
    membri: MembroCoCa[],
    _intestazioneHtml: string = '',
    _piePaginaHtml: string = ''
): Promise<void> {
    const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('it-IT') : '-';
    const membroNome = (id: string) => membri.find(m => m.id === id)?.nome || verbale.presentiNomi?.[id] || 'Capo';

    const presenti = (verbale.presenti || []).map(id => {
        const nome = membroNome(id);
        const isLate = verbale.ritardi?.includes(id);
        const exit = verbale.usciteAnticipate?.find(u => u.membroId === id);
        let suffix = "";
        if (isLate && exit) suffix = ` (R e esc. ore ${exit.ora})`;
        else if (isLate) suffix = " (R)";
        else if (exit) suffix = ` (esc. ore ${exit.ora})`;
        return nome + suffix;
    }).join(', ') || '-';
    const assenti = (verbale.assenti || []).map(membroNome).join(', ') || '-';
    const ritardi = (verbale.ritardi || []).map(membroNome).join(', ') || '';

    const odgHtml = (verbale.odg || []).map((p, i) => `
        <div style="margin-bottom:6pt">
            <strong>${i + 1}. ${p.titolo}</strong>
            ${p.contenuto ? `<div style="margin-top:2pt;color:#333">${p.contenuto}</div>` : ''}
        </div>
    `).join('');

    const postiAzioneHtml = (verbale.sezioniAttive || []).includes('posti_azione') && (verbale.postiAzione || []).length > 0
        ? `<div style="margin-top:10pt">
            <strong>🎯 Posti d'Azione</strong>
            <ul style="margin-top:4pt;">
                ${(verbale.postiAzione || []).map(pa => `
                    <li style="margin-bottom:4pt">
                        <strong>${pa.cosa}</strong>
                        <span style="color:#666"> — Resp: ${(pa.chiIds || []).map(membroNome).join(', ') || '—'}${pa.quando ? ` (${formatDate(pa.quando)})` : ''}</span>
                    </li>
                `).join('')}
            </ul>
          </div>`
        : '';

    const ritornoHtml = (verbale.sezioniAttive || []).includes('ritorni') && (verbale.ritorni || []).length > 0
        ? `<div style="margin-top:10pt">
            <strong>🗣️ Ritorni</strong>
            <ul style="margin-top:4pt;">
                ${(verbale.ritorni || []).map(r => `<li style="margin-bottom:3pt">${r.branca ? `<strong>[${r.branca}]</strong> ` : ''}${r.contenuto}</li>`).join('')}
            </ul>
          </div>`
        : '';

    const varieHtml = (verbale.sezioniAttive || []).includes('varie') && verbale.varie
        ? `<div style="margin-top:10pt">
            <strong>💬 Varie ed Eventuali</strong>
            <p style="margin-top:4pt;font-style:italic;color:#444">${verbale.varie}</p>
          </div>`
        : '';

    // Costruiamo il contenuto principale come HTML e poi lo convertiamo con htmlToPdfmake
    const contentHtml = `
        <div>
            <div style="margin-bottom:12pt; font-size: 16pt;">
                <strong>${verbale.titolo || 'Verbale di Riunione'}</strong>
                <div style="color:#666;font-size:10pt;margin-top:2pt">
                    N° ${verbale.numero || '-'} |
                    ${formatDate(verbale.data)} |
                    ${verbale.luogo || '-'} |
                    ${verbale.oraInizio || '-'} – ${verbale.oraFine || '-'}
                </div>
            </div>

            <div style="margin-bottom:10pt; font-size: 11pt;">
                <strong>✓ Presenti:</strong> ${presenti}<br>
                ${assenti !== '-' ? `<strong>✗ Assenti:</strong> ${assenti}<br>` : ''}
                ${ritardi ? `<strong>⏱ Ritardi:</strong> ${ritardi}` : ''}
            </div>

            <div style="margin-bottom:12pt">
                <strong style="font-size: 11pt">📋 Ordine del Giorno</strong>
                <div style="margin-top:4pt">${odgHtml}</div>
            </div>

            ${ritornoHtml}
            ${postiAzioneHtml}
            ${varieHtml}
        </div>
    `;

    // Fetch images natively for proper embedding in PDF
    let logoDataUrl: string | null = null;
    let footerLogosDataUrl: string | null = null;
    try {
        const logoRes = await fetch(window.location.origin + '/turi_1_no_bg.png');
        if (logoRes.ok) {
            const blob = await logoRes.blob();
            logoDataUrl = await new Promise(r => { const f = new FileReader(); f.onloadend = () => r(f.result as string); f.readAsDataURL(blob); });
        }
        const footRes = await fetch(window.location.origin + '/footer_logos.png');
        if (footRes.ok) {
            const blob = await footRes.blob();
            footerLogosDataUrl = await new Promise(r => { const f = new FileReader(); f.onloadend = () => r(f.result as string); f.readAsDataURL(blob); });
        }
    } catch(e) { console.error("Could not fetch images for PDF", e); }

    const dateObj = verbale.data ? new Date(verbale.data) : new Date();
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const yy = String(dateObj.getFullYear()).slice(-2);
    const filename = `Verbale ${dd}-${mm}-${yy}.pdf`;

    try {
        console.log("PDF Export Engine: parsing HTML with html-to-pdfmake...");
        
        // Impostiamo defaultStyles per evitare margini doppi tra paragrafi e liste ed ignoriamo font-family
        const parsedContent = htmlToPdfmake(contentHtml, { 
            window: window as any,
            ignoreStyles: ['font-family'],
            defaultStyles: {
                p: { margin: [0, 0, 0, 4] },
                div: { margin: [0, 0, 0, 2] },
                ul: { margin: [0, 0, 0, 5] },
                li: { margin: [0, 0, 0, 2] },
                table: { margin: [0, 6, 0, 6] },
                th: { bold: true, fillColor: '#EEEEEE' }
            }
        });

        // Sanificazione profonda dell'AST per prevenire crash di pdfMake (tabelle asimmetriche, font non caricati, immagini remote)
        const sanitizedContent = sanitizePdfMakeDoc(parsedContent);

        const docDefinition = {
            content: sanitizedContent,
            header: {
                margin: [40, 20, 40, 0] as [number, number, number, number],
                stack: [
                    {
                        columns: [
                            {
                                width: '30%',
                                stack: logoDataUrl 
                                    ? [{ image: logoDataUrl, width: 60, alignment: 'left' }] 
                                    : [{ text: 'AGESCI TURI 1', bold: true, color: '#45387E', fontSize: 14 }]
                            },
                            {
                                width: '70%',
                                text: [
                                    { text: 'Gruppo Turi 1\n', bold: true, fontSize: 11 },
                                    { text: 'Associazione Guide e Scouts Cattolici Italiani\n', bold: true, fontSize: 11 },
                                    'Strada Mola 4 – 70010 Turi BA\nturi1@puglia.agesci.it\nCodice fiscale: 91120250724\nN. Iscr. R.U.N.T.S.: 64984'
                                ],
                                alignment: 'right',
                                color: '#45387E',
                                fontSize: 9,
                                leadingIndent: 2
                            }
                        ],
                        margin: [0, 0, 0, 4] as [number, number, number, number]
                    },
                    {
                        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: '#45387E' }]
                    },
                    {
                        text: 'WOSM / WAGGGS Member - Iscritta al Registro Nazionale APS n.72',
                        fontSize: 8,
                        italics: true,
                        color: '#999999',
                        margin: [0, 4, 0, 0] as [number, number, number, number]
                    }
                ]
            } as any,
            footer: function(currentPage: number, pageCount: number) {
                return {
                    margin: [40, 10, 40, 20] as [number, number, number, number],
                    stack: [
                        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#E5E7EB' }], margin: [0, 0, 0, 8] as [number, number, number, number] },
                        {
                            columns: [
                                {
                                    width: '70%',
                                    text: 'WAGGGS / WOSM Member • Iscritta al Registro Nazionale delle Associazioni di Promozione Sociale n.72',
                                    fontSize: 8,
                                    color: '#999999'
                                },
                                {
                                    width: '30%',
                                    stack: footerLogosDataUrl 
                                        ? [{ image: footerLogosDataUrl, width: 100, alignment: 'right' }] 
                                        : []
                                }
                            ]
                        },
                        {
                            text: `Pagina ${currentPage} di ${pageCount}`,
                            alignment: 'right',
                            fontSize: 9,
                            color: '#999999',
                            margin: [0, 10, 0, 0] as [number, number, number, number]
                        }
                    ]
                } as any;
            },
            pageMargins: [40, 95, 40, 75] as [number, number, number, number],
            defaultStyle: {
                fontSize: 12,
                color: '#111111'
            }
        };

        console.log("PDF Export Engine: Generating vectorial PDF with pdfMake...");
        // Usa pdfMake per generare e scaricare nativamente il PDF (senza dipendere dal canvas)
        await (pdfMake.createPdf(docDefinition) as any).download(filename);
        
        console.log("PDF Export Engine: Vectorial PDF generated successfully!");
    } catch (error) {
        console.warn("PDF Export Engine (pdfMake) encountered an error, falling back to html2pdf:", error);
        try {
            await fallbackExportWithHtml2Pdf(contentHtml, filename);
        } catch (fallbackErr) {
            console.error("PDF Export Fallback Error Detailed:", fallbackErr);
            throw fallbackErr;
        }
    }
}
