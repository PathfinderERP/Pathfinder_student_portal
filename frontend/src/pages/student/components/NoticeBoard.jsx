import React, { useState, useEffect } from 'react';
import {
    Bell, Calendar, Clock, ChevronRight,
    Link as LinkIcon, FileText, Megaphone,
    Search, Filter, Pin, ExternalLink,
    AlertCircle, Info, Star, Bookmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';

const NoticeBoard = ({ isDarkMode }) => {
    const { getApiUrl, token } = useAuth();
    const [filter, setFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchNotices = async () => {
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/notices/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotices(response.data);
        } catch (error) {
            console.error('Failed to fetch notices:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotices();
        // Poll for notices every 2 minutes to catch new updates
        const interval = setInterval(fetchNotices, 120000);
        return () => clearInterval(interval);
    }, []);

    const filteredNotices = notices.filter(n => {
        const matchesFilter = filter === 'All' || n.category === filter;
        const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const categories = [
        { label: 'New Notices', val: notices.filter(n => n.is_new).length, icon: Bell, color: 'orange' },
        { label: 'Exams', val: notices.filter(n => n.category === 'Exams').length, icon: Calendar, color: 'indigo' },
        { label: 'Resources', val: notices.filter(n => n.category === 'Resources').length, icon: FileText, color: 'indigo' }
    ];

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            {/* Notice Header */}
            <div className={`p-8 rounded-[5px] border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="px-3 py-1 rounded-[5px] bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-[0.2em]">
                                Communications
                            </div>
                        </div>
                        <h2 className={`text-3xl font-black uppercase tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            Digital Notice Board
                        </h2>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Stay updated with official announcements, exam schedules, and academic events.
                        </p>
                    </div>

                    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-[5px]">
                        {['All', 'Exams', 'Admin', 'Resources', 'System'].map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setFilter(cat)}
                                className={`px-4 py-2 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all ${filter === cat
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                    : 'text-slate-500 hover:text-orange-500'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <Megaphone size={200} className="absolute -right-10 -bottom-10 opacity-[0.03] rotate-12" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* Search & Statistics */}
                <div className="xl:col-span-1 space-y-6">
                    <div className="relative group">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-white/20' : 'text-slate-300'} group-focus-within:text-orange-500 transition-colors`} size={18} />
                        <input
                            type="text"
                            placeholder="Search notices..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className={`w-full pl-12 pr-4 py-4 rounded-[5px] border-2 outline-none font-bold text-xs transition-all ${isDarkMode
                                ? 'bg-[#10141D] border-white/5 text-white focus:border-orange-500/30'
                                : 'bg-white border-slate-100 text-slate-800 focus:border-orange-500/30 shadow-sm'
                                }`}
                        />
                    </div>

                    <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'} space-y-6`}>
                        <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-white/60' : 'text-slate-900/60'}`}>Weekly Roundup</h4>
                        <div className="space-y-4">
                            {categories.map((s, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-[5px] flex items-center justify-center ${s.color === 'orange' ? 'bg-orange-500/10 text-orange-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                                            <s.icon size={14} />
                                        </div>
                                        <span className={`text-[11px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{s.label}</span>
                                    </div>
                                    <span className="font-black text-xs">{s.val.toString().padStart(2, '0')}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={`p-6 rounded-[5px] border bg-gradient-to-br from-indigo-600/10 to-transparent border-indigo-500/10 relative overflow-hidden`}>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">Pro Tip</h4>
                        <p className={`text-xs font-bold leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            Bookmark critical notices to access them instantly from your sidebar.
                        </p>
                        <Star size={100} className="absolute -right-8 -bottom-8 opacity-[0.05] rotate-12" />
                    </div>
                </div>

                {/* Notices Feed */}
                <div className="xl:col-span-3 space-y-4">
                    <AnimatePresence>
                        {filteredNotices.length > 0 ? (
                            filteredNotices.map((notice, i) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    key={notice.id}
                                    className={`group p-8 rounded-[5px] border transition-all duration-300 relative ${notice.is_pinned
                                        ? (isDarkMode ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100 shadow-indigo-100/50 shadow-lg')
                                        : (isDarkMode ? 'bg-[#10141D] border-white/5 hover:border-orange-500/30' : 'bg-white border-slate-100 shadow-sm hover:border-orange-200 shadow-slate-200/50')
                                        }`}
                                >
                                    {notice.is_pinned && (
                                        <div className="absolute top-4 right-4 text-indigo-500">
                                            <Pin size={16} strokeWidth={3} className="rotate-45" />
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-4">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="px-3 py-1 rounded-[5px] bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20">
                                                {notice.category}
                                            </div>
                                            {notice.is_new && (
                                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                            )}
                                            <div className="flex items-center gap-2 opacity-30 text-[10px] font-black uppercase tracking-widest ml-auto">
                                                <Calendar size={12} /> {notice.date}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h3 className={`text-xl font-black tracking-tight leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                {notice.title}
                                            </h3>
                                            <p className={`text-sm font-medium leading-relaxed max-w-4xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                {notice.content}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-dashed border-slate-200 dark:border-white/5">
                                            {notice.attachment && (
                                                <button className={`flex items-center gap-2 px-4 py-2 rounded-[5px] transition-all text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'}`}>
                                                    <FileText size={14} /> Attachment: {notice.attachment}
                                                </button>
                                            )}
                                            {notice.link && (
                                                <a href={notice.link} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 px-4 py-2 rounded-[5px] transition-all text-[10px] font-black uppercase tracking-widest bg-indigo-500 text-white shadow-lg shadow-indigo-500/20`}>
                                                    <ExternalLink size={14} /> Join Session
                                                </a>
                                            )}

                                            <div className="flex items-center gap-2 ml-auto">
                                                <button className="p-2.5 rounded-[5px] opacity-20 hover:opacity-100 hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-orange-500">
                                                    <Bookmark size={18} />
                                                </button>
                                                <button className="p-2.5 rounded-[5px] opacity-20 hover:opacity-100 hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-indigo-500">
                                                    <AlertCircle size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="py-24 text-center space-y-4 opacity-20">
                                <Megaphone size={48} className="mx-auto" />
                                <p className="font-black uppercase tracking-widest text-sm">No Notices Found</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default NoticeBoard;
