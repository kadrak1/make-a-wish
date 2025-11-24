import React, { useState, useRef, useEffect } from 'react';
import Meteor from './Meteor';

const VideoAnimation = ({ rarity, onComplete, volume = 0.5, isMuted = false, isActive = false }) => {
    const [videoError, setVideoError] = useState(false);
    const videoRef = useRef(null);

    // Map rarity to video filenames
    // Assumes videos are in public/videos/ folder
    const videoSrc = `${import.meta.env.BASE_URL}videos/wish-${rarity}.mp4`;

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = isMuted ? 0 : volume;

            if (isActive) {
                videoRef.current.currentTime = 0;
                videoRef.current.play().catch(err => {
                    console.warn("Video playback failed:", err);
                    setVideoError(true);
                });
            } else {
                videoRef.current.pause();
            }
        }
    }, [isActive, rarity, volume, isMuted]);

    const handleVideoError = () => {
        console.warn(`Could not load video: ${videoSrc}`);
        setVideoError(true);
    };

    // If video fails or isn't found, fall back to the CSS Meteor animation
    if (videoError) {
        return isActive ? <Meteor rarity={rarity} onComplete={onComplete} /> : null;
    }

    return (
        <div className={`fixed inset-0 z-50 bg-black flex items-center justify-center transition-opacity duration-300 ${isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <video
                ref={videoRef}
                src={videoSrc}
                className="w-full h-full object-cover"
                onEnded={onComplete}
                onError={handleVideoError}
                playsInline
                preload="auto"
                onLoadedMetadata={(e) => {
                    e.target.volume = isMuted ? 0 : volume;
                }}
            />
            {/* Skip button just in case */}
            <button
                onClick={onComplete}
                className="absolute top-4 right-4 text-white/50 hover:text-white text-sm z-50"
            >
                Skip
            </button>
        </div>
    );
};

export default VideoAnimation;
