import React, { useState } from 'react';
import { X, Users, UserPlus, Check, Share2, Copy, AlertCircle, Loader2, MessageSquare, BookOpen } from 'lucide-react';
import { useUserConnections } from '../hooks/useUserConnections';
import { useAuth } from '../context/AuthContext';
import { useUnreadCounts } from '../hooks/useUnreadCounts';
import ChatModal from './ChatModal';
import FriendQuestsModal from './FriendQuestsModal';

const TABS = [
    { id: 'list', label: 'Список друзей', icon: Users },
    { id: 'add', label: 'Добавить друга', icon: UserPlus },
];

const formatOnlineStatus = (lastSeen) => {
    if (!lastSeen) return { label: 'Не заходил(а)', online: false };
    const diff = Date.now() - new Date(lastSeen).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 5) return { label: 'В сети', online: true };
    if (minutes < 60) return { label: `Был(а) ${minutes} мин. назад`, online: false };
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return { label: `Был(а) ${hours} ч. назад`, online: false };
    const days = Math.floor(hours / 24);
    return { label: `Был(а) ${days} д. назад`, online: false };
};

const FriendsModal = ({ isOpen, onClose, initialTab = 'list' }) => {
    const { user } = useAuth();
    const { connections, pendingRequests, loading, sendRequest, acceptRequest, rejectRequest, removeConnection } = useUserConnections();
    const unreadCounts = useUnreadCounts();

    const [activeTab, setActiveTab] = useState(initialTab);
    const [chatPartner, setChatPartner] = useState(null); // { id, nickname }
    const [questsPartner, setQuestsPartner] = useState(null); // { id, nickname }

    // Add-friend form state
    const [targetId, setTargetId] = useState('');
    const [status, setStatus] = useState(null);
    const [copied, setCopied] = useState(false);
    const [sending, setSending] = useState(false);

    if (!isOpen) return null;

    const isAtLimit = connections.length >= 10;

    const handleRemove = async (connectionId, partnerNickname) => {
        if (!confirm(`Удалить ${partnerNickname || 'этого друга'} из списка друзей?`)) return;
        await removeConnection(connectionId);
    };

    const handleAccept = async (id) => await acceptRequest(id);
    const handleReject = async (id) => await rejectRequest(id);

    const copyMyId = () => {
        navigator.clipboard.writeText(user.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        const trimmed = targetId.trim();
        if (!trimmed || sending) return;
        setSending(true);
        setStatus(null);
        const result = await sendRequest(trimmed);
        if (result.success) {
            setStatus({ type: 'success', message: 'Запрос успешно отправлен!' });
            setTargetId('');
        } else {
            setStatus({ type: 'error', message: result.error || 'Ошибка отправки запроса' });
        }
        setSending(false);
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="w-full max-w-md bg-[#F4F4F5] border-2 border-[#E3D7B6] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-3 bg-[#E3D7B6] shrink-0">
                        <div className="flex items-center gap-2 text-[#8E7C68]">
                            <Users size={22} />
                            <h2 className="text-base font-bold uppercase tracking-wider">Друзья</h2>
                            <span className="ml-1 text-sm font-mono bg-[#8E7C68]/15 px-2.5 py-1 rounded-full border border-[#8E7C68]/10">
                                {connections.length} / 10
                            </span>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-[#8E7C68]/10 rounded-full transition-colors">
                            <X size={22} className="text-[#8E7C68] hover:text-[#5c4d3c]" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex p-2 gap-2 bg-[#EAE5D5] border-b border-[#E3D7B6]/50 shrink-0">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 ${isActive
                                        ? 'bg-[#8E7C68] text-[#F4F4F5] shadow-sm'
                                        : 'text-[#8E7C68] hover:bg-[#8E7C68]/10'
                                        }`}
                                >
                                    <Icon size={14} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">

                        {/* ===== TAB: Friend List ===== */}
                        {activeTab === 'list' && (
                            loading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 size={28} className="text-[#8E7C68] animate-spin" />
                                </div>
                            ) : (
                                <>
                                    {/* Incoming requests */}
                                    {pendingRequests.length > 0 && (
                                        <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                                            <h3 className="text-orange-800 font-bold text-xs uppercase tracking-wide mb-3 flex items-center gap-2">
                                                <Share2 size={14} />
                                                Входящие запросы
                                            </h3>
                                            <div className="space-y-2">
                                                {pendingRequests.map(req => (
                                                    <div key={req.id} className="bg-white p-3 rounded-lg border border-orange-100 flex items-center justify-between shadow-sm">
                                                        <span className="text-sm font-bold text-gray-700 truncate max-w-[160px]">
                                                            {req.user?.nickname || req.user_id}
                                                        </span>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleAccept(req.id)} className="p-1.5 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors" title="Принять">
                                                                <Check size={15} />
                                                            </button>
                                                            <button onClick={() => handleReject(req.id)} className="p-1.5 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors" title="Отклонить">
                                                                <X size={15} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Friends list */}
                                    {connections.length === 0 ? (
                                        <div className="flex flex-col items-center py-10 text-center text-[#8E7C68]/60">
                                            <Users size={40} className="mb-3 opacity-30" />
                                            <p className="text-sm italic">Список друзей пуст</p>
                                            <button
                                                onClick={() => setActiveTab('add')}
                                                className="mt-3 text-xs text-[#8E7C68] underline underline-offset-2 hover:opacity-70 transition-opacity"
                                            >
                                                Добавить первого друга →
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {connections.map(conn => {
                                                const { label: onlineLabel, online } = formatOnlineStatus(conn.partnerLastSeen);
                                                const unread = unreadCounts[conn.partnerId] || 0;
                                                return (
                                                    <div
                                                        key={conn.id}
                                                        className="bg-white rounded-xl border border-[#E3D7B6] p-3 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative shrink-0">
                                                                <div className="w-9 h-9 bg-[#E3D7B6] rounded-full flex items-center justify-center">
                                                                    <span className="text-[#8E7C68] font-bold text-sm">
                                                                        {(conn.partnerNickname || '?')[0].toUpperCase()}
                                                                    </span>
                                                                </div>
                                                                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${online ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-sm text-gray-800">
                                                                    {conn.partnerNickname || conn.partnerId}
                                                                </p>
                                                                <p className={`text-sm ${online ? 'text-green-500 font-bold' : 'text-gray-400 font-normal italic'}`}>
                                                                    {onlineLabel}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Action buttons */}
                                                        <div className="flex items-center gap-1.5">
                                                            {/* Quests button */}
                                                            <button
                                                                onClick={() => setQuestsPartner({ id: conn.partnerId, nickname: conn.partnerNickname })}
                                                                className="p-1.5 text-[#8E7C68] hover:text-white hover:bg-[#8E7C68] rounded-full transition-colors"
                                                                title="Задания"
                                                            >
                                                                <BookOpen size={16} />
                                                            </button>
                                                            {/* Chat button with unread badge */}
                                                            <div className="relative">
                                                                <button
                                                                    onClick={() => setChatPartner({ id: conn.partnerId, nickname: conn.partnerNickname })}
                                                                    className="p-1.5 text-[#8E7C68] hover:text-white hover:bg-[#8E7C68] rounded-full transition-colors"
                                                                    title="Открыть чат"
                                                                >
                                                                    <MessageSquare size={16} />
                                                                </button>
                                                                {unread > 0 && (
                                                                    <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1 leading-none pointer-events-none border-2 border-white">
                                                                        {unread > 9 ? '9+' : unread}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {/* Remove button */}
                                                            <button
                                                                onClick={() => handleRemove(conn.id, conn.partnerNickname)}
                                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                                title="Удалить друга"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            )
                        )}

                        {/* ===== TAB: Add Friend ===== */}
                        {activeTab === 'add' && (
                            <div className="space-y-5">
                                <div>
                                    <label className="text-xs text-gray-500 font-semibold mb-1.5 block uppercase tracking-wide">
                                        Ваш ID (отправьте партнёру):
                                    </label>
                                    <div className="flex gap-2">
                                        <code className="flex-1 bg-black/5 border border-[#E3D7B6] p-2.5 rounded-lg text-xs font-mono truncate select-all text-gray-700">
                                            {user?.id}
                                        </code>
                                        <button
                                            onClick={copyMyId}
                                            className={`px-3 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all ${copied
                                                ? 'bg-green-100 text-green-700 border border-green-200'
                                                : 'bg-[#E3D7B6] text-[#8E7C68] hover:bg-[#d4c5a3]'
                                                }`}
                                        >
                                            {copied ? <Check size={14} /> : <Copy size={14} />}
                                            {copied ? 'Скопировано' : 'Копировать'}
                                        </button>
                                    </div>
                                </div>

                                <div className="border-t border-[#E3D7B6]" />

                                <div>
                                    <label className="text-xs text-gray-500 font-semibold mb-1.5 block uppercase tracking-wide">
                                        ID друга:
                                    </label>

                                    {isAtLimit ? (
                                        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                                            <AlertCircle size={16} />
                                            <span>Достигнут лимит 10 друзей.</span>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSend} className="space-y-3">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={targetId}
                                                    onChange={e => setTargetId(e.target.value)}
                                                    placeholder="Вставьте ID друга"
                                                    disabled={sending}
                                                    className="flex-1 bg-white border border-[#E3D7B6] rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#8E7C68] transition-colors disabled:opacity-60"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={!targetId.trim() || sending}
                                                    className="bg-[#8E7C68] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#7a6b5a] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                                                >
                                                    <UserPlus size={16} />
                                                    {sending ? 'Отправка...' : 'Отправить'}
                                                </button>
                                            </div>

                                            {status && (
                                                <div className={`flex items-center gap-2 text-sm p-2.5 rounded-lg ${status.type === 'success'
                                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                                    : 'bg-red-50 text-red-700 border border-red-200'
                                                    }`}>
                                                    {status.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                                                    {status.message}
                                                </div>
                                            )}
                                        </form>
                                    )}
                                </div>

                                <p className="text-xs text-gray-400 text-center">{connections.length} / 10 друзей добавлено</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Chat modal */}
            <ChatModal
                isOpen={!!chatPartner}
                onClose={() => setChatPartner(null)}
                partnerId={chatPartner?.id}
                partnerNickname={chatPartner?.nickname}
            />

            {/* Quests modal */}
            <FriendQuestsModal
                isOpen={!!questsPartner}
                onClose={() => setQuestsPartner(null)}
                partnerId={questsPartner?.id}
                partnerNickname={questsPartner?.nickname}
            />
        </>
    );
};

export default FriendsModal;
