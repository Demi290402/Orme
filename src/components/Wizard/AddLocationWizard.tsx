import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, AlertTriangle } from 'lucide-react';
import { Location, ActivityType } from '@/types';
import { ITALIAN_PROVINCIAL_DATA, ITALIAN_REGIONS } from '@/lib/constants';
// import { addPoints } from '@/lib/gamification'; // No longer used directly here

const ACTIVITIES: ActivityType[] = [
    'Caccia invernale', 'Caccia primaverile', 'Caccia giungla', 'Vacanze di Branco',
    'Campo invernale', 'Campo primaverile', 'San Giorgio', 'Campo estivo',
    'Route invernale', 'Route primaverile', 'Route estiva', 'Pernotto comunità capi',
    'Uscita di apertura', 'Campo di gruppo'
];

export default function AddLocationWizard() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<Partial<Location>>({
        name: '',
        region: '',
        province: '',
        commune: '',
        address: '',
        contacts: [{ type: 'phone', value: '' }],
        activities: [],
        quickNote: '',
        restrictions: [],
        hasTents: false,
        hasRefectory: false,
        hasRoverService: false,
        hasChurch: false,
        hasGreenSpace: false,
        hasEquippedKitchen: false,
        hasPoles: false,
        hasPastures: false,
        hasInsects: false,
        hasDiseases: false,
        hasLittleShade: false,
        hasVeryBusyArea: false,
        otherAttention: '',
        pricing: {
            basePrice: 0,
            unit: 'per_night',
            description: ''
        }
    });

    const livePoints = useMemo(() => {
        let points = 10;
        if (formData.website && formData.website.trim() !== '') points += 2;

        const hasCoordinates = (formData.coordinates?.lat && formData.coordinates?.lng);
        const hasAddress = (formData.address && formData.address.trim() !== '');
        if (hasCoordinates || hasAddress) points += 3;

        if (formData.pricing?.basePrice && formData.pricing?.basePrice > 0) points += 5;
        return points;
    }, [formData]);

    const handleInputChange = (field: keyof Location, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleContactChange = (value: string) => {
        setFormData(prev => ({
            ...prev,
            contacts: [{ type: 'phone', value }]
        }));
    };

    const toggleActivity = (activity: ActivityType) => {
        setFormData(prev => {
            const current = prev.activities || [];
            if (current.includes(activity)) {
                return { ...prev, activities: current.filter(a => a !== activity) };
            } else {
                return { ...prev, activities: [...current, activity] };
            }
        });
    };

    const handleSubmit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        // Prepare location data
        const locationData: Omit<Location, 'id' | 'lastUpdatedAt' | 'lastUpdatedBy'> = {
            ...formData as any,
            contacts: formData.contacts || [{ type: 'phone', value: '' }],
            activities: formData.activities || [],
            restrictions: formData.restrictions || [],
            hasTents: formData.hasTents || false,
            hasRefectory: formData.hasRefectory || false,
            hasRoverService: formData.hasRoverService || false,
        };

        try {
            const { addLocation } = await import('@/lib/data');
            await addLocation(locationData);
            // addPoints is now handled inside addLocation with granular rules
            navigate('/');
        } catch (error) {
            console.error('Submission error:', error);
            alert('Errore durante il salvataggio. Riprova.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="pb-20">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Aggiungi Luogo</h1>
                <div className="flex items-center gap-2 mt-2">
                    <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-scout-green' : 'bg-gray-200'}`} />
                    <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-scout-green' : 'bg-gray-200'}`} />
                </div>
                <div className="flex justify-between items-center mt-2">
                    <p className="text-sm text-gray-500">Passo {step} di 2: {step === 1 ? 'Informazioni Essenziali' : 'Dettagli Aggiuntivi'}</p>
                    <div className="bg-scout-green/10 text-scout-green px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <span>Punti stimati:</span>
                        <span className="text-sm">{livePoints}</span>
                    </div>
                </div>
            </div>

            {step === 1 ? (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Nome Luogo *</label>
                        <input
                            type="text"
                            className="w-full p-3 rounded-xl border-gray-200 border focus:ring-2 focus:ring-scout-green outline-none"
                            value={formData.name}
                            onChange={e => handleInputChange('name', e.target.value)}
                            placeholder="Es. Base Scout Il Ruscello"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Regione *</label>
                            <select
                                className="w-full p-3 rounded-xl border-gray-200 border bg-white outline-none focus:ring-2 focus:ring-scout-green"
                                value={formData.region}
                                onChange={e => {
                                    handleInputChange('region', e.target.value);
                                    handleInputChange('province', '');
                                }}
                            >
                                <option value="">Seleziona Regione...</option>
                                {ITALIAN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Provincia *</label>
                            {formData.region ? (
                                <select
                                    className="w-full p-3 rounded-xl border-gray-200 border bg-white outline-none focus:ring-2 focus:ring-scout-green"
                                    value={formData.province}
                                    onChange={e => handleInputChange('province', e.target.value)}
                                >
                                    <option value="">Seleziona Provincia...</option>
                                    {ITALIAN_PROVINCIAL_DATA[formData.region as string].map(p => (
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
                                type="text"
                                className="w-full p-3 rounded-xl border-gray-200 border outline-none focus:ring-2 focus:ring-scout-green"
                                value={formData.commune}
                                onChange={e => handleInputChange('commune', e.target.value)}
                                placeholder="Es. Linguaglossa"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium">Indirizzo</label>
                                <span className="text-[10px] font-bold text-scout-blue bg-scout-blue/10 px-2 py-0.5 rounded-full">+3 pt</span>
                            </div>
                            <input
                                type="text"
                                className="w-full p-3 rounded-xl border-gray-200 border outline-none focus:ring-2 focus:ring-scout-green"
                                value={formData.address}
                                onChange={e => handleInputChange('address', e.target.value)}
                                placeholder="Via dei Cerchi, 1..."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Contatto (Tel/WhatsApp) *</label>
                        <input
                            type="tel"
                            className="w-full p-3 rounded-xl border-gray-200 border outline-none"
                            value={formData.contacts?.[0]?.value}
                            onChange={e => handleContactChange(e.target.value)}
                            placeholder="333 1234567"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Nota Rapida (10 secondi) *</label>
                        <textarea
                            className="w-full p-3 rounded-xl border-gray-200 border outline-none h-20"
                            value={formData.quickNote}
                            onChange={e => handleInputChange('quickNote', e.target.value)}
                            placeholder="Cosa deve sapere un capo al volo?"
                        />
                    </div>

                    <button
                        onClick={() => setStep(2)}
                        disabled={!formData.name || !formData.region || !formData.province || !formData.commune || !formData.contacts?.[0]?.value}
                        className="w-full bg-scout-green text-white font-bold py-4 rounded-xl mt-6 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        Avanti <ArrowRight size={20} />
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-3">Attività Ideali (Multipla)</label>
                        <div className="flex flex-wrap gap-2">
                            {ACTIVITIES.map(act => (
                                <button
                                    key={act}
                                    onClick={() => toggleActivity(act)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${formData.activities?.includes(act)
                                        ? 'bg-scout-green text-white border-scout-green'
                                        : 'bg-white text-gray-600 border-gray-200'
                                        }`}
                                >
                                    {act}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl bg-white">
                            <input
                                type="checkbox"
                                checked={formData.hasTents}
                                onChange={e => handleInputChange('hasTents', e.target.checked)}
                                className="w-5 h-5 text-scout-green rounded focus:ring-scout-green"
                            />
                            <span className="text-gray-700">Possibilità Tende</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl bg-white">
                            <input
                                type="checkbox"
                                checked={formData.hasRefectory}
                                onChange={e => handleInputChange('hasRefectory', e.target.checked)}
                                className="w-5 h-5 text-scout-green rounded focus:ring-scout-green"
                            />
                            <span className="text-gray-700">Refettorio al chiuso</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl bg-white">
                            <input
                                type="checkbox"
                                checked={formData.hasRoverService}
                                onChange={e => handleInputChange('hasRoverService', e.target.checked)}
                                className="w-5 h-5 text-scout-green rounded focus:ring-scout-green"
                            />
                            <span className="text-gray-700">Servizio Rover/Scolte</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl bg-white">
                            <input
                                type="checkbox"
                                checked={formData.hasEquippedKitchen}
                                onChange={e => handleInputChange('hasEquippedKitchen', e.target.checked)}
                                className="w-5 h-5 text-scout-green rounded focus:ring-scout-green"
                            />
                            <span className="text-gray-700">Cucina Attrezzata</span>
                        </label>
                    </div>

                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 space-y-3">
                        <h3 className="text-sm font-bold text-orange-800 flex items-center gap-2">
                            <AlertTriangle size={16} /> Attenzioni e Rischi
                        </h3>
                        <div className="grid grid-cols-1 gap-2">
                            {[
                                { key: 'hasPastures', label: 'Pascoli e Greggi' },
                                { key: 'hasInsects', label: 'Insetti fastidiosi' },
                                { key: 'hasDiseases', label: 'Malattie/Zecche' },
                                { key: 'hasLittleShade', label: 'Poca ombra' },
                                { key: 'hasVeryBusyArea', label: 'Zona frequentata' },
                            ].map((item) => (
                                <label key={item.key} className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={(formData as any)[item.key]}
                                        onChange={e => handleInputChange(item.key as any, e.target.checked)}
                                        className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                                    />
                                    <span className="text-xs text-gray-700">{item.label}</span>
                                </label>
                            ))}
                        </div>
                        <input
                            type="text"
                            placeholder="Altre attenzioni..."
                            className="w-full p-2 rounded-lg border-gray-200 border outline-none text-xs"
                            value={formData.otherAttention || ''}
                            onChange={e => handleInputChange('otherAttention', e.target.value)}
                        />
                    </div>

                    <div className="bg-scout-brown/5 p-4 rounded-xl border border-scout-brown/10 space-y-3">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-scout-brown">Prezzo e Tariffe</h3>
                            <span className="text-[10px] font-bold text-scout-blue bg-scout-blue/10 px-2 py-0.5 rounded-full">+5 pt</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="number"
                                placeholder="Prezzo Base (€)"
                                className="p-3 rounded-lg border-gray-200 border outline-none text-sm"
                                value={formData.pricing?.basePrice || ''}
                                onChange={e => handleInputChange('pricing', { ...formData.pricing, basePrice: parseFloat(e.target.value) })}
                            />
                            <select
                                className="p-3 rounded-lg border-gray-200 border bg-white outline-none text-sm"
                                value={formData.pricing?.unit || 'per_night'}
                                onChange={e => handleInputChange('pricing', { ...formData.pricing, unit: e.target.value as 'per_night' | 'per_day' })}
                            >
                                <option value="per_night">A Notte</option>
                                <option value="per_day">Al Giorno</option>
                            </select>
                        </div>
                        <textarea
                            placeholder="Dettagli (es. extra cucina, sconti...)"
                            className="w-full p-3 rounded-lg border-gray-200 border outline-none text-sm h-20"
                            value={formData.pricing?.description || ''}
                            onChange={e => handleInputChange('pricing', { ...formData.pricing, description: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-3 pt-6">
                        <button
                            onClick={() => setStep(1)}
                            className="flex-1 bg-gray-100 text-gray-700 font-bold py-4 rounded-xl flex items-center justify-center gap-2"
                        >
                            <ArrowLeft size={20} /> Indietro
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className={`flex-[2] bg-scout-brown text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? (
                                <>Salvataggio...</>
                            ) : (
                                <>
                                    <Save size={20} /> Salva Luogo
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
