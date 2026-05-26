import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Plus, Trash2, Wallet,
    TrendingUp, TrendingDown, Calendar, Tag, Info, X, Search
} from 'lucide-react';
import { getMovimenti, addMovimento, updateMovimento, deleteMovimento } from '@/lib/bilancio';
import { BilancioMovimento, BrancaType } from '@/types';
import { cn } from '@/lib/utils';
import { DisclaimerBanner } from '@/components/DisclaimerBanner';

const CATEGORIE = ['Attrezzatura', 'Attività & Uscite', 'Alimentari & Cucina', 'Trasporti', 'Quote', 'Sede & Logistica', 'Altro'];
const BRANCHE: BrancaType[] = ['L/C', 'E/G', 'R/S', 'Gruppo', 'CoCa'];

export default function Bilancio() {
    const navigate = useNavigate();
    const [movimenti, setMovimenti] = useState<BilancioMovimento[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filtri
    const [filterBranca, setFilterBranca] = useState<string>('Tutte');
    const [filterTipo, setFilterTipo] = useState<string>('Tutti');
    const [searchQuery, setSearchQuery] = useState('');

    // Stato Gestione Modals
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMovimento, setSelectedMovimento] = useState<BilancioMovimento | null>(null);

    // Campi Form
    const [titolo, setTitolo] = useState('');
    const [importo, setImporto] = useState('');
    const [tipo, setTipo] = useState<'entrata' | 'uscita'>('uscita');
    const [branca, setBranca] = useState<BrancaType>('Gruppo');
    const [categoria, setCategoria] = useState('Altro');
    const [data, setData] = useState(new Date().toISOString().split('T')[0]);
    const [note, setNote] = useState('');
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

    // Carica dati all'avvio
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getMovimenti();
            setMovimenti(data);
        } catch (err) {
            setError('Impossibile caricare i dati del bilancio. Riprova più tardi.');
        } finally {
            setLoading(false);
        }
    };

    // Saldo Generale
    const totalBalance = movimenti.reduce((acc, m) => {
        return acc + (m.tipo === 'entrata' ? m.importo : -m.importo);
    }, 0);

    const totalEntrate = movimenti.reduce((acc, m) => {
        return acc + (m.tipo === 'entrata' ? m.importo : 0);
    }, 0);

    const totalUscite = movimenti.reduce((acc, m) => {
        return acc + (m.tipo === 'uscita' ? m.importo : 0);
    }, 0);

    // Saldi per singola branca
    const getBalanceByBranca = (b: BrancaType) => {
        return movimenti
            .filter(m => m.branca === b)
            .reduce((acc, m) => acc + (m.tipo === 'entrata' ? m.importo : -m.importo), 0);
    };

    // Filtra movimenti
    const filteredMovimenti = movimenti.filter(m => {
        const matchBranca = filterBranca === 'Tutte' || m.branca === filterBranca;
        const matchTipo = filterTipo === 'Tutti' || m.tipo === filterTipo;
        const matchSearch = m.titolo.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (m.note && m.note.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (m.categoria && m.categoria.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchBranca && matchTipo && matchSearch;
    });

    // Reset Form
    const resetForm = () => {
        setTitolo('');
        setImporto('');
        setTipo('uscita');
        setBranca('Gruppo');
        setCategoria('Altro');
        setData(new Date().toISOString().split('T')[0]);
        setNote('');
        setFormError('');
        setSelectedMovimento(null);
    };

    // Apri Modal in inserimento
    const openAddModal = () => {
        resetForm();
        setIsModalOpen(true);
    };

    // Apri Modal in modifica
    const openEditModal = (m: BilancioMovimento) => {
        setSelectedMovimento(m);
        setTitolo(m.titolo);
        setImporto(String(m.importo));
        setTipo(m.tipo);
        setBranca(m.branca);
        setCategoria(m.categoria || 'Altro');
        setData(m.data);
        setNote(m.note || '');
        setFormError('');
        setIsModalOpen(true);
    };

    // Gestione Invio Form
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');

        if (!titolo.trim()) {
            setFormError('Il titolo è obbligatorio.');
            return;
        }

        const parsedImporto = parseFloat(importo);
        if (isNaN(parsedImporto) || parsedImporto <= 0) {
            setFormError("Inserisci un importo valido e maggiore di zero.");
            return;
        }

        setSaving(true);
        try {
            if (selectedMovimento) {
                // Modifica
                const updated = await updateMovimento({
                    ...selectedMovimento,
                    titolo,
                    importo: parsedImporto,
                    tipo,
                    branca,
                    categoria,
                    data,
                    note
                });
                if (updated) {
                    setMovimenti(prev => prev.map(m => m.id === updated.id ? updated : m));
                    setIsModalOpen(false);
                } else {
                    setFormError("Errore durante l'aggiornamento del movimento.");
                }
            } else {
                // Nuovo
                const added = await addMovimento({
                    titolo,
                    importo: parsedImporto,
                    tipo,
                    branca,
                    categoria,
                    data,
                    note
                });
                if (added) {
                    setMovimenti(prev => [added, ...prev]);
                    setIsModalOpen(false);
                } else {
                    setFormError("Errore durante l'inserimento del movimento.");
                }
            }
        } catch (err) {
            setFormError("Si è verificato un errore imprevisto.");
        } finally {
            setSaving(false);
        }
    };

    // Gestione Eliminazione
    const handleDelete = async (id: string) => {
        if (!confirm('Sei sicuro di voler eliminare questa voce di bilancio?')) return;
        
        try {
            const success = await deleteMovimento(id);
            if (success) {
                setMovimenti(prev => prev.filter(m => m.id !== id));
                setIsModalOpen(false);
            } else {
                alert("Errore durante l'eliminazione.");
            }
        } catch (err) {
            alert("Si è verificato un errore.");
        }
    };

    // Stile dei badge branca
    const getBrancaBadgeStyle = (b: BrancaType) => {
        switch (b) {
            case 'L/C': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            case 'E/G': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'R/S': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            case 'CoCa': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
            default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
        }
    };

    return (
        <div className="space-y-6 pb-24 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <ChevronLeft size={24} className="dark:text-white" />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">Patrimonio e Bilancio</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Tracciamento logico del bilancio del gruppo e delle branche</p>
                </div>
            </div>

            {/* DISCLAIMER BANNER (MESSAGGIO DI NON UFFICIALITÀ) */}
            <DisclaimerBanner />

            {/* Riepilogo Saldo Totale */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Saldo complessivo */}
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-5 flex items-center gap-4 shadow-sm relative overflow-hidden">
                    <div className="p-3.5 bg-scout-green/10 dark:bg-emerald-950/30 text-scout-green rounded-2xl shrink-0">
                        <Wallet size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-1">Saldo di Gruppo</p>
                        <p className={cn("text-2xl font-black leading-none font-mono", totalBalance >= 0 ? "text-gray-900 dark:text-white" : "text-red-500")}>
                            € {totalBalance.toFixed(2)}
                        </p>
                    </div>
                </div>

                {/* Totale entrate */}
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-5 flex items-center gap-4 shadow-sm">
                    <div className="p-3.5 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-1">Entrate Totali</p>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none font-mono">
                            + € {totalEntrate.toFixed(2)}
                        </p>
                    </div>
                </div>

                {/* Totale uscite */}
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-5 flex items-center gap-4 shadow-sm">
                    <div className="p-3.5 bg-red-100 dark:bg-red-900/20 text-red-500 rounded-2xl shrink-0">
                        <TrendingDown size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-1">Uscite Totali</p>
                        <p className="text-2xl font-black text-red-500 leading-none font-mono">
                            - € {totalUscite.toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Riepilogo Saldi Branche */}
            <div className="space-y-2.5">
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em] px-1">Saldi Branche e Categorie</p>
                
                {/* Mobile view: vertical list */}
                <div className="block sm:hidden space-y-2">
                    {BRANCHE.map(b => {
                        const balance = getBalanceByBranca(b);
                        const label = b === 'L/C' ? 'Branca L/C (Lupetti e Coccinelle)' :
                                      b === 'E/G' ? 'Branca E/G (Esploratori e Guide)' :
                                      b === 'R/S' ? 'Branca R/S (Rover e Scolte)' :
                                      b === 'CoCa' ? 'Comunità Capi' :
                                      'Cassa di Gruppo';
                        return (
                            <div key={b} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black leading-none", getBrancaBadgeStyle(b))}>
                                        {b}
                                    </span>
                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                                        {label}
                                    </span>
                                </div>
                                <p className={cn("text-sm font-black font-mono", balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
                                    € {balance.toFixed(2)}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Desktop view: 5-column grid */}
                <div className="hidden sm:grid sm:grid-cols-5 gap-3">
                    {BRANCHE.map(b => {
                        const balance = getBalanceByBranca(b);
                        return (
                            <div key={b} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-h-[90px]">
                                <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black w-max leading-none", getBrancaBadgeStyle(b))}>
                                    {b}
                                </span>
                                <p className={cn("text-base font-black mt-3 truncate font-mono", balance >= 0 ? "text-gray-900 dark:text-white" : "text-red-500")}>
                                    € {balance.toFixed(2)}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Azioni Principali */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button
                    onClick={openAddModal}
                    className="flex-1 bg-scout-green hover:bg-scout-green-dark text-white font-black px-6 py-4 rounded-3xl flex items-center justify-center gap-2 active:scale-98 transition-all text-sm shadow-md shadow-emerald-500/10"
                >
                    <Plus size={18} />
                    Aggiungi Movimento
                </button>
                <button
                    onClick={() => setIsHistoryOpen(true)}
                    className="flex-1 bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 hover:bg-gray-50 text-gray-700 dark:text-gray-200 font-black px-6 py-4 rounded-3xl flex items-center justify-center gap-2 active:scale-98 transition-all text-sm shadow-sm"
                >
                    <Wallet size={18} className="text-scout-green" />
                    Cronologia e Filtri
                </button>
            </div>

            {/* Modal Cronologia e Filtri (Finestra a Comparsa) */}
            {isHistoryOpen && (
                <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200" onClick={() => setIsHistoryOpen(false)}>
                    <div
                        className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-2xl p-5 md:p-6 space-y-5 shadow-2xl relative max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Bottone di chiusura */}
                        <button
                            onClick={() => setIsHistoryOpen(false)}
                            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-750 rounded-full dark:text-gray-400"
                        >
                            <X size={20} />
                        </button>

                        <div className="shrink-0">
                            <h2 className="text-xl font-black text-gray-900 dark:text-white">Cronologia Movimenti</h2>
                            <p className="text-xs text-gray-400">Cerca, filtra e visualizza tutti i movimenti di cassa registrati</p>
                        </div>

                        {/* Ricerca e Filtri */}
                        <div className="space-y-4 shrink-0">
                            {/* Ricerca */}
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Cerca per titolo, note, categoria..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-100 dark:border-gray-800 dark:bg-gray-950/50 outline-none focus:ring-2 focus:ring-scout-green text-sm"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                                        <X size={12} className="text-gray-400" />
                                    </button>
                                )}
                            </div>

                            {/* Filtri a pillole */}
                            <div className="flex flex-col gap-3 pt-2 border-t border-gray-50 dark:border-gray-800">
                                {/* Filtro Branca */}
                                <div className="flex flex-wrap gap-1.5 items-center">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0 mr-1.5">Branca:</span>
                                    {['Tutte', ...BRANCHE].map(b => (
                                        <button
                                            key={b}
                                            onClick={() => setFilterBranca(b)}
                                            className={cn(
                                                "px-3 py-1 rounded-full text-xs font-bold transition-all",
                                                filterBranca === b
                                                    ? "bg-scout-green text-white shadow-xs"
                                                    : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750"
                                            )}
                                        >
                                            {b}
                                        </button>
                                    ))}
                                </div>

                                {/* Filtro Tipo */}
                                <div className="flex flex-wrap gap-1.5 items-center">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0 mr-3">Tipo:</span>
                                    {['Tutti', 'entrata', 'uscita'].map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setFilterTipo(t)}
                                            className={cn(
                                                "px-3 py-1 rounded-full text-xs font-bold transition-all capitalize",
                                                filterTipo === t
                                                    ? t === 'entrata' ? "bg-emerald-600 text-white" : t === 'uscita' ? "bg-red-500 text-white" : "bg-scout-green text-white"
                                                    : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750"
                                            )}
                                        >
                                            {t === 'Tutti' ? 'Tutti' : t === 'entrata' ? 'Entrate' : 'Uscite'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Lista Movimenti (Scrollable) */}
                        <div className="flex-1 overflow-y-auto min-h-0 border border-gray-100 dark:border-gray-800 rounded-2xl divide-y divide-gray-50 dark:divide-gray-850 bg-gray-50/50 dark:bg-gray-950/20">
                            {loading ? (
                                <div className="p-12 text-center text-gray-400 italic text-sm">
                                    Caricamento movimenti in corso...
                                </div>
                            ) : error ? (
                                <div className="p-12 text-center text-red-500 text-sm">
                                    {error}
                                </div>
                            ) : filteredMovimenti.length === 0 ? (
                                <div className="p-12 text-center text-gray-450 dark:text-gray-500 italic text-sm">
                                    Nessun movimento di bilancio trovato.
                                </div>
                            ) : (
                                filteredMovimenti.map(m => (
                                    <div
                                        key={m.id}
                                        onClick={() => openEditModal(m)}
                                        className="p-4 flex items-center justify-between hover:bg-gray-100/50 dark:hover:bg-gray-800/40 transition-colors cursor-pointer"
                                    >
                                        <div className="flex-1 min-w-0 pr-4 space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-black leading-none", getBrancaBadgeStyle(m.branca))}>
                                                    {m.branca}
                                                </span>
                                                <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{m.titolo}</p>
                                            </div>
                                            <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {m.data}
                                                </span>
                                                {m.categoria && (
                                                    <span className="flex items-center gap-1">
                                                        <Tag size={12} />
                                                        {m.categoria}
                                                    </span>
                                                )}
                                                {m.note && (
                                                    <span className="flex items-center gap-1 truncate max-w-[150px] md:max-w-xs">
                                                        <Info size={12} />
                                                        {m.note}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className={cn("font-black text-sm font-mono", m.tipo === 'entrata' ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
                                                {m.tipo === 'entrata' ? '+' : '-'} € {m.importo.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="shrink-0 pt-2 flex justify-between items-center text-xs text-gray-400">
                            <span>
                                Trovati: <strong>{filteredMovimenti.length}</strong>
                            </span>
                            <button
                                onClick={() => setIsHistoryOpen(false)}
                                className="px-5 py-2.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 rounded-xl font-bold text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700"
                            >
                                Chiudi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal di Inserimento / Modifica (Z-INDEX 100 per sovrapporsi) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200" onClick={() => setIsModalOpen(false)}>
                    <div
                        className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Bottone di chiusura */}
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full dark:text-gray-400"
                        >
                            <X size={20} />
                        </button>

                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white">
                                {selectedMovimento ? 'Modifica Movimento' : 'Nuovo Movimento'}
                            </h2>
                            <p className="text-xs text-gray-400">Inserisci i dettagli del movimento di cassa</p>
                        </div>

                        {formError && (
                            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 p-3 rounded-xl text-xs font-bold border border-red-100 dark:border-red-800">
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleSave} className="space-y-4">
                            {/* Titolo */}
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-1">Titolo / Descrizione *</label>
                                <input
                                    type="text"
                                    value={titolo}
                                    onChange={e => setTitolo(e.target.value)}
                                    placeholder="Es: Acquisto corde reparto"
                                    className="w-full p-3 rounded-xl border border-gray-100 dark:border-gray-750 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-scout-green text-sm dark:text-white"
                                    required
                                />
                            </div>

                            {/* Importo e Tipo */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-1">Importo (€) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={importo}
                                        onChange={e => setImporto(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full p-3 rounded-xl border border-gray-100 dark:border-gray-750 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-scout-green text-sm dark:text-white font-mono"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-1">Tipo di Cassa *</label>
                                    <select
                                        value={tipo}
                                        onChange={e => setTipo(e.target.value as 'entrata' | 'uscita')}
                                        className="w-full p-3 rounded-xl border border-gray-100 dark:border-gray-750 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-scout-green text-sm dark:text-white"
                                    >
                                        <option value="uscita">Uscita (Spesa)</option>
                                        <option value="entrata">Entrata (Ricavo)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Branca e Categoria */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-1">Branca *</label>
                                    <select
                                        value={branca}
                                        onChange={e => setBranca(e.target.value as BrancaType)}
                                        className="w-full p-3 rounded-xl border border-gray-100 dark:border-gray-750 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-scout-green text-sm dark:text-white"
                                    >
                                        {BRANCHE.map(b => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-1">Categoria *</label>
                                    <select
                                        value={categoria}
                                        onChange={e => setCategoria(e.target.value)}
                                        className="w-full p-3 rounded-xl border border-gray-100 dark:border-gray-750 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-scout-green text-sm dark:text-white"
                                    >
                                        {CATEGORIE.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Data */}
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-1">Data Movimento *</label>
                                <input
                                    type="date"
                                    value={data}
                                    onChange={e => setData(e.target.value)}
                                    className="w-full p-3 rounded-xl border border-gray-100 dark:border-gray-750 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-scout-green text-sm dark:text-white"
                                    required
                                />
                            </div>

                            {/* Note */}
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-1">Note (Opzionale)</label>
                                <textarea
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    placeholder="Es: scontrino depositato in cassa"
                                    rows={2}
                                    className="w-full p-3 rounded-xl border border-gray-100 dark:border-gray-750 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-scout-green text-sm resize-none dark:text-white"
                                />
                            </div>

                            {/* Azioni Form */}
                            <div className="flex gap-3 pt-2">
                                {selectedMovimento && (
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(selectedMovimento.id)}
                                        className="px-3.5 bg-red-100 text-red-500 hover:bg-red-200 dark:bg-red-950/20 dark:hover:bg-red-900/30 rounded-xl transition-colors shrink-0"
                                        title="Elimina movimento"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl font-bold text-sm text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-750"
                                >
                                    Annulla
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-3 bg-scout-green text-white rounded-xl font-bold text-sm active:scale-98 transition-all disabled:opacity-50"
                                >
                                    {saving ? 'Salvataggio...' : 'Salva'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
