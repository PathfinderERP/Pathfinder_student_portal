import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Filter, BookOpen, Download, Eye, FileText, ChevronRight, GraduationCap, Loader2, X, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'react-hot-toast';

const StudyMaterials = ({ isDarkMode, cache, setCache }) => {
    const { getApiUrl, token } = useAuth();

    // Use a ref for comparison to avoid the infinite loop in dependency arrays
    const materialsRef = useRef(cache?.loaded ? cache.data : []);
    const [materials, setMaterials] = useState(materialsRef.current);
    const [isLoading, setIsLoading] = useState(!cache?.loaded);

    const [searchQuery, setSearchQuery] = useState('');
    const [activeSubject, setActiveSubject] = useState('All');

    // View Modal State
    const [selectedItem, setSelectedItem] = useState(null);
    const [isFullScreen, setIsFullScreen] = useState(false);

    const fetchMaterials = useCallback(async (isBackground = false) => {
        if (!isBackground) setIsLoading(true);

        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/master-data/library/`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            const data = response.data;

            // Use materialsRef.current instead of materials from state closure
            const isDataSame = JSON.stringify(data) === JSON.stringify(materialsRef.current);
            if (!isDataSame) {
                materialsRef.current = data;
                setMaterials(data);
                if (setCache) {
                    setCache({ data: data, loaded: true });
                }
            }

        } catch (error) {
            console.error("Failed to fetch study materials", error);
            // Fallback to mock data if API fails or for demo

            const mockData = [
                { id: 1, name: 'Physics Module: Kinematics', subject_name: 'Physics', description: 'Comprehensive guide covering 1D and 2D motion with practice problems.', thumbnail: null, pdf_file: '#' },
                { id: 2, name: 'Organic Chemistry: Basics', subject_name: 'Chemistry', description: 'Introduction to carbon compounds and functional groups.', thumbnail: null, pdf_file: '#' },
                { id: 3, name: 'Calculus: Integration Techniques', subject_name: 'Mathematics', description: 'Advanced methods for solving complex integrals.', thumbnail: null, pdf_file: '#' },
                { id: 4, name: 'Biology: Cell Structure', subject_name: 'Biology', description: 'Detailed analysis of plant and animal cell components.', thumbnail: null, pdf_file: '#' },
                { id: 5, name: 'Modern Physics Notes', subject_name: 'Physics', description: 'Key concepts of quantum mechanics and relativity.', thumbnail: null, pdf_file: '#' },
            ];

            const isDataSame = JSON.stringify(mockData) === JSON.stringify(materialsRef.current);
            if (!isDataSame) {
                materialsRef.current = mockData;
                setMaterials(mockData);
                if (setCache) {
                    setCache({ data: mockData, loaded: true });
                }
            }
        } finally {
            if (!isBackground) setIsLoading(false);
        }
    }, [getApiUrl, token, setCache]);

    useEffect(() => {
        if (!cache?.loaded) {
            fetchMaterials(false);
        } else {
            // Background sync on mount
            fetchMaterials(true);
        }
    }, [fetchMaterials, cache?.loaded]);

    const subjects = useMemo(() => {
        return ['All', ...new Set(materials.map(m => m.subject_name).filter(Boolean))];
    }, [materials]);

    const filteredMaterials = useMemo(() => {
        return materials.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSubject = activeSubject === 'All' || item.subject_name === activeSubject;
            return matchesSearch && matchesSubject;
        });
    }, [materials, searchQuery, activeSubject]);

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header section with Stats */}
            <div className={`p-5 sm:p-8 rounded-[5px] border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-[5px] bg-orange-500/10 text-orange-500 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">
                                Digital Library
                            </div>
                        </div>
                        <h2 className={`text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            Study Materials
                        </h2>
                        <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Access premium revision modules, practice sets, and detailed subject notes.
                        </p>
                    </div>

                    <div className="flex gap-4 items-center w-full md:w-auto">
                        <div className={`flex-1 md:flex-none px-4 sm:px-6 py-3 sm:py-4 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                            <p className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>Total Resources</p>
                            <p className={`text-xl sm:text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{materials.length}</p>
                        </div>
                        <button
                            onClick={() => fetchMaterials(false)}
                            disabled={isLoading}
                            className={`p-3.5 sm:p-4 rounded-[5px] transition-all active:scale-95 border ${isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10 text-white' : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-700'}`}
                            title="Sync Library"
                        >
                            <RefreshCw size={20} sm={24} className={isLoading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {/* Decorative background element */}
                <BookOpen size={160} className="absolute -right-10 -bottom-10 opacity-[0.03] rotate-12 hidden sm:block" />
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-slate-600 group-focus-within:text-orange-500' : 'text-slate-400 group-focus-within:text-orange-500'}`} size={16} sm={18} />
                    <input
                        type="text"
                        placeholder="Search materials..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-11 pr-4 py-3 sm:py-4 rounded-[5px] border-2 outline-none font-bold text-xs sm:text-sm transition-all
                            ${isDarkMode ? 'bg-white/[0.02] border-white/5 text-white focus:border-orange-500/50' : 'bg-white border-slate-100 text-slate-800 focus:border-orange-500'}`}
                    />
                </div>

                <div className="flex overflow-x-auto pb-2 md:pb-0 gap-2 no-scrollbar scroll-smooth">
                    {subjects.map(subject => (
                        <button
                            key={subject}
                            onClick={() => setActiveSubject(subject)}
                            className={`px-4 sm:px-6 py-2.5 sm:py-4 rounded-[5px] font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all whitespace-nowrap border-2
                                ${activeSubject === subject
                                    ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20 scale-105'
                                    : (isDarkMode ? 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10' : 'bg-white border-slate-100 text-slate-500 hover:border-orange-200 hover:text-orange-600')}`}
                        >
                            {subject}
                        </button>
                    ))}
                </div>
            </div>

            {/* Materials Grid */}
            {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <Loader2 size={40} className="animate-spin text-orange-500" />
                    <p className="font-bold opacity-50 uppercase tracking-widest">Loading Resources...</p>
                </div>
            ) : filteredMaterials.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMaterials.map((item) => (
                        <div
                            key={item.id}
                            className={`group p-6 rounded-[5px] border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1
                                ${isDarkMode ? 'bg-[#10141D] border-white/5 hover:border-orange-500/30' : 'bg-white border-slate-100 shadow-sm hover:border-orange-200'}`}
                        >
                            <div className="relative aspect-[3/4] rounded-[5px] overflow-hidden mb-6 bg-slate-100 dark:bg-white/5 border border-white/5 shadow-inner">
                                {item.thumbnail ? (
                                    <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center opacity-30 group-hover:opacity-50 transition-opacity">
                                        <div className={`w-20 h-20 rounded-[5px] mb-4 flex items-center justify-center bg-gradient-to-br ${getSubjectGradient(item.subject_name)}`}>
                                            <FileText size={40} className="text-white" />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-widest">{item.subject_name}</p>
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-sm">
                                    <div className="flex flex-col gap-3 px-8 w-full">
                                        <button
                                            onClick={() => setSelectedItem(item)}
                                            className="w-full py-3 bg-white text-black rounded-[5px] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <Eye size={16} strokeWidth={3} /> View Content
                                        </button>
                                        {item.pdf_file && (
                                            <a
                                                href={item.pdf_file}
                                                download
                                                className="w-full py-3 bg-orange-500 text-white rounded-[5px] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                                            >
                                                <Download size={16} strokeWidth={3} /> Download
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className={`px-2 py-0.5 rounded-[5px] text-[8px] font-black uppercase tracking-widest border
                                        ${isDarkMode ? 'bg-white/5 border-white/5 text-orange-400' : 'bg-orange-50 border-orange-100 text-orange-600'}`}>
                                        {item.subject_name}
                                    </span>
                                    <span className="text-[8px] font-black uppercase tracking-widest opacity-30">PDF Document</span>
                                </div>
                                <h3 className={`font-black text-lg leading-tight uppercase tracking-tight group-hover:text-orange-500 transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {item.name}
                                </h3>
                                <p className={`text-xs font-medium line-clamp-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                    {item.description}
                                </p>

                                <button className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all group-hover:translate-x-1 ${isDarkMode ? 'text-orange-500' : 'text-orange-600'}`}>
                                    Learn More <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={`py-20 text-center rounded-[5px] border-2 border-dashed ${isDarkMode ? 'border-white/5 bg-white/[0.01]' : 'border-slate-100 bg-slate-50'}`}>
                    <div className="flex flex-col items-center gap-4 opacity-30">
                        <BookOpen size={60} />
                        <div className="space-y-1">
                            <p className="font-black uppercase tracking-[0.2em] text-sm">No materials found</p>
                            <p className="text-xs font-bold">Try adjusting your filters or search query</p>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {selectedItem && (
                <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-300 ${isFullScreen ? 'p-0' : 'p-4 md:p-10'}`}>
                    <div className={`w-full max-w-6xl transition-all duration-300 overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col ${isFullScreen ? 'h-full rounded-none' : 'h-[85vh] rounded-[5px]'}`}>
                        <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-100'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-[5px] flex items-center justify-center text-white shadow-lg bg-gradient-to-br ${getSubjectGradient(selectedItem.subject_name)}`}>
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h4 className="text-lg font-black uppercase tracking-tight bg-gradient-to-r from-orange-500 to-indigo-500 bg-clip-text text-transparent">{selectedItem.name}</h4>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{selectedItem.subject_name} • Resource Reader</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsFullScreen(!isFullScreen)}
                                    className={`p-3 rounded-[5px] transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-50 hover:bg-slate-200 text-slate-700'}`}
                                >
                                    {isFullScreen ? <Minimize2 size={20} strokeWidth={3} /> : <Maximize2 size={20} strokeWidth={3} />}
                                </button>
                                <button
                                    onClick={() => setSelectedItem(null)}
                                    className="p-3 bg-red-500 text-white rounded-[5px] transition-all active:scale-95 shadow-lg shadow-red-500/20"
                                >
                                    <X size={20} strokeWidth={3} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-grow bg-slate-100 flex flex-col md:flex-row relative">
                            {selectedItem.pdf_file && selectedItem.pdf_file !== '#' ? (
                                <iframe
                                    src={selectedItem.pdf_file}
                                    className="w-full h-full border-none bg-white"
                                    title="Study Material Viewer"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-20 text-center gap-6">
                                    <div className="w-32 h-32 rounded-[5px] bg-slate-200 dark:bg-white/5 flex items-center justify-center opacity-40">
                                        <FileText size={64} />
                                    </div>
                                    <div className="max-w-md space-y-4">
                                        <h3 className="text-xl font-black uppercase tracking-tight opacity-40">PDF Viewer Placeholder</h3>
                                        <p className="text-sm font-medium opacity-40">The actual PDF file is not available in this mock record. In production, the document will load here in our high-performance digital reader.</p>
                                        <button
                                            onClick={() => setSelectedItem(null)}
                                            className="px-8 py-3 bg-slate-800 text-white rounded-[5px] font-black uppercase tracking-widest text-xs"
                                        >
                                            Return to Library
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const getSubjectGradient = (subject) => {
    const gradients = {
        'Physics': 'from-blue-500 to-cyan-600',
        'Chemistry': 'from-purple-500 to-indigo-600',
        'Mathematics': 'from-emerald-500 to-green-600',
        'Biology': 'from-orange-500 to-red-600',
        'English': 'from-pink-500 to-rose-600',
    };
    return gradients[subject] || 'from-slate-500 to-slate-600';
};

export default StudyMaterials;
