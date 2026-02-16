import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Phone, MessageCircle, Map, ArrowLeft, BedDouble, Tent, Coffee, ShieldAlert, Edit, Euro, AlertTriangle } from 'lucide-react';
import { getLocations, getUser } from '@/lib/data';
import { Location } from '@/types';

export default function LocationDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [location, setLocation] = useState<Location | null>(null);

    useEffect(() => {
        getLocations().then(locs => {
            const found = locs.find(l => l.id === id);
            if (found) setLocation(found);
        }).catch(console.error);
    }, [id]);

    const [updaterNickname, setUpdaterNickname] = useState<string | null>(null);

    useEffect(() => {
        if (location?.lastUpdatedBy) {
            getUser(location.lastUpdatedBy).then(u => {
                setUpdaterNickname(u.nickname);
            }).catch(console.error);
        }
    }, [location]);

    if (!location) return <div className="p-8 text-center">Caricamento...</div>;

    const phone = location.contacts.find(c => c.type === 'phone')?.value;
    const whatsapp = location.contacts.find(c => c.type === 'whatsapp')?.value || phone;

    const updatedByText = updaterNickname ? `da ${updaterNickname}` : '';

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold leading-tight">{location.name}</h1>
                    <p className="text-gray-500 text-sm">{location.commune}, {location.region}</p>
                </div>
            </div>
            <div className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-100">
                Aggiornato a: {new Date(location.lastUpdatedAt).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })} {updatedByText}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-3">
                {phone && (
                    <a href={`tel:${phone}`} className="flex flex-col items-center justify-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all">
                        <Phone className="text-scout-green mb-1" size={24} />
                        <span className="text-xs font-medium">Chiama</span>
                    </a>
                )}
                {whatsapp && (
                    <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all">
                        <MessageCircle className="text-green-500 mb-1" size={24} />
                        <span className="text-xs font-medium">WhatsApp</span>
                    </a>
                )}
                <a
                    href={location.coordinates
                        ? `https://www.google.com/maps/search/?api=1&query=${location.coordinates.lat},${location.coordinates.lng}`
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.name + ' ' + location.commune)}`
                    }
                    target="_blank" rel="noreferrer"
                    className="flex flex-col items-center justify-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all"
                >
                    <Map className="text-blue-500 mb-1" size={24} />
                    <span className="text-xs font-medium">Mappa</span>
                </a>
            </div>

            {/* Quick Note */}
            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-sm text-yellow-900 italic">
                "{location.quickNote}"
            </div>

            {/* Pricing Section */}
            {location.pricing && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
                    <h2 className="font-semibold flex items-center gap-2 text-scout-brown">
                        <Euro size={20} /> Prezzi e Tariffe
                    </h2>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">{location.pricing.basePrice}€</span>
                        <span className="text-gray-500 text-sm">
                            {location.pricing.unit === 'per_night' ? 'a notte per persona' : 'al giorno per persona'}
                        </span>
                    </div>
                    {location.pricing.description && (
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <p className="text-sm text-gray-700 leading-relaxed">
                                {location.pricing.description}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Details Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="font-semibold mb-3">Caratteristiche</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                            <BedDouble size={18} className="text-gray-400" />
                            <span>{location.beds ? `${location.beds} posti letto` : 'No posti letto'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Tent size={18} className={location.hasTents ? "text-green-600" : "text-gray-400"} />
                            <span className={location.hasTents ? "font-medium" : "text-gray-400"}>{location.hasTents ? 'Tende OK' : 'No tende'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Coffee size={18} className={location.hasRefectory ? "text-brown-600" : "text-gray-400"} />
                            <span>{location.hasRefectory ? 'Refettorio disponibile' : 'No refettorio'}</span>
                        </div>
                        {location.hasRoverService && (
                            <div className="flex items-center gap-2 text-sm text-scout-brown font-medium col-span-2 bg-orange-50 p-2 rounded-lg">
                                <ShieldAlert size={18} />
                                <span>Servizio RS: {location.roverServiceDescription || 'Disponibile'}</span>
                            </div>
                        )}
                        {/* New Fields */}
                        <div className="col-span-2 grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-100">
                            {location.hasChurch && <span className="text-xs bg-gray-100 px-2 py-1 rounded">⛪ Chiesa</span>}
                            {location.hasGreenSpace && <span className="text-xs bg-gray-100 px-2 py-1 rounded">🌳 Spazi Verdi</span>}
                            {location.hasEquippedKitchen && <span className="text-xs bg-gray-100 px-2 py-1 rounded">🍳 Cucina Attrezzata</span>}
                            {location.hasPoles && <span className="text-xs bg-gray-100 px-2 py-1 rounded">🪵 Paletti</span>}
                            {location.bathrooms !== undefined && location.bathrooms > 0 && <span className="text-xs bg-gray-100 px-2 py-1 rounded">🚽 {location.bathrooms} Bagni</span>}
                            {location.website && (
                                <a href={location.website} target="_blank" rel="noopener noreferrer" className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded col-span-2 truncate">
                                    🌐 {location.website}
                                </a>
                            )}
                            {location.otherLogistics && (
                                <span className="text-xs bg-yellow-50 text-yellow-800 px-2 py-1 rounded col-span-2">ℹ️ {location.otherLogistics}</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Restrictions */}
                {location.restrictions.length > 0 && (
                    <div className="p-4 bg-red-50 text-red-900 text-sm">
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                            <ShieldAlert size={16} /> Restrizioni
                        </h3>
                        <ul className="list-disc list-inside space-y-1 ml-1 opacity-80">
                            {location.restrictions.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                    </div>
                )}

                {/* Attenzioni section */}
                {(location.hasPastures || location.hasInsects || location.hasDiseases || location.hasLittleShade || location.hasVeryBusyArea || location.otherAttention) && (
                    <div className="p-4 bg-orange-50 border-t border-orange-100">
                        <h3 className="font-semibold mb-2 text-orange-900 flex items-center gap-2">
                            <AlertTriangle size={16} /> Attenzioni Speciali
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {location.hasPastures && <span className="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-medium">🐑 Pascoli/Greggi</span>}
                            {location.hasInsects && <span className="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-medium">🐝 Insetti fastidiosi</span>}
                            {location.hasDiseases && <span className="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-medium">🦠 Malattie/Zoonosi</span>}
                            {location.hasLittleShade && <span className="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-medium">☀️ Poca ombra</span>}
                            {location.hasVeryBusyArea && <span className="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-medium">👥 Zona frequentata</span>}
                        </div>
                        {location.otherAttention && (
                            <p className="text-xs text-orange-800 italic bg-white/50 p-2 rounded-lg border border-orange-100">
                                {location.otherAttention}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Activities */}
            <div>
                <h2 className="font-semibold mb-3 ml-1">Attività Ideali</h2>
                <div className="flex flex-wrap gap-2">
                    {location.activities.map((act, i) => (
                        <span key={i} className="bg-white border border-gray-200 px-3 py-1 rounded-full text-xs text-gray-600">
                            {act}
                        </span>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 mt-8">
                <button
                    onClick={() => navigate(`/edit/${location.id}`)}
                    className="w-full bg-white border-2 border-scout-green text-scout-green font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:bg-green-50 hover:bg-green-50 transition-colors"
                >
                    <Edit size={20} />
                    Modifica Luogo
                </button>

                <button
                    onClick={async () => {
                        if (confirm("Conferma di ELIMINARE questo evento?")) {
                            const { createProposal } = await import('@/lib/proposals');
                            await createProposal('delete', location.id, location.name);
                            alert("Attendere approvazione di altri due capi...");
                        }
                    }}
                    className="w-full text-red-500 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
                >
                    <ShieldAlert size={20} />
                    Elimina Luogo
                </button>
            </div>
        </div >
    );
}
