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
            // Step 1: fetch connections — always works regardless of DB schema
            const { data, error } = await supabase
                .from('user_connections')
                .select(`
                    id,
                    status,
                    created_at,
                    user_id,
                    linked_user_id,
                    user:user_id(nickname),
                    linked_user:linked_user_id(nickname)
                `)
                .or(`user_id.eq.${user.id},linked_user_id.eq.${user.id}`)
                .eq('status', 'accepted');

            if (error) throw error;

            // Normalize: always expose partner's info regardless of who initiated
            const normalized = data.map(conn => {
                const isInitiator = conn.user_id === user.id;
                return {
                    ...conn,
                    partnerId: isInitiator ? conn.linked_user_id : conn.user_id,
                    partnerNickname: isInitiator ? conn.linked_user?.nickname : conn.user?.nickname,
                    partnerLastSeen: null, // will be filled below if column exists
                };
            });

            // Step 2: try to fetch last_seen separately (fails gracefully if column doesn't exist yet)
            try {
                const partnerIds = normalized.map(c => c.partnerId).filter(Boolean);
                if (partnerIds.length > 0) {
                    const { data: usersData, error: usersError } = await supabase
                        .from('users')
                        .select('id, last_seen')
                        .in('id', partnerIds);

                    if (!usersError && usersData) {
                        const lastSeenMap = Object.fromEntries(usersData.map(u => [u.id, u.last_seen]));
                        normalized.forEach(conn => {
                            conn.partnerLastSeen = lastSeenMap[conn.partnerId] ?? null;
                        });
                    }
                }
            } catch {
                // last_seen column doesn't exist yet — continue without it
            }

            setConnections(normalized);

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

    const removeConnection = async (connectionId) => {
        try {
            const { error } = await supabase
                .from('user_connections')
                .delete()
                .eq('id', connectionId);

            if (error) throw error;

            await fetchConnections();
            return { success: true };
        } catch (err) {
            console.error('Error removing connection:', err);
            return { success: false, error: err.message };
        }
    };

    const sendRequest = async (targetUserId) => {
        try {
            // Check friend limit
            if (connections.length >= 10) {
                return { success: false, error: "Достигнут лимит 10 друзей" };
            }

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
        removeConnection,
        refreshConnections: fetchConnections
    };
};
