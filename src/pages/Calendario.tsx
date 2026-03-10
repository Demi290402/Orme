import { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, Calendar, CalendarDays, CalendarRange, X, Pencil, Trash2, Save, MapPin, Clock } from 'lucide-react';
import { getEventi, saveEvento, deleteEvento, EventoCalendario, getColorByBranca, BRANCA_COLORS } from '@/lib/calendario';
import { cn } from '@/lib/utils';

type ViewMode = 'anno' | 'mese' | 'giorno';

const MESI_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const GIORNI_IT = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
const BRANCHE = ['CoCa','L/C','E/G','R/S','Gruppo', 'Altro'];
const COLORI_PRESET = ['#4CAF50','#0288D1','#e97a00','#9c27b0','#e53935','#00897B','#F57F17','#FDD835'];

function getContrastColor(hex: string) {
    if (!hex || hex.length < 6) return 'white';
    const color = hex.replace('#', '');
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 180 ? '#1f2937' : 'white'; // text-gray-800 for light bgs
}

function dateYMD(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function parseDate(s: string) {
    const [y,m,d] = s.split('-').map(Number);
    return new Date(y, m-1, d);
}

// ─── Event Form Modal ───────────────────────────────────────────────────────
interface EventFormProps {
    initial?: Partial<EventoCalendario>;
    onSave: (e: Partial<EventoCalendario>) => Promise<void>;
    onCancel: () => void;
    onDelete?: () => Promise<void>;
}
function EventForm({ initial, onSave, onCancel, onDelete }: EventFormProps) {
    const [form, setForm] = useState<Partial<EventoCalendario>>({
        titolo: '', dataInizio: dateYMD(new Date()), branca: 'CoCa', colore: BRANCA_COLORS['CoCa'], sorgente: 'manuale',
        ...initial,
    });
    const [saving, setSaving] = useState(false);
    const set = (k: string, v: any) => {
        setForm(f => {
            const next = { ...f, [k]: v };
            // Auto update color if branca changes
            if (k === 'branca') {
                next.colore = getColorByBranca(v);
            }
            return next;
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onCancel}>
            <div className="bg-white dark:bg-gray-800 w-full sm:rounded-2xl sm:max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto rounded-t-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{initial?.id ? 'Modifica Evento' : 'Nuovo Evento'}</h2>
                    <button onClick={onCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X size={20} /></button>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Titolo*</label>
                        <input className="w-full mt-1 p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm outline-none focus:ring-2 focus:ring-scout-green"
                            value={form.titolo || ''} onChange={e => set('titolo', e.target.value)} placeholder="Nome evento..." />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Data inizio*</label>
                            <input type="date" className="w-full mt-1 p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm outline-none focus:ring-2 focus:ring-scout-green"
                                value={form.dataInizio || ''} onChange={e => set('dataInizio', e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Data fine</label>
                            <input type="date" className="w-full mt-1 p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm outline-none focus:ring-2 focus:ring-scout-green"
                                value={form.dataFine || ''} onChange={e => set('dataFine', e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Ora inizio</label>
                            <input type="time" className="w-full mt-1 p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm outline-none focus:ring-2 focus:ring-scout-green"
                                value={form.oraInizio || ''} onChange={e => set('oraInizio', e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Ora fine</label>
                            <input type="time" className="w-full mt-1 p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm outline-none focus:ring-2 focus:ring-scout-green"
                                value={form.oraFine || ''} onChange={e => set('oraFine', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Luogo</label>
                        <input className="w-full mt-1 p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm outline-none focus:ring-2 focus:ring-scout-green"
                            value={form.luogo || ''} onChange={e => set('luogo', e.target.value)} placeholder="Sede, campo, ..." />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Branca</label>
                            <select className="w-full mt-1 p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm outline-none focus:ring-2 focus:ring-scout-green"
                                value={form.branca || 'CoCa'} onChange={e => set('branca', e.target.value)}>
                                {BRANCHE.map(b => <option key={b}>{b}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Colore</label>
                            <div className="flex gap-1.5 mt-1 flex-wrap">
                                {COLORI_PRESET.map(c => (
                                    <button key={c} type="button" onClick={() => set('colore', c)}
                                        className={cn("w-7 h-7 rounded-full border-2 transition-transform", form.colore === c ? 'border-gray-700 scale-110' : 'border-transparent')}
                                        style={{ background: c }} />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Note</label>
                        <textarea className="w-full mt-1 p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm outline-none focus:ring-2 focus:ring-scout-green min-h-[60px]"
                            value={form.note || ''} onChange={e => set('note', e.target.value)} placeholder="Note aggiuntive..." />
                    </div>
                </div>

                <div className="flex gap-2 pt-2">
                    {onDelete && (
                        <button onClick={async () => { if(confirm('Eliminare questo evento?')) await onDelete(); }}
                            className="p-2.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                            <Trash2 size={18} />
                        </button>
                    )}
                    <button onClick={onCancel} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        Annulla
                    </button>
                    <button
                        disabled={!form.titolo || !form.dataInizio || saving}
                        onClick={async () => { setSaving(true); await onSave(form); setSaving(false); }}
                        className="flex-1 py-2.5 bg-scout-green text-white font-bold rounded-xl hover:bg-scout-green-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                        <Save size={16} />{saving ? 'Salvo...' : 'Salva'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Event Pill ─────────────────────────────────────────────────────────────
function EventPill({ evento, onClick }: { evento: EventoCalendario; onClick: () => void }) {
    return (
        <div onClick={e => { e.stopPropagation(); onClick(); }}
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-md truncate cursor-pointer hover:opacity-90 transition-opacity"
            style={{ background: evento.colore, color: getContrastColor(evento.colore) }}
            title={evento.titolo}
        >
            {evento.oraInizio ? `${evento.oraInizio.slice(0,5)} ` : ''}{evento.titolo}
        </div>
    );
}

// ─── Main Calendar Page ─────────────────────────────────────────────────────
export default function Calendario() {
    const today = new Date();
    const [viewMode, setViewMode] = useState<ViewMode>('mese');
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    const [selectedDay, setSelectedDay] = useState(today);
    const [eventi, setEventi] = useState<EventoCalendario[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingEvento, setEditingEvento] = useState<EventoCalendario | undefined>();
    const [formInitial, setFormInitial] = useState<Partial<EventoCalendario>>({});

    const reload = useCallback(() => {
        setLoading(true);
        getEventi().then(e => { setEventi(e); setLoading(false); });
    }, []);

    useEffect(() => { reload(); }, [reload]);

    const eventiByDay = (dateStr: string) => eventi.filter(e => {
        if (!e.dataFine) return e.dataInizio === dateStr;
        return dateStr >= e.dataInizio && dateStr <= e.dataFine;
    });

    const openAdd = (dateStr?: string) => {
        setEditingEvento(undefined);
        setFormInitial({ dataInizio: dateStr || dateYMD(today) });
        setShowForm(true);
    };
    const openEdit = (e: EventoCalendario) => {
        setEditingEvento(e);
        setFormInitial(e);
        setShowForm(true);
    };
    const handleSave = async (form: Partial<EventoCalendario>) => {
        await saveEvento({ ...form, id: editingEvento?.id });
        setShowForm(false);
        reload();
    };
    const handleDelete = async (id: string) => {
        await deleteEvento(id);
        setShowForm(false);
        reload();
    };

    // ── Annual view ──────────────────────────────────────────────────────────
    const AnnualView = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <button onClick={() => setSelectedYear(y => y - 1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><ChevronLeft size={20} /></button>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedYear}</h2>
                <button onClick={() => setSelectedYear(y => y + 1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><ChevronRight size={20} /></button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {MESI_IT.map((mese, mi) => {
                    const firstDay = new Date(selectedYear, mi, 1);
                    const daysInMonth = new Date(selectedYear, mi + 1, 0).getDate();
                    const eventsDays = new Set(
                        eventi.filter(e => {
                            const d = parseDate(e.dataInizio);
                            return d.getFullYear() === selectedYear && d.getMonth() === mi;
                        }).map(e => parseDate(e.dataInizio).getDate())
                    );
                    const startDow = (firstDay.getDay() + 6) % 7;
                    return (
                        <div key={mi}
                            onClick={() => { setSelectedMonth(mi); setViewMode('mese'); }}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
                        >
                            <div className="text-xs font-black text-scout-green uppercase mb-2">{mese}</div>
                            <div className="grid grid-cols-7 gap-0.5 text-center">
                                {Array.from({ length: startDow }).map((_, i) => <div key={`e${i}`} />)}
                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const day = i + 1;
                                    const isToday = today.getFullYear() === selectedYear && today.getMonth() === mi && today.getDate() === day;
                                    const hasEvent = eventsDays.has(day);
                                    return (
                                        <div key={day} className={cn(
                                            "text-[10px] w-5 h-5 flex items-center justify-center rounded-full mx-auto relative",
                                            isToday && "bg-scout-green text-white font-bold",
                                            !isToday && "text-gray-600 dark:text-gray-300"
                                        )}>
                                            {day}
                                            {hasEvent && !isToday && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-scout-brown" />}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    // ── Monthly view ─────────────────────────────────────────────────────────
    const MonthlyView = () => {
        const firstDay = new Date(selectedYear, selectedMonth, 1);
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const startDow = (firstDay.getDay() + 6) % 7;
        const cells: (number | null)[] = [
            ...Array.from({ length: startDow }, () => null),
            ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
        ];
        while (cells.length % 7 !== 0) cells.push(null);

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <button onClick={() => {
                        if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
                        else setSelectedMonth(m => m - 1);
                    }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><ChevronLeft size={20} /></button>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{MESI_IT[selectedMonth]} {selectedYear}</h2>
                    <button onClick={() => {
                        if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
                        else setSelectedMonth(m => m + 1);
                    }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><ChevronRight size={20} /></button>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700">
                        {GIORNI_IT.map(g => (
                            <div key={g} className="text-center py-2 text-[11px] font-black text-gray-400 uppercase">{g}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7">
                        {cells.map((day, ci) => {
                            if (!day) return <div key={`e${ci}`} className="border-b border-r border-gray-50 dark:border-gray-700/50 h-24" />;
                            const dateStr = `${selectedYear}-${String(selectedMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                            const dayEventi = eventiByDay(dateStr);
                            const isToday = today.getFullYear() === selectedYear && today.getMonth() === selectedMonth && today.getDate() === day;
                            return (
                                <div key={day}
                                    onClick={() => { setSelectedDay(new Date(selectedYear, selectedMonth, day)); setViewMode('giorno'); }}
                                    className={cn(
                                        "border-b border-r border-gray-50 dark:border-gray-700/50 h-24 p-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors",
                                        isToday && "bg-scout-green/5 dark:bg-scout-green/10"
                                    )}
                                >
                                    <div className={cn(
                                        "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1",
                                        isToday ? "bg-scout-green text-white" : "text-gray-700 dark:text-gray-300"
                                    )}>{day}</div>
                                    <div className="space-y-0.5">
                                        {dayEventi.slice(0,3).map(e => <EventPill key={e.id} evento={e} onClick={() => openEdit(e)} />)}
                                        {dayEventi.length > 3 && <div className="text-[9px] text-gray-400 pl-1">+{dayEventi.length - 3} altri</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    // ── Daily view ───────────────────────────────────────────────────────────
    const DailyView = () => {
        const dateStr = dateYMD(selectedDay);
        const dayEventi = eventiByDay(dateStr);
        const dayName = selectedDay.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <button onClick={() => {
                        const prev = new Date(selectedDay);
                        prev.setDate(prev.getDate() - 1);
                        setSelectedDay(prev);
                    }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><ChevronLeft size={20} /></button>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white capitalize">{dayName}</h2>
                    <button onClick={() => {
                        const next = new Date(selectedDay);
                        next.setDate(next.getDate() + 1);
                        setSelectedDay(next);
                    }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><ChevronRight size={20} /></button>
                </div>

                {dayEventi.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                        <CalendarDays size={40} className="mx-auto mb-3 opacity-40" />
                        <p className="font-medium">Nessun evento questo giorno</p>
                        <button onClick={() => openAdd(dateStr)} className="mt-4 text-scout-green font-bold text-sm hover:underline">+ Aggiungi evento</button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {dayEventi.map(e => (
                            <div key={e.id}
                                className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex gap-4 cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => openEdit(e)}
                            >
                                <div className="w-1 rounded-full flex-shrink-0" style={{ background: e.colore }} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="font-bold text-gray-900 dark:text-white">{e.titolo}</h3>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" 
                                            style={{ background: e.colore, color: getContrastColor(e.colore) }}>{e.branca}</span>
                                    </div>
                                    {(e.oraInizio || e.oraFine) && (
                                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            <Clock size={11} />
                                            {e.oraInizio?.slice(0,5)}{e.oraFine ? ` – ${e.oraFine.slice(0,5)}` : ''}
                                        </div>
                                    )}
                                    {e.luogo && (
                                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            <MapPin size={11} />{e.luogo}
                                        </div>
                                    )}
                                    {e.note && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">{e.note}</p>}
                                    {e.sorgente === 'verbale' && <div className="text-[10px] text-blue-400 mt-1 font-bold">📋 Da verbale</div>}
                                </div>
                                <button onClick={ev => { ev.stopPropagation(); openEdit(e); }} className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-300 flex-shrink-0">
                                    <Pencil size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="pb-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Calendar className="text-scout-green" size={26} />
                        Calendario CoCa
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Riunioni, eventi e impegni del gruppo</p>
                </div>
                <button onClick={() => openAdd()}
                    className="bg-scout-green text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-scout-green-dark transition-colors shadow-sm">
                    <Plus size={16} /> Evento
                </button>
            </div>

            {/* View switcher */}
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl mb-6 w-fit">
                {([['anno', CalendarRange, 'Anno'], ['mese', CalendarDays, 'Mese'], ['giorno', Calendar, 'Giorno']] as const).map(([mode, Icon, label]) => (
                    <button key={mode} onClick={() => setViewMode(mode as ViewMode)}
                        className={cn(
                            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                            viewMode === mode ? "bg-white dark:bg-gray-800 text-scout-green shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        )}
                    >
                        <Icon size={14} />{label}
                    </button>
                ))}
            </div>

            {/* Colors Legend */}
            <div className="flex flex-wrap gap-4 mb-6 bg-white dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                {Object.entries(BRANCA_COLORS).map(([branca, color]) => (
                    <div key={branca} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                        <span className="text-[10px] font-black uppercase tracking-tight text-gray-500 dark:text-gray-400">{branca}</span>
                    </div>
                ))}
            </div>

            {loading ? (
                <div className="text-center py-16 text-gray-400">Caricamento...</div>
            ) : (
                <>
                    {viewMode === 'anno' && <AnnualView />}
                    {viewMode === 'mese' && <MonthlyView />}
                    {viewMode === 'giorno' && <DailyView />}
                </>
            )}

            {showForm && (
                <EventForm
                    initial={formInitial}
                    onSave={handleSave}
                    onCancel={() => setShowForm(false)}
                    onDelete={editingEvento ? () => handleDelete(editingEvento.id) : undefined}
                />
            )}
        </div>
    );
}
