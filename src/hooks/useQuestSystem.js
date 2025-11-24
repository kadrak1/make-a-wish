import { useState, useCallback, useEffect } from 'react';
import { dailyQuests as defaultDailyQuests } from '../config/quests/daily';
import { mainQuestSteps as defaultMainQuestSteps } from '../config/quests/main';
import { worldQuests as defaultWorldQuests } from '../config/quests/world';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

export const useQuestSystem = () => {
    const { user } = useAuth();
    const [primogems, setPrimogems] = useState(0);
    const [wishes, setWishes] = useState(0);
    const [completedQuestIds, setCompletedQuestIds] = useState([]);

    // State for quests to allow dynamic updates from DB
    const [dailyQuests, setDailyQuests] = useState(defaultDailyQuests);
    const [mainQuestSteps, setMainQuestSteps] = useState(defaultMainQuestSteps);
    const [worldQuests, setWorldQuests] = useState(defaultWorldQuests);

    const [dailyRewardClaimed, setDailyRewardClaimed] = useState(false);
    const [compensationClaimed, setCompensationClaimed] = useState(false);
    const [loading, setLoading] = useState(true);

    // Helper to get current Moscow date string (YYYY-MM-DD)
    const getMoscowDateString = () => {
        const now = new Date();
        const moscowTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Moscow" }));
        return moscowTime.toISOString().split('T')[0];
    };

    // Fetch data from Supabase
    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            // 1. Fetch Game State & User Quests in parallel
            const [gameStateResponse, questConfigResponse] = await Promise.all([
                supabase
                    .from('game_state')
                    .select('primogems, wishes, completed_quests, settings')
                    .eq('user_id', user.id)
                    .single(),
                supabase
                    .from('user_quests')
                    .select('daily_quests_config, main_quests_config, world_quests_config')
                    .eq('user_id', user.id)
                    .single()
            ]);

            const { data: gameState, error: stateError } = gameStateResponse;
            const { data: questConfig, error: questError } = questConfigResponse;

            if (stateError) throw stateError;

            // 2. Process Quest Config (Defaults vs DB)
            let finalDaily = defaultDailyQuests;
            let finalMain = defaultMainQuestSteps;
            let finalWorld = defaultWorldQuests;
            let needsConfigUpdate = false;
            let configUpdates = { user_id: user.id };

            if (questConfig) {
                if (questConfig.daily_quests_config !== null) finalDaily = questConfig.daily_quests_config;
                else { needsConfigUpdate = true; configUpdates.daily_quests_config = defaultDailyQuests; }

                if (questConfig.main_quests_config !== null) finalMain = questConfig.main_quests_config;
                else { needsConfigUpdate = true; configUpdates.main_quests_config = defaultMainQuestSteps; }

                if (questConfig.world_quests_config !== null) finalWorld = questConfig.world_quests_config;
                else { needsConfigUpdate = true; configUpdates.world_quests_config = defaultWorldQuests; }
            } else {
                needsConfigUpdate = true;
                configUpdates = {
                    user_id: user.id,
                    daily_quests_config: defaultDailyQuests,
                    main_quests_config: defaultMainQuestSteps,
                    world_quests_config: defaultWorldQuests
                };
            }

            // Normalize daily quests
            const normalizedDaily = finalDaily.map(q => ({
                ...q,
                title: q.title || q.text || 'Новое задание',
                description: q.description || '',
                type: q.type || 'daily',
                rewards: q.rewards || { primogems: q.reward || 0 }
            }));

            // 3. Handle Daily Reset
            let currentCompletedQuests = gameState.completed_quests || [];
            let currentSettings = gameState.settings || {};
            let currentDailyRewardClaimed = currentSettings.daily_reward_claimed || false;
            let currentCompensationClaimed = currentSettings.compensation_claimed || false;

            const today = getMoscowDateString();
            const lastReset = currentSettings.last_daily_reset;

            if (lastReset !== today) {
                console.log("Daily reset triggered!", { lastReset, today });

                // Identify daily quest IDs to remove
                const dailyIds = normalizedDaily.map(q => q.id);

                // Filter out ONLY the current daily quests from completed list
                currentCompletedQuests = currentCompletedQuests.filter(id => !dailyIds.includes(id));
                currentDailyRewardClaimed = false;

                // Update DB
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

                // Update local settings object for state
                currentSettings = {
                    ...currentSettings,
                    last_daily_reset: today,
                    daily_reward_claimed: false
                };
            }

            // 4. Update State
            if (needsConfigUpdate) {
                await supabase.from('user_quests').upsert(configUpdates);
            }

            setPrimogems(gameState.primogems || 0);
            setWishes(gameState.wishes || 0);
            setCompletedQuestIds(currentCompletedQuests);
            setDailyRewardClaimed(currentDailyRewardClaimed);
            setCompensationClaimed(currentCompensationClaimed);

            setDailyQuests(normalizedDaily);
            setMainQuestSteps(finalMain);
            setWorldQuests(finalWorld);

        } catch (error) {
            console.error("Error fetching quest data:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Determine current main quest step
    const currentMainQuestIndex = mainQuestSteps.findIndex(step => !completedQuestIds.includes(step.id));
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

        // Optimistic update
        if (updates.primogems !== undefined) setPrimogems(updates.primogems);
        if (updates.wishes !== undefined) setWishes(updates.wishes);
        if (updates.completed_quests !== undefined) setCompletedQuestIds(updates.completed_quests);

        try {
            const { error } = await supabase
                .from('game_state')
                .update(updates)
                .eq('user_id', user.id);

            if (error) throw error;
        } catch (error) {
            console.error("Error updating game state:", error);
            // Revert changes? For now, just log.
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
    }, [completedQuestIds, allQuests, primogems, wishes, user]);

    const claimDailyReward = useCallback(async () => {
        if (dailyProgress.canClaim) {
            const newPrimos = primogems + 20;
            setDailyRewardClaimed(true); // Optimistic
            setPrimogems(newPrimos);

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
            } catch (error) {
                console.error("Error claiming daily reward:", error);
                setDailyRewardClaimed(false); // Revert
                setPrimogems(primogems);
            }
        }
    }, [dailyProgress, primogems, user]);

    const claimCompensation = useCallback(async () => {
        if (!compensationClaimed) {
            const newPrimos = primogems + 40;
            setCompensationClaimed(true); // Optimistic
            setPrimogems(newPrimos);

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
                setPrimogems(primogems);
            }
        }
    }, [compensationClaimed, primogems, user]);

    const buyWish = useCallback(async () => {
        if (primogems >= 160) {
            const newPrimos = primogems - 160;
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
        if (primogems >= 160) {
            const newPrimos = primogems - 160;
            await updateGameState({ primogems: newPrimos });
            return true;
        }
        return false;
    }, [primogems, user]);

    return {
        primogems,
        wishes,
        completedQuestIds,
        dailyQuests,
        mainQuest: currentMainQuest, // Return the current step or null
        mainQuestProgress,
        worldQuests,
        dailyProgress,
        compensationClaimed,
        completeQuest,
        claimDailyReward,
        claimCompensation,
        buyWish,
        spendWish,
        consumePrimosForWish,
        loading
    };
};
