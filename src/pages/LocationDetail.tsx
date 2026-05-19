import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Phone, MessageCircle, Map, ArrowLeft, BedDouble, Tent, Coffee, ShieldAlert, Edit, Euro, Wrench, Ban, Star, Footprints, MessageSquare, X, Droplets, Flame, Wind, ShieldCheck, Users } from 'lucide-react';
import { getLocations, getUser, getReviews, saveReview } from '@/lib/data';
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

    useEffect(() => {
        const loadData = async () => {
            try {
                const locs = await getLocations();
                const found = locs.find(l => l.id === id);
                if (found) {
                    setLocation(found);
                    const revs = await getReviews(found.id);
                    setReviews(revs);
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
    const phone = location.contacts.find(c => c.type === 'phone')?.value;
    const whatsapp = location.contacts.find(c => c.type === 'whatsapp')?.value || phone;

    const updatedByText = updaterInfo ? `da ${updaterInfo.nickname}${updaterInfo.groupName ? ` - ${updaterInfo.groupName}` : ''}` : '';

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
            <div className="grid grid-cols-3 gap-3">
                {phone && (
                    <button 
                        onClick={() => currentUser ? window.open(`tel:${phone}`) : navigate('/login')}
                        className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all text-center"
                    >
                        <Phone className={cn("text-scout-green mb-1", !currentUser && "blur-[2px]")} size={24} />
                        <span className="text-[10px] font-black uppercase dark:text-gray-300">{currentUser ? 'Chiama' : 'Accedi'}</span>
                    </button>
                )}
                {whatsapp && (
                    <button 
                        onClick={() => currentUser ? window.open(`https://wa.me/${whatsapp}`) : navigate('/login')}
                        className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all text-center"
                    >
                        <MessageCircle className={cn("text-green-500 mb-1", !currentUser && "blur-[2px]")} size={24} />
                        <span className="text-[10px] font-black uppercase dark:text-gray-300">{currentUser ? 'WhatsApp' : 'Accedi'}</span>
                    </button>
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
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-gray-900 dark:text-white">{location.pricing.basePrice}€</span>
                        <span className="text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-tighter">
                            {location.pricing.unit === 'per_night' ? 'a notte' : 'al giorno'} / persona
                        </span>
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
                        </div>
                    </div>
                </div>

                {/* Restrictions */}
                {location.restrictions.length > 0 && (
                    <div className="p-6 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200 text-xs">
                        <h3 className="font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                            <ShieldAlert size={16} /> Vincoli
                        </h3>
                        <ul className="space-y-2 ml-1 font-bold opacity-80 uppercase tracking-tighter">
                            {location.restrictions.map((r, i) => <li key={i} className="flex items-center gap-1.5"><X size={10} /> {r}</li>)}
                        </ul>
                    </div>
                )}
            </div>

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
                            if (confirm("Conferma di voler eliminare questo luogo? La richiesta sarà inviata agli altri capi.")) {
                                const { createProposal } = await import('@/lib/proposals');
                                await createProposal('delete', location.id, location.name);
                                alert("Richiesta di eliminazione inviata!");
                            }
                        }}
                        className="w-full text-red-500 font-black py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-xs uppercase tracking-widest"
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
