import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Filter, BookOpen, Download, Eye, FileText, ChevronRight, GraduationCap, Loader2, X, Maximize2, Minimize2, RefreshCw, PlayCircle, ExternalLink, Compass } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { toast } from 'react-hot-toast';

const StudyMaterials = ({ cache, setCache, studentClass, initialType = 'VIDEO' }) => {
    const { getApiUrl, token, user } = useAuth();
    const { isDarkMode } = useTheme();

    // Determine the student's class level for filtering
    // class_name from API looks like "Class 8" or "8"
    const assignedClass = studentClass && studentClass !== 'N/A' ? studentClass.trim() : null;

    // Use a ref for comparison to avoid the infinite loop in dependency arrays
    const materialsRef = useRef(cache?.loaded ? cache.data : []);
    const [materials, setMaterials] = useState(materialsRef.current);
    const [isLoading, setIsLoading] = useState(!cache?.loaded);

    const [searchQuery, setSearchQuery] = useState('');
    const [activeContentType, setActiveContentType] = useState(initialType); // 'VIDEO' | 'STUDY_MATERIAL'
    const [selectedLevel, setSelectedLevel] = useState('SUBJECT'); // SUBJECT -> CHAPTER -> TOPIC
    const [activeSubject, setActiveSubject] = useState(null);
    const [activeChapter, setActiveChapter] = useState(null);
    const [activeTopic, setActiveTopic] = useState(null);

    // Filter materials by Session, Class, and Section
    // (In a real app, these would come from Auth/Student context)
    const studentSession = user?.academic_session || ''; 
    const studentSection = user?.section || '';

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

            const data = Array.isArray(response.data) ? response.data : (response.data.results || []);

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

    const subjectsHierarchy = useMemo(() => {
        const hierarchy = {};
        
        materials.forEach(item => {
            const normalize = (val) => String(val || '').toLowerCase().trim().replace(/class\s*/g, '');
            
            // Apply student context filtering (Normalization for fuzzy matching)
            if (assignedClass && item.class_name) {
                if (normalize(item.class_name) !== normalize(assignedClass)) return;
            }
            if (studentSession && item.session_name) {
                if (normalize(item.session_name) !== normalize(studentSession)) return;
            }
            if (studentSection && item.section_name) {
                if (normalize(item.section_name) !== normalize(studentSection)) return;
            }

            const subName = item.subject_name || 'Unsorted';
            const chapName = item.chapter_name || 'General';
            const topName = item.topic_name || item.name || 'Intro';

            // SMART BIOLOGY FILTERING: 
            // 5-10: Only Biology (Hide Botany/Zoology)
            // 11-12: Only Botany/Zoology (Hide general Biology)
            const classMatch = assignedClass?.match(/\d+/);
            const classNum = classMatch ? parseInt(classMatch[0]) : 0;

            if (classNum >= 5 && classNum <= 10) {
                if (subName.toLowerCase().includes('botany') || subName.toLowerCase().includes('zoology')) return;
            } else if (classNum >= 11) {
                if (subName.toLowerCase() === 'biology') return;
            }

            if (!hierarchy[subName]) hierarchy[subName] = { name: subName, chapters: {} };
            if (!hierarchy[subName].chapters[chapName]) hierarchy[subName].chapters[chapName] = { name: chapName, topics: {} };
            if (!hierarchy[subName].chapters[chapName].topics[topName]) {
                hierarchy[subName].chapters[chapName].topics[topName] = { 
                    name: topName, 
                    materials: [] 
                };
            }
            
            // Check content type
            const isVideo = !!(item.video_link || item.video_file);
            const isDPP = item.resource_type === 'DPP';

            if (activeContentType === 'DPP') {
                if (!isDPP) return;
            } else if (activeContentType === 'STUDY_MATERIAL') {
                if (isVideo || isDPP) return;
            } else if (activeContentType === 'VIDEO') {
                if (!isVideo) return;
            }

            hierarchy[subName].chapters[chapName].topics[topName].materials.push(item);
        });

        return hierarchy;
    }, [materials, assignedClass, activeContentType]);

    const activeSubjectData = activeSubject ? subjectsHierarchy[activeSubject] : null;
    const activeChapterData = (activeSubjectData && activeChapter) ? activeSubjectData.chapters[activeChapter] : null;
    const activeTopicData = (activeChapterData && activeTopic) ? activeChapterData.topics[activeTopic] : null;

    const subjectsList = Object.keys(subjectsHierarchy).sort();

    // ── AUTO-NAVIGATION LOGIC ───────────────────────────────────────────
    // 1. Auto-select first subject on initial load
    useEffect(() => {
        if (!activeSubject && subjectsList.length > 0) {
            setActiveSubject(subjectsList[0]);
        }
    }, [subjectsList, activeSubject]);

    // 2. Handle hierarchy changes (e.g., switching from Videos to Notes)
    useEffect(() => {
        if (activeSubject && activeSubjectData) {
            const chapters = Object.keys(activeSubjectData.chapters).sort();
            // If the currently selected chapter no longer exists in the new content type (hierarchy), reset to first
            if (activeChapter && !chapters.includes(activeChapter)) {
                setActiveChapter(chapters[0] || null);
            } else if (!activeChapter && chapters.length > 0) {
                setActiveChapter(chapters[0]);
            }
        }
    }, [activeSubject, activeSubjectData, activeChapter]);

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

            <div className="flex flex-col gap-10 animate-fade-in-up">
                {/* 1. HERO HEADER */}
                <div className={`relative overflow-hidden rounded-[20px] border shadow-2xl transition-all duration-700 p-8 sm:p-12
                    ${isDarkMode 
                        ? 'bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#1e293b] border-white/5 shadow-black/40' 
                        : 'bg-gradient-to-br from-[#0B1120] via-[#10192D] to-[#1E293B] border-slate-200 shadow-slate-900/10'}`}>
                    
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-0.5 w-12 bg-orange-500 rounded-full"></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-400 font-brand">Learning Nexus</span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tighter leading-none mb-4 antialiased font-brand">
                            Study <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                                {activeContentType === 'VIDEO' ? 'Videos' : activeContentType === 'DPP' ? 'Practice' : 'Notes'}
                            </span>
                        </h1>
                        <p className="text-sm sm:text-base md:text-lg font-medium text-white/70 max-w-xl leading-relaxed">
                            Your comprehensive curriculum, organized by Subject, Chapter, and Topic. <br/> 
                            <span className="text-orange-400 font-bold">Class: {assignedClass || 'Enrolled'}</span>
                        </p>
                    </div>
                </div>

                {/* 2. SUBJECT TOP TABS */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-500' : 'text-slate-600'}`}>Academic Subjects</h3>
                        <div className="flex items-center gap-4">
                             <div className="relative group w-[250px] hidden md:block">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={14} />
                                <input
                                    type="text"
                                    placeholder="Quick search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={`w-full pl-10 pr-4 py-2 rounded-full border-2 outline-none font-bold text-[10px] transition-all
                                    ${isDarkMode ? 'bg-[#10141D] border-white/5 text-white' : 'bg-white border-slate-100 text-slate-800 focus:border-orange-500'}`}
                                />
                            </div>
                            <button onClick={() => fetchMaterials(false)} className={`p-2 rounded-full border transition-all ${isDarkMode ? 'bg-white/5 border-white/5 text-slate-400' : 'bg-white border-slate-100 text-slate-400 hover:text-orange-500 shadow-sm'}`}>
                                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 overflow-x-auto pb-4 custom-scrollbar-hide px-2">
                        {subjectsList.map(subName => (
                            <button
                                key={subName}
                                onClick={() => {
                                    setActiveSubject(subName);
                                    // Instantly select first chapter to avoid flicker
                                    const chaps = Object.keys(subjectsHierarchy[subName].chapters).sort();
                                    setActiveChapter(chaps[0] || null);
                                    setActiveTopic(null);
                                }}
                                className={`flex items-center gap-5 px-8 py-5 rounded-[20px] transition-all duration-300 relative border-2 flex-shrink-0
                                    ${activeSubject === subName 
                                        ? 'bg-orange-500 border-orange-500 text-white shadow-[0_20px_40px_-10px_rgba(249,115,22,0.4)] scale-105 z-10' 
                                        : isDarkMode 
                                            ? 'bg-[#10141D] border-white/5 text-slate-400 hover:border-white/20' 
                                            : 'bg-white border-slate-50 text-slate-600 hover:border-orange-500/20 shadow-sm'}`}
                            >
                                <div className={`p-2.5 rounded-[12px] ${activeSubject === subName ? 'bg-white/20' : 'bg-orange-500/10 text-orange-500 shadow-inner'}`}>
                                    <GraduationCap size={20} strokeWidth={2.5} />
                                </div>
                                <div className="flex flex-col items-start gap-0.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest">{subName}</span>
                                    <span className={`text-[8px] font-bold ${activeSubject === subName ? 'text-white/60' : 'text-slate-400'}`}>
                                        {Object.keys(subjectsHierarchy[subName].chapters).length} Chapters
                                    </span>
                                </div>
                                {activeSubject === subName && (
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-lg"></div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. CHAPTER NAVIGATION & CONTENT */}
                <div className="space-y-8">
                    {!activeSubject ? (
                        <div className={`flex flex-col items-center justify-center min-h-[400px] rounded-[30px] border-2 border-dashed ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="w-24 h-24 rounded-full bg-orange-500/5 flex items-center justify-center mb-6 animate-pulse">
                                <Compass size={48} className="text-orange-500 opacity-20" />
                            </div>
                            <h3 className={`text-2xl font-black tracking-tight uppercase mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Choose a Subject</h3>
                            <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em]">Select a library category above to begin learning</p>
                        </div>
                    ) : (
                        <div className="space-y-12 animate-in fade-in duration-700">
                             {/* Chapter Row */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-0.5 w-8 bg-blue-600 rounded-full"></div>
                                    <h4 className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-600'}`}>Curriculum Chapters</h4>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {Object.keys(activeSubjectData.chapters).sort().map(chapName => (
                                        <button
                                            key={chapName}
                                            onClick={() => {
                                                setActiveChapter(chapName);
                                                setActiveTopic(null);
                                            }}
                                            className={`px-6 py-4 rounded-[15px] transition-all duration-300 border-2 active:scale-95
                                                ${activeChapter === chapName 
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20 scale-105' 
                                                    : isDarkMode ? 'bg-[#10141D] border-white/5 text-slate-400 hover:border-blue-500/30' : 'bg-white border-slate-100 text-slate-600 hover:border-blue-500/30 shadow-sm'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${activeChapter === chapName ? 'bg-white' : 'bg-blue-500'}`}></div>
                                                <span className="font-black text-xs uppercase tracking-tight">{chapName}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Topics & Content */}
                            {!activeChapter ? (
                                <div className={`flex flex-col items-center justify-center min-h-[300px] rounded-[30px] border-2 border-dashed ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                    <h3 className={`text-xl font-black tracking-tight uppercase mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Pick a Chapter</h3>
                                    <p className="text-[9px] font-black opacity-30 uppercase tracking-[0.2em]">Explore {activeSubject} in depth</p>
                                </div>
                            ) : (
                                <div className="space-y-10">
                                    {Object.keys(activeChapterData.topics).sort().map(topName => {
                                        const topicItems = activeChapterData.topics[topName].materials;
                                        if (topicItems.length === 0) return null;

                                        return (
                                            <div key={topName} className="space-y-8 animate-in slide-in-from-bottom-5 duration-700">
                                                <div className="flex items-center gap-6">
                                                    <div className="flex flex-col">
                                                        <span className={`text-[14px] font-black uppercase tracking-tight mb-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{topName}</span>
                                                        <div className="h-1 w-full bg-gradient-to-r from-orange-500 to-transparent rounded-full"></div>
                                                    </div>
                                                    <div className="flex-1 h-[1px] bg-slate-200 dark:bg-white/5"></div>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{topicItems.length} Resources</span>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                                    {topicItems.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            onClick={() => { setSelectedItem(item); setViewPage(1); }}
                                                            className={`group p-1 rounded-[25px] border transition-all duration-500 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] hover:-translate-y-3
                                                            ${isDarkMode ? 'bg-[#10141D] border-white/5 hover:border-orange-500/30' : 'bg-white border-slate-100 shadow-sm hover:border-orange-200'}`}
                                                        >
                                                            <div className="relative aspect-video rounded-[20px] overflow-hidden bg-slate-100 dark:bg-black/40 flex items-center justify-center">
                                                                {item.thumbnail ? (
                                                                    <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-125" />
                                                                ) : (item.video_link && getYouTubeThumbnail(item.video_link)) ? (
                                                                    <img src={getYouTubeThumbnail(item.video_link)} alt={item.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-125" />
                                                                ) : (
                                                                    <div className={`w-20 h-20 rounded-[15px] flex items-center justify-center bg-gradient-to-br ${getSubjectGradient(item.subject_name)} shadow-2xl`}>
                                                                        {(item.video_link || item.video_file) ? <PlayCircle size={36} className="text-white" /> : <FileText size={36} className="text-white" />}
                                                                    </div>
                                                                )}
                                                                
                                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center backdrop-blur-md">
                                                                    <div className="flex flex-col items-center gap-3">
                                                                         <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/50 backdrop-blur-xl flex items-center justify-center text-white transform scale-50 group-hover:scale-100 transition-transform duration-500">
                                                                            <Eye size={30} strokeWidth={2.5} />
                                                                        </div>
                                                                        <span className="text-[10px] font-black uppercase tracking-tighter text-white">Open Reader</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="p-5 space-y-4">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-1.5 h-1.5 rounded-full ${(item.video_link || item.video_file) ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                                                                        <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                                            {activeContentType === 'DPP' ? 'Daily Practice' : (item.video_link || item.video_file) ? 'Video Player' : 'PDF Document'}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[8px] font-black text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20 uppercase">
                                                                        Vault Item
                                                                    </span>
                                                                </div>
                                                                <h3 className={`font-black text-sm uppercase tracking-tight line-clamp-2 group-hover:text-orange-500 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.name}</h3>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
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
