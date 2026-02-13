

export default function Logo({ className }: { className?: string }) {
    return (
        <img
            src="/logo.png"
            alt="Orme Logo"
            className={className}
        />
    );
}
