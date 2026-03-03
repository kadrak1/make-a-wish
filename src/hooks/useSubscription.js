import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

export const useSubscription = () => {
    const { user } = useAuth();
    const [status, setStatus] = useState('free'); // 'free' | 'premium'
    const [expiresAt, setExpiresAt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [redeeming, setRedeeming] = useState(false);

    const fetchSubscription = useCallback(async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('status, expires_at')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                // Проверить не истекла ли подписка
                const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
                setStatus(isExpired ? 'free' : data.status);
                setExpiresAt(data.expires_at);
            } else {
                setStatus('free');
                setExpiresAt(null);
            }
        } catch (error) {
            console.error('Error fetching subscription:', error);
            setStatus('free');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchSubscription();
    }, [fetchSubscription]);

    const isPremium = status === 'premium' && (!expiresAt || new Date(expiresAt) > new Date());

    const redeemPromoCode = useCallback(async (code) => {
        if (!user || !code.trim()) {
            return { success: false, error: 'Введите промокод' };
        }

        setRedeeming(true);
        try {
            const { data, error } = await supabase
                .rpc('redeem_promo_code', {
                    p_user_id: user.id,
                    p_code: code.trim()
                });

            if (error) throw error;

            if (data.success) {
                await fetchSubscription();
                return {
                    success: true,
                    message: `Premium активирован на ${data.duration_days} дней!`,
                    expiresAt: data.expires_at
                };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Error redeeming promo code:', error);
            return { success: false, error: error.message };
        } finally {
            setRedeeming(false);
        }
    }, [user, fetchSubscription]);

    // Форматировать дату истечения
    const expiresAtFormatted = expiresAt
        ? new Date(expiresAt).toLocaleDateString('ru-RU', {
            day: 'numeric', month: 'long', year: 'numeric'
          })
        : null;

    return {
        isPremium,
        status,
        expiresAt,
        expiresAtFormatted,
        loading,
        redeeming,
        redeemPromoCode,
        refreshSubscription: fetchSubscription
    };
};
