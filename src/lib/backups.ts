import { supabase } from './supabase';
import { getLocations } from './data';

export interface BackupSnapshot {
    id: string;
    created_at: string;
    month_year: string;
    content: any;
    created_by: string;
}

/**
 * Checks if a backup exists for the current month.
 * If not, creates a new one with all current location data.
 */
export async function autoCreateMonthlySnapshot() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const now = new Date();
        const monthYear = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

        // Check if backup already exists for this month
        const { data: existing, error: checkError } = await supabase
            .from('backups')
            .select('id')
            .eq('month_year', monthYear)
            .limit(1);

        if (checkError) throw checkError;

        if (existing && existing.length > 0) {
            console.log(`Backup for ${monthYear} already exists.`);
            return;
        }

        // Create new backup
        const locations = await getLocations();

        const { error: insertError } = await supabase
            .from('backups')
            .insert({
                month_year: monthYear,
                content: {
                    locations,
                    exported_at: now.toISOString(),
                    version: '1.0'
                },
                created_by: user.id
            });

        if (insertError) throw insertError;
        console.log(`Successfully created monthly backup for ${monthYear}`);
    } catch (error) {
        console.error('Error in autoCreateMonthlySnapshot:', error);
    }
}

/**
 * Fetches all available backups.
 */
export async function getBackups(): Promise<BackupSnapshot[]> {
    const { data, error } = await supabase
        .from('backups')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching backups:', error);
        return [];
    }
    return data;
}

/**
 * Triggers a manual download of the JSON content
 */
export function downloadBackup(backup: BackupSnapshot) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup.content, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `orme_backup_${backup.month_year}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}
