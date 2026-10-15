import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Bell, Users, Clock, MapPin, 
  CheckCircle2, WifiOff, Monitor, ChevronRight,
  Check, ArrowLeft, RefreshCw, Compass
} from 'lucide-react';
import { useSmartwatch } from '@/hooks/useSmartwatch';
import { getEventi, EventoCalendario, getColorByBranca } from '@/lib/calendario';
import { getNotifications, markAllAsRead, AppNotification } from '@/lib/notifications';
import { getMembriCoCa } from '@/lib/verbali';
import { getUser } from '@/lib/data';
import { User, MembroCoCa } from '@/types';

type WatchTab = 'home' | 'eventi' | 'avvisi' | 'capi' | 'opzioni';

export default function WatchView() {
  const navigate = useNavigate();
  const { isRound: autoIsRound, toggleViewMode } = useSmartwatch();

  // Allow manual toggle of round/square screen shape for testing or preference
  const [manualShape, setManualShape] = useState<'auto' | 'round' | 'rect'>('auto');
  const isRound = manualShape === 'auto' ? autoIsRound : manualShape === 'round';

  const [activeTab, setActiveTab] = useState<WatchTab>('home');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  const [user, setUser] = useState<User | null>(null);
  const [eventi, setEventi] = useState<EventoCalendario[]>([]);
  const [notifiche, setNotifiche] = useState<AppNotification[]>([]);
  const [membri, setMembri] = useState<MembroCoCa[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [presenzaConfermata, setPresenzaConfermata] = useState<boolean>(false);
  const [selectedEvento, setSelectedEvento] = useState<EventoCalendario | null>(null);

  // Digital clock update
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

  // Online / offline listeners
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

  // Fetch essential watch data
  const loadData = async () => {
    setLoading(true);
    try {
      const u = await getUser().catch(() => null);
      setUser(u);

      const [evList, notifList, membList] = await Promise.all([
        getEventi().catch(() => []),
        getNotifications().catch(() => []),
        getMembriCoCa().catch(() => []),
      ]);

      // Filter upcoming events (from today onwards)
      const todayStr = new Date().toISOString().split('T')[0];
      const upcoming = evList
        .filter(e => e.dataInizio >= todayStr)
        .sort((a, b) => a.dataInizio.localeCompare(b.dataInizio));

      setEventi(upcoming.length > 0 ? upcoming : evList.slice(-5));
      setNotifiche(notifList);
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

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-start select-none font-sans overflow-x-hidden">
      {/* Outer Watch Frame Container (adaptable for round or rectangular smartwatch) */}
      <div 
        className={`w-full max-w-[340px] min-h-screen flex flex-col justify-between transition-all duration-300 watch-container watch-no-scrollbar ${
          isRound 
            ? 'px-5 pt-8 pb-10 text-center items-center' 
            : 'px-3 pt-2 pb-6 items-stretch'
        }`}
        style={{
          paddingTop: isRound ? '2.5rem' : 'max(env(safe-area-inset-top, 0.5rem), 0.5rem)',
          paddingBottom: isRound ? '3rem' : 'max(env(safe-area-inset-bottom, 1rem), 1rem)',
        }}
      >
        {/* ─── Top Micro Header ───────────────────────── */}
        <header className={`flex items-center justify-between w-full mb-2 shrink-0 ${isRound ? 'px-4' : 'px-1'}`}>
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400 font-black text-xs tracking-wider">ORME</span>
            {isOnline ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Online" />
            ) : (
              <WifiOff size={10} className="text-amber-500" />
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-zinc-300 font-mono tracking-tight">{currentTime || '--:--'}</span>
            {unreadNotifs.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            )}
          </div>
        </header>

        {/* ─── Main Content View ──────────────────────── */}
        <main className="flex-1 w-full overflow-y-auto watch-no-scrollbar py-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2">
              <RefreshCw size={22} className="animate-spin text-emerald-400" />
              <p className="text-[11px] text-zinc-400 font-medium">Caricamento...</p>
            </div>
          ) : (
            <>
              {/* TAB: HOME / OGGI */}
              {activeTab === 'home' && (
                <div className="space-y-2.5 animate-in fade-in duration-200">
                  {/* Date banner */}
                  <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">
                    {currentDate}
                  </div>

                  {/* Next Event Glance Card */}
                  {nextEvent ? (
                    <div 
                      onClick={() => setSelectedEvento(nextEvent)}
                      className="bg-zinc-900/90 active:bg-zinc-800 border border-zinc-800 rounded-2xl p-3 text-left transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span 
                          className="text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full text-black"
                          style={{ backgroundColor: getColorByBranca(nextEvent.branca) }}
                        >
                          {nextEvent.branca || 'CoCa'}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {nextEvent.oraInizio || 'Tutto il giorno'}
                        </span>
                      </div>

                      <h2 className="text-xs font-bold text-white leading-tight line-clamp-2">
                        {nextEvent.titolo}
                      </h2>

                      {nextEvent.luogo && (
                        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-zinc-400">
                          <MapPin size={10} className="shrink-0 text-emerald-400" />
                          <span className="truncate">{nextEvent.luogo}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3 text-center">
                      <p className="text-xs font-bold text-zinc-300">Nessun evento a breve</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Goditi la pausa scout!</p>
                    </div>
                  )}

                  {/* Quick Action: Presence Confirmation */}
                  {nextEvent && (
                    <button
                      onClick={() => setPresenzaConfermata(!presenzaConfermata)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                        presenzaConfermata 
                          ? 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-300' 
                          : 'bg-emerald-600 active:bg-emerald-500 text-white'
                      }`}
                    >
                      <CheckCircle2 size={14} className={presenzaConfermata ? 'text-emerald-400' : 'text-white'} />
                      <span>{presenzaConfermata ? 'Presenza Registrata' : 'Conferma Presenza'}</span>
                    </button>
                  )}

                  {/* Unread Alert Pill */}
                  {unreadNotifs.length > 0 && (
                    <button
                      onClick={() => setActiveTab('avvisi')}
                      className="w-full py-2 px-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-between active:scale-95 transition-all"
                    >
                      <div className="flex items-center gap-1.5">
                        <Bell size={12} className="animate-bounce text-amber-400" />
                        <span>{unreadNotifs.length} {unreadNotifs.length === 1 ? 'nuovo avviso' : 'nuovi avvisi'}</span>
                      </div>
                      <ChevronRight size={14} className="text-amber-400" />
                    </button>
                  )}

                  {/* Navigation Grid for Smartwatch */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      onClick={() => setActiveTab('eventi')}
                      className="bg-zinc-900 border border-zinc-800 active:bg-zinc-800 rounded-xl p-2.5 flex flex-col items-center justify-center text-center gap-1 active:scale-95 transition-all"
                    >
                      <Calendar size={16} className="text-emerald-400" />
                      <span className="text-[11px] font-bold">Eventi ({eventi.length})</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('capi')}
                      className="bg-zinc-900 border border-zinc-800 active:bg-zinc-800 rounded-xl p-2.5 flex flex-col items-center justify-center text-center gap-1 active:scale-95 transition-all"
                    >
                      <Users size={16} className="text-sky-400" />
                      <span className="text-[11px] font-bold">CoCa ({membri.length})</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: EVENTI / CALENDARIO */}
              {activeTab === 'eventi' && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-1 px-1 border-b border-zinc-800">
                    <button 
                      onClick={() => setActiveTab('home')}
                      className="p-1 text-zinc-400 hover:text-white flex items-center gap-1 text-[11px]"
                    >
                      <ArrowLeft size={12} />
                      <span>Oggi</span>
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Agenda</span>
                  </div>

                  {eventi.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-6 text-center">Nessun evento in archivio</p>
                  ) : (
                    <div className="space-y-1.5">
                      {eventi.map(ev => (
                        <div
                          key={ev.id}
                          onClick={() => setSelectedEvento(ev)}
                          className="bg-zinc-900/80 active:bg-zinc-800 border border-zinc-800/80 rounded-xl p-2.5 text-left cursor-pointer transition-all active:scale-[0.98]"
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

              {/* TAB: AVVISI / NOTIFICHE */}
              {activeTab === 'avvisi' && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-1 px-1 border-b border-zinc-800">
                    <button 
                      onClick={() => setActiveTab('home')}
                      className="p-1 text-zinc-400 hover:text-white flex items-center gap-1 text-[11px]"
                    >
                      <ArrowLeft size={12} />
                      <span>Oggi</span>
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
                          className={`rounded-xl p-2.5 text-left border transition-all ${
                            n.isRead 
                              ? 'bg-zinc-950 border-zinc-850 opacity-60 text-zinc-400' 
                              : 'bg-zinc-900 border-zinc-750 text-white'
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

              {/* TAB: CAPI / MEMBRI COCA */}
              {activeTab === 'capi' && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-1 px-1 border-b border-zinc-800">
                    <button 
                      onClick={() => setActiveTab('home')}
                      className="p-1 text-zinc-400 hover:text-white flex items-center gap-1 text-[11px]"
                    >
                      <ArrowLeft size={12} />
                      <span>Oggi</span>
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">CoCa</span>
                  </div>

                  {membri.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-6 text-center">Nessun membro censito</p>
                  ) : (
                    <div className="space-y-1.5">
                      {membri.map(m => (
                        <div
                          key={m.id}
                          className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 text-left flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
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
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: OPZIONI & SHAPE PREVIEW */}
              {activeTab === 'opzioni' && (
                <div className="space-y-2.5 animate-in fade-in duration-200 text-left">
                  <div className="flex items-center justify-between pb-1 px-1 border-b border-zinc-800">
                    <button 
                      onClick={() => setActiveTab('home')}
                      className="p-1 text-zinc-400 hover:text-white flex items-center gap-1 text-[11px]"
                    >
                      <ArrowLeft size={12} />
                      <span>Oggi</span>
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Info</span>
                  </div>

                  {/* User Profile Glance */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5">
                    <p className="text-[9px] uppercase font-bold text-zinc-500">Accesso Attivo</p>
                    <p className="text-xs font-bold text-white truncate">
                      {user ? `${user.firstName} ${user.lastName}` : 'Ospite Scout'}
                    </p>
                    <p className="text-[10px] text-emerald-400 truncate">
                      {user?.groupName || 'Gruppo Scout'}
                    </p>
                  </div>

                  {/* Screen Shape Switcher (Useful for Testing & User Preference) */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 space-y-1.5">
                    <p className="text-[9px] uppercase font-bold text-zinc-400">Forma Smartwatch</p>
                    <div className="grid grid-cols-2 gap-1 text-center">
                      <button
                        onClick={() => setManualShape('round')}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all ${
                          isRound ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        ⭕ Samsung/Pixel
                      </button>
                      <button
                        onClick={() => setManualShape('rect')}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all ${
                          !isRound ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        ⬛ Apple Watch
                      </button>
                    </div>
                  </div>

                  {/* Escape Hatch: Switch to Full Website */}
                  <button
                    onClick={handleExitWatch}
                    className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                  >
                    <Monitor size={14} className="text-emerald-400" />
                    <span>Passa a Vista Completa</span>
                  </button>
                </div>
              )}
            </>
          )}
        </main>

        {/* ─── Bottom Micro Navigation Bar ───────────── */}
        <footer className={`flex items-center justify-around w-full pt-1.5 border-t border-zinc-900 shrink-0 ${isRound ? 'px-4' : 'px-1'}`}>
          <button
            onClick={() => setActiveTab('home')}
            className={`p-2 rounded-full transition-all active:scale-90 ${
              activeTab === 'home' ? 'text-emerald-400 bg-zinc-900' : 'text-zinc-500'
            }`}
            title="Oggi"
          >
            <Clock size={16} />
          </button>

          <button
            onClick={() => setActiveTab('eventi')}
            className={`p-2 rounded-full transition-all active:scale-90 ${
              activeTab === 'eventi' ? 'text-emerald-400 bg-zinc-900' : 'text-zinc-500'
            }`}
            title="Eventi"
          >
            <Calendar size={16} />
          </button>

          <button
            onClick={() => setActiveTab('avvisi')}
            className={`p-2 rounded-full relative transition-all active:scale-90 ${
              activeTab === 'avvisi' ? 'text-emerald-400 bg-zinc-900' : 'text-zinc-500'
            }`}
            title="Avvisi"
          >
            <Bell size={16} />
            {unreadNotifs.length > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('capi')}
            className={`p-2 rounded-full transition-all active:scale-90 ${
              activeTab === 'capi' ? 'text-emerald-400 bg-zinc-900' : 'text-zinc-500'
            }`}
            title="Membri CoCa"
          >
            <Users size={16} />
          </button>

          <button
            onClick={() => setActiveTab('opzioni')}
            className={`p-2 rounded-full transition-all active:scale-90 ${
              activeTab === 'opzioni' ? 'text-emerald-400 bg-zinc-900' : 'text-zinc-500'
            }`}
            title="Impostazioni"
          >
            <Monitor size={16} />
          </button>
        </footer>

        {/* ─── Event Detail Modal for Watch ───────────── */}
        {selectedEvento && (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 animate-in fade-in duration-150">
            <div className="overflow-y-auto watch-no-scrollbar space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span 
                  className="text-[9px] uppercase font-bold px-2 py-0.5 rounded text-black"
                  style={{ backgroundColor: getColorByBranca(selectedEvento.branca) }}
                >
                  {selectedEvento.branca}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {selectedEvento.oraInizio || 'Tutto il giorno'}
                </span>
              </div>

              <h3 className="text-sm font-bold text-white">{selectedEvento.titolo}</h3>

              <div className="space-y-1 text-xs text-zinc-300">
                <p className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                  <Calendar size={12} className="text-emerald-400 shrink-0" />
                  {new Date(selectedEvento.dataInizio).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>

                {selectedEvento.luogo && (
                  <p className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                    <MapPin size={12} className="text-emerald-400 shrink-0" />
                    {selectedEvento.luogo}
                  </p>
                )}

                {selectedEvento.note && (
                  <div className="bg-zinc-900 rounded-lg p-2 text-[10px] text-zinc-300 border border-zinc-800 mt-2">
                    {selectedEvento.note}
                  </div>
                )}
              </div>

              {selectedEvento.luogo && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvento.luogo)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold flex items-center justify-center gap-1.5 mt-2"
                >
                  <Compass size={14} className="text-emerald-400" />
                  <span>Apri Mappa</span>
                </a>
              )}
            </div>

            <button
              onClick={() => setSelectedEvento(null)}
              className="w-full py-2 mt-2 bg-emerald-600 active:bg-emerald-500 text-white rounded-xl text-xs font-bold shrink-0"
            >
              Chiudi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
