import React from 'react';
import { Check, Star, X } from 'lucide-react';

const QuestItem = ({ quest, isCompleted, onToggleComplete, onComplete, onDelete }) => {
    const handleComplete = () => {
        if (onToggleComplete) onToggleComplete(quest.id);
        else if (onComplete) onComplete(quest.id, quest.partner_id || null);
        setShowConfirmation(false);
    };
    const { type, title, description, rewards } = quest;
    const [showConfirmation, setShowConfirmation] = React.useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

    const getStyles = () => {
        switch (type) {
            case 'daily':
                return { border: 'border-purple-300', bg: 'bg-orange-50', text: 'text-orange-900' };
            case 'main':
                return { border: 'border-orange-300', bg: 'bg-orange-50', text: 'text-orange-900' };
            case 'world':
            default:
                return { border: 'border-blue-300', bg: 'bg-orange-50', text: 'text-orange-900' };
        }
    };

    const styles = getStyles();

    return (
        <>
            <div className={`relative p-4 mb-3 rounded-lg border-l-4 ${styles.border} ${styles.bg} shadow-sm transition-all hover:shadow-md`}>

                {/* X — absolute top-right */}
                {onDelete && (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="absolute top-2 right-2 p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-100 transition-all"
                        title="Скрыть квест"
                    >
                        <X size={15} />
                    </button>
                )}

                {/* Complete — absolute bottom-right */}
                <button
                    onClick={() => { if (!isCompleted) setShowConfirmation(true); }}
                    disabled={isCompleted}
                    className={`absolute bottom-3 right-3 p-2 rounded-full transition-all flex items-center justify-center ${isCompleted
                        ? 'bg-green-100 text-green-600 cursor-default border border-green-200'
                        : 'bg-[#E3D7B6] hover:bg-[#d4c5a0] text-[#5c4d3c] active:scale-95 shadow-sm'
                        }`}
                >
                    {isCompleted
                        ? <Check size={20} />
                        : <span className="text-sm font-bold px-4 py-1">Выполнить</span>
                    }
                </button>

                {/* Text + rewards */}
                <h3 className="font-bold text-lg text-orange-900 mb-1 pr-6">{title}</h3>
                <p className="text-gray-600 text-sm mb-3 font-normal">{description}</p>
                <div className="flex gap-3">
                    {rewards?.primogems && (
                        <div className="flex items-center gap-1.5 text-sm bg-yellow-50 px-2 py-1 rounded border border-yellow-200">
                            <Star size={16} className="text-yellow-500 fill-yellow-500" />
                            <span className="text-yellow-700 font-bold">{rewards.primogems}</span>
                        </div>
                    )}
                    {rewards?.item && (
                        <div className="flex items-center gap-1 text-xs bg-stone-200 px-2 py-1 rounded border border-black/5">
                            <span className="text-pink-500">🎁 {rewards.item}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Complete Confirmation */}
            {showConfirmation && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#F4F4F5] border-2 border-[#E3D7B6] rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-[#8E7C68] font-bold text-lg mb-4 text-center uppercase tracking-wider">Подтверждение</h3>
                        <p className="text-gray-600 text-center mb-6">Вы подтверждаете, что квест выполнен?</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setShowConfirmation(false)} className="px-6 py-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 transition-colors font-bold text-sm">Нет</button>
                            <button onClick={handleComplete} className="px-6 py-2 rounded-full bg-[#E3D7B6] hover:bg-[#d4c5a0] text-[#5c4d3c] transition-colors font-bold text-sm shadow-sm">Да</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#FDFBF7] border-2 border-[#E3D7B6] rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-[#8E7C68] font-bold text-lg mb-2 text-center uppercase tracking-wider">Скрыть квест?</h3>
                        <p className="text-gray-600 text-center mb-6 text-sm">«{title}» будет скрыт из вашего журнала.</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setShowDeleteConfirm(false)} className="px-6 py-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 transition-colors font-bold text-sm">Отмена</button>
                            <button
                                onClick={async () => {
                                    const result = await onDelete(quest.id);
                                    if (result && !result.success) {
                                        alert('Ошибка: ' + result.error);
                                    } else {
                                        setShowDeleteConfirm(false);
                                    }
                                }}
                                className="px-6 py-2 rounded-full bg-[#8E7C68] hover:bg-[#7a6b5a] text-white transition-colors font-bold text-sm shadow-sm"
                            >
                                Скрыть
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default QuestItem;
