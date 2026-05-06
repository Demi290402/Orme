import { supabase } from './supabase';
import { getUser } from './data';

export interface EventoStorico {
    id: string;
    groupId: string;
    annoScout: number; // e.g., 2024
    branca: string;
    tipoEvento: string;
    luogoNome: string;
    dataInizio: string;
    dataFine?: string;
    autoreId?: string;
    autoreNome?: string;
    autoreAvatar?: string;
    createdAt: string;
}

function mapRow(row: any): EventoStorico {
    return {
        id: row.id,
        groupId: row.group_id,
        annoScout: row.anno_scout,
        branca: row.branca,
        tipoEvento: row.tipo_evento,
        luogoNome: row.luogo_nome,
        dataInizio: row.data_inizio,
        dataFine: row.data_fine,
        autoreId: row.autore_id,
        autoreNome: row.autore?.nickname || (row.autore?.first_name ? `${row.autore.first_name} ${row.autore.last_name || ''}`.trim() : null),
        autoreAvatar: row.autore?.profile_picture,
        createdAt: row.created_at
    };
}

export async function getStorico(): Promise<EventoStorico[]> {
    try {
        const usr = await getUser();
        if (!usr || !usr.groupId) {
            console.warn('DEBUG: getStorico: User or Group ID not found', usr);
            return [];
        }
        console.log('DEBUG: Fetching storico for groupId:', usr.groupId);

        const { data, error } = await supabase
            .from('storico_eventi')
            .select(`
                *,
                autore:users(first_name, last_name, nickname, profile_picture)
            `)
            .eq('group_id', usr.groupId.toString().trim())
            .order('data_inizio', { ascending: false });
            
        if (error) {
            console.error('DEBUG: Supabase error in getStorico:', error);
            return [];
        }

        console.log('DEBUG: Raw data received from Supabase:', data);
        
        const mapped = (data || []).map(mapRow);
        console.log('DEBUG: Mapped events:', mapped);
        
        return mapped;
    } catch (err) {
        console.error('DEBUG: getStorico: Unexpected error', err);
        return [];
    }
}

export async function getStoricoRaw(): Promise<EventoStorico[]> {
    console.log('DEBUG: Running RAW query (no joins, no filters)...');
    const { data, error } = await supabase
        .from('storico_eventi')
        .select('*');
        
    if (error) {
        console.error('DEBUG: Supabase error in getStoricoRaw:', error);
        return [];
    }
    console.log('DEBUG: Raw diagnosis response:', data);
    return (data || []).map(mapRow);
}

export async function salvaEventoStorico(evento: Partial<EventoStorico>): Promise<void> {
    const usr = await getUser();
    if (!usr || !usr.groupId) throw new Error('Utente non autorizzato o gruppo non trovato');
    
    const record = {
        group_id: usr.groupId.toString(),
        anno_scout: evento.annoScout,
        branca: evento.branca,
        tipo_evento: evento.tipoEvento,
        luogo_nome: evento.luogoNome,
        data_inizio: evento.dataInizio,
        data_fine: evento.dataFine || null,
        ...(evento.id ? {} : { autore_id: usr.id })
    };

    if (evento.id) {
        const { error } = await supabase.from('storico_eventi').update(record).eq('id', evento.id);
        if (error) throw error;
    } else {
        const { error } = await supabase.from('storico_eventi').insert(record);
        if (error) throw error;
    }
}

export async function eliminaEventoStorico(id: string): Promise<void> {
    const { error } = await supabase.from('storico_eventi').delete().eq('id', id);
    if (error) throw error;
}
