import React, { createContext, useState, useEffect, useContext } from 'react';
import { jwtDecode } from "jwt-decode";
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('auth_token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            try {
                const decoded = jwtDecode(token);
                // Check expiry
                if (decoded.exp * 1000 < Date.now()) {
                    logout();
                } else {
                    setUser(decoded);
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                }
            } catch (e) {
                logout();
            }
        }
        setLoading(false);
    }, [token]);

    const login = async (username, password) => {
        try {
            const response = await axios.post('http://127.0.0.1:3001/api/token/', { username, password });
            const newToken = response.data.access;
            setToken(newToken);
            localStorage.setItem('auth_token', newToken);
            const decoded = jwtDecode(newToken);
            setUser(decoded);
            axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            return decoded; // Return user info
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('auth_token');
        delete axios.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
