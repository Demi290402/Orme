import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Sun, Moon, Bell, BellOff, Trash2,
    Download, RefreshCw, FolderOpen, Check,
    Shield, ChevronRight, MapPin, FileText, Users, BarChart2,
    Archive, Trophy, Zap, Bus, Clock, KeyRound, Copy, Crown, ShieldCheck, 
    Compass, Share2, HelpCircle, Search, X, Volume2, Smartphone
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { getUser, deleteUserProfile, getGroupPin, updateUser } from '@/lib/data';
import ShareAppModal from '@/components/ShareAppModal';
import ReportProblemModal from '@/components/ReportProblemModal';
import { cn } from '@/lib/utils';
import { 
    User as UserType, 
    NotificationCategory, 
    NotificationChannelPref, 
    UserNotificationPreferences, 
    DEFAULT_NOTIFICATION_PREFERENCES 
} from '@/types';
import { 
    playNotificationSound, 
    getLocalNotificationPreferences, 
    saveLocalNotificationPreferences 
} from '@/lib/notifications';

// ─── Types ───────────────────────────────────────────
type Cadenza = 'giornaliera' | 'settimanale' | 'mensile' | 'trimestrale' | 'semestrale' | 'annuale';

type SettingsTab = 'gruppo' | 'notifiche' | 'aspetto' | 'dati' | 'account' | 'assistenza';

const CADENZE: { value: Cadenza; label: string }[] = [
    { value: 'giornaliera', label: 'Ogni giorno' },
    { value: 'settimanale', label: 'Ogni settimana' },
    { value: 'mensile', label: 'Ogni mese' },
    { value: 'trimestrale', label: 'Ogni 3 mesi' },
    { value: 'semestrale', label: 'Ogni 6 mesi' },
    { value: 'annuale', label: 'Una volta l\'anno' },
];

const EXPORT_OPTIONS = [
    { key: 'luoghi', label: 'Luoghi', icon: MapPin, color: 'text-scout-green' },
    { key: 'verbali', label: 'Verbali (CoCa)', icon: FileText, color: 'text-scout-blue' },
    { key: 'membri', label: 'Membri CoCa', icon: Users, color: 'text-purple-500' },
    { key: 'presenze', label: 'Dashboard Presenze', icon: BarChart2, color: 'text-amber-500' },
    { key: 'storico', label: 'Storico Attività', icon: Archive, color: 'text-orange-500' },
    { key: 'classifica', label: 'Classifica', icon: Trophy, color: 'text-yellow-500' },
    { key: 'lista_attesa', label: 'Lista di Attesa', icon: Clock, color: 'text-red-500' },
    { key: 'trasporti', label: 'Trasporti Privati', icon: Bus, color: 'text-emerald-500' },
];

const DOWNLOAD_OPTIONS = EXPORT_OPTIONS.filter(opt => opt.key !== 'membri' && opt.key !== 'presenze');

const NOTIFICATION_CATEGORIES: {
    key: NotificationCategory;
    label: string;
    description: string;
    icon: React.ElementType;
    color: string;
}[] = [
    { 
        key: 'verbali', 
        label: 'Verbali di Comunità Capi', 
        description: 'Pubblicazione e aggiornamento dei verbali di riunione',
        icon: FileText,
        color: 'text-scout-blue'
    },
    { 
        key: 'lista_attesa', 
        label: 'Lista d\'Attesa', 
        description: 'Nuove iscrizioni di ragazzi (da modulo pubblico o manuali) e modifiche',
        icon: Clock,
        color: 'text-amber-500'
    },
    { 
        key: 'richiesta_accesso', 
        label: 'Ingresso Capi in CoCa', 
        description: 'Richieste di accesso o nuovi censiti nella Comunità Capi',
        icon: Users,
        color: 'text-purple-500'
    },
    { 
        key: 'aggiornamento_luoghi', 
        label: 'Luoghi & Basi Scout', 
        description: 'Nuove strutture censite o modifiche a schede, contatti e servizi',
        icon: MapPin,
        color: 'text-emerald-500'
    },
];

const CHANNEL_OPTIONS: {
    value: NotificationChannelPref;
    label: string;
    shortLabel: string;
    icon: string;
}[] = [
    { value: 'entrambe', label: 'Entrambe (In-App + Email)', shortLabel: 'Entrambe', icon: '🔔+✉️' },
    { value: 'in_app', label: 'Solo In-App', shortLabel: 'Solo App', icon: '🔔' },
    { value: 'email', label: 'Solo Email', shortLabel: 'Solo Email', icon: '✉️' },
    { value: 'disattivo', label: 'Disattiva', shortLabel: 'Nessuna', icon: '🚫' },
];

interface SettingsCategoryNav {
    id: SettingsTab;
    label: string;
    description: string;
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    keywords: string[];
}

const SETTINGS_CATEGORIES: SettingsCategoryNav[] = [
    {
        id: 'gruppo',
        label: 'Gruppo Scout & CoCa',
        description: 'PIN segreto, censimento, membri e codice di gruppo',
        icon: Users,
        iconBg: 'bg-emerald-100 dark:bg-emerald-950/60',
        iconColor: 'text-emerald-700 dark:text-emerald-400',
        keywords: ['gruppo', 'coca', 'pin', 'comunità capi', 'membri', 'censimento', 'codice', 'approvazioni', 'ruolo', 'capo gruppo']
    },
    {
        id: 'notifiche',
        label: 'Notifiche & Avvisi',
        description: 'Preferenze in-app/email per verbali, lista d\'attesa, luoghi e suoni',
        icon: Bell,
        iconBg: 'bg-purple-100 dark:bg-purple-950/60',
        iconColor: 'text-purple-700 dark:text-purple-400',
        keywords: ['notifiche', 'notifica', 'suono', 'tono', 'avvisi', 'email', 'in-app', 'lista attesa', 'verbali', 'luoghi', 'campana', 'corno']
    },
    {
        id: 'aspetto',
        label: 'Aspetto & Dispositivi',
        description: 'Modalità scura/chiara e interfaccia per smartwatch',
        icon: Sun,
        iconBg: 'bg-amber-100 dark:bg-amber-950/60',
        iconColor: 'text-amber-700 dark:text-amber-400',
        keywords: ['aspetto', 'tema', 'scuro', 'chiaro', 'dark', 'modalità visiva', 'smartwatch', 'apple watch', 'samsung', 'orologio', 'wear os']
    },
    {
        id: 'dati',
        label: 'Dati & Backup',
        description: 'Download manuale Excel e programmazione backup automatico',
        icon: Download,
        iconBg: 'bg-blue-100 dark:bg-blue-950/60',
        iconColor: 'text-blue-700 dark:text-blue-400',
        keywords: ['dati', 'backup', 'export', 'esportazione', 'excel', 'xlsx', 'download', 'automatico', 'cartella', 'frequenza']
    },
    {
        id: 'account',
        label: 'Account & Sicurezza',
        description: 'Dati del profilo scout, informativa privacy ed eliminazione account',
        icon: Shield,
        iconBg: 'bg-indigo-100 dark:bg-indigo-950/60',
        iconColor: 'text-indigo-700 dark:text-indigo-400',
        keywords: ['account', 'profilo', 'privacy', 'elimina', 'totem', 'nome', 'cognome', 'email', 'sicurezza']
    },
    {
        id: 'assistenza',
        label: 'Assistenza & Inviti',
        description: 'Segnalazione problemi, suggerimenti, invito ad altri capi e crediti',
        icon: HelpCircle,
        iconBg: 'bg-orange-100 dark:bg-orange-950/60',
        iconColor: 'text-orange-700 dark:text-orange-400',
        keywords: ['assistenza', 'supporto', 'aiuto', 'segnalazione', 'feedback', 'invito', 'condividi', 'versione', 'problema']
    },
];

// ─── Toggle Component ─────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!value)}
            className={cn(
                'relative w-12 h-6 rounded-full transition-all duration-300 shrink-0 cursor-pointer',
                value ? 'bg-scout-green' : 'bg-gray-200 dark:bg-gray-700'
            )}
        >
            <span className={cn(
                'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300',
                value ? 'translate-x-6' : 'translate-x-0'
            )} />
        </button>
    );
}

// ─── Main Component ───────────────────────────────────
export default function Settings() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [user, setUser] = useState<UserType | null>(null);
    const [groupPin, setGroupPin] = useState<string | null>(null);
    const [copiedPin, setCopiedPin] = useState(false);
    const [loadingPin, setLoadingPin] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);

    // Active Navigation Tabs
    const [activeTab, setActiveTab] = useState<SettingsTab>('gruppo');
    // On mobile: null means we are at the root menu list (iOS style)
    const [activeTabMobile, setActiveTabMobile] = useState<SettingsTab | null>(null);

    // Search query for filtering settings
    const [searchQuery, setSearchQuery] = useState('');

    // Notification settings
    const [notifiche, setNotifiche] = useState(true);
    const [suonoNotifica, setSuonoNotifica] = useState('default');
    const [notifPreferences, setNotifPreferences] = useState<UserNotificationPreferences>(() => getLocalNotificationPreferences());
    const [savedNotificationToast, setSavedNotificationToast] = useState(false);

    // Auto-export settings
    const [autoExport, setAutoExport] = useState(false);
    const [exportOptions, setExportOptions] = useState<Record<string, boolean>>({
        luoghi: true, verbali: true, membri: false, presenze: false, storico: false, classifica: false, lista_attesa: false, trasporti: false
    });
    const [autoExportConfigs, setAutoExportConfigs] = useState<Record<string, { enabled: boolean; cadenza: Cadenza; fileName: string }>>({
        luoghi: { enabled: true, cadenza: 'mensile', fileName: 'Luoghi' },
        verbali: { enabled: true, cadenza: 'mensile', fileName: 'Verbali' },
        membri: { enabled: false, cadenza: 'mensile', fileName: 'Membri_CoCa' },
        presenze: { enabled: false, cadenza: 'mensile', fileName: 'Dashboard_Presenze' },
        storico: { enabled: false, cadenza: 'mensile', fileName: 'Storico_Attivita' },
        classifica: { enabled: false, cadenza: 'mensile', fileName: 'Classifica' },
        lista_attesa: { enabled: false, cadenza: 'mensile', fileName: 'Lista_Attesa' },
        trasporti: { enabled: false, cadenza: 'mensile', fileName: 'Trasporti_Privati' }
    });
    const [exportPath, setExportPath] = useState('');
    const [showAutoExport, setShowAutoExport] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Delete account
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteText, setDeleteText] = useState('');
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        getUser().then(u => {
            setUser(u);
            if (u) {
                if (u.notificationTone) {
                    setSuonoNotifica(u.notificationTone);
                }
                if (u.notificationPreferences) {
                    const merged = { ...getLocalNotificationPreferences(), ...u.notificationPreferences };
                    setNotifPreferences(merged);
                    saveLocalNotificationPreferences(merged, u.notificationTone || suonoNotifica);
                }
            }
            if (u && (u.groupId || u.groupName)) {
                setLoadingPin(true);
                getGroupPin(u.groupId, u.groupName, u.scoutZone, u.region)
                    .then(pin => setGroupPin(pin))
                    .catch(console.error)
                    .finally(() => setLoadingPin(false));
            }
        }).catch(console.error);

        // Load saved preferences
        const saved = localStorage.getItem('orme_settings');
        if (saved) {
            try {
                const prefs = JSON.parse(saved);
                if (prefs.notifiche !== undefined) setNotifiche(prefs.notifiche);
                if (prefs.suonoNotifica || prefs.notificationTone || prefs.notifTone) {
                    setSuonoNotifica(prefs.suonoNotifica || prefs.notificationTone || prefs.notifTone);
                }
                if (prefs.notificationPreferences) {
                    setNotifPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...prefs.notificationPreferences });
                }
                if (prefs.autoExport !== undefined) setAutoExport(prefs.autoExport);
                if (prefs.exportOptions) setExportOptions(prefs.exportOptions);
                if (prefs.exportPath) setExportPath(prefs.exportPath);
                
                if (prefs.autoExportConfigs) {
                    const defaults: Record<string, { enabled: boolean; cadenza: Cadenza; fileName: string }> = {
                        luoghi: { enabled: true, cadenza: 'mensile', fileName: 'Luoghi' },
                        verbali: { enabled: true, cadenza: 'mensile', fileName: 'Verbali' },
                        membri: { enabled: false, cadenza: 'mensile', fileName: 'Membri_CoCa' },
                        presenze: { enabled: false, cadenza: 'mensile', fileName: 'Dashboard_Presenze' },
                        storico: { enabled: false, cadenza: 'mensile', fileName: 'Storico_Attivita' },
                        classifica: { enabled: false, cadenza: 'mensile', fileName: 'Classifica' },
                        lista_attesa: { enabled: false, cadenza: 'mensile', fileName: 'Lista_Attesa' },
                        trasporti: { enabled: false, cadenza: 'mensile', fileName: 'Trasporti_Privati' }
                    };
                    Object.entries(prefs.autoExportConfigs).forEach(([k, v]: [string, any]) => {
                        if (defaults[k]) {
                            defaults[k] = {
                                enabled: v.enabled ?? defaults[k].enabled,
                                cadenza: (v.cadenza ?? defaults[k].cadenza) as Cadenza,
                                fileName: v.fileName ?? defaults[k].fileName
                            };
                        }
                    });
                    setAutoExportConfigs(defaults);
                }
            } catch { /* ignore */ }
        }
    }, []);

    const savePrefs = (patch: object) => {
        const current = JSON.parse(localStorage.getItem('orme_settings') || '{}');
        localStorage.setItem('orme_settings', JSON.stringify({ ...current, ...patch }));
    };

    const handleSetChannelPref = async (category: NotificationCategory, pref: NotificationChannelPref) => {
        const updated = {
            ...notifPreferences,
            [category]: pref,
        };
        setNotifPreferences(updated);
        saveLocalNotificationPreferences(updated, suonoNotifica);
        savePrefs({
            notificationPreferences: updated,
            notifTypes: {
                verbali: updated.verbali !== 'disattivo',
                lista_attesa: updated.lista_attesa !== 'disattivo',
                aggiornamento_luoghi: updated.aggiornamento_luoghi !== 'disattivo',
                richiesta_accesso: updated.richiesta_accesso !== 'disattivo',
            }
        });

        if (user) {
            try {
                const updatedUser = await updateUser({
                    ...user,
                    notificationPreferences: updated,
                    notificationTone: suonoNotifica,
                });
                setUser(updatedUser);
            } catch (err) {
                console.warn('Could not sync notification preferences to user record:', err);
            }
        }

        setSavedNotificationToast(true);
        setTimeout(() => setSavedNotificationToast(false), 2000);
    };

    const handleChangeTone = async (newTone: string) => {
        setSuonoNotifica(newTone);
        saveLocalNotificationPreferences(notifPreferences, newTone);
        savePrefs({
            suonoNotifica: newTone,
            notifTone: newTone,
            notificationTone: newTone,
        });

        if (user) {
            try {
                const updatedUser = await updateUser({
                    ...user,
                    notificationPreferences: notifPreferences,
                    notificationTone: newTone,
                });
                setUser(updatedUser);
            } catch (err) {
                console.warn('Could not sync tone to user record:', err);
            }
        }
        playNotificationSound(newTone);
    };

    const handleCopyPin = () => {
        if (!groupPin) return;
        navigator.clipboard.writeText(groupPin);
        setCopiedPin(true);
        setTimeout(() => setCopiedPin(false), 2000);
    };

    const handlePickFolder = async () => {
        try {
            // @ts-ignore - File System Access API
            const handle = await (window as any).showDirectoryPicker();
            setExportPath(handle.name);
            savePrefs({ exportPath: handle.name });

            // Store handle to IndexedDB
            const { storeFolderHandle } = await import('@/lib/autoExport');
            await storeFolderHandle(handle);
        } catch {
            setExportPath('Download del browser');
            savePrefs({ exportPath: 'Download del browser' });
        }
    };

    const handleManualDownload = async () => {
        setIsDownloading(true);
        try {
            const dataBundle: Record<string, any> = {};

            if (exportOptions.luoghi) {
                const { getLocations } = await import('@/lib/data');
                dataBundle.luoghi = await getLocations();
            }
            if (exportOptions.verbali) {
                const { getVerbali } = await import('@/lib/verbali');
                dataBundle.verbali = await getVerbali();
            }
            if (exportOptions.storico) {
                const { getAllLocationHistory } = await import('@/lib/data');
                dataBundle.storico = await getAllLocationHistory();
            }
            if (exportOptions.classifica) {
                const { getAllUsers } = await import('@/lib/data');
                const users = await getAllUsers();
                dataBundle.classifica = users
                    .filter(u => u.membershipStatus === 'attivo')
                    .sort((a, b) => b.points - a.points);
            }
            if (exportOptions.lista_attesa) {
                const { getListaAttesa } = await import('@/lib/listaAttesa');
                dataBundle.lista_attesa = await getListaAttesa();
            }
            if (exportOptions.trasporti) {
                const { getServiziTrasporto } = await import('@/lib/trasporti');
                dataBundle.trasporti = await getServiziTrasporto();
            }

            const { triggerFileDownload, flattenResource } = await import('@/lib/autoExport');
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '_');
            const filename = `orme_download_dati_${dateStr}.xlsx`;

            const XLSX = await import('xlsx');
            const wb = XLSX.utils.book_new();
            Object.entries(dataBundle).forEach(([key, rawList]) => {
                const sheetRows = flattenResource(key, rawList);
                const ws = XLSX.utils.json_to_sheet(sheetRows);
                const sheetName = key.slice(0, 30).toUpperCase();
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });
            triggerFileDownload(filename, wb, 'xlsx');
        } catch (error) {
            console.error('Download error:', error);
            alert('Errore durante l\'esportazione dei dati.');
        } finally {
            setIsDownloading(false);
        }
    };

    // Filter categories based on search query
    const filteredCategories = useMemo(() => {
        if (!searchQuery.trim()) return SETTINGS_CATEGORIES;
        const q = searchQuery.toLowerCase().trim();
        return SETTINGS_CATEGORIES.filter(cat => 
            cat.label.toLowerCase().includes(q) ||
            cat.description.toLowerCase().includes(q) ||
            cat.keywords.some(k => k.toLowerCase().includes(q))
        );
    }, [searchQuery]);

    // Active category for detail view
    const currentCategory = useMemo(() => {
        return SETTINGS_CATEGORIES.find(c => c.id === activeTab) || SETTINGS_CATEGORIES[0];
    }, [activeTab]);

    // Helper to render content of any section
    const renderSectionContent = (tabId: SettingsTab) => {
        switch (tabId) {
            case 'gruppo':
                return (
                    <div className="space-y-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-700/80 p-5 space-y-5 shadow-xs">
                            {user?.groupName ? (
                                <>
                                    {/* Group Header Info */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-700/60">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h2 className="text-lg font-black text-gray-900 dark:text-white">
                                                    {user.groupName}
                                                </h2>
                                                {user.groupRole === 'capo_gruppo' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                                                        <Crown size={11} className="text-amber-600 dark:text-amber-400" />
                                                        Capo Gruppo
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                                                        Capo
                                                    </span>
                                                )}
                                            </div>
                                            {(user.scoutZone || user.region) && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 font-medium">
                                                    <Compass size={13} className="text-scout-green shrink-0" />
                                                    {[user.scoutZone, user.region].filter(Boolean).join(' · ')}
                                                </p>
                                            )}
                                        </div>

                                        {/* Status Badge */}
                                        <div>
                                            {user.membershipStatus === 'attivo' && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                                    <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
                                                    Membro CoCa Censito
                                                </span>
                                            )}
                                            {user.membershipStatus === 'in_attesa' && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                                                    <Clock size={14} className="text-amber-600 dark:text-amber-400" />
                                                    In Approvazione (2 voti)
                                                </span>
                                            )}
                                            {user.membershipStatus === 'uscito' && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                    Non Attivo
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Codice / PIN Comunità Capi Card */}
                                    <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/30 dark:via-emerald-900/10 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-4 sm:p-5 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                                                <KeyRound size={16} className="text-emerald-600 dark:text-emerald-400" />
                                                <span className="text-xs font-black uppercase tracking-wider">Codice Segreto Comunità Capi</span>
                                            </div>
                                            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-100/80 dark:bg-emerald-900/50 px-2.5 py-0.5 rounded-full">
                                                PIN CoCa
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between gap-3 bg-white dark:bg-gray-900 p-3 sm:p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                                            <div className="font-mono text-2xl sm:text-3xl font-black tracking-widest text-emerald-700 dark:text-emerald-400 select-all">
                                                {loadingPin ? '••••••' : (groupPin || 'NON DEFINITO')}
                                            </div>
                                            {groupPin && (
                                                <button
                                                    type="button"
                                                    onClick={handleCopyPin}
                                                    className={cn(
                                                        "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs",
                                                        copiedPin
                                                            ? "bg-emerald-600 text-white shadow-sm"
                                                            : "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800/60 active:scale-95"
                                                    )}
                                                >
                                                    {copiedPin ? <Check size={14} /> : <Copy size={14} />}
                                                    {copiedPin ? 'Copiato!' : 'Copia PIN'}
                                                </button>
                                            )}
                                        </div>

                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                                            Condividi questo PIN con i nuovi capi che si uniscono al gruppo: permette loro di sbloccare l'accesso con <strong>2 approvazioni</strong> invece di 4.
                                        </p>
                                    </div>

                                    {/* Action cards */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => navigate('/verbali/membri')}
                                            className="flex items-center justify-between p-3.5 rounded-xl border border-gray-150 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                                    <Users size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-900 dark:text-white">Membri & Approvazioni</p>
                                                    <p className="text-[10px] text-gray-400">Censimento e sicurezza CoCa</p>
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:translate-x-0.5 transition-transform" />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => navigate('/profile')}
                                            className="flex items-center justify-between p-3.5 rounded-xl border border-gray-150 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                                    <Compass size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-900 dark:text-white">Cambia o Trasferisci Gruppo</p>
                                                    <p className="text-[10px] text-gray-400">Passaggio ad altra CoCa</p>
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:translate-x-0.5 transition-transform" />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setShowShareModal(true)}
                                            className="col-span-full flex items-center justify-between p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors text-left group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                                                    <Share2 size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-900 dark:text-white">Invita un Capo Scout su Orme</p>
                                                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                                                        Condividi l'app (l'invitato potrà scegliere o creare il suo gruppo)
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-6 space-y-3">
                                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                        Nessun Gruppo Scout associato al tuo profilo
                                    </p>
                                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                                        Seleziona la tua Regione, Zona e Gruppo AGESCI per accedere a verbali, bilancio e attività di Comunità Capi.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/profile')}
                                        className="px-4 py-2.5 rounded-xl bg-scout-green text-white text-xs font-black shadow-md hover:bg-scout-green/90 transition-all cursor-pointer"
                                    >
                                        Scegli il tuo Gruppo nel Profilo →
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'notifiche':
                return (
                    <div className="space-y-4">
                        {/* Master Switch Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-700/80 p-5 space-y-4 shadow-xs">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                        notifiche ? "bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400" : "bg-gray-100 dark:bg-gray-700 text-gray-400"
                                    )}>
                                        {notifiche ? <Bell size={20} /> : <BellOff size={20} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">Notifiche In-App & Push</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {notifiche ? 'Le notifiche dell\'applicazione sono abilitate' : 'Tutte le notifiche in-app sono silenziate'}
                                        </p>
                                    </div>
                                </div>
                                <Toggle value={notifiche} onChange={v => {
                                    setNotifiche(v);
                                    savePrefs({ notifiche: v });
                                    if (v && 'Notification' in window) {
                                        Notification.requestPermission().then(permission => {
                                            if (permission !== 'granted') {
                                                alert('Per ricevere le notifiche push di sistema, abilita i permessi di notifica del browser.');
                                            }
                                        });
                                    }
                                }} />
                            </div>

                            {notifiche && (
                                <div className="pt-4 border-t border-gray-100 dark:border-gray-700/60 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                Canali Preferiti per Categoria
                                            </p>
                                            <p className="text-[11px] text-gray-400 leading-relaxed mt-0.5">
                                                Scegli come ricevere ogni avviso (anche per le modifiche che applichi tu stesso).
                                            </p>
                                        </div>
                                        {savedNotificationToast && (
                                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded-lg animate-in fade-in">
                                                <Check size={12} /> Salvato
                                            </span>
                                        )}
                                    </div>

                                    {/* 4 Categories Card List */}
                                    <div className="space-y-3">
                                        {NOTIFICATION_CATEGORIES.map(n => (
                                            <div 
                                                key={n.key} 
                                                className="p-3.5 sm:p-4 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-150 dark:border-gray-800 space-y-3"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 shadow-xs flex items-center justify-center shrink-0 mt-0.5">
                                                        <n.icon size={16} className={n.color} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-gray-900 dark:text-white leading-snug">{n.label}</p>
                                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight mt-0.5">{n.description}</p>
                                                    </div>
                                                </div>

                                                {/* Channel Selector Pills */}
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
                                                    {CHANNEL_OPTIONS.map(opt => {
                                                        const isSelected = (notifPreferences[n.key] || 'entrambe') === opt.value;
                                                        return (
                                                            <button
                                                                key={opt.value}
                                                                type="button"
                                                                onClick={() => handleSetChannelPref(n.key, opt.value)}
                                                                className={cn(
                                                                    "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] transition-all cursor-pointer select-none",
                                                                    isSelected
                                                                        ? opt.value === 'entrambe'
                                                                            ? "bg-emerald-600 text-white shadow-xs font-black ring-1 ring-emerald-500"
                                                                            : opt.value === 'in_app'
                                                                            ? "bg-purple-600 text-white shadow-xs font-black ring-1 ring-purple-500"
                                                                            : opt.value === 'email'
                                                                            ? "bg-blue-600 text-white shadow-xs font-black ring-1 ring-blue-500"
                                                                            : "bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-black ring-1 ring-gray-400"
                                                                        : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700/60 border border-gray-100 dark:border-gray-700/50"
                                                                )}
                                                            >
                                                                <span className="text-xs">{opt.icon}</span>
                                                                <span className="truncate">{opt.shortLabel}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Suono Notifica */}
                                    <div className="pt-4 border-t border-gray-150 dark:border-gray-800 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                                <Volume2 size={14} className="text-purple-500" />
                                                Suono di Notifica In-App
                                            </p>
                                            <span className="text-[10px] text-gray-400">
                                                Riproduce all'arrivo reale delle notifiche
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <select
                                                value={suonoNotifica}
                                                onChange={e => handleChangeTone(e.target.value)}
                                                className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-205 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs font-bold text-gray-850 dark:text-gray-200 outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                                            >
                                                <option value="default">Default Beep</option>
                                                <option value="scout_horn">Corno Scout (Bitonale G4/A4)</option>
                                                <option value="camp_bell">Campana del Campo Scout</option>
                                                <option value="campfire">Fuoco da Campo (Crepitio)</option>
                                                <option value="nature_birds">Canto degli Uccelli</option>
                                                <option value="guitar_chord">Accordo di Chitarra (Do Magg)</option>
                                            </select>
                                            <button
                                                onClick={() => playNotificationSound(suonoNotifica)}
                                                type="button"
                                                className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-4 py-2.5 rounded-xl text-xs font-black hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors active:scale-95 shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
                                            >
                                                <Volume2 size={14} />
                                                <span>Prova Suono</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'aspetto':
                return (
                    <div className="space-y-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-700/80 p-5 space-y-4 shadow-xs">
                            {/* Tema */}
                            <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700/60">
                                <div className="flex items-center gap-3.5">
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                        theme === 'dark' ? "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-500" : "bg-amber-100 dark:bg-amber-950/60 text-amber-500"
                                    )}>
                                        {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">Modalità Visiva</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {theme === 'dark' ? 'Modalità scura attiva (ottimizzata per risparmio batteria e ore serali)' : 'Modalità chiara attiva'}
                                        </p>
                                    </div>
                                </div>
                                <Toggle value={theme === 'dark'} onChange={toggleTheme} />
                            </div>

                            {/* Smartwatch view */}
                            <div 
                                onClick={() => navigate('/watch')}
                                className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 border border-gray-150 dark:border-gray-800 transition-colors cursor-pointer group"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                        <Smartphone size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                            Vista Smartwatch
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            Interfaccia ultra-compatta per Apple Watch, Samsung Galaxy Watch e Wear OS
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                        </div>
                    </div>
                );

            case 'dati':
                return (
                    <div className="space-y-4">
                        {/* Download manuale */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-700/80 p-5 space-y-4 shadow-xs">
                            <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-700/60">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                        <Download size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">Download Dati Manuale</p>
                                        <p className="text-xs text-gray-400">Esporta i dati in un file Excel completo (XLSX)</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 text-xs font-black text-scout-blue shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const allTrue = Object.keys(exportOptions).reduce((acc, k) => ({ ...acc, [k]: true }), {});
                                            setExportOptions(allTrue);
                                        }}
                                        className="hover:underline cursor-pointer"
                                    >
                                        Tutto
                                    </button>
                                    <span className="text-gray-300">|</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const allFalse = Object.keys(exportOptions).reduce((acc, k) => ({ ...acc, [k]: false }), {});
                                            setExportOptions(allFalse);
                                        }}
                                        className="hover:underline cursor-pointer"
                                    >
                                        Nessuno
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {DOWNLOAD_OPTIONS.map(opt => (
                                    <button
                                        key={opt.key}
                                        type="button"
                                        onClick={() => setExportOptions(prev => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                                        className={cn(
                                            'flex items-center gap-2 p-3 rounded-xl border-2 text-xs font-bold transition-all text-left cursor-pointer',
                                            exportOptions[opt.key]
                                                ? 'border-scout-green bg-scout-green/5 dark:bg-scout-green/10 text-gray-900 dark:text-white'
                                                : 'border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500'
                                        )}
                                    >
                                        <opt.icon size={14} className={exportOptions[opt.key] ? opt.color : 'text-gray-300 dark:text-gray-600'} />
                                        <span className="truncate">{opt.label}</span>
                                        {exportOptions[opt.key] && <Check size={12} className="ml-auto text-scout-green shrink-0" />}
                                    </button>
                                ))}
                            </div>

                            <button
                                type="button"
                                disabled={!Object.values(exportOptions).some(Boolean) || isDownloading}
                                onClick={handleManualDownload}
                                className="w-full bg-scout-blue hover:bg-blue-600 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-xs sm:text-sm cursor-pointer"
                            >
                                <Download size={16} />
                                {isDownloading ? 'Generazione in corso...' : 'Scarica Dati Selezionati in Excel'}
                            </button>
                        </div>

                        {/* Backup automatico */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-700/80 p-5 space-y-4 shadow-xs">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                        <Zap size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">Estrazione Automatica Programmata</p>
                                        <p className="text-xs text-gray-400">Salvataggio automatico periodico in background</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Toggle value={autoExport} onChange={v => {
                                        setAutoExport(v);
                                        setShowAutoExport(v);
                                        savePrefs({ autoExport: v });
                                    }} />
                                    {autoExport && (
                                        <button onClick={() => setShowAutoExport(p => !p)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer" type="button">
                                            <ChevronRight size={16} className={cn('text-gray-400 transition-transform', showAutoExport && 'rotate-90')} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {autoExport && showAutoExport && (
                                <div className="pt-4 border-t border-gray-100 dark:border-gray-700/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                    {/* Cartella */}
                                    <div className="space-y-1.5">
                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Cartella di Destinazione</p>
                                        <button
                                            onClick={handlePickFolder}
                                            className={cn(
                                                'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-xs font-bold transition-all text-left cursor-pointer',
                                                exportPath
                                                    ? 'border-scout-green bg-scout-green/5 dark:bg-scout-green/10 text-gray-900 dark:text-white'
                                                    : 'border-dashed border-gray-200 dark:border-gray-700 text-gray-400'
                                            )}
                                            type="button"
                                        >
                                            <FolderOpen size={16} className={exportPath ? 'text-scout-green' : 'text-gray-300'} />
                                            <span className="flex-1 truncate">{exportPath || 'Scegli cartella del computer...'}</span>
                                            {exportPath && <Check size={14} className="text-scout-green shrink-0" />}
                                        </button>
                                    </div>

                                    {/* Programmazione risorse */}
                                    <div className="space-y-2">
                                        <p className="text-xs font-black uppercase tracking-wider text-gray-400">Frequenze per risorsa</p>
                                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                            {EXPORT_OPTIONS.map(opt => {
                                                const config = autoExportConfigs[opt.key] || { enabled: false, cadenza: 'mensile', fileName: opt.label };
                                                return (
                                                    <div key={opt.key} className="bg-gray-50/70 dark:bg-gray-900/40 p-3 rounded-xl border border-gray-150 dark:border-gray-800 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <opt.icon size={14} className={opt.color} />
                                                                <span className="text-xs font-bold text-gray-900 dark:text-white">{opt.label}</span>
                                                            </div>
                                                            <Toggle
                                                                value={config.enabled}
                                                                onChange={v => {
                                                                    const updated = {
                                                                        ...autoExportConfigs,
                                                                        [opt.key]: { ...config, enabled: v }
                                                                    };
                                                                    setAutoExportConfigs(updated);
                                                                    savePrefs({ autoExportConfigs: updated });
                                                                }}
                                                            />
                                                        </div>
                                                        {config.enabled && (
                                                            <div className="flex items-center justify-between gap-3 pt-1.5 border-t border-gray-150 dark:border-gray-800 text-[11px]">
                                                                <span className="text-gray-400">Cadenza:</span>
                                                                <select
                                                                    value={config.cadenza}
                                                                    onChange={e => {
                                                                        const updated = {
                                                                            ...autoExportConfigs,
                                                                            [opt.key]: { ...config, cadenza: e.target.value as Cadenza }
                                                                        };
                                                                        setAutoExportConfigs(updated);
                                                                        savePrefs({ autoExportConfigs: updated });
                                                                    }}
                                                                    className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold text-gray-800 dark:text-gray-200"
                                                                >
                                                                    {CADENZE.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                                                </select>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <button
                                        onClick={async () => {
                                            savePrefs({ autoExport, autoExportConfigs, exportPath });
                                            alert('Configurazione salvata con successo!');
                                            if (autoExport) {
                                                const { checkAndRunAutoExport } = await import('@/lib/autoExport');
                                                await checkAndRunAutoExport(true);
                                            }
                                        }}
                                        className="w-full bg-scout-green hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs active:scale-95 transition-all shadow-xs cursor-pointer"
                                        type="button"
                                    >
                                        <RefreshCw size={14} />
                                        Salva Programmazione
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'account':
                return (
                    <div className="space-y-4">
                        {/* Profile mini preview card */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-700/80 p-5 space-y-4 shadow-xs">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-scout-green/10 flex items-center justify-center font-black text-scout-green text-xl overflow-hidden shrink-0 border-2 border-scout-green/30">
                                    {user?.profilePicture
                                        ? <img src={user.profilePicture} className="w-full h-full object-cover" alt={user.nickname} />
                                        : user?.nickname?.charAt(0) || 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-base text-gray-900 dark:text-white truncate">
                                        {user ? `${user.firstName} ${user.lastName}` : 'Profilo Scout'}
                                    </h3>
                                    <p className="text-xs text-gray-400 font-bold">@{user?.nickname || 'utente'}</p>
                                    <p className="text-[11px] text-gray-500 mt-0.5">{user?.email}</p>
                                </div>
                                <button
                                    onClick={() => navigate('/profile')}
                                    className="px-3.5 py-2 rounded-xl bg-scout-blue text-white text-xs font-black shadow-xs hover:bg-blue-600 transition-colors cursor-pointer shrink-0"
                                >
                                    Modifica
                                </button>
                            </div>

                            <div className="pt-3 border-t border-gray-100 dark:border-gray-700/60 divide-y divide-gray-100 dark:divide-gray-700/50">
                                <div 
                                    onClick={() => navigate('/privacy')}
                                    className="flex items-center justify-between py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 px-2 rounded-xl transition-colors cursor-pointer group"
                                >
                                    <div className="flex items-center gap-3">
                                        <Shield size={16} className="text-indigo-500" />
                                        <div>
                                            <p className="text-xs font-bold text-gray-900 dark:text-white">Informativa sulla Privacy</p>
                                            <p className="text-[10px] text-gray-400">Trattamento e protezione dei dati personali</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:translate-x-0.5 transition-transform" />
                                </div>

                                <div 
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="flex items-center justify-between py-3 hover:bg-red-50 dark:hover:bg-red-950/20 px-2 rounded-xl transition-colors cursor-pointer group"
                                >
                                    <div className="flex items-center gap-3">
                                        <Trash2 size={16} className="text-red-500" />
                                        <div>
                                            <p className="text-xs font-bold text-red-600 dark:text-red-400">Elimina Account</p>
                                            <p className="text-[10px] text-red-400 dark:text-red-500/70">Azione irreversibile con eliminazione dati</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-red-300 dark:text-red-800 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'assistenza':
                return (
                    <div className="space-y-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-700/80 p-5 space-y-4 shadow-xs">
                            <div 
                                onClick={() => setShowReportModal(true)}
                                className="flex items-center justify-between gap-4 p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-100/60 transition-colors cursor-pointer group"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                        <HelpCircle size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                                            Segnala un Problema o Suggerimento
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            Invia un feedback diretto al team di sviluppo di Orme (appormescout@gmail.com)
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-amber-600 group-hover:translate-x-0.5 transition-transform" />
                            </div>

                            <div 
                                onClick={() => setShowShareModal(true)}
                                className="flex items-center justify-between gap-4 p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-100/60 transition-colors cursor-pointer group"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                        <Share2 size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                                            Condividi Orme con altri Capi Scout
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            Fai conoscere Orme a capi di altri gruppi ed eventi associativi
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                            </div>

                            {/* App Version Info */}
                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700/60 text-center space-y-1">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold">
                                    <span>⚜️ Orme Comunità Capi</span>
                                    <span>·</span>
                                    <span>v1.2</span>
                                </div>
                                <p className="text-[11px] text-gray-400">
                                    Sviluppato con passione per lo scautismo
                                </p>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen pb-20 animate-in fade-in duration-300">
            {/* ========================================================================= */}
            {/* DESKTOP VIEW (>= md): Windows 11 Settings Style Two-Pane Layout */}
            {/* ========================================================================= */}
            <div className="hidden md:grid md:grid-cols-12 gap-6 items-start">
                {/* Left Sidebar (3 or 4 cols) */}
                <div className="col-span-4 lg:col-span-3 space-y-4 sticky top-4">
                    {/* Header with Title & Back */}
                    <div className="flex items-center gap-2.5 px-1">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer text-gray-600 dark:text-gray-300"
                            title="Torna indietro"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <h1 className="text-xl font-black text-gray-900 dark:text-white">Impostazioni</h1>
                    </div>

                    {/* User Profile Mini Banner */}
                    {user && (
                        <div 
                            onClick={() => setActiveTab('account')}
                            className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-700/80 shadow-xs hover:border-scout-green/50 transition-colors cursor-pointer group"
                        >
                            <div className="w-10 h-10 rounded-full bg-scout-green/10 flex items-center justify-center font-black text-scout-green text-sm overflow-hidden shrink-0 border border-scout-green/20">
                                {user.profilePicture
                                    ? <img src={user.profilePicture} className="w-full h-full object-cover" alt={user.nickname} />
                                    : user.nickname?.charAt(0) || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-xs text-gray-900 dark:text-white truncate group-hover:text-scout-green transition-colors">
                                    {user.firstName} {user.lastName}
                                </p>
                                <p className="text-[10px] text-gray-400 font-semibold truncate">@{user.nickname}</p>
                            </div>
                        </div>
                    )}

                    {/* Search Input (Windows 11 "Trova un'impostazione") */}
                    <div className="relative">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Trova un'impostazione..."
                            className="w-full pl-9 pr-8 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:ring-2 focus:ring-scout-green shadow-2xs"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Navigation Item List */}
                    <nav className="space-y-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-700/80 p-2 shadow-xs overflow-hidden">
                        {filteredCategories.length === 0 ? (
                            <div className="p-4 text-center text-xs text-gray-400">
                                Nessuna impostazione trovata
                            </div>
                        ) : (
                            filteredCategories.map(cat => {
                                const isActive = activeTab === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => {
                                            setActiveTab(cat.id);
                                            // auto-scroll smoothly on top of content pane
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs transition-all relative cursor-pointer",
                                            isActive
                                                ? "bg-scout-green/10 text-emerald-900 dark:text-emerald-300 font-black shadow-2xs"
                                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 font-bold"
                                        )}
                                    >
                                        {/* Windows 11 style vertical indicator pill */}
                                        {isActive && (
                                            <span className="absolute left-0 top-2 bottom-2 w-1 bg-scout-green rounded-r-md" />
                                        )}
                                        <div className={cn(
                                            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                                            isActive ? "bg-scout-green text-white shadow-2xs" : `${cat.iconBg} ${cat.iconColor}`
                                        )}>
                                            <cat.icon size={15} />
                                        </div>
                                        <span className="truncate flex-1">{cat.label}</span>
                                    </button>
                                );
                            })
                        )}
                    </nav>
                </div>

                {/* Right Content Pane (8 or 9 cols) */}
                <div className="col-span-8 lg:col-span-9 space-y-4">
                    {/* Breadcrumb & Section Header */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                            <span>Impostazioni</span>
                            <ChevronRight size={13} className="text-gray-300 dark:text-gray-600" />
                            <span className="text-scout-green font-bold">{currentCategory.label}</span>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                            {currentCategory.label}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {currentCategory.description}
                        </p>
                    </div>

                    {/* Section Body */}
                    {renderSectionContent(activeTab)}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* MOBILE VIEW (< md): iOS Settings Style Grouped Drill-Down Layout */}
            {/* ========================================================================= */}
            <div className="block md:hidden">
                {activeTabMobile === null ? (
                    // ─── Level 1: Root iOS-Style Menu List ────────────────────────────
                    <div className="space-y-5">
                        {/* Top App Header */}
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => navigate(-1)}
                                    className="p-1.5 -ml-1 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <h1 className="text-2xl font-black text-gray-900 dark:text-white">Impostazioni</h1>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="relative">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Cerca impostazioni..."
                                className="w-full pl-9 pr-8 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:ring-2 focus:ring-scout-green"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* iOS Profile Banner Card */}
                        {user && (
                            <div
                                onClick={() => navigate('/profile')}
                                className="flex items-center gap-3.5 bg-white dark:bg-gray-800 p-3.5 rounded-2xl border border-gray-150 dark:border-gray-700/80 shadow-xs cursor-pointer active:scale-[0.99] transition-transform"
                            >
                                <div className="w-12 h-12 rounded-full bg-scout-green/10 flex items-center justify-center font-black text-scout-green text-base overflow-hidden shrink-0 border-2 border-scout-green/30">
                                    {user.profilePicture
                                        ? <img src={user.profilePicture} className="w-full h-full object-cover" alt={user.nickname} />
                                        : user.nickname?.charAt(0) || 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                                        {user.firstName} {user.lastName}
                                    </p>
                                    <p className="text-xs text-gray-400 truncate font-medium">
                                        @{user.nickname} {user.groupName ? `· ${user.groupName}` : ''}
                                    </p>
                                </div>
                                <ChevronRight size={18} className="text-gray-300 dark:text-gray-600 shrink-0" />
                            </div>
                        )}

                        {/* Grouped Table View (iOS Style) */}
                        <div className="space-y-4">
                            {/* Group 1: Organizzazione & Gruppo */}
                            <div className="space-y-1.5">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-3">
                                    Gruppo & Comunità Capi
                                </p>
                                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-700/80 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/50 shadow-xs">
                                    <div
                                        onClick={() => setActiveTabMobile('gruppo')}
                                        className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                            <Users size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">Gruppo Scout & CoCa</p>
                                            <p className="text-[11px] text-gray-400 truncate">{user?.groupName || 'Nessun gruppo associato'}</p>
                                        </div>
                                        <ChevronRight size={18} className="text-gray-300 dark:text-gray-600 shrink-0" />
                                    </div>

                                    <div
                                        onClick={() => setShowShareModal(true)}
                                        className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                            <Share2 size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">Invita Capi Scout su Orme</p>
                                            <p className="text-[11px] text-gray-400">Condividi l'applicazione</p>
                                        </div>
                                        <ChevronRight size={18} className="text-gray-300 dark:text-gray-600 shrink-0" />
                                    </div>
                                </div>
                            </div>

                            {/* Group 2: Preferenze & Sistema */}
                            <div className="space-y-1.5">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-3">
                                    Preferenze & Sistema
                                </p>
                                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-700/80 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/50 shadow-xs">
                                    <div
                                        onClick={() => setActiveTabMobile('notifiche')}
                                        className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                            <Bell size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">Notifiche & Avvisi</p>
                                            <p className="text-[11px] text-gray-400">Canali per tipologia e tono audio</p>
                                        </div>
                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mr-1">
                                            {notifiche ? 'Attive' : 'Silenziate'}
                                        </span>
                                        <ChevronRight size={18} className="text-gray-300 dark:text-gray-600 shrink-0" />
                                    </div>

                                    <div
                                        onClick={() => setActiveTabMobile('aspetto')}
                                        className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">Aspetto & Dispositivi</p>
                                            <p className="text-[11px] text-gray-400">Tema scuro e vista smartwatch</p>
                                        </div>
                                        <span className="text-xs font-bold text-gray-400 mr-1">
                                            {theme === 'dark' ? 'Scuro' : 'Chiaro'}
                                        </span>
                                        <ChevronRight size={18} className="text-gray-300 dark:text-gray-600 shrink-0" />
                                    </div>

                                    <div
                                        onClick={() => setActiveTabMobile('dati')}
                                        className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                            <Download size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">Dati & Backup</p>
                                            <p className="text-[11px] text-gray-400">Download Excel ed estrazione programmata</p>
                                        </div>
                                        <ChevronRight size={18} className="text-gray-300 dark:text-gray-600 shrink-0" />
                                    </div>
                                </div>
                            </div>

                            {/* Group 3: Account & Supporto */}
                            <div className="space-y-1.5">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-3">
                                    Account & Supporto
                                </p>
                                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-700/80 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/50 shadow-xs">
                                    <div
                                        onClick={() => setActiveTabMobile('account')}
                                        className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                            <Shield size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">Account & Privacy</p>
                                            <p className="text-[11px] text-gray-400">Modifica profilo e gestione dati</p>
                                        </div>
                                        <ChevronRight size={18} className="text-gray-300 dark:text-gray-600 shrink-0" />
                                    </div>

                                    <div
                                        onClick={() => setActiveTabMobile('assistenza')}
                                        className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                                            <HelpCircle size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">Assistenza & Feedback</p>
                                            <p className="text-[11px] text-gray-400">Segnala problema e info versione</p>
                                        </div>
                                        <ChevronRight size={18} className="text-gray-300 dark:text-gray-600 shrink-0" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* App footer note */}
                        <p className="text-center text-[11px] font-medium text-gray-400 dark:text-gray-500 pt-2">
                            Orme App · v1.2
                        </p>
                    </div>
                ) : (
                    // ─── Level 2: Mobile Detail Screen (iOS Navigation Drill-Down) ───
                    <div className="space-y-4 animate-in slide-in-from-right-3 duration-250">
                        {/* iOS Sticky-Style Back Bar */}
                        <div className="flex items-center gap-1.5 -ml-2 pb-1">
                            <button
                                type="button"
                                onClick={() => setActiveTabMobile(null)}
                                className="flex items-center gap-1 px-2 py-1.5 text-scout-green font-bold text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
                            >
                                <ChevronLeft size={20} />
                                <span>Impostazioni</span>
                            </button>
                        </div>

                        <div className="space-y-1 px-1">
                            <h2 className="text-xl font-black text-gray-900 dark:text-white">
                                {SETTINGS_CATEGORIES.find(c => c.id === activeTabMobile)?.label}
                            </h2>
                            <p className="text-xs text-gray-400">
                                {SETTINGS_CATEGORIES.find(c => c.id === activeTabMobile)?.description}
                            </p>
                        </div>

                        {/* Render active section content */}
                        {renderSectionContent(activeTabMobile)}
                    </div>
                )}
            </div>

            {/* Delete Confirm Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm p-6 space-y-5 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="text-center space-y-2">
                            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                                <Trash2 size={24} className="text-red-500" />
                            </div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white">Elimina Account</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                Questa azione è <strong>irreversibile</strong>. Il tuo profilo verrà cancellato definitivamente.
                            </p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-2xl p-4 space-y-3">
                            <p className="text-xs font-bold text-red-600 dark:text-red-400">Per confermare scrivi <span className="font-mono bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 rounded">ELIMINA</span></p>
                            <input
                                type="text"
                                value={deleteText}
                                onChange={e => setDeleteText(e.target.value)}
                                placeholder="ELIMINA"
                                className="w-full p-3 border border-red-200 dark:border-red-800/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-400 dark:bg-gray-900 dark:text-white font-mono tracking-widest text-center"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setShowDeleteConfirm(false); setDeleteText(''); }} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold text-sm text-gray-700 dark:text-gray-300">
                                Annulla
                            </button>
                            <button
                                disabled={deleteText !== 'ELIMINA' || deleting}
                                onClick={async () => {
                                    setDeleting(true);
                                    try { await deleteUserProfile(); window.location.href = '/login'; }
                                    catch (e: any) { alert('Errore: ' + e.message); setDeleting(false); }
                                }}
                                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {deleting ? 'Eliminazione...' : 'Elimina'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Share App Modal */}
            <ShareAppModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                inviterName={user ? `${user.firstName} ${user.lastName}` : undefined}
                inviterGroup={user?.groupName}
            />

            {/* Report Problem Modal */}
            <ReportProblemModal
                isOpen={showReportModal}
                onClose={() => setShowReportModal(false)}
                currentUser={user}
            />
        </div>
    );
}
