import React from 'react';
import { X, Wrench, Gem } from 'lucide-react';

const CompensationModal = ({
    isOpen,
    onClose,
    onClaim
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#F4F4F5] w-full max-w-sm md:max-w-md rounded-xl border-2 border-[#E3D7B6] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="bg-[#E3D7B6] px-4 py-3 md:px-6 flex items-center justify-between">
                    <h2 className="text-[#8E7C68] font-bold text-base md:text-lg uppercase tracking-wider flex items-center gap-2">
                        <Wrench size={18} className="md:w-5 md:h-5" />
                        Технические работы
                    </h2>
                    {/* Close button is hidden to force claiming, or we can allow closing but it will pop up again next time? 
                        User said "show only 1 time", usually implies "until claimed". 
                        If I allow closing without claiming, it should probably show again next reload.
                        But for better UX, I'll just have the "Claim" button which closes it.
                    */}
                </div>

                {/* Content */}
                <div className="p-6 text-center space-y-6">
                    <div className="space-y-2">
                        <p className="text-[#8E7C68] text-sm md:text-base font-medium leading-relaxed">
                            Уважаемый Путешественник!
                        </p>
                        <p className="text-[#8E7C68]/80 text-sm leading-relaxed">
                            В связи с временными техническими неполадками мы отправляем вам компенсацию в размере 40 Камней Истока. Спасибо за ваше терпение и понимание!
                        </p>
                    </div>

                    {/* Reward */}
                    <div className="flex justify-center">
                        <div className="bg-[#EAE5D5] border border-[#E3D7B6] rounded-lg p-4 flex flex-col items-center gap-2 min-w-[120px]">
                            <Gem size={32} className="text-cyan-400 fill-cyan-400 drop-shadow-md" />
                            <span className="text-[#8E7C68] font-bold text-lg">x 40</span>
                        </div>
                    </div>

                    <button
                        onClick={onClaim}
                        className="w-full py-3 px-6 bg-[#E3D7B6] hover:bg-[#d4c4a0] text-white rounded-full font-bold text-base transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                        Получить
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CompensationModal;
