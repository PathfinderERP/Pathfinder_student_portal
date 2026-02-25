import React, { useState } from 'react';
import { LogOut, ChevronsLeft, ChevronDown } from 'lucide-react';

const Sidebar = ({ items, user, isOpen, setOpen, isDarkMode, logout }) => {
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

    return (
        <aside
            className={`fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out border-r
            ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-[#F8FAFC] border-slate-200/40 shadow-[4px_0_24px_rgba(0,0,0,0.02)]'} 
            ${isOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full lg:w-20 lg:translate-x-0"}`}
        >
            <div className="flex flex-col h-full">
                {/* Logo Section */}
                <div className={`flex items-center h-20 px-4 border-b ${isDarkMode ? 'border-white/5' : 'border-gray-100'} ${isOpen ? "justify-between" : "justify-center"}`}>
                    <div className={`flex items-center ${isOpen ? "space-x-3" : ""}`}>
                        <button
                            onClick={() => setOpen(!isOpen)}
                            className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-600/20 hover:bg-orange-700 transition-colors"
                        >
                            <span className="text-white font-bold text-2xl">P</span>
                        </button>
                        <span className={`text-xl font-bold transition-opacity duration-200 ${isDarkMode ? 'text-white' : 'text-gray-900'} ${isOpen ? "opacity-100" : "hidden opacity-0 w-0 overflow-hidden"}`}>Pathfinder</span>
                    </div>
                    {isOpen && (
                        <button onClick={() => setOpen(false)} className={`p-1.5 rounded-lg transition-all duration-200 ${isDarkMode ? 'text-slate-500 hover:bg-white/5 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}>
                            <ChevronsLeft size={22} />
                        </button>
                    )}
                </div>

                {/* Navigation Section */}
                <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
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
                                        // Close sidebar on mobile when clicking a leaf item
                                        if (!hasSubItems && window.innerWidth < 1024) {
                                            setOpen(false);
                                        }
                                    }}
                                    className={`w-full flex items-center py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group 
                                    ${isOpen ? "px-4" : "px-2 justify-center"} 
                                    ${item.active
                                            ? (isDarkMode ? "bg-orange-900/20 text-orange-500" : "bg-white text-orange-600 shadow-lg shadow-orange-600/10")
                                            : (isDarkMode ? "text-slate-400 hover:bg-white/5 hover:text-white" : "text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-md transition-shadow")
                                        }`}
                                >
                                    <item.icon
                                        size={20}
                                        className={`transition-colors duration-200 flex-shrink-0 ${isOpen ? "mr-3" : "mr-0"} 
                                        ${item.active
                                                ? (isDarkMode ? "text-orange-500" : "text-orange-600")
                                                : (isDarkMode ? "text-slate-500 group-hover:text-slate-400" : "text-gray-400 group-hover:text-gray-500")
                                            }`}
                                    />
                                    <span className={`whitespace-nowrap transition-opacity duration-200 ${isOpen ? "opacity-100" : "hidden opacity-0 w-0 overflow-hidden"}`}>
                                        {item.label}
                                    </span>

                                    {isOpen && hasSubItems && (
                                        <ChevronDown
                                            size={16}
                                            className={`ml-auto transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                        />
                                    )}

                                    {item.active && isOpen && !hasSubItems && (
                                        <span className={`ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 ${isDarkMode ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]' : 'bg-orange-600'}`} />
                                    )}
                                </button>

                                {/* Sub Items */}
                                {isOpen && hasSubItems && isExpanded && (
                                    <div className="ml-9 space-y-1 border-l border-orange-500/20 pl-4 py-1">
                                        {item.subItems.map((subItem, subIndex) => {
                                            const hasNestedSubs = subItem.subItems && subItem.subItems.length > 0;
                                            const isNestedExpanded = expandedItems[subItem.label];

                                            return (
                                                <div key={subIndex} className="space-y-1">
                                                    <button
                                                        onClick={() => {
                                                            if (hasNestedSubs) toggleExpand(subItem.label);
                                                            if (subItem.onClick) subItem.onClick();
                                                            // Close sidebar on mobile when clicking a leaf item
                                                            if (!hasNestedSubs && window.innerWidth < 1024) {
                                                                setOpen(false);
                                                            }
                                                        }}
                                                        className={`w-full flex items-center gap-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                                                        ${subItem.active
                                                                ? (isDarkMode ? "text-orange-500" : "text-orange-600")
                                                                : (isDarkMode ? "text-slate-500 hover:text-white" : "text-gray-500 hover:text-gray-900")
                                                            }`}
                                                    >
                                                        {subItem.icon && (
                                                            <subItem.icon
                                                                size={14}
                                                                className={`flex-shrink-0 ${subItem.active
                                                                    ? (isDarkMode ? "text-orange-500" : "text-orange-600")
                                                                    : (isDarkMode ? "text-slate-500" : "text-gray-400")
                                                                    }`}
                                                            />
                                                        )}
                                                        <span className="flex-1 text-left">{subItem.label}</span>
                                                        {hasNestedSubs && (
                                                            <ChevronDown
                                                                size={14}
                                                                className={`transition-transform duration-200 ${isNestedExpanded ? 'rotate-180' : ''}`}
                                                            />
                                                        )}
                                                    </button>

                                                    {hasNestedSubs && isNestedExpanded && (
                                                        <div className="ml-4 space-y-1 border-l border-orange-500/10 pl-3 py-1">
                                                            {subItem.subItems.map((nestedItem, nestedIndex) => (
                                                                <button
                                                                    key={nestedIndex}
                                                                    onClick={() => {
                                                                        if (nestedItem.onClick) nestedItem.onClick();
                                                                        // Close sidebar on mobile
                                                                        if (window.innerWidth < 1024) {
                                                                            setOpen(false);
                                                                        }
                                                                    }}
                                                                    className={`w-full flex items-center py-1.5 text-xs font-medium rounded-md transition-all duration-200
                                                                    ${nestedItem.active
                                                                            ? (isDarkMode ? "text-orange-400" : "text-orange-500")
                                                                            : (isDarkMode ? "text-slate-600 hover:text-slate-300" : "text-gray-400 hover:text-gray-700")
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
                        <div className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center font-bold flex-shrink-0 border-2 ${isDarkMode ? 'bg-orange-900/30 text-orange-500 border-white/5' : 'bg-orange-100 text-orange-600 border-white'}`}>
                            {user?.profile_image ? (
                                <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span>{user?.username?.charAt(0) || user?.role?.charAt(0) || "U"}</span>
                            )}
                        </div>
                        <div className={`ml-3 overflow-hidden transition-all duration-200 ${isOpen ? "opacity-100 w-auto" : "hidden opacity-0 w-0"}`}>
                            <p className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {user?.username || (user?.role === 'admin' ? 'Admin' : 'User')}
                            </p>
                            <p className={`text-[10px] truncate ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>
                                {user?.email}
                            </p>
                        </div>
                    </div>
                    {isOpen && (
                        <button onClick={logout} className={`mt-4 w-full flex items-center gap-2 px-4 py-2 text-xs font-bold transition-colors ${isDarkMode ? 'text-slate-500 hover:text-red-400' : 'text-gray-500 hover:text-red-600'}`}>
                            <LogOut size={16} />
                            <span>Sign Out</span>
                        </button>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
