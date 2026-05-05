import { supabase } from './supabase';
import { getUser } from './data';
import { createNotificationsForGroup } from './notifications';

export interface Annuncio {
    id: string;
    groupId: string;
    autoreId: string;
    testo: string;
    priorita: 'normale' | 'importante' | 'urgente';
    scadenza?: string;
    createdAt: string;
    updatedAt: string;
    // joined fields
    autoreNome?: string;
    autoreAvatar?: string;
    autoreNickname?: string;
}

function mapAnnuncio(row: any): Annuncio {
    return {
        id: row.id,
        groupId: row.group_id,
        autoreId: row.autore_id,
        testo: row.testo,
        priorita: row.priorita || 'normale',
        scadenza: row.scadenza,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        autoreNome: row.users?.first_name ? `${row.users.first_name} ${row.users.last_name || ''}`.trim() : undefined,
        autoreNickname: row.users?.nickname,
        autoreAvatar: row.users?.profile_picture,
    };
}

export async function getAnnunci(): Promise<Annuncio[]> {
    const user = await getUser();
    if (!user.groupId) return [];

    const { data, error } = await supabase
        .from('annunci')
        .select(`
            *,
            users (
                first_name,
                last_name,
                nickname,
                profile_picture
            )
        `)
        .eq('group_id', user.groupId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('getAnnunci error:', error);
        return [];
    }

    // Filter out expired announcements
    const today = new Date().toISOString().split('T')[0];
    return data
        .map(mapAnnuncio)
        .filter(a => !a.scadenza || a.scadenza >= today);
}

export async function salvaAnnuncio(annuncio: Partial<Annuncio>): Promise<Annuncio> {
    const user = await getUser();
    if (!user.groupId) throw new Error('groupId mancante');

    const payload = {
        group_id: user.groupId,
        testo: annuncio.testo,
        priorita: annuncio.priorita || 'normale',
        scadenza: annuncio.scadenza || null,
        updated_at: new Date().toISOString(),
    };

    if (annuncio.id) {
        // Update
        const { data, error } = await supabase
            .from('annunci')
            .update(payload)
            .eq('id', annuncio.id)
            .select('*, users(first_name, last_name, nickname, profile_picture)')
            .single();

        if (error) throw error;
        
        // Push notification on important changes
        if (payload.priorita !== 'normale') {
           createNotificationsForGroup(
               user.groupId,
               'annuncio',
               `📢 Annuncio aggiornato: ${payload.priorita.toUpperCase()}`,
               `${user.nickname || user.firstName} ha aggiornato un annuncio in bacheca.`,
               { annuncioId: data.id },
               user.id
           ).catch(console.error);
        }
        
        return mapAnnuncio(data);
    } else {
        // Insert
        const { data, error } = await supabase
            .from('annunci')
            .insert({ ...payload, autore_id: user.id })
            .select('*, users(first_name, last_name, nickname, profile_picture)')
            .single();

        if (error) throw error;

        // Sempre notifica per nuovo annuncio
        const emoji = payload.priorita === 'urgente' ? '🚨' : payload.priorita === 'importante' ? '⚠️' : '📢';
        createNotificationsForGroup(
            user.groupId,
            'annuncio',
            `${emoji} Nuovo annuncio in Bacheca`,
            `${user.nickname || user.firstName} ha pubblicato un nuovo annuncio.`,
            { annuncioId: data.id },
            user.id
        ).catch(console.error);

        return mapAnnuncio(data);
    }
}

export async function eliminaAnnuncio(id: string): Promise<void> {
    const { error } = await supabase
        .from('annunci')
        .delete()
        .eq('id', id);

    if (error) throw error;
}
