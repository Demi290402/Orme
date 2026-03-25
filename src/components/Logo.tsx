import { useTheme } from '@/context/ThemeContext';

export default function Logo({ className }: { className?: string }) {
    const { theme } = useTheme();
    return (
        <img
            src={theme === 'dark' ? '/Logo_Dark.png' : '/logo.png'}
            alt="Orme Logo"
            className={className}
        />
    );
}
