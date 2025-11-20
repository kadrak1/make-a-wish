import React from 'react';
import { motion } from 'framer-motion';

const rarityColors = {
    common: 'bg-blue-500 shadow-blue-500',
    epic: 'bg-purple-500 shadow-purple-500',
    legendary: 'bg-yellow-400 shadow-yellow-400',
};

const Meteor = ({ rarity, onComplete }) => {
    const colorClass = rarityColors[rarity] || rarityColors.common;

    return (
        <motion.div
            initial={{ y: -100, x: 100, opacity: 0, scale: 0.5 }}
            animate={{
                y: window.innerHeight / 2 - 50,
                x: 0,
                opacity: 1,
                scale: 1.5
            }}
            transition={{ duration: 1.5, ease: "easeIn" }}
            onAnimationComplete={onComplete}
            className="absolute z-50 pointer-events-none"
        >
            <div className={`w-4 h-4 rounded-full shadow-[0_0_20px_10px] ${colorClass}`}></div>
            {/* Tail */}
            <div className={`absolute top-0 right-0 w-40 h-1 origin-right rotate-45 -translate-y-1/2 -translate-x-1/2 bg-gradient-to-l from-transparent to-white opacity-50`}></div>
        </motion.div>
    );
};

export default Meteor;
