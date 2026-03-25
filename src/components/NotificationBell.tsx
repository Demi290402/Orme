import { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck, MapPin, FileText, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    AppNotification,
} from '@/lib/notifications';
import { getUser } from '@/lib/data';
import { cn } from '@/lib/utils';

function formatRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'adesso';
    if (mins < 60) return `${mins} min fa`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h fa`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}g fa`;
    return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

function NotifIcon({ type }: { type: AppNotification['type'] }) {
    if (type === 'verbale_saved') return <FileText size={16} className="text-scout-blue" />;
    if (type === 'location_added') return <MapPin size={16} className="text-scout-green" />;
    if (type === 'proposal') return <CheckCheck size={16} className="text-orange-500" />;
    return <Info size={16} className="text-gray-400" />;
}

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Load notifications and set up real-time subscription
    useEffect(() => {
        let channel: ReturnType<typeof supabase.channel> | null = null;

        const init = async () => {
            try {
                const user = await getUser();
                setUserId(user.id);
                const notifs = await getNotifications();
                setNotifications(notifs);
                setLoading(false);

                // Subscribe to real-time inserts for this user
                channel = supabase
                    .channel(`notifications:${user.id}`)
                    .on(
                        'postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'notifications',
                            filter: `user_id=eq.${user.id}`,
                        },
                        (payload) => {
                            const row = payload.new as any;
                            const newNotif: AppNotification = {
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
                            setNotifications(prev => [newNotif, ...prev.slice(0, 49)]);
                        }
                    )
                    .on(
                        'postgres_changes',
                        {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'notifications',
                            filter: `user_id=eq.${user.id}`,
                        },
                        (payload) => {
                            const updated = payload.new as any;
                            setNotifications(prev =>
                                prev.map(n => n.id === updated.id ? { ...n, isRead: updated.is_read } : n)
                            );
                        }
                    )
                    .subscribe();
            } catch (err) {
                console.error('NotificationBell init error:', err);
                setLoading(false);
            }
        };

        init();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleMarkAllRead = async () => {
        await markAllAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    const handleClickNotif = async (n: AppNotification) => {
        if (!n.isRead) {
            await markAsRead(n.id);
            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
        }
    };

    if (!userId && !loading) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setOpen(o => !o)}
                className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-scout-green dark:hover:text-scout-green transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Notifiche"
                aria-label="Notifiche"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800 leading-none">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-[100] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <Bell size={14} />
                            Notifiche
                            {unreadCount > 0 && (
                                <span className="bg-red-100 text-red-600 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                    {unreadCount} nuove
                                </span>
                            )}
                        </h3>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-[11px] text-scout-green font-bold hover:underline"
                                >
                                    Segna tutte lette
                                </button>
                            )}
                            <button
                                onClick={() => setOpen(false)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ml-1"
                            >
                                <X size={14} className="text-gray-400" />
                            </button>
                        </div>
                    </div>

                    {/* Notification list */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="p-6 text-center text-gray-400 text-sm">Caricamento...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell size={32} className="text-gray-200 dark:text-gray-600 mx-auto mb-2" />
                                <p className="text-sm text-gray-400 dark:text-gray-500">Nessuna notifica!</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <button
                                    key={n.id}
                                    onClick={() => handleClickNotif(n)}
                                    className={cn(
                                        'w-full text-left px-4 py-3 flex items-start gap-3 border-b border-gray-50 dark:border-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50',
                                        !n.isRead && 'bg-blue-50/60 dark:bg-blue-900/10'
                                    )}
                                >
                                    <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                        <NotifIcon type={n.type} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={cn(
                                            'text-xs leading-tight truncate',
                                            n.isRead ? 'text-gray-600 dark:text-gray-400' : 'font-bold text-gray-800 dark:text-gray-200'
                                        )}>
                                            {n.title}
                                        </p>
                                        {n.body && (
                                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-2 leading-snug">
                                                {n.body}
                                            </p>
                                        )}
                                        <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">
                                            {formatRelativeTime(n.createdAt)}
                                        </p>
                                    </div>
                                    {!n.isRead && (
                                        <div className="w-2 h-2 rounded-full bg-scout-green shrink-0 mt-1.5" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
