import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Bell, Info, AlertTriangle, CheckCircle, Clock, Search, Filter, 
    Check, Trash2, Shield, BookOpen, Sparkles, MessageSquare, RefreshCw, 
    ExternalLink, AlertCircle
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';

const TeacherNotifications = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token, user } = useAuth();
    
    const [rawNotifications, setRawNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastSync, setLastSync] = useState(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('ALL');

    const userKey = user?.id || user?.username || user?.email || 'default';
    const READ_KEY = `teacher_read_notifs_${userKey}`;
    const DELETED_KEY = `teacher_deleted_notifs_${userKey}`;

    const [readIds, setReadIds] = useState(() => {
        try {
            const saved = localStorage.getItem(READ_KEY);
            return saved ? new Set(JSON.parse(saved)) : new Set();
        } catch {
            return new Set();
        }
    });

    const [deletedIds, setDeletedIds] = useState(() => {
        try {
            const saved = localStorage.getItem(DELETED_KEY);
            return saved ? new Set(JSON.parse(saved)) : new Set();
        } catch {
            return new Set();
        }
    });

    const saveReadIds = (newSet) => {
        setReadIds(newSet);
        try {
            localStorage.setItem(READ_KEY, JSON.stringify(Array.from(newSet)));
        } catch (e) {
            console.error("Failed to save read notifications:", e);
        }
    };

    const saveDeletedIds = (newSet) => {
        setDeletedIds(newSet);
        try {
            localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(newSet)));
        } catch (e) {
            console.error("Failed to save deleted notifications:", e);
        }
    };

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const tok = token || localStorage.getItem('auth_token');
            const apiUrl = getApiUrl();
            const res = await fetch(`${apiUrl}/api/teacher-portal/notifications/`, {
                headers: tok ? { Authorization: `Bearer ${tok}` } : {}
            });
            if (!res.ok) {
                throw new Error(`Server returned ${res.status}`);
            }
            const data = await res.json();
            setRawNotifications(data.notifications || []);
            setLastSync(new Date());
        } catch (err) {
            console.error("[TeacherNotifications] Fetch error:", err);
            setError(err.message || 'Failed to load notifications');
        } finally {
            setLoading(false);
        }
    }, [getApiUrl, token]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Active notifications excluding deleted ones, with read property attached
    const activeNotifications = useMemo(() => {
        return rawNotifications
            .filter(n => !deletedIds.has(n.id))
            .map(n => ({
                ...n,
                read: readIds.has(n.id)
            }));
    }, [rawNotifications, deletedIds, readIds]);

    const handleMarkAllRead = () => {
        const newSet = new Set(readIds);
        activeNotifications.forEach(n => newSet.add(n.id));
        saveReadIds(newSet);
    };

    const handleToggleRead = (id) => {
        const newSet = new Set(readIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        saveReadIds(newSet);
    };

    const handleDelete = (id) => {
        const newSet = new Set(deletedIds);
        newSet.add(id);
        saveDeletedIds(newSet);
    };

    const handleClearAll = () => {
        const newSet = new Set(deletedIds);
        activeNotifications.forEach(n => newSet.add(n.id));
        saveDeletedIds(newSet);
    };

    const filteredNotifications = useMemo(() => {
        return activeNotifications.filter(n => {
            const q = searchQuery.toLowerCase();
            const matchesSearch = !q || 
                (n.title && n.title.toLowerCase().includes(q)) || 
                (n.msg && n.msg.toLowerCase().includes(q)) ||
                (n.badge && n.badge.toLowerCase().includes(q));

            if (filterCategory === 'UNREAD') return matchesSearch && !n.read;
            if (filterCategory === 'ACADEMIC') return matchesSearch && n.category === 'ACADEMIC';
            if (filterCategory === 'SYSTEM') return matchesSearch && n.category === 'SYSTEM';
            if (filterCategory === 'MEMO') return matchesSearch && n.category === 'MEMO';
            return matchesSearch;
        });
    }, [activeNotifications, searchQuery, filterCategory]);

    const unreadCount = activeNotifications.filter(n => !n.read).length;

    const theme = {
        card: isDarkMode ? 'bg-slate-900/60 border-white/10 shadow-2xl backdrop-blur-xl' : 'bg-white border-slate-200 shadow-md',
        text: isDarkMode ? 'text-white' : 'text-slate-900',
        subtext: isDarkMode ? 'text-slate-400' : 'text-slate-500',
        border: isDarkMode ? 'border-white/10' : 'border-slate-200'
    };

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
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className={`text-2xl md:text-4xl font-black uppercase tracking-tight ${theme.text}`}>
                                    Faculty Notifications
                                </h1>
                                {unreadCount > 0 && (
                                    <span className="px-3 py-1 bg-cyan-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-full shadow-lg shadow-cyan-500/20">
                                        {unreadCount} New
                                    </span>
                                )}
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                                    ● Live Feed
                                </span>
                            </div>
                            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-1">
                                Real-time academic notices, doubt updates, feedback alerts, and system memos
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <button
                        onClick={fetchNotifications}
                        disabled={loading}
                        title="Refresh Notifications"
                        className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold text-xs transition-all shadow-sm ${
                            isDarkMode 
                                ? 'bg-slate-800 border-white/10 text-slate-300 hover:text-white hover:border-cyan-500/40' 
                                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                        <RefreshCw size={15} className={`text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">
                            {lastSync ? `Synced ${lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Refresh'}
                        </span>
                    </button>

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
                    {activeNotifications.length > 0 && (
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
                        { id: 'ALL', label: `All (${activeNotifications.length})` },
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

            {/* Error banner if fetch fails */}
            {error && (
                <div className={`p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 flex items-center justify-between gap-4 text-xs font-bold`}>
                    <div className="flex items-center gap-2">
                        <AlertCircle size={18} />
                        <span>Could not fetch live notifications ({error}).</span>
                    </div>
                    <button
                        onClick={fetchNotifications}
                        className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg text-rose-300 font-black uppercase tracking-wider"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Notification List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className={`p-6 rounded-2xl border ${theme.card} animate-pulse flex items-center gap-4`}>
                                <div className="w-12 h-12 rounded-xl bg-slate-700/40" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-slate-700/40 rounded w-1/3" />
                                    <div className="h-3 bg-slate-700/20 rounded w-3/4" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredNotifications.length === 0 ? (
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
                                <div className="flex items-start gap-4 flex-1 min-w-0">
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

                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h3 className={`text-sm md:text-base font-black uppercase tracking-tight truncate ${theme.text}`}>
                                                {n.title}
                                            </h3>
                                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0 ${
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
                                        {n.link && (
                                            <a
                                                href={n.link}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:underline pt-1"
                                            >
                                                <ExternalLink size={12} /> Open Resource Link
                                            </a>
                                        )}
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

