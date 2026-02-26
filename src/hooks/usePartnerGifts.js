import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export const usePartnerGifts = (partnerId) => {
    const { user } = useAuth();
    const [gifts, setGifts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchGifts = useCallback(async () => {
        if (!user || !partnerId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('partner_gifts')
                .select('*')
                .eq('created_by', user.id)
                .eq('assigned_to', partnerId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setGifts(data || []);
        } catch (error) {
            console.error('Error fetching partner gifts:', error);
        } finally {
            setLoading(false);
        }
    }, [user, partnerId]);

    useEffect(() => {
        fetchGifts();

        if (!user || !partnerId) return;

        const sub = supabase
            .channel(`partner_gifts_${partnerId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'partner_gifts',
                filter: `created_by=eq.${user.id}`
            }, () => {
                fetchGifts();
            })
            .subscribe();

        return () => supabase.removeChannel(sub);
    }, [user, partnerId, fetchGifts]);

    const addGift = async (name, description, rarity) => {
        try {
            const { data, error } = await supabase
                .from('partner_gifts')
                .insert([{
                    created_by: user.id,
                    assigned_to: partnerId,
                    name,
                    description,
                    rarity
                }])
                .select()
                .single();

            if (error) throw error;
            setGifts(prev => [data, ...prev]);
            return { success: true, data };
        } catch (error) {
            console.error('Error adding gift:', error);
            return { success: false, error: error.message };
        }
    };

    const deleteGift = async (giftId) => {
        try {
            const { error } = await supabase
                .from('partner_gifts')
                .delete()
                .eq('id', giftId)
                .eq('created_by', user.id);

            if (error) throw error;
            setGifts(prev => prev.filter(g => g.id !== giftId));
            return { success: true };
        } catch (error) {
            console.error('Error deleting gift:', error);
            return { success: false, error: error.message };
        }
    };

    return { gifts, loading, addGift, deleteGift, refreshGifts: fetchGifts };
};
