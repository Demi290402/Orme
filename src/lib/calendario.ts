import { supabase } from './supabase';
import { getUser } from './data';
import { createNotificationsForGroup } from './notifications';
import { Verbale } from '@/types';

export interface EventoCalendario {
    id: string;
    groupId: string;
    titolo: string;
    dataInizio: string;   // YYYY-MM-DD
    dataFine?: string;
    oraInizio?: string;
    oraFine?: string;
    luogo?: string;
    note?: string;
    branca: string;
    colore: string;
    creatoDa?: string;
    sorgente: 'manuale' | 'verbale' | 'import_ics';
    verbaleId?: string;
    createdAt: string;
}

import { BRANCA_COLORS, getColorByBranca } from './constants';
export { BRANCA_COLORS, getColorByBranca };

function mapRow(row: any): EventoCalendario {
    return {
        id: row.id,
        groupId: row.group_id,
        titolo: row.titolo,
        dataInizio: row.data_inizio,
        dataFine: row.data_fine || undefined,
        oraInizio: row.ora_inizio || undefined,
        oraFine: row.ora_fine || undefined,
        luogo: row.luogo || '',
        note: row.note || '',
        branca: row.branca || 'CoCa',
        colore: row.colore || '#4CAF50',
        creatoDa: row.creato_da || undefined,
        sorgente: row.sorgente || 'manuale',
        verbaleId: row.verbale_id || undefined,
        createdAt: row.created_at,
    };
}

export async function getEventi(): Promise<EventoCalendario[]> {
    try {
        const user = await getUser();
        const { data, error } = await supabase
            .from('eventi_calendario')
            .select('*')
            .eq('group_id', user.groupId)
            .order('data_inizio', { ascending: true });
        if (error) throw error;
        return (data || []).map(mapRow);
    } catch (err) {
        console.error('Error fetching eventi:', err);
        return [];
    }
}

export async function saveEvento(evento: Partial<EventoCalendario>): Promise<EventoCalendario> {
    const user = await getUser();
    const payload: any = {
        group_id: user.groupId,
        titolo: evento.titolo || '',
        data_inizio: evento.dataInizio,
        data_fine: evento.dataFine || null,
        ora_inizio: evento.oraInizio || null,
        ora_fine: evento.oraFine || null,
        luogo: evento.luogo || '',
        note: evento.note || '',
        branca: evento.branca || 'CoCa',
        colore: evento.colore || '#4CAF50',
        sorgente: evento.sorgente || 'manuale',
        verbale_id: evento.verbaleId || null,
        creato_da: user.id,
    };

    if (evento.id) {
        const { data, error } = await supabase
            .from('eventi_calendario')
            .update(payload)
            .eq('id', evento.id)
            .select()
            .single();
        if (error) throw error;
        // Notify group about update
        if (user.groupId) {
            createNotificationsForGroup(
                user.groupId,
                'calendario_evento',
                `✏️ Evento aggiornato — ${payload.titolo}`,
                `${user.nickname || user.firstName} ha modificato "${payload.titolo}" (${payload.data_inizio}).`,
                { eventoId: data.id },
                user.id
            ).catch(console.error);
        }
        return mapRow(data);
    } else {
        const { data, error } = await supabase
            .from('eventi_calendario')
            .insert(payload)
            .select()
            .single();
        if (error) throw error;
        // Notify group about new event
        if (user.groupId) {
            createNotificationsForGroup(
                user.groupId,
                'calendario_evento',
                `📅 Nuovo evento — ${payload.titolo}`,
                `${user.nickname || user.firstName} ha aggiunto "${payload.titolo}" il ${payload.data_inizio}.`,
                { eventoId: data.id },
                user.id
            ).catch(console.error);
        }
        return mapRow(data);
    }
}

export async function saveEventiBatch(eventi: Partial<EventoCalendario>[]): Promise<EventoCalendario[]> {
    if (!eventi || eventi.length === 0) return [];
    const user = await getUser();

    const payloads = eventi.map(ev => ({
        group_id: user.groupId,
        titolo: ev.titolo || 'Evento',
        data_inizio: ev.dataInizio,
        data_fine: ev.dataFine || null,
        ora_inizio: ev.oraInizio || null,
        ora_fine: ev.oraFine || null,
        luogo: ev.luogo || '',
        note: ev.note || '',
        branca: ev.branca || 'CoCa',
        colore: ev.colore || getColorByBranca(ev.branca || 'CoCa'),
        sorgente: ev.sorgente || 'import_ics',
        verbale_id: ev.verbaleId || null,
        creato_da: user.id,
    }));

    const { data, error } = await supabase
        .from('eventi_calendario')
        .insert(payloads)
        .select();

    if (error) throw error;

    if (user.groupId && data && data.length > 0) {
        createNotificationsForGroup(
            user.groupId,
            'calendario_evento',
            `📅 Importati ${data.length} eventi nel calendario`,
            `${user.nickname || user.firstName} ha importato ${data.length} eventi nel calendario di gruppo.`,
            { conteggio: data.length },
            user.id
        ).catch(console.error);
    }

    return (data || []).map(mapRow);
}

export async function deleteEvento(id: string): Promise<void> {
    // Fetch title before delete for notification
    const user = await getUser().catch(() => null);
    const { data: row } = await supabase.from('eventi_calendario').select('titolo, group_id').eq('id', id).single();
    const { error } = await supabase
        .from('eventi_calendario')
        .delete()
        .eq('id', id);
    if (error) throw error;
    // Notify group about removal
    if (user?.groupId && row?.titolo) {
        createNotificationsForGroup(
            user.groupId,
            'calendario_evento',
            `🗑️ Evento rimosso — ${row.titolo}`,
            `${user.nickname || user.firstName} ha rimosso "${row.titolo}" dal calendario.`,
            {},
            user.id
        ).catch(console.error);
    }
}

/**
 * Syncs dateImportanti and prossimiImpegni from a saved verbale into eventi_calendario.
 * Existing entries from that verbale are replaced (delete + insert).
 */
export async function syncVerbaleEventi(verbale: Verbale): Promise<void> {
    try {
        const user = await getUser();

        // Delete existing auto-imported events from this verbale
        await supabase
            .from('eventi_calendario')
            .delete()
            .eq('group_id', user.groupId)
            .eq('verbale_id', verbale.id)
            .eq('sorgente', 'verbale');

        const toInsert: any[] = [];

        for (const d of verbale.dateImportanti || []) {
            if (!d.dataInizio || !d.evento) continue;
            toInsert.push({
                group_id: user.groupId,
                titolo: d.evento,
                data_inizio: d.dataInizio,
                data_fine: d.dataFine || null,
                luogo: d.luogo || '',
                note: d.note || '',
                branca: d.branca || 'CoCa',
                colore: getColorByBranca(d.branca || 'CoCa'),
                sorgente: 'verbale',
                verbale_id: verbale.id,
                creato_da: user.id,
            });
        }

        for (const p of verbale.prossimiImpegni || []) {
            if (!p.dataInizio || !p.evento) continue;
            toInsert.push({
                group_id: user.groupId,
                titolo: p.evento,
                data_inizio: p.dataInizio,
                data_fine: p.dataFine || null,
                luogo: p.luogo || '',
                note: p.note || '',
                branca: p.branca || 'CoCa',
                colore: getColorByBranca(p.branca || 'CoCa'),
                sorgente: 'verbale',
                verbale_id: verbale.id,
                creato_da: user.id,
            });
        }

        if (toInsert.length > 0) {
            await supabase.from('eventi_calendario').insert(toInsert);
        }
    } catch (err) {
        console.error('Error syncing verbale eventi:', err);
    }
}
