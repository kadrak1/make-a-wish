import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

export const useAllMySharedQuests = () => {
    const { user } = useAuth();
    const [rawQuests, setRawQuests] = useState([]);
    const [deletedQuestIds, setDeletedQuestIds] = useState(new Set());
    const [loading, setLoading] = useState(true);

    const fetchQuests = useCallback(async (silent = false) => {
        if (!user) return;
        if (!silent) setLoading(true);
        try {
            const { data, error } = await supabase
                .from('shared_quests')
                .select('*, creator:created_by(nickname)')
                .eq('assigned_to', user.id)
                .not('status', 'eq', 'deleted')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRawQuests(data || []);

        } catch (error) {
            console.error("Error fetching all my shared quests:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchQuests();

        if (!user) return;

        const sub = supabase
            .channel(`my_shared_quests_${user.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'shared_quests'
            }, (payload) => {
                const rec = payload.new || payload.old;
                if (!rec) return;

                if (payload.eventType === 'DELETE' || rec.assigned_to === user.id) {
                    fetchQuests(true);
                }
            })
            .subscribe();

        return () => supabase.removeChannel(sub);
    }, [user, fetchQuests]);

    // Derived display state
    const quests = useMemo(() => {
        const processedQuests = [];
        const questsToReset = [];
        const today = new Date().setHours(0, 0, 0, 0);

        rawQuests.forEach(q => {
            if (deletedQuestIds.has(String(q.id))) return;

            const isRepeatable = q.quest_type === 'repeatable';

            // If repeatable and claimed, check if it should reset
            if (isRepeatable && q.status === 'claimed' && q.completed_at) {
                const compDate = new Date(q.completed_at).setHours(0, 0, 0, 0);
                if (compDate < today) {
                    questsToReset.push(q.id);
                    processedQuests.push({
                        ...q,
                        status: 'active',
                        completed_at: null,
                        creator_nickname: q.creator?.nickname || 'Друг'
                    });
                    return;
                } else {
                    return; // Still claimed for today
                }
            }

            if (q.status === 'claimed') return;

            processedQuests.push({
                ...q,
                creator_nickname: q.creator?.nickname || 'Друг'
            });
        });

        if (questsToReset.length > 0) {
            supabase.from('shared_quests')
                .update({ status: 'active', completed_at: null })
                .in('id', questsToReset)
                .then(({ error }) => { if (error) console.error("Error resetting quests:", error); });
        }

        return processedQuests;
    }, [rawQuests, deletedQuestIds]);

    const markAsCompleted = async (questId) => {
        try {
            const { error } = await supabase
                .from('shared_quests')
                .update({ status: 'completed', completed_at: new Date().toISOString() })
                .eq('id', questId)
                .eq('assigned_to', user.id);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error completing quest:', error);
            return { success: false, error: error.message };
        }
    };

    const deleteQuest = async (questId) => {
        // Store rollback state for rawQuests
        const rollbackVal = [...rawQuests];

        // IMMEDIATE LOCAL UPDATE
        setDeletedQuestIds(prev => new Set(prev).add(String(questId)));
        setRawQuests(prev => prev.filter(q => String(q.id) !== String(questId)));

        try {
            const { error } = await supabase
                .from('shared_quests')
                .delete()
                .eq('id', questId)
                .eq('assigned_to', user.id);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error deleting shared quest:', error);
            // Rollback
            setDeletedQuestIds(prev => {
                const next = new Set(prev);
                next.delete(String(questId));
                return next;
            });
            setRawQuests(rollbackVal);
            return { success: false, error: error.message || String(error) };
        }
    };

    const claimReward = async (quest) => {
        if (quest.status !== 'verified') return { success: false, error: "Тут нечего получать" };
        if (quest.assigned_to !== user.id) return { success: false, error: "Это не ваш квест" };

        // Optimistic hide
        setDeletedQuestIds(prev => new Set(prev).add(String(quest.id)));
        setRawQuests(prev => prev.filter(q => q.id !== quest.id));

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

            return { success: true, rewardAmount: quest.reward_primogems || 0 };
        } catch (error) {
            console.error("Error claiming reward:", error);
            setDeletedQuestIds(prev => { const n = new Set(prev); n.delete(String(quest.id)); return n; });
            fetchQuests(true);
            return { success: false, error: error.message };
        }
    };

    return { quests, loading, markAsCompleted, deleteQuest, claimReward };
};
