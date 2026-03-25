import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { loginUser } from '@/lib/data';
import Logo from '@/components/Logo';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const user = await loginUser(email, password);

            if (user) {
                const from = (location.state as any)?.from?.pathname || '/';
                navigate(from, { replace: true });
            } else {
                setError('Credenziali non valide. Riprova o registrati.');
            }
        } catch (err) {
            setError('Errore durante il login. Riprova.');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-scout-beige-light dark:bg-gray-900 p-4">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 dark:border-gray-700">
                <div className="flex justify-center mb-6">
                    <Logo className="h-24 w-auto" />
                </div>

                <h1 className="text-2xl font-bold text-center text-scout-brown dark:text-amber-400 mb-2">Benvenuto in Orme</h1>
                <p className="text-center text-gray-500 dark:text-gray-400 mb-8">Accedi per lasciare il tuo segno.</p>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 p-3 rounded-lg mb-4 text-center text-sm font-bold border border-red-100 dark:border-red-800">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-scout-green dark:placeholder-gray-400"
                            placeholder="turi1@scout.it"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-scout-green dark:placeholder-gray-400"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-scout-green text-white font-bold py-3 rounded-xl shadow-md hover:bg-scout-green-dark transition-colors"
                    >
                        Accedi
                    </button>
                </form>

                <p className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
                    Non hai un account? <Link to="/register" className="text-scout-brown dark:text-amber-400 font-bold hover:underline">Registrati</Link>
                </p>
            </div>
        </div>
    );
}
