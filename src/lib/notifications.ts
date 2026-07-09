import { supabase } from './supabase';
import { getUser } from './data';

export interface AppNotification {
    id: string;
    userId: string;
    groupId: string;
    type: 'verbale_saved' | 'location_added' | 'proposal' | 'calendario_evento' | 'generic';
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

/** Synthesize and play a notification chime using native Web Audio API */
export function playNotificationSound(tone: string) {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
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
        } else if (tone === 'campfire') {
            // Campfire crackle: white noise with quick envelope spikes
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
            gainNode.gain.setValueAtTime(0.04, now);
            
            noise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            noise.start(now);
            noise.stop(now + 0.5);
        } else if (tone === 'nature_birds') {
            // High-pitched frequency sweeps
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
            // Guitar arpeggio chord: C major (C4, E4, G4, C5) staggered start
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

