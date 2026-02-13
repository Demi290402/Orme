import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { registerUser } from '@/lib/data';

export default function Register() {
    const navigate = useNavigate();
    const location = useLocation();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        nickname: '',
        email: '',
        password: ''
    });
    const [error, setError] = useState('');

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
            setError('Compila tutti i campi obbligatori.');
            return;
        }

        try {
            registerUser({
                firstName: formData.firstName,
                lastName: formData.lastName,
                nickname: formData.nickname,
                email: formData.email,
                // In a real app, never store plain text passwords!
            });
            // Redirect to the page they were trying to access, or home if none
            const from = (location.state as any)?.from?.pathname || '/';
            navigate(from, { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Errore durante la registrazione');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-scout-beige-light p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
                <div className="flex justify-center mb-6">
                    <div className="bg-scout-brown p-4 rounded-full shadow-lg">
                        <UserPlus size={40} className="text-white" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-center text-scout-green mb-2">Unisciti al Branco</h1>
                <p className="text-center text-gray-500 mb-8">Crea il tuo profilo scout.</p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-center text-sm font-bold border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Nome*</label>
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                                className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-scout-green"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Cognome*</label>
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                                className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-scout-green"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nickname (Totem)</label>
                        <input
                            type="text"
                            value={formData.nickname}
                            onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                            className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-scout-green"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Email*</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-scout-green"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Password*</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                            className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-scout-green"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-scout-green text-white font-bold py-3 rounded-xl shadow-md hover:bg-scout-green-dark transition-colors mt-4"
                    >
                        Registrati
                    </button>
                </form>

                <p className="text-center mt-6 text-sm text-gray-500">
                    Hai già un account? <Link to="/login" className="text-scout-brown font-bold hover:underline">Accedi</Link>
                </p>
            </div>
        </div>
    );
}
