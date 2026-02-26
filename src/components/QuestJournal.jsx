import React, { useState, useEffect } from 'react';
import { X, Book, Check, Star, Users, Calendar, Heart, Globe, Plus, ScrollText, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QuestItem from './QuestItem';
import FriendQuestItem from './FriendQuestItem';
import { useUserConnections } from '../hooks/useUserConnections';
import { useAllMySharedQuests } from '../hooks/useAllMySharedQuests';
import { useSharedQuests } from '../hooks/useSharedQuests';
import { useAuth } from '../context/AuthContext';
import SharedQuestTab from './SharedQuestTab';

const ALL_FILTERS = [
    { id: 'all', label: 'Все' },
    { id: 'friend', label: 'От друзей', icon: Heart },
    { id: 'mine', label: 'Мои задания', icon: ScrollText },
    { id: 'one-time', label: 'Разовые', icon: Check },
    { id: 'repeatable', label: 'Повторяемые', icon: Clock },
];

const QuestJournal = ({
    isOpen,
    onClose,
    dailyQuests,
    mainQuest,
    mainQuestProgress,
    worldQuests,
    completedQuestIds,
    onCompleteQuest,
    onDeleteQuest,
    onCompleteWorldQuest,
    dailyProgress,
    onClaimDailyReward,
    initialTab = 'all'
}) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('all-tab');  // 'all-tab' | 'together' | 'partners'
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [selectedPartnerId, setSelectedPartnerId] = useState(null);
    const { connections, loading: connectionsLoading } = useUserConnections();
    const { quests: friendQuests, loading: friendQuestsLoading, markAsCompleted, claimReward: claimRewardBase, deleteQuest: deleteFriendQuest } = useAllMySharedQuests();

    const [rewardNotification, setRewardNotification] = useState(null);

    const handleClaimReward = async (quest) => {
        const result = await claimRewardBase(quest);
        if (result && result.success) {
            setRewardNotification({ amount: result.rewardAmount, title: quest.title });
        }
        return result;
    };

    const { createQuest: createSelfQuest } = useSharedQuests(user?.id);
    const [showSelfCreate, setShowSelfCreate] = useState(false);
    const [newSelfQuest, setNewSelfQuest] = useState({ title: '', description: '', reward: 40, type: 'one-time' });
    const [creatingSelf, setCreatingSelf] = useState(false);

    const handleCompleteSystemQuest = async (questId) => {
        const quest = [...dailyQuests, ...(mainQuest ? [mainQuest] : []), ...worldQuests].find(q => q.id === questId);
        const result = await onCompleteQuest(questId);
        if (result && result.success) {
            setRewardNotification({ amount: result.rewardAmount, title: quest?.title || 'Задание выполнено' });
        }
    };

    const handleClaimDailyRewardWrapped = async () => {
        const result = await onClaimDailyReward();
        if (result && result.success) {
            setRewardNotification({ amount: result.rewardAmount, title: 'Ежедневная награда' });
        }
    };

    const handleCompleteWorldQuestWrapped = async (questId, partnerId) => {
        const quest = worldQuests.find(q => q.id === questId);
        // World quests reward both, but let's see if hook returns reward
        const result = await onCompleteWorldQuest(questId, partnerId);
        // Note: useQuestSystem's completeWorldQuest doesn't currently return rewards in its logic,
        // but we can show it if it has rewards defined.
        if (quest && quest.rewards?.primogems) {
            setRewardNotification({ amount: quest.rewards.primogems, title: quest.title });
        }
    };

    useEffect(() => {
        if (isOpen) { setActiveTab('all-tab'); setCategoryFilter('all'); }
    }, [isOpen]);

    const resolvedPartnerId = selectedPartnerId || connections[0]?.partnerId || null;

    if (!isOpen) return null;

    const renderQuests = (quests) =>
        quests.map(quest => (
            <QuestItem
                key={quest.id}
                quest={quest}
                isCompleted={completedQuestIds.includes(quest.id)}
                onComplete={handleCompleteSystemQuest}
                onDelete={onDeleteQuest}
            />
        ));

    const showStory = categoryFilter === 'all';
    const showFriend = categoryFilter === 'all' || categoryFilter === 'friend' || categoryFilter === 'one-time' || categoryFilter === 'repeatable';
    const showMine = categoryFilter === 'all' || categoryFilter === 'mine' || categoryFilter === 'one-time' || categoryFilter === 'repeatable';

    // Calculate aggregated daily progress
    // 1. System quests (daily, main, world) from useQuestSystem
    const completedSystemQuestsCount = [
        ...(dailyQuests || []),
        ...(mainQuest ? [mainQuest] : []),
        ...(worldQuests || [])
    ].filter(q => completedQuestIds.includes(q.id) && q.type !== 'together').length;

    // 2. Shared quests from useAllMySharedQuests
    const completedFriendQuestsCount = friendQuests.filter(q =>
        (q.status === 'completed' || q.status === 'verified') &&
        q.quest_type !== 'together'
    ).length;

    const totalCompleted = completedSystemQuestsCount + completedFriendQuestsCount;

    // Override dailyProgress from hook with aggregated one
    const aggregatedDailyProgress = {
        ...dailyProgress,
        current: totalCompleted,
        canClaim: totalCompleted >= 4 && !dailyProgress.isClaimed
    };

    const friendQuestsAll = friendQuests.filter(q => q.quest_type !== 'together');
    const friendQuestsTogether = friendQuests.filter(q => q.quest_type === 'together');

    // Filter for "My Quests" (created_by === assigned_to + system daily/world)
    const combinedMineQuests = [
        ...dailyQuests,
        ...worldQuests
    ].filter(q =>
        !completedQuestIds.includes(q.id) &&
        (categoryFilter === 'all' || categoryFilter === 'mine' || categoryFilter === q.type)
    );

    const friendQuestsMineFiltered = friendQuests.filter(q =>
        q.created_by === q.assigned_to &&
        q.status === 'active' &&
        (categoryFilter === 'all' || categoryFilter === 'mine' || categoryFilter === q.quest_type)
    );

    const allMyQuests = [...combinedMineQuests, ...friendQuestsMineFiltered];

    // Filter for "From friends" (created_by !== assigned_to)
    const friendQuestsFromFriends = friendQuestsAll.filter(q =>
        q.created_by !== q.assigned_to &&
        (q.status !== 'claimed') &&
        (categoryFilter === 'all' || categoryFilter === 'friend' || categoryFilter === q.quest_type)
    );

    const handleCreateSelf = async (e) => {
        e.preventDefault();
        setCreatingSelf(true);
        // Using common logic: assigned_to = current user
        const result = await createSelfQuest(newSelfQuest.title, newSelfQuest.description, newSelfQuest.reward, newSelfQuest.type);
        setCreatingSelf(false);
        if (result.success) {
            setShowSelfCreate(false);
            setNewSelfQuest({ title: '', description: '', reward: 40, type: 'one-time' });
        } else {
            alert('Ошибка: ' + result.error);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl bg-[#F4F4F5] border-2 border-[#E3D7B6] rounded-xl shadow-2xl overflow-hidden flex flex-col h-[85vh] md:h-auto md:max-h-[90vh] animate-in fade-in zoom-in duration-200">

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

                {/* Top Tabs */}
                <div className="flex p-2 gap-1.5 bg-[#EAE5D5] shrink-0 border-b border-[#E3D7B6]/50">
                    <button
                        onClick={() => setActiveTab('all-tab')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-colors whitespace-nowrap
                            ${activeTab === 'all-tab' ? 'bg-[#8E7C68] text-[#F4F4F5] shadow-sm' : 'text-[#8E7C68] hover:bg-[#8E7C68]/10'}`}
                    >
                        Все задания
                    </button>
                    <button
                        onClick={() => setActiveTab('together')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap
                            ${activeTab === 'together' ? 'bg-[#8E7C68] text-[#F4F4F5] shadow-sm' : 'text-[#8E7C68] hover:bg-[#8E7C68]/10'}`}
                    >
                        <Globe size={14} /> Для двоих
                    </button>
                    <button
                        onClick={() => setActiveTab('partners')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap
                            ${activeTab === 'partners' ? 'bg-[#8E7C68] text-[#F4F4F5] shadow-sm' : 'text-[#8E7C68] hover:bg-[#8E7C68]/10'}`}
                    >
                        <Users size={14} /> Партнёры
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#F4F4F5] flex flex-col">

                    {/* ── Tab: Все задания ── */}
                    {activeTab === 'all-tab' && (
                        <>
                            {/* Category filter chips */}
                            <div className="flex gap-1.5 px-3 py-2 shrink-0 border-b border-[#E3D7B6]/50 overflow-x-auto scrollbar-none bg-[#F4F4F5]">
                                {ALL_FILTERS.map(f => {
                                    const Icon = f.icon;
                                    const isActive = categoryFilter === f.id;
                                    return (
                                        <button
                                            key={f.id}
                                            onClick={() => setCategoryFilter(f.id)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold whitespace-nowrap border transition-all shrink-0
                                                ${isActive
                                                    ? 'bg-[#8E7C68] text-[#F4F4F5] border-[#8E7C68] shadow-sm'
                                                    : 'bg-white text-[#8E7C68] border-[#E3D7B6] hover:border-[#8E7C68]'
                                                }`}
                                        >
                                            {Icon && <Icon size={14} />}
                                            {f.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="p-4 space-y-6 animate-in fade-in duration-200">

                                {/* Global Daily Progress Reward Banner */}
                                {aggregatedDailyProgress && (
                                    <div className="p-4 rounded-lg border border-[#E3D7B6] bg-[#FDFBF7] flex items-center justify-between shadow-sm">
                                        <div>
                                            <h4 className="text-[#4A4238] font-bold text-sm mb-1">Награда за 4 задания</h4>
                                            <div className="flex items-center gap-2 text-sm text-[#8E7C68]">
                                                <span>Прогресс: {aggregatedDailyProgress.current} / {aggregatedDailyProgress.total}</span>
                                                <div className="w-20 h-1.5 bg-black/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-[#8E7C68] transition-all duration-500"
                                                        style={{ width: `${Math.min((aggregatedDailyProgress.current / aggregatedDailyProgress.total) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleClaimDailyRewardWrapped}
                                            disabled={!aggregatedDailyProgress.canClaim}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all
                                                ${aggregatedDailyProgress.isClaimed
                                                    ? 'bg-[#E3D7B6] text-[#8E7C68] cursor-default'
                                                    : aggregatedDailyProgress.canClaim
                                                        ? 'bg-yellow-400 hover:bg-yellow-300 text-yellow-900 shadow-md active:scale-95'
                                                        : 'bg-black/5 text-gray-400 cursor-not-allowed'
                                                }`}
                                        >
                                            {aggregatedDailyProgress.isClaimed
                                                ? <><Check size={16} /> ПОЛУЧЕНО</>
                                                : <><Star size={16} className="fill-yellow-600 text-yellow-600" /> <span>20</span></>
                                            }
                                        </button>
                                    </div>
                                )}


                                {/* Self Creation Form Modal */}
                                {showSelfCreate && (
                                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                                        <div className="bg-[#FDFBF7] border-2 border-[#E3D7B6] rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200 relative">
                                            <button
                                                onClick={() => setShowSelfCreate(false)}
                                                className="absolute top-4 right-4 text-[#8E7C68] hover:text-[#5c4d3c]"
                                            >
                                                <X size={20} />
                                            </button>

                                            <h3 className="text-[#8E7C68] font-bold text-lg mb-4 uppercase tracking-wider pr-8">Новое задание себе</h3>

                                            <form onSubmit={handleCreateSelf} className="space-y-4">
                                                <div className="space-y-1">
                                                    <label className="text-xs text-[#8E7C68] font-bold uppercase text-opacity-80">Заголовок *</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={newSelfQuest.title}
                                                        onChange={(e) => setNewSelfQuest({ ...newSelfQuest, title: e.target.value })}
                                                        placeholder="Что нужно сделать?"
                                                        className="w-full bg-white border border-[#E3D7B6] rounded-lg px-3 py-2 text-sm text-[#4A4238] focus:outline-none focus:border-[#8E7C68] transition-colors"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-xs text-[#8E7C68] font-bold uppercase text-opacity-80">Описание</label>
                                                    <textarea
                                                        value={newSelfQuest.description}
                                                        onChange={(e) => setNewSelfQuest({ ...newSelfQuest, description: e.target.value })}
                                                        placeholder="Детали задания..."
                                                        className="w-full bg-white border border-[#E3D7B6] rounded-lg px-3 py-2 text-sm text-[#4A4238] focus:outline-none focus:border-[#8E7C68] transition-colors h-20 resize-none"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-xs text-[#8E7C68] font-bold uppercase text-opacity-80">Награда (Примогемы)</label>
                                                    <div className="flex items-center gap-2 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-200">
                                                        <Star size={18} className="text-yellow-500 fill-yellow-500" />
                                                        <input
                                                            type="number"
                                                            value={newSelfQuest.reward}
                                                            onChange={(e) => setNewSelfQuest({ ...newSelfQuest, reward: parseInt(e.target.value) || 0 })}
                                                            className="flex-1 bg-transparent text-sm text-yellow-700 font-bold focus:outline-none"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs text-[#8E7C68] font-bold uppercase text-opacity-80">Тип:</label>
                                                    <div className="flex gap-2">
                                                        {['one-time', 'repeatable'].map(t => (
                                                            <button
                                                                key={t}
                                                                type="button"
                                                                onClick={() => setNewSelfQuest({ ...newSelfQuest, type: t })}
                                                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${newSelfQuest.type === t
                                                                    ? 'bg-[#8E7C68] text-white border-[#8E7C68]'
                                                                    : 'bg-white text-[#8E7C68] border-[#E3D7B6]'
                                                                    }`}
                                                            >
                                                                {t === 'one-time' ? 'Разовый' : 'Повторяемый'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <button
                                                    type="submit"
                                                    disabled={creatingSelf || !newSelfQuest.title.trim()}
                                                    className="w-full py-3 bg-[#8E7C68] text-white rounded-xl font-bold text-sm shadow-md hover:bg-[#7a6b5a] transition-all disabled:opacity-50 active:scale-[0.98]"
                                                >
                                                    {creatingSelf ? 'Создание...' : 'Добавить задание'}
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                )}

                                {/* Story Group (if exists and visible) */}
                                {showStory && mainQuest && !mainQuestProgress.isCompleted && (
                                    <div>
                                        <h3 className="text-[#8E7C68] text-sm font-bold uppercase tracking-widest mb-2 px-1 flex items-center gap-1.5">
                                            <Book size={11} /> Задания Архонтов
                                        </h3>
                                        <QuestItem
                                            quest={mainQuest}
                                            progress={mainQuestProgress}
                                            isCompleted={completedQuestIds.includes(mainQuest.id)}
                                            onToggleComplete={() => handleCompleteSystemQuest(mainQuest.id)}
                                            onDelete={() => onDeleteQuest(mainQuest.id)}
                                        />
                                    </div>
                                )}

                                {/* "My Quests" group (System + Self) */}
                                {showMine && allMyQuests.length > 0 && (
                                    <div>
                                        <h3 className="text-[#8E7C68] text-sm font-bold uppercase tracking-widest mb-2 px-1 flex items-center gap-1.5">
                                            <ScrollText size={11} /> Мои задания
                                        </h3>
                                        {allMyQuests.map(q => (
                                            q.creator_nickname ? (
                                                <FriendQuestItem
                                                    key={q.id}
                                                    quest={q}
                                                    onMarkDone={markAsCompleted}
                                                    onClaim={handleClaimReward}
                                                    onDelete={deleteFriendQuest}
                                                />
                                            ) : (
                                                <QuestItem
                                                    key={q.id}
                                                    quest={q}
                                                    isCompleted={completedQuestIds.includes(q.id)}
                                                    onToggleComplete={() => handleCompleteSystemQuest(q.id)}
                                                    onDelete={() => onDeleteQuest(q.id)}
                                                />
                                            )
                                        ))}
                                    </div>
                                )}

                                {/* Mine Empty State */}
                                {categoryFilter === 'mine' && allMyQuests.length === 0 && (
                                    <div className="p-8 rounded-lg border border-[#E3D7B6] bg-[#FDFBF7] text-[#8E7C68]/60 text-center text-sm italic">
                                        У вас пока нет своих заданий
                                    </div>
                                )}

                                {/* Friend quests */}
                                {showFriend && friendQuestsFromFriends.length > 0 && (
                                    <div>
                                        <h3 className="text-[#8E7C68] text-sm font-bold uppercase tracking-widest mb-2 px-1 flex items-center gap-1.5">
                                            <Heart size={11} /> От друзей
                                        </h3>
                                        {friendQuestsLoading ? (
                                            <div className="flex justify-center py-4">
                                                <div className="animate-spin w-5 h-5 border-2 border-[#8E7C68] border-t-transparent rounded-full" />
                                            </div>
                                        ) : (
                                            friendQuestsFromFriends.map(q => (
                                                <FriendQuestItem
                                                    key={q.id}
                                                    quest={q}
                                                    onMarkDone={markAsCompleted}
                                                    onClaim={handleClaimReward}
                                                    onDelete={deleteFriendQuest}
                                                />
                                            ))
                                        )}
                                    </div>
                                )}

                                {/* Empty state for special filters */}
                                {(categoryFilter === 'friend' || categoryFilter === 'one-time' || categoryFilter === 'repeatable') &&
                                    friendQuestsFromFriends.length === 0 && friendQuestsMineFiltered.length === 0 && !friendQuestsLoading && (
                                        <div className="p-4 rounded-lg border border-[#E3D7B6] bg-[#FDFBF7] text-[#8E7C68]/60 text-center text-sm italic">
                                            Нет заданий {categoryFilter === 'friend' ? 'от друзей' : categoryFilter === 'one-time' ? 'этого типа (разовые)' : 'этого типа (повторяемые)'}
                                        </div>
                                    )}


                                {/* Create Self Quest Button - Moved to bottom */}
                                <button
                                    onClick={() => setShowSelfCreate(true)}
                                    className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-[#E3D7B6] text-[#8E7C68] hover:bg-[#E3D7B6]/10 hover:border-[#8E7C68] transition-all flex items-center justify-center gap-2 group mt-2"
                                >
                                    <div className="p-1 rounded-full bg-[#E3D7B6]/30 group-hover:bg-[#E3D7B6]/50 transition-colors">
                                        <Plus size={16} />
                                    </div>
                                    <span className="font-bold text-sm">Новое задание</span>
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── Tab: Для двоих ── */}
                    {activeTab === 'together' && (
                        <div className="p-4 space-y-3 animate-in fade-in duration-200">
                            <p className="text-[#8E7C68] text-sm font-medium text-center pb-1 italic">
                                Эти задания выполняются вместе — засчитываются сразу обоим
                            </p>
                            {worldQuests.length > 0 ? (
                                worldQuests.map(quest => (
                                    <QuestItem
                                        key={quest.id}
                                        quest={quest}
                                        isCompleted={completedQuestIds.includes(quest.id)}
                                        onComplete={(questId) => handleCompleteWorldQuestWrapped(questId, resolvedPartnerId)}
                                        onDelete={onDeleteQuest}
                                    />
                                ))
                            ) : null}

                            {/* Friend "Together" Quests */}
                            {friendQuestsTogether.length > 0 ? (
                                friendQuestsTogether.map(q => (
                                    <FriendQuestItem
                                        key={q.id}
                                        quest={q}
                                        onMarkDone={markAsCompleted}
                                        onClaim={handleClaimReward}
                                        onDelete={deleteFriendQuest}
                                    />
                                ))
                            ) : null}

                            {worldQuests.length === 0 && friendQuestsTogether.length === 0 && (
                                <div className="p-8 rounded-lg border border-[#E3D7B6] bg-[#FDFBF7] text-[#8E7C68]/60 text-center text-sm italic">
                                    Нет совместных заданий
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Tab: Партнёры ── */}
                    {activeTab === 'partners' && (
                        <div className="flex flex-col flex-1 animate-in fade-in duration-200">
                            {connectionsLoading ? (
                                <div className="flex-1 flex items-center justify-center text-[#8E7C68]/60 text-sm">Загрузка...</div>
                            ) : connections.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-[#8E7C68]/60 text-sm p-8 text-center">
                                    У вас пока нет друзей.<br />Добавьте друга, чтобы выдавать задания.
                                </div>
                            ) : (
                                <>
                                    {/* Friend selector */}
                                    <div className="flex gap-1.5 px-4 pt-3 pb-2 flex-wrap shrink-0 border-b border-[#E3D7B6]/60">
                                        {connections.map(conn => (
                                            <button
                                                key={conn.id}
                                                onClick={() => setSelectedPartnerId(conn.partnerId)}
                                                className={`px-5 py-2 rounded-full text-sm font-bold border transition-all
                                                    ${resolvedPartnerId === conn.partnerId
                                                        ? 'bg-[#8E7C68] text-[#F4F4F5] border-[#8E7C68] shadow-sm'
                                                        : 'bg-white text-[#8E7C68] border-[#E3D7B6] hover:border-[#8E7C68]'
                                                    }`}
                                            >
                                                {conn.partnerNickname || 'Партнёр'}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                        {resolvedPartnerId
                                            ? <SharedQuestTab partnerId={resolvedPartnerId} />
                                            : <div className="text-center text-[#8E7C68]/60 text-sm mt-8">Загрузка...</div>
                                        }
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                </div>

                {/* Reward Notification Modal Overlay */}
                <AnimatePresence>
                    {rewardNotification && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                className="bg-[#FDFBF7] border-2 border-[#E3D7B6] rounded-2xl p-8 max-w-sm w-full shadow-2xl relative overflow-hidden text-center"
                            >
                                {/* Decorative star background pulses */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
                                    <Star size={300} className="fill-[#8E7C68]" />
                                </div>

                                <div className="relative z-10">
                                    <div className="bg-yellow-400 w-20 h-20 rounded-full shadow-lg mx-auto mb-6 flex items-center justify-center border-4 border-white animate-bounce-short">
                                        <Star size={40} className="text-yellow-900 fill-yellow-900" />
                                    </div>

                                    <h3 className="text-[#8E7C68] font-bold text-xl mb-1 uppercase tracking-wider">Награда получена!</h3>
                                    <p className="text-gray-500 text-sm mb-6 font-medium italic opacity-80">{rewardNotification.title}</p>

                                    <div className="bg-white/50 border border-[#E3D7B6] rounded-xl py-4 mb-8 flex flex-col items-center">
                                        <span className="text-xs font-bold text-[#8E7C68] uppercase opacity-70 mb-1">Вы получили</span>
                                        <div className="flex items-center gap-2">
                                            <Star size={24} className="text-yellow-500 fill-yellow-500" />
                                            <span className="text-3xl font-black text-[#4A4238]">+{rewardNotification.amount}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest px-4">Примогемов добавлено на баланс</span>
                                    </div>

                                    <button
                                        onClick={() => setRewardNotification(null)}
                                        className="w-full py-4 bg-[#8E7C68] hover:bg-[#7a6b5a] text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95"
                                    >
                                        ОТЛИЧНО
                                    </button>
                                </div>

                                {/* Particle effect simulation via CSS if needed, or just light glow */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent"></div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default QuestJournal;
