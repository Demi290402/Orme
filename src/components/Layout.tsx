import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Trophy, HelpCircle, FileText, CalendarDays, LogIn, UserPlus, Archive, Settings, Package, Menu, X, ChevronRight, Wallet, Clock, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import Logo from '@/components/Logo';
import PWAInstallPrompt from './PWAInstallPrompt';
import { User as UserType } from '@/types';
import { getUser } from '@/lib/data';
import UserAvatar from '@/components/UserAvatar';
import NotificationBell from '@/components/NotificationBell';
import { isOnline as checkOnline, getOfflineQueue, syncOfflineQueue } from '@/lib/offline';
import AkelaAssistant from './AkelaAssistant';

export default function Layout({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const [currentUser, setCurrentUser] = useState<UserType | null>(null);
    const [showAltroMenu, setShowAltroMenu] = useState(false);
    const [online, setOnline] = useState(checkOnline());
    const [queueLength, setQueueLength] = useState(0);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'done'>('idle');

    useEffect(() => {
        getUser().then(setCurrentUser).catch(console.error);
    }, [location.pathname]);

    useEffect(() => {
        const handleOnline = () => setOnline(true);
        const handleOffline = () => setOnline(false);
        const handleQueue = () => {
            setQueueLength(getOfflineQueue().length);
        };
        const handleSyncStatus = (e: Event) => {
            const status = (e as CustomEvent).detail;
            setSyncStatus(status);
            if (status === 'done') {
                setTimeout(() => setSyncStatus('idle'), 3000);
            }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('offline_queue_changed', handleQueue);
        window.addEventListener('offline_sync_status', handleSyncStatus);

        // Initial values
        setQueueLength(getOfflineQueue().length);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('offline_queue_changed', handleQueue);
            window.removeEventListener('offline_sync_status', handleSyncStatus);
        };
    }, []);

    interface NavItem {
        icon: React.ElementType;
        label: string;
        path: string;
        highlight?: boolean;
    }

    const primaryNavItems: NavItem[] = [
        { icon: Home, label: 'Home', path: '/' },
        { icon: CalendarDays, label: 'Calendario', path: '/calendario' },
        { icon: Package, label: 'Inventario', path: '/inventario' },
        { icon: FileText, label: 'Verbali', path: '/verbali' },
    ];

    const secondaryNavItems: NavItem[] = [
        { icon: Archive, label: 'Storico', path: '/storico' },
        { icon: Trophy, label: 'Punti', path: '/leaderboard' },
        { icon: Wallet, label: 'Bilancio', path: '/bilancio' },
        { icon: Clock, label: 'Lista d\'Attesa', path: '/lista-attesa' },
        { icon: HelpCircle, label: 'Guida', path: '/guide' },
    ];

    return (
        <div className="min-h-screen bg-scout-beige-light dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 pb-20 md:pb-0">
            <PWAInstallPrompt />
            {/* Desktop Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 shadow-sm sticky top-0 z-50">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <Link to="/" className="flex items-center space-x-2">
                        <Logo className="h-20 w-auto" />
                    </Link>

                    <div className="flex items-center space-x-2">
                        {/* Settings */}
                        {currentUser && (
                            <Link
                                to="/settings"
                                className={cn(
                                    "p-2 text-gray-500 dark:text-gray-400 hover:text-scout-green dark:hover:text-scout-green transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700",
                                    location.pathname === '/settings' && "text-scout-green"
                                )}
                                title="Impostazioni"
                            >
                                <Settings size={20} />
                            </Link>
                        )}

                        {/* Notification Bell */}
                        {currentUser && <NotificationBell />}

                        {/* Offline / Sync Indicator */}
                        {!online ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full border border-amber-500/20 text-xs font-semibold" title="Modalità Offline - I dati salvati localmente verranno sincronizzati quando torni online">
                                <WifiOff size={16} className="animate-pulse shrink-0" />
                                <span className="hidden sm:inline">Offline</span>
                                {queueLength > 0 && (
                                    <span className="ml-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                                        {queueLength}
                                    </span>
                                )}
                            </div>
                        ) : queueLength > 0 || syncStatus === 'syncing' ? (
                            <button
                                onClick={() => syncOfflineQueue()}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-scout-green/10 text-scout-green rounded-full border border-scout-green/20 text-xs font-semibold hover:bg-scout-green/20 transition-all cursor-pointer"
                                title="Sincronizzazione modifiche in corso..."
                            >
                                <RefreshCw size={16} className="animate-spin shrink-0" />
                                <span className="hidden sm:inline">Sincronizzo ({queueLength})</span>
                            </button>
                        ) : syncStatus === 'error' ? (
                            <button
                                onClick={() => syncOfflineQueue()}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-full border border-red-500/20 text-xs font-semibold hover:bg-red-500/20 transition-all cursor-pointer"
                                title="Errore di sincronizzazione. Clicca per riprovare."
                            >
                                <WifiOff size={16} className="shrink-0" />
                                <span className="hidden sm:inline font-bold">Errore Sync</span>
                            </button>
                        ) : null}

                        {/* Desktop Nav */}
                        <nav className="hidden md:flex items-center space-x-5 relative">
                            {primaryNavItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={cn(
                                        "flex items-center space-x-1 hover:text-scout-green transition-colors text-sm",
                                        location.pathname === item.path ? "text-scout-green font-semibold" : "text-gray-600 dark:text-gray-400"
                                    )}
                                >
                                    <item.icon size={18} />
                                    <span>{item.label}</span>
                                </Link>
                            ))}

                            {/* Dropdown Menu per Desktop */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowAltroMenu(!showAltroMenu)}
                                    className={cn(
                                        "flex items-center space-x-1 hover:text-scout-green transition-colors text-sm font-medium cursor-pointer",
                                        secondaryNavItems.some(item => location.pathname === item.path) || showAltroMenu ? "text-scout-green font-semibold" : "text-gray-600 dark:text-gray-400"
                                    )}
                                >
                                    <Menu size={18} />
                                    <span>Altro</span>
                                </button>

                                {showAltroMenu && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowAltroMenu(false)} />
                                        <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 rounded-2xl shadow-lg z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-150">
                                            {secondaryNavItems.map((item) => (
                                                <Link
                                                    key={item.path}
                                                    to={item.path}
                                                    onClick={() => setShowAltroMenu(false)}
                                                    className={cn(
                                                        "flex items-center space-x-2 px-3 py-2 rounded-xl text-xs hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors w-full",
                                                        location.pathname === item.path ? "text-scout-green font-bold bg-scout-green/5 dark:bg-emerald-950/20" : "text-gray-700 dark:text-gray-300"
                                                    )}
                                                >
                                                    <item.icon size={14} />
                                                    <span>{item.label}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </nav>
                        
                        {/* Avatar / Login Button */}
                        {currentUser ? (
                            <Link to="/profile" className="ml-2 ring-2 ring-transparent hover:ring-scout-green dark:hover:ring-scout-green rounded-full transition-all">
                                <UserAvatar user={currentUser} size="sm" disablePreview={true} />
                            </Link>
                        ) : (
                            <Link to="/login" className="ml-2 p-2 bg-scout-green text-white rounded-full hover:bg-scout-green-dark transition-all flex items-center justify-center shadow-sm">
                                <LogIn size={20} />
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            {/* Guest Welcome Banner */}
            {!currentUser && (
                <div className="bg-scout-blue text-white py-2 px-4 shadow-md sticky top-[113px] md:top-[113px] z-[40]">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <UserPlus size={16} className="shrink-0" />
                            <p className="text-[11px] md:text-xs font-bold leading-tight">
                                Registrati per sbloccare tutti i luoghi e i contenuti scout del tuo gruppo!
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Link to="/register" className="text-[10px] bg-white text-scout-blue px-3 py-1 rounded-full font-black uppercase whitespace-nowrap">
                                Iscriviti
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="max-w-4xl mx-auto p-4 md:p-6">
                {children}
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-[50] pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="flex justify-around items-center h-16">
                    {primaryNavItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full",
                                location.pathname === item.path ? "text-scout-green" : "text-gray-400 dark:text-gray-500",
                            )}
                        >
                            <item.icon size={22} />
                            <span className="text-[10px] mt-0.5">{item.label}</span>
                        </Link>
                    ))}
                    <button
                        onClick={() => setShowAltroMenu(!showAltroMenu)}
                        className={cn(
                            "flex flex-col items-center justify-center w-full h-full cursor-pointer",
                            secondaryNavItems.some(item => location.pathname === item.path) || showAltroMenu ? "text-scout-green" : "text-gray-400 dark:text-gray-500",
                        )}
                    >
                        <Menu size={22} />
                        <span className="text-[10px] mt-0.5">Altro</span>
                    </button>
                </div>
            </nav>

            {/* Mobile Bottom Drawer/Sheet */}
            {showAltroMenu && (
                <div className="md:hidden fixed inset-0 z-[60] flex items-end justify-center">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowAltroMenu(false)} />
                    <div className="bg-white dark:bg-gray-800 w-full rounded-t-[2.5rem] border-t border-gray-200 dark:border-gray-700 p-6 pb-10 z-[70] shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-250">
                        {/* Drag indicator */}
                        <div className="w-12 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-1 shrink-0" />
                        
                        <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700/50">
                            <h3 className="font-extrabold text-gray-900 dark:text-white text-base">Altro</h3>
                            <button 
                                onClick={() => setShowAltroMenu(false)}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full dark:text-gray-400"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-2.5 py-2">
                            {secondaryNavItems.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setShowAltroMenu(false)}
                                        className={cn(
                                            "flex items-center justify-between p-3.5 rounded-2xl border transition-all active:scale-[0.98]",
                                            isActive 
                                                ? "bg-scout-green/10 dark:bg-emerald-950/20 border-scout-green/20 text-scout-green font-extrabold" 
                                                : "bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                        )}
                                    >
                                        <div className="flex items-center gap-3.5">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0",
                                                isActive ? "bg-scout-green text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                                            )}>
                                                <item.icon size={20} />
                                            </div>
                                            <div className="flex flex-col text-left">
                                                <span className="text-xs font-bold leading-none">{item.label}</span>
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-medium leading-tight">
                                                    {item.label === 'Storico' && 'Cronologia completa delle attività passate'}
                                                    {item.label === 'Punti' && 'Classifica di reparto, punteggi e badge'}
                                                    {item.label === 'Bilancio' && 'Gestione del patrimonio e cassa di gruppo'}
                                                    {item.label === 'Lista d\'Attesa' && 'Gestione delle iscrizioni e della lista d\'attesa'}
                                                    {item.label === 'Guida' && 'Regolamento e modalità di gioco per i capi'}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className={cn("transition-transform shrink-0", isActive ? "text-scout-green" : "text-gray-400 dark:text-gray-500")} />
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
            <AkelaAssistant />
        </div>
    );
}
