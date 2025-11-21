import { useState, useCallback, useEffect } from 'react';
import { dailyQuests } from '../config/quests/daily';
import { mainQuest } from '../config/quests/main';
import { worldQuests } from '../config/quests/world';

export const useQuestSystem = () => {
    // Initialize state from localStorage or default to 0/empty
    const [primogems, setPrimogems] = useState(() => {
        try {
            const saved = localStorage.getItem('maw_primogems');
            const parsed = saved ? parseInt(saved, 10) : 0;
            return isNaN(parsed) ? 0 : parsed;
        } catch (e) {
            console.error("Failed to parse primogems", e);
            return 0;
        }
    });

    const [wishes, setWishes] = useState(() => {
        try {
            const saved = localStorage.getItem('maw_wishes');
            const parsed = saved ? parseInt(saved, 10) : 0;
            return isNaN(parsed) ? 0 : parsed;
        } catch (e) {
            console.error("Failed to parse wishes", e);
            return 0;
        }
    });

    const [completedQuestIds, setCompletedQuestIds] = useState(() => {
        try {
            const saved = localStorage.getItem('maw_completed_quests');
            if (!saved) return [];
            const parsed = JSON.parse(saved);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error("Failed to parse completed quests", e);
            return [];
        }
    });

    // Persist state changes to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('maw_primogems', primogems.toString());
        } catch (e) {
            console.error("Failed to save primogems", e);
        }
    }, [primogems]);

    useEffect(() => {
        try {
            localStorage.setItem('maw_wishes', wishes.toString());
        } catch (e) {
            console.error("Failed to save wishes", e);
        }
    }, [wishes]);

    useEffect(() => {
        try {
            localStorage.setItem('maw_completed_quests', JSON.stringify(completedQuestIds));
        } catch (e) {
            console.error("Failed to save completed quests", e);
        }
    }, [completedQuestIds]);

    // Combine all quests for easy lookup
    const allQuests = [
        ...dailyQuests,
        mainQuest,
        ...worldQuests
    ];

    const completeQuest = useCallback((questId) => {
        if (completedQuestIds.includes(questId)) return;

        const quest = allQuests.find(q => q.id === questId);
        if (!quest) return;

        setPrimogems(prev => prev + quest.rewards.primogems);
        setCompletedQuestIds(prev => [...prev, questId]);
    }, [completedQuestIds, allQuests]);

    const buyWish = useCallback(() => {
        if (primogems >= 160) {
            setPrimogems(prev => prev - 160);
            setWishes(prev => prev + 1);
            return true;
        }
        return false;
    }, [primogems]);

    const spendWish = useCallback(() => {
        if (wishes > 0) {
            setWishes(prev => prev - 1);
            return true;
        }
        return false;
    }, [wishes]);

    const consumePrimosForWish = useCallback(() => {
        if (primogems >= 160) {
            setPrimogems(prev => prev - 160);
            return true;
        }
        return false;
    }, [primogems]);

    return {
        primogems,
        wishes,
        completedQuestIds,
        dailyQuests,
        mainQuest,
        worldQuests,
        completeQuest,
        buyWish,
        spendWish,
        consumePrimosForWish
    };
};
