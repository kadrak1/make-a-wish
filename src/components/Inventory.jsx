import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, X } from 'lucide-react';

const Inventory = ({ items, isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="bg-[#F4F4F5] w-full max-w-2xl rounded-2xl border-2 border-[#E3D7B6] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        {/* Header */}
                        <div className="bg-[#E3D7B6] px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Briefcase size={22} className="text-[#8E7C68]" />
                                <h2 className="text-[#8E7C68] font-bold text-xl uppercase tracking-wider">Инвентарь</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-black/5 rounded-full transition-colors text-[#8E7C68]"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-[#F4F4F5]">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {items.map((item, index) => (
                                    <motion.div
                                        key={`${item.id}-${index}`}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className={`
                                            p-3 rounded-xl flex items-center gap-3 border transition-all hover:scale-[1.02]
                                            ${item.rarity === 'legendary' ? 'bg-amber-50 border-amber-200' :
                                                item.rarity === 'epic' ? 'bg-purple-50 border-purple-200' :
                                                    'bg-blue-50 border-blue-200'}
                                        `}
                                    >
                                        <div className="relative group">
                                            <img src={item.image} alt={item.name} className="w-14 h-14 rounded-lg bg-white object-cover border-2 border-white shadow-sm" />
                                            <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/5 transition-colors" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-gray-800 truncate">{item.name}</div>
                                            <div className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${item.rarity === 'legendary' ? 'text-amber-600' :
                                                item.rarity === 'epic' ? 'text-purple-600' :
                                                    'text-blue-600'
                                                }`}>
                                                {item.rarity}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {items.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-[#8E7C68]/50">
                                    <Briefcase size={48} className="mb-4 opacity-20" />
                                    <p className="font-bold text-lg">Пока пусто</p>
                                    <p className="text-sm">Сделайте молитву, чтобы получить награды!</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="bg-[#EAE5D5] px-6 py-3 border-t border-[#E3D7B6]/50 flex justify-between items-center">
                            <span className="text-xs font-bold text-[#8E7C68] uppercase tracking-tighter opacity-70">
                                Всего предметов: {items.length}
                            </span>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default Inventory;
