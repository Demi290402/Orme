import { supabase } from './supabase';
import { getUser } from './data';
import { isOnline, getCachedData, setCachedData, getOfflineQueue, setOfflineQueue } from './offline';
import { ServizioTrasporto } from '@/types';

// Helper to queue offline operations without cache side effects
function enqueueOfflineWriteDirect(action: 'insert' | 'update' | 'delete' | 'upsert', table: string, data: any, filter?: Record<string, any>) {
    const queue = getOfflineQueue();
    queue.push({
        id: crypto.randomUUID(),
        action,
        table,
        data,
        filter,
        timestamp: Date.now()
    });
    setOfflineQueue(queue);
    window.dispatchEvent(new CustomEvent('offline_queue_changed'));
}

function mapRow(row: any): ServizioTrasporto {
    return {
        id: row.id,
        groupId: row.group_id,
        companyName: row.company_name,
        contactName: row.contact_name || '',
        phone: row.phone || '',
        email: row.email || '',
        departureRegion: row.departure_region,
        departureProvince: row.departure_province || '',
        departureCommune: row.departure_commune,
        departureAddress: row.departure_address || '',
        capacity: Number(row.capacity) || 50,
        pricePerPerson: row.price_per_person ? Number(row.price_per_person) : undefined,
        basePrice: row.base_price ? Number(row.base_price) : undefined,
        km: row.km ? Number(row.km) : undefined,
        numeroPersone: row.numero_persone ? Number(row.numero_persone) : undefined,
        notes: row.notes || '',
        createdAt: row.created_at,
    };
}

export async function getServiziTrasporto(): Promise<ServizioTrasporto[]> {
    const cacheKey = 'servizi_trasporto';
    if (!isOnline()) {
        const cached = getCachedData<any[]>(cacheKey);
        return cached ? cached.map(mapRow) : [];
    }
    try {
        const user = await getUser();
        // Fetch all public transport companies
        const { data: companies, error: companiesError } = await supabase
            .from('servizi_trasporto')
            .select('*')
            .order('created_at', { ascending: false });

        if (companiesError) throw companiesError;

        // Fetch private quotes for the current group
        const { data: quotes, error: quotesError } = await supabase
            .from('preventivi_trasporto')
            .select('*')
            .eq('group_id', user.groupId);

        if (quotesError) throw quotesError;

        // Merge companies and quotes
        const quotesMap = new Map<string, any>((quotes || []).map(q => [q.company_id, q]));

        const mergedData = (companies || []).map(c => {
            const q = quotesMap.get(c.id);
            return {
                ...c,
                base_price: q ? q.base_price : undefined,
                km: q ? q.km : undefined,
                numero_persone: q ? q.numero_persone : undefined,
                notes: q ? q.notes : c.notes // Use quote notes if present, fallback to company notes
            };
        });

        setCachedData(cacheKey, mergedData);
        return mergedData.map(mapRow);
    } catch (err) {
        console.error('getServiziTrasporto error:', err);
        const cached = getCachedData<any[]>(cacheKey);
        return cached ? cached.map(mapRow) : [];
    }
}

export async function addServizioTrasporto(servizio: Omit<ServizioTrasporto, 'id' | 'groupId'>): Promise<ServizioTrasporto | null> {
    try {
        const user = await getUser();
        const sId = crypto.randomUUID();
        
        // 1. Prepare company data
        const companyData = {
            id: sId,
            group_id: user.groupId,
            company_name: servizio.companyName,
            contact_name: servizio.contactName,
            phone: servizio.phone,
            email: servizio.email,
            departure_region: servizio.departureRegion,
            departure_province: servizio.departureProvince,
            departure_commune: servizio.departureCommune,
            departure_address: servizio.departureAddress,
            capacity: Number(servizio.capacity),
            price_per_person: servizio.pricePerPerson ? Number(servizio.pricePerPerson) : null
        };

        // 2. Prepare quote data if basePrice is present
        const hasQuote = servizio.basePrice !== undefined && servizio.basePrice !== null;
        const quoteId = crypto.randomUUID();
        const quoteData = hasQuote ? {
            id: quoteId,
            company_id: sId,
            group_id: user.groupId,
            departure_region: servizio.departureRegion,
            departure_commune: servizio.departureCommune,
            departure_address: servizio.departureAddress,
            base_price: Number(servizio.basePrice),
            km: Number(servizio.km),
            numero_persone: Number(servizio.numeroPersone),
            notes: servizio.notes
        } : null;

        if (!isOnline()) {
            const combinedOfflineRow = {
                ...companyData,
                base_price: hasQuote ? servizio.basePrice : undefined,
                km: hasQuote ? servizio.km : undefined,
                numero_persone: hasQuote ? servizio.numeroPersone : undefined,
                notes: servizio.notes
            };

            // Update main read cache manually
            const cached = getCachedData<any[]>('servizi_trasporto') || [];
            setCachedData('servizi_trasporto', [combinedOfflineRow, ...cached]);

            // Queue separate Supabase operations
            enqueueOfflineWriteDirect('insert', 'servizi_trasporto', companyData);
            if (hasQuote && quoteData) {
                enqueueOfflineWriteDirect('insert', 'preventivi_trasporto', quoteData);
            }

            return mapRow({ ...combinedOfflineRow, created_at: new Date().toISOString() });
        }

        // Online mode: insert company
        const { data: insertedCompany, error: companyError } = await supabase
            .from('servizi_trasporto')
            .insert(companyData)
            .select()
            .single();

        if (companyError) throw companyError;

        let insertedQuote = null;
        if (hasQuote && quoteData) {
            const { data: qData, error: quoteError } = await supabase
                .from('preventivi_trasporto')
                .insert(quoteData)
                .select()
                .single();
            if (quoteError) throw quoteError;
            insertedQuote = qData;
        }

        await getServiziTrasporto(); // refresh cache
        return mapRow({
            ...insertedCompany,
            base_price: insertedQuote ? insertedQuote.base_price : undefined,
            km: insertedQuote ? insertedQuote.km : undefined,
            numero_persone: insertedQuote ? insertedQuote.numero_persone : undefined,
            notes: insertedQuote ? insertedQuote.notes : insertedCompany.notes
        });
    } catch (err) {
        console.error('addServizioTrasporto error:', err);
        throw err;
    }
}

export async function updateServizioTrasporto(id: string, servizio: Partial<ServizioTrasporto>): Promise<ServizioTrasporto | null> {
    try {
        const user = await getUser();
        
        // 1. Separate company fields
        const companyData: any = {};
        if (servizio.companyName !== undefined) companyData.company_name = servizio.companyName;
        if (servizio.contactName !== undefined) companyData.contact_name = servizio.contactName;
        if (servizio.phone !== undefined) companyData.phone = servizio.phone;
        if (servizio.email !== undefined) companyData.email = servizio.email;
        if (servizio.departureRegion !== undefined) companyData.departure_region = servizio.departureRegion;
        if (servizio.departureProvince !== undefined) companyData.departure_province = servizio.departureProvince;
        if (servizio.departureCommune !== undefined) companyData.departure_commune = servizio.departureCommune;
        if (servizio.departureAddress !== undefined) companyData.departure_address = servizio.departureAddress;
        if (servizio.capacity !== undefined) companyData.capacity = servizio.capacity;
        if (servizio.pricePerPerson !== undefined) companyData.price_per_person = servizio.pricePerPerson;

        // 2. Identify quote operations
        // If quote values are explicitly cleared (null), we will delete the quote
        const isQuoteDeleted = servizio.basePrice === null;
        const hasQuoteUpdate = !isQuoteDeleted && (servizio.basePrice !== undefined || servizio.km !== undefined || servizio.numeroPersone !== undefined || servizio.notes !== undefined);

        if (!isOnline()) {
            // Update cache manually
            const cached = getCachedData<any[]>('servizi_trasporto') || [];
            const updated = cached.map(item => {
                if (item.id === id) {
                    const result = { ...item, ...servizio };
                    if (isQuoteDeleted) {
                        delete result.base_price;
                        delete result.km;
                        delete result.numero_persone;
                    }
                    return result;
                }
                return item;
            });
            setCachedData('servizi_trasporto', updated);

            // Queue separate writes
            if (Object.keys(companyData).length > 0) {
                enqueueOfflineWriteDirect('update', 'servizi_trasporto', companyData, { id });
            }
            if (isQuoteDeleted) {
                enqueueOfflineWriteDirect('delete', 'preventivi_trasporto', null, { company_id: id, group_id: user.groupId });
            } else if (hasQuoteUpdate) {
                const upsertQuoteData = {
                    company_id: id,
                    group_id: user.groupId,
                    departure_region: servizio.departureRegion || 'Puglia',
                    departure_commune: servizio.departureCommune || '',
                    departure_address: servizio.departureAddress || '',
                    base_price: Number(servizio.basePrice),
                    km: Number(servizio.km),
                    numero_persone: Number(servizio.numeroPersone),
                    notes: servizio.notes
                };
                enqueueOfflineWriteDirect('upsert', 'preventivi_trasporto', upsertQuoteData);
            }

            const found = updated.find(s => s.id === id);
            return found ? mapRow(found) : null;
        }

        // Online mode: update company details
        let updatedCompany = null;
        if (Object.keys(companyData).length > 0) {
            const { data, error } = await supabase
                .from('servizi_trasporto')
                .update(companyData)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            updatedCompany = data;
        } else {
            const { data, error } = await supabase
                .from('servizi_trasporto')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            updatedCompany = data;
        }

        // Manage Quote
        let updatedQuote = null;
        if (isQuoteDeleted) {
            const { error } = await supabase
                .from('preventivi_trasporto')
                .delete()
                .eq('company_id', id)
                .eq('group_id', user.groupId);
            if (error) throw error;
        } else if (hasQuoteUpdate) {
            const { data: existingQuote } = await supabase
                .from('preventivi_trasporto')
                .select('*')
                .eq('company_id', id)
                .eq('group_id', user.groupId)
                .maybeSingle();

            const quotePayload = {
                company_id: id,
                group_id: user.groupId,
                departure_region:  servizio.departureRegion || updatedCompany.departure_region,
                departure_commune: servizio.departureCommune || updatedCompany.departure_commune,
                departure_address:  servizio.departureAddress || updatedCompany.departure_address,
                base_price: Number(servizio.basePrice),
                km: Number(servizio.km),
                numero_persone: Number(servizio.numeroPersone),
                notes: servizio.notes
            };

            if (existingQuote) {
                const { data, error } = await supabase
                    .from('preventivi_trasporto')
                    .update(quotePayload)
                    .eq('company_id', id)
                    .eq('group_id', user.groupId)
                    .select()
                    .single();
                if (error) throw error;
                updatedQuote = data;
            } else {
                const { data, error } = await supabase
                    .from('preventivi_trasporto')
                    .insert(quotePayload)
                    .select()
                    .single();
                if (error) throw error;
                updatedQuote = data;
            }
        } else {
            // Fetch existing quote to merge
            const { data } = await supabase
                .from('preventivi_trasporto')
                .select('*')
                .eq('company_id', id)
                .eq('group_id', user.groupId)
                .maybeSingle();
            updatedQuote = data;
        }

        await getServiziTrasporto(); // refresh cache
        return mapRow({
            ...updatedCompany,
            base_price: updatedQuote ? updatedQuote.base_price : undefined,
            km: updatedQuote ? updatedQuote.km : undefined,
            numero_persone: updatedQuote ? updatedQuote.numero_persone : undefined,
            notes: updatedQuote ? updatedQuote.notes : updatedCompany.notes
        });
    } catch (err) {
        console.error('updateServizioTrasporto error:', err);
        throw err;
    }
}

export async function deleteServizioTrasporto(id: string): Promise<boolean> {
    try {
        if (!isOnline()) {
            // Update cache manually
            const cached = getCachedData<any[]>('servizi_trasporto') || [];
            const updated = cached.filter(item => item.id !== id);
            setCachedData('servizi_trasporto', updated);

            enqueueOfflineWriteDirect('delete', 'servizi_trasporto', null, { id });
            return true;
        }

        const { error } = await supabase
            .from('servizi_trasporto')
            .delete()
            .eq('id', id);

        if (error) throw error;
        await getServiziTrasporto(); // refresh cache
        return true;
    } catch (err) {
        console.error('deleteServizioTrasporto error:', err);
        return false;
    }
}
