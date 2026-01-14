import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const PortalLayout = ({ children, sidebarItems, title, subtitle, headerActions }) => {
    const { user, logout } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-[#0B0E14] text-white' : 'bg-white text-slate-800'}`}>
            <Sidebar
                items={sidebarItems}
                user={user}
                isOpen={isSidebarOpen}
                setOpen={setSidebarOpen}
                isDarkMode={isDarkMode}
                logout={logout}
            />

            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarOpen ? "lg:ml-64" : "lg:ml-20"}`}>
                <Header
                    title={title}
                    subtitle={subtitle}
                    isSidebarOpen={isSidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                    isDarkMode={isDarkMode}
                    toggleTheme={toggleTheme}
                    user={user}
                    logout={logout}
                    actions={headerActions}
                />

                <main className="flex-1 overflow-auto p-8 scrollbar-thin">
                    <div className="max-w-[1400px] mx-auto space-y-8 animate-fade-in-up">
                        {children}
                    </div>
                </main>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
};

export default PortalLayout;
