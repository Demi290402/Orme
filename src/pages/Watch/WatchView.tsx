import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Bell, Users, Clock, MapPin, 
  CheckCircle2, WifiOff, Monitor, ChevronRight,
  Check, ArrowLeft, RefreshCw, Compass, FileText,
  Package, Search
} from 'lucide-react';
import { useSmartwatch } from '@/hooks/useSmartwatch';
import { getEventi, EventoCalendario, getColorByBranca } from '@/lib/calendario';
import { getNotifications, markAllAsRead, AppNotification } from '@/lib/notifications';
import { getVerbali } from '@/lib/verbali';
import { getInventarioAttrezzi } from '@/lib/inventario';
import { getMembriCoCa } from '@/lib/verbali';
import { getUser } from '@/lib/data';
import { User, MembroCoCa, Verbale, InventarioAttrezzo } from '@/types';

type WatchViewTab = 'home' | 'verbali' | 'inventario' | 'eventi' | 'avvisi' | 'capi' | 'opzioni';

export default function WatchView() {
  const navigate = useNavigate();
  const { isRound: autoIsRound, toggleViewMode } = useSmartwatch();

  // Allow manual toggle of round/square screen shape for testing or preference
  const [manualShape, setManualShape] = useState<'auto' | 'round' | 'rect'>('auto');
  const isRound = manualShape === 'auto' ? autoIsRound : manualShape === 'round';

  const [activeTab, setActiveTab] = useState<WatchViewTab>('home');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  const [user, setUser] = useState<User | null>(null);
  const [eventi, setEventi] = useState<EventoCalendario[]>([]);
  const [notifiche, setNotifiche] = useState<AppNotification[]>([]);
  const [verbali, setVerbali] = useState<Verbale[]>([]);
  const [attrezzi, setAttrezzi] = useState<InventarioAttrezzo[]>([]);
  const [membri, setMembri] = useState<MembroCoCa[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Selection states for modals
  const [selectedEvento, setSelectedEvento] = useState<EventoCalendario | null>(null);
  const [selectedVerbale, setSelectedVerbale] = useState<Verbale | null>(null);
  const [presenzaConfermata, setPresenzaConfermata] = useState<boolean>(false);
  const [searchInventario, setSearchInventario] = useState<string>('');

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 5000);
    return () => clearInterval(interval);
  }, []);

  // Online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch data
  const loadData = async () => {
    setLoading(true);
    try {
      const u = await getUser().catch(() => null);
      setUser(u);

      const [evList, notifList, verbList, attrList, membList] = await Promise.all([
        getEventi().catch(() => []),
        getNotifications().catch(() => []),
        getVerbali().catch(() => []),
        getInventarioAttrezzi().catch(() => []),
        getMembriCoCa().catch(() => []),
      ]);

      const todayStr = new Date().toISOString().split('T')[0];
      const upcoming = evList
        .filter(e => e.dataInizio >= todayStr)
        .sort((a, b) => a.dataInizio.localeCompare(b.dataInizio));

      setEventi(upcoming.length > 0 ? upcoming : evList.slice(-5));
      setNotifiche(notifList);
      setVerbali(verbList.slice(0, 15));
      setAttrezzi(attrList);
      setMembri(membList.filter(m => m.attivo !== false));
    } catch (err) {
      console.error('Watch data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const unreadNotifs = notifiche.filter(n => !n.isRead);
  const nextEvent = eventi[0] || null;

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifiche(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleExitWatch = () => {
    toggleViewMode('full');
    navigate('/');
  };

  // Filtered tools
  const filteredAttrezzi = attrezzi.filter(a => 
    !searchInventario || 
    a.name.toLowerCase().includes(searchInventario.toLowerCase()) ||
    a.category.toLowerCase().includes(searchInventario.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-start select-none font-sans overflow-x-hidden">
      {/* Smartwatch Frame */}
      <div 
        className={`w-full max-w-[340px] min-h-screen flex flex-col justify-between transition-all duration-300 watch-container watch-no-scrollbar ${
          isRound 
            ? 'px-7 pt-9 pb-12 text-center items-center' 
            : 'px-3.5 pt-3 pb-6 items-stretch'
        }`}
      >
        {/* ─── Top Micro Header ───────────────────────── */}
        <header className="flex items-center justify-between w-full mb-2 shrink-0 px-2">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400 font-black text-xs tracking-wider">ORME</span>
            {isOnline ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ) : (
              <WifiOff size={10} className="text-amber-500" />
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-zinc-300 font-mono">{currentTime || '--:--'}</span>
            {unreadNotifs.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
          </div>
        </header>

        {/* ─── Main Content Views ──────────────────────── */}
        <main className="flex-1 w-full overflow-y-auto watch-no-scrollbar py-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2">
              <RefreshCw size={22} className="animate-spin text-emerald-400" />
              <p className="text-[11px] text-zinc-400 font-medium">Caricamento...</p>
            </div>
          ) : (
            <>
              {/* VIEW: HOME / OGGI */}
              {activeTab === 'home' && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">
                    {currentDate}
                  </div>

                  {/* Next Event Card */}
                  {nextEvent ? (
                    <div 
                      onClick={() => setSelectedEvento(nextEvent)}
                      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-2.5 text-left active:bg-zinc-800 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span 
                          className="text-[8px] uppercase font-extrabold px-1.5 py-0.5 rounded text-black"
                          style={{ backgroundColor: getColorByBranca(nextEvent.branca) }}
                        >
                          {nextEvent.branca || 'CoCa'}
                        </span>
                        <span className="text-[9px] text-zinc-400 font-mono">
                          {nextEvent.oraInizio || 'Oggi'}
                        </span>
                      </div>

                      <h2 className="text-xs font-bold text-white leading-tight line-clamp-2">
                        {nextEvent.titolo}
                      </h2>

                      {nextEvent.luogo && (
                        <div className="flex items-center gap-1 mt-1 text-[9px] text-zinc-400">
                          <MapPin size={9} className="shrink-0 text-emerald-400" />
                          <span className="truncate">{nextEvent.luogo}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-2.5 text-center">
                      <p className="text-xs font-bold text-zinc-300">Nessun evento oggi</p>
                      <p className="text-[9px] text-zinc-500">Pausa attività</p>
                    </div>
                  )}

                  {/* Quick Presence Button */}
                  {nextEvent && (
                    <button
                      onClick={() => setPresenzaConfermata(!presenzaConfermata)}
                      className={`w-full py-1.5 px-3 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                        presenzaConfermata 
                          ? 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-300' 
                          : 'bg-emerald-600 active:bg-emerald-500 text-white'
                      }`}
                    >
                      <CheckCircle2 size={13} className={presenzaConfermata ? 'text-emerald-400' : 'text-white'} />
                      <span>{presenzaConfermata ? 'Presenza Registrata' : 'Conferma Presenza'}</span>
                    </button>
                  )}

                  {/* Unread Alert Pill */}
                  {unreadNotifs.length > 0 && (
                    <button
                      onClick={() => setActiveTab('avvisi')}
                      className="w-full py-1.5 px-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold flex items-center justify-between active:scale-95 transition-all"
                    >
                      <div className="flex items-center gap-1.5">
                        <Bell size={12} className="text-amber-400 animate-bounce" />
                        <span>{unreadNotifs.length} avvisi</span>
                      </div>
                      <ChevronRight size={12} className="text-amber-400" />
                    </button>
                  )}

                  {/* Hub Vertical Menu for Watch (Rotary bezel & thumb friendly) */}
                  <div className="space-y-1.5 pt-1">
                    <button
                      onClick={() => setActiveTab('verbali')}
                      className="w-full bg-zinc-900 active:bg-zinc-800 border border-zinc-800 rounded-xl p-2.5 flex items-center justify-between text-left active:scale-95 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                          <FileText size={13} />
                        </div>
                        <span className="text-xs font-bold">Verbali CoCa</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">{verbali.length}</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('inventario')}
                      className="w-full bg-zinc-900 active:bg-zinc-800 border border-zinc-800 rounded-xl p-2.5 flex items-center justify-between text-left active:scale-95 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                          <Package size={13} />
                        </div>
                        <span className="text-xs font-bold">Inventario</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">{attrezzi.length} pz</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('eventi')}
                      className="w-full bg-zinc-900 active:bg-zinc-800 border border-zinc-800 rounded-xl p-2.5 flex items-center justify-between text-left active:scale-95 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                          <Calendar size={13} />
                        </div>
                        <span className="text-xs font-bold">Calendario</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">{eventi.length}</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('capi')}
                      className="w-full bg-zinc-900 active:bg-zinc-800 border border-zinc-800 rounded-xl p-2.5 flex items-center justify-between text-left active:scale-95 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                          <Users size={13} />
                        </div>
                        <span className="text-xs font-bold">Membri CoCa</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">{membri.length}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* VIEW: VERBALI COCA */}
              {activeTab === 'verbali' && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-1 px-1 border-b border-zinc-800">
                    <button 
                      onClick={() => setActiveTab('home')}
                      className="p-1 text-zinc-400 hover:text-white flex items-center gap-1 text-[11px] font-bold"
                    >
                      <ArrowLeft size={12} />
                      <span>Indietro</span>
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Verbali</span>
                  </div>

                  {verbali.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-6 text-center">Nessun verbale registrato</p>
                  ) : (
                    <div className="space-y-1.5">
                      {verbali.map(v => (
                        <div
                          key={v.id}
                          onClick={() => setSelectedVerbale(v)}
                          className="bg-zinc-900 active:bg-zinc-800 border border-zinc-800 rounded-xl p-2.5 text-left cursor-pointer transition-all active:scale-[0.98]"
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[9px] font-bold text-blue-400 font-mono">
                              Verbale #{v.numero}
                            </span>
                            <span className="text-[9px] text-zinc-400 font-mono">
                              {new Date(v.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-white leading-tight line-clamp-1">{v.titolo}</p>
                          {v.luogo && (
                            <p className="text-[9px] text-zinc-400 truncate flex items-center gap-1 mt-1">
                              <MapPin size={8} className="text-blue-400 shrink-0" />
                              {v.luogo}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* VIEW: INVENTARIO & ATTREZZI */}
              {activeTab === 'inventario' && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-1 px-1 border-b border-zinc-800">
                    <button 
                      onClick={() => setActiveTab('home')}
                      className="p-1 text-zinc-400 hover:text-white flex items-center gap-1 text-[11px] font-bold"
                    >
                      <ArrowLeft size={12} />
                      <span>Indietro</span>
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Inventario</span>
                  </div>

                  {/* Summary Chips */}
                  <div className="grid grid-cols-2 gap-1 text-center">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-1.5">
                      <p className="text-[8px] text-zinc-400 uppercase font-bold">Pezzi</p>
                      <p className="text-xs font-bold text-amber-400">
                        {attrezzi.reduce((acc, a) => acc + (a.quantity || 1), 0)}
                      </p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-1.5">
                      <p className="text-[8px] text-zinc-400 uppercase font-bold">Articoli</p>
                      <p className="text-xs font-bold text-emerald-400">{attrezzi.length}</p>
                    </div>
                  </div>

                  {/* Quick Search */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Cerca attrezzo..."
                      value={searchInventario}
                      onChange={e => setSearchInventario(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 outline-none"
                    />
                    <Search size={12} className="absolute right-2.5 top-2.5 text-zinc-500 pointer-events-none" />
                  </div>

                  {filteredAttrezzi.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-6 text-center">Nessun attrezzo trovato</p>
                  ) : (
                    <div className="space-y-1.5">
                      {filteredAttrezzi.slice(0, 20).map(item => (
                        <div
                          key={item.id}
                          className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-left"
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-xs font-bold text-white truncate">{item.name}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-amber-400 shrink-0 font-mono">
                              ×{item.quantity}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-zinc-400">
                            <span>{item.category}</span>
                            <span className={`font-semibold capitalize ${item.status === 'danneggiato' ? 'text-red-400' : 'text-zinc-400'}`}>
                              {item.status || 'disponibile'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* VIEW: CALENDARIO EVENTI */}
              {activeTab === 'eventi' && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-1 px-1 border-b border-zinc-800">
                    <button 
                      onClick={() => setActiveTab('home')}
                      className="p-1 text-zinc-400 hover:text-white flex items-center gap-1 text-[11px] font-bold"
                    >
                      <ArrowLeft size={12} />
                      <span>Indietro</span>
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Agenda</span>
                  </div>

                  {eventi.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-6 text-center">Nessun evento in agenda</p>
                  ) : (
                    <div className="space-y-1.5">
                      {eventi.map(ev => (
                        <div
                          key={ev.id}
                          onClick={() => setSelectedEvento(ev)}
                          className="bg-zinc-900 active:bg-zinc-800 border border-zinc-800 rounded-xl p-2.5 text-left cursor-pointer transition-all active:scale-[0.98]"
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span 
                              className="text-[8px] uppercase font-bold px-1.5 py-0.2 rounded text-black"
                              style={{ backgroundColor: getColorByBranca(ev.branca) }}
                            >
                              {ev.branca || 'CoCa'}
                            </span>
                            <span className="text-[9px] text-zinc-400 font-mono">
                              {new Date(ev.dataInizio).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-white truncate">{ev.titolo}</p>
                          {ev.luogo && (
                            <p className="text-[9px] text-zinc-400 truncate flex items-center gap-1 mt-0.5">
                              <MapPin size={8} className="text-emerald-400 shrink-0" />
                              {ev.luogo}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* VIEW: AVVISI / NOTIFICHE */}
              {activeTab === 'avvisi' && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-1 px-1 border-b border-zinc-800">
                    <button 
                      onClick={() => setActiveTab('home')}
                      className="p-1 text-zinc-400 hover:text-white flex items-center gap-1 text-[11px] font-bold"
                    >
                      <ArrowLeft size={12} />
                      <span>Indietro</span>
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Avvisi</span>
                  </div>

                  {unreadNotifs.length > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="w-full py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1"
                    >
                      <Check size={12} />
                      <span>Segna tutte lette</span>
                    </button>
                  )}

                  {notifiche.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-6 text-center">Nessuna notifica</p>
                  ) : (
                    <div className="space-y-1.5">
                      {notifiche.slice(0, 10).map(n => (
                        <div 
                          key={n.id}
                          className={`rounded-xl p-2 text-left border ${
                            n.isRead ? 'bg-zinc-950 border-zinc-900 opacity-60 text-zinc-400' : 'bg-zinc-900 border-zinc-800 text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-[10px] font-bold truncate text-emerald-400">{n.title}</span>
                            {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                          </div>
                          <p className="text-[10px] text-zinc-300 line-clamp-2 leading-tight">{n.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* VIEW: CAPI / MEMBRI COCA */}
              {activeTab === 'capi' && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-1 px-1 border-b border-zinc-800">
                    <button 
                      onClick={() => setActiveTab('home')}
                      className="p-1 text-zinc-400 hover:text-white flex items-center gap-1 text-[11px] font-bold"
                    >
                      <ArrowLeft size={12} />
                      <span>Indietro</span>
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">CoCa</span>
                  </div>

                  {membri.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-6 text-center">Nessun membro censito</p>
                  ) : (
                    <div className="space-y-1.5">
                      {membri.map(m => (
                        <div
                          key={m.id}
                          className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-left"
                        >
                          <p className="text-xs font-bold text-white truncate">{m.nome}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span 
                              className="text-[8px] uppercase font-bold px-1 rounded text-black shrink-0"
                              style={{ backgroundColor: getColorByBranca(m.branca) }}
                            >
                              {m.branca}
                            </span>
                            <span className="text-[9px] text-zinc-400 truncate">
                              {m.ruoli?.join(', ') || 'Capo'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* VIEW: OPZIONI */}
              {activeTab === 'opzioni' && (
                <div className="space-y-2 animate-in fade-in duration-200 text-left">
                  <div className="flex items-center justify-between pb-1 px-1 border-b border-zinc-800">
                    <button 
                      onClick={() => setActiveTab('home')}
                      className="p-1 text-zinc-400 hover:text-white flex items-center gap-1 text-[11px] font-bold"
                    >
                      <ArrowLeft size={12} />
                      <span>Indietro</span>
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Info</span>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2">
                    <p className="text-[8px] uppercase font-bold text-zinc-500">Profilo Attivo</p>
                    <p className="text-xs font-bold text-white truncate">
                      {user ? `${user.firstName} ${user.lastName}` : 'Ospite Scout'}
                    </p>
                    <p className="text-[9px] text-emerald-400 truncate">
                      {user?.groupName || 'Gruppo Scout'}
                    </p>
                  </div>

                  {/* Form Factor Switch */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 space-y-1">
                    <p className="text-[8px] uppercase font-bold text-zinc-400">Forma Display</p>
                    <div className="grid grid-cols-2 gap-1 text-center">
                      <button
                        onClick={() => setManualShape('round')}
                        className={`py-1 rounded-lg text-[9px] font-bold ${
                          isRound ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        ⭕ Samsung
                      </button>
                      <button
                        onClick={() => setManualShape('rect')}
                        className={`py-1 rounded-lg text-[9px] font-bold ${
                          !isRound ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        ⬛ Apple Watch
                      </button>
                    </div>
                  </div>

                  {/* Switch to full website */}
                  <button
                    onClick={handleExitWatch}
                    className="w-full py-2 px-3 rounded-xl bg-zinc-800 active:bg-zinc-700 text-zinc-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Monitor size={13} className="text-emerald-400" />
                    <span>Passa a Vista Completa</span>
                  </button>
                </div>
              )}
            </>
          )}
        </main>

        {/* ─── Bottom Navigation: Centered Minimal Bar ─── */}
        <footer className="flex items-center justify-center gap-6 w-full pt-1.5 border-t border-zinc-900 shrink-0">
          <button
            onClick={() => setActiveTab('home')}
            className={`p-1.5 rounded-full transition-all ${
              activeTab === 'home' ? 'text-emerald-400 bg-zinc-900' : 'text-zinc-500'
            }`}
            title="Oggi"
          >
            <Clock size={16} />
          </button>

          <button
            onClick={() => setActiveTab('avvisi')}
            className={`p-1.5 rounded-full relative transition-all ${
              activeTab === 'avvisi' ? 'text-emerald-400 bg-zinc-900' : 'text-zinc-500'
            }`}
            title="Avvisi"
          >
            <Bell size={16} />
            {unreadNotifs.length > 0 && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('opzioni')}
            className={`p-1.5 rounded-full transition-all ${
              activeTab === 'opzioni' ? 'text-emerald-400 bg-zinc-900' : 'text-zinc-500'
            }`}
            title="Impostazioni"
          >
            <Monitor size={16} />
          </button>
        </footer>

        {/* ─── Event Detail Modal ──────────────────────── */}
        {selectedEvento && (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 animate-in fade-in duration-150">
            <div className="overflow-y-auto watch-no-scrollbar space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span 
                  className="text-[8px] uppercase font-bold px-1.5 py-0.5 rounded text-black"
                  style={{ backgroundColor: getColorByBranca(selectedEvento.branca) }}
                >
                  {selectedEvento.branca}
                </span>
                <span className="text-[9px] text-zinc-400 font-mono">
                  {selectedEvento.oraInizio || 'Tutto il giorno'}
                </span>
              </div>

              <h3 className="text-xs font-bold text-white">{selectedEvento.titolo}</h3>

              <div className="space-y-1 text-xs text-zinc-300">
                <p className="flex items-center gap-1.5 text-zinc-400 text-[10px]">
                  <Calendar size={11} className="text-emerald-400 shrink-0" />
                  {new Date(selectedEvento.dataInizio).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                </p>

                {selectedEvento.luogo && (
                  <p className="flex items-center gap-1.5 text-zinc-400 text-[10px]">
                    <MapPin size={11} className="text-emerald-400 shrink-0" />
                    {selectedEvento.luogo}
                  </p>
                )}

                {selectedEvento.note && (
                  <div className="bg-zinc-900 rounded-lg p-2 text-[9px] text-zinc-300 border border-zinc-800 mt-1">
                    {selectedEvento.note}
                  </div>
                )}
              </div>

              {selectedEvento.luogo && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvento.luogo)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-[11px] font-bold flex items-center justify-center gap-1.5 mt-2"
                >
                  <Compass size={13} className="text-emerald-400" />
                  <span>Apri Mappa</span>
                </a>
              )}
            </div>

            <button
              onClick={() => setSelectedEvento(null)}
              className="w-full py-1.5 mt-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shrink-0"
            >
              Chiudi
            </button>
          </div>
        )}

        {/* ─── Verbale Detail Modal ────────────────────── */}
        {selectedVerbale && (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 animate-in fade-in duration-150">
            <div className="overflow-y-auto watch-no-scrollbar space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-blue-400 font-mono">
                  Verbale #{selectedVerbale.numero}
                </span>
                <span className="text-[9px] text-zinc-400 font-mono">
                  {new Date(selectedVerbale.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                </span>
              </div>

              <h3 className="text-xs font-bold text-white">{selectedVerbale.titolo}</h3>

              {selectedVerbale.luogo && (
                <p className="text-[9px] text-zinc-400 flex items-center gap-1">
                  <MapPin size={9} className="text-blue-400" />
                  {selectedVerbale.luogo}
                </p>
              )}

              {/* ODG Items */}
              {selectedVerbale.odg && selectedVerbale.odg.length > 0 && (
                <div className="space-y-1 mt-2">
                  <p className="text-[8px] uppercase font-bold text-zinc-400">Ordine del Giorno</p>
                  {selectedVerbale.odg.map((p, idx) => (
                    <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 text-[9px]">
                      <p className="font-bold text-zinc-200">{idx + 1}. {p.titolo}</p>
                      {p.contenuto && <p className="text-zinc-400 mt-0.5 line-clamp-3">{p.contenuto}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedVerbale(null)}
              className="w-full py-1.5 mt-2 bg-blue-600 text-white rounded-xl text-xs font-bold shrink-0"
            >
              Chiudi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
