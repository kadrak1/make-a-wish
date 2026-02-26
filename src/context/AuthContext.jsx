import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const heartbeatRef = useRef(null);

    const hashPassword = async (password) => {
        const msgUint8 = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const updateLastSeen = async (userId) => {
        if (!userId) return;
        await supabase
            .from('users')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', userId);
    };

    const startHeartbeat = (userId) => {
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        heartbeatRef.current = setInterval(() => updateLastSeen(userId), 60000);
    };

    const stopHeartbeat = () => {
        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            const storedUser = localStorage.getItem('maw_user');
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);

                try {
                    const { data, error } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', parsedUser.id)
                        .single();

                    if (data && !error) {
                        setUser(data);
                        localStorage.setItem('maw_user', JSON.stringify(data));
                        await updateLastSeen(data.id);
                        startHeartbeat(data.id);
                    }
                } catch (err) {
                    console.error("Error refreshing user data:", err);
                }
            }
            setLoading(false);
        };

        initAuth();
        return () => stopHeartbeat();
    }, []);

    // LOGIN: find user, verify password. Legacy users (null password) get it set on first login.
    const login = async (nickname, password) => {
        try {
            const { data: userData, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .ilike('nickname', nickname)
                .maybeSingle();

            if (fetchError) throw fetchError;

            if (!userData) {
                return { success: false, error: 'Пользователь не найден' };
            }

            const hashedInput = await hashPassword(password);

            if (!userData.password) {
                // Legacy account: set password on first login
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ password: hashedInput })
                    .eq('id', userData.id);
                if (updateError) throw updateError;
                userData.password = hashedInput;
            } else if (userData.password !== hashedInput) {
                return { success: false, error: 'Неверный пароль' };
            }

            await updateLastSeen(userData.id);
            startHeartbeat(userData.id);
            setUser(userData);
            localStorage.setItem('maw_user', JSON.stringify(userData));
            return { success: true };

        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    };

    // SIGNUP: create new account. Fails if nickname already taken.
    const signup = async (nickname, password) => {
        try {
            // Case-insensitive duplicate check
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .ilike('nickname', nickname)
                .maybeSingle();

            if (existingUser) {
                return { success: false, error: 'Никнейм уже занят' };
            }

            const hashedPassword = await hashPassword(password);

            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert([{ nickname, password: hashedPassword }])
                .select()
                .single();

            if (createError) {
                // 23505 = unique_violation from DB index
                if (createError.code === '23505') {
                    return { success: false, error: 'Никнейм уже занят' };
                }
                throw createError;
            }

            const { error: stateError } = await supabase
                .from('game_state')
                .insert([{ user_id: newUser.id }]);

            if (stateError) throw stateError;

            await updateLastSeen(newUser.id);
            startHeartbeat(newUser.id);
            setUser(newUser);
            localStorage.setItem('maw_user', JSON.stringify(newUser));
            return { success: true };

        } catch (error) {
            console.error('Signup error:', error);
            return { success: false, error: error.message };
        }
    };

    const logout = () => {
        stopHeartbeat();
        setUser(null);
        localStorage.removeItem('maw_user');
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
