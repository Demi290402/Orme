import { Proposal, Location } from '@/types';
import { getLocations, getUser } from './data';
import { addPoints } from './gamification';

// In a real app, this would be in a database.
// Storing proposals in localStorage for the demo.
export function getProposals(): Proposal[] {
    const stored = localStorage.getItem('orme_proposals');
    return stored ? JSON.parse(stored) : [];
}

export function createProposal(
    type: 'update' | 'delete',
    locationId: string,
    locationName: string,
    changes?: Partial<Location>
) {
    const proposals = getProposals();
    const newProposal: Proposal = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        locationId,
        locationName,
        proposerId: getUser().id, // Mocking current user as proposer
        timestamp: new Date().toISOString(),
        changes,
        approvals: [],
        status: 'pending'
    };
    proposals.push(newProposal);
    localStorage.setItem('orme_proposals', JSON.stringify(proposals));
    return newProposal;
}

export function approveProposal(proposalId: string, approverId: string) {
    const proposals = getProposals();
    const proposalIndex = proposals.findIndex(p => p.id === proposalId);

    if (proposalIndex === -1) return;
    const proposal = proposals[proposalIndex];

    if (proposal.approvals.includes(approverId)) {
        alert("Hai già approvato questa proposta.");
        return;
    }

    proposal.approvals.push(approverId);

    // Reward for approving (Mock logic: "2 fastest chiefs")
    addPoints(10);

    if (proposal.approvals.length >= 2) {
        proposal.status = 'approved';
        applyProposal(proposal);
    }

    localStorage.setItem('orme_proposals', JSON.stringify(proposals));
    return proposal;
}

function applyProposal(proposal: Proposal) {
    const locations = getLocations();

    if (proposal.type === 'delete') {
        const newLocations = locations.filter(l => l.id !== proposal.locationId);
        localStorage.setItem('orme_locations', JSON.stringify(newLocations));

        // Reward proposer
        addPoints(5); // Consolation points? user didn't specify points for deleting, assuming some logic.
        alert(`Il luogo "${proposal.locationName}" è stato eliminato definitivamente.`);
    } else if (proposal.type === 'update' && proposal.changes) {
        const locIndex = locations.findIndex(l => l.id === proposal.locationId);
        if (locIndex !== -1) {
            locations[locIndex] = { ...locations[locIndex], ...proposal.changes, lastUpdatedAt: new Date().toISOString(), lastUpdatedBy: proposal.proposerId };
            localStorage.setItem('orme_locations', JSON.stringify(locations));

            // Reward proposer
            addPoints(10);
            alert(`Le modifiche a "${proposal.locationName}" sono state applicate!`);
        }
    }
}
