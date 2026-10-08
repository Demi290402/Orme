import { supabase } from './supabase';
import { ListaAttesa, ImpostazioniIscrizione, FormBlock, FormQuestion } from '@/types';
import { getUser } from './data';
import { isOnline, getCachedData, setCachedData, enqueueOfflineWrite } from './offline';

export const CLASSI = [
    'Asilo',
    '1a Elementare',
    '2a Elementare',
    '3a Elementare',
    '4a Elementare',
    '5a Elementare',
    '1a Media',
    '2a Media',
    '3a Media',
    '1a Superiore',
    '2a Superiore',
    '3a Superiore',
    '4a Superiore',
    '5a Superiore'
];

/**
 * Calcola l'età esatta in anni compiuti rispetto a oggi.
 */
export function calculateAge(birthDateStr: string): number {
    if (!birthDateStr) return 0;
    const birthDate = new Date(birthDateStr);
    if (isNaN(birthDate.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return isNaN(age) ? 0 : Math.max(0, age);
}

/**
 * Restituisce l'anno di inizio dell'anno scolastico per una certa data (es. 2026 per Settembre 2026 o Maggio 2027).
 * L'anno scolastico in Italia inizia il 1° settembre (mese 8 con indice 0..11).
 */
export function getSchoolYear(dateStrOrObj?: string | Date): number {
    const d = dateStrOrObj ? (typeof dateStrOrObj === 'string' ? new Date(dateStrOrObj) : dateStrOrObj) : new Date();
    if (isNaN(d.getTime())) return new Date().getFullYear();
    const year = d.getFullYear();
    const month = d.getMonth(); // 0 = Gen ... 8 = Set ... 11 = Dic
    return month >= 8 ? year : year - 1;
}

/**
 * Calcola dinamicamente la classe scolastica attuale di un iscritto in base a:
 * - Data di nascita (e anno di nascita / coorte scolastica)
 * - Classe registrata all'iscrizione
 * - Data di iscrizione (o createdAt)
 * 
 * Ogni 1° settembre (inizio nuovo anno scolastico), la classe avanza automaticamente di 1 anno.
 * Gestisce l'Asilo (fino a 6 anni nell'anno solare) e riconcilia eventuali anomalie rispetto all'età.
 */
export function getClasseAttuale(item: {
    dataNascita: string;
    classe: string;
    dataIscrizione?: string;
    createdAt?: string;
}): string {
    if (!item) return '';
    const registeredClass = (item.classe || '').trim();
    if (!registeredClass) return '';

    const currentSchoolYear = getSchoolYear(new Date());

    // 1. Estrazione anno di nascita se presente
    let birthYear: number | null = null;
    if (item.dataNascita) {
        const bDate = new Date(item.dataNascita);
        if (!isNaN(bDate.getTime())) {
            birthYear = bDate.getFullYear();
        }
    }

    // 2. Anno scolastico al momento dell'iscrizione
    const regDateStr = item.dataIscrizione || item.createdAt;
    const regSchoolYear = regDateStr ? getSchoolYear(regDateStr) : currentSchoolYear;
    const elapsedSchoolYears = Math.max(0, currentSchoolYear - regSchoolYear);

    // Indice della classe registrata nell'array standard CLASSI
    const regIndex = CLASSI.findIndex(c => c.toLowerCase() === registeredClass.toLowerCase());

    // Se la classe registrata non appartiene allo standard CLASSI (es. testo libero o personalizzato)
    if (regIndex === -1) {
        return registeredClass;
    }

    // 3. Caso Asilo:
    // In Italia la scuola dell'infanzia dura fino all'anno in cui il bambino compie 6 anni.
    // L'ingresso in 1a Elementare avviene nel settembre dell'anno solare in cui compie 6 anni.
    if (regIndex === 0 || registeredClass.toLowerCase() === 'asilo') {
        if (birthYear !== null) {
            const ageInSchoolYear = currentSchoolYear - birthYear;
            if (ageInSchoolYear < 6) {
                return 'Asilo';
            }
            const targetIndex = 1 + (ageInSchoolYear - 6);
            if (targetIndex >= CLASSI.length) {
                return 'Superiori concluse';
            }
            return CLASSI[targetIndex];
        } else {
            const targetIndex = regIndex + elapsedSchoolYears;
            if (targetIndex >= CLASSI.length) return 'Superiori concluse';
            return CLASSI[targetIndex];
        }
    }

    // 4. Per elementari, medie e superiori:
    // Avanza di 1 anno per ogni anno scolastico trascorso dalla data di iscrizione
    let updatedIndex = regIndex + elapsedSchoolYears;

    // 5. Coerenza con la data di nascita:
    // Se un bambino è stato registrato in passato o importato con classe non allineata
    // (es. bimbo di 8 anni ancora in 1a elementare), riallineiamo alla sua età teorica
    if (birthYear !== null) {
        const ageInSchoolYear = currentSchoolYear - birthYear;
        if (ageInSchoolYear >= 6) {
            const theoreticalIndex = 1 + (ageInSchoolYear - 6);
            if (updatedIndex < theoreticalIndex - 1) {
                updatedIndex = theoreticalIndex;
            }
        }
    }

    if (updatedIndex >= CLASSI.length) {
        return 'Superiori concluse';
    }

    return CLASSI[updatedIndex];
}

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

        // Controllo preventivo anti-duplicati: verifica se esiste già un iscritto con stesso nome, cognome e data di nascita per questo gruppo
        const { data: existingDups } = await supabase
            .from('lista_attesa')
            .select('id')
            .eq('group_id', currentUser.groupId)
            .ilike('nome_ragazzo', insertData.nome_ragazzo)
            .ilike('cognome_ragazzo', insertData.cognome_ragazzo)
            .eq('data_nascita', insertData.data_nascita)
            .limit(1);

        if (existingDups && existingDups.length > 0) {
            console.warn('Iscritto già presente in lista d\'attesa per questo gruppo:', insertData);
            throw new Error('DUPLICATE_ENTRY');
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
    } catch (error: any) {
        console.error("Errore nell'aggiunta dell'iscritto:", error);
        if (error?.message === 'DUPLICATE_ENTRY') {
            throw error;
        }
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

        // Controllo preventivo anti-duplicati (idempotenza invio genitori)
        const { data: existingDups } = await supabase
            .from('lista_attesa')
            .select('id')
            .eq('group_id', groupId)
            .ilike('nome_ragazzo', insertData.nome_ragazzo)
            .ilike('cognome_ragazzo', insertData.cognome_ragazzo)
            .eq('data_nascita', insertData.data_nascita)
            .limit(1);

        if (existingDups && existingDups.length > 0) {
            console.warn('Iscritto già presente in lista d\'attesa, salvataggio idempotente:', insertData);
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

        const upsertData: any = {
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

        if (settings.formSchema !== undefined) {
            upsertData.form_schema = settings.formSchema;
        }

        if (!isOnline()) {
            enqueueOfflineWrite('upsert', 'impostazioni_iscrizione', upsertData, { group_id: currentUser.groupId });
            return mapDbRowToImpostazioni({ ...upsertData, created_at: new Date().toISOString() });
        }

        // Controlla se le impostazioni esistono già per questo gruppo
        const { data: existing, error: selectError } = await supabase
            .from('impostazioni_iscrizione')
            .select('*')
            .eq('group_id', currentUser.groupId)
            .maybeSingle();

        if (selectError) throw selectError;

        let result;
        try {
            if (existing) {
                const { data, error: updateError } = await supabase
                    .from('impostazioni_iscrizione')
                    .update(upsertData)
                    .eq('group_id', currentUser.groupId)
                    .select()
                    .single();
                if (updateError) throw updateError;
                result = data;
            } else {
                const { data, error: insertError } = await supabase
                    .from('impostazioni_iscrizione')
                    .insert(upsertData)
                    .select()
                    .single();
                if (insertError) throw insertError;
                result = data;
            }
        } catch (dbError: any) {
            // Se la colonna form_schema non esiste ancora su Supabase (errore 42703),
            // salva i campi standard sul database e mantieni form_schema in cache locale
            if (dbError?.code === '42703' || dbError?.message?.includes('form_schema')) {
                console.warn('Colonna form_schema non ancora presente in Supabase. Salvataggio fallback...');
                delete upsertData.form_schema;
                if (existing) {
                    const { data } = await supabase
                        .from('impostazioni_iscrizione')
                        .update(upsertData)
                        .eq('group_id', currentUser.groupId)
                        .select()
                        .single();
                    result = { ...data, form_schema: settings.formSchema };
                } else {
                    const { data } = await supabase
                        .from('impostazioni_iscrizione')
                        .insert(upsertData)
                        .select()
                        .single();
                    result = { ...data, form_schema: settings.formSchema };
                }
            } else {
                throw dbError;
            }
        }

        setCachedData(`impostazioni_iscrizione_${currentUser.groupId}`, result);
        return mapDbRowToImpostazioni(result);
    } catch (error) {
        console.error("Errore nel salvataggio delle impostazioni iscrizione:", error);
        return null;
    }
}

function mapDbRowToImpostazioni(row: any): ImpostazioniIscrizione {
    let formSchema: FormBlock[] | undefined = undefined;
    if (row.form_schema) {
        if (typeof row.form_schema === 'string') {
            try {
                formSchema = JSON.parse(row.form_schema);
            } catch (e) {
                console.warn('Errore parsing form_schema JSON:', e);
            }
        } else if (Array.isArray(row.form_schema)) {
            formSchema = row.form_schema;
        }
    }

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
        formSchema: formSchema,
        createdAt: row.created_at
    };
}

/**
 * Blocchi standard del modulo iscrizione predefinito
 */
export const DEFAULT_FORM_BLOCKS: FormBlock[] = [
    {
        id: 'sec-famiglia',
        type: 'section',
        title: 'Dati di Contatto Famiglia',
        description: 'I recapiti del genitore o tutore per le comunicazioni di gruppo.'
    },
    {
        id: 'core-genitore',
        type: 'question',
        questionType: 'short_text',
        title: 'Nome e Cognome Genitore / Tutore',
        description: 'Referente principale per le comunicazioni.',
        required: true,
        isCoreField: true,
        coreMapping: 'nomeGenitore'
    },
    {
        id: 'core-telefono',
        type: 'question',
        questionType: 'short_text',
        title: 'Numero di Telefono (WhatsApp)',
        description: 'Numero cellulare su cui ricevere comunicazioni e avvisi.',
        required: true,
        isCoreField: true,
        coreMapping: 'telefonoGenitore'
    },
    {
        id: 'sec-ragazzo',
        type: 'section',
        title: 'Dati del Bambino / Ragazzo',
        description: 'Informazioni anagrafiche del futuro lupetto, coccinella, esploratore o guida.'
    },
    {
        id: 'core-nome',
        type: 'question',
        questionType: 'short_text',
        title: 'Nome del Ragazzo / Bambino',
        required: true,
        isCoreField: true,
        coreMapping: 'nomeRagazzo'
    },
    {
        id: 'core-cognome',
        type: 'question',
        questionType: 'short_text',
        title: 'Cognome del Ragazzo / Bambino',
        required: true,
        isCoreField: true,
        coreMapping: 'cognomeRagazzo'
    },
    {
        id: 'core-nascita',
        type: 'question',
        questionType: 'date',
        title: 'Data di Nascita',
        description: 'Indispensabile per verificare l\'annata di ingresso nella branca corretta.',
        required: true,
        isCoreField: true,
        coreMapping: 'dataNascita'
    },
    {
        id: 'core-classe',
        type: 'question',
        questionType: 'dropdown',
        title: 'Classe Scolastica frequentata',
        description: 'Classe frequentata nell\'anno scolastico in corso.',
        required: true,
        isCoreField: true,
        coreMapping: 'classe',
        options: [...CLASSI]
    },
    {
        id: 'core-note',
        type: 'question',
        questionType: 'paragraph',
        title: 'Note o Informazioni Aggiuntive',
        description: 'Segnala eventuali fratelli già in gruppo, preferenze di contatto o altre note.',
        required: false,
        isCoreField: true,
        coreMapping: 'note'
    }
];

export interface ScoutQuestionTemplate {
    category: string;
    questions: FormQuestion[];
}

export const SCOUT_QUESTION_TEMPLATES: ScoutQuestionTemplate[] = [
    {
        category: 'Famiglia & Fratelli',
        questions: [
            {
                id: 'tmpl-fratelli',
                type: 'question',
                questionType: 'multiple_choice',
                title: 'Ci sono altri fratelli o sorelle già iscritti in questo gruppo scout?',
                required: false,
                options: ['Sì', 'No'],
                hasOtherOption: true
            },
            {
                id: 'tmpl-genitori-scout',
                type: 'question',
                questionType: 'multiple_choice',
                title: 'Uno dei genitori o parenti è stato scout in passato?',
                required: false,
                options: ['Sì, nello stesso gruppo', 'Sì, in un altro gruppo scout', 'No']
            },
            {
                id: 'tmpl-aiuto-genitori',
                type: 'question',
                questionType: 'checkboxes',
                title: 'Come genitori, avete disponibilità o competenze per dare una mano al gruppo in caso di bisogno?',
                required: false,
                options: [
                    'Trasporti e passaggi con auto/furgone',
                    'Lavori manuali, manutenzione sede e falegnameria',
                    'Cucina per eventi o campi',
                    'Supporto organizzativo o logistico'
                ],
                hasOtherOption: true
            }
        ]
    },
    {
        category: 'Salute & Attenzioni',
        questions: [
            {
                id: 'tmpl-allergie',
                type: 'question',
                questionType: 'multiple_choice',
                title: 'Il ragazzo/a presenta allergie o intolleranze alimentari?',
                required: true,
                options: ['Nessuna allergia nota', 'Sì, allergia o intolleranza (specificare)'],
                hasOtherOption: true
            },
            {
                id: 'tmpl-nuoto',
                type: 'question',
                questionType: 'multiple_choice',
                title: 'Capacità di nuotare',
                required: false,
                options: ['Sa nuotare con sicurezza', 'Galleggia / poco sicuro', 'Non sa nuotare']
            },
            {
                id: 'tmpl-salute-note',
                type: 'question',
                questionType: 'paragraph',
                title: 'Ci sono attenzioni particolari o indicazioni che i capi dovrebbero conoscere?',
                required: false
            }
        ]
    },
    {
        category: 'Fede & Sacramenti',
        questions: [
            {
                id: 'tmpl-battesimo',
                type: 'question',
                questionType: 'multiple_choice',
                title: 'Sacramenti ricevuti',
                required: false,
                options: [
                    'Battesimo',
                    'Battesimo e Prima Comunione',
                    'Cresima',
                    'Nessun sacramento / Altro percorso'
                ],
                hasOtherOption: true
            }
        ]
    },
    {
        category: 'Privacy & Consensi',
        questions: [
            {
                id: 'tmpl-foto',
                type: 'question',
                questionType: 'multiple_choice',
                title: 'Consenso all\'uso di foto e video per attività interne di gruppo',
                description: 'Foto per diari di bordo, cartelloni di sede e giornalino di gruppo.',
                required: true,
                options: ['Acconsento', 'Non acconsento']
            }
        ]
    }
];
