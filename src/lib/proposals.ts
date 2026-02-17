import { supabase } from './supabase';
import { Proposal, Location } from '@/types';
import { getUser } from './data';
import { addPoints, addPointsToUser } from './gamification';

// =====================================================
// PROPOSALS MANAGEMENT (Supabase)
// =====================================================

export async function getProposals(): Promise<Proposal[]> {
    const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching proposals:', error);
        return [];
    }

    return data.map(mapSupabaseProposalToProposal);
}

export async function createProposal(
    type: 'update' | 'delete',
    locationId: string,
    locationName: string,
    changes?: Partial<Location>
): Promise<Proposal | null> {
    try {
        const currentUser = await getUser();

        const { data, error } = await supabase
            .from('proposals')
            .insert({
                type,
                location_id: locationId,
                location_name: locationName,
                proposer_id: currentUser.id,
                changes: changes || null,
                approvals: [],
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;

        return mapSupabaseProposalToProposal(data);
    } catch (error) {
        console.error('Error creating proposal:', error);
        return null;
    }
}

export async function rejectProposal(proposalId: string, rejecterId: string) {
    try {
        const { data: proposal, error: fetchError } = await supabase
            .from('proposals')
            .select('*')
            .eq('id', proposalId)
            .single();

        if (fetchError) throw fetchError;

        if (proposal.proposer_id === rejecterId) {
            alert("Non puoi rigettare la tua stessa proposta.");
            return;
        }

        if (proposal.rejections.includes(rejecterId)) {
            alert("Hai già rigettato questa proposta.");
            return;
        }

        const newRejections = [...proposal.rejections, rejecterId];

        const { error: updateError } = await supabase
            .from('proposals')
            .update({ rejections: newRejections })
            .eq('id', proposalId);

        if (updateError) throw updateError;

        // If 2+ rejections, reject the proposal and penalize proposer
        if (newRejections.length >= 2) {
            await supabase
                .from('proposals')
                .update({ status: 'rejected' })
                .eq('id', proposalId);

            // Penalty for proposer
            const proposer = await getUser(proposal.proposer_id);
            const penalty = 15;
            const newPoints = Math.max(0, proposer.points - penalty);

            await supabase
                .from('users')
                .update({ points: newPoints })
                .eq('id', proposer.id);

            alert(`La proposta per "${proposal.location_name}" è stata rigettata. Al proponente sono stati detratti ${penalty} punti.`);
        }

        return mapSupabaseProposalToProposal({ ...proposal, rejections: newRejections });
    } catch (error) {
        console.error('Error rejecting proposal:', error);
    }
}

export async function approveProposal(proposalId: string, approverId: string) {
    try {
        // Get the proposal
        const { data: proposal, error: fetchError } = await supabase
            .from('proposals')
            .select('*')
            .eq('id', proposalId)
            .single();

        if (fetchError) throw fetchError;

        if (proposal.proposer_id === approverId) {
            alert("Non puoi approvare la tua stessa proposta.");
            return;
        }

        if (proposal.approvals.includes(approverId)) {
            alert("Hai già approvato questa proposta.");
            return;
        }

        const newApprovals = [...proposal.approvals, approverId];

        // Update approvals
        const { error: updateError } = await supabase
            .from('proposals')
            .update({ approvals: newApprovals })
            .eq('id', proposalId);

        if (updateError) throw updateError;

        // Reward for approving
        await addPoints(5);

        // If 2+ approvals, apply the proposal
        if (newApprovals.length >= 2) {
            await supabase
                .from('proposals')
                .update({ status: 'approved' })
                .eq('id', proposalId);

            await applyProposal(mapSupabaseProposalToProposal({ ...proposal, approvals: newApprovals, status: 'approved' }));
        }

        return mapSupabaseProposalToProposal({ ...proposal, approvals: newApprovals });
    } catch (error) {
        console.error('Error approving proposal:', error);
    }
}

async function applyProposal(proposal: Proposal) {
    try {
        if (proposal.type === 'delete') {
            // Delete the location
            const { error } = await supabase
                .from('locations')
                .delete()
                .eq('id', proposal.locationId);

            if (error) throw error;

            // Reward proposer
            await addPointsToUser(proposal.proposerId, 10);
            alert(`Il luogo "${proposal.locationName}" è stato eliminato definitivamente.`);
        } else if (proposal.type === 'update' && proposal.changes) {
            // Update the location
            const { data, error } = await supabase
                .from('locations')
                .update({
                    ...convertLocationToSupabaseFormat(proposal.changes as any),
                    last_updated_at: new Date().toISOString(),
                    last_updated_by: proposal.proposerId
                })
                .eq('id', proposal.locationId)
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                console.error(`No location found with ID ${proposal.locationId} to update.`);
                throw new Error("Luogo originale non trovato. L'aggiornamento non è stato possibile.");
            }

            // Reward proposer
            await addPointsToUser(proposal.proposerId, 10);
            alert(`Le modifiche a "${proposal.locationName}" sono state applicate correttamente sul luogo esistente!`);
        }
    } catch (error) {
        console.error('Error applying proposal:', error);
    }
}

// Helper functions
function mapSupabaseProposalToProposal(data: any): Proposal {
    return {
        id: data.id,
        type: data.type,
        locationId: data.location_id,
        locationName: data.location_name,
        proposerId: data.proposer_id,
        timestamp: data.created_at,
        changes: data.changes,
        approvals: data.approvals || [],
        rejections: data.rejections || [],
        status: data.status
    };
}

function convertLocationToSupabaseFormat(location: Partial<Location>): any {
    return {
        name: location.name,
        region: location.region,
        province: location.province,
        commune: location.commune,
        address: location.address,
        contacts: location.contacts,
        activities: location.activities,
        quick_note: location.quickNote,
        google_maps_link: location.googleMapsLink,
        coordinates: location.coordinates,
        beds: location.beds,
        bathrooms: location.bathrooms,
        has_tents: location.hasTents,
        has_refectory: location.hasRefectory,
        has_rover_service: location.hasRoverService,
        has_church: location.hasChurch,
        has_green_space: location.hasGreenSpace,
        has_equipped_kitchen: location.hasEquippedKitchen,
        has_poles: location.hasPoles,
        has_pastures: location.hasPastures,
        has_insects: location.hasInsects,
        has_diseases: location.hasDiseases,
        has_little_shade: location.hasLittleShade,
        has_very_busy_area: location.hasVeryBusyArea,
        other_attention: location.otherAttention,
        other_logistics: location.otherLogistics,
        rover_service_description: location.roverServiceDescription,
        restrictions: location.restrictions,
        other_restrictions: location.otherRestrictions,
        website: location.website,
        email: location.email,
        description: location.description,
        pricing: location.pricing,
        last_updated_at: location.lastUpdatedAt,
        last_updated_by: location.lastUpdatedBy
    };
}
