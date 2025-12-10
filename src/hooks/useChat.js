import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

export const useChat = (partnerId) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchMessages = useCallback(async () => {
        if (!user || !partnerId) return;
        setLoading(true);
        try {
            // Fetch messages between user and partner
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
                .order('created_at', { ascending: true })
                .limit(50);

            if (error) throw error;
            setMessages(data);
        } catch (error) {
            console.error("Error fetching messages:", error);
        } finally {
            setLoading(false);
        }
    }, [user, partnerId]);

    useEffect(() => {
        fetchMessages();

        if (!user || !partnerId) return;

        const subscription = supabase
            .channel(`chat:${user.id}:${partnerId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${user.id}` // Listen for incoming
            }, (payload) => {
                if (payload.new.sender_id === partnerId) {
                    setMessages(prev => [...prev, payload.new]);
                }
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `sender_id=eq.${user.id}` // Listen for outgoing (from other tabs)
            }, (payload) => {
                if (payload.new.receiver_id === partnerId) {
                    setMessages(prev => [...prev, payload.new]); // Append my own message if not already there
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [user, partnerId, fetchMessages]);

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
            // Optimistic update done by subscription usually, but we can also do it here if needed. 
            // Subscription is safer for sync.
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    return {
        messages,
        loading,
        sendMessage,
        refresh: fetchMessages
    };
};
