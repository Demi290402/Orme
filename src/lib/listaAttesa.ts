import { supabase } from './supabase';
import { ListaAttesa } from '@/types';
import { getUser } from './data';

/**
 * Recupera tutti gli iscritti in lista d'attesa associati al gruppo dell'utente corrente.
 */
export async function getListaAttesa(): Promise<ListaAttesa[]> {
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
        return (data || []).map(mapDbRowToListaAttesa);
    } catch (error) {
        console.error("Errore nel recupero della lista d'attesa:", error);
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

        const { data, error } = await supabase
            .from('lista_attesa')
            .insert({
                group_id: currentUser.groupId,
                nome_genitore: iscritto.nomeGenitore.trim(),
                telefono_genitore: iscritto.telefonoGenitore.trim(),
                nome_ragazzo: iscritto.nomeRagazzo.trim(),
                cognome_ragazzo: iscritto.cognomeRagazzo.trim(),
                data_nascita: iscritto.dataNascita,
                classe: iscritto.classe,
                data_iscrizione: iscritto.dataIscrizione,
                note: (iscritto.note || '').trim(),
                stato: 'In attesa'
            })
            .select()
            .single();

        if (error) throw error;
        return mapDbRowToListaAttesa(data);
    } catch (error) {
        console.error("Errore nell'aggiunta dell'iscritto:", error);
        return null;
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
        const { error } = await supabase
            .from('lista_attesa')
            .insert({
                group_id: groupId,
                nome_genitore: iscritto.nomeGenitore.trim(),
                telefono_genitore: iscritto.telefonoGenitore.trim(),
                nome_ragazzo: iscritto.nomeRagazzo.trim(),
                cognome_ragazzo: iscritto.cognomeRagazzo.trim(),
                data_nascita: iscritto.dataNascita,
                classe: iscritto.classe,
                data_iscrizione: iscritto.dataIscrizione || new Date().toISOString().split('T')[0],
                note: (iscritto.note || '').trim(),
                stato: 'In attesa'
            });

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
        const { data, error } = await supabase
            .from('lista_attesa')
            .update({
                nome_genitore: iscritto.nomeGenitore.trim(),
                telefono_genitore: iscritto.telefonoGenitore.trim(),
                nome_ragazzo: iscritto.nomeRagazzo.trim(),
                cognome_ragazzo: iscritto.cognomeRagazzo.trim(),
                data_nascita: iscritto.dataNascita,
                classe: iscritto.classe,
                data_iscrizione: iscritto.dataIscrizione,
                note: (iscritto.note || '').trim()
            })
            .eq('id', iscritto.id)
            .select()
            .single();

        if (error) throw error;
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
        const { error } = await supabase
            .from('lista_attesa')
            .delete()
            .eq('id', id);

        if (error) throw error;
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
