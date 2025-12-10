import React, { useState } from 'react';
import { UserPlus, Check, X, Copy, Share2 } from 'lucide-react';
import { useUserConnections } from '../hooks/useUserConnections';
import { useAuth } from '../context/AuthContext';

const UserLinkManager = () => {
    const { user } = useAuth();
    const {
        connections,
        pendingRequests,
        sendRequest,
        acceptRequest,
        rejectRequest,
        loading
    } = useUserConnections();

    const [targetId, setTargetId] = useState('');
    const [requestStatus, setRequestStatus] = useState(null); // 'success', 'error'

    const handleSend = async (e) => {
        e.preventDefault();
        if (!targetId.trim()) return;

        const result = await sendRequest(targetId.trim());
        if (result.success) {
            setRequestStatus('success');
            setTargetId('');
            setTimeout(() => setRequestStatus(null), 3000);
        } else {
            alert("Ошибка отправки запроса: " + result.error);
        }
    };

    const copyMyId = () => {
        navigator.clipboard.writeText(user.id);
        alert("ID скопирован в буфер обмена");
    };

    return (
        <div className="space-y-6">
            <div className="bg-white/50 rounded-xl p-4 border border-[#E3D7B6]">
                <h3 className="text-[#8E7C68] font-bold text-sm uppercase tracking-wide mb-4">Добавить партнера</h3>

                <div className="mb-4">
                    <label className="text-xs text-gray-500 mb-1 block">Ваш ID (отправьте партнеру):</label>
                    <div className="flex gap-2">
                        <code className="flex-1 bg-black/5 p-2 rounded text-xs font-mono truncate select-all">
                            {user?.id}
                        </code>
                        <button onClick={copyMyId} className="p-2 bg-[#E3D7B6] rounded text-[#8E7C68] hover:bg-[#d4c5a3]">
                            <Copy size={16} />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSend} className="space-y-2">
                    <label className="text-xs text-gray-500 block">ID партнера:</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={targetId}
                            onChange={(e) => setTargetId(e.target.value)}
                            placeholder="Вставьте ID партнера"
                            className="flex-1 bg-white border border-[#E3D7B6] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8E7C68]"
                        />
                        <button
                            type="submit"
                            className="bg-[#8E7C68] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#7a6b5a]"
                        >
                            <UserPlus size={16} />
                            Добавить
                        </button>
                    </div>
                </form>

                {requestStatus === 'success' && (
                    <div className="mt-2 text-green-600 text-xs flex items-center gap-1">
                        <Check size={12} /> Запрос отправлен!
                    </div>
                )}
            </div>

            {pendingRequests.length > 0 && (
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                    <h3 className="text-orange-800 font-bold text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                        <Share2 size={16} />
                        Входящие запросы
                    </h3>
                    <div className="space-y-2">
                        {pendingRequests.map(req => (
                            <div key={req.id} className="bg-white p-3 rounded-lg border border-orange-100 flex items-center justify-between shadow-sm">
                                <span className="text-xs font-mono text-gray-600 truncate max-w-[150px]">
                                    {req.user_id}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => acceptRequest(req.id)}
                                        className="p-1.5 bg-green-100 text-green-700 rounded-full hover:bg-green-200"
                                        title="Принять"
                                    >
                                        <Check size={16} />
                                    </button>
                                    <button
                                        onClick={() => rejectRequest(req.id)}
                                        className="p-1.5 bg-red-100 text-red-700 rounded-full hover:bg-red-200"
                                        title="Отклонить"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {connections.length > 0 && (
                <div className="bg-white/50 rounded-xl p-4 border border-[#E3D7B6]">
                    <h3 className="text-[#8E7C68] font-bold text-sm uppercase tracking-wide mb-3">Ваши связи</h3>
                    <div className="space-y-2">
                        {connections.map(conn => (
                            <div key={conn.id} className="text-sm text-gray-600 flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                <span className="font-mono text-xs">
                                    {conn.user_id === user.id ? conn.linked_user_id : conn.user_id}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserLinkManager;
