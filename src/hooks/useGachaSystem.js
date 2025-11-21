import { useState, useEffect, useCallback } from 'react';
import { prizePools } from '../config/prizes';

export const useGachaSystem = () => {
    // Initialize state from localStorage
    const [queue, setQueue] = useState(() => {
        try {
            const saved = localStorage.getItem('maw_gacha_queue');
            if (!saved) return [];
            const parsed = JSON.parse(saved);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error("Failed to parse queue", e);
            return [];
        }
    });

    const [history, setHistory] = useState(() => {
        try {
            const saved = localStorage.getItem('maw_gacha_history');
            if (!saved) return [];
            const parsed = JSON.parse(saved);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error("Failed to parse history", e);
            return [];
        }
    });

    const [currentPullIndex, setCurrentPullIndex] = useState(() => {
        try {
            const saved = localStorage.getItem('maw_gacha_index');
            const parsed = saved ? parseInt(saved, 10) : 0;
            return isNaN(parsed) ? 0 : parsed;
        } catch (e) {
            console.error("Failed to parse pull index", e);
            return 0;
        }
    });

    const [isFinished, setIsFinished] = useState(() => {
        try {
            const saved = localStorage.getItem('maw_gacha_finished');
            return saved === 'true';
        } catch (e) {
            console.error("Failed to parse isFinished", e);
            return false;
        }
    });

    // Persist state changes
    useEffect(() => {
        try {
            localStorage.setItem('maw_gacha_queue', JSON.stringify(queue));
        } catch (e) {
            console.error("Failed to save queue", e);
        }
    }, [queue]);

    useEffect(() => {
        try {
            localStorage.setItem('maw_gacha_history', JSON.stringify(history));
        } catch (e) {
            console.error("Failed to save history", e);
        }
    }, [history]);

    useEffect(() => {
        try {
            localStorage.setItem('maw_gacha_index', currentPullIndex.toString());
        } catch (e) {
            console.error("Failed to save pull index", e);
        }
    }, [currentPullIndex]);

    useEffect(() => {
        try {
            localStorage.setItem('maw_gacha_finished', isFinished.toString());
        } catch (e) {
            console.error("Failed to save isFinished", e);
        }
    }, [isFinished]);

    useEffect(() => {
        // Initialize the rigged queue ONLY if it's empty
        const initQueue = () => {
            if (queue.length > 0) return; // Don't overwrite existing queue

            const commons = [...prizePools.common];
            const epics = [...prizePools.epic];
            const legendary = prizePools.legendary[0];

            // We need exactly 6 commons and 3 epics for the first 9 pulls
            // Helper to get N random items from array
            const getRandomItems = (arr, n) => {
                const result = [];
                const tempArr = [...arr];
                for (let i = 0; i < n; i++) {
                    if (tempArr.length === 0) tempArr.push(...arr); // Refill if empty
                    const randomIndex = Math.floor(Math.random() * tempArr.length);
                    result.push(tempArr[randomIndex]);
                    tempArr.splice(randomIndex, 1);
                }
                return result;
            };

            const selectedCommons = getRandomItems(commons, 6);
            const selectedEpics = getRandomItems(epics, 3);

            // Combine and shuffle the first 9 items
            const firstNine = [...selectedCommons, ...selectedEpics];
            for (let i = firstNine.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [firstNine[i], firstNine[j]] = [firstNine[j], firstNine[i]];
            }

            // The 10th item is always legendary
            const finalQueue = [...firstNine, legendary];
            setQueue(finalQueue);
        };

        initQueue();
    }, [queue.length]);

    const pullItem = useCallback(() => {
        if (currentPullIndex >= queue.length) {
            setIsFinished(true);
            return null;
        }

        const item = queue[currentPullIndex];
        setHistory(prev => [...prev, item]);
        setCurrentPullIndex(prev => prev + 1);

        if (currentPullIndex === queue.length - 1) {
            setIsFinished(true);
        }

        return item;
    }, [queue, currentPullIndex]);

    const currentItem = queue[currentPullIndex]; // Peek at next item

    return {
        pullItem,
        history,
        isFinished,
        currentPullIndex,
        totalPulls: 10,
        nextItemRarity: currentItem ? currentItem.rarity : null
    };
};
