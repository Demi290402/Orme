import { useState, useEffect } from 'react';
import { getLevelInfo } from '@/lib/gamification';
import { Trophy, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
                            <div className="flex flex-col items-center mb-6">
                                <UserAvatar user={selectedUser} size="lg" className="mb-3 border-4 border-white dark:border-gray-800 bg-white dark:bg-gray-800" />
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center leading-tight">
                                    {selectedUser.firstName} {selectedUser.lastName}
                                </h2>
                                <p className="text-scout-green dark:text-emerald-500 font-medium">@{selectedUser.nickname}</p>

                                {selectedUser.scoutCode && (
                                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 px-3 py-1 rounded-full border border-gray-100 dark:border-gray-700">
                                        Codice Socio: {selectedUser.scoutCode}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-xl border border-green-100 dark:border-green-900/30">
                                    <span className="block text-xl font-bold text-scout-green dark:text-green-400">{selectedUser.locationsAdded}</span>
                                    <span className="text-[10px] text-green-800 dark:text-green-500 font-medium opacity-80 uppercase tracking-tight">Aggiunti</span>
                                </div>
                                <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded-xl border border-orange-100 dark:border-orange-900/30">
                                    <span className="block text-xl font-bold text-scout-brown dark:text-orange-400">{selectedUser.validationsGiven}</span>
                                    <span className="text-[10px] text-orange-800 dark:text-orange-500 font-medium opacity-80 uppercase tracking-tight">Modificati</span>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                    <span className="block text-xl font-bold text-scout-blue dark:text-blue-400">{selectedUser.contributionsApproved}</span>
                                    <span className="text-[10px] text-blue-800 dark:text-blue-500 font-medium opacity-80 uppercase tracking-tight">Approvati</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
