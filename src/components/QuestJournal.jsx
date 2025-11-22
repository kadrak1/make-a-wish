import React, { useState } from 'react';
import { X, Book, Star, Globe, Calendar, Check, Gem } from 'lucide-react';
import QuestItem from './QuestItem';

const QuestJournal = ({
    isOpen,
    onClose,
    dailyQuests,
    mainQuest,
    mainQuestProgress,
    worldQuests,
    completedQuestIds,
    onCompleteQuest,
    dailyProgress,
    onClaimDailyReward
}) => {
    const [activeTab, setActiveTab] = useState('all');

    if (!isOpen) return null;

    const renderQuests = (quests) => {
        return quests.map(quest => (
            <QuestItem
                key={quest.id}
                quest={quest}
                isCompleted={completedQuestIds.includes(quest.id)}
                onComplete={onCompleteQuest}
            />
        ));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl bg-[#F4F4F5] border-2 border-[#E3D7B6] rounded-xl shadow-2xl overflow-hidden flex flex-col h-[85vh] md:h-auto md:max-h-[80vh] animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 md:px-6 border-b border-[#E3D7B6] bg-[#E3D7B6] shrink-0">
                    <div className="flex items-center gap-2 text-[#8E7C68]">
                        <Book size={24} />
                        <h2 className="text-lg font-bold uppercase tracking-wider">Журнал заданий</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-[#8E7C68]/10 rounded-full transition-colors">
                        <X size={24} className="text-[#8E7C68] hover:text-[#5c4d3c]" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-2 gap-2 bg-[#EAE5D5] shrink-0 overflow-x-auto border-b border-[#E3D7B6]/50">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'all' ? 'bg-[#8E7C68] text-[#F4F4F5] shadow-sm' : 'text-[#8E7C68] hover:bg-[#8E7C68]/10'}`}
                    >
                        Все
                    </button>
                    <button
                        onClick={() => setActiveTab('daily')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'daily' ? 'bg-purple-500 text-white shadow-sm' : 'text-[#8E7C68] hover:bg-[#8E7C68]/10'}`}
                    >
                        <Calendar size={14} /> Ежедневные
                    </button>
                    <button
                        onClick={() => setActiveTab('main')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'main' ? 'bg-orange-500 text-white shadow-sm' : 'text-[#8E7C68] hover:bg-[#8E7C68]/10'}`}
                    >
                        <Star size={14} /> Главное
                    </button>
                    <button
                        onClick={() => setActiveTab('world')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'world' ? 'bg-blue-500 text-white shadow-sm' : 'text-[#8E7C68] hover:bg-[#8E7C68]/10'}`}
                    >
                        <Globe size={14} /> Для двоих
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-[#F4F4F5]">
                    {(activeTab === 'all' || activeTab === 'main') && (
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-2 px-1">
                                <h3 className="text-[#8E7C68] text-xs font-bold uppercase tracking-widest">Задания Архонтов</h3>
                                {mainQuestProgress && (
                                    <span className="text-[#8E7C68]/60 text-xs font-mono">
                                        {mainQuestProgress.isCompleted
                                            ? "ЗАВЕРШЕНО"
                                            : `ЭТАП ${mainQuestProgress.current}/${mainQuestProgress.total}`}
                                    </span>
                                )}
                            </div>
                            {mainQuest ? renderQuests([mainQuest]) : (
                                <div className="p-4 rounded-lg border border-orange-200 bg-orange-50 text-orange-800/60 text-center text-sm italic">
                                    Все задания Архонтов выполнены
                                </div>
                            )}
                        </div>
                    )}

                    {(activeTab === 'all' || activeTab === 'daily') && (
                        <div className="mb-6">
                            <h3 className="text-[#8E7C68] text-xs font-bold uppercase tracking-widest mb-2 px-1">Ежедневные поручения</h3>

                            {/* Daily Bonus Card */}
                            {dailyProgress && (
                                <div className="mb-4 p-4 rounded-lg border border-purple-200 bg-orange-50 flex items-center justify-between shadow-sm">
                                    <div>
                                        <h4 className="text-orange-900 font-bold text-sm mb-1">Награда за 4 поручения</h4>
                                        <div className="flex items-center gap-2 text-xs text-orange-900">
                                            <span>Прогресс: {dailyProgress.current} / {dailyProgress.total}</span>
                                            <div className="w-20 h-1.5 bg-black/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-purple-500 transition-all duration-500"
                                                    style={{ width: `${Math.min((dailyProgress.current / dailyProgress.total) * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={onClaimDailyReward}
                                        disabled={!dailyProgress.canClaim}
                                        className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${dailyProgress.isClaimed
                                            ? 'bg-green-100 text-green-600 cursor-default border border-green-200'
                                            : dailyProgress.canClaim
                                                ? 'bg-purple-500 hover:bg-purple-400 text-white shadow-lg shadow-purple-500/20 active:scale-95'
                                                : 'bg-black/5 text-gray-400 cursor-not-allowed border border-black/5'
                                            }`}
                                    >
                                        {dailyProgress.isClaimed ? (
                                            <>
                                                <Check size={14} />
                                                ПОЛУЧЕНО
                                            </>
                                        ) : (
                                            <>
                                                <Gem size={14} className={dailyProgress.canClaim ? "text-cyan-200" : "text-gray-400"} />
                                                <span>20</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {dailyProgress && dailyProgress.current >= dailyProgress.total ? (
                                <div className="p-4 rounded-lg border border-purple-200 bg-purple-50 text-purple-800/60 text-center text-sm italic">
                                    Все ежедневные задания выполнены
                                </div>
                            ) : (
                                renderQuests(dailyQuests)
                            )}
                        </div>
                    )}

                    {(activeTab === 'all' || activeTab === 'world') && (
                        <div className="mb-6">
                            <h3 className="text-[#8E7C68] text-xs font-bold uppercase tracking-widest mb-2 px-1">Для двоих</h3>
                            {renderQuests(worldQuests)}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default QuestJournal;
