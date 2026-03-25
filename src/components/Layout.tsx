import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Trophy, HelpCircle, Mail, FileText, CalendarDays, Sun, Moon, LogIn, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import Logo from '@/components/Logo';
import PWAInstallPrompt from './PWAInstallPrompt';
import { getProposals } from '@/lib/proposals';
import { useTheme } from '@/context/ThemeContext';
import { User as UserType } from '@/types';
import { getUser } from '@/lib/data';
import UserAvatar from '@/components/UserAvatar';
import NotificationBell from '@/components/NotificationBell';

export default function Layout({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const [pendingCount, setPendingCount] = useState(0);
    const [currentUser, setCurrentUser] = useState<UserType | null>(null);
    const { theme, toggleTheme } = useTheme();

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

    const navItems: NavItem[] = [
        { icon: Home, label: 'Home', path: '/' },
        { icon: Trophy, label: 'Classifica', path: '/leaderboard' },
        { icon: CalendarDays, label: 'Calendario', path: '/calendario' },
        { icon: FileText, label: 'Verbali', path: '/verbali' },
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
                        {/* Dark mode toggle */}
                        <button onClick={toggleTheme}
                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-scout-green dark:hover:text-scout-green transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                            title={theme === 'dark' ? 'Modalità chiara' : 'Modalità scura'}
                        >
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

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
                        <nav className="hidden md:flex space-x-4">
                            {navItems.map((item) => (
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
                    {navItems.map((item) => (
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
                </div>
            </nav>
        </div>
    );
}
