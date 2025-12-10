import React, { useRef, useEffect } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../context/AuthContext';
import { useFriendContext } from '../context/FriendContext';

const MainChatWidget = () => {
    const { user } = useAuth();
    const { activeConnection } = useFriendContext();
    const { messages, sendMessage, loading } = useChat(activeConnection?.partnerId);
    const messagesEndRef = useRef(null);
    const [newMessage, setNewMessage] = React.useState('');

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeConnection) return;

        await sendMessage(newMessage);
        setNewMessage('');
    };

    if (!activeConnection) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4 bg-black/40 backdrop-blur-md rounded-xl border border-[#E3D7B6]/30 h-[300px] w-full md:w-80">
                <MessageSquare size={32} className="mb-2 opacity-50" />
                <span className="text-sm text-center">Выберите друга для чата</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col bg-black/60 backdrop-blur-md rounded-xl border border-[#E3D7B6]/30 h-[350px] w-full md:w-80 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-[#E3D7B6]/10 border-b border-[#E3D7B6]/20 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[#E3D7B6] font-bold text-sm tracking-wide">
                    Чат: {activeConnection.partnerNickname}
                </span>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-[#E3D7B6]/50 scrollbar-track-transparent">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs">
                        <span className="mb-2">✨</span>
                        Начните общение
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender_id === user.id;
                        return (
                            <div
                                key={msg.id}
                                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${isMe
                                        ? 'bg-[#E3D7B6] text-[#8E7C68] rounded-tr-none font-medium'
                                        : 'bg-white/10 text-gray-200 rounded-tl-none'
                                        }`}
                                >
                                    {msg.content}
                                </div>
                                <span className="text-[10px] text-gray-500 mt-1 px-1">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 bg-black/40 border-t border-[#E3D7B6]/20 flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Написать сообщение..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E3D7B6]/50 transition-colors"
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim() || loading}
                    className="p-2 bg-[#E3D7B6] rounded-full text-[#8E7C68] hover:bg-[#d4c4a0] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                    <Send size={16} />
                </button>
            </form>
        </div>
    );
};

export default MainChatWidget;
