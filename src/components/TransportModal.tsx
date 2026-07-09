import { useState, useEffect } from 'react';
import { 
    X, Search, Phone, Mail, MessageCircle, Trash2, Edit, Plus, MapPin, Users, Euro, Bus, Filter, ChevronLeft 
} from 'lucide-react';
import { 
    getServiziTrasporto, addServizioTrasporto, updateServizioTrasporto, deleteServizioTrasporto, addQuickPrice 
} from '@/lib/trasporti';
import { ServizioTrasporto } from '@/types';
import { cn } from '@/lib/utils';

const ITALIAN_REGIONS = [
    "Abruzzo", "Basilicata", "Calabria", "Campania", "Emilia-Romagna",
    "Friuli-Venezia Giulia", "Lazio", "Liguria", "Lombardia", "Marche",
    "Molise", "Piemonte", "Puglia", "Sardegna", "Sicilia", "Toscana",
    "Trentino-Alto Adige", "Umbria", "Valle d'Aosta", "Veneto"
];

interface TransportModalProps {
    onClose: () => void;
}

export default function TransportModal({ onClose }: TransportModalProps) {
    const [servizi, setServizi] = useState<ServizioTrasporto[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRegion, setSelectedRegion] = useState('Tutti');
    const [minCapacity, setMinCapacity] = useState<number | ''>('');
    const [maxPrice, setMaxPrice] = useState<number | ''>('');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    // Form states
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<ServizioTrasporto | null>(null);
    const [companyName, setCompanyName] = useState('');
    const [contactName, setContactName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [departureRegion, setDepartureRegion] = useState('Lombardia');
    const [departureProvince, setDepartureProvince] = useState('');
    const [departureCommune, setDepartureCommune] = useState('');
    const [departureAddress, setDepartureAddress] = useState('');
    const [capacity, setCapacity] = useState<number>(50);
    const [pricePerPerson, setPricePerPerson] = useState<number | ''>('');
    const [basePrice, setBasePrice] = useState<number | ''>(''); // Preventivo
    const [km, setKm] = useState<number | ''>('');
    const [numeroPersone, setNumeroPersone] = useState<number | ''>('');
    const [notes, setNotes] = useState('');

    // Detail profile states
    const [selectedDitta, setSelectedDitta] = useState<ServizioTrasporto | null>(null);
    const [quickPrice, setQuickPrice] = useState<number | ''>('');
    const [quickPriceSaving, setQuickPriceSaving] = useState(false);

    const handleSaveQuickPrice = async (companyId: string) => {
        if (quickPrice === '' || Number(quickPrice) <= 0) {
            alert('Inserisci un prezzo a persona valido');
            return;
        }
        setQuickPriceSaving(true);
        try {
            await addQuickPrice(companyId, Number(quickPrice));
            setQuickPrice('');
            // Refresh data
            const data = await getServiziTrasporto();
            setServizi(data);
            const updated = data.find(item => item.id === companyId);
            if (updated) {
                setSelectedDitta(updated);
            }
        } catch (err) {
            console.error('Errore nel salvare il prezzo:', err);
            alert('Impossibile salvare il prezzo. Riprova.');
        } finally {
            setQuickPriceSaving(false);
        }
    };

    const fetchServizi = async () => {
        setLoading(true);
        try {
            const data = await getServiziTrasporto();
            setServizi(data);
        } catch (err) {
            console.error('Errore nel caricamento trasporti:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServizi();
    }, []);

    const openCreateForm = () => {
        setEditingItem(null);
        setCompanyName('');
        setContactName('');
        setPhone('');
        setEmail('');
        setDepartureRegion('Lombardia');
        setDepartureProvince('');
        setDepartureCommune('');
        setDepartureAddress('');
        setCapacity(50);
        setPricePerPerson('');
        setBasePrice('');
        setKm('');
        setNumeroPersone('');
        setNotes('');
        setShowForm(true);
    };

    const openEditForm = (item: ServizioTrasporto) => {
        setEditingItem(item);
        setCompanyName(item.companyName);
        setContactName(item.contactName || '');
        setPhone(item.phone || '');
        setEmail(item.email || '');
        setDepartureRegion(item.departureRegion);
        setDepartureProvince(item.departureProvince || '');
        setDepartureCommune(item.departureCommune);
        setDepartureAddress(item.departureAddress || '');
        setCapacity(item.capacity);
        setPricePerPerson(item.pricePerPerson !== undefined && item.pricePerPerson !== null ? item.pricePerPerson : '');
        setBasePrice(item.basePrice !== undefined && item.basePrice !== null ? item.basePrice : '');
        setKm(item.km !== undefined && item.km !== null ? item.km : '');
        setNumeroPersone(item.numeroPersone !== undefined && item.numeroPersone !== null ? item.numeroPersone : '');
        setNotes(item.notes || '');
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyName || !departureRegion || !departureCommune || !capacity) {
            alert('Compila i campi obbligatori (Nome Ditta, Regione, Comune, Posti)');
            return;
        }

        if (basePrice !== '') {
            if (km === '' || numeroPersone === '') {
                alert('Se inserisci un preventivo totale, devi obbligatoriamente specificare anche il chilometraggio (km) e il numero di persone.');
                return;
            }
        }

        const payload = {
            companyName,
            contactName,
            phone,
            email,
            departureRegion,
            departureProvince,
            departureCommune,
            departureAddress,
            capacity: Number(capacity),
            pricePerPerson: pricePerPerson !== '' ? Number(pricePerPerson) : null,
            basePrice: basePrice !== '' ? Number(basePrice) : null,
            km: km !== '' ? Number(km) : null,
            numeroPersone: numeroPersone !== '' ? Number(numeroPersone) : null,
            notes
        };

        try {
            if (editingItem) {
                await updateServizioTrasporto(editingItem.id, payload);
            } else {
                await addServizioTrasporto(payload);
            }
            setShowForm(false);
            fetchServizi();
        } catch (err) {
            console.error('Errore durante il salvataggio:', err);
            alert('Errore nel salvataggio. Riprova.');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Sei sicuro di voler eliminare questo servizio di trasporto?')) {
            const success = await deleteServizioTrasporto(id);
            if (success) {
                fetchServizi();
            } else {
                alert('Errore nell\'eliminazione.');
            }
        }
    };

    // Filter Logic
    const filteredServizi = servizi.filter(item => {
        const matchesSearch = item.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.contactName && item.contactName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            item.departureCommune.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesRegion = selectedRegion === 'Tutti' || item.departureRegion === selectedRegion;
        const matchesCapacity = minCapacity === '' || item.capacity >= Number(minCapacity);
        
        let matchesPrice = true;
        if (maxPrice !== '') {
            const max = Number(maxPrice);
            const pPerson = item.pricePerPerson || 0;
            const calculatedPPerson = (item.basePrice && item.numeroPersone) ? (item.basePrice / item.numeroPersone) : 0;
            
            matchesPrice = (pPerson > 0 && pPerson <= max) || (calculatedPPerson > 0 && calculatedPPerson <= max);
        }

        return matchesSearch && matchesRegion && matchesCapacity && matchesPrice;
    });

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl relative border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                {/* Header - Fixed at top */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 p-6 md:p-8 pb-4 border-b border-gray-100 dark:border-gray-850 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-scout-green/10 dark:bg-emerald-950/30 p-2.5 rounded-2xl text-scout-green dark:text-emerald-400 shrink-0">
                            <Bus size={26} />
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-black tracking-tight text-gray-900 dark:text-white">Rubrica Trasporti Privati</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Ricerca e contatta le ditte di pullman/bus consigliate dal gruppo scout.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                        {!showForm && (
                            <button
                                onClick={openCreateForm}
                                className="bg-scout-green hover:bg-scout-green-dark text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                            >
                                <Plus size={14} />
                                Aggiungi ditta
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 dark:text-gray-500 transition-colors cursor-pointer shrink-0">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Modal Body - Scrollable content area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-4 min-h-0">
                    {showForm ? (
                        /* CRUD Form */
                        <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-bottom-4 duration-200">
                            <h3 className="font-extrabold text-base border-b border-gray-100 dark:border-gray-800 pb-2 text-scout-green-dark dark:text-emerald-400">
                                {editingItem ? 'Modifica Servizio Trasporto' : 'Registra Nuovo Servizio Trasporto'}
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 tracking-wider">Nome Ditta/Compagnia *</label>
                                    <input
                                        type="text" required value={companyName} onChange={e => setCompanyName(e.target.value)}
                                        placeholder="Es: Autolinee Rossi Srl"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-scout-green/30 focus:border-scout-green focus:outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 tracking-wider">Referente / Contatto</label>
                                    <input
                                        type="text" value={contactName} onChange={e => setContactName(e.target.value)}
                                        placeholder="Es: Sig. Giovanni Rossi"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-scout-green/30 focus:border-scout-green focus:outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 tracking-wider">Telefono</label>
                                    <input
                                        type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                                        placeholder="Es: +39 0123456789"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-scout-green/30 focus:border-scout-green focus:outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 tracking-wider">Email</label>
                                    <input
                                        type="email" value={email} onChange={e => setEmail(e.target.value)}
                                        placeholder="Es: info@autolineerossi.it"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-scout-green/30 focus:border-scout-green focus:outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <h4 className="text-[11px] font-black text-scout-green-dark dark:text-emerald-400 uppercase tracking-widest border-l-2 border-scout-green pl-2">Punto di Partenza / Sede</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 tracking-wider">Regione Partenza *</label>
                                        <select
                                            value={departureRegion} onChange={e => setDepartureRegion(e.target.value)}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-scout-green/30 focus:border-scout-green focus:outline-none transition-all"
                                        >
                                            {ITALIAN_REGIONS.map(r => <option key={r} value={r} className="bg-white dark:bg-gray-900">{r}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 tracking-wider">Provincia</label>
                                        <input
                                            type="text" value={departureProvince} onChange={e => setDepartureProvince(e.target.value)}
                                            placeholder="Es: MI" maxLength={2}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-scout-green/30 focus:border-scout-green focus:outline-none transition-all uppercase"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 tracking-wider">Comune *</label>
                                        <input
                                            type="text" required value={departureCommune} onChange={e => setDepartureCommune(e.target.value)}
                                            placeholder="Es: Milano"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-scout-green/30 focus:border-scout-green focus:outline-none transition-all"
                                        />
                                    </div>
                                    <div className="md:col-span-4">
                                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 tracking-wider">Indirizzo di Partenza</label>
                                        <input
                                            type="text" value={departureAddress} onChange={e => setDepartureAddress(e.target.value)}
                                            placeholder="Es: Via Roma 15"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-scout-green/30 focus:border-scout-green focus:outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-2">
                                <h4 className="text-[11px] font-black text-scout-green-dark dark:text-emerald-400 uppercase tracking-widest border-l-2 border-scout-green pl-2">Capacità e Tariffe</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 tracking-wider">Capacità (Posti Max) *</label>
                                        <input
                                            type="number" required value={capacity} onChange={e => setCapacity(Number(e.target.value))}
                                            placeholder="Es: 54" min={1}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-scout-green/30 focus:border-scout-green focus:outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 tracking-wider">Prezzo a Persona per Tratta (€)</label>
                                        <input
                                            type="number" value={pricePerPerson} onChange={e => setPricePerPerson(e.target.value !== '' ? Number(e.target.value) : '')}
                                            placeholder="Es: 15" min={0}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-scout-green/30 focus:border-scout-green focus:outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="bg-gray-50/50 dark:bg-gray-950/20 p-4 rounded-xl border border-gray-200/80 dark:border-gray-800/80 space-y-3">
                                    <span className="block text-[10px] font-black text-scout-green-dark dark:text-emerald-400 uppercase tracking-widest leading-none">Preventivo e Dettagli Corsa</span>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 tracking-wider">Preventivo (€)</label>
                                            <input
                                                type="number" value={basePrice} onChange={e => setBasePrice(e.target.value !== '' ? Number(e.target.value) : '')}
                                                placeholder="Es: 2000" min={0}
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-scout-green/30 focus:border-scout-green focus:outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 tracking-wider">Chilometraggio (km)</label>
                                            <input
                                                type="number" value={km} onChange={e => setKm(e.target.value !== '' ? Number(e.target.value) : '')}
                                                placeholder="Es: 350" min={0}
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-scout-green/30 focus:border-scout-green focus:outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 tracking-wider">Numero Persone</label>
                                            <input
                                                type="number" value={numeroPersone} onChange={e => setNumeroPersone(e.target.value !== '' ? Number(e.target.value) : '')}
                                                placeholder="Es: 50" min={1}
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-scout-green/30 focus:border-scout-green focus:outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    {basePrice !== '' && km !== '' && numeroPersone !== '' && (
                                        <div className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold italic flex items-center gap-1 mt-1">
                                            <span>Prezzo calcolato a persona: <strong>{((Number(basePrice)) / Number(numeroPersone)).toFixed(2)}€</strong> (preventivo totale di {basePrice}€ per {numeroPersone} persone su {km} km)</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 tracking-wider">Note e Info Aggiuntive</label>
                                <textarea
                                    value={notes} onChange={e => setNotes(e.target.value)}
                                    placeholder="Fornire dettagli su disponibilità, se hanno sconti per scout, tipologie bus (due piani, minibus, ecc.)"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-scout-green/30 focus:border-scout-green focus:outline-none transition-all min-h-[80px]"
                                />
                            </div>

                            <div className="flex gap-2 justify-end pt-3 border-t border-gray-100 dark:border-gray-800/80">
                                <button
                                    type="button" onClick={() => setShowForm(false)}
                                    className="px-4 py-2 border border-gray-200 dark:border-gray-850 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-850 dark:text-gray-400 cursor-pointer transition-colors"
                                >
                                    Annulla
                                </button>
                                <button
                                    type="submit"
                                    className="bg-scout-green hover:bg-scout-green-dark text-white px-5 py-2 rounded-xl text-xs font-black shadow-md active:scale-95 cursor-pointer transition-all"
                                >
                                    Salva
                                </button>
                            </div>
                        </form>
                    ) : selectedDitta ? (
                        /* Profilo Ditta Detail View */
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-200">
                             {/* Back button and title */}
                             <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
                                 <button 
                                     onClick={() => setSelectedDitta(null)}
                                     className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                     type="button"
                                 >
                                     <ChevronLeft size={20} />
                                 </button>
                                 <div>
                                     <h3 className="font-extrabold text-base text-scout-green-dark dark:text-emerald-400">
                                         {selectedDitta.companyName}
                                     </h3>
                                     <p className="text-xs text-gray-500 dark:text-gray-400">Profilo completo ditta di trasporti</p>
                                 </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 {/* Left: General Info & Actions */}
                                 <div className="space-y-4">
                                     <div className="bg-gray-50 dark:bg-gray-850 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
                                         <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-405 dark:text-gray-500 border-l-2 border-scout-green pl-2 leading-none">Contatti e Sede</h4>
                                         
                                         <div className="space-y-3">
                                             <div className="flex items-start gap-2.5 text-xs">
                                                 <MapPin size={16} className="text-scout-green dark:text-emerald-500 shrink-0 mt-0.5" />
                                                 <div>
                                                     <p className="font-bold text-gray-905 dark:text-white">{selectedDitta.departureCommune} ({selectedDitta.departureProvince || 'EE'}), {selectedDitta.departureRegion}</p>
                                                     {selectedDitta.departureAddress && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{selectedDitta.departureAddress}</p>}
                                                 </div>
                                             </div>
                                             <div className="flex items-center gap-2.5 text-xs">
                                                 <Users size={16} className="text-scout-green dark:text-emerald-500 shrink-0" />
                                                 <p className="font-semibold text-gray-600 dark:text-gray-400">Capacità bus consigliato: <strong className="text-gray-900 dark:text-white font-extrabold">{selectedDitta.capacity} posti max</strong></p>
                                             </div>
                                             {selectedDitta.contactName && (
                                                 <div className="flex items-center gap-2.5 text-xs border-t border-gray-100 dark:border-gray-800/60 pt-3">
                                                     <span className="text-[10px] font-bold text-gray-400 uppercase">Referente ditta:</span>
                                                     <span className="font-bold text-gray-800 dark:text-gray-200">{selectedDitta.contactName}</span>
                                                 </div>
                                             )}
                                         </div>
                                     </div>

                                     {/* Large Premium Contact Buttons */}
                                     <div className="space-y-2">
                                         {selectedDitta.phone && (
                                             <div className="grid grid-cols-2 gap-2">
                                                 <a
                                                     href={`tel:${selectedDitta.phone}`}
                                                     className="flex items-center justify-center gap-2 py-3 bg-blue-50/50 hover:bg-blue-100/60 dark:bg-blue-950/20 dark:hover:bg-blue-950/45 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-black transition-all border border-blue-100 dark:border-blue-900/30 text-center shadow-sm"
                                                 >
                                                     <Phone size={14} className="shrink-0" />
                                                     Chiama Ora
                                                 </a>
                                                 <a
                                                     href={`https://wa.me/${selectedDitta.phone}`} target="_blank" rel="noreferrer"
                                                     className="flex items-center justify-center gap-2 py-3 bg-emerald-50/50 hover:bg-emerald-100/60 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-black transition-all border border-emerald-100 dark:border-emerald-900/30 text-center shadow-sm"
                                                 >
                                                     <MessageCircle size={14} className="shrink-0" />
                                                     WhatsApp
                                                 </a>
                                             </div>
                                         )}
                                         {selectedDitta.email && (
                                             <a
                                                 href={`mailto:${selectedDitta.email}`}
                                                 className="flex items-center justify-center gap-2 py-3 bg-purple-50/50 hover:bg-purple-100/60 dark:bg-purple-950/20 dark:hover:bg-purple-950/45 text-purple-600 dark:text-purple-400 rounded-xl text-xs font-black transition-all border border-purple-100 dark:border-purple-900/30 text-center w-full shadow-sm"
                                             >
                                                 <Mail size={14} className="shrink-0" />
                                                 Invia Email di Richiesta
                                             </a>
                                         )}
                                     </div>

                                     {selectedDitta.notes && (
                                         <div className="bg-gray-50/50 dark:bg-gray-850/50 p-4 rounded-xl border border-gray-150 dark:border-gray-800 border-l-2 border-l-scout-green dark:border-l-emerald-500">
                                             <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Informazioni Aggiuntive</p>
                                             <p className="text-xs text-gray-650 dark:text-gray-450 italic font-medium">"{selectedDitta.notes}"</p>
                                         </div>
                                     )}
                                 </div>

                                 {/* Right: Pricing & Quotes */}
                                 <div className="space-y-4">
                                     {/* Private Quote Section */}
                                     <div className="bg-gray-50 dark:bg-gray-850 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
                                         <div className="flex items-center justify-between">
                                             <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 border-l-2 border-scout-brown pl-2 leading-none">Preventivo del tuo Gruppo</h4>
                                             {selectedDitta.basePrice && (
                                                 <button
                                                     onClick={() => { setSelectedDitta(null); openEditForm(selectedDitta); }}
                                                     className="text-[10px] font-black text-scout-blue hover:underline"
                                                 >
                                                     Modifica
                                                 </button>
                                             )}
                                         </div>

                                         {selectedDitta.basePrice ? (
                                             <div className="space-y-3">
                                                 <div className="flex justify-between items-center text-xs">
                                                     <span className="text-gray-500">Preventivo Totale:</span>
                                                     <span className="font-extrabold text-gray-905 dark:text-white text-sm">{selectedDitta.basePrice} €</span>
                                                 </div>
                                                 <div className="flex justify-between items-center text-xs border-t border-gray-100 dark:border-gray-800/40 pt-2">
                                                     <span className="text-gray-500">Distanza / Chilometri:</span>
                                                     <span className="font-bold text-gray-800 dark:text-gray-200">{selectedDitta.km} km</span>
                                                 </div>
                                                 <div className="flex justify-between items-center text-xs border-t border-gray-100 dark:border-gray-800/40 pt-2">
                                                     <span className="text-gray-500">Partecipanti:</span>
                                                     <span className="font-bold text-gray-800 dark:text-gray-200">{selectedDitta.numeroPersone} persone</span>
                                                 </div>
                                                 <div className="flex justify-between items-center text-xs bg-scout-green/5 dark:bg-emerald-950/20 px-3 py-2.5 rounded-xl border border-scout-green/10">
                                                     <span className="font-bold text-scout-green-dark dark:text-emerald-400">Prezzo a persona stimato:</span>
                                                     <span className="font-extrabold text-scout-green dark:text-emerald-300 text-sm">
                                                         {selectedDitta.numeroPersone && (selectedDitta.basePrice / selectedDitta.numeroPersone).toFixed(2)} €
                                                     </span>
                                                 </div>
                                             </div>
                                         ) : (
                                             <div className="space-y-3 text-center py-4">
                                                 <p className="text-xs text-gray-400 dark:text-gray-550 italic">Nessun preventivo registrato da questo gruppo.</p>
                                                 <button
                                                     onClick={() => { setSelectedDitta(null); openEditForm(selectedDitta); }}
                                                     className="bg-scout-brown hover:bg-scout-brown/90 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
                                                 >
                                                     <Plus size={12} />
                                                     Aggiungi Preventivo
                                                 </button>
                                             </div>
                                         )}
                                     </div>

                                     {/* Shared Price Estimations & Timeline */}
                                     <div className="bg-gray-50 dark:bg-gray-850 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
                                         <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 border-l-2 border-yellow-500 pl-2 leading-none">Andamento Storico Prezzi (Globale)</h4>
                                         
                                         {(() => {
                                             const prezziStorici = selectedDitta.prezziStorici || [];
                                             const average = prezziStorici.length > 0 
                                                 ? (prezziStorici.reduce((acc, curr) => acc + curr.pricePerPerson, 0) / prezziStorici.length)
                                                 : null;
                                             
                                             return (
                                                 <div className="space-y-4">
                                                     {average ? (
                                                         <div className="bg-yellow-500/5 dark:bg-yellow-500/10 p-3 rounded-xl border border-yellow-500/25 flex justify-between items-center text-xs">
                                                             <span className="font-bold text-yellow-600 dark:text-yellow-400">Media indicativa tariffa:</span>
                                                             <span className="font-extrabold text-yellow-500 text-sm">{average.toFixed(2)} € <span className="text-[10px] font-normal text-gray-400">/ pers</span></span>
                                                         </div>
                                                     ) : (
                                                         <p className="text-[11px] text-gray-450 dark:text-gray-500 italic">Nessuna tariffa registrata nello storico.</p>
                                                     )}

                                                     {prezziStorici.length > 0 && (
                                                         <div className="space-y-1.5">
                                                             <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Ultimi 5 preventivi registrati:</p>
                                                             <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                                                                 {prezziStorici.map((p, idx) => (
                                                                     <div key={p.id || idx} className="flex justify-between items-center text-[10px] bg-white dark:bg-gray-900 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-800">
                                                                         <span className="font-bold text-gray-800 dark:text-gray-250">{p.pricePerPerson.toFixed(2)} € / persona</span>
                                                                         <span className="text-gray-400">{new Date(p.createdAt).toLocaleDateString('it-IT')}</span>
                                                                     </div>
                                                                 ))}
                                                             </div>
                                                         </div>
                                                     )}

                                                     {/* Quick Add Form */}
                                                     <div className="bg-white dark:bg-gray-900/60 p-4 rounded-xl border border-gray-100 dark:border-gray-700/60 space-y-2">
                                                         <p className="text-[9px] font-bold text-gray-700 dark:text-gray-300">Hai ricevuto un preventivo di recente?</p>
                                                         <div className="flex gap-2">
                                                             <div className="relative flex-1">
                                                                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">€</span>
                                                                 <input
                                                                     type="number"
                                                                     placeholder="Prezzo a persona..."
                                                                     value={quickPrice}
                                                                     onChange={e => setQuickPrice(e.target.value !== '' ? Number(e.target.value) : '')}
                                                                     className="w-full pl-7 pr-3 py-1.5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl text-xs outline-none focus:ring-1 focus:ring-scout-green font-bold text-gray-850 dark:text-gray-200"
                                                                 />
                                                             </div>
                                                             <button
                                                                 onClick={() => handleSaveQuickPrice(selectedDitta.id)}
                                                                 disabled={quickPriceSaving}
                                                                 className="bg-scout-green hover:bg-scout-green-dark text-white px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 shadow-sm"
                                                                 type="button"
                                                             >
                                                                 {quickPriceSaving ? 'Salvataggio...' : 'Aggiungi'}
                                                             </button>
                                                         </div>
                                                         <p className="text-[8px] text-gray-400 leading-normal">Inserendo il prezzo a persona aiuterai gli altri gruppi scout a calcolare stime di spesa.</p>
                                                     </div>
                                                 </div>
                                             );
                                         })()}
                                     </div>
                                 </div>
                             </div>
                        </div>
                    ) : (
                        /* Directory List */
                        <div className="space-y-6">
                            {/* Filters Card - Gestalt Common Region */}
                            <div className="bg-gray-50/80 dark:bg-gray-850/60 p-4 md:p-5 rounded-2xl border border-gray-150 dark:border-gray-800 space-y-4 shadow-sm backdrop-blur-xs">
                                <div className="flex items-center gap-3">
                                    <div className="relative flex-1">
                                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                                        <input
                                            type="text" placeholder="Cerca per ditta, comune di partenza, note..."
                                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-scout-green/30 focus:border-scout-green placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-all"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                        className={cn(
                                            "px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0",
                                            showAdvancedFilters 
                                                ? "bg-scout-green/10 border-scout-green text-scout-green dark:text-emerald-400 dark:bg-emerald-950/20" 
                                                : "bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-455 hover:bg-gray-50 dark:hover:bg-gray-900"
                                        )}
                                    >
                                        <Filter size={14} />
                                        <span>Filtri</span>
                                    </button>
                                </div>
                                
                                {showAdvancedFilters && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-800/80 animate-in slide-in-from-top-2 duration-150">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1.5 tracking-wider">Filtra per Regione Partenza</label>
                                            <select
                                                value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-scout-green/30 focus:border-scout-green transition-all"
                                            >
                                                <option value="Tutti" className="bg-white dark:bg-gray-950">Tutte le Regioni</option>
                                                {ITALIAN_REGIONS.map(r => <option key={r} value={r} className="bg-white dark:bg-gray-950">{r}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1.5 tracking-wider">Posti Minimi</label>
                                            <input
                                                type="number" value={minCapacity} onChange={e => setMinCapacity(e.target.value !== '' ? Number(e.target.value) : '')}
                                                placeholder="Es: 40" min={1}
                                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-scout-green/30 focus:border-scout-green transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1.5 tracking-wider">Prezzo Max Corsa / Persona (€)</label>
                                            <input
                                                type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value !== '' ? Number(e.target.value) : '')}
                                                placeholder="Es: 500" min={0}
                                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-scout-green/30 focus:border-scout-green transition-all"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
 
                            {/* List Cards Area */}
                            {loading ? (
                                <div className="text-center text-gray-500 dark:text-gray-400 font-bold py-12 animate-pulse text-xs">
                                    Caricamento ditte trasporti...
                                </div>
                            ) : filteredServizi.length === 0 ? (
                                <div className="text-center text-gray-500 dark:text-gray-400 font-medium py-12 text-xs border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/20 dark:bg-gray-900/10">
                                    Nessuna ditta di trasporti trovata con i filtri correnti.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredServizi.map((item) => (
                                        <div 
                                            key={item.id} 
                                            onClick={() => setSelectedDitta(item)}
                                            className="bg-gray-50/30 dark:bg-gray-850/40 hover:bg-gray-50/70 dark:hover:bg-gray-850/70 p-5 rounded-2xl border border-gray-150 dark:border-gray-800/80 shadow-xs hover:shadow-md transition-all duration-200 space-y-4 relative group cursor-pointer active:scale-[0.99]"
                                        >
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="space-y-1">
                                                    <h4 className="font-extrabold text-sm text-scout-green-dark dark:text-emerald-400 group-hover:text-scout-green dark:group-hover:text-emerald-300 transition-colors">{item.companyName}</h4>
                                                    {item.contactName && (
                                                        <span className="block text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Referente: {item.contactName}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openEditForm(item); }}
                                                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 hover:text-scout-green dark:hover:text-emerald-400 rounded-full transition-colors cursor-pointer"
                                                        title="Modifica"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full transition-colors cursor-pointer"
                                                        title="Elimina"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
 
                                            <div className="space-y-2.5 text-xs text-gray-700 dark:text-gray-300">
                                                <div className="flex items-start gap-2.5">
                                                    <MapPin size={15} className="text-scout-green dark:text-emerald-500 shrink-0 mt-0.5" />
                                                    <div>
                                                        <span className="font-bold text-gray-850 dark:text-gray-200">{item.departureCommune} ({item.departureProvince || 'EE'}), {item.departureRegion}</span>
                                                        {item.departureAddress && <span className="block text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{item.departureAddress}</span>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2.5">
                                                    <Users size={15} className="text-scout-green dark:text-emerald-500 shrink-0" />
                                                    <span className="font-semibold text-gray-600 dark:text-gray-400">
                                                        Capacità: <strong className="text-gray-850 dark:text-white font-extrabold">{item.capacity} posti max</strong>
                                                    </span>
                                                </div>
                                                <div className="flex items-start gap-2.5">
                                                    <Euro size={15} className="text-scout-green dark:text-emerald-500 shrink-0 mt-0.5" />
                                                    <div className="font-semibold text-gray-600 dark:text-gray-400 flex-1">
                                                        <div className="flex flex-col gap-1.5 border-l-2 border-scout-green/20 dark:border-emerald-500/20 pl-2.5 my-0.5">
                                                            {item.pricePerPerson ? (
                                                                <div className="text-xs">
                                                                    Tratta standard: <span className="font-extrabold text-gray-900 dark:text-white">{item.pricePerPerson}€ a persona</span>
                                                                </div>
                                                            ) : null}
                                                            {item.basePrice ? (
                                                                <div className="text-xs space-y-1">
                                                                    <div>
                                                                        Preventivo ditta: <span className="font-extrabold text-gray-900 dark:text-white">{item.basePrice}€ totali</span>
                                                                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium"> ({item.km} km, {item.numeroPersone} persone)</span>
                                                                    </div>
                                                                    {item.numeroPersone && (
                                                                        <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                                                                            Costo stimato: <span className="font-extrabold text-scout-green-dark dark:text-emerald-400">{(item.basePrice / item.numeroPersone).toFixed(2)}€ a persona</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : null}
                                                            {!item.pricePerPerson && !item.basePrice ? (
                                                                <span className="text-gray-400 dark:text-gray-500 italic text-xs">Contattare per tariffe e preventivo</span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
 
                                            {item.notes && (
                                                <p className="text-[11px] text-gray-650 dark:text-gray-400 italic bg-white/60 dark:bg-gray-900/40 p-3 rounded-xl border border-gray-150 dark:border-gray-800 border-l-2 border-l-scout-green dark:border-l-emerald-500 font-medium">
                                                    "{item.notes}"
                                                </p>
                                            )}
 
                                            {/* Action contact strip - Similarity & Scannability */}
                                            <div className="grid grid-cols-3 gap-2 border-t border-gray-100 dark:border-gray-800/80 pt-3">
                                                {item.phone ? (
                                                    <a
                                                        href={`tel:${item.phone}`}
                                                        onClick={e => e.stopPropagation()}
                                                        className="flex items-center justify-center gap-1.5 py-2 bg-blue-50/50 hover:bg-blue-100/60 dark:bg-blue-950/20 dark:hover:bg-blue-950/45 text-blue-600 dark:text-blue-400 rounded-xl text-[10px] font-black transition-all"
                                                    >
                                                        <Phone size={12} className="shrink-0" />
                                                        Chiama
                                                    </a>
                                                ) : (
                                                    <span className="flex items-center justify-center gap-1.5 py-2 bg-gray-100 dark:bg-gray-800/20 text-[10px] font-bold rounded-xl text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50">
                                                        <Phone size={12} className="shrink-0" />
                                                        Chiama
                                                    </span>
                                                )}
 
                                                {item.phone ? (
                                                    <a
                                                        href={`https://wa.me/${item.phone}`} target="_blank" rel="noreferrer"
                                                        onClick={e => e.stopPropagation()}
                                                        className="flex items-center justify-center gap-1.5 py-2 bg-emerald-50/50 hover:bg-emerald-100/60 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black transition-all"
                                                    >
                                                        <MessageCircle size={12} className="shrink-0" />
                                                        WhatsApp
                                                    </a>
                                                ) : (
                                                    <span className="flex items-center justify-center gap-1.5 py-2 bg-gray-100 dark:bg-gray-800/20 text-[10px] font-bold rounded-xl text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50">
                                                        <MessageCircle size={12} className="shrink-0" />
                                                        WhatsApp
                                                    </span>
                                                )}
 
                                                {item.email ? (
                                                    <a
                                                        href={`mailto:${item.email}`}
                                                        onClick={e => e.stopPropagation()}
                                                        className="flex items-center justify-center gap-1.5 py-2 bg-purple-50/50 hover:bg-purple-100/60 dark:bg-purple-950/20 dark:hover:bg-purple-950/45 text-purple-600 dark:text-purple-400 rounded-xl text-[10px] font-black transition-all"
                                                    >
                                                        <Mail size={12} className="shrink-0" />
                                                        Email
                                                    </a>
                                                ) : (
                                                    <span className="flex items-center justify-center gap-1.5 py-2 bg-gray-100 dark:bg-gray-800/20 text-[10px] font-bold rounded-xl text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50">
                                                        <Mail size={12} className="shrink-0" />
                                                        Email
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
