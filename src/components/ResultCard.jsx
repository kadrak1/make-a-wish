import React from 'react';
import { motion } from 'framer-motion';

const rarityStyles = {
    common: {
        border: 'border-blue-500',
        bg: 'bg-blue-900/80',
        text: 'text-blue-300',
        glow: 'shadow-blue-500/50'
    },
    epic: {
        border: 'border-purple-500',
        bg: 'bg-purple-900/80',
        text: 'text-purple-300',
        glow: 'shadow-purple-500/50'
    },
    legendary: {
        border: 'border-yellow-500',
        bg: 'bg-yellow-900/80',
        text: 'text-yellow-300',
        glow: 'shadow-yellow-500/50'
    }
};

const ResultCard = ({ item, onDismiss }) => {
    if (!item) return null;

    const styles = rarityStyles[item.rarity] || rarityStyles.common;

    return (
        <motion.div
            initial={{ scale: 0, opacity: 0, rotateY: 90 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed inset-0 flex items-center justify-center z-40 bg-black/60 backdrop-blur-sm"
            onClick={onDismiss}
        >
            <div
                className={`
          relative w-80 h-96 rounded-xl border-4 ${styles.border} ${styles.bg} 
          flex flex-col items-center justify-center p-6 text-center 
          shadow-[0_0_50px_0px] ${styles.glow}
          cursor-pointer
        `}
            >
                <div className="mb-4 w-full aspect-square bg-black/30 rounded-lg overflow-hidden">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>

                <h2 className={`text-2xl font-bold mb-2 ${styles.text}`}>
                    {item.name}
                </h2>

                <div className="mt-auto text-sm uppercase tracking-widest opacity-70">
                    {item.rarity}
                </div>

                <div className="absolute bottom-2 text-xs text-white/30">
                    Click to continue
                </div>
            </div>
        </motion.div>
    );
};

export default ResultCard;
