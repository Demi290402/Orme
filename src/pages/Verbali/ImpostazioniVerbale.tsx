import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ChevronLeft, Brush } from 'lucide-react';
import RichTextEditor from '@/components/RichTextEditor';
import { getImpostazioniVerbali, saveImpostazioniVerbali, ImpostazioniVerbali } from '@/lib/verbali';
import { cn } from '@/lib/utils';

export default function ImpostazioniVerbale() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<Partial<ImpostazioniVerbali>>({
        intestazioneHtml: '',
        piePaginaHtml: ''
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
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-serif font-black text-scout-brown flex items-center gap-2">
                        <Brush className="text-scout-blue" />
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

            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-12">
                <div className="space-y-4">
                    <div>
                        <h2 className="text-lg font-black text-scout-blue uppercase tracking-widest font-serif mb-1">Intestazione (Header)</h2>
                        <p className="text-sm text-gray-500 italic font-serif">Questo contenuto apparirà all'inizio della prima pagina del documento esportato (e in anteprima).</p>
                    </div>
                    
                    <RichTextEditor 
                        value={settings.intestazioneHtml || ''} 
                        onChange={(val) => setSettings(s => ({ ...s, intestazioneHtml: val }))} 
                    />
                </div>

                <div className="space-y-4">
                    <div>
                        <h2 className="text-lg font-black text-scout-brown uppercase tracking-widest font-serif mb-1">Piè di Pagina (Footer)</h2>
                        <p className="text-sm text-gray-500 italic font-serif">Questo contenuto apparirà in fondo all'ultima pagina del documento (e in anteprima).</p>
                    </div>
                    
                    <RichTextEditor 
                        value={settings.piePaginaHtml || ''} 
                        onChange={(val) => setSettings(s => ({ ...s, piePaginaHtml: val }))} 
                    />
                </div>
                
                <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 text-sm text-blue-800 space-y-2">
                    <h3 className="font-bold border-b border-blue-200 pb-2 mb-2">💡 Suggerimenti per l'esportazione:</h3>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Le immagini inserite (tramite URL) compariranno direttamente nel verbale web e PDF.</li>
                        <li><strong>Esportazione in Word:</strong> L'esportazione in DOCX nativo del sistema continuerà ad utilizzare il layout tabellare standard di sistema (senza i colori o le immagini custom di questa pagina), per via delle limitazioni dei formati di testo. Per una resa perfetta 1:1, consigliamo di usare la funzione <strong>Stampa PDF</strong> dalla pagina di Anteprima!</li>
                        <li>Centra titoli o utilizza la formattazione avanzata qui sopra per dare un tocco unico ai verbali del tuo gruppo.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
