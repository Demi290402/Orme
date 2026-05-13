import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ShieldCheck, Lock, Eye, FileText, Database, ShieldAlert } from 'lucide-react';

export default function PrivacyPolicy() {
    const navigate = useNavigate();

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-2xl font-bold dark:text-white">Privacy Policy</h1>
            </div>

            {/* Introduction Card */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                <div className="w-12 h-12 bg-scout-green/10 rounded-2xl flex items-center justify-center text-scout-green">
                    <ShieldCheck size={28} />
                </div>
                <h2 className="text-xl font-bold dark:text-white">Il nostro impegno per la tua Privacy</h2>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">
                    In <strong>Orme</strong>, la protezione dei dati dei capi e dei gruppi scout è la nostra priorità. 
                    Questa informativa spiega come raccogliamo, utilizziamo e proteggiamo le tue informazioni.
                </p>
                <p className="text-[10px] text-gray-400">Ultimo aggiornamento: 13 Maggio 2026</p>
            </div>

            {/* Sections */}
            <div className="grid grid-cols-1 gap-4">
                <PolicySection 
                    icon={<Database className="text-blue-500" />}
                    title="Quali dati raccogliamo?"
                    content="Raccogliamo dati necessari al funzionamento del servizio: nome, cognome, nickname (totem), email (per l'autenticazione), gruppo scout di appartenenza e codice socio (opzionale). I dati sui luoghi inseriti sono condivisi con la comunità capi."
                />
                
                <PolicySection 
                    icon={<Lock className="text-scout-green" />}
                    title="Come proteggiamo i tuoi dati?"
                    content="Utilizziamo infrastrutture sicure basate su Supabase e PostgreSQL con cifratura a riposo e in transito (SSL). Tutti i dati sensibili sono protetti da Row Level Security (RLS) che garantisce che solo i membri del tuo gruppo possano vedere i verbali di gruppo."
                />

                <PolicySection 
                    icon={<Eye className="text-amber-500" />}
                    title="Chi può vedere le informazioni?"
                    content="I luoghi e le recensioni sono visibili a tutti gli utenti dell'app per favorire lo scambio scout. I verbali di comunità capi, invece, sono rigorosamente protetti: solo i membri autorizzati del tuo specifico gruppo possono accedervi."
                />

                <PolicySection 
                    icon={<ShieldAlert className="text-red-500" />}
                    title="Eliminazione Dati"
                    content="In ogni momento puoi richiedere l'eliminazione del tuo account e dei tuoi dati personali dalle impostazioni del profilo. Le proposte di modifica approvate rimarranno nel sistema in forma anonima per preservare l'utilità del database dei luoghi."
                />

                <PolicySection 
                    icon={<FileText className="text-purple-500" />}
                    title="Consenso"
                    content="Utilizzando l'applicazione Orme, acconsenti al trattamento dei dati come descritto in questa informativa. Non vendiamo né condividiamo i tuoi dati con terze parti a scopi pubblicitari."
                />
            </div>

            <div className="bg-scout-blue/5 dark:bg-blue-900/10 p-6 rounded-3xl border border-scout-blue/10 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-black tracking-widest mb-2">Contatti</p>
                <p className="text-sm dark:text-gray-300">
                    Per domande sulla privacy contattaci presso il tuo rappresentante di zona o via email.
                </p>
            </div>
        </div>
    );
}

function PolicySection({ icon, title, content }: { icon: React.ReactNode, title: string, content: string }) {
    return (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex gap-4">
            <div className="shrink-0 mt-1">
                {icon}
            </div>
            <div className="space-y-1">
                <h3 className="font-bold dark:text-white text-sm">{title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {content}
                </p>
            </div>
        </div>
    );
}
