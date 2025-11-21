import React from 'react';
import { X, Volume2, VolumeX, Trash2, Settings } from 'lucide-react';

const SettingsModal = ({
    isOpen,
    onClose,
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    onResetData
}) => {
    if (!isOpen) return null;

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
                <div className="p-4 md:p-6 space-y-6">

                    {/* Sound Settings */}
                    <div className="space-y-3 md:space-y-4">
                        <h3 className="text-[#8E7C68] text-xs md:text-sm font-bold uppercase tracking-widest">Звук</h3>
                        <div className="flex items-center gap-3 md:gap-4 bg-white p-3 md:p-4 rounded-lg border border-[#E3D7B6]/50 shadow-sm">
                            <button
                                onClick={() => setIsMuted(!isMuted)}
                                className="p-2 bg-[#F4F4F5] rounded-full hover:bg-[#E3D7B6]/20 transition-colors text-[#8E7C68]"
                            >
                                {isMuted || volume === 0 ? <VolumeX size={20} className="md:w-6 md:h-6" /> : <Volume2 size={20} className="md:w-6 md:h-6" />}
                            </button>
                            <div className="flex-1">
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={isMuted ? 0 : volume}
                                    onChange={(e) => {
                                        setVolume(parseFloat(e.target.value));
                                        setIsMuted(false);
                                    }}
                                    className="w-full h-2 bg-[#E3D7B6]/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#E3D7B6] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Data Settings */}
                    <div className="space-y-3 md:space-y-4">
                        <h3 className="text-[#8E7C68] text-xs md:text-sm font-bold uppercase tracking-widest">Данные</h3>
                        <div className="bg-red-50 p-3 md:p-4 rounded-lg border border-red-200">
                            <p className="text-red-800/70 text-xs md:text-sm mb-4 leading-relaxed">
                                Сброс данных удалит весь прогресс: Камни Истока, Молитвы, историю круток и выполненные задания. Это действие нельзя отменить.
                            </p>
                            <button
                                onClick={() => {
                                    if (window.confirm('Вы уверены, что хотите сбросить весь прогресс? Это действие необратимо.')) {
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
