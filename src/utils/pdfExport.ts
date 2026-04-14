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
    const membroNome = (id: string) => membri.find(m => m.id === id)?.nome || id;

    const presenti = (verbale.presenti || []).map(membroNome).join(', ') || '-';
    const assenti = (verbale.assenti || []).map(membroNome).join(', ') || '-';
    const ritardi = (verbale.ritardi || []).map(membroNome).join(', ') || '';

    const odgHtml = (verbale.odg || []).map((p, i) => `
        <div style="margin-bottom:8pt">
            <strong>${i + 1}. ${p.titolo}</strong>
            ${p.contenuto ? `<div style="margin-top:4pt;color:#444">${p.contenuto}</div>` : ''}
        </div>
    `).join('');

    const postiAzioneHtml = (verbale.sezioniAttive || []).includes('posti_azione') && (verbale.postiAzione || []).length > 0
        ? `<div style="margin-top:16pt">
            <strong>🎯 Posti d'Azione</strong>
            <ul style="margin-top:6pt;">
                ${(verbale.postiAzione || []).map(pa => `
                    <li style="margin-bottom:6pt">
                        <strong>${pa.cosa}</strong>
                        <span style="color:#666"> — Resp: ${(pa.chiIds || []).map(membroNome).join(', ') || '—'}${pa.quando ? ` (${formatDate(pa.quando)})` : ''}</span>
                    </li>
                `).join('')}
            </ul>
          </div>`
        : '';

    const ritornoHtml = (verbale.sezioniAttive || []).includes('ritorni') && (verbale.ritorni || []).length > 0
        ? `<div style="margin-top:16pt">
            <strong>🗣️ Ritorni</strong>
            <ul style="margin-top:6pt;">
                ${(verbale.ritorni || []).map(r => `<li style="margin-bottom:4pt">${r.branca ? `<strong>[${r.branca}]</strong> ` : ''}${r.contenuto}</li>`).join('')}
            </ul>
          </div>`
        : '';

    const varieHtml = (verbale.sezioniAttive || []).includes('varie') && verbale.varie
        ? `<div style="margin-top:16pt">
            <strong>💬 Varie ed Eventuali</strong>
            <p style="margin-top:6pt;font-style:italic;color:#444">${verbale.varie}</p>
          </div>`
        : '';

    // Costruiamo il contenuto principale come HTML e poi lo convertiamo con htmlToPdfmake
    const contentHtml = `
        <div>
            <div style="margin-bottom:16pt; font-size: 18pt;">
                <strong>${verbale.titolo || 'Verbale di Riunione'}</strong>
                <div style="color:#666;font-size:10pt;margin-top:4pt">
                    N° ${verbale.numero || '-'} |
                    ${formatDate(verbale.data)} |
                    ${verbale.luogo || '-'} |
                    ${verbale.oraInizio || '-'} – ${verbale.oraFine || '-'}
                </div>
            </div>

            <div style="margin-bottom:12pt">
                <strong>✓ Presenti:</strong> ${presenti}<br>
                ${assenti !== '-' ? `<strong>✗ Assenti:</strong> ${assenti}<br>` : ''}
                ${ritardi ? `<strong>⏱ Ritardi:</strong> ${ritardi}` : ''}
            </div>

            <div style="margin-bottom:16pt">
                <strong>📋 Ordine del Giorno</strong>
                <div style="margin-top:8pt">${odgHtml}</div>
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

    try {
        console.log("PDF Export Engine: parsing HTML with html-to-pdfmake...");
        
        const parsedContent = htmlToPdfmake(contentHtml, { window: window as any });

        const docDefinition = {
            content: parsedContent,
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

        const filename = `Verbale_${(verbale.numero || '').toString().padStart(3, '0')}_${verbale.data || 'data'}.pdf`;

        console.log("PDF Export Engine: Generating vectorial PDF with pdfMake...");
        // Usa pdfMake per generare e scaricare nativamente il PDF (senza dipendere dal canvas)
        pdfMake.createPdf(docDefinition).download(filename);
        
        console.log("PDF Export Engine: Vectorial PDF generated successfully!");
    } catch (error) {
        console.error("PDF Export Error Detailed:", error);
        throw error;
    }
}
