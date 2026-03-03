import { useState, useCallback, useEffect } from 'react';
import { dailyQuests as defaultDailyQuests } from '../config/quests/daily';
import { mainQuestSteps as defaultMainQuestSteps } from '../config/quests/main';
import { worldQuests as defaultWorldQuests } from '../config/quests/world';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { useFriendContext } from '../context/FriendContext';

const WISH_COST = 160; // Стоимость 1 молитвы в примогемах

export const useQuestSystem = () => {
    const { user } = useAuth();
    const { activeConnection, isGlobalContext, refreshConnections } = useFriendContext();

    // Универсальные примогемы (белые) — всегда из game_state
    const [universalPrimogems, setUniversalPrimogems] = useState(0);
    // Wishes — личные токены молитв
    const [wishes, setWishes] = useState(0);
    // XP — опыт персонажа (от самостоятельных квестов, Фаза 2)
    const [xp, setXp] = useState(0);
    const [xpLevel, setXpLevel] = useState(1);
    const [xpMilestonesClaimed, setXpMilestonesClaimed] = useState([]);
    const [milestones, setMilestones] = useState([]);

    // Цветные примогемы — из активного соединения (только чтение, запись через useSharedQuests)
    const coloredPrimogems = activeConnection?.myPrimogems || 0;

    const [completedQuestIds, setCompletedQuestIds] = useState([]);

    const [dailyQuests, setDailyQuests] = useState(defaultDailyQuests);
    const [mainQuestSteps, setMainQuestSteps] = useState(defaultMainQuestSteps);
    const [worldQuests, setWorldQuests] = useState(defaultWorldQuests);

    const [dailyRewardClaimed, setDailyRewardClaimed] = useState(false);
    const [compensationClaimed, setCompensationClaimed] = useState(false);
    const [hiddenQuestIds, setHiddenQuestIds] = useState([]);
    const [loading, setLoading] = useState(true);

    const getMoscowDateString = () => {
        const now = new Date();
        const moscowTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Moscow" }));
        return moscowTime.toISOString().split('T')[0];
    };

    // Загрузка данных из Supabase
    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Состояние игры (universal_primogems, wishes, xp)
                const { data: gameState, error: stateError } = await supabase
                    .from('game_state')
                    .select('universal_primogems, wishes, xp, xp_level, xp_milestones_claimed, completed_quests, settings')
                    .eq('user_id', user.id)
                    .single();

                if (stateError) throw stateError;

                let currentCompletedQuests = gameState.completed_quests || [];
                let currentSettings = gameState.settings || {};
                let currentDailyRewardClaimed = currentSettings.daily_reward_claimed || false;
                let currentCompensationClaimed = currentSettings.compensation_claimed || false;

                // Сброс дневных квестов по Москве
                const today = getMoscowDateString();
                const lastReset = currentSettings.last_daily_reset;

                if (lastReset !== today) {
                    currentCompletedQuests = currentCompletedQuests.filter(
                        id => String(id).startsWith('main_') || String(id).startsWith('world_')
                    );
                    currentDailyRewardClaimed = false;

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

                    currentSettings = { ...currentSettings, last_daily_reset: today, daily_reward_claimed: false };
                }

                setUniversalPrimogems(gameState.universal_primogems || 0);
                setWishes(gameState.wishes || 0);
                setXp(gameState.xp || 0);
                setXpLevel(gameState.xp_level || 1);
                setXpMilestonesClaimed(gameState.xp_milestones_claimed || []);
                setCompletedQuestIds(currentCompletedQuests);
                setDailyRewardClaimed(currentDailyRewardClaimed);
                setCompensationClaimed(currentCompensationClaimed);
                setHiddenQuestIds(currentSettings.hidden_quests || []);

                // 2. Конфиги квестов
                const { data: questConfig, error: questError } = await supabase
                    .from('user_quests')
                    .select('daily_quests_config, main_quests_config, world_quests_config')
                    .eq('user_id', user.id)
                    .single();

                console.log("Quest Config Fetch Result:", { questConfig, questError, userId: user.id });

                let finalDaily = defaultDailyQuests;
                let finalMain = defaultMainQuestSteps;
                let finalWorld = defaultWorldQuests;
                let needsUpdate = false;
                let updates = { user_id: user.id };

                if (questConfig) {
                    if (questConfig.daily_quests_config !== null) {
                        const hasOldIds = questConfig.daily_quests_config.some(q => String(q.id).startsWith('daily_'));
                        if (hasOldIds) {
                            finalDaily = defaultDailyQuests;
                            needsUpdate = true;
                            updates.daily_quests_config = defaultDailyQuests;
                        } else {
                            finalDaily = questConfig.daily_quests_config;
                        }
                    } else {
                        needsUpdate = true;
                        updates.daily_quests_config = defaultDailyQuests;
                    }

                    if (questConfig.main_quests_config !== null) {
                        finalMain = questConfig.main_quests_config;
                    } else {
                        needsUpdate = true;
                        updates.main_quests_config = defaultMainQuestSteps;
                    }

                    if (questConfig.world_quests_config !== null) {
                        finalWorld = questConfig.world_quests_config;
                    } else {
                        needsUpdate = true;
                        updates.world_quests_config = defaultWorldQuests;
                    }
                } else {
                    needsUpdate = true;
                    updates = {
                        user_id: user.id,
                        daily_quests_config: defaultDailyQuests,
                        main_quests_config: defaultMainQuestSteps,
                        world_quests_config: defaultWorldQuests
                    };
                }

                if (needsUpdate) {
                    const { error: upsertError } = await supabase.from('user_quests').upsert(updates);
                    if (upsertError) console.error("Error seeding quests:", upsertError);
                }

                const normalizedDaily = finalDaily.map(q => ({
                    ...q,
                    title: q.title || q.text || 'Новое задание',
                    description: q.description || '',
                    type: q.type || 'daily',
                    rewards: q.rewards || { primogems: q.reward || 0 }
                }));

                const hiddenSet = new Set(currentSettings.hidden_quests || []);
                setDailyQuests(normalizedDaily.filter(q => !hiddenSet.has(q.id)));
                setMainQuestSteps(finalMain.filter(q => !hiddenSet.has(q.id)));
                setWorldQuests(finalWorld.filter(q => !hiddenSet.has(q.id)));

                // 3. XP milestones
                const { data: milestonesData } = await supabase
                    .from('xp_milestones')
                    .select('*')
                    .order('xp_required', { ascending: true });
                if (milestonesData) setMilestones(milestonesData);

            } catch (error) {
                console.error("Error fetching quest data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Realtime: синхронизация universal_primogems/wishes/xp при внешних изменениях
        const gameStateChannel = supabase
            .channel(`game_state_${user.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'game_state',
                filter: `user_id=eq.${user.id}`
            }, (payload) => {
                if (payload.new) {
                    if (payload.new.universal_primogems !== undefined)
                        setUniversalPrimogems(payload.new.universal_primogems);
                    if (payload.new.wishes !== undefined) setWishes(payload.new.wishes);
                    if (payload.new.xp !== undefined) setXp(payload.new.xp);
                    if (payload.new.xp_level !== undefined) setXpLevel(payload.new.xp_level);
                    if (payload.new.xp_milestones_claimed !== undefined)
                        setXpMilestonesClaimed(payload.new.xp_milestones_claimed);
                }
            })
            .subscribe();

        return () => supabase.removeChannel(gameStateChannel);
    }, [user]);

    // Производные
    const currentMainQuestIndex = mainQuestSteps.findIndex(step => !completedQuestIds.includes(step.id));
    const currentMainQuest = currentMainQuestIndex !== -1 ? mainQuestSteps[currentMainQuestIndex] : null;
    const mainQuestProgress = {
        current: currentMainQuestIndex !== -1 ? currentMainQuestIndex + 1 : mainQuestSteps.length,
        total: mainQuestSteps.length,
        isCompleted: currentMainQuestIndex === -1
    };

    const completedDailyCount = dailyQuests.filter(q => completedQuestIds.includes(q.id)).length;
    const dailyProgress = {
        current: completedDailyCount,
        total: 4,
        isClaimed: dailyRewardClaimed,
        canClaim: completedDailyCount >= 4 && !dailyRewardClaimed
    };

    const allQuests = [...dailyQuests, ...mainQuestSteps, ...worldQuests];

    // Общее количество примогемов для проверки доступности молитвы
    const totalPrimogems = universalPrimogems + coloredPrimogems;

    // Обновление game_state (всегда только personal game_state)
    const updateGameState = async (updates) => {
        if (!user) return;

        if (updates.universal_primogems !== undefined) setUniversalPrimogems(updates.universal_primogems);
        if (updates.wishes !== undefined) setWishes(updates.wishes);
        if (updates.xp !== undefined) setXp(updates.xp);
        if (updates.completed_quests !== undefined) setCompletedQuestIds(updates.completed_quests);

        try {
            const { error } = await supabase
                .from('game_state')
                .update(updates)
                .eq('user_id', user.id);
            if (error) throw error;
        } catch (error) {
            console.error("Error updating game state:", error);
        }
    };

    // Выполнить личный квест (ежедневный/главный/мировой) → всегда universal primos
    const completeQuest = useCallback(async (questId) => {
        if (completedQuestIds.includes(questId)) return;

        const quest = allQuests.find(q => q.id === questId);
        if (!quest) return;

        const newPrimos = universalPrimogems + (quest.rewards?.primogems || 0);
        const newWishes = wishes + (quest.rewards?.wishes || 0);
        const newXp = xp + (quest.rewards?.xp || 0);
        const newCompleted = [...completedQuestIds, questId];

        await updateGameState({
            universal_primogems: newPrimos,
            wishes: newWishes,
            xp: newXp,
            completed_quests: newCompleted
        });

        return { success: true, rewardAmount: quest.rewards?.primogems || 0 };
    }, [completedQuestIds, allQuests, universalPrimogems, wishes, xp, user]);

    // Ежедневная награда (+20 universal primos)
    const claimDailyReward = useCallback(async () => {
        if (!dailyProgress.canClaim) {
            return { success: false, error: "Недостаточно выполненных заданий" };
        }

        const newPrimos = universalPrimogems + 20;
        setDailyRewardClaimed(true);
        setUniversalPrimogems(newPrimos);

        try {
            const { data: gameState } = await supabase
                .from('game_state').select('settings').eq('user_id', user.id).single();
            const currentSettings = gameState?.settings || {};

            await supabase.from('game_state').update({
                universal_primogems: newPrimos,
                settings: { ...currentSettings, daily_reward_claimed: true }
            }).eq('user_id', user.id);

            return { success: true, rewardAmount: 20 };
        } catch (error) {
            console.error("Error claiming daily reward:", error);
            setDailyRewardClaimed(false);
            setUniversalPrimogems(universalPrimogems);
            return { success: false, error: error.message };
        }
    }, [dailyProgress, universalPrimogems, user]);

    // Компенсация (+40 universal primos)
    const claimCompensation = useCallback(async () => {
        if (compensationClaimed) return;

        const newPrimos = universalPrimogems + 40;
        setCompensationClaimed(true);
        setUniversalPrimogems(newPrimos);

        try {
            const { data: gameState } = await supabase
                .from('game_state').select('settings').eq('user_id', user.id).single();
            const currentSettings = gameState?.settings || {};

            await supabase.from('game_state').update({
                universal_primogems: newPrimos,
                settings: { ...currentSettings, compensation_claimed: true }
            }).eq('user_id', user.id);
        } catch (error) {
            console.error("Error claiming compensation:", error);
            setCompensationClaimed(false);
            setUniversalPrimogems(universalPrimogems);
        }
    }, [compensationClaimed, universalPrimogems, user]);

    // Купить wish-токен (160 примогемов: цветные сначала, потом универсальные)
    const buyWish = useCallback(async () => {
        if (totalPrimogems < WISH_COST) return false;

        const coloredToUse = Math.min(coloredPrimogems, WISH_COST);
        const universalToUse = WISH_COST - coloredToUse;

        if (universalPrimogems < universalToUse) return false;

        const newUniversal = universalPrimogems - universalToUse;
        const newColored = coloredPrimogems - coloredToUse;
        const newWishes = wishes + 1;

        setUniversalPrimogems(newUniversal);
        setWishes(newWishes);

        try {
            await supabase.from('game_state')
                .update({ universal_primogems: newUniversal, wishes: newWishes })
                .eq('user_id', user.id);

            if (coloredToUse > 0 && activeConnection) {
                const isInitiator = activeConnection.user_id === user.id;
                const coloredCol = isInitiator ? 'user_primogems' : 'linked_user_primogems';
                await supabase.from('user_connections')
                    .update({ [coloredCol]: newColored })
                    .eq('id', activeConnection.id);
                refreshConnections();
            }

            return true;
        } catch (error) {
            console.error("Error buying wish:", error);
            setUniversalPrimogems(universalPrimogems);
            setWishes(wishes);
            return false;
        }
    }, [totalPrimogems, coloredPrimogems, universalPrimogems, wishes, activeConnection, user, refreshConnections]);

    // Потратить wish-токен
    const spendWish = useCallback(async () => {
        if (wishes <= 0) return false;
        const newWishes = wishes - 1;
        setWishes(newWishes);
        try {
            await supabase.from('game_state')
                .update({ wishes: newWishes })
                .eq('user_id', user.id);
            return true;
        } catch (error) {
            console.error("Error spending wish:", error);
            setWishes(wishes);
            return false;
        }
    }, [wishes, user]);

    // Прямая оплата молитвы примогемами (160 = цветные + универсальные)
    const consumePrimosForWish = useCallback(async () => {
        if (totalPrimogems < WISH_COST) return false;

        const coloredToUse = Math.min(coloredPrimogems, WISH_COST);
        const universalToUse = WISH_COST - coloredToUse;

        if (universalPrimogems < universalToUse) return false;

        const newUniversal = universalPrimogems - universalToUse;
        const newColored = coloredPrimogems - coloredToUse;

        setUniversalPrimogems(newUniversal);

        try {
            await supabase.from('game_state')
                .update({ universal_primogems: newUniversal })
                .eq('user_id', user.id);

            if (coloredToUse > 0 && activeConnection) {
                const isInitiator = activeConnection.user_id === user.id;
                const coloredCol = isInitiator ? 'user_primogems' : 'linked_user_primogems';
                await supabase.from('user_connections')
                    .update({ [coloredCol]: newColored })
                    .eq('id', activeConnection.id);
                refreshConnections();
            }

            return true;
        } catch (error) {
            console.error("Error consuming primos:", error);
            setUniversalPrimogems(universalPrimogems);
            return false;
        }
    }, [totalPrimogems, coloredPrimogems, universalPrimogems, activeConnection, user, refreshConnections]);

    const deleteSystemQuest = useCallback(async (questId) => {
        const newHidden = [...hiddenQuestIds, questId];
        setHiddenQuestIds(newHidden);
        setDailyQuests(prev => prev.filter(q => q.id !== questId));
        setMainQuestSteps(prev => prev.filter(q => q.id !== questId));
        setWorldQuests(prev => prev.filter(q => q.id !== questId));

        try {
            const { data: gameState } = await supabase
                .from('game_state').select('settings').eq('user_id', user.id).single();
            const currentSettings = gameState?.settings || {};
            await supabase.from('game_state').update({
                settings: { ...currentSettings, hidden_quests: newHidden }
            }).eq('user_id', user.id);
        } catch (error) {
            console.error('Error hiding quest:', error);
            setHiddenQuestIds(hiddenQuestIds);
        }
    }, [hiddenQuestIds, user]);

    // Получить награду за XP чекпоинт
    const claimXpMilestone = useCallback(async (milestoneId) => {
        if (!user) return { success: false };
        if (xpMilestonesClaimed.includes(milestoneId)) return { success: false, error: 'Уже получено' };

        try {
            const { data, error } = await supabase.rpc('claim_xp_milestone', {
                p_user_id: user.id,
                p_milestone_id: milestoneId
            });
            if (error) throw error;
            if (!data.success) return { success: false, error: data.error };

            // Update local state from RPC result
            setUniversalPrimogems(data.new_primogems);
            setWishes(data.new_wishes);
            setXpMilestonesClaimed(prev => [...prev, milestoneId]);

            return { success: true, reward_type: data.reward_type, reward_amount: data.reward_amount };
        } catch (error) {
            console.error('Error claiming XP milestone:', error);
            return { success: false, error: error.message };
        }
    }, [user, xpMilestonesClaimed, universalPrimogems, wishes]);

    // Мировой квест — завершается сразу для обоих игроков
    const completeWorldQuest = useCallback(async (questId, partnerId) => {
        setCompletedQuestIds(prev => [...prev, questId]);

        try {
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
            setCompletedQuestIds(prev => prev.filter(id => id !== questId));
        }
    }, [user]);

    return {
        // Валюты
        universalPrimogems,
        coloredPrimogems,
        primogems: universalPrimogems, // backward compat alias
        totalPrimogems,
        wishes,
        xp,
        xpLevel,
        xpMilestonesClaimed,
        milestones,
        wishCost: WISH_COST,
        // Квесты
        completedQuestIds,
        dailyQuests,
        mainQuest: currentMainQuest,
        mainQuestProgress,
        worldQuests,
        dailyProgress,
        compensationClaimed,
        // Действия
        completeQuest,
        deleteSystemQuest,
        completeWorldQuest,
        claimDailyReward,
        claimCompensation,
        claimXpMilestone,
        buyWish,
        spendWish,
        consumePrimosForWish,
        loading
    };
};
