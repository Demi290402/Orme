const fs = require('fs');
let content = fs.readFileSync('src/pages/Verbali/VerbaleEditor.tsx', 'utf8');

const idxStart = content.indexOf('<div className="bg-white px-8 md:px-20 py-16 w-full max-w-[850px]');
const endStr = '                )}\\n            </div>\\n\\n            {/* SAVE MODAL */}';

const anteprimaTableHtml = `<div className="bg-white px-8 md:px-20 py-16 w-full max-w-[850px] min-h-[1122px] h-fit text-gray-900 shadow-xl border border-gray-100 page-break-container">
                            <table className="w-full">
                                <thead className="table-header-group">
                                    <tr>
                                        <td>
                                            {impostazioni?.intestazioneHtml ? (
                                                <div className="w-full pb-8" dangerouslySetInnerHTML={{ __html: impostazioni.intestazioneHtml }} />
                                            ) : (
                                                <div className="flex justify-between items-center border-b border-gray-100 pb-8 opacity-80 mb-2 no-print">
                                                    <div className="space-y-1 w-1/3">
                                                        <div className="font-black text-scout-blue tracking-widest uppercase text-[10px] m-0 leading-tight">Diario di CoCa</div>
                                                        <div className="text-gray-400 text-[8px] tracking-wider uppercase font-bold bg-gray-50 px-2 py-0.5 rounded-sm inline-block w-fit">Verbali Ufficiali</div>
                                                    </div>
                                                    <div className="flex justify-center w-1/3">
                                                    </div>
                                                    <div className="text-right space-y-1 w-1/3">
                                                        <div className="font-bold text-gray-500 text-[10px] tracking-wider font-serif m-0 leading-tight">Gruppo Scout</div>
                                                        <div className="text-gray-400 text-[9px]">Sempre Pronti</div>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            <div className="space-y-8 mt-10 font-serif">
                                                {/* LINEAR METADATA */}
                                                <div className="space-y-1.5 text-[12px]">
                                                    <div className="font-bold text-center text-lg mb-4 text-scout-blue uppercase tracking-widest bg-blue-50/50 py-2 border-y border-blue-100">
                                                        Verbale N. {verbale.numero}
                                                    </div>
                                                    <div className="font-bold">{new Date(verbale.data || '').toLocaleDateString('it-IT')} - {verbale.luogo}</div>
                                                    <div>
                                                        <span className="font-black">Oggetto: </span>
                                                        <span className="capitalize">{verbale.titolo}</span>
                                                    </div>
                                    <div>
                                        <span className="font-black">Presenti: </span>
                                        <span className="italic">
                                            {membri.filter(m => verbale.presenti?.includes(m.id))
                                                .map(m => {
                                                    const isLate = verbale.ritardi?.includes(m.id);
                                                    const exit = verbale.usciteAnticipate?.find(u => u.membroId === m.id);
                                                    let suffix = "";
                                                    if (isLate && exit) suffix = \` (R e esc. ore \${exit.ora})\`;
                                                    else if (isLate) suffix = " (R)";
                                                    else if (exit) suffix = \` (esc. ore \${exit.ora})\`;
                                                    return m.nome + suffix;
                                                }).join(', ')}
                                            {verbale.ospiti && verbale.ospiti.length > 0 && 
                                                ", " + verbale.ospiti.map(o => \`\${o.nome} (\${o.ruolo})\`).join(', ')}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-black">Assenti: </span>
                                        <span className="italic">{membri.filter(m => verbale.assenti?.includes(m.id)).map(m => m.nome).join(', ') || 'Nessuno'}</span>
                                    </div>
                                    {verbale.odg && verbale.odg.length > 0 && (
                                        <div className="pt-2">
                                            <span className="font-black">ODG:</span>
                                            <ul className="list-disc pl-10 mt-1 space-y-0.5">
                                                {verbale.odg.map((p, i) => <li key={i} className="font-bold">{p.titolo}</li>)}
                                                {(verbale.sezioniAttive || []).map((sez) => {
                                                    let title = "";
                                                    if (sez === 'ritorni' && verbale.ritorni && verbale.ritorni.length > 0) title = "Ritorni dalle branche";
                                                    if (sez === 'posti_azione' && verbale.postiAzione && verbale.postiAzione.length > 0) title = "Posti d'azione";
                                                    if (sez === 'prossimi_impegni' && verbale.prossimiImpegni && verbale.prossimiImpegni.length > 0) title = "Prossimi impegni";
                                                    if (sez === 'cassa' && verbale.cassa && verbale.cassa.length > 0) title = "Aggiornamento cassa";
                                                    if (sez === 'varie' && verbale.varie) title = "Varie ed eventuali";
                                                    if (!title) return null;
                                                    return <li key={sez} className="font-bold">{title}</li>;
                                                })}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                {/* CONTENT SECTIONS (LINEAR) */}
                                <div className="space-y-10 pt-6">
                                    {/* ODG Details */}
                                    {verbale.odg?.map((punto, i) => (
                                        <div key={i} className="space-y-3">
                                            <div className="flex gap-2">
                                                <span className="font-black whitespace-nowrap">• {punto.titolo}</span>
                                            </div>
                                            <div className="text-[12px] leading-relaxed text-justify pl-6 whitespace-pre-wrap">
                                                {punto.contenuto}
                                            </div>
                                        </div>
                                    ))}

                                    <div className="flex flex-col gap-10">
                                    {/* Additional Sections */}
                                    {verbale.sezioniAttive?.includes('ritorni') && verbale.ritorni && verbale.ritorni.length > 0 && (
                                        <div className="space-y-4" style={{ order: verbale.sezioniAttive.indexOf('ritorni') }}>
                                            <div className="font-black border-b border-gray-100 pb-1 uppercase text-[10px] tracking-widest text-[#45387E]">Ritorni</div>
                                            {verbale.ritorni.map((r, i) => (
                                                <div key={i} className="pl-6 space-y-1">
                                                    <div className="font-bold text-[11px]">- {r.branca}</div>
                                                    <div className="text-[12px] leading-relaxed text-justify pl-4 italic opacity-80">{r.contenuto}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {verbale.sezioniAttive?.includes('posti_azione') && verbale.postiAzione && verbale.postiAzione.length > 0 && (
                                        <div className="space-y-4" style={{ order: verbale.sezioniAttive.indexOf('posti_azione') }}>
                                            <div className="font-black border-b border-gray-100 pb-1 uppercase text-[10px] tracking-widest text-orange-600">Posti d'Azione</div>
                                            <ul className="space-y-2 pl-6">
                                                {verbale.postiAzione.map((pa, i) => (
                                                    <li key={i} className="text-[12px]">
                                                        <span className="font-bold">🎯 {pa.cosa}</span>
                                                        <span className="opacity-60"> — Resp: {pa.chi} ({pa.quando})</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {verbale.sezioniAttive?.includes('cassa') && verbale.cassa && verbale.cassa.length > 0 && (
                                        <div className="space-y-4" style={{ order: verbale.sezioniAttive.indexOf('cassa') }}>
                                            <div className="font-black border-b border-gray-100 pb-1 uppercase text-[10px] tracking-widest text-emerald-700">Movimenti di cassa di gruppo</div>
                                            <div className="pl-6 text-[12px]">
                                                {verbale.cassa.map((m, i) => (
                                                    <div key={i} className="flex justify-between border-b border-gray-50 py-1 italic">
                                                        <span>{m.branca}: {m.note}</span>
                                                        <span className="font-bold">€ {m.importo.toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {verbale.sezioniAttive?.includes('prossimi_impegni') && verbale.prossimiImpegni && verbale.prossimiImpegni.length > 0 && (
                                        <div className="space-y-4" style={{ order: verbale.sezioniAttive.indexOf('prossimi_impegni') }}>
                                            <div className="font-black border-b border-gray-100 pb-1 uppercase text-[10px] tracking-widest text-scout-purple">Prossimi impegni</div>
                                            <div className="pl-6 space-y-2">
                                                {verbale.prossimiImpegni.map((imp, i) => (
                                                    <div key={i} className="text-[12px] flex justify-between border-b border-gray-50 py-1">
                                                        <span><span className="font-bold">{imp.evento}</span></span>
                                                        <span className="opacity-60 italic">
                                                            {imp.dataInizio && new Date(imp.dataInizio).toLocaleDateString('it-IT')} 
                                                            {imp.note && \` ore \${imp.note}\`}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {verbale.sezioniAttive?.includes('varie') && verbale.varie && (
                                        <div className="space-y-2" style={{ order: verbale.sezioniAttive.indexOf('varie') }}>
                                            <div className="font-black border-b border-gray-100 pb-1 uppercase text-[10px] tracking-widest text-gray-400">Varie ed Eventuali</div>
                                            <div className="pl-6 text-[12px] italic leading-relaxed">{verbale.varie}</div>
                                        </div>
                                    )}
                                    </div>
                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                                
                                {/* OFFICIAL FOOTER */}
                                <tfoot className="table-footer-group">
                                    <tr>
                                        <td>
                                            <div className="mt-20 pt-8 border-t border-gray-100 flex flex-col items-center justify-center opacity-80 pb-6 w-full text-center">
                                                {impostazioni?.piePaginaHtml ? (
                                                    <div className="w-full" dangerouslySetInnerHTML={{ __html: impostazioni.piePaginaHtml }} />
                                                ) : (
                                                    <div className="flex flex-col items-center">
                                                        <div className="flex gap-4 items-center grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer">
                                                            <img src="/logos/agesci_logo.png" className="h-4 object-contain" alt="AGESCI" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                                        </div>
                                                        <div className="text-[9px] mt-4 font-black uppercase tracking-widest text-[#45387E] text-center max-w-sm">
                                                            Associazione Guide e Scouts Cattolici Italiani
                                                        </div>
                                                        <div className="text-[8px] mt-1 text-gray-400 text-center max-w-md">
                                                            "Lasciate il mondo un po' migliore di come lo avete trovato"
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-gray-300 mt-6 border border-gray-100 px-3 py-1 md:px-4 md:py-2 rounded-full flex items-center gap-1.5 md:gap-2 no-print">
                                                    Generato da Orme <span className="opacity-50">|</span> <span className="text-gray-400">{currentUser?.nickname}</span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>

                            {!viewMode && (
                                <div className="bg-gray-50/50 p-6 rounded-3xl flex justify-between items-center no-print mt-10">
                                    <div className="text-[10px] text-gray-400 italic">
                                        Verbale ufficiale di Comunità Capi <br />
                                        Certificato il {new Date().toLocaleDateString('it-IT')}
                                    </div>
                                    <button 
                                        onClick={async () => {
                                            const saved = await handleSave(true);
                                            if (saved && typeof window !== 'undefined') {
                                                try {
                                                    const { exportVerbaleToDocx } = await import('../../utils/docxExport');
                                                    exportVerbaleToDocx(saved, membri, currentUser);
                                                } catch (e) { console.error('Docx export failed', e); }
                                            }
                                        }}
                                        className="bg-[#45387E] text-white px-8 py-3 rounded-full text-xs font-black hover:bg-[#352b61] transition-all flex items-center gap-3 shadow-lg hover:-translate-y-0.5 active:scale-95 group"
                                    >
                                        <Download size={16} />
                                        Esporta (.docx)
                                    </button>
                                </div>
                            )}
                        </div>`;

let matchIndex = -1;
let currentIdx = 0;
while (true) {
    const idx = content.indexOf(')}', currentIdx);
    if (idx === -1) break;
    // Check if the next substring contains "SAVE MODAL" within an expected range.
    if (content.substring(idx, idx + 100).includes('{/* SAVE MODAL */}')) {
        matchIndex = idx;
        break;
    }
    currentIdx = idx + 2;
}

if (idxStart !== -1 && matchIndex !== -1) {
    content = content.substring(0, idxStart) + anteprimaTableHtml + "\\n                    </div>\\n                " + content.substring(matchIndex);
} else {
    console.error("Not found", idxStart, matchIndex);
}

fs.writeFileSync('src/pages/Verbali/VerbaleEditor.tsx', content, 'utf8');
