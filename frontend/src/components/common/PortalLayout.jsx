import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const PortalLayout = ({ children, sidebarItems, title, subtitle, headerActions, accentColor = 'orange', variant = 'standard' }) => {
    const { user, logout } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const [isSidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);

    const isPremium = variant === 'premium';

    // ... (rest of the component logic)

    // Swipe gesture handling for mobile
    React.useEffect(() => {
        let touchStartX = 0;
        let touchEndX = 0;

        const handleTouchStart = (e) => {
            touchStartX = e.targetTouches[0].clientX;
        };

        const handleTouchMove = (e) => {
            touchEndX = e.targetTouches[0].clientX;
        };

        const handleTouchEnd = () => {
            const swipeDistance = touchEndX - touchStartX;
            const threshold = 100; // minimum distance for swipe
            const edgeThreshold = 50; // must start near left edge

            if (swipeDistance > threshold && touchStartX < edgeThreshold && !isSidebarOpen) {
                setSidebarOpen(true);
            }

            // Re-reset values
            touchStartX = 0;
            touchEndX = 0;
        };

        window.addEventListener('touchstart', handleTouchStart);
        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isSidebarOpen]);

    return (
        <div className={`flex h-screen font-sans overflow-hidden transition-all duration-700 
            ${isPremium 
                ? (isDarkMode ? 'bg-premium-mesh-dark' : 'bg-premium-mesh') 
                : (isDarkMode ? 'bg-[#0B0E14] text-white' : 'bg-white text-slate-800')}`}
        >
            <Sidebar
                items={sidebarItems}
                user={user}
                isOpen={isSidebarOpen}
                setOpen={setSidebarOpen}
                isDarkMode={isDarkMode}
                logout={logout}
                accentColor={accentColor}
                variant={variant}
            />

            {/* Backdrop for mobile */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-md transition-all duration-500"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] 
                ${isSidebarOpen 
                    ? "lg:ml-64" 
                    : "lg:ml-20"}`}>
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
                    accentColor={accentColor}
                />

                <main className={`flex-1 overflow-auto px-4 pb-4 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8 2xl:px-12 scrollbar-thin relative z-10`}>
                    <div className="max-w-[1800px] mx-auto space-y-4 sm:space-y-6 lg:space-y-8 mt-6 lg:mt-10 2xl:mt-12">
                        {children}
                    </div>
                </main>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'};
                    border-radius: 20px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: ${isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'};
                }
                ${isPremium ? `
                main::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    right: 0;
                    width: 400px;
                    height: 400px;
                    background: radial-gradient(circle, ${isDarkMode ? 'rgba(249,115,22,0.03)' : 'rgba(249,115,22,0.02)'} 0%, transparent 70%);
                    pointer-events: none;
                    z-index: -1;
                }
                ` : ''}
            `}</style>
        </div>
    );
};

export default PortalLayout;
