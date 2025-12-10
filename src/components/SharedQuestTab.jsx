import React, { useState } from 'react';
import { Plus, Shield, Sword, LayoutDashboard } from 'lucide-react';
import { useSharedQuests } from '../hooks/useSharedQuests';
import SharedQuestItem from './SharedQuestItem';

const SharedQuestTab = ({ partnerId, myBalance = 0 }) => {
    const {
        questsByMe,
        questsForMe,
        loading,
        createQuest,
        markAsCompleted,
        verifyQuest,
        claimReward
    } = useSharedQuests(partnerId);

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newQuest, setNewQuest] = useState({ title: '', description: '', reward: 50 });
    const [viewMode, setViewMode] = useState('missions'); // 'missions' | 'manage' | 'chat'

    const handleCreate = async (e) => {
        e.preventDefault();
        const result = await createQuest(newQuest.title, newQuest.description, newQuest.reward);
        if (result.success) {
            setShowCreateForm(false);
            setNewQuest({ title: '', description: '', reward: 50 });
        } else {
            alert("Ошибка создания: " + result.error);
        }
    };

    const handleAction = async (action, payload) => {
        if (action === 'complete') await markAsCompleted(payload);
        if (action === 'verify') await verifyQuest(payload);
        if (action === 'claim') await claimReward(payload);
    };

    const activeMissionsCount = questsForMe.filter(q => q.status === 'active').length;
    const pendingVerificationCount = questsByMe.filter(q => q.status === 'completed').length;

    return (
        <div className="space-y-4 pb-20 md:pb-0">
            {/* Balance Display */}
            <div className="bg-[#8E7C68] text-white px-4 py-2 rounded-xl flex items-center justify-between shadow-md mx-1">
                <span className="text-xs font-bold uppercase tracking-widest text-white/80">Баланс пары</span>
                <div className="flex items-center gap-1">
                    <span className="font-mono text-lg font-bold">{myBalance}</span>
                    <div className="w-4 h-4 bg-white/20 rotate-45 transform" /> {/* Placeholder gem icon */}
                </div>
            </div>

            {/* Navigation Pills */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button
                    onClick={() => setViewMode('missions')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${viewMode === 'missions' ? 'bg-[#8E7C68] text-white border-[#8E7C68]' : 'bg-white text-[#8E7C68] border-[#E3D7B6]'}`}
                >
                    <Sword size={14} />
                    Миссии ({activeMissionsCount})
                </button>
                <button
                    onClick={() => setViewMode('manage')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${viewMode === 'manage' ? 'bg-[#8E7C68] text-white border-[#8E7C68]' : 'bg-white text-[#8E7C68] border-[#E3D7B6]'}`}
                >
                    <Shield size={14} />
                    Управление ({pendingVerificationCount})
                </button>
            </div>

            {/* Content Area */}
            <div className="min-h-[300px]">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin w-8 h-8 border-4 border-[#8E7C68] border-t-transparent rounded-full" />
                    </div>
                ) : (
                    <>
                        {/* VIEW: MISSIONS (Assigned To Me) */}
                        {viewMode === 'missions' && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <h3 className="text-[#8E7C68] text-xs font-bold uppercase tracking-widest px-1">Ваши задания</h3>
                                {questsForMe.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400 text-sm bg-white/30 rounded-xl border border-dashed border-[#E3D7B6]">
                                        Пока нет заданий от партнера
                                    </div>
                                ) : (
                                    questsForMe.map(q => (
                                        <SharedQuestItem
                                            key={q.id}
                                            quest={q}
                                            role="assignee"
                                            onAction={handleAction}
                                        />
                                    ))
                                )}
                            </div>
                        )}

                        {/* VIEW: MANAGE (Created By Me) */}
                        {viewMode === 'manage' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="flex items-center justify-between px-1">
                                    <h3 className="text-[#8E7C68] text-xs font-bold uppercase tracking-widest">Созданные вами</h3>
                                    <button
                                        onClick={() => setShowCreateForm(!showCreateForm)}
                                        className="text-xs bg-[#8E7C68] text-white px-2 py-1 rounded-md flex items-center gap-1 hover:bg-[#7a6b5a]"
                                    >
                                        <Plus size={12} /> {showCreateForm ? 'Отмена' : 'Новое'}
                                    </button>
                                </div>

                                {showCreateForm && (
                                    <form onSubmit={handleCreate} className="bg-white p-4 rounded-xl border border-[#E3D7B6] space-y-3 shadow-md">
                                        <input
                                            className="w-full bg-[#F4F4F5] p-2 rounded-lg text-sm border-none focus:ring-1 focus:ring-[#8E7C68] outline-none"
                                            placeholder="Название задания"
                                            value={newQuest.title}
                                            onChange={e => setNewQuest({ ...newQuest, title: e.target.value })}
                                            required
                                        />
                                        <textarea
                                            className="w-full bg-[#F4F4F5] p-2 rounded-lg text-sm border-none focus:ring-1 focus:ring-[#8E7C68] outline-none resize-none h-20"
                                            placeholder="Описание (опционально)"
                                            value={newQuest.description}
                                            onChange={e => setNewQuest({ ...newQuest, description: e.target.value })}
                                        />
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500 font-bold">Награда:</span>
                                            <input
                                                type="number"
                                                className="w-20 bg-[#F4F4F5] p-2 rounded-lg text-sm border-none focus:ring-1 focus:ring-[#8E7C68] outline-none font-mono"
                                                value={newQuest.reward}
                                                onChange={e => setNewQuest({ ...newQuest, reward: e.target.value })}
                                                min="0"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            className="w-full bg-[#8E7C68] text-white py-2 rounded-lg text-sm font-bold hover:bg-[#7a6b5a]"
                                        >
                                            Создать задание
                                        </button>
                                    </form>
                                )}

                                <div className="space-y-3">
                                    {questsByMe.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400 text-sm bg-white/30 rounded-xl border border-dashed border-[#E3D7B6]">
                                            Вы еще не давали заданий
                                        </div>
                                    ) : (
                                        questsByMe.map(q => (
                                            <SharedQuestItem
                                                key={q.id}
                                                quest={q}
                                                role="creator"
                                                onAction={handleAction}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* VIEW: MANAGE (Created By Me) */}
                    </>
                )}
            </div>
        </div>
    );
};

export default SharedQuestTab;
