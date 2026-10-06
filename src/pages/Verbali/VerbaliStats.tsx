import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ChevronLeft, FileText, 
    TrendingUp, FileSpreadsheet,
    Clock, Award, AlertCircle, Search, Calendar
} from 'lucide-react';
import { getMembriCoCa, getVerbali, calculateScoutYear, formatScoutYear } from '@/lib/verbali';
import { cn } from '@/lib/utils';
import { MembroCoCa, Verbale } from '@/types';

interface MemberStats {
    id: string;
    nome: string;
    branca?: string;
    attivo: boolean;
    totalVerbali: number;
    presences: number;
    absences: number;
    delays: number;
    attendanceRate: number;
}

export default function VerbaliStats() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [allVerbali, setAllVerbali] = useState<Verbale[]>([]);
    const [allMembri, setAllMembri] = useState<MembroCoCa[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [selectedAnnoScout, setSelectedAnnoScout] = useState<number | 'all'>(() => calculateScoutYear());

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [verbali, membri] = await Promise.all([
                    getVerbali(),
                    getMembriCoCa(true) // Carica tutti i membri (attivi e storici)
                ]);

                setAllVerbali(verbali);
                setAllMembri(membri);

                // Trova tutti gli anni scout unici presenti nei verbali
                const yearsSet = new Set<number>();
                for (const v of verbali) {
                    if (v.annoScout) {
                        yearsSet.add(v.annoScout);
                    } else if (v.data) {
                        yearsSet.add(calculateScoutYear(v.data));
                    }
                }
                const currentScoutYear = calculateScoutYear();
                yearsSet.add(currentScoutYear);

                const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
                setAvailableYears(sortedYears);

                // Seleziona di default l'anno scout corrente
                setSelectedAnnoScout(currentScoutYear);
            } catch (error) {
                console.error("Error calculating stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Filtra verbali rilevanti in base all'anno associativo scout scelto
    const relevantVerbali = useMemo(() => {
        if (selectedAnnoScout === 'all') return allVerbali;
        return allVerbali.filter(v => {
            const y = v.annoScout ?? calculateScoutYear(v.data);
            return y === selectedAnnoScout;
        });
    }, [allVerbali, selectedAnnoScout]);

    // Calcola le statistiche membro per membro per l'anno selezionato
    const calculatedStats = useMemo(() => {
        const memberNameMap = new Map<string, { nome: string; branca: string; attivo: boolean }>();
        
        for (const m of allMembri) {
            memberNameMap.set(m.id, {
                nome: m.nome,
                branca: m.branca,
                attivo: m.attivo !== false
            });
        }

        // Recupera anche eventuali nomi memorizzati nello snapshot dei verbali se non censiti
        for (const v of relevantVerbali) {
            if (v.presentiNomi) {
                for (const [id, nome] of Object.entries(v.presentiNomi)) {
                    if (!memberNameMap.has(id)) {
                        memberNameMap.set(id, { nome, branca: 'CoCa', attivo: false });
                    }
                }
            }
        }

        const statsList: MemberStats[] = [];

        for (const [id, info] of memberNameMap.entries()) {
            const presences = relevantVerbali.filter(v => v.presenti?.includes(id)).length;
            const absences = relevantVerbali.filter(v => v.assenti?.includes(id)).length;
            const delays = relevantVerbali.filter(v => v.ritardi?.includes(id)).length;
            const totalRelevantVerbali = presences + absences;

            // Se il membro è storico e non ha registrato alcuna presenza o assenza nell'anno selezionato,
            // non lo mostriamo per non affollare la lista dell'anno corrente (mostrato solo se 'all' o se ha presenze nell'anno)
            if (!info.attivo && totalRelevantVerbali === 0 && delays === 0 && selectedAnnoScout !== 'all') {
                continue;
            }

            const attendanceRate = totalRelevantVerbali > 0 
                ? Math.round((presences / totalRelevantVerbali) * 100) 
                : 0;

            statsList.push({
                id,
                nome: info.nome,
                branca: info.branca,
                attivo: info.attivo,
                totalVerbali: totalRelevantVerbali,
                presences,
                absences,
                delays,
                attendanceRate
            });
        }

        statsList.sort((a, b) => {
            if (b.attendanceRate !== a.attendanceRate) return b.attendanceRate - a.attendanceRate;
            return b.presences - a.presences;
        });

        return statsList;
    }, [allMembri, relevantVerbali, selectedAnnoScout]);

    const handleExportExcel = () => {
        const headers = ["Membro", "Branca", "Stato", "Verbali Considerati", "Presenze", "Assenze", "Ritardi", "Tasso Frequenza %"];
        const rows = calculatedStats.map(s => [
            s.nome,
            s.branca || 'CoCa',
            s.attivo ? 'Attivo' : 'Storico',
            s.totalVerbali,
            s.presences,
            s.absences,
            s.delays,
            `${s.attendanceRate}%`
        ]);

        const csvContent = [
            headers.join(";"),
            ...rows.map(r => r.join(";"))
        ].join("\n");

        const yearLabel = selectedAnnoScout === 'all' ? 'Tutti_gli_anni' : `AA_${selectedAnnoScout}_${selectedAnnoScout + 1}`;
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `report_presenze_${yearLabel}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredStats = calculatedStats.filter(s => 
        s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.branca?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const averageAttendance = calculatedStats.length > 0 
        ? Math.round(calculatedStats.reduce((acc, s) => acc + s.attendanceRate, 0) / calculatedStats.length)
        : 0;

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500 max-w-5xl mx-auto px-2 sm:px-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/verbali')}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
                        title="Torna ai Verbali"
                    >
                        <ChevronLeft size={22} className="dark:text-white" />
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-serif font-black text-scout-brown dark:text-amber-400">
                            Reportistica Presenze
                        </h1>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            Frequenze e statistiche di partecipazione della Comunità Capi
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Anno Associativo Selector */}
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1.5 px-3 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs">
                        <Calendar size={15} className="text-scout-green shrink-0" />
                        <select
                            value={selectedAnnoScout}
                            onChange={e => setSelectedAnnoScout(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                            className="text-xs font-bold bg-transparent text-gray-800 dark:text-gray-100 outline-none cursor-pointer"
                        >
                            <option value="all">Tutti gli anni associativi</option>
                            {availableYears.map(year => (
                                <option key={year} value={year}>
                                    A.A. {formatScoutYear(year)} {year === calculateScoutYear() ? '(In corso)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button 
                        onClick={handleExportExcel}
                        className="bg-green-50 dark:bg-green-900/20 text-scout-green dark:text-emerald-400 p-2.5 rounded-2xl border border-green-100 dark:border-green-800/50 flex items-center gap-2 text-xs font-bold hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors cursor-pointer shrink-0 shadow-xs"
                        title="Esporta in Excel (CSV)"
                    >
                        <FileSpreadsheet size={16} />
                        <span className="hidden sm:inline">Esporta Excel</span>
                    </button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="w-8 h-8 rounded-xl bg-scout-green/10 dark:bg-emerald-900/30 flex items-center justify-center text-scout-green dark:text-emerald-400 mb-3">
                        <FileText size={18} />
                    </div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white">{relevantVerbali.length}</div>
                    <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">
                        Verbali {selectedAnnoScout === 'all' ? 'Totali' : 'Anno Scout'}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-900/30 flex items-center justify-center text-blue-500 dark:text-blue-400 mb-3">
                        <TrendingUp size={18} />
                    </div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white">{averageAttendance}%</div>
                    <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">Media Presenze</div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm col-span-2 lg:col-span-1">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-900/30 flex items-center justify-center text-amber-500 dark:text-amber-400 mb-3">
                        <Clock size={18} />
                    </div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white">
                        {calculatedStats.reduce((acc, s) => acc + s.delays, 0)}
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">Ritardi Totali</div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm col-span-2 lg:col-span-1">
                    <div className="w-8 h-8 rounded-xl bg-red-500/10 dark:bg-red-900/30 flex items-center justify-center text-red-500 dark:text-red-400 mb-3">
                        <AlertCircle size={18} />
                    </div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white">
                         {calculatedStats.reduce((acc, s) => acc + s.absences, 0)}
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">Assenze Totali</div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                <input 
                    type="text"
                    placeholder="Cerca per nome o branca..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-scout-green transition-all text-xs sm:text-sm"
                />
            </div>

            {/* Stats Table */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Capo</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">Frequenza</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">Presenze</th>
                                <th className="px-6 py-4 text-[10px] font-black text-red-400 dark:text-red-500 uppercase tracking-widest text-center">Assenze</th>
                                <th className="px-6 py-4 text-[10px] font-black text-amber-500 dark:text-amber-400 uppercase tracking-widest text-center">Ritardi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50 text-sm">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4">
                                            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full w-3/4"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredStats.length > 0 ? (
                                filteredStats.map((member, idx) => (
                                    <tr key={member.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                                                    idx === 0 ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 ring-2 ring-amber-200 dark:ring-amber-800" :
                                                    idx === 1 ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 ring-2 ring-gray-200 dark:ring-gray-600" :
                                                    idx === 2 ? "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 ring-2 ring-orange-200 dark:ring-orange-800" :
                                                    "bg-scout-green/10 dark:bg-emerald-900/30 text-scout-green dark:text-emerald-400"
                                                )}>
                                                    {idx < 3 ? <Award size={14} /> : idx + 1}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-bold text-gray-900 dark:text-white">{member.nome}</span>
                                                        {!member.attivo && (
                                                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                                                                Storico
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">{member.branca || 'COCA'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col items-center gap-1.5 min-w-[120px]">
                                                <div className="flex justify-between w-full text-[10px] font-black uppercase tracking-widest">
                                                    <span className={cn(
                                                        member.attendanceRate > 80 ? "text-scout-green dark:text-emerald-400" :
                                                        member.attendanceRate > 50 ? "text-amber-500 dark:text-amber-400" :
                                                        "text-red-500 dark:text-red-400"
                                                    )}>{member.attendanceRate}%</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div 
                                                        className={cn(
                                                            "h-full rounded-full transition-all duration-1000",
                                                            member.attendanceRate > 80 ? "bg-scout-green" :
                                                            member.attendanceRate > 50 ? "bg-amber-500" :
                                                            "bg-red-500"
                                                        )}
                                                        style={{ width: `${member.attendanceRate}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-gray-700 dark:text-gray-300">{member.presences}</td>
                                        <td className="px-6 py-4 text-center font-bold text-red-500 dark:text-red-400">{member.absences}</td>
                                        <td className="px-6 py-4 text-center font-bold text-amber-500 dark:text-amber-400">{member.delays}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500 italic">
                                        Nessun dato disponibile per l'anno selezionato
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bottom Tip */}
            <div className="bg-scout-brown/5 dark:bg-amber-900/10 border border-scout-brown/10 dark:border-amber-900/20 p-4 rounded-2xl flex gap-3 text-xs sm:text-sm text-scout-brown dark:text-amber-400">
                <TrendingUp size={22} className="shrink-0 mt-0.5" />
                <p>
                    I dati sono calcolati sulla base di <strong>{relevantVerbali.length}</strong> verbali {selectedAnnoScout === 'all' ? 'totali' : `dell'anno scout ${formatScoutYear(selectedAnnoScout)}`}. 
                    I capi archiviati come <em>Storico</em> mantengono intatta la loro cronologia di presenze nei verbali degli anni passati.
                </p>
            </div>
        </div>
    );
}
