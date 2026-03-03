import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

const MAX_CONNECTIONS = 2;

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
            // Fetch accepted connections with balance and gacha columns
            const { data, error } = await supabase
                .from('user_connections')
                .select(`
                    id,
                    status,
                    created_at,
                    user_id,
                    linked_user_id,
                    user_primogems,
                    linked_user_primogems,
                    connection_color,
                    wishes_balance,
                    history,
                    queue,
                    pity_counter,
                    user:user_id(nickname),
                    linked_user:linked_user_id(nickname)
                `)
                .or(`user_id.eq.${user.id},linked_user_id.eq.${user.id}`)
                .eq('status', 'accepted');

            if (error) throw error;

            // Normalize: expose partner info and my/partner colored primogems
            const normalized = data.map(conn => {
                const isInitiator = conn.user_id === user.id;
                const myPrimogems = isInitiator
                    ? (conn.user_primogems || 0)
                    : (conn.linked_user_primogems || 0);
                const partnerPrimogems = isInitiator
                    ? (conn.linked_user_primogems || 0)
                    : (conn.user_primogems || 0);

                return {
                    ...conn,
                    partnerId: isInitiator ? conn.linked_user_id : conn.user_id,
                    partnerNickname: isInitiator ? conn.linked_user?.nickname : conn.user?.nickname,
                    partnerLastSeen: null, // filled below
                    myPrimogems,
                    partnerPrimogems,
                    connectionColor: conn.connection_color || '#22d3ee',
                    myWishes: conn.wishes_balance || 0,
                };
            });

            // Fetch last_seen for partners (gracefully skip if column missing)
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

    // Realtime: auto-refresh connections on any update (e.g. balance changes)
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel(`user_connections_refresh_${user.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'user_connections',
            }, () => {
                fetchConnections();
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [user, fetchConnections]);

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
            // Check 2-connection limit (UI guard, RPC also enforces)
            if (connections.length >= MAX_CONNECTIONS) {
                return { success: false, error: `Достигнут лимит ${MAX_CONNECTIONS} соединений` };
            }

            if (user.id === targetUserId) {
                return { success: false, error: 'Нельзя добавить самого себя' };
            }

            const { data, error } = await supabase
                .rpc('send_friend_request', {
                    sender_id: user.id,
                    target_user_id: targetUserId
                });

            if (error) throw error;
            if (!data.success) return { success: false, error: data.error };

            return { success: true };
        } catch (err) {
            console.error('Error sending request:', err);
            return { success: false, error: err.message };
        }
    };

    const acceptRequest = async (connectionId, chosenColor) => {
        try {
            const updates = { status: 'accepted' };
            if (chosenColor) updates.connection_color = chosenColor;

            const { error } = await supabase
                .from('user_connections')
                .update(updates)
                .eq('id', connectionId);

            if (error) throw error;

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
        maxConnections: MAX_CONNECTIONS,
        sendRequest,
        acceptRequest,
        rejectRequest,
        removeConnection,
        refreshConnections: fetchConnections
    };
};
