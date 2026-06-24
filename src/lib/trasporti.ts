import { supabase } from './supabase';
import { getUser } from './data';
import { isOnline, getCachedData, setCachedData, enqueueOfflineWrite } from './offline';
import { ServizioTrasporto } from '@/types';

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
        notes: row.notes || '',
        createdAt: row.created_at,
    };
}

function mapToSupabase(servizio: Partial<ServizioTrasporto>): any {
    const row: any = {};
    if (servizio.companyName !== undefined) row.company_name = servizio.companyName;
    if (servizio.contactName !== undefined) row.contact_name = servizio.contactName;
    if (servizio.phone !== undefined) row.phone = servizio.phone;
    if (servizio.email !== undefined) row.email = servizio.email;
    if (servizio.departureRegion !== undefined) row.departure_region = servizio.departureRegion;
    if (servizio.departureProvince !== undefined) row.departure_province = servizio.departureProvince;
    if (servizio.departureCommune !== undefined) row.departure_commune = servizio.departureCommune;
    if (servizio.departureAddress !== undefined) row.departure_address = servizio.departureAddress;
    if (servizio.capacity !== undefined) row.capacity = servizio.capacity;
    if (servizio.pricePerPerson !== undefined) row.price_per_person = servizio.pricePerPerson;
    if (servizio.basePrice !== undefined) row.base_price = servizio.basePrice;
    if (servizio.notes !== undefined) row.notes = servizio.notes;
    return row;
}

export async function getServiziTrasporto(): Promise<ServizioTrasporto[]> {
    const cacheKey = 'servizi_trasporto';
    if (!isOnline()) {
        const cached = getCachedData<any[]>(cacheKey);
        return cached ? cached.map(mapRow) : [];
    }
    try {
        const user = await getUser();
        const { data, error } = await supabase
            .from('servizi_trasporto')
            .select('*')
            .eq('group_id', user.groupId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        setCachedData(cacheKey, data);
        return (data || []).map(mapRow);
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
        const rowData = {
            id: sId,
            group_id: user.groupId,
            ...mapToSupabase(servizio)
        };

        if (!isOnline()) {
            enqueueOfflineWrite('insert', 'servizi_trasporto', rowData);
            return mapRow({ ...rowData, created_at: new Date().toISOString() });
        }

        const { data, error } = await supabase
            .from('servizi_trasporto')
            .insert(rowData)
            .select()
            .single();

        if (error) throw error;
        await getServiziTrasporto(); // refresh cache
        return mapRow(data);
    } catch (err) {
        console.error('addServizioTrasporto error:', err);
        throw err;
    }
}

export async function updateServizioTrasporto(id: string, servizio: Partial<ServizioTrasporto>): Promise<ServizioTrasporto | null> {
    try {
        const rowData = mapToSupabase(servizio);

        if (!isOnline()) {
            enqueueOfflineWrite('update', 'servizi_trasporto', rowData, { id });
            const cached = getCachedData<any[]>('servizi_trasporto') || [];
            const found = cached.find(s => s.id === id);
            return found ? mapRow({ ...found, ...rowData }) : null;
        }

        const { data, error } = await supabase
            .from('servizi_trasporto')
            .update(rowData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        await getServiziTrasporto(); // refresh cache
        return mapRow(data);
    } catch (err) {
        console.error('updateServizioTrasporto error:', err);
        throw err;
    }
}

export async function deleteServizioTrasporto(id: string): Promise<boolean> {
    try {
        if (!isOnline()) {
            enqueueOfflineWrite('delete', 'servizi_trasporto', null, { id });
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
