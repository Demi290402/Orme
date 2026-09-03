import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Phone, MessageCircle, Map, ArrowLeft, BedDouble, Tent, Coffee, ShieldAlert, Edit, Euro, Wrench, Ban, Star, Footprints, MessageSquare, X, Droplets, Flame, Wind, ShieldCheck, Users, ChevronLeft, ChevronRight, Globe, Mail, Copy, Check, Building } from 'lucide-react';
import { getLocations, getUser, getReviews, saveReview, deleteLocation, getLocationHistory, upsertLocationView, getUserLocationViews } from '@/lib/data';
import { Location, LocationReview } from '@/types';
import { getStalenessInfo, cn } from '@/lib/utils';
import { addPointsWithStats } from '@/lib/gamification';

// --- HELPER FUNCTIONS ---
const calculateAvg = (reviews: LocationReview[], field: keyof LocationReview) => {
    const valid = reviews.filter(r => r[field] !== undefined && r[field] !== null);
    if (valid.length === 0) return 0;
    const sum = valid.reduce((acc, r) => acc + (r[field] as number), 0);
    return (sum / valid.length).toFixed(1);
};

// --- SPIDER CHART COMPONENT (SVG) ---
function SpiderChart({ reviews }: { reviews: LocationReview[] }) {
    // 5 Axis: Ombra, Risorse (Legna), Suolo, Servizi, Sicurezza
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
                {/* Grid Lines */}
                {gridPoints.map((gp, i) => (
                    <polygon key={i} points={gp} fill="none" stroke="currentColor" className="text-gray-200 dark:text-gray-700" strokeWidth="1" />
                ))}
                {/* Axis lines */}
                {metrics.map((_, i) => {
                    const x = center + radius * Math.cos(i * angleStep - Math.PI / 2);
                    const y = center + radius * Math.sin(i * angleStep - Math.PI / 2);
                    return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="currentColor" className="text-gray-200 dark:text-gray-700" />;
                })}
                {/* Label text */}
                {metrics.map((m, i) => {
                    const x = center + (radius + 20) * Math.cos(i * angleStep - Math.PI / 2);
                    const y = center + (radius + 20) * Math.sin(i * angleStep - Math.PI / 2);
                    return <text key={i} x={x} y={y} fontSize="8" fontWeight="bold" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500 uppercase">{m.label}</text>;
                })}
                {/* Value Polygon */}
                {points && <polygon points={points} fill="rgba(46, 125, 50, 0.3)" stroke="#2e7d32" strokeWidth="2" />}
            </svg>
        </div>
    );
}

// --- REVIEW MODAL COMPONENT ---
function ReviewModal({ location, onClose, onSave }: { location: Location, onClose: () => void, onSave: () => void }) {
    // Automating initial values based on location census
    const censusAcqua = !location.restrictions.includes('Acqua non potabile');
    const censusFuochi = !location.restrictions.includes('No fuochi di bivacco');
    
    // Map priceCategory (0-3) to a starting rating (1-5)
    // 1 (€) -> 4 (Good value), 2 (€€) -> 3 (Average), 3 (€€€) -> 2 (Expensive), 0 -> 3
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
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-y-auto p-8 space-y-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 transition-colors">
                    <X size={24} />
                </button>

                <div className="text-center space-y-2">
                    <div className="bg-scout-blue/10 dark:bg-blue-900/30 w-16 h-16 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4">
                        <Footprints size={32} className="text-scout-blue" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">Lascia la tua Orma</h2>
                    <p className="text-sm text-gray-500 max-w-xs mx-auto">Valuta oggettivamente il luogo per aiutare gli altri gruppi.</p>
                </div>

                <div className="space-y-6">
                    {categories.map((cat) => (
                        <div key={cat.key} className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <cat.icon size={14} className="text-scout-green" />
                                    {cat.label}
                                </label>
                                <span className="text-xs font-black text-scout-green px-2 py-0.5 bg-green-50 dark:bg-green-900/30 rounded-md">
                                    {(rating as any)[cat.key]} / 5
                                </span>
                            </div>
                            <input 
                                type="range" min="1" max="5" step="1"
                                value={(rating as any)[cat.key]}
                                onChange={(e) => setRating({...rating, [cat.key]: parseInt(e.target.value)})}
                                className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-scout-green"
                            />
                        </div>
                    ))}

                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => setRating({...rating, acquaPotabile: !rating.acquaPotabile})}
                            className={cn(
                                "p-4 rounded-2xl border-2 font-bold text-xs flex flex-col items-center gap-2 transition-all",
                                rating.acquaPotabile ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-gray-100 text-gray-400"
                            )}
                        >
                            <Droplets size={20} />
                            Acqua Potabile: {rating.acquaPotabile ? 'SI' : 'NO'}
                        </button>
                        <button 
                            onClick={() => setRating({...rating, fuochi: !rating.fuochi})}
                            className={cn(
                                "p-4 rounded-2xl border-2 font-bold text-xs flex flex-col items-center gap-2 transition-all",
                                rating.fuochi ? "bg-orange-50 border-orange-500 text-orange-700" : "bg-white border-gray-100 text-gray-400"
                            )}
                        >
                            <Flame size={20} />
                            Fuochi OK: {rating.fuochi ? 'SI' : 'NO'}
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Commento libero</label>
                        <textarea 
                            value={rating.commento}
                            onChange={(e) => setRating({...rating, commento: e.target.value})}
                            placeholder="Racconta la tua esperienza, consigli o criticità..."
                            className="w-full bg-gray-50 dark:bg-gray-800 dark:border-gray-700 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-scout-green outline-none min-h-[100px] border border-gray-100"
                        />
                    </div>

                    <button 
                        onClick={async () => {
                            try { 
                                await saveReview(rating); 
                                addPointsWithStats(10, { reviewsAdded: 1 }).catch(console.error);
                                onSave(); 
                            } catch(e) { alert(e); }
                        }}
                        className="w-full bg-scout-green text-white font-black py-4 rounded-2xl shadow-xl shadow-green-900/20 active:scale-95 transition-all"
                    >
                        Salva Orma
                    </button>
                </div>
            </div>
        </div>
    );
}


// --- MAIN COMPONENT ---
export default function LocationDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [location, setLocation] = useState<Location | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [reviews, setReviews] = useState<LocationReview[]>([]);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [loading, setLoading] = useState(true);

    const [historyList, setHistoryList] = useState<any[]>([]);
    const [oldLastViewedAt, setOldLastViewedAt] = useState<string | null>(null);
    const [bannerOpen, setBannerOpen] = useState(true);
    const [bannerMinimized, setBannerMinimized] = useState(false);
    const [bannerMaximized, setBannerMaximized] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(window.innerWidth < 768 ? 5 : 10);

    useEffect(() => {
        const handleResize = () => setPageSize(window.innerWidth < 768 ? 5 : 10);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const loadData = async () => {
            try {
                const locs = await getLocations();
                const found = locs.find(l => l.id === id);
                if (found) {
                    setLocation(found);
                    const revs = await getReviews(found.id);
                    setReviews(revs);

                    // Fetch history logs
                    const history = await getLocationHistory(found.id);
                    setHistoryList(history);

                    // Fetch views map
                    const views = await getUserLocationViews();
                    const lastViewed = views[found.id];
                    setOldLastViewedAt(lastViewed || null);

                    // Track current view read state
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

    const [updaterInfo, setUpdaterInfo] = useState<{ nickname: string, groupName: string } | null>(null);
    const [showContactPickerModal, setShowContactPickerModal] = useState(false);
    const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
    const [showEmailPickerModal, setShowEmailPickerModal] = useState(false);
    const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

    const handleCopyEmail = (emailStr: string) => {
        navigator.clipboard.writeText(emailStr);
        setCopiedEmail(emailStr);
        setTimeout(() => setCopiedEmail(null), 2500);
    };

    const cleanPhoneForWhatsapp = (num: string) => {
        let clean = num.replace(/[^0-9+]/g, '');
        if (clean.startsWith('00')) clean = '+' + clean.slice(2);
        if (!clean.startsWith('+')) {
            if (clean.startsWith('3') && clean.length >= 9) {
                clean = '+39' + clean;
            }
        }
        return clean.replace('+', '');
    };

    const handleCopyPhone = (phoneNumber: string) => {
        navigator.clipboard.writeText(phoneNumber);
        setCopiedPhone(phoneNumber);
        setTimeout(() => setCopiedPhone(null), 2000);
    };

    useEffect(() => {
        if (location?.lastUpdatedBy) {
            getUser(location.lastUpdatedBy).then(u => {
                setUpdaterInfo({ nickname: u.nickname, groupName: u.groupName || '' });
            }).catch(console.error);
        }
    }, [location]);

    if (loading) return <div className="p-8 text-center text-gray-500 font-bold animate-pulse py-20 flex flex-col items-center gap-4">
        <Footprints size={48} className="text-scout-blue" />
        Caricamento in corso...
    </div>;
    if (!location) return <div className="p-8 text-center">Luogo non trovato</div>;

    const staleness = getStalenessInfo(location.lastUpdatedAt);
    const phoneContacts = (location.contacts || []).filter(c => (c.type === 'phone' || !c.type || c.type === 'whatsapp') && c.value);
    const primaryPhoneContact = phoneContacts[0];
    const phone = primaryPhoneContact?.value;
    const whatsappContact = phoneContacts.find(c => c.isWhatsapp || c.type === 'whatsapp') || primaryPhoneContact;
    const whatsapp = whatsappContact?.value;

    const websiteUrl = location.website 
        ? (location.website.startsWith('http://') || location.website.startsWith('https://') 
            ? location.website 
            : `https://${location.website}`)
        : undefined;

    const emailList: string[] = (location.emails && location.emails.length > 0)
        ? location.emails
        : (location.email ? location.email.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean) : []);

    const primaryEmail = emailList[0];
    const emailUrl = primaryEmail ? `mailto:${primaryEmail}` : undefined;

    const actionButtonsCount = [phone, whatsapp, websiteUrl, emailUrl, true].filter(Boolean).length;

    const hasAnyAttention = Boolean(
        location.hasPastures ||
        location.hasInsects ||
        location.hasDiseases ||
        location.hasLittleShade ||
        location.hasVeryBusyArea ||
        (location.otherAttention && location.otherAttention.trim().length > 0)
    );

    const updatedByText = updaterInfo ? `da ${updaterInfo.nickname}${updaterInfo.groupName ? ` - ${updaterInfo.groupName}` : ''}` : '';

    const totalPages = Math.ceil(historyList.length / pageSize);
    const paginatedHistory = historyList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const renderBannerContent = (isModal: boolean) => (
        <div className={cn(
            "bg-white dark:bg-gray-800 rounded-3xl border border-gray-150 dark:border-gray-700 shadow-lg p-6 space-y-4",
            isModal ? "w-full max-w-2xl max-h-[90vh] overflow-y-auto" : ""
        )}>
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <Footprints className="text-scout-green animate-pulse" size={18} />
                    <h3 className="font-extrabold text-sm text-gray-900 dark:text-white uppercase tracking-wider">Cronologia Modifiche</h3>
                    {oldLastViewedAt && historyList.some(h => h.user_id !== currentUser?.id && new Date(h.created_at).getTime() > new Date(oldLastViewedAt).getTime()) && (
                        <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-bounce">NUOVE</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {!isModal && (
                        <>
                            <button 
                                onClick={() => setBannerMinimized(true)} 
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 font-bold w-7 h-7 flex items-center justify-center text-lg"
                                title="Riduci a icona"
                            >
                                -
                            </button>
                            <button 
                                onClick={() => setBannerMaximized(true)} 
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400"
                                title="Schermo intero"
                            >
                                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                            </button>
                        </>
                    )}
                    {isModal && (
                        <button 
                            onClick={() => setBannerMaximized(false)} 
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400"
                            title="Riduci a finestra"
                        >
                            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg>
                        </button>
                    )}
                    <button 
                        onClick={() => {
                            setBannerOpen(false);
                            setBannerMaximized(false);
                        }} 
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400"
                        title="Chiudi"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {historyList.length === 0 ? (
                <p className="text-xs text-gray-500 italic py-2">Nessuna modifica registrata per questo luogo.</p>
            ) : (
                <div className="space-y-3 py-2">
                    {paginatedHistory.map((item) => {
                        const isNew = oldLastViewedAt && item.user_id !== currentUser?.id && new Date(item.created_at).getTime() > new Date(oldLastViewedAt).getTime();
                        return (
                            <div key={item.id} className={cn(
                                "p-3.5 rounded-2xl border text-xs transition-all relative",
                                isNew 
                                    ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-350 dark:border-emerald-800" 
                                    : "bg-gray-50/50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-750"
                            )}>
                                {isNew && (
                                    <div className="absolute top-3.5 right-3.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" title="Modifica non letta" />
                                )}
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="font-extrabold text-scout-green-dark dark:text-emerald-400">
                                        {item.author_name || 'Autore sconosciuto'}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-semibold">
                                        {new Date(item.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                                    {item.details}
                                </p>
                            </div>
                        );
                    })}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center pt-2 mt-4">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                className="p-2 rounded-xl border border-gray-200 dark:border-gray-750 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer dark:text-white"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-xs font-bold text-gray-550">
                                Pagina {currentPage} di {totalPages}
                            </span>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                className="p-2 rounded-xl border border-gray-200 dark:border-gray-750 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer dark:text-white"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <ArrowLeft size={24} className="dark:text-white" />
                </Link>
                <div>
                    <h1 className="text-2xl font-black leading-tight text-gray-900 dark:text-white">{location.name}</h1>
                    <p className="text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-widest">{location.commune}, {location.region}</p>
                </div>
            </div>

            <div className={cn(
                "inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all shadow-sm",
                staleness.bgLight,
                staleness.text,
                staleness.border
            )}>
                Aggiornato: {new Date(location.lastUpdatedAt).toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })} {updatedByText}
            </div>

            {/* Modification History Banner */}
            {bannerOpen && !bannerMinimized && !bannerMaximized && renderBannerContent(false)}

            {/* Maximized Overlay */}
            {bannerOpen && bannerMaximized && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    {renderBannerContent(true)}
                </div>
            )}

            {/* Minimized Floating Indicator */}
            {bannerOpen && bannerMinimized && (
                <button
                    onClick={() => setBannerMinimized(false)}
                    className="fixed bottom-6 right-6 z-[90] bg-scout-green text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-2 hover:scale-[1.05] active:scale-95 transition-all text-xs font-black animate-bounce border-2 border-white dark:border-gray-800 cursor-pointer"
                    title="Vedi cronologia modifiche"
                >
                    <Footprints size={16} />
                    <span>Modifiche ({historyList.length})</span>
                </button>
            )}

            {/* Ratings Summary & Spider Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                    {/* Left: Score */}
                    <div className="text-center md:text-left shrink-0">
                        <div className="text-5xl font-black text-scout-green-dark dark:text-emerald-400 mb-1 flex items-center justify-center md:justify-start gap-2">
                            {location.avgRating > 0 ? Number(location.avgRating).toFixed(1) : "—"}
                            <Star size={32} fill={location.avgRating > 0 ? "currentColor" : "none"} className={location.avgRating > 0 ? "text-amber-500" : "text-gray-200"} />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                            {location.reviewsCount} {location.reviewsCount === 1 ? 'Recensione' : 'Recensioni'}
                        </p>
                        
                        <button 
                            onClick={() => currentUser ? setShowReviewModal(true) : navigate('/login')}
                            className="relative bg-scout-blue dark:bg-scout-blue-dark text-white px-8 py-3 rounded-2xl font-black text-sm shadow-lg shadow-scout-blue/20 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all group"
                        >
                            <Footprints size={18} />
                            Lascia un'orma
                            <span className="absolute -top-3 -right-2 bg-yellow-400 text-scout-brown text-[10px] font-black px-2 py-1 rounded-lg shadow-md animate-bounce group-hover:animate-none">
                                +10 PT
                            </span>
                        </button>
                    </div>

                    {/* Middle: Spider Chart Component */}
                    <div className="flex-1 w-full flex justify-center">
                        <SpiderChart reviews={reviews} />
                    </div>

                    {/* Right: Key Stats */}
                    <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-2xl text-center border border-gray-100 dark:border-gray-600">
                            <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Acqua</p>
                            <span className="text-xs font-black dark:text-white uppercase tracking-tighter">
                                {reviews.length > 0 ? (reviews.some(r => r.acquaPotabile) ? 'Potabile ✅' : 'No potabile ⚠️') : 'N/A'}
                            </span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-2xl text-center border border-gray-100 dark:border-gray-600">
                            <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Prezzo</p>
                            <span className="text-xs font-black dark:text-white">
                                {location.priceCategory > 0 ? "€".repeat(location.priceCategory) : "N/D"}
                            </span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-2xl text-center border border-gray-100 dark:border-gray-600">
                            <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Ombra</p>
                            <span className="text-xs font-black dark:text-white flex items-center justify-center gap-1">
                                {calculateAvg(reviews, 'ombra')} <Star size={10} fill="currentColor" className="text-amber-500" />
                            </span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-2xl text-center border border-gray-100 dark:border-gray-600">
                            <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Servizi</p>
                            <span className="text-xs font-black dark:text-white flex items-center justify-center gap-1">
                                {calculateAvg(reviews, 'servizi')} <Star size={10} fill="currentColor" className="text-amber-500" />
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Availability Status Banner */}
            {location.availabilityStatus && location.availabilityStatus !== 'available' && (
                <div className={cn(
                    "flex items-center gap-3 p-5 rounded-[2rem] border-2 font-semibold",
                    location.availabilityStatus === 'maintenance'
                        ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300"
                        : "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300"
                )}>
                    {location.availabilityStatus === 'maintenance'
                        ? <Wrench size={22} className="shrink-0" />
                        : <Ban size={22} className="shrink-0" />}
                    <div>
                        <p className="font-black text-base uppercase tracking-tighter">
                            {location.availabilityStatus === 'maintenance' ? '🔧 In manutenzione' : '🚫 Non disponibile'}
                        </p>
                        <p className="text-xs font-medium opacity-80 mt-1">
                            {location.availabilityStatus === 'maintenance'
                                ? 'La struttura è in fase di ristrutturazione.'
                                : 'Non accetta più gruppi scout in questo momento.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className={cn(
                "grid gap-3",
                actionButtonsCount === 1 && "grid-cols-1",
                actionButtonsCount === 2 && "grid-cols-2",
                actionButtonsCount === 3 && "grid-cols-3",
                actionButtonsCount >= 4 && "grid-cols-4"
            )}>
                {phone && (
                    <button 
                        onClick={() => {
                            if (!currentUser) { navigate('/login'); return; }
                            if (phoneContacts.length > 1) {
                                setShowContactPickerModal(true);
                            } else {
                                window.open(`tel:${phone}`);
                            }
                        }}
                        className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all text-center cursor-pointer"
                    >
                        <Phone className={cn("text-scout-green mb-1", !currentUser && "blur-[2px]")} size={24} />
                        <span className="text-[10px] font-black uppercase dark:text-gray-300">
                            {currentUser ? (phoneContacts.length > 1 ? `Chiama (${phoneContacts.length})` : 'Chiama') : 'Accedi'}
                        </span>
                    </button>
                )}
                {whatsapp && (
                    <button 
                        onClick={() => {
                            if (!currentUser) { navigate('/login'); return; }
                            if (phoneContacts.length > 1) {
                                setShowContactPickerModal(true);
                            } else {
                                window.open(`https://wa.me/${cleanPhoneForWhatsapp(whatsapp)}`);
                            }
                        }}
                        className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all text-center cursor-pointer"
                    >
                        <MessageCircle className={cn("text-green-500 mb-1", !currentUser && "blur-[2px]")} size={24} />
                        <span className="text-[10px] font-black uppercase dark:text-gray-300">
                            {currentUser ? (phoneContacts.length > 1 ? `WhatsApp (${phoneContacts.length})` : 'WhatsApp') : 'Accedi'}
                        </span>
                    </button>
                )}
                {websiteUrl && (
                    <a
                        href={websiteUrl}
                        target="_blank" rel="noreferrer"
                        className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all text-center"
                    >
                        <Globe className="text-scout-blue mb-1" size={24} />
                        <span className="text-[10px] font-black uppercase dark:text-gray-300">Sito Web</span>
                    </a>
                )}
                {emailUrl && (
                    emailList.length === 1 ? (
                        <a
                            href={emailUrl}
                            className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all text-center"
                        >
                            <Mail className="text-scout-green mb-1" size={24} />
                            <span className="text-[10px] font-black uppercase dark:text-gray-300">Email</span>
                        </a>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setShowEmailPickerModal(true)}
                            className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all text-center cursor-pointer"
                        >
                            <Mail className="text-scout-green mb-1" size={24} />
                            <span className="text-[10px] font-black uppercase dark:text-gray-300">
                                Email ({emailList.length})
                            </span>
                        </button>
                    )
                )}
                <a
                    href={location.coordinates
                        ? `https://www.google.com/maps/search/?api=1&query=${location.coordinates.lat},${location.coordinates.lng}`
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.name + ' ' + location.commune)}`
                    }
                    target="_blank" rel="noreferrer"
                    className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all text-center"
                >
                    <Map className="text-blue-500 mb-1" size={24} />
                    <span className="text-[10px] font-black uppercase dark:text-gray-300">Mappa</span>
                </a>
            </div>

            {/* Sezione Contatti e Referenti */}
            {phoneContacts.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-gray-100 dark:border-gray-700">
                        <div>
                            <h2 className="font-black text-sm uppercase tracking-wider flex items-center gap-2 text-gray-900 dark:text-white">
                                <Phone size={16} className="text-scout-green" /> Recapiti e Referenti ({phoneContacts.length})
                            </h2>
                            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                                Contatti diretti per informazioni, chiavi e prenotazioni
                            </p>
                        </div>
                        {phoneContacts.length > 1 && (
                            <span className="self-start sm:self-auto text-[10px] font-bold text-scout-green-dark dark:text-emerald-400 bg-green-50 dark:bg-emerald-950/30 border border-green-200 dark:border-emerald-800/40 px-2.5 py-1 rounded-full">
                                {phoneContacts.length} numeri disponibili
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                        {phoneContacts.map((c, idx) => {
                            const isWhatsapp = c.isWhatsapp !== false && c.type !== 'email';
                            return (
                                <div
                                    key={idx}
                                    className="p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-700/30 border border-gray-150 dark:border-gray-700 flex flex-col justify-between space-y-3"
                                >
                                    <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-scout-green/10 dark:bg-emerald-950/40 text-scout-green-dark dark:text-emerald-400 flex items-center justify-center font-black text-xs shrink-0">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
                                                        {c.name || `Referente #${idx + 1}`}
                                                    </h3>
                                                    {c.role && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/50 mt-1">
                                                            <Building size={10} />
                                                            {c.role}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Numero di telefono */}
                                        <div className="pt-1">
                                            {currentUser ? (
                                                <div className="flex items-center justify-between bg-white dark:bg-gray-800 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-650 shadow-2xs">
                                                    <span className="font-mono font-bold text-sm text-gray-800 dark:text-gray-100 tracking-wide">
                                                        {c.value}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyPhone(c.value)}
                                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-scout-green transition-colors cursor-pointer"
                                                        title="Copia numero"
                                                    >
                                                        {copiedPhone === c.value ? (
                                                            <>
                                                                <Check size={12} className="text-scout-green" />
                                                                <span className="text-scout-green">Copiato</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy size={12} />
                                                                <span>Copia</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div
                                                    onClick={() => navigate('/login')}
                                                    className="flex items-center justify-between bg-white dark:bg-gray-800 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-650 cursor-pointer hover:border-scout-green transition-colors group"
                                                >
                                                    <span className="font-mono text-sm text-gray-400 blur-[3px] select-none">
                                                        +39 333 •••••••
                                                    </span>
                                                    <span className="text-[10px] font-bold text-scout-blue group-hover:underline">
                                                        Accedi per visualizzare
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Note se presenti */}
                                        {c.notes && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 italic bg-white/60 dark:bg-gray-800/60 p-2 rounded-lg border border-gray-100 dark:border-gray-700/60">
                                                💬 {c.notes}
                                            </p>
                                        )}
                                    </div>

                                    {/* Action Buttons per singolo contatto */}
                                    <div className="flex gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => currentUser ? window.open(`tel:${c.value}`) : navigate('/login')}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-scout-green hover:bg-scout-green-dark active:scale-95 text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow-sm transition-all cursor-pointer"
                                        >
                                            <Phone size={13} />
                                            Chiama
                                        </button>
                                        {isWhatsapp && (
                                            <button
                                                type="button"
                                                onClick={() => currentUser ? window.open(`https://wa.me/${cleanPhoneForWhatsapp(c.value)}`) : navigate('/login')}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow-sm transition-all cursor-pointer"
                                            >
                                                <MessageCircle size={13} />
                                                WhatsApp
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Sezione Indirizzi Email */}
            {emailList.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-gray-100 dark:border-gray-700">
                        <div>
                            <h2 className="font-black text-sm uppercase tracking-wider flex items-center gap-2 text-gray-900 dark:text-white">
                                <Mail size={16} className="text-scout-blue" />
                                {emailList.length > 1 ? `Indirizzi Email (${emailList.length})` : 'Indirizzo Email'}
                            </h2>
                            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                                Recapiti telematici per richieste disponibilità, contratti e preventivi
                            </p>
                        </div>
                        {emailList.length > 1 && (
                            <span className="self-start sm:self-auto text-[10px] font-bold text-scout-blue dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 px-2.5 py-1 rounded-full">
                                {emailList.length} indirizzi disponibili
                            </span>
                        )}
                    </div>

                    <div className="space-y-2.5">
                        {emailList.map((em, idx) => (
                            <div
                                key={idx}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-750 border border-gray-150 dark:border-gray-650"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-scout-blue flex items-center justify-center shrink-0">
                                        <Mail size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-xs sm:text-sm font-mono font-bold text-gray-900 dark:text-white truncate block">
                                            {em}
                                        </span>
                                        {emailList.length > 1 && (
                                            <span className="text-[10px] text-gray-400 font-medium">
                                                Email #{idx + 1}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <a
                                        href={`mailto:${em}`}
                                        className="inline-flex items-center justify-center gap-1.5 bg-scout-blue hover:bg-blue-700 active:scale-95 text-white text-xs font-bold py-2 px-3 rounded-xl transition-all shadow-xs"
                                    >
                                        <Mail size={13} /> Scrivi
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => handleCopyEmail(em)}
                                        className="inline-flex items-center justify-center gap-1.5 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-600 transition-all cursor-pointer"
                                    >
                                        {copiedEmail === em ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                                        {copiedEmail === em ? 'Copiata!' : 'Copia'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* LE ORME: Recent Reviews & Comments POPUP LIST */}
            {reviews.length > 0 && (
                <div className="space-y-4 pt-4">
                    <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center justify-between px-1">
                       <span className="flex items-center gap-2">
                           <MessageSquare className="text-scout-blue" size={20} />
                           Commenti Recenti
                       </span>
                    </h2>
                    
                    <div className="space-y-3">
                        {reviews.slice(0, 3).map(review => (
                            <div key={review.id} className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-scout-green/10 flex items-center justify-center font-black text-xs text-scout-green overflow-hidden">
                                        {review.userProfilePicture ? (
                                            <img src={review.userProfilePicture} alt={review.userNickname} className="w-full h-full object-cover" />
                                        ) : (
                                            review.userNickname?.charAt(0) || 'U'
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center">
                                            <p className="font-bold text-xs dark:text-white">{review.userNickname || 'Anonimo'}</p>
                                            <div className="flex items-center gap-1 text-amber-500 font-bold text-[10px]">
                                                <Star size={10} fill="currentColor" /> {( ( (review.ombra||0)+(review.legna||0)+(review.suolo||0)+(review.servizi||0)+(review.sicurezza||0) ) / 5).toFixed(1)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50/50 dark:bg-gray-900/40 p-3 rounded-2xl">
                                    {review.commento ? `"${review.commento}"` : "Nessun commento testuale."}
                                </p>
                            </div>
                         ))}
                    </div>
                </div>
            )}

            {/* Pricing Section */}
            {location.pricing && (
                <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
                    <h2 className="font-black text-xs uppercase tracking-widest flex items-center gap-2 text-scout-brown">
                        <Euro size={16} /> Prezzi e Tariffe
                    </h2>
                    <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-3xl font-black text-gray-900 dark:text-white">{location.pricing.basePrice}€</span>
                        <span className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
                            {location.pricing.unit === 'per_night' ? 'a notte' : 'al giorno'} / {location.pricing.target === 'per_group' ? 'gruppo' : 'persona'}
                        </span>
                        {location.pricing.target === 'per_group' ? (
                            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/40">
                                👥 Tariffa fissa per l'intero gruppo
                            </span>
                        ) : (
                            <span className="text-[10px] font-bold text-scout-blue dark:text-sky-400 bg-blue-50 dark:bg-sky-950/40 px-2 py-0.5 rounded-full border border-blue-200 dark:border-sky-800/40">
                                👤 Tariffa a persona (pro capite)
                            </span>
                        )}
                    </div>
                    {location.pricing.description && (
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-600">
                            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: location.pricing.description }}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Details Grid */}
            <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6">
                    <h2 className="font-black text-xs uppercase tracking-widest mb-4">Caratteristiche</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
                            <BedDouble size={18} className="text-gray-400" />
                            <span>{location.beds ? `${location.beds} posti letto` : 'No posti letto'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
                            <Tent size={18} className={location.hasTents ? "text-green-600" : "text-gray-400"} />
                            <span className={location.hasTents ? "text-scout-green" : "text-gray-400"}>{location.hasTents ? 'Tende OK' : 'No tende'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
                            <Coffee size={18} className={location.hasRefectory ? "text-scout-brown" : "text-gray-400"} />
                            <span>{location.hasRefectory ? 'Refettorio OK' : 'No refettorio'}</span>
                        </div>
                        {location.hasRoverService && (
                            <div className="flex items-center gap-2 text-xs font-black text-scout-brown col-span-2 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-2xl border border-orange-100 dark:border-orange-800">
                                <ShieldAlert size={18} />
                                <span>RS: {location.roverServiceDescription || 'Disponibile'}</span>
                            </div>
                        )}
                        <div className="col-span-2 grid grid-cols-2 gap-2 mt-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                            {location.hasChurch && <span className="text-[10px] font-black uppercase bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded-lg">⛪ Chiesa</span>}
                            {location.hasGreenSpace && <span className="text-[10px] font-black uppercase bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded-lg">🌳 Spazi Verdi</span>}
                            {location.hasEquippedKitchen && <span className="text-[10px] font-black uppercase bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded-lg">🍳 Cucina OK</span>}
                            {location.hasPoles && <span className="text-[10px] font-black uppercase bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded-lg">🪵 Paletti OK</span>}
                            {location.hasDisabledAccess && <span className="text-[10px] font-black uppercase bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded-lg col-span-2">♿ Accessibile Disabili</span>}
                        </div>
                    </div>
                </div>

                {/* Restrictions */}
                {location.restrictions.length > 0 && (
                    <div className="p-6 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200 text-xs">
                        <h3 className="font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                            <ShieldAlert size={16} /> Vincoli
                        </h3>
                        <ul className="space-y-2 ml-1 font-bold opacity-90 uppercase tracking-tighter">
                            {location.restrictions.map((r, i) => {
                                const isSilence = r.toLowerCase().includes('silenzio');
                                return (
                                    <li key={i} className={`flex items-center gap-2 ${
                                        isSilence 
                                            ? 'bg-red-100/70 dark:bg-red-950/70 p-2.5 rounded-xl border border-red-200 dark:border-red-800 text-red-950 dark:text-red-100 normal-case tracking-normal font-bold shadow-2xs' 
                                            : ''
                                    }`}>
                                        {isSilence ? (
                                            <span className="text-base leading-none shrink-0">🌙</span>
                                        ) : (
                                            <X size={10} className="shrink-0" />
                                        )}
                                        <span>{r}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>

            {/* Attenzioni e Aspetti Critici del Luogo */}
            {hasAnyAttention && (
                <div className="bg-orange-50/80 dark:bg-orange-950/30 rounded-[2rem] border border-orange-200 dark:border-orange-800/60 p-6 space-y-4 shadow-2xs">
                    <div className="flex items-center gap-2.5 text-orange-900 dark:text-orange-200 pb-2 border-b border-orange-200/60 dark:border-orange-800/50">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/60 rounded-xl text-orange-600 dark:text-orange-400">
                            <ShieldAlert size={18} />
                        </div>
                        <div>
                            <h2 className="font-black text-xs uppercase tracking-widest">
                                Attenzioni e Aspetti Critici del Luogo
                            </h2>
                            <p className="text-[11px] text-orange-700/90 dark:text-orange-300/80 font-medium mt-0.5">
                                Segnalazioni di sicurezza, fauna e territorio indicate dai capi
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {location.hasPastures && (
                            <div className="flex items-center gap-2.5 p-3 bg-white/90 dark:bg-gray-800/90 rounded-xl border border-orange-200/80 dark:border-orange-800/50 text-xs font-bold text-gray-800 dark:text-gray-200">
                                <span className="text-lg leading-none">🐑</span>
                                <span>Pascoli e Greggi (cani da pastore)</span>
                            </div>
                        )}
                        {location.hasInsects && (
                            <div className="flex items-center gap-2.5 p-3 bg-white/90 dark:bg-gray-800/90 rounded-xl border border-orange-200/80 dark:border-orange-800/50 text-xs font-bold text-gray-800 dark:text-gray-200">
                                <span className="text-lg leading-none">🐝</span>
                                <span>Calabroni / Tafani / Vespe / Mosche</span>
                            </div>
                        )}
                        {location.hasDiseases && (
                            <div className="flex items-center gap-2.5 p-3 bg-white/90 dark:bg-gray-800/90 rounded-xl border border-orange-200/80 dark:border-orange-800/50 text-xs font-bold text-gray-800 dark:text-gray-200">
                                <span className="text-lg leading-none">🦠</span>
                                <span>Parassiti e Malattie (zecche, leishmania)</span>
                            </div>
                        )}
                        {location.hasLittleShade && (
                            <div className="flex items-center gap-2.5 p-3 bg-white/90 dark:bg-gray-800/90 rounded-xl border border-orange-200/80 dark:border-orange-800/50 text-xs font-bold text-gray-800 dark:text-gray-200">
                                <span className="text-lg leading-none">☀️</span>
                                <span>Poche zone d'ombra (molto esposto al sole)</span>
                            </div>
                        )}
                        {location.hasVeryBusyArea && (
                            <div className="flex items-center gap-2.5 p-3 bg-white/90 dark:bg-gray-800/90 rounded-xl border border-orange-200/80 dark:border-orange-800/50 text-xs font-bold text-gray-800 dark:text-gray-200">
                                <span className="text-lg leading-none">👥</span>
                                <span>Zona molto frequentata / turistica</span>
                            </div>
                        )}
                    </div>

                    {location.otherAttention && (
                        <div className="p-3.5 bg-white/95 dark:bg-gray-800/95 rounded-xl border border-orange-200/80 dark:border-orange-800/50 text-xs text-gray-700 dark:text-gray-300">
                            <strong className="text-orange-950 dark:text-orange-200 block mb-1 font-bold">
                                💬 Altre note specifiche di attenzione:
                            </strong>
                            <p className="italic leading-relaxed">"{location.otherAttention}"</p>
                        </div>
                    )}
                </div>
            )}

            {/* Quick Note */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-[2rem] border border-yellow-100 dark:border-yellow-800 text-xs font-medium text-yellow-900 dark:text-yellow-200 italic leading-relaxed">
                "{location.quickNote}"
            </div>

            {/* Review Modal */}
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

            {/* Contact Picker Modal */}
            {showContactPickerModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
                            <div>
                                <h3 className="font-black text-base text-gray-900 dark:text-white">
                                    Seleziona Recapito
                                </h3>
                                <p className="text-xs text-gray-400 font-medium">
                                    Questa struttura dispone di {phoneContacts.length} numeri di riferimento
                                </p>
                            </div>
                            <button
                                onClick={() => setShowContactPickerModal(false)}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {phoneContacts.map((c, idx) => {
                                const isWhatsapp = c.isWhatsapp !== false && c.type !== 'email';
                                return (
                                    <div
                                        key={idx}
                                        className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-700/50 border border-gray-150 dark:border-gray-650 space-y-2.5"
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
                                                onClick={() => {
                                                    setShowContactPickerModal(false);
                                                    window.open(`tel:${c.value}`);
                                                }}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-scout-green hover:bg-scout-green-dark text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer"
                                            >
                                                <Phone size={13} /> Chiama
                                            </button>
                                            {isWhatsapp && (
                                                <button
                                                    onClick={() => {
                                                        setShowContactPickerModal(false);
                                                        window.open(`https://wa.me/${cleanPhoneForWhatsapp(c.value)}`);
                                                    }}
                                                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer"
                                                >
                                                    <MessageCircle size={13} /> WhatsApp
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Email Picker Modal */}
            {showEmailPickerModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
                            <div>
                                <h3 className="font-black text-base text-gray-900 dark:text-white flex items-center gap-2">
                                    <Mail className="text-scout-blue" size={18} /> Seleziona Email
                                </h3>
                                <p className="text-xs text-gray-400 font-medium mt-0.5">
                                    Questa struttura dispone di {emailList.length} indirizzi email
                                </p>
                            </div>
                            <button
                                onClick={() => setShowEmailPickerModal(false)}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-2.5">
                            {emailList.map((em, idx) => (
                                <div
                                    key={idx}
                                    className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-700/50 border border-gray-150 dark:border-gray-650 space-y-2.5"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <span className="text-[10px] uppercase font-bold text-gray-400 block">
                                                Email #{idx + 1}
                                            </span>
                                            <span className="text-xs font-mono font-bold text-gray-900 dark:text-white truncate block">
                                                {em}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <button
                                            onClick={() => {
                                                setShowEmailPickerModal(false);
                                                window.open(`mailto:${em}`);
                                            }}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-scout-blue hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer"
                                        >
                                            <Mail size={13} /> Invia Email
                                        </button>
                                        <button
                                            onClick={() => handleCopyEmail(em)}
                                            className="inline-flex items-center justify-center gap-1.5 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-600 transition-colors cursor-pointer"
                                        >
                                            {copiedEmail === em ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                                            {copiedEmail === em ? 'Copiata!' : 'Copia'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Actions */}
            {currentUser ? (
                <div className="space-y-3 mt-8">
                    <button
                        onClick={() => navigate(`/edit/${location.id}`)}
                        className="w-full bg-white dark:bg-gray-800 border-2 border-scout-green text-scout-green font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-green-900/5 active:scale-95 transition-all text-sm"
                    >
                        <Edit size={20} />
                        Modifica Luogo
                    </button>

                    <button
                        onClick={async () => {
                            if (confirm("Conferma di voler eliminare definitivamente questo luogo?")) {
                                const success = await deleteLocation(location.id);
                                if (success) {
                                    alert("Luogo eliminato con successo!");
                                    navigate('/');
                                } else {
                                    alert("Errore durante l'eliminazione.");
                                }
                            }
                        }}
                        className="w-full text-red-550 font-black py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-xs uppercase tracking-widest"
                    >
                        <ShieldAlert size={18} />
                        Elimina Luogo
                    </button>
                </div>
            ) : (
                <div className="mt-8 p-8 bg-scout-beige/20 dark:bg-gray-800 border-2 border-dashed border-scout-green/30 rounded-[2.5rem] text-center space-y-4">
                    <Footprints className="text-scout-green mx-auto mb-2" size={32} />
                    <p className="text-sm font-bold text-gray-600 dark:text-gray-300 max-w-xs mx-auto">
                        Vuoi contribuire con la tua recensione o contattare il gestore?
                    </p>
                    <Link to="/register" className="inline-block bg-scout-green text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-green-900/20 active:scale-95 transition-all">
                        Registrati Gratis
                    </Link>
                </div>
            )}

            {/* Platform Compliance */}
            <div className="pt-8 border-t border-gray-100 dark:border-gray-800 text-center">
                <button 
                    onClick={() => alert("Segnalazione inviata con successo.")}
                    className="text-[9px] font-black text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors uppercase tracking-[0.2em]"
                >
                    Segnala Contenuto Errato o Inappropriato
                </button>
            </div>
        </div >
    );
}
