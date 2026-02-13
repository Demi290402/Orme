
import { MapPin, Tent, BedDouble, AlertCircle } from 'lucide-react';
import { Location } from '@/types';
import { Link } from 'react-router-dom';

interface LocationCardProps {
    location: Location;
}

export default function LocationCard({ location }: LocationCardProps) {
    return (
        <Link to={`/location/${location.id}`} className="block">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow active:scale-[0.98] transition-transform">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-scout-green-dark line-clamp-1">{location.name}</h3>
                    <span className="bg-scout-beige-light text-scout-brown text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap">
                        {location.region}
                    </span>
                </div>

                <div className="text-gray-500 text-sm mb-3 flex items-center gap-1">
                    <MapPin size={14} className="text-scout-green" />
                    <span className="truncate">{location.commune}</span>
                </div>

                <p className="text-sm text-gray-600 mb-3 line-clamp-2 italic">
                    "{location.quickNote}"
                </p>

                <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                    {location.beds !== undefined && (
                        <span className="bg-gray-100 px-2 py-1 rounded-md flex items-center gap-1">
                            <BedDouble size={12} /> {location.beds} max
                        </span>
                    )}
                    {location.hasTents && (
                        <span className="bg-green-50 text-green-700 px-2 py-1 rounded-md flex items-center gap-1 border border-green-100">
                            <Tent size={12} /> Tende
                        </span>
                    )}
                    {location.restrictions.length > 0 && (
                        <span className="bg-red-50 text-red-700 px-2 py-1 rounded-md flex items-center gap-1 border border-red-100">
                            <AlertCircle size={12} /> {location.restrictions.length} vincoli
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}
