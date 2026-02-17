import { useState, useEffect } from 'react';
import { Footprints, ShieldCheck, Users } from 'lucide-react';
import { User } from '@/types';
import { getAllUsers } from '@/lib/data';
import UserAvatar from '@/components/UserAvatar';

export default function About() {
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        getAllUsers().then(setUsers).catch(console.error);
    }, []);

    return (
        <div className="space-y-6 pb-20">
            <div className="text-center py-8">
                <h1 className="text-3xl font-bold text-scout-green mb-2">Chi Siamo</h1>
                <p className="text-gray-500 italic">"Lasciare tracce utili, aggiornate e facili da seguire."</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="font-bold text-xl mb-4 text-scout-brown flex items-center gap-2">
                    <Footprints size={24} /> Il Problema
                </h2>
                <p className="text-gray-600 leading-relaxed">
                    Le informazioni sui luoghi per i campi sono sparse ovunque: file Drive dimenticati,
                    vecchie chat WhatsApp, appunti personali o "sentito dire". Spesso arriviamo in un posto
                    e scopriamo che l'acqua non è più potabile o il numero del custode è cambiato.
                </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="font-bold text-xl mb-4 text-scout-green flex items-center gap-2">
                    <Users size={24} /> La Soluzione: Orme
                </h2>
                <p className="text-gray-600 leading-relaxed">
                    Un database centralizzato, condiviso e aggiornato da noi, la comunità capi del Turi 1.
                    Ogni volta che qualcuno visita un luogo, aggiorna le informazioni per chi verrà dopo.
                </p>
            </div>

            <div className="bg-scout-green/10 p-6 rounded-2xl border border-scout-green/20">
                <h2 className="font-bold text-xl mb-4 text-scout-green-dark flex items-center gap-2">
                    <ShieldCheck size={24} /> Validazione
                </h2>
                <p className="text-gray-700 leading-relaxed text-sm mb-4">
                    Per garantire l'affidabilità, ogni modifica importante richiede l'approvazione di altri
                    2 capi. Le informazioni verificate diventano "Orme" affidabili.
                </p>

                <h3 className="font-bold text-scout-green-dark mb-3 mt-6 border-t border-scout-green/20 pt-4">Hanno accesso all'app:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {users.length === 0 ? (
                        <p className="text-gray-400 text-sm col-span-2 text-center py-4">Nessun utente registrato ancora.</p>
                    ) : (
                        users.map(user => (
                            <div key={user.id} className="flex items-center gap-3 bg-white/50 p-2 rounded-xl">
                                <UserAvatar user={user} size="sm" />
                                <div>
                                    <p className="font-bold text-gray-900 text-sm">{user.firstName} {user.lastName}</p>
                                    <p className="text-xs text-scout-green font-medium">@{user.nickname}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="text-center text-xs text-gray-400 mt-8">
                <p>Fondatore: Demi Cistulli</p>
                <p>Gruppo Scout Turi 1</p>
            </div>
        </div>
    );
}
