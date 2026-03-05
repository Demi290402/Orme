import { 
    Document, Packer, Paragraph, TextRun, AlignmentType, 
    Table, TableRow, TableCell, WidthType, BorderStyle,
    ImageRun, Header, HeightRule
} from 'docx';
import { saveAs } from 'file-saver';
import { Verbale, MembroCoCa, User } from '@/types';

/**
 * Fetches an image from a URL and returns it as an ArrayBuffer
 */
async function fetchImageAsBuffer(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Image fetch failed");
    return await response.arrayBuffer();
}

export const exportVerbaleToDocx = async (verbale: Verbale, membri: MembroCoCa[], currentUser: User) => {
    let logoBuffer: ArrayBuffer | null = null;
    try {
        // Use the same logo as the web preview
        logoBuffer = await fetchImageAsBuffer(window.location.origin + '/Turi 1 no bg.png');
    } catch (e) {
        console.error("Could not load logo for DOCX", e);
    }

    const presentMembri = membri.filter(m => verbale.presenti?.includes(m.id)).sort((a,b) => a.nome.localeCompare(b.nome));
    const absentMembri = membri.filter(m => verbale.assenti?.includes(m.id)).sort((a,b) => a.nome.localeCompare(b.nome));
    
    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: 400,
                        right: 720,
                        bottom: 720,
                        left: 720,
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
                                bottom: { style: BorderStyle.NONE },
                                left: { style: BorderStyle.NONE },
                                right: { style: BorderStyle.NONE },
                                insideHorizontal: { style: BorderStyle.NONE },
                                insideVertical: { style: BorderStyle.NONE },
                            },
                            rows: [
                                new TableRow({
                                    height: { value: 100, rule: HeightRule.EXACT },
                                    children: [
                                        new TableCell({
                                            width: { size: 60, type: WidthType.PERCENTAGE },
                                            shading: { fill: "45387E" },
                                            children: [],
                                        }),
                                        new TableCell({
                                            width: { size: 40, type: WidthType.PERCENTAGE },
                                            shading: { fill: "F4B400" },
                                            children: [],
                                        }),
                                    ],
                                }),
                            ],
                        }),
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: {
                                top: { style: BorderStyle.NONE },
                                bottom: { style: BorderStyle.SINGLE, size: 6, color: "45387E", space: 4 },
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
                                                        alignment: AlignmentType.CENTER,
                                                        children: [
                                                            new ImageRun({
                                                                data: logoBuffer,
                                                                transformation: { width: 60, height: 60 },
                                                            } as any),
                                                            new TextRun({ 
                                                                text: "\rTURI 1", 
                                                                bold: true, 
                                                                color: "45387E", 
                                                                size: 20,
                                                                font: "Georgia"
                                                            }),
                                                        ],
                                                    })
                                                ] : [
                                                    new Paragraph({ 
                                                        children: [new TextRun({ text: "AGESCI TURI 1", bold: true, color: "45387E", font: "Georgia" })],
                                                        alignment: AlignmentType.CENTER 
                                                    })
                                                ])
                                            ],
                                        }),
                                        new TableCell({
                                            width: { size: 70, type: WidthType.PERCENTAGE },
                                            children: [
                                                new Paragraph({
                                                    alignment: AlignmentType.RIGHT,
                                                    children: [new TextRun({ text: `Gruppo ${currentUser.groupName || 'Turi 1'}`, bold: true, size: 28, font: "Georgia", color: "45387E" })],
                                                }),
                                                new Paragraph({
                                                    alignment: AlignmentType.RIGHT,
                                                    children: [new TextRun({ text: "Associazione Guide e Scouts Cattolici Italiani", bold: true, size: 22, font: "Georgia", color: "45387E" })],
                                                }),
                                                new Paragraph({
                                                    alignment: AlignmentType.RIGHT,
                                                    children: [new TextRun({ text: "Strada Mola 4 – 70010 Turi BA", size: 18, font: "Georgia", color: "45387E" })],
                                                }),
                                                new Paragraph({
                                                    alignment: AlignmentType.RIGHT,
                                                    children: [new TextRun({ text: "turi1@puglia.agesci.it", size: 18, font: "Georgia", color: "45387E", underline: { type: BorderStyle.SINGLE } })],
                                                }),
                                                new Paragraph({
                                                    alignment: AlignmentType.RIGHT,
                                                    children: [new TextRun({ text: "Codice fiscale: 91120250724", size: 18, font: "Georgia", color: "45387E" })],
                                                }),
                                                new Paragraph({
                                                    alignment: AlignmentType.RIGHT,
                                                    children: [new TextRun({ text: "N. Iscr. R.U.N.T.S.: 64984", size: 18, font: "Georgia", color: "45387E" })],
                                                }),
                                            ],
                                        }),
                                    ],
                                }),
                            ],
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "WOSM / WAGGGS Member - Iscritta al Registro Nazionale APS n.72", size: 14, color: "999999", italics: true, font: "Georgia" }),
                            ],
                            spacing: { before: 100 },
                        }),
                    ],
                }),
            },
            children: [
                new Paragraph({ text: "", spacing: { before: 400 } }),
                
                // LINEAR METADATA (MATCHING SCREEN 2)
                new Paragraph({
                    children: [new TextRun({ text: verbale.data || '', bold: true, font: "Georgia", size: 24 })],
                    spacing: { after: 100 },
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Oggetto: ", bold: true, font: "Georgia", size: 24 }),
                        new TextRun({ text: verbale.titolo, font: "Georgia", size: 24 }),
                    ],
                    spacing: { after: 100 },
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Presenti: ", bold: true, font: "Georgia", size: 24 }),
                        new TextRun({ 
                            text: presentMembri.map(m => {
                                const isLate = verbale.ritardi?.includes(m.id);
                                const exit = verbale.usciteAnticipate?.find(u => u.membroId === m.id);
                                let suffix = "";
                                if (isLate && exit) suffix = ` (R e esc. ore ${exit.ora})`;
                                else if (isLate) suffix = " (R)";
                                else if (exit) suffix = ` (esc. ore ${exit.ora})`;
                                return m.nome + suffix;
                            }).join(', '), 
                            font: "Georgia", 
                            size: 24,
                            italics: true 
                        }),
                        ...(verbale.ospiti && verbale.ospiti.length > 0 ? [
                            new TextRun({ text: ", " + verbale.ospiti.map(o => `${o.nome} (${o.ruolo})`).join(', '), font: "Georgia", size: 24, italics: true })
                        ] : []),
                    ],
                    spacing: { after: 100 },
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Assenti: ", bold: true, font: "Georgia", size: 24 }),
                        new TextRun({ text: absentMembri.map(m => m.nome).join(', ') || 'Nessuno', font: "Georgia", size: 24, italics: true }),
                    ],
                    spacing: { after: 100 },
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "ODG:", bold: true, font: "Georgia", size: 24 }),
                    ],
                    spacing: { after: 100, before: 200 },
                }),
                ...verbale.odg.map(p => new Paragraph({
                    children: [new TextRun({ text: `• ${p.titolo}`, bold: true, font: "Georgia", size: 24 })],
                    indent: { left: 720 },
                    spacing: { after: 50 },
                })),

                new Paragraph({ text: "", spacing: { before: 600 } }),

                // ODG CONTENT
                ...verbale.odg.map((punto) => [
                    new Paragraph({
                        children: [
                            new TextRun({ text: `• ${punto.titolo}`, bold: true, size: 24, font: "Georgia" })
                        ],
                        spacing: { before: 400 },
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: punto.contenuto, size: 22, font: "Georgia" })],
                        spacing: { before: 150 },
                        alignment: AlignmentType.BOTH,
                        indent: { left: 720 },
                    }),
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
                        new Paragraph({
                            children: [new TextRun({ text: r.contenuto, italics: true, font: "Georgia", size: 22 })],
                            spacing: { before: 100 },
                            indent: { left: 800 },
                            alignment: AlignmentType.BOTH,
                        }),
                    ]).flat(),
                ] : []),

                ...(verbale.cassa && verbale.cassa.length > 0 ? [
                    new Paragraph({
                        children: [new TextRun({ text: "MOVIMENTI DI CASSA DI GRUPPO", bold: true, size: 20, color: "45387E", font: "Georgia" })],
                        spacing: { before: 800 },
                        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" } },
                    }),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                            new TableRow({
                                children: [
                                    new TableCell({ shading: { fill: "FFFFFF" }, children: [new Paragraph({ children: [new TextRun({ text: "Branca", bold: true })] })] }),
                                    new TableCell({ shading: { fill: "FFFFFF" }, children: [new Paragraph({ children: [new TextRun({ text: "Tipo", bold: true })] })] }),
                                    new TableCell({ shading: { fill: "FFFFFF" }, children: [new Paragraph({ children: [new TextRun({ text: "Causale", bold: true })] })] }),
                                    new TableCell({ shading: { fill: "FFFFFF" }, children: [new Paragraph({ children: [new TextRun({ text: "Importo", bold: true })], alignment: AlignmentType.RIGHT })] }),
                                ],
                            }),
                            ...verbale.cassa.map(m => new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: m.branca, font: "Georgia" })] })] }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: m.tipo || 'Versamento', font: "Georgia" })] })] }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: m.note, italics: true, font: "Georgia" })] })] }),
                                    new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `€ ${m.importo.toFixed(2)}`, bold: true, font: "Georgia" })] })] }),
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
                            new TextRun({ text: `• ${pa.cosa}`, bold: true, font: "Georgia", size: 22 }),
                            new TextRun({ text: ` — Resp: ${pa.chi} (${pa.quando})`, font: "Georgia", color: "666666", size: 20 }),
                        ],
                        indent: { left: 720 },
                        spacing: { before: 200 },
                    })),
                ] : []),

                // Footer
                new Paragraph({
                    children: [
                        new TextRun({ 
                            text: `Verbale ufficiale redatto il ${new Date().toLocaleDateString('it-IT')} via ORME`, 
                            size: 14, 
                            italics: true, 
                            color: "999999",
                            font: "Georgia"
                        })
                    ],
                    spacing: { before: 1200 },
                    border: { top: { style: BorderStyle.SINGLE, color: "45387E" } },
                }),
            ],
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Verbale_${verbale.data}_N${verbale.numero}.docx`);
};
