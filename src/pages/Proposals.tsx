import { useEffect, useState } from 'react';
import { getProposals, approveProposal, rejectProposal } from '@/lib/proposals';
import { Proposal, Location, User } from '@/types';
import { Check, X, ArrowRight, User as UserIcon, Calendar, Info, Home, Trash, CheckCircle2 } from 'lucide-react';
import { getUser, getLocation } from '@/lib/data';

// Updated field names mapping
const FIELD_NAMES: Record<string, string> = {
    name: 'Nome Luogo',
    region: 'Regione',
    province: 'Provincia',
    commune: 'Comune',
    address: 'Indirizzo',
    phone: 'Telefono',
    whatsapp: 'WhatsApp',
    website: 'Sito Web',
    email: 'Email',
    beds: 'Posti Letto',
    bathrooms: 'Bagni',
    hasTents: 'Tende',
    hasRefectory: 'Refettorio',
    hasRoverService: 'Servizio RS',
    hasChurch: 'Chiesa',
    hasGreenSpace: 'Spazio Verde',
    hasEquippedKitchen: 'Cucina Attrezzata',
    hasPoles: 'Pali di Castagno',
    hasPastures: 'Pascoli',
    hasInsects: 'Insetti/Parassiti',
    hasDiseases: 'Malattie (es. zecche)',
    hasLittleShade: 'Poca Ombra',
    hasVeryBusyArea: 'Zona Molto Frequentata',
    otherAttention: 'Attenzioni Particolari',
    otherLogistics: 'Altre Note Logistiche',
    roverServiceDescription: 'Dettagli Servizio RS',
    restrictions: 'Restrizioni',
    otherRestrictions: 'Altre Restrizioni',
    description: 'Descrizione',
    quickNote: 'Nota Rapida',
    googleMapsLink: 'Link Google Maps',
    pricing: 'Costi/Tariffe',
    contacts: 'Contatti/Referenti',
    activities: 'Attività',
    coordinates: 'Coordinate',
    availabilityStatus: 'Stato Disponibilità'
};

export default function Proposals() {
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [usersMap, setUsersMap] = useState<Record<string, string>>({});
    const [originalLocations, setOriginalLocations] = useState<Record<string, Location | null>>({});

    useEffect(() => {
        const load = async () => {
            try {
                const [data, user] = await Promise.all([getProposals(), getUser()]);
                
                // Filter: pending always visible, others only if less than 7 days old
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                
                const filteredData = data.filter(p => {
                    if (p.status === 'pending') return true;
                    return new Date(p.timestamp) > oneWeekAgo;
                });

                setProposals(filteredData);
                setCurrentUser(user);

                // Fetch names for proposers and original locations for updates
                const uniqueProposerIds = Array.from(new Set(filteredData.map(p => p.proposerId)));
                const updateProposals = filteredData.filter(p => p.type === 'update');
                
                // Fetch users in parallel
                const userPromises = uniqueProposerIds.map(id => getUser(id).catch(() => null));
                const locationPromises = updateProposals.map(p => getLocation(p.locationId).catch(() => null));

                const [users, locations] = await Promise.all([
                    Promise.all(userPromises),
                    Promise.all(locationPromises)
                ]);

                const nameMap: Record<string, string> = {};
                users.forEach(u => {
                    if (u) {
                        nameMap[u.id] = u.nickname || `${u.firstName} ${u.lastName}`;
                    }
                });
                setUsersMap(nameMap);

                const locMap: Record<string, Location | null> = {};
                updateProposals.forEach((p, idx) => {
                    locMap[p.id] = locations[idx];
                });
                setOriginalLocations(locMap);

            } catch (err) {
                console.error("Error loading proposals content:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleApprove = async (id: string, proposerId: string) => {
        if (proposerId === currentUser?.id) {
            alert("Non puoi approvare la tua stessa proposta.");
            return;
        }
        await approveProposal(id, currentUser!.id);
        reloadProposals();
    };

    const handleReject = async (id: string, proposerId: string) => {
        if (proposerId === currentUser?.id) {
            alert("Non puoi rigettare la tua stessa proposta.");
            return;
        }
        await rejectProposal(id, currentUser!.id);
        reloadProposals();
    };

    const reloadProposals = async () => {
        const data = await getProposals();
        setProposals(data);
    };

    const formatValue = (key: string, value: any) => {
        if (value === null || value === undefined || value === '') return '-';
        if (typeof value === 'boolean') return value ? '✅ Sì' : '❌ No';
        
        if (key === 'availabilityStatus') {
            const statusMap: Record<string, string> = {
                available: 'Disponibile',
                booked: 'Prenotato',
                maintenance: 'In Manutenzione',
                unavailable: 'Non Disponibile'
            };
            return statusMap[value] || value;
        }

        if (key === 'contacts' && Array.isArray(value)) {
            return (
                <div className="space-y-1">
                    {value.map((c, i) => (
                        <div key={i} className="text-xs border-l-2 border-scout-blue/20 pl-2">
                            <span className="font-bold">{c.name || 'Referente'}:</span> {c.value} ({c.type})
                        </div>
                    ))}
                </div>
            );
        }
        if (key === 'pricing' && typeof value === 'object') {
            return `${value.basePrice}€ ${value.unit === 'per_night' ? '/notte' : '/giorno'} - ${value.description || ''}`;
        }
        return String(value);
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-scout-green border-t-transparent"></div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Sincronizzazione proposte...</p>
            </div>
        </div>
    );

    return (
        <div className="pb-24 p-4 md:p-8 max-w-4xl mx-auto">
            <header className="mb-10">
                <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Approvazione Modifiche</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Revisiona i contributi della CoCa per mantenere i dati affidabili.</p>
            </header>

            <div className="grid gap-8">
                {proposals.length === 0 && (
                    <div className="bg-white dark:bg-gray-800 p-12 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-700 text-center shadow-sm">
                        <div className="bg-gray-50 dark:bg-gray-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check className="text-gray-300 dark:text-gray-500" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Tutto in ordine!</h3>
                        <p className="text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto">Non ci sono proposte in attesa di revisione al momento.</p>
                    </div>
                )}

                {proposals.map((proposal) => {
                    const originalLocation = originalLocations[proposal.id];
                    const proposerName = usersMap[proposal.proposerId] || "Caricamento...";
                    const isDelete = proposal.type === 'delete';
                    const isPending = proposal.status === 'pending';
                    const isApproved = proposal.status === 'approved';
                    const isRejected = proposal.status === 'rejected';

                    return (
                        <div key={proposal.id} className={`group bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl overflow-hidden border-2 transition-all hover:translate-y-[-4px] ${
                            isDelete ? 'border-red-100 dark:border-red-900/30' : 
                            isApproved ? 'border-scout-green/20' :
                            isRejected ? 'border-red-200' :
                            'border-scout-blue/5 dark:border-gray-700'
                        }`}>
                            {/* Proposer Header */}
                            <div className={`px-6 py-4 flex items-center justify-between ${
                                isApproved ? 'bg-scout-green/5' : 
                                isRejected ? 'bg-red-50/50' : 
                                'bg-gray-50/50 dark:bg-gray-700/50'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full shadow-sm flex items-center justify-center border ${
                                        isApproved ? 'bg-scout-green text-white border-scout-green' :
                                        isRejected ? 'bg-red-500 text-white border-red-500' :
                                        'bg-white dark:bg-gray-700 text-scout-blue border-gray-100 dark:border-gray-600'
                                    }`}>
                                        {isApproved ? <Check size={18} /> : isRejected ? <X size={18} /> : <UserIcon size={18} />}
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest">
                                            {isApproved ? 'Approvata da CoCa' : isRejected ? 'Rifiutata da CoCa' : 'Proposta di'}
                                        </p>
                                        <p className="text-sm font-black text-gray-800 dark:text-gray-100">
                                            {isPending ? proposerName : (isApproved ? 'Modifica Applicata' : 'Modifica Respinta')}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest leading-none mb-1">
                                        {isPending ? 'Data Invio' : 'Stato'}
                                    </p>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                                        isApproved ? 'bg-scout-green/20 text-scout-green-dark' :
                                        isRejected ? 'bg-red-100 text-red-600' :
                                        'bg-scout-blue/10 text-scout-blue'
                                    }`}>
                                        {isApproved ? 'Completata' : isRejected ? 'Rifiutata' : new Date(proposal.timestamp).toLocaleDateString('it-IT')}
                                    </span>
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="p-6">
                                <div className="flex items-start gap-4 mb-8">
                                    <div className={`p-4 rounded-3xl ${isDelete ? 'bg-red-50 text-red-600 shadow-inner' : 'bg-scout-blue/10 text-scout-blue shadow-inner'}`}>
                                        {isDelete ? <Trash size={28} /> : <Home size={28} />}
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 leading-none mb-2">{proposal.locationName}</h2>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm ${isDelete ? 'bg-red-600 text-white' : 'bg-scout-blue text-white'}`}>
                                                {isDelete ? 'Eliminazione Luogo' : 'Modifica Dati'}
                                            </span>
                                            {isPending && proposal.proposerId === currentUser?.id && (
                                                <span className="text-[10px] font-bold text-gray-400 italic">In attesa dei tuoi capi</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Comparison Table */}
                                <div className="space-y-4">
                                    {!isDelete && proposal.changes ? (
                                        <div className="grid gap-3">
                                            {Object.entries(proposal.changes).map(([key, value]) => {
                                                if (key === 'lastUpdatedAt' || key === 'lastUpdatedBy') return null;
                                                const oldValue = originalLocation ? (originalLocation as any)[key] : null;

                                                // Only show if different
                                                const hasChanged = JSON.stringify(oldValue) !== JSON.stringify(value);
                                                if (!hasChanged) return null;

                                                return (
                                                    <div key={key} className="bg-gray-50/50 dark:bg-gray-700/20 p-5 rounded-3xl border border-gray-100 dark:border-gray-700">
                                                        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 mb-3">
                                                            <Info size={14} />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">{FIELD_NAMES[key] || key}</span>
                                                        </div>
                                                        <div className="flex flex-col gap-3">
                                                            <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl text-xs text-gray-400 line-through border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                                                <span className="truncate">{formatValue(key, oldValue)}</span>
                                                                <span className="text-[8px] font-black uppercase opacity-40 ml-2">Precedente</span>
                                                            </div>
                                                            <div className="flex justify-center -my-2 z-10">
                                                                <div className="bg-scout-blue text-white p-1 rounded-full shadow-lg">
                                                                    <ArrowRight size={14} className="rotate-90 sm:rotate-0" />
                                                                </div>
                                                            </div>
                                                            <div className="bg-scout-green/5 dark:bg-scout-green/10 p-4 rounded-2xl text-sm font-bold text-scout-green-dark dark:text-scout-green border-2 border-scout-green/20 flex items-center justify-between">
                                                                <span>{formatValue(key, value)}</span>
                                                                <span className="text-[8px] font-black uppercase opacity-60 ml-2">Proposto</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : isDelete ? (
                                        <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-[2rem] border-2 border-red-100 dark:border-red-900/30 flex flex-col items-center text-center gap-4">
                                            <div className="bg-red-600 w-16 h-16 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-red-200">
                                                <X size={32} strokeWidth={3} />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-red-600 uppercase tracking-tighter text-lg">Richiesta di Rimozione</h3>
                                                <p className="text-red-700/70 dark:text-red-400 text-sm mt-1 max-w-xs font-medium">
                                                    Si propone di eliminare definitivamente questo luogo. Proseguire solo se il luogo è errato o non più esistente.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center p-8 text-gray-400 italic font-serif">Nessun cambio rilevato</div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="px-6 pb-8">
                                {isPending ? (
                                    <div className="flex flex-col sm:flex-row gap-4 pt-2">
                                        {proposal.proposerId !== currentUser?.id ? (
                                            <>
                                                <button
                                                    onClick={() => handleReject(proposal.id, proposal.proposerId)}
                                                    className="flex-1 py-4 px-6 bg-white dark:bg-gray-800 border-2 border-red-100 dark:border-red-900 text-red-600 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-3"
                                                >
                                                    <X size={20} strokeWidth={3} />
                                                    Rifiuta ({proposal.rejections.length}/2)
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(proposal.id, proposal.proposerId)}
                                                    className="flex-[2] py-4 px-6 bg-scout-green text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all hover:bg-scout-green-dark hover:scale-[1.02] active:scale-95 shadow-xl shadow-scout-green/30 flex items-center justify-center gap-3"
                                                >
                                                    <Check size={20} strokeWidth={3} />
                                                    Approva e Applica ({proposal.approvals.length}/2)
                                                </button>
                                            </>
                                        ) : (
                                            <div className="w-full py-5 px-6 bg-gray-50 dark:bg-gray-700/50 border-2 border-dashed border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 rounded-[1.5rem] font-bold text-sm text-center flex flex-col items-center gap-2">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={18} />
                                                    <span>In attesa di revisione da altri capi</span>
                                                </div>
                                                <p className="text-[10px] font-medium opacity-60 uppercase tracking-widest">Ti verranno assegnati 10 punti ad approvazione completata</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className={`mt-2 py-4 px-6 rounded-2xl border flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest ${
                                        isApproved ? 'bg-scout-green/10 border-scout-green/20 text-scout-green-dark' : 'bg-red-50 border-red-100 text-red-600'
                                    }`}>
                                        {isApproved ? <CheckCircle2 size={16} /> : <X size={16} />}
                                        Modifica {isApproved ? 'Accettata e Archiviata' : 'Rifiutata e Archiviata'}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

