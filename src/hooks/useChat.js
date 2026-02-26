import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

export const useChat = (partnerId) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);

    const markAsRead = useCallback(async () => {
        if (!user || !partnerId) return;
        await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('sender_id', partnerId)
            .eq('receiver_id', user.id)
            .eq('is_read', false);
    }, [user, partnerId]);

    const fetchMessages = useCallback(async () => {
        if (!user || !partnerId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
                .order('created_at', { ascending: true })
                .limit(50);

            if (error) throw error;
            setMessages(data);
            // Mark incoming as read when chat opens
            await markAsRead();
        } catch (error) {
            console.error("Error fetching messages:", error);
        } finally {
            setLoading(false);
        }
    }, [user, partnerId, markAsRead]);

    useEffect(() => {
        fetchMessages();
        if (!user || !partnerId) return;

        const subscription = supabase
            .channel(`chat:${user.id}:${partnerId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${user.id}`
            }, (payload) => {
                if (payload.new.sender_id === partnerId) {
                    setMessages(prev => [...prev, payload.new]);
                    markAsRead(); // mark as read since chat is open
                }
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `sender_id=eq.${user.id}`
            }, (payload) => {
                if (payload.new.receiver_id === partnerId) {
                    setMessages(prev => [...prev, payload.new]);
                }
            })
            .subscribe();

        return () => supabase.removeChannel(subscription);
    }, [user, partnerId, fetchMessages, markAsRead]);

    const sendMessage = async (content) => {
        if (!content.trim()) return;
        try {
            const { error } = await supabase
                .from('messages')
                .insert([{
                    sender_id: user.id,
                    receiver_id: partnerId,
                    content,
                    is_read: false
                }]);
            if (error) throw error;
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    return { messages, loading, sendMessage, markAsRead, refresh: fetchMessages };
};
