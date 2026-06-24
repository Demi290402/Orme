import { useState, useEffect } from 'react';
import { 
    X, Search, Phone, Mail, MessageCircle, Trash2, Edit, Plus, MapPin, Users, Euro, Bus 
} from 'lucide-react';
import { 
    getServiziTrasporto, addServizioTrasporto, updateServizioTrasporto, deleteServizioTrasporto 
} from '@/lib/trasporti';
import { ServizioTrasporto } from '@/types';

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
    const [basePrice, setBasePrice] = useState<number | ''>('');
    const [notes, setNotes] = useState('');

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
        setPricePerPerson(item.pricePerPerson !== undefined ? item.pricePerPerson : '');
        setBasePrice(item.basePrice !== undefined ? item.basePrice : '');
        setNotes(item.notes || '');
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyName || !departureRegion || !departureCommune || !capacity) {
            alert('Compila i campi obbligatori (Nome Ditta, Regione, Comune, Posti)');
            return;
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
            pricePerPerson: pricePerPerson !== '' ? Number(pricePerPerson) : undefined,
            basePrice: basePrice !== '' ? Number(basePrice) : undefined,
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
            const bPrice = item.basePrice || 0;
            matchesPrice = (pPerson > 0 && pPerson <= max) || (bPrice > 0 && bPrice <= max);
        }

        return matchesSearch && matchesRegion && matchesCapacity && matchesPrice;
    });

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl relative border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100 flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-scout-green/10 dark:bg-emerald-950/30 p-2.5 rounded-2xl text-scout-green dark:text-emerald-400">
                            <Bus size={26} />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-black tracking-tight">Rubrica Trasporti Privati</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Ricerca e contatta le ditte di pullman/bus consigliate dal gruppo scout.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!showForm && (
                            <button
                                onClick={openCreateForm}
                                className="bg-scout-green hover:bg-scout-green-dark text-white px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                            >
                                <Plus size={14} />
                                Aggiungi ditta
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {showForm ? (
                    /* CRUD Form */
                    <form onSubmit={handleSubmit} className="space-y-5 animate-in slide-in-from-bottom-4 duration-200">
                        <h3 className="font-extrabold text-base border-b pb-2 text-scout-green-dark dark:text-emerald-400">
                            {editingItem ? 'Modifica Servizio Trasporto' : 'Registra Nuovo Servizio Trasporto'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nome Ditta/Compagnia *</label>
                                <input
                                    type="text" required value={companyName} onChange={e => setCompanyName(e.target.value)}
                                    placeholder="Es: Autolinee Rossi Srl"
                                    className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Referente / Contatto</label>
                                <input
                                    type="text" value={contactName} onChange={e => setContactName(e.target.value)}
                                    placeholder="Es: Sig. Giovanni Rossi"
                                    className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Telefono</label>
                                <input
                                    type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                                    placeholder="Es: +39 0123456789"
                                    className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Email</label>
                                <input
                                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                                    placeholder="Es: info@autolineerossi.it"
                                    className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Punto di Partenza / Sede</h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Regione Partenza *</label>
                                    <select
                                        value={departureRegion} onChange={e => setDepartureRegion(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs"
                                    >
                                        {ITALIAN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Provincia</label>
                                    <input
                                        type="text" value={departureProvince} onChange={e => setDepartureProvince(e.target.value)}
                                        placeholder="Es: MI" maxLength={2}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs uppercase"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Comune *</label>
                                    <input
                                        type="text" required value={departureCommune} onChange={e => setDepartureCommune(e.target.value)}
                                        placeholder="Es: Milano"
                                        className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs"
                                    />
                                </div>
                                <div className="md:col-span-4">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Indirizzo Partenza / Sede Ditta</label>
                                    <input
                                        type="text" value={departureAddress} onChange={e => setDepartureAddress(e.target.value)}
                                        placeholder="Es: Via Roma 15"
                                        className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Capacità e Tariffe</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Capacità (Posti Max) *</label>
                                    <input
                                        type="number" required value={capacity} onChange={e => setCapacity(Number(e.target.value))}
                                        placeholder="Es: 54" min={1}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Prezzo a Persona (€)</label>
                                    <input
                                        type="number" value={pricePerPerson} onChange={e => setPricePerPerson(e.target.value !== '' ? Number(e.target.value) : '')}
                                        placeholder="Es: 15" min={0}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Prezzo Base Corsa (€)</label>
                                    <input
                                        type="number" value={basePrice} onChange={e => setBasePrice(e.target.value !== '' ? Number(e.target.value) : '')}
                                        placeholder="Es: 450" min={0}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Note e Info Aggiuntive</label>
                            <textarea
                                value={notes} onChange={e => setNotes(e.target.value)}
                                placeholder="Fornire dettagli su disponibilità, se hanno sconti per scout, tipologie bus (due piani, minibus, ecc.)"
                                className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs min-h-[80px]"
                            />
                        </div>

                        <div className="flex gap-2 justify-end pt-3 border-t">
                            <button
                                type="button" onClick={() => setShowForm(false)}
                                className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                            >
                                Annulla
                            </button>
                            <button
                                type="submit"
                                className="bg-scout-green hover:bg-scout-green-dark text-white px-5 py-2 rounded-xl text-xs font-black shadow-md cursor-pointer"
                            >
                                Salva
                            </button>
                        </div>
                    </form>
                ) : (
                    /* Directory List */
                    <div className="flex-1 flex flex-col space-y-4 overflow-hidden min-h-0">
                        {/* Filters */}
                        <div className="bg-gray-50 dark:bg-gray-850 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-3 shrink-0">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text" placeholder="Cerca per ditta, comune di partenza, note..."
                                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-250 dark:border-gray-750 bg-white dark:bg-gray-800 text-xs focus:outline-none focus:ring-2 focus:ring-scout-green"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Filtra per Regione Partenza</label>
                                    <select
                                        value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-gray-750 bg-white dark:bg-gray-800 text-xs"
                                    >
                                        <option value="Tutti">Tutte le Regioni</option>
                                        {ITALIAN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Posti Minimi</label>
                                    <input
                                        type="number" value={minCapacity} onChange={e => setMinCapacity(e.target.value !== '' ? Number(e.target.value) : '')}
                                        placeholder="Es: 40" min={1}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-gray-750 bg-white dark:bg-gray-800 text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Prezzo Max Corsa / Persona (€)</label>
                                    <input
                                        type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value !== '' ? Number(e.target.value) : '')}
                                        placeholder="Es: 500" min={0}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-gray-750 bg-white dark:bg-gray-800 text-xs font-bold"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* List Area */}
                        <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-[300px]">
                            {loading ? (
                                <div className="text-center text-gray-500 font-bold py-10 animate-pulse text-xs">
                                    Caricamento ditte trasporti...
                                </div>
                            ) : filteredServizi.length === 0 ? (
                                <div className="text-center text-gray-500 font-medium py-10 text-xs">
                                    Nessuna ditta di trasporti trovata con i filtri correnti.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredServizi.map((item) => (
                                        <div key={item.id} className="bg-white dark:bg-gray-850 p-5 rounded-3xl border border-gray-100 dark:border-gray-800/80 shadow-xs space-y-4 hover:shadow-md transition-shadow relative">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="space-y-1">
                                                    <h4 className="font-extrabold text-sm text-scout-green-dark dark:text-emerald-400">{item.companyName}</h4>
                                                    {item.contactName && (
                                                        <span className="block text-[10px] text-gray-400 font-semibold uppercase">Ref: {item.contactName}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => openEditForm(item)}
                                                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-scout-green rounded-full transition-colors cursor-pointer"
                                                        title="Modifica"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 hover:text-red-700 rounded-full transition-colors cursor-pointer"
                                                        title="Elimina"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-2 text-xs text-gray-650 dark:text-gray-300">
                                                <div className="flex items-start gap-2">
                                                    <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
                                                    <div>
                                                        <span className="font-bold">{item.departureCommune} ({item.departureProvince || 'EE'}), {item.departureRegion}</span>
                                                        {item.departureAddress && <span className="block text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{item.departureAddress}</span>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Users size={14} className="text-gray-400 shrink-0" />
                                                    <span className="font-bold">Capacità: {item.capacity} posti max</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <Euro size={14} className="text-gray-400 shrink-0 mt-0.5" />
                                                    <div className="font-semibold">
                                                        {item.pricePerPerson ? <span>{item.pricePerPerson}€ a persona</span> : null}
                                                        {item.pricePerPerson && item.basePrice ? <span className="mx-1 text-gray-300">|</span> : null}
                                                        {item.basePrice ? <span>{item.basePrice}€ base corsa</span> : null}
                                                        {!item.pricePerPerson && !item.basePrice ? <span className="text-gray-400 italic">Contattare per tariffe</span> : null}
                                                    </div>
                                                </div>
                                            </div>

                                            {item.notes && (
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 italic bg-gray-50/50 dark:bg-gray-900/40 p-2.5 rounded-xl border border-gray-100 dark:border-gray-750">
                                                    "{item.notes}"
                                                </p>
                                            )}

                                            {/* Action contact strip */}
                                            <div className="grid grid-cols-3 gap-2 border-t pt-3">
                                                {item.phone ? (
                                                    <a
                                                        href={`tel:${item.phone}`}
                                                        className="flex items-center justify-center gap-1 py-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 rounded-lg text-[10px] font-bold transition-all text-gray-700 dark:text-gray-200"
                                                    >
                                                        <Phone size={12} className="text-scout-green" />
                                                        Chiama
                                                    </a>
                                                ) : (
                                                    <span className="opacity-30 flex items-center justify-center gap-1 py-1.5 bg-gray-50 dark:bg-gray-800 text-[10px] font-bold rounded-lg text-gray-400 cursor-not-allowed">
                                                        <Phone size={12} />
                                                        Chiama
                                                    </span>
                                                )}

                                                {item.phone ? (
                                                    <a
                                                        href={`https://wa.me/${item.phone}`} target="_blank" rel="noreferrer"
                                                        className="flex items-center justify-center gap-1 py-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 rounded-lg text-[10px] font-bold transition-all text-gray-700 dark:text-gray-200"
                                                    >
                                                        <MessageCircle size={12} className="text-green-500" />
                                                        WhatsApp
                                                    </a>
                                                ) : (
                                                    <span className="opacity-30 flex items-center justify-center gap-1 py-1.5 bg-gray-50 dark:bg-gray-800 text-[10px] font-bold rounded-lg text-gray-400 cursor-not-allowed">
                                                        <MessageCircle size={12} />
                                                        WhatsApp
                                                    </span>
                                                )}

                                                {item.email ? (
                                                    <a
                                                        href={`mailto:${item.email}`}
                                                        className="flex items-center justify-center gap-1 py-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 rounded-lg text-[10px] font-bold transition-all text-gray-700 dark:text-gray-200"
                                                    >
                                                        <Mail size={12} className="text-blue-500" />
                                                        Email
                                                    </a>
                                                ) : (
                                                    <span className="opacity-30 flex items-center justify-center gap-1 py-1.5 bg-gray-50 dark:bg-gray-800 text-[10px] font-bold rounded-lg text-gray-400 cursor-not-allowed">
                                                        <Mail size={12} />
                                                        Email
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
