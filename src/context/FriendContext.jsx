import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUserConnections } from '../hooks/useUserConnections';
import { useAuth } from './AuthContext';

const FriendContext = createContext();

export const useFriendContext = () => useContext(FriendContext);

export const FriendProvider = ({ children }) => {
    const { user } = useAuth();
    const { connections, refreshConnections } = useUserConnections();
    const [selectedFriendId, setSelectedFriendId] = useState(null);

    // Derived state for the active connection
    const activeConnection = selectedFriendId
        ? connections.find(c => c.partnerId === selectedFriendId)
        : null;

    // Helper to switch context
    const selectFriend = (friendId) => {
        setSelectedFriendId(friendId === selectedFriendId ? null : friendId);
    };

    const value = {
        selectedFriendId,
        selectFriend,
        activeConnection,
        isGlobalContext: !selectedFriendId,
        refreshConnections // Expose to allow refreshing data from UI
    };

    return (
        <FriendContext.Provider value={value}>
            {children}
        </FriendContext.Provider>
    );
};
