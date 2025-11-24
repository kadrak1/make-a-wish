import React, { useState, useRef, useEffect } from 'react';
import { useGachaSystem } from './hooks/useGachaSystem';
import { useQuestSystem } from './hooks/useQuestSystem';
import VideoAnimation from './components/VideoAnimation';
import ResultCard from './components/ResultCard';
import Inventory from './components/Inventory';
import ProposalFinale from './components/ProposalFinale';
import SettingsModal from './components/SettingsModal';
import QuestJournal from './components/QuestJournal';
import LoginScreen from './components/LoginScreen';
import AdminPanel from './components/AdminPanel';
import CompensationModal from './components/CompensationModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './supabaseClient';
import { Sparkles, Volume2, VolumeX, Gem, Book, Star, Plus, Settings, LogOut, Shield } from 'lucide-react';
import bannerImage from './assets/images/banner.png';

function Game() {
  const { user, logout, loading: authLoading } = useAuth();
  const { pullItem, history, isFinished, currentPullIndex, totalPulls, nextItemRarity, loading: gachaLoading } = useGachaSystem();
  const {
    primogems,
    wishes,
    dailyQuests,
    mainQuest,
    mainQuestProgress,
    worldQuests,
    completedQuestIds,
    completeQuest,
    buyWish,
    spendWish,
    consumePrimosForWish,
    dailyProgress,
    claimDailyReward,
    compensationClaimed,
    claimCompensation,
    loading: questLoading
  } = useQuestSystem();

  const [isAnimating, setIsAnimating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);
  const [showProposal, setShowProposal] = useState(false);
  const [showCompensation, setShowCompensation] = useState(false);

  // Show compensation modal if not claimed
  useEffect(() => {
    if (!questLoading && !compensationClaimed) {
      const timer = setTimeout(() => {
        setShowCompensation(true);
      }, 1000); // Small delay for better UX
      return () => clearTimeout(timer);
    }
  }, [questLoading, compensationClaimed]);

  // UI State
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isQuestJournalOpen, setIsQuestJournalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const [volume, setVolume] = useState(() => {
    try {
      const saved = localStorage.getItem('maw_volume');
      const parsed = saved ? parseFloat(saved) : 0.5;
      return isNaN(parsed) ? 0.5 : parsed;
    } catch (e) {
      console.error("Failed to parse volume", e);
      return 0.5;
    }
  });

  const [isMuted, setIsMuted] = useState(() => {
    try {
      const saved = localStorage.getItem('maw_muted');
      return saved === 'true';
    } catch (e) {
      console.error("Failed to parse muted state", e);
      return false;
    }
  });

  // Persist sound settings
  useEffect(() => {
    try {
      localStorage.setItem('maw_volume', volume.toString());
    } catch (e) {
      console.error("Failed to save volume", e);
    }
  }, [volume]);

  useEffect(() => {
    try {
      localStorage.setItem('maw_muted', isMuted.toString());
    } catch (e) {
      console.error("Failed to save muted state", e);
    }
  }, [isMuted]);
  const videoRef = useRef(null);

  // Update video volume when settings change or animation state changes
  useEffect(() => {
    if (videoRef.current) {
      if (isAnimating || showResult) {
        videoRef.current.volume = 0;
      } else {
        videoRef.current.volume = isMuted ? 0 : volume;
      }
      // Attempt to play immediately
      videoRef.current.play().catch(error => {
        console.log("Autoplay prevented by browser:", error);
      });
    }
  }, [volume, isMuted, isAnimating, showResult]);

  const [isWishConfirmOpen, setIsWishConfirmOpen] = useState(false);

  const handleResetData = async () => {
    if (!confirm("Вы уверены? Это полностью сотрет ваш прогресс на сервере.")) return;

    try {
      // Reset Game State in Supabase
      await supabase
        .from('game_state')
        .update({
          primogems: 0,
          wishes: 0,
          pity_counter: 0,
          history: [],
          completed_quests: [],
          queue: [] // Will trigger re-rigging
        })
        .eq('user_id', user.id);

      // Reload page to reset state
      window.location.reload();
    } catch (error) {
      console.error("Error resetting data:", error);
      alert("Ошибка сброса данных");
    }
  };

  const handleWishClick = () => {
    if (isAnimating || showResult || showProposal) return;

    if (wishes === 0 && primogems < 160) {
      alert("Не хватает Молитв или Камней Истока! Выполняй задания, чтобы получить больше.");
      return;
    }

    setIsWishConfirmOpen(true);
  };

  const confirmWish = () => {
    setIsWishConfirmOpen(false);

    if (wishes > 0) {
      spendWish();
      setIsAnimating(true);
    } else if (consumePrimosForWish()) {
      // If no wishes but enough primos, auto-convert and wish
      setIsAnimating(true);
    }
  };

  const handleAnimationComplete = async () => {
    setIsAnimating(false);
    const item = await pullItem(); // pullItem is now async

    if (item) {
      setCurrentResult(item);
      setShowResult(true);
    }
  };

  const handleDismissResult = () => {
    setShowResult(false);
    setCurrentResult(null);

    if (currentResult && currentResult.rarity === 'legendary') {
      setShowProposal(true);
    }
  };

  // Background style (Genshin-ish sky)
  const bgStyle = "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#1a1b26] to-black";

  const handleInteraction = () => {
    if (videoRef.current && videoRef.current.paused) {
      videoRef.current.play().catch(e => console.log("Play failed", e));
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <Sparkles className="w-12 h-12 text-[#E3D7B6] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (gachaLoading || questLoading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <Sparkles className="w-12 h-12 text-[#E3D7B6] animate-spin" />
      </div>
    );
  }

  return (
    <div
      onClick={handleInteraction}
      className={`relative min-h-screen w-full overflow-hidden text-white font-sans selection:bg-pink-500/30`}
    >

      {/* Inventory Sidebar */}
      <Inventory
        items={history}
        isOpen={isInventoryOpen}
        onToggle={() => setIsInventoryOpen(!isInventoryOpen)}
      />

      {/* Quest Journal Modal */}
      <QuestJournal
        isOpen={isQuestJournalOpen}
        onClose={() => setIsQuestJournalOpen(false)}
        dailyQuests={dailyQuests}
        mainQuest={mainQuest}
        mainQuestProgress={mainQuestProgress}
        worldQuests={worldQuests}
        completedQuestIds={completedQuestIds}
        onCompleteQuest={completeQuest}
        dailyProgress={dailyProgress}
        onClaimDailyReward={claimDailyReward}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        volume={volume}
        setVolume={setVolume}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        onResetData={handleResetData}
      />

      {/* Admin Panel */}
      {user.role === 'admin' && (
        <AdminPanel
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
        />
      )}

      {/* Compensation Modal */}
      <CompensationModal
        isOpen={showCompensation}
        onClose={() => setShowCompensation(false)}
        onClaim={() => {
          claimCompensation();
          setShowCompensation(false);
        }}
      />

      {/* Wish Confirmation Modal */}
      {isWishConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#F4F4F5] w-full max-w-sm md:max-w-md rounded-xl border-2 border-[#E3D7B6] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-[#E3D7B6] px-4 py-3 md:px-6 flex items-center justify-between">
              <h2 className="text-[#8E7C68] font-bold text-base md:text-lg uppercase tracking-wider flex items-center gap-2">
                <Star size={18} className="md:w-5 md:h-5 fill-[#8E7C68]" />
                Подтверждение
              </h2>
            </div>

            <div className="p-4 md:p-6 text-center">
              <p className="text-[#8E7C68] text-base md:text-lg mb-6 font-medium">
                Потратить 1 Молитву?
              </p>

              <div className="flex justify-center gap-3 md:gap-4">
                <button
                  onClick={() => setIsWishConfirmOpen(false)}
                  className="px-4 md:px-6 py-2 rounded-full border-2 border-[#E3D7B6] text-[#8E7C68] font-bold text-sm md:text-base hover:bg-[#E3D7B6]/10 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={confirmWish}
                  className="px-4 md:px-6 py-2 rounded-full bg-[#E3D7B6] text-white font-bold text-sm md:text-base hover:bg-[#d4c4a0] transition-colors shadow-md"
                >
                  Молиться
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`relative z-10 flex flex-col items-center justify-center min-h-screen p-4 transition-all duration-500 ${isInventoryOpen ? 'md:pl-64' : ''}`}>

        {/* Top Bar: Resources & Counter */}
        <div className="absolute top-4 right-4 md:top-8 md:right-8 flex flex-col items-end gap-2 z-50">

          {/* User Info & Logout */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[#E3D7B6] font-bold text-sm shadow-black drop-shadow-md">{user.nickname}</span>
            <button onClick={logout} className="p-1 bg-red-500/20 rounded-full hover:bg-red-500/40 transition-colors" title="Выйти">
              <LogOut size={14} className="text-red-300" />
            </button>
          </div>

          {/* Primogems */}
          <div className="flex items-center gap-2 md:gap-3 bg-[#F4F4F5] px-3 py-1 md:px-4 md:py-1.5 rounded-full border-2 border-[#E3D7B6] shadow-lg shadow-black/20">
            <Gem size={16} className="md:w-[18px] md:h-[18px] text-cyan-400 fill-cyan-400 drop-shadow-md" />
            <span className="font-bold text-[#8E7C68] text-xs md:text-sm">{primogems}</span>
          </div>

          {/* Wishes */}
          <div className="flex items-center gap-2 md:gap-3 bg-[#F4F4F5] px-3 py-1 md:px-4 md:py-1.5 rounded-full border-2 border-[#E3D7B6] shadow-lg shadow-black/20">
            <Star size={16} className="md:w-[18px] md:h-[18px] text-pink-400 fill-pink-400 drop-shadow-md" />
            <span className="font-bold text-[#8E7C68] text-xs md:text-sm">{wishes}</span>
            <button
              onClick={buyWish}
              className="ml-1 md:ml-2 p-0.5 bg-[#E3D7B6] rounded-full text-white hover:bg-[#d4c4a0] active:scale-95 transition-all"
              title="Обменять 160 Камней Истока на 1 Молитву"
            >
              <Plus size={10} className="md:w-[12px] md:h-[12px]" />
            </button>
          </div>

          {/* Pity Counter */}
          <div className="flex items-center gap-2 md:gap-3 bg-black/40 px-3 py-1 md:px-4 md:py-1 rounded-full border border-white/10 backdrop-blur-sm mt-1 md:mt-2">
            <span className="text-[10px] md:text-xs text-gray-300 uppercase tracking-wider">Гарант</span>
            <span className="font-bold text-white text-xs md:text-sm">
              {currentPullIndex} / {totalPulls}
            </span>
          </div>
        </div>

        {/* Quest Journal Button */}
        <div className="absolute top-4 left-4 md:top-8 md:left-8 z-40 flex gap-2 md:gap-4">
          <button
            onClick={() => setIsQuestJournalOpen(true)}
            className="group relative p-2 md:p-3 bg-[#F4F4F5] rounded-full border-2 border-[#E3D7B6] shadow-lg shadow-black/20 hover:scale-110 transition-all duration-300"
            title="Журнал заданий"
          >
            <Book size={20} className="md:w-[24px] md:h-[24px] text-[#8E7C68]" />
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="group relative p-2 md:p-3 bg-[#F4F4F5] rounded-full border-2 border-[#E3D7B6] shadow-lg shadow-black/20 hover:scale-110 transition-all duration-300"
            title="Настройки"
          >
            <Settings size={20} className="md:w-[24px] md:h-[24px] text-[#8E7C68]" />
          </button>

          {/* Admin Button */}
          {user.role === 'admin' && (
            <button
              onClick={() => setIsAdminOpen(true)}
              className="group relative p-2 md:p-3 bg-[#1a1a2e] rounded-full border-2 border-[#E3D7B6] shadow-lg shadow-black/20 hover:scale-110 transition-all duration-300"
              title="Админ панель"
            >
              <Shield size={20} className="md:w-[24px] md:h-[24px] text-[#E3D7B6]" />
            </button>
          )}
        </div>

        {/* Banner & Wish Button Container */}
        {!showProposal && !isAnimating && !showResult && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-full max-w-[1362px] aspect-[2.4/1] px-4 md:px-0 group transition-all duration-500">

            {/* Banner Image (Clickable) */}
            <div
              onClick={handleWishClick}
              className="w-full h-full border-2 border-[#E3D7B6]/50 rounded-xl overflow-hidden shadow-2xl shadow-black/50 flex items-center justify-center bg-black/20 backdrop-blur-sm group-hover:border-[#E3D7B6] transition-all duration-500 cursor-pointer active:scale-[0.99]"
            >
              <img
                src={bannerImage}
                alt="Event Banner"
                className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity duration-500"
              />
            </div>

            {/* Wish Button (Positioned relative to banner) */}
            <div className="absolute -bottom-4 -right-0 md:-bottom-6 md:-right-6 z-20 scale-75 md:scale-100 origin-bottom-right pr-4 md:pr-0">
              <button
                onClick={handleWishClick}
                disabled={wishes === 0 && primogems < 160}
                className={`group/btn relative px-12 py-3 rounded-full border-[3px] border-[#E3D7B6] transition-all duration-300 shadow-xl shadow-black/40 flex items-center gap-3 ${wishes > 0 || primogems >= 160
                  ? 'bg-[#F4F4F5] hover:scale-105 hover:-translate-y-1 cursor-pointer'
                  : 'bg-gray-200 grayscale cursor-not-allowed opacity-80'
                  }`}
              >
                <div className="flex flex-col items-center leading-none">
                  <span className="text-[#8E7C68] font-bold text-xl tracking-widest mb-0.5">МОЛИТВА x1</span>
                  <div className="flex items-center gap-1">
                    <Star size={14} className="text-pink-400 fill-pink-400" />
                    <span className="text-[#8E7C68] font-bold text-xs">x 1</span>
                  </div>
                </div>

                {/* Decorative side elements */}
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[#E3D7B6]">
                  <Sparkles size={10} />
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[#E3D7B6]">
                  <Sparkles size={10} />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Video Animation (Always rendered for preloading) */}
        <VideoAnimation
          rarity={nextItemRarity}
          onComplete={handleAnimationComplete}
          volume={volume}
          isMuted={isMuted}
          isActive={isAnimating}
        />

        {/* Result Card */}
        {showResult && (
          <ResultCard
            item={currentResult}
            onDismiss={handleDismissResult}
          />
        )}

        {/* Proposal Finale */}
        {showProposal && (
          <ProposalFinale
            onAccept={() => alert("Она сказала ДА! Поздравляем! ❤️")}
          />
        )}

      </div>

      {/* Background Video (Always mounted to prevent reloading delay) */}
      <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${isAnimating || showResult || showProposal ? 'opacity-0' : 'opacity-100'}`}>
        <video
          ref={videoRef}
          autoPlay
          loop
          playsInline
          className="w-full h-full object-cover"
          src={`${import.meta.env.BASE_URL}videos/background.mp4`}
          onLoadedMetadata={(e) => {
            e.target.volume = isMuted ? 0 : volume;
          }}
        >
          Your browser does not support the video tag.
        </video>
      </div>


    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Game />
    </AuthProvider>
  );
}

export default App;
