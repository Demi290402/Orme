import { useState, useEffect, useRef } from 'react';
import { getListaAttesa, addIscritto, updateIscritto, deleteIscritto } from '@/lib/listaAttesa';
import { ListaAttesa as IscrittoType } from '@/types';
import { getUser } from '@/lib/data';
import * as XLSX from 'xlsx';
import {
    Plus,
    Upload,
    Sparkles,
    Search,
    Trash2,
    Edit2,
    Phone,
    User,
    Check,
    X,
    Filter,
    FileSpreadsheet,
    HelpCircle,
    Info,
    Copy,
    Compass,
    Share2,
    Clock
} from 'lucide-react';

const CLASSI = [
    'Asilo',
    '1a Elementare',
    '2a Elementare',
    '3a Elementare',
    '4a Elementare',
    '5a Elementare',
    '1a Media',
    '2a Media',
    '3a Media',
    '1a Superiore',
    '2a Superiore',
    '3a Superiore',
    '4a Superiore',
    '5a Superiore'
];

function calculateAge(birthDateStr: string): number {
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return isNaN(age) ? 0 : age;
}

function calculateDaysInList(registrationDateStr: string): number {
    const regDate = new Date(registrationDateStr);
    const today = new Date();
    regDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - regDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return isNaN(diffDays) ? 0 : Math.max(0, diffDays);
}

export default function ListaAttesa() {
    const [lista, setLista] = useState<IscrittoType[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStato, setFilterStato] = useState<string>('Tutti');
    const [filterClasse, setFilterClasse] = useState<string>('Tutti');

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showAutoModal, setShowAutoModal] = useState(false);
    const [editingIscritto, setEditingIscritto] = useState<IscrittoType | null>(null);

    // Form inputs (Add / Edit)
    const [nomeGenitore, setNomeGenitore] = useState('');
    const [telefonoGenitore, setTelefonoGenitore] = useState('');
    const [nomeRagazzo, setNomeRagazzo] = useState('');
    const [cognomeRagazzo, setCognomeRagazzo] = useState('');
    const [dataNascita, setDataNascita] = useState('');
    const [classe, setClasse] = useState('');
    const [dataIscrizione, setDataIscrizione] = useState(new Date().toISOString().split('T')[0]);
    const [note, setNote] = useState('');
    const [stato, setStato] = useState<IscrittoType['stato']>('In attesa');

    // Import Excel Mapping states
    const [importData, setImportData] = useState<any[]>([]);
    const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
    const [mappings, setMappings] = useState<Record<string, string>>({
        nomeRagazzo: '',
        cognomeRagazzo: '',
        dataNascita: '',
        classe: '',
        nomeGenitore: '',
        telefonoGenitore: '',
        dataIscrizione: '',
        note: ''
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Alerts/Feedback
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchLista = async () => {
        setLoading(true);
        const data = await getListaAttesa();
        setLista(data);
        setLoading(false);
    };

    useEffect(() => {
        getUser().then(setCurrentUser).catch(console.error);
        fetchLista();
    }, []);

    const openEditModal = (iscritto: IscrittoType) => {
        setEditingIscritto(iscritto);
        setNomeGenitore(iscritto.nomeGenitore);
        setTelefonoGenitore(iscritto.telefonoGenitore);
        setNomeRagazzo(iscritto.nomeRagazzo);
        setCognomeRagazzo(iscritto.cognomeRagazzo);
        setDataNascita(iscritto.dataNascita);
        setClasse(iscritto.classe);
        setDataIscrizione(iscritto.dataIscrizione);
        setNote(iscritto.note || '');
        setStato(iscritto.stato);
        setShowAddModal(true);
    };

    const closeAddModal = () => {
        setShowAddModal(false);
        setEditingIscritto(null);
        setNomeGenitore('');
        setTelefonoGenitore('');
        setNomeRagazzo('');
        setCognomeRagazzo('');
        setDataNascita('');
        setClasse('');
        setDataIscrizione(new Date().toISOString().split('T')[0]);
        setNote('');
        setStato('In attesa');
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nomeGenitore || !telefonoGenitore || !nomeRagazzo || !cognomeRagazzo || !dataNascita || !classe) {
            showToast('Compila tutti i campi obbligatori', 'error');
            return;
        }

        const payload = {
            nomeGenitore,
            telefonoGenitore,
            nomeRagazzo,
            cognomeRagazzo,
            dataNascita,
            classe,
            dataIscrizione,
            note,
            stato
        };

        if (editingIscritto) {
            const updated = await updateIscritto({ ...editingIscritto, ...payload });
            if (updated) {
                showToast('Iscritto aggiornato con successo!');
                fetchLista();
                closeAddModal();
            } else {
                showToast('Errore nell\'aggiornamento', 'error');
            }
        } else {
            const added = await addIscritto(payload);
            if (added) {
                showToast('Nuovo iscritto aggiunto alla lista!');
                fetchLista();
                closeAddModal();
            } else {
                showToast('Errore nell\'inserimento', 'error');
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Sei sicuro di voler rimuovere questo iscritto?')) {
            const success = await deleteIscritto(id);
            if (success) {
                showToast('Iscritto rimosso con successo!');
                fetchLista();
            } else {
                showToast('Errore nell\'eliminazione', 'error');
            }
        }
    };

    const handleStatoChange = async (iscritto: IscrittoType, nuovoStato: IscrittoType['stato']) => {
        const updated = await updateIscritto({ ...iscritto, stato: nuovoStato });
        if (updated) {
            showToast(`Stato aggiornato a "${nuovoStato}"`);
            fetchLista();
        } else {
            showToast('Errore durante l\'aggiornamento dello stato', 'error');
        }
    };

    // Excel import logic
    const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const rawData = XLSX.utils.sheet_to_json(ws);
            if (rawData.length > 0) {
                setImportData(rawData);
                const headers = Object.keys(rawData[0] as object);
                setExcelHeaders(headers);

                // Auto-detect mappings based on header similarity
                const newMappings = { ...mappings };
                headers.forEach(h => {
                    const hLower = h.toLowerCase();
                    if (hLower.includes('genitore') || hLower.includes('tutor') || hLower.includes('padre') || hLower.includes('madre')) newMappings.nomeGenitore = h;
                    else if (hLower.includes('tel') || hLower.includes('cell') || hLower.includes('telefon')) newMappings.telefonoGenitore = h;
                    else if (hLower.includes('nome') && (hLower.includes('ragazzo') || hLower.includes('figlio') || hLower.includes('bambino'))) newMappings.nomeRagazzo = h;
                    else if (hLower.includes('cognome') && (hLower.includes('ragazzo') || hLower.includes('figlio') || hLower.includes('bambino'))) newMappings.cognomeRagazzo = h;
                    else if (hLower.includes('nascita') || hLower.includes('nato') || hLower.includes('nasc')) newMappings.dataNascita = h;
                    else if (hLower.includes('classe') || hLower.includes('scuola')) newMappings.classe = h;
                    else if (hLower.includes('iscriz') || hLower.includes('data_i') || hLower.includes('giorno')) newMappings.dataIscrizione = h;
                    else if (hLower.includes('note') || hLower.includes('info')) newMappings.note = h;
                });
                setMappings(newMappings);
            } else {
                showToast('Il file caricato sembra essere vuoto.', 'error');
            }
        };
        reader.readAsBinaryString(file);
    };

    const confirmImport = async () => {
        if (!mappings.nomeRagazzo || !mappings.cognomeRagazzo || !mappings.dataNascita || !mappings.classe || !mappings.nomeGenitore || !mappings.telefonoGenitore) {
            showToast('Mappa almeno i campi obbligatori (Nome, Cognome, Nascita, Classe, Genitore, Telefono).', 'error');
            return;
        }

        let successCount = 0;
        for (const row of importData) {
            // Helper to clean dates
            let rawBDate = row[mappings.dataNascita];
            let parsedBDate = '';
            if (rawBDate) {
                // If excel parsed as number
                if (typeof rawBDate === 'number') {
                    const utc_days = Math.floor(rawBDate - 25569);
                    const utc_value = utc_days * 86400;
                    parsedBDate = new Date(utc_value * 1000).toISOString().split('T')[0];
                } else {
                    const dateObj = new Date(rawBDate);
                    parsedBDate = isNaN(dateObj.getTime()) ? '' : dateObj.toISOString().split('T')[0];
                }
            }

            let rawIDate = row[mappings.dataIscrizione];
            let parsedIDate = new Date().toISOString().split('T')[0];
            if (rawIDate) {
                if (typeof rawIDate === 'number') {
                    const utc_days = Math.floor(rawIDate - 25569);
                    const utc_value = utc_days * 86400;
                    parsedIDate = new Date(utc_value * 1000).toISOString().split('T')[0];
                } else {
                    const dateObj = new Date(rawIDate);
                    if (!isNaN(dateObj.getTime())) parsedIDate = dateObj.toISOString().split('T')[0];
                }
            }

            // Normalizza la classe per rientrare nella lista CLASSI
            let rawClasse = String(row[mappings.classe] || '').trim();
            let matchedClasse = '1a Elementare'; // default fallback
            const match = CLASSI.find(c => c.toLowerCase() === rawClasse.toLowerCase() || rawClasse.toLowerCase().includes(c.toLowerCase()));
            if (match) matchedClasse = match;

            const payload = {
                nomeRagazzo: String(row[mappings.nomeRagazzo] || '').trim(),
                cognomeRagazzo: String(row[mappings.cognomeRagazzo] || '').trim(),
                dataNascita: parsedBDate || new Date().toISOString().split('T')[0],
                classe: matchedClasse,
                nomeGenitore: String(row[mappings.nomeGenitore] || '').trim(),
                telefonoGenitore: String(row[mappings.telefonoGenitore] || '').trim(),
                dataIscrizione: parsedIDate,
                note: mappings.note ? String(row[mappings.note] || '').trim() : '',
                stato: 'In attesa' as const
            };

            const res = await addIscritto(payload);
            if (res) successCount++;
        }

        showToast(`Importati con successo ${successCount} record su ${importData.length}!`);
        setShowImportModal(false);
        setImportData([]);
        setExcelHeaders([]);
        fetchLista();
    };

    // Filter Logic
    const filteredLista = lista.filter(item => {
        const fullChildName = `${item.nomeRagazzo} ${item.cognomeRagazzo}`.toLowerCase();
        const parentName = item.nomeGenitore.toLowerCase();
        const matchesSearch = fullChildName.includes(searchTerm.toLowerCase()) || parentName.includes(searchTerm.toLowerCase()) || item.telefonoGenitore.includes(searchTerm);
        const matchesStato = filterStato === 'Tutti' || item.stato === filterStato;
        const matchesClasse = filterClasse === 'Tutti' || item.classe === filterClasse;
        return matchesSearch && matchesStato && matchesClasse;
    });

    const publicUrl = currentUser?.groupId ? `${window.location.origin}/iscrizione/${currentUser.groupId}` : '';

    const handleCopyLink = () => {
        if (!publicUrl) return;
        navigator.clipboard.writeText(publicUrl);
        showToast('Link di iscrizione copiato negli appunti!');
    };

    return (
        <div className="space-y-6">
            {/* Toast message */}
            {toast && (
                <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-5 py-3.5 rounded-2xl shadow-xl border animate-in slide-in-from-top duration-300 ${
                    toast.type === 'success' 
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200' 
                        : 'bg-red-50 dark:bg-red-950/70 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-200'
                }`}>
                    {toast.type === 'success' ? <Check className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                    <span className="text-xs font-bold">{toast.message}</span>
                </div>
            )}

            {/* Header section */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-150 dark:border-gray-750 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-scout-green font-bold text-sm">
                        <Clock className="w-4 h-4" />
                        Sezione Capi
                    </div>
                    <h1 className="text-2xl font-black tracking-tight">Lista d'Attesa Scout</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Gestisci le nuove iscrizioni del gruppo ed esporta o importa anagrafiche.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button
                        onClick={() => setShowAutoModal(true)}
                        className="flex-1 md:flex-initial px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-emerald-100 dark:border-emerald-900/30 transition-all cursor-pointer"
                    >
                        <Share2 className="w-4 h-4" />
                        Condividi / Automazioni
                    </button>
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="flex-1 md:flex-initial px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 dark:text-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-amber-100 dark:border-amber-900/30 transition-all cursor-pointer"
                    >
                        <Upload className="w-4 h-4" />
                        Importa File
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex-1 md:flex-initial px-4 py-2.5 bg-scout-green hover:bg-scout-green-dark text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Aggiungi Ragazzo
                    </button>
                </div>
            </div>

            {/* Quick stats banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-150 dark:border-gray-750 text-center space-y-1.5">
                    <span className="text-[10px] uppercase font-black tracking-wider text-gray-400 dark:text-gray-500">Iscritti Totali</span>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white">{lista.length}</h2>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-150 dark:border-gray-750 text-center space-y-1.5">
                    <span className="text-[10px] uppercase font-black tracking-wider text-amber-500">In attesa</span>
                    <h2 className="text-3xl font-black text-amber-500">{lista.filter(i => i.stato === 'In attesa').length}</h2>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-150 dark:border-gray-750 text-center space-y-1.5">
                    <span className="text-[10px] uppercase font-black tracking-wider text-emerald-500">Accettati</span>
                    <h2 className="text-3xl font-black text-emerald-500">{lista.filter(i => i.stato === 'Accettato').length}</h2>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-150 dark:border-gray-750 text-center space-y-1.5">
                    <span className="text-[10px] uppercase font-black tracking-wider text-red-500">Rifiutati/Archivio</span>
                    <h2 className="text-3xl font-black text-red-500">{lista.filter(i => i.stato === 'Rifiutato').length}</h2>
                </div>
            </div>

            {/* Filters panel */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-150 dark:border-gray-750 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    <Filter className="w-3.5 h-3.5" />
                    Filtra & Cerca
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cerca nome ragazzo, genitore o tel..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-scout-green focus:border-transparent transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-gray-400 shrink-0 uppercase">Stato:</label>
                        <select
                            value={filterStato}
                            onChange={(e) => setFilterStato(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-scout-green transition-all"
                        >
                            <option value="Tutti">Tutti gli stati</option>
                            <option value="In attesa">In attesa</option>
                            <option value="Accettato">Accettato</option>
                            <option value="Rifiutato">Rifiutato</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-gray-400 shrink-0 uppercase">Classe:</label>
                        <select
                            value={filterClasse}
                            onChange={(e) => setFilterClasse(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-scout-green transition-all"
                        >
                            <option value="Tutti">Tutte le classi</option>
                            {CLASSI.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Waiting list table */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-150 dark:border-gray-750 shadow-xs overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500 dark:text-gray-400 text-xs">
                        Caricamento lista d'attesa in corso...
                    </div>
                ) : filteredLista.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 dark:text-gray-400 text-xs">
                        Nessun iscritto trovato per i criteri impostati.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-[10px] uppercase font-black tracking-wider text-gray-400 dark:text-gray-500">
                                    <th className="p-4 pl-6">Figlio / Figlia</th>
                                    <th className="p-4">Età / Classe</th>
                                    <th className="p-4">Genitore / Telefono</th>
                                    <th className="p-4 text-center">Giorni in lista</th>
                                    <th className="p-4 text-center">Stato</th>
                                    <th className="p-4 pr-6 text-right">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 text-xs">
                                {filteredLista.map((item) => {
                                    const age = calculateAge(item.dataNascita);
                                    const days = calculateDaysInList(item.dataIscrizione);
                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-750/30 transition-colors">
                                            <td className="p-4 pl-6 font-bold text-gray-900 dark:text-white">
                                                {item.nomeRagazzo} {item.cognomeRagazzo}
                                                {item.note && (
                                                    <span className="block text-[10px] font-normal text-gray-400 dark:text-gray-500 mt-1 max-w-xs truncate" title={item.note}>
                                                        Note: {item.note}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span className="font-semibold text-gray-700 dark:text-gray-300">{age} anni</span>
                                                <span className="block text-[10px] text-gray-400 dark:text-gray-500">{item.classe}</span>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-medium text-gray-800 dark:text-gray-250 flex items-center gap-1">
                                                    <User className="w-3.5 h-3.5 text-gray-400" />
                                                    {item.nomeGenitore}
                                                </div>
                                                <a href={`tel:${item.telefonoGenitore}`} className="text-[10px] text-scout-green hover:underline flex items-center gap-1 mt-1 font-semibold">
                                                    <Phone className="w-3 h-3" />
                                                    {item.telefonoGenitore}
                                                </a>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300 rounded-full font-bold text-[10px]">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {days} gg
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <select
                                                    value={item.stato}
                                                    onChange={(e) => handleStatoChange(item, e.target.value as IscrittoType['stato'])}
                                                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-center border-0 cursor-pointer ${
                                                        item.stato === 'In attesa' 
                                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-350'
                                                            : item.stato === 'Accettato'
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-350'
                                                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-350'
                                                    }`}
                                                >
                                                    <option value="In attesa">In attesa</option>
                                                    <option value="Accettato">Accettato</option>
                                                    <option value="Rifiutato">Rifiutato</option>
                                                </select>
                                            </td>
                                            <td className="p-4 pr-6 text-right space-x-2">
                                                <button
                                                    onClick={() => openEditModal(item)}
                                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 rounded-full transition-colors cursor-pointer"
                                                    title="Modifica"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 hover:text-red-700 rounded-full transition-colors cursor-pointer"
                                                    title="Elimina"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal: Aggiungi / Modifica */}
            {showAddModal && (
                <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={closeAddModal} />
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-3xl p-6 md:p-8 z-10 border border-gray-150 dark:border-gray-750 shadow-2xl relative space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-3">
                            <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                                {editingIscritto ? 'Modifica Iscritto' : 'Nuovo Iscritto Manuale'}
                            </h3>
                            <button onClick={closeAddModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full dark:text-gray-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nome Bambino/a *</label>
                                    <input
                                        type="text"
                                        required
                                        value={nomeRagazzo}
                                        onChange={(e) => setNomeRagazzo(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cognome Bambino/a *</label>
                                    <input
                                        type="text"
                                        required
                                        value={cognomeRagazzo}
                                        onChange={(e) => setCognomeRagazzo(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Data Nascita *</label>
                                    <input
                                        type="date"
                                        required
                                        value={dataNascita}
                                        onChange={(e) => setDataNascita(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Classe *</label>
                                    <select
                                        required
                                        value={classe}
                                        onChange={(e) => setClasse(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs"
                                    >
                                        <option value="">Seleziona classe...</option>
                                        {CLASSI.map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nome Genitore *</label>
                                    <input
                                        type="text"
                                        required
                                        value={nomeGenitore}
                                        onChange={(e) => setNomeGenitore(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Telefono Riferimento *</label>
                                    <input
                                        type="tel"
                                        required
                                        value={telefonoGenitore}
                                        onChange={(e) => setTelefonoGenitore(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Data Iscrizione *</label>
                                    <input
                                        type="date"
                                        required
                                        value={dataIscrizione}
                                        onChange={(e) => setDataIscrizione(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Stato *</label>
                                    <select
                                        value={stato}
                                        onChange={(e) => setStato(e.target.value as IscrittoType['stato'])}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-bold"
                                    >
                                        <option value="In attesa">In attesa</option>
                                        <option value="Accettato">Accettato</option>
                                        <option value="Rifiutato">Rifiutato</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Note (Opzionale)</label>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs resize-none"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-scout-green hover:bg-scout-green-dark text-white font-extrabold py-3.5 rounded-2xl text-xs transition-all shadow-md cursor-pointer"
                            >
                                Salva Dati
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Importa da Excel */}
            {showImportModal && (
                <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowImportModal(false)} />
                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-3xl p-6 md:p-8 z-10 border border-gray-150 dark:border-gray-750 shadow-2xl relative space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-3">
                            <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
                                <FileSpreadsheet className="w-5 h-5 text-amber-500" />
                                Carica da File Excel / CSV
                            </h3>
                            <button onClick={() => setShowImportModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full dark:text-gray-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {importData.length === 0 ? (
                            <div className="space-y-4">
                                <div className="p-8 border-2 border-dashed border-gray-250 dark:border-gray-750 rounded-2xl text-center space-y-4 hover:border-scout-green transition-all">
                                    <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Carica il tuo foglio di calcolo (.xlsx, .xls o .csv)</p>
                                        <p className="text-[10px] text-gray-400">Assicurati che il file contenga intestazioni di colonna.</p>
                                    </div>
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={handleExcelUpload}
                                        ref={fileInputRef}
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300 rounded-xl text-xs font-extrabold border border-amber-100 dark:border-amber-900/30 transition-all cursor-pointer"
                                    >
                                        Seleziona File
                                    </button>
                                </div>
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl text-[10px] leading-relaxed text-emerald-800 dark:text-emerald-250 flex gap-2">
                                    <Info className="w-4 h-4 shrink-0 text-emerald-600" />
                                    <span>
                                        <strong>Consiglio:</strong> L'età e i giorni trascorsi in lista verranno calcolati automaticamente dal sistema in tempo reale una volta importato il file, partendo dalle date di nascita e iscrizione fornite.
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/30 rounded-2xl text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center justify-between">
                                    <span>Trovate {importData.length} righe! Associa le colonne del file ai dati di Orme:</span>
                                    <button 
                                        onClick={() => { setImportData([]); setExcelHeaders([]); }} 
                                        className="text-xs underline hover:text-amber-900 dark:hover:text-amber-100"
                                    >
                                        Annulla
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto p-1 border border-gray-100 dark:border-gray-700/50 rounded-2xl">
                                    {Object.keys(mappings).map((fieldKey) => {
                                        const isRequired = ['nomeRagazzo', 'cognomeRagazzo', 'dataNascita', 'classe', 'nomeGenitore', 'telefonoGenitore'].includes(fieldKey);
                                        return (
                                            <div key={fieldKey} className="space-y-1 p-2 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-150 dark:border-gray-750">
                                                <label className="text-[10px] font-bold text-gray-700 dark:text-gray-300 block uppercase">
                                                    {fieldKey === 'nomeRagazzo' && 'Nome Figlio/a'}
                                                    {fieldKey === 'cognomeRagazzo' && 'Cognome Figlio/a'}
                                                    {fieldKey === 'dataNascita' && 'Data Nascita'}
                                                    {fieldKey === 'classe' && 'Classe frequentata'}
                                                    {fieldKey === 'nomeGenitore' && 'Nome Genitore'}
                                                    {fieldKey === 'telefonoGenitore' && 'Telefono Genitore'}
                                                    {fieldKey === 'dataIscrizione' && 'Data Iscrizione'}
                                                    {fieldKey === 'note' && 'Note'}
                                                    {isRequired ? ' *' : ''}
                                                </label>
                                                <select
                                                    value={mappings[fieldKey]}
                                                    onChange={(e) => setMappings({ ...mappings, [fieldKey]: e.target.value })}
                                                    className="w-full px-2 py-1.5 border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg text-xs"
                                                >
                                                    <option value="">-- Non mappare --</option>
                                                    {excelHeaders.map((header) => (
                                                        <option key={header} value={header}>{header}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={confirmImport}
                                    className="w-full bg-scout-green hover:bg-scout-green-dark text-white font-extrabold py-3.5 rounded-2xl text-xs transition-all shadow-md cursor-pointer"
                                >
                                    Conferma Importazione
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal: Automations & QR Sharing */}
            {showAutoModal && (
                <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowAutoModal(false)} />
                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-3xl p-6 md:p-8 z-10 border border-gray-150 dark:border-gray-750 shadow-2xl relative space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-3">
                            <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-scout-green" />
                                Automazioni & Form Iscrizioni
                            </h3>
                            <button onClick={() => setShowAutoModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full dark:text-gray-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Tab 1: Native Form and QR Code */}
                        <div className="space-y-4">
                            <div className="p-5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl space-y-4">
                                <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-250 flex items-center gap-1.5 uppercase">
                                    <Compass className="w-4 h-4" />
                                    Metodo 1: Form Nativo di Orme (Consigliato ⭐)
                                </h4>
                                <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80 leading-relaxed">
                                    Questo link è pronto per l'uso e progettato per i genitori. Compilando il modulo, il ragazzo entrerà direttamente in questa lista d'attesa in tempo reale, senza alcuno sforzo tecnico da parte tua.
                                </p>
                                <div className="flex flex-col md:flex-row items-center gap-6 pt-2">
                                    <div className="bg-white p-3 rounded-2xl border border-gray-200 dark:border-gray-700 shrink-0">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(publicUrl)}`}
                                            alt="QR Code Iscrizione"
                                            className="w-[150px] h-[150px]"
                                        />
                                    </div>
                                    <div className="space-y-3 w-full">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Link pubblico da condividere:</span>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={publicUrl}
                                                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-600 dark:text-gray-400 select-all"
                                                />
                                                <button
                                                    onClick={handleCopyLink}
                                                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-gray-400 leading-normal">
                                            Puoi inserire questo link sul sito del tuo gruppo scout, inoltrarlo sui gruppi Whatsapp dei genitori o stampare il QR Code per i volantini di iscrizione.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Tab 2: Google Form integration guide */}
                            <div className="p-5 bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-750 rounded-2xl space-y-4">
                                <h4 className="text-xs font-black text-gray-800 dark:text-gray-200 flex items-center gap-1.5 uppercase">
                                    <HelpCircle className="w-4 h-4 text-amber-500" />
                                    Metodo 2: Collegamento con Google Form Esistente
                                </h4>
                                <p className="text-xs text-gray-600 dark:text-gray-450 leading-relaxed">
                                    Se utilizzi già un Google Form e un Google Sheet, puoi sincronizzare automaticamente ogni nuova compilazione con l'app di Orme seguendo questi passaggi:
                                </p>
                                <ol className="list-decimal pl-5 text-xs text-gray-600 dark:text-gray-450 space-y-2">
                                    <li>Apri lo <strong>Sheet di Google</strong> collegato al tuo Google Form.</li>
                                    <li>Nel menu in alto, seleziona <strong>Estensioni &gt; Apps Script</strong>.</li>
                                    <li>Cancella l'editor e incolla lo script Javascript fornito sotto.</li>
                                    <li>
                                        Nel menu a sinistra, clicca sull'icona della sveglia (<strong>Attivatori</strong>) e premi "Aggiungi attivatore". Imposta:
                                        <br />
                                        <span className="text-[10px] font-bold text-scout-green">
                                            "Seleziona la sorgente dell'evento: Da foglio di calcolo" | "Tipo di evento: All'invio del modulo"
                                        </span>
                                    </li>
                                    <li>Salva ed esegui l'autorizzazione di Google.</li>
                                </ol>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Google Apps Script da copiare:</span>
                                    <pre className="p-4 bg-gray-900 text-emerald-400 rounded-2xl text-[10px] font-mono overflow-x-auto max-h-[180px] leading-relaxed">
{`function onFormSubmit(e) {
  var row = e.values;
  
  // URL del database Supabase
  var supabaseUrl = "${(import.meta as any).env.VITE_SUPABASE_URL}";
  var anonKey = "${(import.meta as any).env.VITE_SUPABASE_ANON_KEY}";
  
  var payload = {
    group_id: "${currentUser?.groupId || ''}",
    nome_genitore: row[1], // Modifica l'indice in base alle colonne dello sheet
    telefono_genitore: row[2],
    nome_ragazzo: row[3],
    cognome_ragazzo: row[4],
    data_nascita: row[5],
    classe: row[6],
    data_iscrizione: new Date().toISOString().split('T')[0],
    note: row[7] || '',
    stato: 'In attesa'
  };
  
  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'apikey': anonKey,
      'Authorization': 'Bearer ' + anonKey
    },
    payload: JSON.stringify(payload)
  };
  
  UrlFetchApp.fetch(supabaseUrl + '/rest/v1/lista_attesa', options);
}`}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
