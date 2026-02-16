import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Save, MapPin } from 'lucide-react';
import { addLocation, getLocations } from '@/lib/data';
// import { addPoints } from '@/lib/gamification'; // Handled in addLocation now

import { ITALIAN_PROVINCIAL_DATA, ITALIAN_REGIONS } from '@/lib/constants';

const RESTRICTIONS_LIST = [
    "Acqua non potabile", "No fuochi di bivacco", "No tende", "No riscaldamento",
    "Accesso difficile veicoli", "Gestore invadente", "Acqua ed elettricità limitate"
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
    const [isSubmitting, setIsSubmitting] = useState(false);


    const [formData, setFormData] = useState({
        name: '',
        region: '',
        province: '',
        commune: '',
        address: '',
        phone: '',
        whatsapp: '',
        website: '',
        googleMapsLink: '',
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
        hasEquippedKitchen: false,
        hasPoles: false,
        otherLogistics: '',

        // Attenzioni
        hasPastures: false,
        hasInsects: false,
        hasDiseases: false,
        hasLittleShade: false,
        hasVeryBusyArea: false,
        otherAttention: '',

        quickNote: '',
        description: '',
        activities: [] as string[],
        restrictions: [] as string[],
        otherRestrictionInput: '',

        // Pricing
        pricingBase: '',
        pricingUnit: 'per_night' as 'per_night' | 'per_day',
        pricingDescription: ''
    });

    const livePoints = useMemo(() => {
        let points = 10; // Base
        if (formData.website && formData.website.trim() !== '') points += 2;

        const hasCoordinates = (formData as any).latitude && (formData as any).longitude;
        const hasAddress = (formData as any).address && (formData as any).address.trim() !== '';
        const hasMapsLink = (formData as any).googleMapsLink && (formData as any).googleMapsLink.trim() !== '';
        if (hasCoordinates || hasAddress || hasMapsLink) points += 3;

        if (formData.pricingBase && parseFloat(formData.pricingBase) > 0) points += 5;
        return points;
    }, [formData]);

    useEffect(() => {
        if (id) {
            setIsEditMode(true);
            getLocations().then(locations => {
                const found = locations.find(l => l.id === id);
                if (found) {
                    setFormData({
                        name: found.name,
                        region: found.region,
                        province: found.province || '',
                        commune: found.commune,
                        address: found.address || '',
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
                        hasEquippedKitchen: found.hasEquippedKitchen,
                        hasPoles: found.hasPoles,
                        otherLogistics: found.otherLogistics || '',
                        hasPastures: found.hasPastures || false,
                        hasInsects: found.hasInsects || false,
                        hasDiseases: found.hasDiseases || false,
                        hasLittleShade: found.hasLittleShade || false,
                        hasVeryBusyArea: found.hasVeryBusyArea || false,
                        otherAttention: found.otherAttention || '',
                        latitude: found.coordinates?.lat.toString() || '',
                        longitude: found.coordinates?.lng.toString() || '',
                        googleMapsLink: (found as any).googleMapsLink || '',
                        quickNote: found.quickNote,
                        description: found.description || '',
                        activities: found.activities,
                        restrictions: found.restrictions,
                        otherRestrictionInput: '',
                        pricingBase: found.pricing?.basePrice?.toString() || '',
                        pricingUnit: found.pricing?.unit || 'per_night',
                        pricingDescription: found.pricing?.description || ''
                    });
                }
            }).catch(console.error);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (!formData.name || !formData.region || !formData.phone) {
            alert("Compila i campi obbligatori (Nome, Regione, Telefono)");
            return;
        }

        setIsSubmitting(true);

        const finalRestrictions = [...formData.restrictions];
        if (formData.otherRestrictionInput.trim()) {
            finalRestrictions.push(formData.otherRestrictionInput.trim());
        }

        const locationData = {
            name: formData.name,
            region: formData.region,
            province: formData.province,
            commune: formData.commune,
            address: formData.address,
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
            hasEquippedKitchen: formData.hasEquippedKitchen,
            hasPoles: formData.hasPoles,
            otherLogistics: formData.otherLogistics,

            // Attenzioni
            hasPastures: formData.hasPastures,
            hasInsects: formData.hasInsects,
            hasDiseases: formData.hasDiseases,
            hasLittleShade: formData.hasLittleShade,
            hasVeryBusyArea: formData.hasVeryBusyArea,
            otherAttention: formData.otherAttention,

            // Coordinates
            coordinates: (formData as any).latitude && (formData as any).longitude ? {
                lat: parseFloat((formData as any).latitude),
                lng: parseFloat((formData as any).longitude)
            } : undefined,

            quickNote: formData.quickNote,
            description: formData.description,
            activities: formData.activities as any[],
            restrictions: finalRestrictions as any[],
            pricing: formData.pricingBase ? {
                basePrice: parseFloat(formData.pricingBase),
                unit: formData.pricingUnit,
                description: formData.pricingDescription
            } : undefined
        };

        try {
            if (isEditMode && id) {
                const { createProposal } = await import('@/lib/proposals');
                await createProposal('update', id, formData.name, locationData as any);
                alert("Attendere approvazione di 2 capi per visualizzare le modifiche apportate");
                navigate('/');
            } else {
                // Add Location directly
                await addLocation(locationData);
                // Points are now handled in addLocation
                navigate('/');
            }
        } catch (error) {
            console.error('Submission error:', error);
            alert('Errore durante il salvataggio. Riprova.');
            setIsSubmitting(false);
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Regione *</label>
                            <select
                                name="region" required
                                value={formData.region}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData(prev => ({ ...prev, region: val, province: '' }));
                                }}
                                className="w-full p-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-scout-green"
                            >
                                <option value="">Seleziona Regione...</option>
                                {ITALIAN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Provincia *</label>
                            {formData.region ? (
                                <select
                                    name="province" required
                                    value={formData.province} onChange={handleChange}
                                    className="w-full p-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-scout-green"
                                >
                                    <option value="">Seleziona Provincia...</option>
                                    {ITALIAN_PROVINCIAL_DATA[formData.region].map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs border border-red-100 flex items-center gap-2">
                                    <span className="font-bold">⚠️</span>
                                    Seleziona prima la regione
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Comune *</label>
                            <input
                                type="text" name="commune" required
                                value={formData.commune} onChange={handleChange}
                                placeholder="es. Roma, Milano..."
                                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-scout-green"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium">Indirizzo</label>
                                <span className="text-[10px] font-bold text-scout-blue bg-scout-blue/10 px-2 py-0.5 rounded-full">+3 pt</span>
                            </div>
                            <input
                                type="text" name="address"
                                value={formData.address} onChange={handleChange}
                                placeholder="Via dei Cerchi, 1 o link Maps..."
                                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-scout-green"
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
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium">Sito Web (opzionale)</label>
                            <span className="text-[10px] font-bold text-scout-blue bg-scout-blue/10 px-2 py-0.5 rounded-full">+2 pt</span>
                        </div>
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
                    <div className="flex justify-between items-center">
                        <h2 className="font-semibold text-lg text-scout-green">Logistica e Posizione</h2>
                    </div>

                    {/* Coordinates Section */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
                        <label className="block text-sm font-medium mb-1">Link Google Maps (per coordinate automatiche)</label>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="url"
                                name="googleMapsLink"
                                value={formData.googleMapsLink}
                                onChange={handleChange}
                                placeholder="Incolla link qui..."
                                className="flex-1 p-3 rounded-xl border border-gray-200"
                                onBlur={(e) => {
                                    const val = e.target.value;
                                    if (val) {
                                        // Try regex for @lat,lng
                                        const match = val.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
                                        if (match) {
                                            setFormData((prev: any) => ({
                                                ...prev,
                                                latitude: match[1],
                                                longitude: match[2]
                                            }));
                                        } else {
                                            // Try regex for query parameter
                                            const match2 = val.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
                                            if (match2) {
                                                setFormData((prev: any) => ({
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
                            { key: 'hasEquippedKitchen', label: 'Cucina attrezzata' },
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

                {/* Section 3: Attenzioni */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <h2 className="font-semibold text-lg text-orange-600 flex items-center gap-2">
                        <span className="p-1.5 bg-orange-100 rounded-lg">⚠️</span>
                        Attenzioni del Luogo
                    </h2>
                    <p className="text-xs text-gray-500">Indica pericoli, fastidi o aspetti critici da tenere a mente per la sicurezza.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                            { key: 'hasPastures', label: 'Pascoli e Greggi' },
                            { key: 'hasInsects', label: 'Calabroni/Tafani/Vespe/Mosche' },
                            { key: 'hasDiseases', label: 'Malattie (es: Leishmania, zecche...)' },
                            { key: 'hasLittleShade', label: 'Poche zone ombra' },
                            { key: 'hasVeryBusyArea', label: 'Zona molto frequentata' },
                        ].map((item) => (
                            <label key={item.key} className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-colors ${(formData as any)[item.key] ? 'bg-orange-50 border-orange-200' : 'hover:bg-gray-50'}`}>
                                <input
                                    type="checkbox"
                                    name={item.key}
                                    checked={(formData as any)[item.key]}
                                    onChange={handleCheckboxChange}
                                    className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                                />
                                <span className="text-sm font-medium">{item.label}</span>
                            </label>
                        ))}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Altro (Specificare)</label>
                        <input
                            type="text" name="otherAttention"
                            value={formData.otherAttention} onChange={handleChange}
                            className="w-full p-3 rounded-xl border border-gray-200"
                            placeholder="Es. Presenza di cinghiali, terreno scosceso..."
                        />
                    </div>
                </div>

                {/* Section 4: Restrizioni */}
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

                {/* Section 4: Pricing */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="font-semibold text-lg text-scout-brown flex items-center gap-2">
                            <Save size={20} className="text-scout-brown" />
                            Prezzo e Tariffe
                        </h2>
                        <span className="text-[10px] font-bold text-scout-blue bg-scout-blue/10 px-2 py-0.5 rounded-full">+5 pt</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Prezzo Base (€)</label>
                            <input
                                type="number" name="pricingBase"
                                value={formData.pricingBase} onChange={handleChange}
                                placeholder="Es. 10"
                                className="w-full p-3 rounded-xl border border-gray-200"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Unità</label>
                            <select
                                name="pricingUnit"
                                value={formData.pricingUnit} onChange={handleChange}
                                className="w-full p-3 rounded-xl border border-gray-200 bg-white"
                            >
                                <option value="per_night">A Notte</option>
                                <option value="per_day">Al Giorno</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Dettagli e Flessibilità Prezzi</label>
                        <textarea
                            name="pricingDescription"
                            value={formData.pricingDescription} onChange={handleChange}
                            rows={3}
                            className="w-full p-3 rounded-xl border border-gray-200"
                            placeholder="Es. 15€ con cucina, 13€ senza. Se si va via prima delle 12 la seconda giornata è a metà prezzo."
                        />
                        <p className="text-[10px] text-gray-400 mt-1">
                            Sii specifico: indica costi extra per cucina, acqua/luce o sconti per partenze anticipate.
                        </p>
                    </div>
                </div>

                {/* Section 5: Activities */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <h2 className="font-semibold text-lg text-scout-blue">Attività Ideali</h2>
                    <div className="flex flex-wrap gap-2">
                        {(formData.activities as any[]).map(item => (
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
                        {/* If ACTIVITIES_LIST is needed for rendering the full list to PICK from */}
                        {ACTIVITIES_LIST.filter(a => !formData.activities.includes(a)).map(item => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => toggleArrayItem('activities', item)}
                                className="px-3 py-1.5 rounded-full text-sm font-medium border bg-white text-gray-600 border-gray-300 hover:border-scout-blue"
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Section 6: Note */}
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
                    disabled={isSubmitting}
                    className={`w-full bg-scout-green text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:bg-scout-green-dark transition-colors flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isSubmitting ? (
                        <>Salvataggio in corso...</>
                    ) : (
                        <>
                            <Save size={24} />
                            {isEditMode ? 'Conferma Modifica' : 'Salva Luogo'}
                        </>
                    )}
                </button>

                {/* Floating Points Counter */}
                <div className="fixed bottom-24 right-6 z-50 animate-bounce-subtle">
                    <div className="bg-scout-green text-white px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 border-2 border-white">
                        <div className="bg-white text-scout-green w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">
                            {livePoints}
                        </div>
                        <span className="text-sm font-bold">Punti totali</span>
                    </div>
                </div>
            </form >
        </div >
    );
}
