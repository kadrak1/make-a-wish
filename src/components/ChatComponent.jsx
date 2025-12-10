import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../context/AuthContext';

const ChatComponent = ({ partnerId }) => {
    const { user } = useAuth();
    const { messages, sendMessage, loading } = useChat(partnerId);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        await sendMessage(newMessage);
        setNewMessage('');
    };

    return (
        <div className="flex flex-col h-[400px] border border-[#E3D7B6] rounded-xl bg-white/50 overflow-hidden">
            {/* Header */}
            <div className="bg-[#E3D7B6]/30 p-3 border-b border-[#E3D7B6] flex items-center gap-2">
                <MessageSquare size={16} className="text-[#8E7C68]" />
                <span className="text-[#8E7C68] font-bold text-sm">Чат</span>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F4F4F5]">
                {loading && messages.length === 0 ? (
                    <div className="text-center text-xs text-gray-400 mt-4">Загрузка сообщений...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-xs text-gray-400 mt-4">Нет сообщений. Напишите первым!</div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender_id === user.id;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${isMe
                                            ? 'bg-[#8E7C68] text-white rounded-br-none'
                                            : 'bg-white text-gray-800 border border-[#E3D7B6] rounded-bl-none'
                                        }`}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 bg-white border-t border-[#E3D7B6] flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Напишите сообщение..."
                    className="flex-1 bg-[#F4F4F5] border-none rounded-full px-4 py-2 text-sm focus:ring-1 focus:ring-[#8E7C68] outline-none"
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-2 bg-[#8E7C68] text-white rounded-full hover:bg-[#7a6b5a] disabled:opacity-50 transition-colors"
                >
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
};

export default ChatComponent;
