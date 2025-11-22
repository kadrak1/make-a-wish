import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles } from 'lucide-react';

const LoginScreen = () => {
    const [nickname, setNickname] = useState('');
    const { login } = useAuth();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!nickname.trim()) return;

        setIsLoading(true);
        setError('');

        const result = await login(nickname.trim());

        if (!result.success) {
            setError('Ошибка входа: ' + result.error);
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-4">
            <div className="bg-[#16213e] p-8 rounded-2xl shadow-2xl border border-[#E3D7B6]/20 w-full max-w-md text-center">
                <div className="flex justify-center mb-6">
                    <Sparkles className="w-12 h-12 text-[#E3D7B6] animate-pulse" />
                </div>

                <h1 className="text-3xl font-bold text-[#E3D7B6] mb-2">Make a Wish</h1>
                <p className="text-gray-400 mb-8">Введите ваш никнейм, чтобы начать путешествие</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="Ваш никнейм"
                            className="w-full bg-[#0f3460] text-white px-4 py-3 rounded-lg border border-[#E3D7B6]/30 focus:border-[#E3D7B6] focus:outline-none transition-colors text-center text-lg placeholder-gray-500"
                            disabled={isLoading}
                        />
                    </div>

                    {error && (
                        <div className="text-red-400 text-sm bg-red-900/20 py-2 rounded-lg">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || !nickname.trim()}
                        className={`w-full py-3 rounded-full font-bold text-[#1a1a2e] transition-all duration-300 ${isLoading || !nickname.trim()
                                ? 'bg-gray-500 cursor-not-allowed'
                                : 'bg-[#E3D7B6] hover:bg-[#f0e6c8] hover:scale-105 shadow-lg shadow-[#E3D7B6]/20'
                            }`}
                    >
                        {isLoading ? 'Вход...' : 'Войти'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginScreen;
