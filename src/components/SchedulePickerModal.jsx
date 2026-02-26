import React, { useState } from 'react';
import { X, Clock } from 'lucide-react';

const DAYS = [
    { short: 'Пн', value: 1 },
    { short: 'Вт', value: 2 },
    { short: 'Ср', value: 3 },
    { short: 'Чт', value: 4 },
    { short: 'Пт', value: 5 },
    { short: 'Сб', value: 6 },
    { short: 'Вс', value: 0 },
];

// Converts scheduleDays to a human-readable label
export const scheduleLabel = (days) => {
    if (days === null || days === undefined) return 'Разовый';
    if (Array.isArray(days) && days.length === 0) return 'Каждый день';
    if (Array.isArray(days) && days.length > 0) {
        const order = [1, 2, 3, 4, 5, 6, 0];
        const sorted = [...days].sort((a, b) => order.indexOf(a) - order.indexOf(b));
        return sorted.map(v => DAYS.find(d => d.value === v)?.short).join(', ');
    }
    return '';
};

const SchedulePickerModal = ({ questTitle, initialDays, onSave, onClose }) => {
    const [scheduleDays, setScheduleDays] = useState(initialDays ?? null);

    const isOnce = scheduleDays === null;
    const isEveryDay = Array.isArray(scheduleDays) && scheduleDays.length === 0;

    const toggleDay = (val) => {
        setScheduleDays(prev => {
            const current = Array.isArray(prev) ? prev : [];
            const next = current.includes(val) ? current.filter(d => d !== val) : [...current, val];
            return next.length > 0 ? next : null;
        });
    };

    const handleSave = () => {
        onSave(scheduleDays);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#F4F4F5] border-2 border-[#E3D7B6] rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-[#8E7C68]">
                        <Clock size={18} />
                        <h3 className="font-bold text-base uppercase tracking-wider">Расписание</h3>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-black/10 transition-colors">
                        <X size={18} className="text-[#8E7C68]" />
                    </button>
                </div>

                <p className="text-sm text-[#8E7C68] mb-4 truncate italic">«{questTitle}»</p>

                {/* Options */}
                <div className="flex gap-2 flex-wrap mb-4">
                    {/* Once */}
                    <button
                        onClick={() => setScheduleDays(null)}
                        className={`px-4 h-10 rounded-full text-sm font-bold transition-all border ${isOnce
                            ? 'bg-[#8E7C68] text-white border-[#8E7C68] shadow-sm'
                            : 'bg-white text-[#8E7C68] border-[#E3D7B6] hover:border-[#8E7C68]'
                            }`}
                    >
                        Разовый
                    </button>

                    {/* Every day */}
                    <button
                        onClick={() => setScheduleDays([])}
                        className={`px-4 h-10 rounded-full text-sm font-bold transition-all border ${isEveryDay
                            ? 'bg-[#8E7C68] text-white border-[#8E7C68] shadow-sm'
                            : 'bg-white text-[#8E7C68] border-[#E3D7B6] hover:border-[#8E7C68]'
                            }`}
                    >
                        Каждый день
                    </button>

                    {/* Specific days */}
                    {DAYS.map(d => {
                        const active = Array.isArray(scheduleDays) && scheduleDays.includes(d.value);
                        return (
                            <button
                                key={d.value}
                                onClick={() => toggleDay(d.value)}
                                className={`w-10 h-10 rounded-full text-sm font-bold transition-all border ${active
                                    ? 'bg-[#8E7C68] text-white border-[#8E7C68] shadow-sm'
                                    : 'bg-white text-[#8E7C68] border-[#E3D7B6] hover:border-[#8E7C68]'
                                    }`}
                            >
                                {d.short}
                            </button>
                        );
                    })}
                </div>

                {/* Preview */}
                <p className="text-sm font-bold text-[#8E7C68] mb-5 text-center flex items-center justify-center gap-1.5">
                    <Clock size={16} />
                    {scheduleLabel(scheduleDays)}
                </p>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 transition-colors font-bold text-sm"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 py-2 rounded-full bg-[#8E7C68] hover:bg-[#7a6b5a] text-white transition-colors font-bold text-sm shadow-sm"
                    >
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SchedulePickerModal;
