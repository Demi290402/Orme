import { supabase } from './supabase';
import { Verbale, MembroCoCa } from '@/types';
import { getUser } from './data';
import { syncVerbaleEventi } from './calendario';

export async function getVerbali(): Promise<Verbale[]> {
    try {
        const currentUser = await getUser();
        if (!currentUser || currentUser.membershipStatus !== 'attivo') return [];

        const userGroupId = currentUser.groupId ? String(currentUser.groupId).trim() : '';
        let verbaliData: any[] = [];

        let query = supabase.from('verbali').select('*');

        if (userGroupId && currentUser.id) {
            // Include both verbali belonging to the user's group AND any verbali authored by the user directly
            query = query.or(`group_id.eq.${userGroupId},created_by.eq.${currentUser.id}`);
        } else if (userGroupId) {
            query = query.eq('group_id', userGroupId);
        } else if (currentUser.id) {
            query = query.eq('created_by', currentUser.id);
        }

        const { data, error } = await query.order('data', { ascending: false });

        if (error) {
            console.warn('Primary verbali query error, attempting fallback by author:', error);
            // Fallback: If group filter errored, attempt fetching directly authored verbali
            if (currentUser.id) {
                const { data: authorData } = await supabase
                    .from('verbali')
                    .select('*')
                    .eq('created_by', currentUser.id)
                    .order('data', { ascending: false });
                verbaliData = authorData || [];
            }
        } else {
            verbaliData = data || [];
        }

        // Secondary fallback: if nothing was returned by group query, check if user authored any verbali
        if (verbaliData.length === 0 && currentUser.id) {
            const { data: myData } = await supabase
                .from('verbali')
                .select('*')
                .eq('created_by', currentUser.id)
                .order('data', { ascending: false });
            if (myData && myData.length > 0) {
                verbaliData = myData;
            }
        }

        if (verbaliData.length === 0) {
            return [];
        }

        // Fetch user info to resolve createdByName using creator IDs
        const creatorIds = Array.from(new Set(verbaliData.map(v => v.created_by).filter(Boolean)));
        let usersMap = new Map<string, string>();
        if (creatorIds.length > 0) {
            const { data: usersData } = await supabase
                .from('users')
                .select('id, nickname, first_name, last_name')
                .in('id', creatorIds);

            usersMap = new Map((usersData || []).map(u => [
                u.id,
                u.nickname || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Utente'
            ]));
        }

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
        if (!currentUser || currentUser.membershipStatus !== 'attivo') return [];
        const userGroupId = currentUser.groupId ? String(currentUser.groupId).trim() : '';
        if (!userGroupId) return [];

        const { data, error } = await supabase
            .from('membri')
            .select('*')
            .eq('group_id', userGroupId)
            .order('nome', { ascending: true });

        if (error) throw error;
        return (data || []).map(mapSupabaseMembroToMembro);
    } catch (error) {
        console.error('Error fetching membri:', error);
        return [];
    }
}

/**
 * Calcola l'anno associativo scout a partire da una data (YYYY-MM-DD).
 * Regola scout:
 * - Ottobre (10), Novembre (11), Dicembre (12) -> appartengono all'anno in corso (es. Ottobre 2024 -> 2024).
 * - Da Gennaio (1) a Settembre (9) -> appartengono all'anno iniziato nell'autunno precedente (es. Maggio 2025 -> 2024, Settembre 2025 -> 2024).
 */
export function calculateScoutYear(dateStr?: string): number {
    const currentYear = new Date().getFullYear();
    if (!dateStr) return currentYear;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return currentYear;

    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-12
    return month >= 10 ? year : year - 1;
}

/**
 * Formatta l'anno scout in forma leggibile (es. 2024 -> "2024 — 2025")
 */
export function formatScoutYear(year: number): string {
    return `${year} — ${year + 1}`;
}

export async function saveVerbale(verbale: Partial<Verbale>): Promise<Verbale> {
    const currentUser = await getUser();
    const resolvedGroupId = (currentUser?.groupId ? String(currentUser.groupId).trim() : '') || verbale.groupId || 'default';
    const targetAnnoScout = verbale.annoScout ?? calculateScoutYear(verbale.data || new Date().toISOString().split('T')[0]);

    const dataToSave: any = {
        group_id: resolvedGroupId,
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
        anno_scout: targetAnnoScout,
    };

    let result;
    try {
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
                .insert({
                    ...dataToSave,
                    created_by: currentUser.id
                })
                .select()
                .single();
            if (error) throw error;
            result = data;
        }
    } catch (err: any) {
        // Fallback: se la colonna anno_scout non è ancora stata creata in Supabase, salva comunque senza bloccare l'utente
        if (err?.message?.includes('anno_scout') || err?.code === '42703') {
            console.warn('Colonna anno_scout non ancora presente in Supabase, salvataggio fallback senza anno_scout:', err);
            delete dataToSave.anno_scout;
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
                    .insert({
                        ...dataToSave,
                        created_by: currentUser.id
                    })
                    .select()
                    .single();
                if (error) throw error;
                result = data;
            }
        } else {
            console.error("Supabase error during saveVerbale:", err);
            throw err;
        }
    }

    const savedVerbale = mapSupabaseVerbaleToVerbale(result);
    // Assicuriamoci che l'anno associativo desiderato rimanga nell'oggetto restituito
    if (savedVerbale && !savedVerbale.annoScout) {
        savedVerbale.annoScout = targetAnnoScout;
    }
    // Sincronizza dateImportanti e prossimiImpegni col nuovo Calendario
    await syncVerbaleEventi(savedVerbale).catch(err => console.error("Sync calendario fallito:", err));

    return savedVerbale;
}

function mapSupabaseVerbaleToVerbale(data: any): Verbale {
    const rawAnno = data.anno_scout;
    const computedAnno = (rawAnno !== undefined && rawAnno !== null && !isNaN(Number(rawAnno)))
        ? Number(rawAnno)
        : calculateScoutYear(data.data);

    return {
        id: data.id,
        groupId: data.group_id,
        numero: data.numero,
        annoScout: computedAnno,
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
        const userGroupId = currentUser?.groupId ? String(currentUser.groupId).trim() : '';
        if (!userGroupId) return null;

        const { data, error } = await supabase
            .from('impostazioni_verbali')
            .select('*')
            .eq('group_id', userGroupId)
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
    const userGroupId = (currentUser?.groupId ? String(currentUser.groupId).trim() : '') || impostazioni.groupId || 'default';
    const dataToSave = {
        group_id: userGroupId,
        intestazione: impostazioni.intestazioneHtml,
        pie_pagina: impostazioni.piePaginaHtml,
        font_family: impostazioni.fontFamily || 'serif',
        updated_at: new Date().toISOString()
    };

    const { data: existing } = await supabase
        .from('impostazioni_verbali')
        .select('*')
        .eq('group_id', userGroupId)
        .maybeSingle();

    if (existing) {
        await supabase.from('impostazioni_verbali').update(dataToSave).eq('group_id', userGroupId);
    } else {
        await supabase.from('impostazioni_verbali').insert(dataToSave);
    }
}
