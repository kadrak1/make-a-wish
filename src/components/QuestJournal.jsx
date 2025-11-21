import React, { useState } from 'react';
import { X, Book, Star, Globe, Calendar } from 'lucide-react';
import QuestItem from './QuestItem';

const QuestJournal = ({
    isOpen,
    onClose,
    dailyQuests,
    mainQuest,
    worldQuests,
    completedQuestIds,
    onCompleteQuest
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
            <div className="w-full max-w-2xl bg-[#1a1b26] border border-[#E3D7B6]/30 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#15161e]">
                    <div className="flex items-center gap-2 text-[#E3D7B6]">
                        <Book size={24} />
                        <h2 className="text-xl font-bold tracking-wider">Журнал заданий</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                        <X size={24} className="text-gray-400 hover:text-white" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-2 gap-2 bg-[#12131a]">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-colors ${activeTab === 'all' ? 'bg-[#E3D7B6] text-[#1a1b26]' : 'text-gray-400 hover:bg-white/5'}`}
                    >
                        Все
                    </button>
                    <button
                        onClick={() => setActiveTab('daily')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 ${activeTab === 'daily' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                    >
                        <Calendar size={14} /> Ежедневные
                    </button>
                    <button
                        onClick={() => setActiveTab('main')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 ${activeTab === 'main' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                    >
                        <Star size={14} /> Главное
                    </button>
                    <button
                        onClick={() => setActiveTab('world')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 ${activeTab === 'world' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                    >
                        <Globe size={14} /> Мир
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {(activeTab === 'all' || activeTab === 'main') && (
                        <div className="mb-6">
                            <h3 className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-2 px-1">Задания Архонтов</h3>
                            {renderQuests([mainQuest])}
                        </div>
                    )}

                    {(activeTab === 'all' || activeTab === 'daily') && (
                        <div className="mb-6">
                            <h3 className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-2 px-1">Ежедневные поручения</h3>
                            {renderQuests(dailyQuests)}
                        </div>
                    )}

                    {(activeTab === 'all' || activeTab === 'world') && (
                        <div className="mb-6">
                            <h3 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-2 px-1">Задания мира</h3>
                            {renderQuests(worldQuests)}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default QuestJournal;
