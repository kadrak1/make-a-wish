import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const storedUser = localStorage.getItem('maw_user');
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                // Optimistically set user
                setUser(parsedUser);

                // Re-fetch from Supabase to get latest role/data
                try {
                    const { data, error } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', parsedUser.id)
                        .single();

                    if (data && !error) {
                        setUser(data);
                        localStorage.setItem('maw_user', JSON.stringify(data));
                    }
                } catch (err) {
                    console.error("Error refreshing user data:", err);
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    const login = async (nickname) => {
        setLoading(true);
        try {
            // 1. Check if user exists
            let { data: existingUser, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .eq('nickname', nickname)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "Row not found"
                throw fetchError;
            }

            let currentUser = existingUser;

            // 2. If not, create user
            if (!existingUser) {
                const { data: newUser, error: createError } = await supabase
                    .from('users')
                    .insert([{ nickname }])
                    .select()
                    .single();

                if (createError) throw createError;
                currentUser = newUser;

                // 3. Initialize Game State for new user
                const { error: stateError } = await supabase
                    .from('game_state')
                    .insert([{ user_id: currentUser.id }]);

                if (stateError) throw stateError;
            }

            // 3. Set user state
            setUser(currentUser);
            localStorage.setItem('maw_user', JSON.stringify(currentUser));
            return { success: true };

        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('maw_user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
