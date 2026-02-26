import React from 'react';
import { X, BookOpen } from 'lucide-react';
import SharedQuestTab from './SharedQuestTab';

const FriendQuestsModal = ({ isOpen, onClose, partnerId, partnerNickname, myBalance = 0 }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#F4F4F5] border-2 border-[#E3D7B6] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
                style={{ maxHeight: '85vh' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 bg-[#E3D7B6] shrink-0">
                    <div className="flex items-center gap-2 text-[#8E7C68]">
                        <BookOpen size={18} />
                        <h2 className="font-bold text-sm uppercase tracking-wider">
                            Задания — <span className="text-[#5c4d3c]">{partnerNickname || 'друг'}</span>
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-[#8E7C68]/10 rounded-full transition-colors">
                        <X size={20} className="text-[#8E7C68]" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <SharedQuestTab partnerId={partnerId} myBalance={myBalance} />
                </div>
            </div>
        </div>
    );
};

export default FriendQuestsModal;
