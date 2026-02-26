import React, { useState } from 'react';
import { Check, Shield, Star, Clock, X } from 'lucide-react';

const SharedQuestItem = ({ quest, role, onAction, onDelete, loading }) => {
    // role: 'creator' | 'assignee'
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const canDelete = role === 'creator' || (role === 'assignee' && quest.status === 'active');

    const getStatusBadge = () => {
        switch (quest.status) {
            case 'active':
                return <span className="text-yellow-600 text-sm font-bold flex items-center gap-1 uppercase tracking-wide"><Clock size={14} /> Активно</span>;
            case 'completed':
                return <span className="text-orange-700 text-sm font-bold flex items-center gap-1 uppercase tracking-wide"><Check size={14} /> Ждет проверки</span>;
            case 'verified':
                return <span className="text-yellow-600 text-sm font-bold flex items-center gap-1 uppercase tracking-wide"><Shield size={14} /> Проверено</span>;
            case 'claimed':
                return <span className="text-gray-400 text-sm font-bold flex items-center gap-1 uppercase tracking-wide"><Check size={14} /> Завершено</span>;
            default:
                return null;
        }
    };

    const renderAction = () => {
        if (loading) return <div className="animate-spin w-4 h-4 border-2 border-[#8E7C68] border-t-transparent rounded-full" />;

        if (role === 'assignee') {
            if (quest.status === 'active') {
                return (
                    <button
                        onClick={() => onAction('complete', quest.id)}
                        className="bg-white border border-[#E3D7B6] hover:bg-[#8E7C68] hover:text-white text-[#8E7C68] p-2 rounded-full transition-colors"
                        title="Отметить как выполненное"
                    >
                        <Check size={20} />
                    </button>
                );
            }
            if (quest.status === 'verified') {
                return (
                    <button
                        onClick={() => onAction('claim', quest)}
                        className="bg-yellow-400 text-[#3D2E00] px-4 py-2 rounded-full text-sm font-bold shadow-lg hover:bg-yellow-300 flex items-center gap-2 animate-pulse"
                    >
                        <Star size={16} /> ЗАБРАТЬ
                    </button>
                );
            }
        }

        if (role === 'creator' && quest.status === 'completed') {
            return (
                <button
                    onClick={() => onAction('verify', quest.id)}
                    className="bg-yellow-400 text-[#3D2E00] px-4 py-2 rounded-full text-sm font-bold shadow-lg hover:bg-yellow-300 flex items-center gap-2"
                >
                    <Shield size={16} /> ПОДТВЕРДИТЬ
                </button>
            );
        }

        return null;
    };

    return (
        <>
            <div className={`
                relative p-4 rounded-xl border-2 transition-all duration-300
                ${quest.status === 'claimed'
                    ? 'border-gray-200 bg-gray-50 opacity-75'
                    : 'border-[#E3D7B6] bg-[#FDFBF7] hover:shadow-md'
                }
            `}>
                {/* Delete button — top right corner */}
                {canDelete && onDelete && (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="absolute top-2 right-2 p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Удалить квест"
                    >
                        <X size={14} />
                    </button>
                )}

                <div className="pr-5">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-bold text-base ${quest.status === 'claimed' ? 'text-gray-500' : 'text-orange-900'}`}>
                            {quest.title}
                        </h4>
                        {getStatusBadge()}
                    </div>

                    {quest.description && (
                        <p className="text-sm text-gray-600 mb-2 leading-relaxed font-normal">
                            {quest.description}
                        </p>
                    )}

                    <div className="flex items-center gap-2 mt-2 mb-3">
                        <div className="flex items-center gap-1.5 bg-yellow-50 px-2 py-1 rounded-md border border-yellow-200">
                            <Star size={14} className="text-yellow-500 fill-yellow-500" />
                            <span className="text-sm font-bold text-yellow-700">{quest.reward_primogems}</span>
                        </div>
                    </div>

                    {/* Action button — bottom */}
                    <div className="flex justify-end">
                        {renderAction()}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#FDFBF7] border-2 border-[#E3D7B6] rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-[#8E7C68] font-bold text-lg mb-2 text-center uppercase tracking-wider">Удалить квест?</h3>
                        <p className="text-gray-600 text-center mb-6 text-sm">«{quest.title}» будет удалён.</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setShowDeleteConfirm(false)} className="px-6 py-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 transition-colors font-bold text-sm">Отмена</button>
                            <button
                                onClick={async () => {
                                    const result = await onDelete(quest.id, quest);
                                    if (result && !result.success) {
                                        alert('Ошибка: ' + result.error);
                                    } else {
                                        setShowDeleteConfirm(false);
                                    }
                                }}
                                className="px-6 py-2 rounded-full bg-[#8E7C68] hover:bg-[#7a6b5a] text-white transition-colors font-bold text-sm shadow-sm"
                            >
                                Удалить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default SharedQuestItem;
