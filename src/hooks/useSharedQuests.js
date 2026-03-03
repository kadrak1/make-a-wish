import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { useFriendContext } from '../context/FriendContext';

export const useSharedQuests = (partnerId) => {
    const { user } = useAuth();
    const { refreshConnections } = useFriendContext();

    const [rawQuestsByMe, setRawQuestsByMe] = useState([]);
    const [rawQuestsForMe, setRawQuestsForMe] = useState([]);
    const [optimisticNewQuests, setOptimisticNewQuests] = useState([]);
    const [deletedQuestIds, setDeletedQuestIds] = useState(new Set());
    const [loading, setLoading] = useState(true);

    const fetchQuests = useCallback(async (silent = false) => {
        if (!user || !partnerId) return;
        if (!silent) setLoading(true);
        try {
            const { data: byMe, error: err1 } = await supabase
                .from('shared_quests')
                .select('*')
                .eq('created_by', user.id)
                .eq('assigned_to', partnerId)
                .not('status', 'in', '("claimed","deleted")')
                .order('created_at', { ascending: false });

            if (err1) throw err1;
            setRawQuestsByMe((byMe || []).filter(q => !deletedQuestIds.has(String(q.id))));

            const { data: forMe, error: err2 } = await supabase
                .from('shared_quests')
                .select('*')
                .eq('assigned_to', user.id)
                .eq('created_by', partnerId)
                .not('status', 'in', '("claimed","deleted")')
                .order('created_at', { ascending: false });

            if (err2) throw err2;
            setRawQuestsForMe((forMe || []).filter(q => !deletedQuestIds.has(String(q.id))));

            setOptimisticNewQuests(prev => {
                const rawTitles = new Set([...(byMe || []), ...(forMe || [])].map(q => q.title));
                return prev.filter(q => !rawTitles.has(q.title));
            });

        } catch (error) {
            console.error("Error fetching shared quests:", error);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [user, partnerId, deletedQuestIds]);

    useEffect(() => {
        fetchQuests();

        if (!user || !partnerId) return;

        const subscription = supabase
            .channel(`shared_quests_${partnerId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_quests' }, () => {
                fetchQuests(true);
            })
            .subscribe();

        return () => supabase.removeChannel(subscription);
    }, [user, partnerId, fetchQuests]);

    const questsByMe = useMemo(() => [...optimisticNewQuests, ...rawQuestsByMe], [rawQuestsByMe, optimisticNewQuests]);
    const questsForMe = useMemo(() => rawQuestsForMe, [rawQuestsForMe]);

    const createQuest = async (title, description, reward, questType = 'one-time', scheduleDays = []) => {
        const tempId = 'temp-' + Date.now();
        const newQuest = {
            id: tempId,
            created_by: user.id,
            assigned_to: partnerId,
            title,
            description,
            reward_primogems: parseInt(reward) || 0,
            schedule_days: scheduleDays,
            status: 'active',
            quest_type: questType,
            created_at: new Date().toISOString()
        };

        setOptimisticNewQuests(prev => [newQuest, ...prev]);

        try {
            const { error } = await supabase
                .from('shared_quests')
                .insert([{
                    created_by: user.id,
                    assigned_to: partnerId,
                    title,
                    description,
                    reward_primogems: parseInt(reward) || 0,
                    schedule_days: scheduleDays,
                    status: 'active',
                    quest_type: questType
                }]);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error("Error creating quest:", error);
            setOptimisticNewQuests(prev => prev.filter(q => q.id !== tempId));
            return { success: false, error: error.message };
        }
    };

    const markAsCompleted = async (questId) => {
        setRawQuestsForMe(prev => prev.map(q => q.id === questId ? { ...q, status: 'completed' } : q));

        try {
            const { error } = await supabase
                .from('shared_quests')
                .update({ status: 'completed', completed_at: new Date().toISOString() })
                .eq('id', questId)
                .eq('assigned_to', user.id);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error("Error completing quest:", error);
            fetchQuests(true);
            return { success: false, error: error.message };
        }
    };

    const verifyQuest = async (questId) => {
        setRawQuestsByMe(prev => prev.map(q => q.id === questId ? { ...q, status: 'verified' } : q));

        try {
            const { error } = await supabase
                .from('shared_quests')
                .update({ status: 'verified' })
                .eq('id', questId)
                .eq('created_by', user.id);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error("Error verifying quest:", error);
            fetchQuests(true);
            return { success: false, error: error.message };
        }
    };

    // Получить награду за квест от друга → цветные примогемы в соединении
    const claimReward = async (quest) => {
        if (quest.status !== 'verified') return { success: false, error: "Тут нечего получать" };
        if (quest.assigned_to !== user.id) return { success: false, error: "Это не ваш квест" };

        // Оптимистичное скрытие
        setDeletedQuestIds(prev => new Set(prev).add(String(quest.id)));
        setRawQuestsForMe(prev => prev.filter(q => q.id !== quest.id));

        try {
            // 1. Пометить квест как claimed
            const { error: dbError } = await supabase
                .from('shared_quests')
                .update({ status: 'claimed' })
                .eq('id', quest.id)
                .eq('status', 'verified');

            if (dbError) throw dbError;

            // 2. Найти соединение между user и creator квеста
            const creatorId = quest.created_by;
            const { data: connection, error: connError } = await supabase
                .from('user_connections')
                .select('id, user_id, linked_user_id, user_primogems, linked_user_primogems')
                .or(
                    `and(user_id.eq.${user.id},linked_user_id.eq.${creatorId}),` +
                    `and(user_id.eq.${creatorId},linked_user_id.eq.${user.id})`
                )
                .eq('status', 'accepted')
                .single();

            if (connError || !connection) {
                console.warn("Connection not found, cannot award colored primos:", connError);
                return { success: true }; // Quest claimed, but primos not awarded
            }

            const isInitiator = connection.user_id === user.id;
            const myCol = isInitiator ? 'user_primogems' : 'linked_user_primogems';
            const myCurrentPrimos = isInitiator
                ? (connection.user_primogems || 0)
                : (connection.linked_user_primogems || 0);

            const rewardPrimos = quest.reward_primogems || 0;
            const updates = { [myCol]: myCurrentPrimos + rewardPrimos };

            // Для together-квестов также начислить создателю
            if (quest.quest_type === 'together') {
                const creatorCol = isInitiator ? 'linked_user_primogems' : 'user_primogems';
                const creatorCurrentPrimos = isInitiator
                    ? (connection.linked_user_primogems || 0)
                    : (connection.user_primogems || 0);
                updates[creatorCol] = creatorCurrentPrimos + rewardPrimos;
            }

            const { error: updateError } = await supabase
                .from('user_connections')
                .update(updates)
                .eq('id', connection.id);

            if (updateError) throw updateError;

            // Обновить кэш соединений в FriendContext
            refreshConnections();

            return { success: true };
        } catch (error) {
            console.error("Error claiming reward:", error);
            setDeletedQuestIds(prev => { const n = new Set(prev); n.delete(String(quest.id)); return n; });
            fetchQuests(true);
            return { success: false, error: error.message };
        }
    };

    const deleteQuest = async (questId, quest) => {
        const isCreator = quest.created_by === user.id;
        const isAssignee = quest.assigned_to === user.id;
        const canDelete = isCreator || (isAssignee && quest.status === 'active');

        if (!canDelete) return { success: false, error: 'Нельзя удалить этот квест' };

        setDeletedQuestIds(prev => new Set(prev).add(String(questId)));
        setRawQuestsByMe(prev => prev.filter(q => String(q.id) !== String(questId)));
        setRawQuestsForMe(prev => prev.filter(q => String(q.id) !== String(questId)));
        setOptimisticNewQuests(prev => prev.filter(q => String(q.id) !== String(questId)));

        try {
            const { error } = await supabase
                .from('shared_quests')
                .delete()
                .eq('id', questId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error deleting quest:', error);
            setDeletedQuestIds(prev => { const next = new Set(prev); next.delete(String(questId)); return next; });
            fetchQuests(true);
            return { success: false, error: error.message || String(error) };
        }
    };

    return {
        questsByMe,
        questsForMe,
        loading,
        createQuest,
        markAsCompleted,
        verifyQuest,
        claimReward,
        deleteQuest
    };
};
