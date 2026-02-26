import React, { useEffect, useRef, useState } from 'react';
import { X, Send, MessageSquare, Loader2 } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../context/AuthContext';

const ChatModal = ({ isOpen, onClose, partnerId, partnerNickname }) => {
    const { user } = useAuth();
    const { messages, loading, sendMessage, markAsRead } = useChat(isOpen ? partnerId : null);
    const [text, setText] = useState('');
    const bottomRef = useRef(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Mark as read when chat is opened
    useEffect(() => {
        if (isOpen && partnerId) markAsRead();
    }, [isOpen, partnerId, markAsRead]);

    if (!isOpen) return null;

    const handleSend = async (e) => {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed) return;
        setText('');
        await sendMessage(trimmed);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend(e);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-[#F4F4F5] border-2 border-[#E3D7B6] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
                style={{ height: '520px' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#E3D7B6] shrink-0">
                    <div className="flex items-center gap-2 text-[#8E7C68]">
                        <MessageSquare size={18} />
                        <span className="font-bold text-sm truncate max-w-[200px]">
                            {partnerNickname || 'Чат'}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-[#8E7C68]/10 rounded-full transition-colors">
                        <X size={20} className="text-[#8E7C68]" />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-[#F4F4F5]">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 size={24} className="text-[#8E7C68] animate-spin" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm gap-2">
                            <MessageSquare size={32} className="opacity-30" />
                            <span>Напишите первым!</span>
                        </div>
                    ) : (
                        messages.map(msg => {
                            const isMe = msg.sender_id === user.id;
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[78%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className={`px-3 py-2 rounded-2xl text-sm shadow-sm ${isMe
                                                ? 'bg-[#8E7C68] text-white rounded-br-none'
                                                : 'bg-white text-gray-800 border border-[#E3D7B6] rounded-bl-none'
                                            }`}>
                                            {msg.content}
                                        </div>
                                        <span className="text-[10px] text-gray-400 mt-0.5 px-1">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className="p-3 bg-white border-t border-[#E3D7B6] flex gap-2 shrink-0">
                    <input
                        type="text"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Написать сообщение..."
                        className="flex-1 bg-[#F4F4F5] border border-[#E3D7B6] rounded-full px-4 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#8E7C68] transition-colors"
                    />
                    <button
                        type="submit"
                        disabled={!text.trim()}
                        className="p-2 bg-[#8E7C68] text-white rounded-full hover:bg-[#7a6b5a] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                    >
                        <Send size={16} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatModal;
