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
            <div className="w-full max-w-md bg-[#1a1b26] border border-[#E3D7B6]/30 rounded-xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#15161e]">
                    <div className="flex items-center gap-2 text-[#E3D7B6]">
                        <Settings size={24} />
                        <h2 className="text-xl font-bold tracking-wider">Настройки</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                        <X size={24} className="text-gray-400 hover:text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8">

                    {/* Sound Settings */}
                    <div className="space-y-4">
                        <h3 className="text-gray-400 text-sm font-bold uppercase tracking-widest">Звук</h3>
                        <div className="flex items-center gap-4 bg-black/20 p-4 rounded-lg border border-white/5">
                            <button
                                onClick={() => setIsMuted(!isMuted)}
                                className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-[#E3D7B6]"
                            >
                                {isMuted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
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
                                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#E3D7B6] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Data Settings */}
                    <div className="space-y-4">
                        <h3 className="text-gray-400 text-sm font-bold uppercase tracking-widest">Данные</h3>
                        <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/20">
                            <p className="text-gray-300 text-sm mb-4">
                                Сброс данных удалит весь прогресс: Камни Истока, Молитвы, историю круток и выполненные задания. Это действие нельзя отменить.
                            </p>
                            <button
                                onClick={() => {
                                    if (window.confirm('Вы уверены, что хотите сбросить весь прогресс? Это действие необратимо.')) {
                                        onResetData();
                                    }
                                }}
                                className="w-full py-3 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 rounded-lg font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                <Trash2 size={18} />
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
