import { supabase } from './supabase';
import { Location, User, LocationReview } from '@/types';
import { createNotificationsForGroup } from './notifications';
import { isOnline, getCachedData, setCachedData, enqueueOfflineWrite } from './offline';

// =====================================================
// GRUPPI SCOUT (per registrazione con cascading dropdown)
// =====================================================

export interface GruppoScout {
    id: number;
    region: string;
    scoutZone: string;
    groupName: string;
}

export async function getGruppiScout(): Promise<GruppoScout[]> {
    const { data, error } = await supabase
        .from('gruppi_scout')
        .select('*')
        .order('region', { ascending: true })
        .order('scout_zone', { ascending: true })
        .order('group_name', { ascending: true });
    if (error) {
        console.error('Error fetching gruppi_scout:', error);
        return [];
    }
    return (data || []).map(g => ({
        id: g.id,
        region: g.region,
        scoutZone: g.scout_zone,
        groupName: g.group_name,
    }));
}

export async function aggiungiGruppoScout(region: string, scoutZone: string, groupName: string): Promise<GruppoScout> {
    const { data, error } = await supabase
        .from('gruppi_scout')
        .insert({ region, scout_zone: scoutZone, group_name: groupName })
        .select()
        .single();
    if (error) {
        // If already exists (UNIQUE constraint), fetch it instead
        const existing = await supabase
            .from('gruppi_scout')
            .select('*')
            .eq('region', region)
            .eq('scout_zone', scoutZone)
            .eq('group_name', groupName)
            .single();
        if (existing.data) {
            return { id: existing.data.id, region: existing.data.region, scoutZone: existing.data.scout_zone, groupName: existing.data.group_name };
        }
        throw error;
    }
    return { id: data.id, region: data.region, scoutZone: data.scout_zone, groupName: data.group_name };
}

// =====================================================
// USER MANAGEMENT
// =====================================================

export async function registerUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    nickname?: string;
    profilePicture?: string;
    coverImage?: string;
    scoutCode?: string;
    region: string;
    scoutZone: string;
    groupName: string;
    groupId: string; // numeric group id as string (e.g. "1", "2")
    formazione?: any[];
    hasNominaCapo?: boolean;
}): Promise<User | null> {
    try {
        // 1. Create auth user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: userData.email,
            password: userData.password,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Failed to create user');

        // 2. Create user profile in users table
        const { data: profileData, error: profileError } = await supabase
            .from('users')
            .insert({
                id: authData.user.id,
                email: userData.email,
                first_name: userData.firstName,
                last_name: userData.lastName,
                nickname: userData.nickname || '',
                profile_picture: userData.profilePicture,
                cover_image: userData.coverImage,
                scout_code: userData.scoutCode,
                region: userData.region,
                scout_zone: userData.scoutZone,
                group_name: userData.groupName,
                group_id: userData.groupId,
                formazione: userData.formazione || [],
                has_nomina_capo: userData.hasNominaCapo || false,
            })
            .select()
            .single();

        if (profileError) throw profileError;

        return mapSupabaseUserToUser(profileData);
    } catch (error) {
        console.error('Registration error:', error);
        if (error instanceof Error) {
            throw new Error(error.message);
        }
        throw new Error('Errore durante la registrazione');
    }
}

export async function loginUser(email: string, password: string): Promise<User | null> {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        if (!data.user) return null;

        // Get user profile
        const { data: profileData, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) throw profileError;

        return mapSupabaseUserToUser(profileData);
    } catch (error) {
        console.error('Login error:', error);
        return null;
    }
}

export async function logoutUser() {
    await supabase.auth.signOut();
}

export async function deleteUserProfile(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Nessun utente autenticato');

    // Delete from users table first (auth record stays, no admin API)
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);
    if (error) throw error;

    // Sign out
    await supabase.auth.signOut();
}

export async function getUser(id?: string): Promise<User> {
    try {
        if (id) {
            if (!isOnline()) {
                const cachedUsers = getCachedData<any[]>('users') || [];
                const found = cachedUsers.find(u => u.id === id);
                if (found) return mapSupabaseUserToUser(found);
                return { id, firstName: 'Utente', lastName: 'Offline', nickname: 'Offline', email: '', password: '', points: 0, level: 1, badges: [], locationsAdded: 0, contributionsApproved: 0, validationsGiven: 0, rsLocationsAdded: 0, pricingInfoAdded: 0, coordinateInfoAdded: 0, websiteInfoAdded: 0, verbaliRead: 0, locationsSearched: 0, eventiAggiunti: 0, searchesLC: 0, searchesEG: 0, searchesRS: 0, searchesCoCa: 0, searchesGruppo: 0, verbaliReadIds: [], storicoItemsAdded: 0, reviewsAdded: 0, formazione: [], hasNominaCapo: false };
            }
            // Get specific user by ID
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return mapSupabaseUserToUser(data);
        }

        // Get current logged-in user
        if (!isOnline()) {
            const cached = getCachedData<any>('currentUser');
            if (cached) return mapSupabaseUserToUser(cached);
            throw new Error('No user logged in (offline)');
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user logged in');

        const { data: profileData, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError) throw profileError;
        setCachedData('currentUser', profileData);

        return mapSupabaseUserToUser(profileData);
    } catch (error) {
        const cached = getCachedData<any>('currentUser');
        if (cached) return mapSupabaseUserToUser(cached);
        throw new Error('No user logged in');
    }
}

export async function getAllUsers(): Promise<User[]> {
    const cacheKey = 'users';
    if (!isOnline()) {
        const cached = getCachedData<any[]>(cacheKey);
        if (cached) return cached.map(mapSupabaseUserToUser);
        return [];
    }
    try {
        const currentUser = await getUser();
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('group_id', currentUser.groupId)
            .order('points', { ascending: false });

        if (error) throw error;
        setCachedData(cacheKey, data);
        return data.map(mapSupabaseUserToUser);
    } catch (error) {
        console.error('Error fetching users:', error);
        const cached = getCachedData<any[]>(cacheKey);
        if (cached) return cached.map(mapSupabaseUserToUser);
        return [];
    }
}

export async function updateUser(user: User): Promise<User> {
    const updateData = {
        first_name: user.firstName,
        last_name: user.lastName,
        nickname: user.nickname,
        profile_picture: user.profilePicture,
        cover_image: user.coverImage,
        scout_code: user.scoutCode,
        email: user.email,
        region: user.region,
        scout_zone: user.scoutZone,
        group_name: user.groupName,
        group_id: user.groupId,
        points: user.points,
        level: user.level,
        badges: user.badges,
        locations_added: user.locationsAdded,
        contributions_approved: user.contributionsApproved,
        validations_given: user.validationsGiven,
        rs_locations_added: user.rsLocationsAdded,
        pricing_info_added: user.pricingInfoAdded,
        coordinate_info_added: user.coordinateInfoAdded,
        website_info_added: user.websiteInfoAdded,
        verbali_read: user.verbaliRead,
        locations_searched: user.locationsSearched,
        searches_lc: user.searchesLC,
        searches_eg: user.searchesEG,
        searches_rs: user.searchesRS,
        searches_coca: user.searchesCoCa,
        searches_gruppo: user.searchesGruppo,
        eventi_aggiunti: user.eventiAggiunti,
        verbali_read_ids: user.verbaliReadIds,
        storico_items_added: user.storicoItemsAdded,
        reviews_added: user.reviewsAdded,
        inventory_updates: user.inventoryUpdates || 0,
        inventory_audits: user.inventoryAudits || 0,
        formazione: user.formazione || [],
        has_nomina_capo: user.hasNominaCapo || false,
    };
    if (!isOnline()) {
        enqueueOfflineWrite('update', 'users', updateData, { id: user.id });
        const cached = getCachedData<any>('currentUser');
        if (cached && cached.id === user.id) {
            setCachedData('currentUser', { ...cached, ...updateData });
        }
        return user;
    }
    try {
        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', user.id)
            .select()
            .single();

        if (error) throw error;
        setCachedData('currentUser', data);
        return mapSupabaseUserToUser(data);
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
}

// =====================================================
// LOCATION MANAGEMENT
// =====================================================

export async function getLocations(): Promise<Location[]> {
    const cacheKey = 'locations';
    if (!isOnline()) {
        const cached = getCachedData<any[]>(cacheKey);
        if (cached) return cached.map(mapSupabaseLocationToLocation);
        return [];
    }
    try {
        const { data, error } = await supabase
            .from('locations')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        setCachedData(cacheKey, data);
        return data.map(mapSupabaseLocationToLocation);
    } catch (error) {
        console.error('Error fetching locations:', error);
        const cached = getCachedData<any[]>(cacheKey);
        if (cached) return cached.map(mapSupabaseLocationToLocation);
        return [];
    }
}

export async function getLocation(id: string): Promise<Location | null> {
    try {
        const { data, error } = await supabase
            .from('locations')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return mapSupabaseLocationToLocation(data);
    } catch (error) {
        console.error(`Error fetching location with ID ${id}:`, error);
        return null;
    }
}

export async function addLocation(location: Omit<Location, 'id' | 'lastUpdatedAt' | 'lastUpdatedBy'>) {
    try {
        const currentUser = await getUser();
        
        // Check for duplicate name
        const checkName = location.name.trim();
        if (isOnline()) {
            const { data: existing } = await supabase
                .from('locations')
                .select('id')
                .ilike('name', checkName)
                .maybeSingle();

            if (existing) {
                throw new Error('Esiste già un luogo registrato con questo nome.');
            }
        } else {
            const cached = getCachedData<any[]>('locations') || [];
            const isDuplicate = cached.some(loc => loc.name.trim().toLowerCase() === checkName.toLowerCase());
            if (isDuplicate) {
                throw new Error('Esiste già un luogo registrato con questo nome.');
            }
        }

        const locationId = crypto.randomUUID();

        const insertData = {
            id: locationId,
            name: location.name,
            region: location.region,
            province: location.province,
            commune: location.commune,
            address: location.address,
            google_maps_link: location.googleMapsLink,
            contacts: location.contacts,
            activities: location.activities,
            quick_note: location.quickNote,
            coordinates: location.coordinates,
            beds: location.beds,
            bathrooms: location.bathrooms,
            has_tents: location.hasTents,
            has_refectory: location.hasRefectory,
            has_rover_service: location.hasRoverService,
            has_church: location.hasChurch,
            has_green_space: location.hasGreenSpace,
            has_equipped_kitchen: location.hasEquippedKitchen,
            has_poles: location.hasPoles,
            has_disabled_access: location.hasDisabledAccess,
            has_pastures: location.hasPastures,
            has_insects: location.hasInsects,
            has_diseases: location.hasDiseases,
            has_little_shade: location.hasLittleShade,
            has_very_busy_area: location.hasVeryBusyArea,
            other_attention: location.otherAttention,
            other_logistics: location.otherLogistics,
            rover_service_description: location.roverServiceDescription,
            restrictions: location.restrictions,
            availability_status: (location as any).availabilityStatus || 'available',
            other_restrictions: location.otherRestrictions,
            website: location.website,
            email: location.email,
            description: location.description,
            pricing: location.pricing,
            last_updated_by: currentUser.id,
            group_id: currentUser.groupId,
        };

        if (!isOnline()) {
            enqueueOfflineWrite('insert', 'locations', insertData);
            return mapSupabaseLocationToLocation({ ...insertData, created_at: new Date().toISOString() });
        }

        const { data, error } = await supabase
            .from('locations')
            .insert(insertData)
            .select()
            .single();

        if (error) throw error;

        // Calculate points based on information provided
        let pointsAwarded = 10; // Base points
        const hasCoordinates = location.coordinates && location.coordinates.lat && location.coordinates.lng;
        const hasPricing = location.pricing && (location.pricing.basePrice > 0 || location.pricing.description);
        const hasWebsite = location.website && location.website.trim() !== '';
        const hasMapsLink = location.googleMapsLink && location.googleMapsLink.trim() !== '';
        const hasLocationInfo = hasCoordinates || (location.address && location.address.trim() !== '') || hasMapsLink;

        if (hasLocationInfo) pointsAwarded += 3;
        if (hasPricing) pointsAwarded += 5;
        if (hasWebsite) pointsAwarded += 2;

        // Update user stats
        await supabase
            .from('users')
            .update({
                locations_added: currentUser.locationsAdded + 1,
                rs_locations_added: location.hasRoverService ? currentUser.rsLocationsAdded + 1 : currentUser.rsLocationsAdded,
                pricing_info_added: hasPricing ? currentUser.pricingInfoAdded + 1 : currentUser.pricingInfoAdded,
                coordinate_info_added: hasCoordinates ? currentUser.coordinateInfoAdded + 1 : currentUser.coordinateInfoAdded,
                website_info_added: hasWebsite ? currentUser.websiteInfoAdded + 1 : currentUser.websiteInfoAdded,
                points: currentUser.points + pointsAwarded,
            })
            .eq('id', currentUser.id);

        // Invia notifica agli altri membri del gruppo (fire and forget)
        if (currentUser.groupId) {
            createNotificationsForGroup(
                currentUser.groupId,
                'location_added',
                `📍 Nuovo luogo: ${location.name || 'Senza nome'}`,
                `${currentUser.nickname || currentUser.firstName} ha aggiunto ${location.name || 'un luogo'} in ${location.commune || location.region || 'un nuovo posto'}.`,
                { locationId: data.id },
                currentUser.id
            ).catch(e => console.error("Error creating location notification:", e));
        }

        return mapSupabaseLocationToLocation(data);
    } catch (error) {
        console.error('Error adding location:', error);
        throw error;
    }
}

export async function updateLocation(id: string, location: Partial<Location>, detailsSummary: string): Promise<Location | null> {
    try {
        const currentUser = await getUser();
        const supabaseData = convertLocationToSupabaseFormat(location);

        if (!isOnline()) {
            enqueueOfflineWrite('update', 'locations', supabaseData, { id });
            
            // Log history offline
            const historyData = {
                location_id: id,
                user_id: currentUser.id,
                author_name: currentUser.nickname || currentUser.firstName,
                details: detailsSummary,
                created_at: new Date().toISOString()
            };
            enqueueOfflineWrite('insert', 'location_history', historyData);

            const cachedLocations = getCachedData<any[]>('locations') || [];
            const found = cachedLocations.find(l => l.id === id);
            return found ? mapSupabaseLocationToLocation({ ...found, ...supabaseData }) : null;
        }

        const { data, error } = await supabase
            .from('locations')
            .update({
                ...supabaseData,
                last_updated_at: new Date().toISOString(),
                last_updated_by: currentUser.id
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Log to history online
        const { error: historyErr } = await supabase
            .from('location_history')
            .insert({
                location_id: id,
                user_id: currentUser.id,
                author_name: currentUser.nickname || currentUser.firstName,
                details: detailsSummary
            });
        if (historyErr) console.error("Error saving history:", historyErr);

        // Update local cache
        await getLocations();

        return mapSupabaseLocationToLocation(data);
    } catch (error) {
        console.error('Error updating location:', error);
        throw error;
    }
}

export async function deleteLocation(id: string): Promise<boolean> {
    try {
        if (!isOnline()) {
            enqueueOfflineWrite('delete', 'locations', null, { id });
            return true;
        }
        const { error } = await supabase
            .from('locations')
            .delete()
            .eq('id', id);
        if (error) throw error;
        
        // Update local cache
        await getLocations();
        
        return true;
    } catch (error) {
        console.error('Error deleting location:', error);
        return false;
    }
}

// =====================================================
// REVIEWS & RATINGS (LE ORME)
// =====================================================

export async function getReviews(locationId: string): Promise<LocationReview[]> {
    const { data, error } = await supabase
        .from('location_reviews')
        .select(`
            *,
            users (
                nickname,
                profile_picture
            )
        `)
        .eq('location_id', locationId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching reviews:', error);
        return [];
    }

    return (data || []).map(r => ({
        id: r.id,
        locationId: r.location_id,
        userId: r.user_id,
        userNickname: r.users?.nickname,
        userProfilePicture: r.users?.profile_picture,
        ombra: r.ombra,
        acquaPotabile: r.acqua_potabile,
        legna: r.legna,
        fuochi: r.fuochi,
        suolo: r.suolo,
        servizi: r.servizi,
        prezzo: r.prezzo,
        sicurezza: r.sicurezza,
        isolamento: r.isolamento,
        commento: r.commento,
        createdAt: r.created_at,
    }));
}

export async function saveReview(review: Partial<LocationReview>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Devi essere autenticato per lasciare una recensione');

    const { error } = await supabase
        .from('location_reviews')
        .upsert({
            location_id: review.locationId,
            user_id: user.id,
            ombra: review.ombra,
            acqua_potabile: review.acquaPotabile,
            legna: review.legna,
            fuochi: review.fuochi,
            suolo: review.suolo,
            servizi: review.servizi,
            prezzo: review.prezzo,
            sicurezza: review.sicurezza,
            isolamento: review.isolamento,
            commento: review.commento,
        }, { onConflict: 'location_id,user_id' });

    if (error) throw error;
}

// =====================================================
// METADATA HELPERS
// =====================================================

export async function getRegions(): Promise<string[]> {
    const { data, error } = await supabase
        .from('users')
        .select('region')
        .not('region', 'is', null);
    if (error) return [];
    return [...new Set(data.map(d => d.region))].sort();
}

export async function getZones(region?: string): Promise<string[]> {
    let query = supabase.from('users').select('scout_zone').not('scout_zone', 'is', null);
    if (region) query = query.eq('region', region);
    const { data, error } = await query;
    if (error) return [];
    return [...new Set(data.map(d => d.scout_zone))].sort();
}

export async function getGroups(zone?: string): Promise<string[]> {
    let query = supabase.from('users').select('group_name').not('group_name', 'is', null);
    if (zone) query = query.eq('scout_zone', zone);
    const { data, error } = await query;
    if (error) return [];
    return [...new Set(data.map(d => d.group_name))].sort();
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function mapSupabaseUserToUser(data: any): User {
    return {
        id: data.id,
        email: data.email,
        password: '', // Never expose password
        firstName: data.first_name,
        lastName: data.last_name,
        nickname: data.nickname || '',
        profilePicture: data.profile_picture,
        coverImage: data.cover_image,
        scoutCode: data.scout_code,
        points: data.points || 0,
        level: data.level || 1,
        badges: data.badges || [],
        locationsAdded: data.locations_added || 0,
        contributionsApproved: data.contributions_approved || 0,
        validationsGiven: data.validations_given || 0,
        rsLocationsAdded: data.rs_locations_added || 0,
        pricingInfoAdded: data.pricing_info_added || 0,
        coordinateInfoAdded: data.coordinate_info_added || 0,
        websiteInfoAdded: data.website_info_added || 0,
        verbaliRead: data.verbali_read || 0,
        locationsSearched: data.locations_searched || 0,
        searchesLC: data.searches_lc || 0,
        searchesEG: data.searches_eg || 0,
        searchesRS: data.searches_rs || 0,
        searchesCoCa: data.searches_coca || 0,
        searchesGruppo: data.searches_gruppo || 0,
        eventiAggiunti: data.eventi_aggiunti || 0,
        verbaliReadIds: data.verbali_read_ids || [],
        storicoItemsAdded: data.storico_items_added || 0,
        reviewsAdded: data.reviews_added || 0,
        inventoryUpdates: data.inventory_updates || 0,
        inventoryAudits: data.inventory_audits || 0,
        region: data.region,
        scoutZone: data.scout_zone,
        groupName: data.group_name,
        groupId: data.group_id,
        formazione: data.formazione || [],
        hasNominaCapo: data.has_nomina_capo || false,
    };
}

export async function getLocationHistory(locationId: string): Promise<any[]> {
    const cacheKey = `location_history_${locationId}`;
    if (!isOnline()) {
        const cached = getCachedData<any[]>(cacheKey);
        return cached || [];
    }
    try {
        const { data, error } = await supabase
            .from('location_history')
            .select('*')
            .eq('location_id', locationId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        setCachedData(cacheKey, data);
        return data;
    } catch (error) {
        console.error('Error fetching location history:', error);
        const cached = getCachedData<any[]>(cacheKey);
        return cached || [];
    }
}

export async function getAllLocationHistory(): Promise<any[]> {
    const cacheKey = 'all_location_history';
    if (!isOnline()) {
        const cached = getCachedData<any[]>(cacheKey);
        return cached || [];
    }
    try {
        const { data, error } = await supabase
            .from('location_history')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        setCachedData(cacheKey, data);
        return data;
    } catch (error) {
        console.error('Error fetching all location history:', error);
        const cached = getCachedData<any[]>(cacheKey);
        return cached || [];
    }
}

export async function getUserLocationViews(): Promise<Record<string, string>> {
    const cacheKey = 'user_location_views';
    if (!isOnline()) {
        const cached = getCachedData<Record<string, string>>(cacheKey);
        return cached || {};
    }
    try {
        const currentUser = await getUser();
        const { data, error } = await supabase
            .from('user_location_views')
            .select('location_id, last_viewed_at')
            .eq('user_id', currentUser.id);

        if (error) throw error;
        
        const viewsMap: Record<string, string> = {};
        data?.forEach((row: any) => {
            viewsMap[row.location_id] = row.last_viewed_at;
        });
        
        setCachedData(cacheKey, viewsMap);
        return viewsMap;
    } catch (error) {
        console.error('Error fetching user location views:', error);
        const cached = getCachedData<Record<string, string>>(cacheKey);
        return cached || {};
    }
}

export async function upsertLocationView(locationId: string): Promise<void> {
    try {
        const currentUser = await getUser();
        const nowStr = new Date().toISOString();
        
        // Cache update
        const cacheKey = 'user_location_views';
        const cached = getCachedData<Record<string, string>>(cacheKey) || {};
        cached[locationId] = nowStr;
        setCachedData(cacheKey, cached);

        if (!isOnline()) {
            enqueueOfflineWrite('upsert', 'user_location_views', {
                user_id: currentUser.id,
                location_id: locationId,
                last_viewed_at: nowStr
            }, { user_id: currentUser.id, location_id: locationId });
            return;
        }

        const { error } = await supabase
            .from('user_location_views')
            .upsert({
                user_id: currentUser.id,
                location_id: locationId,
                last_viewed_at: nowStr
            });

        if (error) throw error;
    } catch (error) {
        console.error('Error upserting location view:', error);
    }
}

function convertLocationToSupabaseFormat(location: Partial<Location>): any {
    const data: any = {};
    if (location.name !== undefined) data.name = location.name;
    if (location.region !== undefined) data.region = location.region;
    if (location.province !== undefined) data.province = location.province;
    if (location.commune !== undefined) data.commune = location.commune;
    if (location.address !== undefined) data.address = location.address;
    if (location.googleMapsLink !== undefined) data.google_maps_link = location.googleMapsLink;
    if (location.contacts !== undefined) data.contacts = location.contacts;
    if (location.activities !== undefined) data.activities = location.activities;
    if (location.quickNote !== undefined) data.quick_note = location.quickNote;
    if (location.coordinates !== undefined) data.coordinates = location.coordinates;
    if (location.beds !== undefined) data.beds = location.beds;
    if (location.bathrooms !== undefined) data.bathrooms = location.bathrooms;
    if (location.hasTents !== undefined) data.has_tents = location.hasTents;
    if (location.hasRefectory !== undefined) data.has_refectory = location.hasRefectory;
    if (location.hasRoverService !== undefined) data.has_rover_service = location.hasRoverService;
    if (location.hasChurch !== undefined) data.has_church = location.hasChurch;
    if (location.hasGreenSpace !== undefined) data.has_green_space = location.hasGreenSpace;
    if (location.hasEquippedKitchen !== undefined) data.has_equipped_kitchen = location.hasEquippedKitchen;
    if (location.hasPoles !== undefined) data.has_poles = location.hasPoles;
    if (location.hasDisabledAccess !== undefined) data.has_disabled_access = location.hasDisabledAccess;
    if (location.hasPastures !== undefined) data.has_pastures = location.hasPastures;
    if (location.hasInsects !== undefined) data.has_insects = location.hasInsects;
    if (location.hasDiseases !== undefined) data.has_diseases = location.hasDiseases;
    if (location.hasLittleShade !== undefined) data.has_little_shade = location.hasLittleShade;
    if (location.hasVeryBusyArea !== undefined) data.has_very_busy_area = location.hasVeryBusyArea;
    if (location.otherAttention !== undefined) data.other_attention = location.otherAttention;
    if (location.otherLogistics !== undefined) data.other_logistics = location.otherLogistics;
    if (location.roverServiceDescription !== undefined) data.rover_service_description = location.roverServiceDescription;
    if (location.restrictions !== undefined) data.restrictions = location.restrictions;
    if (location.availabilityStatus !== undefined) data.availability_status = location.availabilityStatus;
    if (location.otherRestrictions !== undefined) data.other_restrictions = location.otherRestrictions;
    if (location.website !== undefined) data.website = location.website;
    if (location.email !== undefined) data.email = location.email;
    if (location.description !== undefined) data.description = location.description;
    if (location.pricing !== undefined) data.pricing = location.pricing;
    return data;
}

function mapSupabaseLocationToLocation(data: any): Location {
    return {
        id: data.id,
        name: data.name,
        region: data.region,
        province: data.province,
        commune: data.commune,
        address: data.address,
        contacts: (() => {
            let c = data.contacts;
            if (!c) return [];
            if (typeof c === 'string') {
                try { c = JSON.parse(c); } catch { return []; }
            }
            return Array.isArray(c) ? c : [];
        })(),
        activities: data.activities,
        quickNote: data.quick_note,
        coordinates: (() => {
            const c = data.coordinates;
            if (!c) return undefined;
            let obj = c;
            if (typeof c === 'string') {
                try { obj = JSON.parse(c); } catch { return undefined; }
            }
            const lat = Number(obj?.lat);
            const lng = Number(obj?.lng);
            if (isNaN(lat) || isNaN(lng)) return undefined;
            return { lat, lng };
        })(),
        beds: data.beds,
        bathrooms: data.bathrooms,
        hasTents: data.has_tents,
        hasRefectory: data.has_refectory,
        hasRoverService: data.has_rover_service,
        hasChurch: data.has_church,
        hasGreenSpace: data.has_green_space,
        hasEquippedKitchen: data.has_equipped_kitchen,
        hasPoles: data.has_poles,
        hasDisabledAccess: data.has_disabled_access || false,
        hasPastures: data.has_pastures,
        hasInsects: data.has_insects,
        hasDiseases: data.has_diseases,
        hasLittleShade: data.has_little_shade,
        hasVeryBusyArea: data.has_very_busy_area,
        otherAttention: data.other_attention,
        otherLogistics: data.other_logistics,
        roverServiceDescription: data.rover_service_description,
        restrictions: data.restrictions,
        otherRestrictions: data.other_restrictions,
        website: data.website,
        googleMapsLink: data.google_maps_link,
        email: data.email,
        description: data.description,
        pricing: data.pricing,
        lastUpdatedAt: data.last_updated_at,
        lastUpdatedBy: data.last_updated_by,
        availabilityStatus: data.availability_status || 'available',
        avgRating: Number(data.avg_rating) || 0,
        reviewsCount: data.reviews_count || 0,
        priceCategory: data.price_category || 0,
    };
}

// Keep old exports for compatibility
export const MOCK_USERS: User[] = [];
export const MOCK_LOCATIONS: Location[] = [];
