import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';
import { Video, Plus, Trash2, Edit2, Search, Filter, X, CheckCircle, RefreshCw } from 'lucide-react';

const VideoRegistry = () => {
    const { isDarkMode } = useTheme();
    const getApiUrl = useCallback(() => localStorage.getItem('apiUrl') || 'http://127.0.0.1:3001', []);

    // State Management
    const [videos, setVideos] = useState([]);
    const [packages, setPackages] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [examTypes, setExamTypes] = useState([]);
    const [targetExams, setTargetExams] = useState([]);
    const [sections, setSections] = useState([]);

    const [isLoading, setIsLoading] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedItemForEdit, setSelectedItemForEdit] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination & Filter State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [jumpToPage, setJumpToPage] = useState('');
    const [activeFilters, setActiveFilters] = useState({
        session: '',
        class_level: '',
        subject: '',
        exam_type: '',
        target_exam: '',
        section: '',
        package: ''
    });

    const [viewTargeting, setViewTargeting] = useState('all');

    const [newItem, setNewItem] = useState({
        title: '',
        link: '',
        description: '',
        session: '',
        class_level: '',
        subject: '',
        exam_type: '',
        target_exam: '',
        section: '',
        is_general: false,
        packages: []
    });

    const fetchVideos = useCallback(async () => {
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/master-data/videos/`);
            setVideos(response.data);
        } catch (error) {
            console.error("Failed to fetch videos", error);
            toast.error("Failed to load videos");
        } finally {
            setIsLoading(false);
        }
    }, [getApiUrl]);

    const fetchMasterData = useCallback(async () => {
        try {
            const apiUrl = getApiUrl();
            const [sessRes, classRes, subRes, etRes, teRes, secRes, pkgRes] = await Promise.all([
                axios.get(`${apiUrl}/api/master-data/sessions/`),
                axios.get(`${apiUrl}/api/master-data/classes/`),
                axios.get(`${apiUrl}/api/master-data/subjects/`),
                axios.get(`${apiUrl}/api/master-data/exam-types/`),
                axios.get(`${apiUrl}/api/master-data/target-exams/`),
                axios.get(`${apiUrl}/api/sections/`),
                axios.get(`${apiUrl}/api/packages/`)
            ]);
            setSessions(sessRes.data);
            setClasses(classRes.data);
            setSubjects(subRes.data);
            setExamTypes(etRes.data);
            setTargetExams(teRes.data);
            setSections(secRes.data);
            setPackages(pkgRes.data);
        } catch (error) {
            console.error("Failed to fetch master data", error);
        }
    }, [getApiUrl]);

    useEffect(() => {
        fetchVideos();
        fetchMasterData();
    }, [fetchVideos, fetchMasterData]);

    const handleAddItem = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();

            // Validate package selection
            if (!newItem.is_general && (!newItem.packages || newItem.packages.length === 0 || newItem.packages.every(p => !p))) {
                toast.error("Please select at least one package");
                setIsActionLoading(false);
                return;
            }

            const payload = {
                title: newItem.title,
                link: newItem.link,
                description: newItem.description,
                session: newItem.is_general ? (newItem.session || null) : null,
                class_level: newItem.is_general ? (newItem.class_level || null) : null,
                subject: newItem.is_general ? (newItem.subject || null) : null,
                exam_type: newItem.is_general ? (newItem.exam_type || null) : null,
                target_exam: newItem.is_general ? (newItem.target_exam || null) : null,
                section: newItem.is_general ? (newItem.section || null) : null,
                is_general: newItem.is_general,
                packages: !newItem.is_general ? (newItem.packages || []).filter(p => p !== null && p !== '' && p !== undefined) : [],
            };

            await axios.post(`${apiUrl}/api/master-data/videos/`, payload);

            toast.success("Video added successfully");
            setIsAddModalOpen(false);
            resetForm();
            fetchVideos();
        } catch (error) {
            console.error("Failed to add video", error);
            toast.error("Failed to add video");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleEditClick = (item) => {
        setSelectedItemForEdit(item);
        setNewItem({
            title: item.title,
            link: item.link,
            description: item.description || '',
            session: item.session || '',
            class_level: item.class_level || '',
            subject: item.subject || '',
            exam_type: item.exam_type || '',
            target_exam: item.target_exam || '',
            section: item.section || '',
            is_general: item.is_general || false,
            packages: item.packages || []
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateItem = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();

            // Validate package selection
            if (!newItem.is_general && (!newItem.packages || newItem.packages.length === 0 || newItem.packages.every(p => !p))) {
                toast.error("Please select at least one package");
                setIsActionLoading(false);
                return;
            }

            const payload = {
                title: newItem.title,
                link: newItem.link,
                description: newItem.description,
                session: newItem.is_general ? (newItem.session || null) : null,
                class_level: newItem.is_general ? (newItem.class_level || null) : null,
                subject: newItem.is_general ? (newItem.subject || null) : null,
                exam_type: newItem.is_general ? (newItem.exam_type || null) : null,
                target_exam: newItem.is_general ? (newItem.target_exam || null) : null,
                section: newItem.is_general ? (newItem.section || null) : null,
                is_general: newItem.is_general,
                packages: !newItem.is_general ? (newItem.packages || []).filter(p => p !== null && p !== '' && p !== undefined) : [],
            };

            await axios.put(`${apiUrl}/api/master-data/videos/${selectedItemForEdit.id}/`, payload);

            toast.success("Video updated successfully");
            setIsEditModalOpen(false);
            setSelectedItemForEdit(null);
            resetForm();
            fetchVideos();
        } catch (error) {
            console.error("Failed to update video", error);
            toast.error("Failed to update video");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDeleteClick = async (id) => {
        if (!window.confirm("Are you sure you want to delete this video?")) return;
        try {
            const apiUrl = getApiUrl();
            await axios.delete(`${apiUrl}/api/master-data/videos/${id}/`);
            toast.success("Video deleted successfully");
            fetchVideos();
        } catch (error) {
            console.error("Failed to delete video", error);
            toast.error("Failed to delete video");
        }
    };

    const resetForm = () => {
        setNewItem({ title: '', link: '', description: '', session: '', class_level: '', subject: '', exam_type: '', target_exam: '', section: '', is_general: false, packages: [] });
    };

    const filteredVideos = useMemo(() => {
        return videos.filter(n => {
            const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase());

            // View Mode Filter
            if (viewTargeting === 'packages') {
                if (n.is_general) return false;
                if (activeFilters.package && !n.packages.includes(activeFilters.package)) return false;
            } else if (viewTargeting === 'general') {
                if (!n.is_general) return false;
                if (activeFilters.session && n.session !== activeFilters.session) return false;
                if (activeFilters.class_level && n.class_level !== activeFilters.class_level) return false;
                if (activeFilters.subject && n.subject !== activeFilters.subject) return false;
                if (activeFilters.exam_type && n.exam_type !== activeFilters.exam_type) return false;
                if (activeFilters.target_exam && n.target_exam !== activeFilters.target_exam) return false;
                if (activeFilters.section && n.section !== activeFilters.section) return false;
            }

            return matchesSearch;
        });
    }, [videos, searchQuery, activeFilters, viewTargeting]);

    // Dynamic Filter Options
    const dynamicFilterOptions = useMemo(() => {
        return {
            sessions: sessions.filter(s => videos.some(n => n.session === s.id)),
            classes: classes.filter(c => videos.some(n => n.class_level === c.id)),
            subjects: subjects.filter(s => videos.some(n => n.subject === s.id)),
            examTypes: examTypes.filter(e => videos.some(n => n.exam_type === e.id)),
            targetExams: targetExams.filter(t => videos.some(n => n.target_exam === t.id)),
            sections: sections.filter(s => videos.some(n => n.section === s.id))
        };
    }, [videos, sessions, classes, subjects, examTypes, targetExams, sections]);

    // Pagination
    const totalPages = Math.ceil(filteredVideos.length / itemsPerPage);
    const paginatedVideos = filteredVideos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className={`min-h-screen p-8 ${isDarkMode ? 'bg-[#0f1419] text-white' : 'bg-gray-50 text-gray-900'}`}>
            <div className="max-w-[1600px] mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-amber-500/10 rounded-[5px]">
                                <Video className="text-amber-500" size={24} />
                            </div>
                            <h1 className="text-3xl font-black uppercase tracking-tight">
                                All <span className="text-amber-500">Videos</span>
                            </h1>
                        </div>
                        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            Manage and organize educational videos for students.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black text-sm uppercase tracking-widest rounded-[5px] shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Plus size={18} /> Add Video
                    </button>
                </div>

                {/* Search & Filters */}
                <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-[#1a1f2e] border-white/5' : 'bg-white border-slate-200'} space-y-4`}>
                    <div className="flex items-center gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Enter the name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-12 pr-4 py-3 rounded-[5px] border-2 outline-none font-bold text-sm transition-all ${isDarkMode ? 'bg-[#0f1419] border-white/5 text-white focus:border-amber-500/50' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-amber-500'}`}
                            />
                        </div>
                        <button
                            onClick={fetchVideos}
                            className={`p-3 rounded-[5px] border-2 transition-all ${isDarkMode ? 'bg-[#0f1419] border-white/5 hover:border-amber-500/50' : 'bg-slate-50 border-slate-200 hover:border-amber-500'}`}
                        >
                            <RefreshCw size={18} className="text-amber-500" />
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Toggle View Mode */}
                        <div className={`p-1 rounded-[5px] flex items-center gap-1 border transition-all ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                            <span className="px-2 text-[10px] font-black uppercase tracking-widest opacity-50">Targeting:</span>
                            <button
                                onClick={() => setViewTargeting('all')}
                                className={`px-3 py-1.5 rounded-[5px] text-[10px] font-black uppercase tracking-wide transition-all ${viewTargeting === 'all' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'opacity-60 hover:opacity-100'}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setViewTargeting('packages')}
                                className={`px-3 py-1.5 rounded-[5px] text-[10px] font-black uppercase tracking-wide transition-all ${viewTargeting === 'packages' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'opacity-60 hover:opacity-100'}`}
                            >
                                Packages
                            </button>
                            <button
                                onClick={() => setViewTargeting('general')}
                                className={`px-3 py-1.5 rounded-[5px] text-[10px] font-black uppercase tracking-wide transition-all ${viewTargeting === 'general' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'opacity-60 hover:opacity-100'}`}
                            >
                                General
                            </button>
                        </div>

                        <div className={`w-px h-8 mx-2 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>

                        <div className={`p-2 rounded-[5px] flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                            <Filter size={14} /> Filters
                        </div>

                        {viewTargeting === 'all' ? (
                            <span className={`px-4 py-2.5 rounded-[5px] font-bold text-xs ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>Showing all videos</span>
                        ) : viewTargeting === 'packages' ? (
                            <select
                                value={activeFilters.package}
                                onChange={(e) => setActiveFilters({ ...activeFilters, package: e.target.value })}
                                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                className={`px-4 py-2.5 rounded-[5px] font-bold text-xs outline-none border-none cursor-pointer transition-all ${isDarkMode ? 'bg-[#1a1f2e] text-white hover:bg-[#252c41]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                            >
                                <option value="">All Packages</option>
                                {packages.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                            </select>
                        ) : (
                            <>
                                <select
                                    value={activeFilters.session}
                                    onChange={(e) => setActiveFilters({ ...activeFilters, session: e.target.value })}
                                    style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                    className={`px-4 py-2.5 rounded-[5px] font-bold text-xs outline-none border-none cursor-pointer transition-all ${isDarkMode ? 'bg-[#1a1f2e] text-white hover:bg-[#252c41]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                                >
                                    <option value="">All Sessions</option>
                                    {dynamicFilterOptions.sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <select
                                    value={activeFilters.class_level}
                                    onChange={(e) => setActiveFilters({ ...activeFilters, class_level: e.target.value })}
                                    style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                    className={`px-4 py-2.5 rounded-[5px] font-bold text-xs outline-none border-none cursor-pointer transition-all ${isDarkMode ? 'bg-[#1a1f2e] text-white hover:bg-[#252c41]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                                >
                                    <option value="">All Classes</option>
                                    {dynamicFilterOptions.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <select
                                    value={activeFilters.subject}
                                    onChange={(e) => setActiveFilters({ ...activeFilters, subject: e.target.value })}
                                    style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                    className={`px-4 py-2.5 rounded-[5px] font-bold text-xs outline-none border-none cursor-pointer transition-all ${isDarkMode ? 'bg-[#1a1f2e] text-white hover:bg-[#252c41]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                                >
                                    <option value="">All Subjects</option>
                                    {dynamicFilterOptions.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </>
                        )}

                        {(activeFilters.session || activeFilters.class_level || activeFilters.subject || activeFilters.exam_type || activeFilters.target_exam || activeFilters.section || activeFilters.package) && (
                            <button
                                onClick={() => setActiveFilters({ session: '', class_level: '', subject: '', exam_type: '', target_exam: '', section: '', package: '' })}
                                className="px-4 py-2.5 rounded-[5px] font-bold text-[10px] uppercase tracking-widest text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10 active:scale-95"
                            >
                                Clear All Filters
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className={`rounded-[5px] border overflow-hidden ${isDarkMode ? 'bg-[#1a1f2e] border-white/5' : 'bg-white border-slate-200'}`}>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent"></div>
                        </div>
                    ) : paginatedVideos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Video size={48} className="text-slate-400 mb-4" />
                            <p className="text-slate-400 font-bold">No videos found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className={`${isDarkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                                    <tr>
                                        <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest opacity-60">#</th>
                                        <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest opacity-60">Title</th>
                                        <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest opacity-60">Link</th>
                                        <th className="py-4 px-6 text-center text-[10px] font-black uppercase tracking-widest opacity-60">Type</th>
                                        <th className="py-4 px-6 text-center text-[10px] font-black uppercase tracking-widest opacity-60">Targeting</th>
                                        <th className="py-4 px-6 text-center text-[10px] font-black uppercase tracking-widest opacity-60">Description</th>
                                        <th className="py-4 px-6 text-center text-[10px] font-black uppercase tracking-widest opacity-60">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedVideos.map((item, index) => (
                                        <tr key={item.id} className={`border-t ${isDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50'} transition-colors`}>
                                            <td className="py-5 px-6 text-sm font-bold">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                            <td className="py-5 px-6 text-sm font-bold max-w-xs truncate">{item.title}</td>
                                            <td className="py-5 px-6 text-xs max-w-xs truncate">
                                                <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                                    {item.link}
                                                </a>
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                <span className={`px-2 py-1 rounded-[5px] text-[10px] font-black uppercase ${item.is_general ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                                                    {item.is_general ? 'General' : 'Package'}
                                                </span>
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                <div className="flex flex-col gap-1 items-center justify-center">
                                                    {item.is_general ? (
                                                        <>
                                                            {item.subject_name ? (
                                                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase rounded-[5px] border border-emerald-500/20">{item.subject_name}</span>
                                                            ) : <span className="text-[9px] font-black uppercase opacity-20">General</span>}
                                                            {item.class_name && <span className="text-[8px] font-black uppercase opacity-40">{item.class_name}</span>}
                                                        </>
                                                    ) : (
                                                        <div className="flex flex-col gap-1">
                                                            {item.package_names && item.package_names.length > 0 ? (
                                                                item.package_names.slice(0, 2).map((p, i) => (
                                                                    <span key={i} className="px-2 py-0.5 bg-purple-500/10 text-purple-500 text-[9px] font-black uppercase rounded-[5px] border border-purple-500/20 max-w-[150px] truncate">{p}</span>
                                                                ))
                                                            ) : <span className="text-[9px] opacity-30">-</span>}
                                                            {item.package_names && item.package_names.length > 2 && (
                                                                <span className="text-[9px] opacity-40">+{item.package_names.length - 2} more</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 text-xs text-center max-w-xs truncate opacity-60">{item.description || '-'}</td>
                                            <td className="py-5 px-6">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEditClick(item)}
                                                        className="p-2 rounded-[5px] bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(item.id)}
                                                        className="p-2 rounded-[5px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 0 && (
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className={`text-sm font-bold opacity-60 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredVideos.length)} of {filteredVideos.length} entries
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold opacity-60 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Rows per page:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className={`px-3 py-2 rounded-[5px] font-bold text-sm outline-none border-2 cursor-pointer transition-all ${isDarkMode ? 'bg-[#1a1f2e] border-white/5 text-white hover:border-amber-500/50' : 'bg-white border-slate-200 text-slate-700 hover:border-amber-500'}`}
                                >
                                    {[5, 10, 20, 50, 100].map(size => (
                                        <option key={size} value={size}>{size}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className={`p-2 rounded-[5px] transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-amber-500 hover:text-white'} ${isDarkMode ? 'bg-[#1a1f2e] text-white' : 'bg-white text-slate-700'}`}
                                >
                                    First
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className={`px-4 py-2 rounded-[5px] font-bold text-sm transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-amber-500 hover:text-white'} ${isDarkMode ? 'bg-[#1a1f2e] text-white' : 'bg-white text-slate-700'}`}
                                >
                                    Previous
                                </button>

                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Page</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max={totalPages}
                                        value={jumpToPage}
                                        onChange={(e) => setJumpToPage(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const page = parseInt(jumpToPage);
                                                if (page >= 1 && page <= totalPages) {
                                                    setCurrentPage(page);
                                                    setJumpToPage('');
                                                }
                                            }
                                        }}
                                        placeholder={currentPage.toString()}
                                        className={`w-12 px-2 py-1 rounded-[5px] text-center font-bold text-sm outline-none border-2 transition-all ${isDarkMode ? 'bg-[#1a1f2e] border-white/5 text-white focus:border-amber-500' : 'bg-white border-slate-200 text-slate-700 focus:border-amber-500'}`}
                                    />
                                    <span className={`text-sm font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>of {totalPages}</span>
                                </div>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className={`px-4 py-2 rounded-[5px] font-bold text-sm transition-all ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:bg-amber-500 hover:text-white'} ${isDarkMode ? 'bg-[#1a1f2e] text-white' : 'bg-white text-slate-700'}`}
                                >
                                    Next
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className={`p-2 rounded-[5px] transition-all ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:bg-amber-500 hover:text-white'} ${isDarkMode ? 'bg-[#1a1f2e] text-white' : 'bg-white text-slate-700'}`}
                                >
                                    Last
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {(isAddModalOpen || isEditModalOpen) && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[5px] border ${isDarkMode ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-slate-200'} shadow-2xl`}>
                        <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${isDarkMode ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-slate-200'}`}>
                            <h2 className="text-2xl font-black uppercase tracking-tight">
                                {isEditModalOpen ? 'Edit' : 'Add'} <span className="text-amber-500">Video</span>
                            </h2>
                            <button
                                onClick={() => {
                                    setIsAddModalOpen(false);
                                    setIsEditModalOpen(false);
                                    setSelectedItemForEdit(null);
                                    resetForm();
                                }}
                                className="p-2 rounded-[5px] hover:bg-red-500/10 text-red-500 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={isEditModalOpen ? handleUpdateItem : handleAddItem} className="p-6 space-y-8">
                            {/* Targeting Type Toggle */}
                            <div className="flex items-center gap-4 p-4 rounded-[5px] bg-slate-100 dark:bg-white/5">
                                <span className="text-xs font-black uppercase tracking-widest opacity-60">Targeting Type:</span>
                                <div className="flex bg-white dark:bg-black/20 p-1 rounded-[5px]">
                                    <button
                                        type="button"
                                        onClick={() => setNewItem({ ...newItem, is_general: false })}
                                        className={`px-4 py-2 rounded-[5px] text-xs font-bold transition-all ${!newItem.is_general ? 'bg-amber-500 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                                    >
                                        Packages
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewItem({ ...newItem, is_general: true })}
                                        className={`px-4 py-2 rounded-[5px] text-xs font-bold transition-all ${newItem.is_general ? 'bg-amber-500 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                                    >
                                        General (Master Data)
                                    </button>
                                </div>
                            </div>

                            {!newItem.is_general ? (
                                /* Package Selection */
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Select Packages *</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[200px] overflow-y-auto custom-scrollbar p-2 rounded-[5px] border border-dashed border-slate-300 dark:border-white/10">
                                        {packages.map(pkg => (
                                            <label key={pkg._id} className={`flex items-center gap-3 p-3 rounded-[5px] border transition-all cursor-pointer ${newItem.packages.includes(pkg._id) ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'bg-white dark:bg-white/5 border-transparent hover:bg-slate-50 dark:hover:bg-white/10'}`}>
                                                <div className={`w-5 h-5 rounded-[5px] border-2 flex items-center justify-center transition-all ${newItem.packages.includes(pkg._id) ? 'bg-amber-500 border-amber-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                                    {newItem.packages.includes(pkg._id) && <CheckCircle size={12} className="text-white" />}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={newItem.packages.includes(pkg._id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setNewItem(prev => ({ ...prev, packages: [...prev.packages, pkg._id] }));
                                                        } else {
                                                            setNewItem(prev => ({ ...prev, packages: prev.packages.filter(id => id !== pkg._id) }));
                                                        }
                                                    }}
                                                />
                                                <span className="text-xs font-bold">{pkg.name}</span>
                                            </label>
                                        ))}
                                        {packages.length === 0 && <p className="text-xs opacity-50 p-4">No packages found.</p>}
                                    </div>
                                </div>
                            ) : (
                                /* Master Data Grid */
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {[
                                        { label: 'Session', field: 'session', options: sessions },
                                        { label: 'Class', field: 'class_level', options: classes },
                                        { label: 'Subject', field: 'subject', options: subjects },
                                        { label: 'Exam Type', field: 'exam_type', options: examTypes },
                                        { label: 'Target Exam', field: 'target_exam', options: targetExams },
                                        { label: 'Section', field: 'section', options: sections }
                                    ].map(meta => (
                                        <div key={meta.field}>
                                            <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 ml-1">{meta.label}</label>
                                            <select
                                                value={newItem[meta.field]}
                                                onChange={(e) => setNewItem({ ...newItem, [meta.field]: e.target.value })}
                                                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                                className={`w-full px-4 py-3 rounded-[5px] border-2 outline-none font-bold text-xs transition-all ${isDarkMode ? 'bg-[#1a1f2e] border-white/5 text-white focus:border-amber-500/50' : 'bg-white border-slate-200 text-slate-800 focus:border-amber-500'}`}
                                            >
                                                <option value="">All {meta.label}s</option>
                                                {meta.options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Video Details */}
                            <div className="grid grid-cols-1 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 ml-1">Video Title *</label>
                                        <input
                                            required
                                            type="text"
                                            value={newItem.title}
                                            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                                            placeholder="Enter video title"
                                            className={`w-full px-4 py-3 rounded-[5px] border-2 outline-none font-bold text-sm transition-all ${isDarkMode ? 'bg-[#0f1419] border-white/5 text-white focus:border-amber-500/50' : 'bg-white border-slate-200 text-slate-800 focus:border-amber-500'}`}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 ml-1">Video Link *</label>
                                        <input
                                            required
                                            type="url"
                                            value={newItem.link}
                                            onChange={(e) => setNewItem({ ...newItem, link: e.target.value })}
                                            placeholder="https://youtube.com/watch?v=..."
                                            className={`w-full px-4 py-3 rounded-[5px] border-2 outline-none font-bold text-sm transition-all ${isDarkMode ? 'bg-[#0f1419] border-white/5 text-white focus:border-amber-500/50' : 'bg-white border-slate-200 text-slate-800 focus:border-amber-500'}`}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 ml-1">Description</label>
                                        <textarea
                                            value={newItem.description}
                                            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                            placeholder="Enter video description"
                                            rows={4}
                                            className={`w-full px-4 py-3 rounded-[5px] border-2 outline-none font-bold text-sm transition-all resize-none ${isDarkMode ? 'bg-[#0f1419] border-white/5 text-white focus:border-amber-500/50' : 'bg-white border-slate-200 text-slate-800 focus:border-amber-500'}`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAddModalOpen(false);
                                        setIsEditModalOpen(false);
                                        setSelectedItemForEdit(null);
                                        resetForm();
                                    }}
                                    className="px-6 py-3 rounded-[5px] font-bold text-sm uppercase tracking-widest bg-slate-500/10 text-slate-500 hover:bg-slate-500 hover:text-white transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isActionLoading}
                                    className="px-6 py-3 rounded-[5px] font-bold text-sm uppercase tracking-widest bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isActionLoading ? 'Saving...' : isEditModalOpen ? 'Update Video' : 'Add Video'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoRegistry;
