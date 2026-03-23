import React, { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { RefreshCw, Loader2 } from 'lucide-react';

const UpdateManager: React.FC = () => {
  const [checking, setChecking] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    // Imposta un timeout di sicurezza per nascondere il messaggio di "Ricerca"
    // se il Service Worker non risponde o è già aggiornato
    const timer = setTimeout(() => {
      setChecking(false);
    }, 2500);

    const updateSW = registerSW({
      onNeedRefresh() {
        setChecking(false);
        setUpdating(true);
        // Ritardo minimo per far leggere il messaggio all'utente
        setTimeout(() => {
          updateSW(true);
        }, 1500);
      },
      onOfflineReady() {
        setChecking(false);
        console.log('App pronta per uso offline.');
      },
      onRegisteredSW(_swUrl, r) {
        // Forza il controllo degli aggiornamenti ogni volta che l'app viene aperta
        if (r) {
          r.update();
        }
      }
    });

    return () => clearTimeout(timer);
  }, []);

  if (updating) {
    return (
      <div className="fixed inset-0 z-[9999] bg-scout-blue flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="bg-white/10 p-6 rounded-full animate-bounce mb-6">
          <RefreshCw size={48} className="animate-spin" />
        </div>
        <h2 className="text-2xl font-black mb-2">Aggiornamento in corso...</h2>
        <p className="opacity-80 font-medium">L'applicazione si riavvierà tra un istante con l'ultima versione.</p>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-white shadow-2xl rounded-full px-6 py-3 border border-gray-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
        <Loader2 size={18} className="text-scout-blue animate-spin" />
        <span className="text-sm font-bold text-gray-700 whitespace-nowrap">Ricerca di aggiornamenti in corso...</span>
      </div>
    );
  }

  return null;
};

export default UpdateManager;
