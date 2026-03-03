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
import FriendsModal from './components/FriendsModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FriendProvider, useFriendContext } from './context/FriendContext';
import { supabase } from './supabaseClient';
import { Sparkles, Volume2, VolumeX, Star, Book, Plus, Settings, LogOut, Shield, Gift, Users, Briefcase } from 'lucide-react';
import bannerImage from './assets/images/banner.png';

function Game() {
  const { user, logout, loading: authLoading } = useAuth();
  const { selectedFriendId, activeConnection, isGlobalContext } = useFriendContext();

  const {
    pullItem,
    history,
    isFinished,
    hasPartnerGifts,
    currentPullIndex,
    totalPulls,
    nextItemRarity,
    nextItem,
    loading: gachaLoading
  } = useGachaSystem();

  const {
    universalPrimogems,
    coloredPrimogems,
    totalPrimogems,
    wishes,
    wishCost,
    dailyQuests,
    mainQuest,
    mainQuestProgress,
    worldQuests,
    completedQuestIds,
    completeQuest,
    deleteSystemQuest,
    completeWorldQuest,
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

  useEffect(() => {
    if (!questLoading && !compensationClaimed) {
      const timer = setTimeout(() => setShowCompensation(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [questLoading, compensationClaimed]);

  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isQuestJournalOpen, setIsQuestJournalOpen] = useState(false);
  const [questJournalTab, setQuestJournalTab] = useState('all');
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const [volume, setVolume] = useState(() => {
    try {
      const saved = localStorage.getItem('maw_volume');
      const parsed = saved ? parseFloat(saved) : 0.5;
      return isNaN(parsed) ? 0.5 : parsed;
    } catch { return 0.5; }
  });

  const [isMuted, setIsMuted] = useState(() => {
    try { return localStorage.getItem('maw_muted') === 'true'; }
    catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem('maw_volume', volume.toString()); } catch {}
  }, [volume]);

  useEffect(() => {
    try { localStorage.setItem('maw_muted', isMuted.toString()); } catch {}
  }, [isMuted]);

  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      if (isAnimating || showResult) {
        videoRef.current.pause();
      } else {
        videoRef.current.volume = isMuted ? 0 : volume;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [volume, isMuted, isAnimating, showResult]);

  const [isWishConfirmOpen, setIsWishConfirmOpen] = useState(false);

  const handleResetData = async () => {
    if (!confirm("Вы уверены? Это полностью сотрет ваш прогресс на сервере.")) return;
    try {
      await supabase
        .from('game_state')
        .update({
          universal_primogems: 0,
          wishes: 0,
          xp: 0,
          pity_counter: 0,
          history: [],
          completed_quests: [],
          queue: []
        })
        .eq('user_id', user.id);
      window.location.reload();
    } catch (error) {
      console.error("Error resetting data:", error);
      alert("Ошибка сброса данных");
    }
  };

  // Баннер доступен только если выбран друг И у него есть подарки
  const isBannerAvailable = !isGlobalContext && activeConnection && hasPartnerGifts;
  const canAffordWish = wishes > 0 || totalPrimogems >= wishCost;

  const handleWishClick = () => {
    if (isAnimating || showResult || showProposal) return;

    if (!isBannerAvailable) {
      if (isGlobalContext) {
        alert("Выбери друга, чтобы открыть баннер!");
      } else {
        alert("У партнёра пока нет подарков в баннере!");
      }
      return;
    }

    if (!canAffordWish) {
      alert("Не хватает Камней Истока! Выполняй задания, чтобы получить больше.");
      return;
    }

    setIsWishConfirmOpen(true);
  };

  const confirmWish = async () => {
    setIsWishConfirmOpen(false);

    if (nextItem) {
      if (nextItem.image) {
        const img = new Image();
        img.src = nextItem.image;
      }
      const audio = new Audio(import.meta.env.BASE_URL + 'sounds/reveal.m4a');
      audio.load();
    }

    if (wishes > 0) {
      spendWish();
      setIsAnimating(true);
    } else if (await consumePrimosForWish()) {
      setIsAnimating(true);
    }
  };

  const handleAnimationComplete = async () => {
    setIsAnimating(false);
    const item = await pullItem();

    if (item) {
      setCurrentResult(item);
      setShowResult(true);

      if (!isMuted) {
        try {
          const audio = new Audio(import.meta.env.BASE_URL + 'sounds/reveal.m4a');
          audio.volume = Math.min(1.0, volume * 2.5);
          audio.play().catch(e => console.error("Error playing sound:", e));
        } catch {}
      }
    }

    if (isFinished) {
      setTimeout(() => {
        setShowResult(false);
        setShowProposal(true);
      }, 2000);
    }
  };

  const handleDismissResult = () => {
    setShowResult(false);
    setCurrentResult(null);
    if (currentResult && currentResult.rarity === 'legendary' && !showProposal) {
      setShowProposal(true);
    }
  };

  const handleInteraction = () => {
    if (videoRef.current && videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <Sparkles className="w-12 h-12 text-[#E3D7B6] animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginScreen />;

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
      className="relative min-h-screen w-full overflow-hidden text-white font-sans selection:bg-pink-500/30"
    >

      {/* Inventory Sidebar */}
      <Inventory
        items={history}
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
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
        onDeleteQuest={deleteSystemQuest}
        onCompleteWorldQuest={completeWorldQuest}
        dailyProgress={dailyProgress}
        onClaimDailyReward={claimDailyReward}
        initialTab={questJournalTab}
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

      {/* Friends Modal */}
      <FriendsModal
        isOpen={isFriendsOpen}
        onClose={() => setIsFriendsOpen(false)}
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
              <p className="text-[#8E7C68] text-base md:text-lg mb-2 font-medium">
                Потратить {wishes > 0 ? "1 Молитву" : `${wishCost} Камней Истока`}?
              </p>
              {wishes === 0 && coloredPrimogems > 0 && (
                <p className="text-[#8E7C68] text-xs mb-4 opacity-70">
                  {Math.min(coloredPrimogems, wishCost)} цветных + {Math.max(0, wishCost - coloredPrimogems)} белых
                </p>
              )}

              <div className="flex justify-center gap-3 md:gap-4 mt-4">
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
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 transition-all duration-500">

        {/* Top Bar: Resources & Counter */}
        <div className="absolute top-2 right-4 md:top-4 md:right-8 flex flex-col items-end gap-1 z-50">

          {/* User Info & Logout */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[#E3D7B6] font-bold text-sm shadow-black drop-shadow-md">
              {activeConnection ? `Пара: ${activeConnection.partnerNickname}` : user.nickname}
            </span>
            <button onClick={logout} className="p-1 bg-red-500/20 rounded-full hover:bg-red-500/40 transition-colors" title="Выйти">
              <LogOut size={14} className="text-red-300" />
            </button>
          </div>

          {/* Универсальные примогемы (белые) */}
          <div className="flex items-center gap-2 md:gap-3 bg-[#F4F4F5] px-3 py-1 md:px-4 md:py-1.5 rounded-full border-2 border-[#E3D7B6] shadow-lg shadow-black/20" title="Универсальные примогемы">
            <Star size={16} className="md:w-[18px] md:h-[18px] text-cyan-200 fill-cyan-200 drop-shadow-md" />
            <span className="font-bold text-[#8E7C68] text-xs md:text-sm">{universalPrimogems}</span>
          </div>

          {/* Цветные примогемы (только в контексте друга) */}
          {activeConnection && (
            <div
              className="flex items-center gap-2 md:gap-3 bg-[#F4F4F5] px-3 py-1 md:px-4 md:py-1 rounded-full border-2 shadow-lg shadow-black/20 mt-0.5"
              style={{ borderColor: activeConnection.connectionColor || '#22d3ee' }}
              title={`Цветные примогемы (${activeConnection.partnerNickname})`}
            >
              <Star
                size={16}
                className="md:w-[18px] md:h-[18px] drop-shadow-md"
                style={{
                  color: activeConnection.connectionColor || '#22d3ee',
                  fill: activeConnection.connectionColor || '#22d3ee'
                }}
              />
              <span className="font-bold text-[#8E7C68] text-xs md:text-sm">{coloredPrimogems}</span>
            </div>
          )}

          {/* Гарант */}
          <div className="flex items-center gap-2 md:gap-3 bg-black/40 px-3 py-1 md:px-4 md:py-1 rounded-full border border-white/10 backdrop-blur-sm mt-1 md:mt-2">
            <span className="text-[10px] md:text-xs text-gray-300 uppercase tracking-wider">Гарант</span>
            <span className="font-bold text-white text-xs md:text-sm">
              {currentPullIndex} / {totalPulls}
            </span>
          </div>

          {/* Подарки партнёра */}
          {activeConnection && (
            <div className="flex items-center gap-2 md:gap-3 bg-pink-500/20 px-3 py-1 md:px-4 md:py-1 rounded-full border border-pink-500/30 backdrop-blur-sm mt-1">
              <span className="text-[10px] md:text-xs text-pink-200 uppercase tracking-wider">Подарки</span>
              <div className="flex items-center gap-1">
                <Gift size={12} className="text-pink-400" />
                <span className="font-bold text-white text-xs md:text-sm">{activeConnection.gifts || 0}</span>
              </div>
            </div>
          )}
        </div>

        {/* Кнопки слева */}
        <div className="absolute top-2 left-4 md:top-4 md:left-8 z-40 flex gap-2 md:gap-4">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="group relative p-2 md:p-3 bg-[#F4F4F5] rounded-full border-2 border-[#E3D7B6] shadow-lg shadow-black/20 hover:scale-110 transition-all duration-300"
            title="Настройки"
          >
            <Settings size={20} className="md:w-[24px] md:h-[24px] text-[#8E7C68]" />
          </button>

          <button
            onClick={() => setIsFriendsOpen(true)}
            className="group relative p-2 md:p-3 bg-[#F4F4F5] rounded-full border-2 border-[#E3D7B6] shadow-lg shadow-black/20 hover:scale-110 transition-all duration-300"
            title="Друзья"
          >
            <Users size={20} className="md:w-[24px] md:h-[24px] text-[#8E7C68]" />
          </button>

          <button
            onClick={() => setIsInventoryOpen(true)}
            className="group relative p-2 md:p-3 bg-[#F4F4F5] rounded-full border-2 border-[#E3D7B6] shadow-lg shadow-black/20 hover:scale-110 transition-all duration-300"
            title="Инвентарь"
          >
            <Briefcase size={20} className="md:w-[24px] md:h-[24px] text-[#8E7C68]" />
          </button>

          <button
            onClick={() => { setQuestJournalTab('all'); setIsQuestJournalOpen(true); }}
            className="group relative p-2 md:p-3 bg-[#F4F4F5] rounded-full border-2 border-[#E3D7B6] shadow-lg shadow-black/20 hover:scale-110 transition-all duration-300"
            title="Журнал заданий"
          >
            <Book size={20} className="md:w-[24px] md:h-[24px] text-[#8E7C68]" />
          </button>

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

        {/* Баннер и кнопка молитвы */}
        {!showProposal && !isAnimating && !showResult && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1362px] aspect-[2.4/1] px-4 md:px-0 group transition-all duration-500">

            {isBannerAvailable ? (
              <>
                {/* Баннер партнёра */}
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

                {/* Кнопка молитвы */}
                <div className="absolute -bottom-4 -right-0 md:-bottom-6 md:-right-6 z-20 scale-75 md:scale-100 origin-bottom-right pr-4 md:pr-0">
                  <button
                    onClick={handleWishClick}
                    disabled={!canAffordWish}
                    className={`group/btn relative px-12 py-3 rounded-full border-[3px] border-[#E3D7B6] transition-all duration-300 shadow-xl shadow-black/40 flex items-center gap-3 ${
                      canAffordWish
                        ? 'bg-[#F4F4F5] hover:scale-105 hover:-translate-y-1 cursor-pointer'
                        : 'bg-gray-200 grayscale cursor-not-allowed opacity-80'
                    }`}
                  >
                    <div className="flex flex-col items-center leading-none">
                      <span className="text-[#8E7C68] font-bold text-xl tracking-widest mb-0.5">МОЛИТВА</span>
                      <div className="flex items-center gap-1">
                        <Star size={14} className="text-cyan-400 fill-cyan-400" />
                        <span className="text-[#8E7C68] font-bold text-xs">x {wishCost}</span>
                      </div>
                    </div>
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[#E3D7B6]">
                      <Sparkles size={10} />
                    </div>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[#E3D7B6]">
                      <Sparkles size={10} />
                    </div>
                  </button>
                </div>
              </>
            ) : (
              /* Нет баннера — подсказка */
              <div className="w-full h-full border-2 border-[#E3D7B6]/20 rounded-xl flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm gap-4">
                {isGlobalContext ? (
                  <>
                    <Users size={48} className="text-[#E3D7B6]/40" />
                    <p className="text-[#E3D7B6]/60 text-lg font-medium text-center px-8">
                      Выбери друга, чтобы открыть баннер
                    </p>
                    <button
                      onClick={() => setIsFriendsOpen(true)}
                      className="px-6 py-2 rounded-full bg-[#E3D7B6]/20 border border-[#E3D7B6]/40 text-[#E3D7B6] text-sm hover:bg-[#E3D7B6]/30 transition-colors"
                    >
                      Открыть список друзей
                    </button>
                  </>
                ) : (
                  <>
                    <Gift size={48} className="text-[#E3D7B6]/40" />
                    <p className="text-[#E3D7B6]/60 text-lg font-medium text-center px-8">
                      У {activeConnection?.partnerNickname || 'партнёра'} пока нет подарков в баннере
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Анимация гачи */}
        <VideoAnimation
          rarity={nextItemRarity}
          onComplete={handleAnimationComplete}
          volume={volume}
          isMuted={isMuted}
          isActive={isAnimating}
        />

        {/* Карточка результата */}
        {showResult && (
          <ResultCard
            item={currentResult}
            onDismiss={handleDismissResult}
          />
        )}

        {/* Финал предложения */}
        {showProposal && (
          <ProposalFinale
            onAccept={() => alert("Она сказала ДА! Поздравляем! ❤️")}
          />
        )}

      </div>

      {/* Фоновое видео */}
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
      <FriendProvider>
        <Game />
      </FriendProvider>
    </AuthProvider>
  );
}

export default App;
