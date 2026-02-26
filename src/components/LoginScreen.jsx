import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const LoginScreen = () => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [nickname, setNickname] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [shake, setShake] = useState(false);

    const { login, signup } = useAuth();

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!nickname.trim()) {
            setError('Введите логин');
            triggerShake();
            return;
        }
        if (!password.trim()) {
            setError('Введите пароль');
            triggerShake();
            return;
        }

        setIsLoading(true);

        const result = isRegistering
            ? await signup(nickname.trim(), password)
            : await login(nickname.trim(), password);

        if (!result.success) {
            setError(result.error || 'Неизвестная ошибка');
            triggerShake();
        }

        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-4">
            <motion.div
                animate={shake ? { x: [-10, 10, -8, 8, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="bg-[#16213e] p-8 rounded-2xl shadow-2xl border border-[#E3D7B6]/20 w-full max-w-md text-center"
            >
                <div className="flex justify-center mb-6">
                    <Sparkles className="w-12 h-12 text-[#E3D7B6] animate-pulse" />
                </div>

                <h1 className="text-3xl font-bold text-[#E3D7B6] mb-2">Make a Wish</h1>
                <p className="text-gray-400 mb-8 text-sm">
                    {isRegistering ? 'Создайте свою легенду' : 'Вернитесь в свою обитель'}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#E3D7B6] transition-colors">
                            <User size={18} />
                        </div>
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => { setNickname(e.target.value); setError(''); }}
                            placeholder="Логин"
                            className="w-full bg-[#0f3460] text-white pl-10 pr-4 py-3 rounded-lg border border-[#E3D7B6]/30 focus:border-[#E3D7B6] focus:outline-none transition-all text-lg placeholder-gray-500"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#E3D7B6] transition-colors">
                            <Lock size={18} />
                        </div>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(''); }}
                            placeholder="Пароль"
                            className="w-full bg-[#0f3460] text-white pl-10 pr-12 py-3 rounded-lg border border-[#E3D7B6]/30 focus:border-[#E3D7B6] focus:outline-none transition-all text-lg placeholder-gray-500 font-mono"
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#E3D7B6] transition-colors"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/30 py-2.5 px-3 rounded-lg border border-red-500/20">
                            <AlertCircle size={14} className="flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-3.5 rounded-full font-bold text-[#1a1a2e] transition-all duration-300 ${isLoading
                                ? 'bg-gray-500 cursor-not-allowed opacity-50'
                                : 'bg-[#E3D7B6] hover:bg-[#f0e6c8] hover:scale-[1.02] active:scale-95 shadow-lg shadow-[#E3D7B6]/20'
                            }`}
                    >
                        {isLoading
                            ? (isRegistering ? 'Создание...' : 'Вход...')
                            : (isRegistering ? 'Зарегистрироваться' : 'Войти')}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-[#E3D7B6]/10">
                    <p className="text-gray-400 text-sm">
                        {isRegistering ? 'Уже есть аккаунт?' : 'Впервые здесь?'}
                        <button
                            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                            className="ml-2 text-[#E3D7B6] font-bold hover:text-[#f0e6c8] transition-colors underline underline-offset-2 decoration-dotted"
                        >
                            {isRegistering ? 'Войти' : 'Создать аккаунт'}
                        </button>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default LoginScreen;
