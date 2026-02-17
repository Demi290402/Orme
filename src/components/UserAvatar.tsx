import { useState } from 'react';
import { X, Camera } from 'lucide-react';
import { User } from '@/types';
import { getLevelInfo } from '@/lib/gamification';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
    user: User;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    isOwnProfile?: boolean;
    onImageChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function UserAvatar({ user, size = 'md', className, isOwnProfile, onImageChange }: UserAvatarProps) {
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const { current } = getLevelInfo(user.points);

    const sizeClasses = {
        sm: 'w-10 h-10 border-2',
        md: 'w-16 h-16 border-2',
        lg: 'w-24 h-24 border-4',
        xl: 'w-32 h-32 border-4'
    };

    const handleAvatarClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsPreviewOpen(true);
    };

    return (
        <>
            <div
                className={cn(
                    "relative shrink-0 cursor-pointer transition-transform active:scale-95",
                    sizeClasses[size],
                    "rounded-full overflow-hidden bg-white shadow-sm",
                    className
                )}
                style={{ borderColor: current.color }}
                onClick={handleAvatarClick}
            >
                <img
                    src={user.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.firstName}`}
                    alt={user.firstName}
                    className="w-full h-full object-cover"
                />
                {isOwnProfile && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Camera className="text-white" size={size === 'xl' ? 24 : 16} />
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            {isPreviewOpen && (
                <div
                    className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-4"
                    onClick={() => setIsPreviewOpen(false)}
                >
                    <button
                        className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                        onClick={() => setIsPreviewOpen(false)}
                    >
                        <X size={32} />
                    </button>

                    <div
                        className="relative max-w-full max-h-[80vh] aspect-square rounded-2xl overflow-hidden border-8 shadow-2xl"
                        style={{ borderColor: current.color }}
                        onClick={e => e.stopPropagation()}
                    >
                        <img
                            src={user.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.firstName}`}
                            alt={user.firstName}
                            className="w-full h-full object-contain bg-white"
                        />
                    </div>

                    <div className="mt-8 text-center text-white">
                        <h2 className="text-2xl font-bold">{user.firstName} {user.lastName}</h2>
                        <p className="text-xl opacity-80 mb-6">@{user.nickname}</p>

                        {isOwnProfile && onImageChange && (
                            <label className="bg-scout-green text-white font-bold px-8 py-4 rounded-full shadow-lg hover:bg-scout-green-dark cursor-pointer flex items-center gap-2">
                                <Camera size={20} />
                                Cambia Foto Profilo
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        onImageChange(e);
                                        setIsPreviewOpen(false);
                                    }}
                                />
                            </label>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
