import { useEffect, useState } from 'react';
import { getProposals, approveProposal, rejectProposal } from '@/lib/proposals';
import { Proposal } from '@/types';
import { Check, Trash2, X } from 'lucide-react';
import { getUser } from '@/lib/data';

// Helper for field names
const FIELD_NAMES: Record<string, string> = {
    name: 'Nome Luogo',
    region: 'Regione',
    commune: 'Comune/Provincia',
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
    otherLogistics: 'Altre Note Logistiche',
    roverServiceDescription: 'Servizio RS Dettagli',
    otherRestrictions: 'Altre Restrizioni',
    description: 'Descrizione'
};

export default function Proposals() {
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const [data, user] = await Promise.all([getProposals(), getUser()]);
            setProposals(data);
            setCurrentUser(user);
            setLoading(false);
        };
        load();
    }, []);

    const handleApprove = async (id: string, proposerId: string) => {
        if (proposerId === currentUser?.id) {
            alert("Non puoi approvare la tua stessa proposta.");
            return;
        }
        await approveProposal(id, currentUser.id);
        const data = await getProposals();
        setProposals(data);
    };

    const handleReject = async (id: string, proposerId: string) => {
        if (proposerId === currentUser?.id) {
            alert("Non puoi rigettare la tua stessa proposta.");
            return;
        }
        await rejectProposal(id, currentUser.id);
        const data = await getProposals();
        setProposals(data);
    };

    if (loading) return <div className="p-6">Caricamento proposte...</div>;

    return (
        <div className="pb-20 p-6">
            <h1 className="text-2xl font-bold mb-6">Proposte di Modifica</h1>

            <div className="space-y-6">
                {proposals.length === 0 && (
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center">
                        <p className="text-gray-500 italic">Nessuna proposta in attesa di approvazione.</p>
                    </div>
                )}

                {proposals.map((proposal) => (
                    <div key={proposal.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 inline-block ${proposal.type === 'delete' ? 'bg-red-50 text-red-600' : 'bg-scout-blue/10 text-scout-blue'
                                    }`}>
                                    {proposal.type === 'delete' ? 'Richiesta Eliminazione' : 'Proposta Modifica'}
                                </span>
                                <h3 className="text-lg font-bold">{proposal.locationName}</h3>
                                <p className="text-sm text-gray-400">Proposto da: {proposal.proposerId}</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                            {proposal.type === 'update' && proposal.changes ? (
                                Object.entries(proposal.changes).map(([key, value]) => {
                                    if (key === 'lastUpdatedAt' || key === 'lastUpdatedBy') return null;
                                    return (
                                        <div key={key} className="flex flex-col text-sm">
                                            <span className="text-gray-400 text-xs">{FIELD_NAMES[key] || key}:</span>
                                            <span className="font-medium text-gray-800">
                                                {typeof value === 'boolean' ? (value ? '✅ Sì' : '❌ No') : String(value)}
                                            </span>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex items-center gap-2 text-red-600">
                                    <Trash2 size={16} />
                                    <span className="font-semibold">Si richiede la cancellazione definitiva di questo luogo.</span>
                                </div>
                            )}
                        </div>

                        {proposal.status === 'pending' && (
                            <div className="flex gap-3">
                                {proposal.proposerId !== currentUser?.id ? (
                                    <>
                                        <button
                                            onClick={() => handleReject(proposal.id, proposal.proposerId)}
                                            className="flex-1 py-3 border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 flex items-center justify-center gap-2"
                                        >
                                            <X size={20} />
                                            Rifiuta ({proposal.rejections.length}/2)
                                        </button>
                                        <button
                                            onClick={() => handleApprove(proposal.id, proposal.proposerId)}
                                            className="flex-[2] py-3 bg-scout-green text-white rounded-xl font-bold shadow-md hover:bg-scout-green-dark flex items-center justify-center gap-2"
                                        >
                                            <Check size={20} />
                                            Approva ({proposal.approvals.length}/2)
                                        </button>
                                    </>
                                ) : (
                                    <div className="w-full py-3 bg-gray-50 text-gray-500 rounded-xl font-medium text-center italic">
                                        In attesa di altri 2 capi (non puoi auto-approvarti)
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
