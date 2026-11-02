import { MapPin, Tent, BedDouble, AlertCircle, Wrench, Ban, Star, Home, Euro } from 'lucide-react';
import { Location, PricingInfo } from '@/types';
import { Link } from 'react-router-dom';
import { cn, getStalenessInfo } from '@/lib/utils';

interface LocationCardProps {
    location: Location;
    unreadModificationsCount?: number;
}

const availabilityConfig = {
    maintenance: {
        banner: 'bg-amber-500 text-white dark:bg-amber-600',
        text: 'text-white',
        icon: Wrench,
        label: 'In Manutenzione',
    },
    closed: {
        banner: 'bg-red-600 text-white dark:bg-red-700',
        text: 'text-white',
        icon: Ban,
        label: 'Momentaneamente Chiuso',
    },
};

/**
 * Formatta fedelmente il riepilogo del prezzo secondo le specifiche UX:
 * - Distingue persona/gruppo e giorno/notte
 * - Se non c'è prezzo non inventa 'Gratis' e non mostra placeholder vuoti
 * - Se ci sono solo note testuali mostra 'Tariffa indicata nelle note'
 */
function formatPriceSummary(pricing?: PricingInfo): string | null {
    if (!pricing) return null;
    if (typeof pricing.basePrice === 'number' && pricing.basePrice > 0) {
        const targetStr = pricing.target === 'per_group' ? 'gruppo' : 'persona';
        const unitStr = pricing.unit === 'per_day' ? 'giorno' : 'notte';
        return `${pricing.basePrice} € / ${targetStr} / ${unitStr}`;
    }
    if (pricing.description && pricing.description.trim().length > 0) {
        return 'Tariffa indicata nelle note';
    }
    return null;
}

/**
 * Formatta la data effettiva dell'ultima modifica (es. "02 nov 2026")
 */
function formatLastUpdated(dateStr?: string): string | null {
    if (!dateStr) return null;
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return null;
    }
}

export default function LocationCard({ location, unreadModificationsCount }: LocationCardProps) {
    const staleness = getStalenessInfo(location.lastUpdatedAt);
    const status = location.availabilityStatus || 'available';
    const avail = status !== 'available' ? availabilityConfig[status as 'maintenance' | 'closed'] : null;
    const priceText = formatPriceSummary(location.pricing);
    const lastUpdatedFormatted = formatLastUpdated(location.lastUpdatedAt);

    const hasReviews = location.reviewsCount > 0;
    const avgRatingNumber = Number(location.avgRating || 0);

    return (
        <Link 
            to={`/location/${location.id}`} 
            className="block relative group focus:outline-none select-none"
        >
            <div className={cn(
                "bg-white dark:bg-gray-800 rounded-2xl shadow-xs border transition-all duration-200 active:scale-[0.99] relative overflow-hidden flex flex-col justify-between h-full",
                avail 
                    ? "border-amber-300 dark:border-amber-700" 
                    : "border-gray-200 dark:border-gray-700 hover:border-scout-green hover:shadow-md dark:hover:border-emerald-500/70"
            )}>
                {/* Banner disponibilità speciale */}
                {avail && (
                    <div className={`flex items-center justify-center gap-1.5 py-1.5 px-3 font-bold text-xs ${avail.banner}`}>
                        <avail.icon size={14} className={avail.text} />
                        <span className={avail.text}>{avail.label}</span>
                    </div>
                )}

                <div className="p-4 sm:p-5 flex-1 flex flex-col">
                    {/* 1. Nome del Luogo: Primo elemento per scansione immediata */}
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-lg sm:text-xl text-gray-900 dark:text-gray-100 group-hover:text-scout-green dark:group-hover:text-emerald-400 transition-colors leading-snug">
                            {location.name}
                        </h3>

                        {/* Eventuale etichetta Novità non lette */}
                        {unreadModificationsCount !== undefined && unreadModificationsCount > 0 && (
                            <span 
                                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50 shadow-2xs animate-pulse"
                                title={`${unreadModificationsCount} novità non lette`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                                <span>{unreadModificationsCount === 1 ? 'Novità' : `${unreadModificationsCount} novità`}</span>
                            </span>
                        )}
                    </div>

                    {/* 2. Località: Comune (Provincia) · Regione */}
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5 mt-1">
                        <MapPin size={14} className="text-scout-green dark:text-emerald-400 shrink-0" />
                        <span className="truncate">
                            {location.commune}{location.province ? ` (${location.province})` : ''} · {location.region}
                        </span>
                    </div>

                    {/* 3. Breve descrizione (senza corsivo forzato, testo pulito) */}
                    {location.quickNote && (
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed mt-2.5">
                            {location.quickNote}
                        </p>
                    )}

                    {/* 4. Tariffa indicata (mostrata solo se documentata) */}
                    {priceText && (
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-scout-green dark:text-emerald-400 mt-2.5">
                            <Euro size={14} className="shrink-0 text-scout-green/80 dark:text-emerald-400" />
                            <span>{priceText}</span>
                        </div>
                    )}

                    {/* Spaziatore flessibile */}
                    <div className="flex-1 min-h-3" />

                    {/* 5. Caratteristiche e dotazioni del luogo */}
                    <div className="flex flex-wrap gap-1.5 pt-3 mt-1 border-t border-gray-100 dark:border-gray-700/60 text-xs font-semibold">
                        {location.hasTents && (
                            <span className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-emerald-200/80">
                                <Tent size={13} className="text-emerald-600 dark:text-emerald-400" />
                                Tende
                            </span>
                        )}
                        {location.beds !== undefined && location.beds > 0 && (
                            <span className="bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-blue-200/80">
                                <BedDouble size={13} className="text-blue-600 dark:text-blue-400" />
                                {location.beds} letti
                            </span>
                        )}
                        {location.accantonamentoCapacity !== undefined && location.accantonamentoCapacity > 0 && (
                            <span className="bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-amber-200/80">
                                <Home size={13} className="text-amber-600 dark:text-amber-400" />
                                {location.accantonamentoCapacity} a terra
                            </span>
                        )}
                        {location.restrictions && location.restrictions.length > 0 && (
                            <span className="bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-red-200/80">
                                <AlertCircle size={13} className="text-red-600 dark:text-red-400" />
                                {location.restrictions.length} {location.restrictions.length === 1 ? 'regola' : 'regole'}
                            </span>
                        )}
                    </div>

                    {/* 6. Piede Card: Recensioni e Data di Modifica Factual */}
                    <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-gray-100 dark:border-gray-700/60 text-xs">
                        {/* Recensioni */}
                        <div className="flex items-center gap-1.5">
                            {hasReviews ? (
                                <>
                                    <span className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-400">
                                        <Star size={13} className="fill-amber-400 text-amber-500" />
                                        {avgRatingNumber.toFixed(1)}
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400 font-medium">
                                        ({location.reviewsCount})
                                    </span>
                                </>
                            ) : (
                                <span className="text-gray-400 dark:text-gray-500 text-[11px] font-medium">
                                    Nessuna recensione
                                </span>
                            )}
                        </div>

                        {/* Data ultima modifica fattuale */}
                        {lastUpdatedFormatted && (
                            <div 
                                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400"
                                title={`Ultima modifica registrata: ${lastUpdatedFormatted}`}
                            >
                                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", staleness.color)} />
                                <span>Modificato: {lastUpdatedFormatted}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
