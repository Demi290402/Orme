import { supabase } from './supabase';
import { Location, User } from '@/types';

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

export async function getUser(id?: string): Promise<User> {
    try {
        if (id) {
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user logged in');

        const { data: profileData, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError) throw profileError;

        return mapSupabaseUserToUser(profileData);
    } catch (error) {
        throw new Error('No user logged in');
    }
}

export async function updateUser(updatedUser: User) {
    const { error } = await supabase
        .from('users')
        .update({
            first_name: updatedUser.firstName,
            last_name: updatedUser.lastName,
            nickname: updatedUser.nickname,
            profile_picture: updatedUser.profilePicture,
            cover_image: updatedUser.coverImage,
            scout_code: updatedUser.scoutCode,
            points: updatedUser.points,
            level: updatedUser.level,
            badges: updatedUser.badges,
            locations_added: updatedUser.locationsAdded,
            contributions_approved: updatedUser.contributionsApproved,
            validations_given: updatedUser.validationsGiven,
            rs_locations_added: updatedUser.rsLocationsAdded,
            pricing_info_added: updatedUser.pricingInfoAdded,
            coordinate_info_added: updatedUser.coordinateInfoAdded,
            website_info_added: updatedUser.websiteInfoAdded,
        })
        .eq('id', updatedUser.id);

    if (error) throw error;
}

export async function getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('points', { ascending: false });

    if (error) throw error;
    return data.map(mapSupabaseUserToUser);
}

// =====================================================
// LOCATION MANAGEMENT
// =====================================================

export async function getLocations(): Promise<Location[]> {
    const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching locations:', error);
        return [];
    }

    return data.map(mapSupabaseLocationToLocation);
}

export async function addLocation(location: Omit<Location, 'id' | 'lastUpdatedAt' | 'lastUpdatedBy'>) {
    try {
        const currentUser = await getUser();

        const { data, error } = await supabase
            .from('locations')
            .insert({
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
                has_pastures: location.hasPastures,
                has_insects: location.hasInsects,
                has_diseases: location.hasDiseases,
                has_little_shade: location.hasLittleShade,
                has_very_busy_area: location.hasVeryBusyArea,
                other_attention: location.otherAttention,
                other_logistics: location.otherLogistics,
                rover_service_description: location.roverServiceDescription,
                restrictions: location.restrictions,
                other_restrictions: location.otherRestrictions,
                website: location.website,
                email: location.email,
                description: location.description,
                pricing: location.pricing,
                last_updated_by: currentUser.id,
            })
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

        return mapSupabaseLocationToLocation(data);
    } catch (error) {
        console.error('Error adding location:', error);
        throw error;
    }
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
    };
}

function mapSupabaseLocationToLocation(data: any): Location {
    return {
        id: data.id,
        name: data.name,
        region: data.region,
        province: data.province,
        commune: data.commune,
        address: data.address,
        contacts: data.contacts,
        activities: data.activities,
        quickNote: data.quick_note,
        coordinates: data.coordinates,
        beds: data.beds,
        bathrooms: data.bathrooms,
        hasTents: data.has_tents,
        hasRefectory: data.has_refectory,
        hasRoverService: data.has_rover_service,
        hasChurch: data.has_church,
        hasGreenSpace: data.has_green_space,
        hasEquippedKitchen: data.has_equipped_kitchen,
        hasPoles: data.has_poles,
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
    };
}

// Keep old exports for compatibility
export const MOCK_USERS: User[] = [];
export const MOCK_LOCATIONS: Location[] = [];
