import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Search, RefreshCw, Filter, LayoutGrid, BookOpen, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast, Copy, Plus, ArrowLeft, Edit2, Trash2, X, CheckSquare, Square } from 'lucide-react';

const Breadcrumb = ({ items, onNavigate, isDarkMode }) => (
    <div className="flex items-center gap-3 mb-2 flex-wrap">
        {items.map((item, idx) => (
            <React.Fragment key={idx}>
                <span
                    onClick={() => item.clickable && onNavigate(item.level)}
                    className={`text-sm font-black uppercase tracking-widest ${item.clickable ? 'cursor-pointer hover:underline' : ''} ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}
                >
                    {item.label}
                </span>
                {idx < items.length - 1 && <span className={`text-sm font-black ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`}>/</span>}
            </React.Fragment>
        ))}
    </div>
);

// --- Level 4: SubTopic Management ---
const TopicSubTopicManagement = ({ topicData, onBack, breadcrumbs }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [subTopics, setSubTopics] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newSubTopicName, setNewSubTopicName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            const response = await axios.get(`${apiUrl}/api/master-data/subtopics/`, config);
            const filtered = response.data.filter(st => String(st.topic) === String(topicData.id || topicData._id));
            setSubTopics(filtered);
        } catch (err) {
            console.error("Failed to fetch subtopics", err);
        } finally {
            setLoading(false);
        }
    }, [getApiUrl, token, topicData]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAddSubTopic = async (e) => {
        e.preventDefault();
        if (!newSubTopicName.trim()) return;
        try {
            setIsSubmitting(true);
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            await axios.post(`${apiUrl}/api/master-data/subtopics/`, {
                name: newSubTopicName,
                topic: topicData.id || topicData._id,
                is_active: true
            }, config);
            setNewSubTopicName('');
            setIsAddModalOpen(false);
            fetchData();
        } catch (err) {
            console.error("Failed to add subtopic", err);
            alert("Error adding subtopic. Check console.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteSubTopic = async (id) => {
        if (!window.confirm("Are you sure you want to delete this subtopic?")) return;
        try {
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            await axios.delete(`${apiUrl}/api/master-data/subtopics/${id}/`, config);
            fetchData();
        } catch (err) {
            console.error("Failed to delete subtopic", err);
        }
    };

    const filtered = subTopics.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className={`p-10 rounded-[5px] border shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200/60 shadow-slate-200/40'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div className="flex items-center gap-6">
                        <button onClick={onBack} className={`p-4 rounded-[5px] transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>
                            <ArrowLeft size={24} strokeWidth={3} />
                        </button>
                        <div>
                            <Breadcrumb items={breadcrumbs} onNavigate={() => { }} isDarkMode={isDarkMode} />
                            <h2 className="text-3xl font-black tracking-tight uppercase">Sub Topics</h2>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center gap-4 mb-8">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Search subtopics..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-12 pr-4 py-3 rounded-[5px] border-2 outline-none font-bold transition-all ${isDarkMode ? 'bg-white/5 border-white/5 text-white' : 'bg-white border-slate-100 text-slate-800'}`} />
                    </div>
                    <button onClick={() => setIsAddModalOpen(true)} className="px-6 py-3 bg-green-700 text-white rounded-[5px] font-black text-xs uppercase tracking-widest hover:bg-green-800 transition-all shadow-lg active:scale-95">
                        Add Subtopic +
                    </button>
                </div>

                <div className={`rounded-[5px] border shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'border-white/5 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
                                    <th className="py-6 px-6">Sub Topic Name</th>
                                    <th className="py-6 px-6 text-center">Add Content</th>
                                    <th className="py-6 px-6 text-center">Action</th>
                                    <th className="py-6 px-6 text-center">Delete</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="py-6 px-6"><div className={`h-10 w-48 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-6 px-6"><div className={`h-8 w-24 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-6 px-6 text-center"><div className={`h-8 w-8 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-6 px-6 text-center"><div className={`h-8 w-8 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        </tr>
                                    ))
                                ) : filtered.map((sub, idx) => (
                                    <tr key={sub.id} className={`group ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                                        <td className="py-6 px-6 font-bold text-sm tracking-tight">
                                            <div>
                                                <p>{sub.name}</p>
                                                <p className="text-[10px] opacity-40 font-black uppercase">{sub.code}</p>
                                            </div>
                                        </td>
                                        <td className="py-6 px-6 text-center">
                                            <button className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                                                Add Content
                                            </button>
                                        </td>
                                        <td className="py-6 px-6 text-center"><button className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-[5px]"><Edit2 size={18} /></button></td>
                                        <td className="py-6 px-6 text-center">
                                            <button onClick={() => handleDeleteSubTopic(sub.id || sub._id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-[5px] transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {!loading && filtered.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="py-12 text-center opacity-40 font-bold">No subtopics found for this topic.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {isAddModalOpen && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className={`w-full max-w-md rounded-[5px] p-8 ${isDarkMode ? 'bg-[#1A1F2B]' : 'bg-white shadow-2xl'}`}>
                            <h3 className="text-xl font-black uppercase mb-6">Add New Sub Topic</h3>
                            <form onSubmit={handleAddSubTopic} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase opacity-40 mb-1.5 block">SubTopic Name</label>
                                    <input required type="text" value={newSubTopicName} onChange={e => setNewSubTopicName(e.target.value)} placeholder="e.g. Introduction"
                                        className={`w-full p-3 rounded-[5px] border-2 outline-none font-bold ${isDarkMode ? 'bg-white/5 border-white/5 text-white' : 'bg-slate-50 border-slate-200'}`} />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setIsAddModalOpen(false)} className={`flex-1 py-3 rounded-[5px] font-black uppercase text-xs ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>Cancel</button>
                                    <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-green-600 text-white rounded-[5px] font-black uppercase text-xs shadow-lg active:scale-95 disabled:opacity-50">
                                        {isSubmitting ? 'Adding...' : 'Add Subtopic'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Level 3: Topic Management ---
const ChapterTopicManagement = ({ chapterData, onNavigate, onBack, breadcrumbs }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [topics, setTopics] = useState([]);
    const [allTopics, setAllTopics] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newTopicName, setNewTopicName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            const response = await axios.get(`${apiUrl}/api/master-data/topics/`, config);
            const filteredByChapter = response.data.filter(t => String(t.chapter) === String(chapterData.id || chapterData._id));
            setTopics(filteredByChapter);
        } catch (err) {
            console.error("Failed to fetch topics", err);
        } finally {
            setLoading(false);
        }
    }, [getApiUrl, token, chapterData]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAddTopic = async (e) => {
        e.preventDefault();
        if (!newTopicName.trim()) return;
        try {
            setIsSubmitting(true);
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            await axios.post(`${apiUrl}/api/master-data/topics/`, {
                name: newTopicName,
                chapter: chapterData.id || chapterData._id,
                class_level: chapterData.class_level,
                subject: chapterData.subject,
                is_active: true
            }, config);
            setNewTopicName('');
            setIsAddModalOpen(false);
            fetchData();
        } catch (err) {
            console.error("Failed to add topic", err);
            alert("Error adding topic. Check console.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteTopic = async (id) => {
        if (!window.confirm("Are you sure you want to delete this topic?")) return;
        try {
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            await axios.delete(`${apiUrl}/api/master-data/topics/${id}/`, config);
            fetchData();
        } catch (err) {
            console.error("Failed to delete topic", err);
        }
    };

    const filtered = topics.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className={`p-10 rounded-[5px] border shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200/60 shadow-slate-200/40'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div className="flex items-center gap-6">
                        <button onClick={onBack} className={`p-4 rounded-[5px] transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>
                            <ArrowLeft size={24} strokeWidth={3} />
                        </button>
                        <div>
                            <Breadcrumb items={breadcrumbs} onNavigate={() => { }} isDarkMode={isDarkMode} />
                            <h2 className="text-3xl font-black tracking-tight uppercase">Topics</h2>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center gap-4 mb-8">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Search topics..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-12 pr-4 py-3 rounded-[5px] border-2 outline-none font-bold transition-all ${isDarkMode ? 'bg-white/5 border-white/5 text-white' : 'bg-white border-slate-100 text-slate-800'}`} />
                    </div>
                    <button onClick={() => setIsAddModalOpen(true)} className="px-6 py-3 bg-green-700 text-white rounded-[5px] font-black text-xs uppercase tracking-widest hover:bg-green-800 transition-all shadow-lg active:scale-95">
                        Add Topic +
                    </button>
                </div>

                <div className={`rounded-[5px] border shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'border-white/5 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
                                    <th className="py-6 px-6 text-center">Order</th>
                                    <th className="py-6 px-6">Topic Name</th>
                                    <th className="py-6 px-6 text-center">Sub Topic</th>
                                    <th className="py-6 px-6 text-center">Action</th>
                                    <th className="py-6 px-6 text-center">Delete</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="py-6 px-6 text-center"><div className={`h-4 w-4 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-6 px-6"><div className={`h-10 w-48 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-6 px-6 text-center"><div className={`h-8 w-24 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-6 px-6 text-center"><div className={`h-8 w-8 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-6 px-6 text-center"><div className={`h-8 w-8 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        </tr>
                                    ))
                                ) : filtered.map((topic, idx) => (
                                    <tr key={topic.id} className={`group ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                                        <td className="py-6 px-6 text-center text-xs font-bold opacity-50">{topic.order || idx + 1}</td>
                                        <td className="py-6 px-6 font-bold text-sm tracking-tight">
                                            <div>
                                                <p>{topic.name}</p>
                                                <p className="text-[10px] opacity-40 font-black uppercase">{topic.code}</p>
                                            </div>
                                        </td>
                                        <td className="py-6 px-6 text-center">
                                            <button onClick={() => onNavigate(topic)} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                                                Manage
                                            </button>
                                        </td>
                                        <td className="py-6 px-6 text-center"><button className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-[5px]"><Edit2 size={18} /></button></td>
                                        <td className="py-6 px-6 text-center">
                                            <button onClick={() => handleDeleteTopic(topic.id || topic._id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-[5px] transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {!loading && filtered.length === 0 && (
                                    <tr><td colSpan="5" className="py-12 text-center opacity-40 font-bold">No topics found for this chapter.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {isAddModalOpen && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className={`w-full max-w-md rounded-[5px] p-8 ${isDarkMode ? 'bg-[#1A1F2B]' : 'bg-white shadow-2xl'}`}>
                            <h3 className="text-xl font-black uppercase mb-6">Add New Topic</h3>
                            <form onSubmit={handleAddTopic} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase opacity-40 mb-1.5 block">Topic Name</label>
                                    <input required type="text" value={newTopicName} onChange={e => setNewTopicName(e.target.value)} placeholder="e.g. Laws of Motion"
                                        className={`w-full p-3 rounded-[5px] border-2 outline-none font-bold ${isDarkMode ? 'bg-white/5 border-white/5 text-white' : 'bg-slate-50 border-slate-100'}`} />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setIsAddModalOpen(false)} className={`flex-1 py-3 rounded-[5px] font-black uppercase text-xs ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>Cancel</button>
                                    <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-green-600 text-white rounded-[5px] font-black uppercase text-xs shadow-lg active:scale-95 disabled:opacity-50">
                                        {isSubmitting ? 'Adding...' : 'Add Topic'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Level 2: Chapter Management ---
const SubjectChapterManagement = ({ subjectData, onNavigate, onBack, breadcrumbs }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [chapters, setChapters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newChapterName, setNewChapterName] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [classes, setClasses] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            const [chapRes, classRes] = await Promise.all([
                axios.get(`${apiUrl}/api/master-data/chapters/`, config),
                axios.get(`${apiUrl}/api/master-data/classes/`, config)
            ]);
            // Filter by subject
            const filteredBySubject = chapRes.data.filter(c => String(c.subject) === String(subjectData.id || subjectData._id));
            setChapters(filteredBySubject);
            setClasses(classRes.data);
        } catch (err) {
            console.error("Failed to fetch chapters", err);
        } finally {
            setLoading(false);
        }
    }, [getApiUrl, token, subjectData]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAddChapter = async (e) => {
        e.preventDefault();
        if (!newChapterName.trim() || !selectedClass) return;
        try {
            setIsSubmitting(true);
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            await axios.post(`${apiUrl}/api/master-data/chapters/`, {
                name: newChapterName,
                class_level: selectedClass,
                subject: subjectData.id || subjectData._id,
                is_active: true
            }, config);
            setNewChapterName('');
            setIsAddModalOpen(false);
            fetchData();
        } catch (err) {
            console.error("Failed to add chapter", err);
            alert("Error adding chapter. Check console.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteChapter = async (id) => {
        if (!window.confirm("Are you sure you want to delete this chapter?")) return;
        try {
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            await axios.delete(`${apiUrl}/api/master-data/chapters/${id}/`, config);
            fetchData();
        } catch (err) {
            console.error("Failed to delete chapter", err);
        }
    };

    const filtered = chapters.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className={`p-10 rounded-[5px] border shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200/60 shadow-slate-200/40'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div className="flex items-center gap-6">
                        <button onClick={onBack} className={`p-4 rounded-[5px] transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>
                            <ArrowLeft size={24} strokeWidth={3} />
                        </button>
                        <div>
                            <Breadcrumb items={breadcrumbs} onNavigate={() => { }} isDarkMode={isDarkMode} />
                            <h2 className="text-3xl font-black tracking-tight uppercase">Chapter</h2>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center gap-4 mb-8">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Search chapters..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-12 pr-4 py-3 rounded-[5px] border-2 outline-none font-bold transition-all ${isDarkMode ? 'bg-white/5 border-white/5 text-white' : 'bg-white border-slate-100 text-slate-800'}`} />
                    </div>
                    <button onClick={() => setIsAddModalOpen(true)} className="px-6 py-3 bg-green-700 text-white rounded-[5px] font-black text-xs uppercase tracking-widest hover:bg-green-800 transition-all shadow-lg active:scale-95">
                        Add chapter +
                    </button>
                </div>

                <div className={`rounded-[5px] border shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'border-white/5 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
                                    <th className="py-6 px-6 text-center">Order</th>
                                    <th className="py-6 px-6">Chapter Name</th>
                                    <th className="py-6 px-6 text-center">Topic</th>
                                    <th className="py-6 px-6 text-center">Action</th>
                                    <th className="py-6 px-6 text-center">Delete</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="py-6 px-6 text-center"><div className={`h-4 w-4 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-6 px-6"><div className={`h-10 w-48 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-6 px-6 text-center"><div className={`h-8 w-24 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-6 px-6 text-center"><div className={`h-8 w-8 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-6 px-6 text-center"><div className={`h-8 w-8 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        </tr>
                                    ))
                                ) : filtered.map((chap, idx) => (
                                    <tr key={chap.id} className={`group ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                                        <td className="py-6 px-6 text-center text-xs font-bold opacity-50">{chap.order || idx + 1}</td>
                                        <td className="py-6 px-6 font-bold text-sm tracking-tight">
                                            <div>
                                                <p>{chap.name}</p>
                                                <p className="text-[10px] opacity-40 font-black uppercase">{chap.code}</p>
                                            </div>
                                        </td>
                                        <td className="py-6 px-6 text-center">
                                            <button onClick={() => onNavigate(chap)} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                                                Manage
                                            </button>
                                        </td>
                                        <td className="py-6 px-6 text-center"><button className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-[5px]"><Edit2 size={18} /></button></td>
                                        <td className="py-6 px-6 text-center">
                                            <button onClick={() => handleDeleteChapter(chap.id || chap._id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-[5px] transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {!loading && filtered.length === 0 && (
                                    <tr><td colSpan="5" className="py-12 text-center opacity-40 font-bold">No chapters found for this subject.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {isAddModalOpen && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className={`w-full max-w-md rounded-[5px] p-8 ${isDarkMode ? 'bg-[#1A1F2B]' : 'bg-white shadow-2xl'}`}>
                            <h3 className="text-xl font-black uppercase mb-6">Add New Chapter</h3>
                            <form onSubmit={handleAddChapter} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase opacity-40 mb-1.5 block">Class</label>
                                    <select required value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                                        className={`w-full p-3 rounded-[5px] border-2 outline-none font-bold ${isDarkMode ? 'bg-white/5 border-white/5 text-white' : 'bg-slate-50 border-slate-100'}`}>
                                        <option value="">Select Class</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase opacity-40 mb-1.5 block">Chapter Name</label>
                                    <input required type="text" value={newChapterName} onChange={e => setNewChapterName(e.target.value)} placeholder="e.g. Thermodynamics"
                                        className={`w-full p-3 rounded-[5px] border-2 outline-none font-bold ${isDarkMode ? 'bg-white/5 border-white/5 text-white' : 'bg-slate-50 border-slate-100'}`} />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setIsAddModalOpen(false)} className={`flex-1 py-3 rounded-[5px] font-black uppercase text-xs ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>Cancel</button>
                                    <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-green-600 text-white rounded-[5px] font-black uppercase text-xs shadow-lg active:scale-95 disabled:opacity-50">
                                        {isSubmitting ? 'Adding...' : 'Add Chapter'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Level 1: Subject Management ---
const CourseSubjectManagement = ({ packageData, onNavigate, onBack }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [subjects, setSubjects] = useState([]); // List of subjects in this package
    const [allSubjects, setAllSubjects] = useState([]); // Master list of subjects
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
    const [modalSearch, setModalSearch] = useState('');

    // Fetch Master Data Subjects
    const fetchMasterSubjects = useCallback(async () => {
        try {
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            const response = await axios.get(`${apiUrl}/api/master-data/subjects/`, config);
            setAllSubjects(response.data);
        } catch (err) {
            console.error("Failed to fetch subjects", err);
        }
    }, [getApiUrl, token]);

    useEffect(() => {
        fetchMasterSubjects();
        // Since we don't have a backend to store added subjects yet, 
        // we'll keep it as an empty list for now or keep mock if desired.
        // For now, let's keep it empty to encourage real integration.
        setSubjects([]);
    }, [fetchMasterSubjects]);

    const handleAddSubjects = (e) => {
        e.preventDefault();
        if (selectedSubjectIds.length === 0) return;

        const subjectsToAdd = allSubjects.filter(s => selectedSubjectIds.includes(s.id || s._id));

        // Filter out duplicates (already in list)
        const uniqueNew = subjectsToAdd.filter(ns => !subjects.some(s => s.name === ns.name));

        if (uniqueNew.length > 0) {
            setSubjects([...subjects, ...uniqueNew.map(s => ({ id: s.id || s._id, name: s.name }))]);
        }

        setIsAddModalOpen(false);
        setSelectedSubjectIds([]);
    };

    const toggleSubject = (id) => {
        setSelectedSubjectIds(prev =>
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    const handleRemoveSubject = (id) => {
        if (window.confirm('Are you sure you want to remove this subject?')) {
            setSubjects(subjects.filter(s => s.id !== id));
        }
    };

    const filteredSubjects = subjects.filter(sub =>
        sub.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const availableSubjects = allSubjects.filter(s =>
        s.name.toLowerCase().includes(modalSearch.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className={`p-10 rounded-[5px] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200/60 shadow-slate-200/40'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div className="flex items-center gap-6">
                        <button onClick={onBack} className={`p-4 rounded-[5px] transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>
                            <ArrowLeft size={24} strokeWidth={3} />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{packageData.name} / </span>
                            </div>
                            <h2 className="text-3xl font-black tracking-tight uppercase">
                                Subjects
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            className={`p-3 rounded-[5px] transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Enter the name"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-12 pr-4 py-3 rounded-[5px] border-2 outline-none font-bold transition-all focus:ring-4 ${isDarkMode
                                ? 'bg-white/5 border-white/5 text-white focus:border-green-500/50 focus:ring-green-500/5'
                                : 'bg-white border-slate-100 text-slate-800 focus:border-green-500/50 focus:ring-green-500/5'
                                }`}
                        />
                    </div>

                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-6 py-3 bg-green-700 text-white rounded-[5px] font-black text-xs uppercase tracking-widest hover:bg-green-800 transition-all active:scale-95 shadow-lg shadow-green-700/20 shadow-green-700/20 ring-offset-2 ring-green-600"
                    >
                        Add Subject +
                    </button>
                </div>

                {/* Table */}
                <div className={`rounded-[5px] border shadow-2xl overflow-hidden transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'border-white/5 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
                                    <th className="py-6 px-6 text-left">#</th>
                                    <th className="py-6 px-6 text-left">Subject Name</th>
                                    <th className="py-6 px-6 text-center">Module</th>
                                    <th className="py-6 px-6 text-center">Delete</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredSubjects.map((sub, idx) => (
                                    <tr key={sub.id} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                                        <td className="py-6 px-6 text-xs font-bold opacity-50">{idx + 1}</td>
                                        <td className="py-6 px-6 font-bold text-sm tracking-tight">{sub.name}</td>
                                        <td className="py-6 px-6 text-center">
                                            <button onClick={() => onNavigate(sub)} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
                                                Manage
                                            </button>
                                        </td>
                                        <td className="py-6 px-6 text-center">
                                            <button
                                                onClick={() => handleRemoveSubject(sub.id)}
                                                className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-[5px] transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Add Subject Modal */}
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className={`w-full max-w-4xl rounded-[5px] shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-[#1A1F2B]' : 'bg-white'}`}>
                            <div className="bg-green-600 p-8 flex justify-between items-center text-white shrink-0">
                                <h3 className="text-xl font-black uppercase tracking-tight">Add Subjects</h3>
                                <button onClick={() => setIsAddModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-all active:scale-90"><X size={24} /></button>
                            </div>

                            <div className="p-8 pb-0 shrink-0">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search subjects..."
                                        value={modalSearch}
                                        onChange={(e) => setModalSearch(e.target.value)}
                                        className={`w-full pl-12 pr-4 py-3 rounded-[5px] border-2 outline-none font-bold transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-green-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-green-500'}`}
                                    />
                                </div>
                            </div>

                            <form onSubmit={handleAddSubjects} className="p-8 flex flex-col flex-1 overflow-hidden">
                                <div className="flex-1 overflow-y-auto custom-scrollbar mb-6 -mx-2 px-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {availableSubjects.map(subject => {
                                            const isSelected = selectedSubjectIds.includes(subject.id || subject._id);
                                            const isAlreadyAdded = subjects.some(s => s.name === subject.name);

                                            return (
                                                <div
                                                    key={subject.id || subject._id}
                                                    onClick={() => !isAlreadyAdded && toggleSubject(subject.id || subject._id)}
                                                    className={`p-4 rounded-[5px] border-2 transition-all cursor-pointer flex items-center gap-3 ${isAlreadyAdded
                                                        ? 'opacity-50 cursor-not-allowed border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/5'
                                                        : isSelected
                                                            ? 'border-green-500 bg-green-500/10'
                                                            : isDarkMode
                                                                ? 'border-white/10 hover:border-white/20 bg-white/5'
                                                                : 'border-slate-100 hover:border-slate-300 bg-slate-50'
                                                        }`}
                                                >
                                                    <div className={`w-6 h-6 rounded-[5px] flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-green-500 text-white' : isDarkMode ? 'bg-white/10' : 'bg-slate-200'
                                                        }`}>
                                                        {isSelected && <CheckSquare size={14} fill="currentColor" className="text-white" />}
                                                    </div>
                                                    <div>
                                                        <p className={`font-bold text-sm leading-tight ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>{subject.name}</p>
                                                        <p className="text-[10px] font-black uppercase opacity-40">{subject.code}</p>
                                                    </div>
                                                    {isAlreadyAdded && <span className="ml-auto text-[9px] font-black uppercase text-green-500 bg-green-500/10 px-2 py-1 rounded">Added</span>}
                                                </div>
                                            );
                                        })}

                                        {availableSubjects.length === 0 && (
                                            <div className="col-span-full py-12 text-center opacity-40">
                                                <p className="font-bold">No subjects found matching "{modalSearch}"</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="shrink-0 pt-4 border-t border-slate-100 dark:border-white/10">
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs font-bold opacity-60 uppercase tracking-widest">{selectedSubjectIds.length} subjects selected</p>
                                        <button
                                            type="submit"
                                            disabled={selectedSubjectIds.length === 0}
                                            className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-[5px] font-black uppercase tracking-widest shadow-xl shadow-green-500/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Add Selected Subjects
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Main Container with Navigation Logic ---
const PackageAddCourse = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();

    // Package List State
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [examTypes, setExamTypes] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterExam, setFilterExam] = useState('');
    const [filterSession, setFilterSession] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [jumpPageInput, setJumpPageInput] = useState('');

    // Navigation State
    const [view, setView] = useState('packages'); // packages, subjects, chapters, topics, subtopics
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [selectedChapter, setSelectedChapter] = useState(null);
    const [selectedTopic, setSelectedTopic] = useState(null);

    const fetchMasterData = useCallback(async () => {
        try {
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            const [etRes, sRes] = await Promise.all([
                axios.get(`${apiUrl}/api/master-data/exam-types/`, config),
                axios.get(`${apiUrl}/api/master-data/sessions/`, config)
            ]);
            setExamTypes(etRes.data);
            setSessions(sRes.data);
        } catch (err) {
            console.error("Fetch master data failed", err);
        }
    }, [getApiUrl, token]);

    const fetchPackages = useCallback(async () => {
        try {
            setLoading(true);
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            const response = await axios.get(`${apiUrl}/api/packages/`, config);
            setPackages(response.data);
        } catch (err) {
            console.error("Fetch packages failed", err);
        } finally {
            setLoading(false);
        }
    }, [getApiUrl, token]);

    useEffect(() => {
        fetchPackages();
        fetchMasterData();
    }, [fetchPackages, fetchMasterData]);

    const handleDuplicate = (pkg) => alert(`Duplicate ${pkg.name} coming soon!`);
    const toggleStatus = async (pkg) => {
        try {
            const pkgId = pkg.id || pkg._id;
            if (!pkgId) return;

            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            await axios.patch(`${apiUrl}/api/packages/${pkgId}/`, { is_completed: !pkg.is_completed }, config);
            fetchPackages();
        } catch (err) {
            console.error("Toggle status failed", err);
        }
    };

    // Navigation Handlers
    const handleManagePackage = (pkg) => {
        setSelectedPackage(pkg);
        setView('subjects');
    };

    const navigateToChapters = (subject) => {
        setSelectedSubject(subject);
        setView('chapters');
    };

    const navigateToTopics = (chapter) => {
        setSelectedChapter(chapter);
        setView('topics');
    };

    const navigateToSubTopics = (topic) => {
        setSelectedTopic(topic);
        setView('subtopics');
    };

    const handleBack = () => {
        if (view === 'subtopics') setView('topics');
        else if (view === 'topics') setView('chapters');
        else if (view === 'chapters') setView('subjects');
        else if (view === 'subjects') {
            setSelectedPackage(null);
            setView('packages');
        }
    };

    // Filter Logic
    const filteredPackages = packages.filter(pkg => {
        const matchesSearch = (pkg.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (pkg.code || '').toLowerCase().includes(searchQuery.toLowerCase());
        const pkgExamType = pkg.exam_type?.id || pkg.exam_type?._id || pkg.exam_type;
        const pkgSession = pkg.session?.id || pkg.session?._id || pkg.session;
        return matchesSearch && (filterExam ? String(pkgExamType) === String(filterExam) : true) && (filterSession ? String(pkgSession) === String(filterSession) : true);
    });

    const totalPages = Math.ceil(filteredPackages.length / itemsPerPage);
    const paginatedPackages = filteredPackages.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Render Views
    if (view === 'subtopics') {
        const breadcrumbs = [
            { label: selectedPackage.name, clickable: true, level: 'subjects' },
            { label: selectedSubject.name, clickable: true, level: 'chapters' },
            { label: selectedChapter.name, clickable: true, level: 'topics' },
            { label: selectedTopic.name, clickable: false }
        ];
        return <TopicSubTopicManagement topicData={selectedTopic} onBack={handleBack} breadcrumbs={breadcrumbs} />;
    }

    if (view === 'topics') {
        const breadcrumbs = [
            { label: selectedPackage.name, clickable: true, level: 'subjects' },
            { label: selectedSubject.name, clickable: true, level: 'chapters' },
            { label: selectedChapter.name, clickable: false }
        ];
        return <ChapterTopicManagement chapterData={selectedChapter} onNavigate={navigateToSubTopics} onBack={handleBack} breadcrumbs={breadcrumbs} />;
    }

    if (view === 'chapters') {
        const breadcrumbs = [
            { label: selectedPackage.name, clickable: true, level: 'subjects' },
            { label: selectedSubject.name, clickable: false }
        ];
        return <SubjectChapterManagement subjectData={selectedSubject} onNavigate={navigateToTopics} onBack={handleBack} breadcrumbs={breadcrumbs} />;
    }

    if (view === 'subjects') {
        return <CourseSubjectManagement packageData={selectedPackage} onNavigate={navigateToChapters} onBack={handleBack} />;
    }

    // Default: Package List View
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header + Filter + Table (Existing Package List UI) */}
            <div className={`p-10 rounded-[5px] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200/60 shadow-slate-200/40'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="px-3 py-1 bg-purple-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-purple-500/20">Course Management</div>
                            <h2 className="text-3xl font-black tracking-tight uppercase">All <span className="text-purple-500">Packages</span></h2>
                        </div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Manage courses and duplicate packages.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={fetchPackages} disabled={loading} className={`p-3 rounded-[5px] transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
                    <div className="relative md:col-span-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={`w-full pl-12 pr-4 py-3 rounded-[5px] border-2 outline-none font-bold ${isDarkMode ? 'bg-white/5 border-white/5 text-white' : 'bg-white border-slate-100 text-slate-800'}`} />
                    </div>
                    {/* Filters omitted for brevity but logic exists */}
                </div>

                <div className={`rounded-[5px] border shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                                <tr className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>
                                    <th className="py-6 px-6 text-center">#</th>
                                    <th className="py-6 px-6">Name</th>
                                    <th className="py-6 px-6 text-center">Code</th>
                                    <th className="py-6 px-6 text-center">Manage</th>
                                    <th className="py-6 px-6 text-center">Complete</th>
                                    <th className="py-6 px-6 text-center">Make Duplicate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="py-8 px-6 text-center"><div className={`h-4 w-4 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-8 px-6"><div className={`h-6 w-48 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-8 px-6 text-center"><div className={`h-4 w-20 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-8 px-6 text-center"><div className={`h-8 w-32 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-8 px-6 text-center"><div className={`h-6 w-12 mx-auto rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-8 px-6 text-center last:rounded-r-[5px]"><div className={`h-8 w-24 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        </tr>
                                    ))
                                ) : paginatedPackages.map((pkg, index) => (
                                    <tr key={pkg.id || pkg._id} className={`group ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                                        <td className="py-8 px-6 text-center text-xs font-bold opacity-50">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                        <td className="py-8 px-6"><p className="font-black text-sm">{pkg.name}</p></td>
                                        <td className="py-8 px-6 text-center"><span className="text-[10px] font-black tracking-widest bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-[5px]">{pkg.code}</span></td>
                                        <td className="py-8 px-6 text-center"><button onClick={() => handleManagePackage(pkg)} className="px-4 py-2 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border border-blue-600/20">Manage Course</button></td>
                                        <td className="py-8 px-6 text-center">
                                            <button
                                                onClick={() => toggleStatus(pkg)}
                                                className={`group relative inline-flex h-6 w-12 items-center rounded-full transition-all duration-300 focus:outline-none ${pkg.is_completed ? 'bg-green-500 shadow-lg shadow-green-500/30' : 'bg-slate-300 dark:bg-white/10'}`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-300 shadow-sm ${pkg.is_completed ? 'translate-x-7' : 'translate-x-1'}`}
                                                />
                                            </button>
                                        </td>
                                        <td className="py-8 px-6 text-center"><button onClick={() => handleDuplicate(pkg)} className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-[5px] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-2 mx-auto"><Copy size={12} /><span>Duplicate</span></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PackageAddCourse;
