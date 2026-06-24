import { supabase } from './supabase';
import { ListaAttesa, ImpostazioniIscrizione } from '@/types';
import { getUser } from './data';
import { isOnline, getCachedData, setCachedData, enqueueOfflineWrite } from './offline';

/**
 * Recupera tutti gli iscritti in lista d'attesa associati al gruppo dell'utente corrente.
 */
export async function getListaAttesa(): Promise<ListaAttesa[]> {
    const cacheKey = 'lista_attesa';
    if (!isOnline()) {
        const cached = getCachedData<any[]>(cacheKey);
        if (cached) return cached.map(mapDbRowToListaAttesa);
        return [];
    }
    try {
        const currentUser = await getUser();
        if (!currentUser.groupId) return [];

        const { data, error } = await supabase
            .from('lista_attesa')
            .select('*')
            .eq('group_id', currentUser.groupId)
            .order('data_iscrizione', { ascending: true })
            .order('created_at', { ascending: true });

        if (error) throw error;
        setCachedData(cacheKey, data);
        return (data || []).map(mapDbRowToListaAttesa);
    } catch (error) {
        console.error("Errore nel recupero della lista d'attesa:", error);
        const cached = getCachedData<any[]>(cacheKey);
        if (cached) return cached.map(mapDbRowToListaAttesa);
        return [];
    }
}

/**
 * Aggiunge un nuovo iscritto (usato internamente dall'app dai capi).
 */
export async function addIscritto(
    iscritto: Omit<ListaAttesa, 'id' | 'groupId' | 'createdAt'>
): Promise<ListaAttesa | null> {
    try {
        const currentUser = await getUser();
        if (!currentUser.groupId) throw new Error('Utente non associato a un gruppo scout');

        const insertData = {
            group_id: currentUser.groupId,
            nome_genitore: iscritto.nomeGenitore.trim(),
            telefono_genitore: iscritto.telefonoGenitore.trim(),
            nome_ragazzo: iscritto.nomeRagazzo.trim(),
            cognome_ragazzo: iscritto.cognomeRagazzo.trim(),
            data_nascita: iscritto.dataNascita,
            classe: iscritto.classe,
            data_iscrizione: iscritto.dataIscrizione,
            note: (iscritto.note || '').trim()
        };

        if (!isOnline()) {
            const id = crypto.randomUUID();
            enqueueOfflineWrite('insert', 'lista_attesa', { ...insertData, id });
            return mapDbRowToListaAttesa({ ...insertData, id, created_at: new Date().toISOString() });
        }

        const { data, error } = await supabase
            .from('lista_attesa')
            .insert(insertData)
            .select()
            .single();

        if (error) throw error;
        
        // Refresh local cache
        await getListaAttesa();
        
        return mapDbRowToListaAttesa(data);
    } catch (error) {
        console.error("Errore nell'aggiunta dell'iscritto:", error);
        return null;
    }
}

/**
 * Aggiunge molteplici iscritti in un'unica transazione/richiesta (batch insert).
 */
export async function addIscrittiBatch(
    iscritti: Omit<ListaAttesa, 'id' | 'groupId' | 'createdAt'>[]
): Promise<ListaAttesa[]> {
    if (iscritti.length === 0) return [];
    try {
        const currentUser = await getUser();
        if (!currentUser.groupId) throw new Error('Utente non associato a un gruppo scout');

        const rowsToInsert = iscritti.map(iscritto => ({
            group_id: currentUser.groupId,
            nome_genitore: iscritto.nomeGenitore.trim(),
            telefono_genitore: iscritto.telefonoGenitore.trim(),
            nome_ragazzo: iscritto.nomeRagazzo.trim(),
            cognome_ragazzo: iscritto.cognomeRagazzo.trim(),
            data_nascita: iscritto.dataNascita,
            classe: iscritto.classe,
            data_iscrizione: iscritto.dataIscrizione,
            note: (iscritto.note || '').trim()
        }));

        if (!isOnline()) {
            rowsToInsert.forEach(row => {
                const id = crypto.randomUUID();
                enqueueOfflineWrite('insert', 'lista_attesa', { ...row, id });
            });
            // Update local cache manually
            const currentCache = getCachedData<any[]>('lista_attesa') || [];
            const newRows = rowsToInsert.map(row => ({ ...row, id: crypto.randomUUID(), created_at: new Date().toISOString() }));
            setCachedData('lista_attesa', [...newRows, ...currentCache]);
            return newRows.map(mapDbRowToListaAttesa);
        }

        const { data, error } = await supabase
            .from('lista_attesa')
            .insert(rowsToInsert)
            .select();

        if (error) throw error;
        
        // Refresh local cache
        await getListaAttesa();
        
        return (data || []).map(mapDbRowToListaAttesa);
    } catch (error) {
        console.error("Errore nell'inserimento batch degli iscritti:", error);
        return [];
    }
}

/**
 * Inserimento pubblico per il form dei genitori (senza autenticazione).
 */
export async function addIscrittoPubblico(
    groupId: string,
    iscritto: Omit<ListaAttesa, 'id' | 'groupId' | 'createdAt'>
): Promise<boolean> {
    try {
        const insertData = {
            group_id: groupId,
            nome_genitore: iscritto.nomeGenitore.trim(),
            telefono_genitore: iscritto.telefonoGenitore.trim(),
            nome_ragazzo: iscritto.nomeRagazzo.trim(),
            cognome_ragazzo: iscritto.cognomeRagazzo.trim(),
            data_nascita: iscritto.dataNascita,
            classe: iscritto.classe,
            data_iscrizione: iscritto.dataIscrizione || new Date().toISOString().split('T')[0],
            note: (iscritto.note || '').trim()
        };

        if (!isOnline()) {
            enqueueOfflineWrite('insert', 'lista_attesa', { ...insertData, id: crypto.randomUUID() });
            return true;
        }

        const { error } = await supabase
            .from('lista_attesa')
            .insert(insertData);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Errore nell'invio pubblico dell'iscrizione:", error);
        return false;
    }
}

/**
 * Aggiorna i dati di un iscritto esistente.
 */
export async function updateIscritto(iscritto: ListaAttesa): Promise<ListaAttesa | null> {
    try {
        const updateData = {
            nome_genitore: iscritto.nomeGenitore.trim(),
            telefono_genitore: iscritto.telefonoGenitore.trim(),
            nome_ragazzo: iscritto.nomeRagazzo.trim(),
            cognome_ragazzo: iscritto.cognomeRagazzo.trim(),
            data_nascita: iscritto.dataNascita,
            classe: iscritto.classe,
            data_iscrizione: iscritto.dataIscrizione,
            note: (iscritto.note || '').trim()
        };

        if (!isOnline()) {
            enqueueOfflineWrite('update', 'lista_attesa', updateData, { id: iscritto.id });
            return iscritto;
        }

        const { data, error } = await supabase
            .from('lista_attesa')
            .update(updateData)
            .eq('id', iscritto.id)
            .select()
            .single();

        if (error) throw error;
        
        // Refresh local cache
        await getListaAttesa();
        
        return mapDbRowToListaAttesa(data);
    } catch (error) {
        console.error("Errore nell'aggiornamento dell'iscritto:", error);
        return null;
    }
}

/**
 * Elimina un iscritto dalla lista d'attesa.
 */
export async function deleteIscritto(id: string): Promise<boolean> {
    try {
        if (!isOnline()) {
            enqueueOfflineWrite('delete', 'lista_attesa', null, { id });
            return true;
        }

        const { error } = await supabase
            .from('lista_attesa')
            .delete()
            .eq('id', id);

        if (error) throw error;
        
        // Refresh local cache
        await getListaAttesa();
        
        return true;
    } catch (error) {
        console.error("Errore nell'eliminazione dell'iscritto:", error);
        return false;
    }
}

/**
 * Mapper helper da riga DB a tipo ListaAttesa
 */
function mapDbRowToListaAttesa(row: any): ListaAttesa {
    return {
        id: row.id,
        groupId: row.group_id,
        nomeGenitore: row.nome_genitore,
        telefonoGenitore: row.telefono_genitore,
        nomeRagazzo: row.nome_ragazzo,
        cognomeRagazzo: row.cognome_ragazzo,
        dataNascita: row.data_nascita,
        classe: row.classe,
        dataIscrizione: row.data_iscrizione,
        note: row.note,
        createdAt: row.created_at
    };
}

/**
 * Recupera le personalizzazioni del form per un determinato gruppo.
 * Se non esistono nel database o la tabella non è pronta, restituisce null.
 */
export async function getImpostazioniIscrizione(groupId: string): Promise<ImpostazioniIscrizione | null> {
    const cacheKey = `impostazioni_iscrizione_${groupId}`;
    if (!isOnline()) {
        const cached = getCachedData<any>(cacheKey);
        if (cached) return mapDbRowToImpostazioni(cached);
        return null;
    }
    try {
        const { data, error } = await supabase
            .from('impostazioni_iscrizione')
            .select('*')
            .eq('group_id', groupId)
            .maybeSingle();

        if (error) {
            console.warn("Tabella impostazioni_iscrizione non trovata o errore di caricamento. Fallback al default.", error);
            const cached = getCachedData<any>(cacheKey);
            return cached ? mapDbRowToImpostazioni(cached) : null;
        }
        if (!data) return null;

        setCachedData(cacheKey, data);
        return mapDbRowToImpostazioni(data);
    } catch (error) {
        console.error("Errore nel recupero delle impostazioni iscrizione:", error);
        const cached = getCachedData<any>(cacheKey);
        return cached ? mapDbRowToImpostazioni(cached) : null;
    }
}

/**
 * Salva o aggiorna le personalizzazioni del form del gruppo dell'utente corrente.
 */
export async function saveImpostazioniIscrizione(
    settings: Omit<ImpostazioniIscrizione, 'groupId' | 'createdAt'>
): Promise<ImpostazioniIscrizione | null> {
    try {
        const currentUser = await getUser();
        if (!currentUser.groupId) throw new Error('Utente non associato a un gruppo scout');

        const upsertData = {
            group_id: currentUser.groupId,
            form_title: settings.formTitle.trim(),
            welcome_title: settings.welcomeTitle.trim(),
            description_text: settings.descriptionText.trim(),
            footer_text: settings.footerText.trim(),
            banner_url: settings.bannerUrl.trim(),
            success_title: settings.successTitle.trim(),
            success_message: settings.successMessage.trim(),
            disclaimer_text: settings.disclaimerText.trim()
        };

        if (!isOnline()) {
            enqueueOfflineWrite('upsert', 'impostazioni_iscrizione', upsertData, { group_id: currentUser.groupId });
            return mapDbRowToImpostazioni({ ...upsertData, created_at: new Date().toISOString() });
        }

        const { data, error } = await supabase
            .from('impostazioni_iscrizione')
            .upsert(upsertData)
            .select()
            .single();

        if (error) throw error;
        
        setCachedData(`impostazioni_iscrizione_${currentUser.groupId}`, data);
        return mapDbRowToImpostazioni(data);
    } catch (error) {
        console.error("Errore nel salvataggio delle impostazioni iscrizione:", error);
        return null;
    }
}

function mapDbRowToImpostazioni(row: any): ImpostazioniIscrizione {
    return {
        groupId: row.group_id,
        formTitle: row.form_title,
        welcomeTitle: row.welcome_title,
        descriptionText: row.description_text,
        footerText: row.footer_text,
        bannerUrl: row.banner_url,
        successTitle: row.success_title,
        successMessage: row.success_message,
        disclaimerText: row.disclaimer_text,
        createdAt: row.created_at
    };
}
