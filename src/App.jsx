import React, { useState, useRef, useEffect } from 'react';
import { useGachaSystem } from './hooks/useGachaSystem';
import VideoAnimation from './components/VideoAnimation';
import ResultCard from './components/ResultCard';
import Inventory from './components/Inventory';
import ProposalFinale from './components/ProposalFinale';
import { Sparkles, Volume2, VolumeX, Gem } from 'lucide-react';

function App() {
  const { pullItem, history, isFinished, currentPullIndex, totalPulls, nextItemRarity } = useGachaSystem();

  const [isAnimating, setIsAnimating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);
  const [showProposal, setShowProposal] = useState(false);

  // UI State
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
      // Attempt to play immediately
      videoRef.current.play().catch(error => {
        console.log("Autoplay prevented by browser:", error);
        // Optional: We could show a "Click to Unmute" button here if needed
      });
    }
  }, [volume, isMuted]);

  const handleWish = () => {
    if (isAnimating || showResult || showProposal) return;

    setIsAnimating(true);
  };

  const handleAnimationComplete = () => {
    setIsAnimating(false);
    const item = pullItem();

    if (item) {
      setCurrentResult(item);
      setShowResult(true);
    }
  };

  const handleDismissResult = () => {
    setShowResult(false);
    setCurrentResult(null);

    // Check if we just pulled the last item (The Ring)
    // The hook updates isFinished after the pull, so we check history length or currentPullIndex
    // Actually, pullItem returns the item. If it was the 10th item (index 9), we are done.
    // But useGachaSystem updates state asynchronously.
    // Let's check if the item we just pulled is the legendary ring.
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

      {/* Volume Control */}
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-black/40 p-2 rounded-full backdrop-blur-md border border-white/10 hover:bg-black/60 transition-colors">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-1 hover:text-blue-400 transition-colors"
        >
          {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={isMuted ? 0 : volume}
          onChange={(e) => {
            setVolume(parseFloat(e.target.value));
            setIsMuted(false);
          }}
          className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
        />
      </div>

      {/* Main Content Area */}
      <div className={`relative z-10 flex flex-col items-center justify-center min-h-screen p-4 transition-all duration-500 ${isInventoryOpen ? 'md:pl-64' : ''}`}>

        {/* Header / Counter */}
        <div className="absolute top-8 right-8 flex items-center gap-3 bg-[#F4F4F5] px-6 py-2 rounded-full border-2 border-[#E3D7B6] shadow-lg shadow-black/20">
          <Gem size={20} className="text-cyan-400 fill-cyan-400 drop-shadow-md" />
          <span className="font-bold tracking-wider text-[#8E7C68] text-lg">
            {currentPullIndex} / {totalPulls}
          </span>
        </div>

        {/* Wish Button */}
        {!showProposal && !isAnimating && !showResult && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center">
            <button
              onClick={handleWish}
              className="group relative px-16 py-2 bg-[#F4F4F5] rounded-full border-[3px] border-[#E3D7B6] hover:scale-105 transition-all duration-300 shadow-lg shadow-black/20 flex items-center gap-4 mx-auto"
            >
              <div className="flex flex-col items-center leading-none">
                <span className="text-[#8E7C68] font-bold text-2xl tracking-widest mb-0.5">WISH x1</span>
                <div className="flex items-center gap-1">
                  <Gem size={14} className="text-cyan-400 fill-cyan-400" />
                  <span className="text-[#8E7C68] font-bold text-xs">x 1</span>
                </div>
              </div>

              {/* Decorative side elements (simple CSS shapes or icons) */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E3D7B6]">
                <Sparkles size={12} />
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#E3D7B6]">
                <Sparkles size={12} />
              </div>
            </button>
          </div>
        )}

        {/* Video Animation (Falls back to Meteor if video missing) */}
        {isAnimating && (
          <VideoAnimation
            rarity={nextItemRarity}
            onComplete={handleAnimationComplete}
          />
        )}

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
            onAccept={() => alert("She said YES! Congratulations! ❤️")}
          />
        )}

      </div>

      {/* Background Video (Loops with sound) */}
      {!isAnimating && !showResult && !showProposal && (
        <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            autoPlay
            loop
            playsInline
            className="w-full h-full object-cover"
            src="/videos/background.mp4"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      )}


    </div>
  );
}

export default App;
