import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, User, Trophy, Menu, HelpCircle, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import Logo from '@/components/Logo';
import PWAInstallPrompt from './PWAInstallPrompt';
import { getProposals } from '@/lib/proposals';

export default function Layout({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        getProposals().then(ps => {
            setPendingCount(ps.filter(p => p.status === 'pending').length);
        }).catch(console.error);
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
        { icon: HelpCircle, label: 'Guida', path: '/guide' },
        { icon: Menu, label: 'Chi Siamo', path: '/about' },
        { icon: User, label: 'Profilo', path: '/profile' },
    ];

    return (
        <div className="min-h-screen bg-scout-beige-light font-sans text-gray-900 pb-20 md:pb-0">
            <PWAInstallPrompt />
            {/* Desktop Header */}
            <header className="bg-scout-white border-b border-gray-200 p-4 shadow-sm sticky top-0 z-50">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <Link to="/" className="flex items-center space-x-2">
                        <Logo className="h-20 w-auto" />
                    </Link>

                    <div className="flex items-center space-x-4">
                        <Link
                            to="/proposals"
                            className={cn(
                                "relative p-2 text-gray-600 hover:text-scout-green transition-colors",
                                location.pathname === '/proposals' && "text-scout-green"
                            )}
                        >
                            <Mail size={24} />
                            {pendingCount > 0 && (
                                <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                                    {pendingCount}
                                </span>
                            )}
                        </Link>

                        {/* Desktop Nav - hidden on mobile */}
                        <nav className="hidden md:flex space-x-6">
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={cn(
                                        "flex items-center space-x-1 hover:text-scout-green transition-colors",
                                        location.pathname === item.path ? "text-scout-green font-semibold" : "text-gray-600"
                                    )}
                                >
                                    <item.icon size={20} />
                                    <span>{item.label}</span>
                                </Link>
                            ))}
                        </nav>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto p-4 md:p-6">
                {children}
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-[50] pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="flex justify-around items-center h-16">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full",
                                location.pathname === item.path ? "text-scout-green" : "text-gray-400",
                                item.highlight && "text-scout-green font-bold"
                            )}
                        >
                            <item.icon
                                size={item.highlight ? 32 : 24}
                                className={cn(
                                    item.highlight && "-mt-6 bg-scout-green text-white rounded-full p-2 border-4 border-white shadow-lg w-14 h-14 box-border"
                                )}
                            />
                            <span className={cn("text-xs mt-1", item.highlight && "mt-1")}>{item.label}</span>
                        </Link>
                    ))}
                </div>
            </nav>
        </div>
    );
}
