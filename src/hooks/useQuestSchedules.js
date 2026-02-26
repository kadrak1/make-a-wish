import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

// Stores per-quest schedules in game_state.settings.quest_schedules
// Schedule format: null = once, [] = every day, [1,2,...] = specific days
export const useQuestSchedules = () => {
    const { user } = useAuth();
    const [schedules, setSchedules] = useState({}); // { [questId]: scheduleDays }
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            const { data } = await supabase
                .from('game_state')
                .select('settings')
                .eq('user_id', user.id)
                .single();
            setSchedules(data?.settings?.quest_schedules || {});
            setLoaded(true);
        };
        load();
    }, [user]);

    const setSchedule = useCallback(async (questId, scheduleDays) => {
        const newSchedules = { ...schedules, [questId]: scheduleDays };
        setSchedules(newSchedules); // optimistic

        try {
            const { data: gs } = await supabase
                .from('game_state')
                .select('settings')
                .eq('user_id', user.id)
                .single();

            const currentSettings = gs?.settings || {};
            await supabase
                .from('game_state')
                .update({ settings: { ...currentSettings, quest_schedules: newSchedules } })
                .eq('user_id', user.id);
        } catch (error) {
            console.error('Error saving quest schedule:', error);
        }
    }, [schedules, user]);

    const getSchedule = useCallback((questId) => {
        // Return stored schedule, or undefined (not set yet)
        return loaded ? schedules[questId] : undefined;
    }, [schedules, loaded]);

    return { getSchedule, setSchedule };
};
