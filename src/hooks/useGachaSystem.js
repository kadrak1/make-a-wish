import { useState, useEffect, useCallback } from 'react';
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
    const [hasPartnerGifts, setHasPartnerGifts] = useState(false);
    const [loading, setLoading] = useState(true);

    // Загрузка состояния гачи — только для контекста соединения
    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                if (isGlobalContext || !activeConnection) {
                    // В глобальном контексте баннера нет
                    setQueue([]);
                    setHistory([]);
                    setCurrentPullIndex(0);
                    setIsFinished(false);
                    setHasPartnerGifts(false);
                    return;
                }

                // Загрузить состояние гачи из соединения
                const { data: connectionData, error } = await supabase
                    .from('user_connections')
                    .select('history, queue, pity_counter')
                    .eq('id', activeConnection.id)
                    .single();

                if (error) throw error;

                if (connectionData) {
                    const q = connectionData.queue || [];
                    const h = connectionData.history || [];
                    const pity = connectionData.pity_counter || 0;

                    setQueue(q);
                    setHistory(h);
                    setCurrentPullIndex(pity);
                    setIsFinished(q.length > 0 && pity >= q.length);
                }

                // Проверить наличие подарков от партнёра
                const partnerId = activeConnection.partnerId;
                const { data: gifts } = await supabase
                    .from('partner_gifts')
                    .select('id')
                    .eq('created_by', partnerId)
                    .eq('assigned_to', user.id)
                    .limit(1);

                setHasPartnerGifts(!!(gifts && gifts.length > 0));

            } catch (error) {
                console.error("Error fetching gacha data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, isGlobalContext, activeConnection?.id]);

    // Инициализация очереди из подарков партнёра (если пуста)
    useEffect(() => {
        if (!user || loading || isGlobalContext || !activeConnection) return;
        if (queue.length > 0) return; // уже инициализирована

        const initQueue = async () => {
            const partnerId = activeConnection.partnerId;

            const { data: partnerGifts, error } = await supabase
                .from('partner_gifts')
                .select('*')
                .eq('created_by', partnerId)
                .eq('assigned_to', user.id);

            if (error) {
                console.error("Error fetching partner gifts for gacha:", error);
                return;
            }

            if (!partnerGifts || partnerGifts.length === 0) {
                console.log("No gifts created by partner yet.");
                setHasPartnerGifts(false);
                return;
            }

            setHasPartnerGifts(true);

            const commons = partnerGifts.filter(g => g.rarity === 'common');
            const epics = partnerGifts.filter(g => g.rarity === 'epic');
            const legendaries = partnerGifts.filter(g => g.rarity === 'legendary');
            const legendary = legendaries.length > 0 ? legendaries[0] : null;

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
            // Перемешать первую часть
            for (let i = firstPart.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [firstPart[i], firstPart[j]] = [firstPart[j], firstPart[i]];
            }

            const finalQueue = legendary ? [...firstPart, legendary] : firstPart;
            if (finalQueue.length === 0) return;

            setQueue(finalQueue);

            try {
                await supabase
                    .from('user_connections')
                    .update({ queue: finalQueue })
                    .eq('id', activeConnection.id);
                refreshConnections();
            } catch (error) {
                console.error("Error saving initial queue:", error);
            }
        };

        initQueue();
    }, [user, loading, queue.length, activeConnection?.id, isGlobalContext]);

    const updateGachaState = async (updates) => {
        if (!user || !activeConnection) return;

        if (updates.history !== undefined) setHistory(updates.history);
        if (updates.pity_counter !== undefined) setCurrentPullIndex(updates.pity_counter);

        try {
            const { error } = await supabase
                .from('user_connections')
                .update(updates)
                .eq('id', activeConnection.id);
            if (error) throw error;
            refreshConnections();
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

        setHistory(newHistory);
        setCurrentPullIndex(newIndex);

        if (newIndex >= queue.length) {
            setIsFinished(true);
        }

        await updateGachaState({
            history: newHistory,
            pity_counter: newIndex
        });

        return item;
    }, [queue, currentPullIndex, history, user, activeConnection]);

    const currentItem = queue[currentPullIndex];

    return {
        pullItem,
        history,
        isFinished,
        hasPartnerGifts,
        currentPullIndex,
        totalPulls: 10,
        nextItemRarity: currentItem ? currentItem.rarity : null,
        nextItem: currentItem,
        loading
    };
};
