
import { cn } from '@/lib/utils';

interface ProgressBarProps {
    currentPoints: number;
    nextLevelPoints: number;
    prevLevelPoints: number;
    className?: string;
}

export default function ProgressBar({ currentPoints, nextLevelPoints, prevLevelPoints, className }: ProgressBarProps) {
    const range = nextLevelPoints - prevLevelPoints;
    const progress = currentPoints - prevLevelPoints;
    const percentage = Math.min(100, Math.max(0, (progress / range) * 100));

    return (
        <div className={cn("w-full bg-gray-200 rounded-full h-4 overflow-hidden", className)}>
            <div
                className="bg-scout-green h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${percentage}%` }}
            />
        </div>
    );
}
