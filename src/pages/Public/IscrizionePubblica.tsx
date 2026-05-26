import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { addIscrittoPubblico } from '@/lib/listaAttesa';
import { Compass, User, Award, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

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

export default function IscrizionePubblica() {
    const { groupId } = useParams<{ groupId: string }>();
    const [groupName, setGroupName] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string>('');

    // Form states
    const [nomeGenitore, setNomeGenitore] = useState('');
    const [telefonoGenitore, setTelefonoGenitore] = useState('');
    const [nomeRagazzo, setNomeRagazzo] = useState('');
    const [cognomeRagazzo, setCognomeRagazzo] = useState('');
    const [dataNascita, setDataNascita] = useState('');
    const [classe, setClasse] = useState('');
    const [note, setNote] = useState('');

    useEffect(() => {
        async function fetchGroupName() {
            if (!groupId) {
                setErrorMsg('Codice gruppo non specificato.');
                setLoading(false);
                return;
            }
            try {
                // Cerchiamo il nome del gruppo dalla tabella users o altre tabelle
                // Visto che groupName è registrato negli utenti di quel gruppo, possiamo provare a trovarlo
                const { data, error } = await supabase
                    .from('users')
                    .select('group_name')
                    .eq('group_id', groupId)
                    .limit(1);

                if (error) throw error;

                if (data && data.length > 0 && data[0].group_name) {
                    setGroupName(data[0].group_name);
                } else {
                    setGroupName(`Gruppo Scout (Codice: ${groupId})`);
                }
            } catch (err) {
                console.error('Errore nel caricamento del nome gruppo:', err);
                setGroupName(`Gruppo Scout (Codice: ${groupId})`);
            } finally {
                setLoading(false);
            }
        }

        fetchGroupName();
    }, [groupId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!groupId) return;

        if (!nomeGenitore || !telefonoGenitore || !nomeRagazzo || !cognomeRagazzo || !dataNascita || !classe) {
            setErrorMsg('Per favore, compila tutti i campi obbligatori.');
            return;
        }

        setSubmitting(true);
        setErrorMsg('');

        const successSubmit = await addIscrittoPubblico(groupId, {
            nomeGenitore,
            telefonoGenitore,
            nomeRagazzo,
            cognomeRagazzo,
            dataNascita,
            classe,
            dataIscrizione: new Date().toISOString().split('T')[0],
            note
        });

        if (successSubmit) {
            setSuccess(true);
        } else {
            setErrorMsg('Si è verificato un errore durante l\'invio. Riprova più tardi.');
        }
        setSubmitting(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-emerald-50 dark:bg-gray-900 flex items-center justify-center p-4">
                <div className="text-center space-y-4">
                    <div className="relative w-16 h-16 mx-auto">
                        <Compass className="w-16 h-16 text-emerald-600 animate-spin" />
                    </div>
                    <p className="text-emerald-800 dark:text-emerald-200 font-medium">Caricamento portale d'iscrizione...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-amber-50/30 dark:from-gray-900 dark:to-gray-950 text-gray-900 dark:text-gray-100 flex flex-col justify-between">
            {/* Header / Vetrina */}
            <div className="w-full bg-emerald-700 dark:bg-emerald-900 text-white py-12 px-4 shadow-md text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                <div className="max-w-xl mx-auto space-y-3 relative z-10">
                    <Compass className="w-12 h-12 mx-auto text-amber-400 drop-shadow-md" />
                    <h1 className="text-3xl font-extrabold tracking-tight">Iscrizioni & Lista d'Attesa</h1>
                    <p className="text-emerald-100 font-medium text-lg">{groupName}</p>
                    <div className="inline-flex items-center gap-1.5 bg-emerald-600/50 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/30">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        Lascia qui i dati per iscrivere tuo figlio/a
                    </div>
                </div>
            </div>

            {/* Main Form Box */}
            <div className="flex-1 max-w-xl w-full mx-auto p-4 md:py-8">
                {success ? (
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-emerald-100 dark:border-gray-700 text-center space-y-6 animate-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                            <CheckCircle className="w-12 h-12" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-extrabold text-emerald-800 dark:text-emerald-250">Iscrizione Ricevuta!</h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">
                                Grazie per l'interesse verso il nostro gruppo scout! I dati di <strong>{nomeRagazzo} {cognomeRagazzo}</strong> sono stati inseriti correttamente nella nostra lista d'attesa.
                            </p>
                        </div>
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/30 text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
                            I capi del gruppo esamineranno la richiesta in base alla disponibilità dei posti per l'anno scout di riferimento. Sarai ricontattato telefonicamente o via email non appena si libererà un posto.
                        </div>
                        <div className="pt-2">
                            <p className="text-[11px] text-gray-400 dark:text-gray-500">
                                Powered by <span className="font-semibold text-emerald-600 dark:text-emerald-400">Orme</span> — Il sentiero dei capi scout
                            </p>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 shadow-xl border border-gray-150 dark:border-gray-750 space-y-6">
                        {errorMsg && (
                            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 p-4 rounded-2xl flex items-start gap-2.5 text-xs">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                <User className="w-4 h-4 text-emerald-600" />
                                1. Riferimento Genitore / Tutore
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Nome e Cognome Genitore *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="es. Mario Rossi"
                                        value={nomeGenitore}
                                        onChange={(e) => setNomeGenitore(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Numero di Telefono *</label>
                                    <input
                                        type="tel"
                                        required
                                        placeholder="es. 3331234567"
                                        value={telefonoGenitore}
                                        onChange={(e) => setTelefonoGenitore(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <hr className="border-gray-100 dark:border-gray-700/50" />

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Award className="w-4 h-4 text-emerald-600" />
                                2. Dati del Bambino / Ragazzo
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Nome Figlio/a *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Nome del ragazzo/a"
                                        value={nomeRagazzo}
                                        onChange={(e) => setNomeRagazzo(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Cognome Figlio/a *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Cognome del ragazzo/a"
                                        value={cognomeRagazzo}
                                        onChange={(e) => setCognomeRagazzo(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Data di Nascita *</label>
                                    <input
                                        type="date"
                                        required
                                        value={dataNascita}
                                        onChange={(e) => setDataNascita(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Classe (scolastica frequentata) *</label>
                                    <select
                                        required
                                        value={classe}
                                        onChange={(e) => setClasse(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
                                    >
                                        <option value="">Seleziona classe...</option>
                                        {CLASSI.map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <hr className="border-gray-100 dark:border-gray-700/50" />

                        <div className="space-y-4">
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">Note o Informazioni Aggiuntive (Opzionale)</label>
                            <textarea
                                placeholder="Segnala qui eventuali fratelli già in gruppo, preferenze di contatto o altre note utili..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all resize-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            {submitting ? 'Invio in corso...' : 'Invia Iscrizione'}
                        </button>
                    </form>
                )}
            </div>

            {/* Footer */}
            <footer className="w-full text-center py-6 text-[10px] text-gray-400 dark:text-gray-600 max-w-xl mx-auto px-4">
                Inviando questo modulo, acconsenti al trattamento dei dati personali forniti al fine di gestire l'inserimento del minore nella lista d'attesa del gruppo scout indicato, in conformità con le policy di privacy vigenti.
            </footer>
        </div>
    );
}
