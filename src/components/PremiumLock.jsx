import React, { useState } from 'react';
import { Lock, Crown, X } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';

/**
 * PremiumLock — обёртка для контента, доступного только Premium-пользователям.
 *
 * Использование:
 *   <PremiumLock feature="Идеи для квестов">
 *     <MyPremiumComponent />
 *   </PremiumLock>
 *
 * Props:
 *   children   — контент, скрытый за замком
 *   feature    — название фичи (для подсказки)
 *   compact    — маленький вариант замка (без описания)
 */
const PremiumLock = ({ children, feature = 'эта функция', compact = false }) => {
    const { isPremium, loading } = useSubscription();
    const [showUpgrade, setShowUpgrade] = useState(false);

    if (loading) return null;

    // Если Premium — показываем контент без ограничений
    if (isPremium) return <>{children}</>;

    // Иначе показываем замок
    return (
        <>
            <div
                className="relative cursor-pointer select-none"
                onClick={() => setShowUpgrade(true)}
            >
                {/* Размытый превью контента */}
                <div className="pointer-events-none opacity-40 blur-[2px]">
                    {children}
                </div>

                {/* Оверлей с замком */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30 rounded-lg backdrop-blur-[1px]">
                    {compact ? (
                        <Lock size={20} className="text-[#E3D7B6]" />
                    ) : (
                        <>
                            <Crown size={28} className="text-yellow-400" />
                            <span className="text-white text-xs font-bold text-center px-2">
                                Premium
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Модальное окно апгрейда */}
            {showUpgrade && (
                <UpgradeModal
                    feature={feature}
                    onClose={() => setShowUpgrade(false)}
                />
            )}
        </>
    );
};

const UpgradeModal = ({ feature, onClose }) => {
    const { redeemPromoCode, redeeming } = useSubscription();
    const [promoCode, setPromoCode] = useState('');
    const [message, setMessage] = useState(null);

    const handleRedeem = async () => {
        if (!promoCode.trim()) return;
        const result = await redeemPromoCode(promoCode);
        setMessage(result);
        if (result.success) {
            setTimeout(onClose, 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#1a1b26] w-full max-w-sm rounded-2xl border border-yellow-500/30 shadow-2xl overflow-hidden">

                {/* Заголовок */}
                <div className="bg-gradient-to-r from-yellow-600/20 to-amber-500/10 px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Crown size={22} className="text-yellow-400" />
                        <h2 className="text-yellow-200 font-bold text-base">Premium</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <p className="text-gray-300 text-sm">
                        <span className="text-yellow-300 font-medium">{feature}</span> доступна только в Premium-плане.
                    </p>

                    {/* Список преимуществ */}
                    <div className="bg-white/5 rounded-xl p-3 space-y-1.5 text-xs text-gray-300">
                        <div className="flex items-center gap-2"><Crown size={12} className="text-yellow-400 shrink-0" />Любое расписание для квестов друзей</div>
                        <div className="flex items-center gap-2"><Crown size={12} className="text-yellow-400 shrink-0" />Идеи для квестов и подарков</div>
                        <div className="flex items-center gap-2"><Crown size={12} className="text-yellow-400 shrink-0" />Системные ивент-квесты</div>
                    </div>

                    {/* Промокод */}
                    <div className="space-y-2">
                        <p className="text-gray-400 text-xs">Есть промокод?</p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={promoCode}
                                onChange={e => setPromoCode(e.target.value.toUpperCase())}
                                onKeyDown={e => e.key === 'Enter' && handleRedeem()}
                                placeholder="ВВЕДИТЕ КОД"
                                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 uppercase tracking-widest"
                            />
                            <button
                                onClick={handleRedeem}
                                disabled={redeeming || !promoCode.trim()}
                                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                {redeeming ? '...' : 'OK'}
                            </button>
                        </div>

                        {message && (
                            <p className={`text-xs ${message.success ? 'text-green-400' : 'text-red-400'}`}>
                                {message.success ? message.message : message.error}
                            </p>
                        )}
                    </div>

                    {/* Кнопка оплаты (заглушка) */}
                    <button
                        onClick={() => alert("Оплата будет доступна позже (ЮKassa).")}
                        className="w-full py-2.5 bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 text-white rounded-xl font-bold text-sm transition-all shadow-lg"
                    >
                        Получить Premium ✨
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PremiumLock;
