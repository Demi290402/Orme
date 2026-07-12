import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Sun, Moon, Bell, BellOff, User, Trash2,
    Download, RefreshCw, FolderOpen, Check,
    Shield, ChevronRight, MapPin, FileText, Users, BarChart2,
    Archive, Trophy, Zap, Bus, Clock
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { getUser, deleteUserProfile } from '@/lib/data';
import { cn } from '@/lib/utils';
import { User as UserType } from '@/types';
import { playNotificationSound } from '@/lib/notifications';

// ─── Types ───────────────────────────────────────────
type Cadenza = 'giornaliera' | 'settimanale' | 'mensile' | 'trimestrale' | 'semestrale' | 'annuale';

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

const NOTIFICATION_TYPES = [
    { key: 'aggiornamento_luoghi', label: 'Aggiornamento luoghi', description: 'Quando qualcuno apporta modifiche a un luogo censito' },
    { key: 'lista_attesa', label: 'Aggiornamenti lista di attesa', description: 'Notifiche per nuovi inserimenti o modifiche in lista d\'attesa' },
    { key: 'verbali', label: 'Nuovi verbali', description: 'Quando viene aggiunto un nuovo verbale alla CoCa' },
];

// ─── Toggle Component ─────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!value)}
            className={cn(
                'relative w-12 h-6 rounded-full transition-all duration-300 shrink-0',
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

// ─── Section Component ────────────────────────────────
function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 px-1 mb-2">{title}</p>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden divide-y divide-gray-50 dark:divide-gray-700/50">
                {children}
            </div>
        </div>
    );
}

// ─── Row Component ────────────────────────────────────
function SettingsRow({
    icon: Icon, label, subtitle, right, onClick, color = 'text-scout-green', danger = false
}: {
    icon: React.ElementType; label: string; subtitle?: string;
    right?: React.ReactNode; onClick?: () => void; color?: string; danger?: boolean;
}) {
    return (
        <div
            className={cn(
                'flex items-center gap-4 px-4 py-3.5 transition-colors',
                onClick && 'cursor-pointer',
                danger ? 'hover:bg-red-50 dark:hover:bg-red-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
            )}
            onClick={onClick}
        >
            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                danger ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-50 dark:bg-gray-700'
            )}>
                <Icon size={16} className={danger ? 'text-red-500' : color} />
            </div>
            <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-bold', danger ? 'text-red-500' : 'text-gray-900 dark:text-white')}>{label}</p>
                {subtitle && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">{subtitle}</p>}
            </div>
            {right && <div className="shrink-0">{right}</div>}
            {onClick && !right && <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 shrink-0" />}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────
export default function Settings() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [user, setUser] = useState<UserType | null>(null);

    // Notification settings
    const [notifiche, setNotifiche] = useState(true);
    const [suonoNotifica, setSuonoNotifica] = useState('default');
    const [notifTypes, setNotifTypes] = useState<Record<string, boolean>>({
        aggiornamento_luoghi: true, lista_attesa: true, verbali: true
    });

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


    // Delete account
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteText, setDeleteText] = useState('');
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        getUser().then(setUser).catch(console.error);
        // Load saved preferences
        const saved = localStorage.getItem('orme_settings');
        if (saved) {
            try {
                const prefs = JSON.parse(saved);
                if (prefs.notifiche !== undefined) setNotifiche(prefs.notifiche);
                if (prefs.suonoNotifica) setSuonoNotifica(prefs.suonoNotifica);
                if (prefs.notifTypes) setNotifTypes(prefs.notifTypes);
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
            // User cancelled or API not supported
            setExportPath('Download del browser');
            savePrefs({ exportPath: 'Download del browser' });
        }
    };

    const [isDownloading, setIsDownloading] = useState(false);

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
                dataBundle.classifica = users.sort((a, b) => b.points - a.points);
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

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <ChevronLeft size={24} className="dark:text-white" />
                </button>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white">Impostazioni</h1>
            </div>

            {/* User Mini Card */}
            {user && (
                <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <div className="w-12 h-12 rounded-full bg-scout-green/10 flex items-center justify-center font-black text-scout-green text-lg overflow-hidden shrink-0">
                        {user.profilePicture
                            ? <img src={user.profilePicture} className="w-full h-full object-cover" alt={user.nickname} />
                            : user.nickname?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-black text-gray-900 dark:text-white truncate">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-gray-400 font-bold">@{user.nickname}</p>
                    </div>
                    <button onClick={() => navigate('/profile')} className="text-scout-blue font-black text-xs bg-scout-blue/10 px-3 py-1.5 rounded-xl">
                        Profilo →
                    </button>
                </div>
            )}

            {/* ASPETTO */}
            <SettingsSection title="Aspetto">
                <SettingsRow
                    icon={theme === 'dark' ? Moon : Sun}
                    label="Modalità visiva"
                    subtitle={theme === 'dark' ? 'Modalità scura attiva' : 'Modalità chiara attiva'}
                    color={theme === 'dark' ? 'text-indigo-500' : 'text-amber-500'}
                    right={<Toggle value={theme === 'dark'} onChange={toggleTheme} />}
                />
            </SettingsSection>

            {/* PROFILO */}
            <SettingsSection title="Profilo">
                <SettingsRow
                    icon={User}
                    label="Modifica Profilo"
                    subtitle="Nome, totem, gruppo, foto"
                    color="text-scout-blue"
                    onClick={() => navigate('/profile')}
                />
            </SettingsSection>

            {/* NOTIFICHE */}
            <SettingsSection title="Notifiche">
                <SettingsRow
                    icon={notifiche ? Bell : BellOff}
                    label="Notifiche Push"
                    subtitle={notifiche ? 'Le notifiche sono attive' : 'Le notifiche sono disattivate'}
                    color="text-purple-500"
                    right={<Toggle value={notifiche} onChange={v => {
                        setNotifiche(v);
                        savePrefs({ notifiche: v });
                        if (v && 'Notification' in window) {
                            Notification.requestPermission().then(permission => {
                                if (permission !== 'granted') {
                                    alert('Per ricevere le notifiche push reali, abilita i permessi di notifica del browser.');
                                }
                            });
                        }
                    }} />}
                />
                {notifiche && (
                    <div className="px-4 py-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/30">
                        <div className="space-y-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipi di notifica</p>
                            {NOTIFICATION_TYPES.map(n => (
                                <div key={n.key} className="flex items-center justify-between gap-3">
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{n.label}</p>
                                        <p className="text-[10px] text-gray-400">{n.description}</p>
                                    </div>
                                    <Toggle
                                        value={notifTypes[n.key] ?? false}
                                        onChange={v => {
                                            const updated = { ...notifTypes, [n.key]: v };
                                            setNotifTypes(updated);
                                            savePrefs({ notifTypes: updated });
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-gray-800/40">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Suono di notifica</p>
                            <div className="flex gap-2">
                                <select
                                    value={suonoNotifica}
                                    onChange={e => {
                                        setSuonoNotifica(e.target.value);
                                        savePrefs({ suonoNotifica: e.target.value });
                                    }}
                                    className="flex-1 px-3 py-2 rounded-xl border border-gray-205 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs font-bold text-gray-850 dark:text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
                                >
                                    <option value="default">Default Beep</option>
                                    <option value="scout_horn">Corno Scout (Bitonale)</option>
                                    <option value="campfire">Fuoco da Campo (Crepitio)</option>
                                    <option value="nature_birds">Canto degli Uccelli</option>
                                    <option value="guitar_chord">Accordo di Chitarra</option>
                                </select>
                                <button
                                    onClick={() => playNotificationSound(suonoNotifica)}
                                    type="button"
                                    className="bg-purple-100 dark:bg-purple-900/30 text-purple-650 dark:text-purple-400 px-4 py-2 rounded-xl text-xs font-black hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors active:scale-95 shrink-0"
                                >
                                    Prova
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </SettingsSection>

            {/* ESTRAZIONE DATI MANUALE */}
            <SettingsSection title="Estrai Dati">
                <div className="px-4 py-4 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center shrink-0">
                            <Download size={16} className="text-scout-blue" />
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">Download Dati</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">Scegli cosa vuoi scaricare in formato Excel (XLSX)</p>
                            </div>
                            <div className="flex gap-2 text-[10px] font-black text-scout-blue shrink-0">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const allTrue = Object.keys(exportOptions).reduce((acc, k) => ({ ...acc, [k]: true }), {});
                                        setExportOptions(allTrue);
                                    }}
                                    className="hover:underline"
                                >
                                    Seleziona Tutto
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const allFalse = Object.keys(exportOptions).reduce((acc, k) => ({ ...acc, [k]: false }), {});
                                        setExportOptions(allFalse);
                                    }}
                                    className="hover:underline"
                                >
                                    Deseleziona
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {DOWNLOAD_OPTIONS.map(opt => (
                            <button
                                key={opt.key}
                                type="button"
                                onClick={() => setExportOptions(prev => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                                className={cn(
                                    'flex items-center gap-2 p-3 rounded-xl border-2 text-xs font-bold transition-all text-left',
                                    exportOptions[opt.key]
                                        ? 'border-scout-green bg-scout-green/5 dark:bg-scout-green/10 text-gray-900 dark:text-white'
                                        : 'border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500'
                                )}
                            >
                                <opt.icon size={14} className={exportOptions[opt.key] ? opt.color : 'text-gray-300 dark:text-gray-600'} />
                                {opt.label}
                                {exportOptions[opt.key] && <Check size={12} className="ml-auto text-scout-green shrink-0" />}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        disabled={!Object.values(exportOptions).some(Boolean) || isDownloading}
                        onClick={handleManualDownload}
                        className="w-full bg-scout-blue text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                    >
                        <Download size={18} />
                        {isDownloading ? 'Generazione...' : 'Scarica Dati Selezionati'}
                    </button>
                </div>
            </SettingsSection>

            {/* ESTRAZIONE AUTOMATICA */}
            <SettingsSection title="Estrazione Automatica">
                <SettingsRow
                    icon={Zap}
                    label="Estrazione Automatica"
                    subtitle={autoExport ? 'Attiva (cadenze indipendenti)' : 'Disattivata'}
                    color="text-emerald-500"
                    right={
                        <div className="flex items-center gap-2">
                            <Toggle value={autoExport} onChange={v => {
                                setAutoExport(v);
                                setShowAutoExport(v);
                                savePrefs({ autoExport: v });
                            }} />
                            {autoExport && (
                                <button onClick={() => setShowAutoExport(p => !p)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" type="button">
                                    <ChevronRight size={14} className={cn('text-gray-400 transition-transform', showAutoExport && 'rotate-90')} />
                                </button>
                            )}
                        </div>
                    }
                />

                {autoExport && showAutoExport && (
                    <div className="px-4 py-4 space-y-5 bg-gray-50/50 dark:bg-gray-900/30 animate-in slide-in-from-top-2 duration-200">

                        {/* Cartella di destinazione */}
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                Cartella Destinazione <span className="text-red-400">*</span>
                            </p>
                            <button
                                onClick={handlePickFolder}
                                className={cn(
                                    'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-sm font-bold transition-all text-left',
                                    exportPath
                                        ? 'border-scout-green bg-scout-green/5 dark:bg-scout-green/10 text-gray-900 dark:text-white'
                                        : 'border-dashed border-gray-200 dark:border-gray-700 text-gray-400'
                                )}
                                type="button"
                            >
                                <FolderOpen size={16} className={exportPath ? 'text-scout-green' : 'text-gray-300'} />
                                <span className="flex-1 truncate">{exportPath || 'Scegli cartella di destinazione...'}</span>
                                {exportPath && <Check size={14} className="text-scout-green shrink-0" />}
                            </button>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-normal">
                                La cartella deve essere selezionata tramite il browser. Se non disponibile, i file saranno salvati nella cartella Download.
                            </p>
                        </div>

                        {/* Cadenze Indipendenti per Ciascuna Opzione */}
                        <div className="space-y-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Programmazione Risorse</p>
                            <div className="space-y-2">
                                {EXPORT_OPTIONS.map(opt => {
                                    const config = autoExportConfigs[opt.key] || { enabled: false, cadenza: 'mensile', fileName: opt.label };
                                    return (
                                        <div key={opt.key} className="bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <opt.icon size={15} className={opt.color} />
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
                                            
                                            <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-50 dark:border-gray-800/40">
                                                <span className={cn("text-[10px] font-semibold transition-colors", config.enabled ? "text-gray-500 dark:text-gray-400" : "text-gray-300 dark:text-gray-600")}>Frequenza:</span>
                                                <select
                                                    disabled={!config.enabled}
                                                    value={config.cadenza}
                                                    onChange={e => {
                                                        const updated = {
                                                            ...autoExportConfigs,
                                                            [opt.key]: { ...config, cadenza: e.target.value as Cadenza }
                                                        };
                                                        setAutoExportConfigs(updated);
                                                        savePrefs({ autoExportConfigs: updated });
                                                    }}
                                                    className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-[10px] font-bold text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-scout-green disabled:opacity-50 transition-all"
                                                >
                                                    {CADENZE.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                                </select>
                                            </div>

                                            {config.enabled && (
                                                <div className="space-y-1 pt-2 border-t border-gray-50 dark:border-gray-800/40">
                                                    <span className="text-[10px] font-semibold text-gray-550 dark:text-gray-400">Prefisso Nome File:</span>
                                                    <input
                                                        type="text"
                                                        value={config.fileName || ''}
                                                        onChange={e => {
                                                            const updated = {
                                                                ...autoExportConfigs,
                                                                [opt.key]: { ...config, fileName: e.target.value }
                                                            };
                                                            setAutoExportConfigs(updated);
                                                            savePrefs({ autoExportConfigs: updated });
                                                        }}
                                                        placeholder="es. lista_attesa"
                                                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-[10px] font-bold text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-scout-green"
                                                    />
                                                </div>
                                            )}

                                            {config.enabled && (
                                                <div className="flex items-center justify-between text-[9px] text-gray-450 dark:text-gray-400 pt-1.5 border-t border-gray-50 dark:border-gray-800/40">
                                                    <span>Ultimo export:</span>
                                                    <span className="font-bold">
                                                        {(() => {
                                                            const ts = localStorage.getItem(`orme_last_export_${opt.key}`);
                                                            if (!ts) return 'Mai';
                                                            const d = new Date(Number(ts));
                                                            return d.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
                                                        })()}
                                                    </span>
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
                                    await checkAndRunAutoExport(true); // force run immediately
                                }
                            }}
                            className="w-full bg-scout-green text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 text-sm active:scale-95 transition-all shadow-md"
                            type="button"
                        >
                            <RefreshCw size={16} />
                            Salva Configurazione
                        </button>
                    </div>
                )}
            </SettingsSection>

            {/* ACCOUNT */}
            <SettingsSection title="Account">
                <SettingsRow
                    icon={Shield}
                    label="Privacy & Dati"
                    subtitle="Gestisci i tuoi dati personali"
                    color="text-gray-500"
                    onClick={() => navigate('/privacy')}
                />
                <SettingsRow
                    icon={Trash2}
                    label="Elimina Account"
                    subtitle="Azione irreversibile"
                    danger
                    onClick={() => setShowDeleteConfirm(true)}
                />
            </SettingsSection>

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

            {/* Version */}
            <p className="text-center text-[10px] font-bold text-gray-300 dark:text-gray-600 uppercase tracking-widest py-4">
                Orme App · v1.0
            </p>
        </div>
    );
}
