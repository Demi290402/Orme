import React, { useEffect, useState } from 'react';
import { Camera, MapPin, Award, Trophy, Edit2, X, Save, Database, Download, CheckCircle, Info, Mail } from 'lucide-react';
import { getUser, updateUser, logoutUser } from '@/lib/data';
import { getLevelInfo, BADGES } from '@/lib/gamification';
import { autoCreateMonthlySnapshot, getBackups, downloadBackup, BackupSnapshot } from '@/lib/backups';
import { User } from '@/types';
import { Link } from 'react-router-dom';
import UserAvatar from '@/components/UserAvatar';
import { cn } from '@/lib/utils';

export default function Profile() {
    const [user, setUser] = useState<User | null>(null);
    const [backups, setBackups] = useState<BackupSnapshot[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedBadge, setSelectedBadge] = useState<any>(null);
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
        const loadData = async () => {
            try {
                const currentUser = await getUser();
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

                // Auto-create backup check
                await autoCreateMonthlySnapshot();
                // Load backups
                const availableBackups = await getBackups();
                setBackups(availableBackups);
            } catch (error) {
                console.error('Error loading profile data:', error);
            }
        };

        loadData();
    }, []);

    const handleSave = async (customForm?: any) => {
        if (!user) return;
        const updatedUser = {
            ...user,
            ...(customForm || editForm)
        };
        try {
            await updateUser(updatedUser);
            setUser(updatedUser);
            setIsEditing(false);
            if (customForm) {
                setEditForm(prev => ({ ...prev, ...customForm }));
            }
        } catch (error) {
            console.error('Error updating user:', error);
            alert('Errore durante l\'aggiornamento del profilo');
        }
    };

    if (!user) return <div>Caricamento...</div>;

    const levelInfo = getLevelInfo(user.points);
    const progressPercent = levelInfo.next
        ? ((user.points - levelInfo.current.min) / (levelInfo.current.max - levelInfo.current.min)) * 100
        : 100;

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'profilePicture' | 'coverImage') => {
        const file = e.target.files?.[0];
        if (file) {
            const maxSize = 500 * 1024;
            if (file.size > maxSize) {
                alert('Immagine inserita troppo grande.\n\nCONSIGLIO: fare screenshot dell\'immagine che si vuole caricare');
                e.target.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                if (!isEditing) {
                    // Quick update if not in main edit modal
                    handleSave({ [field]: result });
                } else {
                    setEditForm(prev => ({ ...prev, [field]: result }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="pb-20 relative">
            {/* Edit Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
                                        onChange={e => setEditForm((prev: any) => ({ ...prev, firstName: e.target.value }))}
                                        className="w-full p-2 rounded-xl border border-gray-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cognome</label>
                                    <input
                                        type="text"
                                        value={editForm.lastName}
                                        onChange={e => setEditForm((prev: any) => ({ ...prev, lastName: e.target.value }))}
                                        className="w-full p-2 rounded-xl border border-gray-200"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nickname (Totem)</label>
                                <input
                                    type="text"
                                    value={editForm.nickname}
                                    onChange={e => setEditForm((prev: any) => ({ ...prev, nickname: e.target.value }))}
                                    className="w-full p-2 rounded-xl border border-gray-200"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Codice Socio</label>
                                <input
                                    type="text"
                                    value={editForm.scoutCode}
                                    onChange={e => setEditForm((prev: any) => ({ ...prev, scoutCode: e.target.value }))}
                                    className="w-full p-2 rounded-xl border border-gray-200"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={editForm.email}
                                    onChange={e => setEditForm((prev: any) => ({ ...prev, email: e.target.value }))}
                                    className="w-full p-2 rounded-xl border border-gray-200"
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => handleSave()}
                            className="w-full bg-scout-green text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                        >
                            <Save size={20} />
                            Salva Modifiche
                        </button>
                    </div>
                </div>
            )}

            {/* Badge Detail Modal */}
            {selectedBadge && (
                <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-6" onClick={() => setSelectedBadge(null)}>
                    <div className="bg-white rounded-3xl w-full max-w-sm p-8 text-center space-y-4 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="text-6xl mb-4">{selectedBadge.icon}</div>
                        <h2 className="text-2xl font-bold text-gray-900">{selectedBadge.name}</h2>
                        <div className="p-4 bg-gray-50 rounded-2xl text-gray-600 leading-relaxed font-medium">
                            {selectedBadge.description}
                        </div>
                        <div className="pt-4">
                            <button
                                onClick={() => setSelectedBadge(null)}
                                className="w-full bg-scout-blue text-white font-bold py-3 rounded-xl"
                            >
                                Chiudi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cover Image Section */}
            <div className="relative h-48 md:h-64 rounded-b-3xl md:rounded-3xl overflow-hidden bg-gray-200 group">
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

                <label className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-md p-2 rounded-full hover:bg-white/40 text-white cursor-pointer transition-all active:scale-95 group-hover:bg-white/30">
                    <Camera size={20} />
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, 'coverImage')}
                    />
                </label>
            </div>

            {/* Profile Header */}
            <div className="relative px-6 -mt-16 mb-6 flex flex-col items-center md:items-end md:flex-row md:gap-6">
                <UserAvatar
                    user={user}
                    size="xl"
                    isOwnProfile
                    onImageChange={(e) => handleImageUpload(e, 'profilePicture')}
                />

                <div className="mt-4 text-center md:text-left md:mt-0 md:pt-4 flex-1 w-full">
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
                                <Mail size={18} />
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
                        <h3 className="text-xl font-bold" style={{ color: levelInfo.current.color }}>{levelInfo.current.name}</h3>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-bold text-gray-900">{user.points}</span>
                        <span className="text-sm text-gray-400"> pt</span>
                    </div>
                </div>

                <div className="w-full bg-gray-100 rounded-full h-3 mb-2 overflow-hidden">
                    <div
                        className="h-3 rounded-full transition-all duration-1000"
                        style={{ width: `${progressPercent}%`, backgroundColor: levelInfo.current.color }}
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
            <div className="mx-6 mb-10">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Trophy className="text-yellow-500" />
                    I tuoi Badges
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {Object.entries(BADGES).map(([key, badge]) => {
                        const isEarned = user.badges.includes(key);
                        const currentStat = (user as any)[badge.statKey] || 0;
                        const progress = Math.min(currentStat, badge.goal);

                        return (
                            <div
                                key={key}
                                onClick={() => setSelectedBadge(badge)}
                                className={cn(
                                    "flex flex-col items-center text-center p-3 rounded-2xl border transition-all cursor-pointer active:scale-95",
                                    isEarned ? "bg-white border-yellow-200 shadow-sm" : "bg-gray-50 border-gray-100 opacity-60"
                                )}
                            >
                                <div className={cn("text-3xl mb-1", !isEarned && "filter grayscale opacity-50")}>
                                    {badge.icon}
                                </div>
                                <span className={cn("text-[10px] font-bold leading-tight line-clamp-1", isEarned ? "text-gray-900" : "text-gray-400")}>
                                    {badge.name}
                                </span>

                                <div className="mt-2 w-full">
                                    <div className="text-[9px] text-gray-400 mb-1 flex justify-between">
                                        <span>{progress}/{badge.goal}</span>
                                        {isEarned && <CheckCircle size={8} className="text-green-500" />}
                                    </div>
                                    <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-full", isEarned ? "bg-yellow-400" : "bg-scout-blue/40")}
                                            style={{ width: `${(progress / badge.goal) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Monthly Backups Section */}
            <div className="mx-6 p-6 bg-white rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900">
                        <Database className="text-scout-blue" size={20} />
                        Archivio Dati Mensile
                    </h3>
                    <div className="bg-blue-50 text-scout-blue text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider border border-blue-100">
                        Automatico
                    </div>
                </div>

                <p className="text-sm text-gray-500 leading-relaxed">
                    Ogni mese l'app salva automaticamente una copia di tutti i luoghi e le informazioni principali per sicurezza. Questi file possono essere scaricati e conservati offline.
                </p>

                <div className="space-y-2">
                    {backups.length > 0 ? (
                        backups.map((backup: BackupSnapshot) => (
                            <div key={backup.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-3">
                                    <CheckCircle size={18} className="text-green-500" />
                                    <div>
                                        <p className="font-bold text-sm text-gray-900">Snapshot {backup.month_year}</p>
                                        <p className="text-[10px] text-gray-400">{new Date(backup.created_at).toLocaleDateString('it-IT')}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => downloadBackup(backup)}
                                    className="p-2 bg-white text-scout-blue rounded-lg shadow-sm hover:shadow-md border border-blue-100 transition-all active:scale-95"
                                    title="Scarica JSON"
                                >
                                    <Download size={18} />
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <Info className="mx-auto text-gray-300 mb-2" size={24} />
                            <p className="text-sm text-gray-400">Nessun archivio disponibile al momento.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Logout Button */}
            <div className="mx-6 mt-12 mb-8">
                <button
                    onClick={async () => {
                        if (confirm('Vuoi davvero uscire?')) {
                            await logoutUser();
                            window.location.href = '/login';
                        }
                    }}
                    className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl border border-red-100 hover:bg-red-100 transition-colors"
                >
                    Esci dal Profilo
                </button>
            </div>
        </div>
    );
}
