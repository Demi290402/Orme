import { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        const isDismissed = localStorage.getItem('pwa-prompt-dismissed') === 'true';
        if (isDismissed) return;

        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
        if (isStandalone) return;

        // Detect iOS device
        const ua = window.navigator.userAgent.toLowerCase();
        const iOSDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;

        if (iOSDevice) {
            setIsIOS(true);
            setShowPrompt(true);
            return;
        }

        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setShowPrompt(false);
        }
        setDeferredPrompt(null);
    };

    const handleClose = () => {
        setShowPrompt(false);
        localStorage.setItem('pwa-prompt-dismissed', 'true');
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-[100] max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border-2 border-scout-green p-5 flex flex-col gap-3.5">
                <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                        <div className="bg-scout-green/10 dark:bg-emerald-950/40 p-2.5 rounded-2xl shrink-0">
                            <Download className="text-scout-green" size={24} />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-gray-900 dark:text-white text-base">
                                {isIOS ? "Installa Orme sul tuo iPhone" : "Vuoi scaricare l'app Orme?"}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Accedi più velocemente direttamente dalla schermata Home, senza aprire il browser.
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                {isIOS ? (
                    <div className="bg-gray-50 dark:bg-gray-900/60 rounded-2xl p-3.5 border border-gray-150 dark:border-gray-700/60 space-y-2 text-xs">
                        <p className="font-bold text-gray-700 dark:text-gray-300">Come installare in 2 passi facili:</p>
                        <ol className="space-y-1.5 text-gray-600 dark:text-gray-400">
                            <li className="flex items-center gap-2">
                                <span className="font-black text-scout-green">1.</span>
                                <span>Tocca il pulsante <strong className="text-gray-800 dark:text-gray-200">Condividi</strong> in basso in Safari</span>
                                <Share size={15} className="text-scout-blue shrink-0 inline" />
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="font-black text-scout-green">2.</span>
                                <span>Scorri e tocca <strong className="text-gray-800 dark:text-gray-200">"Aggiungi alla schermata Home"</strong></span>
                                <PlusSquare size={15} className="text-scout-green shrink-0 inline" />
                            </li>
                        </ol>
                        <div className="pt-2">
                            <button
                                onClick={handleClose}
                                className="w-full py-2.5 rounded-xl bg-scout-green text-white font-extrabold text-xs hover:bg-scout-green-dark transition-colors text-center cursor-pointer"
                            >
                                Ho capito, grazie!
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <button
                            onClick={handleClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold text-xs hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer"
                        >
                            Non ora
                        </button>
                        <button
                            onClick={handleInstallClick}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-scout-green text-white font-extrabold text-xs hover:bg-scout-green-dark transition-colors shadow-lg shadow-scout-green/20 cursor-pointer"
                        >
                            Installa App
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
