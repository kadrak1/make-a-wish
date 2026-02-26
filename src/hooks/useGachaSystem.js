import { useState, useEffect, useCallback } from 'react';
import { prizePools } from '../config/prizes';
import { useAuth } from '../context/AuthContext';
import { useFriendContext } from '../context/FriendContext';
import { supabase } from '../supabaseClient';

export const useGachaSystem = () => {
    const { user } = useAuth();
    const { activeConnection, isGlobalContext, refreshConnections } = useFriendContext();
    const [queue, setQueue] = useState([]);
    const [history, setHistory] = useState([]);
    const [currentPullIndex, setCurrentPullIndex] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [loading, setLoading] = useState(true);

    // Fetch data from Supabase
    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                if (isGlobalContext) {
                    // Fetch Global Game State
                    const { data: gameState, error } = await supabase
                        .from('game_state')
                        .select('queue, history, pity_counter')
                        .eq('user_id', user.id)
                        .single();

                    if (error) throw error;

                    if (gameState) {
                        setQueue(gameState.queue || []);
                        setHistory(gameState.history || []);
                        setCurrentPullIndex(gameState.pity_counter || 0);

                        if (gameState.queue && gameState.queue.length > 0 && gameState.pity_counter >= gameState.queue.length) {
                            setIsFinished(true);
                        } else {
                            setIsFinished(false);
                        }
                    }
                } else {
                    // Fetch Connection Gacha State
                    if (!activeConnection) return;

                    // We need to fetch the row again? Or trust activeConnection if it has these fields?
                    // activeConnection from `useUserConnections` might not have history/queue updated yet 
                    // if we just added columns and hook didn't fetch them.
                    // Important: The `useUserConnections` hook needs to fetch `history` and `queue` too!
                    // Let's assume we update `useUserConnections` next or fetch here directly.
                    // Fetching directly here is safer for freshness.

                    const { data: connectionData, error } = await supabase
                        .from('user_connections')
                        .select('history, queue, pity_counter')
                        .eq('id', activeConnection.id)
                        .single();

                    if (error) throw error;

                    if (connectionData) {
                        setQueue(connectionData.queue || []);
                        setHistory(connectionData.history || []);
                        setCurrentPullIndex(connectionData.pity_counter || 0);

                        if (connectionData.queue && connectionData.queue.length > 0 && connectionData.pity_counter >= connectionData.queue.length) {
                            setIsFinished(true);
                        } else {
                            setIsFinished(false);
                        }
                    }
                }

            } catch (error) {
                console.error("Error fetching gacha data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, isGlobalContext, activeConnection?.id]); // Re-fetch when context changes

    // Initialize queue if empty (Rigged Logic using Partner Gifts)
    useEffect(() => {
        if (!user || loading) return;

        const initQueue = async () => {
            if (queue.length > 0) return; // Already initialized

            let commons = [];
            let epics = [];
            let legendary = null;

            if (isGlobalContext) {
                // Fallback for global context if needed, or keep empty
                // For now, let's keep it empty or use a default if you want 
                // but the prompt asked for Partner Gifts.
                return;
            } else {
                if (!activeConnection) return;

                // Fetch gifts created by the PARTNER for ME
                const { data: partnerGifts, error } = await supabase
                    .from('partner_gifts')
                    .select('*')
                    .eq('created_by', activeConnection.linked_user_id)
                    .eq('assigned_to', user.id);

                if (error) {
                    console.error("Error fetching partner gifts for gacha:", error);
                    return;
                }

                if (!partnerGifts || partnerGifts.length === 0) {
                    console.log("No gifts created by partner yet.");
                    return;
                }

                commons = partnerGifts.filter(g => g.rarity === 'common');
                epics = partnerGifts.filter(g => g.rarity === 'epic');
                const legendaries = partnerGifts.filter(g => g.rarity === 'legendary');
                legendary = legendaries.length > 0 ? legendaries[0] : null;
            }

            // Rigged logic: 6 commons, 3 epics, 1 legendary
            // If not enough, we just take all we have and shuffle
            const getRandomItems = (arr, n) => {
                if (arr.length === 0) return [];
                const result = [];
                const tempArr = [...arr];
                for (let i = 0; i < n; i++) {
                    if (tempArr.length === 0) break;
                    const randomIndex = Math.floor(Math.random() * tempArr.length);
                    result.push(tempArr[randomIndex]);
                    tempArr.splice(randomIndex, 1);
                }
                return result;
            };

            const selectedCommons = getRandomItems(commons, 6);
            const selectedEpics = getRandomItems(epics, 3);

            const firstPart = [...selectedCommons, ...selectedEpics];
            // Shuffle the first part
            for (let i = firstPart.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [firstPart[i], firstPart[j]] = [firstPart[j], firstPart[i]];
            }

            const finalQueue = legendary ? [...firstPart, legendary] : firstPart;

            if (finalQueue.length === 0) return;

            setQueue(finalQueue);
            try {
                if (isGlobalContext) {
                    await supabase
                        .from('game_state')
                        .update({ queue: finalQueue })
                        .eq('user_id', user.id);
                } else {
                    if (activeConnection) {
                        await supabase
                            .from('user_connections')
                            .update({ queue: finalQueue })
                            .eq('id', activeConnection.id);
                        refreshConnections();
                    }
                }
            } catch (error) {
                console.error("Error saving initial queue:", error);
            }
        };

        initQueue();
    }, [user, loading, queue.length, activeConnection?.id, isGlobalContext]);

    const updateGameState = async (updates) => {
        if (!user) return;

        // Optimistic update
        if (updates.history !== undefined) setHistory(updates.history);
        if (updates.pity_counter !== undefined) setCurrentPullIndex(updates.pity_counter);

        try {
            if (isGlobalContext) {
                const { error } = await supabase
                    .from('game_state')
                    .update(updates)
                    .eq('user_id', user.id);

                if (error) throw error;
            } else {
                if (activeConnection) {
                    const { error } = await supabase
                        .from('user_connections')
                        .update(updates)
                        .eq('id', activeConnection.id);
                    if (error) throw error;
                    refreshConnections();
                }
            }
        } catch (error) {
            console.error("Error updating gacha state:", error);
        }
    };

    const pullItem = useCallback(async () => {
        if (currentPullIndex >= queue.length) {
            setIsFinished(true);
            return null;
        }

        const item = queue[currentPullIndex];
        const newHistory = [...history, item];
        const newIndex = currentPullIndex + 1;

        // Update local state immediately for UI responsiveness
        setHistory(newHistory);
        setCurrentPullIndex(newIndex);

        if (newIndex >= queue.length) {
            setIsFinished(true);
        }

        // Persist to Supabase
        await updateGameState({
            history: newHistory,
            pity_counter: newIndex
        });

        return item;
    }, [queue, currentPullIndex, history, user]);

    const currentItem = queue[currentPullIndex];

    return {
        pullItem,
        history,
        isFinished,
        currentPullIndex,
        totalPulls: 10,
        nextItemRarity: currentItem ? currentItem.rarity : null,
        nextItem: currentItem,
        loading
    };
};
