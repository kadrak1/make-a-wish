import React from 'react';
import { Check, Gem, Coins, Star } from 'lucide-react';

const QuestItem = ({ quest, isCompleted, onComplete }) => {
    const { type, title, description, rewards } = quest;
    const [showConfirmation, setShowConfirmation] = React.useState(false);

    const getStyles = () => {
        switch (type) {
            case 'daily':
                return {
                    border: 'border-purple-300',
                    bg: 'bg-orange-50',
                    text: 'text-orange-900',
                    icon: 'text-purple-500'
                };
            case 'main':
                return {
                    border: 'border-orange-300',
                    bg: 'bg-orange-50',
                    text: 'text-orange-900',
                    icon: 'text-orange-500'
                };
            case 'world':
            default:
                return {
                    border: 'border-blue-300',
                    bg: 'bg-orange-50',
                    text: 'text-orange-900',
                    icon: 'text-blue-500'
                };
        }
    };

    const styles = getStyles();

    const handleCompleteClick = () => {
        if (!isCompleted) {
            setShowConfirmation(true);
        }
    };

    const handleConfirm = () => {
        onComplete(quest.id);
        setShowConfirmation(false);
    };

    return (
        <>
            <div className={`relative p-4 mb-3 rounded-lg border-l-4 ${styles.border} ${styles.bg} shadow-sm transition-all hover:shadow-md`}>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                        <h3 className={`font-bold text-lg ${styles.text} mb-1`}>{title}</h3>
                        <p className="text-gray-600 text-sm mb-3">{description}</p>

                        <div className="flex gap-3">
                            {rewards.primogems && (
                                <div className="flex items-center gap-1 text-xs bg-stone-200 px-2 py-1 rounded border border-black/5">
                                    <img src={`${import.meta.env.BASE_URL}images/rewards/primogems.png`} alt="Primogems" className="w-5 h-5 object-contain" />
                                    <span className="text-gray-700 font-medium">{rewards.primogems}</span>
                                </div>
                            )}
                            {rewards.mora && (
                                <div className="flex items-center gap-1 text-xs bg-stone-200 px-2 py-1 rounded border border-black/5">
                                    <img src={`${import.meta.env.BASE_URL}images/rewards/mora.png`} alt="Mora" className="w-5 h-5 object-contain" />
                                    <span className="text-gray-700 font-medium">{rewards.mora}</span>
                                </div>
                            )}
                            {rewards.item && (
                                <div className="flex items-center gap-1 text-xs bg-stone-200 px-2 py-1 rounded border border-black/5">
                                    <span className="text-pink-500">🎁 {rewards.item}</span>
                                </div>
                            )}
                            {rewards.wishes && (
                                <div className="flex items-center gap-1 text-xs bg-stone-200 px-2 py-1 rounded border border-black/5">
                                    <img src={`${import.meta.env.BASE_URL}images/rewards/wishes.png`} alt="Wishes" className="w-5 h-5 object-contain" />
                                    <span className="text-pink-700 font-medium">x{rewards.wishes}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleCompleteClick}
                        disabled={isCompleted}
                        className={`w-full md:w-auto p-2 rounded-full transition-all flex items-center justify-center ${isCompleted
                            ? 'bg-green-100 text-green-600 cursor-default border border-green-200'
                            : 'bg-[#E3D7B6] hover:bg-[#d4c5a0] text-[#5c4d3c] active:scale-95 shadow-sm'
                            }`}
                    >
                        {isCompleted ? <Check size={20} /> : <span className="text-xs font-bold px-4 py-1">Выполнить</span>}
                    </button>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmation && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#F4F4F5] border-2 border-[#E3D7B6] rounded-xl p-6 max-w-sm w-full shadow-2xl transform scale-100 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-[#8E7C68] font-bold text-lg mb-4 text-center uppercase tracking-wider">Подтверждение</h3>
                        <p className="text-gray-600 text-center mb-6">Вы подтверждаете, что квест выполнен?</p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setShowConfirmation(false)}
                                className="px-6 py-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 transition-colors font-bold text-sm"
                            >
                                Нет
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="px-6 py-2 rounded-full bg-[#E3D7B6] hover:bg-[#d4c5a0] text-[#5c4d3c] transition-colors font-bold text-sm shadow-sm"
                            >
                                Да
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default QuestItem;
