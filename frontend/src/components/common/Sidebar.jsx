import React, { useState } from 'react';
import { LogOut, ChevronsLeft, ChevronDown } from 'lucide-react';

const Sidebar = ({ items, user, isOpen, setOpen, isDarkMode, logout, accentColor = 'orange' }) => {
    const [expandedItems, setExpandedItems] = useState({});

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
                    if (subItem.subItems) {
                        subItem.subItems.forEach(nested => {
                            if (nested.active) {
                                newExpanded[item.label] = true;
                                newExpanded[subItem.label] = true;
                            }
                        });
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

    // Color mapping for dynamic classes
    const colors = {
        orange: {
            bg: 'bg-orange-600',
            hover: 'hover:bg-orange-700',
            text: 'text-orange-500',
            textLight: 'text-orange-600',
            activeBgLight: 'bg-orange-600/5',
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
        }
    }[accentColor] || {
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

    return (
        <aside
            className={`fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out border-r
            ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-[#F8FAFC] border-slate-200/40 shadow-[4px_0_24px_rgba(0,0,0,0.01)]'} 
            ${isOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full lg:w-22 lg:translate-x-0"}`}
        >
            <div className="flex flex-col h-full">
                {/* Logo Section */}
                <div className={`flex items-center h-20 px-6 border-b ${isDarkMode ? 'border-white/5' : 'border-gray-100'} ${isOpen ? "justify-between" : "justify-center"}`}>
                    <div className={`flex items-center ${isOpen ? "space-x-4" : ""}`}>
                        <button
                            onClick={() => setOpen(!isOpen)}
                            className={`w-10 h-10 ${colors.bg} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${colors.shadow} ${colors.hover} transition-colors`}
                        >
                            <span className="text-white font-black text-2xl">P</span>
                        </button>
                        <span className={`text-xl font-bold tracking-tight transition-opacity duration-200 ${isDarkMode ? 'text-white' : 'text-slate-900'} ${isOpen ? "opacity-100" : "hidden opacity-0 w-0 overflow-hidden"}`}>Pathfinder</span>
                    </div>
                </div>

                {/* Navigation Section */}
                <nav className="flex-1 overflow-y-auto pt-6 pb-4 px-4 space-y-2 custom-scrollbar">
                    {items.map((item, index) => {
                        const hasSubItems = item.subItems && item.subItems.length > 0;
                        const isExpanded = expandedItems[item.label];

                        return (
                            <div key={index} className="space-y-1">
                                <button
                                    onClick={() => {
                                        if (hasSubItems) {
                                            toggleExpand(item.label);
                                        }
                                        if (item.onClick) {
                                            item.onClick();
                                        }
                                        if (!hasSubItems && window.innerWidth < 1024) {
                                            setOpen(false);
                                        }
                                    }}
                                    className={`w-full flex items-center py-2.5 rounded-xl transition-all duration-200 group 
                                    ${isOpen ? "px-4" : "px-2 justify-center"} 
                                    ${item.active
                                            ? (isDarkMode ? `${colors.lightBg} ${colors.text}` : `${colors.activeBgLight} ${colors.textLight}`)
                                            : (isDarkMode ? "text-slate-400 hover:bg-white/5 hover:text-slate-200" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900")
                                        }`}
                                >
                                    <item.icon
                                        size={22}
                                        strokeWidth={item.active ? 2.5 : 2}
                                        className={`transition-all duration-200 flex-shrink-0 ${isOpen ? "mr-3.5" : "mr-0"} 
                                        ${item.active
                                                ? (isDarkMode ? colors.text : colors.textLight)
                                                : (isDarkMode ? "text-slate-500 group-hover:text-slate-400" : "text-slate-400 group-hover:text-slate-600")
                                            }`}
                                    />
                                    <span className={`whitespace-nowrap text-[15px] font-semibold transition-opacity duration-200 ${isOpen ? "opacity-100" : "hidden opacity-0 w-0 overflow-hidden"}`}>
                                        {item.label}
                                    </span>

                                    {isOpen && hasSubItems && (
                                        <ChevronDown
                                            size={16}
                                            className={`ml-auto transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                        />
                                    )}

                                    {item.active && isOpen && !hasSubItems && (
                                        <span className={`ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 ${isDarkMode ? `${colors.bg} ${colors.glow}` : colors.bg}`} />
                                    )}
                                </button>

                                {/* Sub Items */}
                                {isOpen && hasSubItems && isExpanded && (
                                    <div className={`ml-10 space-y-1.5 border-l ${colors.subBorder} pl-5 py-2`}>
                                        {item.subItems.map((subItem, subIndex) => {
                                            const hasNestedSubs = subItem.subItems && subItem.subItems.length > 0;
                                            const isNestedExpanded = expandedItems[subItem.label];

                                            return (
                                                <div key={subIndex} className="space-y-1">
                                                    <button
                                                        onClick={() => {
                                                            if (hasNestedSubs) toggleExpand(subItem.label);
                                                            if (subItem.onClick) subItem.onClick();
                                                            if (!hasNestedSubs && window.innerWidth < 1024) {
                                                                setOpen(false);
                                                            }
                                                        }}
                                                        className={`w-full flex items-center gap-3 py-1.5 text-[13px] font-medium rounded-lg transition-all duration-200
                                                        ${subItem.active
                                                                ? (isDarkMode ? colors.text : colors.textLight)
                                                                : (isDarkMode ? "text-slate-500 hover:text-white" : "text-slate-500 hover:text-slate-900")
                                                            }`}
                                                    >
                                                        {subItem.icon && (
                                                            <subItem.icon
                                                                size={16}
                                                                className={`flex-shrink-0 ${subItem.active
                                                                    ? (isDarkMode ? colors.text : colors.textLight)
                                                                    : (isDarkMode ? "text-slate-500" : "text-slate-400")
                                                                    }`}
                                                            />
                                                        )}
                                                        <span className="flex-1 text-left whitespace-nowrap">{subItem.label}</span>
                                                        {hasNestedSubs && (
                                                            <ChevronDown
                                                                size={14}
                                                                className={`transition-transform duration-200 ${isNestedExpanded ? 'rotate-180' : ''}`}
                                                            />
                                                        )}
                                                    </button>

                                                    {hasNestedSubs && isNestedExpanded && (
                                                        <div className={`ml-4 space-y-1 border-l ${colors.subBorder} pl-4 py-1.5`}>
                                                            {subItem.subItems.map((nestedItem, nestedIndex) => (
                                                                <button
                                                                    key={nestedIndex}
                                                                    onClick={() => {
                                                                        if (nestedItem.onClick) nestedItem.onClick();
                                                                        if (window.innerWidth < 1024) {
                                                                            setOpen(false);
                                                                        }
                                                                    }}
                                                                    className={`w-full flex items-center py-1.5 text-[12px] font-medium rounded-lg transition-all duration-200
                                                                    ${nestedItem.active
                                                                            ? (isDarkMode ? colors.text : colors.textLight)
                                                                            : (isDarkMode ? "text-slate-600 hover:text-slate-300" : "text-slate-500 hover:text-slate-800")
                                                                        }`}
                                                                >
                                                                    {nestedItem.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* Footer Section */}
                <div className={`p-4 border-t ${isDarkMode ? 'border-white/5' : 'border-slate-200/40'}`}>
                    <div className={`flex items-center p-3 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-white shadow-lg shadow-slate-200/50 border border-slate-100'} ${isOpen ? "" : "justify-center"}`}>
                        <div className={`w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center font-bold flex-shrink-0 border-2 ${isDarkMode ? `${colors.lightBg} ${colors.text} border-white/5` : `${colors.lightBg} ${colors.textLight} border-white`}`}>
                            {user?.profile_image ? (
                                <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span>{user?.first_name?.charAt(0) || user?.username?.charAt(0) || "U"}</span>
                            )}
                        </div>
                        <div className={`ml-3 overflow-hidden transition-all duration-200 ${isOpen ? "opacity-100 w-auto" : "hidden opacity-0 w-0"}`}>
                            <p className={`text-sm font-semibold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {user?.first_name || user?.username || "User"}
                            </p>
                            <p className={`text-xs font-medium truncate ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                {user?.role || "Faculty"}
                            </p>
                        </div>
                    </div>
                    {isOpen && (
                        <button onClick={logout} className={`mt-4 w-full flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors ${isDarkMode ? 'text-slate-500 hover:text-red-400' : 'text-slate-500 hover:text-red-600'}`}>
                            <LogOut size={18} />
                            <span>Sign Out</span>
                        </button>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
