import React, { useState } from 'react';
import { Star, Coins, Sparkles, CheckCircle2, Lock, X } from 'lucide-react';
import { useQuestSystem } from '../hooks/useQuestSystem';

// ─── Reward badge ─────────────────────────────────────────────
const RewardBadge = ({ type, amount }) => {
    if (type === 'primogems') {
        return (
            <span className="flex items-center gap-1 text-xs font-bold text-white/80">
                <Coins size={12} /> +{amount}
            </span>
        );
    }
    if (type === 'wish') {
        return (
            <span className="flex items-center gap-1 text-xs font-bold text-pink-300">
                <Sparkles size={12} /> ×{amount}
            </span>
        );
    }
    return null;
};

// ─── Claim modal ──────────────────────────────────────────────
const ClaimModal = ({ milestone, onClaim, onClose, claiming }) => (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-[#1a1b26] w-full max-w-xs rounded-2xl border border-[#E3D7B6]/30 overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-[#E3D7B6]/10 to-transparent px-5 py-4 flex items-center justify-between">
                <span className="text-[#E3D7B6] font-bold text-base">{milestone.icon} {milestone.title}</span>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                    <X size={18} />
                </button>
            </div>
            <div className="p-5 space-y-4">
                <p className="text-gray-300 text-sm text-center">
                    Вы достигли <span className="text-[#E3D7B6] font-bold">{milestone.xp_required} XP</span>!
                </p>
                <div className="flex justify-center">
                    {milestone.reward_type === 'primogems' && (
                        <div className="flex items-center gap-2 bg-[#E3D7B6]/10 px-4 py-3 rounded-xl border border-[#E3D7B6]/30">
                            <Coins size={20} className="text-[#E3D7B6]" />
                            <span className="text-[#E3D7B6] font-bold text-lg">+{milestone.reward_amount} Примогемов</span>
                        </div>
                    )}
                    {milestone.reward_type === 'wish' && (
                        <div className="flex items-center gap-2 bg-pink-500/10 px-4 py-3 rounded-xl border border-pink-500/30">
                            <Sparkles size={20} className="text-pink-400" />
                            <span className="text-pink-300 font-bold text-lg">×{milestone.reward_amount} Молитвы</span>
                        </div>
                    )}
                </div>
                <button
                    onClick={onClaim}
                    disabled={claiming}
                    className="w-full py-3 bg-gradient-to-r from-[#E3D7B6] to-[#d4c5a0] text-[#1a1a2e] rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    {claiming ? 'Получаем...' : 'Получить награду ✨'}
                </button>
            </div>
        </div>
    </div>
);

// ─── Main component ───────────────────────────────────────────
const ProgressPath = () => {
    const { xp, xpMilestonesClaimed, milestones, claimXpMilestone } = useQuestSystem();
    const [selectedMilestone, setSelectedMilestone] = useState(null);
    const [claiming, setClaiming] = useState(false);
    const [claimResult, setClaimResult] = useState(null);

    if (!milestones || milestones.length === 0) return null;

    const maxXp = milestones[milestones.length - 1].xp_required;
    const progressPct = Math.min((xp / maxXp) * 100, 100);

    const handleClaim = async () => {
        if (!selectedMilestone) return;
        setClaiming(true);
        const result = await claimXpMilestone(selectedMilestone.id);
        setClaiming(false);
        setClaimResult(result);
        if (result.success) {
            setTimeout(() => {
                setSelectedMilestone(null);
                setClaimResult(null);
            }, 1500);
        }
    };

    return (
        <div className="w-full px-4 py-5">
            {/* XP header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Star size={16} className="text-[#E3D7B6] fill-[#E3D7B6]" />
                    <span className="text-[#8E7C68] font-bold text-sm uppercase tracking-wider">Путь прогресса</span>
                </div>
                <span className="text-[#8E7C68] text-sm font-bold tabular-nums">{xp.toLocaleString()} XP</span>
            </div>

            {/* Progress bar */}
            <div className="relative h-3 bg-[#E3D7B6]/20 rounded-full mb-6 overflow-visible">
                <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#E3D7B6] to-[#d4c5a0] rounded-full transition-all duration-700"
                    style={{ width: `${progressPct}%` }}
                />

                {/* Milestone markers on the bar */}
                {milestones.map((ms) => {
                    const pct = Math.min((ms.xp_required / maxXp) * 100, 100);
                    const isClaimed = xpMilestonesClaimed.includes(ms.id);
                    const isReachable = xp >= ms.xp_required;
                    const canClaim = isReachable && !isClaimed;

                    return (
                        <button
                            key={ms.id}
                            onClick={() => canClaim && setSelectedMilestone(ms)}
                            title={`${ms.title} (${ms.xp_required} XP)`}
                            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 transition-all
                                ${isClaimed
                                    ? 'bg-[#E3D7B6] border-[#d4c5a0] scale-90'
                                    : canClaim
                                        ? 'bg-yellow-400 border-yellow-300 scale-110 cursor-pointer shadow-lg shadow-yellow-400/40 animate-pulse'
                                        : 'bg-[#1a1a2e] border-[#E3D7B6]/30 cursor-default'
                                }`}
                            style={{ left: `${pct}%` }}
                        >
                            {isClaimed && <CheckCircle2 size={10} className="text-[#1a1a2e] absolute inset-0 m-auto" />}
                            {!isReachable && <Lock size={8} className="text-[#E3D7B6]/40 absolute inset-0 m-auto" />}
                        </button>
                    );
                })}
            </div>

            {/* Milestone list */}
            <div className="grid grid-cols-1 gap-2">
                {milestones.map((ms) => {
                    const isClaimed = xpMilestonesClaimed.includes(ms.id);
                    const isReachable = xp >= ms.xp_required;
                    const canClaim = isReachable && !isClaimed;

                    return (
                        <button
                            key={ms.id}
                            onClick={() => canClaim && setSelectedMilestone(ms)}
                            disabled={!canClaim && !isClaimed}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left
                                ${isClaimed
                                    ? 'bg-[#E3D7B6]/10 border-[#E3D7B6]/30 opacity-60'
                                    : canClaim
                                        ? 'bg-yellow-400/10 border-yellow-400/40 cursor-pointer hover:bg-yellow-400/20 shadow-sm'
                                        : 'bg-white/5 border-white/10 opacity-40 cursor-not-allowed'
                                }`}
                        >
                            <span className="text-xl shrink-0">{ms.icon}</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold truncate ${isClaimed ? 'text-gray-400 line-through' : canClaim ? 'text-yellow-200' : 'text-gray-400'}`}>
                                        {ms.title}
                                    </span>
                                    {canClaim && (
                                        <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/30 shrink-0">
                                            Забрать!
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-gray-500">{ms.xp_required.toLocaleString()} XP</span>
                                    <span className="text-gray-600">·</span>
                                    <RewardBadge type={ms.reward_type} amount={ms.reward_amount} />
                                </div>
                            </div>
                            {isClaimed && <CheckCircle2 size={18} className="text-[#E3D7B6]/50 shrink-0" />}
                        </button>
                    );
                })}
            </div>

            {/* Claim modal */}
            {selectedMilestone && (
                <ClaimModal
                    milestone={selectedMilestone}
                    onClaim={handleClaim}
                    onClose={() => { setSelectedMilestone(null); setClaimResult(null); }}
                    claiming={claiming}
                />
            )}

            {/* Success toast */}
            {claimResult?.success && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[90] bg-[#1a1b26] border border-[#E3D7B6]/40 rounded-2xl px-5 py-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <p className="text-[#E3D7B6] font-bold text-sm text-center">
                        ✨ Получено: {claimResult.reward_type === 'primogems' ? `+${claimResult.reward_amount} примогемов` : `×${claimResult.reward_amount} молитвы`}
                    </p>
                </div>
            )}
        </div>
    );
};

export default ProgressPath;
