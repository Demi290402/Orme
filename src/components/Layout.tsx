import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Trophy, HelpCircle, Mail, FileText, CalendarDays, LogIn, UserPlus, Archive, Settings, Package, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Logo from '@/components/Logo';
import PWAInstallPrompt from './PWAInstallPrompt';
import { getProposals } from '@/lib/proposals';
import { User as UserType } from '@/types';
import { getUser } from '@/lib/data';
import UserAvatar from '@/components/UserAvatar';
import NotificationBell from '@/components/NotificationBell';

export default function Layout({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const [pendingCount, setPendingCount] = useState(0);
    const [currentUser, setCurrentUser] = useState<UserType | null>(null);
    const [showAltroMenu, setShowAltroMenu] = useState(false);


    useEffect(() => {
        getProposals().then(ps => {
            setPendingCount(ps.filter(p => p.status === 'pending').length);
        }).catch(console.error);
        
        getUser().then(setCurrentUser).catch(console.error);
    }, [location.pathname]);

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

                        {/* Proposals (Pending Inbox) */}
                        <Link
                            to="/proposals"
                            className={cn(
                                "relative p-2 text-gray-600 dark:text-gray-400 hover:text-scout-green transition-colors",
                                location.pathname === '/proposals' && "text-scout-green"
                            )}
                        >
                            <Mail size={24} />
                            {pendingCount > 0 && (
                                <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-gray-800">
                                    {pendingCount}
                                </span>
                            )}
                        </Link>

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
                    <div className="bg-white dark:bg-gray-850 w-full rounded-t-[2rem] border-t border-gray-200 dark:border-gray-750 p-6 pb-8 z-[70] shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200">
                        <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700/50">
                            <h3 className="font-extrabold text-gray-900 dark:text-white text-base">Menu</h3>
                            <button 
                                onClick={() => setShowAltroMenu(false)}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-750 rounded-full dark:text-gray-400"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-3 py-2">
                            {secondaryNavItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setShowAltroMenu(false)}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-750 rounded-2xl transition-all active:scale-95",
                                        location.pathname === item.path ? "border-scout-green bg-scout-green/5 dark:bg-emerald-950/20 text-scout-green font-bold" : "text-gray-600 dark:text-gray-400"
                                    )}
                                >
                                    <item.icon size={20} className={location.pathname === item.path ? "text-scout-green" : "text-gray-500 dark:text-gray-400"} />
                                    <span className="text-[10px] font-bold mt-2 text-center">{item.label}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
