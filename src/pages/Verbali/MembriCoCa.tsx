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
            setNewMembro({ nome: '', branca: 'COCA', ruoli: [] });
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

    // Removed autoLink logic as requested to decouple from app users

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
                            onClick={() => setIsAdding(true)}
                            className="bg-scout-green text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm"
                        >
                            <Plus size={16} />
                            Nuovo
                        </button>
                    )}
                </div>

                {isAdding && (
                    <div className="bg-white p-4 rounded-2xl border-2 border-scout-green shadow-md space-y-4 max-w-2xl">
                        <h3 className="font-bold text-sm">Aggiungi Nuovo Membro</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 sm:col-span-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Nome e Cognome</label>
                                <input 
                                    type="text" 
                                    value={newMembro.nome}
                                    onChange={e => setNewMembro({ ...newMembro, nome: e.target.value })}
                                    className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                                    placeholder="Es. Mario Rossi"
                                />
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Ruolo (Branca/Gruppo)</label>
                                <select 
                                    value={newMembro.branca}
                                    onChange={e => setNewMembro({ ...newMembro, branca: e.target.value })}
                                    className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                                >
                                    <option value="COCA">CoCa (Gruppo)</option>
                                    <option value="L/C">L/C</option>
                                    <option value="E/G">E/G</option>
                                    <option value="R/S">R/S</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button 
                                onClick={() => setIsAdding(false)}
                                className="text-gray-400 px-4 py-2 text-sm"
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
                            <div key={m.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-scout-green/30 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-white",
                                        m.branca === 'COCA' ? 'bg-scout-brown' : 
                                        m.branca === 'L/C' ? 'bg-yellow-400' : 
                                        m.branca === 'E/G' ? 'bg-scout-green' : 'bg-scout-red'
                                    )}>
                                        {m.nome.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">{m.nome}</p>
                                        <span className="text-[10px] font-bold uppercase text-gray-400">{m.branca}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => handleDelete(m.id)}
                                        className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
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
