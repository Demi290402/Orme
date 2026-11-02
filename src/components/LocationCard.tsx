import { MapPin, Star, Wrench, Ban } from 'lucide-react';
import { Location } from '@/types';
import { Link } from 'react-router-dom';
import { cn, getStalenessInfo, formatPriceSummary, formatDateItalian } from '@/lib/utils';

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

export default function LocationCard({ location, unreadModificationsCount }: LocationCardProps) {
    const staleness = getStalenessInfo(location.lastUpdatedAt);
    const status = location.availabilityStatus || 'available';
    const avail = status !== 'available' ? availabilityConfig[status as 'maintenance' | 'closed'] : null;
    const priceText = formatPriceSummary(location.pricing);
    const formattedDate = formatDateItalian(location.lastUpdatedAt);

    // Costruisci stringa località "Comune (Provincia) · Regione"
    const locationSubtitle = [
        location.commune ? `${location.commune}${location.province ? ` (${location.province})` : ''}` : (location.province ? `(${location.province})` : ''),
        location.region
    ].filter(Boolean).join(' · ');

    const hasReviews = location.reviewsCount > 0;
    const ratingNumber = Number(location.avgRating) || 0;
    const ratingFormatted = ratingNumber > 0 ? ratingNumber.toFixed(1) : null;
    const reviewsLabel = location.reviewsCount === 1 ? 'recensione' : 'recensioni';

    return (
        <Link 
            to={`/location/${location.id}`} 
            className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-scout-green dark:focus-visible:ring-emerald-400 rounded-2xl transition-transform active:scale-[0.99]"
            aria-label={`Apri scheda del luogo ${location.name}`}
        >
            <article className={cn(
                "bg-white dark:bg-[#182932] rounded-2xl p-5 border transition-all duration-200 shadow-xs flex flex-col justify-between h-full relative overflow-hidden",
                avail 
                    ? "border-amber-300 dark:border-amber-700" 
                    : "border-gray-200 dark:border-gray-700/80 hover:border-scout-green dark:hover:border-emerald-500/70 hover:shadow-md"
            )}>
                {/* Banner disponibilità speciale */}
                {avail && (
                    <div className={`-mt-5 -mx-5 mb-4 flex items-center justify-center gap-1.5 py-1.5 px-3 font-bold text-xs ${avail.banner}`}>
                        <avail.icon size={14} className={avail.text} />
                        <span className={avail.text}>{avail.label}</span>
                    </div>
                )}

                <div className="space-y-2.5">
                    {/* 1. Nome del luogo per primo (senza badge concorrenti sulla stessa riga) */}
                    <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg sm:text-xl font-semibold leading-snug text-gray-900 dark:text-[#F1F6F2] group-hover:text-scout-green dark:group-hover:text-emerald-400 transition-colors break-words">
                            {location.name}
                        </h3>

                        {/* Eventuali novità non lette etichettate separatamente */}
                        {unreadModificationsCount !== undefined && unreadModificationsCount > 0 && (
                            <span 
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border border-red-300 dark:border-red-800 shrink-0"
                                title={`${unreadModificationsCount} novità da leggere per questo luogo`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping shrink-0" />
                                <span>Novità da leggere</span>
                            </span>
                        )}
                    </div>

                    {/* 2. Comune, provincia e regione */}
                    <div className="text-sm font-medium text-gray-500 dark:text-[#ACBCB2] flex items-center gap-1.5 flex-wrap">
                        <MapPin size={15} className="text-scout-green dark:text-emerald-400 shrink-0" aria-hidden="true" />
                        <span>{locationSubtitle}</span>
                    </div>

                    {/* 3. Breve descrizione (testo normale, non corsivo, nessuna scatola pesante) */}
                    {location.quickNote && location.quickNote.trim().length > 0 && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                            {location.quickNote.trim()}
                        </p>
                    )}

                    {/* 4. Tariffa indicata (mostrata SOLO quando documentata, zero footprint se assente) */}
                    {priceText && (
                        <div className="pt-0.5">
                            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-scout-green-dark dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200/60 dark:border-emerald-800/50">
                                <span aria-hidden="true">💰</span>
                                <span>{priceText}</span>
                            </span>
                        </div>
                    )}

                    {/* 5. Dotazioni strutturate essenziali */}
                    <div className="flex flex-wrap gap-1.5 pt-1 text-xs font-semibold">
                        {location.hasTents && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700/70 text-gray-700 dark:text-gray-300 border border-gray-200/70 dark:border-gray-600">
                                🏕️ Tende
                            </span>
                        )}
                        {location.beds !== undefined && location.beds > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700/70 text-gray-700 dark:text-gray-300 border border-gray-200/70 dark:border-gray-600">
                                🛏️ {location.beds} letti
                            </span>
                        )}
                        {location.accantonamentoCapacity !== undefined && location.accantonamentoCapacity > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700/70 text-gray-700 dark:text-gray-300 border border-gray-200/70 dark:border-gray-600">
                                🏠 {location.accantonamentoCapacity} accantonamento
                            </span>
                        )}
                        {location.hasEquippedKitchen && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700/70 text-gray-700 dark:text-gray-300 border border-gray-200/70 dark:border-gray-600">
                                🍳 Cucina
                            </span>
                        )}
                        {location.hasHeating && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700/70 text-gray-700 dark:text-gray-300 border border-gray-200/70 dark:border-gray-600">
                                🔥 Riscaldato
                            </span>
                        )}
                        {location.hasWaterPoints && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700/70 text-gray-700 dark:text-gray-300 border border-gray-200/70 dark:border-gray-600">
                                🚰 Punti d'acqua
                            </span>
                        )}
                        {location.hasDisabledAccess && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700/70 text-gray-700 dark:text-gray-300 border border-gray-200/70 dark:border-gray-600">
                                ♿ Disabili
                            </span>
                        )}
                    </div>
                </div>

                {/* 6. Piede dell'anteprima: Recensioni + Data esatta di modifica */}
                <div className="pt-3 mt-3 border-t border-gray-150 dark:border-gray-700/60 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 gap-2 flex-wrap">
                    {/* Recensioni */}
                    <div>
                        {hasReviews && ratingFormatted ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-300">
                                <Star size={13} className="fill-amber-400 text-amber-500 shrink-0" aria-hidden="true" />
                                <span className="font-bold text-gray-900 dark:text-white">{ratingFormatted}</span>
                                <span>({location.reviewsCount} {reviewsLabel})</span>
                            </span>
                        ) : (
                            <span className="text-gray-400 dark:text-gray-500">Nessuna recensione</span>
                        )}
                    </div>

                    {/* Data modifica precisa con indicatore freschezza */}
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-medium" title={staleness.label}>
                        <span className={cn("w-2 h-2 rounded-full shrink-0", staleness.color)} aria-hidden="true" />
                        <span>Modificato: {formattedDate}</span>
                    </div>
                </div>
            </article>
        </Link>
    );
}
