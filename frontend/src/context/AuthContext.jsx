import React, { createContext, useState, useEffect, useContext } from 'react';
import { jwtDecode } from "jwt-decode";
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('auth_token'));
    const [lastUsername, setLastUsername] = useState(null);
    const [lastPassword, setLastPassword] = useState(null);
    const [loading, setLoading] = useState(true);

    const normalizeUser = (userData) => {
        if (userData && userData.profile_image && !userData.profile_image.startsWith('http')) {
            const apiUrl = getApiUrl();
            // Ensure we don't double slash
            const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
            const imgPath = userData.profile_image.startsWith('/') ? userData.profile_image : `/${userData.profile_image}`;
            return {
                ...userData,
                profile_image: `${baseUrl}${imgPath}`
            };
        }
        return userData;
    };

    useEffect(() => {
        const initAuth = async () => {
            if (token) {
                try {
                    const decoded = jwtDecode(token);
                    if (decoded.exp * 1000 < Date.now()) {
                        logout();
                    } else {
                        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                        // Fetch full user data to get profile images etc. which might not be in JWT
                        try {
                            const apiUrl = getApiUrl();
                            const response = await axios.get(`${apiUrl}/api/profile/`);
                            setUser(normalizeUser(response.data));
                        } catch (e) {
                            // Only fallback to JWT decode if profile fetch fails
                            setUser(normalizeUser(decoded));
                        }
                    }
                } catch (e) {
                    logout();
                }
            }
            setLoading(false);
        };
        initAuth();
    }, [token]);

    const getApiUrl = () => {
        let defaultUrl = 'https://pathfinder-student-portal.onrender.com';
        if (import.meta.env.MODE === 'development') {
            defaultUrl = 'http://127.0.0.1:3001';
        }
        let url = import.meta.env.VITE_API_URL || defaultUrl;
        // Fix for common development connectivity issues: replace localhost with 127.0.0.1
        if (url.includes('localhost')) {
            url = url.replace('localhost', '127.0.0.1');
        }
        return url;
    };

    const login = async (username, password) => {
        try {
            const apiUrl = getApiUrl();
            const response = await axios.post(`${apiUrl}/api/token/`, { username, password });
            const newToken = response.data.access;
            setToken(newToken);
            setLastUsername(username);
            setLastPassword(password);
            localStorage.setItem('auth_token', newToken);
            const decoded = jwtDecode(newToken);
            setUser(normalizeUser(decoded));
            axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            return decoded;
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        }
    };

    const updateProfile = async (formData) => {
        try {
            const apiUrl = getApiUrl();
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            };

            // Explicitly add token from state to headers
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
            } else {
                const localToken = localStorage.getItem('auth_token');
                if (localToken) {
                    config.headers['Authorization'] = `Bearer ${localToken}`;
                }
            }

            const response = await axios.patch(`${apiUrl}/api/profile/`, formData, config);
            const updatedUser = normalizeUser(response.data);
            setUser(prev => ({ ...prev, ...updatedUser }));
            return updatedUser;
        } catch (error) {
            console.error("Profile update failed", error);
            if (error.response?.status === 401) {
                // If unauthorized, could be expired token
                logout();
            }
            throw error;
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        setLastUsername(null);
        setLastPassword(null);
        localStorage.removeItem('auth_token');
        delete axios.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ user, login, updateProfile, logout, loading, isAuthenticated: !!user, getApiUrl, normalizeUser, lastUsername, lastPassword }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
