import { useState, useMemo } from 'react';
import { X, Download, Share2, Check, Calendar, Filter } from 'lucide-react';
import { EventoCalendario, BRANCA_COLORS } from '@/lib/calendario';
import { generateIcs, shareOrDownloadIcsFile, downloadIcsFile } from '@/lib/ical';

interface ExportCalendarModalProps {
    eventi: EventoCalendario[];
    currentYear: number;
    onClose: () => void;
}

type PeriodFilter = 'all' | 'future' | 'year';

const BRANCHE_OPTIONS = ['Tutte', 'CoCa', 'L/C', 'E/G', 'R/S', 'Gruppo', 'Altro'];

export default function ExportCalendarModal({ eventi, currentYear, onClose }: ExportCalendarModalProps) {
    const todayStr = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    const [selectedBranca, setSelectedBranca] = useState<string>('Tutte');
    const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
    const [includeNotes, setIncludeNotes] = useState(true);
    const [includeLocation, setIncludeLocation] = useState(true);
    const [includeBranchPrefix, setIncludeBranchPrefix] = useState(true);
    const [customCalName, setCustomCalName] = useState(`Calendario CoCa ${currentYear}`);
    const [isSharing, setIsSharing] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    // Supporto per condivisione nativa (mobile)
    const canShareFiles = typeof navigator !== 'undefined' && !!navigator.share;

    // Filtra gli eventi in base alle selezioni
    const filteredEventi = useMemo(() => {
        return eventi.filter(e => {
            // Filtro branca
            if (selectedBranca !== 'Tutte' && e.branca !== selectedBranca) {
                return false;
            }

            // Filtro periodo
            if (periodFilter === 'future') {
                const end = e.dataFine || e.dataInizio;
                if (end < todayStr) return false;
            } else if (periodFilter === 'year') {
                const y = e.dataInizio ? parseInt(e.dataInizio.split('-')[0], 10) : 0;
                if (y !== currentYear) return false;
            }

            return true;
        });
    }, [eventi, selectedBranca, periodFilter, currentYear, todayStr]);

    const handleDownload = () => {
        const ics = generateIcs(filteredEventi, {
            calendarName: customCalName.trim() || 'Calendario CoCa',
            includeNotes,
            includeLocation,
            includeBranchPrefix,
        });

        const safeFilename = (customCalName.trim() || 'Calendario_CoCa')
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .toLowerCase();

        downloadIcsFile(ics, `${safeFilename}.ics`);
        setStatusMessage('File .ics scaricato con successo!');
        setTimeout(() => setStatusMessage(null), 3000);
    };

    const handleShare = async () => {
        setIsSharing(true);
        try {
            const ics = generateIcs(filteredEventi, {
                calendarName: customCalName.trim() || 'Calendario CoCa',
                includeNotes,
                includeLocation,
                includeBranchPrefix,
            });

            const safeFilename = (customCalName.trim() || 'Calendario_CoCa')
                .replace(/[^a-zA-Z0-9_-]/g, '_')
                .toLowerCase();

            const res = await shareOrDownloadIcsFile(
                ics,
                `${safeFilename}.ics`,
                customCalName.trim() || 'Calendario CoCa'
            );

            if (res === 'shared') {
                setStatusMessage('Calendario condiviso con successo!');
            } else {
                setStatusMessage('File scaricato!');
            }
            setTimeout(() => setStatusMessage(null), 3000);
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 w-full sm:rounded-2xl sm:max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto rounded-t-2xl shadow-xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-scout-green/10 text-scout-green flex items-center justify-center">
                            <Calendar size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Esporta Calendario (.ics)</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Aggiungi gli eventi a Google Calendar, Apple Calendar o inviali alla CoCa
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400">
                        <X size={20} />
                    </button>
                </div>

                {statusMessage && (
                    <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 rounded-xl text-green-700 dark:text-green-300 text-xs font-bold flex items-center gap-2">
                        <Check size={16} />
                        {statusMessage}
                    </div>
                )}

                {/* Filtro Branca */}
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1.5">
                        <Filter size={13} />
                        Filtra per Branca
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                        {BRANCHE_OPTIONS.map(b => {
                            const isSelected = selectedBranca === b;
                            const color = b === 'Tutte' ? '#4CAF50' : BRANCA_COLORS[b] || '#4CAF50';
                            return (
                                <button
                                    key={b}
                                    type="button"
                                    onClick={() => setSelectedBranca(b)}
                                    className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all border ${
                                        isSelected
                                            ? 'bg-scout-green text-white border-scout-green shadow-sm scale-105'
                                            : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    {b !== 'Tutte' && (
                                        <span
                                            className="inline-block w-2 h-2 rounded-full mr-1.5"
                                            style={{ background: isSelected ? 'white' : color }}
                                        />
                                    )}
                                    {b}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Filtro Periodo */}
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                        Periodo temporale
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { id: 'all', label: 'Tutti gli eventi' },
                            { id: 'future', label: 'Solo futuri' },
                            { id: 'year', label: `Anno ${currentYear}` },
                        ].map(p => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => setPeriodFilter(p.id as PeriodFilter)}
                                className={`text-xs py-2 px-2 rounded-xl font-bold border transition-colors ${
                                    periodFilter === p.id
                                        ? 'bg-scout-green/10 border-scout-green text-scout-green dark:bg-scout-green/20'
                                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Nome Calendario */}
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                        Nome del Calendario
                    </label>
                    <input
                        type="text"
                        value={customCalName}
                        onChange={e => setCustomCalName(e.target.value)}
                        placeholder="Nome visualizzato..."
                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm outline-none focus:ring-2 focus:ring-scout-green"
                    />
                </div>

                {/* Opzioni avanzate */}
                <div className="p-3 bg-gray-50 dark:bg-gray-750/50 rounded-xl space-y-2 border border-gray-150 dark:border-gray-700">
                    <label className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={includeBranchPrefix}
                            onChange={e => setIncludeBranchPrefix(e.target.checked)}
                            className="w-4 h-4 rounded text-scout-green focus:ring-scout-green rounded-md"
                        />
                        <span>Includi sigla branca nel titolo (es. <em>[CoCa] Riunione</em>)</span>
                    </label>
                    <label className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={includeLocation}
                            onChange={e => setIncludeLocation(e.target.checked)}
                            className="w-4 h-4 rounded text-scout-green focus:ring-scout-green rounded-md"
                        />
                        <span>Includi il luogo dell'attività</span>
                    </label>
                    <label className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={includeNotes}
                            onChange={e => setIncludeNotes(e.target.checked)}
                            className="w-4 h-4 rounded text-scout-green focus:ring-scout-green rounded-md"
                        />
                        <span>Includi note e dettagli</span>
                    </label>
                </div>

                {/* Riepilogo conteggio */}
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 bg-scout-green/5 dark:bg-scout-green/10 p-3 rounded-xl border border-scout-green/20">
                    <span>Eventi pronti per l'esportazione:</span>
                    <span className="font-extrabold text-sm text-scout-green">
                        {filteredEventi.length} {filteredEventi.length === 1 ? 'evento' : 'eventi'}
                    </span>
                </div>

                {/* Azioni */}
                <div className="flex gap-2.5 pt-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="py-2.5 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                    >
                        Chiudi
                    </button>

                    {canShareFiles && (
                        <button
                            type="button"
                            disabled={filteredEventi.length === 0 || isSharing}
                            onClick={handleShare}
                            className="flex-1 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2 text-sm shadow-sm"
                            title="Condividi su WhatsApp o aggiungi al calendario"
                        >
                            <Share2 size={16} />
                            {isSharing ? 'Condivido...' : 'Condividi (.ics)'}
                        </button>
                    )}

                    <button
                        type="button"
                        disabled={filteredEventi.length === 0}
                        onClick={handleDownload}
                        className="flex-1 py-2.5 bg-scout-green text-white font-bold rounded-xl hover:bg-scout-green-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-2 text-sm shadow-sm"
                    >
                        <Download size={16} />
                        Scarica .ics
                    </button>
                </div>
            </div>
        </div>
    );
}
