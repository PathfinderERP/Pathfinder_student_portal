import React, { useState } from 'react';
import { LogOut, ChevronDown, LayoutGrid, GraduationCap, LineChart, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ items, user, isOpen, setOpen, isDarkMode, logout, accentColor = 'orange', variant = 'standard' }) => {
    const [expandedItems, setExpandedItems] = useState({});
    const [hoveredTooltip, setHoveredTooltip] = useState(null);
    const isPremium = variant === 'premium';

    React.useEffect(() => {
        const newExpanded = { ...expandedItems };
        items.forEach(item => {
            if (item.active && item.subItems) {
                newExpanded[item.label] = true;
            }
            if (item.subItems) {
                item.subItems.forEach(subItem => {
                    if (subItem.active) {
                        newExpanded[item.label] = true;
                        if (subItem.subItems) {
                            newExpanded[subItem.label] = true;
                        }
                    }
                });
            }
        });
        setExpandedItems(newExpanded);
    }, [items]);

    const toggleExpand = (label) => {
        setExpandedItems(prev => ({
            ...prev,
            [label]: !prev[label]
        }));
    };

    // Color mapping - Unified but adaptive
    const getColorConfig = () => {
        const base = {
            orange: {
                bg: 'bg-orange-600',
                hover: 'hover:bg-orange-700',
                text: 'text-orange-500',
                textLight: 'text-orange-600',
                activeBgLight: 'bg-orange-50',
                shadow: 'shadow-orange-600/20',
                glow: 'shadow-[0_0_8px_rgba(249,115,22,0.6)]',
                lightBg: 'bg-orange-900/20',
                subBorder: 'border-orange-500/20'
            },
            cyan: {
                bg: 'bg-cyan-500',
                hover: 'hover:bg-cyan-600',
                text: 'text-cyan-400',
                textLight: 'text-cyan-600',
                activeBgLight: 'bg-cyan-500/5',
                shadow: 'shadow-cyan-500/20',
                glow: 'shadow-[0_0_8px_rgba(6,182,212,0.6)]',
                lightBg: 'bg-cyan-500/10',
                subBorder: 'border-cyan-500/20'
            },
            indigo: {
                bg: 'bg-indigo-600',
                hover: 'hover:bg-indigo-700',
                text: 'text-indigo-400',
                textLight: 'text-indigo-600',
                activeBgLight: 'bg-indigo-500/5',
                shadow: 'shadow-indigo-500/20',
                glow: 'shadow-[0_0_8px_rgba(99,102,241,0.6)]',
                lightBg: 'bg-indigo-500/10',
                subBorder: 'border-indigo-500/20'
            }
        }[isDarkMode && accentColor === 'orange' ? 'indigo' : accentColor] || {
            bg: 'bg-orange-600',
            hover: 'hover:bg-orange-700',
            text: 'text-orange-500',
            textLight: 'text-orange-600',
            activeBgLight: 'bg-orange-600/5',
            shadow: 'shadow-orange-600/20',
            glow: 'shadow-[0_0_8px_rgba(249,115,22,0.6)]',
            lightBg: 'bg-orange-900/20',
            subBorder: 'border-orange-500/20'
        };

        if (isPremium) {
            const premiumAccent = isDarkMode && accentColor === 'orange' ? 'indigo' : 'orange';
            return {
                ...base,
                primary: premiumAccent === 'indigo' ? 'from-indigo-500 to-blue-600' : 'from-orange-500 to-amber-600',
                activeBgPremium: premiumAccent === 'indigo'
                    ? 'bg-transparent border-l-[4px] border-indigo-500 shadow-none'
                    : 'bg-transparent border-l-[4px] border-orange-500 shadow-none',
                glow: 'shadow-none',
            };
        }
        return base;
    };

    const colors = getColorConfig();

    // Premium categorization logic
    const categories = [
        { label: 'MAIN MENU', items: ['Dashboard', 'Nexus Hub'] },
        { label: 'ACADEMICS', items: ['My Profile', 'Classes', 'Attendance', 'Exams', 'Results', 'Study Materials', 'Scholarlab'] },
        { label: 'ANALYTICS & AI', items: ['Performance', 'SWOT Analysis', 'Advanced Analytics', 'AI Insights'] },
        { label: 'SYSTEM', items: ['Grievances', 'Study Planner', 'Notice Board'] }
    ];

    const getGroupedItems = () => {
        if (!isPremium) return { 'DEFAULT': items };

        return items.reduce((acc, item) => {
            const cat = categories.find(c => c.items.includes(item.label))?.label || 'SYSTEM';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(item);
            return acc;
        }, {});
    };

    const groupedItems = getGroupedItems();

    return (
        <>
        <aside
            className={`fixed inset-y-0 left-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] border-r overflow-hidden
            ${isPremium ? 'sidebar-font' : ''}
            ${isPremium
                    ? `${isDarkMode ? 'bg-[#030712]/80 border-white/[0.05]' : 'bg-[#FAFBFC]/80 border-slate-200/50 shadow-[4px_0_40px_rgba(0,0,0,0.02)]'} backdrop-blur-2xl`
                    : `${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-[#F8FAFC] border-slate-200/40 shadow-[4px_0_24px_rgba(0,0,0,0.01)]'}`}
            ${isOpen
                    ? "w-64 translate-x-0"
                    : "w-64 -translate-x-full md:translate-x-0 md:w-20"}
            ${isDarkMode ? 'pl-0' : 'pl-0'}`}
        >
            {/* Premium Decorative elements */}
            {isPremium && isOpen && (
                <div className="absolute inset-0 pointer-events-none opacity-30 overflow-hidden">
                    <motion.div animate={{ x: [0, 50, 0], y: [0, 100, 0] }} transition={{ duration: 20, repeat: Infinity }} className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl ${isDarkMode ? 'bg-indigo-500/10' : 'bg-orange-500/10'}`} />
                    <motion.div animate={{ x: [0, -40, 0], y: [0, -80, 0] }} transition={{ duration: 15, repeat: Infinity }} className="absolute bottom-20 -left-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
                </div>
            )}

            <div className={`flex flex-col h-full relative z-10 ${!isPremium && !isOpen ? 'items-center' : ''}`}>
                {/* Logo Section */}
                <div className={`flex items-center ${isPremium ? 'h-24 pt-4' : 'h-20 border-b'} ${isOpen ? 'px-5' : 'px-0'} ${isDarkMode ? 'border-white/5' : 'border-gray-100'} ${isOpen ? "justify-start" : "justify-center"}`}>
                    <div className={`flex items-center gap-3 w-full ${!isOpen ? 'justify-center' : ''}`}>
                        <div className={`flex items-center gap-3 flex-1 min-w-0 ${!isOpen ? 'justify-center' : ''}`}>
                            {isPremium ? (
                                <button
                                    onClick={() => setOpen(!isOpen)}
                                    className="w-12 h-12 flex items-center justify-center flex-shrink-0 relative overflow-hidden transition-opacity rounded-full"
                                >
                                    <img
                                        src="/images/icon/Pathfinder Logo ICON png96.png"
                                        alt="Logo"
                                        className={`w-10 h-10 object-contain drop-shadow-md relative z-10 transition-all duration-500 rounded-full ${isDarkMode ? 'hue-rotate-[190deg] brightness-110 saturate-150' : ''}`}
                                    />
                                </button>
                            ) : (
                                <button
                                    onClick={() => setOpen(!isOpen)}
                                    className={`w-12 h-12 flex items-center justify-center flex-shrink-0 transition-colors rounded-full `}
                                >
                                    <img
                                        src="/images/icon/Pathfinder Logo ICON png96.png"
                                        alt="Logo"
                                        className={`w-12 h-8 object-contain drop-shadow-md relative z-10 transition-all duration-500 rounded-full ${isDarkMode ? 'hue-rotate-[190deg] brightness-110 saturate-150' : ''}`}
                                    />
                                </button>
                            )}

                            <AnimatePresence>
                                {isOpen && (
                                    <motion.div
                                        initial={isPremium ? { opacity: 0, x: -10, filter: 'blur(10px)' } : { opacity: 0 }}
                                        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                                        exit={{ opacity: 0, x: -10, filter: 'blur(10px)' }}
                                        className="flex flex-col flex-1 truncate"
                                    >
                                        <span className={`text-2xl leading-none ${isPremium ? 'font-script font-semibold tracking-normal' : 'font-brand font-semibold tracking-tighter'} ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Pathfinder</span>
                                        {isPremium && (
                                            <span className={`text-[9px] font-black tracking-[0.2em] mt-1 bg-clip-text text-transparent uppercase antialiased font-brand whitespace-nowrap ${isDarkMode ? 'bg-gradient-to-r from-indigo-400 to-blue-500' : 'bg-gradient-to-r from-orange-400 to-amber-500'}`}>
                                                STUDENT HUB
                                            </span>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Toggle button removed as requested - Logo now serves as the primary toggle */}
                    </div>
                </div>

                {/* Navigation Section */}
                <nav className={`flex-1 overflow-y-auto custom-scrollbar ${isPremium ? 'pt-6 pb-6' : 'pt-6 pb-4'} ${isOpen ? 'px-4' : 'px-2'} space-y-1`}>
                    {Object.entries(groupedItems).map(([category, items], catIndex) => (
                        <div key={category} className={isPremium ? "space-y-0" : "space-y-0"}>
                            <div className={isPremium ? "space-y-1.5" : "space-y-1"}>
                                {items.map((item, index) => {
                                    const hasSubItems = item.subItems && item.subItems.length > 0;
                                    const isExpanded = expandedItems[item.label];

                                    return (
                                        <div key={index} className="space-y-1">
                                            {item.active && (
                                                <motion.div
                                                    layoutId="activeIndicator"
                                                    className={`absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-[2px] ${isDarkMode ? colors.bg : colors.bg} z-20 ${colors.glow}`}
                                                    initial={{ opacity: 0, scale: 0 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                />
                                            )}
                                            <motion.button
                                                whileHover={isOpen ? { x: 4 } : {}}
                                                animate={item.active && isOpen ? { x: 4, scale: 1.02 } : { x: 0, scale: 1 }}
                                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                                onClick={() => {
                                                    if (hasSubItems) toggleExpand(item.label);
                                                    if (item.onClick) item.onClick();
                                                    if (!hasSubItems && window.innerWidth < 1024) setOpen(false);
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isOpen) {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setHoveredTooltip({ label: item.label, top: rect.top + rect.height / 2 - 16 });
                                                    }
                                                }}
                                                onMouseLeave={() => setHoveredTooltip(null)}
                                                className={`w-full flex items-center transition-all duration-300 group relative
                                                ${isOpen ? "px-5" : "px-3 justify-center"} 
                                                ${isPremium ? 'py-3.5' : 'py-2.5 rounded-xl'}
                                                ${item.active
                                                        ? (isDarkMode ? "bg-white/5 text-sky-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]" : `${colors.activeBgLight} ${colors.textLight} shadow-[inset_0_0_0_1px_rgba(0,0,0,0.02)]`)
                                                        : (isDarkMode ? "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50")
                                                    }`}
                                            >
                                                <item.icon
                                                    size={isPremium ? 20 : 22}
                                                    strokeWidth={item.active ? 2.5 : (isPremium ? 1.5 : 2)}
                                                    className={`transition-all duration-300 flex-shrink-0 ${isOpen ? "mr-4" : "mr-0"} 
                                                    ${item.active
                                                            ? (isDarkMode ? colors.text : colors.textLight)
                                                            : (isDarkMode ? "text-slate-500 group-hover:text-slate-300" : "text-slate-400 group-hover:text-slate-700")
                                                        }`}
                                                />

                                                <AnimatePresence>
                                                    {isOpen && (
                                                        <motion.div className="flex-1 flex items-center justify-between">
                                                            <motion.span
                                                                initial={isPremium ? { opacity: 0, x: -10 } : { opacity: 0 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                exit={{ opacity: 0, x: -10 }}
                                                                className={`text-[14px] font-bold text-left truncate tracking-tight ${!isPremium ? 'text-[15px] font-semibold' : ''}`}
                                                            >
                                                                {item.label}
                                                            </motion.span>
                                                            {item.active && (
                                                                <motion.div
                                                                    initial={{ scale: 0, rotate: 45 }}
                                                                    animate={{ scale: 1, rotate: 0 }}
                                                                    className={`w-1.5 h-1.5 rounded-[1px] opacity-60 ${isDarkMode ? colors.bg : colors.bg}`}
                                                                />
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                {(isOpen && hasSubItems) && (
                                                    <ChevronDown
                                                        size={16}
                                                        className={`flex-shrink-0 ml-1 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''} ${isDarkMode ? 'text-white/20' : 'text-slate-300'}`}
                                                    />
                                                )}
                                            </motion.button>

                                            <AnimatePresence>
                                                {isOpen && hasSubItems && isExpanded && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className={`ml-9 space-y-1.5 border-l-2 ${isDarkMode ? 'border-white/5' : 'border-slate-100/50'} pl-5 py-2`}
                                                    >
                                                        {item.subItems.map((subItem, subIndex) => {
                                                            const hasDeepSubItems = subItem.subItems && subItem.subItems.length > 0;
                                                            const isDeepExpanded = expandedItems[subItem.label];

                                                            return (
                                                                <div key={subIndex} className="w-full">
                                                                    <button
                                                                        onClick={() => {
                                                                            if (hasDeepSubItems) toggleExpand(subItem.label);
                                                                            if (subItem.onClick) subItem.onClick();
                                                                            if (!hasDeepSubItems && window.innerWidth < 1024) setOpen(false);
                                                                        }}
                                                                        className={`w-full flex items-center gap-3 py-2 text-[13px] font-bold rounded-xl transition-all duration-300
                                                                        ${subItem.active
                                                                                ? (isDarkMode ? "text-sky-300" : colors.textLight)
                                                                                : (isDarkMode ? "text-slate-500 hover:text-white" : "text-slate-500 hover:text-slate-900")
                                                                            } ${!isPremium ? 'font-medium text-[13px]' : ''}`}
                                                                    >
                                                                        <span className="flex-1 text-left truncate">{subItem.label}</span>
                                                                        {subItem.active && (
                                                                            <div className={`w-1 h-1 rounded-[1px] ${isDarkMode ? colors.bg : colors.bg} opacity-60 mr-1`} />
                                                                        )}
                                                                        {(isOpen && hasDeepSubItems) && (
                                                                            <ChevronDown
                                                                                size={14}
                                                                                className={`flex-shrink-0 transition-transform duration-500 ${isDeepExpanded ? 'rotate-180' : ''} ${isDarkMode ? 'text-white/20' : 'text-slate-300'}`}
                                                                            />
                                                                        )}
                                                                    </button>

                                                                    <AnimatePresence>
                                                                        {isOpen && hasDeepSubItems && isDeepExpanded && (
                                                                            <motion.div
                                                                                initial={{ opacity: 0, height: 0 }}
                                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                                exit={{ opacity: 0, height: 0 }}
                                                                                className={`ml-4 mt-1 space-y-1 border-l text-left ${isDarkMode ? 'border-white/5' : 'border-slate-100'} pl-3`}
                                                                            >
                                                                                {subItem.subItems.map((deepItem, deepIndex) => (
                                                                                    <button
                                                                                        key={deepIndex}
                                                                                        onClick={() => {
                                                                                            if (deepItem.onClick) deepItem.onClick();
                                                                                            if (window.innerWidth < 1024) setOpen(false);
                                                                                        }}
                                                                                        className={`w-full flex items-center gap-2 py-1.5 text-[11px] font-bold rounded-lg transition-all duration-300
                                                                                        ${deepItem.active
                                                                                                ? (isDarkMode ? "text-sky-300" : colors.textLight)
                                                                                                : (isDarkMode ? "text-slate-500 hover:text-white" : "text-slate-500 hover:text-slate-900")
                                                                                            } ${!isPremium ? 'font-medium text-[12px]' : ''}`}
                                                                                    >
                                                                                        <span className="flex-1 text-left truncate">{deepItem.label}</span>
                                                                                        {deepItem.active && (
                                                                                            <div className={`w-0.5 h-0.5 rounded-[1px] ${isDarkMode ? colors.bg : colors.bg} opacity-60 mr-1`} />
                                                                                        )}
                                                                                    </button>
                                                                                ))}
                                                                            </motion.div>
                                                                        )}
                                                                    </AnimatePresence>
                                                                </div>
                                                            );
                                                        })}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Footer Section */}
                <div className={`p-6 border-t ${isDarkMode ? 'border-white/[0.05]' : 'border-slate-200/40'}`}>
                    <motion.div
                        whileHover={isPremium ? { y: -5, scale: 1.02 } : { y: -2 }}
                        className={`flex items-center p-3 rounded-2xl ${isPremium ? 'glass-panel shadow-2xl shadow-black/10' : (isDarkMode ? 'bg-white/5' : 'bg-white shadow-lg shadow-slate-200/50 border border-slate-100')} ${isOpen ? "" : "justify-center"}`}
                    >
                        <div className={`rounded-xl overflow-hidden flex items-center justify-center font-black flex-shrink-0 border-2 ${isPremium ? 'w-9 h-9 text-base' : 'w-11 h-11 text-lg'} ${isDarkMode ? `${colors.activeBg} ${colors.text} border-white/[0.1]` : `${colors.activeBg} ${colors.textLight} border-white`}`}>
                            {user?.profile_image ? (
                                <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span>{user?.first_name?.charAt(0) || user?.username?.charAt(0) || "U"}</span>
                            )}
                        </div>
                        <AnimatePresence>
                            {isOpen && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className={`ml-4 overflow-hidden flex-1`}
                                >
                                    <p className={`font-black truncate ${isDarkMode ? 'text-white' : 'text-slate-900'} ${isPremium ? 'text-xs' : 'text-[14px]'} ${!isPremium ? 'text-sm font-semibold' : ''}`}>
                                        {user?.first_name || user?.username || "User"}
                                    </p>
                                    {isPremium ? (
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <p className={`text-[10px] font-black truncate tracking-widest uppercase ${isDarkMode ? 'text-white/40' : 'text-slate-500'}`}>
                                                {user?.role_label || "Student"}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className={`text-xs font-medium truncate ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                            {user?.role_label || "User"}
                                        </p>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {isOpen && (
                        <button
                            onClick={logout}
                            className={`mt-4 w-full flex items-center justify-center gap-2.5 px-4 py-2 transition-all
                            ${isPremium
                                    ? 'text-[10px] font-black uppercase tracking-[0.2em] rounded-2.5xl text-slate-500 hover:text-red-400 hover:bg-red-500/10'
                                    : 'text-sm font-semibold text-slate-500 hover:text-red-600'}`}
                        >
                            <LogOut size={18} />
                            <span>{isPremium ? 'Logout' : 'Sign Out'}</span>
                        </button>
                    )}
                </div>
            </div>
        </aside>
        {/* Global Tooltip for collapsed state */}
        <AnimatePresence>
            {hoveredTooltip && !isOpen && (
                <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className={`fixed z-[100] px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl border pointer-events-none ${isDarkMode ? 'bg-[#1E293B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                    style={{ top: hoveredTooltip.top, left: 88 }}
                >
                    <div className={`absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 rotate-45 border-l border-b ${isDarkMode ? 'bg-[#1E293B] border-white/10' : 'bg-white border-slate-200'}`}></div>
                    <span className="text-xs font-bold relative z-10 tracking-wide">{hoveredTooltip.label}</span>
                </motion.div>
            )}
        </AnimatePresence>
        </>
    );
};

export default Sidebar;
