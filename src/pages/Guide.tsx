import {
    BookOpen,
    Trophy,
    Smartphone,
    CheckCircle2,
    PlusCircle,
    Edit3,
    Zap,
    Info,
    ChevronRight,
    Clock
} from 'lucide-react';
import { LEVELS } from '@/lib/gamification';
import { cn } from '@/lib/utils';

export default function Guide() {
    const pointRules = [
        { action: 'Aggiunta nuovo luogo', points: 10, icon: <PlusCircle size={18} className="text-scout-green" /> },
        { action: 'Aggiunta sito web', points: 2, icon: <Zap size={18} className="text-scout-blue" /> },
        { action: 'Aggiunta Indirizzo/Maps/GPS', points: 3, icon: <Zap size={18} className="text-scout-blue" /> },
        { action: 'Inserimento prezzi e tariffe', points: 5, icon: <Zap size={18} className="text-scout-blue" /> },
        { action: 'Approvazione modifica (Capi)', points: 5, icon: <CheckCircle2 size={18} className="text-scout-green" /> },
        { action: 'Proposta modifica o eliminazione approvata (Autore)', points: 10, icon: <Edit3 size={18} className="text-scout-brown" /> },
    ];

    const stalenessRules = [
        { label: 'Aggiornato di recente', desc: 'Meno di 1 anno fa', color: 'bg-green-500' },
        { label: 'Da verificare', desc: 'Più di 1 anno fa', color: 'bg-yellow-500' },
        { label: 'Potrebbe essere cambiato', desc: 'Più di 2 anni fa', color: 'bg-orange-500' },
        { label: 'Molto datato', desc: 'Più di 3 anni fa', color: 'bg-red-500' },
    ];

    return (
        <div className="space-y-8 pb-24">
            <div className="text-center py-6">
                <h1 className="text-3xl font-bold text-scout-green mb-2">Guida Orme</h1>
                <p className="text-gray-500">Tutto quello che c'è da sapere per usare al meglio l'app.</p>
            </div>

            {/* 1. Come usare l'app */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-scout-brown mb-4 flex items-center gap-2">
                    <BookOpen /> Come usare l'app
                </h2>
                <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
                    <p>
                        Orme è progettata per essere rapida e utile durante la programmazione dei campi.
                    </p>
                    <ul className="space-y-3">
                        <li className="flex gap-3">
                            <div className="bg-scout-green/10 p-1.5 h-fit rounded-lg">
                                <ChevronRight size={14} className="text-scout-green" />
                            </div>
                            <span><strong>Cerca:</strong> Usa la barra di ricerca in home per trovare luoghi per nome, comune o attività. Puoi anche filtrare per specifiche attività scout.</span>
                        </li>
                        <li className="flex gap-3">
                            <div className="bg-scout-green/10 p-1.5 h-fit rounded-lg">
                                <ChevronRight size={14} className="text-scout-green" />
                            </div>
                            <span><strong>Aggiungi:</strong> Se conosci un posto non presente, clicca sul "+" in home. Più dettagli metti, più punti guadagni!</span>
                        </li>
                        <li className="flex gap-3">
                            <div className="bg-scout-green/10 p-1.5 h-fit rounded-lg">
                                <ChevronRight size={14} className="text-scout-green" />
                            </div>
                            <span><strong>Modifica:</strong> Se vedi informazioni sbagliate, proponi una modifica. La tua proposta verrà salvata appena 2 capi la approvano.</span>
                        </li>
                    </ul>
                </div>
            </section>

            {/* 2. Guida ai Livelli */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-scout-blue mb-4 flex items-center gap-2">
                    <Trophy className="text-scout-blue" /> Guida ai Livelli
                </h2>
                <p className="text-sm text-gray-500 mb-6 font-medium">Scala la vetta e personalizza il tuo profilo con i colori dei livelli.</p>

                <div className="space-y-3">
                    {LEVELS.map((lvl) => (
                        <div key={lvl.level} className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                            <div
                                className="w-12 h-12 rounded-full border-4 shrink-0 bg-white flex items-center justify-center font-bold text-gray-400"
                                style={{ borderColor: lvl.color }}
                            >
                                {lvl.level}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 text-sm">{lvl.name}</h3>
                                <p className="text-xs text-gray-500">{lvl.min} - {lvl.max === Infinity ? '∞' : lvl.max} punti</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 3. Regolamento Punti */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-scout-green mb-4 flex items-center gap-2">
                    <Zap className="text-yellow-500" /> Regolamento Punteggi
                </h2>

                <div className="grid grid-cols-1 gap-3">
                    {pointRules.map((rule, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex items-center gap-3">
                                {rule.icon}
                                <span className="text-sm font-medium text-gray-700">{rule.action}</span>
                            </div>
                            <span className="font-bold text-scout-green">+{rule.points} pt</span>
                        </div>
                    ))}
                </div>

                <div className="mt-6 p-4 bg-orange-50 rounded-xl border border-orange-100 flex gap-3">
                    <Info className="text-orange-600 shrink-0" size={20} />
                    <p className="text-xs text-orange-800 leading-normal">
                        <strong>Penalità:</strong> Se una tua proposta viene rigettata da 2 capi perché ritenuta palesemente errata o dannosa, ti verranno detratti <strong>15 punti</strong>.
                    </p>
                </div>
            </section>

            {/* 4. Stato dei Dati */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-scout-brown mb-4 flex items-center gap-2">
                    <Clock className="text-scout-brown" /> Legenda Stato Dati
                </h2>
                <p className="text-sm text-gray-500 mb-6">Un pallino colorato sulla scheda indica quanto sono recenti le informazioni.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {stalenessRules.map((rule, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl border border-gray-100">
                            <div className={cn("w-3 h-3 rounded-full shrink-0 animate-pulse", rule.color)} />
                            <div>
                                <h4 className="text-xs font-bold text-gray-900">{rule.label}</h4>
                                <p className="text-[10px] text-gray-500">{rule.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 5. Installazione App */}
            <section className="bg-scout-brown/5 p-6 rounded-2xl border border-scout-brown/10">
                <h2 className="text-xl font-bold text-scout-brown mb-4 flex items-center gap-2">
                    <Smartphone /> Scaricare l'app (PWA)
                </h2>
                <p className="text-sm text-gray-700 mb-6 leading-relaxed">
                    Puoi installare Orme sul tuo smartphone per aprirla come una vera app, senza usare il browser. L'icona apparirà tra le tue app!
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <span className="bg-gray-100 p-1 rounded"></span> iPhone / iOS (Safari)
                        </h3>
                        <ol className="text-xs text-gray-600 space-y-2 list-decimal ml-4">
                            <li>Apri il sito su <strong>Safari</strong>.</li>
                            <li>Tocca il tasto <strong>Condividi</strong> (quadrato con freccia su).</li>
                            <li>Scorri e tocca <strong>"Aggiungi alla schermata Home"</strong>.</li>
                            <li>Conferma cliccando su <strong>Aggiungi</strong>.</li>
                        </ol>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <span className="bg-gray-100 p-1 rounded text-green-600">🤖</span> Android (Chrome)
                        </h3>
                        <ol className="text-xs text-gray-600 space-y-2 list-decimal ml-4">
                            <li>Apri il sito su <strong>Chrome</strong>.</li>
                            <li>Tocca i <strong>tre puntini</strong> in alto a destra.</li>
                            <li>Seleziona <strong>"Installa app"</strong> o "Aggiungi a schermata Home".</li>
                            <li>Clicca sul pulsante <strong>"Sì, scarica"</strong> nel pop-up che appare nell'app.</li>
                        </ol>
                    </div>
                </div>

                <p className="text-[10px] text-center text-gray-400 mt-6 italic">
                    L'app si aggiornerà da sola ogni volta che aggiungeremo nuove funzionalità!
                </p>
            </section>

            <div className="text-center text-xs text-gray-400 py-4">
                <p>© 2026 Orme - Comunità Capi Turi 1</p>
            </div>
        </div>
    );
}
