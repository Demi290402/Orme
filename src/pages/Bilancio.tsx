import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Plus, Trash2, AlertTriangle, Wallet,
    TrendingUp, TrendingDown, Calendar, Tag, Info, X, Search
} from 'lucide-react';
import { getMovimenti, addMovimento, updateMovimento, deleteMovimento } from '@/lib/bilancio';
import { BilancioMovimento, BrancaType } from '@/types';
import { cn } from '@/lib/utils';

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

    // Stato Gestione Modal (Aggiunta / Modifica)
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
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 flex gap-3 shadow-sm">
                <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
                <div className="space-y-1">
                    <p className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider">Strumento di Supporto Non Ufficiale</p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400/90 leading-relaxed font-medium">
                        Questa sezione ha unicamente finalità di <strong>supporto logistico e organizzativo interno</strong> per le attività di branca e di gruppo scout.
                        <strong> Non sostituisce in alcun modo</strong> i registri, i software o i gestionali ufficiali indicati dall'associazione nazionale per gli adempimenti fiscali e la tenuta della contabilità del gruppo.
                    </p>
                </div>
            </div>

            {/* Riepilogo Saldo Totale */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Saldo complessivo */}
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-5 flex items-center gap-4 shadow-sm relative overflow-hidden">
                    <div className="p-3.5 bg-scout-green/10 dark:bg-emerald-950/30 text-scout-green rounded-2xl shrink-0">
                        <Wallet size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-1">Saldo di Gruppo</p>
                        <p className={cn("text-2xl font-black leading-none", totalBalance >= 0 ? "text-gray-900 dark:text-white" : "text-red-500")}>
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
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
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
                        <p className="text-2xl font-black text-red-500 leading-none">
                            - € {totalUscite.toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Riepilogo Saldi Branche */}
            <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em] px-1">Saldi Branche e Categorie</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {BRANCHE.map(b => {
                        const balance = getBalanceByBranca(b);
                        return (
                            <div key={b} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-3 shadow-xs flex flex-col justify-between min-h-[80px]">
                                <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black w-max leading-none", getBrancaBadgeStyle(b))}>
                                    {b}
                                </span>
                                <p className={cn("text-sm font-black mt-2 truncate", balance >= 0 ? "text-gray-900 dark:text-white" : "text-red-500")}>
                                    € {balance.toFixed(2)}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Azioni Principali e Filtri */}
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-4 md:p-6 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Ricerca */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Cerca per titolo, note..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-100 dark:border-gray-700 dark:bg-gray-900/50 outline-none focus:ring-2 focus:ring-scout-green text-sm"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                                <X size={12} className="text-gray-400" />
                            </button>
                        )}
                    </div>

                    {/* Bottone Aggiungi */}
                    <button
                        onClick={openAddModal}
                        className="bg-scout-green hover:bg-scout-green-dark text-white font-black px-5 py-3 rounded-2xl flex items-center justify-center gap-2 active:scale-98 transition-all shrink-0 text-sm shadow-md shadow-emerald-500/10"
                    >
                        <Plus size={18} />
                        Aggiungi Voce
                    </button>
                </div>

                {/* Filtri a pillole */}
                <div className="flex flex-col gap-3 pt-2 border-t border-gray-50 dark:border-gray-700/50">
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
                                        : "bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750"
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
                                        : "bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750"
                                )}
                            >
                                {t === 'Tutti' ? 'Tutti' : t === 'entrata' ? 'Entrate' : 'Uscite'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabella / Lista Movimenti */}
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-750 flex items-center justify-between">
                    <h3 className="font-black text-sm text-gray-900 dark:text-white">Cronologia Movimenti</h3>
                    <span className="text-[10px] bg-gray-50 dark:bg-gray-900 px-2.5 py-1 rounded-full text-gray-400 font-bold">
                        {filteredMovimenti.length} {filteredMovimenti.length === 1 ? 'movimento' : 'movimenti'}
                    </span>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-400">Caricamento movimenti in corso...</div>
                ) : error ? (
                    <div className="p-8 text-center text-red-500">{error}</div>
                ) : filteredMovimenti.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 italic">
                        Nessun movimento di bilancio trovato con i filtri selezionati.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50 dark:divide-gray-750">
                        {filteredMovimenti.map(m => (
                            <div
                                key={m.id}
                                onClick={() => openEditModal(m)}
                                className="p-4 md:p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750/30 transition-colors cursor-pointer"
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
                                    <p className={cn("font-black text-sm", m.tipo === 'entrata' ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
                                        {m.tipo === 'entrata' ? '+' : '-'} € {m.importo.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal di Inserimento / Modifica */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs" onClick={() => setIsModalOpen(false)}>
                    <div
                        className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto"
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
                                    className="w-full p-3 rounded-xl border border-gray-100 dark:border-gray-750 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-scout-green text-sm"
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
                                        className="w-full p-3 rounded-xl border border-gray-100 dark:border-gray-750 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-scout-green text-sm"
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
                                    className="w-full p-3 rounded-xl border border-gray-100 dark:border-gray-750 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-scout-green text-sm"
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
                                    className="w-full p-3 rounded-xl border border-gray-100 dark:border-gray-750 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-scout-green text-sm resize-none"
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
