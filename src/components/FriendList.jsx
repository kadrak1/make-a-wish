import React from 'react';
import { Users, User, Smile } from 'lucide-react';
import { useUserConnections } from '../hooks/useUserConnections';
import { useFriendContext } from '../context/FriendContext';

const FriendList = () => {
    const { connections } = useUserConnections();
    const { selectedFriendId, selectFriend } = useFriendContext();

    // Filter accepted connections
    const friends = connections.filter(c => c.status === 'accepted');

    return (
        <div className="flex flex-col gap-2 p-2 bg-black/40 backdrop-blur-md rounded-xl border border-[#E3D7B6]/30 max-h-[300px] overflow-y-auto w-full md:w-64">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
                <Users size={16} className="text-[#E3D7B6]" />
                <span className="text-[#E3D7B6] font-bold text-sm uppercase">Друзья</span>
            </div>

            <div className="flex flex-col gap-1">
                {/* "Me" / Global Context Option */}
                <button
                    onClick={() => selectFriend(null)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${!selectedFriendId
                            ? 'bg-[#E3D7B6] text-[#8E7C68] font-bold shadow-lg'
                            : 'text-gray-300 hover:bg-white/10'
                        }`}
                >
                    <div className={`p-1.5 rounded-full ${!selectedFriendId ? 'bg-[#8E7C68]/20' : 'bg-white/10'}`}>
                        <User size={16} />
                    </div>
                    <span className="text-sm">Мой Мир</span>
                </button>

                {friends.length === 0 && (
                    <div className="px-3 py-4 text-center text-gray-500 text-xs italic">
                        Нет друзей
                    </div>
                )}

                {friends.map(friend => (
                    <button
                        key={friend.partnerId}
                        onClick={() => selectFriend(friend.partnerId)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${selectedFriendId === friend.partnerId
                                ? 'bg-[#E3D7B6] text-[#8E7C68] font-bold shadow-lg'
                                : 'text-gray-300 hover:bg-white/10'
                            }`}
                    >
                        <div className={`p-1.5 rounded-full ${selectedFriendId === friend.partnerId ? 'bg-[#8E7C68]/20' : 'bg-white/10'}`}>
                            <Smile size={16} />
                        </div>
                        <div className="flex flex-col items-start leading-none gap-0.5">
                            <span className="text-sm">{friend.partnerNickname}</span>
                            {selectedFriendId === friend.partnerId && (
                                <span className="text-[10px] opacity-70">Баланс: {friend.myBalance}</span>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default FriendList;
