import { supabase } from './supabase';
import { BilancioMovimento, BrancaType } from '@/types';
import { getUser } from './data';

/**
 * Recupera tutti i movimenti di bilancio associati al gruppo dell'utente corrente.
 */
export async function getMovimenti(): Promise<BilancioMovimento[]> {
    try {
        const currentUser = await getUser();
        if (!currentUser.groupId) return [];

        const { data, error } = await supabase
            .from('bilancio')
            .select('*')
            .eq('group_id', currentUser.groupId)
            .order('data', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapDbMovimentoToMovimento);
    } catch (error) {
        console.error('Error fetching budget movements:', error);
        return [];
    }
}

/**
 * Aggiunge un nuovo movimento di bilancio.
 */
export async function addMovimento(
    movimento: Omit<BilancioMovimento, 'id' | 'groupId' | 'createdBy' | 'createdAt'>
): Promise<BilancioMovimento | null> {
    try {
        const currentUser = await getUser();
        if (!currentUser.groupId) throw new Error('Utente non associato a un gruppo scout');

        const { data, error } = await supabase
            .from('bilancio')
            .insert({
                group_id: currentUser.groupId,
                titolo: movimento.titolo.trim(),
                importo: movimento.importo,
                tipo: movimento.tipo,
                branca: movimento.branca,
                categoria: movimento.categoria || 'Altro',
                data: movimento.data,
                note: (movimento.note || '').trim(),
                created_by: currentUser.id
            })
            .select()
            .single();

        if (error) throw error;
        return mapDbMovimentoToMovimento(data);
    } catch (error) {
        console.error('Error adding budget movement:', error);
        return null;
    }
}

/**
 * Aggiorna un movimento di bilancio esistente.
 */
export async function updateMovimento(movimento: BilancioMovimento): Promise<BilancioMovimento | null> {
    try {
        const { data, error } = await supabase
            .from('bilancio')
            .update({
                titolo: movimento.titolo.trim(),
                importo: movimento.importo,
                tipo: movimento.tipo,
                branca: movimento.branca,
                categoria: movimento.categoria || 'Altro',
                data: movimento.data,
                note: (movimento.note || '').trim()
            })
            .eq('id', movimento.id)
            .select()
            .single();

        if (error) throw error;
        return mapDbMovimentoToMovimento(data);
    } catch (error) {
        console.error('Error updating budget movement:', error);
        return null;
    }
}

/**
 * Elimina un movimento di bilancio.
 */
export async function deleteMovimento(id: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('bilancio')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting budget movement:', error);
        return false;
    }
}

/**
 * Helper per mappare la riga del database al tipo TypeScript BilancioMovimento
 */
function mapDbMovimentoToMovimento(row: any): BilancioMovimento {
    return {
        id: row.id,
        groupId: row.group_id,
        titolo: row.titolo,
        importo: Number(row.importo),
        tipo: row.tipo,
        branca: row.branca as BrancaType,
        categoria: row.categoria,
        data: row.data,
        note: row.note,
        createdBy: row.created_by,
        createdAt: row.created_at
    };
}
