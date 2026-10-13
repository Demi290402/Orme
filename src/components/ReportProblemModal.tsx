import { useState, useId } from 'react';
import { 
    AlertCircle, Eye, Sparkles, MessageSquare, X, Send, 
    CheckCircle2, Loader2, Monitor, ChevronDown, ChevronUp, Mail, ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { User as UserType } from '@/types';
import { sendIssueReportNotification, buildReportMailtoUrl } from '@/lib/emailNotification';

interface ReportProblemModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser?: UserType | null;
}

const CATEGORIES = [
    {
        id: 'bug',
        label: 'Errore / Malfunzionamento',
        desc: 'Un pulsante non risponde, schermata bianca o dati non salvati',
        icon: AlertCircle,
        badgeColor: 'text-red-500 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50'
    },
    {
        id: 'visivo_ux',
        label: 'Difficoltà Visiva / Schermo',
        desc: 'Testo tagliato, caratteri piccoli o navigazione poco chiara',
        icon: Eye,
        badgeColor: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50'
    },
    {
        id: 'suggerimento',
        label: 'Suggerimento o Idea',
        desc: 'Una funzione che vorresti o un miglioramento per la CoCa',
        icon: Sparkles,
        badgeColor: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50'
    },
    {
        id: 'altro',
        label: 'Altra Segnalazione',
        desc: 'Domanda generale o problema con l\'account',
        icon: MessageSquare,
        badgeColor: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/50'
    }
];

function detectDeviceInfo() {
    if (typeof window === 'undefined') return undefined;
    const ua = navigator.userAgent;

    let browser = 'Browser sconosciuto';
    if (ua.includes('Firefox')) browser = 'Mozilla Firefox';
    else if (ua.includes('SamsungBrowser')) browser = 'Samsung Internet';
    else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
    else if (ua.includes('Edg')) browser = 'Microsoft Edge';
    else if (ua.includes('Chrome')) browser = 'Google Chrome';
    else if (ua.includes('Safari')) browser = 'Apple Safari';

    let os = 'OS sconosciuto';
    if (ua.includes('Win')) os = 'Windows';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iPod')) os = 'iOS (Apple)';
    else if (ua.includes('Mac')) os = 'macOS (Apple)';
    else if (ua.includes('Linux')) os = 'Linux';

    return {
        browser,
        os,
        screenSize: `${window.innerWidth}x${window.innerHeight}px (schermo: ${window.screen?.width || '?'}x${window.screen?.height || '?'})`,
        currentUrl: window.location.pathname + window.location.search,
        userAgent: ua
    };
}

export default function ReportProblemModal({ isOpen, onClose, currentUser }: ReportProblemModalProps) {
    const titleId = useId();
    const [category, setCategory] = useState<'bug' | 'visivo_ux' | 'suggerimento' | 'altro'>('bug');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [reporterName, setReporterName] = useState(
        currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.nickname || '' : ''
    );
    const [reporterEmail, setReporterEmail] = useState(currentUser?.email || '');
    const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
    const [showDiagDetails, setShowDiagDetails] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    if (!isOpen) return null;

    const deviceInfo = detectDeviceInfo();

    const handleReset = () => {
        setTitle('');
        setDescription('');
        setSubmitSuccess(false);
        setSubmitError(null);
        setIsSubmitting(false);
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !description.trim()) {
            setSubmitError('Per favore compila il titolo e la descrizione del problema.');
            return;
        }

        if (!reporterEmail.trim() || !reporterEmail.includes('@')) {
            setSubmitError('Inserisci un indirizzo email valido per consentirci di risponderti.');
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        const categoryLabel = CATEGORIES.find(c => c.id === category)?.label || category;

        const result = await sendIssueReportNotification({
            userId: currentUser?.id,
            reporterName: reporterName.trim() || 'Capo Scout',
            reporterEmail: reporterEmail.trim(),
            reporterGroup: currentUser?.groupName,
            reporterRole: currentUser?.groupRole,
            category: categoryLabel,
            title: title.trim(),
            description: description.trim(),
            deviceInfo: includeDiagnostics ? deviceInfo : undefined
        });

        setIsSubmitting(false);

        if (result.success) {
            setSubmitSuccess(true);
        } else {
            setSubmitError(result.error || 'Impossibile inviare la segnalazione automatica. Puoi comunque inviarla cliccando sul link di posta in basso.');
        }
    };

    const mailtoFallbackUrl = buildReportMailtoUrl({
        category: CATEGORIES.find(c => c.id === category)?.label || category,
        title: title || 'Segnalazione da Orme',
        description: description || 'Descrizione non inserita',
        reporterName,
        reporterGroup: currentUser?.groupName,
        deviceInfo: includeDiagnostics ? deviceInfo : undefined
    });

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200" onClick={handleReset}>
            <div
                className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg p-5 sm:p-6 space-y-5 shadow-2xl border border-gray-150 dark:border-gray-800 max-h-[92vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-900/60 shadow-xs">
                            <ShieldAlert size={24} />
                        </div>
                        <div>
                            <h2 id={titleId} className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                                Segnala un Problema
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Invia una segnalazione a <span className="font-semibold text-scout-green">appormescout@gmail.com</span>
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleReset}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {submitSuccess ? (
                    /* Stato di Successo */
                    <div className="py-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
                            <CheckCircle2 size={36} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white">Segnalazione Inviata!</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
                                Grazie per l'aiuto. Abbiamo inoltrato tutti i dettagli a <strong>appormescout@gmail.com</strong>.
                            </p>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-3.5 max-w-sm mx-auto text-left">
                            <p className="text-xs text-emerald-900 dark:text-emerald-200 font-medium">
                                ✉️ Ti risponderemo direttamente all'indirizzo: <strong className="font-bold underline">{reporterEmail}</strong>
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="w-full max-w-xs py-3 px-6 bg-scout-green hover:bg-scout-green/90 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer mx-auto"
                        >
                            Chiudi
                        </button>
                    </div>
                ) : (
                    /* Form di Segnalazione */
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Spiegazione amichevole per tutti gli utenti */}
                        <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/40 rounded-2xl p-3 text-xs text-blue-900 dark:text-blue-200/90 leading-relaxed">
                            💡 Hai trovato un malfunzionamento, una scritta poco chiara o hai un'idea per facilitare il lavoro della tua Comunità Capi? Scrivici e ti daremo una mano!
                        </div>

                        {/* Scelta Categoria */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Tipo di Segnalazione
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {CATEGORIES.map(cat => {
                                    const Icon = cat.icon;
                                    const isSelected = category === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setCategory(cat.id as any)}
                                            className={cn(
                                                "p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer",
                                                isSelected 
                                                    ? "border-scout-green bg-scout-green/5 dark:bg-scout-green/10 shadow-xs ring-1 ring-scout-green" 
                                                    : "border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <Icon size={15} className={isSelected ? "text-scout-green" : "text-gray-400"} />
                                                <span className={cn("text-xs font-bold truncate", isSelected ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300")}>
                                                    {cat.label}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-gray-400 line-clamp-2 leading-tight">
                                                {cat.desc}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Oggetto / Titolo */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Sintesi del Problema <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="es. Impossibile salvare la presenza al verbale"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-scout-green placeholder:font-normal placeholder:text-gray-400"
                                required
                            />
                        </div>

                        {/* Descrizione Dettagliata */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Descrizione Dettagliata <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={4}
                                placeholder="Descrivi cosa stavi facendo, quale tasto hai premuto o cosa non ha funzionato come ti aspettavi..."
                                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-scout-green placeholder:font-normal placeholder:text-gray-400 resize-none leading-relaxed"
                                required
                            />
                        </div>

                        {/* Dati di Contatto del Segnalatore */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                    Il tuo Nome
                                </label>
                                <input
                                    type="text"
                                    value={reporterName}
                                    onChange={e => setReporterName(e.target.value)}
                                    placeholder="Nome e Cognome"
                                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-scout-green"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                    Tua Email di Risposta <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={reporterEmail}
                                    onChange={e => setReporterEmail(e.target.value)}
                                    placeholder="nome@email.it"
                                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-scout-green"
                                    required
                                />
                            </div>
                        </div>

                        {/* Dati Diagnostici del Dispositivo (Trasparenza Totale) */}
                        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-3 border border-gray-200/70 dark:border-gray-800 space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={includeDiagnostics}
                                        onChange={e => setIncludeDiagnostics(e.target.checked)}
                                        className="rounded text-scout-green focus:ring-scout-green accent-scout-green w-4 h-4 cursor-pointer"
                                    />
                                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                                        <Monitor size={14} className="text-scout-green shrink-0" />
                                        Includi dati tecnici sul dispositivo
                                    </span>
                                </label>
                                {includeDiagnostics && deviceInfo && (
                                    <button
                                        type="button"
                                        onClick={() => setShowDiagDetails(!showDiagDetails)}
                                        className="text-[10px] font-bold text-scout-green hover:underline flex items-center gap-0.5"
                                    >
                                        {showDiagDetails ? 'Nascondi' : 'Dettagli'}
                                        {showDiagDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    </button>
                                )}
                            </div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-normal pl-6">
                                Aiuta il team a capire su quale modello di smartphone o browser si verifica il problema. Non include password o dati personali.
                            </p>

                            {includeDiagnostics && showDiagDetails && deviceInfo && (
                                <div className="mt-2 p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[10px] space-y-1 font-mono text-gray-600 dark:text-gray-300 animate-in fade-in duration-150">
                                    <div><strong>OS:</strong> {deviceInfo.os}</div>
                                    <div><strong>Browser:</strong> {deviceInfo.browser}</div>
                                    <div><strong>Schermo:</strong> {deviceInfo.screenSize}</div>
                                    <div><strong>Schermata:</strong> {deviceInfo.currentUrl}</div>
                                </div>
                            )}
                        </div>

                        {/* Messaggio di Errore se presente */}
                        {submitError && (
                            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl p-3 text-xs text-red-600 dark:text-red-400 leading-tight">
                                {submitError}
                            </div>
                        )}

                        {/* Azioni */}
                        <div className="pt-2 space-y-2">
                            <button
                                type="submit"
                                disabled={isSubmitting || !title.trim() || !description.trim()}
                                className="w-full py-3 px-4 bg-scout-green hover:bg-scout-green/90 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-98"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Invio in corso...
                                    </>
                                ) : (
                                    <>
                                        <Send size={15} />
                                        Invia Segnalazione a appormescout@gmail.com
                                    </>
                                )}
                            </button>

                            {/* Fallback Diretto Mailto */}
                            <div className="text-center pt-1">
                                <a
                                    href={mailtoFallbackUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] font-bold text-gray-400 hover:text-scout-green dark:hover:text-emerald-400 inline-flex items-center gap-1 transition-colors"
                                >
                                    <Mail size={12} />
                                    Oppure invia tramite la tua app di posta (apri email)
                                </a>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
