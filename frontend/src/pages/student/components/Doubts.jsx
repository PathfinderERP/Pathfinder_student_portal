import React, { useState, useEffect } from 'react';
import { Send, MessageSquare, CheckCircle, Loader2, Image, FileQuestion, Trash2, HelpCircle, User, Clock, Check, TrendingUp, BarChart2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';

const Doubts = ({ isDarkMode }) => {
    const [formData, setFormData] = useState({
        subject: '',
        chapter: '',
        topic: '',
        title: '',
        description: '',
        image: null,
        image2: null,
        image3: null,
        pdf: null,
        voice_note: null
    });

    const [library, setLibrary] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [allChapters, setAllChapters] = useState([]);
    const [allTopics, setAllTopics] = useState([]);
    const [chapters, setChapters] = useState([]);
    const [topics, setTopics] = useState([]);
    const [previews, setPreviews] = useState({
        image: null,
        image2: null,
        image3: null
    });

    const { getApiUrl, token, user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [success, setSuccess] = useState(false);
    const [doubts, setDoubts] = useState([]);
    const [selectedAttachment, setSelectedAttachment] = useState(null);

    const openAttachment = (url, type) => {
        setSelectedAttachment({ url, type });
    };

    const fetchDoubts = async () => {
        setFetchLoading(true);
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/doubts/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setDoubts(response.data);
        } catch (error) {
            console.error('Failed to fetch doubts:', error);
        } finally {
            setFetchLoading(false);
        }
    };

    useEffect(() => {
        fetchDoubts();
        const fetchMasterData = async () => {
            try {
                const apiUrl = getApiUrl();
                const headers = { 'Authorization': `Bearer ${token}` };
                
                const [subRes, chapRes, topRes] = await Promise.all([
                    axios.get(`${apiUrl}/api/master-data/subjects/`, { headers }),
                    axios.get(`${apiUrl}/api/master-data/chapters/`, { headers }),
                    axios.get(`${apiUrl}/api/master-data/topics/`, { headers })
                ]);

                // Show all subjects from master data
                const allSubjects = (subRes.data || [])
                    .sort((a, b) => a.name.localeCompare(b.name));
                
                setSubjects(allSubjects);
                setAllChapters(chapRes.data || []);
                setAllTopics(topRes.data || []);
            } catch (err) {
                console.error("Failed to fetch master data", err);
            }
        };
        fetchMasterData();
    }, []);

    useEffect(() => {
        if (formData.subject) {
            const filtered = allChapters.filter(item => 
                item.subject_name?.toUpperCase() === formData.subject.toUpperCase() &&
                (!user?.class_level || String(item.class_level) === String(user.class_level))
            );
            const uniqueChapters = [...new Set(filtered.map(item => item.name).filter(Boolean))].sort();
            setChapters(uniqueChapters);
        } else {
            setChapters([]);
        }
    }, [formData.subject, allChapters, user?.class_level]);

    useEffect(() => {
        if (formData.chapter) {
            const filtered = allTopics.filter(item => 
                item.subject_name?.toUpperCase() === formData.subject.toUpperCase() && 
                item.chapter_name?.toUpperCase() === formData.chapter.toUpperCase() &&
                (!user?.class_level || String(item.class_level) === String(user.class_level))
            );
            const uniqueTopics = [...new Set(filtered.map(item => item.name).filter(Boolean))].sort();
            setTopics(uniqueTopics);
        } else {
            setTopics([]);
        }
    }, [formData.chapter, formData.subject, allTopics, user?.class_level]);

    const handleFileChange = (e, field) => {
        const file = e.target.files[0];
        if (file) {
            setFormData({ ...formData, [field]: file });
            if (field.startsWith('image')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPreviews(prev => ({ ...prev, [field]: reader.result }));
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const apiUrl = getApiUrl();
            const data = new FormData();
            data.append('subject', formData.subject);
            data.append('chapter', formData.chapter);
            data.append('topic', formData.topic);
            data.append('title', formData.title);
            data.append('description', formData.description);
            
            if (formData.image) data.append('image', formData.image);
            if (formData.image2) data.append('image2', formData.image2);
            if (formData.image3) data.append('image3', formData.image3);
            if (formData.pdf) data.append('pdf', formData.pdf);
            if (formData.voice_note) data.append('voice_note', formData.voice_note);

            await axios.post(`${apiUrl}/api/doubts/`, data, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            setSuccess(true);
            setFormData({ subject: '', chapter: '', topic: '', title: '', description: '', image: null, image2: null, image3: null, pdf: null, voice_note: null });
            setPreviews({ image: null, image2: null, image3: null });
            fetchDoubts();
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error('Failed to submit doubt:', error);
            alert('Failed to submit. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const [deletingId, setDeletingId] = useState(null);
    const [confirmId, setConfirmId] = useState(null);

    const handleDelete = async (id) => {
        if (confirmId !== id) {
            setConfirmId(id);
            setTimeout(() => setConfirmId(null), 3000);
            return;
        }
        setDeletingId(id);
        setConfirmId(null);
        try {
            const apiUrl = getApiUrl();
            await axios.delete(`${apiUrl}/api/doubts/${id}/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setDoubts(prev => prev.filter(g => g.id !== id));
        } catch (error) {
            console.error('Failed to delete doubt:', error);
            alert('Could not delete. Please try again.');
        } finally {
            setDeletingId(null);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Resolved': return 'bg-emerald-500/10 text-emerald-500';
            case 'Assign': return 'bg-orange-500/10 text-orange-500';
            case 'Unassigned': return 'bg-purple-500/10 text-purple-500';
            case 'Rejected': return 'bg-rose-500/10 text-rose-500';
            default: return 'bg-slate-500/10 text-slate-500';
        }
    };

    // --- Derived Analytics ---
    const totalDoubts = doubts.length;
    const pendingDoubts = doubts.filter(d => d.status === 'Unassigned').length;
    const resolvedDoubts = doubts.filter(d => d.status === 'Resolved').length;
    const inProgressDoubts = doubts.filter(d => d.status === 'Assign').length;

    // Group doubts by date for area chart (last 30 days)
    const chartData = (() => {
        const days = 14;
        const map = {};
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            map[key] = { date: key, doubts: 0, resolved: 0 };
        }
        doubts.forEach(doubt => {
            if (!doubt.created_at) return;
            const d = new Date(doubt.created_at);
            const key = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            if (map[key]) {
                map[key].doubts += 1;
                if (doubt.status === 'Resolved') map[key].resolved += 1;
            }
        });
        return Object.values(map);
    })();

    // Subject distribution
    const subjectMap = {};
    doubts.forEach(d => {
        if (d.subject) subjectMap[d.subject] = (subjectMap[d.subject] || 0) + 1;
    });
    const subjectBreakdown = Object.entries(subjectMap).sort((a, b) => b[1] - a[1]);

    return (
        <>
        <div className="space-y-6 sm:space-y-8 animate-fade-in-up pb-10">

            {/* Hero Banner */}
            <div className={`p-5 sm:p-8 rounded-[5px] border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-[5px] bg-indigo-500/10 text-indigo-500 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">
                            Academic Support
                        </div>
                    </div>
                    <h2 className={`text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Doubt Resolution
                    </h2>
                    <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Stuck on a concept? Post your doubts here and get them resolved by our expert faculty.
                    </p>
                </div>
                <HelpCircle size={120} className="absolute -right-6 -bottom-6 opacity-[0.03] rotate-12 hidden sm:block" />
            </div>

            {/* Analytics Section */}
            <div className="space-y-4">
                {/* Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Total Asked', value: totalDoubts, color: 'indigo', icon: <HelpCircle size={16} /> },
                        { label: 'Pending', value: pendingDoubts, color: 'purple', icon: <Clock size={16} /> },
                        { label: 'In Progress', value: inProgressDoubts, color: 'orange', icon: <TrendingUp size={16} /> },
                        { label: 'Resolved', value: resolvedDoubts, color: 'emerald', icon: <CheckCircle size={16} /> },
                    ].map(stat => (
                        <div key={stat.label} className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <div className={`w-8 h-8 rounded-[5px] flex items-center justify-center mb-3 bg-${stat.color}-500/10 text-${stat.color}-500`}>
                                {stat.icon}
                            </div>
                            <p className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{stat.value}</p>
                            <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${isDarkMode ? 'text-white/30' : 'text-slate-400'}`}>{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Area Chart + Subject Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Area Chart */}
                    <div className={`lg:col-span-2 p-5 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <div className="flex items-center gap-2 mb-5">
                            <BarChart2 size={14} className="text-indigo-500" />
                            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Doubts Over Last 14 Days</h3>
                        </div>
                        {totalDoubts === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 opacity-30">
                                <BarChart2 size={32} className="mb-3" />
                                <p className="text-[10px] font-black uppercase tracking-widest">No data yet</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={180}>
                                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="doubtsGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                                    <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 700, fill: isDarkMode ? 'rgba(255,255,255,0.3)' : '#94a3b8' }} axisLine={false} tickLine={false} interval={1} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 9, fontWeight: 700, fill: isDarkMode ? 'rgba(255,255,255,0.3)' : '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ background: isDarkMode ? '#0d1119' : '#fff', border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0', borderRadius: 5, fontSize: 10, fontWeight: 700 }}
                                        labelStyle={{ color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#64748b', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                    />
                                    <Area type="monotone" dataKey="doubts" name="Asked" stroke="#6366f1" strokeWidth={2} fill="url(#doubtsGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                                    <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={2} fill="url(#resolvedGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                        <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500" /><span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>Asked</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>Resolved</span></div>
                        </div>
                    </div>

                    {/* Subject Breakdown */}
                    <div className={`p-5 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <div className="flex items-center gap-2 mb-5">
                            <TrendingUp size={14} className="text-indigo-500" />
                            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>By Subject</h3>
                        </div>
                        {subjectBreakdown.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 opacity-30">
                                <p className="text-[10px] font-black uppercase tracking-widest">No data yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {subjectBreakdown.map(([subject, count]) => (
                                    <div key={subject}>
                                        <div className="flex justify-between mb-1">
                                            <span className={`text-[9px] font-black uppercase tracking-widest truncate ${isDarkMode ? 'text-white/60' : 'text-slate-600'}`}>{subject}</span>
                                            <span className={`text-[9px] font-black ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>{count}</span>
                                        </div>
                                        <div className={`w-full h-1.5 rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
                                            <div
                                                className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                                                style={{ width: `${(count / totalDoubts) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Submit New Doubt Form */}
                <div className={`lg:col-span-1 p-5 sm:p-6 rounded-[5px] border h-fit ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <h3 className={`text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 mb-5 sm:mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        <Send size={14} className="text-indigo-500" /> Ask a Doubt
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>Subject</label>
                            <select
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value, chapter: '', topic: '' })}
                                className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none transition-all
                                    ${isDarkMode ? 'bg-[#0d1119] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                required>
                                <option value="">Select Subject</option>
                                {subjects.map(s => (
                                    <option key={s.id} value={s.name}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>Chapter</label>
                                <select
                                    value={formData.chapter}
                                    onChange={(e) => setFormData({ ...formData, chapter: e.target.value, topic: '' })}
                                    disabled={!formData.subject}
                                    className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none transition-all
                                        ${isDarkMode ? 'bg-[#0d1119] border-white/10 text-white disabled:opacity-40' : 'bg-slate-50 border-slate-200 text-slate-900 disabled:opacity-50'}`}
                                >
                                    <option value="">Select Chapter</option>
                                    {chapters.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>Topic</label>
                                <select
                                    value={formData.topic}
                                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                                    disabled={!formData.chapter}
                                    className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none transition-all
                                        ${isDarkMode ? 'bg-[#0d1119] border-white/10 text-white disabled:opacity-40' : 'bg-slate-50 border-slate-200 text-slate-900 disabled:opacity-50'}`}
                                >
                                    <option value="">Select Topic</option>
                                    {topics.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none transition-all
                                    ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-white/20' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                placeholder="Brief title of your doubt"
                                required
                            />
                        </div>



                        <div className="space-y-2">
                            <label className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={6}
                                className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none transition-all resize-none
                                    ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-white/20' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                placeholder="Explain your doubt in detail..."
                                required
                            />
                        </div>

                        <div className="space-y-4">
                            <label className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>Multimedia Attachments (Optional)</label>
                            
                            {/* Image Grid */}
                            <div className="grid grid-cols-3 gap-2">
                                {[1, 2, 3].map((num) => {
                                    const field = num === 1 ? 'image' : `image${num}`;
                                    return (
                                        <div key={field} className="flex flex-col gap-2">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleFileChange(e, field)}
                                                className="hidden"
                                                id={`doubt-${field}-upload`}
                                            />
                                            <label
                                                htmlFor={`doubt-${field}-upload`}
                                                className={`aspect-square rounded-[5px] border-2 border-dashed font-bold text-[8px] uppercase tracking-widest cursor-pointer transition-all flex flex-col items-center justify-center gap-1
                                                    ${isDarkMode ? 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}>
                                                {previews[field] ? (
                                                    <img src={previews[field]} alt="Preview" className="w-full h-full object-cover rounded-[3px]" />
                                                ) : (
                                                    <>
                                                        <Image size={14} />
                                                        <span>Image {num}</span>
                                                    </>
                                                )}
                                            </label>
                                            {previews[field] && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => ({ ...prev, [field]: null }));
                                                        setPreviews(prev => ({ ...prev, [field]: null }));
                                                    }}
                                                    className="py-1 bg-red-500/10 text-red-500 text-[8px] font-black uppercase rounded hover:bg-red-500 hover:text-white transition-all">
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* PDF and Voice Note Row */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={(e) => handleFileChange(e, 'pdf')}
                                        className="hidden"
                                        id="doubt-pdf-upload"
                                    />
                                    <label
                                        htmlFor="doubt-pdf-upload"
                                        className={`w-full p-2.5 rounded-[5px] border-2 border-dashed font-bold text-[9px] uppercase tracking-widest cursor-pointer transition-all flex items-center justify-center gap-2
                                            ${formData.pdf ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : (isDarkMode ? 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100')}`}>
                                        <MessageSquare size={12} />
                                        {formData.pdf ? 'PDF Added' : 'Upload PDF'}
                                    </label>
                                    {formData.pdf && <p className="text-[8px] text-center truncate px-2 font-bold opacity-50">{formData.pdf.name}</p>}
                                </div>

                                <div className="space-y-2">
                                    <input
                                        type="file"
                                        accept="audio/*"
                                        onChange={(e) => handleFileChange(e, 'voice_note')}
                                        className="hidden"
                                        id="doubt-audio-upload"
                                    />
                                    <label
                                        htmlFor="doubt-audio-upload"
                                        className={`w-full p-2.5 rounded-[5px] border-2 border-dashed font-bold text-[9px] uppercase tracking-widest cursor-pointer transition-all flex items-center justify-center gap-2
                                            ${formData.voice_note ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : (isDarkMode ? 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100')}`}>
                                        <Send size={12} />
                                        {formData.voice_note ? 'Audio Added' : 'Voice Note'}
                                    </label>
                                    {formData.voice_note && <p className="text-[8px] text-center truncate px-2 font-bold opacity-50">{formData.voice_note.name}</p>}
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white rounded-[5px] font-black uppercase tracking-widest text-xs transition-all active:scale-95 flex items-center justify-center gap-2">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
                            {loading ? 'Submitting...' : 'Submit Doubt'}
                        </button>

                        {success && (
                            <div className="p-3 sm:p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-[5px] flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
                                <CheckCircle size={16} /> Doubt Posted Successfully
                            </div>
                        )}
                    </form>
                </div>

                {/* Previous Doubts List */}
                <div className={`lg:col-span-2 p-5 sm:p-6 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <h3 className={`text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 mb-5 sm:mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        <FileQuestion size={14} className="text-indigo-500" /> Your Doubts
                    </h3>

                    {fetchLoading ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3 opacity-40">
                            <Loader2 size={32} className="animate-spin text-indigo-500" />
                            <p className="text-xs font-black uppercase tracking-widest">Loading...</p>
                        </div>
                    ) : doubts.length === 0 ? (
                        <div className={`py-14 text-center rounded-[5px] border-2 border-dashed ${isDarkMode ? 'border-white/5 bg-white/[0.01]' : 'border-slate-100 bg-slate-50'}`}>
                            <div className="flex flex-col items-center gap-3 opacity-30">
                                <HelpCircle size={48} />
                                <div className="space-y-1">
                                    <p className="font-black uppercase tracking-[0.2em] text-sm">No Doubts Found</p>
                                    <p className="text-xs font-bold">When you post a doubt, it will appear here.</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {doubts.map((item) => (
                                <div key={item.id} className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center flex-wrap gap-2 mb-1">
                                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-500`}>
                                                    {item.subject}
                                                </span>
                                                {item.chapter && (
                                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-500`}>
                                                        {item.chapter}
                                                    </span>
                                                )}
                                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${getStatusColor(item.status)}`}>
                                                    {item.status}
                                                </span>
                                            </div>
                                            <h4 className={`font-black text-sm mb-1 truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                {item.title}
                                            </h4>
                                            {item.topic && (
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">
                                                    Topic: {item.topic}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-3">
                                                <div className={`flex items-center gap-1 text-[10px] font-bold ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
                                                    <Clock size={10} />
                                                    {new Date(item.created_at).toLocaleDateString()}
                                                </div>
                                                {item.teacher_reply && (
                                                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                                                        <Check size={10} />
                                                        Replied
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-start">
                                            {item.image && (
                                                <button onClick={() => openAttachment(item.image, 'image')} className={`p-2 rounded-[5px] ${isDarkMode ? 'bg-white/5 text-indigo-400 hover:text-indigo-300' : 'bg-indigo-50 text-indigo-500 hover:bg-indigo-100'}`} title="View Image 1">
                                                    <Image size={14} />
                                                </button>
                                            )}
                                            {item.image2 && (
                                                <button onClick={() => openAttachment(item.image2, 'image')} className={`p-2 rounded-[5px] ${isDarkMode ? 'bg-white/5 text-indigo-400 hover:text-indigo-300' : 'bg-indigo-50 text-indigo-500 hover:bg-indigo-100'}`} title="View Image 2">
                                                    <Image size={14} />
                                                </button>
                                            )}
                                            {item.image3 && (
                                                <button onClick={() => openAttachment(item.image3, 'image')} className={`p-2 rounded-[5px] ${isDarkMode ? 'bg-white/5 text-indigo-400 hover:text-indigo-300' : 'bg-indigo-50 text-indigo-500 hover:bg-indigo-100'}`} title="View Image 3">
                                                    <Image size={14} />
                                                </button>
                                            )}
                                            {item.pdf && (
                                                <button onClick={() => openAttachment(item.pdf, 'pdf')} className={`p-2 rounded-[5px] ${isDarkMode ? 'bg-white/5 text-emerald-500 hover:bg-emerald-500/10' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`} title="View PDF">
                                                    <MessageSquare size={14} />
                                                </button>
                                            )}
                                            {item.voice_note && (
                                                <button onClick={() => openAttachment(item.voice_note, 'audio')} className={`p-2 rounded-[5px] ${isDarkMode ? 'bg-white/5 text-orange-500 hover:bg-orange-500/10' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`} title="Listen to Voice Note">
                                                    <Send size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <p className={`text-xs font-medium mt-3 ${isDarkMode ? 'text-white/50' : 'text-slate-500'} bg-black/5 p-2 rounded`}>
                                        {item.description}
                                    </p>

                                    {/* Teacher Reply / Resolved Section */}
                                    {item.teacher_reply ? (
                                        <div className={`mt-4 rounded-[5px] border overflow-hidden ${item.status === 'Resolved' ? 'border-emerald-500/30' : 'border-blue-500/20'}`}>
                                            {/* Reply Header */}
                                            <div className={`px-4 py-3 flex items-center gap-3 ${item.status === 'Resolved' ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}>
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 ${item.status === 'Resolved' ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                                                    <User size={14} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-[10px] font-black uppercase tracking-widest ${item.status === 'Resolved' ? 'text-emerald-500' : 'text-blue-500'}`}>
                                                        {item.status === 'Resolved' ? '✅ Doubt Resolved by Faculty' : '💬 Faculty Response'}
                                                    </p>
                                                    {item.resolved_at && (
                                                        <p className={`text-[9px] font-bold mt-0.5 ${isDarkMode ? 'text-white/30' : 'text-slate-400'}`}>
                                                            Resolved on {new Date(item.resolved_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </p>
                                                    )}
                                                </div>
                                                {item.status === 'Resolved' && (
                                                    <div className="flex-shrink-0 px-2 py-1 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest rounded">
                                                        Resolved
                                                    </div>
                                                )}
                                            </div>
                                            {/* Reply Body */}
                                            <div className={`px-4 py-4 space-y-4 ${isDarkMode ? 'bg-white/[0.02]' : 'bg-white'}`}>
                                                {item.teacher_reply && (
                                                    <p className={`text-sm font-medium leading-relaxed ${isDarkMode ? 'text-white/80' : 'text-slate-700'}`}>
                                                        {item.teacher_reply}
                                                    </p>
                                                )}

                                                {/* Teacher's Image Attachments */}
                                                {(item.reply_image || item.reply_image2 || item.reply_image3) && (
                                                    <div className="space-y-2">
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Teacher's Images</p>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {[item.reply_image, item.reply_image2, item.reply_image3].map((img, i) => img && (
                                                                <button key={i} onClick={() => openAttachment(img, 'image')} className="aspect-square rounded-[5px] overflow-hidden border border-emerald-500/20 hover:border-emerald-500/60 transition-all">
                                                                    <img src={img} alt={`Reply ${i + 1}`} className="w-full h-full object-cover" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Teacher's PDF */}
                                                {item.reply_pdf && (
                                                    <button onClick={() => openAttachment(item.reply_pdf, 'pdf')}
                                                        className={`w-full flex items-center gap-3 p-3 rounded-[5px] border transition-all ${isDarkMode ? 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10' : 'border-red-200 bg-red-50 hover:bg-red-100'}`}>
                                                        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 font-black text-[10px] flex-shrink-0">PDF</div>
                                                        <span className={`text-xs font-bold ${isDarkMode ? 'text-white/70' : 'text-slate-700'}`}>Teacher's Solution PDF — click to view</span>
                                                    </button>
                                                )}

                                                {/* Teacher's Voice Note */}
                                                {item.reply_voice_note && (
                                                    <div className={`p-3 rounded-[5px] border ${isDarkMode ? 'border-blue-500/20 bg-blue-500/5' : 'border-blue-200 bg-blue-50'}`}>
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-2">Teacher's Voice Explanation</p>
                                                        <audio controls src={item.reply_voice_note} className="w-full h-10" style={{ outline: 'none' }} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={`mt-3 px-3 py-2.5 rounded-[5px] border border-dashed flex items-center gap-2 ${isDarkMode ? 'border-white/10 bg-white/[0.01]' : 'border-slate-200 bg-slate-50/50'}`}>
                                            <Clock size={11} className={isDarkMode ? 'text-white/20' : 'text-slate-300'} />
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white/20' : 'text-slate-400'}`}>
                                                Awaiting faculty response
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Attachment Viewer Modal */}
        {selectedAttachment && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                onClick={() => setSelectedAttachment(null)}>
                <div
                    className={`relative w-full max-w-4xl h-[80vh] flex flex-col rounded-xl overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#0d1119] border border-white/10' : 'bg-white border border-slate-200'}`}
                    onClick={e => e.stopPropagation()}>

                    {/* Modal Header */}
                    <div className={`flex items-center justify-between px-5 py-3 border-b ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>
                            {selectedAttachment.type === 'image' ? '🖼️ Image Attachment' : selectedAttachment.type === 'pdf' ? '📄 PDF Document' : '🎙️ Voice Note'}
                        </span>
                        <div className="flex items-center gap-2">
                            <a
                                href={selectedAttachment.url}
                                download
                                className={`px-3 py-1.5 rounded-[5px] text-[9px] font-black uppercase tracking-widest transition-all
                                    ${isDarkMode ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                Download
                            </a>
                            <button
                                onClick={() => setSelectedAttachment(null)}
                                className="w-7 h-7 flex items-center justify-center rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-black text-sm">
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Modal Body */}
                    <div className="flex-1 overflow-auto min-h-0">
                        {selectedAttachment.type === 'image' && (
                            <img
                                src={selectedAttachment.url}
                                alt="Attachment"
                                className="w-full h-auto object-contain"
                            />
                        )}
                        {selectedAttachment.type === 'pdf' && (
                            <iframe
                                src={selectedAttachment.url}
                                title="PDF Viewer"
                                className="w-full h-full"
                                style={{ border: 'none' }}
                            />
                        )}
                        {selectedAttachment.type === 'audio' && (
                            <div className={`flex flex-col items-center justify-center py-16 gap-6 ${isDarkMode ? 'bg-[#0d1119]' : 'bg-slate-50'}`}>
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-orange-500/10' : 'bg-orange-100'}`}>
                                    <Send size={32} className="text-orange-500" />
                                </div>
                                <p className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>Voice Note</p>
                                <audio
                                    controls
                                    autoPlay
                                    src={selectedAttachment.url}
                                    className="w-full max-w-sm"
                                    style={{ outline: 'none' }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default Doubts;
