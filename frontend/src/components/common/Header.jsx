import React, { useState, useRef, useEffect } from 'react';
import { Menu, Sun, Moon, LogOut, User, ChevronDown, Bell, FileText, Calendar, CheckCircle2 } from 'lucide-react';

const Header = ({ title, subtitle, isSidebarOpen, setSidebarOpen, isDarkMode, toggleTheme, user, logout, actions, accentColor = 'orange', onNoticeClick }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const notificationsRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
                setIsNotificationsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const colors = {
        orange: {
            text: 'text-orange-500',
            textLight: 'text-orange-600',
            bg: 'bg-orange-50',
            darkBg: 'bg-orange-900/20',
            border: 'group-hover:border-orange-500/30'
        },
        cyan: {
            text: 'text-cyan-400',
            textLight: 'text-cyan-600',
            bg: 'bg-cyan-50',
            darkBg: 'bg-cyan-500/10',
            border: 'group-hover:border-cyan-500/30'
        }
    }[accentColor] || {
        text: 'text-orange-500',
        textLight: 'text-orange-600',
        bg: 'bg-orange-50',
        darkBg: 'bg-orange-900/20',
        border: 'group-hover:border-orange-500/30'
    };

    return (
        <header className={`h-20 flex items-center justify-between px-3 lg:px-8 border-b transition-colors duration-300 relative z-40
            ${isDarkMode ? 'bg-[#0B0E14] border-white/5' : 'bg-white border-slate-200/40'}`}>

            <div className="flex items-center gap-3 lg:gap-6">
                <button
                    onClick={() => setSidebarOpen(true)}
                    className={`md:hidden p-2 rounded-[5px] transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    <Menu size={22} />
                </button>
                <div className="block max-w-[150px] sm:max-w-none">
                    <h1 className={`text-lg sm:text-xl font-semibold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {title}
                    </h1>
                    <p className={`text-xs font-medium truncate mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {subtitle}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2 lg:gap-5">
                {actions}

                <div className="flex items-center gap-2">
                    <div className="relative" ref={notificationsRef}>
                        <button 
                            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                            className={`p-2 rounded-[5px] transition-all relative group ${isDarkMode ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-500 hover:bg-slate-100'} ${isNotificationsOpen ? (isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-900') : ''}`}
                        >
                            <Bell size={20} />
                        </button>

                        {/* Notifications Dropdown - Refined Premium Design */}
                        {isNotificationsOpen && (
                            <div className={`absolute right-0 mt-3 w-[380px] rounded-[12px] shadow-2xl border transition-all duration-500 animate-in fade-in zoom-in slide-in-from-top-2 z-50 overflow-hidden
                                ${isDarkMode ? 'bg-[#10141D]/95 border-white/5 shadow-black/60 backdrop-blur-xl' : 'bg-white/95 border-slate-100 shadow-slate-300/50 backdrop-blur-xl'}`}>
                                
                                <div className="p-5 border-b border-inherit flex items-center justify-between bg-linear-to-r from-transparent to-orange-500/5">
                                    <div>
                                        <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Notifications</h3>
                                        <p className={`text-[9px] font-bold mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>You have 2 unread updates</p>
                                    </div>
                                    <button className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full transition-all ${isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`}>
                                        Mark all as read
                                    </button>
                                </div>

                                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                    {/* Notification Item 1 */}
                                    <div className={`p-5 border-b border-slate-100 dark:border-white/5 cursor-pointer transition-all duration-300 group ${isDarkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50/50'}`}>
                                        <div className="flex gap-4">
                                            <div className={`w-10 h-10 rounded-[10px] shrink-0 flex items-center justify-center transition-transform group-hover:scale-110 ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-500'}`}>
                                                <FileText size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-500">Exam Update</span>
                                                    <span className="text-[9px] font-bold text-slate-500">2h ago</span>
                                                </div>
                                                <p className={`text-[12px] font-black leading-snug mb-1 truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Mock Test Series - WBJEE Pattern 2026</p>
                                                <p className={`text-[11px] leading-relaxed line-clamp-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>The official mock test series for WBJEE 2026 begins this Sunday. Download the syllabus now.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Notification Item 2 */}
                                    <div className={`p-5 border-b border-slate-100 dark:border-white/5 cursor-pointer transition-all duration-300 group ${isDarkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50/50'}`}>
                                        <div className="flex gap-4">
                                            <div className={`w-10 h-10 rounded-[10px] shrink-0 flex items-center justify-center transition-transform group-hover:scale-110 ${isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-500'}`}>
                                                <Calendar size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-orange-500">Academic Notice</span>
                                                    <span className="text-[9px] font-bold text-slate-500">5h ago</span>
                                                </div>
                                                <p className={`text-[12px] font-black leading-snug mb-1 truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Holiday Notice - Bengali New Year</p>
                                                <p className={`text-[11px] leading-relaxed line-clamp-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Physical centers will remain closed on April 14th and 15th. Online support is available.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-inherit border-t border-inherit">
                                    <button 
                                        onClick={() => {
                                            if (onNoticeClick) {
                                                onNoticeClick();
                                                setIsNotificationsOpen(false);
                                            }
                                        }}
                                        className={`w-full py-3 rounded-[8px] text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2
                                        ${isDarkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}>
                                        View All Notices <ChevronDown size={14} className="-rotate-90" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <button onClick={toggleTheme} className={`p-2 rounded-[5px] transition-all ${isDarkMode ? 'text-yellow-400 hover:bg-yellow-400/10' : 'text-slate-500 hover:bg-slate-100'}`}>
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                </div>

                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className={`flex items-center gap-2 p-1 rounded-[5px] transition-all duration-300 group
                            ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}
                        `}
                    >
                        <div className={`w-10 h-10 rounded-[5px] overflow-hidden border-2 transition-all duration-300 
                            ${isDarkMode ? `border-white/10 ${colors.border}` : `border-slate-100 ${colors.border}`}`}>
                            {user?.profile_image ? (
                                <img src={user.profile_image} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className={`w-full h-full flex items-center justify-center font-semibold text-lg ${isDarkMode ? `${colors.darkBg} ${colors.text}` : `${colors.bg} ${colors.textLight}`}`}>
                                    {user?.first_name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 hidden sm:block ${isProfileOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Profile Dropdown */}
                    {isProfileOpen && (
                        <div className={`absolute right-0 mt-2 w-64 rounded-[5px] shadow-2xl border transition-all duration-300 animate-in fade-in zoom-in slide-in-from-top-2
                            ${isDarkMode ? 'bg-[#151921] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>

                            {/* Profile Header */}
                            <div className="p-4 border-b border-inherit">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-[5px] overflow-hidden border-2 flex-shrink-0 ${isDarkMode ? 'border-white/10' : 'border-slate-100'}`}>
                                        {user?.profile_image ? (
                                            <img src={user.profile_image} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className={`w-full h-full flex items-center justify-center font-black text-lg ${isDarkMode ? `${colors.darkBg} ${colors.text}` : `${colors.bg} ${colors.textLight}`}`}>
                                                {user?.first_name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className={`text-sm font-semibold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}
                                        </p>
                                        <p className={`text-xs mb-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {user?.role_label || 'User'} {user?.username ? `• ${user.username}` : ''}
                                        </p>
                                        <div className={`text-xs font-medium ${isDarkMode ? colors.text : colors.textLight}`}>
                                            {user?.role_label || 'User'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Dropdown Actions */}
                            <div className="p-2 space-y-1">
                                <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[5px] text-sm font-medium transition-colors
                                    ${isDarkMode ? 'text-slate-300 hover:bg-white/5 hover:text-white' : `text-slate-600 hover:bg-slate-50 hover:${colors.textLight}`}`}>
                                    <User size={18} />
                                    <span>Settings</span>
                                </button>

                                <div className={`h-px mx-2 my-1 ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />

                                <button
                                    onClick={() => {
                                        setIsProfileOpen(false);
                                        logout();
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[5px] text-sm font-medium transition-colors
                                    ${isDarkMode ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300' : 'text-red-600 hover:bg-red-50 hover:text-red-700'}`}>
                                    <LogOut size={18} />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
