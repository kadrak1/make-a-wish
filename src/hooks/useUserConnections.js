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
                    linked_user_id,
                    user:user_id(nickname),
                    linked_user:linked_user_id(nickname),
                    user_balance,
                    linked_user_balance,
                    wishes_balance,
                    pity_counter,
                    gifts_received
                `)
                .or(`user_id.eq.${user.id},linked_user_id.eq.${user.id}`)
                .eq('status', 'accepted');

            if (error) throw error;

            // Normalize connections to always have a 'partner' field
            const normalizedConnections = data.map(conn => {
                const isInitiator = conn.user_id === user.id;
                return {
                    ...conn,
                    partner: isInitiator ? conn.linked_user : conn.user,
                    partnerId: isInitiator ? conn.linked_user_id : conn.user_id,
                    partnerNickname: isInitiator ? conn.linked_user?.nickname : conn.user?.nickname,
                    myBalance: isInitiator ? conn.user_balance : conn.linked_user_balance,
                    partnerBalance: isInitiator ? conn.linked_user_balance : conn.user_balance,
                    // These are shared/single fields for the connection in this simple model, 
                    // or do we want specific columns? 
                    // The schema added them as single columns for the connection rows.
                    // Implementation plan said: add to user_connections. 
                    // Logic: If I am friend A, and I select Friend B, I see "OUR" wishes balance?
                    // User Request: "Для каждого друга должно быть свое состояние баланса ... и круток"
                    // Ideally, "My stats with Friend B".
                    // Since the columns are on the `user_connections` table, they belong to the RELATIONSHIP.
                    // So both see the same Pity Counter? That might be intended for "Partner Gacha".
                    // Or did we want discrete columns?
                    // The prompt says "balance of primogems and wishes... gift counter".
                    // Let's assume shared for the pair for now as they are on the link table.
                    wishes: conn.wishes_balance,
                    pity: conn.pity_counter,
                    gifts: conn.gifts_received
                };
            });

            setConnections(normalizedConnections);

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
                .select(`
                    *,
                    user:user_id(nickname)
                `)
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

            console.log("Using RPC to link users (No Auth Mode):", { myId: user.id, targetId: targetUserId });

            // We pass user.id explicitly because we are not using Supabase Auth
            const { data, error } = await supabase
                .rpc('send_friend_request', {
                    sender_id: user.id,
                    target_user_id: targetUserId
                });

            if (error) {
                console.error("RPC Error:", error);
                throw error;
            }

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
