import { useState } from 'react';
import { Share2, Copy, Check, MessageCircle, Send, X, Shield, Sparkles, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShareAppModalProps {
    isOpen: boolean;
    onClose: () => void;
    inviterName?: string;
    inviterGroup?: string;
}

export default function ShareAppModal({ isOpen, onClose, inviterName, inviterGroup }: ShareAppModalProps) {
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedMessage, setCopiedMessage] = useState(false);

    if (!isOpen) return null;

    const inviteUrl = `${window.location.origin}/register`;

    const shareTitle = "Unisciti ad Orme - La piattaforma per Capi Scout AGESCI";
    const shareMessage = `⚜️ Ciao! ${inviterName ? `${inviterName} ti invita` : 'Ti invito'} a salire a bordo di Orme, l'applicazione pensata per i Capi scout dell'AGESCI per cercare e censire luoghi per campi ed uscite, consultare verbali di CoCa, gestire calendario, inventario e lista d'attesa.

Iscriviti e seleziona il tuo gruppo scout (oppure creane uno nuovo con un clic se non è ancora censito):
${inviteUrl}

Buona caccia e buona strada! 🐾`;

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: shareTitle,
                    text: shareMessage,
                    url: inviteUrl
                });
            } catch (err) {
                // User cancelled or share failed
            }
        } else {
            handleCopyLink();
        }
    };

    const handleWhatsApp = () => {
        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
        window.open(waUrl, '_blank');
    };

    const handleTelegram = () => {
        const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(shareMessage)}`;
        window.open(tgUrl, '_blank');
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(inviteUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2200);
    };

    const handleCopyMessage = () => {
        navigator.clipboard.writeText(shareMessage);
        setCopiedMessage(true);
        setTimeout(() => setCopiedMessage(false), 2200);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl border border-gray-150 dark:border-gray-800 max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-scout-green/10 dark:bg-emerald-950/40 text-scout-green flex items-center justify-center shrink-0">
                            <Share2 size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">Invita un Capo su Orme</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Condividi l'applicazione con altri Capi scout</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Important Privacy / Group Autonomy Notice */}
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                        <Shield size={16} className="shrink-0" />
                        <span className="text-xs font-black uppercase tracking-wider">Privacy e Autonomia dei Gruppi</span>
                    </div>
                    <p className="text-xs text-amber-900 dark:text-amber-200/90 leading-relaxed">
                        L'invito è aperto a <strong>qualsiasi capo scout d'Italia</strong>: chi riceve l'invito <strong>non entrerà automaticamente nella tua Comunità Capi</strong>.
                    </p>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-normal">
                        Durante la registrazione potrà selezionare liberamente il proprio gruppo (o <strong>crearne uno nuovo</strong> se non è ancora presente).
                        {inviterGroup && (
                            <span className="block mt-1 font-semibold">
                                💡 Se invece vuoi invitare un capo proprio del tuo gruppo ({inviterGroup}), ricordagli di inserire anche il vostro PIN CoCa!
                            </span>
                        )}
                    </p>
                </div>

                {/* Direct Link Box */}
                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                        <Compass size={13} className="text-scout-green" />
                        Link di Registrazione Diretto
                    </label>
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700">
                        <input
                            type="text"
                            readOnly
                            value={inviteUrl}
                            className="flex-1 bg-transparent text-xs font-mono text-gray-800 dark:text-gray-200 outline-none select-all"
                        />
                        <button
                            type="button"
                            onClick={handleCopyLink}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer shrink-0",
                                copiedLink
                                    ? "bg-scout-green text-white shadow-sm"
                                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-100"
                            )}
                        >
                            {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                            {copiedLink ? 'Copiato!' : 'Copia link'}
                        </button>
                    </div>
                </div>

                {/* Quick Sharing Action Buttons */}
                <div className="space-y-2 pt-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Condividi con un clic</p>
                    
                    <div className="grid grid-cols-2 gap-2">
                        {/* WhatsApp */}
                        <button
                            type="button"
                            onClick={handleWhatsApp}
                            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                            <MessageCircle size={16} />
                            WhatsApp
                        </button>

                        {/* Telegram */}
                        <button
                            type="button"
                            onClick={handleTelegram}
                            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                            <Send size={16} />
                            Telegram
                        </button>
                    </div>

                    {/* Native Device Share (Mobile) */}
                    {typeof navigator !== 'undefined' && 'share' in navigator && (
                        <button
                            type="button"
                            onClick={handleNativeShare}
                            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                        >
                            <Share2 size={16} />
                            Altre opzioni di condivisione del telefono
                        </button>
                    )}

                    {/* Copy Full Text */}
                    <button
                        type="button"
                        onClick={handleCopyMessage}
                        className={cn(
                            "w-full flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-black transition-all cursor-pointer",
                            copiedMessage
                                ? "bg-scout-green text-white border-scout-green shadow-sm"
                                : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                        )}
                    >
                        {copiedMessage ? <Check size={14} /> : <Copy size={14} />}
                        {copiedMessage ? 'Messaggio completo copiato!' : 'Copia messaggio completo con invito'}
                    </button>
                </div>

                {/* Preview Accordion */}
                <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-3.5 border border-gray-150 dark:border-gray-750 text-[11px] text-gray-600 dark:text-gray-400 space-y-1">
                    <p className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                        <Sparkles size={12} className="text-amber-500" />
                        Anteprima testo invito:
                    </p>
                    <p className="italic leading-relaxed whitespace-pre-line text-[10px]">
                        {shareMessage}
                    </p>
                </div>
            </div>
        </div>
    );
}
