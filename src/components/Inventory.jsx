import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Archive, ChevronLeft, ChevronRight } from 'lucide-react';

const Inventory = ({ items, isOpen, onToggle }) => {
    return (
        <>
            <button
                onClick={onToggle}
                className={`fixed top-1/2 -translate-y-1/2 z-30 p-2 bg-slate-800/80 text-white rounded-r-lg hover:bg-slate-700 transition-all duration-300 ${isOpen ? 'left-64' : 'left-0'}`}
            >
                {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ x: -300 }}
                        animate={{ x: 0 }}
                        exit={{ x: -300 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="fixed left-0 top-0 bottom-0 w-64 bg-slate-900/90 border-r border-slate-700 p-4 overflow-y-auto z-20 backdrop-blur-sm"
                    >
                        <div className="flex items-center gap-2 mb-6 text-slate-300">
                            <Archive size={20} />
                            <h2 className="font-bold text-lg">Inventory</h2>
                        </div>

                        <div className="space-y-2">
                            {items.map((item, index) => (
                                <motion.div
                                    key={`${item.id}-${index}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`
                    p-3 rounded-lg flex items-center gap-3
                    ${item.rarity === 'legendary' ? 'bg-yellow-900/30 border border-yellow-700/50' :
                                            item.rarity === 'epic' ? 'bg-purple-900/30 border border-purple-700/50' :
                                                'bg-blue-900/30 border border-blue-700/50'}
                  `}
                                >
                                    <img src={item.image} alt={item.name} className="w-10 h-10 rounded bg-black/20 object-cover" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate text-slate-200">{item.name}</div>
                                        <div className={`text-xs capitalize ${item.rarity === 'legendary' ? 'text-yellow-500' :
                                                item.rarity === 'epic' ? 'text-purple-400' :
                                                    'text-blue-400'
                                            }`}>
                                            {item.rarity}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            {items.length === 0 && (
                                <div className="text-slate-600 text-sm text-center py-10">
                                    No items yet.
                                    <br />
                                    Make a wish!
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Inventory;
