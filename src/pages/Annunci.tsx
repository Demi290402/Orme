import { useState, useEffect } from 'react';
import { getAnnunci, salvaAnnuncio, eliminaAnnuncio, Annuncio } from '@/lib/annunci';
import { getUser } from '@/lib/data';
import { User } from '@/types';
import { CalendarClock, Info, Plus, Megaphone, Trash2, X, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRIORITA_COLORS = {
    normale: 'bg-scout-blue text-white',
    importante: 'bg-orange-500 text-white',
    urgente: 'bg-red-500 text-white',
};

const PRIORITA_LABELS = {
    normale: 'Normale (Info)',
    importante: 'Importante',
    urgente: 'Urgente',
};

export default function Annunci() {
    const [annunci, setAnnunci] = useState<Annuncio[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [testo, setTesto] = useState('');
    const [priorita, setPriorita] = useState<Annuncio['priorita']>('normale');
    const [scadenza, setScadenza] = useState('');

    const reload = async () => {
        setLoading(true);
        const data = await getAnnunci();
        setAnnunci(data);
        setLoading(false);
    };

    useEffect(() => {
        getUser().then(setCurrentUser).catch(console.error);
        reload();
    }, []);

    const handleSave = async () => {
        if (!testo.trim()) return;
        await salvaAnnuncio({ testo, priorita, scadenza: scadenza || undefined });
        
        setShowForm(false);
        setTesto('');
        setPriorita('normale');
        setScadenza('');
        reload();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Vuoi davvero eliminare questo annuncio?')) return;
        await eliminaAnnuncio(id);
        reload();
    };

    return (
        <div className="pb-24 max-w-2xl mx-auto">
            <header className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Megaphone className="text-scout-brown" />
                        Bacheca Annunci
                    </h1>
                    <p className="text-sm text-gray-500">Comunicazioni interne della CoCa</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-scout-brown text-white p-3 rounded-xl shadow-sm hover:bg-scout-brown/90 transition-all flex items-center gap-2 font-bold text-sm"
                >
                    <Plus size={18} /> Nuovo
                </button>
            </header>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-bold">Nuovo Annuncio</h2>
                            <button onClick={() => setShowForm(false)} className="p-2 bg-gray-100 rounded-full dark:bg-gray-700 dark:text-gray-300">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Testo della comunicazione *</label>
                            <textarea
                                rows={4}
                                value={testo}
                                onChange={e => setTesto(e.target.value)}
                                placeholder="Scrivi qui..."
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-scout-brown resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Priorità</label>
                                <select
                                    value={priorita}
                                    onChange={e => setPriorita(e.target.value as any)}
                                    className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-scout-brown text-sm"
                                >
                                    <option value="normale">Normale</option>
                                    <option value="importante">Importante</option>
                                    <option value="urgente">Urgente</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Scadenza (Opz.)</label>
                                <input
                                    type="date"
                                    value={scadenza}
                                    onChange={e => setScadenza(e.target.value)}
                                    className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-scout-brown text-sm text-gray-700 dark:text-gray-300"
                                />
                            </div>
                        </div>

                        <p className="text-[10px] text-gray-400 mt-2">
                            Gli annunci urgenti e importanti inviano una notifica a tutti. Si auto-elimineranno dopo la data di scadenza.
                        </p>

                        <button
                            onClick={handleSave}
                            disabled={!testo.trim()}
                            className="w-full py-3 mt-4 bg-scout-brown text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-scout-brown-dark disabled:opacity-50"
                        >
                            <Send size={18} /> Pubblica
                        </button>
                    </div>
                </div>
            )}

            {/* Lista Annunci */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-10 text-gray-500">Caricamento annunci...</div>
                ) : annunci.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 text-center border border-gray-100 dark:border-gray-700">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Info size={24} className="text-gray-400" />
                        </div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-200">Nessun annuncio</h3>
                        <p className="text-sm text-gray-500 mt-1">La bacheca è vuota.</p>
                    </div>
                ) : (
                    annunci.map(annuncio => {
                        const isOwn = annuncio.autoreId === currentUser?.id;
                        return (
                            <div key={annuncio.id} className={cn(
                                "group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border p-4 transition-all relative overflow-hidden",
                                annuncio.priorita === 'urgente' ? "border-red-500/50" :
                                annuncio.priorita === 'importante' ? "border-orange-500/50" : "border-gray-100 dark:border-gray-700"
                            )}>
                                {/* Ribbon priorità */}
                                <div className={cn("absolute top-0 left-0 w-1 h-full", PRIORITA_COLORS[annuncio.priorita])} />
                                
                                <div className="flex justify-between items-start pl-2 mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden shrink-0">
                                            {annuncio.autoreAvatar ? (
                                                <img src={annuncio.autoreAvatar} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">{annuncio.autoreNome?.[0] || '?'}</div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{annuncio.autoreNickname || annuncio.autoreNome || 'Sconosciuto'}</p>
                                            <p className="text-[10px] text-gray-400">{new Date(annuncio.createdAt).toLocaleString('it-IT')}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full",
                                            PRIORITA_COLORS[annuncio.priorita]
                                        )}>
                                            {PRIORITA_LABELS[annuncio.priorita]}
                                        </span>
                                        {isOwn && (
                                            <button onClick={() => handleDelete(annuncio.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="pl-2">
                                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                                        {annuncio.testo}
                                    </p>
                                    
                                    {annuncio.scadenza && (
                                        <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-gray-900 w-fit px-2 py-1 rounded-lg">
                                            <CalendarClock size={12} />
                                            Scade: {new Date(annuncio.scadenza).toLocaleDateString('it-IT')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
