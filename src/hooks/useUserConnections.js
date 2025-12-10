import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

export const useUserConnections = () => {
    const { user } = useAuth();
    const [connections, setConnections] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchConnections = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Fetch accepted connections (where user is either initiator or receiver)
            const { data, error } = await supabase
                .from('user_connections')
                .select(`
                    id,
                    status,
                    created_at,
                    user_id,
                    linked_user_id
                `)
                .or(`user_id.eq.${user.id},linked_user_id.eq.${user.id}`)
                .eq('status', 'accepted');

            if (error) throw error;
            setConnections(data);

        } catch (err) {
            console.error('Error fetching connections:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const fetchPendingRequests = useCallback(async () => {
        if (!user) return;
        try {
            // Fetch requests sent TO the user (incoming)
            const { data, error } = await supabase
                .from('user_connections')
                .select('*')
                .eq('linked_user_id', user.id)
                .eq('status', 'pending');

            if (error) throw error;
            setPendingRequests(data);
        } catch (err) {
            console.error('Error fetching pending requests:', err);
        }
    }, [user]);

    // Initial fetch
    useEffect(() => {
        if (user) {
            fetchConnections();
            fetchPendingRequests();
        }
    }, [user, fetchConnections, fetchPendingRequests]);

    const sendRequest = async (targetUserId) => {
        try {
            console.log("Attempting to link users:", { myId: user.id, targetId: targetUserId });

            // Check if trying to link self
            if (user.id === targetUserId) {
                return { success: false, error: "Нельзя добавить самого себя" };
            }

            console.log("Using RPC to link users:", { myId: user.id, targetId: targetUserId });

            const { data, error } = await supabase
                .rpc('send_friend_request', { target_user_id: targetUserId });

            if (error) throw error;

            console.log("RPC Result:", data);

            if (!data.success) {
                return { success: false, error: data.error };
            }

            return { success: true };
        } catch (err) {
            console.error('Error sending request:', err);
            return { success: false, error: err.message };
        }
    };

    const acceptRequest = async (connectionId) => {
        try {
            const { error } = await supabase
                .from('user_connections')
                .update({ status: 'accepted' })
                .eq('id', connectionId);

            if (error) throw error;

            // Refresh lists
            await fetchConnections();
            await fetchPendingRequests();
            return { success: true };
        } catch (err) {
            console.error('Error accepting request:', err);
            return { success: false, error: err.message };
        }
    };

    const rejectRequest = async (connectionId) => {
        try {
            const { error } = await supabase
                .from('user_connections')
                .delete()
                .eq('id', connectionId);

            if (error) throw error;

            await fetchPendingRequests();
            return { success: true };
        } catch (err) {
            console.error('Error rejecting request:', err);
            return { success: false, error: err.message };
        }
    };

    return {
        connections,
        pendingRequests,
        loading,
        error,
        sendRequest,
        acceptRequest,
        rejectRequest,
        refreshConnections: fetchConnections
    };
};
