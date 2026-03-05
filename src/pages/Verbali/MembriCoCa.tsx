import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Link as LinkIcon, UserPlus, Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMembriCoCa, saveMembroCoCa, deleteMembroCoCa } from '@/lib/verbali';
import { getAllUsers } from '@/lib/data';
import { MembroCoCa, User } from '@/types';
import { cn } from '@/lib/utils';

export default function MembriCoCaPage() {
    const navigate = useNavigate();
    const [membri, setMembri] = useState<MembroCoCa[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newMembro, setNewMembro] = useState<Partial<MembroCoCa>>({
        nome: '',
        branca: 'COCA',
        ruoli: [],
        userId: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [m, u] = await Promise.all([getMembriCoCa(), getAllUsers()]);
            setMembri(m);
            setUsers(u);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (membro: Partial<MembroCoCa>) => {
        try {
            await saveMembroCoCa(membro);
            setIsAdding(false);
            setNewMembro({ nome: '', branca: 'COCA', ruoli: [], userId: '' });
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

    const autoLink = async (user: User) => {
        const existing = membri.find(m => m.userId === user.id);
        if (existing) {
            alert('Questo utente è già collegato a un membro.');
            return;
        }

        const membro: Partial<MembroCoCa> = {
            nome: `${user.firstName} ${user.lastName}`,
            userId: user.id,
            branca: 'COCA',
            ruoli: []
        };
        await handleSave(membro);
    };

    const unlinkedUsers = users.filter(u => !membri.some(m => m.userId === u.id));

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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Membri List */}
                <div className="lg:col-span-2 space-y-4">
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
                        <div className="bg-white p-4 rounded-2xl border-2 border-scout-green shadow-md space-y-4">
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
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Branca</label>
                                    <select 
                                        value={newMembro.branca}
                                        onChange={e => setNewMembro({ ...newMembro, branca: e.target.value })}
                                        className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                                    >
                                        <option value="COCA">CoCa</option>
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

                    <div className="grid gap-3">
                        {loading ? (
                            <div className="p-8 text-center text-gray-400">Caricamento...</div>
                        ) : membri.length === 0 ? (
                            <div className="bg-white p-8 rounded-2xl border border-dashed text-center text-gray-400">
                                Nessun membro censito. Inizia aggiungendone uno o importandolo dagli utenti.
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
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold uppercase text-gray-400">{m.branca}</span>
                                                {m.userId && (
                                                    <span className="flex items-center gap-1 text-[9px] bg-scout-blue/10 text-scout-blue px-1.5 py-0.5 rounded-md">
                                                        <LinkIcon size={8} />
                                                        Collegato all'App
                                                    </span>
                                                )}
                                            </div>
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

                {/* Import from Users */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-scout-blue flex items-center gap-2">
                        <UserPlus size={20} />
                        Utenti App non censiti
                    </h2>
                    <p className="text-xs text-gray-500">
                        Questi utenti sono registrati nel tuo gruppo ma non sono ancora nell'elenco membri dei verbali.
                    </p>
                    
                    <div className="grid gap-2">
                        {unlinkedUsers.length === 0 ? (
                            <div className="text-[11px] text-gray-400 italic bg-gray-50 p-4 rounded-xl border border-gray-100">
                                Tutti gli utenti dell'app sono già censiti come membri.
                            </div>
                        ) : (
                            unlinkedUsers.map(u => (
                                <div key={u.id} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between shadow-xs">
                                    <div className="flex items-center gap-2">
                                        <img 
                                            src={u.profilePicture || `/avatars/avatar-${Math.floor(Math.random() * 8) + 1}.png`} 
                                            className="w-8 h-8 rounded-full bg-gray-100"
                                            alt=""
                                        />
                                        <div>
                                            <p className="text-xs font-bold truncate max-w-[120px]">{u.firstName} {u.lastName}</p>
                                            <p className="text-[9px] text-gray-400 italic">@{u.nickname}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => autoLink(u)}
                                        className="text-[10px] font-black uppercase text-scout-blue hover:underline p-2"
                                    >
                                        Aggiungi
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-8 bg-scout-green/5 p-4 rounded-2xl border border-scout-green/10">
                        <h4 className="text-xs font-bold text-scout-green mb-2 flex items-center gap-2">
                            <Save size={14} />
                            Perché collegare?
                        </h4>
                        <p className="text-[10px] text-gray-600 leading-relaxed">
                            Collegando un membro a un utente dell'app, potrai in futuro gestire statistiche personalizzate di presenza e ruoli automatici.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
