import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    Network, Sparkles, BookOpen, Layers, Search, RefreshCw, 
    FileText, CheckCircle2, ChevronRight, Filter, Eye, Download, 
    Maximize2, Minimize2, X, AlertCircle, ArrowRight, BookMarked,
    HelpCircle, ChevronDown, Check, Zap, Lightbulb, Compass, Share2,
    FileSpreadsheet, ExternalLink, BookOpenCheck, ArrowLeft
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useMasterData } from '../../context/MasterDataContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import InteractiveMindMap from '../../pages/student/components/InteractiveMindMap';
import MathRenderer from '../../components/MathRenderer';

export const MindMapRegistry = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token, loading: authLoading } = useAuth();
    const { classes, subjects, chapters, fetchMasterData, isLoading: masterDataLoading } = useMasterData();

    // Data states
    const [libraryItems, setLibraryItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [mindMapLoading, setMindMapLoading] = useState(false);
    const [mindMapCache, setMindMapCache] = useState({});

    // Filter states
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedChapter, setSelectedChapter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeItem, setActiveItem] = useState(null); // The currently active note / material for mind map

    // Reader Modal State
    const [readerItem, setReaderItem] = useState(null); // Full item being read
    const [readerActiveTab, setReaderActiveTab] = useState(0); // If item has multiple pdfs/resources

    // Fetch library items
    const fetchLibraryItems = useCallback(async (forceRefresh = false) => {
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
            const response = await axios.get(`${apiUrl}/api/master-data/library/`, config);
            const data = response.data;
            const itemsList = Array.isArray(data) ? data : (data.results || data.library || []);
            setLibraryItems(itemsList);
            if (forceRefresh) toast.success("Library items refreshed");
        } catch (error) {
            console.error("Failed to fetch library items", error);
            toast.error("Failed to load library items");
        } finally {
            setIsLoading(false);
        }
    }, [getApiUrl, token]);

    useEffect(() => {
        if (!authLoading && token) {
            fetchLibraryItems();
            fetchMasterData();
        }
    }, [fetchLibraryItems, fetchMasterData, authLoading, token]);

    // Dynamic classes combining master data and library items
    const allAvailableClasses = useMemo(() => {
        const map = new Map();
        (classes || []).forEach(c => {
            if (c && c.id) map.set(String(c.id), { id: c.id, name: c.name || c.class_name });
        });
        (libraryItems || []).forEach(item => {
            if (item && item.class_level && item.class_name && !map.has(String(item.class_level))) {
                map.set(String(item.class_level), { id: item.class_level, name: item.class_name });
            }
        });
        return Array.from(map.values());
    }, [classes, libraryItems]);

    // Dynamic subjects combining master data and library items
    const allAvailableSubjects = useMemo(() => {
        const map = new Map();
        (subjects || []).forEach(s => {
            if (s && s.id) map.set(String(s.id), { id: s.id, name: s.name || s.subject_name });
        });
        (libraryItems || []).forEach(item => {
            if (item && item.subject && item.subject_name && !map.has(String(item.subject))) {
                map.set(String(item.subject), { id: item.subject, name: item.subject_name });
            }
        });
        return Array.from(map.values());
    }, [subjects, libraryItems]);

    // Filtered subjects based on selected class (via chapter & library mappings)
    const filteredSubjects = useMemo(() => {
        if (!selectedClass) return allAvailableSubjects;
        
        // Find subject IDs linked to this class in chapters
        const chapterSubjectIds = new Set(
            (chapters || [])
                .filter(ch => String(ch.class_level) === String(selectedClass) || String(ch.class_level_id) === String(selectedClass))
                .map(ch => String(ch.subject || ch.subject_id))
        );

        // Find subject IDs linked to this class in library items
        const librarySubjectIds = new Set(
            (libraryItems || [])
                .filter(item => 
                    String(item.class_level) === String(selectedClass) || 
                    (item.class_levels && item.class_levels.map(String).includes(String(selectedClass)))
                )
                .map(item => String(item.subject))
        );

        const validSubjectIds = new Set([...chapterSubjectIds, ...librarySubjectIds]);

        if (validSubjectIds.size > 0) {
            const matched = allAvailableSubjects.filter(s => validSubjectIds.has(String(s.id)));
            if (matched.length > 0) return matched;
        }

        // Fallback to all available subjects if no strict class-subject mapping
        return allAvailableSubjects;
    }, [allAvailableSubjects, chapters, libraryItems, selectedClass]);

    // Filtered chapters based on selected subject and class
    const filteredChapters = useMemo(() => {
        const map = new Map();
        (chapters || []).forEach(ch => {
            if (ch && ch.id) map.set(String(ch.id), {
                id: ch.id,
                name: ch.name || ch.chapter_name,
                subject: ch.subject || ch.subject_id,
                class_level: ch.class_level || ch.class_level_id
            });
        });
        (libraryItems || []).forEach(item => {
            if (item && item.chapter && item.chapter_name && !map.has(String(item.chapter))) {
                map.set(String(item.chapter), {
                    id: item.chapter,
                    name: item.chapter_name,
                    subject: item.subject,
                    class_level: item.class_level
                });
            }
        });

        const allChaps = Array.from(map.values());

        return allChaps.filter(ch => {
            const matchesSubject = !selectedSubject || String(ch.subject) === String(selectedSubject);
            const matchesClass = !selectedClass || !ch.class_level || String(ch.class_level) === String(selectedClass);
            return matchesSubject && matchesClass;
        });
    }, [chapters, libraryItems, selectedSubject, selectedClass]);

    // Helper: checks if a library item has real readable notes or document files (PDF/Word/DPP or substantive text)
    const hasNoteContent = useCallback((item) => {
        if (!item) return false;

        // Direct files (pdf_file, file, document, dpp_file)
        const hasDirectPdf = Boolean(item.pdf_file && String(item.pdf_file).trim() && item.pdf_file !== '#' && item.pdf_file !== 'null');
        const hasDirectDpp = Boolean(item.dpp_file && String(item.dpp_file).trim() && item.dpp_file !== '#' && item.dpp_file !== 'null');
        const hasGenericFile = Boolean((item.file || item.document || item.document_file) && String(item.file || item.document || item.document_file).trim() !== '#');

        // Multi-file arrays
        const hasPdfsArray = Array.isArray(item.pdfs) && item.pdfs.some(p => p && (p.file || p.url || p.pdf_file || p.pdf));
        const hasDppsArray = Array.isArray(item.dpps) && item.dpps.some(d => d && (d.file || d.url || d.dpp_file));

        const hasAnyDocument = hasDirectPdf || hasDirectDpp || hasGenericFile || hasPdfsArray || hasDppsArray;

        // Video detection
        const hasVideo = Boolean(
            (item.video_link && String(item.video_link).trim()) ||
            (item.video_file && String(item.video_file).trim()) ||
            (Array.isArray(item.videos) && item.videos.length > 0) ||
            item.content_type === 'video' ||
            item.resource_type === 'VIDEO'
        );

        // Strictly exclude items that have only videos and no attached notes or documents
        if (hasVideo && !hasAnyDocument) {
            return false;
        }

        // If it has any document attachment, it is definitely a valid note item
        if (hasAnyDocument) {
            return true;
        }

        // If no documents and no videos, only include if it has substantive written notes text
        const hasTextNotes = Boolean(item.description && item.description.trim().length >= 10);
        return hasTextNotes;
    }, []);

    // Filter library items so ONLY actual Notes, Documents (PDF/Word), and DPPs are included (strictly excluding pure video lectures)
    const filteredLibraryItems = useMemo(() => {
        return libraryItems.filter(item => {
            if (!hasNoteContent(item)) {
                return false;
            }

            // Class match
            const matchesClass = !selectedClass || 
                String(item.class_level) === String(selectedClass) || 
                (item.class_levels && item.class_levels.some(c => String(c) === String(selectedClass)));

            // Subject match
            const matchesSubject = !selectedSubject || 
                String(item.subject) === String(selectedSubject) || 
                (item.subjects && item.subjects.some(s => String(s) === String(selectedSubject)));

            // Chapter match
            const matchesChapter = !selectedChapter || 
                String(item.chapter) === String(selectedChapter) || 
                (item.chapters && item.chapters.some(ch => String(ch) === String(selectedChapter)));

            // Search query match
            const matchesSearch = !searchQuery || 
                (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.chapter_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.subject_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.topic_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.description || '').toLowerCase().includes(searchQuery.toLowerCase());

            return matchesClass && matchesSubject && matchesChapter && matchesSearch;
        });
    }, [libraryItems, selectedClass, selectedSubject, selectedChapter, searchQuery, hasNoteContent]);

    // Helper: current resolved names
    const currentClassName = useMemo(() => {
        if (!selectedClass) return 'All Classes';
        const found = allAvailableClasses.find(c => String(c.id) === String(selectedClass));
        return found ? found.name : 'Selected Class';
    }, [allAvailableClasses, selectedClass]);

    const currentSubjectName = useMemo(() => {
        if (!selectedSubject) return 'All Subjects';
        const found = allAvailableSubjects.find(s => String(s.id) === String(selectedSubject));
        return found ? found.name : 'Selected Subject';
    }, [allAvailableSubjects, selectedSubject]);

    const currentChapterName = useMemo(() => {
        if (!selectedChapter) return 'All Chapters';
        const found = filteredChapters.find(ch => String(ch.id) === String(selectedChapter));
        return found ? found.name : 'Selected Chapter';
    }, [filteredChapters, selectedChapter]);

    // Active item name & subject
    const activeTargetSubject = activeItem?.subject_name || (selectedSubject ? currentSubjectName : 'General');
    const activeTargetChapter = activeItem?.chapter_name || (selectedChapter ? currentChapterName : 'Overview');
    const activeTargetName = activeItem?.name || activeTargetChapter;
    const activeCacheKey = `${activeTargetSubject}__${activeTargetChapter}__${activeTargetName}`;
    const currentMindMapData = mindMapCache[activeCacheKey] || null;

    // Extract readable documents (PDFs, Word documents, DPPs, and text notes)
    const getReadableResources = useCallback((item) => {
        if (!item) return [];
        const resources = [];
        const apiUrl = getApiUrl() || '';

        const formatUrl = (rawUrl) => {
            if (!rawUrl || typeof rawUrl !== 'string') return null;
            const trimmed = rawUrl.trim();
            if (!trimmed || trimmed === '#' || trimmed === 'null' || trimmed === 'undefined') return null;

            // Ignore pure video streaming URLs
            if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be') || trimmed.includes('vimeo.com') || trimmed.endsWith('.mp4') || trimmed.endsWith('.mkv') || trimmed.endsWith('.webm')) {
                return null;
            }
            if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
                return trimmed;
            }
            const cleanBase = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
            let path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
            if (!path.startsWith('/media/') && !path.startsWith('/static/')) {
                path = `/media${path}`;
            }
            return `${cleanBase}${path}`;
        };

        const getDocType = (url) => {
            if (!url) return 'pdf';
            const lower = url.toLowerCase();
            if (lower.endsWith('.doc') || lower.endsWith('.docx')) return 'word';
            if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) return 'presentation';
            if (lower.endsWith('.xls') || lower.endsWith('.xlsx') || lower.endsWith('.csv')) return 'excel';
            if (lower.endsWith('.txt') || lower.endsWith('.md')) return 'text_file';
            return 'pdf';
        };

        // 1. Direct PDF / Word / Document properties on item
        const directFile = item.pdf_file || item.pdf || item.file || item.document || item.document_file;
        if (directFile) {
            const formatted = formatUrl(directFile);
            if (formatted) {
                const docType = getDocType(formatted);
                resources.push({
                    id: `direct-doc-${item.id}`,
                    title: item.name ? `${item.name} (${docType === 'word' ? 'Word Document' : 'Notes PDF'})` : 'Main Notes Document',
                    url: formatted,
                    type: docType,
                    description: item.description,
                    isPrimary: true
                });
            }
        }

        // 2. pdfs array on item
        if (Array.isArray(item.pdfs) && item.pdfs.length > 0) {
            item.pdfs.forEach((p, idx) => {
                const rawUrl = p.file || p.url || p.pdf_file || p.pdf;
                const formatted = formatUrl(rawUrl);
                if (formatted && !resources.some(r => r.url === formatted)) {
                    const docType = getDocType(formatted);
                    resources.push({
                        id: `pdf-multi-${p.id || idx}`,
                        title: p.title || p.name || `${item.name || 'Notes'} (Part ${idx + 1})`,
                        url: formatted,
                        type: docType,
                        description: p.description || item.description
                    });
                }
            });
        }

        // 3. DPP worksheet file on item
        const directDpp = item.dpp_file;
        if (directDpp) {
            const formatted = formatUrl(directDpp);
            if (formatted && !resources.some(r => r.url === formatted)) {
                resources.push({
                    id: `dpp-direct-${item.id}`,
                    title: `${item.name || 'Practice'} - DPP Worksheet`,
                    url: formatted,
                    type: getDocType(formatted),
                    description: item.description
                });
            }
        }

        // 4. dpps array on item
        if (Array.isArray(item.dpps) && item.dpps.length > 0) {
            item.dpps.forEach((d, idx) => {
                const rawUrl = d.file || d.url || d.dpp_file;
                const formatted = formatUrl(rawUrl);
                if (formatted && !resources.some(r => r.url === formatted)) {
                    resources.push({
                        id: `dpp-multi-${d.id || idx}`,
                        title: d.title || d.name || `${item.name || 'DPP'} - Worksheet #${idx + 1}`,
                        url: formatted,
                        type: getDocType(formatted),
                        description: d.description || item.description
                    });
                }
            });
        }

        // 5. Text Note overview (only if item has real text description)
        if (item.description && item.description.trim().length > 0) {
            resources.push({
                id: `text-summary-${item.id}`,
                title: resources.length > 0 ? 'Summary & Key Points' : 'Notes & Key Points',
                content: item.description,
                type: 'text',
                item
            });
        }

        return resources;
    }, [getApiUrl]);

    // Trigger AI Mind Map generation
    const handleGenerateMindMap = useCallback(async (targetItem = null) => {
        const item = targetItem || activeItem;
        const targetSubj = item?.subject_name || (selectedSubject ? currentSubjectName : 'General');
        const targetChap = item?.chapter_name || (selectedChapter ? currentChapterName : 'General');
        const targetMatName = item?.name || targetChap;
        const cacheKey = `${targetSubj}__${targetChap}__${targetMatName}`;

        setMindMapLoading(true);
        if (item) setActiveItem(item);

        try {
            const apiUrl = getApiUrl();
            const activeToken = token || localStorage.getItem('auth_token');

            // Find valid document file url if any
            let fileUrl = null;
            const resources = getReadableResources(item);
            const docRes = resources.find(r => (r.type === 'pdf' || r.type === 'word') && r.url);
            if (docRes) {
                fileUrl = docRes.url;
            }

            const res = await axios.post(`${apiUrl}/api/student/ai-mentor/generate-mindmap/`, {
                material_name: targetMatName,
                subject_name: targetSubj,
                chapter_name: targetChap,
                topic_name: item?.topic_name || '',
                description: item?.description || '',
                file_url: fileUrl
            }, {
                headers: activeToken ? { 'Authorization': `Bearer ${activeToken}` } : {}
            });

            if (res.data && (res.data.root || res.data.title)) {
                setMindMapCache(prev => ({
                    ...prev,
                    [cacheKey]: res.data
                }));
                toast.success(`Generated Mind Map for ${targetMatName}!`, { icon: '🧠' });
            } else {
                toast.error("Could not generate mind map. Please try again.");
            }
        } catch (err) {
            console.error("Mind map generation error:", err);
            const errMsg = err.response?.data?.error || "Could not generate mind map.";
            toast.error(errMsg);
        } finally {
            setMindMapLoading(false);
        }
    }, [activeItem, selectedSubject, currentSubjectName, selectedChapter, currentChapterName, getApiUrl, token, getReadableResources]);

    // Auto-select first item when filtered items change if nothing is active
    useEffect(() => {
        if (!activeItem && filteredLibraryItems.length > 0) {
            setActiveItem(filteredLibraryItems[0]);
        }
    }, [filteredLibraryItems, activeItem]);

    // Lock scroll and handle Esc key when reader is open
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && readerItem) {
                setReaderItem(null);
            }
        };
        if (readerItem) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [readerItem]);

    // Open Reader Modal
    const handleOpenReader = (item) => {
        setReaderItem(item);
        setReaderActiveTab(0);
    };

    const activeResources = useMemo(() => {
        return getReadableResources(readerItem);
    }, [readerItem, getReadableResources]);

    const currentResource = activeResources[readerActiveTab] || activeResources[0] || null;

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div className={`p-6 rounded-[5px] border shadow-xl transition-all ${
                isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-slate-100 border-slate-200 shadow-slate-200/50'
            }`}>
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-[5px] bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                            <Network size={26} strokeWidth={2.2} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight uppercase">
                                <span className="text-orange-500">Mind Map</span> Management
                            </h2>
                            <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                Class, Subject & Chapter-wise interactive AI Mind Maps & Note Reader for Library notes and study materials.
                            </p>
                        </div>
                    </div>

                    {/* Quick Stats & Refresh */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className={`px-3 py-1.5 rounded-[5px] border flex items-center gap-2 ${
                            isDarkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                        }`}>
                            <BookOpen size={14} className="text-orange-500" />
                            <span className="text-[11px] font-bold">
                                Notes Available: <span className="text-orange-500">{filteredLibraryItems.length}</span>
                            </span>
                        </div>

                        <div className={`px-3 py-1.5 rounded-[5px] border flex items-center gap-2 ${
                            isDarkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                        }`}>
                            <Sparkles size={14} className="text-emerald-500" />
                            <span className="text-[11px] font-bold">
                                Maps Cached: <span className="text-emerald-500">{Object.keys(mindMapCache).length}</span>
                            </span>
                        </div>

                        <button
                            onClick={() => fetchLibraryItems(true)}
                            disabled={isLoading}
                            className={`p-2 rounded-[5px] border font-bold transition-all flex items-center gap-1.5 ${
                                isDarkMode 
                                    ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-200' 
                                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                            }`}
                            title="Refresh Data"
                        >
                            <RefreshCw size={14} className={isLoading ? 'animate-spin text-orange-500' : ''} />
                            <span className="text-[11px]">Sync</span>
                        </button>
                    </div>
                </div>

                {/* Filters Bar: Class, Subject, Chapter, Search */}
                <div className="mt-6 pt-5 border-t border-slate-200 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Class Select */}
                    <div className="relative">
                        <label className={`block text-[10px] font-black uppercase tracking-wider mb-1 ${
                            isDarkMode ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                            1. Class / Grade
                        </label>
                        <select
                            value={selectedClass}
                            onChange={(e) => {
                                setSelectedClass(e.target.value);
                                setSelectedSubject('');
                                setSelectedChapter('');
                            }}
                            className={`w-full px-3 py-2 rounded-[5px] text-xs font-bold border transition-all outline-none ${
                                isDarkMode 
                                    ? 'bg-[#1a1f2e] border-white/10 text-white focus:border-orange-500' 
                                    : 'bg-white border-slate-300 text-slate-800 focus:border-orange-500 shadow-sm'
                            }`}
                        >
                            <option value="">All Classes ({allAvailableClasses.length})</option>
                            {allAvailableClasses.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Subject Select */}
                    <div className="relative">
                        <label className={`block text-[10px] font-black uppercase tracking-wider mb-1 ${
                            isDarkMode ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                            2. Subject
                        </label>
                        <select
                            value={selectedSubject}
                            onChange={(e) => {
                                setSelectedSubject(e.target.value);
                                setSelectedChapter('');
                            }}
                            className={`w-full px-3 py-2 rounded-[5px] text-xs font-bold border transition-all outline-none ${
                                isDarkMode 
                                    ? 'bg-[#1a1f2e] border-white/10 text-white focus:border-orange-500' 
                                    : 'bg-white border-slate-300 text-slate-800 focus:border-orange-500 shadow-sm'
                            }`}
                        >
                            <option value="">All Subjects ({filteredSubjects.length})</option>
                            {filteredSubjects.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Chapter Select */}
                    <div className="relative">
                        <label className={`block text-[10px] font-black uppercase tracking-wider mb-1 ${
                            isDarkMode ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                            3. Chapter
                        </label>
                        <select
                            value={selectedChapter}
                            onChange={(e) => setSelectedChapter(e.target.value)}
                            className={`w-full px-3 py-2 rounded-[5px] text-xs font-bold border transition-all outline-none ${
                                isDarkMode 
                                    ? 'bg-[#1a1f2e] border-white/10 text-white focus:border-orange-500' 
                                    : 'bg-white border-slate-300 text-slate-800 focus:border-orange-500 shadow-sm'
                            }`}
                        >
                            <option value="">All Chapters ({filteredChapters.length})</option>
                            {filteredChapters.map(ch => (
                                <option key={ch.id} value={ch.id}>
                                    {ch.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                        <label className={`block text-[10px] font-black uppercase tracking-wider mb-1 ${
                            isDarkMode ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                            4. Search Notes
                        </label>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search notes by title, chapter..."
                                className={`w-full pl-9 pr-8 py-2 rounded-[5px] text-xs font-bold border transition-all outline-none ${
                                    isDarkMode 
                                        ? 'bg-[#1a1f2e] border-white/10 text-white placeholder-slate-500 focus:border-orange-500' 
                                        : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-orange-500 shadow-sm'
                                }`}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Active Filter Indicators */}
                {(selectedClass || selectedSubject || selectedChapter || searchQuery) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 text-[11px] font-bold">
                        <span className="text-slate-400">Active Filters:</span>
                        {selectedClass && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[4px] bg-orange-500/10 text-orange-500 border border-orange-500/20">
                                Class: {currentClassName}
                                <X size={12} className="cursor-pointer hover:opacity-75" onClick={() => setSelectedClass('')} />
                            </span>
                        )}
                        {selectedSubject && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[4px] bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                Subject: {currentSubjectName}
                                <X size={12} className="cursor-pointer hover:opacity-75" onClick={() => setSelectedSubject('')} />
                            </span>
                        )}
                        {selectedChapter && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[4px] bg-purple-500/10 text-purple-500 border border-purple-500/20">
                                Chapter: {currentChapterName}
                                <X size={12} className="cursor-pointer hover:opacity-75" onClick={() => setSelectedChapter('')} />
                            </span>
                        )}
                        {searchQuery && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[4px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                Query: "{searchQuery}"
                                <X size={12} className="cursor-pointer hover:opacity-75" onClick={() => setSearchQuery('')} />
                            </span>
                        )}
                        <button
                            onClick={() => {
                                setSelectedClass('');
                                setSelectedSubject('');
                                setSelectedChapter('');
                                setSearchQuery('');
                            }}
                            className="text-[10px] uppercase tracking-wider text-red-400 hover:underline ml-1"
                        >
                            Reset All
                        </button>
                    </div>
                )}
            </div>

            {/* Main Interactive Layout: Left Side List / Right Side Mind Map Canvas */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                
                {/* Left Side: Available Library Notes List (4 Cols on XL) */}
                <div className={`xl:col-span-4 p-5 rounded-[5px] border shadow-xl flex flex-col gap-4 ${
                    isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-slate-100 border-slate-200 shadow-slate-200/50'
                }`}>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
                        <div className="flex items-center gap-2">
                            <FileText size={16} className="text-orange-500" />
                            <h3 className="text-sm font-black uppercase tracking-wider">
                                Library Notes ({filteredLibraryItems.length})
                            </h3>
                        </div>
                        {selectedChapter && (
                            <button
                                onClick={() => {
                                    setActiveItem(null);
                                    handleGenerateMindMap({ name: currentChapterName, subject_name: currentSubjectName, chapter_name: currentChapterName });
                                }}
                                className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-[4px] bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white flex items-center gap-1.5 shadow-sm transition-all"
                            >
                                <Sparkles size={11} />
                                Chapter Map
                            </button>
                        )}
                    </div>

                    {/* Scrollable list of items */}
                    <div className="max-h-[640px] overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                        {isLoading ? (
                            <div className="p-8 text-center space-y-2">
                                <RefreshCw size={24} className="animate-spin text-orange-500 mx-auto" />
                                <p className="text-xs font-bold text-slate-400">Loading library notes...</p>
                            </div>
                        ) : filteredLibraryItems.length === 0 ? (
                            <div className="p-8 text-center space-y-3 rounded-[5px] border border-dashed border-slate-300 dark:border-white/10">
                                <BookOpen size={30} className="mx-auto text-slate-400 opacity-60" />
                                <div>
                                    <p className="text-xs font-bold text-slate-400">No notes found</p>
                                    <p className="text-[10px] text-slate-500 mt-1">Try adjusting your class, subject, or chapter filters.</p>
                                </div>
                            </div>
                        ) : (
                            filteredLibraryItems.map((item) => {
                                const isSelected = activeItem?.id === item.id;
                                const itemSubj = item.subject_name || (selectedSubject ? currentSubjectName : 'General');
                                const itemChap = item.chapter_name || (selectedChapter ? currentChapterName : 'General');
                                const itemCacheKey = `${itemSubj}__${itemChap}__${item.name || itemChap}`;
                                const isCached = Boolean(mindMapCache[itemCacheKey]);

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => setActiveItem(item)}
                                        className={`p-3.5 rounded-[5px] border cursor-pointer transition-all relative group ${
                                            isSelected
                                                ? isDarkMode 
                                                    ? 'bg-orange-500/10 border-orange-500/50 shadow-md shadow-orange-500/5' 
                                                    : 'bg-orange-50 border-orange-400 shadow-md shadow-orange-500/10'
                                                : isDarkMode 
                                                    ? 'bg-[#151a26] border-white/5 hover:border-white/20 hover:bg-[#1a2130]' 
                                                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <div className={`p-1.5 rounded-[4px] shrink-0 ${
                                                    isSelected ? 'bg-orange-500 text-white' : isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-200 text-slate-700'
                                                }`}>
                                                    <FileText size={13} />
                                                </div>
                                                <h4 className={`text-xs font-bold truncate ${
                                                    isSelected ? 'text-orange-500' : isDarkMode ? 'text-white' : 'text-slate-900'
                                                }`}>
                                                    {item.name || item.chapter_name || 'Untitled Note'}
                                                </h4>
                                            </div>

                                            {/* Status Badge */}
                                            {isCached ? (
                                                <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                                    <CheckCircle2 size={10} /> Ready
                                                </span>
                                            ) : (
                                                <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1">
                                                    <Sparkles size={10} /> AI Ready
                                                </span>
                                            )}
                                        </div>

                                        {/* Metadata labels */}
                                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 mb-2.5">
                                            {item.class_name && (
                                                <span className={`px-1.5 py-0.5 rounded-[3px] font-semibold ${
                                                    isDarkMode ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {item.class_name}
                                                </span>
                                            )}
                                            {item.subject_name && (
                                                <span className={`px-1.5 py-0.5 rounded-[3px] font-semibold ${
                                                    isDarkMode ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {item.subject_name}
                                                </span>
                                            )}
                                            {item.chapter_name && (
                                                <span className={`px-1.5 py-0.5 rounded-[3px] font-semibold truncate max-w-[130px] ${
                                                    isDarkMode ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {item.chapter_name}
                                                </span>
                                            )}
                                        </div>

                                        {/* Document type badges */}
                                        {(() => {
                                            const hasDirectPdf = Boolean(item.pdf_file && String(item.pdf_file).trim() && item.pdf_file !== '#' && item.pdf_file !== 'null');
                                            const hasDirectDpp = Boolean(item.dpp_file && String(item.dpp_file).trim() && item.dpp_file !== '#' && item.dpp_file !== 'null');
                                            const pdfCount = (item.pdfs?.length || 0) + (hasDirectPdf ? 1 : 0);
                                            const dppCount = (item.dpps?.length || 0) + (hasDirectDpp ? 1 : 0);
                                            const isWordDoc = Boolean(
                                                (item.pdf_file && (item.pdf_file.toLowerCase().endsWith('.doc') || item.pdf_file.toLowerCase().endsWith('.docx'))) ||
                                                (item.pdfs && item.pdfs.some(p => p.file && (p.file.toLowerCase().endsWith('.doc') || p.file.toLowerCase().endsWith('.docx'))))
                                            );

                                            return (
                                                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                                    {isWordDoc ? (
                                                        <span className="px-2 py-0.5 rounded-[3px] text-[9px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center gap-1">
                                                            <FileSpreadsheet size={10} /> Word Document
                                                        </span>
                                                    ) : pdfCount > 0 ? (
                                                        <span className="px-2 py-0.5 rounded-[3px] text-[9px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center gap-1">
                                                            <FileText size={10} /> {pdfCount > 1 ? `PDF Notes (${pdfCount})` : 'PDF Note'}
                                                        </span>
                                                    ) : null}

                                                    {dppCount > 0 && (
                                                        <span className="px-2 py-0.5 rounded-[3px] text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                                                            <BookOpen size={10} /> {dppCount > 1 ? `DPP (${dppCount})` : 'DPP Sheet'}
                                                        </span>
                                                    )}

                                                    {item.description && !pdfCount && !dppCount && (
                                                        <span className="px-2 py-0.5 rounded-[3px] text-[9px] font-bold bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center gap-1">
                                                            <FileText size={10} /> Text Notes
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {/* Action buttons: View Note & Generate Mind Map */}
                                        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-200 dark:border-white/5">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenReader(item);
                                                }}
                                                className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-[4px] border flex items-center gap-1.5 transition-all shadow-xs active:scale-95 ${
                                                    isDarkMode 
                                                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 hover:border-blue-400' 
                                                        : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300'
                                                }`}
                                                title="View Note / Document"
                                            >
                                                <Eye size={12} className="text-blue-500" />
                                                <span>View Note</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleGenerateMindMap(item);
                                                }}
                                                disabled={mindMapLoading && activeItem?.id === item.id}
                                                className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-[4px] flex items-center gap-1.5 transition-all shadow-xs active:scale-95 ${
                                                    isCached
                                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                        : 'bg-orange-600 hover:bg-orange-700 text-white'
                                                }`}
                                            >
                                                {mindMapLoading && activeItem?.id === item.id ? (
                                                    <>
                                                        <RefreshCw size={11} className="animate-spin" />
                                                        Generating...
                                                    </>
                                                ) : isCached ? (
                                                    <>
                                                        <Network size={11} />
                                                        View Map
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles size={11} />
                                                        Generate
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Side: Interactive AI Mind Map Canvas (8 Cols on XL) */}
                <div className={`xl:col-span-8 p-6 rounded-[5px] border shadow-xl flex flex-col min-h-[640px] ${
                    isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-slate-100 border-slate-200 shadow-slate-200/50'
                }`}>
                    {/* Canvas top bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 mb-4 border-b border-slate-200 dark:border-white/10">
                        <div>
                            <div className="flex items-center gap-2">
                                <Sparkles size={16} className="text-orange-500" />
                                <h3 className="text-base font-black uppercase tracking-wider">
                                    {activeItem ? activeItem.name : (selectedChapter ? currentChapterName : 'Concept Mind Map')}
                                </h3>
                            </div>
                            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                                Subject: <span className="font-bold text-orange-400">{activeTargetSubject}</span> • Chapter: <span className="font-bold text-blue-400">{activeTargetChapter}</span>
                            </p>
                        </div>

                        {/* Actions on active map */}
                        <div className="flex items-center gap-2">
                            {activeItem && (
                                <button
                                    onClick={() => handleOpenReader(activeItem)}
                                    className={`px-3 py-1.5 rounded-[5px] border text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                                        isDarkMode 
                                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20' 
                                            : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                                    }`}
                                >
                                    <Eye size={13} className="text-blue-500" />
                                    <span>View Note</span>
                                </button>
                            )}

                            <button
                                onClick={() => handleGenerateMindMap(activeItem)}
                                disabled={mindMapLoading}
                                className="px-3.5 py-1.5 rounded-[5px] bg-orange-600 hover:bg-orange-700 text-white font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-orange-600/20 active:scale-95 transition-all"
                            >
                                <Sparkles size={13} className={mindMapLoading ? 'animate-spin' : ''} />
                                <span>{currentMindMapData ? 'Regenerate Map' : 'Generate Map'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Interactive Mind Map Component */}
                    <div className="flex-1 w-full min-h-[520px] flex flex-col">
                        <InteractiveMindMap
                            mindMapData={currentMindMapData}
                            isLoading={mindMapLoading}
                            onGenerate={() => handleGenerateMindMap(activeItem)}
                            subjectName={activeTargetSubject}
                            chapterName={activeItem ? activeItem.name : activeTargetChapter}
                            isDarkMode={isDarkMode}
                        />
                    </div>
                </div>

            </div>

            {/* Note Reader Modal - Rendered via Portal at body level to completely overlay navbar and sidebar */}
            {readerItem && createPortal(
                <div className="fixed inset-0 z-[9999999] w-screen h-screen bg-[#0b0f17] text-white flex flex-col overflow-hidden animate-in fade-in duration-150 select-none">
                    {/* Full-width Top Navigation Toolbar */}
                    <div className="h-16 px-4 md:px-6 bg-[#111622] border-b border-white/10 flex items-center justify-between gap-4 shrink-0 shadow-xl z-20">
                        {/* Left: Back / Close button & Note Title */}
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                onClick={() => setReaderItem(null)}
                                className="px-3 py-1.5 rounded-[5px] bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 font-bold text-xs shrink-0 active:scale-95"
                                title="Close Reader (Esc)"
                            >
                                <ArrowLeft size={16} />
                                <span className="hidden sm:inline">Back</span>
                            </button>
                            
                            <div className="truncate">
                                <div className="flex items-center gap-2">
                                    <span className="p-1 rounded bg-blue-500/20 text-blue-400 shrink-0">
                                        <BookOpen size={14} />
                                    </span>
                                    <h2 className="text-sm md:text-base font-black truncate text-white uppercase tracking-tight">
                                        {readerItem.name || readerItem.chapter_name || 'Note Document'}
                                    </h2>
                                </div>
                                <p className="text-[11px] font-semibold text-slate-400 truncate mt-0.5">
                                    {readerItem.class_name && <span className="text-slate-300">{readerItem.class_name} • </span>}
                                    {readerItem.subject_name && <span className="text-orange-400 font-bold">{readerItem.subject_name} • </span>}
                                    {readerItem.chapter_name && <span className="text-blue-400">{readerItem.chapter_name}</span>}
                                </p>
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                            {currentResource?.url && (
                                <>
                                    <a
                                        href={currentResource.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3 py-1.5 rounded-[5px] bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 hover:text-white flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                                        title="Open original document in new browser tab"
                                    >
                                        <ExternalLink size={13} className="text-blue-400" />
                                        <span className="hidden md:inline">Open Tab</span>
                                    </a>
                                    <a
                                        href={currentResource.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        download
                                        className="px-3 py-1.5 rounded-[5px] bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 hover:text-white flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                                        title="Download document"
                                    >
                                        <Download size={13} className="text-emerald-400" />
                                        <span className="hidden md:inline">Download</span>
                                    </a>
                                </>
                            )}

                            <button
                                onClick={() => {
                                    const target = readerItem;
                                    setReaderItem(null);
                                    setActiveItem(target);
                                    handleGenerateMindMap(target);
                                }}
                                className="px-3 py-1.5 rounded-[5px] bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-orange-600/20 transition-all active:scale-95"
                                title="Generate / Open Mind Map for this note"
                            >
                                <Sparkles size={13} />
                                <span className="hidden sm:inline">Mind Map</span>
                            </button>

                            <button
                                onClick={() => setReaderItem(null)}
                                className="p-2 rounded-[5px] bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 transition-all ml-1 active:scale-95"
                                title="Close (Esc)"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Multi-part tabs if multiple documents */}
                    {activeResources.length > 1 && (
                        <div className="px-6 py-2 bg-[#0e131d] border-b border-white/5 flex items-center gap-2 overflow-x-auto shrink-0 custom-scrollbar z-10">
                            {activeResources.map((res, idx) => (
                                <button
                                    key={res.id || idx}
                                    onClick={() => setReaderActiveTab(idx)}
                                    className={`px-3.5 py-1.5 text-xs font-bold rounded-[4px] border transition-all flex items-center gap-2 whitespace-nowrap ${
                                        readerActiveTab === idx
                                            ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30'
                                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                                    }`}
                                >
                                    {res.type === 'word' ? (
                                        <FileSpreadsheet size={13} />
                                    ) : res.type === 'text' ? (
                                        <FileText size={13} />
                                    ) : (
                                        <BookOpen size={13} />
                                    )}
                                    <span>{res.title || `Document ${idx + 1}`}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Word Document Notice Banner if applicable */}
                    {currentResource?.type === 'word' && currentResource?.url && (
                        <div className="bg-blue-500/10 border-b border-blue-500/20 px-6 py-2 flex items-center justify-between text-xs text-blue-400 shrink-0 z-10">
                            <div className="flex items-center gap-2 font-semibold">
                                <FileSpreadsheet size={14} className="text-blue-400" />
                                <span>Word Document (.doc / .docx) — Previewing via Office Online</span>
                            </div>
                            <a
                                href={currentResource.url}
                                download
                                className="font-bold underline hover:text-white flex items-center gap-1.5"
                            >
                                <Download size={13} /> Download Original Document
                            </a>
                        </div>
                    )}

                    {/* Reader Fullscreen Content Pane */}
                    <div className="flex-1 w-full bg-[#080b11] overflow-hidden relative">
                        {currentResource?.url ? (
                            <iframe
                                src={
                                    (currentResource.type === 'word' || currentResource.url.toLowerCase().endsWith('.doc') || currentResource.url.toLowerCase().endsWith('.docx') || currentResource.url.toLowerCase().endsWith('.ppt') || currentResource.url.toLowerCase().endsWith('.pptx'))
                                        ? `https://docs.google.com/gview?url=${encodeURIComponent(currentResource.url)}&embedded=true`
                                        : `${currentResource.url}#toolbar=1`
                                }
                                title={currentResource.title || 'Document Reader'}
                                className="w-full h-full border-0 bg-white"
                            />
                        ) : (
                            <div className="w-full h-full p-8 md:p-12 overflow-y-auto bg-[#0b0f17] text-slate-200 select-text">
                                <div className="max-w-4xl mx-auto space-y-6">
                                    <div className="p-8 rounded-[8px] border border-blue-500/20 bg-blue-500/5 space-y-4">
                                        <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
                                            <BookOpenCheck size={18} />
                                            <span>Note Content & Key Concepts</span>
                                        </div>
                                        <h1 className="text-2xl font-black text-white">
                                            {readerItem.name || readerItem.chapter_name}
                                        </h1>
                                        {currentResource?.content || readerItem.description ? (
                                            <div className="text-sm leading-relaxed whitespace-pre-wrap font-normal text-slate-300">
                                                <MathRenderer html={currentResource?.content || readerItem.description} />
                                            </div>
                                        ) : (
                                            <p className="text-xs italic text-slate-400">
                                                No direct text or file attachment found for this item. Use the Mind Map tab to explore AI concept breakdowns.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default MindMapRegistry;
