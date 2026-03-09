import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ChevronLeft, FileText, 
    TrendingUp, FileSpreadsheet,
    Clock, Award, AlertCircle, Search
} from 'lucide-react';
import { getMembriCoCa, getVerbali } from '@/lib/verbali';
import { cn } from '@/lib/utils';

interface MemberStats {
    id: string;
    nome: string;
    branca?: string;
    totalVerbali: number;
    presences: number;
    absences: number;
    delays: number;
    attendanceRate: number;
}

export default function VerbaliStats() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<MemberStats[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [verbaliCount, setVerbaliCount] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [verbali, membri] = await Promise.all([
                    getVerbali(),
                    getMembriCoCa()
                ]);

                setVerbaliCount(verbali.length);

                const calculatedStats: MemberStats[] = membri.map(membro => {
                    const presences = verbali.filter(v => v.presenti?.includes(membro.id)).length;
                    const absences = verbali.filter(v => v.assenti?.includes(membro.id)).length;
                    const delays = verbali.filter(v => v.ritardi?.includes(membro.id)).length;
                    
                    const totalRelevantVerbali = presences + absences;
                    const attendanceRate = totalRelevantVerbali > 0 
                        ? Math.round((presences / totalRelevantVerbali) * 100) 
                        : 0;

                    return {
                        id: membro.id,
                        nome: membro.nome,
                        branca: membro.branca,
                        totalVerbali: totalRelevantVerbali,
                        presences,
                        absences,
                        delays,
                        attendanceRate
                    };
                });

                // Sort by attendance rate desc
                calculatedStats.sort((a, b) => b.attendanceRate - a.attendanceRate);
                setStats(calculatedStats);
            } catch (error) {
                console.error("Error calculating stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleExportExcel = () => {
        const headers = ["Membro", "Branca", "Verbali Totali", "Presenze", "Assenze", "Ritardi", "Tasso Frequenza %"];
        const rows = stats.map(s => [
            s.nome,
            s.branca || 'CoCa',
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

        // Use \ufeff for Excel BOM (Byte Order Mark) to handle special characters correctly
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `report_presenze_${new Date().getFullYear()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredStats = stats.filter(s => 
        s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.branca?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const averageAttendance = stats.length > 0 
        ? Math.round(stats.reduce((acc, s) => acc + s.attendanceRate, 0) / stats.length)
        : 0;

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <button 
                    onClick={() => navigate('/verbali')}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-serif font-black text-scout-brown">
                        Reportistica Presenze
                    </h1>
                </div>
                <button 
                    onClick={handleExportExcel}
                    className="bg-green-50 text-scout-green p-2.5 rounded-xl border border-green-100 flex items-center gap-2 text-xs font-bold hover:bg-green-100 transition-colors"
                    title="Esporta in Excel (CSV)"
                >
                    <FileSpreadsheet size={18} />
                    <span className="hidden sm:inline">Esporta Excel</span>
                </button>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-scout-green/10 flex items-center justify-center text-scout-green mb-3">
                        <FileText size={18} />
                    </div>
                    <div className="text-2xl font-black text-gray-900">{verbaliCount}</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Verbali Totali</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 mb-3">
                        <TrendingUp size={18} />
                    </div>
                    <div className="text-2xl font-black text-gray-900">{averageAttendance}%</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Media Presenze</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm col-span-2 lg:col-span-1">
                    <div className="w-full flex justify-between items-start mb-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                            <Clock size={18} />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-gray-900">
                        {stats.reduce((acc, s) => acc + s.delays, 0)}
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Ritardi Totali</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm col-span-2 lg:col-span-1">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 mb-3">
                        <AlertCircle size={18} />
                    </div>
                    <div className="text-2xl font-black text-gray-900">
                         {stats.reduce((acc, s) => acc + s.absences, 0)}
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Assenze Totali</div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text"
                    placeholder="Cerca per nome o branca..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm outline-none focus:ring-2 focus:ring-scout-green transition-all"
                />
            </div>

            {/* Stats List */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Capo</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Frequenza</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Presenze</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center text-red-400">Assenze</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center text-amber-500">Ritardi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4">
                                            <div className="h-4 bg-gray-100 rounded-full w-3/4"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredStats.length > 0 ? (
                                filteredStats.map((member, idx) => (
                                    <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold",
                                                    idx === 0 ? "bg-amber-100 text-amber-700 ring-2 ring-amber-200" :
                                                    idx === 1 ? "bg-gray-100 text-gray-700 ring-2 ring-gray-200" :
                                                    idx === 2 ? "bg-orange-100 text-orange-700 ring-2 ring-orange-200" :
                                                    "bg-scout-green/10 text-scout-green"
                                                )}>
                                                    {idx < 3 ? <Award size={14} /> : idx + 1}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900">{member.nome}</div>
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{member.branca || 'FDB'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col items-center gap-1.5 min-w-[120px]">
                                                <div className="flex justify-between w-full text-[10px] font-black uppercase tracking-widest">
                                                    <span className={cn(
                                                        member.attendanceRate > 80 ? "text-scout-green" :
                                                        member.attendanceRate > 50 ? "text-amber-500" :
                                                        "text-red-500"
                                                    )}>{member.attendanceRate}%</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
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
                                        <td className="px-6 py-4 text-center font-bold text-gray-700">{member.presences}</td>
                                        <td className="px-6 py-4 text-center font-bold text-red-500/80">{member.absences}</td>
                                        <td className="px-6 py-4 text-center font-bold text-amber-500/80">{member.delays}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                                        Nessun dato disponibile
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bottom Tip */}
            <div className="bg-scout-brown/5 border border-scout-brown/10 p-4 rounded-2xl flex gap-3 text-sm text-scout-brown">
                <TrendingUp size={24} className="shrink-0" />
                <p>
                    I dati sono calcolati sulla base di <strong>{verbaliCount}</strong> verbali registrati. 
                    Il tasso di frequenza si riferisce alla partecipazione rispetto alle riunioni effettuate da quando il membro è stato inserito.
                </p>
            </div>
        </div>
    );
}
