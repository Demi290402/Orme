import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMembriCoCa, saveMembroCoCa, deleteMembroCoCa } from '@/lib/verbali';
import { MembroCoCa } from '@/types';
import { cn } from '@/lib/utils';

export default function MembriCoCaPage() {
    const navigate = useNavigate();
    const [membri, setMembri] = useState<MembroCoCa[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newMembro, setNewMembro] = useState<Partial<MembroCoCa>>({
        nome: '',
        branca: 'COCA',
        brancheSecondarie: [],
        ruoli: []
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const m = await getMembriCoCa();
            setMembri(m);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (membro: Partial<MembroCoCa>) => {
        try {
            const saved = await saveMembroCoCa(membro);
            setIsAdding(false);
            setEditingId(null);
            setNewMembro({ nome: '', branca: 'COCA', brancheSecondarie: [], ruoli: [] });
            // Immediately add to local state to avoid delay
            setMembri(prev => [...prev, saved]);
            // Still run loadData to ensure sync
            loadData();
        } catch (err) {
            alert('Errore durante il salvataggio');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Sei sicuro di voler eliminare questo membro?')) return;
        try {
            await deleteMembroCoCa(id);
            loadData();
        } catch (err) {
            alert('Errore durante l\'eliminazione');
        }
    };

    const [editingId, setEditingId] = useState<string | null>(null);

    const openEdit = (m: MembroCoCa) => {
        setNewMembro({ ...m });
        setEditingId(m.id);
        setIsAdding(true);
    };

    const toggleSecondaryBranca = (b: string) => {
        setNewMembro(prev => {
            const current = (prev.brancheSecondarie || []);
            if (current.includes(b)) {
                return { ...prev, brancheSecondarie: current.filter(x => x !== b) };
            } else {
                return { ...prev, brancheSecondarie: [...current, b] };
            }
        });
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => navigate('/verbali')}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Gestione Membri CoCa</h1>
            </div>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-scout-brown flex items-center gap-2">
                        <Users size={20} />
                        Elenco Membri ({membri.length})
                    </h2>
                    {!isAdding && (
                        <button 
                            onClick={() => {
                                setNewMembro({ nome: '', branca: 'COCA', brancheSecondarie: [], ruoli: [] });
                                setEditingId(null);
                                setIsAdding(true);
                            }}
                            className="bg-scout-green text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm"
                        >
                            <Plus size={16} />
                            Nuovo
                        </button>
                    )}
                </div>

                {isAdding && (
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border-2 border-scout-green shadow-md space-y-4 max-w-2xl">
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                            {editingId ? 'Modifica Membro' : 'Aggiungi Nuovo Membro'}
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 sm:col-span-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Nome e Cognome</label>
                                <input 
                                    type="text" 
                                    value={newMembro.nome || ''}
                                    onChange={e => setNewMembro({ ...newMembro, nome: e.target.value })}
                                    className="w-full p-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-sm"
                                    placeholder="Es. Mario Rossi"
                                />
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Branca / Ruolo Principale</label>
                                <select 
                                    value={newMembro.branca || 'COCA'}
                                    onChange={e => {
                                        const newBranca = e.target.value;
                                        setNewMembro(prev => ({ 
                                            ...prev, 
                                            branca: newBranca, 
                                            brancheSecondarie: (prev.brancheSecondarie || []).filter(b => b !== newBranca) 
                                        }));
                                    }}
                                    className="w-full p-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-sm"
                                >
                                    <option value="COCA">CoCa</option>
                                    <option value="L/C">L/C</option>
                                    <option value="E/G">E/G</option>
                                    <option value="R/S">R/S</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Servizio extra in altre Branche (Opzionale)</label>
                                <div className="flex gap-2 mt-2">
                                    {['COCA', 'L/C', 'E/G', 'R/S'].filter(b => b !== newMembro.branca).map(b => (
                                        <button
                                            key={b}
                                            onClick={() => toggleSecondaryBranca(b)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors",
                                                (newMembro.brancheSecondarie || []).includes(b)
                                                    ? "bg-scout-green text-white border-scout-green"
                                                    : "bg-gray-50 dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-100"
                                            )}
                                        >
                                            {b}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-gray-400 italic mt-1">
                                    Puoi indicare altre branche in cui il capo presta servizio (es. Capo Gruppo che serve anche in L/C).
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button 
                                onClick={() => { setIsAdding(false); setEditingId(null); }}
                                className="text-gray-400 dark:hover:bg-gray-700 rounded-xl px-4 py-2 text-sm"
                            >Annulla</button>
                            <button 
                                onClick={() => handleSave(newMembro)}
                                disabled={!newMembro.nome}
                                className="bg-scout-green text-white px-6 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                            >Salva</button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {loading ? (
                        <div className="col-span-full p-8 text-center text-gray-400">Caricamento...</div>
                    ) : membri.length === 0 ? (
                        <div className="col-span-full bg-white p-8 rounded-2xl border border-dashed text-center text-gray-400">
                            Nessun membro censito. Inizia aggiungendone uno.
                        </div>
                    ) : (
                        membri.map(m => (
                            <div key={m.id} onClick={() => openEdit(m)} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between group hover:border-scout-green/30 cursor-pointer transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-white",
                                        m.branca === 'COCA' ? 'bg-scout-brown' : 
                                        m.branca === 'L/C' ? 'bg-yellow-400 text-gray-900' : 
                                        m.branca === 'E/G' ? 'bg-scout-green' : 'bg-scout-red'
                                    )}>
                                        {m.nome.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white text-sm">{m.nome}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5 mt-1">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                {m.branca}
                                            </span>
                                            {(m.brancheSecondarie || []).map(bs => (
                                                <span key={bs} className="text-[10px] font-bold px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-600 text-gray-500">
                                                    +{bs}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}
                                        className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
