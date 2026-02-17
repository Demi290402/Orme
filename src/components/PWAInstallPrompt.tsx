import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            // Show our custom prompt
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
            if (!isStandalone) {
                setShowPrompt(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the native install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleClose = () => {
        setShowPrompt(false);
        // Optionally set a cookie/localStorage to not show it again for a while
        localStorage.setItem('pwa-prompt-dismissed', 'true');
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white rounded-2xl shadow-2xl border-2 border-scout-green p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                        <div className="bg-scout-green/10 p-2 rounded-xl">
                            <Download className="text-scout-green" size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Vuoi scaricare l'app?</h3>
                            <p className="text-xs text-gray-500">Accedi più velocemente e usala come una vera app dal tuo telefono.</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleClose}
                        className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
                    >
                        No, grazie
                    </button>
                    <button
                        onClick={handleInstallClick}
                        className="flex-1 px-4 py-2 rounded-xl bg-scout-green text-white font-bold text-sm hover:bg-scout-green-dark transition-colors shadow-lg shadow-scout-green/20"
                    >
                        Sì, scarica
                    </button>
                </div>
            </div>
        </div>
    );
}
