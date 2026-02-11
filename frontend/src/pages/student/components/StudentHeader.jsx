import React, { useState, useEffect } from 'react';
import { Bell, Search, Moon, Sun, LogOut } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';

const StudentHeader = ({ activeTab }) => {
    const { isDarkMode, toggleTheme } = useTheme();
    const { user, getApiUrl, token } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchUnreadCount = async () => {
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/notices/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Count new notices
            const count = response.data.filter(n => n.is_new).length;
            setUnreadCount(count);
        } catch (error) {
            console.error('Failed to fetch notices count:', error);
        }
    };

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    return (
        <header className={`sticky top-0 z-40 px-6 py-4 rounded-[5px] border transition-all backdrop-blur-md
            ${isDarkMode ? 'bg-[#10141D]/80 border-white/5' : 'bg-white/80 border-slate-100 shadow-sm'}`}>
            <div className="flex items-center justify-between">
                {/* Left: Greeting & Page Title */}
                <div>
                    <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {getGreeting()}
                    </p>
                    <h1 className={`text-2xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {activeTab}
                    </h1>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3">
                    {/* Search */}
                    <button className={`p-3 rounded-[5px] transition-all hover:scale-110 active:scale-95
                        ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-slate-400' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>
                        <Search size={18} strokeWidth={2.5} />
                    </button>

                    {/* Notifications */}
                    <div className="relative">
                        <button className={`relative p-3 rounded-[5px] transition-all hover:scale-110 active:scale-95
                            ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-slate-400' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>
                            <Bell size={18} strokeWidth={2.5} />
                            {unreadCount > 0 && (
                                <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full animate-pulse ring-2 ring-white dark:ring-[#10141D]"></span>
                            )}
                        </button>
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </div>

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className={`p-3 rounded-[5px] transition-all hover:scale-110 active:scale-95
                            ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-yellow-400' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>
                        {isDarkMode ? <Sun size={18} strokeWidth={2.5} /> : <Moon size={18} strokeWidth={2.5} />}
                    </button>

                    {/* User Profile Dropdown */}
                    <div className={`flex items-center gap-3 px-4 py-2 rounded-[5px] border
                        ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="w-8 h-8 rounded-[5px] bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                            {user?.first_name?.[0] || user?.username?.[0] || 'S'}
                        </div>
                        <div className="hidden md:block">
                            <p className={`text-xs font-bold leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {user?.first_name || user?.username || 'Student'}
                            </p>
                            <p className="text-[10px] text-slate-500 leading-none mt-0.5">Student</p>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default StudentHeader;
