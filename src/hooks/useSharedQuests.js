import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

export const useSharedQuests = (partnerId) => {
    const { user } = useAuth();

    const [questsByMe, setQuestsByMe] = useState([]); // Quests I created
    const [questsForMe, setQuestsForMe] = useState([]); // Quests assigned to me
    const [loading, setLoading] = useState(true);

    const fetchQuests = useCallback(async () => {
        if (!user || !partnerId) return;
        setLoading(true);
        try {
            // Fetch quests created by me for partner
            const { data: byMe, error: err1 } = await supabase
                .from('shared_quests')
                .select('*')
                .eq('created_by', user.id)
                .eq('assigned_to', partnerId)
                .neq('status', 'claimed') // Optional: hide claimed ones? Or keep them. Let's keep them for history for now, user can filter.
                .order('created_at', { ascending: false });

            if (err1) throw err1;
            setQuestsByMe(byMe);

            // Fetch quests assigned to me by partner
            const { data: forMe, error: err2 } = await supabase
                .from('shared_quests')
                .select('*')
                .eq('assigned_to', user.id)
                .eq('created_by', partnerId)
                .neq('status', 'claimed')
                .order('created_at', { ascending: false });

            if (err2) throw err2;
            setQuestsForMe(forMe);

        } catch (error) {
            console.error("Error fetching shared quests:", error);
        } finally {
            setLoading(false);
        }
    }, [user, partnerId]);

    useEffect(() => {
        fetchQuests();

        // Subscription for real-time updates
        if (!user || !partnerId) return;

        const subscription = supabase
            .channel('public:shared_quests')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_quests' }, (payload) => {
                // Simplistic refresh on any change involving these users
                const rec = payload.new || payload.old;
                if (
                    (rec.created_by === user.id && rec.assigned_to === partnerId) ||
                    (rec.created_by === partnerId && rec.assigned_to === user.id)
                ) {
                    fetchQuests();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [user, partnerId, fetchQuests]);

    const createQuest = async (title, description, reward) => {
        try {
            const { error } = await supabase
                .from('shared_quests')
                .insert([{
                    created_by: user.id,
                    assigned_to: partnerId,
                    title,
                    description,
                    reward_primogems: parseInt(reward) || 0,
                    status: 'active'
                }]);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error("Error creating quest:", error);
            return { success: false, error: error.message };
        }
    };

    const markAsCompleted = async (questId) => {
        try {
            const { error } = await supabase
                .from('shared_quests')
                .update({ status: 'completed', completed_at: new Date().toISOString() })
                .eq('id', questId)
                .eq('assigned_to', user.id); // Security check

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error("Error completing quest:", error);
            return { success: false, error: error.message };
        }
    };

    const verifyQuest = async (questId) => {
        try {
            const { error } = await supabase
                .from('shared_quests')
                .update({ status: 'verified' })
                .eq('id', questId)
                .eq('created_by', user.id); // Security check

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error("Error verifying quest:", error);
            return { success: false, error: error.message };
        }
    };

    const claimReward = async (quest) => {
        if (quest.status !== 'verified') return { success: false, error: "Тут нечего получать" };
        if (quest.assigned_to !== user.id) return { success: false, error: "Это не ваш квест" };

        try {
            // 1. Update status to 'claimed' to prevent double claim
            const { error: dbError } = await supabase
                .from('shared_quests')
                .update({ status: 'claimed' })
                .eq('id', quest.id)
                .eq('status', 'verified');

            if (dbError) throw dbError;

            // 2. Add gems to the specific connection balance
            // We need to know who is who in the connection logic.
            // Simplified: We accept that 'permission' to update user_connections relies on RLS allowing update if auth.uid is involved.
            // However, we need to know WHICH column to update.
            // Since we know the partnerId, we can find the connection row.

            // Fetch the connection ID and determine role
            const { data: connection, error: connError } = await supabase
                .from('user_connections')
                .select('id, user_id, linked_user_id, user_balance, linked_user_balance')
                .or(`and(user_id.eq.${user.id},linked_user_id.eq.${partnerId}),and(user_id.eq.${partnerId},linked_user_id.eq.${user.id})`)
                .single();

            if (connError) throw connError;

            const isUserIsInitiator = connection.user_id === user.id;
            const columnToUpdate = isUserIsInitiator ? 'user_balance' : 'linked_user_balance';
            const currentBalance = isUserIsInitiator ? connection.user_balance : connection.linked_user_balance;
            const newBalance = (currentBalance || 0) + (quest.reward_primogems || 0);

            const { error: updateError } = await supabase
                .from('user_connections')
                .update({ [columnToUpdate]: newBalance })
                .eq('id', connection.id);

            if (updateError) throw updateError;

            // Also update local state if needed via callback or let Realtime handle it (UserConnections hook should pick it up if we refresh)
            // For now, return success.

            return { success: true };
        } catch (error) {
            console.error("Error claiming reward:", error);
            return { success: false, error: error.message };
        }
    };

    return {
        questsByMe,
        questsForMe,
        loading,
        createQuest,
        markAsCompleted,
        verifyQuest,
        claimReward
    };
};
