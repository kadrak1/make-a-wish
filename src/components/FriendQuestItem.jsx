import React, { useState } from 'react';
import { Check, Star, X, Clock, Shield } from 'lucide-react';
import SchedulePickerModal, { scheduleLabel } from './SchedulePickerModal';
import { useQuestSchedules } from '../hooks/useQuestSchedules';

// Displays a shared quest (assigned to me by a friend) in the same card style
// as system quests, but with "От [nickname]: title" label.
const FriendQuestItem = ({ quest, onMarkDone, onClaim, onDelete }) => {
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showSchedule, setShowSchedule] = useState(false);
    const [busy, setBusy] = useState(false);

    const { getSchedule, setSchedule } = useQuestSchedules();
    const currentSchedule = getSchedule(quest.id);

    const status = quest.status; // 'active' | 'completed' | 'verified'

    const handleMarkDone = async () => {
        setBusy(true);
        await onMarkDone(quest.id);
        setBusy(false);
        setShowConfirmation(false);
    };

    const handleClaim = async () => {
        setBusy(true);
        const result = await onClaim(quest);
        setBusy(false);
        if (result && !result.success) {
            alert('Ошибка: ' + result.error);
        }
        return result;
    };

    const handleDelete = async () => {
        setBusy(true);
        const result = await onDelete(quest.id);
        setBusy(false);
        if (result && !result.success) {
            alert('Ошибка при удалении: ' + result.error);
        } else {
            setShowDeleteConfirm(false);
        }
    };

    const getStatusInfo = () => {
        if (status === 'completed') return { icon: <Clock size={14} />, label: 'Ждёт подтверждения', color: 'text-yellow-600' };
        if (status === 'verified') return { icon: <Shield size={14} />, label: 'Подтверждено', color: 'text-green-600' };
        return null;
    };

    const statusInfo = getStatusInfo();
    const canMarkDone = status === 'active';
    const canDelete = status === 'active';
    const isRepeatable = quest.quest_type === 'repeatable';
    const isTogether = quest.quest_type === 'together';
    const isMine = quest.created_by === quest.assigned_to;

    return (
        <>
            <div className={`relative p-4 mb-3 rounded-lg border-l-4 bg-orange-50 shadow-sm transition-all hover:shadow-md ${isMine
                ? 'border-yellow-400'
                : 'border-purple-400'
                }`}>

                {/* Top-right controls: schedule clock + X */}
                <div className="absolute top-2 right-2 flex items-center gap-1">
                    {/* Schedule button — only for repeatable */}
                    {isRepeatable && (
                        <button
                            onClick={() => setShowSchedule(true)}
                            title={`Расписание: ${scheduleLabel(currentSchedule)}`}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-gray-400 hover:text-[#8E7C68] hover:bg-[#E3D7B6]/50 transition-all"
                        >
                            <Clock size={13} />
                            {currentSchedule !== undefined && (
                                <span className="text-sm font-bold text-[#8E7C68] leading-none">
                                    {scheduleLabel(currentSchedule)}
                                </span>
                            )}
                        </button>
                    )}

                    {/* X — only when active */}
                    {canDelete && (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-100 transition-all"
                            title="Удалить"
                        >
                            <X size={15} />
                        </button>
                    )}
                </div>

                {/* Complete — bottom right (only when active) */}
                {canMarkDone && (
                    <button
                        onClick={() => setShowConfirmation(true)}
                        disabled={busy}
                        className="absolute bottom-3 right-3 p-2 rounded-full bg-[#E3D7B6] hover:bg-[#d4c5a0] text-[#5c4d3c] active:scale-95 shadow-sm transition-all flex items-center justify-center"
                    >
                        <span className="text-sm font-bold px-4 py-1">Выполнить</span>
                    </button>
                )}

                {/* Verified state — Claim button */}
                {status === 'verified' && (
                    <button
                        onClick={handleClaim}
                        disabled={busy}
                        className="absolute bottom-3 right-3 p-2 rounded-full bg-green-500 hover:bg-green-600 text-white active:scale-95 shadow-lg transition-all flex items-center justify-center animate-bounce"
                    >
                        <span className="text-sm font-bold px-4 py-1 flex items-center gap-1.5">
                            <Star size={14} className="fill-white" /> Забрать
                        </span>
                    </button>
                )}

                <div className="pr-6">
                    <h3 className="font-bold text-lg text-orange-900 mb-3">
                        {quest.created_by !== quest.assigned_to && (
                            <>
                                <span className="text-[#8E7C68] font-bold">От </span>
                                <span className="text-[#8E7C68] font-bold">{quest.creator_nickname}</span>
                                <span className="text-[#8E7C68] font-bold"> : </span>
                            </>
                        )}
                        {quest.title}
                    </h3>

                    {quest.description && (
                        <p className="text-gray-600 text-sm mb-3 font-normal leading-relaxed">{quest.description}</p>
                    )}

                    <div className="flex items-center gap-3">
                        {quest.reward_primogems > 0 && (
                            <div className="flex items-center gap-1.5 text-sm bg-yellow-50 px-2 py-1 rounded border border-yellow-200">
                                <Star size={16} className="text-yellow-500 fill-yellow-500" />
                                <span className="text-yellow-700 font-bold">{quest.reward_primogems}</span>
                            </div>
                        )}
                        {statusInfo && (
                            <div className={`flex items-center gap-1.5 text-sm font-bold ${statusInfo.color}`}>
                                {statusInfo.icon}
                                {statusInfo.label}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Schedule Picker Modal */}
            {showSchedule && (
                <SchedulePickerModal
                    questTitle={quest.title}
                    initialDays={currentSchedule}
                    onSave={(days) => setSchedule(quest.id, days)}
                    onClose={() => setShowSchedule(false)}
                />
            )}

            {/* Complete Confirmation */}
            {showConfirmation && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#F4F4F5] border-2 border-[#E3D7B6] rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-[#8E7C68] font-bold text-lg mb-4 text-center uppercase tracking-wider">Подтверждение</h3>
                        <p className="text-gray-600 text-center mb-6">
                            Отметить задание как выполненное?<br />
                            <span className="text-xs text-gray-400">Друг должен будет подтвердить выполнение.</span>
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setShowConfirmation(false)} className="px-6 py-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 transition-colors font-bold text-sm">Нет</button>
                            <button onClick={handleMarkDone} disabled={busy} className="px-6 py-2 rounded-full bg-[#E3D7B6] hover:bg-[#d4c5a0] text-[#5c4d3c] transition-colors font-bold text-sm shadow-sm disabled:opacity-50">Да</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#FDFBF7] border-2 border-[#E3D7B6] rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-[#8E7C68] font-bold text-lg mb-2 text-center uppercase tracking-wider">Удалить задание?</h3>
                        <p className="text-gray-600 text-center mb-6 text-sm">«{quest.title}» будет удалено.</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setShowDeleteConfirm(false)} className="px-6 py-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 transition-colors font-bold text-sm">Отмена</button>
                            <button onClick={handleDelete} disabled={busy} className="px-6 py-2 rounded-full bg-[#8E7C68] hover:bg-[#7a6b5a] text-white transition-colors font-bold text-sm shadow-sm disabled:opacity-50">Удалить</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default FriendQuestItem;
