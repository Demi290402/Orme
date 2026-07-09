import { useState, useEffect } from 'react';
import { getLevelInfo, BADGES } from '@/lib/gamification';
import { Trophy, X, ChevronLeft, ChevronRight, Award } from 'lucide-react';
import { cn, getDefaultCover } from '@/lib/utils';
import { User } from '@/types';
import { getAllUsers } from '@/lib/data';
import UserAvatar from '@/components/UserAvatar';

export default function Leaderboard() {
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const usersPerPage = 10;

    useEffect(() => {
        // Read users from Supabase
        getAllUsers().then(users => {
            // Already sorted by points in getAllUsers
            setAllUsers(users);
        }).catch(console.error);
    }, []);

    // Calculate pagination
    const totalPages = Math.ceil(allUsers.length / usersPerPage);
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const currentUsers = allUsers.slice(startIndex, endIndex);

    return (
        <div className="space-y-6 pb-20 relative">
            <div className="bg-scout-brown dark:bg-amber-950/60 text-white p-6 rounded-2xl shadow-lg -mx-4 md:mx-0 rounded-t-none md:rounded-2xl flex items-center justify-between dark:border dark:border-amber-900/50">
                <div>
                    <h1 className="text-3xl font-bold mb-1 drop-shadow-sm">Classifica</h1>
                    <p className="opacity-90 text-sm drop-shadow-sm">I migliori tracciatori del gruppo</p>
                </div>
                <Trophy size={48} className="opacity-20" />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                {currentUsers.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 dark:text-gray-500">
                        Nessun utente registrato ancora.
                    </div>
                ) : (
                    currentUsers.map((user, index) => {
                        const globalIndex = startIndex + index; // Actual position in full list
                        const { current } = getLevelInfo(user.points);
                        return (
                            <div
                                key={user.id}
                                onClick={() => setSelectedUser(user)}
                                className={cn(
                                    "flex items-center p-4 border-b border-gray-100 dark:border-gray-700 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors",
                                    globalIndex < 3 ? "bg-yellow-50/30 dark:bg-yellow-900/10" : "bg-transparent"
                                )}
                            >
                                <div className="mr-3 relative">
                                    <UserAvatar user={user} size="sm" disablePreview />
                                    {globalIndex < 3 && (
                                        <div className="absolute -top-1 -right-1 bg-white dark:bg-gray-700 rounded-full w-5 h-5 flex items-center justify-center shadow-sm border border-gray-100 dark:border-gray-600 text-[10px]">
                                            {globalIndex === 0 ? "🥇" : globalIndex === 1 ? "🥈" : "🥉"}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900 dark:text-gray-100">{user.nickname}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Livello {current.level}: {current.name}</p>
                                </div>

                                <div className="text-right">
                                    <span className="font-bold text-scout-green block">{user.points}</span>
                                    <span className="text-xs text-gray-400 uppercase tracking-wide">pt</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        Pagina {currentPage} di {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}

            {/* User Detail Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl overflow-hidden relative shadow-2xl" onClick={e => e.stopPropagation()}>
                        {/* Cover Image */}
                        <div className="h-32 w-full bg-scout-green dark:bg-emerald-900 relative">
                            <img
                                src={selectedUser.coverImage || getDefaultCover(selectedUser.id)}
                                alt="Cover"
                                className="w-full h-full object-cover"
                            />
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="absolute top-4 right-4 p-1 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-sm"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="px-6 pb-6 -mt-12 relative">
                            <div className="flex flex-col items-center mb-4">
                                <UserAvatar user={selectedUser} size="lg" className="mb-3 border-4 border-white dark:border-gray-800 bg-white dark:bg-gray-800 animate-in zoom-in duration-300" />
                                <h2 className="text-xl font-black text-gray-900 dark:text-white text-center leading-tight">
                                    {selectedUser.firstName} {selectedUser.lastName}
                                </h2>
                                <p className="text-xs text-scout-green dark:text-emerald-500 font-bold">@{selectedUser.nickname}</p>
                                
                                <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 mt-1.5 flex items-center justify-center gap-1.5">
                                    <span>{selectedUser.groupName || 'Gruppo non impostato'}</span>
                                    {selectedUser.scoutZone && (
                                        <>
                                            <span className="text-gray-300 dark:text-gray-650">•</span>
                                            <span>Zona {selectedUser.scoutZone}</span>
                                        </>
                                    )}
                                </p>

                                {selectedUser.scoutCode && (
                                    <div className="mt-2 text-[10px] font-mono text-gray-500 dark:text-gray-400 bg-gray-55 dark:bg-gray-900/40 px-2.5 py-0.5 rounded-full border border-gray-100 dark:border-gray-700/60">
                                        Socio: {selectedUser.scoutCode}
                                    </div>
                                )}
                            </div>

                            {/* Iter Formazione */}
                            {((selectedUser.formazione && selectedUser.formazione.length > 0) || selectedUser.hasNominaCapo) && (
                                <div className="bg-gray-50 dark:bg-gray-900/30 p-3 rounded-2xl border border-gray-100 dark:border-gray-700/50 mb-4 w-full">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-[10px] font-black uppercase tracking-wider text-scout-brown dark:text-amber-500 flex items-center gap-1">
                                            <Award size={12} className="text-scout-green shrink-0" />
                                            Iter Formativo
                                        </h4>
                                        {selectedUser.hasNominaCapo && (
                                            <span className="bg-scout-green text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                                                Nomina Capo ⚜️
                                            </span>
                                        )}
                                    </div>
                                    {selectedUser.formazione && selectedUser.formazione.length > 0 ? (
                                        <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
                                            {selectedUser.formazione.map((f, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-[10px] leading-tight">
                                                    <span className="font-bold text-gray-700 dark:text-gray-300">{f.corso}</span>
                                                    <span className="text-gray-450 dark:text-gray-500 shrink-0 ml-2">
                                                        {f.anno}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-[9px] text-gray-400 dark:text-gray-500 italic">Nessun corso registrato</p>
                                    )}
                                </div>
                            )}

                            {/* Badges */}
                            <div className="w-full">
                                <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5 flex items-center gap-1.5">
                                    <Trophy size={12} className="text-yellow-500 shrink-0" />
                                    Badge Ottenuti ({selectedUser.badges?.length || 0})
                                </h4>
                                {selectedUser.badges && selectedUser.badges.length > 0 ? (
                                    <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto pr-1">
                                        {selectedUser.badges.map(key => {
                                            const badge = BADGES[key];
                                            if (!badge) return null;
                                            return (
                                                <div
                                                    key={key}
                                                    className="flex flex-col items-center p-1.5 bg-gray-50 dark:bg-gray-900/20 rounded-xl border border-gray-100 dark:border-gray-700/50 hover:border-yellow-200 transition-colors"
                                                    title={`${badge.name}: ${badge.description}`}
                                                >
                                                    <span className="text-xl mb-0.5">{badge.icon}</span>
                                                    <span className="text-[7.5px] font-black text-gray-600 dark:text-gray-450 text-center leading-tight truncate w-full">
                                                        {badge.name}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 italic text-center py-4 bg-gray-50 dark:bg-gray-900/10 rounded-xl border border-dashed border-gray-100 dark:border-gray-750">
                                        Nessun badge sbloccato
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
