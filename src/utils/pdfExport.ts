import html2pdf from 'html2pdf.js';
import { Verbale, MembroCoCa } from '@/types';

/**
 * Generates and downloads a PDF of the verbale using html2pdf.js.
 * Renders the verbale HTML into an off-screen container and captures it.
 */
export async function exportVerbaleToPdf(
    verbale: Partial<Verbale>,
    membri: MembroCoCa[],
    intestazioneHtml: string = '',
    piePaginaHtml: string = ''
): Promise<void> {
    const container = document.createElement('div');
    container.style.cssText = [
        'position:fixed',
        'top:0', 'left:0',
        'width:210mm',
        'background:white',
        'color:#111',
        'font-family:Georgia,serif',
        'font-size:12pt',
        'padding:20mm 25mm',
        'z-index:-9999',
        'pointer-events:none',
    ].join(';');

    const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('it-IT') : '-';
    const membroNome = (id: string) => membri.find(m => m.id === id)?.nome || id;

    const presenti = (verbale.presenti || []).map(membroNome).join(', ') || '-';
    const assenti = (verbale.assenti || []).map(membroNome).join(', ') || '-';
    const ritardi = (verbale.ritardi || []).map(membroNome).join(', ') || '';

    const odgHtml = (verbale.odg || []).map((p, i) => `
        <div style="margin-bottom:8pt">
            <b>${i + 1}. ${p.titolo}</b>
            ${p.contenuto ? `<div style="margin-top:4pt;color:#444">${p.contenuto}</div>` : ''}
        </div>
    `).join('');

    const postiAzioneHtml = (verbale.sezioniAttive || []).includes('posti_azione') && (verbale.postiAzione || []).length > 0
        ? `<div style="margin-top:16pt">
            <b style="text-transform:uppercase;letter-spacing:1px;font-size:9pt;color:#e97a00">🎯 Posti d'Azione</b>
            <ul style="margin-top:6pt;padding-left:20pt">
                ${(verbale.postiAzione || []).map(pa => `
                    <li style="margin-bottom:6pt">
                        <b>${pa.cosa}</b>
                        <span style="color:#666"> — Resp: ${(pa.chiIds || []).map(membroNome).join(', ') || '—'}${pa.quando ? ` (${formatDate(pa.quando)})` : ''}</span>
                    </li>
                `).join('')}
            </ul>
          </div>`
        : '';

    const ritornoHtml = (verbale.sezioniAttive || []).includes('ritorni') && (verbale.ritorni || []).length > 0
        ? `<div style="margin-top:16pt">
            <b style="text-transform:uppercase;letter-spacing:1px;font-size:9pt;color:#4CAF50">🗣️ Ritorni</b>
            <ul style="margin-top:6pt;padding-left:20pt">
                ${(verbale.ritorni || []).map(r => `<li style="margin-bottom:4pt">${r.branca ? `<b>[${r.branca}]</b> ` : ''}${r.contenuto}</li>`).join('')}
            </ul>
          </div>`
        : '';

    const varieHtml = (verbale.sezioniAttive || []).includes('varie') && verbale.varie
        ? `<div style="margin-top:16pt">
            <b style="text-transform:uppercase;letter-spacing:1px;font-size:9pt;color:#666">💬 Varie ed Eventuali</b>
            <p style="margin-top:6pt;font-style:italic;color:#444">${verbale.varie}</p>
          </div>`
        : '';

    container.innerHTML = `
        ${intestazioneHtml ? `<div style="margin-bottom:16pt;padding-bottom:12pt;border-bottom:2px solid #eee">${intestazioneHtml}</div>` : ''}

        <div style="border-bottom:2px solid #333;padding-bottom:8pt;margin-bottom:16pt">
            <h1 style="margin:0;font-size:18pt;color:#222">${verbale.titolo || 'Verbale di Riunione'}</h1>
            <div style="color:#666;font-size:10pt;margin-top:4pt">
                N° ${verbale.numero || '-'} &nbsp;|&nbsp;
                ${formatDate(verbale.data)} &nbsp;|&nbsp;
                ${verbale.luogo || '-'} &nbsp;|&nbsp;
                ${verbale.oraInizio || '-'} – ${verbale.oraFine || '-'}
            </div>
        </div>

        <div style="margin-bottom:12pt">
            <b>✓ Presenti:</b> ${presenti}<br>
            ${assenti !== '-' ? `<b>✗ Assenti:</b> ${assenti}<br>` : ''}
            ${ritardi ? `<b>⏱ Ritardi:</b> ${ritardi}` : ''}
        </div>

        <div style="margin-bottom:16pt">
            <b style="text-transform:uppercase;letter-spacing:1px;font-size:9pt;color:#4CAF50">📋 Ordine del Giorno</b>
            <div style="margin-top:8pt">${odgHtml}</div>
        </div>

        ${ritornoHtml}
        ${postiAzioneHtml}
        ${varieHtml}

        ${piePaginaHtml ? `<div style="margin-top:32pt;padding-top:12pt;border-top:1px solid #eee">${piePaginaHtml}</div>` : ''}
    `;

    document.body.appendChild(container);

    const filename = `Verbale_${(verbale.numero || '').toString().padStart(3, '0')}_${verbale.data || 'data'}.pdf`;

    await html2pdf()
        .set({
            margin: 0,
            filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(container)
        .save();

    document.body.removeChild(container);
}
