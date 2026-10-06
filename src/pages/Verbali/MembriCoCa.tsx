import { useState, useEffect } from 'react';
import { 
    Users, Plus, Trash2, ArrowLeft, ShieldCheck, KeyRound, Copy, Check, 
    RefreshCw, CheckCircle2, UserX, Crown, Clock, Share2,
    Archive, RotateCcw, Sparkles, AlertTriangle, UserCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
    getMembriCoCa, saveMembroCoCa, deleteMembroCoCa, 
    getVerbali, findOrphanedMemberIds, OrphanedMemberInfo 
} from '@/lib/verbali';
import { 
    getUser, getAllUsers, getGroupPin, regenerateGroupPin, 
    voteApproveMember, concludeMemberService, toggleCapoGruppoRole 
} from '@/lib/data';
import { MembroCoCa, User, Verbale } from '@/types';
import { cn } from '@/lib/utils';
import UserAvatar from '@/components/UserAvatar';
import ShareAppModal from '@/components/ShareAppModal';

export default function MembriCoCaPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'censimento' | 'sicurezza'>('censimento');
    const [censimentoSubTab, setCensimentoSubTab] = useState<'attivi' | 'storici'>('attivi');

    // Censimento State
    const [membri, setMembri] = useState<MembroCoCa[]>([]);
    const [verbaliList, setVerbaliList] = useState<Verbale[]>([]);
    const [orphanedMembers, setOrphanedMembers] = useState<OrphanedMemberInfo[]>([]);
    const [recoveringId, setRecoveringId] = useState<string | null>(null);
    const [recoverForm, setRecoverForm] = useState<{ nome: string; branca: string }>({ nome: '', branca: 'COCA' });
    const [loadingMembri, setLoadingMembri] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newMembro, setNewMembro] = useState<Partial<MembroCoCa>>({
        nome: '',
        branca: 'COCA',
        brancheSecondarie: [],
        ruoli: [],
        attivo: true,
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
            const [u, m, v] = await Promise.all([
                getUser().catch(() => null),
                getMembriCoCa(true), // Carica tutti i membri (sia attivi che storici)
                getVerbali().catch(() => [])
            ]);
            setCurrentUser(u);
            setMembri(m);
            setVerbaliList(v);

            // Trova ID orfani presenti nei verbali passati ma non più in anagrafica
            const orphans = findOrphanedMemberIds(v, m);
            setOrphanedMembers(orphans);

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
            const isHistoric = censimentoSubTab === 'storici';
            const memberToSave = {
                ...membro,
                attivo: membro.attivo !== undefined ? membro.attivo : !isHistoric
            };
            const saved = await saveMembroCoCa(memberToSave);
            setIsAdding(false);
            setEditingId(null);
            setNewMembro({ nome: '', branca: 'COCA', brancheSecondarie: [], ruoli: [], attivo: true });
            
            const updatedMembri = [...membri.filter(x => x.id !== saved.id), saved].sort((a, b) => a.nome.localeCompare(b.nome));
            setMembri(updatedMembri);
            setOrphanedMembers(findOrphanedMemberIds(verbaliList, updatedMembri));
        } catch (err: any) {
            alert(err?.message || 'Errore durante il salvataggio del membro');
        }
    };

    const handleSoftDelete = async (membro: MembroCoCa) => {
        const confirmMsg = `Vuoi archiviare ${membro.nome} come Capo Storico?\n\nIl membro non apparirà più nell'appello dei nuovi verbali, ma tutti i verbali passati e le statistiche di presenza dell'anno rimarranno perfettamente conservati.`;
        if (!confirm(confirmMsg)) return;

        try {
            await deleteMembroCoCa(membro.id, false);
            const updated = membri.map(m => m.id === membro.id ? { ...m, attivo: false } : m);
            setMembri(updated);
        } catch (err: any) {
            alert(err?.message || 'Errore durante l\'archiviazione');
        }
    };

    const handleReactivate = async (membro: MembroCoCa) => {
        try {
            const updatedMember = await saveMembroCoCa({ ...membro, attivo: true });
            const updated = membri.map(m => m.id === membro.id ? updatedMember : m);
            setMembri(updated);
            alert(`${membro.nome} è stato riattivato nel Censimento Attivo.`);
        } catch (err: any) {
            alert(err?.message || 'Errore durante la riattivazione');
        }
    };

    const handleHardDelete = async (membro: MembroCoCa) => {
        const isInVerbali = verbaliList.some(v => 
            v.presenti?.includes(membro.id) || 
            v.assenti?.includes(membro.id) || 
            v.ritardi?.includes(membro.id)
        );

        let confirmMsg = `Vuoi davvero eliminare definitivamente ${membro.nome}?`;
        if (isInVerbali) {
            confirmMsg = `ATTENZIONE: ${membro.nome} è registrato in alcuni verbali passati!\n\nEliminarlo definitivamente farà sparire il suo nome da tali verbali.\nTi consigliamo di mantenerlo come "Capo Storico" per preservare l'archivio.\n\nVuoi davvero procedere con l'eliminazione definitiva?`;
        }

        if (!confirm(confirmMsg)) return;

        try {
            await deleteMembroCoCa(membro.id, true);
            const updated = membri.filter(m => m.id !== membro.id);
            setMembri(updated);
            setOrphanedMembers(findOrphanedMemberIds(verbaliList, updated));
        } catch (err: any) {
            alert(err?.message || 'Errore durante l\'eliminazione');
        }
    };

    const handleRecoverOrphan = async (orphanId: string) => {
        if (!recoverForm.nome.trim()) {
            alert('Inserisci il nome e cognome del capo');
            return;
        }

        try {
            const restored = await saveMembroCoCa({
                id: orphanId,
                nome: recoverForm.nome.trim(),
                branca: recoverForm.branca,
                brancheSecondarie: [],
                ruoli: [],
                attivo: false // Ripristinato come storico per preservare i vecchi verbali senza sporcare il censimento attivo
            });

            const updatedMembri = [...membri.filter(m => m.id !== orphanId), restored].sort((a, b) => a.nome.localeCompare(b.nome));
            setMembri(updatedMembri);
            setOrphanedMembers(findOrphanedMemberIds(verbaliList, updatedMembri));
            setRecoveringId(null);
            setRecoverForm({ nome: '', branca: 'COCA' });
            alert(`Capo "${restored.nome}" ripristinato con successo come Capo Storico!\nTutti i verbali passati e le statistiche hanno riacquisito il suo nome.`);
        } catch (err: any) {
            alert(err?.message || 'Errore durante il ripristino del capo');
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

    const activeMembri = membri.filter(m => m.attivo !== false);
    const inactiveMembri = membri.filter(m => m.attivo === false);
    const displayedMembri = censimentoSubTab === 'attivi' ? activeMembri : inactiveMembri;

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
                        <span>Censimento ({activeMembri.length})</span>
                        {orphanedMembers.length > 0 && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        )}
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
                <div className="space-y-5">
                    {/* BANNER RECUPERO CAPI RIMOSSI DAI VECCHI VERBALI */}
                    {orphanedMembers.length > 0 && (
                        <div className="bg-amber-50/80 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/80 rounded-3xl p-4 sm:p-5 space-y-3 shadow-sm animate-in fade-in">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={22} />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-extrabold text-sm text-amber-900 dark:text-amber-200">
                                            {orphanedMembers.length} {orphanedMembers.length === 1 ? 'Capo rimosso rilevato' : 'Capi rimossi rilevati'} nei verbali passati
                                        </h3>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-800/60 text-amber-900 dark:text-amber-100">
                                            Azione consigliata
                                        </span>
                                    </div>
                                    <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-1 leading-relaxed">
                                        Nei verbali già salvati risultano registrati dei capi che non sono più presenti nel censimento. 
                                        Assegna il loro nome per <strong>ripristinare immediatamente la visualizzazione di chi c'era</strong> in tutti i verbali passati e nelle statistiche annuali!
                                    </p>
                                </div>
                            </div>

                            <div className="divide-y divide-amber-200/60 dark:divide-amber-800/50 pt-1">
                                {orphanedMembers.map((orphan, idx) => (
                                    <div key={orphan.id} className="py-3 first:pt-2 last:pb-1 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                        <div className="text-xs">
                                            <div className="font-bold text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
                                                <span>Capo #{idx + 1}</span>
                                                <span className="text-[10px] font-normal text-amber-700 dark:text-amber-300">
                                                    (presente in {orphan.occurrences} {orphan.occurrences === 1 ? 'riunione' : 'riunioni'}: {orphan.verbaleTitles.join(', ')})
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-gray-500 font-mono mt-0.5 truncate max-w-sm">
                                                ID: {orphan.id}
                                            </p>
                                        </div>

                                        {recoveringId === orphan.id ? (
                                            <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded-2xl border border-amber-300 dark:border-amber-700">
                                                <input 
                                                    type="text" 
                                                    placeholder="Nome e Cognome..."
                                                    value={recoverForm.nome}
                                                    onChange={e => setRecoverForm(prev => ({ ...prev, nome: e.target.value }))}
                                                    className="p-1.5 text-xs font-bold border border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-800 dark:text-white outline-none focus:ring-1 focus:ring-scout-green w-44"
                                                    autoFocus
                                                />
                                                <select
                                                    value={recoverForm.branca}
                                                    onChange={e => setRecoverForm(prev => ({ ...prev, branca: e.target.value }))}
                                                    className="p-1.5 text-xs font-bold border border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-800 dark:text-white outline-none"
                                                >
                                                    <option value="COCA">CoCa</option>
                                                    <option value="L/C">L/C</option>
                                                    <option value="E/G">E/G</option>
                                                    <option value="R/S">R/S</option>
                                                </select>
                                                <button
                                                    onClick={() => handleRecoverOrphan(orphan.id)}
                                                    className="bg-scout-green hover:bg-scout-green-dark text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer shadow-xs"
                                                >
                                                    Ripristina
                                                </button>
                                                <button
                                                    onClick={() => { setRecoveringId(null); setRecoverForm({ nome: '', branca: 'COCA' }); }}
                                                    className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1.5 rounded-xl cursor-pointer"
                                                >
                                                    Annulla
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setRecoveringId(orphan.id);
                                                    setRecoverForm({ nome: '', branca: 'COCA' });
                                                }}
                                                className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 self-start md:self-auto"
                                            >
                                                <Sparkles size={14} />
                                                <span>Assegna Nome e Ripristina</span>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sub-Tabs: Censimento Attivo vs Capi Storici / Usciti */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex bg-gray-100 dark:bg-gray-800/70 p-1 rounded-2xl w-fit">
                            <button
                                onClick={() => setCensimentoSubTab('attivi')}
                                className={cn(
                                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                                    censimentoSubTab === 'attivi'
                                        ? "bg-white dark:bg-gray-900 text-scout-green shadow-xs"
                                        : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                                )}
                            >
                                <UserCheck size={14} />
                                <span>Censimento Attivo ({activeMembri.length})</span>
                            </button>
                            <button
                                onClick={() => setCensimentoSubTab('storici')}
                                className={cn(
                                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                                    censimentoSubTab === 'storici'
                                        ? "bg-white dark:bg-gray-900 text-scout-brown dark:text-amber-400 shadow-xs"
                                        : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                                )}
                            >
                                <Archive size={14} />
                                <span>Capi Storici / Usciti ({inactiveMembri.length})</span>
                            </button>
                        </div>

                        {!isAdding && (
                            <button 
                                onClick={() => {
                                    setNewMembro({ nome: '', branca: 'COCA', brancheSecondarie: [], ruoli: [], attivo: censimentoSubTab === 'attivi' });
                                    setEditingId(null);
                                    setIsAdding(true);
                                }}
                                className="bg-scout-green text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-scout-green-dark transition-all cursor-pointer shrink-0 self-start sm:self-auto"
                            >
                                <Plus size={15} />
                                <span>{censimentoSubTab === 'attivi' ? 'Nuovo Membro Attivo' : 'Aggiungi Capo Storico'}</span>
                            </button>
                        )}
                    </div>

                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        {censimentoSubTab === 'attivi' 
                            ? "Capi attualmente in servizio, proposti di default per l'appello presenze nei nuovi verbali."
                            : "Capi che hanno concluso il servizio. I loro nomi sono preservati in tutti i verbali passati e nelle statistiche storiche."}
                    </p>

                    {isAdding && (
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border-2 border-scout-green shadow-lg space-y-4 max-w-2xl animate-in fade-in duration-200">
                            <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                                {editingId ? 'Modifica Membro Censito' : (censimentoSubTab === 'attivi' ? 'Aggiungi Nuovo Membro Attivo' : 'Aggiungi Capo Storico')}
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
                        ) : displayedMembri.length === 0 ? (
                            <div className="col-span-full bg-white dark:bg-gray-800 p-8 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 text-center text-gray-400 text-xs font-medium">
                                {censimentoSubTab === 'attivi'
                                    ? 'Nessun membro attivo censito. Clicca su "Nuovo Membro Attivo" per iniziare.'
                                    : 'Nessun capo storico o concluso archiviato.'}
                            </div>
                        ) : (
                            displayedMembri.map(m => (
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
                                            m.attivo === false ? "bg-gray-400 dark:bg-gray-600" :
                                            m.branca === 'COCA' ? 'bg-scout-brown' : 
                                            m.branca === 'L/C' ? 'bg-yellow-400 text-gray-900' : 
                                            m.branca === 'E/G' ? 'bg-scout-green' : 'bg-scout-red'
                                        )}>
                                            {m.nome.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <p className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm truncate">{m.nome}</p>
                                                {m.attivo === false && (
                                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                                                        Storico
                                                    </span>
                                                )}
                                            </div>
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

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        {censimentoSubTab === 'attivi' ? (
                                            <button 
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); handleSoftDelete(m); }}
                                                className="p-1.5 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                                title="Archivia come Capo Storico (conserva verbali e presenze)"
                                            >
                                                <Archive size={16} />
                                            </button>
                                        ) : (
                                            <>
                                                <button 
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleReactivate(m); }}
                                                    className="p-1.5 text-scout-green hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all cursor-pointer"
                                                    title="Riattiva nel Censimento Attivo"
                                                >
                                                    <RotateCcw size={16} />
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleHardDelete(m); }}
                                                    className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                                    title="Elimina definitivamente"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
                                        )}
                                    </div>
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
