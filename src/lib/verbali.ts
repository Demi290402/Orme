import { supabase } from './supabase';
import { Verbale, MembroCoCa } from '@/types';
import { getUser } from './data';

export async function getVerbali(): Promise<Verbale[]> {
    try {
        const currentUser = await getUser();
        const { data, error } = await supabase
            .from('verbali')
            .select('*')
            .eq('group_id', currentUser.groupId)
            .order('data', { ascending: false });

        if (error) throw error;
        return data.map(mapSupabaseVerbaleToVerbale);
    } catch (error) {
        console.error('Error fetching verbali:', error);
        return [];
    }
}

export async function getMembriCoCa(): Promise<MembroCoCa[]> {
    try {
        const currentUser = await getUser();
        const { data, error } = await supabase
            .from('membri')
            .select('*')
            .eq('group_id', currentUser.groupId)
            .order('nome', { ascending: true });

        if (error) throw error;
        return data.map(mapSupabaseMembroToMembro);
    } catch (error) {
        console.error('Error fetching membri:', error);
        return [];
    }
}

export async function saveVerbale(verbale: Partial<Verbale>): Promise<Verbale> {
    const currentUser = await getUser();
    const dataToSave = {
        group_id: currentUser.groupId,
        numero: verbale.numero,
        titolo: verbale.titolo,
        data: verbale.data,
        luogo: verbale.luogo,
        ora_inizio: verbale.oraInizio,
        ora_fine: verbale.oraFine,
        presenti: verbale.presenti,
        assenti: verbale.assenti,
        ritardi: verbale.ritardi,
        ospiti: verbale.ospiti,
        odg: verbale.odg,
        cassa: verbale.cassa,
        ritorni: verbale.ritorni,
        date_importanti: verbale.dateImportanti,
        posti_azione: verbale.postiAzione,
        prossimi_impegni: verbale.prossimiImpegni,
        uscite_anticipate: verbale.usciteAnticipate,
        varie: verbale.varie,
        sezioni_attive: verbale.sezioniAttive,
        created_by: currentUser.id,
    };

    let result;
    if (verbale.id) {
        const { data, error } = await supabase
            .from('verbali')
            .update(dataToSave)
            .eq('id', verbale.id)
            .select()
            .single();
        if (error) throw error;
        result = data;
    } else {
        const { data, error } = await supabase
            .from('verbali')
            .insert(dataToSave)
            .select()
            .single();
        if (error) throw error;
        result = data;
    }

    return mapSupabaseVerbaleToVerbale(result);
}

function mapSupabaseVerbaleToVerbale(data: any): Verbale {
    return {
        id: data.id,
        groupId: data.group_id,
        numero: data.numero,
        titolo: data.titolo,
        data: data.data,
        luogo: data.luogo,
        oraInizio: data.ora_inizio,
        oraFine: data.ora_fine,
        presenti: data.presenti || [],
        assenti: data.assenti || [],
        ritardi: data.ritardi || [],
        ospiti: data.ospiti || [],
        odg: data.odg || [],
        cassa: data.cassa || [],
        ritorni: data.ritorni || [],
        dateImportanti: data.date_importanti || [],
        postiAzione: data.posti_azione || [],
        prossimiImpegni: data.prossimi_impegni || [],
        usciteAnticipate: data.uscite_anticipate || [],
        varie: data.varie || '',
        sezioniAttive: data.sezioni_attive || [],
        createdAt: data.created_at,
        createdBy: data.created_by,
    };
}

export async function saveMembroCoCa(membro: Partial<MembroCoCa>): Promise<MembroCoCa> {
    const currentUser = await getUser();
    const dataToSave = {
        group_id: currentUser.groupId,
        nome: membro.nome,
        branca: membro.branca,
        ruoli: membro.ruoli || [],
        user_id: membro.userId,
    };

    let result;
    if (membro.id) {
        const { data, error } = await supabase
            .from('membri')
            .update(dataToSave)
            .eq('id', membro.id)
            .select()
            .single();
        if (error) throw error;
        result = data;
    } else {
        const { data, error } = await supabase
            .from('membri')
            .insert(dataToSave)
            .select()
            .single();
        if (error) throw error;
        result = data;
    }

    return mapSupabaseMembroToMembro(result);
}

export async function deleteMembroCoCa(id: string): Promise<void> {
    const { error } = await supabase
        .from('membri')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

function mapSupabaseMembroToMembro(data: any): MembroCoCa {
    return {
        id: data.id,
        groupId: data.group_id,
        nome: data.nome,
        branca: data.branca,
        ruoli: data.ruoli || [],
        userId: data.user_id,
    };
}
