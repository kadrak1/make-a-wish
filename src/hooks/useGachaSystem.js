import { useState, useEffect, useCallback } from 'react';
import { prizePools } from '../config/prizes';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

export const useGachaSystem = () => {
    const { user } = useAuth();
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

                    // Check if finished based on queue length
                    if (gameState.queue && gameState.queue.length > 0 && gameState.pity_counter >= gameState.queue.length) {
                        setIsFinished(true);
                    }
                }
            } catch (error) {
                console.error("Error fetching gacha data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    // Initialize queue if empty (Rigged Logic)
    useEffect(() => {
        if (!user || loading) return;

        const initQueue = async () => {
            if (queue.length > 0) return; // Already initialized

            const commons = [...prizePools.common];
            const epics = [...prizePools.epic];
            const legendary = prizePools.legendary[0];

            // Rigged logic: 6 commons, 3 epics, 1 legendary
            const getRandomItems = (arr, n) => {
                const result = [];
                const tempArr = [...arr];
                for (let i = 0; i < n; i++) {
                    if (tempArr.length === 0) tempArr.push(...arr);
                    const randomIndex = Math.floor(Math.random() * tempArr.length);
                    result.push(tempArr[randomIndex]);
                    tempArr.splice(randomIndex, 1);
                }
                return result;
            };

            const selectedCommons = getRandomItems(commons, 6);
            const selectedEpics = getRandomItems(epics, 3);

            const firstNine = [...selectedCommons, ...selectedEpics];
            for (let i = firstNine.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [firstNine[i], firstNine[j]] = [firstNine[j], firstNine[i]];
            }

            const finalQueue = [...firstNine, legendary];

            // Save to Supabase
            setQueue(finalQueue);
            try {
                await supabase
                    .from('game_state')
                    .update({ queue: finalQueue })
                    .eq('user_id', user.id);
            } catch (error) {
                console.error("Error saving initial queue:", error);
            }
        };

        initQueue();
    }, [user, loading, queue.length]);

    const updateGameState = async (updates) => {
        if (!user) return;

        // Optimistic update
        if (updates.history !== undefined) setHistory(updates.history);
        if (updates.pity_counter !== undefined) setCurrentPullIndex(updates.pity_counter);

        try {
            const { error } = await supabase
                .from('game_state')
                .update(updates)
                .eq('user_id', user.id);

            if (error) throw error;
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
        loading
    };
};
