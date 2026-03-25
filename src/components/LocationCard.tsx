
import { MapPin, Tent, BedDouble, AlertCircle, Wrench, Ban } from 'lucide-react';
import { Location } from '@/types';
import { Link } from 'react-router-dom';
import { getStalenessInfo } from '@/lib/utils';

interface LocationCardProps {
    location: Location;
}

const availabilityConfig = {
    maintenance: {
        banner: 'bg-amber-400/90 dark:bg-amber-500/80',
        text: 'text-amber-950 dark:text-amber-950',
        icon: Wrench,
        label: 'In manutenzione',
    },
    closed: {
        banner: 'bg-red-500/90 dark:bg-red-600/80',
        text: 'text-white',
        icon: Ban,
        label: 'Non disponibile',
    },
};

export default function LocationCard({ location }: LocationCardProps) {
    const staleness = getStalenessInfo(location.lastUpdatedAt);
    const status = location.availabilityStatus || 'available';
    const avail = status !== 'available' ? availabilityConfig[status as 'maintenance' | 'closed'] : null;

    return (
        <Link to={`/location/${location.id}`} className="block">
            <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border overflow-hidden hover:shadow-md dark:shadow-none transition-shadow active:scale-[0.98] transition-transform ${avail ? 'border-amber-300 dark:border-amber-700' : 'border-gray-100 dark:border-gray-700'}`}>
                {/* Availability Banner */}
                {avail && (
                    <div className={`flex items-center justify-center gap-1.5 py-1.5 px-3 ${avail.banner}`}>
                        <avail.icon size={13} className={avail.text} />
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${avail.text}`}>{avail.label}</span>
                    </div>
                )}

                <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${staleness.color}`} title="Stato aggiornamento dati" />
                            <h3 className="font-bold text-lg text-scout-green-dark dark:text-emerald-400 line-clamp-1">{location.name}</h3>
                        </div>
                        <span className="bg-scout-beige-light dark:bg-amber-900/40 text-scout-brown dark:text-amber-300 text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap">
                            {location.region}
                        </span>
                    </div>

                    <div className="text-gray-500 dark:text-gray-400 text-sm mb-3 flex items-center gap-1">
                        <MapPin size={14} className="text-scout-green dark:text-emerald-500" />
                        <span className="truncate">{location.commune}</span>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2 italic">
                        "{location.quickNote}"
                    </p>

                    <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
                        {location.beds !== undefined && (
                            <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md flex items-center gap-1">
                                <BedDouble size={12} /> {location.beds} max
                            </span>
                        )}
                        {location.hasTents && (
                            <span className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 px-2 py-1 rounded-md flex items-center gap-1 border border-green-100">
                                <Tent size={12} /> Tende
                            </span>
                        )}
                        {location.restrictions.length > 0 && (
                            <span className="bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 px-2 py-1 rounded-md flex items-center gap-1 border border-red-100">
                                <AlertCircle size={12} /> {location.restrictions.length} vincoli
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
