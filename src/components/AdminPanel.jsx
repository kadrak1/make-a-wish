import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, Save, RefreshCw, Coins, Star, Book, Globe, Calendar, Crown, Key, Plus, Trash2 } from 'lucide-react';

const AdminPanel = ({ isOpen, onClose }) => {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('daily'); // daily, main, world, balance, gifts, promo, subs
    const [saveStatus, setSaveStatus] = useState('');

    // Config states
    const [dailyConfig, setDailyConfig] = useState('');
    const [mainConfig, setMainConfig] = useState('');
    const [worldConfig, setWorldConfig] = useState('');
    const [giftsConfig, setGiftsConfig] = useState('');

    // Balance states
    const [universalPrimogems, setUniversalPrimogems] = useState(0);
    const [wishes, setWishes] = useState(0);

    // Promo code states
    const [promoCodes, setPromoCodes] = useState([]);
    const [newPromoCode, setNewPromoCode] = useState('');
    const [newPromoDays, setNewPromoDays] = useState(30);
    const [newPromoMaxUses, setNewPromoMaxUses] = useState(1);
    const [promoLoading, setPromoLoading] = useState(false);

    // Subscriptions state
    const [subscriptions, setSubscriptions] = useState([]);
    const [subsLoading, setSubsLoading] = useState(false);
    const [grantDays, setGrantDays] = useState(30);

    // Gacha state for reconstruction
    const [fullQueue, setFullQueue] = useState([]);
    const [pityCounter, setPityCounter] = useState(0);

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && activeTab === 'promo') fetchPromoCodes();
        if (isOpen && activeTab === 'subs') fetchSubscriptions();
    }, [isOpen, activeTab]);

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

    const fetchPromoCodes = async () => {
        setPromoLoading(true);
        const { data, error } = await supabase
            .from('promo_codes')
            .select('*')
            .order('created_at', { ascending: false });
        if (!error) setPromoCodes(data || []);
        setPromoLoading(false);
    };

    const fetchSubscriptions = async () => {
        setSubsLoading(true);
        const { data, error } = await supabase
            .from('subscriptions')
            .select('*, users!subscriptions_user_id_fkey(nickname)')
            .order('created_at', { ascending: false });
        if (!error) setSubscriptions(data || []);
        setSubsLoading(false);
    };

    const handleUserSelect = async (user) => {
        setSelectedUser(user);
        setSaveStatus('');

        // Fetch user's quest config
        const { data: questData } = await supabase
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

        // Fetch user's game state (balance)
        const { data: gameState } = await supabase
            .from('game_state')
            .select('universal_primogems, wishes, queue, pity_counter')
            .eq('user_id', user.id)
            .single();

        if (gameState) {
            setUniversalPrimogems(gameState.universal_primogems || 0);
            setWishes(gameState.wishes || 0);

            const queue = gameState.queue || [];
            const counter = gameState.pity_counter || 0;
            setFullQueue(queue);
            setPityCounter(counter);

            // Split queue: only show future items for editing
            const futureItems = queue.slice(counter);
            setGiftsConfig(JSON.stringify(futureItems, null, 2));
        } else {
            setUniversalPrimogems(0);
            setWishes(0);
            setFullQueue([]);
            setPityCounter(0);
            setGiftsConfig('[]');
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
                        universal_primogems: parseInt(universalPrimogems),
                        wishes: parseInt(wishes)
                    })
                    .eq('user_id', selectedUser.id);
                if (error) throw error;
            } else if (activeTab === 'gifts') {
                const futureItems = JSON.parse(giftsConfig);
                const pastItems = fullQueue.slice(0, pityCounter);
                const newQueue = [...pastItems, ...futureItems];

                const { error } = await supabase
                    .from('game_state')
                    .update({ queue: newQueue })
                    .eq('user_id', selectedUser.id);

                if (error) throw error;
                setFullQueue(newQueue);
            } else {
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

    const handleCreatePromoCode = async () => {
        const code = newPromoCode.trim().toUpperCase();
        if (!code) return;
        setPromoLoading(true);
        const { error } = await supabase.from('promo_codes').insert([{
            code,
            duration_days: parseInt(newPromoDays) || 30,
            max_uses: parseInt(newPromoMaxUses) || 1,
            used_count: 0,
            is_active: true
        }]);
        if (error) {
            alert('Error: ' + error.message);
        } else {
            setNewPromoCode('');
            setNewPromoDays(30);
            setNewPromoMaxUses(1);
            fetchPromoCodes();
        }
        setPromoLoading(false);
    };

    const handleTogglePromo = async (id, currentActive) => {
        await supabase.from('promo_codes').update({ is_active: !currentActive }).eq('id', id);
        fetchPromoCodes();
    };

    const handleDeletePromo = async (id) => {
        if (!window.confirm('Delete this promo code?')) return;
        await supabase.from('promo_codes').delete().eq('id', id);
        fetchPromoCodes();
    };

    const handleGrantPremium = async (userId) => {
        const days = parseInt(grantDays) || 30;
        const { error } = await supabase.rpc('admin_grant_premium', {
            p_target_user_id: userId,
            p_duration_days: days
        });
        if (error) alert('Error: ' + error.message);
        else fetchSubscriptions();
    };

    const handleRevokePremium = async (userId) => {
        if (!window.confirm('Revoke premium for this user?')) return;
        const { error } = await supabase.rpc('admin_revoke_premium', {
            p_target_user_id: userId
        });
        if (error) alert('Error: ' + error.message);
        else fetchSubscriptions();
    };

    if (!isOpen) return null;

    const showSaveButton = ['daily', 'main', 'world', 'balance', 'gifts'].includes(activeTab);

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
                        {/* Tab bar — always visible */}
                        <div className="p-3 border-b border-[#E3D7B6]/10 bg-[#16213e]/50 flex flex-wrap gap-2">
                            {selectedUser && (
                                <>
                                    <span className="text-[#E3D7B6]/60 text-xs self-center mr-2 font-semibold">{selectedUser.nickname}:</span>
                                    {[
                                        { id: 'daily', icon: <Calendar size={13} />, label: 'Daily', color: 'purple' },
                                        { id: 'main', icon: <Star size={13} />, label: 'Main', color: 'orange' },
                                        { id: 'world', icon: <Globe size={13} />, label: 'Для двоих', color: 'blue' },
                                        { id: 'gifts', icon: <Book size={13} />, label: 'Gifts', color: 'pink' },
                                        { id: 'balance', icon: <Coins size={13} />, label: 'Balance', color: 'yellow' },
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                                                activeTab === tab.id
                                                    ? `bg-${tab.color}-500/20 text-${tab.color}-300 border border-${tab.color}-500/50`
                                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                            }`}
                                        >
                                            {tab.icon} {tab.label}
                                        </button>
                                    ))}
                                </>
                            )}
                            {/* Global tabs — always visible */}
                            <div className="flex gap-2 ml-auto">
                                <button
                                    onClick={() => setActiveTab('promo')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${activeTab === 'promo' ? 'bg-green-500/20 text-green-300 border border-green-500/50' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                >
                                    <Key size={13} /> Promo
                                </button>
                                <button
                                    onClick={() => setActiveTab('subs')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${activeTab === 'subs' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                >
                                    <Crown size={13} /> Premium
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {/* ── PROMO TAB ── */}
                            {activeTab === 'promo' && (
                                <div className="space-y-4 max-w-2xl mx-auto">
                                    {/* Create form */}
                                    <div className="bg-[#0f3460] p-4 rounded-xl border border-[#E3D7B6]/20 space-y-3">
                                        <h4 className="text-[#E3D7B6] font-bold text-sm">Create promo code</h4>
                                        <div className="flex gap-2 flex-wrap">
                                            <input
                                                type="text"
                                                value={newPromoCode}
                                                onChange={e => setNewPromoCode(e.target.value.toUpperCase())}
                                                onKeyDown={e => e.key === 'Enter' && handleCreatePromoCode()}
                                                placeholder="CODE"
                                                className="flex-1 min-w-[120px] bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-[#E3D7B6] focus:outline-none uppercase tracking-wider"
                                            />
                                            <input
                                                type="number"
                                                value={newPromoDays}
                                                onChange={e => setNewPromoDays(e.target.value)}
                                                placeholder="Days"
                                                min="1"
                                                className="w-20 bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-[#E3D7B6] focus:outline-none"
                                            />
                                            <input
                                                type="number"
                                                value={newPromoMaxUses}
                                                onChange={e => setNewPromoMaxUses(e.target.value)}
                                                placeholder="Uses"
                                                min="1"
                                                className="w-20 bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-[#E3D7B6] focus:outline-none"
                                            />
                                            <button
                                                onClick={handleCreatePromoCode}
                                                disabled={promoLoading || !newPromoCode.trim()}
                                                className="px-4 py-2 bg-green-500/20 text-green-300 border border-green-500/50 rounded-lg text-sm font-bold hover:bg-green-500/30 disabled:opacity-50 flex items-center gap-1.5"
                                            >
                                                <Plus size={14} /> Create
                                            </button>
                                        </div>
                                        <p className="text-gray-500 text-xs">Fields: Code · Days (duration) · Max uses</p>
                                    </div>

                                    {/* Code list */}
                                    <div className="space-y-2">
                                        {promoLoading ? (
                                            <p className="text-gray-500 text-sm text-center py-4">Loading...</p>
                                        ) : promoCodes.length === 0 ? (
                                            <p className="text-gray-500 text-sm text-center py-4">No promo codes yet</p>
                                        ) : promoCodes.map(pc => (
                                            <div key={pc.id} className="bg-[#0f3460]/60 rounded-xl border border-[#E3D7B6]/10 p-3 flex items-center gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-bold text-[#E3D7B6] text-sm">{pc.code}</span>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${pc.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                            {pc.is_active ? 'Active' : 'Disabled'}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-0.5">
                                                        {pc.duration_days}d · {pc.used_count}/{pc.max_uses} uses
                                                        {pc.expires_at && ` · expires ${new Date(pc.expires_at).toLocaleDateString('ru-RU')}`}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleTogglePromo(pc.id, pc.is_active)}
                                                    className="px-2 py-1 text-xs rounded bg-white/5 hover:bg-white/10 text-gray-300"
                                                >
                                                    {pc.is_active ? 'Disable' : 'Enable'}
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePromo(pc.id)}
                                                    className="p-1.5 rounded hover:bg-red-500/20 text-red-400"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── SUBS TAB ── */}
                            {activeTab === 'subs' && (
                                <div className="space-y-4 max-w-2xl mx-auto">
                                    <div className="bg-[#0f3460] p-4 rounded-xl border border-[#E3D7B6]/20 flex items-center gap-3">
                                        <div className="flex-1">
                                            <p className="text-[#E3D7B6] text-sm font-bold mb-1">Grant premium to selected user</p>
                                            <p className="text-gray-400 text-xs">Select a user in the sidebar first</p>
                                        </div>
                                        <input
                                            type="number"
                                            value={grantDays}
                                            onChange={e => setGrantDays(e.target.value)}
                                            placeholder="Days"
                                            min="1"
                                            className="w-20 bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-[#E3D7B6] focus:outline-none"
                                        />
                                        <button
                                            onClick={() => selectedUser && handleGrantPremium(selectedUser.id)}
                                            disabled={!selectedUser || subsLoading}
                                            className="px-4 py-2 bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 rounded-lg text-sm font-bold hover:bg-yellow-500/30 disabled:opacity-40 flex items-center gap-1.5"
                                        >
                                            <Crown size={14} /> Grant
                                        </button>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <h4 className="text-gray-300 text-sm font-semibold">All subscriptions ({subscriptions.length})</h4>
                                        <button onClick={fetchSubscriptions} className="p-1 hover:bg-white/10 rounded-full">
                                            <RefreshCw size={14} className={subsLoading ? 'animate-spin' : ''} />
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {subsLoading ? (
                                            <p className="text-gray-500 text-sm text-center py-4">Loading...</p>
                                        ) : subscriptions.length === 0 ? (
                                            <p className="text-gray-500 text-sm text-center py-4">No active subscriptions</p>
                                        ) : subscriptions.map(sub => {
                                            const expired = sub.expires_at && new Date(sub.expires_at) < new Date();
                                            return (
                                                <div key={sub.id} className="bg-[#0f3460]/60 rounded-xl border border-[#E3D7B6]/10 p-3 flex items-center gap-3">
                                                    <Crown size={16} className={expired ? 'text-gray-500' : 'text-yellow-400'} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-white text-sm">
                                                            {sub.users?.nickname || sub.user_id.slice(0, 8)}
                                                        </div>
                                                        <div className="text-xs text-gray-400">
                                                            {sub.status} · source: {sub.source || '—'}
                                                            {sub.expires_at && ` · until ${new Date(sub.expires_at).toLocaleDateString('ru-RU')}`}
                                                            {expired && <span className="text-red-400 ml-1">· EXPIRED</span>}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRevokePremium(sub.user_id)}
                                                        className="px-2 py-1 text-xs rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30"
                                                    >
                                                        Revoke
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ── USER TABS ── */}
                            {selectedUser && !['promo', 'subs'].includes(activeTab) && (
                                <>
                                    {activeTab === 'balance' && (
                                        <div className="space-y-6 max-w-md mx-auto mt-6">
                                            <div className="bg-[#0f3460] p-6 rounded-xl border border-[#E3D7B6]/20">
                                                <label className="block text-sm text-gray-400 mb-2">Universal Primogems</label>
                                                <div className="flex items-center gap-3">
                                                    <Coins className="text-[#E3D7B6]" />
                                                    <input
                                                        type="number"
                                                        value={universalPrimogems}
                                                        onChange={(e) => setUniversalPrimogems(e.target.value)}
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
                                    )}

                                    {activeTab === 'gifts' && (
                                        <div className="flex flex-col h-full gap-4">
                                            {/* Image Upload Section */}
                                            <div className="bg-[#0f3460] p-4 rounded-xl border border-[#E3D7B6]/20 flex items-center gap-4">
                                                <div className="flex-1">
                                                    <label className="block text-xs text-gray-400 mb-1">Upload Reward Image</label>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={async (e) => {
                                                            const file = e.target.files[0];
                                                            if (!file) return;

                                                            setSaveStatus('Uploading Image...');
                                                            try {
                                                                const fileExt = file.name.split('.').pop();
                                                                const fileName = `img_${Date.now()}.${fileExt}`;

                                                                const { error: uploadError } = await supabase.storage
                                                                    .from('wish-rewards')
                                                                    .upload(fileName, file);

                                                                if (uploadError) {
                                                                    if (uploadError.message.includes('bucket not found')) {
                                                                        alert('Bucket "wish-rewards" not found. Please create it in Supabase Dashboard.');
                                                                    }
                                                                    throw uploadError;
                                                                }

                                                                const { data: { publicUrl } } = supabase.storage
                                                                    .from('wish-rewards')
                                                                    .getPublicUrl(fileName);

                                                                navigator.clipboard.writeText(publicUrl);
                                                                setSaveStatus('Image URL Copied!');
                                                                setTimeout(() => setSaveStatus(''), 3000);
                                                                alert(`Image uploaded! URL copied:\n${publicUrl}`);

                                                            } catch (error) {
                                                                console.error('Upload error:', error);
                                                                setSaveStatus('Upload Failed: ' + error.message);
                                                            }
                                                        }}
                                                        className="block w-full text-sm text-gray-400
                                                            file:mr-4 file:py-2 file:px-4
                                                            file:rounded-full file:border-0
                                                            file:text-xs file:font-semibold
                                                            file:bg-[#E3D7B6] file:text-[#1a1a2e]
                                                            hover:file:bg-[#d4c5a0]
                                                            cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                            <textarea
                                                value={giftsConfig}
                                                onChange={(e) => setGiftsConfig(e.target.value)}
                                                className="flex-1 w-full bg-[#0f3460] text-gray-200 font-mono text-sm p-4 rounded-lg border border-[#E3D7B6]/20 focus:border-[#E3D7B6] focus:outline-none resize-none"
                                                placeholder="Enter JSON configuration..."
                                            />
                                        </div>
                                    )}

                                    {['daily', 'main', 'world'].includes(activeTab) && (
                                        <textarea
                                            value={
                                                activeTab === 'daily' ? dailyConfig :
                                                activeTab === 'main' ? mainConfig :
                                                worldConfig
                                            }
                                            onChange={(e) => {
                                                if (activeTab === 'daily') setDailyConfig(e.target.value);
                                                if (activeTab === 'main') setMainConfig(e.target.value);
                                                if (activeTab === 'world') setWorldConfig(e.target.value);
                                            }}
                                            className="w-full h-full min-h-[400px] bg-[#0f3460] text-gray-200 font-mono text-sm p-4 rounded-lg border border-[#E3D7B6]/20 focus:border-[#E3D7B6] focus:outline-none resize-none"
                                            placeholder="Enter JSON configuration..."
                                        />
                                    )}
                                </>
                            )}

                            {/* Empty state */}
                            {!selectedUser && !['promo', 'subs'].includes(activeTab) && (
                                <div className="flex-1 flex items-center justify-center text-gray-500 py-20">
                                    Select a user to edit their data
                                </div>
                            )}
                        </div>

                        {/* Footer save button — only for user data tabs */}
                        {selectedUser && showSaveButton && !['promo', 'subs'].includes(activeTab) && (
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
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
