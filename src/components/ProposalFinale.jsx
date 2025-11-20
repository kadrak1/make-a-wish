import React from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

const ProposalFinale = ({ onAccept }) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 text-center p-4"
        >
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
                className="mb-8"
            >
                <Heart className="w-24 h-24 text-red-500 mx-auto mb-4 animate-pulse" fill="currentColor" />
                <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">
                    Will You Marry Me?
                </h1>
            </motion.div>

            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 3, duration: 0.5 }}
                className="flex flex-col md:flex-row gap-4"
            >
                <button
                    onClick={onAccept}
                    className="px-8 py-4 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full text-xl font-bold shadow-lg hover:scale-105 transition-transform"
                >
                    Yes
                </button>
                <button
                    onClick={onAccept}
                    className="px-8 py-4 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full text-xl font-bold shadow-lg hover:scale-105 transition-transform"
                >
                    Yes, of course!
                </button>
            </motion.div>
        </motion.div>
    );
};

export default ProposalFinale;
