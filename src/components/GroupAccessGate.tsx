import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldAlert, Clock, KeyRound, CheckCircle2, AlertCircle, ArrowRight, Compass, RefreshCw } from 'lucide-react';
import { getUser, submitGroupPin, transferUserGroup, getGruppiScout, GruppoScout } from '@/lib/data';
import { User } from '@/types';

interface GroupAccessGateProps {
    children: React.ReactNode;
}

export default function GroupAccessGate({ children }: GroupAccessGateProps) {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [pinInput, setPinInput] = useState('');
    const [pinLoading, setPinLoading] = useState(false);
    const [pinError, setPinError] = useState('');
    const [pinSuccess, setPinSuccess] = useState('');

    // Transfer modal state
    const [showTransfer, setShowTransfer] = useState(false);
    const [gruppi, setGruppi] = useState<GruppoScout[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<GruppoScout | null>(null);
    const [transferPin, setTransferPin] = useState('');
    const [transferLoading, setTransferLoading] = useState(false);
    const [transferError, setTransferError] = useState('');

    const refreshUser = async () => {
        try {
            const u = await getUser();
            setUser(u);
        } catch (e) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshUser();
    }, []);

    const handlePinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPinError('');
        setPinSuccess('');
        if (!pinInput.trim()) return;

        setPinLoading(true);
        try {
            const res = await submitGroupPin(pinInput.trim());
            if (!res.success) {
                setPinError(res.message || 'PIN non valido.');
            } else {
                setPinSuccess('PIN verificato con successo!');
                await refreshUser();
            }
        } catch (err: any) {
            setPinError(err.message || 'Errore durante la verifica del PIN');
        } finally {
            setPinLoading(false);
        }
    };

    const handleOpenTransfer = async () => {
        setShowTransfer(true);
        try {
            const g = await getGruppiScout();
            setGruppi(g);
        } catch (e) {
            console.error('Error fetching gruppi:', e);
        }
    };

    const handleExecuteTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGroup) return;
        setTransferError('');
        setTransferLoading(true);

        try {
            await transferUserGroup({
                region: selectedGroup.region,
                scoutZone: selectedGroup.scoutZone,
                groupName: selectedGroup.groupName,
                groupId: String(selectedGroup.id),
                joinCodeInput: transferPin.trim() || undefined
            });
            setShowTransfer(false);
            await refreshUser();
        } catch (err: any) {
            setTransferError(err.message || 'Errore durante il trasferimento');
        } finally {
            setTransferLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-10 h-10 border-4 border-scout-green border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Verifica accessi Comunità Capi...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Active member: full access granted
    if (user.membershipStatus === 'attivo') {
        return <>{children}</>;
    }

    const approvalsCount = user.cocaApprovals?.length || 0;
    const requiredCount = user.hasValidPin ? 2 : 4;
    const progressPercent = Math.min(100, Math.round((approvalsCount / requiredCount) * 100));

    // Pending member
    if (user.membershipStatus === 'in_attesa') {
        return (
            <div className="max-w-xl mx-auto px-4 py-8 md:py-16">
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 shadow-xl border border-gray-150 dark:border-gray-700 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-16 h-16 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl mx-auto flex items-center justify-center">
                        <Clock size={32} className="animate-pulse" />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">
                            Richiesta in attesa di approvazione
                        </h2>
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                            Sei registrato nel gruppo <strong className="text-scout-green dark:text-scout-green-light font-extrabold">{user.groupName || 'Gruppo Scout'}</strong>. 
                            Per tutelare la privacy della Comunità Capi, i verbali, la cassa e i dati interni sono protetti.
                        </p>
                    </div>

                    {/* Voting Progress Card */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-150 dark:border-gray-800 text-left space-y-3">
                        <div className="flex items-center justify-between text-xs font-black">
                            <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                🗳️ Approvazioni CoCa:
                            </span>
                            <span className="text-scout-green font-bold">
                                {approvalsCount} di {requiredCount} voti ricevuti
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-scout-green transition-all duration-500 rounded-full"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>

                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {user.hasValidPin ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                    <CheckCircle2 size={12} /> PIN CoCa inserito: servono 2 approvazioni di capi attivi.
                                </span>
                            ) : (
                                <span>
                                    Senza PIN servono <strong>4 approvazioni</strong> da parte di capi attivi del gruppo.
                                </span>
                            )}
                        </p>
                    </div>

                    {/* PIN unlock section (if user doesn't have valid PIN yet) */}
                    {!user.hasValidPin && (
                        <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/30 text-left space-y-3">
                            <div className="flex items-center gap-2 text-xs font-black text-amber-800 dark:text-amber-300">
                                <KeyRound size={16} />
                                Hai il PIN fornito dai Capi Gruppo?
                            </div>
                            <p className="text-[11px] text-gray-600 dark:text-gray-400">
                                Inserendo il PIN della CoCa, la soglia per l'ingresso scende subito a <strong>sole 2 approvazioni</strong>.
                            </p>

                            <form onSubmit={handlePinSubmit} className="flex gap-2">
                                <input 
                                    type="text"
                                    value={pinInput}
                                    onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                                    placeholder="Es: TRANI1"
                                    className="flex-1 px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs md:text-sm font-black uppercase tracking-wider outline-none focus:ring-1 focus:ring-scout-green dark:text-white"
                                />
                                <button
                                    type="submit"
                                    disabled={!pinInput.trim() || pinLoading}
                                    className="px-4 py-2 bg-scout-green text-white text-xs font-bold rounded-xl hover:bg-scout-green-dark transition-all disabled:opacity-50 cursor-pointer shrink-0"
                                >
                                    {pinLoading ? 'Verifica...' : 'Convalida PIN'}
                                </button>
                            </form>

                            {pinError && (
                                <p className="text-[11px] text-red-500 font-bold flex items-center gap-1">
                                    <AlertCircle size={12} /> {pinError}
                                </p>
                            )}
                            {pinSuccess && (
                                <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                                    <CheckCircle2 size={12} /> {pinSuccess}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center items-center">
                        <button
                            onClick={refreshUser}
                            className="w-full sm:w-auto px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                            <RefreshCw size={14} /> Controlla Approvazione
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full sm:w-auto px-4 py-2.5 bg-scout-green text-white text-xs font-bold rounded-xl hover:opacity-90 flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                            <Compass size={14} /> Esplora Mappa e Luoghi
                        </button>
                    </div>

                    <div className="text-center pt-2">
                        <button
                            type="button"
                            onClick={handleOpenTransfer}
                            className="text-[11px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline cursor-pointer"
                        >
                            Non appartieni a questo gruppo? Cambia Gruppo Scout
                        </button>
                    </div>
                </div>

                {renderTransferModal()}
            </div>
        );
    }

    // Ex-member / Service concluded
    if (user.membershipStatus === 'uscito') {
        return (
            <div className="max-w-xl mx-auto px-4 py-8 md:py-16">
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 shadow-xl border border-gray-150 dark:border-gray-700 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-16 h-16 bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl mx-auto flex items-center justify-center">
                        <ShieldAlert size={32} />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">
                            Servizio Concluso in questo Gruppo
                        </h2>
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                            Il tuo servizio nella Comunità Capi di <strong className="text-gray-700 dark:text-gray-200">{user.groupName || 'Gruppo Scout'}</strong> risulta concluso. 
                            I verbali, la cassa, la lista d'attesa e il calendario interno sono riservati esclusivamente ai capi in servizio attivo.
                        </p>
                    </div>

                    <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/30 text-left text-xs text-gray-600 dark:text-gray-300 space-y-1">
                        <p className="font-bold text-emerald-800 dark:text-emerald-300">🐾 La tua storia scout rimane con te:</p>
                        <p className="text-[11px]">
                            Conserva i tuoi punti, i tuoi badge, l'iter di formazione e i luoghi che hai recensito nella mappa nazionale.
                        </p>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center items-center">
                        <button
                            onClick={handleOpenTransfer}
                            className="w-full sm:w-auto px-5 py-2.5 bg-scout-green text-white text-xs font-bold rounded-xl hover:bg-scout-green-dark flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                        >
                            <ArrowRight size={15} /> Unisciti a un altro Gruppo
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full sm:w-auto px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                            <Compass size={14} /> Torna alla Mappa
                        </button>
                    </div>
                </div>

                {renderTransferModal()}
            </div>
        );
    }

    return <>{children}</>;

    function renderTransferModal() {
        if (!showTransfer) return null;
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-700 space-y-5">
                    <div className="flex items-center justify-between">
                        <h3 className="font-black text-lg text-gray-900 dark:text-white">Cambia Gruppo Scout</h3>
                        <button 
                            type="button"
                            onClick={() => setShowTransfer(false)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold text-sm"
                        >
                            ✕
                        </button>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Seleziona il nuovo gruppo scout a cui intendi richiedere l'adesione.
                    </p>

                    <form onSubmit={handleExecuteTransfer} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Gruppo Scout</label>
                            <select
                                value={selectedGroup ? String(selectedGroup.id) : ''}
                                onChange={(e) => {
                                    const found = gruppi.find(g => String(g.id) === e.target.value);
                                    setSelectedGroup(found || null);
                                }}
                                className="w-full p-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 rounded-xl text-xs md:text-sm font-bold text-gray-900 dark:text-white outline-none"
                            >
                                <option value="">-- Seleziona Gruppo --</option>
                                {gruppi.map(g => (
                                    <option key={g.id} value={g.id}>
                                        {g.groupName} ({g.scoutZone} - {g.region})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">PIN del nuovo gruppo (opzionale)</label>
                            <input 
                                type="text"
                                value={transferPin}
                                onChange={(e) => setTransferPin(e.target.value.toUpperCase())}
                                placeholder="Inserisci il PIN se lo conosci..."
                                className="w-full p-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white outline-none"
                            />
                        </div>

                        {transferError && (
                            <p className="text-xs text-red-500 font-bold">{transferError}</p>
                        )}

                        <div className="flex gap-2 justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setShowTransfer(false)}
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-xl"
                            >
                                Annulla
                            </button>
                            <button
                                type="submit"
                                disabled={!selectedGroup || transferLoading}
                                className="px-5 py-2 bg-scout-green text-white text-xs font-bold rounded-xl hover:bg-scout-green-dark disabled:opacity-50"
                            >
                                {transferLoading ? 'Trasferimento...' : 'Richiedi Adesione'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }
}
