import React, { useState, useMemo } from 'react';
import { Bell, Info, AlertTriangle, CheckCircle, Clock, Search, Filter, Check, Trash2, Shield, BookOpen, Sparkles, MessageSquare } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const TeacherNotifications = () => {
    const { isDarkMode } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('ALL');
    
    // Initial notifications state
    const [notifications, setNotifications] = useState([
        {
            id: 1,
            type: 'info',
            category: 'ACADEMIC',
            title: 'Curriculum & Study Material Upload',
            msg: 'New NEET-A Phase 2 Physics & Chemistry revision modules uploaded by Admin HOD. Please review and allot homework.',
            time: '10 mins ago',
            read: false,
            badge: 'Curriculum'
        },
        {
            id: 2,
            type: 'warn',
            category: 'SYSTEM',
            title: 'Scheduled ERP System Maintenance',
            msg: 'ERP database server maintenance scheduled tonight from 11:30 PM to 12:00 AM IST. Portal access may be briefly interrupted.',
            time: '2 hours ago',
            read: false,
            badge: 'System Alert'
        },
        {
            id: 3,
            type: 'success',
            category: 'ATTENDANCE',
            title: 'Attendance & Performance Verified',
            msg: 'February class attendance metrics and student rating logs for Raiganj & Hazra branches have been successfully verified.',
            time: '1 day ago',
            read: true,
            badge: 'Verified'
        },
        {
            id: 4,
            type: 'memo',
            category: 'MEMO',
            title: 'Private Department Memo from HOD',
            msg: 'HOD Academic issued a reminder regarding upcoming JEE Phase Test evaluation standards and solution key submission.',
            time: '2 days ago',
            read: true,
            badge: 'HOD Memo'
        },
        {
            id: 5,
            type: 'info',
            category: 'ACADEMIC',
            title: 'Test Allotment Notification',
            msg: 'FOUNDATION CLASS 7 CLAP TEST 1 responses are now finalized. You can view the live Topper Rank standings under Topper Ranks tab.',
            time: '3 days ago',
            read: true,
            badge: 'Test Published'
        }
    ]);

    const theme = {
        card: isDarkMode ? 'bg-slate-900/60 border-white/10 shadow-2xl backdrop-blur-xl' : 'bg-white border-slate-200 shadow-md',
        text: isDarkMode ? 'text-white' : 'text-slate-900',
        subtext: isDarkMode ? 'text-slate-400' : 'text-slate-500',
        border: isDarkMode ? 'border-white/10' : 'border-slate-200'
    };

    const handleMarkAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const handleToggleRead = (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: !n.read } : n));
    };

    const handleDelete = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleClearAll = () => {
        setNotifications([]);
    };

    const filteredNotifications = useMemo(() => {
        return notifications.filter(n => {
            const matchesSearch = searchQuery === '' || 
                n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                n.msg.toLowerCase().includes(searchQuery.toLowerCase());

            if (filterCategory === 'UNREAD') return matchesSearch && !n.read;
            if (filterCategory === 'ACADEMIC') return matchesSearch && n.category === 'ACADEMIC';
            if (filterCategory === 'SYSTEM') return matchesSearch && n.category === 'SYSTEM';
            if (filterCategory === 'MEMO') return matchesSearch && n.category === 'MEMO';
            return matchesSearch;
        });
    }, [notifications, searchQuery, filterCategory]);

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="w-full max-w-none space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 px-3 md:px-8 py-3">
            {/* Top Banner Header */}
            <div className={`p-6 md:p-8 rounded-2xl border ${theme.card} flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6`}>
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 rounded-xl">
                            <Bell size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className={`text-2xl md:text-4xl font-black uppercase tracking-tight ${theme.text}`}>
                                    Faculty Notifications
                                </h1>
                                {unreadCount > 0 && (
                                    <span className="px-3 py-1 bg-cyan-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-full shadow-lg shadow-cyan-500/20">
                                        {unreadCount} New
                                    </span>
                                )}
                            </div>
                            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-1">
                                Real-time academic communications, system updates, and department memos
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <button
                        onClick={handleMarkAllRead}
                        disabled={unreadCount === 0}
                        className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 text-xs font-black uppercase tracking-wider transition-all shadow-sm ${
                            unreadCount > 0
                                ? 'bg-cyan-500 text-slate-950 border-cyan-400 hover:bg-cyan-400 cursor-pointer'
                                : 'bg-slate-500/10 text-slate-400 border-white/5 cursor-not-allowed opacity-60'
                        }`}
                    >
                        <Check size={16} /> Mark All Read
                    </button>
                    {notifications.length > 0 && (
                        <button
                            onClick={handleClearAll}
                            className="px-4 py-2.5 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-2"
                        >
                            <Trash2 size={16} /> Clear All
                        </button>
                    )}
                </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className={`p-4 rounded-2xl border ${theme.card} flex flex-col md:flex-row items-center justify-between gap-4`}>
                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
                    {[
                        { id: 'ALL', label: `All (${notifications.length})` },
                        { id: 'UNREAD', label: `Unread (${unreadCount})` },
                        { id: 'ACADEMIC', label: 'Academic Updates' },
                        { id: 'SYSTEM', label: 'System Alerts' },
                        { id: 'MEMO', label: 'HOD Memos' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterCategory(tab.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap border ${
                                filterCategory === tab.id
                                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 shadow-sm'
                                    : isDarkMode
                                        ? 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search notifications..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 text-xs font-bold rounded-xl border outline-none transition-all ${
                            isDarkMode
                                ? 'bg-white/5 border-white/10 focus:border-cyan-500/50 text-white placeholder-slate-500'
                                : 'bg-slate-50 border-slate-200 focus:border-cyan-400 text-slate-900 placeholder-slate-400'
                        }`}
                    />
                </div>
            </div>

            {/* Notification List */}
            <div className="space-y-4">
                {filteredNotifications.length === 0 ? (
                    <div className={`p-12 rounded-2xl border ${theme.card} text-center space-y-3`}>
                        <div className="w-16 h-16 rounded-full bg-cyan-500/10 text-cyan-500 flex items-center justify-center mx-auto">
                            <Bell size={28} />
                        </div>
                        <h3 className={`text-lg font-black uppercase tracking-tight ${theme.text}`}>No Notifications Found</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider max-w-md mx-auto">
                            {searchQuery ? 'No alerts matching your search criteria.' : 'All caught up! You have read all notifications.'}
                        </p>
                    </div>
                ) : (
                    filteredNotifications.map((n) => (
                        <div
                            key={n.id}
                            onClick={() => handleToggleRead(n.id)}
                            className={`p-5 md:p-6 rounded-2xl border ${theme.card} relative overflow-hidden group hover:border-cyan-500/40 transition-all cursor-pointer shadow-lg ${
                                !n.read ? (isDarkMode ? 'bg-cyan-500/[0.04]' : 'bg-cyan-50/50') : ''
                            }`}
                        >
                            {/* Left Accent Indicator */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                                n.type === 'warn' ? 'bg-rose-500' :
                                n.type === 'success' ? 'bg-emerald-500' :
                                n.type === 'memo' ? 'bg-violet-500' : 'bg-cyan-500'
                            }`} />

                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className={`p-3 rounded-xl shrink-0 mt-0.5 ${
                                        n.type === 'warn' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                                        n.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                        n.type === 'memo' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' :
                                        'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                    }`}>
                                        {n.type === 'info' && <BookOpen size={20} />}
                                        {n.type === 'warn' && <AlertTriangle size={20} />}
                                        {n.type === 'success' && <CheckCircle size={20} />}
                                        {n.type === 'memo' && <MessageSquare size={20} />}
                                    </div>

                                    <div className="space-y-1.5 flex-1">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h3 className={`text-sm md:text-base font-black uppercase tracking-tight ${theme.text}`}>
                                                {n.title}
                                            </h3>
                                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                                n.type === 'warn' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30' :
                                                n.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' :
                                                n.type === 'memo' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/30' :
                                                'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                                            }`}>
                                                {n.badge}
                                            </span>
                                            {!n.read && (
                                                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" title="Unread" />
                                            )}
                                        </div>
                                        <p className="text-xs md:text-sm font-medium text-slate-400 dark:text-slate-300 leading-relaxed">
                                            {n.msg}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 self-end md:self-center shrink-0">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
                                        <Clock size={14} className="text-slate-400" /> {n.time}
                                    </span>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                                        title="Delete Notification"
                                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default TeacherNotifications;
