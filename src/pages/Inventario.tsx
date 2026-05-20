import React, { useState, useEffect, useMemo } from 'react';
import { 
    Wrench, Box, Plus, Search, AlertTriangle, 
    Printer, QrCode, ClipboardCheck, Trash2, XCircle, 
    Home, Archive, Warehouse, Compass, Check, 
    RefreshCw, Layers, CheckCircle2, MapPin, Image as ImageIcon,
    Minus, AlertCircle, X, Filter
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { 
    getInventarioLuoghi, addInventarioLuogo, updateInventarioLuogo, deleteInventarioLuogo,
    getInventarioAttrezzi, addInventarioAttrezzo, updateInventarioAttrezzo, deleteInventarioAttrezzo,
    auditInventarioAttrezzi, resizeAndCompressImage, uploadAttrezzoImage
} from '@/lib/inventario';
import { InventarioLuogo, InventarioAttrezzo, AttrezzoStatus } from '@/types';
import { cn } from '@/lib/utils';

// =====================================================
// HELPERS
// =====================================================
const CATEGORIES = [
    { id: 'Generico', label: 'Generico' },
    { id: 'Pionieristica', label: 'Pionieristica' },
    { id: 'Campeggio', label: 'Campeggio' },
    { id: 'Cucina', label: 'Cucina' },
    { id: 'Sicurezza', label: 'Sicurezza' },
    { id: 'Cancelleria', label: 'Cancelleria' },
    { id: 'Altro', label: 'Altro' }
];

const PRESET_COLORS = [
    '#4CAF50', // Emerald Green
    '#0288D1', // Ocean Blue
    '#E97A00', // Warning Orange
    '#9C27B0', // Royal Purple
    '#E53935', // Crimson Red
    '#8B4513', // Saddle Brown
    '#00897B', // Teal Green
    '#F57F17', // Gold Yellow
];

const AVAILABLE_ICONS = [
    { name: 'Home', component: Home },
    { name: 'Archive', component: Archive },
    { name: 'Warehouse', component: Warehouse },
    { name: 'Compass', component: Compass },
    { name: 'MapPin', component: MapPin },
    { name: 'Box', component: Box },
    { name: 'Wrench', component: Wrench }
];

function getContrastColor(hex: string) {
    if (!hex || hex.length < 6) return 'white';
    const color = hex.replace('#', '');
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 180 ? '#1f2937' : 'white'; // text-gray-800 for light bgs
}

function getIconComponent(name: string) {
    const found = AVAILABLE_ICONS.find(i => i.name === name);
    return found ? found.component : MapPin;
}

export default function Inventario() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<'attrezzi' | 'luoghi'>('attrezzi');

    // Data lists
    const [luoghi, setLuoghi] = useState<InventarioLuogo[]>([]);
    const [attrezzi, setAttrezzi] = useState<InventarioAttrezzo[]>([]);
    const [loading, setLoading] = useState(true);

    // Search and filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('Tutti');
    const [selectedLuogo, setSelectedLuogo] = useState<string>('Tutti');
    const [showOnlyDangerous, setShowOnlyDangerous] = useState(false);
    const [showOnlyIssues, setShowOnlyIssues] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const activeFiltersCount = useMemo(() => {
        return (selectedCategory !== 'Tutti' ? 1 : 0) +
            (selectedLuogo !== 'Tutti' ? 1 : 0) +
            (showOnlyDangerous ? 1 : 0) +
            (showOnlyIssues ? 1 : 0);
    }, [selectedCategory, selectedLuogo, showOnlyDangerous, showOnlyIssues]);

    // Modals visibility
    const [showAttrezzoForm, setShowAttrezzoForm] = useState(false);
    const [editingAttrezzo, setEditingAttrezzo] = useState<InventarioAttrezzo | null>(null);
    
    const [showLuogoForm, setShowLuogoForm] = useState(false);
    const [editingLuogo, setEditingLuogo] = useState<InventarioLuogo | null>(null);

    const [showAuditModal, setShowAuditModal] = useState(false);
    const [auditLocationId, setAuditLocationId] = useState<string>('');

    const [showQrModal, setShowQrModal] = useState(false);
    const [qrItem, setQrItem] = useState<{ id: string; name: string; type: 'attrezzo' | 'luogo' } | null>(null);

    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

    // Audit wizard state
    const [auditItemsList, setAuditItemsList] = useState<{ id: string; name: string; originalQty: number; currentQty: number; originalStatus: AttrezzoStatus; currentStatus: AttrezzoStatus }[]>([]);
    const [auditing, setAuditing] = useState(false);

    // Form inputs state
    const [attrezzoForm, setAttrezzoForm] = useState({
        name: '',
        category: 'Generico',
        description: '',
        tagsInput: '',
        tags: [] as string[],
        status: 'disponibile' as AttrezzoStatus,
        luogoId: '' as string,
        quantity: 1,
        isDangerous: false,
        isConsumable: false,
        imageFile: null as File | null,
        imageUrl: ''
    });

    const [luogoForm, setLuogoForm] = useState({
        name: '',
        description: '',
        color: '#4CAF50',
        icon: 'MapPin'
    });

    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Fetch initial data
    const loadData = async () => {
        setLoading(true);
        try {
            const fetchedLuoghi = await getInventarioLuoghi();
            const fetchedAttrezzi = await getInventarioAttrezzi();
            setLuoghi(fetchedLuoghi);
            setAttrezzi(fetchedAttrezzi);

            // Handle direct search parameters (e.g. from QR scan)
            const searchId = searchParams.get('search');
            if (searchId) {
                const foundItem = fetchedAttrezzi.find(a => a.id === searchId);
                if (foundItem) {
                    setEditingAttrezzo(foundItem);
                    setAttrezzoForm({
                        name: foundItem.name,
                        category: foundItem.category,
                        description: foundItem.description || '',
                        tagsInput: '',
                        tags: foundItem.tags || [],
                        status: foundItem.status,
                        luogoId: foundItem.luogoId || '',
                        quantity: foundItem.quantity,
                        isDangerous: foundItem.isDangerous,
                        isConsumable: foundItem.isConsumable,
                        imageFile: null,
                        imageUrl: foundItem.imageUrl || ''
                    });
                    setShowAttrezzoForm(true);
                    // Clear search params to prevent reopen on refresh
                    setSearchParams({});
                }
            }
        } catch (error) {
            console.error('Error loading inventory data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Filter tools based on user choices
    const filteredAttrezzi = useMemo(() => {
        return attrezzi.filter(item => {
            // Text search (name, description, tags)
            const query = searchQuery.toLowerCase().trim();
            const matchesText = !query || 
                item.name.toLowerCase().includes(query) ||
                (item.description && item.description.toLowerCase().includes(query)) ||
                item.category.toLowerCase().includes(query) ||
                item.tags.some(tag => tag.toLowerCase().includes(query));

            // Category filter
            const matchesCategory = selectedCategory === 'Tutti' || item.category === selectedCategory;

            // Location filter
            const matchesLuogo = selectedLuogo === 'Tutti' || item.luogoId === selectedLuogo;

            // Dangerous filter
            const matchesDangerous = !showOnlyDangerous || item.isDangerous;

            // Damaged/Issues filter
            const matchesIssues = !showOnlyIssues || item.status !== 'disponibile';

            return matchesText && matchesCategory && matchesLuogo && matchesDangerous && matchesIssues;
        });
    }, [attrezzi, searchQuery, selectedCategory, selectedLuogo, showOnlyDangerous, showOnlyIssues]);

    // Statistics counts
    const stats = useMemo(() => {
        const totalItems = attrezzi.reduce((acc, curr) => acc + curr.quantity, 0);
        const uniqueItems = attrezzi.length;
        const dangerousCount = attrezzi.filter(a => a.isDangerous).reduce((acc, curr) => acc + curr.quantity, 0);
        const damagedCount = attrezzi.filter(a => a.status === 'danneggiato' || a.status === 'in_manutenzione').reduce((acc, curr) => acc + curr.quantity, 0);
        return { totalItems, uniqueItems, dangerousCount, damagedCount };
    }, [attrezzi]);

    // Location items mapping
    const locationCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        attrezzi.forEach(a => {
            if (a.luogoId) {
                counts[a.luogoId] = (counts[a.luogoId] || 0) + a.quantity;
            }
        });
        return counts;
    }, [attrezzi]);

    // Add Tag on Enter or comma
    const handleTagsKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const tag = attrezzoForm.tagsInput.trim().replace(',', '');
            if (tag && !attrezzoForm.tags.includes(tag)) {
                setAttrezzoForm(prev => ({
                    ...prev,
                    tags: [...prev.tags, tag],
                    tagsInput: ''
                }));
            }
        }
    };

    const removeTag = (indexToRemove: number) => {
        setAttrezzoForm(prev => ({
            ...prev,
            tags: prev.tags.filter((_, i) => i !== indexToRemove)
        }));
    };

    // Compress & Resize Image on file change
    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                // Resize image to max 600px width/height and quality 0.75
                const compressedBlob = await resizeAndCompressImage(file, 600, 600, 0.75);
                setAttrezzoForm(prev => ({
                    ...prev,
                    imageFile: new File([compressedBlob], file.name, { type: 'image/jpeg' }),
                    // Temporary preview URL
                    imageUrl: URL.createObjectURL(compressedBlob)
                }));
            } catch (err) {
                console.error('Image compression failed:', err);
                alert('Impossibile elaborare l\'immagine. Riprova con un altro file.');
            }
        }
    };

    // Save Attrezzo Form
    const handleSaveAttrezzo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!attrezzoForm.name.trim()) return;

        setSaving(true);
        setErrorMessage('');
        try {
            let finalImageUrl = attrezzoForm.imageUrl;

            // If there's a new file to upload
            if (attrezzoForm.imageFile) {
                finalImageUrl = await uploadAttrezzoImage(attrezzoForm.imageFile, attrezzoForm.imageFile.name);
            }

            const payload = {
                name: attrezzoForm.name,
                category: attrezzoForm.category,
                description: attrezzoForm.description,
                tags: attrezzoForm.tags,
                status: attrezzoForm.status,
                luogoId: attrezzoForm.luogoId || null,
                imageUrl: finalImageUrl,
                quantity: attrezzoForm.quantity,
                isDangerous: attrezzoForm.isDangerous,
                isConsumable: attrezzoForm.isConsumable
            };

            if (editingAttrezzo) {
                await updateInventarioAttrezzo({
                    ...editingAttrezzo,
                    ...payload
                });
            } else {
                await addInventarioAttrezzo(payload);
            }

            setShowAttrezzoForm(false);
            setEditingAttrezzo(null);
            loadData();
        } catch (err: any) {
            setErrorMessage(err.message || 'Errore durante il salvataggio.');
        } finally {
            setSaving(false);
        }
    };

    // Edit Attrezzo Open
    const openEditAttrezzo = (item: InventarioAttrezzo) => {
        setEditingAttrezzo(item);
        setAttrezzoForm({
            name: item.name,
            category: item.category,
            description: item.description || '',
            tagsInput: '',
            tags: item.tags || [],
            status: item.status,
            luogoId: item.luogoId || '',
            quantity: item.quantity,
            isDangerous: item.isDangerous,
            isConsumable: item.isConsumable,
            imageFile: null,
            imageUrl: item.imageUrl || ''
        });
        setShowAttrezzoForm(true);
    };

    // Delete Attrezzo
    const handleDeleteAttrezzo = async (id: string) => {
        if (confirm('Vuoi davvero rimuovere questo attrezzo dall\'inventario?')) {
            try {
                await deleteInventarioAttrezzo(id);
                loadData();
            } catch (err) {
                console.error('Delete item failed:', err);
            }
        }
    };

    // Save Luogo Form
    const handleSaveLuogo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!luogoForm.name.trim()) return;

        setSaving(true);
        setErrorMessage('');
        try {
            if (editingLuogo) {
                await updateInventarioLuogo({
                    ...editingLuogo,
                    ...luogoForm
                });
            } else {
                await addInventarioLuogo(luogoForm);
            }
            setShowLuogoForm(false);
            setEditingLuogo(null);
            loadData();
        } catch (err: any) {
            setErrorMessage(err.message || 'Errore durante il salvataggio del luogo.');
        } finally {
            setSaving(false);
        }
    };

    // Edit Luogo Open
    const openEditLuogo = (l: InventarioLuogo) => {
        setEditingLuogo(l);
        setLuogoForm({
            name: l.name,
            description: l.description || '',
            color: l.color,
            icon: l.icon
        });
        setShowLuogoForm(true);
    };

    // Delete Luogo
    const handleDeleteLuogo = async (id: string) => {
        if (confirm('Vuoi davvero rimuovere questo luogo?\n\nGli attrezzi posizionati qui non saranno cancellati, ma rimarranno senza una localizzazione.')) {
            try {
                await deleteInventarioLuogo(id);
                loadData();
            } catch (err) {
                console.error('Delete location failed:', err);
            }
        }
    };

    // Open Audit Wizard
    const openAuditWizard = (locationId: string) => {
        const place = luoghi.find(l => l.id === locationId);
        if (!place) return;

        setAuditLocationId(locationId);
        
        // Find all tools associated with this location
        const items = attrezzi.filter(a => a.luogoId === locationId);
        
        setAuditItemsList(items.map(i => ({
            id: i.id,
            name: i.name,
            originalQty: i.quantity,
            currentQty: i.quantity,
            originalStatus: i.status,
            currentStatus: i.status
        })));
        
        setShowAuditModal(true);
    };

    const handleAuditSave = async () => {
        setAuditing(true);
        try {
            const updates = auditItemsList.map(item => ({
                id: item.id,
                status: item.currentStatus,
                quantity: item.currentQty
            }));
            
            const success = await auditInventarioAttrezzi(updates);
            if (success) {
                alert('Censimento Rapido completato con successo!\nHai guadagnato +15 punti.');
                setShowAuditModal(false);
                loadData();
            } else {
                alert('Errore durante il censimento.');
            }
        } catch (err) {
            console.error('Audit failed:', err);
        } finally {
            setAuditing(false);
        }
    };

    // Open QR Code Modal
    const openQrModal = (id: string, name: string, type: 'attrezzo' | 'luogo') => {
        setQrItem({ id, name, type });
        setShowQrModal(true);
    };

    const handlePrintQr = () => {
        window.print();
    };

    return (
        <div className="pb-24">
            {/* Print Only QR View (hidden in screen) */}
            {showQrModal && qrItem && (
                <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-[9999] p-8 text-center text-black">
                    <div className="border-4 border-dashed border-gray-400 p-8 max-w-sm mx-auto rounded-3xl mt-20 flex flex-col items-center justify-center space-y-4">
                        <div className="text-xl font-bold uppercase tracking-wider">Orme Scout</div>
                        <div className="text-sm font-semibold text-gray-500">Censimento Materiali</div>
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${window.location.origin}/inventario?search=${qrItem.id}`)}`}
                            alt="QR Code"
                            className="w-48 h-48 border-2 border-black p-2 my-4"
                        />
                        <div className="text-xl font-black">{qrItem.name}</div>
                        <div className="text-xs text-gray-500 font-mono tracking-widest">{qrItem.id}</div>
                        <div className="text-[10px] text-gray-400 mt-2">Inquadra con il telefono per censire, aggiornare o cercare questo elemento nell'app.</div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Wrench className="text-scout-green" size={26} />
                        Inventario & Attrezzi
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Tieni traccia delle tende di reparto, attrezzi pesanti e materiali di cancelleria
                    </p>
                </div>
                
                <div className="flex gap-2">
                    {activeTab === 'luoghi' ? (
                        <button
                            onClick={() => {
                                setEditingLuogo(null);
                                setLuogoForm({ name: '', description: '', color: '#4CAF50', icon: 'MapPin' });
                                setShowLuogoForm(true);
                            }}
                            className="bg-scout-green text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-scout-green-dark transition-all active:scale-95 shadow-md cursor-pointer"
                        >
                            <Plus size={16} /> Nuovo Luogo
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                setEditingAttrezzo(null);
                                setAttrezzoForm({
                                    name: '', category: 'Generico', description: '', tagsInput: '', tags: [],
                                    status: 'disponibile', luogoId: luoghi[0]?.id || '', quantity: 1,
                                    isDangerous: false, isConsumable: false, imageFile: null, imageUrl: ''
                                });
                                setShowAttrezzoForm(true);
                            }}
                            className="bg-scout-green text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-scout-green-dark transition-all active:scale-95 shadow-md cursor-pointer"
                        >
                            <Plus size={16} /> Nuovo Attrezzo
                        </button>
                    )}
                </div>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-scout-green/10 dark:bg-emerald-950/20 text-scout-green dark:text-emerald-400 rounded-xl">
                        <Box size={20} />
                    </div>
                    <div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-bold block uppercase tracking-wider">Pezzi Totali</span>
                        <span className="text-2xl font-black text-gray-900 dark:text-white">{stats.totalItems}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-scout-blue/10 dark:bg-blue-950/20 text-scout-blue dark:text-blue-400 rounded-xl">
                        <Layers size={20} />
                    </div>
                    <div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-bold block uppercase tracking-wider">Articoli Unici</span>
                        <span className="text-2xl font-black text-gray-900 dark:text-white">{stats.uniqueItems}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl">
                        <AlertTriangle size={20} />
                    </div>
                    <div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-bold block uppercase tracking-wider">Pericolosi</span>
                        <span className="text-2xl font-black text-gray-900 dark:text-white">{stats.dangerousCount}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-yellow-100 dark:bg-amber-950/20 text-yellow-600 dark:text-amber-400 rounded-xl">
                        <ClipboardCheck size={20} />
                    </div>
                    <div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-bold block uppercase tracking-wider">Danneggiati</span>
                        <span className="text-2xl font-black text-gray-900 dark:text-white">{stats.damagedCount}</span>
                    </div>
                </div>
            </div>

            {/* View Switcher Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-900 p-1.5 rounded-2xl mb-6 w-full max-w-xs shadow-inner">
                <button
                    onClick={() => setActiveTab('attrezzi')}
                    className={cn(
                        "flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
                        activeTab === 'attrezzi' 
                            ? "bg-white dark:bg-gray-800 text-scout-green shadow-md border border-gray-200/50 dark:border-gray-700/50" 
                            : "text-gray-500 dark:text-gray-450 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                >
                    <Wrench size={16} /> Attrezzi
                </button>
                <button
                    onClick={() => setActiveTab('luoghi')}
                    className={cn(
                        "flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
                        activeTab === 'luoghi' 
                            ? "bg-white dark:bg-gray-800 text-scout-green shadow-md border border-gray-200/50 dark:border-gray-700/50" 
                            : "text-gray-500 dark:text-gray-450 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                >
                    <MapPin size={16} /> Luoghi
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <RefreshCw className="animate-spin mb-3" size={32} />
                    <p className="font-semibold text-sm">Caricamento inventario...</p>
                </div>
            ) : activeTab === 'attrezzi' ? (
                <>
                    {/* Advanced Search & Filtering Dashboard */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4 mb-6">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Cerca attrezzo per nome, descrizione, categoria o tags..."
                                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-scout-green text-sm transition-all"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650 cursor-pointer">
                                        <XCircle size={16} />
                                    </button>
                                )}
                            </div>
                            
                            <button
                                type="button"
                                onClick={() => setShowFilters(!showFilters)}
                                className={cn(
                                    "px-4 py-3 rounded-2xl border flex items-center gap-2 text-sm font-bold transition-all cursor-pointer select-none",
                                    showFilters || activeFiltersCount > 0
                                        ? "bg-scout-green/10 border-scout-green/35 text-scout-green font-extrabold"
                                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-750 text-gray-600 dark:text-gray-400"
                                )}
                            >
                                <Filter size={16} />
                                <span className="hidden sm:inline">Filtra</span>
                                {activeFiltersCount > 0 && (
                                    <span className="bg-scout-green text-white text-xs px-2 py-0.5 rounded-full font-black">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </button>
                        </div>

                        {showFilters && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700/50 animate-in fade-in slide-in-from-top-2 duration-150">
                                {/* Category Dropdown Filter */}
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 dark:text-gray-550 uppercase mb-1">Categoria</label>
                                    <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 w-full">
                                        <Layers size={13} className="text-gray-405" />
                                        <select
                                            value={selectedCategory}
                                            onChange={e => setSelectedCategory(e.target.value)}
                                            className="bg-transparent text-xs font-bold text-gray-700 dark:text-gray-300 outline-none border-none cursor-pointer w-full"
                                        >
                                            <option value="Tutti">Tutte Categorie</option>
                                            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Location Dropdown Filter */}
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 dark:text-gray-550 uppercase mb-1">Collocazione</label>
                                    <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 w-full">
                                        <MapPin size={13} className="text-gray-405" />
                                        <select
                                            value={selectedLuogo}
                                            onChange={e => setSelectedLuogo(e.target.value)}
                                            className="bg-transparent text-xs font-bold text-gray-700 dark:text-gray-300 outline-none border-none cursor-pointer w-full"
                                        >
                                            <option value="Tutti">Tutti i Luoghi</option>
                                            <option value="">Senza Luogo</option>
                                            {luoghi.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Toggles */}
                                <div className="flex flex-col justify-center gap-2 pt-2 sm:col-span-2">
                                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-gray-650 dark:text-gray-400 select-none">
                                        <input
                                            type="checkbox"
                                            checked={showOnlyDangerous}
                                            onChange={e => setShowOnlyDangerous(e.target.checked)}
                                            className="rounded text-scout-green focus:ring-scout-green border-gray-300 w-4 h-4 cursor-pointer"
                                        />
                                        Solo Pericolosi ⚠️
                                    </label>
                                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-gray-650 dark:text-gray-400 select-none">
                                        <input
                                            type="checkbox"
                                            checked={showOnlyIssues}
                                            onChange={e => setShowOnlyIssues(e.target.checked)}
                                            className="rounded text-scout-green focus:ring-scout-green border-gray-300 w-4 h-4 cursor-pointer"
                                        />
                                        Solo Danneggiati 🛠️
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tools Grid */}
                    {filteredAttrezzi.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <Wrench size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                            <p className="font-bold text-gray-700 dark:text-white">Nessun attrezzo trovato</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Prova a cambiare filtri o a inserire un nuovo attrezzo.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {filteredAttrezzi.map(item => {
                                const itemLuogo = luoghi.find(l => l.id === item.luogoId);
                                const LuogoIcon = itemLuogo ? getIconComponent(itemLuogo.icon) : MapPin;

                                return (
                                    <div 
                                        key={item.id}
                                        onClick={() => openEditAttrezzo(item)}
                                        className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow relative group cursor-pointer"
                                    >
                                        {/* Image Section */}
                                        <div className="h-40 bg-gray-150 dark:bg-gray-900 relative flex items-center justify-center overflow-hidden shrink-0">
                                            {item.imageUrl ? (
                                                <img 
                                                    src={item.imageUrl} 
                                                    alt={item.name} 
                                                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setFullscreenImage(item.imageUrl || null);
                                                    }}
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-655">
                                                    <Wrench size={40} className="stroke-[1.5]" />
                                                    <span className="text-[10px] uppercase font-black tracking-widest mt-2">Nessuna Foto</span>
                                                </div>
                                            )}

                                            {/* Dangerous/Dangerous Warning Badge */}
                                            {item.isDangerous && (
                                                <span className="absolute top-3 left-3 bg-red-500 text-white font-bold text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                                                    <AlertTriangle size={9} /> Pericolo
                                                </span>
                                            )}

                                            {/* Consumable Badge */}
                                            {item.isConsumable && (
                                                <span className="absolute top-3 right-3 bg-blue-500 text-white font-bold text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md">
                                                    Consumabile
                                                </span>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="p-5 flex-1 flex flex-col">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <span className="text-[10px] text-scout-green dark:text-emerald-400 font-black uppercase tracking-widest block">{item.category}</span>
                                                    <h3 className="font-extrabold text-gray-955 dark:text-white text-base leading-tight mt-0.5 line-clamp-1">{item.name}</h3>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-lg font-black text-gray-900 dark:text-white">x{item.quantity}</span>
                                                </div>
                                            </div>

                                            {item.description && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 italic mb-4 leading-relaxed">
                                                    "{item.description}"
                                                </p>
                                            )}

                                            {/* Tags list */}
                                            {item.tags && item.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mb-4">
                                                    {item.tags.map((tag, ti) => (
                                                        <span key={ti} className="text-[9px] font-bold bg-gray-150 dark:bg-gray-900 text-gray-600 dark:text-gray-455 px-2 py-0.5 rounded-full">
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                                                {/* Location Indicator */}
                                                {itemLuogo ? (
                                                    <div 
                                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                                                        style={{ 
                                                            backgroundColor: `${itemLuogo.color}15`, 
                                                            color: itemLuogo.color 
                                                        }}
                                                    >
                                                        <LuogoIcon size={12} />
                                                        <span>{itemLuogo.name}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-bold">
                                                        <MapPin size={12} />
                                                        <span>Non collocato</span>
                                                    </div>
                                                )}

                                                {/* Status Badge */}
                                                <span className={cn(
                                                    "text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border",
                                                    item.status === 'disponibile' && "bg-green-50 text-green-600 border-green-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50",
                                                    item.status === 'danneggiato' && "bg-yellow-50 text-yellow-600 border-yellow-250 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50",
                                                    item.status === 'in_manutenzione' && "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50",
                                                    item.status === 'perso' && "bg-red-50 text-red-650 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50"
                                                )}>
                                                    {item.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            ) : (
                /* Locations Grid Tab */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {luoghi.map(l => {
                        const LIcon = getIconComponent(l.icon);
                        const itemsCount = locationCounts[l.id] || 0;

                        return (
                            <div 
                                key={l.id}
                                onClick={() => openEditLuogo(l)}
                                className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 flex flex-col relative group cursor-pointer hover:shadow-md transition-shadow"
                            >
                                {/* Header / Color / Icon */}
                                <div className="flex items-center justify-between mb-4">
                                    <div 
                                        className="w-12 h-12 rounded-2xl flex items-center justify-center"
                                        style={{ backgroundColor: `${l.color}15`, color: l.color }}
                                    >
                                        <LIcon size={24} className="stroke-[2]" />
                                    </div>
                                </div>

                                <h3 className="font-extrabold text-gray-955 dark:text-white text-lg">{l.name}</h3>
                                {l.description && (
                                    <p className="text-xs text-gray-400 dark:text-gray-550 mt-1 mb-4 leading-relaxed line-clamp-2">
                                        {l.description}
                                    </p>
                                )}

                                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-750 flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                        {itemsCount} oggetti registrati
                                    </span>
                                    
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openAuditWizard(l.id);
                                        }}
                                        className="bg-gray-50 dark:bg-gray-900 border border-gray-250 dark:border-gray-750 hover:bg-scout-green hover:text-white dark:hover:bg-scout-green hover:border-transparent text-gray-750 dark:text-gray-300 font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors active:scale-95 shadow-sm cursor-pointer"
                                    >
                                        <ClipboardCheck size={14} /> Censimento Rapido
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* FULLSCREEN IMAGE MODAL */}
            {fullscreenImage && (
                <div 
                    className="fixed inset-0 bg-black/90 z-[90] flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => setFullscreenImage(null)}
                >
                    <button className="absolute top-4 right-4 text-white p-3 hover:bg-white/10 rounded-full">
                        <X size={32} />
                    </button>
                    <img 
                        src={fullscreenImage} 
                        alt="Zoomed" 
                        className="max-w-full max-h-[90vh] object-contain rounded-2xl animate-in zoom-in-95 duration-200" 
                    />
                </div>
            )}

            {/* QR CODE MODAL */}
            {showQrModal && qrItem && (
                <div 
                    className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 print:hidden"
                    onClick={() => setShowQrModal(false)}
                >
                    <div 
                        className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 rounded-3xl w-full max-w-sm p-6 text-center space-y-5 animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center">
                            <h3 className="font-extrabold text-gray-900 dark:text-white text-base">Codice QR Stampa</h3>
                            <button onClick={() => setShowQrModal(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full dark:text-gray-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl flex flex-col items-center">
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${window.location.origin}/inventario?search=${qrItem.id}`)}`}
                                alt="QR Code Preview"
                                className="w-40 h-40 border-2 border-gray-250 dark:border-gray-750 p-2 bg-white rounded-xl"
                            />
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-450 mt-3 font-mono">ID: {qrItem.id.slice(0,8)}...</p>
                        </div>

                        <div className="text-sm font-black text-gray-900 dark:text-white">{qrItem.name}</div>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed px-2">
                            Stampa ed applica questo codice QR sul materiale fisico. Inquadrandolo con la fotocamera aprirà direttamente l'app su questo elemento per un censimento istantaneo.
                        </p>

                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={() => setShowQrModal(false)}
                                className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                            >
                                Chiudi
                            </button>
                            <button 
                                onClick={handlePrintQr}
                                className="flex-1 py-3 bg-scout-green text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-scout-green-dark transition-colors shadow-md"
                            >
                                <Printer size={16} /> Stampa QR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AUDIT (CENSIMENTO RAPIDO) MODAL */}
            {showAuditModal && (
                <div 
                    className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 overflow-y-auto"
                    onClick={() => setShowAuditModal(false)}
                >
                    <div 
                        className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 rounded-3xl w-full max-w-xl p-6 space-y-5 my-8 shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-extrabold text-gray-900 dark:text-white text-lg flex items-center gap-1.5">
                                    <ClipboardCheck className="text-scout-green" size={20} />
                                    Censimento Rapido
                                </h3>
                                <p className="text-xs text-gray-450 dark:text-gray-500 mt-0.5">
                                    Luogo: <span className="font-bold text-gray-650 dark:text-gray-300">{luoghi.find(l => l.id === auditLocationId)?.name}</span>
                                </p>
                            </div>
                            <button onClick={() => setShowAuditModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full dark:text-gray-400">
                                <X size={20} />
                            </button>
                        </div>

                        {auditItemsList.length === 0 ? (
                            <div className="text-center py-10 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                                <Wrench size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                                <p className="text-sm font-bold text-gray-550 dark:text-gray-400">Nessun oggetto posizionato in questo luogo</p>
                                <p className="text-xs text-gray-450 mt-1">Colloca degli attrezzi in questo luogo per effettuarne il censimento rapido.</p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Controlla fisicamente la presenza degli oggetti elencati. Conferma o modifica la quantità reale e lo stato. Riceverai <strong className="text-scout-green">+15 punti</strong>.
                                </p>
                                {auditItemsList.map((item, idx) => (
                                    <div key={item.id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-150 dark:border-gray-750 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="font-black text-sm text-gray-900 dark:text-white leading-tight">{item.name}</span>
                                            
                                            {/* Quantity adjustment */}
                                            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700 shadow-sm">
                                                <button
                                                    onClick={() => setAuditItemsList(prev => prev.map((it, i) => i === idx ? { ...it, currentQty: Math.max(0, it.currentQty - 1) } : it))}
                                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500"
                                                >
                                                    <Minus size={12} />
                                                </button>
                                                <span className="text-xs font-black px-2 min-w-[20px] text-center dark:text-white">{item.currentQty}</span>
                                                <button
                                                    onClick={() => setAuditItemsList(prev => prev.map((it, i) => i === idx ? { ...it, currentQty: it.currentQty + 1 } : it))}
                                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500"
                                                >
                                                    <Plus size={12} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 items-center">
                                            <div>
                                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase">Stato attuale</span>
                                                <select
                                                    value={item.currentStatus}
                                                    onChange={e => setAuditItemsList(prev => prev.map((it, i) => i === idx ? { ...it, currentStatus: e.target.value as AttrezzoStatus } : it))}
                                                    className="w-full mt-1 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs dark:text-white outline-none focus:ring-1 focus:ring-scout-green"
                                                >
                                                    <option value="disponibile">Disponibile</option>
                                                    <option value="danneggiato">Danneggiato</option>
                                                    <option value="in_manutenzione">In Manutenzione</option>
                                                    <option value="perso">Perso</option>
                                                </select>
                                            </div>
                                            
                                            <div className="text-right flex flex-col justify-end">
                                                {item.currentQty !== item.originalQty || item.currentStatus !== item.originalStatus ? (
                                                    <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg inline-block w-fit ml-auto">Modificato</span>
                                                ) : (
                                                    <span className="text-[9px] font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-lg inline-block w-fit ml-auto flex items-center gap-0.5"><Check size={8}/>Invariato</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={() => setShowAuditModal(false)}
                                className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                            >
                                Annulla
                            </button>
                            <button 
                                disabled={auditItemsList.length === 0 || auditing}
                                onClick={handleAuditSave}
                                className="flex-1 py-3 bg-scout-green text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-scout-green-dark transition-colors disabled:opacity-40 shadow-md"
                            >
                                <CheckCircle2 size={16} /> {auditing ? 'Salvataggio...' : 'Conferma Censimento'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ATTREZZO FORM MODAL */}
            {showAttrezzoForm && (
                <div 
                    className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 overflow-y-auto"
                    onClick={() => {
                        setShowAttrezzoForm(false);
                        setEditingAttrezzo(null);
                    }}
                >
                    <form 
                        onSubmit={handleSaveAttrezzo}
                        className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 rounded-3xl w-full max-w-lg p-6 space-y-4 my-8 shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center">
                            <h3 className="font-extrabold text-gray-900 dark:text-white text-lg">
                                {editingAttrezzo ? 'Modifica Attrezzo' : 'Aggiungi Attrezzo'}
                            </h3>
                            <button 
                                type="button" 
                                onClick={() => {
                                    setShowAttrezzoForm(false);
                                    setEditingAttrezzo(null);
                                }} 
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full dark:text-gray-400"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {errorMessage && (
                            <div className="p-3 bg-red-50 text-red-650 rounded-xl text-xs font-bold flex items-center gap-1.5">
                                <AlertCircle size={14} /> {errorMessage}
                            </div>
                        )}

                        <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
                            {/* Nome */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 dark:text-gray-450 uppercase mb-1">Nome Attrezzo*</label>
                                <input
                                    type="text"
                                    required
                                    value={attrezzoForm.name}
                                    onChange={e => setAttrezzoForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Es: Tenda Ferrino Reparto 1, Piccone..."
                                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-scout-green text-sm"
                                />
                            </div>

                            {/* Categoria & Quantità */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-450 uppercase mb-1">Categoria*</label>
                                    <select
                                        value={attrezzoForm.category}
                                        onChange={e => setAttrezzoForm(prev => ({ ...prev, category: e.target.value }))}
                                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-scout-green text-sm"
                                    >
                                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-450 uppercase mb-1">Quantità*</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={attrezzoForm.quantity}
                                        onChange={e => setAttrezzoForm(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-scout-green text-sm"
                                    />
                                </div>
                            </div>

                            {/* Descrizione */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 dark:text-gray-450 uppercase mb-1">Descrizione / Note</label>
                                <textarea
                                    value={attrezzoForm.description}
                                    onChange={e => setAttrezzoForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Es: Collocata in scatola A, richiede manutenzione al palo centrale..."
                                    rows={2}
                                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-scout-green text-sm resize-none"
                                />
                            </div>

                            {/* Collocazione & Stato */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-450 uppercase mb-1">Collocazione (Luogo)</label>
                                    <select
                                        value={attrezzoForm.luogoId}
                                        onChange={e => setAttrezzoForm(prev => ({ ...prev, luogoId: e.target.value }))}
                                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-scout-green text-sm"
                                    >
                                        <option value="">Nessuno (Non Collocato)</option>
                                        {luoghi.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-450 uppercase mb-1">Stato dell'Oggetto</label>
                                    <select
                                        value={attrezzoForm.status}
                                        onChange={e => setAttrezzoForm(prev => ({ ...prev, status: e.target.value as AttrezzoStatus }))}
                                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-scout-green text-sm"
                                    >
                                        <option value="disponibile">Disponibile</option>
                                        <option value="danneggiato">Danneggiato</option>
                                        <option value="in_manutenzione">In Manutenzione</option>
                                        <option value="perso">Perso</option>
                                    </select>
                                </div>
                            </div>

                            {/* Tags Input */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 dark:text-gray-450 uppercase mb-1">Tag di Ricerca (premi Invio per aggiungere)</label>
                                <input
                                    type="text"
                                    value={attrezzoForm.tagsInput}
                                    onChange={e => setAttrezzoForm(prev => ({ ...prev, tagsInput: e.target.value }))}
                                    onKeyDown={handleTagsKeyDown}
                                    placeholder="Es: ferrino, reparto, metallo..."
                                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-scout-green text-sm"
                                />
                                {attrezzoForm.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2 bg-gray-50 dark:bg-gray-900 p-2 rounded-xl">
                                        {attrezzoForm.tags.map((tag, idx) => (
                                            <span key={idx} className="text-xs font-bold bg-white dark:bg-gray-800 border border-gray-250 dark:border-gray-750 text-gray-700 dark:text-gray-300 pl-2.5 pr-1 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                                #{tag}
                                                <button type="button" onClick={() => removeTag(idx)} className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-red-500">
                                                    <X size={10} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Special Toggles */}
                            <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900 p-3 rounded-2xl border border-gray-150 dark:border-gray-750">
                                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-gray-750 dark:text-gray-300 select-none">
                                    <input
                                        type="checkbox"
                                        checked={attrezzoForm.isDangerous}
                                        onChange={e => setAttrezzoForm(prev => ({ ...prev, isDangerous: e.target.checked }))}
                                        className="rounded text-red-500 focus:ring-red-500 border-gray-305 w-4.5 h-4.5"
                                    />
                                    Attrezzo Pericoloso ⚠️
                                </label>
                                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-gray-750 dark:text-gray-300 select-none">
                                    <input
                                        type="checkbox"
                                        checked={attrezzoForm.isConsumable}
                                        onChange={e => setAttrezzoForm(prev => ({ ...prev, isConsumable: e.target.checked }))}
                                        className="rounded text-blue-500 focus:ring-blue-500 border-gray-305 w-4.5 h-4.5"
                                    />
                                    Consumabile (Cancelleria)
                                </label>
                            </div>

                            {/* Image Upload with resizing preview */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 dark:text-gray-450 uppercase mb-1">Foto dell'Attrezzo</label>
                                <div className="flex items-center gap-4">
                                    {attrezzoForm.imageUrl ? (
                                        <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700 shadow-sm group">
                                            <img src={attrezzoForm.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                            <button 
                                                type="button"
                                                onClick={() => setAttrezzoForm(prev => ({ ...prev, imageFile: null, imageUrl: '' }))}
                                                className="absolute inset-0 bg-black/50 text-white font-bold opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                            >
                                                Elimina
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-400">
                                            <ImageIcon size={20} />
                                        </div>
                                    )}

                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="block w-full text-xs text-gray-550 dark:text-gray-400
                                                file:mr-3 file:py-2 file:px-3
                                                file:rounded-xl file:border-0
                                                file:text-xs file:font-black
                                                file:bg-scout-green/10 file:text-scout-green
                                                hover:file:bg-scout-green/20
                                                cursor-pointer"
                                        />
                                        <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1">Le immagini pesanti verranno ridimensionate automaticamente a 600px lato client.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-gray-750">
                            {editingAttrezzo && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => openQrModal(editingAttrezzo.id, editingAttrezzo.name, 'attrezzo')}
                                        className="p-3 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-xl transition-colors cursor-pointer"
                                        title="Stampa QR"
                                    >
                                        <QrCode size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleDeleteAttrezzo(editingAttrezzo.id);
                                            setShowAttrezzoForm(false);
                                        }}
                                        className="p-3 border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors cursor-pointer mr-auto"
                                        title="Elimina"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </>
                            )}
                            <button 
                                type="button"
                                onClick={() => {
                                    setShowAttrezzoForm(false);
                                    setEditingAttrezzo(null);
                                }}
                                className={cn(
                                    "py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors px-4 cursor-pointer",
                                    editingAttrezzo ? "" : "flex-1"
                                )}
                            >
                                Annulla
                            </button>
                            <button 
                                type="submit"
                                disabled={saving}
                                className="flex-1 py-3 bg-scout-green text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-scout-green-dark transition-colors disabled:opacity-40 shadow-md px-4 cursor-pointer"
                            >
                                <Check size={16} /> {saving ? 'Salvataggio...' : 'Salva'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* LUOGO FORM MODAL */}
            {showLuogoForm && (
                <div 
                    className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4"
                    onClick={() => {
                        setShowLuogoForm(false);
                        setEditingLuogo(null);
                    }}
                >
                    <form 
                        onSubmit={handleSaveLuogo}
                        className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center">
                            <h3 className="font-extrabold text-gray-900 dark:text-white text-lg">
                                {editingLuogo ? 'Modifica Luogo' : 'Aggiungi Luogo'}
                            </h3>
                            <button 
                                type="button"
                                onClick={() => {
                                    setShowLuogoForm(false);
                                    setEditingLuogo(null);
                                }} 
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full dark:text-gray-400"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {errorMessage && (
                            <div className="p-3 bg-red-50 text-red-650 rounded-xl text-xs font-bold flex items-center gap-1.5">
                                <AlertCircle size={14} /> {errorMessage}
                            </div>
                        )}

                        <div className="space-y-3.5">
                            {/* Nome */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 dark:text-gray-455 uppercase mb-1">Nome Luogo*</label>
                                <input
                                    type="text"
                                    required
                                    value={luogoForm.name}
                                    onChange={e => setLuogoForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Es: Sede Reparto, Armadio B..."
                                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-scout-green text-sm"
                                />
                            </div>

                            {/* Descrizione */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 dark:text-gray-455 uppercase mb-1">Descrizione</label>
                                <textarea
                                    value={luogoForm.description}
                                    onChange={e => setLuogoForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Es: In fondo al corridoio, armadio marrone..."
                                    rows={2}
                                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-scout-green text-sm resize-none"
                                />
                            </div>

                            {/* Icon Picker */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 dark:text-gray-455 uppercase mb-1.5">Scegli Icona</label>
                                <div className="flex gap-2">
                                    {AVAILABLE_ICONS.map(i => {
                                        const IconComp = i.component;
                                        const isSelected = luogoForm.icon === i.name;
                                        return (
                                            <button
                                                key={i.name}
                                                type="button"
                                                onClick={() => setLuogoForm(prev => ({ ...prev, icon: i.name }))}
                                                className={cn(
                                                    "w-9 h-9 rounded-xl border flex items-center justify-center transition-all",
                                                    isSelected 
                                                        ? "bg-scout-green border-transparent text-white scale-110 shadow-sm" 
                                                        : "border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750"
                                                )}
                                                title={i.name}
                                            >
                                                <IconComp size={16} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Color Picker */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 dark:text-gray-455 uppercase mb-1.5">Colore di Rappresentazione</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {PRESET_COLORS.map(c => {
                                        const isSelected = luogoForm.color === c;
                                        return (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setLuogoForm(prev => ({ ...prev, color: c }))}
                                                className={cn(
                                                    "w-7 h-7 rounded-full transition-transform relative flex items-center justify-center",
                                                    isSelected ? "scale-110 ring-2 ring-scout-green/50" : ""
                                                )}
                                                style={{ backgroundColor: c }}
                                            >
                                                {isSelected && <Check size={12} style={{ color: getContrastColor(c) }} />}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="color" 
                                        value={luogoForm.color}
                                        onChange={e => setLuogoForm(prev => ({ ...prev, color: e.target.value }))}
                                        className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                                    />
                                    <span className="text-xs text-gray-400 dark:text-gray-500 font-mono select-all uppercase">{luogoForm.color}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-gray-750">
                            {editingLuogo && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => openQrModal(editingLuogo.id, editingLuogo.name, 'luogo')}
                                        className="p-3 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-xl transition-colors cursor-pointer"
                                        title="Stampa QR"
                                    >
                                        <QrCode size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleDeleteLuogo(editingLuogo.id);
                                            setShowLuogoForm(false);
                                        }}
                                        className="p-3 border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors cursor-pointer mr-auto"
                                        title="Elimina Luogo"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </>
                            )}
                            <button 
                                type="button"
                                onClick={() => {
                                    setShowLuogoForm(false);
                                    setEditingLuogo(null);
                                }}
                                className={cn(
                                    "py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors px-4 cursor-pointer",
                                    editingLuogo ? "" : "flex-1"
                                )}
                            >
                                Annulla
                            </button>
                            <button 
                                type="submit"
                                disabled={saving}
                                className="flex-1 py-3 bg-scout-green text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-scout-green-dark transition-colors disabled:opacity-40 shadow-md px-4 cursor-pointer"
                            >
                                <Check size={16} /> {saving ? 'Salvo...' : 'Salva'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
