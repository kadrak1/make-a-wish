import React, { useState, useRef, useEffect } from 'react';
import Meteor from './Meteor';

const VideoAnimation = ({ rarity, onComplete, volume = 0.5, isMuted = false, isActive = false }) => {
    const [videoError, setVideoError] = useState(false);
    const [videoUrls, setVideoUrls] = useState({});
    const videoRefs = useRef({});

    // Define all video types
    const videos = ['common', 'epic', 'legendary'];

    // Preload videos as Blobs
    useEffect(() => {
        const loadVideos = async () => {
            const urls = {};

            await Promise.all(videos.map(async (type) => {
                try {
                    const response = await fetch(`${import.meta.env.BASE_URL}videos/wish-${type}.mp4`);
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    urls[type] = url;
                } catch (err) {
                    console.error(`Failed to preload video for ${type}:`, err);
                }
            }));

            setVideoUrls(urls);
        };

        loadVideos();

        // Cleanup Object URLs
        return () => {
            Object.values(videoUrls).forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    useEffect(() => {
        // Handle volume and playback for all videos
        videos.forEach(type => {
            const video = videoRefs.current[type];
            if (video) {
                video.volume = isMuted ? 0 : volume;

                if (isActive && type === rarity) {
                    video.currentTime = 0;
                    video.play().catch(err => {
                        console.warn(`Video playback failed for ${type}:`, err);
                        setVideoError(true);
                    });
                } else {
                    video.pause();
                    video.currentTime = 0;
                }
            }
        });
    }, [isActive, rarity, volume, isMuted, videoUrls]);

    const handleVideoError = (type) => {
        console.warn(`Could not load video: ${type}`);
        // Only trigger error state if it's the active video
        if (type === rarity) {
            setVideoError(true);
        }
    };

    // If video fails or isn't found, fall back to the CSS Meteor animation
    if (videoError) {
        return isActive ? <Meteor rarity={rarity} onComplete={onComplete} /> : null;
    }

    return (
        <div className={`fixed inset-0 z-50 bg-black flex items-center justify-center transition-opacity duration-300 ${isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            {videos.map((type) => (
                videoUrls[type] ? (
                    <video
                        key={type}
                        ref={el => videoRefs.current[type] = el}
                        src={videoUrls[type]}
                        className={`absolute inset-0 w-full h-full object-cover ${isActive && rarity === type ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                        onEnded={() => {
                            if (isActive && rarity === type) {
                                onComplete();
                            }
                        }}
                        onError={() => handleVideoError(type)}
                        playsInline
                        preload="auto"
                        onLoadedMetadata={(e) => {
                            e.target.volume = isMuted ? 0 : volume;
                        }}
                    />
                ) : null
            ))}

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
