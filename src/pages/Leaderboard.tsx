import { useState } from 'react';
import { MOCK_USERS } from '@/lib/data';
import { getLevelInfo } from '@/lib/gamification';
import { Trophy, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { User } from '@/types';

export default function Leaderboard() {
    const sortedUsers = [...MOCK_USERS].sort((a, b) => b.points - a.points);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    return (
        <div className="space-y-6 pb-20 relative">
            <div className="bg-scout-brown text-white p-6 rounded-2xl shadow-lg -mx-4 md:mx-0 rounded-t-none md:rounded-2xl flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-1">Classifica</h1>
                    <p className="opacity-90 text-sm">I migliori tracciatori del gruppo</p>
                </div>
                <Trophy size={48} className="opacity-20" />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {sortedUsers.map((user, index) => {
                    const { current } = getLevelInfo(user.points);
                    return (
                        <div
                            key={user.id}
                            onClick={() => setSelectedUser(user)}
                            className={cn(
                                "flex items-center p-4 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors",
                                index < 3 ? "bg-yellow-50/30" : ""
                            )}
                        >
                            <div className={cn(
                                "w-10 h-10 flex-shrink-0 rounded-full overflow-hidden mr-3 border-2",
                                index === 0 ? "border-yellow-400" :
                                    index === 1 ? "border-gray-300" :
                                        index === 2 ? "border-orange-300" :
                                            "border-gray-100"
                            )}>
                                <img
                                    src={user.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.firstName}`}
                                    alt={user.nickname}
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900">{user.nickname}</h3>
                                <p className="text-xs text-gray-500">Livello {current.level}: {current.name}</p>
                            </div>

                            <div className="text-right">
                                <span className="font-bold text-scout-green block">{user.points}</span>
                                <span className="text-xs text-gray-400 uppercase tracking-wide">pt</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* User Detail Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
                    <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
                        {/* Cover Image */}
                        <div className="h-32 w-full bg-scout-green relative">
                            {selectedUser.coverImage ? (
                                <img src={selectedUser.coverImage} alt="Cover" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full opacity-20 bg-[url('https://www.turi1.it/wp-content/uploads/2021/10/DJI_0016.jpg')] bg-cover bg-center" />
                            )}
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="absolute top-4 right-4 p-1 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="px-6 pb-6 -mt-12 relative">
                            <div className="flex flex-col items-center mb-6">
                                <div className="w-24 h-24 rounded-full border-4 border-white bg-white shadow-md overflow-hidden mb-3">
                                    <img
                                        src={selectedUser.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.firstName}`}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 text-center leading-tight">
                                    {selectedUser.firstName} {selectedUser.lastName}
                                </h2>
                                <p className="text-scout-green font-medium">@{selectedUser.nickname}</p>

                                {selectedUser.scoutCode && (
                                    <div className="mt-2 text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                                        Codice Socio: {selectedUser.scoutCode}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-center">
                                <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                                    <span className="block text-xl font-bold text-scout-green">{selectedUser.locationsAdded}</span>
                                    <span className="text-xs text-green-800 font-medium">Luoghi Aggiunti</span>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                                    <span className="block text-xl font-bold text-scout-blue">{selectedUser.contributionsApproved}</span>
                                    <span className="text-xs text-blue-800 font-medium">Approvazioni</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
