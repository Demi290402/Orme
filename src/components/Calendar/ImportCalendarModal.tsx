import { useState, useRef, useMemo } from 'react';
import { X, Upload, Calendar, AlertCircle, CheckCircle2, CheckSquare, Square, RefreshCw } from 'lucide-react';
import { EventoCalendario, getColorByBranca, saveEventiBatch } from '@/lib/calendario';
import { parseIcs, ParsedIcsEvent } from '@/lib/ical';
import { addPointsWithStats } from '@/lib/gamification';

interface ImportCalendarModalProps {
    existingEventi: EventoCalendario[];
    onImportSuccess: (importedCount: number) => void;
    onClose: () => void;
}

const BRANCHE = ['CoCa', 'L/C', 'E/G', 'R/S', 'Gruppo', 'Altro'];

export default function ImportCalendarModal({
    existingEventi,
    onImportSuccess,
    onClose,
}: ImportCalendarModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
    const [fileName, setFileName] = useState('');
    const [parsedEvents, setParsedEvents] = useState<ParsedIcsEvent[]>([]);
    const [defaultBranch, setDefaultBranch] = useState<string>('CoCa');
    const [filterDuplicates, setFilterDuplicates] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Processa il file .ics
    const handleFileProcess = (file: File) => {
        setErrorMsg(null);
        if (!file.name.toLowerCase().endsWith('.ics')) {
            setErrorMsg('Il file selezionato non ha estensione .ics. Seleziona un file iCalendar valido.');
            return;
        }

        const reader = new FileReader();
        reader.onload = e => {
            try {
                const text = e.target?.result as string;
                const events = parseIcs(text);

                if (events.length === 0) {
                    setErrorMsg('Nessun evento valido trovato nel file .ics specificato.');
                    return;
                }

                // Identifica i duplicati rispetto agli eventi già a database
                const existingKeySet = new Set(
                    existingEventi.map(ev => `${ev.titolo.toLowerCase().trim()}_${ev.dataInizio}`)
                );

                const enriched = events.map(ev => {
                    const key = `${ev.titolo.toLowerCase().trim()}_${ev.dataInizio}`;
                    const isDup = existingKeySet.has(key);
                    return {
                        ...ev,
                        isDuplicate: isDup,
                        selected: !isDup, // deselezionato per impostazione predefinita se duplicato
                    };
                });

                setFileName(file.name);
                setParsedEvents(enriched);
                setStep('preview');
            } catch (err: any) {
                console.error('Errore parsing ics:', err);
                setErrorMsg(err.message || 'Errore nella lettura del file .ics. Verifica che il formato sia corretto.');
            }
        };

        reader.onerror = () => {
            setErrorMsg('Errore nella lettura del file dal disco.');
        };

        reader.readAsText(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileProcess(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileProcess(file);
    };

    // Toggle selezione singolo evento
    const toggleSelect = (index: number) => {
        setParsedEvents(prev =>
            prev.map((ev, i) => (i === index ? { ...ev, selected: !ev.selected } : ev))
        );
    };

    // Modifica branca per singolo evento
    const handleBrancaChange = (index: number, newBranca: string) => {
        setParsedEvents(prev =>
            prev.map((ev, i) =>
                i === index
                    ? { ...ev, branca: newBranca, colore: getColorByBranca(newBranca) }
                    : ev
            )
        );
    };

    // Modifica titolo per singolo evento
    const handleTitleChange = (index: number, newTitle: string) => {
        setParsedEvents(prev =>
            prev.map((ev, i) => (i === index ? { ...ev, titolo: newTitle } : ev))
        );
    };

    // Selezione / Deselezione di massa
    const selectedCount = useMemo(() => parsedEvents.filter(e => e.selected).length, [parsedEvents]);
    const allSelected = parsedEvents.length > 0 && selectedCount === parsedEvents.length;

    const toggleSelectAll = () => {
        const target = !allSelected;
        setParsedEvents(prev => prev.map(e => ({ ...e, selected: target })));
    };

    // Applica una branca predefinita a tutti gli eventi selezionati
    const applyDefaultBranchToAll = () => {
        setParsedEvents(prev =>
            prev.map(ev =>
                ev.selected
                    ? { ...ev, branca: defaultBranch, colore: getColorByBranca(defaultBranch) }
                    : ev
            )
        );
    };

    // Esegue l'importazione definitiva a database
    const handleConfirmImport = async () => {
        const toImport = parsedEvents.filter(e => e.selected);
        if (toImport.length === 0) return;

        setIsSubmitting(true);
        setStep('importing');

        try {
            const mappedForSave: Partial<EventoCalendario>[] = toImport.map(item => ({
                titolo: item.titolo.trim(),
                dataInizio: item.dataInizio,
                dataFine: item.dataFine || undefined,
                oraInizio: item.oraInizio || undefined,
                oraFine: item.oraFine || undefined,
                luogo: item.luogo || '',
                note: item.note || '',
                branca: item.branca || 'CoCa',
                colore: item.colore || getColorByBranca(item.branca || 'CoCa'),
                sorgente: 'import_ics',
            }));

            const saved = await saveEventiBatch(mappedForSave);

            // Assegna punti gamification
            addPointsWithStats(Math.min(20, toImport.length * 2), {
                eventiAggiunti: toImport.length,
            }).catch(console.error);

            onImportSuccess(saved.length);
        } catch (err: any) {
            console.error('Errore durante il salvataggio eventi:', err);
            setErrorMsg('Errore durante il salvataggio a database: ' + (err.message || 'Riprova.'));
            setStep('preview');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 w-full sm:rounded-2xl sm:max-w-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto rounded-t-2xl shadow-xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-scout-green/10 text-scout-green flex items-center justify-center">
                            <Upload size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                Importa Calendario (.ics)
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Carica un file iCalendar da Google, Apple o CoCa ed importa gli eventi
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400">
                        <X size={20} />
                    </button>
                </div>

                {errorMsg && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                        <AlertCircle size={16} className="flex-shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Step 1: Upload */}
                {step === 'upload' && (
                    <div className="space-y-4">
                        <div
                            onDragOver={e => e.preventDefault()}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-scout-green dark:hover:border-scout-green rounded-2xl p-8 text-center cursor-pointer transition-colors bg-gray-50/50 dark:bg-gray-750/30"
                        >
                            <Calendar size={44} className="mx-auto text-scout-green opacity-80 mb-3" />
                            <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100 mb-1">
                                Trascina qui il file .ics oppure clicca per selezionarlo
                            </h3>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                Supporta qualsiasi file iCalendar (.ics) generato da Google Calendar, Apple Calendar, Outlook o Orme
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".ics,text/calendar"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>

                        <div className="p-4 bg-scout-green/5 dark:bg-scout-green/10 border border-scout-green/20 rounded-xl space-y-2">
                            <h4 className="text-xs font-bold text-scout-green uppercase flex items-center gap-1.5">
                                <CheckCircle2 size={14} />
                                Come funziona l'importazione automatica:
                            </h4>
                            <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1 pl-4 list-disc">
                                <li>
                                    <strong>Riconoscimento automatico branca:</strong> analizza titoli e descrizioni (es. <em>"lupetti"</em> &rarr; L/C, <em>"reparto"</em> &rarr; E/G, <em>"clan"</em> &rarr; R/S, <em>"comunità capi"</em> &rarr; CoCa).
                                </li>
                                <li>
                                    <strong>Rilevamento duplicati:</strong> segnala automaticamente gli eventi che sono già presenti nel calendario per evitare doppioni.
                                </li>
                                <li>
                                    <strong>Anteprima e modifica:</strong> puoi deselezionare eventi o cambiare la branca prima di confermare.
                                </li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* Step 2: Preview & Adjust */}
                {step === 'preview' && (
                    <div className="space-y-4">
                        {/* Barra rapida impostazioni e filtri */}
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 dark:bg-gray-750 p-3 rounded-xl border border-gray-150 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={toggleSelectAll}
                                    className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-scout-green"
                                >
                                    {allSelected ? (
                                        <CheckSquare size={16} className="text-scout-green" />
                                    ) : (
                                        <Square size={16} />
                                    )}
                                    {allSelected ? 'Deseleziona tutti' : 'Seleziona tutti'}
                                </button>
                                <span className="text-xs text-gray-400">|</span>
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                    File: <strong className="font-semibold">{fileName}</strong> ({parsedEvents.length} trovati)
                                </span>
                                <span className="text-xs text-gray-400">|</span>
                                <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={filterDuplicates}
                                        onChange={e => {
                                            const val = e.target.checked;
                                            setFilterDuplicates(val);
                                            if (val) {
                                                setParsedEvents(prev => prev.map(item => item.isDuplicate ? { ...item, selected: false } : item));
                                            }
                                        }}
                                        className="w-3.5 h-3.5 rounded text-scout-green focus:ring-scout-green cursor-pointer"
                                    />
                                    <span>Escludi duplicati</span>
                                </label>
                            </div>

                            <div className="flex items-center gap-2">
                                <label className="text-[11px] font-bold text-gray-500 uppercase">Applica Branca:</label>
                                <select
                                    value={defaultBranch}
                                    onChange={e => setDefaultBranch(e.target.value)}
                                    className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-xs dark:bg-gray-700 dark:text-white"
                                >
                                    {BRANCHE.map(b => (
                                        <option key={b} value={b}>{b}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={applyDefaultBranchToAll}
                                    className="text-xs bg-gray-200 dark:bg-gray-600 px-2.5 py-1.5 rounded-lg font-bold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                                >
                                    Applica a selezionati
                                </button>
                            </div>
                        </div>

                        {/* Lista eventi */}
                        <div className="max-h-72 overflow-y-auto space-y-2 border border-gray-150 dark:border-gray-700 rounded-xl p-2 bg-gray-50/40 dark:bg-gray-800">
                            {parsedEvents.map((ev, index) => (
                                <div
                                    key={index}
                                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                                        ev.selected
                                            ? 'bg-white dark:bg-gray-750 border-gray-200 dark:border-gray-650 shadow-sm'
                                            : 'bg-gray-50/80 dark:bg-gray-800/80 border-gray-150 dark:border-gray-750 opacity-60'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={!!ev.selected}
                                        onChange={() => toggleSelect(index)}
                                        className="mt-1 w-4 h-4 rounded text-scout-green focus:ring-scout-green rounded-md cursor-pointer"
                                    />

                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <input
                                                type="text"
                                                value={ev.titolo}
                                                onChange={e => handleTitleChange(index, e.target.value)}
                                                className="font-bold text-xs text-gray-900 dark:text-white bg-transparent border-b border-transparent hover:border-gray-300 focus:border-scout-green outline-none w-full"
                                            />
                                            {ev.isDuplicate && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 flex-shrink-0">
                                                    Possibile duplicato
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                                            <span>
                                                📅 <strong>{ev.dataInizio}</strong>
                                                {ev.dataFine && ev.dataFine !== ev.dataInizio ? ` → ${ev.dataFine}` : ''}
                                            </span>
                                            {(ev.oraInizio || ev.oraFine) && (
                                                <span>
                                                    ⏰ {ev.oraInizio || '00:00'}{ev.oraFine ? ` - ${ev.oraFine}` : ''}
                                                </span>
                                            )}
                                            {ev.luogo && <span>📍 {ev.luogo}</span>}
                                        </div>
                                    </div>

                                    {/* Selettore Branca */}
                                    <select
                                        value={ev.branca}
                                        onChange={e => handleBrancaChange(index, e.target.value)}
                                        className="text-[11px] font-bold p-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white"
                                        style={{ color: ev.colore }}
                                    >
                                        {BRANCHE.map(b => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>

                        {/* Riepilogo e Azioni */}
                        <div className="flex items-center justify-between pt-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                Pronti per l'importazione: <strong className="text-scout-green font-bold">{selectedCount}</strong> di {parsedEvents.length} eventi
                            </span>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setStep('upload')}
                                    className="py-2.5 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs"
                                >
                                    Carica un altro file
                                </button>
                                <button
                                    type="button"
                                    disabled={selectedCount === 0 || isSubmitting}
                                    onClick={handleConfirmImport}
                                    className="py-2.5 px-5 bg-scout-green text-white font-bold rounded-xl hover:bg-scout-green-dark transition-colors disabled:opacity-40 flex items-center gap-2 text-xs shadow-sm"
                                >
                                    <Upload size={14} />
                                    Importa {selectedCount} {selectedCount === 1 ? 'evento' : 'eventi'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Importing loader */}
                {step === 'importing' && (
                    <div className="py-12 text-center space-y-4">
                        <RefreshCw size={36} className="mx-auto text-scout-green animate-spin" />
                        <div>
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                Importazione in corso...
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Salvataggio degli eventi nel calendario di gruppo su Supabase
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
