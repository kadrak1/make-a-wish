import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, Save, RefreshCw, Coins, Star, Book, Globe, Calendar } from 'lucide-react';

const AdminPanel = ({ isOpen, onClose }) => {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('daily'); // daily, main, world, balance, gifts
    const [saveStatus, setSaveStatus] = useState('');

    // Config states
    const [dailyConfig, setDailyConfig] = useState('');
    const [mainConfig, setMainConfig] = useState('');
    const [worldConfig, setWorldConfig] = useState('');
    const [giftsConfig, setGiftsConfig] = useState('');

    // Balance states
    const [primogems, setPrimogems] = useState(0);
    const [wishes, setWishes] = useState(0);

    // Gacha state for reconstruction
    const [fullQueue, setFullQueue] = useState([]);
    const [pityCounter, setPityCounter] = useState(0);

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching users:', error);
        else setUsers(data || []);
        setLoading(false);
    };

    const handleUserSelect = async (user) => {
        setSelectedUser(user);
        setSaveStatus('');

        // Fetch user's quest config
        const { data: questData, error: questError } = await supabase
            .from('user_quests')
            .select('daily_quests_config, main_quests_config, world_quests_config')
            .eq('user_id', user.id)
            .single();

        if (questData) {
            setDailyConfig(questData.daily_quests_config ? JSON.stringify(questData.daily_quests_config, null, 2) : '[]');
            setMainConfig(questData.main_quests_config ? JSON.stringify(questData.main_quests_config, null, 2) : '[]');
            setWorldConfig(questData.world_quests_config ? JSON.stringify(questData.world_quests_config, null, 2) : '[]');
        } else {
            setDailyConfig('[]');
            setMainConfig('[]');
            setWorldConfig('[]');
        }

        // Fetch user's game state (balance & queue)
        const { data: gameState, error: stateError } = await supabase
            .from('game_state')
            .select('primogems, wishes, queue, pity_counter')
            .eq('user_id', user.id)
            .single();

        if (gameState) {
            setPrimogems(gameState.primogems || 0);
            setWishes(gameState.wishes || 0);

            const queue = gameState.queue || [];
            const counter = gameState.pity_counter || 0;
            setFullQueue(queue);
            setPityCounter(counter);

            // Split queue: only show future items for editing
            const futureItems = queue.slice(counter);
            setGiftsConfig(JSON.stringify(futureItems, null, 2));
        }
    };

    const handleSave = async () => {
        if (!selectedUser) return;
        setSaveStatus('Saving...');

        try {
            if (activeTab === 'balance') {
                const { error } = await supabase
                    .from('game_state')
                    .update({
                        primogems: parseInt(primogems),
                        wishes: parseInt(wishes)
                    })
                    .eq('user_id', selectedUser.id);
                if (error) throw error;
            } else if (activeTab === 'gifts') {
                // Reconstruct queue
                const futureItems = JSON.parse(giftsConfig);
                const pastItems = fullQueue.slice(0, pityCounter);
                const newQueue = [...pastItems, ...futureItems];

                const { error } = await supabase
                    .from('game_state')
                    .update({
                        queue: newQueue
                    })
                    .eq('user_id', selectedUser.id);

                if (error) throw error;

                // Update local state
                setFullQueue(newQueue);
            } else {
                // Save configs
                const updates = {
                    user_id: selectedUser.id,
                    updated_at: new Date().toISOString()
                };

                if (activeTab === 'daily') updates.daily_quests_config = JSON.parse(dailyConfig);
                if (activeTab === 'main') updates.main_quests_config = JSON.parse(mainConfig);
                if (activeTab === 'world') updates.world_quests_config = JSON.parse(worldConfig);

                const { error } = await supabase
                    .from('user_quests')
                    .upsert(updates);

                if (error) throw error;
            }

            setSaveStatus('Saved!');
            setTimeout(() => setSaveStatus(''), 2000);
        } catch (err) {
            console.error('Error saving:', err);
            setSaveStatus('Error: ' + err.message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#1a1a2e] w-full max-w-5xl h-[85vh] rounded-2xl border border-[#E3D7B6]/30 flex flex-col overflow-hidden shadow-2xl">

                {/* Header */}
                <div className="p-4 border-b border-[#E3D7B6]/20 flex justify-between items-center bg-[#16213e]">
                    <h2 className="text-xl font-bold text-[#E3D7B6]">Admin Panel</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* User List Sidebar */}
                    <div className="w-1/4 border-r border-[#E3D7B6]/20 overflow-y-auto bg-[#0f3460]/30">
                        <div className="p-4 flex justify-between items-center sticky top-0 bg-[#1a1a2e] z-10 border-b border-[#E3D7B6]/10">
                            <h3 className="font-semibold text-gray-300">Users ({users.length})</h3>
                            <button onClick={fetchUsers} className="p-1 hover:bg-white/10 rounded-full">
                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                        <div className="divide-y divide-white/5">
                            {users.map(user => (
                                <div
                                    key={user.id}
                                    onClick={() => handleUserSelect(user)}
                                    className={`p-4 cursor-pointer transition-colors hover:bg-white/5 ${selectedUser?.id === user.id ? 'bg-[#E3D7B6]/10 border-l-4 border-[#E3D7B6]' : ''}`}
                                >
                                    <div className="font-medium text-white">{user.nickname}</div>
                                    <div className="text-xs text-gray-500 truncate">{user.id}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Editor Area */}
                    <div className="flex-1 flex flex-col bg-[#1a1a2e]">
                        {selectedUser ? (
                            <>
                                <div className="p-4 border-b border-[#E3D7B6]/10 bg-[#16213e]/50 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-[#E3D7B6] font-semibold">Editing: {selectedUser.nickname}</h3>
                                        <p className="text-xs text-gray-400">Select a category to edit</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setActiveTab('daily')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${activeTab === 'daily' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                        >
                                            <Calendar size={14} /> Daily
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('main')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${activeTab === 'main' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/50' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                        >
                                            <Star size={14} /> Main
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('world')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${activeTab === 'world' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                        >
                                            <Globe size={14} /> Для двоих
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('gifts')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${activeTab === 'gifts' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/50' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                        >
                                            <Book size={14} /> Gifts
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('balance')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${activeTab === 'balance' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                        >
                                            <Coins size={14} /> Balance
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 p-4 overflow-hidden">
                                    {activeTab === 'balance' ? (
                                        <div className="space-y-6 max-w-md mx-auto mt-10">
                                            <div className="bg-[#0f3460] p-6 rounded-xl border border-[#E3D7B6]/20">
                                                <label className="block text-sm text-gray-400 mb-2">Primogems</label>
                                                <div className="flex items-center gap-3">
                                                    <Coins className="text-[#E3D7B6]" />
                                                    <input
                                                        type="number"
                                                        value={primogems}
                                                        onChange={(e) => setPrimogems(e.target.value)}
                                                        className="flex-1 bg-[#1a1a2e] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-[#E3D7B6] focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="bg-[#0f3460] p-6 rounded-xl border border-[#E3D7B6]/20">
                                                <label className="block text-sm text-gray-400 mb-2">Wishes (Intertwined Fate)</label>
                                                <div className="flex items-center gap-3">
                                                    <Star className="text-pink-400" />
                                                    <input
                                                        type="number"
                                                        value={wishes}
                                                        onChange={(e) => setWishes(e.target.value)}
                                                        className="flex-1 bg-[#1a1a2e] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-[#E3D7B6] focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <textarea
                                            value={
                                                activeTab === 'daily' ? dailyConfig :
                                                    activeTab === 'main' ? mainConfig :
                                                        activeTab === 'world' ? worldConfig :
                                                            giftsConfig
                                            }
                                            onChange={(e) => {
                                                if (activeTab === 'daily') setDailyConfig(e.target.value);
                                                if (activeTab === 'main') setMainConfig(e.target.value);
                                                if (activeTab === 'world') setWorldConfig(e.target.value);
                                                if (activeTab === 'gifts') setGiftsConfig(e.target.value);
                                            }}
                                            className="w-full h-full bg-[#0f3460] text-gray-200 font-mono text-sm p-4 rounded-lg border border-[#E3D7B6]/20 focus:border-[#E3D7B6] focus:outline-none resize-none"
                                            placeholder="Enter JSON configuration..."
                                        />
                                    )}
                                </div>

                                <div className="p-4 border-t border-[#E3D7B6]/10 flex justify-between items-center bg-[#16213e]">
                                    <div className={`text-sm ${saveStatus.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
                                        {saveStatus}
                                    </div>
                                    <button
                                        onClick={handleSave}
                                        className="flex items-center gap-2 px-6 py-2 bg-[#E3D7B6] text-[#1a1a2e] rounded-full font-bold hover:bg-[#f0e6c8] transition-colors"
                                    >
                                        <Save size={18} />
                                        Save {activeTab === 'balance' ? 'Balance' : 'Config'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-500">
                                Select a user to edit their data
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
