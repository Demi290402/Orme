import React, { useEffect, useState } from 'react';
import { Camera, MapPin, Award, Trophy, Edit2, X, Save } from 'lucide-react';
import { getUser, updateUser } from '@/lib/data';
import { getLevelInfo, BADGES } from '@/lib/gamification';
import { User } from '@/types';
import { Link } from 'react-router-dom';

export default function Profile() {
    const [user, setUser] = useState<User | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        firstName: '',
        lastName: '',
        nickname: '',
        email: '',
        profilePicture: '',
        coverImage: '',
        scoutCode: ''
    });

    useEffect(() => {
        const currentUser = getUser();
        setUser(currentUser);
        setEditForm({
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
            nickname: currentUser.nickname,
            email: currentUser.email,
            profilePicture: currentUser.profilePicture || '',
            coverImage: currentUser.coverImage || '',
            scoutCode: currentUser.scoutCode || ''
        });
    }, []);

    const handleSave = () => {
        if (!user) return;
        const updatedUser = {
            ...user,
            ...editForm
        };
        updateUser(updatedUser);
        setUser(updatedUser);
        setIsEditing(false);
    };

    if (!user) return <div>Caricamento...</div>;

    const levelInfo = getLevelInfo(user.points);
    const progressPercent = levelInfo.next
        ? ((user.points - levelInfo.current.min) / (levelInfo.current.max - levelInfo.current.min)) * 100
        : 100;

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'profilePicture' | 'coverImage') => {
        const file = e.target.files?.[0];
        if (file) {
            // Check file size (max 500KB)
            const maxSize = 500 * 1024; // 500KB in bytes
            if (file.size > maxSize) {
                alert('Immagine inserita troppo grande.\n\nCONSIGLIO: fare screenshot dell\'immagine che si vuole caricare');
                e.target.value = ''; // Reset input
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setEditForm(prev => ({ ...prev, [field]: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="pb-20 relative">
            {/* Edit Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold">Modifica Profilo</h2>
                            <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                                    <input
                                        type="text"
                                        value={editForm.firstName}
                                        onChange={e => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                                        className="w-full p-2 rounded-xl border border-gray-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cognome</label>
                                    <input
                                        type="text"
                                        value={editForm.lastName}
                                        onChange={e => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                                        className="w-full p-2 rounded-xl border border-gray-200"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nickname (Totem)</label>
                                <input
                                    type="text"
                                    value={editForm.nickname}
                                    onChange={e => setEditForm(prev => ({ ...prev, nickname: e.target.value }))}
                                    className="w-full p-2 rounded-xl border border-gray-200"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Codice Socio</label>
                                <input
                                    type="text"
                                    value={editForm.scoutCode}
                                    onChange={e => setEditForm(prev => ({ ...prev, scoutCode: e.target.value }))}
                                    className="w-full p-2 rounded-xl border border-gray-200"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={editForm.email}
                                    onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full p-2 rounded-xl border border-gray-200"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Foto Profilo</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, 'profilePicture')}
                                    className="w-full p-2 rounded-xl border border-gray-200 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-scout-green/10 file:text-scout-green hover:file:bg-scout-green/20"
                                />
                                {editForm.profilePicture && (
                                    <div className="mt-2 text-xs text-green-600 truncate max-w-full">
                                        Immagine caricata correttamente
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Immagine Copertina</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, 'coverImage')}
                                    className="w-full p-2 rounded-xl border border-gray-200 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-scout-blue/10 file:text-scout-blue hover:file:bg-scout-blue/20"
                                />
                                {editForm.coverImage && (
                                    <div className="mt-2 text-xs text-blue-600 truncate max-w-full">
                                        Immagine caricata correttamente
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            className="w-full bg-scout-green text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                        >
                            <Save size={20} />
                            Salva Modifiche
                        </button>
                    </div>
                </div>
            )}

            {/* Cover Image Section */}
            <div className="relative h-48 md:h-64 rounded-b-3xl md:rounded-3xl overflow-hidden bg-gray-200">
                {user.coverImage ? (
                    <img
                        src={user.coverImage}
                        alt="Cover"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-[url('https://www.turi1.it/wp-content/uploads/2021/10/DJI_0016.jpg')] bg-cover bg-center opacity-80" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                <button
                    onClick={() => setIsEditing(true)}
                    className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-md p-2 rounded-full hover:bg-white/40 text-white"
                >
                    <Camera size={20} />
                </button>
            </div>

            {/* Profile Header */}
            <div className="relative px-6 -mt-16 mb-6 flex flex-col items-center md:items-end md:flex-row md:gap-6">
                <div className="relative shrink-0">
                    <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white">
                        <img
                            src={user.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.firstName}`}
                            alt="Profile"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="absolute bottom-1 right-1 bg-scout-blue text-white text-xs font-bold px-2 py-0.5 rounded-full border-2 border-white">
                        Liv. {user.level}
                    </div>
                </div>

                <div className="mt-4 text-center md:text-left md:mt-0 md:pt-20 flex-1 w-full">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{user.firstName} {user.lastName}</h1>
                            <p className="text-gray-500 font-medium">@{user.nickname || 'Nessun nickname'}</p>
                            {user.scoutCode && (
                                <p className="text-xs text-scout-green font-semibold mt-1 bg-green-50 inline-block px-2 py-1 rounded-full border border-green-100">
                                    Socio: {user.scoutCode}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link
                                to="/proposals"
                                className="bg-scout-blue text-white px-4 py-2 rounded-xl font-medium shadow-sm hover:bg-scout-blue-dark flex items-center justify-center gap-2"
                            >
                                Proposte in Attesa
                            </Link>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-medium shadow-sm hover:bg-gray-50 flex items-center justify-center gap-2"
                            >
                                <Edit2 size={18} />
                                Modifica Profilo
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Level Progress */}
            <div className="mx-6 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <span className="text-sm text-gray-500">Livello Attuale</span>
                        <h3 className="text-xl font-bold text-scout-green">{levelInfo.current.name}</h3>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-bold text-gray-900">{user.points}</span>
                        <span className="text-sm text-gray-400"> pt</span>
                    </div>
                </div>

                <div className="w-full bg-gray-100 rounded-full h-3 mb-2 overflow-hidden">
                    <div
                        className="bg-scout-green h-3 rounded-full transition-all duration-1000"
                        style={{ width: `${progressPercent}%` }}
                    ></div>
                </div>

                {levelInfo.next && (
                    <p className="text-xs text-center text-gray-400">
                        Mancano <span className="font-bold text-gray-600">{levelInfo.pointsToNext}</span> punti per {levelInfo.next.name}
                    </p>
                )}
            </div>

            {/* Stats Grid */}
            <div className="mx-6 grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-scout-green/10 p-4 rounded-xl flex flex-col items-center">
                    <MapPin className="text-scout-green mb-2" />
                    <span className="text-2xl font-bold text-gray-900">{user.locationsAdded}</span>
                    <span className="text-xs text-gray-500">Luoghi</span>
                </div>
                <div className="bg-scout-blue/10 p-4 rounded-xl flex flex-col items-center">
                    <Award className="text-scout-blue mb-2" />
                    <span className="text-2xl font-bold text-gray-900">{user.contributionsApproved}</span>
                    <span className="text-xs text-gray-500">Approvati</span>
                </div>
            </div>

            {/* Badges Section */}
            <div className="mx-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Trophy className="text-yellow-500" />
                    Badges
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                    {user.badges.map(badgeKey => {
                        const badge = BADGES[badgeKey as keyof typeof BADGES];
                        return (
                            <div key={badgeKey} className="flex flex-col items-center text-center p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                                <div className="text-3xl mb-2">{badge.icon}</div>
                                <span className="text-xs font-bold leading-tight">{badge.name}</span>
                            </div>
                        )
                    })}
                    {user.badges.length === 0 && <p className="text-gray-400 col-span-3">Nessun badge ancora conquistato.</p>}
                </div>
            </div>
        </div>
    );
}
