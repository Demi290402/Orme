import { supabase } from './supabase';
import { getUser } from './data';

export interface AppNotification {
    id: string;
    userId: string;
    groupId: string;
    type: 'verbale_saved' | 'location_added' | 'proposal' | 'generic';
    title: string;
    body: string;
    data?: Record<string, any>;
    isRead: boolean;
    createdAt: string;
}

function mapRow(row: any): AppNotification {
    return {
        id: row.id,
        userId: row.user_id,
        groupId: row.group_id,
        type: row.type,
        title: row.title,
        body: row.body,
        data: row.data,
        isRead: row.is_read,
        createdAt: row.created_at,
    };
}

/** Fetch all notifications for the current user (most recent first) */
export async function getNotifications(): Promise<AppNotification[]> {
    const user = await getUser();
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
    if (error) { console.error('getNotifications error:', error); return []; }
    return (data || []).map(mapRow);
}

/** Mark a single notification as read */
export async function markAsRead(id: string): Promise<void> {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
}

/** Mark all notifications of the current user as read */
export async function markAllAsRead(): Promise<void> {
    const user = await getUser();
    await supabase.from('notifications').update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
}

/** Create a notification for a specific user */
export async function createNotification(
    userId: string,
    groupId: string,
    type: AppNotification['type'],
    title: string,
    body: string,
    data?: Record<string, any>
): Promise<void> {
    const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        group_id: groupId,
        type,
        title,
        body,
        data: data ?? null,
        is_read: false,
    });
    if (error) console.error('createNotification error:', error);
}

/**
 * Create a notification for ALL users in a group, excluding the sender.
 * Fetches the user list directly from the users table.
 */
export async function createNotificationsForGroup(
    groupId: string,
    type: AppNotification['type'],
    title: string,
    body: string,
    data?: Record<string, any>,
    excludeUserId?: string
): Promise<void> {
    const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('id')
        .eq('group_id', groupId);

    if (usersErr || !usersData) {
        console.error('createNotificationsForGroup: cannot fetch users', usersErr);
        return;
    }

    const rows = usersData
        .filter(u => u.id !== excludeUserId)
        .map(u => ({
            user_id: u.id,
            group_id: groupId,
            type,
            title,
            body,
            data: data ?? null,
            is_read: false,
        }));

    if (rows.length === 0) return;

    const { error } = await supabase.from('notifications').insert(rows);
    if (error) console.error('createNotificationsForGroup error:', error);
}
