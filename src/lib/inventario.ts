import { supabase } from './supabase';
import { InventarioLuogo, InventarioAttrezzo } from '@/types';
import { getUser } from './data';
import { addPointsWithStats } from './gamification';

// =====================================================
// UTILS: IMAGE COMPRESSION
// =====================================================

/**
 * Resizes and compresses an image on the client side using Canvas API.
 * Downscales the image so the maximum dimension is 600px (preserving aspect ratio)
 * and compresses it to a JPEG blob with the specified quality.
 */
export async function resizeAndCompressImage(file: File, maxWidth = 600, maxHeight = 600, quality = 0.75): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions keeping aspect ratio
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context not available'));
                    return;
                }

                // Draw image on canvas
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to JPEG blob
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to compress image to Blob'));
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

/**
 * Converts a Blob to a base64 Data URL string
 */
export function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// =====================================================
// STORAGE: UPLOAD IMAGES
// =====================================================

/**
 * Uploads a compressed image blob to Supabase storage bucket 'inventario_immagini'.
 * If the upload fails (e.g. bucket doesn't exist yet), it returns the base64 data url as a fallback.
 */
export async function uploadAttrezzoImage(file: Blob, originalName: string): Promise<string> {
    try {
        const sanitizedPath = `attrezzi/${Date.now()}_${originalName.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        
        const { data, error } = await supabase.storage
            .from('inventario_immagini')
            .upload(sanitizedPath, file, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.warn('Storage upload error, falling back to base64:', error.message);
            return await blobToBase64(file);
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
            .from('inventario_immagini')
            .getPublicUrl(data.path);

        return publicUrlData.publicUrl;
    } catch (e: any) {
        console.warn('Image upload exception, falling back to base64:', e);
        return await blobToBase64(file);
    }
}

// =====================================================
// CRUD: INVENTARIO LUOGHI
// =====================================================

export async function getInventarioLuoghi(): Promise<InventarioLuogo[]> {
    try {
        const currentUser = await getUser();
        if (!currentUser.groupId) return [];

        const { data, error } = await supabase
            .from('inventario_luoghi')
            .select('*')
            .eq('group_id', currentUser.groupId)
            .order('name', { ascending: true });

        if (error) throw error;

        // Auto-seed if empty
        if (!data || data.length === 0) {
            const defaultLuoghi = [
                { group_id: currentUser.groupId, name: 'Sede', color: '#4CAF50', icon: 'Home', description: 'Sede di Gruppo' },
                { group_id: currentUser.groupId, name: 'Magazzino', color: '#8B4513', icon: 'Archive', description: 'Magazzino Materiali' }
            ];

            const { data: seeded, error: seedError } = await supabase
                .from('inventario_luoghi')
                .insert(defaultLuoghi)
                .select();

            if (seedError) {
                console.error('Error seeding default inventory locations:', seedError);
                return [];
            }
            return (seeded || []).map(mapDbLuogoToLuogo);
        }

        return data.map(mapDbLuogoToLuogo);
    } catch (error) {
        console.error('Error fetching inventario luoghi:', error);
        return [];
    }
}

export async function addInventarioLuogo(luogo: Omit<InventarioLuogo, 'id' | 'groupId'>): Promise<InventarioLuogo | null> {
    try {
        const currentUser = await getUser();
        if (!currentUser.groupId) throw new Error('User has no group associated');

        const { data, error } = await supabase
            .from('inventario_luoghi')
            .insert({
                group_id: currentUser.groupId,
                name: luogo.name,
                description: luogo.description || '',
                color: luogo.color || '#4CAF50',
                icon: luogo.icon || 'MapPin'
            })
            .select()
            .single();

        if (error) throw error;

        // Earn 2 points for configuration changes
        await addPointsWithStats(2, { inventoryUpdates: 1 });

        return mapDbLuogoToLuogo(data);
    } catch (error) {
        console.error('Error adding inventario luogo:', error);
        return null;
    }
}

export async function updateInventarioLuogo(luogo: InventarioLuogo): Promise<InventarioLuogo | null> {
    try {
        const { data, error } = await supabase
            .from('inventario_luoghi')
            .update({
                name: luogo.name,
                description: luogo.description || '',
                color: luogo.color,
                icon: luogo.icon,
                updated_at: new Date().toISOString()
            })
            .eq('id', luogo.id)
            .select()
            .single();

        if (error) throw error;

        await addPointsWithStats(2, { inventoryUpdates: 1 });

        return mapDbLuogoToLuogo(data);
    } catch (error) {
        console.error('Error updating inventario luogo:', error);
        return null;
    }
}

export async function deleteInventarioLuogo(id: string): Promise<boolean> {
    try {
        // Safe delete: database will set NULL to luogo_id of referencing tools
        const { error } = await supabase
            .from('inventario_luoghi')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting inventario luogo:', error);
        return false;
    }
}

// =====================================================
// CRUD: INVENTARIO ATTREZZI
// =====================================================

export async function getInventarioAttrezzi(): Promise<InventarioAttrezzo[]> {
    try {
        const currentUser = await getUser();
        if (!currentUser.groupId) return [];

        const { data, error } = await supabase
            .from('inventario_attrezzi')
            .select('*')
            .eq('group_id', currentUser.groupId)
            .order('name', { ascending: true });

        if (error) throw error;
        return (data || []).map(mapDbAttrezzoToAttrezzo);
    } catch (error) {
        console.error('Error fetching inventario attrezzi:', error);
        return [];
    }
}

export async function addInventarioAttrezzo(attrezzo: Omit<InventarioAttrezzo, 'id' | 'groupId'>): Promise<InventarioAttrezzo | null> {
    try {
        const currentUser = await getUser();
        if (!currentUser.groupId) throw new Error('User has no group associated');

        const { data, error } = await supabase
            .from('inventario_attrezzi')
            .insert({
                group_id: currentUser.groupId,
                name: attrezzo.name,
                category: attrezzo.category,
                description: attrezzo.description || '',
                tags: attrezzo.tags || [],
                status: attrezzo.status || 'disponibile',
                luogo_id: attrezzo.luogoId,
                image_url: attrezzo.imageUrl || '',
                quantity: attrezzo.quantity || 1,
                is_dangerous: attrezzo.isDangerous || false,
                is_consumable: attrezzo.isConsumable || false,
                last_checked_at: new Date().toISOString(),
                last_checked_by: currentUser.id
            })
            .select()
            .single();

        if (error) throw error;

        // Earn 2 points for adding tool
        await addPointsWithStats(2, { inventoryUpdates: 1 });

        return mapDbAttrezzoToAttrezzo(data);
    } catch (error) {
        console.error('Error adding inventario attrezzo:', error);
        return null;
    }
}

export async function updateInventarioAttrezzo(attrezzo: InventarioAttrezzo): Promise<InventarioAttrezzo | null> {
    try {
        const currentUser = await getUser();
        const { data, error } = await supabase
            .from('inventario_attrezzi')
            .update({
                name: attrezzo.name,
                category: attrezzo.category,
                description: attrezzo.description || '',
                tags: attrezzo.tags || [],
                status: attrezzo.status,
                luogo_id: attrezzo.luogoId,
                image_url: attrezzo.imageUrl,
                quantity: attrezzo.quantity,
                is_dangerous: attrezzo.isDangerous,
                is_consumable: attrezzo.isConsumable,
                last_checked_at: new Date().toISOString(),
                last_checked_by: currentUser.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', attrezzo.id)
            .select()
            .single();

        if (error) throw error;

        // Earn 2 points for updating tool
        await addPointsWithStats(2, { inventoryUpdates: 1 });

        return mapDbAttrezzoToAttrezzo(data);
    } catch (error) {
        console.error('Error updating inventario attrezzo:', error);
        return null;
    }
}

export async function deleteInventarioAttrezzo(id: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('inventario_attrezzi')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting inventario attrezzo:', error);
        return false;
    }
}

/**
 * Quick audit (censimento rapido) of multiple tools at once.
 * Validates their presence and updates their state.
 * Grants +15 points.
 */
export async function auditInventarioAttrezzi(
    updates: { id: string; status: any; quantity: number }[]
): Promise<boolean> {
    try {
        const currentUser = await getUser();
        const now = new Date().toISOString();

        for (const item of updates) {
            await supabase
                .from('inventario_attrezzi')
                .update({
                    status: item.status,
                    quantity: item.quantity,
                    last_checked_at: now,
                    last_checked_by: currentUser.id
                })
                .eq('id', item.id);
        }

        // Earn +15 points for database audit check
        await addPointsWithStats(15, { inventoryAudits: 1 });
        return true;
    } catch (e) {
        console.error('Error auditing tools:', e);
        return false;
    }
}

// =====================================================
// MAPPING HELPERS
// =====================================================

function mapDbLuogoToLuogo(row: any): InventarioLuogo {
    return {
        id: row.id,
        groupId: row.group_id,
        name: row.name,
        description: row.description,
        color: row.color,
        icon: row.icon,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function mapDbAttrezzoToAttrezzo(row: any): InventarioAttrezzo {
    return {
        id: row.id,
        groupId: row.group_id,
        name: row.name,
        category: row.category,
        description: row.description,
        tags: row.tags || [],
        status: row.status,
        luogoId: row.luogo_id,
        imageUrl: row.image_url,
        quantity: row.quantity || 1,
        isDangerous: row.is_dangerous || false,
        isConsumable: row.is_consumable || false,
        lastCheckedAt: row.last_checked_at,
        lastCheckedBy: row.last_checked_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

export async function getAttrezziForEvento(eventoId: string): Promise<EventoAttrezzoRelation[]> {
    try {
        const { data, error } = await supabase
            .from('inventario_evento_attrezzi')
            .select(`
                evento_id,
                attrezzo_id,
                quantity,
                checked_out,
                checked_in,
                inventario_attrezzi:attrezzo_id (*)
            `)
            .eq('evento_id', eventoId);

        if (error) throw error;
        
        return (data || []).map((row: any) => ({
            eventoId: row.evento_id,
            attrezzoId: row.attrezzo_id,
            quantity: row.quantity,
            checkedOut: row.checked_out,
            checkedIn: row.checked_in,
            attrezzo: row.inventario_attrezzi ? mapDbAttrezzoToAttrezzo(row.inventario_attrezzi) : undefined
        }));
    } catch (error) {
        console.error('Error fetching attrezzi for event:', error);
        return [];
    }
}

export async function saveAttrezzoForEvento(eventoId: string, attrezzoId: string, quantity: number): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('inventario_evento_attrezzi')
            .upsert({
                evento_id: eventoId,
                attrezzo_id: attrezzoId,
                quantity: quantity
            }, { onConflict: 'evento_id,attrezzo_id' });

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error saving attrezzo for event:', error);
        return false;
    }
}

export async function removeAttrezzoFromEvento(eventoId: string, attrezzoId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('inventario_evento_attrezzi')
            .delete()
            .eq('evento_id', eventoId)
            .eq('attrezzo_id', attrezzoId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error removing attrezzo from event:', error);
        return false;
    }
}

export async function toggleCheckedOutAttrezzoEvento(eventoId: string, attrezzoId: string, checkedOut: boolean): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('inventario_evento_attrezzi')
            .update({ checked_out: checkedOut, checked_in: false }) // Reset checkedIn if status changes
            .eq('evento_id', eventoId)
            .eq('attrezzo_id', attrezzoId);

        if (error) throw error;
        
        // Gamification points when checked out
        if (checkedOut) {
            await addPointsWithStats(2, { inventoryUpdates: 1 });
        }
        return true;
    } catch (error) {
        console.error('Error toggling checkedOut for event attrezzo:', error);
        return false;
    }
}

export async function toggleCheckedInAttrezzoEvento(eventoId: string, attrezzoId: string, checkedIn: boolean): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('inventario_evento_attrezzi')
            .update({ checked_in: checkedIn })
            .eq('evento_id', eventoId)
            .eq('attrezzo_id', attrezzoId);

        if (error) throw error;

        // Gamification points when returned
        if (checkedIn) {
            await addPointsWithStats(2, { inventoryUpdates: 1 });
        }
        return true;
    } catch (error) {
        console.error('Error toggling checkedIn for event attrezzo:', error);
        return false;
    }
}

import { EventoAttrezzoRelation } from '@/types';

