import React, { useState } from 'react';
import { X, Book, Star, Globe, Calendar, Check, Gem, UserPlus, Users } from 'lucide-react';
import QuestItem from './QuestItem';
import { useUserConnections } from '../hooks/useUserConnections';
import { useAuth } from '../context/AuthContext';
import UserLinkManager from './UserLinkManager';
import SharedQuestTab from './SharedQuestTab';

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
    const { connections, loading: connectionsLoading } = useUserConnections();

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

                {/* Tabs */}
                <div className="flex p-2 gap-2 bg-[#EAE5D5] shrink-0 overflow-x-auto border-b border-[#E3D7B6]/50 scrollbar-none">
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

                    {/* Partner Tabs */}
                    {!connectionsLoading && connections.map(conn => {
                        const partnerId = conn.linked_user_id; // Usually it's this, but need to be careful with fetch logic if `connections` normalization is needed. 
                        // In useUserConnections, select was: id, user_id, linked_user_id. And filter was OR.
                        // So I need to find which ID is NOT me. 
                        // But I don't have 'my' ID easily here without context.
                        // Wait, fetching in hook handles user context.
                        // Let's rely on the hook to return Normalized 'friend' object? 
                        // The hook returns raw rows.
                        // I should verify logic. Hook: select ... OR ...
                        // If I am user_id, partner is linked_user_id.
                        // If I am linked_user_id, partner is user_id.
                        // I need current user ID here to know label.
                        // Let's pass user ID or handle it in hook.
                        // For now, I'll just use a generic icon or the ID that works.
                        // Ideally I import useAuth here.
                        return (
                            <button
                                key={conn.id}
                                onClick={() => setActiveTab(`partner_${conn.id}`)}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 whitespace-nowrap max-w-[150px] truncate ${activeTab === `partner_${conn.id}` ? 'bg-pink-500 text-white shadow-sm' : 'text-[#8E7C68] hover:bg-[#8E7C68]/10'}`}
                            >
                                <Users size={14} /> {conn.partnerNickname || conn.partnerId || 'Партнер'}
                            </button>
                        );
                    })}

                    <button
                        onClick={() => setActiveTab('add_user')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'add_user' ? 'bg-green-600 text-white shadow-sm' : 'text-[#8E7C68] hover:bg-[#8E7C68]/10'}`}
                    >
                        <UserPlus size={14} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-[#F4F4F5]">
                    {activeTab === 'add_user' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <UserLinkManager />
                        </div>
                    ) : activeTab.startsWith('partner_') ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {(() => {
                                const connId = activeTab.replace('partner_', '');
                                const conn = connections.find(c => c.id === connId);
                                // We need the Partner ID to pass to SharedQuestTab. 
                                // Since I don't have 'user' here, I'll cheat/hack or fetch it properly.
                                // Actually, I should use useAuth in QuestJournal.
                                // But I can see the hook `useUserConnections` logic.
                                // Let's try to assume basic usage or fix it.
                                // To fix properly: I need to know MY id to exclude it.
                                return (
                                    <PartnerTabWrapper connection={conn} />
                                );
                            })()}
                        </div>
                    ) : (
                        <>
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
                        </>
                    )}
                </div>

            </div>
        </div>
    );
};

// Helper component to cleanly get the partner ID using Auth context
const PartnerTabWrapper = ({ connection }) => {
    const { user } = useAuth();

    // Safety check
    if (!user) return null;

    const partnerId = connection.user_id === user.id ? connection.linked_user_id : connection.user_id;
    return <SharedQuestTab partnerId={partnerId} myBalance={connection.myBalance} />;
};


export default QuestJournal;
