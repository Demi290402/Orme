import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ChevronLeft, Brush, Type } from 'lucide-react';
import RichTextEditor from '@/components/RichTextEditor';
import { getImpostazioniVerbali, saveImpostazioniVerbali, ImpostazioniVerbali } from '@/lib/verbali';
import { cn } from '@/lib/utils';

const FONTS = [
    { value: 'serif', label: 'Serif (classico, es. Times)' },
    { value: 'sans-serif', label: 'Sans-serif (moderno, es. Arial)' },
    { value: '"Georgia", serif', label: 'Georgia (elegante)' },
    { value: '"Garamond", serif', label: 'Garamond (tradizionale)' },
    { value: '"Palatino Linotype", serif', label: 'Palatino (formale)' },
    { value: '"Trebuchet MS", sans-serif', label: 'Trebuchet MS (leggibile)' },
    { value: '"Verdana", sans-serif', label: 'Verdana (chiaro a schermo)' },
    { value: 'monospace', label: 'Monospace (macchina da scrivere)' },
];

export default function ImpostazioniVerbale() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<Partial<ImpostazioniVerbali>>({
        intestazioneHtml: '',
        piePaginaHtml: '',
        fontFamily: 'serif',
    });

    useEffect(() => {
        getImpostazioniVerbali().then(res => {
            if (res) setSettings(res);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveImpostazioniVerbali(settings);
            alert('Impostazioni salvate con successo!');
        } catch (error) {
            console.error(error);
            alert('Errore durante il salvataggio');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 font-serif italic text-xl">Caricamento impostazioni...</div>;

    return (
        <div className="space-y-6 pb-20">
            {/* Context Header */}
            <div className="flex items-center justify-between gap-4">
                <button 
                    onClick={() => navigate('/verbali')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                    <ChevronLeft size={24} className="dark:text-white" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-serif font-black text-scout-brown dark:text-scout-brown-light flex items-center gap-2">
                        <Brush className="text-scout-blue dark:text-scout-blue-light" />
                        Personalizzazione Verbale
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={cn(
                            "bg-scout-green text-white px-4 py-2 rounded-xl font-bold shadow-md transition-all flex items-center gap-2",
                            saving ? "opacity-50 cursor-not-allowed" : "hover:bg-scout-green-dark active:scale-95"
                        )}
                    >
                        <Save size={18} />
                        {saving ? 'Salvataggio...' : 'Salva'}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-12">
                {/* Font Selection */}
                <div className="space-y-4">
                    <div>
                        <h2 className="text-lg font-black text-scout-brown dark:text-scout-brown-light uppercase tracking-widest font-serif mb-1 flex items-center gap-2">
                            <Type size={18} />
                            Font del Verbale
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic font-serif">Scegli il carattere tipografico usato nell'anteprima e nel PDF del verbale.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {FONTS.map(f => (
                            <button
                                key={f.value}
                                onClick={() => setSettings(s => ({ ...s, fontFamily: f.value }))}
                                className={cn(
                                    "p-4 rounded-2xl border-2 text-left transition-all",
                                    settings.fontFamily === f.value
                                        ? "border-scout-green bg-green-50 dark:bg-scout-green/10 shadow-inner"
                                        : "border-gray-100 dark:border-gray-700 hover:border-scout-green/40 bg-white dark:bg-gray-900"
                                )}
                            >
                                <span className={cn(
                                    "block text-base mb-1",
                                    settings.fontFamily === f.value ? "text-gray-900 dark:text-scout-green-dark" : "text-gray-600 dark:text-gray-300"
                                )} style={{ fontFamily: f.value }}>
                                    Anteprima testo verbale
                                </span>
                                <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{f.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Header Editor */}
                <div className="space-y-4">
                    <div>
                        <h2 className="text-lg font-black text-scout-blue dark:text-scout-blue-light uppercase tracking-widest font-serif mb-1">Intestazione (Header)</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic font-serif">Questo contenuto apparirà all'inizio della prima pagina del documento esportato (e in anteprima).</p>
                    </div>
                    
                    <RichTextEditor 
                        value={settings.intestazioneHtml || ''} 
                        onChange={(val) => setSettings(s => ({ ...s, intestazioneHtml: val }))} 
                    />
                </div>

                {/* Footer Editor */}
                <div className="space-y-4">
                    <div>
                        <h2 className="text-lg font-black text-scout-brown dark:text-scout-brown-light uppercase tracking-widest font-serif mb-1">Piè di Pagina (Footer)</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic font-serif">Questo contenuto apparirà in fondo all'ultima pagina del documento (e in anteprima).</p>
                    </div>
                    
                    <RichTextEditor 
                        value={settings.piePaginaHtml || ''} 
                        onChange={(val) => setSettings(s => ({ ...s, piePaginaHtml: val }))} 
                    />
                </div>
                
                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-sm text-blue-800 dark:text-blue-300 space-y-2">
                    <h3 className="font-bold border-b border-blue-200 dark:border-blue-800 pb-2 mb-2">💡 Suggerimenti:</h3>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Le immagini inserite (tramite URL) compariranno direttamente nel verbale web e PDF.</li>
                        <li><strong>PDF:</strong> Usa il pulsante "Scarica PDF" dalla pagina di visualizzazione per ottenere il documento perfetto.</li>
                        <li>Centra titoli o utilizza la formattazione avanzata qui sopra per dare un tocco unico ai verbali del tuo gruppo.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
