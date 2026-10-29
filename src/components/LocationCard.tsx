import { MapPin, Tent, BedDouble, AlertCircle, Wrench, Ban, Star, Eye, Home } from 'lucide-react';
import { Location } from '@/types';
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

export default function LocationCard({ location, unreadModificationsCount }: LocationCardProps) {
    const staleness = getStalenessInfo(location.lastUpdatedAt);
    const status = location.availabilityStatus || 'available';
    const avail = status !== 'available' ? availabilityConfig[status as 'maintenance' | 'closed'] : null;

    const getStalenessHumanLabel = (level: number) => {
        switch (level) {
            case 0: return 'Dati recenti';
            case 1: return 'Da verificare';
            case 2: return 'Dati non recenti';
            default: return 'Dati da aggiornare';
        }
    };

    return (
        <Link to={`/location/${location.id}`} className="block relative group focus:outline-none">
            <div className={cn(
                "bg-white dark:bg-gray-800 rounded-2xl shadow-xs border transition-all duration-200 active:scale-[0.99] relative overflow-hidden",
                avail 
                    ? "border-amber-300 dark:border-amber-700" 
                    : "border-gray-200 dark:border-gray-700 hover:border-scout-green hover:shadow-md dark:hover:border-emerald-500/70"
            )}>
                {/* Badge modifiche non lette per il gruppo */}
                {unreadModificationsCount !== undefined && unreadModificationsCount > 0 && (
                    <div 
                        className="absolute top-3 right-3 bg-red-600 text-white text-[11px] font-black min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full border-2 border-white dark:border-gray-800 shadow-md z-20 animate-pulse" 
                        title={`${unreadModificationsCount} modifiche recenti non lette`}
                    >
                        {unreadModificationsCount}
                    </div>
                )}

                {/* Banner disponibilità speciale */}
                {avail && (
                    <div className={`flex items-center justify-center gap-1.5 py-1.5 px-3 font-bold text-xs ${avail.banner}`}>
                        <avail.icon size={14} className={avail.text} />
                        <span className={avail.text}>{avail.label}</span>
                    </div>
                )}

                <div className="p-4 sm:p-5">
                    {/* Top Row: Staleness Badge + Regione */}
                    <div className="flex justify-between items-center gap-2 mb-2.5">
                        <div className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border",
                            staleness.bgLight,
                            staleness.text,
                            staleness.border,
                            "dark:bg-opacity-20"
                        )} title="Data ultimo aggiornamento informazioni">
                            <span className={cn("w-2 h-2 rounded-full shrink-0", staleness.color)} />
                            <span>{getStalenessHumanLabel(staleness.level)}</span>
                        </div>

                        <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs px-2.5 py-1 rounded-full font-bold whitespace-nowrap border border-amber-200/70 dark:border-amber-800/50">
                            {location.region}
                        </span>
                    </div>

                    {/* Titolo Principale */}
                    <h3 className="font-black text-lg sm:text-xl text-gray-900 dark:text-emerald-300 group-hover:text-scout-green dark:group-hover:text-emerald-400 transition-colors line-clamp-1 mb-1">
                        {location.name}
                    </h3>

                    {/* Comune & Provincia */}
                    <div className="text-gray-600 dark:text-gray-400 text-sm mb-3 flex items-center gap-1.5 font-medium">
                        <MapPin size={15} className="text-scout-green dark:text-emerald-500 shrink-0" />
                        <span className="truncate">{location.commune}{location.province ? ` (${location.province})` : ''}</span>
                    </div>

                    {/* Nota Rapida o Descrizione */}
                    {(location.quickNote || location.description) && (
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-3.5 line-clamp-2 italic bg-gray-50/80 dark:bg-gray-750/50 p-2.5 rounded-xl border border-gray-150 dark:border-gray-700/60 leading-relaxed">
                            "{location.quickNote || location.description}"
                        </p>
                    )}

                    {/* Recensioni, Visualizzazioni e Prezzo */}
                    <div className="flex items-center justify-between py-2 border-y border-gray-100 dark:border-gray-700/60 mb-3.5 text-xs">
                        <div className="flex items-center gap-2">
                            {location.reviewsCount > 0 ? (
                                <div className="flex items-center gap-1.5">
                                    <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md flex items-center gap-1 font-black border border-amber-200 dark:border-amber-800/40">
                                        <Star size={12} className="fill-amber-400 text-amber-500" />
                                        {Number(location.avgRating).toFixed(1)}
                                    </span>
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                        ({location.reviewsCount} {location.reviewsCount === 1 ? 'recensione' : 'recensioni'})
                                    </span>
                                </div>
                            ) : (
                                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                    <Star size={13} className="text-gray-300 dark:text-gray-600" />
                                    Nessuna recensione ancora
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            {location.viewsCount !== undefined && location.viewsCount > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 dark:text-gray-500" title={`${location.viewsCount} visualizzazioni su Orme`}>
                                    <Eye size={13} className="text-gray-400" />
                                    {location.viewsCount}
                                </span>
                            )}

                            {location.priceCategory > 0 && (
                                <div className="flex gap-0.5 font-black text-xs" title={`Fascia economica: ${location.priceCategory}/3`}>
                                    {[1, 2, 3].map(i => (
                                        <span 
                                            key={i} 
                                            className={i <= location.priceCategory ? "text-scout-green dark:text-emerald-400" : "text-gray-200 dark:text-gray-700"}
                                        >
                                            €
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Caratteristiche del Luogo: Badges Umani e Comprensibili */}
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                        {location.hasTents && (
                            <span className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-emerald-200">
                                <Tent size={14} className="text-emerald-600 dark:text-emerald-400" />
                                Spazio Tende
                            </span>
                        )}
                        {location.beds !== undefined && location.beds > 0 && (
                            <span className="bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-blue-200">
                                <BedDouble size={14} className="text-blue-600 dark:text-blue-400" />
                                {location.beds} Posti Letto
                            </span>
                        )}
                        {location.accantonamentoCapacity !== undefined && location.accantonamentoCapacity > 0 && (
                            <span className="bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-amber-200">
                                <Home size={14} className="text-amber-600 dark:text-amber-400" />
                                {location.accantonamentoCapacity} a terra (Stuoino)
                            </span>
                        )}
                        {location.restrictions && location.restrictions.length > 0 && (
                            <span className="bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60 px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-red-200">
                                <AlertCircle size={14} className="text-red-600 dark:text-red-400" />
                                {location.restrictions.length} {location.restrictions.length === 1 ? 'attenzione' : 'attenzioni / regole'}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
