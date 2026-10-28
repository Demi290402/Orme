import { supabase } from './supabase';
import { getUser } from './data';
import { 
    NotificationCategory, 
    NotificationChannelPref, 
    UserNotificationPreferences, 
    DEFAULT_NOTIFICATION_PREFERENCES 
} from '@/types';
import { sendGroupEmailNotification } from './emailNotification';

export interface AppNotification {
    id: string;
    userId: string;
    groupId: string;
    type: 'verbale_saved' | 'location_added' | 'proposal' | 'calendario_evento' | 'generic' | 'nuovo_capo' | 'richiesta_accesso' | 'lista_attesa' | 'location_updated';
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

/** Read preferences from local storage with safe fallback to defaults */
export function getLocalNotificationPreferences(): UserNotificationPreferences {
    try {
        const saved = localStorage.getItem('orme_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.notificationPreferences) {
                return {
                    ...DEFAULT_NOTIFICATION_PREFERENCES,
                    ...parsed.notificationPreferences,
                };
            }
        }
        const direct = localStorage.getItem('orme_notification_preferences');
        if (direct) {
            return {
                ...DEFAULT_NOTIFICATION_PREFERENCES,
                ...JSON.parse(direct),
            };
        }
    } catch (e) {
        console.warn('Error reading local notification preferences:', e);
    }
    return DEFAULT_NOTIFICATION_PREFERENCES;
}

/** Save preferences and tone locally to all storage keys */
export function saveLocalNotificationPreferences(prefs: UserNotificationPreferences, tone?: string) {
    try {
        localStorage.setItem('orme_notification_preferences', JSON.stringify(prefs));
        const saved = JSON.parse(localStorage.getItem('orme_settings') || '{}');
        saved.notificationPreferences = prefs;
        if (tone) {
            saved.suonoNotifica = tone;
            saved.notifTone = tone;
            saved.notificationTone = tone;
        }
        localStorage.setItem('orme_settings', JSON.stringify(saved));
    } catch (e) {
        console.warn('Error saving local notification preferences:', e);
    }
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
 * Backward-compatible helper to insert notifications for a group.
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
        .or(`group_id.eq.${groupId},group_name.eq.${groupId}`);

    if (usersErr || !usersData) {
        console.error('createNotificationsForGroup: cannot fetch users', usersErr);
        return;
    }

    const rows = usersData
        .filter(u => !excludeUserId || u.id !== excludeUserId)
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

export interface DispatchNotificationParams {
    groupId: string;
    groupName?: string;
    category: NotificationCategory;
    type: AppNotification['type'];
    title: string;
    body: string;
    data?: Record<string, any>;
    actionUrl?: string;
    actionLabel?: string;
    excludeUserId?: string; // If omitted/undefined, modifier is ALSO included
}

/**
 * Unified notification dispatcher for Comunità Capi:
 * Checks each member's preferences (in_app / email / entrambe / disattivo) for the given category.
 * If the user has in-app active, inserts a row into the notifications table.
 * If the user has email active, sends an email to their address.
 * The author/modifier is NOT excluded unless explicitly passed in excludeUserId.
 */
export async function dispatchGroupNotification(params: DispatchNotificationParams): Promise<void> {
    const { groupId, groupName, category, type, title, body, data, actionUrl, actionLabel, excludeUserId } = params;
    if (!groupId) return;

    try {
        let usersData: any[] = [];
        try {
            const { data: resData, error } = await supabase
                .from('users')
                .select('id, email, first_name, last_name, nickname, membership_status, notification_preferences')
                .or(`group_id.eq.${groupId},group_name.eq.${groupId}`);
            if (!error && resData) {
                usersData = resData;
            } else {
                const { data: fallbackData } = await supabase
                    .from('users')
                    .select('id, email, first_name, last_name, nickname, membership_status')
                    .or(`group_id.eq.${groupId},group_name.eq.${groupId}`);
                usersData = fallbackData || [];
            }
        } catch {
            const { data: fallbackData } = await supabase
                .from('users')
                .select('id, email, first_name, last_name, nickname, membership_status')
                .or(`group_id.eq.${groupId},group_name.eq.${groupId}`);
            usersData = fallbackData || [];
        }

        if (usersData.length === 0) return;

        let currentUserId = '';
        try {
            const currentUser = await getUser();
            currentUserId = currentUser?.id || '';
        } catch {}

        const localPrefs = getLocalNotificationPreferences();

        const inAppRows: any[] = [];
        const emailRecipients: string[] = [];

        for (const u of usersData) {
            // Optional exclusion
            if (excludeUserId && u.id === excludeUserId) {
                continue;
            }

            // Determine channel preference for this category
            let pref: NotificationChannelPref = 'entrambe';
            if (u.id === currentUserId) {
                pref = localPrefs[category] ?? (u.notification_preferences?.[category] || 'entrambe');
            } else if (u.notification_preferences && u.notification_preferences[category]) {
                pref = u.notification_preferences[category];
            }

            // In-app channel
            if (pref === 'entrambe' || pref === 'in_app') {
                inAppRows.push({
                    user_id: u.id,
                    group_id: groupId,
                    type,
                    title,
                    body,
                    data: data ?? null,
                    is_read: false,
                });
            }

            // Email channel
            if (pref === 'entrambe' || pref === 'email') {
                const em = (u.email || '').trim().toLowerCase();
                if (em && em.includes('@') && !em.includes('example.com')) {
                    emailRecipients.push(em);
                }
            }
        }

        // 1. Insert In-App Notifications
        if (inAppRows.length > 0) {
            const { error: insertErr } = await supabase.from('notifications').insert(inAppRows);
            if (insertErr) {
                console.warn('dispatchGroupNotification in-app insert error:', insertErr);
            }
        }

        // 2. Send Emails via Supabase Function
        if (emailRecipients.length > 0) {
            const uniqueEmails = Array.from(new Set(emailRecipients));
            sendGroupEmailNotification({
                groupId,
                groupName,
                type: (category === 'verbali' ? 'verbale' : category) as any,
                subject: title,
                title: title,
                body,
                actionUrl,
                actionLabel,
                recipientEmails: uniqueEmails,
            }).catch(e => console.warn('dispatchGroupNotification email error:', e));
        }
    } catch (err) {
        console.error('dispatchGroupNotification error:', err);
    }
}

/** Synthesize and play a notification chime using native Web Audio API */
export function playNotificationSound(tone: string) {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }
        const now = ctx.currentTime;

        if (tone === 'scout_horn') {
            // Horn tone: 392Hz (G4) and 440Hz (A4)
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            osc1.type = 'sawtooth';
            osc2.type = 'triangle';
            
            osc1.frequency.setValueAtTime(392, now);
            osc2.frequency.setValueAtTime(440, now);
            
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05);
            gainNode.gain.setValueAtTime(0.2, now + 0.35);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
            
            osc1.connect(gainNode);
            osc2.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.6);
            osc2.stop(now + 0.6);
        } else if (tone === 'camp_bell') {
            // Campana da campo scout
            const bellFreqs = [659.25, 1318.5, 1975.5, 2637];
            const bellDecays = [1.2, 0.9, 0.6, 0.4];
            bellFreqs.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.12 / (i + 1), now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + bellDecays[i]);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + bellDecays[i]);
            });
        } else if (tone === 'campfire') {
            // Campfire crackle
            const bufferSize = ctx.sampleRate * 0.5;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 1000;
            
            const gainNode = ctx.createGain();
            gainNode.gain.setValueAtTime(0.05, now);
            
            noise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            noise.start(now);
            noise.stop(now + 0.5);
        } else if (tone === 'nature_birds') {
            // Canto degli uccelli
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(2000, now);
            osc.frequency.exponentialRampToValueAtTime(3000, now + 0.1);
            osc.frequency.setValueAtTime(2500, now + 0.12);
            osc.frequency.exponentialRampToValueAtTime(3500, now + 0.22);
            
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.15, now + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
            
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            osc.start(now);
            osc.stop(now + 0.28);
        } else if (tone === 'guitar_chord') {
            // Chitarra arpeggiata
            const freqs = [261.63, 329.63, 392.00, 523.25];
            freqs.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gainNode = ctx.createGain();
                
                osc.type = 'triangle';
                osc.frequency.value = freq;
                
                const noteStart = now + (idx * 0.05);
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.setValueAtTime(0, noteStart);
                gainNode.gain.linearRampToValueAtTime(0.12, noteStart + 0.02);
                gainNode.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.7);
                
                osc.connect(gainNode);
                gainNode.connect(ctx.destination);
                
                osc.start(noteStart);
                osc.stop(noteStart + 0.7);
            });
        } else {
            // Default beep
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now);
            
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            osc.start(now);
            osc.stop(now + 0.25);
        }
    } catch (e) {
        console.error("Web Audio failed:", e);
    }
}
