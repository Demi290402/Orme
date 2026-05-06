import { useState, useEffect, useMemo } from 'react';
import { getEventi, EventoCalendario } from '@/lib/calendario';
import { Archive, ChevronDown, ChevronUp, MapPin, Search } from 'lucide-react';

function getAnnoScout(dateStr: string) {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 1-12
    return month >= 10 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

function getContrastColor(hex: string) {
    if (!hex || hex.length < 6) return 'white';
    const color = hex.replace('#', '');
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 180 ? '#1f2937' : 'white';
}

export default function StoricoAttivita() {
    const [eventi, setEventi] = useState<EventoCalendario[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedAnni, setExpandedAnni] = useState<Record<string, boolean>>({});

    useEffect(() => {
        getEventi().then(data => {
            // Keep only past events
            const today = new Date().toISOString().split('T')[0];
            const pastEventi = data.filter(e => e.dataInizio < today);
            setEventi(pastEventi);
            
            // Expand latest 2 years by default
            const anniUnici = [...new Set(pastEventi.map(e => getAnnoScout(e.dataInizio)))].sort((a,b) => b.localeCompare(a));
            const initExpand: Record<string, boolean> = {};
            anniUnici.slice(0, 2).forEach(a => initExpand[a] = true);
            setExpandedAnni(initExpand);
            
            setLoading(false);
        }).catch(console.error);
    }, []);

    const toggleAnno = (anno: string) => {
        setExpandedAnni(prev => ({ ...prev, [anno]: !prev[anno] }));
    };

    const eventiFiltrati = useMemo(() => {
        if (!searchTerm.trim()) return eventi;
        const low = searchTerm.toLowerCase();
        return eventi.filter(e => 
            e.titolo.toLowerCase().includes(low) || 
            (e.luogo && e.luogo.toLowerCase().includes(low)) ||
            (e.note && e.note.toLowerCase().includes(low)) ||
            (e.branca && e.branca.toLowerCase().includes(low))
        );
    }, [eventi, searchTerm]);

    const raggruppati = useMemo(() => {
        const groups: Record<string, EventoCalendario[]> = {};
        eventiFiltrati.forEach(e => {
            const anno = getAnnoScout(e.dataInizio);
            if (!groups[anno]) groups[anno] = [];
            groups[anno].push(e);
        });
        // Sort events inside groups (newest first)
        for (const k in groups) {
            groups[k].sort((a,b) => b.dataInizio.localeCompare(a.dataInizio));
        }
        return groups;
    }, [eventiFiltrati]);

    const sortedAnni = Object.keys(raggruppati).sort((a, b) => b.localeCompare(a));

    return (
        <div className="pb-24 max-w-3xl mx-auto space-y-6">
            <header className="mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                    <Archive className="text-scout-blue" size={28} />
                    Storico Attività
                </h1>
                <p className="text-sm text-gray-500 mt-1">L'archivio delle attività passate del gruppo, divise per anno scout.</p>
            </header>

            <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Cerca attività passate per titolo, luogo, o branca..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 outline-none focus:ring-2 focus:ring-scout-blue shadow-sm text-sm dark:text-white placeholder:text-gray-400"
                />
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-400">Ricerca negli archivi...</div>
            ) : sortedAnni.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 p-8 text-center rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                    <Archive size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 font-medium tracking-wide">Nessuna attività passata trovata.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedAnni.map(anno => {
                        const isExpanded = expandedAnni[anno];
                        const evCount = raggruppati[anno].length;
                        return (
                            <div key={anno} className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] dark:shadow-none border border-gray-100 dark:border-gray-700">
                                <button
                                    onClick={() => toggleAnno(anno)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="bg-scout-blue/10 dark:bg-blue-900/30 text-scout-blue font-black px-3 py-1.5 rounded-xl uppercase tracking-widest text-sm">
                                            {anno}
                                        </div>
                                        <span className="text-xs font-bold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                            {evCount} {evCount === 1 ? 'Attività' : 'Attività'}
                                        </span>
                                    </div>
                                    <div className="text-gray-400 bg-gray-50 dark:bg-gray-700 p-1.5 rounded-full">
                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                </button>
                                
                                {isExpanded && (
                                    <div className="p-4 pt-0 border-t border-gray-50 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/50">
                                        <div className="space-y-3 mt-4 relative before:absolute before:inset-y-0 before:left-[19px] before:w-px before:bg-gray-200 dark:before:bg-gray-700">
                                            {raggruppati[anno].map(ev => {
                                                const dt = new Date(ev.dataInizio);
                                                return (
                                                    <div key={ev.id} className="relative pl-12">
                                                        {/* Dot Timeline */}
                                                        <div 
                                                            className="absolute left-3.5 top-2 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 shadow-sm z-10"
                                                            style={{ backgroundColor: ev.colore || '#9CA3AF' }}
                                                        />
                                                        
                                                        <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-[10px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded" style={{ backgroundColor: ev.colore, color: getContrastColor(ev.colore) }}>
                                                                        {ev.branca}
                                                                    </span>
                                                                    <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap">
                                                                        {dt.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                                                                    </span>
                                                                </div>
                                                                <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                                                                    {ev.titolo}
                                                                </h3>
                                                                {ev.luogo && (
                                                                    <p className="text-xs text-scout-blue dark:text-blue-400 mt-1 flex items-center gap-1 font-medium">
                                                                        <MapPin size={10} /> {ev.luogo}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
