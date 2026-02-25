import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const PortalLayout = ({ children, sidebarItems, title, subtitle, headerActions }) => {
    const { user, logout } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const [isSidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);

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
        <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-[#0B0E14] text-white' : 'bg-white text-slate-800'}`}>
            <Sidebar
                items={sidebarItems}
                user={user}
                isOpen={isSidebarOpen}
                setOpen={setSidebarOpen}
                isDarkMode={isDarkMode}
                logout={logout}
            />

            {/* Backdrop for mobile */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

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

                <main className="flex-1 overflow-auto px-2 py-4 sm:px-4 sm:py-6 lg:p-8 scrollbar-thin">
                    <div className="max-w-[1400px] mx-auto space-y-4 sm:space-y-6 lg:space-y-8 animate-fade-in-up">
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
