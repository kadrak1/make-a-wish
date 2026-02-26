import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

export const useSharedQuests = (partnerId) => {
    const { user } = useAuth();

    // Raw server data
    const [rawQuestsByMe, setRawQuestsByMe] = useState([]);
    const [rawQuestsForMe, setRawQuestsForMe] = useState([]);

    // Local optimistic states
    const [optimisticNewQuests, setOptimisticNewQuests] = useState([]);
    const [deletedQuestIds, setDeletedQuestIds] = useState(new Set());

    const [loading, setLoading] = useState(true);

    const fetchQuests = useCallback(async (silent = false) => {
        if (!user || !partnerId) return;
        if (!silent) setLoading(true);
        try {
            // Fetch quests created by me for partner
            const { data: byMe, error: err1 } = await supabase
                .from('shared_quests')
                .select('*')
                .eq('created_by', user.id)
                .eq('assigned_to', partnerId)
                .not('status', 'in', '("claimed","deleted")')
                .order('created_at', { ascending: false });

            if (err1) throw err1;
            // Filter out locally deleted ones immediately when setting raw state
            setRawQuestsByMe((byMe || []).filter(q => !deletedQuestIds.has(String(q.id))));

            // Fetch quests assigned to me by partner
            const { data: forMe, error: err2 } = await supabase
                .from('shared_quests')
                .select('*')
                .eq('assigned_to', user.id)
                .eq('created_by', partnerId)
                .not('status', 'in', '("claimed","deleted")')
                .order('created_at', { ascending: false });

            if (err2) throw err2;
            setRawQuestsForMe((forMe || []).filter(q => !deletedQuestIds.has(String(q.id))));

            // Clean up optimistic new quests if they now exist in raw
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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_quests' }, (payload) => {
                // IMPORTANT: Only refresh if it's NOT a local action we already handled optimistically
                // But since we have the blacklist, it's safe to refresh.
                fetchQuests(true);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [user, partnerId, fetchQuests]);

    // Computed display lists (simplified)
    const questsByMe = useMemo(() => {
        return [...optimisticNewQuests, ...rawQuestsByMe];
    }, [rawQuestsByMe, optimisticNewQuests]);

    const questsForMe = useMemo(() => {
        return rawQuestsForMe;
    }, [rawQuestsForMe]);

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

        // Optimistic add
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
            // Rollback
            setOptimisticNewQuests(prev => prev.filter(q => q.id !== tempId));
            return { success: false, error: error.message };
        }
    };

    const markAsCompleted = async (questId) => {
        // Optimistic local state update
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
            fetchQuests(true); // Restore state
            return { success: false, error: error.message };
        }
    };

    const verifyQuest = async (questId) => {
        // Optimistic local state update
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
            fetchQuests(true); // Restore state
            return { success: false, error: error.message };
        }
    };

    const claimReward = async (quest) => {
        if (quest.status !== 'verified') return { success: false, error: "Тут нечего получать" };
        if (quest.assigned_to !== user.id) return { success: false, error: "Это не ваш квест" };

        // Optimistic hide
        setDeletedQuestIds(prev => new Set(prev).add(String(quest.id)));
        setRawQuestsForMe(prev => prev.filter(q => q.id !== quest.id));

        try {
            const { error: dbError } = await supabase
                .from('shared_quests')
                .update({ status: 'claimed' })
                .eq('id', quest.id)
                .eq('status', 'verified');

            if (dbError) throw dbError;

            const { data: gameState, error: fetchError } = await supabase
                .from('game_state')
                .select('primogems')
                .eq('user_id', user.id)
                .single();

            if (fetchError) throw fetchError;

            const newBalance = (gameState.primogems || 0) + (quest.reward_primogems || 0);

            const { error: updateError } = await supabase
                .from('game_state')
                .update({ primogems: newBalance })
                .eq('user_id', user.id);

            if (updateError) throw updateError;

            if (quest.quest_type === 'together') {
                const { data: creatorState, error: creatorFetchError } = await supabase
                    .from('game_state')
                    .select('primogems')
                    .eq('user_id', quest.created_by)
                    .single();

                if (!creatorFetchError && creatorState) {
                    const creatorNewBalance = (creatorState.primogems || 0) + (quest.reward_primogems || 0);
                    await supabase
                        .from('game_state')
                        .update({ primogems: creatorNewBalance })
                        .eq('user_id', quest.created_by);
                }
            }

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

        if (!canDelete) {
            return { success: false, error: 'Нельзя удалить этот квест' };
        }

        // IMMEDIATE LOCAL UPDATE (Matching All Quests behavior)
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
            // Rollback
            setDeletedQuestIds(prev => {
                const next = new Set(prev);
                next.delete(String(questId));
                return next;
            });
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
