import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Filter, BookOpen, Download, Eye, FileText, ChevronRight, GraduationCap, Loader2, X, Maximize2, Minimize2, RefreshCw, PlayCircle, ExternalLink } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { toast } from 'react-hot-toast';

const StudyMaterials = ({ cache, setCache, studentClass, initialType = 'VIDEO' }) => {
    const { getApiUrl, token } = useAuth();
    const { isDarkMode } = useTheme();

    // Determine the student's class level for filtering
    // class_name from API looks like "Class 8" or "8"
    const assignedClass = studentClass && studentClass !== 'N/A' ? studentClass.trim() : null;

    // Use a ref for comparison to avoid the infinite loop in dependency arrays
    const materialsRef = useRef(cache?.loaded ? cache.data : []);
    const [materials, setMaterials] = useState(materialsRef.current);
    const [isLoading, setIsLoading] = useState(!cache?.loaded);

    const [searchQuery, setSearchQuery] = useState('');
    const [activeSubject, setActiveSubject] = useState('All');
    const [activeContentType, setActiveContentType] = useState(initialType); // 'VIDEO' | 'STUDY_MATERIAL'

    // Sync with sidebar navigation
    useEffect(() => {
        if (initialType) {
            setActiveContentType(initialType);
        }
    }, [initialType]);

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

    const getYouTubeEmbedUrl = (url) => {
        if (!url) return '';
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        if (match && match[2].length === 11) {
            return `https://www.youtube.com/embed/${match[2]}`;
        }
        return url.replace('watch?v=', 'embed/').split('&')[0].replace('m.youtube.com', 'www.youtube.com').replace('youtu.be/', 'www.youtube.com/embed/');
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
                { id: 2, name: 'Organic Chemistry: Basics (Video)', subject_name: 'Chemistry', description: 'Video introduction to carbon compounds and functional groups.', thumbnail: null, video_link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
                { id: 3, name: 'Calculus: Integration Techniques', subject_name: 'Mathematics', description: 'Advanced methods for solving complex integrals (Handwritten Notes).', thumbnail: null, pdf_file: '#' },
                { id: 4, name: 'Biology: Cell Structure', subject_name: 'Biology', description: 'Detailed analysis of plant and animal cell components.', thumbnail: null, pdf_file: '#' },
                { id: 5, name: 'Modern Physics Notes', subject_name: 'Physics', description: 'Key concepts of quantum mechanics and relativity.', thumbnail: null, video_link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
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
            // Class filter
            if (assignedClass) {
                const itemClass = item.class_name || '';
                const classMatches = itemClass === assignedClass ||
                    itemClass.replace(/\D/g, '') === assignedClass.replace(/\D/g, '');
                if (!classMatches) return false;
            }
            // Content type filter
            const isVideo = !!(item.video_link || item.video_file);
            if (activeContentType === 'STUDY_MATERIAL' && isVideo) return false;
            if (activeContentType === 'VIDEO' && !isVideo) return false;

            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSubject = activeSubject === 'All' || item.subject_name === activeSubject;
            return matchesSearch && matchesSubject;
        });
    }, [materials, searchQuery, activeSubject, assignedClass, activeContentType]);

    const pdfCount = useMemo(() => filteredMaterials.filter(i => !i.video_link && !i.video_file).length, [filteredMaterials]);
    const videoCount = useMemo(() => filteredMaterials.filter(i => !!(i.video_link || i.video_file)).length, [filteredMaterials]);

    return (
        <>
            {/* View Modal - Positioned absolutely at top level */}
            {selectedItem && (
                <div className={`fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 md:p-10 animate-in fade-in duration-300`}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => setSelectedItem(null)} />
                    <div className={`relative w-full max-w-6xl transition-all duration-300 overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col ${isFullScreen ? 'h-full rounded-none m-0' : 'h-[85vh] rounded-[5px]'}`}>
                        <div className={`flex items-center justify-between px-6 py-4 border-b relative z-20 ${isDarkMode ? 'bg-[#10141D] border-white/10 text-white' : 'bg-white border-slate-100 text-slate-900'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-[5px] flex items-center justify-center text-white shadow-xl bg-gradient-to-br ${getSubjectGradient(selectedItem.subject_name)}`}>
                                    {(selectedItem.video_link || selectedItem.video_file) ? <PlayCircle size={24} /> : <FileText size={24} />}
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="text-xl font-black uppercase tracking-tight leading-tight truncate max-w-[200px] sm:max-w-md">{selectedItem.name}</h4>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-500">{selectedItem.subject_name} • {(selectedItem.video_link || selectedItem.video_file) ? 'Video Player' : 'Document Reader'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsFullScreen(!isFullScreen)}
                                    className={`p-2.5 rounded-[5px] transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-50 hover:bg-slate-200 text-slate-700'}`}
                                >
                                    {isFullScreen ? <Minimize2 size={18} strokeWidth={3} /> : <Maximize2 size={18} strokeWidth={3} />}
                                </button>
                                <button
                                    onClick={() => setSelectedItem(null)}
                                    className="p-2.5 bg-red-500 text-white rounded-[5px] transition-all active:scale-95 shadow-lg shadow-red-500/20"
                                >
                                    <X size={18} strokeWidth={3} />
                                </button>
                            </div>
                        </div>

                        <div className={`flex-grow flex flex-col md:flex-row relative ${isDarkMode ? 'bg-[#0A0D14]' : 'bg-slate-50'}`}>
                            {viewPage === 1 ? (
                                <div className="flex flex-col lg:flex-row items-center justify-center w-full h-full p-6 sm:p-12 gap-10 sm:gap-20 overflow-y-auto custom-scrollbar">
                                    <div className={`relative group overflow-hidden rounded-[5px] shadow-2xl w-full max-w-md lg:max-w-lg aspect-video border-[6px] flex-shrink-0 flex items-center justify-center ${isDarkMode ? 'bg-black/40 border-white/5' : 'bg-white border-white'}`}>
                                        {selectedItem.thumbnail ? (
                                            <img src={selectedItem.thumbnail} alt={selectedItem.name} className="w-full h-full object-contain p-2" />
                                        ) : (selectedItem.video_link && getYouTubeThumbnail(selectedItem.video_link)) ? (
                                            <img src={getYouTubeThumbnail(selectedItem.video_link)} alt={selectedItem.name} className="w-full h-full object-contain" />
                                        ) : (
                                            <div className={`w-full h-full flex flex-col items-center justify-center ${isDarkMode ? 'text-white/20' : 'text-slate-300'}`}>
                                                {(selectedItem.video_link || selectedItem.video_file) ? <PlayCircle size={100} strokeWidth={1} /> : <FileText size={100} strokeWidth={1} />}
                                            </div>
                                        )}
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
                                            {selectedItem.description || 'No detailed description available for this learning resource.'}
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
                                                    src={getYouTubeEmbedUrl(selectedItem.video_link)}
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

            <div className="space-y-4 sm:space-y-6 lg:space-y-8 animate-fade-in-up">
                {/* Row 1: Filter and Search Bar */}
                <div className="flex flex-col xl:flex-row gap-4 mb-4">
                    <div className="relative flex-1 group">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-slate-600 group-focus-within:text-orange-500' : 'text-slate-400 group-focus-within:text-orange-500'}`} size={16} />
                        <input
                            type="text"
                            placeholder={`Search in ${activeContentType === 'VIDEO' ? 'Videos' : 'PDFs'}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-[5px] border-2 outline-none font-bold text-xs sm:text-sm transition-all
                            ${isDarkMode ? 'bg-white/[0.02] border-white/5 text-white focus:border-orange-500/50' : 'bg-white border-slate-100 text-slate-800 focus:border-orange-500'}`}
                        />
                    </div>

                    <div className="flex gap-2 items-center overflow-x-auto no-scrollbar">
                        {subjects.map(subject => (
                            <button
                                key={subject}
                                onClick={() => setActiveSubject(subject)}
                                className={`px-5 py-2.5 rounded-[5px] font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all whitespace-nowrap border-2
                                ${activeSubject === subject
                                        ? 'bg-white border-white text-orange-500 shadow-xl scale-105 active:scale-95'
                                        : (isDarkMode ? 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10' : 'bg-white border-slate-100 text-slate-500 hover:border-orange-200 hover:text-orange-600')}`}
                            >
                                {subject}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Row 2: Compact Dynamic Stats Card & Sync */}
                <div className="flex flex-wrap gap-4 items-center">
                    <div className={`px-5 py-3.5 rounded-[5px] border flex items-center gap-4 transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm hover:shadow-md'}`}>
                        <div className={`w-10 h-10 rounded-[5px] flex items-center justify-center flex-shrink-0 ${activeContentType === 'VIDEO' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'}`}>
                            {activeContentType === 'VIDEO' ? <PlayCircle size={18} strokeWidth={2.5} /> : <FileText size={18} strokeWidth={2.5} />}
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-0.5 leading-none">
                                {activeContentType === 'VIDEO' ? 'Total Videos' : 'Total Notes'}
                            </p>
                            <p className={`text-2xl font-black tracking-tight leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {activeContentType === 'VIDEO' ? videoCount : pdfCount}
                            </p>
                        </div>
                    </div>
                    <div className="flex-1"></div>
                    <button
                        onClick={() => fetchMaterials(false)}
                        disabled={isLoading}
                        className={`px-6 py-4 rounded-[5px] flex items-center gap-3 transition-all active:scale-95 border font-black text-[10px] uppercase tracking-widest ${isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10 text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}
                    >
                        <RefreshCw size={18} className={isLoading ? "animate-spin text-orange-500" : "text-orange-500"} />
                        Sync content
                    </button>
                </div>

                {/* Large 4-Column Grid Materials Layout */}
                {isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <Loader2 size={40} className="animate-spin text-orange-500" />
                        <p className="font-bold opacity-50 uppercase tracking-widest">Loading Resources...</p>
                    </div>
                ) : filteredMaterials.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {filteredMaterials.map((item) => (
                            <div
                                key={item.id}
                                className={`group p-5 rounded-[5px] border transition-all duration-300 hover:shadow-2xl hover:-translate-y-3
                                ${isDarkMode ? 'bg-[#10141D] border-white/5 hover:border-orange-500/30' : 'bg-white border-slate-100 shadow-sm hover:border-orange-200'}`}
                            >
                                <div className="relative aspect-video rounded-[5px] overflow-hidden mb-6 bg-slate-50 dark:bg-white/5 border border-white/5 shadow-inner">
                                    {item.thumbnail ? (
                                        <img src={item.thumbnail} alt={item.name} className={`w-full h-full ${(item.video_link || item.video_file) ? 'object-cover' : 'object-contain'} transition-transform duration-700 group-hover:scale-110`} />
                                    ) : (item.video_link && getYouTubeThumbnail(item.video_link)) ? (
                                        <img src={getYouTubeThumbnail(item.video_link)} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center opacity-30 group-hover:opacity-50 transition-opacity">
                                            <div className={`w-16 h-16 rounded-[5px] mb-4 flex items-center justify-center bg-gradient-to-br ${getSubjectGradient(item.subject_name)}`}>
                                                {(item.video_link || item.video_file) ? <PlayCircle size={32} className="text-white" /> : <FileText size={32} className="text-white" />}
                                            </div>
                                            <p className="text-[12px] font-black uppercase tracking-[0.2em]">{item.subject_name}</p>
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-sm">
                                        <div className="flex flex-col gap-2 px-4 w-full">
                                            <button
                                                onClick={() => { setSelectedItem(item); setViewPage(1); }}
                                                className="w-full py-2 bg-white text-black rounded-[5px] font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <Eye size={14} strokeWidth={3} /> {(item.video_link || item.video_file) ? 'Watch Video' : 'View PDF'}
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

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className={`px-3 py-1.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest border
                                        ${isDarkMode ? 'bg-white/5 border-white/5 text-orange-400' : 'bg-orange-50 border-orange-100 text-orange-600'}`}>
                                            {item.subject_name}
                                        </span>
                                        {/* Content type badge — PDF (red) vs Video (blue) */}
                                        {(item.video_link || item.video_file) ? (
                                            <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-[5px] bg-blue-500/10 border border-blue-500/20 text-blue-500">
                                                <PlayCircle size={12} strokeWidth={3} /> Video
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-[5px] bg-red-500/10 border border-red-500/20 text-red-500">
                                                <FileText size={12} strokeWidth={3} /> PDF
                                            </span>
                                        )}
                                    </div>
                                    <h3 className={`font-black text-xl sm:text-2xl leading-tight uppercase tracking-tight group-hover:text-orange-500 transition-colors line-clamp-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        {item.name}
                                    </h3>
                                    <p className={`text-xs font-semibold line-clamp-2 opacity-60 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {item.description || 'No description available'}
                                    </p>

                                    <button
                                        onClick={() => { setSelectedItem(item); setViewPage(1); }}
                                        className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all group-hover:translate-x-1 ${isDarkMode ? 'text-orange-500' : 'text-orange-600'}`}
                                    >
                                        Learn More <ChevronRight size={14} strokeWidth={3} />
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
            </div>
        </>
    );
};

const getSubjectGradient = (subject) => {
    const gradients = {
        'Physics': 'from-blue-500 to-cyan-600',
        'Chemistry': 'from-purple-500 to-indigo-600',
        'Mathematics': 'from-emerald-500 to-green-600',
        'Biology': 'from-orange-500 to-red-600',
        // 'English': 'from-pink-500 to-rose-600',
    };
    return gradients[subject] || 'from-slate-500 to-slate-600';
};

export default StudyMaterials;
