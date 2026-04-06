import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { jwtDecode } from "jwt-decode";
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('auth_token'));
    const [lastUsername, setLastUsername] = useState(null);
    const [lastPassword, setLastPassword] = useState(null);
    const [loading, setLoading] = useState(true);

    const getApiUrl = useCallback(() => {
        let defaultUrl = 'https://api.studypathportal.in';
        if (import.meta.env.MODE === 'development') {
            defaultUrl = 'http://127.0.0.1:3001';
        }
        let url = import.meta.env.VITE_API_URL || defaultUrl;
        // Fix for common development connectivity issues: replace localhost with 127.0.0.1
        if (url.includes('localhost')) {
            url = url.replace('localhost', '127.0.0.1');
        }
        return url;
    }, []);

    const getRoleLabel = useCallback((type) => {
        const roles = {
            'superadmin': 'Super Admin',
            'admin': 'Administrator',
            'faculty': 'Faculty',
            'teacher': 'Teacher',
            'staff': 'Staff',
            'student': 'Student',
            'parent': 'Parent'
        };
        return roles[type?.toLowerCase()] || (type ? type.charAt(0).toUpperCase() + type.slice(1) : 'User');
    }, []);

    const normalizeUser = useCallback((userData) => {
        if (!userData) return null;
        
        // Ensure user_type is handled correctly
        const type = userData.user_type || userData.role || 'student';
        const normalized = {
            ...userData,
            user_type: type,
            role_label: getRoleLabel(type)
        };

        if (normalized.profile_image) {
            // Debug the raw image path coming from backend
            // If it's already an absolute URL (http, https, or protocol-relative //), use it as is
            if (normalized.profile_image.startsWith('http') || normalized.profile_image.startsWith('//')) {
                return normalized;
            }

            // Otherwise, assumes it is a relative path that needs the API base URL
            const apiUrl = getApiUrl();
            const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
            const imgPath = normalized.profile_image.startsWith('/') ? normalized.profile_image : `/${normalized.profile_image}`;

            normalized.profile_image = `${baseUrl}${imgPath}`;
        }
        
        return normalized;
    }, [getApiUrl, getRoleLabel]);

    useEffect(() => {
        const initAuth = async () => {
            // Enable credentials for CSRF cookies
            axios.defaults.withCredentials = true;

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


    const login = async (username, password) => {
        try {
            const apiUrl = getApiUrl();
            const response = await axios.post(`${apiUrl}/api/token/`, { username, password });
            
            const { access, refresh } = response.data;
            
            setToken(access);
            setLastUsername(username);
            setLastPassword(password);
            
            localStorage.setItem('auth_token', access);
            localStorage.setItem('refresh_token', refresh);
            
            const decoded = jwtDecode(access);
            setUser(normalizeUser(decoded));
            axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
            return decoded;
        } catch (error) {
            console.error("Login failed", error);

            // Extract specific error message from backend
            let errorMessage = 'Invalid username or password';

            if (error.response?.data) {
                const data = error.response.data;

                // Check for specific error messages
                if (data.detail) {
                    errorMessage = data.detail;
                } else if (data.error) {
                    errorMessage = data.error;
                } else if (data.message) {
                    errorMessage = data.message;
                }

                // Check for deactivation-specific errors
                // Only show deactivation message if explicitly mentioned
                if (errorMessage.toLowerCase().includes('account has been deactivated') ||
                    errorMessage.toLowerCase().includes('contact administration')) {
                    errorMessage = 'Your account has been deactivated. Please contact administration.';
                } else if (errorMessage.toLowerCase().includes('no active account')) {
                    // Django's default error for wrong credentials - keep it generic
                    errorMessage = 'Invalid username or password';
                }
            }

            // Throw error with specific message
            const customError = new Error(errorMessage);
            customError.response = error.response;
            throw customError;
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

    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        delete axios.defaults.headers.common['Authorization'];
    }, []);

    // Global Axios Interceptor for 401 errors
    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;
                
                // If the error is 401 and we haven't already tried to refresh
                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;
                    
                    const refreshToken = localStorage.getItem('refresh_token');
                    if (refreshToken) {
                        try {
                            const apiUrl = getApiUrl();
                            const response = await axios.post(`${apiUrl}/api/token/refresh/`, {
                                refresh: refreshToken
                            });
                            
                            const newAccessToken = response.data.access;
                            localStorage.setItem('auth_token', newAccessToken);
                            setToken(newAccessToken);
                            
                            // Re-run original request with new token
                            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                            axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                            
                            return axios(originalRequest);
                        } catch (refreshError) {
                            console.error("Session expired. Please log in again.", refreshError);
                            logout();
                            return Promise.reject(refreshError);
                        }
                    } else {
                        logout();
                    }
                }
                return Promise.reject(error);
            }
        );
        return () => axios.interceptors.response.eject(interceptor);
    }, [logout, getApiUrl]);


    const refreshUser = useCallback(async () => {
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/profile/`);
            const normalized = normalizeUser(response.data);
            setUser(normalized);
            return normalized;
        } catch (e) {
            console.error("Failed to refresh user profile", e);
            return null;
        }
    }, [getApiUrl, normalizeUser]);

    return (
        <AuthContext.Provider value={{ token, user, login, updateProfile, refreshUser, logout, loading, isAuthenticated: !!user, getApiUrl, normalizeUser, lastUsername, lastPassword }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
