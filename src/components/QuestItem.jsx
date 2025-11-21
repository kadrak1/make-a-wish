import React from 'react';
import { Check, Gem, Coins } from 'lucide-react';

const QuestItem = ({ quest, isCompleted, onComplete }) => {
    const { type, title, description, rewards } = quest;

    const getStyles = () => {
        switch (type) {
            case 'daily':
                return {
                    border: 'border-purple-500',
                    bg: 'bg-purple-900/20',
                    text: 'text-purple-200',
                    icon: 'text-purple-400'
                };
            case 'main':
                return {
                    border: 'border-orange-500',
                    bg: 'bg-orange-900/20',
                    text: 'text-orange-200',
                    icon: 'text-orange-400'
                };
            case 'world':
            default:
                return {
                    border: 'border-blue-500',
                    bg: 'bg-blue-900/20',
                    text: 'text-blue-200',
                    icon: 'text-blue-400'
                };
        }
    };

    const styles = getStyles();

    return (
        <div className={`relative p-4 mb-3 rounded-lg border-l-4 ${styles.border} ${styles.bg} backdrop-blur-sm transition-all hover:bg-opacity-30`}>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                    <h3 className={`font-bold text-lg ${styles.text} mb-1`}>{title}</h3>
                    <p className="text-gray-300 text-sm mb-3">{description}</p>

                    <div className="flex gap-3">
                        {rewards.primogems && (
                            <div className="flex items-center gap-1 text-xs bg-black/30 px-2 py-1 rounded">
                                <Gem size={12} className="text-cyan-400" />
                                <span>{rewards.primogems}</span>
                            </div>
                        )}
                        {rewards.mora && (
                            <div className="flex items-center gap-1 text-xs bg-black/30 px-2 py-1 rounded">
                                <Coins size={12} className="text-yellow-400" />
                                <span>{rewards.mora}</span>
                            </div>
                        )}
                        {rewards.item && (
                            <div className="flex items-center gap-1 text-xs bg-black/30 px-2 py-1 rounded">
                                <span className="text-pink-400">🎁 {rewards.item}</span>
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={() => onComplete(quest.id)}
                    disabled={isCompleted}
                    className={`w-full md:w-auto p-2 rounded-full transition-all flex items-center justify-center ${isCompleted
                        ? 'bg-green-500/20 text-green-400 cursor-default'
                        : 'bg-white/10 hover:bg-white/20 text-white active:scale-95'
                        }`}
                >
                    {isCompleted ? <Check size={20} /> : <span className="text-xs font-bold px-4 py-1">СТАРТ</span>}
                </button>
            </div>
        </div>
    );
};

export default QuestItem;
