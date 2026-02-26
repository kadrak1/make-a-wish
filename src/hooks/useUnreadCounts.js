import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

/**
 * Returns unread message counts per sender: { [senderId]: number }
 * Updates in real-time via Supabase subscriptions.
 */
export const useUnreadCounts = () => {
    const { user } = useAuth();
    const [unreadCounts, setUnreadCounts] = useState({});

    const fetchCounts = useCallback(async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('sender_id')
                .eq('receiver_id', user.id)
                .eq('is_read', false);

            if (error) throw error;

            // Count by sender
            const counts = {};
            (data || []).forEach(msg => {
                counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
            });
            setUnreadCounts(counts);
        } catch (err) {
            console.error('Error fetching unread counts:', err);
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;
        fetchCounts();

        // Subscribe to new incoming messages and read updates
        const channel = supabase
            .channel(`unread:${user.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${user.id}`,
            }, () => fetchCounts())
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${user.id}`,
            }, () => fetchCounts())
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [user, fetchCounts]);

    return unreadCounts;
};
