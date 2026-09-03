import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Save, MapPin, Plus, Trash2, Phone, MessageCircle, User, Building, AlertTriangle, Sparkles, Loader2, Check } from 'lucide-react';
import { addLocation, getLocations, updateLocation } from '@/lib/data';
import { LocationContact } from '@/types';
import { extractCoordsFromMapsUrl, resolveLocationCoordinates, isShortMapsUrl } from '@/lib/geo';
import LocationMapPicker from '@/components/LocationMapPicker';
import RichTextEditor from '@/components/RichTextEditor';
// import { addPoints } from '@/lib/gamification'; // Handled in addLocation now

import { ITALIAN_PROVINCIAL_DATA, ITALIAN_REGIONS } from '@/lib/constants';

interface ContactFormItem {
    id: string;
    phone: string;
    name: string;
    role: string;
    isWhatsapp: boolean;
    notes: string;
}

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
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [geoFeedback, setGeoFeedback] = useState<{ type: 'success' | 'warn' | 'error'; message: string } | null>(null);

    const [contacts, setContacts] = useState<ContactFormItem[]>([
        { id: '1', phone: '', name: '', role: '', isWhatsapp: true, notes: '' }
    ]);

    const [hasSilenceRules, setHasSilenceRules] = useState(false);
    const [silenceStart, setSilenceStart] = useState('23:00');
    const [silenceEnd, setSilenceEnd] = useState('07:00');

    const [formData, setFormData] = useState({
        name: '',
        region: '',
        province: '',
        commune: '',
        address: '',
        phone: '',
        whatsapp: '',
        website: '',
        email: '',
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
        hasDisabledAccess: false,
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
        pricingTarget: 'per_person' as 'per_person' | 'per_group',
        pricingDescription: '',

        // Availability
        availabilityStatus: 'available' as 'available' | 'maintenance' | 'closed',
        priceCategory: 0,
    });

    const livePoints = useMemo(() => {
        let points = 10; // Base
        if (formData.website && formData.website.trim() !== '') points += 2;
        if (formData.email && formData.email.trim() !== '') points += 2;

        const hasCoordinates = (formData as any).latitude && (formData as any).longitude;
        const hasAddress = (formData as any).address && (formData as any).address.trim() !== '';
        const hasMapsLink = (formData as any).googleMapsLink && (formData as any).googleMapsLink.trim() !== '';
        if (hasCoordinates || hasAddress || hasMapsLink) points += 3;

        // Punti extra per contatti dettagliati con proprietario / ente
        const hasDetailedContacts = contacts.some(c => c.phone.trim() !== '' && (c.name.trim() !== '' || c.role.trim() !== ''));
        if (hasDetailedContacts) points += 3;

        if (formData.pricingBase && parseFloat(formData.pricingBase) > 0) points += 5;
        return points;
    }, [formData, contacts]);

    const handleAddContact = () => {
        setContacts(prev => [
            ...prev,
            { id: String(Date.now()), phone: '', name: '', role: '', isWhatsapp: true, notes: '' }
        ]);
    };

    const handleRemoveContact = (index: number) => {
        if (contacts.length <= 1) return;
        setContacts(prev => prev.filter((_, i) => i !== index));
    };

    const handleContactChange = (index: number, field: keyof ContactFormItem, value: any) => {
        setContacts(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const handleAutoFindCoordinates = async () => {
        setIsGeocoding(true);
        setGeoFeedback(null);
        try {
            const resolved = await resolveLocationCoordinates({
                name: formData.name,
                googleMapsLink: formData.googleMapsLink,
                address: formData.address,
                commune: formData.commune,
                province: formData.province,
                region: formData.region,
            });

            if (resolved) {
                setFormData(prev => ({
                    ...prev,
                    latitude: resolved.coords.lat.toString(),
                    longitude: resolved.coords.lng.toString(),
                }));

                if (resolved.isTownCenter) {
                    const shortLinkNotice = isShortMapsUrl(formData.googleMapsLink)
                        ? " Il link incollato è un link breve (maps.app.goo.gl) che nasconde le coordinate."
                        : "";
                    setGeoFeedback({
                        type: 'warn',
                        message: `⚠️ Le coordinate trovate corrispondono al centro del comune di ${formData.commune || 'riferimento'}.${shortLinkNotice} Trascina il pin sulla mappa sottostante per posizionare il punto esatto della struttura.`
                    });
                } else if (resolved.source === 'poi_name') {
                    setGeoFeedback({
                        type: 'success',
                        message: `🎯 Trovata posizione esatta su mappa per "${formData.name}"!`
                    });
                } else if (resolved.source === 'maps_url') {
                    setGeoFeedback({
                        type: 'success',
                        message: `📍 Coordinate esatte estratte dal link Google Maps!`
                    });
                } else {
                    setGeoFeedback({
                        type: 'success',
                        message: `📍 Coordinate ricavate dall'indirizzo civico: ${resolved.coords.lat.toFixed(5)}, ${resolved.coords.lng.toFixed(5)}.`
                    });
                }
            } else {
                setGeoFeedback({
                    type: 'error',
                    message: 'Impossibile trovare coordinate: inserisci nome struttura, comune, indirizzo o coordinate valide.'
                });
            }
        } catch {
            setGeoFeedback({
                type: 'error',
                message: 'Errore durante la ricerca delle coordinate.'
            });
        } finally {
            setIsGeocoding(false);
        }
    };

    useEffect(() => {
        if (id) {
            setIsEditMode(true);
            getLocations().then(locations => {
                const found = locations.find(l => l.id === id);
                if (found) {
                    // Popola contatti
                    if (found.contacts && Array.isArray(found.contacts) && found.contacts.length > 0) {
                        const loaded: ContactFormItem[] = [];
                        found.contacts.forEach((c: any, idx: number) => {
                            if (c.type === 'phone' || !c.type) {
                                loaded.push({
                                    id: String(Date.now() + idx),
                                    phone: c.value || '',
                                    name: c.name === 'Responsabile' ? '' : (c.name || ''),
                                    role: c.role || '',
                                    isWhatsapp: c.isWhatsapp !== undefined 
                                        ? c.isWhatsapp 
                                        : (found.contacts.some((w: any) => w.type === 'whatsapp' && w.value === c.value) || true),
                                    notes: c.notes || '',
                                });
                            } else if (c.type === 'whatsapp') {
                                const match = loaded.find(l => l.phone === c.value);
                                if (match) {
                                    match.isWhatsapp = true;
                                } else {
                                    loaded.push({
                                        id: String(Date.now() + idx),
                                        phone: c.value || '',
                                        name: c.name === 'WhatsApp' ? '' : (c.name || ''),
                                        role: c.role || '',
                                        isWhatsapp: true,
                                        notes: c.notes || '',
                                    });
                                }
                            }
                        });
                        if (loaded.length > 0) {
                            setContacts(loaded);
                        }
                    }

                    setFormData({
                        name: found.name,
                        region: found.region,
                        province: found.province || '',
                        commune: found.commune,
                        address: found.address || '',
                        phone: found.contacts.find(c => c.type === 'phone')?.value || '',
                        whatsapp: found.contacts.find(c => c.type === 'whatsapp')?.value || '',
                        website: found.website || '',
                        email: found.email || '',
                        beds: found.beds?.toString() || '',
                        bathrooms: found.bathrooms?.toString() || '',
                        hasTents: found.hasTents,
                        hasRS: found.hasRoverService,
                        hasRefectory: found.hasRefectory,
                        hasChurch: found.hasChurch,
                        hasGreenSpace: found.hasGreenSpace,
                        hasEquippedKitchen: found.hasEquippedKitchen,
                        hasPoles: found.hasPoles,
                        hasDisabledAccess: found.hasDisabledAccess || false,
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
                        restrictions: (() => {
                            const silenceRule = (found.restrictions || []).find((r: string) => 
                                r.toLowerCase().includes('silenzio')
                            );
                            if (silenceRule) {
                                setHasSilenceRules(true);
                                const match = silenceRule.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
                                if (match) {
                                    setSilenceStart(match[1].padStart(5, '0'));
                                    setSilenceEnd(match[2].padStart(5, '0'));
                                }
                            }
                            return (found.restrictions || []).filter((r: string) => 
                                !r.toLowerCase().includes('silenzio')
                            );
                        })(),
                        otherRestrictionInput: '',
                        pricingBase: found.pricing?.basePrice?.toString() || '',
                        pricingUnit: found.pricing?.unit || 'per_night',
                        pricingTarget: found.pricing?.target || 'per_person',
                        pricingDescription: found.pricing?.description || '',
                        availabilityStatus: (found as any).availabilityStatus || 'available',
                        priceCategory: found.priceCategory || 0,
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

        const validContacts = contacts.filter(c => c.phone.trim() !== '');
        if (!formData.name || !formData.region || validContacts.length === 0) {
            alert("Compila i campi obbligatori (Nome, Regione, e almeno un Recapito Telefonico)");
            return;
        }

        setIsSubmitting(true);

        const finalRestrictions = [...formData.restrictions].filter(r => !r.toLowerCase().includes('silenzio'));
        if (hasSilenceRules) {
            finalRestrictions.push(`Regole Silenzio: ${silenceStart} - ${silenceEnd}`);
        }
        if (formData.otherRestrictionInput.trim()) {
            finalRestrictions.push(formData.otherRestrictionInput.trim());
        }

        const cleanedContacts: LocationContact[] = validContacts.map(c => ({
            type: 'phone',
            value: c.phone.trim(),
            name: c.name.trim() || undefined,
            role: c.role.trim() || undefined,
            notes: c.notes.trim() || undefined,
            isWhatsapp: c.isWhatsapp,
        }));

        // Risoluzione autonoma coordinate se non fornite manualmente
        let finalCoords: { lat: number; lng: number } | undefined = undefined;
        if ((formData as any).latitude && (formData as any).longitude) {
            const lat = parseFloat((formData as any).latitude);
            const lng = parseFloat((formData as any).longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
                finalCoords = { lat, lng };
            }
        }

        if (!finalCoords) {
            // Tentativo automatico da link Maps o indirizzo/comune
            const autoResolved = await resolveLocationCoordinates({
                name: formData.name,
                googleMapsLink: formData.googleMapsLink,
                address: formData.address,
                commune: formData.commune,
                province: formData.province,
                region: formData.region,
            });
            if (autoResolved) {
                finalCoords = autoResolved.coords;
            }
        }

        const locationData = {
            name: formData.name,
            region: formData.region,
            province: formData.province,
            commune: formData.commune,
            address: formData.address,
            googleMapsLink: formData.googleMapsLink,
            contacts: cleanedContacts,
            website: formData.website,
            email: formData.email,
            beds: formData.beds ? parseInt(formData.beds) : 0,
            bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : 0,
            hasTents: formData.hasTents,
            hasRefectory: formData.hasRefectory,
            hasRoverService: formData.hasRS,
            hasChurch: formData.hasChurch,
            hasGreenSpace: formData.hasGreenSpace,
            hasEquippedKitchen: formData.hasEquippedKitchen,
            hasPoles: formData.hasPoles,
            hasDisabledAccess: formData.hasDisabledAccess,
            otherLogistics: formData.otherLogistics,

            // Attenzioni
            hasPastures: formData.hasPastures,
            hasInsects: formData.hasInsects,
            hasDiseases: formData.hasDiseases,
            hasLittleShade: formData.hasLittleShade,
            hasVeryBusyArea: formData.hasVeryBusyArea,
            otherAttention: formData.otherAttention,

            // Coordinates
            coordinates: finalCoords,

            quickNote: formData.quickNote,
            description: formData.description,
            activities: formData.activities as any[],
            restrictions: finalRestrictions as any[],
            availabilityStatus: formData.availabilityStatus,
            priceCategory: formData.priceCategory,
            avgRating: 0,
            reviewsCount: 0,
            pricing: formData.pricingBase ? {
                basePrice: parseFloat(formData.pricingBase),
                unit: formData.pricingUnit,
                target: formData.pricingTarget,
                description: formData.pricingDescription
            } : undefined
        };

        try {
            if (isEditMode && id) {
                const detailsSummary = prompt("Descrivi brevemente cosa hai modificato (es. Aggiornati contatti, Aggiunti posti letto):") || "Aggiornate informazioni generali";
                await updateLocation(id, locationData as any, detailsSummary);
                alert("Modifiche salvate con successo!");
                navigate(`/location/${id}`);
            } else {
                // Add Location directly
                await addLocation(locationData);
                // Points are now handled in addLocation
                navigate('/');
            }
        } catch (error: any) {
            console.error('Submission error:', error);
            alert(error.message || 'Errore durante il salvataggio. Riprova.');
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
                {/* Section 0: Disponibilità */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                        <span className="text-xl">🏪</span>
                        Stato Disponibilità Struttura
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Indica se la struttura è attualmente aperta ad accogliere gruppi scout in autogestione.</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center justify-center text-center transition-all ${
                            formData.availabilityStatus === 'available' 
                                ? 'border-scout-green bg-scout-green/10 text-scout-green-dark dark:text-scout-green' 
                                : 'border-gray-200 dark:border-gray-700 hover:border-scout-green/50 dark:text-gray-300'
                        }`}>
                            <input type="radio" name="availabilityStatus" value="available" checked={formData.availabilityStatus === 'available'} onChange={handleChange} className="hidden" />
                            <span className="text-2xl mb-1">✅</span>
                            <span className="text-sm font-bold">Disponibile</span>
                        </label>
                        
                        <label className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center justify-center text-center transition-all ${
                            formData.availabilityStatus === 'maintenance' 
                                ? 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-500' 
                                : 'border-gray-200 dark:border-gray-700 hover:border-amber-500/50 dark:text-gray-300'
                        }`}>
                            <input type="radio" name="availabilityStatus" value="maintenance" checked={formData.availabilityStatus === 'maintenance'} onChange={handleChange} className="hidden" />
                            <span className="text-2xl mb-1">🔧</span>
                            <span className="text-sm font-bold leading-tight">In Manutenzione</span>
                        </label>
                        
                        <label className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center justify-center text-center transition-all ${
                            formData.availabilityStatus === 'closed' 
                                ? 'border-red-500 bg-red-500/10 text-red-900 dark:text-red-500' 
                                : 'border-gray-200 dark:border-gray-700 hover:border-red-500/50 dark:text-gray-300'
                        }`}>
                            <input type="radio" name="availabilityStatus" value="closed" checked={formData.availabilityStatus === 'closed'} onChange={handleChange} className="hidden" />
                            <span className="text-2xl mb-1">🚫</span>
                            <span className="text-sm font-bold leading-tight">Non Disponibile</span>
                        </label>
                    </div>
                </div>

                {/* Section 1: Info Base */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                        <MapPin size={20} className="text-scout-green" />
                        Informazioni Base
                    </h2>

                    <div>
                        <label className="block text-sm font-medium mb-1">Nome del Luogo *</label>
                        <input
                            type="text" name="name" required
                            value={formData.name} onChange={handleChange}
                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-scout-green focus:border-transparent"
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
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white bg-white focus:ring-2 focus:ring-scout-green"
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
                                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white bg-white focus:ring-2 focus:ring-scout-green"
                                >
                                    <option value="">Seleziona Provincia...</option>
                                    {ITALIAN_PROVINCIAL_DATA[formData.region].map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-xs border border-red-100 dark:border-red-900/50 flex items-center gap-2">
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
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-scout-green"
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
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-scout-green"
                            />
                        </div>
                    </div>

                    {/* Recapiti e Referenti della Struttura */}
                    <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <div className="flex items-center gap-2">
                                    <label className="block text-sm font-bold text-gray-900 dark:text-white">
                                        Recapiti Telefonici e Referenti *
                                    </label>
                                    <span className="text-[10px] font-bold text-scout-blue bg-scout-blue/10 px-2 py-0.5 rounded-full">+3 pt</span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Inserisci uno o più numeri di riferimento (es. custode, parrocchia, comune o capi gruppo).
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddContact}
                                className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-bold text-scout-green hover:text-scout-green-dark bg-green-50 dark:bg-emerald-950/30 hover:bg-green-100 dark:hover:bg-emerald-950/50 px-3 py-2 rounded-xl border border-green-200 dark:border-emerald-800 transition-all cursor-pointer"
                            >
                                <Plus size={14} /> Aggiungi Recapito
                            </button>
                        </div>

                        <div className="space-y-3">
                            {contacts.map((contact, index) => (
                                <div
                                    key={contact.id}
                                    className="p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600 space-y-3 transition-all"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-300">
                                            <Phone size={13} className="text-scout-green" />
                                            {index === 0 ? 'Recapito Principale *' : `Recapito Secondario #${index + 1}`}
                                        </span>
                                        {contacts.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveContact(index)}
                                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                                                title="Rimuovi questo recapito"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                                Numero di Telefono *
                                            </label>
                                            <input
                                                type="tel"
                                                required={index === 0}
                                                value={contact.phone}
                                                onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                                                placeholder="es. 333 1234567 o 080 123456"
                                                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-scout-green"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                                <User size={12} className="text-scout-blue" />
                                                Nome Referente / Proprietario
                                            </label>
                                            <input
                                                type="text"
                                                value={contact.name}
                                                onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                                                placeholder="es. Mario Rossi, Don Andrea, Custode..."
                                                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-scout-green"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                                <Building size={12} className="text-amber-500" />
                                                Ente / Gruppo Gestore
                                            </label>
                                            <input
                                                type="text"
                                                value={contact.role}
                                                onChange={(e) => handleContactChange(index, 'role', e.target.value)}
                                                placeholder="es. Gruppo Scout AGESCI Grottaglie 1, Comune, Parrocchia..."
                                                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-scout-green"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                                Note / Orari di reperibilità
                                            </label>
                                            <input
                                                type="text"
                                                value={contact.notes}
                                                onChange={(e) => handleContactChange(index, 'notes', e.target.value)}
                                                placeholder="es. Chiamare ore serali, referente chiavi..."
                                                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-scout-green"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-1">
                                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={contact.isWhatsapp}
                                                onChange={(e) => handleContactChange(index, 'isWhatsapp', e.target.checked)}
                                                className="rounded border-gray-300 text-scout-green focus:ring-scout-green w-4 h-4"
                                            />
                                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                                <MessageCircle size={14} className="text-green-500" />
                                                Numero abilitato anche su WhatsApp
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
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
                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                    </div>

                    <div className="mt-4">
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium">Email Contatto (opzionale)</label>
                            <span className="text-[10px] font-bold text-scout-blue bg-scout-blue/10 px-2 py-0.5 rounded-full">+2 pt</span>
                        </div>
                        <input
                            type="email" name="email"
                            value={formData.email} onChange={handleChange}
                            placeholder="esempio@dominio.it"
                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-scout-green"
                        />
                    </div>
                </div>

                {/* Section 2: Logistica Estesa and Coordinates */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="font-semibold text-lg text-scout-green">Logistica e Posizione</h2>
                    </div>

                    {/* Coordinates Section */}
                    <div className="bg-gray-50 dark:bg-gray-750/70 p-4 rounded-2xl border border-gray-200 dark:border-gray-650 mb-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div>
                                <label className="block text-sm font-bold text-gray-900 dark:text-white">
                                    Coordinate Geografiche & Mappa
                                </label>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Necessarie per visualizzare correttamente il luogo sulla mappa.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleAutoFindCoordinates}
                                disabled={isGeocoding}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-scout-blue hover:text-blue-700 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto"
                            >
                                {isGeocoding ? (
                                    <>
                                        <Loader2 size={13} className="animate-spin" />
                                        Ricerca in corso...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={13} />
                                        📍 Ricava Coordinate Automatiche
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Avviso Importanza Coordinate */}
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                            <AlertTriangle size={17} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div className="leading-relaxed">
                                <strong className="font-bold">Consiglio precisione mappa:</strong> Per collocare la struttura nella sua esatta posizione geografica, è fortemente consigliato verificare o inserire le coordinate (Latitudine e Longitudine). Se lasciate vuote, Orme le stimerà in automatico da indirizzo e link Maps al momento del salvataggio.
                            </div>
                        </div>

                        {geoFeedback && (
                            <div className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                                geoFeedback.type === 'success'
                                    ? 'bg-green-50 dark:bg-emerald-950/30 text-green-800 dark:text-emerald-300 border-green-200 dark:border-emerald-800'
                                    : 'bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
                            }`}>
                                {geoFeedback.type === 'success' ? <Check size={14} className="shrink-0 text-scout-green" /> : <AlertTriangle size={14} className="shrink-0 text-red-500" />}
                                <span>{geoFeedback.message}</span>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Link Google Maps (opzionale, estrae coordinate istantaneamente)
                            </label>
                            <input
                                type="url"
                                name="googleMapsLink"
                                value={formData.googleMapsLink}
                                onChange={handleChange}
                                placeholder="Incolla link di Google Maps..."
                                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-scout-green"
                                onBlur={(e) => {
                                    const val = e.target.value.trim();
                                    if (val) {
                                        const coords = extractCoordsFromMapsUrl(val);
                                        if (coords) {
                                            setFormData((prev: any) => ({
                                                ...prev,
                                                latitude: coords.lat.toString(),
                                                longitude: coords.lng.toString()
                                            }));
                                            setGeoFeedback({
                                                type: 'success',
                                                message: `📍 Coordinate estratte dal link Google Maps (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})!`
                                            });
                                        } else if (isShortMapsUrl(val)) {
                                            setGeoFeedback({
                                                type: 'warn',
                                                message: '⚠️ Link breve (maps.app.goo.gl) rilevato: i link brevi non contengono coordinate nel testo. Clicca su "📍 Ricava Coordinate" o seleziona il punto esatto sulla mappa sottostante.'
                                            });
                                        }
                                    }
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Latitudine</label>
                                <input
                                    type="text" name="latitude"
                                    value={(formData as any).latitude || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const parsed = extractCoordsFromMapsUrl(val);
                                        if (parsed) {
                                            setFormData((prev: any) => ({
                                                ...prev,
                                                latitude: parsed.lat.toString(),
                                                longitude: parsed.lng.toString(),
                                            }));
                                            setGeoFeedback({
                                                type: 'success',
                                                message: `📍 Coordinate inserite (${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)})`
                                            });
                                        } else {
                                            handleChange(e);
                                        }
                                    }}
                                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm font-mono"
                                    placeholder="Es. 44.8311"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Longitudine</label>
                                <input
                                    type="text" name="longitude"
                                    value={(formData as any).longitude || ''} onChange={handleChange}
                                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm font-mono"
                                    placeholder="Es. 9.5986"
                                />
                            </div>
                        </div>

                        {/* Mappa interattiva per selezione o spostamento pin sul punto esatto */}
                        <LocationMapPicker
                            latitude={(formData as any).latitude || ''}
                            longitude={(formData as any).longitude || ''}
                            commune={formData.commune}
                            province={formData.province}
                            region={formData.region}
                            onChange={(lat, lng) => {
                                setFormData((prev: any) => ({
                                    ...prev,
                                    latitude: lat.toString(),
                                    longitude: lng.toString(),
                                }));
                                setGeoFeedback({
                                    type: 'success',
                                    message: `📍 Punto esatto posizionato su mappa: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
                                });
                            }}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Posti Letto</label>
                            <input
                                type="number" name="beds"
                                value={formData.beds} onChange={handleChange}
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Bagni (quantità)</label>
                            <input
                                type="number" name="bathrooms"
                                value={formData.bathrooms} onChange={handleChange}
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
                            { key: 'hasDisabledAccess', label: 'Accessibile disabili ♿' },
                        ].map((item) => (
                            <label key={item.key} className="flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
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
                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            placeholder="Es. Accessibile con furgoni..."
                        />
                    </div>
                </div>

                {/* Section 3: Attenzioni */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
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
                            <label key={item.key} className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-colors ${(formData as any)[item.key] ? 'bg-orange-50 dark:bg-orange-900/40 border-orange-200 dark:border-orange-800' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
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
                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            placeholder="Es. Presenza di cinghiali, terreno scosceso..."
                        />
                    </div>
                </div>

                {/* Section 4: Restrizioni */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                    <h2 className="font-semibold text-lg text-red-600">Restrizioni</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {RESTRICTIONS_LIST.map(item => (
                            <label key={item} className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-colors ${formData.restrictions.includes(item) ? 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-800' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
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

                    {/* Regole del Silenzio con orario personalizzabile */}
                    <div className={`p-4 border rounded-2xl transition-all ${
                        hasSilenceRules
                            ? 'bg-red-50/80 dark:bg-red-950/40 border-red-200 dark:border-red-800'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                    }`}>
                        <div className="flex items-center justify-between gap-3">
                            <label className="flex items-start sm:items-center gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={hasSilenceRules}
                                    onChange={(e) => setHasSilenceRules(e.target.checked)}
                                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500 cursor-pointer mt-0.5 sm:mt-0"
                                />
                                <div>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                        <span className="text-base">🌙</span> Regola del Silenzio (orari personalizzati)
                                    </span>
                                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                                        Imposta la fascia oraria di rispetto del silenzio richiesta dalla struttura o dalla zona
                                    </span>
                                </div>
                            </label>
                            {hasSilenceRules && (
                                <span className="text-[10px] font-black uppercase tracking-wider text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/60 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-800 shrink-0">
                                    Attivo
                                </span>
                            )}
                        </div>

                        {hasSilenceRules && (
                            <div className="mt-3.5 pt-3.5 border-t border-red-200/70 dark:border-red-800/60 flex flex-wrap items-center gap-3">
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                    Fascia oraria di silenzio:
                                </span>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 bg-white dark:bg-gray-700 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 shadow-xs">
                                        <span className="text-xs font-semibold text-gray-400">Dalle</span>
                                        <input
                                            type="time"
                                            value={silenceStart}
                                            onChange={(e) => setSilenceStart(e.target.value)}
                                            className="bg-transparent text-xs font-black text-gray-800 dark:text-white outline-none cursor-pointer"
                                        />
                                    </div>
                                    <span className="text-xs font-bold text-gray-400">fino alle</span>
                                    <div className="flex items-center gap-1.5 bg-white dark:bg-gray-700 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 shadow-xs">
                                        <span className="text-xs font-semibold text-gray-400">Alle</span>
                                        <input
                                            type="time"
                                            value={silenceEnd}
                                            onChange={(e) => setSilenceEnd(e.target.value)}
                                            className="bg-transparent text-xs font-black text-gray-800 dark:text-white outline-none cursor-pointer"
                                        />
                                    </div>
                                </div>
                                <div className="text-xs font-bold text-red-800 dark:text-red-300 bg-white/90 dark:bg-gray-800/90 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-800/70 sm:ml-auto shadow-xs">
                                    Vincolo: <span className="font-black">Regole Silenzio: {silenceStart} - {silenceEnd}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Altro (specificare)</label>
                        <input
                            type="text" name="otherRestrictionInput"
                            value={formData.otherRestrictionInput} onChange={handleChange}
                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            placeholder="Es. Non accendere musica, scarpe da togliere all'ingresso..."
                        />
                    </div>
                </div>

                {/* Section 4: Pricing */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="font-semibold text-lg text-scout-brown dark:text-amber-500 flex items-center gap-2">
                            <Save size={20} className="text-scout-brown dark:text-amber-500" />
                            Prezzo e Tariffe
                        </h2>
                        <span className="text-[10px] font-bold text-scout-blue dark:text-scout-blue bg-scout-blue/10 dark:bg-scout-blue/20 px-2 py-0.5 rounded-full">+5 pt</span>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-sm font-medium mb-1">Fascia di Prezzo (Budget)</label>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { val: 0, label: 'N/D', color: 'gray' },
                                { val: 1, label: '€', color: 'green' },
                                { val: 2, label: '€€', color: 'green' },
                                { val: 3, label: '€€€', color: 'green' },
                            ].map((p) => (
                                <button
                                    key={p.val}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, priceCategory: p.val })}
                                    className={`py-3 rounded-xl border-2 font-black transition-all ${
                                        formData.priceCategory === p.val 
                                            ? 'border-scout-green bg-scout-green/10 text-scout-green-dark' 
                                            : 'border-gray-100 dark:border-gray-700 text-gray-400'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Prezzo Base (€)</label>
                            <input
                                type="number" name="pricingBase"
                                value={formData.pricingBase} onChange={handleChange}
                                placeholder="Es. 10 oppure 400"
                                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Tariffa Applicata</label>
                            <select
                                name="pricingTarget"
                                value={formData.pricingTarget} onChange={handleChange}
                                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm font-semibold"
                            >
                                <option value="per_person">👤 A Persona (pro capite)</option>
                                <option value="per_group">👥 A Gruppo (prezzo fisso)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Frequenza</label>
                            <select
                                name="pricingUnit"
                                value={formData.pricingUnit} onChange={handleChange}
                                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm font-semibold"
                            >
                                <option value="per_night">🌙 A Notte</option>
                                <option value="per_day">☀️ Al Giorno</option>
                            </select>
                        </div>
                    </div>

                    {formData.pricingBase && (
                        <div className="p-2.5 rounded-xl bg-green-50 dark:bg-emerald-950/30 border border-green-200 dark:border-emerald-800 text-xs text-green-900 dark:text-emerald-200 font-bold flex items-center gap-2">
                            <span>💶 Tariffa risultante:</span>
                            <span className="underline">
                                {formData.pricingBase}€ {formData.pricingUnit === 'per_night' ? 'a notte' : 'al giorno'} / {formData.pricingTarget === 'per_group' ? 'gruppo (prezzo forfettario totale)' : 'persona (a testa)'}
                            </span>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1">Dettagli e Flessibilità Prezzi</label>
                        <RichTextEditor
                            value={formData.pricingDescription}
                            onChange={(val) => setFormData(prev => ({ ...prev, pricingDescription: val }))}
                            minHeight="100px"
                            placeholder="Es. 15€ con cucina, 13€ senza. Se si va via prima delle 12 la seconda giornata è a metà prezzo."
                        />
                        <p className="text-[10px] text-gray-400 mt-1">
                            Sii specifico: indica costi extra per cucina, acqua/luce o sconti per partenze anticipate.
                        </p>
                    </div>
                </div>

                {/* Section 5: Activities */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                    <h2 className="font-semibold text-lg text-scout-blue dark:text-blue-400">Attività Ideali</h2>
                    <div className="flex flex-wrap gap-2">
                        {(formData.activities as any[]).map(item => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => toggleArrayItem('activities', item)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${formData.activities.includes(item)
                                    ? 'bg-scout-blue text-white border-scout-blue'
                                    : 'bg-white text-gray-600 border-gray-300 hover:border-scout-blue dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:border-scout-blue'
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
                                className="px-3 py-1.5 rounded-full text-sm font-medium border bg-white text-gray-600 border-gray-300 hover:border-scout-blue dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:border-scout-blue"
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Section 6: Note */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                    <h2 className="font-semibold text-lg">Note</h2>
                    <div>
                        <label className="block text-sm font-medium mb-1">Nota Rapida (max 10 parole)</label>
                        <input
                            type="text" name="quickNote"
                            value={formData.quickNote} onChange={handleChange}
                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
