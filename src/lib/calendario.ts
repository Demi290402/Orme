import { supabase } from './supabase';
import { getUser } from './data';
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
    sorgente: 'manuale' | 'verbale';
    verbaleId?: string;
    createdAt: string;
}

export const BRANCA_COLORS: Record<string, string> = {
    'L/C': '#FDD835',    // Giallo
    'E/G': '#4CAF50',    // Verde
    'R/S': '#e53935',    // Rosso
    'CoCa': '#9c27b0',   // Viola
    'Gruppo': '#0288D1', // Azzurro
    'Altro': '#00897B'
};

export function getColorByBranca(branca: string): string {
    return BRANCA_COLORS[branca] || BRANCA_COLORS['Altro'];
}

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
        return mapRow(data);
    } else {
        const { data, error } = await supabase
            .from('eventi_calendario')
            .insert(payload)
            .select()
            .single();
        if (error) throw error;
        return mapRow(data);
    }
}

export async function deleteEvento(id: string): Promise<void> {
    const { error } = await supabase
        .from('eventi_calendario')
        .delete()
        .eq('id', id);
    if (error) throw error;
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
