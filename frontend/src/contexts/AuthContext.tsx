"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
    id: number;
    username: string;
    email: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (username: string, password: string) => Promise<boolean>;
    signup: (username: string, email: string, password: string) => Promise<boolean>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for stored token on mount and restore user session
        const storedToken = localStorage.getItem('auth_token');
        if (storedToken) {
            setToken(storedToken);
            // Validate token and restore user
            fetch('http://localhost:8000/api/auth/me', {
                headers: { 'Authorization': `Bearer ${storedToken}` }
            })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data) setUser(data);
                else {
                    // Token is expired/invalid — clear it
                    localStorage.removeItem('auth_token');
                    setToken(null);
                }
            })
            .catch(() => {
                localStorage.removeItem('auth_token');
                setToken(null);
            })
            .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = async (username: string, password: string): Promise<boolean> => {
        try {
            const response = await fetch('http://localhost:8000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                const data = await response.json();
                const tokenValue = data.access_token;
                if (tokenValue) {
                    setToken(tokenValue);
                    localStorage.setItem('auth_token', tokenValue);

                    // ✅ Fetch user profile immediately after login
                    const meRes = await fetch('http://localhost:8000/api/auth/me', {
                        headers: { 'Authorization': `Bearer ${tokenValue}` }
                    });
                    if (meRes.ok) {
                        const userData = await meRes.json();
                        setUser(userData);
                    }
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    };

    const signup = async (username: string, email: string, password: string): Promise<boolean> => {
        try {
            const response = await fetch('http://localhost:8000/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    email,
                    password,
                }),
            });

            return response.ok;
        } catch (error) {
            console.error('Signup error:', error);
            return false;
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('auth_token');
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            login,
            signup,
            logout,
            isLoading
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}