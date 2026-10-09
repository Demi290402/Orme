import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import htmlToPdfmake from 'html-to-pdfmake';
import { Verbale, MembroCoCa } from '@/types';
import { calculateScoutYear, formatScoutYear } from '@/lib/verbali';

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
    const formatSafeDate = (d?: string) => {
        if (!d) return '-';
        const dt = new Date(d);
        return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('it-IT');
    };
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

    const ospitiStr = (verbale.ospiti && verbale.ospiti.length > 0)
        ? `, ${verbale.ospiti.map(o => `${o.nome}${o.ruolo ? ` (${o.ruolo})` : ''}`).join(', ')}`
        : '';
    const presentiConOspiti = presenti !== '-' ? `${presenti}${ospitiStr}` : (ospitiStr ? ospitiStr.slice(2) : '-');
    const assenti = (verbale.assenti || []).map(membroNome).join(', ') || 'Nessuno';
    const ritardi = (verbale.ritardi || []).map(membroNome).join(', ') || '';

    const scoutYearText = formatScoutYear(verbale.annoScout ?? calculateScoutYear(verbale.data || ''));

    const isSectionActive = (secId: string) => {
        if (!verbale.sezioniAttive) return true;
        return verbale.sezioniAttive.includes(secId);
    };

    // Sommario Ordine del Giorno
    const SEZIONI_LABELS: Record<string, string> = {
        ritorni: 'Ritorni dalle branche',
        date_importanti: 'Date importanti',
        posti_azione: "Posti d'Azione",
        cassa: 'Movimenti di cassa di gruppo',
        prossimi_impegni: 'Prossimi impegni',
        varie: 'Varie ed eventuali',
    };

    const activeSectionsWithContent = (verbale.sezioniAttive || ['ritorni', 'date_importanti', 'posti_azione', 'cassa', 'prossimi_impegni', 'varie']).filter(sezId => {
        if (!isSectionActive(sezId)) return false;
        if (sezId === 'ritorni') return (verbale.ritorni?.length || 0) > 0;
        if (sezId === 'date_importanti') return (verbale.dateImportanti?.length || 0) > 0;
        if (sezId === 'posti_azione') return (verbale.postiAzione?.length || 0) > 0;
        if (sezId === 'cassa') return (verbale.cassa?.length || 0) > 0;
        if (sezId === 'prossimi_impegni') return (verbale.prossimiImpegni?.length || 0) > 0;
        if (sezId === 'varie') return !!verbale.varie && verbale.varie.trim().length > 0;
        return false;
    });

    const odgSummaryItems = [
        ...(verbale.odg || []).map(p => `<li><strong>${p.titolo}</strong></li>`),
        ...activeSectionsWithContent.map(s => `<li><span style="color:#666; font-style:italic;">${SEZIONI_LABELS[s] || s}</span></li>`)
    ];

    const odgSummaryHtml = odgSummaryItems.length > 0 ? `
        <div style="margin-top:6pt; margin-bottom:12pt; font-size:10pt;">
            <strong>ODG:</strong>
            <ul style="margin-top:3pt; margin-bottom:4pt; padding-left:20pt;">
                ${odgSummaryItems.join('')}
            </ul>
        </div>
    ` : '';

    // Dettaglio punti ODG
    const odgDetailsHtml = (verbale.odg || []).map((p) => `
        <div style="margin-top:10pt; margin-bottom:12pt;">
            <div style="font-size:11pt; margin-bottom:3pt;">
                <strong>• ${p.titolo}</strong>
            </div>
            ${p.contenuto ? `<div style="font-size:10pt; line-height:1.45; text-align:justify; margin-left:14pt; color:#222;">${p.contenuto}</div>` : ''}
        </div>
    `).join('');

    // Sezione: Ritorni dalle branche
    const ritornoHtml = isSectionActive('ritorni') && (verbale.ritorni || []).length > 0
        ? `<div style="margin-top:14pt; margin-bottom:12pt;">
            <div style="font-size:10pt; font-weight:bold; text-transform:uppercase; color:#45387E; border-bottom:1px solid #EEEEEE; padding-bottom:2pt; margin-bottom:6pt; letter-spacing:0.5pt;">
                RITORNI DALLE BRANCHE
            </div>
            ${(verbale.ritorni || []).map(r => `
                <div style="margin-bottom:8pt; margin-left:8pt;">
                    <div style="font-size:10pt; font-weight:bold;">- ${r.branca}</div>
                    <div style="font-size:10pt; line-height:1.45; font-style:italic; color:#333; margin-left:10pt; text-align:justify;">
                        ${r.contenuto}
                    </div>
                </div>
            `).join('')}
          </div>`
        : '';

    // Sezione: Date importanti
    const dateImportantiHtml = isSectionActive('date_importanti') && (verbale.dateImportanti || []).length > 0
        ? `<div style="margin-top:14pt; margin-bottom:12pt;">
            <div style="font-size:10pt; font-weight:bold; text-transform:uppercase; color:#45387E; border-bottom:1px solid #EEEEEE; padding-bottom:2pt; margin-bottom:6pt; letter-spacing:0.5pt;">
                DATE IMPORTANTI
            </div>
            <div style="margin-left:8pt;">
                ${(verbale.dateImportanti || []).map(d => {
                    const dataInizio = formatSafeDate(d.dataInizio);
                    const dataFine = d.dataFine ? formatSafeDate(d.dataFine) : '';
                    const dateRange = dataFine ? `${dataInizio} – ${dataFine}` : dataInizio;
                    const luogoStr = d.luogo ? ` • ${d.luogo}` : '';
                    const brancaStr = (d.branca && d.branca !== 'CoCa') ? ` [${d.branca}]` : '';

                    return `
                    <div style="margin-bottom:8pt; border-left:2px solid #45387E; padding-left:8pt;">
                        <div style="font-size:10pt; font-weight:bold;">
                            ${d.evento}${brancaStr ? `<span style="color:#45387E; font-weight:normal;">${brancaStr}</span>` : ''}
                        </div>
                        <div style="font-size:9pt; color:#666; margin-top:1pt;">
                            ${dateRange ? `<span>📅 ${dateRange}</span>` : ''}${luogoStr ? `<span>${luogoStr}</span>` : ''}
                        </div>
                        ${d.note ? `<div style="font-size:9pt; font-style:italic; color:#555; margin-top:1pt;">${d.note}</div>` : ''}
                    </div>
                    `;
                }).join('')}
            </div>
          </div>`
        : '';

    // Sezione: Posti d'Azione
    const postiAzioneHtml = isSectionActive('posti_azione') && (verbale.postiAzione || []).length > 0
        ? `<div style="margin-top:14pt; margin-bottom:12pt;">
            <div style="font-size:10pt; font-weight:bold; text-transform:uppercase; color:#45387E; border-bottom:1px solid #EEEEEE; padding-bottom:2pt; margin-bottom:6pt; letter-spacing:0.5pt;">
                POSTI D'AZIONE
            </div>
            <ul style="margin-top:4pt; margin-bottom:4pt; padding-left:16pt;">
                ${(verbale.postiAzione || []).map(pa => `
                    <li style="margin-bottom:5pt; font-size:10pt;">
                        <strong>🎯 ${pa.cosa}</strong>
                        <span style="color:#666;"> — Resp: ${(pa.chiIds || []).map(membroNome).join(', ') || '—'}${pa.quando ? ` (${formatSafeDate(pa.quando)})` : ''}</span>
                    </li>
                `).join('')}
            </ul>
          </div>`
        : '';

    // Sezione: Movimenti di cassa di gruppo
    const cassaHtml = isSectionActive('cassa') && (verbale.cassa || []).length > 0
        ? `<div style="margin-top:14pt; margin-bottom:12pt;">
            <div style="font-size:10pt; font-weight:bold; text-transform:uppercase; color:#45387E; border-bottom:1px solid #EEEEEE; padding-bottom:2pt; margin-bottom:6pt; letter-spacing:0.5pt;">
                MOVIMENTI DI CASSA DI GRUPPO
            </div>
            <table style="width:100%; border-collapse:collapse; margin-top:4pt; font-size:9pt;">
                <thead>
                    <tr style="background-color:#F3F4F6;">
                        <th style="padding:4pt 6pt; text-align:left; border:1px solid #D1D5DB; font-weight:bold;">Branca</th>
                        <th style="padding:4pt 6pt; text-align:left; border:1px solid #D1D5DB; font-weight:bold;">Tipo</th>
                        <th style="padding:4pt 6pt; text-align:left; border:1px solid #D1D5DB; font-weight:bold;">Causale</th>
                        <th style="padding:4pt 6pt; text-align:right; border:1px solid #D1D5DB; font-weight:bold;">Importo</th>
                    </tr>
                </thead>
                <tbody>
                    ${(verbale.cassa || []).map(m => `
                        <tr>
                            <td style="padding:3pt 6pt; border:1px solid #E5E7EB;">${m.branca || '-'}</td>
                            <td style="padding:3pt 6pt; border:1px solid #E5E7EB;">${m.tipo || 'Versamento'}</td>
                            <td style="padding:3pt 6pt; border:1px solid #E5E7EB; font-style:italic;">${m.note || '-'}</td>
                            <td style="padding:3pt 6pt; border:1px solid #E5E7EB; text-align:right; font-weight:bold;">€ ${(m.importo || 0).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
          </div>`
        : '';

    // Sezione: Prossimi impegni
    const prossimiImpegniHtml = isSectionActive('prossimi_impegni') && (verbale.prossimiImpegni || []).length > 0
        ? `<div style="margin-top:14pt; margin-bottom:12pt;">
            <div style="font-size:10pt; font-weight:bold; text-transform:uppercase; color:#45387E; border-bottom:1px solid #EEEEEE; padding-bottom:2pt; margin-bottom:6pt; letter-spacing:0.5pt;">
                PROSSIMI IMPEGNI
            </div>
            <ul style="margin-top:4pt; margin-bottom:4pt; padding-left:16pt;">
                ${(verbale.prossimiImpegni || []).map(imp => {
                    const dataStr = formatSafeDate(imp.dataInizio);
                    const oraStr = imp.note ? ` ore ${imp.note}` : '';
                    const brancaStr = (imp.branca && imp.branca !== 'CoCa') ? ` [${imp.branca}]` : '';
                    return `
                    <li style="margin-bottom:4pt; font-size:10pt;">
                        <strong>• ${imp.evento}</strong>${brancaStr ? `<span style="color:#45387E;">${brancaStr}</span>` : ''}
                        <span style="color:#666;"> — ${dataStr}${oraStr}</span>
                    </li>
                    `;
                }).join('')}
            </ul>
          </div>`
        : '';

    // Sezione: Varie ed eventuali
    const varieHtml = isSectionActive('varie') && verbale.varie && verbale.varie.trim().length > 0
        ? `<div style="margin-top:14pt; margin-bottom:12pt;">
            <div style="font-size:10pt; font-weight:bold; text-transform:uppercase; color:#45387E; border-bottom:1px solid #EEEEEE; padding-bottom:2pt; margin-bottom:6pt; letter-spacing:0.5pt;">
                VARIE ED EVENTUALI
            </div>
            <div style="font-size:10pt; line-height:1.45; font-style:italic; color:#333; margin-left:8pt; text-align:justify;">
                ${verbale.varie}
            </div>
          </div>`
        : '';

    // Mappa sezioni e ordinamento dinamico
    const sectionHtmlMap: Record<string, string> = {
        ritorni: ritornoHtml,
        date_importanti: dateImportantiHtml,
        posti_azione: postiAzioneHtml,
        cassa: cassaHtml,
        prossimi_impegni: prossimiImpegniHtml,
        varie: varieHtml,
    };

    const activeSectionOrder = verbale.sezioniAttive || ['ritorni', 'date_importanti', 'posti_azione', 'cassa', 'prossimi_impegni', 'varie'];
    const sectionsBodyHtml = activeSectionOrder.map(s => sectionHtmlMap[s] || '').filter(Boolean).join('');

    // Costruiamo il contenuto principale come HTML e poi lo convertiamo con htmlToPdfmake
    const contentHtml = `
        <div>
            <div style="margin-bottom:10pt;">
                <table style="width:100%; border:none; margin-bottom:4pt;">
                    <tr>
                        <td style="border:none; padding:0; font-size:10pt;"><strong>${formatSafeDate(verbale.data)}</strong></td>
                        <td style="border:none; padding:0; text-align:right; font-size:10pt; color:#666;">A.A. ${scoutYearText}</td>
                    </tr>
                </table>
                <div style="font-size:11pt; margin-bottom:3pt;">
                    <strong>Oggetto:</strong> <span style="text-transform:capitalize;">${verbale.titolo || 'Verbale di Riunione'}</span>
                </div>
                <div style="color:#666; font-size:9.5pt; margin-bottom:6pt;">
                    Verbale N° ${verbale.numero || '-'}
                    ${verbale.luogo ? ` • ${verbale.luogo}` : ''}
                    ${(verbale.oraInizio || verbale.oraFine) ? ` • ore ${verbale.oraInizio || '?'} – ${verbale.oraFine || '?'}` : ''}
                </div>
                <div style="font-size:10pt; line-height:1.4;">
                    <div><strong>Presenti:</strong> <em>${presentiConOspiti}</em></div>
                    <div><strong>Assenti:</strong> <em>${assenti}</em></div>
                    ${ritardi ? `<div><strong>Ritardi:</strong> <em>${ritardi}</em></div>` : ''}
                </div>
            </div>

            ${odgSummaryHtml}
            ${odgDetailsHtml}
            ${sectionsBodyHtml}
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
