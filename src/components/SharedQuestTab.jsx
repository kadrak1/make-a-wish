import React, { useState } from 'react';
import { Plus, Star, Shield, Check, X, Gift, Award, Clock } from 'lucide-react';
import { useSharedQuests } from '../hooks/useSharedQuests';
import { usePartnerGifts } from '../hooks/usePartnerGifts';
import { useSubscription } from '../hooks/useSubscription';
import PremiumLock from './PremiumLock';
import SchedulePickerModal, { scheduleLabel } from './SchedulePickerModal';

// Status badge for quests created by me
const StatusBadge = ({ status }) => {
    switch (status) {
        case 'active':
            return <span className="text-sm font-bold text-yellow-600 bg-yellow-50 border border-yellow-200 px-3 py-1 rounded-full uppercase tracking-wide">Активно</span>;
        case 'completed':
            return <span className="text-sm font-bold text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full uppercase tracking-wide">На проверке</span>;
        case 'verified':
            return <span className="text-sm font-bold text-green-600 bg-green-50 border border-green-200 px-3 py-1 rounded-full uppercase tracking-wide">Подтверждено</span>;
        case 'claimed':
            return <span className="text-sm font-bold text-gray-400 bg-gray-100 border border-gray-200 px-3 py-1 rounded-full uppercase tracking-wide">Завершено</span>;
        default:
            return null;
    }
};


const SharedQuestTab = ({ partnerId }) => {
    // Current Active Sub-Tab
    const [subTab, setSubTab] = useState('quests'); // 'quests' or 'gifts'

    const { isPremium } = useSubscription();

    const {
        questsByMe,
        loading: questsLoading,
        createQuest,
        verifyQuest,
        deleteQuest
    } = useSharedQuests(partnerId);

    const {
        gifts,
        loading: giftsLoading,
        addGift,
        deleteGift
    } = usePartnerGifts(partnerId);

    // Quest Form State
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newQuest, setNewQuest] = useState({ title: '', description: '', reward: 50, type: 'one-time', scheduleDays: null });
    const [showSchedulePicker, setShowSchedulePicker] = useState(false);

    // Gift Form State
    const [showGiftForm, setShowGiftForm] = useState(false);
    const [newGift, setNewGift] = useState({ name: '', description: '', rarity: 'common' });

    const [busy, setBusy] = useState(false);
    const [creating, setCreating] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [questToDelete, setQuestToDelete] = useState(null);

    const handleCreateQuest = async (e) => {
        e.preventDefault();
        setCreating(true);
        // Free users always get "every day" schedule; premium users get their chosen schedule
        const scheduleDays = isPremium ? newQuest.scheduleDays : [];
        const result = await createQuest(newQuest.title, newQuest.description, newQuest.reward, newQuest.type, scheduleDays);
        setCreating(false);
        if (result.success) {
            setShowCreateForm(false);
            setNewQuest({ title: '', description: '', reward: 50, type: 'one-time', scheduleDays: null });
        } else {
            alert('Ошибка создания: ' + result.error);
        }
    };

    const handleAddGift = async (e) => {
        e.preventDefault();
        setCreating(true);
        const result = await addGift(newGift.name, newGift.description, newGift.rarity);
        setCreating(false);
        if (result.success) {
            setShowGiftForm(false);
            setNewGift({ name: '', description: '', rarity: 'common' });
        } else {
            alert('Ошибка: ' + result.error);
        }
    };

    return (
        <div className="space-y-4">

            {/* Sub-Tab Navigation */}
            <div className="flex p-2 bg-[#EAE5D5] rounded-2xl border border-[#E3D7B6] shadow-sm shrink-0">
                <button
                    onClick={() => setSubTab('quests')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${subTab === 'quests'
                        ? 'bg-[#8E7C68] text-white shadow-md'
                        : 'text-[#8E7C68] hover:bg-white/50'
                        }`}
                >
                    <Shield size={16} /> Задания
                </button>
                <button
                    onClick={() => setSubTab('gifts')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${subTab === 'gifts'
                        ? 'bg-[#8E7C68] text-white shadow-md'
                        : 'text-[#8E7C68] hover:bg-white/50'
                        }`}
                >
                    <Gift size={16} /> Подарки
                </button>
            </div>

            {subTab === 'quests' ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Header with create button */}
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[#8E7C68] text-sm font-bold uppercase tracking-widest px-1 flex items-center gap-1.5">
                            <Shield size={14} /> Выданные задания
                        </h3>
                        <button
                            onClick={() => setShowCreateForm(!showCreateForm)}
                            className="text-sm font-bold bg-[#8E7C68] text-white px-4 py-2 rounded-xl flex items-center gap-1.5 hover:bg-[#7a6b5a] transition-all active:scale-95 shadow-sm"
                        >
                            <Plus size={14} />
                            {showCreateForm ? 'Отмена' : 'Новое задание'}
                        </button>
                    </div>

                    {/* Create form */}
                    {showCreateForm && (
                        <form onSubmit={handleCreateQuest} className="bg-[#FDFBF7] p-6 rounded-xl border-2 border-[#E3D7B6] space-y-4 shadow-md overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="space-y-1">
                                <label className="text-xs text-[#8E7C68] font-bold uppercase text-opacity-80">Заголовок *</label>
                                <input
                                    className="w-full bg-white px-3 py-2 rounded-lg text-sm text-[#4A4238] placeholder-gray-400 border border-[#E3D7B6] focus:ring-1 focus:ring-[#8E7C68] focus:outline-none transition-all"
                                    placeholder="Название задания"
                                    value={newQuest.title}
                                    onChange={e => setNewQuest({ ...newQuest, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-[#8E7C68] font-bold uppercase text-opacity-80">Описание</label>
                                <textarea
                                    className="w-full bg-white px-3 py-2 rounded-lg text-sm text-[#4A4238] placeholder-gray-400 border border-[#E3D7B6] focus:ring-1 focus:ring-[#8E7C68] focus:outline-none resize-none h-20 transition-all"
                                    placeholder="Описание (опционально)"
                                    value={newQuest.description}
                                    onChange={e => setNewQuest({ ...newQuest, description: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="text-sm text-[#8E7C68] font-bold whitespace-nowrap">Награда:</label>
                                <div className="flex items-center gap-2 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-200">
                                    <Star size={18} className="text-yellow-500 fill-yellow-500" />
                                    <input
                                        type="number"
                                        className="w-20 bg-transparent text-sm text-yellow-700 font-bold focus:outline-none"
                                        value={newQuest.reward}
                                        onChange={e => setNewQuest({ ...newQuest, reward: parseInt(e.target.value) || 0 })}
                                        min="0"
                                        max="9999"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-[#8E7C68] font-bold uppercase text-opacity-80">Тип задания:</label>
                                <div className="flex gap-2 flex-wrap">
                                    {[{ id: 'one-time', label: 'Разовый' }, { id: 'repeatable', label: 'Повторяемый' }, { id: 'together', label: 'Для двоих' }].map(t => (
                                        <button
                                            key={t.id} type="button"
                                            onClick={() => setNewQuest({ ...newQuest, type: t.id })}
                                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${newQuest.type === t.id ? 'bg-[#8E7C68] text-white border-[#8E7C68] shadow-sm' : 'bg-white text-[#8E7C68] border-[#E3D7B6] hover:border-[#8E7C68]'}`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Schedule section */}
                            <div className="space-y-2">
                                <label className="text-xs text-[#8E7C68] font-bold uppercase text-opacity-80">Расписание:</label>
                                <PremiumLock feature="Расписание квестов" compact>
                                    <button
                                        type="button"
                                        onClick={() => setShowSchedulePicker(true)}
                                        className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-[#E3D7B6] rounded-lg text-sm text-[#8E7C68] hover:border-[#8E7C68] transition-all"
                                    >
                                        <Clock size={15} className="shrink-0" />
                                        <span className="font-medium">{scheduleLabel(newQuest.scheduleDays)}</span>
                                        <span className="ml-auto text-xs text-[#8E7C68]/50">Изменить</span>
                                    </button>
                                </PremiumLock>
                                {!isPremium && (
                                    <p className="text-xs text-[#8E7C68]/60 text-center">
                                        Бесплатный план: расписание фиксировано как «Каждый день»
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit" disabled={creating || !newQuest.title.trim()}
                                className="w-full bg-[#8E7C68] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#7a6b5a] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[.98] shadow-md"
                            >
                                {creating ? 'Создаётся...' : 'Выдать задание'}
                            </button>
                        </form>
                    )}

                    {/* Quest List */}
                    <div className="space-y-2">
                        {questsLoading ? (
                            <div className="flex justify-center py-6">
                                <div className="animate-spin w-6 h-6 border-3 border-[#8E7C68] border-t-transparent rounded-full" />
                            </div>
                        ) : questsByMe.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-sm bg-white/50 rounded-xl border border-dashed border-[#E3D7B6]">
                                Вы ещё не давали заданий
                            </div>
                        ) : (
                            questsByMe.map(q => (
                                <div key={q.id} className="relative bg-white rounded-xl border border-[#E3D7B6] p-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                                <span className="font-bold text-lg text-orange-900 truncate shrink-0">{q.title}</span>
                                                <StatusBadge status={q.status} />
                                            </div>
                                            {q.description && <p className="text-sm text-gray-600 leading-snug font-normal mb-3">{q.description}</p>}
                                            <div className="flex items-center gap-1.5 mt-auto">
                                                <div className="flex items-center gap-1.5 bg-yellow-50 px-2.5 py-1 rounded-lg border border-yellow-200">
                                                    <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                                    <span className="text-sm text-yellow-700 font-bold">{q.reward_primogems}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            {q.status === 'active' && (
                                                <button onClick={() => { setQuestToDelete(q); setShowDeleteConfirm(true); }} className="absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"><X size={16} /></button>
                                            )}
                                            {q.status === 'completed' && (
                                                <button onClick={() => verifyQuest(q.id)} className="flex items-center gap-1.5 text-sm font-bold bg-[#8E7C68] text-white px-4 py-2 rounded-full hover:bg-[#7a6b5a] transition-all shadow-sm active:scale-95"><Shield size={16} /> Подтвердить</button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Header for Gifts */}
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[#8E7C68] text-sm font-bold uppercase tracking-widest px-1 flex items-center gap-1.5">
                            <Award size={14} /> Настройка подарков
                        </h3>
                        <button
                            onClick={() => setShowGiftForm(!showGiftForm)}
                            className="text-sm font-bold bg-[#8E7C68] text-white px-4 py-2 rounded-xl flex items-center gap-1.5 hover:bg-[#7a6b5a] transition-all active:scale-95 shadow-sm"
                        >
                            <Plus size={14} />
                            {showGiftForm ? 'Отмена' : 'Добавить подарок'}
                        </button>
                    </div>

                    {/* Create Gift form */}
                    {showGiftForm && (
                        <form onSubmit={handleAddGift} className="bg-[#FDFBF7] p-6 rounded-xl border-2 border-[#E3D7B6] space-y-4 shadow-md animate-in fade-in zoom-in duration-200">
                            <div className="space-y-1">
                                <label className="text-xs text-[#8E7C68] font-bold uppercase text-opacity-80">Название *</label>
                                <input
                                    className="w-full bg-white px-3 py-2 rounded-lg text-sm text-[#4A4238] placeholder-gray-400 border border-[#E3D7B6] focus:ring-1 focus:ring-[#8E7C68] focus:outline-none transition-all"
                                    placeholder="Напр. Вкусный ужин или Киновечер"
                                    value={newGift.name}
                                    onChange={e => setNewGift({ ...newGift, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-[#8E7C68] font-bold uppercase text-opacity-80">Описание</label>
                                <textarea
                                    className="w-full bg-white px-3 py-2 rounded-lg text-sm text-[#4A4238] placeholder-gray-400 border border-[#E3D7B6] focus:ring-1 focus:ring-[#8E7C68] focus:outline-none resize-none h-16 transition-all"
                                    placeholder="Детали подарка..."
                                    value={newGift.description}
                                    onChange={e => setNewGift({ ...newGift, description: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-[#8E7C68] font-bold uppercase text-opacity-80">Редкость в Гаче:</label>
                                <div className="flex gap-2">
                                    {[
                                        { id: 'common', label: 'Обычный', color: 'bg-blue-600', borderColor: 'border-blue-200' },
                                        { id: 'epic', label: 'Эпический', color: 'bg-purple-600', borderColor: 'border-purple-200' },
                                        { id: 'legendary', label: 'Легендарный', color: 'bg-orange-600', borderColor: 'border-orange-200' }
                                    ].map(r => (
                                        <button
                                            key={r.id} type="button"
                                            onClick={() => setNewGift({ ...newGift, rarity: r.id })}
                                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${newGift.rarity === r.id ? `${r.color} text-white ${r.borderColor} shadow-md` : 'bg-white text-gray-400 border-[#E3D7B6] hover:border-gray-300'}`}
                                        >
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button
                                type="submit" disabled={creating || !newGift.name.trim()}
                                className="w-full bg-[#8E7C68] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#7a6b5a] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[.98] shadow-md"
                            >
                                {creating ? 'Сохранение...' : 'Сохранить подарок'}
                            </button>
                        </form>
                    )}

                    {/* Gifts List */}
                    <div className="space-y-2">
                        {giftsLoading ? (
                            <div className="flex justify-center py-6">
                                <div className="animate-spin w-6 h-6 border-3 border-[#8E7C68] border-t-transparent rounded-full" />
                            </div>
                        ) : gifts.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-sm bg-white/50 rounded-xl border border-dashed border-[#E3D7B6]">
                                Список подарков пуст. Добавьте свои награды для этого партнера!
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2.5">
                                <div className="flex items-center gap-2.5 mb-1 p-3 bg-yellow-50 rounded-xl border border-yellow-200 italic text-sm text-yellow-800 leading-snug shadow-sm">
                                    <Award size={20} className="shrink-0 text-yellow-600" />
                                    <span>Рекомендуем добавить <b>6 обычных</b>, <b>3 эпических</b> и <b>1 легендарный</b> подарок для идеального баланса Гачи.</span>
                                </div>
                                {gifts.map(g => {
                                    const rarityStyles = {
                                        common: 'border-l-blue-400 bg-orange-50/50',
                                        epic: 'border-l-purple-400 bg-orange-50/50',
                                        legendary: 'border-l-orange-400 bg-orange-50/50'
                                    };
                                    const currentStyle = rarityStyles[g.rarity] || rarityStyles.common;

                                    return (
                                        <div key={g.id} className={`relative rounded-xl border border-[#E3D7B6] border-l-4 ${currentStyle} p-4 shadow-sm flex items-center justify-between gap-3 hover:shadow-md transition-shadow`}>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center mb-1">
                                                    <span className="font-bold text-lg text-orange-900 truncate">{g.name}</span>
                                                </div>
                                                {g.description && <p className="text-sm text-gray-600 leading-tight truncate">{g.description}</p>}
                                            </div>
                                            <button
                                                onClick={() => deleteGift(g.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                title="Удалить подарок"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Schedule Picker Modal (premium only) */}
            {showSchedulePicker && isPremium && (
                <SchedulePickerModal
                    questTitle={newQuest.title || 'Новое задание'}
                    initialDays={newQuest.scheduleDays}
                    onSave={(days) => setNewQuest(prev => ({ ...prev, scheduleDays: days }))}
                    onClose={() => setShowSchedulePicker(false)}
                />
            )}

            {/* Shared Delete Confirmation for Quests */}
            {showDeleteConfirm && questToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#FDFBF7] border-2 border-[#E3D7B6] rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-[#8E7C68] font-bold text-lg mb-2 text-center uppercase tracking-wider">Отозвать квест?</h3>
                        <p className="text-[#4A4238]/80 text-center mb-6 text-sm">«{questToDelete.title}» будет удалено у друга.</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-600 transition-colors font-bold text-sm shadow-sm">Отмена</button>
                            <button
                                onClick={async () => {
                                    setBusy(true);
                                    const result = await deleteQuest(questToDelete.id, questToDelete);
                                    setBusy(false);
                                    if (result && !result.success) alert('Ошибка: ' + result.error);
                                    else setShowDeleteConfirm(false);
                                }}
                                disabled={busy}
                                className="flex-1 py-3 rounded-xl bg-[#8E7C68] hover:bg-[#7a6b5a] text-white transition-all font-bold text-sm shadow-md active:scale-95 disabled:opacity-50"
                            >
                                Отозвать
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SharedQuestTab;

