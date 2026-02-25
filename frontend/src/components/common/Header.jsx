import React, { useState, useRef, useEffect } from 'react';
import { Menu, Sun, Moon, LogOut, User, ChevronDown } from 'lucide-react';

const Header = ({ title, subtitle, isSidebarOpen, setSidebarOpen, isDarkMode, toggleTheme, user, logout, actions }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className={`h-20 flex items-center justify-between px-3 lg:px-8 border-b transition-colors duration-300 relative z-40
            ${isDarkMode ? 'bg-[#0B0E14] border-white/5' : 'bg-white border-slate-200/40'}`}>

            <div className="flex items-center gap-3 lg:gap-6">
                <button
                    onClick={() => setSidebarOpen(true)}
                    className={`lg:hidden p-2 rounded-lg transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    <Menu size={22} />
                </button>
                <div className="block max-w-[150px] sm:max-w-none">
                    <h1 className={`text-lg sm:text-xl font-black tracking-tight truncate ${isDarkMode ? 'text-white' : 'text-[#0F172A]'}`}>
                        {title}
                    </h1>
                    <p className={`text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider truncate ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {subtitle}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2 lg:gap-6">
                {actions}

                <button onClick={toggleTheme} className={`p-2 rounded-lg transition-all ${isDarkMode ? 'text-yellow-400 hover:bg-yellow-400/10' : 'text-slate-500 hover:bg-slate-100'}`}>
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className={`flex items-center gap-2 p-1 rounded-xl transition-all duration-300 group
                            ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}
                        `}
                    >
                        <div className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all duration-300 
                            ${isDarkMode ? 'border-white/10 group-hover:border-orange-500/30' : 'border-slate-100 group-hover:border-orange-500/20'}`}>
                            {user?.profile_image ? (
                                <img src={user.profile_image} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className={`w-full h-full flex items-center justify-center font-black text-sm ${isDarkMode ? 'bg-orange-900/20 text-orange-500' : 'bg-orange-50 text-orange-600'}`}>
                                    {user?.username?.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 hidden sm:block ${isProfileOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Profile Dropdown */}
                    {isProfileOpen && (
                        <div className={`absolute right-0 mt-2 w-64 rounded-2xl shadow-2xl border transition-all duration-300 animate-in fade-in zoom-in slide-in-from-top-2
                            ${isDarkMode ? 'bg-[#151921] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>

                            {/* Profile Header */}
                            <div className="p-4 border-b border-inherit">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-xl overflow-hidden border-2 flex-shrink-0 ${isDarkMode ? 'border-white/10' : 'border-slate-100'}`}>
                                        {user?.profile_image ? (
                                            <img src={user.profile_image} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className={`w-full h-full flex items-center justify-center font-black text-lg ${isDarkMode ? 'bg-orange-900/20 text-orange-500' : 'bg-orange-50 text-orange-600'}`}>
                                                {user?.username?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className={`text-sm font-black truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}
                                        </p>
                                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                            {user?.user_type || 'User'} {user?.username ? `• ${user.username}` : ''}
                                        </p>
                                        <div className={`text-[10px] font-black uppercase tracking-tighter ${user?.user_type === 'superadmin' ? 'text-orange-600' :
                                            user?.user_type === 'admin' ? 'text-orange-400' :
                                                user?.user_type === 'student' ? 'text-blue-500' :
                                                    user?.user_type === 'parent' ? 'text-emerald-500' :
                                                        'text-slate-500'
                                            }`}>
                                            {user?.user_type?.toUpperCase() || 'USER'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Dropdown Actions */}
                            <div className="p-2 space-y-1">
                                <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors
                                    ${isDarkMode ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-orange-600'}`}>
                                    <User size={18} />
                                    <span>Profile Settings</span>
                                </button>

                                <div className={`h-px mx-2 my-1 ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />

                                <button
                                    onClick={() => {
                                        setIsProfileOpen(false);
                                        logout();
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors
                                    ${isDarkMode ? 'text-red-400/80 hover:bg-red-500/10 hover:text-red-400' : 'text-red-500 hover:bg-red-50 hover:text-red-600'}`}>
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
