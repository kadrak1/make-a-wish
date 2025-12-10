import React from 'react';
import { Check, Shield, Gem, Clock, Award } from 'lucide-react';

const SharedQuestItem = ({ quest, role, onAction, loading }) => {
    // role: 'creator' | 'assignee'
    // quest: { status: 'active' | 'completed' | 'verified' | 'claimed', ... }

    const getStatusBadge = () => {
        switch (quest.status) {
            case 'active':
                return <span className="text-blue-500 text-xs font-bold flex items-center gap-1"><Clock size={12} /> АКТИВНО</span>;
            case 'completed':
                return <span className="text-orange-500 text-xs font-bold flex items-center gap-1"><Check size={12} /> ЖДЕТ ПРОВЕРКИ</span>;
            case 'verified':
                return <span className="text-green-500 text-xs font-bold flex items-center gap-1"><Shield size={12} /> ПРОВЕРЕНО</span>;
            case 'claimed':
                return <span className="text-gray-400 text-xs font-bold flex items-center gap-1"><Check size={12} /> ЗАВЕРШЕНО</span>;
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
                        className="bg-purple-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg hover:bg-purple-400 flex items-center gap-2 animate-pulse"
                    >
                        <Gem size={14} /> ЗАБРАТЬ
                    </button>
                );
            }
        }

        if (role === 'creator') {
            if (quest.status === 'completed') {
                return (
                    <button
                        onClick={() => onAction('verify', quest.id)}
                        className="bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg hover:bg-green-400 flex items-center gap-2"
                    >
                        <Shield size={14} /> ПОДТВЕРДИТЬ
                    </button>
                );
            }
        }

        return null;
    };

    return (
        <div className={`
            relative p-4 rounded-xl border-2 transition-all duration-300
            ${quest.status === 'claimed'
                ? 'border-gray-200 bg-gray-50 opacity-75'
                : 'border-[#E3D7B6] bg-[#FDFBF7] hover:shadow-md'
            }
        `}>
            <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-bold text-sm ${quest.status === 'claimed' ? 'text-gray-500' : 'text-[#4A4238]'}`}>
                            {quest.title}
                        </h4>
                        {getStatusBadge()}
                    </div>

                    {quest.description && (
                        <p className="text-xs text-[#8E7C68] mb-2 leading-relaxed">
                            {quest.description}
                        </p>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1 bg-[#F5F5F5] px-2 py-1 rounded-md border border-gray-200">
                            <Gem size={12} className="text-purple-500" />
                            <span className="text-xs font-bold text-gray-600">
                                {quest.reward_primogems}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-center">
                    {renderAction()}
                </div>
            </div>
        </div>
    );
};

export default SharedQuestItem;
