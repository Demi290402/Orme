import { useState, useEffect } from 'react';
import { 
    Users, Plus, Trash2, ArrowLeft, ShieldCheck, KeyRound, Copy, Check, 
    RefreshCw, CheckCircle2, UserX, Crown, Clock, Share2 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMembriCoCa, saveMembroCoCa, deleteMembroCoCa } from '@/lib/verbali';
import { 
    getUser, getAllUsers, getGroupPin, regenerateGroupPin, 
    voteApproveMember, concludeMemberService, toggleCapoGruppoRole 
} from '@/lib/data';
import { MembroCoCa, User } from '@/types';
import { cn } from '@/lib/utils';
import UserAvatar from '@/components/UserAvatar';
import ShareAppModal from '@/components/ShareAppModal';

export default function MembriCoCaPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'censimento' | 'sicurezza'>('censimento');

    // Censimento State
    const [membri, setMembri] = useState<MembroCoCa[]>([]);
    const [loadingMembri, setLoadingMembri] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newMembro, setNewMembro] = useState<Partial<MembroCoCa>>({
        nome: '',
        branca: 'COCA',
        brancheSecondarie: [],
        ruoli: []
    });

    // Sicurezza & Accessi State
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
    const [groupPin, setGroupPin] = useState<string | null>(null);
    const [copiedPin, setCopiedPin] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [u, m] = await Promise.all([
                getUser().catch(() => null),
                getMembriCoCa()
            ]);
            setCurrentUser(u);
            setMembri(m);

            if (u && u.groupId) {
                const [pin, allU] = await Promise.all([
                    getGroupPin(u.groupId).catch(() => null),
                    getAllUsers().catch(() => [])
                ]);
                setGroupPin(pin);
                setRegisteredUsers(allU);
            }
        } catch (err) {
            console.error('Error loading MembriCoCa:', err);
        } finally {
            setLoadingMembri(false);
            setLoadingUsers(false);
        }
    };

    // Censimento Handlers
    const handleSaveMembro = async (membro: Partial<MembroCoCa>) => {
        try {
            const saved = await saveMembroCoCa(membro);
            setIsAdding(false);
            setEditingId(null);
            setNewMembro({ nome: '', branca: 'COCA', brancheSecondarie: [], ruoli: [] });
            setMembri(prev => {
                const filtered = prev.filter(x => x.id !== saved.id);
                return [...filtered, saved].sort((a, b) => a.nome.localeCompare(b.nome));
            });
        } catch (err) {
            alert('Errore durante il salvataggio del membro');
        }
    };

    const handleDeleteMembro = async (id: string) => {
        if (!confirm('Sei sicuro di voler eliminare questo membro dal censimento?')) return;
        try {
            await deleteMembroCoCa(id);
            setMembri(prev => prev.filter(m => m.id !== id));
        } catch (err) {
            alert('Errore durante l\'eliminazione');
        }
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

    // Sicurezza & Accessi Handlers
    const handleCopyPin = () => {
        if (!groupPin) return;
        navigator.clipboard.writeText(groupPin);
        setCopiedPin(true);
        setTimeout(() => setCopiedPin(false), 2000);
    };

    const handleRegeneratePin = async () => {
        if (!currentUser?.groupId) return;
        if (!confirm('Sei sicuro di voler rigenerare il PIN di gruppo? I vecchi inviti con il PIN precedente non saranno più validi.')) return;
        try {
            const newPin = await regenerateGroupPin(currentUser.groupId);
            setGroupPin(newPin);
            alert(`Nuovo PIN generato con successo: ${newPin}`);
        } catch (err: any) {
            alert(err.message || 'Errore durante la rigenerazione del PIN');
        }
    };

    const handleVoteApprove = async (targetUserId: string) => {
        setActionLoadingId(targetUserId);
        try {
            const res = await voteApproveMember(targetUserId);
            if (res.success) {
                // Refresh registered users
                const updated = await getAllUsers();
                setRegisteredUsers(updated);
            } else {
                alert(res.message || 'Impossibile registrare il voto');
            }
        } catch (err: any) {
            alert(err.message || 'Errore durante l\'approvazione');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleConcludeService = async (targetUser: User) => {
        const confirmMsg = `Sei sicuro di voler concludere il servizio di ${targetUser.firstName} ${targetUser.lastName}? 
L'utente perderà immediatamente l'accesso a verbali, bilancio, inventario e lista d'attesa di questo gruppo.`;
        if (!confirm(confirmMsg)) return;

        setActionLoadingId(targetUser.id);
        try {
            const res = await concludeMemberService(targetUser.id);
            if (res.success) {
                const updated = await getAllUsers();
                setRegisteredUsers(updated);
            } else {
                alert(res.message || 'Operazione non riuscita');
            }
        } catch (err: any) {
            alert(err.message || 'Errore');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleToggleCapoGruppo = async (targetUser: User) => {
        const isCurrentlyCG = targetUser.groupRole === 'capo_gruppo';
        const actionLabel = isCurrentlyCG ? 'revocare il ruolo di Capo Gruppo a' : 'nominare Capo Gruppo';
        if (!confirm(`Vuoi davvero ${actionLabel} ${targetUser.firstName} ${targetUser.lastName}?`)) return;

        setActionLoadingId(targetUser.id);
        try {
            await toggleCapoGruppoRole(targetUser.id, !isCurrentlyCG);
            const updated = await getAllUsers();
            setRegisteredUsers(updated);
        } catch (err: any) {
            alert(err.message || 'Errore durante l\'aggiornamento del ruolo');
        } finally {
            setActionLoadingId(null);
        }
    };

    const isCurrentCapoGruppo = currentUser?.groupRole === 'capo_gruppo';

    const pendingUsers = registeredUsers.filter(u => u.membershipStatus === 'in_attesa');
    const activeUsers = registeredUsers.filter(u => u.membershipStatus === 'attivo');
    const exitedUsers = registeredUsers.filter(u => u.membershipStatus === 'uscito');

    return (
        <div className="space-y-6 pb-20 max-w-5xl mx-auto px-2 sm:px-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/verbali')}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
                        title="Torna ai Verbali"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                            Comunità Capi
                        </h1>
                        <p className="text-xs text-gray-400 dark:text-gray-400">
                            {currentUser?.groupName || 'Gruppo Scout'} • Gestione Censimento & Privacy
                        </p>
                    </div>
                </div>

                {/* Tabs Switcher */}
                <div className="flex bg-gray-150 dark:bg-gray-800 p-1 rounded-2xl shrink-0">
                    <button
                        onClick={() => setActiveTab('censimento')}
                        className={cn(
                            "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                            activeTab === 'censimento'
                                ? "bg-white dark:bg-gray-900 text-scout-green shadow-xs"
                                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                        )}
                    >
                        <Users size={15} />
                        <span>Censimento ({membri.length})</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('sicurezza')}
                        className={cn(
                            "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative",
                            activeTab === 'sicurezza'
                                ? "bg-white dark:bg-gray-900 text-scout-green shadow-xs"
                                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                        )}
                    >
                        <ShieldCheck size={15} />
                        <span>Sicurezza & Accessi</span>
                        {pendingUsers.length > 0 && (
                            <span className="w-4 h-4 bg-amber-500 text-white rounded-full text-[9px] font-black flex items-center justify-center animate-pulse">
                                {pendingUsers.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* TAB 1: CENSIMENTO BRANCHE & RUOLI */}
            {activeTab === 'censimento' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Elenco dei capi della CoCa utilizzato per l'appello e le presenze nei verbali.
                        </p>
                        {!isAdding && (
                            <button 
                                onClick={() => {
                                    setNewMembro({ nome: '', branca: 'COCA', brancheSecondarie: [], ruoli: [] });
                                    setEditingId(null);
                                    setIsAdding(true);
                                }}
                                className="bg-scout-green text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-scout-green-dark transition-all cursor-pointer shrink-0"
                            >
                                <Plus size={15} />
                                <span>Nuovo Membro</span>
                            </button>
                        )}
                    </div>

                    {isAdding && (
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border-2 border-scout-green shadow-lg space-y-4 max-w-2xl animate-in fade-in duration-200">
                            <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                                {editingId ? 'Modifica Membro Censito' : 'Aggiungi Nuovo Membro al Censimento'}
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Nome e Cognome</label>
                                    <input 
                                        type="text" 
                                        value={newMembro.nome || ''}
                                        onChange={e => setNewMembro({ ...newMembro, nome: e.target.value })}
                                        className="w-full p-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-xl text-xs md:text-sm font-bold outline-none focus:ring-1 focus:ring-scout-green"
                                        placeholder="Es. Mario Rossi"
                                    />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Branca Principale</label>
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
                                        className="w-full p-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-xl text-xs md:text-sm font-bold outline-none focus:ring-1 focus:ring-scout-green"
                                    >
                                        <option value="COCA">CoCa</option>
                                        <option value="L/C">L/C</option>
                                        <option value="E/G">E/G</option>
                                        <option value="R/S">R/S</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Servizio extra in altre Branche (Opzionale)</label>
                                    <div className="flex gap-2 mt-1.5 flex-wrap">
                                        {['COCA', 'L/C', 'E/G', 'R/S'].filter(b => b !== newMembro.branca).map(b => (
                                            <button
                                                key={b}
                                                type="button"
                                                onClick={() => toggleSecondaryBranca(b)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer",
                                                    (newMembro.brancheSecondarie || []).includes(b)
                                                        ? "bg-scout-green text-white border-scout-green"
                                                        : "bg-gray-50 dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-100"
                                                )}
                                            >
                                                {b}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end pt-2">
                                <button 
                                    type="button"
                                    onClick={() => { setIsAdding(false); setEditingId(null); }}
                                    className="text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl px-4 py-2 text-xs font-bold cursor-pointer"
                                >
                                    Annulla
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => handleSaveMembro(newMembro)}
                                    disabled={!newMembro.nome?.trim()}
                                    className="bg-scout-green text-white px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-scout-green-dark cursor-pointer shadow-xs"
                                >
                                    Salva Membro
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Membri List Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {loadingMembri ? (
                            <div className="col-span-full p-8 text-center text-xs text-gray-400 font-bold">
                                Caricamento censimento...
                            </div>
                        ) : membri.length === 0 ? (
                            <div className="col-span-full bg-white dark:bg-gray-800 p-8 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 text-center text-gray-400 text-xs font-medium">
                                Nessun membro censito. Clicca su "Nuovo Membro" per iniziare.
                            </div>
                        ) : (
                            membri.map(m => (
                                <div 
                                    key={m.id} 
                                    onClick={() => {
                                        setNewMembro({ ...m });
                                        setEditingId(m.id);
                                        setIsAdding(true);
                                    }} 
                                    className="bg-white dark:bg-gray-800 p-3.5 rounded-2xl border border-gray-150 dark:border-gray-700/80 shadow-xs flex items-center justify-between group hover:border-scout-green/40 cursor-pointer transition-all"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={cn(
                                            "w-9 h-9 rounded-full flex items-center justify-center font-black text-xs text-white shrink-0 shadow-xs",
                                            m.branca === 'COCA' ? 'bg-scout-brown' : 
                                            m.branca === 'L/C' ? 'bg-yellow-400 text-gray-900' : 
                                            m.branca === 'E/G' ? 'bg-scout-green' : 'bg-scout-red'
                                        )}>
                                            {m.nome.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm truncate">{m.nome}</p>
                                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                    {m.branca}
                                                </span>
                                                {(m.brancheSecondarie || []).map(bs => (
                                                    <span key={bs} className="text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-500">
                                                        +{bs}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleDeleteMembro(m.id); }}
                                        className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                                        title="Elimina dal censimento"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: SICUREZZA COCA & ACCESSI */}
            {activeTab === 'sicurezza' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    {/* PIN Card */}
                    <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/40 p-5 md:p-6 rounded-3xl border border-emerald-500/20 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-black text-sm md:text-base text-gray-900 dark:text-white flex items-center gap-2">
                                    <KeyRound size={18} className="text-scout-green" />
                                    Codice di Accesso CoCa (PIN di Gruppo)
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    I nuovi capi che inseriscono questo PIN richiedono solo <strong>2 approvazioni</strong> invece di 4 per accedere.
                                </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <div className="px-4 py-2 bg-white dark:bg-gray-900 border border-emerald-300 dark:border-emerald-700/60 rounded-2xl font-mono font-black text-base md:text-lg tracking-widest text-scout-green shadow-xs">
                                    {groupPin || 'CARICAMENTO...'}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCopyPin}
                                    className="p-2.5 bg-scout-green text-white rounded-xl hover:bg-scout-green-dark transition-all shadow-xs cursor-pointer"
                                    title="Copia PIN"
                                >
                                    {copiedPin ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                                {isCurrentCapoGruppo && (
                                    <button
                                        type="button"
                                        onClick={handleRegeneratePin}
                                        className="p-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 rounded-xl transition-all cursor-pointer"
                                        title="Rigenera PIN (solo Capi Gruppo)"
                                    >
                                        <RefreshCw size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Share App Action Card */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-150 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                <Share2 size={18} />
                            </div>
                            <div>
                                <h4 className="text-xs md:text-sm font-black text-gray-900 dark:text-white">Invita Capi Scout su Orme</h4>
                                <p className="text-[11px] text-gray-400 leading-tight mt-0.5">
                                    Condividi l'app con capi di qualsiasi gruppo o zona: potranno registrarsi autonomamente e scegliere il loro gruppo.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowShareModal(true)}
                            className="w-full sm:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                        >
                            <Share2 size={14} />
                            Invita su Orme
                        </button>
                    </div>

                    {/* Pending Approvals Section */}
                    <div className="space-y-3">
                        <h3 className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                            <Clock size={16} className="text-amber-500" />
                            Richieste in attesa di approvazione ({pendingUsers.length})
                        </h3>

                        {loadingUsers ? (
                            <div className="p-6 text-center text-xs text-gray-400">Caricamento richieste...</div>
                        ) : pendingUsers.length === 0 ? (
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-150 dark:border-gray-700/60 text-center text-xs text-gray-400">
                                ✨ Nessuna richiesta in attesa. Tutti i capi censiti sono attivi!
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {pendingUsers.map(u => {
                                    const required = u.hasValidPin ? 2 : 4;
                                    const votes = u.cocaApprovals?.length || 0;
                                    const alreadyVoted = !!currentUser && (u.cocaApprovals || []).includes(currentUser.id);
                                    const isSubmitting = actionLoadingId === u.id;

                                    return (
                                        <div key={u.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-amber-300 dark:border-amber-800/60 shadow-xs space-y-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar user={u} className="w-10 h-10 rounded-full" />
                                                    <div>
                                                        <p className="font-bold text-sm text-gray-900 dark:text-white">
                                                            {u.firstName} {u.lastName} {u.nickname && <span className="text-gray-400 text-xs">({u.nickname})</span>}
                                                        </p>
                                                        <p className="text-[11px] text-gray-400">{u.email}</p>
                                                    </div>
                                                </div>

                                                <span className={cn(
                                                    "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0",
                                                    u.hasValidPin ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                                                )}>
                                                    {u.hasValidPin ? '🔑 Con PIN' : 'Senza PIN'}
                                                </span>
                                            </div>

                                            {/* Voting progress */}
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs font-bold">
                                                    <span className="text-gray-500">Approvazioni ricevute:</span>
                                                    <span className="text-amber-600 dark:text-amber-400">{votes} / {required} voti</span>
                                                </div>
                                                <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-amber-500 rounded-full transition-all"
                                                        style={{ width: `${Math.min(100, (votes / required) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-2 pt-1">
                                                {alreadyVoted ? (
                                                    <div className="flex-1 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
                                                        <CheckCircle2 size={14} /> Hai già approvato
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        disabled={isSubmitting}
                                                        onClick={() => handleVoteApprove(u.id)}
                                                        className="flex-1 py-1.5 bg-scout-green hover:bg-scout-green-dark text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                                                    >
                                                        <Check size={14} /> {isSubmitting ? 'Salvataggio...' : 'Vota Approvazione'}
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    disabled={isSubmitting}
                                                    onClick={() => handleConcludeService(u)}
                                                    className="px-3 py-1.5 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 dark:bg-gray-700 dark:hover:bg-red-950/40 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                                    title="Rifiuta richiesta"
                                                >
                                                    Rifiuta
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Active Leaders List */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-scout-green" />
                                Capi con Accesso Attivo ({activeUsers.length})
                            </h3>
                            <span className="text-[11px] text-gray-400">
                                Hanno accesso completo a verbali, bilancio, lista d'attesa e inventario.
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {activeUsers.map(u => {
                                const isSelf = u.id === currentUser?.id;
                                const isCG = u.groupRole === 'capo_gruppo';

                                return (
                                    <div key={u.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-150 dark:border-gray-700/70 shadow-xs flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <UserAvatar user={u} className="w-10 h-10 rounded-full shrink-0" />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <p className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                                                        {u.firstName} {u.lastName}
                                                    </p>
                                                    {isCG && (
                                                        <span className="flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 bg-yellow-400 text-gray-950 rounded-full shrink-0 shadow-2xs">
                                                            <Crown size={9} /> Capo Gruppo
                                                        </span>
                                                    )}
                                                    {isSelf && (
                                                        <span className="text-[9px] font-bold text-gray-400">(Tu)</span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                                            </div>
                                        </div>

                                        {/* Actions for Capo Gruppo */}
                                        {isCurrentCapoGruppo && !isSelf && (
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleCapoGruppo(u)}
                                                    className={cn(
                                                        "p-1.5 rounded-lg text-xs transition-colors cursor-pointer",
                                                        isCG ? "text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/30" : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    )}
                                                    title={isCG ? "Rimuovi ruolo Capo Gruppo" : "Nomina Capo Gruppo"}
                                                >
                                                    <Crown size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleConcludeService(u)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                                                    title="Concludi Servizio / Rimuovi dalla CoCa"
                                                >
                                                    <UserX size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Ex-members Section (if any) */}
                    {exitedUsers.length > 0 && (
                        <div className="space-y-3 pt-2">
                            <h3 className="font-extrabold text-sm text-gray-400 flex items-center gap-2">
                                <UserX size={16} />
                                Ex Capi / Servizio Concluso ({exitedUsers.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-60 hover:opacity-100 transition-opacity">
                                {exitedUsers.map(u => (
                                    <div key={u.id} className="bg-gray-50 dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs">
                                        <div>
                                            <p className="font-bold text-gray-700 dark:text-gray-300">{u.firstName} {u.lastName}</p>
                                            <p className="text-[10px] text-gray-400">{u.email} • Servizio concluso</p>
                                        </div>
                                        {isCurrentCapoGruppo && (
                                            <button
                                                type="button"
                                                onClick={() => handleVoteApprove(u.id)}
                                                className="px-2.5 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-scout-green hover:text-white rounded-lg font-bold text-[10px] transition-all cursor-pointer"
                                            >
                                                Riattiva in CoCa
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Share App Modal */}
            <ShareAppModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                inviterName={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : undefined}
                inviterGroup={currentUser?.groupName}
            />
        </div>
    );
}
