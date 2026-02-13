import { useEffect, useState } from 'react';
import { getProposals, approveProposal } from '@/lib/proposals';
import { Proposal } from '@/types';
import { Check, Trash2 } from 'lucide-react';
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
    hasGreenSpace: 'Spazi Verdi',
    hasCookware: 'Pentolame',
    hasPoles: 'Paletti',
    otherLogistics: 'Altra Logistica',
    quickNote: 'Nota Rapida',
    description: 'Descrizione',
    activities: 'Attività',
    restrictions: 'Restrizioni',
    coordinates: 'Coordinate'
};

export default function Proposals() {
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const currentUser = getUser();

    useEffect(() => {
        // Filter only pending proposals
        setProposals(getProposals().filter(p => p.status === 'pending'));
    }, []);

    const handleApprove = (id: string) => {
        const updated = approveProposal(id, currentUser.id); // Validating as current user
        if (updated && updated.status === 'approved') {
            // Remove from list if fully approved
            setProposals(prev => prev.filter(p => p.id !== id));
        } else if (updated) {
            // Force refresh to show approval count
            setProposals(getProposals().filter(p => p.status === 'pending'));
            alert(`Approvato! (${updated.approvals.length}/2)`);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <h1 className="text-2xl font-bold text-scout-green">Proposte in Attesa</h1>

            {proposals.length === 0 && (
                <p className="text-gray-500 text-center py-10">Nessuna proposta in attesa.</p>
            )}

            <div className="space-y-4">
                {proposals.map(proposal => (
                    <div key={proposal.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                        {/* Banner for Delete Type */}
                        {proposal.type === 'delete' && (
                            <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-xs font-bold px-4 py-1 text-center">
                                RICHIESTA ELIMINAZIONE
                            </div>
                        )}

                        <div className="mt-4 mb-4">
                            <h3 className="font-bold text-lg mb-1">{proposal.locationName}</h3>
                            <p className="text-xs text-gray-400 mb-4">{new Date(proposal.timestamp).toLocaleDateString()} - ID: {proposal.proposerId}</p>


                            {proposal.type === 'update' && proposal.changes && (
                                <div className="bg-gray-50 p-4 rounded-xl text-sm space-y-3 border border-gray-100">
                                    <h4 className="font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-2">Modifiche Proposte:</h4>
                                    {Object.entries(proposal.changes).map(([key, value]) => {
                                        // Skip internal fields if needed, match fields with friendly names
                                        const label = FIELD_NAMES[key] || key;

                                        // Format value for display (handle arrays/booleans)
                                        let displayValue = String(value);
                                        if (typeof value === 'boolean') displayValue = value ? 'Sì' : 'No';
                                        if (Array.isArray(value)) displayValue = value.join(', ');
                                        if (key === 'coordinates' && value) displayValue = `${(value as any).lat}, ${(value as any).lng}`;

                                        return (
                                            <div key={key} className="grid grid-cols-3 gap-2 items-center">
                                                <span className="font-medium text-gray-600 col-span-1">{label}</span>
                                                <div className="col-span-2 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 text-indigo-700 font-medium shadow-sm flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                    {displayValue || <span className="text-gray-400 italic">Vuoto</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {proposal.type === 'delete' && (
                                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-xl">
                                    <Trash2 size={20} />
                                    <span className="font-semibold">Si richiede la cancellazione definitiva di questo luogo.</span>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-400 hover:bg-gray-50">
                                Rifiuta
                            </button>
                            <button
                                onClick={() => handleApprove(proposal.id)}
                                className="flex-[2] py-3 bg-scout-green text-white rounded-xl font-bold shadow-md hover:bg-scout-green-dark flex items-center justify-center gap-2"
                            >
                                <Check size={20} />
                                Approva ({proposal.approvals.length}/2)
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
