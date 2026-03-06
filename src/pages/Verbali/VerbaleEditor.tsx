import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Save, ChevronLeft, Users, FileText, 
    Eye, Download, ArrowUp, ArrowDown,
    Plus, Trash2, Clock, Pencil, Bell, Mail, BellOff,
    CheckCircle2, AlertCircle, Puzzle, FileDown
} from 'lucide-react';
import { getMembriCoCa, saveVerbale, getVerbali, getImpostazioniVerbali } from '@/lib/verbali';
import { Verbale, MembroCoCa } from '@/types';
import { cn } from '@/lib/utils';
import { getUser } from '@/lib/data';
import { exportVerbaleToDocx } from '@/utils/docxExport';
import VerbaleHeader from '@/components/VerbaleHeader';
import RichTextEditor from '@/components/RichTextEditor';

type TabType = 'presenze' | 'odg' | 'sezioni' | 'anteprima';

const BRANCHE = ['COCA', 'L/C', 'E/G', 'R/S', 'Altro'];

const SEZIONI_DISPONIBILI = [
    { id: 'ritorni', label: 'Ritorni', icon: '🗣️', color: 'text-scout-green' },
    { id: 'date_importanti', label: 'Date importanti', icon: '📅', color: 'text-scout-blue' },
    { id: 'posti_azione', label: 'Posti d\'Azione', icon: '🎯', color: 'text-orange-500' },
    { id: 'prossimi_impegni', label: 'Prossimi impegni', icon: '🗓️', color: 'text-scout-purple' },
    { id: 'cassa', label: 'Cassa', icon: '💰', color: 'text-scout-brown' },
    { id: 'varie', label: 'Varie', icon: '💬', color: 'text-gray-500' },
];

export default function VerbaleEditor({ viewMode = false }: { viewMode?: boolean }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('presenze');
    const [_impostazioni, setImpostazioni] = useState<{ intestazioneHtml?: string; piePaginaHtml?: string } | null>(null);
    const [membri, setMembri] = useState<MembroCoCa[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [showNotifyModal, setShowNotifyModal] = useState(false);
    const [lastSavedVerbale, setLastSavedVerbale] = useState<Verbale | null>(null);

    const [verbale, setVerbale] = useState<Partial<Verbale>>({
        numero: 1,
        titolo: 'Riunione di CoCa',
        data: new Date().toISOString().split('T')[0],
        luogo: 'Sede',
        oraInizio: '21:00',
        oraFine: '23:00',
        presenti: [],
        assenti: [],
        ritardi: [],
        usciteAnticipate: [],
        ospiti: [],
        odg: [],
        cassa: [],
        ritorni: [],
        dateImportanti: [],
        postiAzione: [],
        prossimiImpegni: [],
        varie: '',
        sezioniAttive: ['ritorni', 'posti_azione']
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [membriData, userData] = await Promise.all([
                    getMembriCoCa(),
                    getUser()
                ]);
                setMembri(membriData);
                setCurrentUser(userData);

                // Load page settings
                try {
                    const imp = await getImpostazioniVerbali();
                    if (imp) setImpostazioni(imp);
                } catch (_ignored) { /* ok */ }

                if (id) {
                    const allVerbali = await getVerbali();
                    const found = allVerbali.find(v => v.id === id);
                    if (found) setVerbale(found);
                } else {
                    const allVerbali = await getVerbali();
                    const lastNum = allVerbali.length > 0 ? Math.max(...allVerbali.map(v => v.numero)) : 0;
                    setVerbale(prev => ({ ...prev, numero: lastNum + 1 }));
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleReorder = (idx: number, dir: number, type: 'odg' | 'sezioni') => {
        if (type === 'odg') {
            const nextList = [...(verbale.odg || [])];
            if (idx + dir < 0 || idx + dir >= nextList.length) return;
            const temp = nextList[idx]; nextList[idx] = nextList[idx + dir]; nextList[idx + dir] = temp;
            setVerbale(v => ({...v, odg: nextList}));
        } else {
            const nextList = [...(verbale.sezioniAttive || [])];
            if (idx + dir < 0 || idx + dir >= nextList.length) return;
            const temp = nextList[idx]; nextList[idx] = nextList[idx + dir]; nextList[idx + dir] = temp;
            setVerbale(v => ({...v, sezioniAttive: nextList}));
        }
    };

    const handleSave = async (silent = false) => {
        setSaving(true);
        try {
            const saved = await saveVerbale(verbale);
            setVerbale(saved);
            setLastSavedVerbale(saved);
            
            if (!id) {
                navigate(`/verbali/modifica/${saved.id}`, { replace: true });
            }

            if (!silent) {
                setShowNotifyModal(true);
            }
            return saved;
        } catch (err) {
            console.error(err);
            if (!silent) alert('Errore durante il salvataggio');
        } finally {
            setSaving(false);
        }
    };

    const toggleSezione = (sezId: string) => {
        setVerbale(v => {
            const current = v.sezioniAttive || [];
            if (current.includes(sezId)) {
                return { ...v, sezioniAttive: current.filter(id => id !== sezId) };
            } else {
                return { ...v, sezioniAttive: [...current, sezId] };
            }
        });
    };

    if (loading) return <div className="p-8 text-center text-gray-500 font-serif italic text-xl">Preparazione diario...</div>;

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
                    <h1 className="text-xl font-serif font-black text-scout-brown">
                        {id ? `Verbale N. ${verbale.numero}` : 'Apertura Nuovo Verbale'}
                    </h1>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    {viewMode && (
                    <button
                        onClick={() => navigate(`/verbali/modifica/${id}`)}
                        className="bg-scout-brown text-white px-4 py-2.5 rounded-xl font-bold shadow-md transition-all flex items-center gap-2 hover:bg-amber-900 active:scale-95 text-sm"
                    >
                        <Pencil size={16} />
                        Modifica
                    </button>)}
                    {!viewMode && (
                    <button
                        onClick={() => handleSave()}
                        disabled={saving}
                        className={cn(
                            "bg-scout-green text-white px-4 py-2.5 rounded-xl font-bold shadow-md transition-all flex items-center gap-2 text-sm",
                            saving ? "opacity-50 cursor-not-allowed" : "hover:bg-scout-green-dark active:scale-95"
                        )}
                    >
                        <Save size={16} />
                        {saving ? 'Salvataggio...' : 'Salva'}
                    </button>)}
                    {viewMode && (
                    <button
                        onClick={async () => { const saved = await handleSave(true); if (saved) exportVerbaleToDocx(saved, membri, currentUser); }}
                        className="bg-[#45387E] text-white px-4 py-2.5 rounded-xl font-bold shadow-md transition-all flex items-center gap-2 hover:bg-[#352b61] active:scale-95 text-sm"
                    >
                        <Download size={16} />
                        Scarica .docx
                    </button>)}
                    {viewMode && (
                    <button
                        onClick={() => window.print()}
                        className="bg-red-600 text-white px-4 py-2.5 rounded-xl font-bold shadow-md transition-all flex items-center gap-2 hover:bg-red-700 active:scale-95 text-sm"
                    >
                        <FileDown size={16} />
                        Scarica PDF
                    </button>)}
                </div>
            </div>

            {/* Metadata Bar */}
            {!viewMode && (
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-end">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Titolo</label>
                    <input 
                        type="text" 
                        value={verbale.titolo}
                        onChange={e => setVerbale(v => ({ ...v, titolo: e.target.value }))}
                        className="p-2 border border-gray-100 rounded-lg text-sm bg-gray-50/50 focus:bg-white outline-none focus:ring-1 focus:ring-scout-green w-64"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Data</label>
                    <input 
                        type="date" 
                        value={verbale.data}
                        onChange={e => setVerbale(v => ({ ...v, data: e.target.value }))}
                        className="p-2 border border-gray-100 rounded-lg text-sm bg-gray-50/50 focus:bg-white outline-none focus:ring-1 focus:ring-scout-green"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Luogo</label>
                    <input 
                        type="text" 
                        value={verbale.luogo}
                        onChange={e => setVerbale(v => ({ ...v, luogo: e.target.value }))}
                        className="p-2 border border-gray-100 rounded-lg text-sm bg-gray-50/50 focus:bg-white outline-none focus:ring-1 focus:ring-scout-green"
                    />
                </div>
                <div className="flex gap-2">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Inizio</label>
                        <input 
                            type="time" 
                            value={verbale.oraInizio}
                            onChange={e => setVerbale(v => ({ ...v, oraInizio: e.target.value }))}
                            className="p-2 border border-gray-100 rounded-lg text-sm bg-gray-50/50 focus:bg-white outline-none focus:ring-1 focus:ring-scout-green"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Fine</label>
                        <input 
                            type="time" 
                            value={verbale.oraFine}
                            onChange={e => setVerbale(v => ({ ...v, oraFine: e.target.value }))}
                            className="p-2 border border-gray-100 rounded-lg text-sm bg-gray-50/50 focus:bg-white outline-none focus:ring-1 focus:ring-scout-green"
                        />
                    </div>
                </div>
            </div>
            )}

            {/* Navigation Tabs */}
            {!viewMode && (
            <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto scrollbar-hide">
                {(['presenze', 'odg', 'sezioni', 'anteprima'] as TabType[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm transition-all whitespace-nowrap",
                            activeTab === tab 
                                ? "bg-scout-green text-white shadow-md ring-1 ring-green-100" 
                                : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                        )}
                    >
                        {tab === 'presenze' && <Users size={16} />}
                        {tab === 'odg' && <FileText size={16} />}
                        {tab === 'sezioni' && <Puzzle size={16} />}
                        {tab === 'anteprima' && <Eye size={16} />}
                        <span className="capitalize">{tab === 'odg' ? 'O.D.G.' : tab}</span>
                    </button>
                ))}
            </div>
            )}

            {/* Tab content */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
                {(!viewMode && activeTab === 'presenze') && (
                    <div className="p-6 space-y-8">
                        {BRANCHE.map(branca => {
                            const membriBranca = membri.filter(m => m.branca === branca);
                            if (membriBranca.length === 0) return null;
                            
                            return (
                                <section key={branca} className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                        <h3 className="font-serif font-black text-scout-brown opacity-60 uppercase text-xs tracking-widest">{branca}</h3>
                                        <div className="flex gap-2 text-[10px] font-bold">
                                            <span className="text-scout-green">P: {membriBranca.filter(m => verbale.presenti?.includes(m.id)).length}</span>
                                            <span className="text-red-400">A: {membriBranca.filter(m => verbale.assenti?.includes(m.id)).length}</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {membriBranca.map(m => {
                                            const isPresent = verbale.presenti?.includes(m.id);
                                            const isAbsent = verbale.assenti?.includes(m.id);
                                            const isLate = verbale.ritardi?.includes(m.id);
                                            const exitTime = verbale.usciteAnticipate?.find(u => u.membroId === m.id)?.ora;

                                            return (
                                                <div key={m.id} className={cn(
                                                    "p-3 rounded-2xl border transition-all",
                                                    isPresent ? "bg-green-50/30 border-green-100 shadow-sm" : 
                                                    isAbsent ? "bg-red-50/30 border-red-100" : "bg-gray-50/30 border-gray-100"
                                                )}>
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <p className="font-serif font-black text-sm text-gray-800">{m.nome}</p>
                                                            <p className="text-[10px] text-gray-400 italic line-clamp-1">{m.ruoli.join(', ')}</p>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <button 
                                                                onClick={() => setVerbale(v => ({
                                                                    ...v,
                                                                    presenti: isPresent ? v.presenti?.filter(id => id !== m.id) : [...(v.presenti || []), m.id],
                                                                    assenti: v.assenti?.filter(id => id !== m.id)
                                                                }))}
                                                                title="Presente"
                                                                className={cn(
                                                                    "w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs transition-all",
                                                                    isPresent ? "bg-scout-green text-white" : "bg-white border border-gray-200 text-gray-300"
                                                                )}
                                                            >P</button>
                                                            <button 
                                                                onClick={() => setVerbale(v => ({
                                                                    ...v,
                                                                    assenti: isAbsent ? v.assenti?.filter(id => id !== m.id) : [...(v.assenti || []), m.id],
                                                                    presenti: v.presenti?.filter(id => id !== m.id)
                                                                }))}
                                                                title="Assente"
                                                                className={cn(
                                                                    "w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs transition-all",
                                                                    isAbsent ? "bg-red-400 text-white" : "bg-white border border-gray-200 text-gray-300"
                                                                )}
                                                            >A</button>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 items-center">
                                                        <button 
                                                            onClick={() => setVerbale(v => ({
                                                                ...v,
                                                                ritardi: isLate ? v.ritardi?.filter(id => id !== m.id) : [...(v.ritardi || []), m.id],
                                                                presenti: isPresent ? v.presenti : [...(v.presenti || []), m.id],
                                                                assenti: v.assenti?.filter(id => id !== m.id)
                                                            }))}
                                                            className={cn(
                                                                "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-all border",
                                                                isLate ? "bg-orange-100 border-orange-200 text-orange-600" : "bg-white border-gray-100 text-gray-400"
                                                            )}
                                                        >
                                                            <Clock size={12} />
                                                            Ritardo
                                                        </button>
                                                        <div className="flex-1 relative group">
                                                            <input 
                                                                type="time" 
                                                                value={exitTime || ''}
                                                                onChange={e => {
                                                                    const time = e.target.value;
                                                                    setVerbale(v => {
                                                                        const others = (v.usciteAnticipate || []).filter(u => u.membroId !== m.id);
                                                                        return {
                                                                            ...v,
                                                                            usciteAnticipate: time ? [...others, { membroId: m.id, ora: time }] : others
                                                                        };
                                                                    });
                                                                }}
                                                                className={cn(
                                                                    "w-full bg-white border rounded-lg text-[10px] px-2 py-1 outline-none",
                                                                    exitTime ? "border-scout-blue text-scout-blue font-bold" : "border-gray-100 text-gray-400"
                                                                )}
                                                            />
                                                            <span className="absolute -top-3 left-1 text-[8px] bg-white px-1 text-gray-300 italic opacity-0 group-focus-within:opacity-100 font-bold uppercase">Uscita</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })}

                        {/* Ospiti */}
                        <section className="pt-8 border-t border-gray-100">
                             <div className="flex items-center justify-between mb-4">
                                <h3 className="font-serif font-black text-scout-brown uppercase text-xs tracking-widest flex items-center gap-2">
                                    <AlertCircle size={14} className="text-gray-400" />
                                    Membri Ospiti
                                </h3>
                                <button 
                                    onClick={() => setVerbale(v => ({ ...v, ospiti: [...(v.ospiti || []), { nome: '', ruolo: '' }] }))}
                                    className="bg-scout-blue/10 text-scout-blue p-1.5 rounded-xl hover:bg-scout-blue/20 transition-all"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(verbale.ospiti || []).map((o, idx) => (
                                    <div key={idx} className="flex gap-2 items-center bg-gray-50/50 p-2 rounded-2xl border border-gray-100 group">
                                        <input 
                                            type="text" 
                                            placeholder="Nome Ospite" 
                                            value={o.nome}
                                            onChange={e => {
                                                const newOspiti = [...(verbale.ospiti || [])];
                                                newOspiti[idx].nome = e.target.value;
                                                setVerbale(v => ({ ...v, ospiti: newOspiti }));
                                            }}
                                            className="flex-1 p-2 bg-white border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-scout-blue"
                                        />
                                        <input 
                                            type="text" 
                                            placeholder="Ruolo" 
                                            value={o.ruolo}
                                            onChange={e => {
                                                const newOspiti = [...(verbale.ospiti || [])];
                                                newOspiti[idx].ruolo = e.target.value;
                                                setVerbale(v => ({ ...v, ospiti: newOspiti }));
                                            }}
                                            className="flex-1 p-2 bg-white border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-scout-blue"
                                        />
                                        <button 
                                            onClick={() => setVerbale(v => ({ ...v, ospiti: v.ospiti?.filter((_, i) => i !== idx) }))}
                                            className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {(!viewMode && activeTab === 'odg') && (
                    <div className="p-6 space-y-6">
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-serif font-black text-scout-brown uppercase text-sm tracking-widest flex items-center gap-2">
                                    <FileText size={18} />
                                    Ordine del Giorno
                                </h3>
                                <button 
                                    onClick={() => setVerbale(v => ({ 
                                        ...v, 
                                        odg: [...(v.odg || []), { id: Date.now().toString(), titolo: '', contenuto: '' }] 
                                    }))}
                                    className="bg-scout-blue/10 text-scout-blue px-4 py-2 rounded-xl hover:bg-scout-blue/20 transition-all font-bold text-xs flex items-center gap-2 shadow-sm"
                                >
                                    <Plus size={16} />
                                    Aggiungi Punto
                                </button>
                            </div>

                            <div className="space-y-4 pt-4">
                                {(verbale.odg || []).map((punto, idx) => (
                                    <div key={punto.id} className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-4 relative group hover:border-scout-blue/20 transition-all">
                                        <div className="absolute md:top-6 md:right-6 top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <button 
                                                onClick={() => handleReorder(idx, -1, 'odg')}
                                                disabled={idx === 0}
                                                className="bg-gray-50 text-gray-400 p-2 rounded-xl hover:bg-scout-blue hover:text-white disabled:opacity-30"
                                            >
                                                <ArrowUp size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleReorder(idx, 1, 'odg')}
                                                disabled={idx === (verbale.odg?.length || 0) - 1}
                                                className="bg-gray-50 text-gray-400 p-2 rounded-xl hover:bg-scout-blue hover:text-white disabled:opacity-30"
                                            >
                                                <ArrowDown size={18} />
                                            </button>
                                            <button 
                                                onClick={() => setVerbale(v => ({ 
                                                    ...v, 
                                                    odg: (v.odg || []).filter(p => p.id !== punto.id) 
                                                }))}
                                                className="bg-red-50 text-red-400 p-2 rounded-xl hover:bg-red-500 hover:text-white"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center font-serif font-black text-gray-300 text-lg">
                                                {idxToAlpha(idx)}
                                            </span>
                                            <div className="flex-1">
                                                <input 
                                                    type="text"
                                                    placeholder="Titolo del punto..."
                                                    value={punto.titolo}
                                                    onChange={e => {
                                                        const newOdg = [...(verbale.odg || [])];
                                                        newOdg[idx].titolo = e.target.value;
                                                        setVerbale(v => ({ ...v, odg: newOdg }));
                                                    }}
                                                    className="w-full bg-transparent border-b-2 border-gray-100 focus:border-scout-blue outline-none font-serif font-black text-lg text-gray-800 py-1 transition-all"
                                                />
                                            </div>
                                        </div>
                                        <RichTextEditor
                                            value={punto.contenuto}
                                            onChange={(val) => {
                                                const newOdg = [...(verbale.odg || [])];
                                                newOdg[idx].contenuto = val;
                                                setVerbale(v => ({ ...v, odg: newOdg }));
                                            }}
                                        />
                                    </div>
                                ))}
                                {verbale.odg?.length === 0 && (
                                    <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-3xl">
                                        <div className="bg-gray-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                            <FileText className="text-gray-200" size={32} />
                                        </div>
                                        <p className="text-gray-400 font-serif italic">Nessun punto all'ordine del giorno</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                )}

                {(!viewMode && activeTab === 'sezioni') && (
                    <div className="p-6 space-y-12">
                        {/* Selector Grid */}
                        <section className="space-y-4">
                            <h3 className="font-serif font-black text-scout-brown uppercase text-xs tracking-widest text-center opacity-40">Sezioni Aggiuntive</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                {SEZIONI_DISPONIBILI.map(s => {
                                    const isActive = verbale.sezioniAttive?.includes(s.id);
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => toggleSezione(s.id)}
                                            className={cn(
                                                "p-4 rounded-2xl border transition-all flex flex-col items-center gap-2",
                                                isActive 
                                                    ? "bg-white border-scout-green shadow-md ring-1 ring-green-50" 
                                                    : "bg-gray-50 border-gray-100 opacity-60 grayscale"
                                            )}
                                        >
                                            <span className="text-2xl">{s.icon}</span>
                                            <span className={cn("text-[10px] font-black uppercase tracking-tighter", isActive ? s.color : "text-gray-400")}>{s.label}</span>
                                            {isActive && <CheckCircle2 size={14} className="text-scout-green mt-1" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        <div className="space-y-10 divide-y divide-gray-100">
                            {/* Ritorni dalle Branche / Membri */}
                            {verbale.sezioniAttive?.includes('ritorni') && (
                                <div className="pt-10 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-serif font-black text-scout-green uppercase text-sm tracking-widest flex items-center gap-2">
                                            🗣️ Ritorni
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleReorder((verbale.sezioniAttive || []).indexOf('ritorni'), -1, 'sezioni')} disabled={(verbale.sezioniAttive || []).indexOf('ritorni') === 0} className="p-1 text-gray-300 hover:text-scout-blue disabled:opacity-30"><ArrowUp size={14}/></button>
                                            <button onClick={() => handleReorder((verbale.sezioniAttive || []).indexOf('ritorni'), 1, 'sezioni')} disabled={(verbale.sezioniAttive || []).indexOf('ritorni') === (verbale.sezioniAttive?.length || 0) - 1} className="p-1 text-gray-300 hover:text-scout-blue disabled:opacity-30"><ArrowDown size={14}/></button>
                                            <button 
                                                onClick={() => setVerbale(v => ({ 
                                                    ...v, 
                                                    ritorni: [...(v.ritorni || []), { id: Date.now().toString(), branca: 'L/C', contenuto: '', tipo: 'Branca' }] 
                                                }))}
                                                className="bg-scout-green/10 text-scout-green p-1.5 rounded-xl hover:bg-scout-green/20 transition-all border border-scout-green/10"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        {(verbale.ritorni || []).map((rit, idx) => (
                                            <div key={idx} className="bg-gray-50/30 p-4 rounded-3xl border border-gray-100 group space-y-3">
                                                <div className="flex gap-3 items-center">
                                                    <select 
                                                        value={rit.tipo || 'Branca'}
                                                        onChange={e => {
                                                            const next = [...(verbale.ritorni || [])];
                                                            next[idx].tipo = e.target.value as 'Branca' | 'Membro';
                                                            // Reset based on type
                                                            if (e.target.value === 'Branca') next[idx].branca = 'L/C';
                                                            else if (membri.length > 0) next[idx].branca = membri[0].nome;
                                                            setVerbale(v => ({ ...v, ritorni: next }));
                                                        }}
                                                        className="p-2 border border-gray-200 rounded-xl text-[10px] font-bold uppercase tracking-wider outline-none focus:ring-1 focus:ring-scout-green"
                                                    >
                                                        <option value="Branca">Branca</option>
                                                        <option value="Membro">Membro</option>
                                                    </select>

                                                    {rit.tipo === 'Membro' ? (
                                                        <select 
                                                            value={rit.branca}
                                                            onChange={e => {
                                                                const next = [...(verbale.ritorni || [])];
                                                                next[idx].branca = e.target.value;
                                                                setVerbale(v => ({ ...v, ritorni: next }));
                                                            }}
                                                            className="flex-1 p-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-scout-green font-bold"
                                                        >
                                                            {membri.length === 0 && <option>Nessun membro</option>}
                                                            {membri.map(m => (
                                                                <option key={m.id} value={m.nome}>{m.nome}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <select 
                                                            value={rit.branca}
                                                            onChange={e => {
                                                                const next = [...(verbale.ritorni || [])];
                                                                next[idx].branca = e.target.value;
                                                                setVerbale(v => ({ ...v, ritorni: next }));
                                                            }}
                                                            className="flex-1 p-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-scout-green font-bold"
                                                        >
                                                            <option value="L/C">L/C</option>
                                                            <option value="E/G">E/G</option>
                                                            <option value="R/S">R/S</option>
                                                            <option value="Gruppo">Gruppo</option>
                                                        </select>
                                                    )}

                                                    <button 
                                                        onClick={() => setVerbale(v => ({ ...v, ritorni: v.ritorni?.filter((_, i) => i !== idx) }))}
                                                        className="p-1.5 text-red-300 hover:text-red-500 transition-all font-bold"
                                                    >✕</button>
                                                </div>
                                                <textarea 
                                                    value={rit.contenuto}
                                                    onChange={e => {
                                                        const next = [...(verbale.ritorni || [])];
                                                        next[idx].contenuto = e.target.value;
                                                        setVerbale(v => ({ ...v, ritorni: next }));
                                                    }}
                                                    className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-xs focus:ring-1 focus:ring-scout-green outline-none h-24 italic font-serif"
                                                    placeholder="Cosa è emerso..."
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Cassa */}
                            {verbale.sezioniAttive?.includes('cassa') && (
                                <div className="pt-10 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-serif font-black text-scout-brown uppercase text-sm tracking-widest flex items-center gap-2">
                                            💰 Movimenti di cassa di gruppo
                                        </h3>
                                        <button 
                                            onClick={() => setVerbale(v => ({ 
                                                ...v, 
                                                cassa: [...(v.cassa || []), { id: Date.now().toString(), branca: 'L/C', tipo: 'Versamento', importo: 0, note: '' }] 
                                            }))}
                                            className="bg-scout-brown/10 text-scout-brown p-1.5 rounded-xl hover:bg-scout-brown/20 transition-all"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {(verbale.cassa || []).map((mov, idx) => (
                                            <div key={idx} className="flex gap-3 items-center bg-gray-50/30 p-3 rounded-2xl border border-gray-100 group">
                                                <select 
                                                    value={mov.branca}
                                                    onChange={e => {
                                                        const next = [...(verbale.cassa || [])];
                                                        next[idx].branca = e.target.value;
                                                        setVerbale(v => ({ ...v, cassa: next }));
                                                    }}
                                                    className="p-2.5 bg-white border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-scout-brown"
                                                >
                                                    {['L/C', 'E/G', 'R/S', 'CoCa', 'Altro'].map(b => <option key={b} value={b}>{b}</option>)}
                                                </select>
                                                <select 
                                                    value={mov.tipo || 'Versamento'}
                                                    onChange={e => {
                                                        const next = [...(verbale.cassa || [])];
                                                        next[idx].tipo = e.target.value as 'Versamento' | 'Ricevuta';
                                                        setVerbale(v => ({ ...v, cassa: next }));
                                                    }}
                                                    className="p-2.5 bg-white border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-scout-brown"
                                                >
                                                    <option value="Versamento">Versato (Uscita)</option>
                                                    <option value="Ricevuta">Ricevuto (Entrata)</option>
                                                </select>
                                                <input 
                                                    type="text" 
                                                    placeholder="Causale..." 
                                                    value={mov.note}
                                                    onChange={e => {
                                                        const next = [...(verbale.cassa || [])];
                                                        next[idx].note = e.target.value;
                                                        setVerbale(v => ({ ...v, cassa: next }));
                                                    }}
                                                    className="flex-1 p-2.5 bg-white border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-scout-brown"
                                                />
                                                <div className="w-32 relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">€</span>
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        value={mov.importo}
                                                        onChange={e => {
                                                            const next = [...(verbale.cassa || [])];
                                                            next[idx].importo = parseFloat(e.target.value) || 0;
                                                            setVerbale(v => ({ ...v, cassa: next }));
                                                        }}
                                                        className="w-full pl-7 p-2.5 bg-white border border-gray-100 rounded-xl text-xs font-bold outline-none text-right focus:ring-1 focus:ring-scout-green"
                                                    />
                                                </div>
                                                <button 
                                                    onClick={() => setVerbale(v => ({ ...v, cassa: v.cassa?.filter((_, i) => i !== idx) }))}
                                                    className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all font-bold"
                                                >✕</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Posti Azione */}
                            {verbale.sezioniAttive?.includes('posti_azione') && (
                                <div className="pt-10 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-serif font-black text-orange-500 uppercase text-sm tracking-widest flex items-center gap-2">
                                            🎯 Posti d'Azione
                                        </h3>
                                        <button 
                                            onClick={() => setVerbale(v => ({ 
                                                ...v, 
                                                postiAzione: [...(v.postiAzione || []), { id: Date.now().toString(), cosa: '', chi: '', quando: '' }] 
                                            }))}
                                            className="bg-orange-50 text-orange-600 p-1.5 rounded-xl hover:bg-orange-100 transition-all border border-orange-100"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {(verbale.postiAzione || []).map((pa, idx) => (
                                            <div key={pa.id} className="grid grid-cols-12 gap-3 bg-gray-50/50 p-4 rounded-3xl border border-gray-100 group">
                                                <div className="col-span-12 md:col-span-6 space-y-1">
                                                    <label className="text-[9px] font-black text-gray-300 uppercase ml-2">Cosa fare</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Descrizione dell'impegno..." 
                                                        value={pa.cosa}
                                                        onChange={e => {
                                                            const next = [...(verbale.postiAzione || [])];
                                                            next[idx].cosa = e.target.value;
                                                            setVerbale(v => ({ ...v, postiAzione: next }));
                                                        }}
                                                        className="w-full bg-white p-2.5 border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-orange-200 font-bold"
                                                    />
                                                </div>
                                                <div className="col-span-6 md:col-span-3 space-y-1">
                                                    <label className="text-[9px] font-black text-gray-300 uppercase ml-2">Chi</label>
                                                    <input 
                                                        type="text" 
                                                        list="membri-list"
                                                        placeholder="Responsabile..." 
                                                        value={pa.chi}
                                                        onChange={e => {
                                                            const next = [...(verbale.postiAzione || [])];
                                                            next[idx].chi = e.target.value;
                                                            setVerbale(v => ({ ...v, postiAzione: next }));
                                                        }}
                                                        className="w-full bg-white p-2.5 border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-orange-200"
                                                    />
                                                    <datalist id="membri-list">
                                                        {membri.map(m => <option key={m.id} value={m.nome} />)}
                                                    </datalist>
                                                </div>
                                                <div className="col-span-6 md:col-span-3 space-y-1 relative">
                                                    <label className="text-[9px] font-black text-gray-300 uppercase ml-2">Quando</label>
                                                    <div className="flex gap-2 items-center">
                                                        <input 
                                                            type="date" 
                                                            value={pa.quando}
                                                            onChange={e => {
                                                                const next = [...(verbale.postiAzione || [])];
                                                                next[idx].quando = e.target.value;
                                                                setVerbale(v => ({ ...v, postiAzione: next }));
                                                            }}
                                                            className="flex-1 bg-white p-2.5 border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-orange-200"
                                                        />
                                                        <button 
                                                            onClick={() => setVerbale(v => ({ ...v, postiAzione: v.postiAzione?.filter((_, i) => i !== idx) }))}
                                                            className="p-1.5 text-red-300 hover:text-red-500 transition-all font-bold"
                                                        >✕</button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Varie */}
                            {verbale.sezioniAttive?.includes('varie') && (
                                <div className="pt-10 space-y-4">
                                    <h3 className="font-serif font-black text-gray-500 uppercase text-sm tracking-widest flex items-center gap-2">
                                        💬 Varie ed Eventuali
                                    </h3>
                                    <textarea 
                                        value={verbale.varie || ''}
                                        onChange={e => setVerbale(v => ({ ...v, varie: e.target.value }))}
                                        className="w-full p-6 bg-gray-50/50 border border-gray-100 rounded-3xl text-sm focus:ring-1 focus:ring-gray-300 outline-none min-h-[150px] font-serif italic leading-relaxed"
                                        placeholder="Note conclusive, avvisi rapidi, etc..."
                                    />
                                </div>
                            )}

                            {/* Date Importanti */}
                            {verbale.sezioniAttive?.includes('date_importanti') && (
                                <div className="pt-10 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-serif font-black text-scout-blue uppercase text-sm tracking-widest flex items-center gap-2">
                                            📅 Date Importanti / Impegni
                                        </h3>
                                        <button 
                                            onClick={() => setVerbale(v => ({ 
                                                ...v, 
                                                dateImportanti: [...(v.dateImportanti || []), { id: Date.now().toString(), dataInizio: '', evento: '', branca: 'CoCa', note: '' }] 
                                            }))}
                                            className="bg-scout-blue/10 text-scout-blue p-1.5 rounded-xl hover:bg-scout-blue/20 transition-all border border-scout-blue/10"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {(verbale.dateImportanti || []).map((dt, idx) => (
                                            <div key={dt.id} className="grid grid-cols-12 gap-3 bg-gray-50/50 p-4 rounded-3xl border border-gray-100 group">
                                                <div className="col-span-12 md:col-span-4 space-y-1">
                                                    <label className="text-[9px] font-black text-gray-300 uppercase ml-2">Evento</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Cosa..." 
                                                        value={dt.evento}
                                                        onChange={e => {
                                                            const next = [...(verbale.dateImportanti || [])];
                                                            next[idx].evento = e.target.value;
                                                            setVerbale(v => ({ ...v, dateImportanti: next }));
                                                        }}
                                                        className="w-full bg-white p-2.5 border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-scout-blue font-bold"
                                                    />
                                                </div>
                                                <div className="col-span-6 md:col-span-3 space-y-1">
                                                    <label className="text-[9px] font-black text-gray-300 uppercase ml-2">Quando</label>
                                                    <input 
                                                        type="date" 
                                                        value={dt.dataInizio}
                                                        onChange={e => {
                                                            const next = [...(verbale.dateImportanti || [])];
                                                            next[idx].dataInizio = e.target.value;
                                                            setVerbale(v => ({ ...v, dateImportanti: next }));
                                                        }}
                                                        className="w-full bg-white p-2.5 border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-scout-blue"
                                                    />
                                                </div>
                                                <div className="col-span-6 md:col-span-5 space-y-1 relative">
                                                    <label className="text-[9px] font-black text-gray-300 uppercase ml-2">Note / Referenti</label>
                                                    <div className="flex gap-2 items-center">
                                                        <input 
                                                            type="text" 
                                                            placeholder="Note aggiuntive..." 
                                                            value={dt.note || ''}
                                                            onChange={e => {
                                                                const next = [...(verbale.dateImportanti || [])];
                                                                next[idx].note = e.target.value;
                                                                setVerbale(v => ({ ...v, dateImportanti: next }));
                                                            }}
                                                            className="flex-1 bg-white p-2.5 border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-scout-blue"
                                                        />
                                                        <button 
                                                            onClick={() => setVerbale(v => ({ ...v, dateImportanti: v.dateImportanti?.filter((_, i) => i !== idx) }))}
                                                            className="p-1.5 text-red-300 hover:text-red-500 transition-all font-bold"
                                                        >✕</button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {(!verbale.dateImportanti || verbale.dateImportanti.length === 0) && (
                                            <div className="text-center p-6 text-gray-400 font-serif italic bg-white border border-gray-100 rounded-2xl">
                                                Nessuna data importante registrata
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Prossimi Impegni */}
                            {verbale.sezioniAttive?.includes('prossimi_impegni') && (
                                <div className="pt-10 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-serif font-black text-scout-purple uppercase text-sm tracking-widest flex items-center gap-2">
                                            🗓️ Prossimi impegni
                                        </h3>
                                        <button 
                                            onClick={() => setVerbale(v => ({ 
                                                ...v, 
                                                prossimiImpegni: [...(v.prossimiImpegni || []), { id: Date.now().toString(), dataInizio: '', evento: '', branca: 'CoCa', note: '' }] 
                                            }))}
                                            className="bg-scout-purple/10 text-scout-purple p-1.5 rounded-xl hover:bg-scout-purple/20 transition-all border border-scout-purple/10"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {(verbale.prossimiImpegni || []).map((imp, idx) => (
                                            <div key={imp.id} className="grid grid-cols-12 gap-3 bg-gray-50/50 p-4 rounded-3xl border border-gray-100 group">
                                                <div className="col-span-12 md:col-span-5 space-y-1">
                                                    <label className="text-[9px] font-black text-gray-300 uppercase ml-2">Nome impegno</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Cosa fare..." 
                                                        value={imp.evento}
                                                        onChange={e => {
                                                            const next = [...(verbale.prossimiImpegni || [])];
                                                            next[idx].evento = e.target.value;
                                                            setVerbale(v => ({ ...v, prossimiImpegni: next }));
                                                        }}
                                                        className="w-full bg-white p-2.5 border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-scout-purple font-bold"
                                                    />
                                                </div>
                                                <div className="col-span-6 md:col-span-3 space-y-1">
                                                    <label className="text-[9px] font-black text-gray-300 uppercase ml-2">Data</label>
                                                    <input 
                                                        type="date" 
                                                        value={imp.dataInizio}
                                                        onChange={e => {
                                                            const next = [...(verbale.prossimiImpegni || [])];
                                                            next[idx].dataInizio = e.target.value;
                                                            setVerbale(v => ({ ...v, prossimiImpegni: next }));
                                                        }}
                                                        className="w-full bg-white p-2.5 border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-scout-purple"
                                                    />
                                                </div>
                                                <div className="col-span-6 md:col-span-4 space-y-1 relative">
                                                    <label className="text-[9px] font-black text-gray-300 uppercase ml-2">Ora</label>
                                                    <div className="flex gap-2 items-center">
                                                        <input 
                                                            type="time" 
                                                            value={imp.note || ''}
                                                            onChange={e => {
                                                                const next = [...(verbale.prossimiImpegni || [])];
                                                                next[idx].note = e.target.value;
                                                                setVerbale(v => ({ ...v, prossimiImpegni: next }));
                                                            }}
                                                            className="flex-1 bg-white p-2.5 border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-scout-purple"
                                                        />
                                                        <button 
                                                            onClick={() => setVerbale(v => ({ ...v, prossimiImpegni: v.prossimiImpegni?.filter((_, i) => i !== idx) }))}
                                                            className="p-1.5 text-red-300 hover:text-red-500 transition-all font-bold"
                                                        >✕</button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {(!verbale.prossimiImpegni || verbale.prossimiImpegni.length === 0) && (
                                            <div className="text-center p-6 text-gray-400 font-serif italic bg-white border border-gray-100 rounded-2xl">
                                                Nessun prossimo impegno registrato
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            )}

            {(viewMode || activeTab === 'anteprima') && (
                    <style dangerouslySetInnerHTML={{__html: `
                        @media print {
                            body > * { display: none !important; }
                            .print-verbale { display: block !important; }
                        }
                    `}} />
                )}
                {(viewMode || activeTab === 'anteprima') && (
                    <div className="p-2 md:p-8 bg-gray-100 overflow-y-auto flex flex-col items-center gap-6 print-verbale">
                        {/* Last modifier badge */}
                        {viewMode && verbale.lastModifiedByUsername && (
                            <div className="w-full max-w-[850px] flex items-center gap-2 text-xs text-gray-500 bg-white/80 px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
                                <Pencil size={12} className="text-gray-400" />
                                <span>Ultima modifica di <strong className="text-gray-700">{verbale.lastModifiedByUsername}</strong></span>
                                {verbale.updatedAt && <span className="ml-auto text-gray-400">{new Date(verbale.updatedAt).toLocaleDateString('it-IT', {day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>}
                            </div>
                        )}
                        {/* A4 page - natural scroll, no fixed height */}
                        <div className="bg-white w-full max-w-[850px] shadow-xl border border-gray-200 print:shadow-none print:border-none" style={{padding:'60px 80px 80px'}}>
                            {/* PREVIEW HEADER */}
                            <VerbaleHeader />

                            <div className="space-y-8 mt-10 font-serif">
                                {/* LINEAR METADATA (MATCHING SCREEN 2) */}
                                <div className="space-y-1.5 text-[12px]">
                                    <div className="font-bold">{new Date(verbale.data || '').toLocaleDateString('it-IT')}</div>
                                    <div>
                                        <span className="font-black">Oggetto: </span>
                                        <span className="capitalize">{verbale.titolo}</span>
                                    </div>
                                    <div>
                                        <span className="font-black">Presenti: </span>
                                        <span className="italic">
                                            {membri.filter(m => verbale.presenti?.includes(m.id))
                                                .map(m => {
                                                    const isLate = verbale.ritardi?.includes(m.id);
                                                    const exit = verbale.usciteAnticipate?.find(u => u.membroId === m.id);
                                                    let suffix = "";
                                                    if (isLate && exit) suffix = ` (R e esc. ore ${exit.ora})`;
                                                    else if (isLate) suffix = " (R)";
                                                    else if (exit) suffix = ` (esc. ore ${exit.ora})`;
                                                    return m.nome + suffix;
                                                }).join(', ')}
                                            {verbale.ospiti && verbale.ospiti.length > 0 && 
                                                ", " + verbale.ospiti.map(o => `${o.nome} (${o.ruolo})`).join(', ')}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-black">Assenti: </span>
                                        <span className="italic">{membri.filter(m => verbale.assenti?.includes(m.id)).map(m => m.nome).join(', ') || 'Nessuno'}</span>
                                    </div>
                                    {verbale.odg && verbale.odg.length > 0 && (
                                        <div className="pt-2">
                                            <span className="font-black">ODG:</span>
                                            <ul className="list-disc pl-10 mt-1 space-y-0.5">
                                                {verbale.odg.map((p, i) => <li key={i} className="font-bold">{p.titolo}</li>)}
                                                {(verbale.sezioniAttive || []).map((sezId) => {
                                                    const SEZIONI_LABELS: Record<string, string> = {
                                                        ritorni: 'Ritorni dalle branche',
                                                        posti_azione: "Posti d'Azione",
                                                        prossimi_impegni: 'Prossimi impegni',
                                                        cassa: 'Aggiornamento cassa',
                                                        varie: 'Varie ed eventuali',
                                                    };
                                                    const hasContent =
                                                        (sezId === 'ritorni' && (verbale.ritorni?.length || 0) > 0) ||
                                                        (sezId === 'posti_azione' && (verbale.postiAzione?.length || 0) > 0) ||
                                                        (sezId === 'prossimi_impegni' && (verbale.prossimiImpegni?.length || 0) > 0) ||
                                                        (sezId === 'cassa' && (verbale.cassa?.length || 0) > 0) ||
                                                        (sezId === 'varie' && !!verbale.varie);
                                                    if (!hasContent || !SEZIONI_LABELS[sezId]) return null;
                                                    return <li key={sezId} className="font-bold italic text-gray-500">{SEZIONI_LABELS[sezId]}</li>;
                                                })}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                {/* CONTENT SECTIONS (LINEAR) */}
                                <div className="space-y-10 pt-6">
                                    {/* ODG Details */}
                                    {verbale.odg?.map((punto, i) => (
                                        <div key={i} className="space-y-3">
                                            <div className="flex gap-2">
                                                <span className="font-black whitespace-nowrap">• {punto.titolo}</span>
                                            </div>
                                            <div className="text-[12px] leading-relaxed text-justify pl-6 whitespace-pre-wrap">
                                                {punto.contenuto}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Additional Sections */}
                                    {verbale.sezioniAttive?.includes('ritorni') && verbale.ritorni && verbale.ritorni.length > 0 && (
                                        <div className="space-y-4">
                                            <div className="font-black border-b border-gray-100 pb-1 uppercase text-[10px] tracking-widest text-[#45387E]">Ritorni</div>
                                            {verbale.ritorni.map((r, i) => (
                                                <div key={i} className="pl-6 space-y-1">
                                                    <div className="font-bold text-[11px]">- {r.branca}</div>
                                                    <div className="text-[12px] leading-relaxed text-justify pl-4 italic opacity-80">{r.contenuto}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {verbale.sezioniAttive?.includes('posti_azione') && verbale.postiAzione && verbale.postiAzione.length > 0 && (
                                        <div className="space-y-4">
                                            <div className="font-black border-b border-gray-100 pb-1 uppercase text-[10px] tracking-widest text-orange-600">Posti d'Azione</div>
                                            <ul className="space-y-2 pl-6">
                                                {verbale.postiAzione.map((pa, i) => (
                                                    <li key={i} className="text-[12px]">
                                                        <span className="font-bold">🎯 {pa.cosa}</span>
                                                        <span className="opacity-60"> — Resp: {pa.chi} ({pa.quando})</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {verbale.sezioniAttive?.includes('cassa') && verbale.cassa && verbale.cassa.length > 0 && (
                                        <div className="space-y-4">
                                            <div className="font-black border-b border-gray-100 pb-1 uppercase text-[10px] tracking-widest text-emerald-700">Movimenti di cassa di gruppo</div>
                                            <div className="pl-6 text-[12px]">
                                                {verbale.cassa.map((m, i) => (
                                                    <div key={i} className="flex justify-between border-b border-gray-50 py-1 italic">
                                                        <span>{m.branca}: {m.note}</span>
                                                        <span className="font-bold">€ {m.importo.toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {verbale.sezioniAttive?.includes('prossimi_impegni') && verbale.prossimiImpegni && verbale.prossimiImpegni.length > 0 && (
                                        <div className="space-y-4">
                                            <div className="font-black border-b border-gray-100 pb-1 uppercase text-[10px] tracking-widest text-scout-purple">Prossimi impegni</div>
                                            <div className="pl-6 space-y-2">
                                                {verbale.prossimiImpegni.map((imp, i) => (
                                                    <div key={i} className="text-[12px] flex justify-between border-b border-gray-50 py-1">
                                                        <span><span className="font-bold">{imp.evento}</span></span>
                                                        <span className="opacity-60 italic">
                                                            {imp.dataInizio && new Date(imp.dataInizio).toLocaleDateString('it-IT')} 
                                                            {imp.note && ` ore ${imp.note}`}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {verbale.sezioniAttive?.includes('varie') && verbale.varie && (
                                        <div className="space-y-2">
                                            <div className="font-black border-b border-gray-100 pb-1 uppercase text-[10px] tracking-widest text-gray-400">Varie ed Eventuali</div>
                                            <div className="pl-6 text-[12px] italic leading-relaxed">{verbale.varie}</div>
                                        </div>
                                    )}
                                </div>

                                {/* LAST MODIFIER FOOTER */}
                                <div className="mt-16 pt-10 border-t border-gray-100">
                                    <div className="flex justify-between items-center">
                                        <div className="text-[9px] text-gray-400 max-w-[70%] leading-relaxed">
                                            WAGGGS / WOSM Member • Iscritta al Registro Nazionale delle Associazioni di Promozione Sociale n.72 - Legge 383/2000
                                        </div>
                                        <img src="/footer_logos.png" alt="Loghi" className="h-10 w-auto opacity-80" />
                                    </div>
                                </div>
                                </div>
                        </div>
                    </div>
                )}

            {/* NOTIFICATION MODAL */}
            {showNotifyModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 text-center space-y-5">
                            <div className="w-20 h-20 bg-green-100 text-scout-green rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 size={40} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-serif font-black text-gray-900 mb-2">Verbale Salvato!</h2>
                                <p className="text-gray-500 text-sm italic">
                                    Il verbale n. {verbale.numero} è stato archiviato con successo.
                                </p>
                            </div>

                            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-left">
                                <p className="text-sm font-bold text-amber-800 mb-3">📣 Vuoi notificare gli altri capi?</p>
                                <div className="grid grid-cols-1 gap-2">
                                    <button
                                        onClick={() => { alert('Notifica push inviata!'); setShowNotifyModal(false); }}
                                        className="w-full bg-amber-500 text-white py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-600 transition-all active:scale-95"
                                    >
                                        <Bell size={18} />
                                        Invia notifica push
                                    </button>
                                    <button
                                        onClick={() => { alert('Email inviata!'); setShowNotifyModal(false); }}
                                        className="w-full bg-blue-500 text-white py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-600 transition-all active:scale-95"
                                    >
                                        <Mail size={18} />
                                        Invia email
                                    </button>
                                    <button
                                        onClick={() => { alert('Notifica + Email inviati!'); setShowNotifyModal(false); }}
                                        className="w-full bg-scout-green text-white py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-scout-green-dark transition-all active:scale-95"
                                    >
                                        <Bell size={16} /><Mail size={16} />
                                        Invia entrambi
                                    </button>
                                    <button
                                        onClick={() => setShowNotifyModal(false)}
                                        className="w-full bg-gray-100 text-gray-500 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition-all"
                                    >
                                        <BellOff size={18} />
                                        Non notificare
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-gray-100">
                                <button
                                    onClick={() => {
                                        if (lastSavedVerbale) exportVerbaleToDocx(lastSavedVerbale, membri, currentUser);
                                    }}
                                    className="w-full bg-[#45387E] text-white py-3 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-[#352b61] transition-all shadow-md active:scale-95"
                                >
                                    <Download size={18} />
                                    Scarica .docx
                                </button>
                                <button
                                    onClick={() => navigate('/verbali')}
                                    className="w-full text-scout-brown font-black text-xs uppercase tracking-widest pt-2 hover:underline"
                                >
                                    Torna all'archivio
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function idxToAlpha(i: number) {
    return String.fromCharCode(65 + i);
}
