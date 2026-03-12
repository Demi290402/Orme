import { useEffect, useState } from 'react';
import { getProposals, approveProposal, rejectProposal } from '@/lib/proposals';
import { Proposal, Location, User } from '@/types';
import { Check, X, ArrowRight, User as UserIcon, Calendar, Info, Home, Trash } from 'lucide-react';
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
    otherLogistics: 'Altre Note Logistiche',
    roverServiceDescription: 'Dettagli Servizio RS',
    otherRestrictions: 'Altre Restrizioni',
    description: 'Descrizione',
    quickNote: 'Nota Rapida',
    googleMapsLink: 'Link Google Maps',
    pricing: 'Costi/Tariffe',
    contacts: 'Contatti/Referenti'
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
                setProposals(data);
                setCurrentUser(user);

                // Fetch names for proposers and original locations for updates
                const uniqueProposerIds = Array.from(new Set(data.map(p => p.proposerId)));
                const updateProposals = data.filter(p => p.type === 'update');
                
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
        if (value === null || value === undefined) return '-';
        if (typeof value === 'boolean') return value ? '✅ Sì' : '❌ No';
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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-scout-green border-t-transparent"></div>
                <p className="text-gray-500 font-medium">Sincronizzazione proposte...</p>
            </div>
        </div>
    );

    return (
        <div className="pb-24 p-4 md:p-8 max-w-4xl mx-auto">
            <header className="mb-10">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Approvazione Modifiche</h1>
                <p className="text-gray-500 mt-2">Revisiona i contributi della CoCa per mantenere i dati affidabili.</p>
            </header>

            <div className="grid gap-8">
                {proposals.length === 0 && (
                    <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-gray-100 text-center shadow-sm">
                        <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check className="text-gray-300" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">Tutto in ordine!</h3>
                        <p className="text-gray-400 mt-1 max-w-xs mx-auto">Non ci sono proposte in attesa di revisione al momento.</p>
                    </div>
                )}

                {proposals.map((proposal) => {
                    const originalLocation = originalLocations[proposal.id];
                    const proposerName = usersMap[proposal.proposerId] || "Caricamento...";
                    const isDelete = proposal.type === 'delete';

                    return (
                        <div key={proposal.id} className={`group bg-white rounded-[2rem] shadow-xl shadow-gray-100 overflow-hidden border-2 transition-all hover:shadow-2xl hover:shadow-gray-200 ${isDelete ? 'border-red-100' : 'border-scout-blue/5'}`}>
                            {/* Proposer Header */}
                            <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-scout-blue border border-gray-100">
                                        <UserIcon size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Proposto da</p>
                                        <p className="text-sm font-black text-gray-800">{proposerName}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">Data Richiesta</p>
                                    <p className="text-xs font-semibold text-gray-500">{new Date(proposal.timestamp).toLocaleDateString('it-IT')}</p>
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="p-6">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className={`p-3 rounded-2xl ${isDelete ? 'bg-red-50 text-red-600' : 'bg-scout-blue/10 text-scout-blue'}`}>
                                        {isDelete ? <Trash size={24} /> : <Home size={24} />}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900 leading-tight">{proposal.locationName}</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${isDelete ? 'bg-red-600 text-white' : 'bg-scout-blue text-white'}`}>
                                                {isDelete ? 'Eliminazione' : 'Aggiornamento'}
                                            </span>
                                            {isDelete && <span className="text-xs text-red-600 font-bold italic underline decoration-red-200">Azione distruttiva</span>}
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
                                                    <div key={key} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
                                                        <div className="sm:w-1/3">
                                                            <div className="flex items-center gap-2 text-gray-400 mb-1 sm:mb-0">
                                                                <Info size={14} />
                                                                <span className="text-[10px] font-black uppercase tracking-wider">{FIELD_NAMES[key] || key}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 flex items-center gap-2 overflow-hidden">
                                                            <div className="flex-1 min-w-0 bg-white p-2 rounded-lg text-xs text-gray-400 line-through truncate border border-gray-50">
                                                                {formatValue(key, oldValue)}
                                                            </div>
                                                            <div className="text-scout-blue shrink-0">
                                                                <ArrowRight size={16} />
                                                            </div>
                                                            <div className="flex-1 min-w-0 bg-scout-green/5 p-2 rounded-lg text-sm font-bold text-scout-green-dark border border-scout-green/10">
                                                                {formatValue(key, value)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : isDelete ? (
                                        <div className="bg-red-50 p-6 rounded-3xl border border-red-100 flex items-center gap-4">
                                            <div className="bg-white w-12 h-12 rounded-2xl flex items-center justify-center text-red-600 shadow-sm border border-red-50">
                                                <X size={24} />
                                            </div>
                                            <p className="text-red-700 font-medium leading-snug">
                                                L'utente richiede la rimozione completa di questo database. <br/>
                                                <span className="text-xs opacity-75 font-normal">Assicurati che il luogo non esista più o sia un duplicato.</span>
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="text-center p-8 text-gray-400 italic">Dati non disponibili</div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="px-6 py-6 bg-gray-50/50 border-t border-gray-100">
                                {proposal.status === 'pending' && (
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        {proposal.proposerId !== currentUser?.id ? (
                                            <>
                                                <button
                                                    onClick={() => handleReject(proposal.id, proposal.proposerId)}
                                                    className="flex-1 py-4 px-6 bg-white border-2 border-red-50 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-red-600 hover:text-white hover:border-red-600 shadow-sm hover:shadow-red-200/50 flex items-center justify-center gap-3"
                                                >
                                                    <X size={18} strokeWidth={3} />
                                                    Rifiuta ({proposal.rejections.length}/2)
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(proposal.id, proposal.proposerId)}
                                                    className="flex-[2] py-4 px-6 bg-scout-green text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-scout-green-dark shadow-lg shadow-scout-green/30 hover:shadow-scout-green/50 flex items-center justify-center gap-3"
                                                >
                                                    <Check size={18} strokeWidth={3} />
                                                    Approva ({proposal.approvals.length}/2)
                                                </button>
                                            </>
                                        ) : (
                                            <div className="w-full py-4 px-6 bg-white border-2 border-dashed border-gray-200 text-gray-400 rounded-2xl font-bold text-sm text-center flex items-center justify-center gap-3">
                                                <Calendar size={18} />
                                                In attesa di approvazione da altri capi
                                            </div>
                                        )}
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

