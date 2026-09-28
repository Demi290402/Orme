import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    getImpostazioniIscrizione, 
    saveImpostazioniIscrizione,
    DEFAULT_FORM_BLOCKS,
    SCOUT_QUESTION_TEMPLATES
} from '@/lib/listaAttesa';
import { 
    FormBlock, 
    FormQuestion, 
    FormTitleDesc, 
    FormImage, 
    FormSection, 
    QuestionType, 
    ImpostazioniIscrizione 
} from '@/types';
import { getUser } from '@/lib/data';
import { compressImage, getBase64SizeInKB } from '@/lib/imageCompression';
import {
    ArrowLeft,
    Plus,
    FileDown,
    Type,
    Image as ImageIcon,
    Columns,
    Trash2,
    Copy,
    Check,
    AlertCircle,
    Eye,
    Save,
    ChevronUp,
    ChevronDown,
    X,
    Sparkles,
    CircleDot,
    CheckSquare,
    Calendar,
    Shield,
    UploadCloud,
    FolderPlus
} from 'lucide-react';

export default function PersonalizzaFormIscrizione() {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedSuccess, setSavedSuccess] = useState(false);
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

    // Form settings state
    const [formTitle, setFormTitle] = useState('Modulo richiesta inserimento negli scout');
    const [welcomeTitle, setWelcomeTitle] = useState('🎉 Benvenuti nel grande gioco dello scoutismo! 🌲⛺');
    const [descriptionText, setDescriptionText] = useState(
        'Ciao! Siamo felici che tu stia pensando di far vivere a tuo/a figlio/a l’avventura più bella di tutte: quella scout! 🐾\n\nCompilando questo modulo ci aiuterai a raccogliere le informazioni necessarie per organizzare al meglio le iscrizioni e per conoscerci un po’ prima di iniziare il cammino insieme.\n\nLo scoutismo è un mondo fatto di amicizia, natura, sorrisi e crescita personale — e non vediamo l’ora di accogliervi nella nostra grande famiglia! 💚✨'
    );
    const [footerText, setFooterText] = useState('Pronti a partire?\n👉 Compila il modulo e... Buona Caccia! 🦊');
    const [bannerUrl, setBannerUrl] = useState('/scout_banner.png');
    const [successTitle, setSuccessTitle] = useState('Iscrizione Ricevuta!');
    const [successMessage, setSuccessMessage] = useState('Grazie per aver espresso la volontà di iscrivere {nomeRagazzo} {cognomeRagazzo} nel gruppo {groupName}.');
    const [disclaimerText, setDisclaimerText] = useState('Inviando questo modulo, acconsenti al trattamento dei dati personali forniti al fine di gestire l\'inserimento del minore nella lista d\'attesa del gruppo scout indicato, in conformità con le policy di privacy vigenti.');
    
    // Dynamic Blocks state
    const [blocks, setBlocks] = useState<FormBlock[]>([]);

    // Modals
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedTemplateQuestions, setSelectedTemplateQuestions] = useState<Record<string, boolean>>({});
    const [compressingImage, setCompressingImage] = useState(false);

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Load initial data
    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const user = await getUser();
                setCurrentUser(user);

                if (user?.groupId) {
                    const settings = await getImpostazioniIscrizione(user.groupId);
                    if (settings) {
                        setFormTitle(settings.formTitle || 'Modulo richiesta inserimento negli scout');
                        setWelcomeTitle(settings.welcomeTitle || '🎉 Benvenuti nel grande gioco dello scoutismo! 🌲⛺');
                        setDescriptionText(settings.descriptionText || '');
                        setFooterText(settings.footerText || '');
                        setBannerUrl(settings.bannerUrl || '/scout_banner.png');
                        setSuccessTitle(settings.successTitle || 'Iscrizione Ricevuta!');
                        setSuccessMessage(settings.successMessage || 'Grazie per aver espresso la volontà di iscrivere {nomeRagazzo} {cognomeRagazzo} nel gruppo {groupName}.');
                        setDisclaimerText(settings.disclaimerText || '');

                        if (settings.formSchema && settings.formSchema.length > 0) {
                            setBlocks(settings.formSchema);
                        } else {
                            // Inizializza con i blocchi standard scout
                            setBlocks(DEFAULT_FORM_BLOCKS);
                        }
                    } else {
                        setBlocks(DEFAULT_FORM_BLOCKS);
                    }
                }
            } catch (err) {
                console.error("Errore nel caricamento dell'editor modulo:", err);
                showToast("Errore nel caricamento delle impostazioni", "error");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    // ─── Image Upload with Auto-Compression ─────────────────────────
    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setCompressingImage(true);
        try {
            const compressed = await compressImage(file, 1400, 600, 0.82);
            setBannerUrl(compressed);
            const sizeKB = getBase64SizeInKB(compressed);
            showToast(`Copertina ottimizzata automaticamente (${sizeKB} KB)!`);
        } catch (err) {
            console.error("Errore compressione banner:", err);
            showToast("Errore durante l'ottimizzazione dell'immagine", "error");
        } finally {
            setCompressingImage(false);
            e.target.value = '';
        }
    };

    const handleBlockImageUpload = async (blockId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setCompressingImage(true);
        try {
            const compressed = await compressImage(file, 1000, 800, 0.8);
            const sizeKB = getBase64SizeInKB(compressed);

            setBlocks(prev => prev.map(b => {
                if (b.id !== blockId) return b;
                if (b.type === 'image') {
                    return { ...b, imageUrl: compressed };
                }
                if (b.type === 'question') {
                    return { ...b, imageUrl: compressed };
                }
                return b;
            }));

            showToast(`Immagine compressa con successo (${sizeKB} KB)!`);
        } catch (err) {
            console.error("Errore compressione immagine:", err);
            showToast("Errore durante l'ottimizzazione dell'immagine", "error");
        } finally {
            setCompressingImage(false);
            e.target.value = '';
        }
    };

    // ─── Save Form ───────────────────────────────────────────────────
    const handleSave = async () => {
        if (!currentUser?.groupId) {
            showToast("Gruppo scout non trovato", "error");
            return;
        }

        setSaving(true);
        try {
            const payload: Omit<ImpostazioniIscrizione, 'groupId' | 'createdAt'> = {
                formTitle,
                welcomeTitle,
                descriptionText,
                footerText,
                bannerUrl,
                successTitle,
                successMessage,
                disclaimerText,
                formSchema: blocks
            };

            const result = await saveImpostazioniIscrizione(payload);
            if (result) {
                setSavedSuccess(true);
                showToast("Modulo salvato con successo!");
                setTimeout(() => setSavedSuccess(false), 3000);
            } else {
                showToast("Errore durante il salvataggio", "error");
            }
        } catch (err) {
            console.error("Errore salvataggio:", err);
            showToast("Errore durante il salvataggio", "error");
        } finally {
            setSaving(false);
        }
    };

    // ─── Block Actions (Add, Delete, Duplicate, Move) ─────────────────
    const addQuestion = () => {
        const newQ: FormQuestion = {
            id: `q-${Date.now()}`,
            type: 'question',
            questionType: 'multiple_choice',
            title: 'Domanda senza titolo',
            required: false,
            options: ['Opzione 1']
        };

        if (activeBlockId) {
            const index = blocks.findIndex(b => b.id === activeBlockId);
            const updated = [...blocks];
            updated.splice(index + 1, 0, newQ);
            setBlocks(updated);
        } else {
            setBlocks(prev => [...prev, newQ]);
        }
        setActiveBlockId(newQ.id);
    };

    const addTitleDesc = () => {
        const newBlock: FormTitleDesc = {
            id: `td-${Date.now()}`,
            type: 'title_desc',
            title: 'Titolo senza nome',
            description: 'Descrizione aggiuntiva...'
        };

        if (activeBlockId) {
            const index = blocks.findIndex(b => b.id === activeBlockId);
            const updated = [...blocks];
            updated.splice(index + 1, 0, newBlock);
            setBlocks(updated);
        } else {
            setBlocks(prev => [...prev, newBlock]);
        }
        setActiveBlockId(newBlock.id);
    };

    const addImageBlock = () => {
        const newBlock: FormImage = {
            id: `img-${Date.now()}`,
            type: 'image',
            imageUrl: '',
            title: 'Immagine'
        };

        if (activeBlockId) {
            const index = blocks.findIndex(b => b.id === activeBlockId);
            const updated = [...blocks];
            updated.splice(index + 1, 0, newBlock);
            setBlocks(updated);
        } else {
            setBlocks(prev => [...prev, newBlock]);
        }
        setActiveBlockId(newBlock.id);
    };

    const addSection = () => {
        const newSection: FormSection = {
            id: `sec-${Date.now()}`,
            type: 'section',
            title: 'Nuova Sezione',
            description: 'Descrizione della sezione (opzionale)'
        };

        if (activeBlockId) {
            const index = blocks.findIndex(b => b.id === activeBlockId);
            const updated = [...blocks];
            updated.splice(index + 1, 0, newSection);
            setBlocks(updated);
        } else {
            setBlocks(prev => [...prev, newSection]);
        }
        setActiveBlockId(newSection.id);
    };

    const duplicateBlock = (id: string) => {
        const block = blocks.find(b => b.id === id);
        if (!block) return;

        const clone: FormBlock = JSON.parse(JSON.stringify(block));
        clone.id = `${block.type}-${Date.now()}`;
        if (clone.type === 'question' && clone.isCoreField) {
            // Un duplicato di un campo base diventa un campo custom
            clone.isCoreField = false;
            clone.coreMapping = undefined;
        }

        const index = blocks.findIndex(b => b.id === id);
        const updated = [...blocks];
        updated.splice(index + 1, 0, clone);
        setBlocks(updated);
        setActiveBlockId(clone.id);
    };

    const deleteBlock = (id: string) => {
        const block = blocks.find(b => b.id === id);
        if (block?.type === 'question' && block.isCoreField) {
            alert('I campi anagrafici base (Nome, Cognome, Nascita, Classe, Telefono Genitore) sono essenziali per la lista d\'attesa di Orme e non possono essere eliminati, ma puoi personalizzarne il titolo o la descrizione.');
            return;
        }
        setBlocks(prev => prev.filter(b => b.id !== id));
        if (activeBlockId === id) setActiveBlockId(null);
    };

    const moveBlock = (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === blocks.length - 1)) {
            return;
        }
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const updated = [...blocks];
        const temp = updated[index];
        updated[index] = updated[targetIndex];
        updated[targetIndex] = temp;
        setBlocks(updated);
    };

    // ─── Question Options Management ─────────────────────────────────
    const addOptionToQuestion = (questionId: string) => {
        setBlocks(prev => prev.map(b => {
            if (b.id !== questionId || b.type !== 'question') return b;
            const currentOpts = b.options || [];
            return {
                ...b,
                options: [...currentOpts, `Opzione ${currentOpts.length + 1}`]
            };
        }));
    };

    const updateOptionText = (questionId: string, optIndex: number, text: string) => {
        setBlocks(prev => prev.map(b => {
            if (b.id !== questionId || b.type !== 'question') return b;
            const currentOpts = [...(b.options || [])];
            currentOpts[optIndex] = text;
            return { ...b, options: currentOpts };
        }));
    };

    const removeOptionFromQuestion = (questionId: string, optIndex: number) => {
        setBlocks(prev => prev.map(b => {
            if (b.id !== questionId || b.type !== 'question') return b;
            const currentOpts = (b.options || []).filter((_, idx) => idx !== optIndex);
            return { ...b, options: currentOpts };
        }));
    };

    const toggleOtherOption = (questionId: string) => {
        setBlocks(prev => prev.map(b => {
            if (b.id !== questionId || b.type !== 'question') return b;
            return { ...b, hasOtherOption: !b.hasOtherOption };
        }));
    };

    const updateQuestion = (questionId: string, updates: Partial<FormQuestion>) => {
        setBlocks(prev => prev.map(b => (b.id === questionId && b.type === 'question' ? { ...b, ...updates } : b) as FormBlock));
    };

    const updateSection = (id: string, updates: Partial<FormSection>) => {
        setBlocks(prev => prev.map(b => (b.id === id && b.type === 'section' ? { ...b, ...updates } : b) as FormBlock));
    };

    const updateTitleDesc = (id: string, updates: Partial<FormTitleDesc>) => {
        setBlocks(prev => prev.map(b => (b.id === id && b.type === 'title_desc' ? { ...b, ...updates } : b) as FormBlock));
    };

    const updateImageBlockData = (id: string, updates: Partial<FormImage>) => {
        setBlocks(prev => prev.map(b => (b.id === id && b.type === 'image' ? { ...b, ...updates } : b) as FormBlock));
    };

    // ─── Import Template Questions ───────────────────────────────────
    const handleConfirmImport = () => {
        const questionsToAdd: FormQuestion[] = [];
        SCOUT_QUESTION_TEMPLATES.forEach(cat => {
            cat.questions.forEach(q => {
                if (selectedTemplateQuestions[q.id]) {
                    questionsToAdd.push({
                        ...q,
                        id: `imported-${q.id}-${Date.now()}`
                    });
                }
            });
        });

        if (questionsToAdd.length === 0) {
            showToast("Nessuna domanda selezionata", "error");
            return;
        }

        setBlocks(prev => [...prev, ...questionsToAdd]);
        setShowImportModal(false);
        setSelectedTemplateQuestions({});
        showToast(`Importate con successo ${questionsToAdd.length} domande!`);
    };

    const publicUrl = currentUser?.groupId ? `${window.location.origin}/iscrizione/${currentUser.groupId}` : '';

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 text-gray-500">
                Caricamento editor modulo...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-950 pb-24 text-gray-900 dark:text-gray-100">
            {/* Toast feedback */}
            {toast && (
                <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-5 py-3.5 rounded-2xl shadow-xl border animate-in slide-in-from-top duration-300 ${
                    toast.type === 'success' 
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200' 
                        : 'bg-red-50 dark:bg-red-950/70 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-200'
                }`}>
                    {toast.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="text-xs font-bold">{toast.message}</span>
                </div>
            )}

            {/* Top Bar / App Header */}
            <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 md:px-8 py-3.5 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/lista-attesa')}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl transition-colors cursor-pointer"
                        title="Torna alla Lista d'Attesa"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-scout-green tracking-wider uppercase">
                                Modulo d'Iscrizione
                            </span>
                            {savedSuccess && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                                    <Check className="w-3.5 h-3.5" /> Salvato
                                </span>
                            )}
                        </div>
                        <h1 className="text-base md:text-lg font-extrabold tracking-tight truncate max-w-xs md:max-w-md">
                            {formTitle || 'Modulo senza titolo'}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {publicUrl && (
                        <a
                            href={publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-750 flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                            <Eye className="w-4 h-4 text-gray-500" />
                            <span className="hidden sm:inline">Anteprima</span>
                        </a>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-scout-green hover:bg-scout-green-dark text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        <span>{saving ? 'Salvataggio...' : 'Salva Modulo'}</span>
                    </button>
                </div>
            </header>

            {/* Main Form Canvas */}
            <main className="max-w-3xl mx-auto px-3 sm:px-6 pt-6 space-y-4 relative">
                
                {/* ─── Header & Cover Card ─────────────────────────────────── */}
                <div 
                    onClick={() => setActiveBlockId('header')}
                    className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm border transition-all overflow-hidden ${
                        activeBlockId === 'header' 
                            ? 'border-scout-green ring-2 ring-scout-green/20' 
                            : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                >
                    {/* Top Accent Strip */}
                    <div className="h-3 bg-scout-green w-full" />

                    {/* Banner Image Preview / Upload */}
                    <div className="relative group bg-gray-50 dark:bg-gray-950 border-b border-gray-150 dark:border-gray-800">
                        {bannerUrl ? (
                            <div className="relative h-44 sm:h-56 w-full overflow-hidden flex items-center justify-center bg-gray-100 dark:bg-gray-850">
                                <img 
                                    src={bannerUrl} 
                                    alt="Copertina Modulo" 
                                    className="w-full h-full object-cover" 
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <label className="px-3.5 py-2 bg-white text-gray-900 rounded-xl text-xs font-bold shadow-md cursor-pointer hover:bg-gray-100 flex items-center gap-1.5 transition-all">
                                        <UploadCloud className="w-4 h-4 text-scout-green" />
                                        Cambia Immagine
                                        <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                                    </label>
                                    <button 
                                        type="button"
                                        onClick={() => setBannerUrl('')}
                                        className="p-2 bg-red-600 text-white rounded-xl shadow-md hover:bg-red-700 cursor-pointer transition-all"
                                        title="Rimuovi copertina"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center p-8 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors">
                                <UploadCloud className="w-8 h-8 text-gray-400 mb-1.5" />
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                    Carica Immagine di Copertina / Banner
                                </span>
                                <span className="text-[11px] text-gray-400">
                                    Compressione e ottimizzazione automatica in WebP
                                </span>
                                <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                            </label>
                        )}
                        {compressingImage && (
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center text-white text-xs font-bold gap-2">
                                <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
                                Ottimizzazione immagine in corso...
                            </div>
                        )}
                    </div>

                    {/* Header Texts */}
                    <div className="p-5 md:p-7 space-y-4">
                        <div>
                            <input
                                type="text"
                                value={formTitle}
                                onChange={(e) => setFormTitle(e.target.value)}
                                placeholder="Titolo del Modulo"
                                className="w-full text-2xl md:text-3xl font-black text-gray-900 dark:text-white bg-transparent border-b border-transparent hover:border-gray-250 dark:hover:border-gray-700 focus:border-scout-green focus:outline-hidden py-1 transition-all"
                            />
                        </div>
                        <div>
                            <input
                                type="text"
                                value={welcomeTitle}
                                onChange={(e) => setWelcomeTitle(e.target.value)}
                                placeholder="Sottotitolo / Benvenuto (es. 🎉 Benvenuti negli scout!)"
                                className="w-full text-sm md:text-base font-bold text-emerald-700 dark:text-emerald-400 bg-transparent border-b border-transparent hover:border-gray-250 dark:hover:border-gray-700 focus:border-scout-green focus:outline-hidden py-1 transition-all"
                            />
                        </div>
                        <div>
                            <textarea
                                value={descriptionText}
                                onChange={(e) => setDescriptionText(e.target.value)}
                                rows={3}
                                placeholder="Descrizione del modulo, istruzioni o saluto ai genitori..."
                                className="w-full text-xs text-gray-600 dark:text-gray-300 bg-transparent border-b border-transparent hover:border-gray-250 dark:hover:border-gray-700 focus:border-scout-green focus:outline-hidden py-1 resize-y transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                                Call to Action finale prima dell'invio
                            </label>
                            <input
                                type="text"
                                value={footerText}
                                onChange={(e) => setFooterText(e.target.value)}
                                placeholder="es. Pronti a partire? 👉 Compila il modulo e... Buona Caccia! 🦊"
                                className="w-full text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-scout-green focus:outline-hidden"
                            />
                        </div>
                    </div>
                </div>

                {/* ─── Blocks Rendering ───────────────────────────────────── */}
                {blocks.map((block, idx) => {
                    const isSelected = activeBlockId === block.id;

                    return (
                        <div
                            key={block.id}
                            onClick={() => setActiveBlockId(block.id)}
                            className={`relative bg-white dark:bg-gray-900 rounded-2xl shadow-sm border transition-all ${
                                isSelected 
                                    ? 'border-l-4 border-l-scout-green border-gray-250 dark:border-gray-700 ring-2 ring-scout-green/10' 
                                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                            }`}
                        >
                            {/* Block Content by Type */}

                            {/* 1. SEZIONE */}
                            {block.type === 'section' && (
                                <div className="p-5 md:p-6 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-250 rounded-full font-black text-[10px] uppercase tracking-wider">
                                            <Columns className="w-3.5 h-3.5" />
                                            Intestazione Sezione
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'up'); }}
                                                disabled={idx === 0}
                                                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"
                                                title="Sposta su"
                                            >
                                                <ChevronUp className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'down'); }}
                                                disabled={idx === blocks.length - 1}
                                                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"
                                                title="Sposta giù"
                                            >
                                                <ChevronDown className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                                                className="p-1 text-gray-400 hover:text-red-500 transition-colors ml-2"
                                                title="Elimina sezione"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                     <div>
                                        <input
                                            type="text"
                                            value={block.title}
                                            onChange={(e) => updateSection(block.id, { title: e.target.value })}
                                            placeholder="Titolo Sezione"
                                            className="w-full text-lg md:text-xl font-black text-gray-900 dark:text-white bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-700 focus:border-scout-green focus:outline-hidden py-1"
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="text"
                                            value={block.description || ''}
                                            onChange={(e) => updateSection(block.id, { description: e.target.value })}
                                            placeholder="Descrizione della sezione (opzionale)..."
                                            className="w-full text-xs text-gray-500 dark:text-gray-400 bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-700 focus:border-scout-green focus:outline-hidden py-1"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 2. TITOLO E DESCRIZIONE */}
                            {block.type === 'title_desc' && (
                                <div className="p-5 md:p-6 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            <Type className="w-3.5 h-3.5 text-indigo-500" />
                                            Titolo e Descrizione
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'up'); }}
                                                disabled={idx === 0}
                                                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"
                                            >
                                                <ChevronUp className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'down'); }}
                                                disabled={idx === blocks.length - 1}
                                                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"
                                            >
                                                <ChevronDown className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }}
                                                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                                title="Duplica"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                                                className="p-1 text-gray-400 hover:text-red-500 ml-1"
                                                title="Elimina"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                     <div>
                                        <input
                                            type="text"
                                            value={block.title}
                                            onChange={(e) => updateTitleDesc(block.id, { title: e.target.value })}
                                            placeholder="Titolo"
                                            className="w-full text-base font-bold text-gray-900 dark:text-white bg-transparent border-b border-transparent hover:border-gray-250 dark:hover:border-gray-700 focus:border-scout-green focus:outline-hidden py-1"
                                        />
                                    </div>
                                    <div>
                                        <textarea
                                            value={block.description}
                                            onChange={(e) => updateTitleDesc(block.id, { description: e.target.value })}
                                            rows={2}
                                            placeholder="Descrizione..."
                                            className="w-full text-xs text-gray-600 dark:text-gray-300 bg-transparent border-b border-transparent hover:border-gray-250 dark:hover:border-gray-700 focus:border-scout-green focus:outline-hidden py-1 resize-y"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 3. IMMAGINE */}
                            {block.type === 'image' && (
                                <div className="p-5 md:p-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                                            Blocco Immagine
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'up'); }}
                                                disabled={idx === 0}
                                                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"
                                            >
                                                <ChevronUp className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'down'); }}
                                                disabled={idx === blocks.length - 1}
                                                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"
                                            >
                                                <ChevronDown className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                                                className="p-1 text-gray-400 hover:text-red-500 ml-1"
                                                title="Elimina"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <input
                                            type="text"
                                            value={block.title || ''}
                                            onChange={(e) => updateImageBlockData(block.id, { title: e.target.value })}
                                            placeholder="Didascalia / Titolo dell'immagine (opzionale)"
                                            className="w-full text-sm font-semibold text-gray-800 dark:text-gray-200 bg-transparent border-b border-transparent hover:border-gray-250 dark:hover:border-gray-700 focus:border-scout-green focus:outline-hidden py-1"
                                        />
                                    </div>

                                    {block.imageUrl ? (
                                        <div className="relative group max-w-lg mx-auto rounded-xl overflow-hidden border border-gray-250 dark:border-gray-800">
                                            <img src={block.imageUrl} alt={block.title || ''} className="w-full max-h-80 object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <label className="px-3 py-1.5 bg-white text-gray-900 rounded-lg text-xs font-bold cursor-pointer">
                                                    Sostituisci
                                                    <input type="file" accept="image/*" onChange={(e) => handleBlockImageUpload(block.id, e)} className="hidden" />
                                                </label>
                                            </div>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-250 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Carica Immagine</span>
                                            <span className="text-[10px] text-gray-400">Compressione automatica abilitata</span>
                                            <input type="file" accept="image/*" onChange={(e) => handleBlockImageUpload(block.id, e)} className="hidden" />
                                        </label>
                                    )}
                                </div>
                            )}

                            {/* 4. DOMANDA (QUESTION) */}
                            {block.type === 'question' && (
                                <div className="p-5 md:p-6 space-y-4">
                                    {/* Top Row: Title + Type selector */}
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                        <div className="flex-1 w-full">
                                            <div className="flex items-center gap-2">
                                                 <input
                                                    type="text"
                                                    value={block.title}
                                                    onChange={(e) => updateQuestion(block.id, { title: e.target.value })}
                                                    placeholder="Domanda senza titolo"
                                                    className="w-full text-sm md:text-base font-bold text-gray-900 dark:text-white bg-transparent border-b border-transparent hover:border-gray-250 dark:hover:border-gray-700 focus:border-scout-green focus:outline-hidden py-1"
                                                />
                                                {block.isCoreField && (
                                                    <span className="shrink-0 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold rounded-md border border-emerald-200 dark:border-emerald-800/50">
                                                        Campo Base
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Type Dropdown */}
                                        <div className="w-full sm:w-auto shrink-0">
                                            <select
                                                value={block.questionType}
                                                disabled={block.isCoreField && (block.coreMapping === 'dataNascita' || block.coreMapping === 'classe')}
                                                onChange={(e) => {
                                                    const newType = e.target.value as QuestionType;
                                                    setBlocks(prev => prev.map(b => {
                                                        if (b.id !== block.id || b.type !== 'question') return b;
                                                        let newOpts = b.options;
                                                        if (['multiple_choice', 'checkboxes', 'dropdown'].includes(newType) && (!newOpts || newOpts.length === 0)) {
                                                            newOpts = ['Opzione 1'];
                                                        }
                                                        return { ...b, questionType: newType, options: newOpts };
                                                    }));
                                                }}
                                                className="w-full sm:w-48 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-250 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 focus:outline-hidden focus:ring-2 focus:ring-scout-green cursor-pointer"
                                            >
                                                <option value="short_text">Risposta breve</option>
                                                <option value="paragraph">Paragrafo</option>
                                                <option value="multiple_choice">Scelta multipla</option>
                                                <option value="checkboxes">Caselle di controllo</option>
                                                <option value="dropdown">Menu a discesa</option>
                                                <option value="date">Data</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Subtitle / Description input */}
                                    <div>
                                        <input
                                            type="text"
                                            value={block.description || ''}
                                            onChange={(e) => updateQuestion(block.id, { description: e.target.value })}
                                            placeholder="Descrizione o istruzioni aggiuntive (opzionale)..."
                                            className="w-full text-xs text-gray-500 dark:text-gray-400 bg-transparent border-b border-transparent hover:border-gray-250 dark:hover:border-gray-700 focus:border-scout-green focus:outline-hidden py-0.5"
                                        />
                                    </div>

                                    {/* Question Image Attachment (if any) */}
                                    {block.imageUrl && (
                                        <div className="relative group max-w-sm rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                                            <img src={block.imageUrl} alt="Immagine domanda" className="w-full max-h-48 object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => updateQuestion(block.id, { imageUrl: undefined })}
                                                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-lg transition-colors"
                                                title="Rimuovi immagine"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}

                                    {/* Options rendering for multiple_choice, checkboxes, dropdown */}
                                    {['multiple_choice', 'checkboxes', 'dropdown'].includes(block.questionType) && (
                                        <div className="space-y-2 pt-2">
                                            {(block.options || []).map((opt, optIdx) => (
                                                <div key={optIdx} className="flex items-center gap-2 group">
                                                    {block.questionType === 'multiple_choice' && (
                                                        <CircleDot className="w-4 h-4 text-gray-400 shrink-0" />
                                                    )}
                                                    {block.questionType === 'checkboxes' && (
                                                        <CheckSquare className="w-4 h-4 text-gray-400 shrink-0" />
                                                    )}
                                                    {block.questionType === 'dropdown' && (
                                                        <span className="text-xs text-gray-400 font-bold w-4 shrink-0">
                                                            {optIdx + 1}.
                                                        </span>
                                                    )}
                                                    <input
                                                        type="text"
                                                        value={opt}
                                                        onChange={(e) => updateOptionText(block.id, optIdx, e.target.value)}
                                                        className="flex-1 px-2.5 py-1 text-xs text-gray-800 dark:text-gray-200 bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-scout-green focus:outline-hidden"
                                                    />
                                                    {(block.options || []).length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeOptionFromQuestion(block.id, optIdx)}
                                                            className="p-1 text-gray-400 hover:text-red-500 opacity-60 group-hover:opacity-100 transition-opacity"
                                                            title="Elimina opzione"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}

                                            {/* "Altro" option preview if enabled */}
                                            {block.hasOtherOption && (
                                                <div className="flex items-center gap-2 text-xs text-gray-400 pl-6 pt-1">
                                                    <span>Opzione "Altro..." (campo di testo libero)</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleOtherOption(block.id)}
                                                        className="p-1 hover:text-red-500"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}

                                            {/* Add option buttons */}
                                            <div className="flex items-center gap-3 pt-2 text-xs font-semibold">
                                                <button
                                                    type="button"
                                                    onClick={() => addOptionToQuestion(block.id)}
                                                    className="text-scout-green hover:underline flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    Aggiungi opzione
                                                </button>
                                                {!block.hasOtherOption && block.questionType !== 'dropdown' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleOtherOption(block.id)}
                                                        className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer"
                                                    >
                                                        oppure aggiungi "Altro"
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Preview inputs for text/date types */}
                                    {block.questionType === 'short_text' && (
                                        <div className="pt-1">
                                            <input
                                                type="text"
                                                disabled
                                                placeholder="Testo risposta breve (compilato dal genitore)"
                                                className="w-full max-w-sm px-3 py-2 bg-gray-50 dark:bg-gray-800/40 border-b border-gray-300 dark:border-gray-700 text-xs text-gray-400 italic rounded-md"
                                            />
                                        </div>
                                    )}
                                    {block.questionType === 'paragraph' && (
                                        <div className="pt-1">
                                            <textarea
                                                disabled
                                                rows={2}
                                                placeholder="Testo risposta lunga (paragrafo compilato dal genitore)"
                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/40 border-b border-gray-300 dark:border-gray-700 text-xs text-gray-400 italic rounded-md resize-none"
                                            />
                                        </div>
                                    )}
                                    {block.questionType === 'date' && (
                                        <div className="pt-1">
                                            <div className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/40 border-b border-gray-300 dark:border-gray-700 text-xs text-gray-400 rounded-md">
                                                <Calendar className="w-4 h-4" />
                                                <span>gg / mm / aaaa</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Card Footer Bar */}
                                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 text-gray-400">
                                        {/* Attach image to question button */}
                                        <label className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg cursor-pointer transition-colors" title="Aggiungi immagine a questa domanda">
                                            <ImageIcon className="w-4 h-4" />
                                            <input type="file" accept="image/*" onChange={(e) => handleBlockImageUpload(block.id, e)} className="hidden" />
                                        </label>

                                        {/* Duplicate */}
                                        <button
                                            type="button"
                                            onClick={() => duplicateBlock(block.id)}
                                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg cursor-pointer transition-colors"
                                            title="Duplica domanda"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>

                                        {/* Delete */}
                                        <button
                                            type="button"
                                            onClick={() => deleteBlock(block.id)}
                                            disabled={block.isCoreField}
                                            className={`p-1.5 rounded-lg transition-colors ${
                                                block.isCoreField 
                                                    ? 'opacity-30 cursor-not-allowed' 
                                                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-500 cursor-pointer'
                                            }`}
                                            title={block.isCoreField ? "Campo base indispensabile per Orme" : "Elimina domanda"}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>

                                        <div className="h-5 w-px bg-gray-200 dark:border-gray-700" />

                                        {/* Required Switch Toggle */}
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                                Obbligatorio
                                            </span>
                                            <input
                                                type="checkbox"
                                                checked={block.required}
                                                disabled={block.isCoreField && block.coreMapping !== 'note'}
                                                onChange={(e) => updateQuestion(block.id, { required: e.target.checked })}
                                                className="w-4 h-4 accent-scout-green rounded cursor-pointer"
                                            />
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* ─── Success Screen & Privacy Footer Card ─────────────────── */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 md:p-8 space-y-5">
                    <div className="flex items-center gap-2 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        <Shield className="w-4 h-4 text-emerald-600" />
                        Messaggio di Conferma & Privacy (GDPR)
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                                Titolo Schermata di Successo
                            </label>
                            <input
                                type="text"
                                value={successTitle}
                                onChange={(e) => setSuccessTitle(e.target.value)}
                                placeholder="es. Iscrizione Ricevuta!"
                                className="w-full text-xs font-semibold px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-scout-green focus:outline-hidden"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                                Testo di Ringraziamento Genitore
                            </label>
                            <textarea
                                value={successMessage}
                                onChange={(e) => setSuccessMessage(e.target.value)}
                                rows={2}
                                placeholder="Grazie per aver compilato il modulo..."
                                className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-scout-green focus:outline-hidden resize-none"
                            />
                            <span className="text-[10px] text-gray-400">
                                Segnaposto supportati: {'{nomeRagazzo}'}, {'{cognomeRagazzo}'}, {'{groupName}'}
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                            Informativa Trattamento Dati Personali (Privacy / GDPR)
                        </label>
                        <textarea
                            value={disclaimerText}
                            onChange={(e) => setDisclaimerText(e.target.value)}
                            rows={2}
                            placeholder="Testo di consenso privacy mostrato a fondo pagina..."
                            className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-scout-green focus:outline-hidden resize-none"
                        />
                    </div>
                </div>

                {/* Bottom Quick Save Action Button */}
                <div className="text-center pt-4">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-3 bg-scout-green hover:bg-scout-green-dark text-white rounded-2xl text-xs font-bold inline-flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        <span>{saving ? 'Salvataggio delle modifiche...' : 'Salva Tutte le Modifiche del Modulo'}</span>
                    </button>
                </div>
            </main>

            {/* ─── Google Forms Floating Right Toolbar ──────────────────────── */}
            <aside className="fixed bottom-6 right-6 md:bottom-auto md:top-1/3 md:right-8 z-30 flex md:flex-col items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl p-2 rounded-2xl md:rounded-2xl animate-in zoom-in-95 duration-200">
                <button
                    type="button"
                    onClick={addQuestion}
                    className="p-2.5 text-gray-600 hover:text-white hover:bg-scout-green dark:text-gray-300 dark:hover:text-white rounded-xl transition-all cursor-pointer group relative"
                    title="Aggiungi domanda"
                >
                    <Plus className="w-5 h-5" />
                    <span className="hidden md:group-hover:block absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap">
                        Aggiungi domanda
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setShowImportModal(true)}
                    className="p-2.5 text-gray-600 hover:text-white hover:bg-emerald-600 dark:text-gray-300 dark:hover:text-white rounded-xl transition-all cursor-pointer group relative"
                    title="Importa domande scout"
                >
                    <FileDown className="w-5 h-5" />
                    <span className="hidden md:group-hover:block absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap">
                        Importa domande
                    </span>
                </button>

                <button
                    type="button"
                    onClick={addTitleDesc}
                    className="p-2.5 text-gray-600 hover:text-white hover:bg-indigo-600 dark:text-gray-300 dark:hover:text-white rounded-xl transition-all cursor-pointer group relative"
                    title="Aggiungi titolo e descrizione"
                >
                    <Type className="w-5 h-5" />
                    <span className="hidden md:group-hover:block absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap">
                        Aggiungi titolo e descrizione
                    </span>
                </button>

                <button
                    type="button"
                    onClick={addImageBlock}
                    className="p-2.5 text-gray-600 hover:text-white hover:bg-amber-600 dark:text-gray-300 dark:hover:text-white rounded-xl transition-all cursor-pointer group relative"
                    title="Aggiungi immagine"
                >
                    <ImageIcon className="w-5 h-5" />
                    <span className="hidden md:group-hover:block absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap">
                        Aggiungi immagine
                    </span>
                </button>

                <button
                    type="button"
                    onClick={addSection}
                    className="p-2.5 text-gray-600 hover:text-white hover:bg-teal-600 dark:text-gray-300 dark:hover:text-white rounded-xl transition-all cursor-pointer group relative"
                    title="Aggiungi sezione"
                >
                    <Columns className="w-5 h-5" />
                    <span className="hidden md:group-hover:block absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap">
                        Aggiungi sezione
                    </span>
                </button>
            </aside>

            {/* ─── Import Scout Questions Modal ─────────────────────────────── */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowImportModal(false)} />
                    <div className="bg-white dark:bg-gray-900 w-full max-w-xl rounded-3xl p-6 md:p-8 z-10 border border-gray-200 dark:border-gray-800 shadow-2xl relative space-y-6 animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
                            <h3 className="font-black text-base text-gray-900 dark:text-white flex items-center gap-2">
                                <FolderPlus className="w-5 h-5 text-scout-green" />
                                Importa Domande Scout Predefinite
                            </h3>
                            <button onClick={() => setShowImportModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Seleziona una o più domande frequenti utilizzate dai gruppi scout per aggiungerle direttamente al tuo modulo:
                        </p>

                        <div className="space-y-5">
                            {SCOUT_QUESTION_TEMPLATES.map((cat, cIdx) => (
                                <div key={cIdx} className="space-y-2.5">
                                    <h4 className="text-xs font-black text-scout-green uppercase tracking-wider">
                                        {cat.category}
                                    </h4>
                                    <div className="space-y-2">
                                        {cat.questions.map((q) => {
                                            const isChecked = !!selectedTemplateQuestions[q.id];
                                            return (
                                                <label 
                                                    key={q.id}
                                                    className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                                                        isChecked 
                                                            ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-scout-green text-gray-900 dark:text-white' 
                                                            : 'bg-gray-50/50 dark:bg-gray-850 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            const ch = e.target.checked;
                                                            setSelectedTemplateQuestions(prev => ({
                                                                ...prev,
                                                                [q.id]: ch
                                                            }));
                                                        }}
                                                        className="mt-0.5 w-4 h-4 accent-scout-green rounded cursor-pointer"
                                                    />
                                                    <div className="space-y-0.5">
                                                        <span className="font-bold block">{q.title}</span>
                                                        <span className="text-[10px] text-gray-400">
                                                            Tipo: {q.questionType === 'multiple_choice' ? 'Scelta multipla' : q.questionType === 'checkboxes' ? 'Caselle di controllo' : 'Testo'}
                                                            {q.options ? ` (${q.options.length} opzioni)` : ''}
                                                        </span>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowImportModal(false)}
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmImport}
                                className="px-5 py-2 bg-scout-green hover:bg-scout-green-dark text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                            >
                                <Check className="w-4 h-4" />
                                Importa Domande Selezionate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
