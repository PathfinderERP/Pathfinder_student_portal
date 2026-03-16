import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Filter, BookOpen, Download, Eye, FileText, ChevronRight, GraduationCap, Loader2, X, Maximize2, Minimize2, RefreshCw, PlayCircle, ExternalLink } from 'lucide-react';
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
    const [viewPage, setViewPage] = useState(1); // 1 for Info, 2 for Content
    const [isFullScreen, setIsFullScreen] = useState(false);

    const getYouTubeThumbnail = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        if (match && match[2].length === 11) {
            return `https://img.youtube.com/vi/${match[2]}/maxresdefault.jpg`;
        }
        if (url?.includes('vimeo.com')) {
            return 'https://f.vimeocdn.com/images_v6/default_640.png';
        }
        return null;
    };

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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {filteredMaterials.map((item) => (
                        <div
                            key={item.id}
                            className={`group p-4 rounded-[5px] border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1
                                ${isDarkMode ? 'bg-[#10141D] border-white/5 hover:border-orange-500/30' : 'bg-white border-slate-100 shadow-sm hover:border-orange-200'}`}
                        >
                            <div className="relative aspect-video sm:aspect-[4/3] rounded-[5px] overflow-hidden mb-4 bg-slate-100 dark:bg-white/5 border border-white/5 shadow-inner">
                                {item.thumbnail ? (
                                    <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                ) : (item.video_link && getYouTubeThumbnail(item.video_link)) ? (
                                    <img src={getYouTubeThumbnail(item.video_link)} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center opacity-30 group-hover:opacity-50 transition-opacity">
                                        <div className={`w-12 h-12 rounded-[5px] mb-2 flex items-center justify-center bg-gradient-to-br ${getSubjectGradient(item.subject_name)}`}>
                                            {(item.video_link || item.video_file) ? <PlayCircle size={24} className="text-white" /> : <FileText size={24} className="text-white" />}
                                        </div>
                                        <p className="text-[8px] font-black uppercase tracking-widest">{item.subject_name}</p>
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-sm">
                                    <div className="flex flex-col gap-2 px-4 w-full">
                                        <button
                                            onClick={() => { setSelectedItem(item); setViewPage(1); }}
                                            className="w-full py-2 bg-white text-black rounded-[5px] font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <Eye size={14} strokeWidth={3} /> { (item.video_link || item.video_file) ? 'Watch Video' : 'View PDF' }
                                        </button>
                                        {item.pdf_file && (
                                            <a
                                                href={item.pdf_file}
                                                download
                                                className="w-full py-2 bg-orange-500 text-white rounded-[5px] font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                                            >
                                                <Download size={14} strokeWidth={3} /> Download
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className={`px-2 py-0.5 rounded-[5px] text-[7px] font-black uppercase tracking-widest border
                                        ${isDarkMode ? 'bg-white/5 border-white/5 text-orange-400' : 'bg-orange-50 border-orange-100 text-orange-600'}`}>
                                        {item.subject_name}
                                    </span>
                                    <span className="text-[7px] font-black uppercase tracking-widest opacity-30">
                                        {(item.video_link || item.video_file) ? 'Video Content' : 'PDF Document'}
                                    </span>
                                </div>
                                <h3 className={`font-black text-sm sm:text-base leading-tight uppercase tracking-tight group-hover:text-orange-500 transition-colors line-clamp-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {item.name}
                                </h3>
                                <p className={`text-[10px] font-medium line-clamp-1 opacity-60 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {item.description || 'No description available'}
                                </p>

                                <button 
                                    onClick={() => { setSelectedItem(item); setViewPage(1); }}
                                    className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all group-hover:translate-x-1 ${isDarkMode ? 'text-orange-500' : 'text-orange-600'}`}
                                >
                                    Learn More <ChevronRight size={12} />
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
                <div className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-300 ${isFullScreen ? 'p-0' : 'p-4 md:p-10'}`}>
                    <div className={`w-full max-w-6xl transition-all duration-300 overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col ${isFullScreen ? 'h-full rounded-none' : 'h-[85vh] rounded-[5px]'}`}>
                        <div className={`flex items-center justify-between px-8 pt-16 pb-8 border-b relative z-20 ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-100'}`}>
                            <div className="flex items-center gap-6">
                                <div className={`w-14 h-14 rounded-[5px] flex items-center justify-center text-white shadow-xl bg-gradient-to-br ${getSubjectGradient(selectedItem.subject_name)}`}>
                                    {(selectedItem.video_link || selectedItem.video_file) ? <PlayCircle size={28} /> : <FileText size={28} />}
                                </div>
                                <div className="space-y-2">
                                    <h4 className={`text-2xl font-black uppercase tracking-tight leading-normal ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedItem.name}</h4>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">{selectedItem.subject_name} • {(selectedItem.video_link || selectedItem.video_file) ? 'Video Player' : 'Document Reader'}</p>
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

                        <div className={`flex-grow flex flex-col md:flex-row relative ${isDarkMode ? 'bg-[#0A0D14]' : 'bg-slate-50'}`}>
                            {viewPage === 1 ? (
                                <div className="flex flex-col lg:flex-row items-center justify-center w-full h-full p-6 sm:p-10 gap-8 sm:gap-16 overflow-y-auto custom-scrollbar">
                                    <div className={`relative group overflow-hidden rounded-[5px] shadow-2xl w-full max-w-[20rem] aspect-[3/4] border-[8px] flex-shrink-0 flex items-center justify-center ${isDarkMode ? 'bg-black/40 border-white/5' : 'bg-white border-slate-200'}`}>
                                        {selectedItem.thumbnail ? (
                                            <img src={selectedItem.thumbnail} alt={selectedItem.name} className="w-full h-full object-contain p-2" />
                                        ) : (selectedItem.video_link && getYouTubeThumbnail(selectedItem.video_link)) ? (
                                            <img src={getYouTubeThumbnail(selectedItem.video_link)} alt={selectedItem.name} className="w-full h-full object-contain" />
                                        ) : (
                                            <div className={`w-full h-full flex flex-col items-center justify-center ${isDarkMode ? 'text-white/20' : 'text-slate-300'}`}>
                                                {(selectedItem.video_link || selectedItem.video_file) ? <PlayCircle size={100} strokeWidth={1} /> : <FileText size={100} strokeWidth={1} />}
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                                    </div>

                                    <div className="max-w-xl text-center lg:text-left space-y-6">
                                        <div className="space-y-2">
                                            <span className={`px-3 py-1 rounded-[5px] text-[10px] font-black uppercase tracking-[0.2em] border ${isDarkMode ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' : 'bg-orange-50 border-orange-100 text-orange-600'}`}>
                                                {selectedItem.subject_name}
                                            </span>
                                            <h2 className={`text-3xl sm:text-4xl font-black uppercase leading-tight tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                {selectedItem.name}
                                            </h2>
                                        </div>
                                        
                                        <p className={`text-sm sm:text-base font-medium leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {selectedItem.description || 'No detailed description available for this learning resource. This module contains essential core concepts and practice materials tailored for your upcoming examinations.'}
                                        </p>

                                        <div className="flex flex-wrap gap-4 justify-center lg:justify-start pt-4">
                                            {(selectedItem.pdf_file || selectedItem.video_link || selectedItem.video_file) && (
                                                <button
                                                    onClick={() => setViewPage(2)}
                                                    className="group/btn px-10 py-5 bg-orange-500 hover:bg-orange-600 text-white rounded-[5px] font-black uppercase tracking-widest shadow-2xl shadow-orange-500/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-4"
                                                >
                                                    {(selectedItem.video_link || selectedItem.video_file) ? <PlayCircle size={24} strokeWidth={2.5} className="group-hover/btn:animate-pulse" /> : <Eye size={24} strokeWidth={2.5} />}
                                                    <span>{(selectedItem.video_link || selectedItem.video_file) ? 'Launch Video Player' : 'Open Document Reader'}</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-full bg-black flex items-center justify-center relative">
                                    <button 
                                        onClick={() => setViewPage(1)}
                                        className="absolute top-6 left-6 z-50 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-[5px] transition-all flex items-center gap-2 font-black uppercase text-[10px] tracking-widest"
                                    >
                                        <ChevronRight size={16} className="rotate-180" /> Back to Info
                                    </button>
                                    {selectedItem.pdf_file && !selectedItem.video_link && !selectedItem.video_file ? (
                                        <iframe
                                            src={selectedItem.pdf_file}
                                            className="w-full h-full border-none bg-white font-black"
                                            title="PDF Reader"
                                        />
                                    ) : selectedItem.video_link ? (
                                        <div className="w-full h-full">
                                            {(selectedItem.video_link.includes('youtube.com') || selectedItem.video_link.includes('youtu.be')) ? (
                                                <iframe
                                                    src={selectedItem.video_link.replace('watch?v=', 'embed/').split('&')[0]}
                                                    className="w-full h-full border-none"
                                                    allowFullScreen
                                                    title="YouTube Player"
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full text-white gap-4">
                                                    <ExternalLink size={48} />
                                                    <a href={selectedItem.video_link} target="_blank" rel="noopener noreferrer" className="text-orange-500 font-black uppercase hover:underline">
                                                        Launch External Video Player
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    ) : selectedItem.video_file ? (
                                        <video
                                            src={selectedItem.video_file}
                                            className="max-w-full max-h-full"
                                            controls
                                            autoPlay
                                        />
                                    ) : (
                                        <div className="text-white/30 font-black uppercase tracking-widest">Resource Unavailable</div>
                                    )}
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
