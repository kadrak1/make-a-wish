import React, { useState } from 'react';
import { X, Volume2, VolumeX, Trash2, Settings, Crown, Sparkles } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';

const SettingsModal = ({
    isOpen,
    onClose,
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    onResetData
}) => {
    const { isPremium, expiresAtFormatted, redeemPromoCode, redeeming } = useSubscription();
    const [promoCode, setPromoCode] = useState('');
    const [promoMessage, setPromoMessage] = useState(null);

    if (!isOpen) return null;

    const handleRedeem = async () => {
        if (!promoCode.trim()) return;
        const result = await redeemPromoCode(promoCode);
        setPromoMessage(result);
        if (result.success) {
            setPromoCode('');
            setTimeout(() => setPromoMessage(null), 4000);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#F4F4F5] w-full max-w-sm md:max-w-md rounded-xl border-2 border-[#E3D7B6] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="bg-[#E3D7B6] px-4 py-3 md:px-6 flex items-center justify-between">
                    <h2 className="text-[#8E7C68] font-bold text-base md:text-lg uppercase tracking-wider flex items-center gap-2">
                        <Settings size={18} className="md:w-5 md:h-5" />
                        Настройки
                    </h2>
                    <button onClick={onClose} className="text-[#8E7C68] hover:text-[#5c4d3c] transition-colors">
                        <X size={20} className="md:w-6 md:h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 md:p-6 space-y-5">

                    {/* Подписка */}
                    <div className="space-y-3">
                        <h3 className="text-[#8E7C68] text-xs md:text-sm font-bold uppercase tracking-widest">Подписка</h3>

                        {isPremium ? (
                            <div className="bg-gradient-to-r from-yellow-500/10 to-amber-400/5 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-3">
                                <Crown size={22} className="text-yellow-400 shrink-0" />
                                <div>
                                    <p className="text-yellow-200 font-bold text-sm">Premium активен</p>
                                    {expiresAtFormatted && (
                                        <p className="text-yellow-200/60 text-xs">до {expiresAtFormatted}</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white border border-[#E3D7B6]/50 rounded-xl p-4 space-y-3 shadow-sm">
                                <div className="flex items-center gap-2 text-[#8E7C68]">
                                    <Crown size={16} className="text-yellow-500" />
                                    <span className="text-sm font-medium">Free план</span>
                                </div>

                                {/* Промокод */}
                                <div className="space-y-2">
                                    <p className="text-[#8E7C68]/70 text-xs">Промокод для активации Premium:</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={promoCode}
                                            onChange={e => setPromoCode(e.target.value.toUpperCase())}
                                            onKeyDown={e => e.key === 'Enter' && handleRedeem()}
                                            placeholder="ВВЕДИТЕ КОД"
                                            className="flex-1 bg-[#F4F4F5] border border-[#E3D7B6] rounded-lg px-3 py-2 text-[#8E7C68] text-sm placeholder-[#8E7C68]/40 focus:outline-none focus:border-[#8E7C68] uppercase tracking-wider"
                                        />
                                        <button
                                            onClick={handleRedeem}
                                            disabled={redeeming || !promoCode.trim()}
                                            className="px-4 py-2 bg-[#E3D7B6] text-[#8E7C68] rounded-lg text-sm font-bold hover:bg-[#d4c4a0] disabled:opacity-50 transition-colors"
                                        >
                                            {redeeming ? '...' : 'OK'}
                                        </button>
                                    </div>
                                    {promoMessage && (
                                        <p className={`text-xs ${promoMessage.success ? 'text-green-600' : 'text-red-500'}`}>
                                            {promoMessage.success ? promoMessage.message : promoMessage.error}
                                        </p>
                                    )}
                                </div>

                                <button
                                    onClick={() => alert("Оплата будет доступна позже (ЮKassa).")}
                                    className="w-full py-2 bg-gradient-to-r from-yellow-500 to-amber-400 text-white rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
                                >
                                    <Sparkles size={14} className="inline mr-1" />
                                    Получить Premium
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Звук */}
                    <div className="space-y-3">
                        <h3 className="text-[#8E7C68] text-xs md:text-sm font-bold uppercase tracking-widest">Звук</h3>
                        <div className="flex items-center gap-3 bg-white p-3 md:p-4 rounded-lg border border-[#E3D7B6]/50 shadow-sm">
                            <button
                                onClick={() => setIsMuted(!isMuted)}
                                className="p-2 bg-[#F4F4F5] rounded-full hover:bg-[#E3D7B6]/20 transition-colors text-[#8E7C68]"
                            >
                                {isMuted || volume === 0
                                    ? <VolumeX size={20} className="md:w-6 md:h-6" />
                                    : <Volume2 size={20} className="md:w-6 md:h-6" />
                                }
                            </button>
                            <div className="flex-1">
                                <input
                                    type="range"
                                    min="0" max="1" step="0.1"
                                    value={isMuted ? 0 : volume}
                                    onChange={e => {
                                        setVolume(parseFloat(e.target.value));
                                        setIsMuted(false);
                                    }}
                                    className="w-full h-2 bg-[#E3D7B6]/30 rounded-lg appearance-none cursor-pointer
                                        [&::-webkit-slider-thumb]:appearance-none
                                        [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                                        [&::-webkit-slider-thumb]:bg-[#E3D7B6] [&::-webkit-slider-thumb]:rounded-full
                                        [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Данные */}
                    <div className="space-y-3">
                        <h3 className="text-[#8E7C68] text-xs md:text-sm font-bold uppercase tracking-widest">Данные</h3>
                        <div className="bg-red-50 p-3 md:p-4 rounded-lg border border-red-200">
                            <p className="text-red-800/70 text-xs md:text-sm mb-4 leading-relaxed">
                                Сброс удалит весь прогресс: Камни Истока, Молитвы, историю круток и задания. Это необратимо.
                            </p>
                            <button
                                onClick={() => {
                                    if (window.confirm('Сбросить весь прогресс? Это действие необратимо.')) {
                                        onResetData();
                                    }
                                }}
                                className="w-full py-2 md:py-3 px-4 bg-white hover:bg-red-50 text-red-500 border border-red-200 hover:border-red-300 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                            >
                                <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
                                Сбросить прогресс
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
