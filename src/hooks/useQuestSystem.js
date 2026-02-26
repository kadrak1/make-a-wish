import { useState, useCallback, useEffect } from 'react';
import { dailyQuests as defaultDailyQuests } from '../config/quests/daily';
import { mainQuestSteps as defaultMainQuestSteps } from '../config/quests/main';
import { worldQuests as defaultWorldQuests } from '../config/quests/world';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { useFriendContext } from '../context/FriendContext';

export const useQuestSystem = () => {
    const { user } = useAuth();
    const { activeConnection, isGlobalContext, refreshConnections } = useFriendContext();

    // Global State (Backup)
    const [globalPrimogems, setGlobalPrimogems] = useState(0);
    const [globalWishes, setGlobalWishes] = useState(0);

    // Derived State based on Context
    const primogems = isGlobalContext ? globalPrimogems : (activeConnection?.myBalance || 0);
    const wishes = isGlobalContext ? globalWishes : (activeConnection?.wishes || 0);

    // We also need to handle Pity if we want it separate. 
    // Assuming GachaSystem handles Pity, we might need to export it or pass it. 
    // For now, let's just make sure Primogems and Wishes switch.
    const [completedQuestIds, setCompletedQuestIds] = useState([]);

    // State for quests to allow dynamic updates from DB
    const [dailyQuests, setDailyQuests] = useState(defaultDailyQuests);
    const [mainQuestSteps, setMainQuestSteps] = useState(defaultMainQuestSteps);
    const [worldQuests, setWorldQuests] = useState(defaultWorldQuests);

    const [dailyRewardClaimed, setDailyRewardClaimed] = useState(false);
    const [compensationClaimed, setCompensationClaimed] = useState(false);
    const [hiddenQuestIds, setHiddenQuestIds] = useState([]);
    const [loading, setLoading] = useState(true);

    // Helper to get current Moscow date string (YYYY-MM-DD)
    const getMoscowDateString = () => {
        const now = new Date();
        const moscowTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Moscow" }));
        return moscowTime.toISOString().split('T')[0];
    };

    // Fetch data from Supabase
    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Game State
                const { data: gameState, error: stateError } = await supabase
                    .from('game_state')
                    .select('primogems, wishes, completed_quests, settings')
                    .eq('user_id', user.id)
                    .single();

                if (stateError) throw stateError;

                let currentCompletedQuests = gameState.completed_quests || [];
                let currentSettings = gameState.settings || {};
                let currentDailyRewardClaimed = currentSettings.daily_reward_claimed || false;
                let currentCompensationClaimed = currentSettings.compensation_claimed || false;

                // Check for daily reset
                const today = getMoscowDateString();
                const lastReset = currentSettings.last_daily_reset;

                if (lastReset !== today) {
                    // Reset daily quests
                    // This logic ensures that on a new day (Moscow time):
                    // 1. All quests that are NOT main or world quests are removed (this covers 'daily_' and numeric IDs)
                    // 2. The daily_reward_claimed flag is set to false
                    // 3. The UI will update to show 0/4 progress and remove the "All completed" banner
                    currentCompletedQuests = currentCompletedQuests.filter(id => String(id).startsWith('main_') || String(id).startsWith('world_'));
                    currentDailyRewardClaimed = false;

                    // Update DB with reset state
                    await supabase
                        .from('game_state')
                        .update({
                            completed_quests: currentCompletedQuests,
                            settings: {
                                ...currentSettings,
                                last_daily_reset: today,
                                daily_reward_claimed: false
                            }
                        })
                        .eq('user_id', user.id);

                    // Update local settings to reflect reset
                    currentSettings = {
                        ...currentSettings,
                        last_daily_reset: today,
                        daily_reward_claimed: false
                    };
                }

                if (gameState) {
                    setGlobalPrimogems(gameState.primogems || 0);
                    setGlobalWishes(gameState.wishes || 0);
                    setCompletedQuestIds(currentCompletedQuests);
                    setDailyRewardClaimed(currentDailyRewardClaimed);
                    setCompensationClaimed(currentCompensationClaimed);
                    setHiddenQuestIds(currentSettings.hidden_quests || []);
                }

                // 2. Fetch Custom Quests Config
                const { data: questConfig, error: questError } = await supabase
                    .from('user_quests')
                    .select('daily_quests_config, main_quests_config, world_quests_config')
                    .eq('user_id', user.id)
                    .single();

                console.log("Quest Config Fetch Result:", { questConfig, questError, userId: user.id });

                // Prepare defaults
                let finalDaily = defaultDailyQuests;
                let finalMain = defaultMainQuestSteps;
                let finalWorld = defaultWorldQuests;
                let needsUpdate = false;
                let updates = { user_id: user.id };

                if (questConfig) {
                    // Daily Quests: Use DB if not null, otherwise default
                    if (questConfig.daily_quests_config !== null) {
                        // Check if we need to migrate from old IDs (daily_X) to new numeric IDs
                        const hasOldIds = questConfig.daily_quests_config.some(q => String(q.id).startsWith('daily_'));
                        if (hasOldIds) {
                            console.log("Migrating daily quests to new ID format...");
                            finalDaily = defaultDailyQuests; // Use new defaults
                            needsUpdate = true;
                            updates.daily_quests_config = defaultDailyQuests;
                        } else {
                            finalDaily = questConfig.daily_quests_config;
                        }
                    } else {
                        needsUpdate = true;
                        updates.daily_quests_config = defaultDailyQuests;
                    }

                    // Main Quests: Use DB if not null, otherwise default
                    if (questConfig.main_quests_config !== null) {
                        finalMain = questConfig.main_quests_config;
                    } else {
                        needsUpdate = true;
                        updates.main_quests_config = defaultMainQuestSteps;
                    }

                    // World Quests: Use DB if not null, otherwise default
                    if (questConfig.world_quests_config !== null) {
                        finalWorld = questConfig.world_quests_config;
                    } else {
                        needsUpdate = true;
                        updates.world_quests_config = defaultWorldQuests;
                    }
                } else {
                    // No row exists, seed everything
                    needsUpdate = true;
                    updates = {
                        user_id: user.id,
                        daily_quests_config: defaultDailyQuests,
                        main_quests_config: defaultMainQuestSteps,
                        world_quests_config: defaultWorldQuests
                    };
                }

                // Apply updates if needed (Seeding defaults)
                if (needsUpdate) {
                    console.log("Seeding default quests to Supabase...");
                    const { error: upsertError } = await supabase
                        .from('user_quests')
                        .upsert(updates);

                    if (upsertError) console.error("Error seeding quests:", upsertError);
                }

                // Set state (normalize daily quests structure if needed)
                const normalizedDaily = finalDaily.map(q => ({
                    ...q,
                    title: q.title || q.text || 'Новое задание',
                    description: q.description || '',
                    type: q.type || 'daily',
                    rewards: q.rewards || { primogems: q.reward || 0 }
                }));

                setDailyQuests(normalizedDaily.filter(q => !(currentSettings.hidden_quests || []).includes(q.id)));
                setMainQuestSteps(finalMain.filter(q => !(currentSettings.hidden_quests || []).includes(q.id)));
                setWorldQuests(finalWorld.filter(q => !(currentSettings.hidden_quests || []).includes(q.id)));

            } catch (error) {
                console.error("Error fetching quest data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Realtime: sync primogems/wishes when game_state changes externally
        // (e.g. when claimReward in useSharedQuests writes to game_state)
        const gameStateChannel = supabase
            .channel(`game_state_${user.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'game_state',
                filter: `user_id=eq.${user.id}`
            }, (payload) => {
                if (payload.new) {
                    if (payload.new.primogems !== undefined) setGlobalPrimogems(payload.new.primogems);
                    if (payload.new.wishes !== undefined) setGlobalWishes(payload.new.wishes);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(gameStateChannel);
        };
    }, [user]);

    // Determine current main quest step
    const currentMainQuestIndex = mainQuestSteps.findIndex(step => !completedQuestIds.includes(step.id));
    const isMainQuestCompleted = currentMainQuestIndex === -1 && mainQuestSteps.every(step => completedQuestIds.includes(step.id));

    const currentMainQuest = currentMainQuestIndex !== -1 ? mainQuestSteps[currentMainQuestIndex] : null;

    const mainQuestProgress = {
        current: currentMainQuestIndex !== -1 ? currentMainQuestIndex + 1 : mainQuestSteps.length,
        total: mainQuestSteps.length,
        isCompleted: currentMainQuestIndex === -1
    };

    // Calculate daily progress
    const completedDailyCount = dailyQuests.filter(q => completedQuestIds.includes(q.id)).length;
    const dailyProgress = {
        current: completedDailyCount,
        total: 4, // Hardcoded requirement as per request
        isClaimed: dailyRewardClaimed,
        canClaim: completedDailyCount >= 4 && !dailyRewardClaimed
    };

    // Combine all quests for easy lookup (include all steps for lookup purposes)
    const allQuests = [
        ...dailyQuests,
        ...mainQuestSteps,
        ...worldQuests
    ];

    const updateGameState = async (updates) => {
        if (!user) return;

        // Optimistic update for UI
        if (updates.primogems !== undefined) {
            if (isGlobalContext) setGlobalPrimogems(updates.primogems);
            // Note: For active connection, we depend on refreshConnections or local hack if needed, 
            // but ideally we should update the valid state source.
        }
        if (updates.wishes !== undefined) {
            if (isGlobalContext) setGlobalWishes(updates.wishes);
        }
        if (updates.completed_quests !== undefined && isGlobalContext) setCompletedQuestIds(updates.completed_quests);


        try {
            if (isGlobalContext) {
                // Update Global Game State
                const { error } = await supabase
                    .from('game_state')
                    .update(updates)
                    .eq('user_id', user.id);
                if (error) throw error;
            } else {
                // Update Connection State
                // Map fields: primogems -> user_balance (or linked), wishes -> wishes_balance
                if (!activeConnection) return;

                const dbUpdates = {};
                // Determine which balance column is mine
                const isInitiator = activeConnection.user_id === user.id;
                const balanceCol = isInitiator ? 'user_balance' : 'linked_user_balance';

                if (updates.primogems !== undefined) dbUpdates[balanceCol] = updates.primogems;
                if (updates.wishes !== undefined) dbUpdates.wishes_balance = updates.wishes;

                // What about quests? Completed quests for a connection might not be stored yet.
                // Ignoring quests for connection context for now unless specific req.

                const { error } = await supabase
                    .from('user_connections')
                    .update(dbUpdates)
                    .eq('id', activeConnection.id);

                if (error) throw error;

                // Trigger refresh
                refreshConnections();
            }

        } catch (error) {
            console.error("Error updating state:", error);
        }
    };

    const completeQuest = useCallback(async (questId) => {
        if (completedQuestIds.includes(questId)) return;

        const quest = allQuests.find(q => q.id === questId);
        if (!quest) return;

        const newPrimos = primogems + (quest.rewards.primogems || 0);
        let newWishes = wishes;

        if (quest.rewards.wishes) {
            newWishes += quest.rewards.wishes;
        }

        const newCompleted = [...completedQuestIds, questId];

        await updateGameState({
            primogems: newPrimos,
            wishes: newWishes,
            completed_quests: newCompleted
        });

        return { success: true, rewardAmount: quest.rewards.primogems || 0 };
    }, [completedQuestIds, allQuests, primogems, wishes, user]);

    const claimDailyReward = useCallback(async () => {
        if (dailyProgress.canClaim) {
            const newPrimos = primogems + 20;
            setDailyRewardClaimed(true); // Optimistic
            setGlobalPrimogems(newPrimos);

            try {
                // Fetch current settings first to preserve other settings
                const { data: gameState } = await supabase
                    .from('game_state')
                    .select('settings')
                    .eq('user_id', user.id)
                    .single();

                const currentSettings = gameState?.settings || {};

                await supabase
                    .from('game_state')
                    .update({
                        primogems: newPrimos,
                        settings: {
                            ...currentSettings,
                            daily_reward_claimed: true
                        }
                    })
                    .eq('user_id', user.id);

                return { success: true, rewardAmount: 20 };
            } catch (error) {
                console.error("Error claiming daily reward:", error);
                setDailyRewardClaimed(false); // Revert
                setGlobalPrimogems(primogems);
                return { success: false, error: error.message };
            }
        }
        return { success: false, error: "Недостаточно выполненных заданий" };
    }, [dailyProgress, primogems, user]);

    const claimCompensation = useCallback(async () => {
        if (!compensationClaimed) {
            const newPrimos = primogems + 40;
            setCompensationClaimed(true); // Optimistic
            setGlobalPrimogems(newPrimos);

            try {
                // Fetch current settings first
                const { data: gameState } = await supabase
                    .from('game_state')
                    .select('settings')
                    .eq('user_id', user.id)
                    .single();

                const currentSettings = gameState?.settings || {};

                await supabase
                    .from('game_state')
                    .update({
                        primogems: newPrimos,
                        settings: {
                            ...currentSettings,
                            compensation_claimed: true
                        }
                    })
                    .eq('user_id', user.id);
            } catch (error) {
                console.error("Error claiming compensation:", error);
                setCompensationClaimed(false); // Revert
                setGlobalPrimogems(primogems);
            }
        }
    }, [compensationClaimed, primogems, user]);

    const buyWish = useCallback(async () => {
        if (primogems >= 100) {
            const newPrimos = primogems - 100;
            const newWishes = wishes + 1;

            await updateGameState({
                primogems: newPrimos,
                wishes: newWishes
            });
            return true;
        }
        return false;
    }, [primogems, wishes, user]);

    const spendWish = useCallback(async () => {
        if (wishes > 0) {
            const newWishes = wishes - 1;
            await updateGameState({ wishes: newWishes });
            return true;
        }
        return false;
    }, [wishes, user]);

    const consumePrimosForWish = useCallback(async () => {
        if (primogems >= 100) {
            const newPrimos = primogems - 100;
            await updateGameState({ primogems: newPrimos });
            return true;
        }
        return false;
    }, [primogems, user]);

    const deleteSystemQuest = useCallback(async (questId) => {
        const newHidden = [...hiddenQuestIds, questId];
        // Optimistic update
        setHiddenQuestIds(newHidden);
        setDailyQuests(prev => prev.filter(q => q.id !== questId));
        setMainQuestSteps(prev => prev.filter(q => q.id !== questId));
        setWorldQuests(prev => prev.filter(q => q.id !== questId));

        try {
            const { data: gameState } = await supabase
                .from('game_state')
                .select('settings')
                .eq('user_id', user.id)
                .single();

            const currentSettings = gameState?.settings || {};
            await supabase
                .from('game_state')
                .update({
                    settings: { ...currentSettings, hidden_quests: newHidden }
                })
                .eq('user_id', user.id);
        } catch (error) {
            console.error('Error hiding quest:', error);
            // Revert
            setHiddenQuestIds(hiddenQuestIds);
        }
    }, [hiddenQuestIds, user]);

    // Mark world quest completed for BOTH current user and partner simultaneously
    const completeWorldQuest = useCallback(async (questId, partnerId) => {
        // Optimistic local update
        setCompletedQuestIds(prev => [...prev, questId]);

        try {
            // 1. Fetch current user's completed_quest_ids (already in state, but fetch fresh for safety)
            const [myState, partnerState] = await Promise.all([
                supabase.from('game_state').select('completed_quest_ids').eq('user_id', user.id).single(),
                supabase.from('game_state').select('completed_quest_ids').eq('user_id', partnerId).single(),
            ]);

            const myIds = myState.data?.completed_quest_ids || [];
            const partnerIds = partnerState.data?.completed_quest_ids || [];

            await Promise.all([
                supabase.from('game_state')
                    .update({ completed_quest_ids: [...new Set([...myIds, questId])] })
                    .eq('user_id', user.id),
                supabase.from('game_state')
                    .update({ completed_quest_ids: [...new Set([...partnerIds, questId])] })
                    .eq('user_id', partnerId),
            ]);
        } catch (error) {
            console.error('Error completing world quest for both:', error);
            // Revert optimistic update
            setCompletedQuestIds(prev => prev.filter(id => id !== questId));
        }
    }, [user]);

    return {
        primogems,
        wishes,
        completedQuestIds,
        dailyQuests,
        mainQuest: currentMainQuest,
        mainQuestProgress,
        worldQuests,
        dailyProgress,
        compensationClaimed,
        completeQuest,
        deleteSystemQuest,
        completeWorldQuest,
        claimDailyReward,
        claimCompensation,
        buyWish,
        spendWish,
        consumePrimosForWish,
        loading
    };
};
