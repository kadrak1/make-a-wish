import React, { useState, useRef, useEffect } from 'react';
import Meteor from './Meteor';

const VideoAnimation = ({ rarity, onComplete }) => {
    const [videoError, setVideoError] = useState(false);
    const videoRef = useRef(null);

    // Map rarity to video filenames
    // Assumes videos are in public/videos/ folder
    const videoSrc = `/videos/wish-${rarity}.mp4`;

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.play().catch(err => {
                console.warn("Video playback failed:", err);
                setVideoError(true);
            });
        }
    }, [rarity]);

    const handleVideoError = () => {
        console.warn(`Could not load video: ${videoSrc}`);
        setVideoError(true);
    };

    // If video fails or isn't found, fall back to the CSS Meteor animation
    if (videoError) {
        return <Meteor rarity={rarity} onComplete={onComplete} />;
    }

    return (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
            <video
                ref={videoRef}
                src={videoSrc}
                className="w-full h-full object-cover"
                onEnded={onComplete}
                onError={handleVideoError}
                playsInline
            // muted // Auto-play often requires muted, but for a "click" triggered event it might work with sound.
            // Let's try without muted first, as sound is important for the effect.
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
