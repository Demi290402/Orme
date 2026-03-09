import { supabase } from './supabase';
import { Verbale, MembroCoCa, TipoPostoAzione, TitoloSezioneVerbale, ImpostazioniVerbali } from '@/types';
import { getUser } from './data';
import { syncVerbaleEventi } from './calendario';

export async function getVerbali(): Promise<Verbale[]> {
    try {
        const currentUser = await getUser();
        // Fetch verbali
        const { data: verbaliData, error } = await supabase
            .from('verbali')
            .select('*')
            .eq('group_id', currentUser.groupId)
            .order('data', { ascending: false });

        if (error) throw error;

        // Fetch user info to resolve createdByName
        const { data: usersData } = await supabase
            .from('users')
            .select('id, nickname, first_name, last_name')
            .eq('group_id', currentUser.groupId);

        const usersMap = new Map((usersData || []).map(u => [u.id, u.nickname || u.first_name || '']));

        return verbaliData.map(v => {
            const verbale = mapSupabaseVerbaleToVerbale(v);
            verbale.createdByName = usersMap.get(v.created_by) || '';
            return verbale;
        });
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
        numero: verbale.numero || 0,
        titolo: verbale.titolo || 'Senza Titolo',
        data: verbale.data || new Date().toISOString().split('T')[0],
        luogo: verbale.luogo || '',
        ora_inizio: verbale.oraInizio || '',
        ora_fine: verbale.oraFine || '',
        presenti: verbale.presenti || [],
        assenti: verbale.assenti || [],
        ritardi: verbale.ritardi || [],
        ospiti: verbale.ospiti || [],
        odg: verbale.odg || [],
        cassa: verbale.cassa || [],
        ritorni: verbale.ritorni || [],
        date_importanti: verbale.dateImportanti || [],
        posti_azione: verbale.postiAzione || [],
        prossimi_impegni: verbale.prossimiImpegni || [],
        uscite_anticipate: verbale.usciteAnticipate || [],
        varie: verbale.varie || '',
        sezioni_attive: verbale.sezioniAttive || [],
    };

    let result;
    if (verbale.id) {
        const { data, error } = await supabase
            .from('verbali')
            .update(dataToSave)
            .eq('id', verbale.id)
            .select()
            .single();
        if (error) {
            console.error("Supabase update error:", error);
            throw error;
        }
        result = data;
    } else {
        const { data, error } = await supabase
            .from('verbali')
            .insert({
                ...dataToSave,
                created_by: currentUser.id
            })
            .select()
            .single();
        if (error) {
            console.error("Supabase insert error:", error);
            throw error;
        }
        result = data;
    }

    const savedVerbale = mapSupabaseVerbaleToVerbale(result);
    // Sincronizza dateImportanti e prossimiImpegni col nuovo Calendario
    await syncVerbaleEventi(savedVerbale).catch(err => console.error("Sync calendario fallito:", err));

    return savedVerbale;
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
        updatedAt: data.updated_at,
    };
}

export async function saveMembroCoCa(membro: Partial<MembroCoCa>): Promise<MembroCoCa> {
    const currentUser = await getUser();
    const dataToSave: any = {
        group_id: currentUser.groupId,
        nome: membro.nome,
        branca: membro.branca,
        branche_secondarie: membro.brancheSecondarie || [],
        ruoli: membro.ruoli || [],
    };

    if (membro.userId) {
        dataToSave.user_id = membro.userId;
    }

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
        brancheSecondarie: data.branche_secondarie || [],
        ruoli: data.ruoli || [],
        userId: data.user_id,
    };
}

export interface ImpostazioniVerbali {
    groupId: string;
    intestazioneHtml?: string;
    piePaginaHtml?: string;
    fontFamily?: string;
}

export async function getImpostazioniVerbali(): Promise<ImpostazioniVerbali | null> {
    try {
        const currentUser = await getUser();
        const { data, error } = await supabase
            .from('impostazioni_verbali')
            .select('*')
            .eq('group_id', currentUser.groupId)
            .maybeSingle();

        if (error || !data) return null;
        return {
            groupId: data.group_id,
            intestazioneHtml: data.intestazione,
            piePaginaHtml: data.pie_pagina,
            fontFamily: data.font_family || 'serif',
        };
    } catch (error) {
        console.error('Error fetching impostazioni verbali:', error);
        return null;
    }
}

export async function saveImpostazioniVerbali(impostazioni: Partial<ImpostazioniVerbali>): Promise<void> {
    const currentUser = await getUser();
    const dataToSave = {
        group_id: currentUser.groupId,
        intestazione: impostazioni.intestazioneHtml,
        pie_pagina: impostazioni.piePaginaHtml,
        font_family: impostazioni.fontFamily || 'serif',
        updated_at: new Date().toISOString()
    };

    const { data: existing } = await supabase
        .from('impostazioni_verbali')
        .select('*')
        .eq('group_id', currentUser.groupId)
        .maybeSingle();

    if (existing) {
        await supabase.from('impostazioni_verbali').update(dataToSave).eq('group_id', currentUser.groupId);
    } else {
        await supabase.from('impostazioni_verbali').insert(dataToSave);
    }
}
