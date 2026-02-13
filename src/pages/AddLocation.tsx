import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Save, MapPin } from 'lucide-react';
import { addLocation, getLocations } from '@/lib/data';
import { addPoints } from '@/lib/gamification';
import { createProposal } from '@/lib/proposals';

const ITALIAN_REGIONS = [
    "Abruzzo", "Basilicata", "Calabria", "Campania", "Emilia-Romagna",
    "Friuli-Venezia Giulia", "Lazio", "Liguria", "Lombardia", "Marche",
    "Molise", "Piemonte", "Puglia", "Sardegna", "Sicilia", "Toscana",
    "Trentino-Alto Adige", "Umbria", "Valle d'Aosta", "Veneto"
];

const RESTRICTIONS_LIST = [
    "Acqua non potabile", "No fuochi di bivacco", "No tende", "No animali",
    "Accesso difficile veicoli", "Solo fornelli a gas", "Zona protetta (Ente Parco)"
];

const ACTIVITIES_LIST = [
    "Caccia invernale", "Caccia primaverile", "Caccia giungla", "Caccia di Accettazione", "Vacanze di Branco",
    "Campo invernale", "Campo primaverile", "San Giorgio", "Campo estivo",
    "Route invernale", "Route primaverile", "Route estiva",
    "Pernotto comunità capi", "Uscita di apertura", "Campo di gruppo"
];

export default function AddLocation() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [isEditMode, setIsEditMode] = useState(false);


    const [formData, setFormData] = useState({
        name: '',
        region: '',
        commune: '',
        phone: '',
        whatsapp: '',
        website: '',
        latitude: '',
        longitude: '',

        // Logistics
        beds: '',
        bathrooms: '',
        hasTents: false,
        hasRS: false,
        hasRefectory: false,
        hasChurch: false,
        hasGreenSpace: false,
        hasCookware: false,
        hasPoles: false,
        otherLogistics: '',

        quickNote: '',
        description: '',
        activities: [] as string[],
        restrictions: [] as string[],
        otherRestrictionInput: ''
    });

    useEffect(() => {
        if (id) {
            setIsEditMode(true);
            const locations = getLocations();
            const found = locations.find(l => l.id === id);
            if (found) {
                setFormData({
                    name: found.name,
                    region: found.region,
                    commune: found.commune,
                    phone: found.contacts.find(c => c.type === 'phone')?.value || '',
                    whatsapp: found.contacts.find(c => c.type === 'whatsapp')?.value || '',
                    website: found.website || '',
                    beds: found.beds?.toString() || '',
                    bathrooms: found.bathrooms?.toString() || '',
                    hasTents: found.hasTents,
                    hasRS: found.hasRoverService,
                    hasRefectory: found.hasRefectory,
                    hasChurch: found.hasChurch,
                    hasGreenSpace: found.hasGreenSpace,
                    hasCookware: found.hasCookware,
                    hasPoles: found.hasPoles,
                    otherLogistics: found.otherLogistics || '',
                    latitude: found.coordinates?.lat.toString() || '',
                    longitude: found.coordinates?.lng.toString() || '',
                    quickNote: found.quickNote,
                    description: found.description || '',
                    activities: found.activities,
                    restrictions: found.restrictions, // Simplification: we're not splitting "other" restrictions here perfecty but it works
                    otherRestrictionInput: ''
                });
            }
        }
    }, [id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: checked }));
    };

    const toggleArrayItem = (field: 'activities' | 'restrictions', item: string) => {
        setFormData(prev => {
            const list = prev[field];
            if (list.includes(item)) {
                return { ...prev, [field]: list.filter(i => i !== item) };
            } else {
                return { ...prev, [field]: [...list, item] };
            }
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.region || !formData.phone) {
            alert("Compila i campi obbligatori (Nome, Regione, Telefono)");
            return;
        }

        const finalRestrictions = [...formData.restrictions];
        if (formData.otherRestrictionInput.trim()) {
            finalRestrictions.push(formData.otherRestrictionInput.trim());
        }

        const locationData = {
            name: formData.name,
            region: formData.region,
            commune: formData.commune || 'Sconosciuto',
            contacts: [
                { type: 'phone', value: formData.phone, name: 'Responsabile' },
                ...(formData.whatsapp ? [{ type: 'whatsapp', value: formData.whatsapp, name: 'WhatsApp' }] as any : [])
            ],
            website: formData.website,
            beds: formData.beds ? parseInt(formData.beds) : 0,
            bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : 0,
            hasTents: formData.hasTents,
            hasRefectory: formData.hasRefectory,
            hasRoverService: formData.hasRS,
            hasChurch: formData.hasChurch,
            hasGreenSpace: formData.hasGreenSpace,
            hasCookware: formData.hasCookware,
            hasPoles: formData.hasPoles,
            otherLogistics: formData.otherLogistics,

            // Coordinates
            coordinates: (formData as any).latitude && (formData as any).longitude ? {
                lat: parseFloat((formData as any).latitude),
                lng: parseFloat((formData as any).longitude)
            } : undefined,

            quickNote: formData.quickNote,
            description: formData.description,
            activities: formData.activities as any[],
            restrictions: finalRestrictions as any[]
        };

        if (isEditMode && id) {
            // Create Proposal
            createProposal('update', id, formData.name, locationData);
            alert("Attendere approvazione di 2 capi per visualizzare le modifiche apportate");
            navigate('/');
        } else {
            // Add Location directly
            addLocation(locationData);
            addPoints(20);
            navigate('/');
        }
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="flex items-center gap-2">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-2xl font-bold text-scout-green">{isEditMode ? 'Modifica Luogo' : 'Aggiungi Luogo'}</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Section 1: Info Base */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                        <MapPin size={20} className="text-scout-green" />
                        Informazioni Base
                    </h2>

                    <div>
                        <label className="block text-sm font-medium mb-1">Nome del Luogo *</label>
                        <input
                            type="text" name="name" required
                            value={formData.name} onChange={handleChange}
                            className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-scout-green focus:border-transparent"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Regione *</label>
                            <select
                                name="region" required
                                value={formData.region} onChange={handleChange}
                                className="w-full p-3 rounded-xl border border-gray-200 bg-white"
                            >
                                <option value="">Seleziona...</option>
                                {ITALIAN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Comune/Provincia</label>
                            <input
                                type="text" name="commune"
                                value={formData.commune} onChange={handleChange}
                                className="w-full p-3 rounded-xl border border-gray-200"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Telefono Responsabile *</label>
                        <input
                            type="tel" name="phone" required
                            value={formData.phone} onChange={handleChange}
                            className="w-full p-3 rounded-xl border border-gray-200"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Sito Web (opzionale)</label>
                        <input
                            type="url" name="website"
                            value={formData.website} onChange={handleChange}
                            placeholder="https://..."
                            className="w-full p-3 rounded-xl border border-gray-200"
                        />
                    </div>
                </div>

                {/* Section 2: Logistica Estesa and Coordinates */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <h2 className="font-semibold text-lg">Logistica e Posizione</h2>

                    {/* Coordinates Section */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
                        <label className="block text-sm font-medium mb-1">Link Google Maps (per coordinate automatiche)</label>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="url"
                                placeholder="Incolla link qui..."
                                className="flex-1 p-3 rounded-xl border border-gray-200"
                                onBlur={(e) => {
                                    const val = e.target.value;
                                    if (val) {
                                        // Try regex for @lat,lng
                                        const match = val.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
                                        if (match) {
                                            setFormData(prev => ({
                                                ...prev,
                                                latitude: match[1],
                                                longitude: match[2]
                                            }));
                                        } else {
                                            // Try regex for query parameter
                                            const match2 = val.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
                                            if (match2) {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    latitude: match2[1],
                                                    longitude: match2[2]
                                                }));
                                            }
                                        }
                                    }
                                }}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Latitudine</label>
                                <input
                                    type="text" name="latitude"
                                    value={(formData as any).latitude || ''} onChange={handleChange}
                                    className="w-full p-2 rounded-lg border border-gray-200 text-sm"
                                    placeholder="Es. 45.1234"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Longitudine</label>
                                <input
                                    type="text" name="longitude"
                                    value={(formData as any).longitude || ''} onChange={handleChange}
                                    className="w-full p-2 rounded-lg border border-gray-200 text-sm"
                                    placeholder="Es. 12.1234"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Posti Letto</label>
                            <input
                                type="number" name="beds"
                                value={formData.beds} onChange={handleChange}
                                className="w-full p-3 rounded-xl border border-gray-200"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Bagni (quantità)</label>
                            <input
                                type="number" name="bathrooms"
                                value={formData.bathrooms} onChange={handleChange}
                                className="w-full p-3 rounded-xl border border-gray-200"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                            { key: 'hasTents', label: 'Tende' },
                            { key: 'hasRefectory', label: 'Refettorio' },
                            { key: 'hasRS', label: 'Servizio RS' },
                            { key: 'hasChurch', label: 'Chiesa' },
                            { key: 'hasGreenSpace', label: 'Ampi spazi verdi' },
                            { key: 'hasCookware', label: 'Pentolame' },
                            { key: 'hasPoles', label: 'Disponibilità paletti' },
                        ].map((item) => (
                            <label key={item.key} className="flex items-center gap-2 p-3 border rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                                <input
                                    type="checkbox"
                                    name={item.key}
                                    checked={(formData as any)[item.key]}
                                    onChange={handleCheckboxChange}
                                    className="w-5 h-5 text-scout-green rounded"
                                />
                                <span className="text-sm font-medium">{item.label}</span>
                            </label>
                        ))}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Altro (specificare)</label>
                        <input
                            type="text" name="otherLogistics"
                            value={formData.otherLogistics} onChange={handleChange}
                            className="w-full p-3 rounded-xl border border-gray-200"
                            placeholder="Es. Accessibile con furgoni..."
                        />
                    </div>
                </div>

                {/* Section 3: Restrizioni */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <h2 className="font-semibold text-lg text-red-600">Restrizioni</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {RESTRICTIONS_LIST.map(item => (
                            <label key={item} className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-colors ${formData.restrictions.includes(item) ? 'bg-red-50 border-red-200' : 'hover:bg-gray-50'}`}>
                                <input
                                    type="checkbox"
                                    checked={formData.restrictions.includes(item)}
                                    onChange={() => toggleArrayItem('restrictions', item)}
                                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                                />
                                <span className="text-sm">{item}</span>
                            </label>
                        ))}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Altro (specificare)</label>
                        <input
                            type="text" name="otherRestrictionInput"
                            value={formData.otherRestrictionInput} onChange={handleChange}
                            className="w-full p-3 rounded-xl border border-gray-200"
                            placeholder="Es. Orari di silenzio rigidi..."
                        />
                    </div>
                </div>

                {/* Section 4: Activities */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <h2 className="font-semibold text-lg text-scout-blue">Attività Ideali</h2>
                    <div className="flex flex-wrap gap-2">
                        {ACTIVITIES_LIST.map(item => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => toggleArrayItem('activities', item)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${formData.activities.includes(item)
                                    ? 'bg-scout-blue text-white border-scout-blue'
                                    : 'bg-white text-gray-600 border-gray-300 hover:border-scout-blue'
                                    }`}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Section 5: Note */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <h2 className="font-semibold text-lg">Note</h2>
                    <div>
                        <label className="block text-sm font-medium mb-1">Nota Rapida (max 10 parole)</label>
                        <input
                            type="text" name="quickNote"
                            value={formData.quickNote} onChange={handleChange}
                            className="w-full p-3 rounded-xl border border-gray-200"
                            placeholder="Es. Chiavi dal parroco, acqua fredda..."
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full bg-scout-green text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:bg-scout-green-dark transition-colors flex items-center justify-center gap-2"
                >
                    <Save size={24} />
                    {isEditMode ? 'Conferma Modifica' : 'Salva Luogo (+20 pt)'}
                </button>
            </form>
        </div>
    );
}
