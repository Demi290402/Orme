import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, Search, Calendar, MapPin, User as UserIcon, Filter, X } from 'lucide-react';
import { getVerbali } from '@/lib/verbali';
import { Verbale } from '@/types';
import { cn } from '@/lib/utils';

export default function VerbaliList() {
    const [verbali, setVerbali] = useState<Verbale[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        getVerbali().then(data => {
            setVerbali(data);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);

    const getScoutYear = (dateStr: string) => {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-indexed, 8 is September
        if (month >= 8) {
            return `${year}/${year + 1}`;
        }
        return `${year - 1}/${year}`;
    };

    const scoutYears = Array.from(new Set(verbali.map(v => getScoutYear(v.data)))).sort().reverse();

    const filteredVerbali = verbali.filter(v => {
        const matchesSearch = 
            v.titolo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.luogo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.numero.toString().includes(searchTerm) ||
            v.odg?.some(p => p.titolo.toLowerCase().includes(searchTerm.toLowerCase()) || p.contenuto.toLowerCase().includes(searchTerm.toLowerCase())) ||
            v.cassa?.some(c => c.note.toLowerCase().includes(searchTerm.toLowerCase()) || c.branca.toLowerCase().includes(searchTerm.toLowerCase())) ||
            v.varie?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesYear = selectedYear === 'all' || getScoutYear(v.data) === selectedYear;
        
        return matchesSearch && matchesYear;
    });

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="bg-scout-brown text-white p-6 rounded-2xl shadow-lg -mx-4 md:mx-0 rounded-t-none md:rounded-2xl flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-1">Archivio Verbali</h1>
                    <p className="opacity-90 text-sm">Diario di Bordo della Comunità Capi</p>
                </div>
                <FileText size={48} className="opacity-20" />
            </div>

            {/* Actions & Search */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Cerca in titoli, ODG, cassa..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-scout-green shadow-sm"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={cn(
                                "px-4 py-3 rounded-xl font-bold border-2 transition-all flex items-center justify-center gap-2 relative",
                                showFilters || selectedYear !== 'all'
                                    ? "bg-scout-green/10 border-scout-green text-scout-green"
                                    : "bg-white border-scout-brown/10 text-scout-brown hover:border-scout-brown/30"
                            )}
                        >
                            <Filter size={20} />
                            {selectedYear !== 'all' && (
                                <span className="absolute -top-2 -right-2 w-5 h-5 bg-scout-green text-white text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-sm">1</span>
                            )}
                        </button>
                        <Link
                            to="/verbali/membri"
                            className="bg-white text-scout-brown px-4 py-3 rounded-xl font-bold border-2 border-scout-brown/10 shadow-sm hover:border-scout-brown/30 transition-all flex items-center justify-center gap-2"
                        >
                            <UserIcon size={20} />
                            <span className="hidden sm:inline">Membri</span>
                        </Link>
                        <Link
                            to="/verbali/nuovo"
                            className="bg-scout-green text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-scout-green-dark transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Plus size={20} />
                            <span className="hidden sm:inline">Nuovo</span>
                        </Link>
                    </div>
                </div>

                {/* Expanded Filters */}
                {showFilters && (
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Filter size={12} />
                                Filtri Avanzati
                            </h3>
                            {(selectedYear !== 'all' || searchTerm !== '') && (
                                <button 
                                    onClick={() => { setSelectedYear('all'); setSearchTerm(''); }}
                                    className="text-[10px] font-bold text-red-400 hover:text-red-500 flex items-center gap-1"
                                >
                                    <X size={12} />
                                    Reset
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-500 ml-1">Anno Scout</label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-scout-green"
                                >
                                    <option value="all">Tutti gli anni</option>
                                    {scoutYears.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* List */}
            <div className="grid gap-4">
                {loading ? (
                    <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-dashed border-gray-200">
                        Caricamento verbali...
                    </div>
                ) : filteredVerbali.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                        {searchTerm ? 'Nessuna corrispondenza trovata.' : 'Nessun verbale presente in archivio.'}
                    </div>
                ) : (
                    filteredVerbali.map((v) => (
                        <Link
                            key={v.id}
                            to={`/verbali/modifica/${v.id}`}
                            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-scout-green/30 transition-all group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <span className="text-[10px] font-bold text-scout-green bg-green-50 px-2 py-0.5 rounded-full border border-green-100 uppercase mb-2 inline-block">
                                        Verbale N. {v.numero}
                                    </span>
                                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-scout-green transition-colors">
                                        {v.titolo}
                                    </h3>
                                </div>
                                <Calendar size={18} className="text-gray-300" />
                            </div>

                            <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-auto">
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={14} />
                                    <span>{new Date(v.data).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <MapPin size={14} />
                                    <span>{v.luogo}</span>
                                </div>
                                <div className="flex items-center gap-1.5 ml-auto text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                    <UserIcon size={12} />
                                    <span>Caricato da {v.createdByName || 'Admin'}</span>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
