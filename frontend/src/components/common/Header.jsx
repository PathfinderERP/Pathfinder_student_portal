import React from 'react';
import { Menu, Sun, Moon, LogOut } from 'lucide-react';

const Header = ({ title, subtitle, isSidebarOpen, setSidebarOpen, isDarkMode, toggleTheme, user, logout, actions }) => {
    return (
        <header className={`h-20 flex items-center justify-between px-8 border-b transition-colors duration-300
            ${isDarkMode ? 'bg-[#0B0E14] border-white/5' : 'bg-white border-slate-200/40'}`}>

            <div className="flex items-center gap-4 lg:gap-6">
                <button
                    onClick={() => setSidebarOpen(true)}
                    className={`lg:hidden p-2 rounded-lg transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    <Menu size={22} />
                </button>
                <div className="block">
                    <h1 className={`text-xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-[#0F172A]'}`}>
                        {title}
                    </h1>
                    <p className={`text-[11px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {subtitle}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-6">
                {actions}

                <button onClick={toggleTheme} className={`p-2 rounded-lg transition-all ${isDarkMode ? 'text-yellow-400 hover:bg-yellow-400/10' : 'text-slate-500 hover:bg-slate-100'}`}>
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <div className={`flex items-center gap-3 pl-6 border-l h-8 ${isDarkMode ? 'border-white/20' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <div className={`text-xs font-black leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}
                            </div>
                            <div className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                {user?.user_type === 'student' ? `ID: ${user?.username}` : ''}
                            </div>
                            <div className={`text-[10px] font-black uppercase tracking-tighter ${user?.user_type === 'superadmin' ? 'text-orange-600' :
                                user?.user_type === 'admin' ? 'text-orange-400' :
                                    user?.user_type === 'student' ? 'text-blue-500' :
                                        user?.user_type === 'parent' ? 'text-emerald-500' :
                                            'text-slate-500'
                                }`}>
                                {user?.user_type === 'superadmin' ? 'SUPERADMIN' :
                                    user?.user_type === 'admin' ? 'ADMIN' :
                                        user?.user_type === 'student' ? 'STUDENT' :
                                            user?.user_type === 'parent' ? 'PARENT' :
                                                user?.user_type || 'User'}
                            </div>
                        </div>
                        <div className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all duration-300 ${isDarkMode ? 'border-white/10' : 'border-slate-100'}`}>
                            {user?.profile_image ? (
                                <img src={user.profile_image} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className={`w-full h-full flex items-center justify-center font-black text-sm ${isDarkMode ? 'bg-orange-900/20 text-orange-500' : 'bg-orange-50 text-orange-600'}`}>
                                    {user?.username?.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>
                    <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                        <LogOut size={20} />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
