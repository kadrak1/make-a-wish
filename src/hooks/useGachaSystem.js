import { useState, useEffect, useCallback } from 'react';
import { prizePools } from '../config/prizes';

export const useGachaSystem = () => {
    const [queue, setQueue] = useState([]);
    const [history, setHistory] = useState([]);
    const [currentPullIndex, setCurrentPullIndex] = useState(0);
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        // Initialize the rigged queue
        const initQueue = () => {
            const commons = [...prizePools.common];
            const epics = [...prizePools.epic];
            const legendary = prizePools.legendary[0];

            // We need exactly 6 commons and 3 epics for the first 9 pulls
            // If the pool is smaller, we might need to duplicate or pick randomly.
            // For now, assuming the pool has enough or we cycle.

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
    }, []);

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
