import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Phone, MessageCircle, Map, ArrowLeft, BedDouble, Tent, Coffee, 
    Edit, Euro, Wrench, Ban, Star, Footprints, X, 
    Droplets, Flame, Wind, ShieldCheck, Users, 
    Globe, Mail, Copy, Check, Building, Facebook, Instagram, Truck, Eye, 
    MoreVertical, AlertTriangle, Navigation, ShieldAlert
} from 'lucide-react';
import { 
    getLocations, getUser, getReviews, saveReview, deleteLocation, 
    getLocationHistory, upsertLocationView, getUserLocationViews, recordLocationVisit 
} from '@/lib/data';
import { Location, LocationReview, LocationContact } from '@/types';
import { getStalenessInfo, cn } from '@/lib/utils';
import ReportProblemModal from '@/components/ReportProblemModal';

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

const calculateAvg = (reviews: LocationReview[], field: keyof LocationReview) => {
    const valid = reviews.filter(r => r[field] !== undefined && r[field] !== null);
    if (valid.length === 0) return 0;
    const sum = valid.reduce((acc, r) => acc + (r[field] as number), 0);
    return (sum / valid.length).toFixed(1);
};

type TriState = 'si' | 'no' | 'da_verificare';

function getTriState(val: boolean | null | undefined): TriState {
    if (val === true) return 'si';
    if (val === false) return 'no';
    return 'da_verificare';
}

function hasAttestedWhatsapp(c: LocationContact): boolean {
    return c.isWhatsapp === true || c.type === 'whatsapp';
}

function cleanPhoneForWhatsapp(num: string) {
    let clean = num.replace(/[^0-9+]/g, '');
    if (clean.startsWith('00')) clean = '+' + clean.slice(2);
    if (!clean.startsWith('+')) {
        if (clean.startsWith('3') && clean.length >= 9) {
            clean = '+39' + clean;
        }
    }
    return clean.replace('+', '');
}

// ─── SPIDER CHART COMPONENT (Only shown if reviews exist) ─────────────────────
function SpiderChart({ reviews }: { reviews: LocationReview[] }) {
    const metrics = [
        { label: 'Ombra', value: Number(calculateAvg(reviews, 'ombra')) },
        { label: 'Legna', value: Number(calculateAvg(reviews, 'legna')) },
        { label: 'Suolo', value: Number(calculateAvg(reviews, 'suolo')) },
        { label: 'Servizi', value: Number(calculateAvg(reviews, 'servizi')) },
        { label: 'Sicurezza', value: Number(calculateAvg(reviews, 'sicurezza')) },
    ];

    const size = 200;
    const center = size / 2;
    const radius = size * 0.4;
    const angleStep = (Math.PI * 2) / metrics.length;

    const points = metrics.map((m, i) => {
        const val = m.value || 0;
        const r = (radius * val) / 5;
        const x = center + r * Math.cos(i * angleStep - Math.PI / 2);
        const y = center + r * Math.sin(i * angleStep - Math.PI / 2);
        return `${x},${y}`;
    }).join(' ');

    const gridPoints = [1, 2, 3, 4, 5].map(level => {
        return metrics.map((_, i) => {
            const r = (radius * level) / 5;
            const x = center + r * Math.cos(i * angleStep - Math.PI / 2);
            const y = center + r * Math.sin(i * angleStep - Math.PI / 2);
            return `${x},${y}`;
        }).join(' ');
    });

    return (
        <div className="relative flex flex-col items-center">
            <svg width={size} height={size} className="overflow-visible">
                {gridPoints.map((gp, i) => (
                    <polygon key={i} points={gp} fill="none" stroke="currentColor" className="text-gray-200 dark:text-gray-700" strokeWidth="1" />
                ))}
                {metrics.map((_, i) => {
                    const x = center + radius * Math.cos(i * angleStep - Math.PI / 2);
                    const y = center + radius * Math.sin(i * angleStep - Math.PI / 2);
                    return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="currentColor" className="text-gray-200 dark:text-gray-700" />;
                })}
                {metrics.map((m, i) => {
                    const x = center + (radius + 20) * Math.cos(i * angleStep - Math.PI / 2);
                    const y = center + (radius + 20) * Math.sin(i * angleStep - Math.PI / 2);
                    return <text key={i} x={x} y={y} fontSize="9" fontWeight="bold" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500 uppercase">{m.label}</text>;
                })}
                {points && <polygon points={points} fill="rgba(46, 125, 50, 0.25)" stroke="#2e7d32" strokeWidth="2" />}
            </svg>
        </div>
    );
}

// ─── REVIEW MODAL COMPONENT ───────────────────────────────────────────────────
function ReviewModal({ location, onClose, onSave }: { location: Location; onClose: () => void; onSave: () => void }) {
    const censusAcqua = !location.restrictions.includes('Acqua non potabile');
    const censusFuochi = !location.restrictions.includes('Fuochi solo su braciere') && !location.restrictions.includes('No fuochi di bivacco');
    const initialPriceRating = location.priceCategory === 1 ? 4 : (location.priceCategory === 3 ? 2 : 3);

    const [rating, setRating] = useState<Partial<LocationReview>>({
        locationId: location.id,
        ombra: 3,
        legna: 3,
        suolo: 3,
        servizi: 3,
        sicurezza: 3,
        isolamento: 3,
        prezzo: initialPriceRating,
        acquaPotabile: censusAcqua,
        fuochi: censusFuochi,
        commento: ''
    });

    const categories = [
        { key: 'ombra', label: 'Ombra', icon: Wind },
        { key: 'legna', label: 'Presenza Legna', icon: Flame },
        { key: 'suolo', label: 'Suolo / Tende', icon: Tent },
        { key: 'servizi', label: 'Servizi / Logistica', icon: Droplets },
        { key: 'sicurezza', label: 'Sicurezza / Pericoli', icon: ShieldCheck },
        { key: 'isolamento', label: 'Isolamento / Privacy', icon: Users },
        { key: 'prezzo', label: 'Rapporto Qualità/Prezzo', icon: Euro },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-5 right-5 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 transition-colors" type="button">
                    <X size={20} />
                </button>

                <div className="text-center space-y-1">
                    <div className="bg-scout-blue/10 dark:bg-blue-900/30 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-2 text-scout-blue">
                        <Footprints size={28} />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white">Lascia la tua Orma</h2>
                    <p className="text-xs text-gray-500">Valuta il luogo con dati oggettivi per aiutare gli altri capi scout.</p>
                </div>

                <div className="space-y-4">
                    {categories.map((cat) => (
                        <div key={cat.key} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                                    <cat.icon size={14} className="text-scout-green" />
                                    {cat.label}
                                </label>
                                <span className="text-xs font-black text-amber-500">
                                    {(rating as any)[cat.key]} / 5
                                </span>
                            </div>
                            <input 
                                type="range" min="1" max="5" 
                                value={(rating as any)[cat.key]} 
                                onChange={(e) => setRating(prev => ({ ...prev, [cat.key]: parseInt(e.target.value) }))}
                                className="w-full accent-scout-green cursor-pointer h-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
                            />
                        </div>
                    ))}

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button 
                            type="button"
                            onClick={() => setRating(prev => ({ ...prev, acquaPotabile: !prev.acquaPotabile }))}
                            className={cn(
                                "p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer",
                                rating.acquaPotabile 
                                    ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300" 
                                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400"
                            )}
                        >
                            <Droplets size={16} />
                            {rating.acquaPotabile ? 'Acqua Potabile ✅' : 'Non Potabile ❌'}
                        </button>

                        <button 
                            type="button"
                            onClick={() => setRating(prev => ({ ...prev, fuochi: !prev.fuochi }))}
                            className={cn(
                                "p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer",
                                rating.fuochi 
                                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300" 
                                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400"
                            )}
                        >
                            <Flame size={16} />
                            {rating.fuochi ? 'Fuoco Ammesso 🔥' : 'No Fuoco 🚫'}
                        </button>
                    </div>

                    <div className="space-y-1 pt-1">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-300">Commento e consigli per altri capi</label>
                        <textarea 
                            rows={3}
                            value={rating.commento}
                            onChange={(e) => setRating(prev => ({ ...prev, commento: e.target.value }))}
                            placeholder="Racconta brevemente com'è andata l'attività, consigli pratici, disponibilità del custode..."
                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-scout-green"
                        />
                    </div>
                </div>

                <button 
                    type="button"
                    onClick={async () => {
                        await saveReview(rating as LocationReview);
                        onSave();
                    }}
                    className="w-full bg-scout-green text-white font-black py-3 rounded-xl hover:bg-emerald-700 active:scale-98 transition-all text-sm shadow-md"
                >
                    Pubblica Recensione (+10 PT)
                </button>
            </div>
        </div>
    );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function LocationDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [location, setLocation] = useState<Location | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [reviews, setReviews] = useState<LocationReview[]>([]);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [loading, setLoading] = useState(true);

    // Dialogs & Modals
    const [showContactsModal, setShowContactsModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    // Copy states
    const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
    const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

    // History and Views
    const [historyList, setHistoryList] = useState<any[]>([]);
    const [viewsCount, setViewsCount] = useState<number>(0);
    const [updaterInfo, setUpdaterInfo] = useState<{ nickname: string; groupName: string } | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const locs = await getLocations();
                const found = locs.find(l => l.id === id);
                if (found) {
                    setLocation(found);
                    setViewsCount(found.viewsCount || 0);
                    const revs = await getReviews(found.id);
                    setReviews(revs);

                    // Fetch history logs
                    const history = await getLocationHistory(found.id);
                    setHistoryList(history);

                    // Track views
                    let isFirstTime = false;
                    try {
                        const views = await getUserLocationViews();
                        isFirstTime = !views[found.id];
                    } catch (e) {
                        console.warn('Could not determine user view history:', e);
                    }

                    recordLocationVisit(found.id, isFirstTime).then(newCount => {
                        if (newCount > 0) {
                            setViewsCount(newCount);
                            setLocation(prev => prev ? { ...prev, viewsCount: newCount } : prev);
                        }
                    }).catch(console.error);

                    await upsertLocationView(found.id);
                }
                const user = await getUser();
                setCurrentUser(user);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id]);

    useEffect(() => {
        if (location?.lastUpdatedBy) {
            getUser(location.lastUpdatedBy).then(u => {
                setUpdaterInfo({ nickname: u.nickname, groupName: u.groupName || '' });
            }).catch(console.error);
        }
    }, [location]);

    // Handle Escape key to close contacts modal
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setShowContactsModal(false);
                setShowHistoryModal(false);
                setShowMenu(false);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    const handleCopyPhone = (phoneNumber: string) => {
        navigator.clipboard.writeText(phoneNumber);
        setCopiedPhone(phoneNumber);
        setTimeout(() => setCopiedPhone(null), 2000);
    };

    const handleCopyEmail = (emailStr: string) => {
        navigator.clipboard.writeText(emailStr);
        setCopiedEmail(emailStr);
        setTimeout(() => setCopiedEmail(null), 2000);
    };

    if (loading) {
        return (
            <div className="p-8 text-center text-gray-500 font-bold animate-pulse py-24 flex flex-col items-center gap-4">
                <Footprints size={44} className="text-scout-green animate-bounce" />
                <p className="text-sm">Caricamento scheda luogo...</p>
            </div>
        );
    }

    if (!location) {
        return (
            <div className="p-8 text-center max-w-md mx-auto py-24 space-y-4">
                <AlertTriangle size={48} className="text-amber-500 mx-auto" />
                <h2 className="text-xl font-black text-gray-900 dark:text-white">Luogo non trovato</h2>
                <p className="text-xs text-gray-500">La scheda richiesta potrebbe essere stata rimossa o l'indirizzo non è corretto.</p>
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="px-6 py-2.5 bg-scout-green text-white font-bold text-xs rounded-xl hover:bg-emerald-700"
                >
                    Torna alla Mappa
                </button>
            </div>
        );
    }

    // ─── DERIVED VALUES & LOGIC ──────────────────────────────────────────────
    const staleness = getStalenessInfo(location.lastUpdatedAt);
    
    // Contacts derivation
    const phoneContacts = (location.contacts || []).filter(c => 
        (c.type === 'phone' || !c.type || c.type === 'whatsapp') && c.value
    );
    const primaryPhoneContact = phoneContacts[0];

    const emailList: string[] = (location.emails && location.emails.length > 0)
        ? location.emails
        : (location.email ? location.email.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean) : []);

    const websiteUrl = location.website 
        ? (location.website.startsWith('http://') || location.website.startsWith('https://') 
            ? location.website 
            : `https://${location.website}`)
        : undefined;

    const facebookUrl = location.facebook
        ? (location.facebook.startsWith('http://') || location.facebook.startsWith('https://')
            ? location.facebook
            : (location.facebook.startsWith('facebook.com') || location.facebook.startsWith('www.facebook.com')
                ? `https://${location.facebook}`
                : `https://facebook.com/${location.facebook.replace(/^@/, '')}`))
        : undefined;

    const instagramUrl = location.instagram
        ? (location.instagram.startsWith('http://') || location.instagram.startsWith('https://')
            ? location.instagram
            : (location.instagram.startsWith('instagram.com') || location.instagram.startsWith('www.instagram.com')
                ? `https://${location.instagram}`
                : `https://instagram.com/${location.instagram.replace(/^@/, '')}`))
        : undefined;

    // Position state
    const hasCoordinates = Boolean(location.coordinates?.lat && location.coordinates?.lng);
    const hasSpecificMapLink = Boolean(location.googleMapsLink && location.googleMapsLink.trim().length > 10);
    const hasAddress = Boolean(location.address && location.address.trim().length > 3);

    const positionType: 'coordinate_precise' | 'solo_indirizzo' | 'da_richiedere' = 
        (hasCoordinates || hasSpecificMapLink) 
            ? 'coordinate_precise' 
            : (hasAddress ? 'solo_indirizzo' : 'da_richiedere');

    const handleOpenDirections = () => {
        if (hasSpecificMapLink && location.googleMapsLink) {
            window.open(location.googleMapsLink, '_blank');
        } else if (hasCoordinates && location.coordinates) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${location.coordinates.lat},${location.coordinates.lng}`, '_blank');
        } else if (hasAddress) {
            const query = encodeURIComponent(`${location.address}, ${location.commune} ${location.province || ''}`);
            window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
        } else {
            setShowContactsModal(true);
        }
    };

    // Primary contact action
    const handlePrimaryContactAction = () => {
        if (!currentUser) {
            navigate('/login');
            return;
        }
        setShowContactsModal(true);
    };

    // Attention points
    const attentionFlags = [
        location.hasPastures && 'Presenza di pascoli / fauna libera (es. cinghiali)',
        location.hasInsects && 'Presenza di insetti o zecche',
        location.hasDiseases && 'Zona soggetta a malattie endemiche o avvertenze sanitarie',
        location.hasLittleShade && 'Poca ombra naturale nel campo o sui terreni',
        location.hasVeryBusyArea && 'Area molto frequentata da turisti o pubblico',
        location.otherAttention && location.otherAttention.trim()
    ].filter(Boolean) as string[];

    const hasRulesOrAttentions = (location.restrictions && location.restrictions.length > 0) || 
        Boolean(location.otherRestrictions && location.otherRestrictions.trim()) || 
        attentionFlags.length > 0;

    // Six Essential Facts
    const facts = [
        {
            id: 'letti',
            label: 'Posti Letto',
            icon: BedDouble,
            state: location.beds !== undefined && location.beds !== null
                ? (location.beds > 0 ? 'si' : 'no')
                : 'da_verificare' as TriState,
            valueText: location.beds !== undefined && location.beds !== null
                ? (location.beds > 0 ? `${location.beds} posti letto` : 'Nessun letto fornito')
                : 'Posti letto — Da verificare',
            subText: location.accantonamentoCapacity && location.accantonamentoCapacity > 0
                ? `+${location.accantonamentoCapacity} accantonamento a terra`
                : undefined
        },
        {
            id: 'tende',
            label: 'Spazio Tende',
            icon: Tent,
            state: getTriState(location.hasTents),
            valueText: location.hasTents === true
                ? 'Tende ammesse (campo)'
                : (location.hasTents === false ? 'Tende non previste' : 'Tende — Da verificare')
        },
        {
            id: 'cucina',
            label: 'Cucina',
            icon: Coffee,
            state: getTriState(location.hasEquippedKitchen),
            valueText: location.hasEquippedKitchen === true
                ? 'Cucina attrezzata presente'
                : (location.hasEquippedKitchen === false ? 'Nessuna cucina' : 'Cucina — Da verificare')
        },
        {
            id: 'acqua',
            label: 'Punti Acqua',
            icon: Droplets,
            state: getTriState(location.hasWaterPoints),
            valueText: location.hasWaterPoints === true
                ? 'Punti acqua presenti'
                : (location.hasWaterPoints === false ? 'Punti acqua assenti' : 'Acqua — Da verificare'),
            subText: location.hasWaterPoints === true ? 'Potabilità da verificare' : undefined
        },
        {
            id: 'bagni',
            label: 'Servizi Igienici',
            icon: Building,
            state: location.bathrooms !== undefined && location.bathrooms !== null
                ? (location.bathrooms > 0 ? 'si' : 'no')
                : 'da_verificare' as TriState,
            valueText: location.bathrooms !== undefined && location.bathrooms !== null
                ? (location.bathrooms > 0 ? `${location.bathrooms} ${location.bathrooms === 1 ? 'bagno' : 'bagni'}` : 'Nessun bagno')
                : 'Bagni — Da verificare'
        },
        {
            id: 'accessibilita',
            label: 'Accessibilità',
            icon: ShieldCheck,
            state: getTriState(location.hasDisabledAccess),
            valueText: location.hasDisabledAccess === true
                ? 'Accesso disabili presente'
                : (location.hasDisabledAccess === false ? 'Accesso disabili assente' : 'Accessibilità — Da verificare')
        }
    ];

    const updatedByText = updaterInfo ? `da ${updaterInfo.nickname}${updaterInfo.groupName ? ` (${updaterInfo.groupName})` : ''}` : '';

    return (
        <div className="space-y-6 pb-36 lg:pb-12 max-w-6xl mx-auto">
            {/* ================================================================= */}
            {/* 1. INTESTAZIONE LOCALE (HEADER)                                   */}
            {/* ================================================================= */}
            <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                        <button
                            type="button"
                            onClick={() => {
                                if (window.history.length > 1) navigate(-1);
                                else navigate('/');
                            }}
                            className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-200 cursor-pointer shrink-0 mt-0.5"
                            title="Torna indietro"
                        >
                            <ArrowLeft size={22} />
                        </button>
                        <div className="min-w-0 space-y-1">
                            {/* Titolo su più righe, senza troncamento */}
                            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-tight break-words">
                                {location.name}
                            </h1>
                            <p className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                <Map size={14} className="text-scout-green shrink-0" />
                                <span>{location.commune}{location.province ? ` (${location.province})` : ''} · {location.region}</span>
                            </p>
                        </div>
                    </div>

                    {/* Context Menu (Modifica, Segnala, Cronologia, Elimina) */}
                    <div className="relative shrink-0">
                        <button
                            type="button"
                            onClick={() => setShowMenu(prev => !prev)}
                            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                            title="Opzioni scheda"
                        >
                            <MoreVertical size={18} />
                        </button>

                        {showMenu && (
                            <div 
                                className="absolute right-0 top-11 w-52 bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-xl py-1.5 z-30 animate-in fade-in-50 duration-150 text-xs font-bold divide-y divide-gray-100 dark:divide-gray-700/60"
                                onClick={() => setShowMenu(false)}
                            >
                                <div className="py-1">
                                    {currentUser && (
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/edit/${location.id}`)}
                                            className="w-full px-3.5 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2.5 cursor-pointer"
                                        >
                                            <Edit size={14} className="text-scout-green" />
                                            Modifica Luogo
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setShowHistoryModal(true)}
                                        className="w-full px-3.5 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2.5 cursor-pointer"
                                    >
                                        <Footprints size={14} className="text-scout-blue" />
                                        Cronologia Modifiche ({historyList.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowReportModal(true)}
                                        className="w-full px-3.5 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2.5 cursor-pointer"
                                    >
                                        <ShieldAlert size={14} className="text-amber-500" />
                                        Segnala Dati Errati
                                    </button>
                                </div>

                                {currentUser && (
                                    <div className="py-1">
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (window.confirm(`Sei sicuro di voler eliminare definitivamente "${location.name}" da Orme?`)) {
                                                    const ok = await deleteLocation(location.id);
                                                    if (ok) {
                                                        alert('Luogo eliminato con successo.');
                                                        navigate('/');
                                                    } else {
                                                        alert("Errore durante l'eliminazione.");
                                                    }
                                                }
                                            }}
                                            className="w-full px-3.5 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2.5 cursor-pointer"
                                        >
                                            <ShieldAlert size={14} className="text-red-500" />
                                            Elimina Luogo
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Nota Rapida & Badge Freschezza */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    {location.quickNote && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800/50 font-medium">
                            <span className="text-[11px]">📌</span>
                            <span className="italic">{location.quickNote}</span>
                        </span>
                    )}

                    {location.availabilityStatus && location.availabilityStatus !== 'available' && (
                        <span className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px]",
                            location.availabilityStatus === 'maintenance'
                                ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                                : "bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300"
                        )}>
                            {location.availabilityStatus === 'maintenance' ? <Wrench size={12} /> : <Ban size={12} />}
                            {location.availabilityStatus === 'maintenance' ? 'In Manutenzione' : 'Momentaneamente Chiuso'}
                        </span>
                    )}

                    <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border",
                        staleness.bgLight,
                        staleness.text,
                        staleness.border
                    )} title="Data ultimo aggiornamento informazioni della scheda">
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", staleness.color)} />
                        <span>{staleness.level === 0 ? 'Dati recenti' : (staleness.level === 1 ? 'Da verificare' : 'Non recenti')}</span>
                    </span>
                </div>
            </div>

            {/* ================================================================= */}
            {/* GRID DESKTOP A 2 COLONNE (Contenuto Principale + Sidebar Sticky)   */}
            {/* ================================================================= */}
            <div className="grid grid-cols-12 gap-6 items-start">
                {/* ─── COLONNA PRINCIPALE (8 cols su desktop) ────────────────── */}
                <div className="col-span-12 lg:col-span-8 space-y-6">

                    {/* ========================================================= */}
                    {/* 2. INFORMAZIONI ESSENZIALI (6 Tessere Stabili)            */}
                    {/* ========================================================= */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 border border-gray-150 dark:border-gray-700/80 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700/60">
                            <div>
                                <h2 className="text-base font-black text-gray-900 dark:text-white">
                                    Informazioni Essenziali
                                </h2>
                                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                                    Requisiti chiave per valutare l'idoneità del gruppo
                                </p>
                            </div>
                        </div>

                        {/* Griglia a 2 colonne su mobile, 3 colonne su tablet/desktop */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {facts.map((fact) => {
                                const isPositive = fact.state === 'si';
                                const isNegative = fact.state === 'no';
                                const isUnknown = fact.state === 'da_verificare';

                                return (
                                    <div
                                        key={fact.id}
                                        className={cn(
                                            "p-3.5 rounded-2xl border transition-colors flex flex-col justify-between gap-2.5",
                                            isPositive && "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40",
                                            isNegative && "bg-gray-50/60 dark:bg-gray-800/40 border-gray-200/70 dark:border-gray-700/60 opacity-80",
                                            isUnknown && "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/40"
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-1">
                                            <div className={cn(
                                                "w-7 h-7 rounded-xl flex items-center justify-center shrink-0",
                                                isPositive && "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300",
                                                isNegative && "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400",
                                                isUnknown && "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300"
                                            )}>
                                                <fact.icon size={15} />
                                            </div>

                                            <span className={cn(
                                                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                                                isPositive && "text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-900/40",
                                                isNegative && "text-gray-500 dark:text-gray-400 bg-gray-200/60 dark:bg-gray-700/40",
                                                isUnknown && "text-amber-800 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/40"
                                            )}>
                                                {isPositive && 'Sì'}
                                                {isNegative && 'No'}
                                                {isUnknown && '?'}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">
                                                {fact.label}
                                            </span>
                                            <p className={cn(
                                                "text-xs sm:text-sm font-bold leading-tight mt-0.5",
                                                isPositive && "text-gray-900 dark:text-white",
                                                isNegative && "text-gray-500 dark:text-gray-400",
                                                isUnknown && "text-amber-900 dark:text-amber-200"
                                            )}>
                                                {fact.valueText}
                                            </p>
                                            {fact.subText && (
                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-medium">
                                                    {fact.subText}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* 3. REGOLE E NOTE DI ATTENZIONE (Solo se presenti)         */}
                    {/* ========================================================= */}
                    {hasRulesOrAttentions && (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 border border-gray-150 dark:border-gray-700/80 shadow-xs space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700/60">
                                <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400" />
                                <h2 className="text-base font-black text-gray-900 dark:text-white">
                                    Regole & Note di Attenzione
                                </h2>
                            </div>

                            <div className="space-y-3">
                                {/* Restrizioni dichiarate */}
                                {location.restrictions && location.restrictions.length > 0 && (
                                    <div className="space-y-1.5">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                            Restrizioni e vincoli
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {location.restrictions.map((r, i) => (
                                                <span 
                                                    key={i} 
                                                    className="px-3 py-1 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200/80 dark:border-red-900/40"
                                                >
                                                    🚫 {r}
                                                </span>
                                            ))}
                                            {location.otherRestrictions && (
                                                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200/80 dark:border-red-900/40">
                                                    ⚠️ {location.otherRestrictions}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Punti di attenzione naturalistici / ambientali */}
                                {attentionFlags.length > 0 && (
                                    <div className="space-y-1.5 pt-1">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                            Avvertenze sul territorio
                                        </p>
                                        <div className="space-y-1.5">
                                            {attentionFlags.map((att, i) => (
                                                <div 
                                                    key={i} 
                                                    className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-950 dark:text-amber-200 font-medium flex items-start gap-2"
                                                >
                                                    <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">⚠️</span>
                                                    <span>{att}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* 4. COSTI E CONDIZIONI ECONOMICHE                          */}
                    {/* ========================================================= */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 border border-gray-150 dark:border-gray-700/80 shadow-xs space-y-3.5">
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700/60">
                            <Euro size={18} className="text-scout-green" />
                            <h2 className="text-base font-black text-gray-900 dark:text-white">
                                Costi & Condizioni
                            </h2>
                        </div>

                        {location.pricing?.basePrice ? (
                            <div className="space-y-3">
                                <div className="flex flex-wrap items-baseline gap-2">
                                    <span className="text-3xl font-black text-gray-900 dark:text-white">
                                        {location.pricing.basePrice} €
                                    </span>
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {location.pricing.unit === 'per_night' ? 'a notte' : 'al giorno'} / {location.pricing.target === 'per_group' ? 'gruppo' : 'persona'}
                                    </span>
                                    {location.pricing.target === 'per_group' && (
                                        <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/40">
                                            Tariffa fissa per il gruppo
                                        </span>
                                    )}
                                </div>

                                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                                    Prezzo riportato dalla fonte; validità e condizioni da verificare direttamente con il gestore.
                                </p>

                                {location.pricing.description && (
                                    <div 
                                        className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-750 border border-gray-150 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium prose dark:prose-invert max-w-none"
                                        dangerouslySetInnerHTML={{ __html: location.pricing.description }}
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="space-y-1.5 py-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold text-gray-800 dark:text-gray-200">
                                        Tariffa da richiedere al gestore
                                    </span>
                                    {location.priceCategory > 0 && (
                                        <span className="text-xs font-black text-scout-green dark:text-emerald-400" title={`Fascia di costo indicativa: ${location.priceCategory}/3`}>
                                            ({'€'.repeat(location.priceCategory)})
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    Contatta il referente per conoscere l'offerta consigliata o le tariffe per il pernottamento.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ========================================================= */}
                    {/* 5. SPAZI E DOTAZIONI OPERATIVE                            */}
                    {/* ========================================================= */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 border border-gray-150 dark:border-gray-700/80 shadow-xs space-y-4">
                        <div className="pb-2 border-b border-gray-100 dark:border-gray-700/60">
                            <h2 className="text-base font-black text-gray-900 dark:text-white">
                                Spazi & Dotazioni
                            </h2>
                            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                                Logistica da campo, spazi al chiuso e all'aperto
                            </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-bold text-gray-700 dark:text-gray-300">
                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50/70 dark:bg-gray-750/50">
                                <Building size={16} className={location.hasRefectory ? "text-scout-green" : "text-gray-300"} />
                                <span>{location.hasRefectory ? 'Refettorio / Salone' : 'No refettorio'}</span>
                            </div>

                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50/70 dark:bg-gray-750/50">
                                <Tent size={16} className={location.hasGreenSpace ? "text-scout-green" : "text-gray-300"} />
                                <span>{location.hasGreenSpace ? 'Prato per grandi giochi' : 'Spazi aperti limitati'}</span>
                            </div>

                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50/70 dark:bg-gray-750/50">
                                <TreePineIcon size={16} className={location.hasPoles ? "text-scout-green" : "text-gray-300"} />
                                <span>{location.hasPoles ? 'Pali costruzioni presenti' : 'Pali non disponibili'}</span>
                            </div>

                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50/70 dark:bg-gray-750/50">
                                <Flame size={16} className={location.hasHeating ? "text-amber-500" : "text-gray-300"} />
                                <span>{location.hasHeating ? 'Riscaldamento presente' : 'Senza riscaldamento'}</span>
                            </div>

                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50/70 dark:bg-gray-750/50">
                                <ChurchIcon size={16} className={location.hasChurch ? "text-scout-blue" : "text-gray-300"} />
                                <span>{location.hasChurch ? 'Chiesa / Cappella' : 'No cappella'}</span>
                            </div>

                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50/70 dark:bg-gray-750/50">
                                <Truck size={16} className={location.truckDistance ? "text-scout-blue" : "text-gray-300"} />
                                <span>{location.truckDistance ? `Scarico camion: ${location.truckDistance}` : 'Scarico furgone da verificare'}</span>
                            </div>
                        </div>

                        {/* Servizio Rover / RS */}
                        {location.hasRoverService && (
                            <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                                <p className="font-bold flex items-center gap-1.5">
                                    <Users size={14} className="text-scout-green" />
                                    Opportunità di Servizio per Clan / Fuoco (R/S)
                                </p>
                                <p className="font-medium text-[11px] leading-relaxed">
                                    {location.roverServiceDescription || 'La struttura accoglie con favore comunità R/S per attività di servizio pratico o animazione.'}
                                </p>
                            </div>
                        )}

                        {/* Attività Consigliate */}
                        {location.activities && location.activities.length > 0 && (
                            <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60 space-y-1.5">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                    Attività e branche indicate
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {location.activities.map(act => (
                                        <span 
                                            key={act} 
                                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 dark:bg-gray-750 text-gray-800 dark:text-gray-200"
                                        >
                                            {act}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ========================================================= */}
                    {/* 6. ESPERIENZE DELLA COMMUNITY                             */}
                    {/* ========================================================= */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 border border-gray-150 dark:border-gray-700/80 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700/60">
                            <div>
                                <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                                    <Footprints size={18} className="text-scout-blue" />
                                    Esperienze della Community
                                </h2>
                                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                                    Valutazioni e feedback lasciati da capi scout
                                </p>
                            </div>
                        </div>

                        {reviews.length > 0 ? (
                            <div className="space-y-6">
                                {/* Punteggio medio e Grafico Radar */}
                                <div className="flex flex-col sm:flex-row gap-6 items-center bg-gray-50/60 dark:bg-gray-750/40 p-4 rounded-2xl border border-gray-150 dark:border-gray-700/60">
                                    <div className="text-center sm:text-left shrink-0 space-y-1">
                                        <div className="text-4xl font-black text-scout-green dark:text-emerald-400 flex items-center justify-center sm:justify-start gap-1.5">
                                            {Number(location.avgRating).toFixed(1)}
                                            <Star size={24} className="fill-amber-400 text-amber-500" />
                                        </div>
                                        <p className="text-xs font-bold text-gray-400">
                                            {reviews.length} {reviews.length === 1 ? 'recensione' : 'recensioni'}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => currentUser ? setShowReviewModal(true) : navigate('/login')}
                                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-scout-blue text-white text-xs font-bold shadow-xs hover:bg-blue-600 cursor-pointer"
                                        >
                                            <Footprints size={14} />
                                            Lascia un'orma (+10 PT)
                                        </button>
                                    </div>

                                    <div className="flex-1 w-full flex justify-center">
                                        <SpiderChart reviews={reviews} />
                                    </div>
                                </div>

                                {/* Lista Recensioni recenti */}
                                <div className="space-y-3">
                                    {reviews.slice(0, 3).map(rev => (
                                        <div key={rev.id} className="p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-750/50 border border-gray-150 dark:border-gray-700/50 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-scout-green/10 flex items-center justify-center text-xs font-bold text-scout-green">
                                                        {rev.userNickname?.charAt(0) || 'C'}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-900 dark:text-white">
                                                            {rev.userNickname || 'Capo Scout'}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 font-medium">
                                                            {new Date(rev.createdAt).toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                                                    <Star size={12} className="fill-amber-400 text-amber-500" />
                                                    {((((rev.ombra||0)+(rev.legna||0)+(rev.suolo||0)+(rev.servizi||0)+(rev.sicurezza||0))/5)).toFixed(1)}
                                                </div>
                                            </div>

                                            {rev.commento && (
                                                <p className="text-xs text-gray-700 dark:text-gray-300 italic leading-relaxed">
                                                    "{rev.commento}"
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="py-6 px-4 text-center space-y-3 bg-gray-50/60 dark:bg-gray-750/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                <div className="w-11 h-11 rounded-2xl bg-scout-blue/10 flex items-center justify-center mx-auto text-scout-blue">
                                    <Footprints size={22} />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                        Nessuna esperienza ancora
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 max-w-sm mx-auto">
                                        Conosci questo luogo per un'uscita o un campo? Condividi la tua esperienza per aiutare altri capi scout.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => currentUser ? setShowReviewModal(true) : navigate('/login')}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-scout-green text-white text-xs font-bold hover:bg-emerald-700 shadow-xs cursor-pointer"
                                >
                                    <Footprints size={14} />
                                    Lascia un'orma (+10 PT)
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ========================================================= */}
                    {/* 8. INFORMAZIONI DELLA SCHEDA & METADATI                   */}
                    {/* ========================================================= */}
                    <div className="pt-2 text-xs text-gray-400 dark:text-gray-500 space-y-2 border-t border-gray-150 dark:border-gray-800">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span>
                                Ultima modifica della scheda: <strong>{new Date(location.lastUpdatedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}</strong> {updatedByText}
                            </span>
                            <div className="flex items-center gap-1 text-[11px]">
                                <Eye size={12} />
                                <span>{viewsCount} {viewsCount === 1 ? 'visita' : 'visite'} su Orme</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-1">
                            <button
                                type="button"
                                onClick={() => setShowHistoryModal(true)}
                                className="text-scout-blue hover:underline font-semibold cursor-pointer"
                            >
                                Vedi cronologia modifiche ({historyList.length})
                            </button>
                            <span>·</span>
                            <button
                                type="button"
                                onClick={() => setShowReportModal(true)}
                                className="text-gray-400 hover:text-red-500 font-semibold cursor-pointer"
                            >
                                Segnala dati inesatti
                            </button>
                        </div>
                    </div>
                </div>

                {/* ─── SIDEBAR DESKTOP (4 cols su desktop, sticky) ────────────── */}
                <div className="hidden lg:block lg:col-span-4 space-y-4 sticky top-6">
                    {/* Card Azioni Primarie Desktop */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-150 dark:border-gray-700/80 shadow-md space-y-3.5">
                        <h3 className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-wider">
                            Azioni Rapide
                        </h3>

                        {/* CTA 1: Contatta */}
                        <button
                            type="button"
                            onClick={handlePrimaryContactAction}
                            className="w-full bg-scout-green hover:bg-emerald-700 active:scale-98 text-white font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md transition-all cursor-pointer"
                        >
                            <Phone size={16} />
                            {currentUser ? 'Contatta Referenti' : 'Accedi per contattare'}
                        </button>

                        {/* CTA 2: Indicazioni */}
                        <button
                            type="button"
                            onClick={handleOpenDirections}
                            className="w-full bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-scout-blue dark:text-blue-300 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs border border-blue-200 dark:border-blue-800/50 transition-all cursor-pointer"
                        >
                            <Navigation size={15} />
                            {positionType === 'coordinate_precise' && 'Indicazioni Stradali'}
                            {positionType === 'solo_indirizzo' && 'Cerca Indirizzo su Mappa'}
                            {positionType === 'da_richiedere' && 'Chiedi Posizione al Referente'}
                        </button>

                        {/* Posizione Status note */}
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60 text-[11px] text-gray-400 space-y-1">
                            <div className="flex items-center gap-1.5">
                                <Map size={13} className="text-scout-green shrink-0" />
                                <span className="font-bold text-gray-700 dark:text-gray-300 truncate">
                                    {location.address || `${location.commune} (${location.province || ''})`}
                                </span>
                            </div>
                            <p className="text-[10px]">
                                {positionType === 'coordinate_precise' && 'Coordinate geografiche verificate'}
                                {positionType === 'solo_indirizzo' && 'Indirizzo indicativo (ingresso da confermare)'}
                                {positionType === 'da_richiedere' && 'Posizione precisa non caricata'}
                            </p>
                        </div>
                    </div>

                    {/* Card Referente Sintetico Desktop */}
                    {primaryPhoneContact && (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-150 dark:border-gray-700/80 shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                    Referente Principale
                                </span>
                                {phoneContacts.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowContactsModal(true)}
                                        className="text-[11px] font-bold text-scout-green hover:underline cursor-pointer"
                                    >
                                        Vedi tutti ({phoneContacts.length})
                                    </button>
                                )}
                            </div>

                            <div className="space-y-1">
                                <p className="font-bold text-sm text-gray-900 dark:text-white">
                                    {primaryPhoneContact.name || 'Referente Struttura'}
                                </p>
                                {primaryPhoneContact.role && (
                                    <p className="text-xs text-gray-400 font-semibold">
                                        {primaryPhoneContact.role}
                                    </p>
                                )}
                                <p className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300 pt-1">
                                    {primaryPhoneContact.value}
                                </p>
                            </div>

                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => handleCopyPhone(primaryPhoneContact.value)}
                                    className="flex-1 py-1.5 px-2 bg-gray-50 dark:bg-gray-750 hover:bg-gray-100 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    {copiedPhone === primaryPhoneContact.value ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                                    {copiedPhone === primaryPhoneContact.value ? 'Copiato' : 'Copia'}
                                </button>
                                {hasAttestedWhatsapp(primaryPhoneContact) && (
                                    <button
                                        type="button"
                                        onClick={() => window.open(`https://wa.me/${cleanPhoneForWhatsapp(primaryPhoneContact.value)}`)}
                                        className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                                        title="Apri WhatsApp"
                                    >
                                        <MessageCircle size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ================================================================= */}
            {/* BARRA AZIONI MOBILISSIMA PERSISTENTE (Blocco Mobile < lg)         */}
            {/* ================================================================= */}
            <div className="lg:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 p-3 sm:px-6 shadow-lg">
                <div className="max-w-md mx-auto grid grid-cols-2 gap-2.5">
                    {/* Pulsante 1: Contatta */}
                    <button
                        type="button"
                        onClick={handlePrimaryContactAction}
                        className="w-full bg-scout-green hover:bg-emerald-700 active:scale-98 text-white font-black py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                    >
                        <Phone size={16} />
                        <span className="truncate">{currentUser ? 'Contatta' : 'Accedi per info'}</span>
                    </button>

                    {/* Pulsante 2: Indicazioni */}
                    <button
                        type="button"
                        onClick={handleOpenDirections}
                        className="w-full bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-scout-blue dark:text-blue-300 font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm border border-blue-200 dark:border-blue-800/50 transition-all cursor-pointer"
                    >
                        <Navigation size={15} />
                        <span className="truncate">
                            {positionType === 'coordinate_precise' && 'Indicazioni'}
                            {positionType === 'solo_indirizzo' && 'Cerca mappa'}
                            {positionType === 'da_richiedere' && 'Posizione'}
                        </span>
                    </button>
                </div>
            </div>

            {/* ================================================================= */}
            {/* DIALOG CONTATTI COMPLETO (W2)                                     */}
            {/* ================================================================= */}
            {showContactsModal && (
                <div 
                    className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in-50 duration-200"
                    onClick={() => setShowContactsModal(false)}
                >
                    <div 
                        className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-150 dark:border-gray-700 space-y-4 max-h-[85vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
                            <div>
                                <h3 className="font-black text-base text-gray-900 dark:text-white">
                                    Contatta i Referenti
                                </h3>
                                <p className="text-xs text-gray-400 font-medium">
                                    Canali diretti per prenotazioni e informazioni
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowContactsModal(false)}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Lista Telefoni */}
                        {phoneContacts.length > 0 ? (
                            <div className="space-y-3">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                    Recapiti Telefonici ({phoneContacts.length})
                                </p>
                                {phoneContacts.map((c, idx) => {
                                    const isWhatsapp = hasAttestedWhatsapp(c);
                                    return (
                                        <div
                                            key={idx}
                                            className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-750 border border-gray-150 dark:border-gray-650 space-y-2.5"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                                                        {c.name || `Referente #${idx + 1}`}
                                                    </h4>
                                                    {c.role && (
                                                        <span className="inline-block text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/40 mt-0.5">
                                                            {c.role}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-200">
                                                    {c.value}
                                                </span>
                                            </div>

                                            {c.notes && (
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">
                                                    💬 {c.notes}
                                                </p>
                                            )}

                                            <div className="flex gap-2 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => window.open(`tel:${c.value}`)}
                                                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-scout-green hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer"
                                                >
                                                    <Phone size={13} /> Chiama
                                                </button>
                                                {isWhatsapp && (
                                                    <button
                                                        type="button"
                                                        onClick={() => window.open(`https://wa.me/${cleanPhoneForWhatsapp(c.value)}`)}
                                                        className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer"
                                                    >
                                                        <MessageCircle size={13} /> WhatsApp
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyPhone(c.value)}
                                                    className="px-3 py-2 bg-white dark:bg-gray-700 hover:bg-gray-100 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 transition-colors cursor-pointer"
                                                    title="Copia numero"
                                                >
                                                    {copiedPhone === c.value ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 italic py-2">
                                Nessun recapito telefonico registrato per questa struttura.
                            </p>
                        )}

                        {/* Lista Email */}
                        {emailList.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                    Indirizzi Email ({emailList.length})
                                </p>
                                {emailList.map((em, idx) => (
                                    <div
                                        key={idx}
                                        className="p-3 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-150 dark:border-gray-650 flex items-center justify-between gap-2"
                                    >
                                        <div className="min-w-0">
                                            <span className="text-xs font-mono font-bold text-gray-900 dark:text-white truncate block">
                                                {em}
                                            </span>
                                        </div>
                                        <div className="flex gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => window.open(`mailto:${em}`)}
                                                className="px-2.5 py-1.5 bg-scout-blue hover:bg-blue-600 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                                            >
                                                <Mail size={12} /> Scrivi
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleCopyEmail(em)}
                                                className="p-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer"
                                                title="Copia email"
                                            >
                                                {copiedEmail === em ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Canali Web & Social */}
                        {(websiteUrl || facebookUrl || instagramUrl) && (
                            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                    Sito & Pagine Ufficiali
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                                    {websiteUrl && (
                                        <a
                                            href={websiteUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-650 flex items-center gap-2 text-scout-blue hover:underline"
                                        >
                                            <Globe size={14} /> Sito Web
                                        </a>
                                    )}
                                    {facebookUrl && (
                                        <a
                                            href={facebookUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-650 flex items-center gap-2 text-[#1877F2] hover:underline"
                                        >
                                            <Facebook size={14} /> Facebook
                                        </a>
                                    )}
                                    {instagramUrl && (
                                        <a
                                            href={instagramUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-650 flex items-center gap-2 text-[#E4405F] hover:underline"
                                        >
                                            <Instagram size={14} /> Instagram
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ================================================================= */}
            {/* DIALOG CRONOLOGIA MODIFICHE (W1/W5)                               */}
            {/* ================================================================= */}
            {showHistoryModal && (
                <div 
                    className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in-50 duration-200"
                    onClick={() => setShowHistoryModal(false)}
                >
                    <div 
                        className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-gray-150 dark:border-gray-700 space-y-4 max-h-[85vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
                            <div>
                                <h3 className="font-black text-base text-gray-900 dark:text-white flex items-center gap-2">
                                    <Footprints className="text-scout-green" size={18} />
                                    Cronologia Modifiche
                                </h3>
                                <p className="text-xs text-gray-400 font-medium">
                                    Storico trasparente dei contributi della community
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowHistoryModal(false)}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {historyList.length === 0 ? (
                            <p className="text-xs text-gray-400 italic py-4 text-center">
                                Nessuna modifica registrata dopo il censimento iniziale.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {historyList.map(item => (
                                    <div key={item.id} className="p-3.5 rounded-2xl bg-gray-50/70 dark:bg-gray-750/50 border border-gray-150 dark:border-gray-700/60 text-xs space-y-1">
                                        <div className="flex justify-between items-center text-gray-500">
                                            <span className="font-bold text-scout-green dark:text-emerald-400">
                                                {item.author_name || 'Capo Scout'}
                                            </span>
                                            <span className="text-[10px]">
                                                {new Date(item.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <p className="text-gray-700 dark:text-gray-300 font-medium">
                                            {item.details}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal Recensione */}
            {showReviewModal && (
                <ReviewModal 
                    location={location} 
                    onClose={() => setShowReviewModal(false)} 
                    onSave={async () => {
                        const revs = await getReviews(location.id);
                        setReviews(revs);
                        setShowReviewModal(false);
                        const locs = await getLocations();
                        const found = locs.find(l => l.id === location.id);
                        if (found) setLocation(found);
                    }}
                />
            )}

            {/* Modal Segnala Problema */}
            <ReportProblemModal
                isOpen={showReportModal}
                onClose={() => setShowReportModal(false)}
                currentUser={currentUser}
            />
        </div>
    );
}

// Icone di supporto
function TreePineIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2a1 1 0 0 1-.8-1.7L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"/>
            <path d="M12 22v-3"/>
        </svg>
    );
}

function ChurchIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m18 7 4 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9l4-2"/>
            <path d="M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4"/>
            <path d="M18 22V5l-6-3-6 3v17"/>
            <path d="M12 7v5"/>
            <path d="M10 9h4"/>
        </svg>
    );
}
