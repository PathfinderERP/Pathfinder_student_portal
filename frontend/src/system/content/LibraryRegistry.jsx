import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, FileText, Eye, Edit2, Trash2, RefreshCw, X, Upload, FileCheck, AlertCircle, HelpCircle, Youtube, ChevronLeft, Loader2, Maximize2, Minimize2, ExternalLink, Filter, Layers, ChevronsLeft, ChevronsRight, ChevronRight, Video, PlayCircle, ArrowUpDown, ChevronDown, Check, Clock, Save, Download, Settings } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import SmartEditor from '../admin/components/SmartEditor';

const LibraryRegistry = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token, loading: authLoading } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [topicDataMap, setTopicDataMap] = useState({}); // Per-topic content storage
    const scrollContainerRef = useRef(null);

    // Grab to scroll logic
    const handleGrabScroll = (e) => {
        const slider = scrollContainerRef.current;
        if (!slider) return;
        let isDown = false;
        let startX;
        let scrollLeft;

        const onMouseDown = (e) => {
            isDown = true;
            slider.classList.add('active');
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        };
        const onMouseLeave = () => {
            isDown = false;
            slider.classList.remove('active');
        };
        const onMouseUp = () => {
            isDown = false;
            slider.classList.remove('active');
        };
        const onMouseMove = (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 2; // Scroll speed
            slider.scrollLeft = scrollLeft - walk;
        };

        slider.addEventListener('mousedown', onMouseDown);
        slider.addEventListener('mouseleave', onMouseLeave);
        slider.addEventListener('mouseup', onMouseUp);
        slider.addEventListener('mousemove', onMouseMove);

        return () => {
            slider.removeEventListener('mousedown', onMouseDown);
            slider.removeEventListener('mouseleave', onMouseLeave);
            slider.removeEventListener('mouseup', onMouseUp);
            slider.removeEventListener('mousemove', onMouseMove);
        };
    };

    useEffect(() => {
        if (isAddModalOpen) {
            const cleanup = handleGrabScroll();
            return cleanup;
        }
    }, [isAddModalOpen]);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedItemForEdit, setSelectedItemForEdit] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [thumbnailError, setThumbnailError] = useState(null);
    const [pdfError, setPdfError] = useState(null);
    const [showQuestionEditor, setShowQuestionEditor] = useState(false);
    const [isIndependentMode, setIsIndependentMode] = useState(false);
    const [isFilterIndependentMode, setIsFilterIndependentMode] = useState(true);
    const [previewData, setPreviewData] = useState(null); // { url, type, title }

    const safeArray = (arr) => Array.isArray(arr) ? arr : [];

    const CustomSelect = ({ label, options, value, onChange, placeholder, isDarkMode, required }) => {
        const [isOpen, setIsOpen] = useState(false);
        const [searchTerm, setSearchTerm] = useState('');
        const containerRef = React.useRef(null);

        useEffect(() => {
            const handleClickOutside = (event) => {
                if (containerRef.current && !containerRef.current.contains(event.target)) {
                    setIsOpen(false);
                }
            };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, []);

        const selectedOption = options.find(opt => String(opt.id) === String(value) || opt.value === value);

        const filteredOptions = useMemo(() => {
            if (!searchTerm) return options;
            return options.filter(opt => {
                const text = (opt.label || opt.name || opt.value || '').toLowerCase();
                return text.includes(searchTerm.toLowerCase());
            });
        }, [options, searchTerm]);

        return (
            <div className="relative group" ref={containerRef}>
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className={`relative w-full px-4 py-3 rounded-[5px] border-2 transition-all cursor-pointer flex items-center justify-between
                        ${isOpen
                            ? 'border-[#E67E22] bg-white shadow-[0_0_0_4px_rgba(16,185,129,0.1)]'
                            : isDarkMode ? 'border-white/5 bg-[#1a1f2e] text-white hover:border-white/10' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 shadow-sm'}`}
                >
                    <label className={`absolute left-3 -top-2 px-1 text-[10px] font-black uppercase tracking-widest transition-all
                        ${isOpen ? 'text-[#E67E22] bg-white' : isDarkMode ? 'bg-[#10141D] text-slate-500 opacity-40' : 'bg-white text-slate-500'}`}>
                        {label} {required && '*'}
                    </label>

                    <span className={`text-xs font-bold truncate ${!selectedOption
                        ? (isDarkMode ? 'text-white/30' : 'text-slate-400')
                        : (isDarkMode ? 'text-white' : 'text-slate-700')}`}>
                        {selectedOption ? (selectedOption.label || selectedOption.name || selectedOption.value) : placeholder}
                    </span>

                    <div className="flex items-center gap-2">
                        {value && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChange('');
                                }}
                                className={`p-1 rounded-full transition-all ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
                            >
                                <X size={12} strokeWidth={3} className="text-red-500" />
                            </button>
                        )}
                        <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#E67E22]' : 'opacity-40'}`} />
                    </div>
                </div>

                {isOpen && (
                    <div className={`absolute z-[100] left-0 right-0 mt-1 py-1 rounded-[5px] border shadow-2xl animate-in fade-in zoom-in-95 duration-200
                        ${isDarkMode ? 'bg-[#1a1f2e] border-white/10 shadow-black text-white' : 'bg-white border-slate-200 shadow-slate-200/50 text-slate-800'}`}>

                        <div className={`p-2 border-b sticky top-0 z-10 ${isDarkMode ? 'border-white/5 bg-[#1a1f2e]' : 'border-slate-100 bg-white'}`}>
                            <div className="relative">
                                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
                                <input
                                    type="text"
                                    autoFocus
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder={`Search ${label}...`}
                                    className={`w-full pl-8 pr-3 py-2 rounded-[5px] text-[11px] font-bold outline-none transition-all
                                        ${isDarkMode ? 'bg-black/20 border border-white/10 text-white focus:border-[#E67E22]' : 'bg-white border border-slate-200 text-slate-700 focus:border-[#E67E22] shadow-sm'}`}
                                />
                            </div>
                        </div>

                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            {filteredOptions.length > 0 ? filteredOptions.map((opt, i) => (
                                <div
                                    key={i}
                                    onClick={() => {
                                        onChange(opt.id || opt.value || "");
                                        setIsOpen(false);
                                    }}
                                    className={`px-4 py-2.5 text-[12px] font-bold cursor-pointer transition-all flex items-center justify-between
                                        ${(String(opt.id) === String(value) || opt.value === value)
                                            ? 'bg-[#E67E22] text-white'
                                            : isDarkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}
                                >
                                    {opt.label || opt.name || opt.value}
                                    {(String(opt.id) === String(value) || opt.value === value) && <Check size={14} />}
                                </div>
                            )) : (
                                <div className="px-4 py-2.5 text-[11px] font-bold opacity-40 uppercase italic">No options available</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const getYouTubeThumbnail = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        if (match && match[2].length === 11) {
            return `https://img.youtube.com/vi/${match[2]}/maxresdefault.jpg`;
        }
        if (url.includes('vimeo.com')) {
            return 'https://f.vimeocdn.com/images_v6/default_640.png'; // Basic vimeo placeholder until API call
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

    // Master Data State
    const [sessions, setSessions] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [examTypes, setExamTypes] = useState([]);
    const [targetExams, setTargetExams] = useState([]);
    const [chapters, setChapters] = useState([]);
    const [topics, setTopics] = useState([]);
    const [sections, setSections] = useState([]);

    // View Modal State
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedItemForView, setSelectedItemForView] = useState(null);
    const [viewPage, setViewPage] = useState(1); // 1 for Thumbnail, 2 for PDF
    const [isFullScreen, setIsFullScreen] = useState(false);

    // Pagination & Filter State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [jumpToPage, setJumpToPage] = useState('');
    const [activeFilters, setActiveFilters] = useState({
        session: '',
        class_level: '',
        subject: '',
        chapter: '',
        topic: '',
        exam_type: '',
        target_exam: '',
        section: '',
        contentType: ''
    });
    const [sortOrder, setSortOrder] = useState('chapter'); // chapter, newest, oldest, az, za

    const [libraryItems, setLibraryItems] = useState([]);

    const [newItem, setNewItem] = useState({
        multi_pdfs: [], // Array of { name, description, file: File, thumbnail: File | null }
        multi_videos: [], // Array of { name, description, file: File, thumbnail: File | null }
        multi_video_links: [], // Array of { name, description, link: string, thumbnail: File | null }
        multi_dpps: [], // Array of { name, description, file: File, thumbnail: File | null }
        content_type: 'pdf',
        dpp_mode: 'question',
        questions: [{
            tempId: Date.now(),
            question: '',
            question_type: 'SINGLE_CHOICE',
            options: [
                { id: 1, content: '', isCorrect: false },
                { id: 2, content: '', isCorrect: false },
                { id: 3, content: '', isCorrect: false },
                { id: 4, content: '', isCorrect: false }
            ],
            solution: '',
            solve_time: 30
        }],
        session: '',
        class_level: '',
        subject: '',
        chapter: '',
        topic: '',
        exam_type: '',
        target_exam: '',
        section: ''
    });

    const handleSaveDraft = () => {
        localStorage.setItem('dpp_library_draft', JSON.stringify(newItem));
        toast.success('Draft safely saved out of session bounds.');
    };

    const handleLoadDraft = () => {
        const draftStr = localStorage.getItem('dpp_library_draft');
        if (draftStr) {
            try {
                const draft = JSON.parse(draftStr);
                // Patch old drafts with new required fields
                const patchedDraft = {
                    ...draft,
                    multi_pdfs: draft.multi_pdfs || [],
                    multi_videos: draft.multi_videos || [],
                    multi_video_links: draft.multi_video_links || []
                };
                setNewItem(patchedDraft);
                toast.success('Draft securely restored!');
            } catch (e) {
                toast.error('Corrupted draft detected.');
            }
        } else {
            toast.error('No saved draft found.');
        }
    };

    const handleClearDraft = () => {
        localStorage.removeItem('dpp_library_draft');
        toast.success('Local draft cleared.');
    };

    const fetchLibraryItems = useCallback(async () => {
        if (authLoading) return;
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/master-data/library/`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            // Library items can be paginated {results: []} or a simple array
            const data = response.data;
            const itemsList = Array.isArray(data) ? data : (data.results || data.library || []);
            setLibraryItems(itemsList);
        } catch (error) {
            console.error("Failed to fetch library items", error);
            toast.error("Failed to load library content");
        } finally {
            setIsLoading(false);
        }
    }, [getApiUrl, token, authLoading]);

    const fetchMasterData = useCallback(async () => {
        if (authLoading) return;
        try {
            const apiUrl = getApiUrl();
            const config = token ? { headers: { 'Authorization': `Bearer ${token}` } } : {};
            const [sessRes, classRes, subRes, etRes, teRes, secRes, chapRes, topRes] = await Promise.all([
                axios.get(`${apiUrl}/api/master-data/sessions/`, config),
                axios.get(`${apiUrl}/api/master-data/classes/`, config),
                axios.get(`${apiUrl}/api/master-data/subjects/`, config),
                axios.get(`${apiUrl}/api/master-data/exam-types/`, config),
                axios.get(`${apiUrl}/api/master-data/target-exams/`, config),
                axios.get(`${apiUrl}/api/master-data/master-sections/`, config),
                axios.get(`${apiUrl}/api/master-data/chapters/`, config),
                axios.get(`${apiUrl}/api/master-data/topics/`, config)
            ]);
            const extract = (res) => {
                const data = res?.data;
                if (!data) return [];
                if (Array.isArray(data)) return data;
                return data.results || data.sections || data.chapters || data.topics || [];
            };

            setSessions(extract(sessRes));
            setClasses(extract(classRes));
            setSubjects(extract(subRes));
            setExamTypes(extract(etRes));
            setTargetExams(extract(teRes));
            setChapters(extract(chapRes));
            setTopics(extract(topRes));
            setSections(extract(secRes));
        } catch (error) {
            console.error("Failed to fetch master data", error);
        }
    }, [getApiUrl, token, authLoading]);

    useEffect(() => {
        if (!authLoading) {
            fetchLibraryItems();
            fetchMasterData();

            // Check for pre-filled data from Master Data (Chapter List)
            const prefill = sessionStorage.getItem('library_prefill');
            if (prefill) {
                try {
                    const data = JSON.parse(prefill);
                    setNewItem(prev => ({
                        ...prev,
                        name: data.name || prev.name,
                        class_level: data.class_level || '',
                        subject: data.subject || '',
                        chapter: data.chapter || ''
                    }));
                    setIsAddModalOpen(true);
                    sessionStorage.removeItem('library_prefill');
                } catch (e) {
                    console.error("Failed to parse library prefill", e);
                }
            }
        }
    }, [fetchLibraryItems, fetchMasterData, authLoading]);

    const handleMultiFileChange = (e, field) => {
        const files = Array.from(e.target.files);
        const wrapped = files.map(file => ({ file, thumbnail: null }));
        setNewItem(prev => ({
            ...prev,
            [field]: [...prev[field], ...wrapped]
        }));
    };

    const handleThumbnailChangeForAsset = (e, field, index) => {
        const file = e.target.files[0];
        if (!file) return;
        setNewItem(prev => {
            const updated = [...prev[field]];
            updated[index] = { ...updated[index], thumbnail: file };
            return { ...prev, [field]: updated };
        });
    };

    const handleRemoveMultiFile = (field, index) => {
        setNewItem(prev => ({
            ...prev,
            [field]: prev[field].filter((_, i) => i !== index)
        }));
    };

    const handleFileChange = (e, field) => {
        const file = e.target.files[0];
        if (!file) return;

        // Ensure thumbnail image size does not exceed 5MB
        if (field === 'thumbnail') {
            if (file.size > 5 * 1024 * 1024) {
                setThumbnailError("Image size exceeds 5MB max limit");
                e.target.value = ''; // Reset input
                return;
            } else {
                setThumbnailError(null);
            }
        }

        // Ensure PDF size does not exceed 25MB
        if (field === 'pdf' || field === 'dpp_file') {
            if (file.size > 25 * 1024 * 1024) {
                if (field === 'pdf') setPdfError("PDF size exceeds 25MB max limit");
                else toast.error("DPP file size exceeds 25MB max limit");
                e.target.value = ''; // Reset input
                return;
            } else {
                if (field === 'pdf') setPdfError(null);
            }
        }

        setNewItem({ ...newItem, [field]: file });
    };

    const handleRemoveFile = (field) => {
        if (field === 'thumbnail') {
            setNewItem({ ...newItem, thumbnail: null, existing_thumbnail: null });
        } else if (field === 'pdf') {
            setNewItem({ ...newItem, pdf: null });
        } else if (field === 'dpp_file') {
            setNewItem({ ...newItem, dpp_file: null, existing_dpp: null });
        } else if (field === 'video_file') {
            setNewItem({ ...newItem, video_file: null });
        }
    };

    const addQuestion = () => {
        setNewItem(prev => ({
            ...prev,
            questions: [
                ...prev.questions,
                {
                    tempId: Date.now(),
                    question: '',
                    question_type: 'SINGLE_CHOICE',
                    options: [
                        { id: 1, content: '', isCorrect: false },
                        { id: 2, content: '', isCorrect: false },
                        { id: 3, content: '', isCorrect: false },
                        { id: 4, content: '', isCorrect: false }
                    ],
                    solution: '',
                    solve_time: 30
                }
            ]
        }));
    };

    const removeQuestion = (idx) => {
        const updated = [...newItem.questions];
        updated.splice(idx, 1);
        setNewItem({ ...newItem, questions: updated });
    };

    const toggleOption = (qIdx, optId) => {
        const updated = [...newItem.questions];
        const q = updated[qIdx];
        if (q.question_type === 'SINGLE_CHOICE') {
            q.options = q.options.map(opt => ({
                ...opt,
                isCorrect: opt.id === optId
            }));
        } else {
            q.options = q.options.map(opt => (
                opt.id === optId ? { ...opt, isCorrect: !opt.isCorrect } : opt
            ));
        }
        setNewItem({ ...newItem, questions: updated });
    };

    const processEditorImages = async (html) => {
        if (!html || !html.includes('data:image')) return html;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const imgs = tempDiv.getElementsByTagName('img');
        const apiUrl = getApiUrl();
        const uploadPromises = Array.from(imgs).map(async (img) => {
            const src = img.getAttribute('src');
            if (src && src.startsWith('data:image')) {
                try {
                    const res = await fetch(src);
                    const blob = await res.blob();
                    const file = new File([blob], "pasted_image.png", { type: blob.type });
                    const formData = new FormData();
                    formData.append('image', file);
                    if (newItem.class_level) formData.append('class_level', newItem.class_level);
                    if (newItem.subject) formData.append('subject', newItem.subject);
                    if (newItem.topic) formData.append('topic', newItem.topic);
                    const uploadRes = await axios.post(`${apiUrl}/api/questions/images/`, formData, {
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                    });
                    img.setAttribute('src', uploadRes.data.image);
                } catch (err) {
                    console.error("Sync: Failed to upload image", err);
                }
            }
        });
        await Promise.all(uploadPromises);
        return tempDiv.innerHTML;
    };

    const handleAddItem = async (e) => {
        if (e) e.preventDefault();
        
        // Accumulate all data from the map + current unsaved state
        const allPopulatedData = { ...topicDataMap };
        if (newItem.topic) {
            allPopulatedData[newItem.topic] = {
                multi_pdfs: [...newItem.multi_pdfs],
                multi_videos: [...newItem.multi_videos],
                multi_video_links: [...newItem.multi_video_links],
                questions: [...newItem.questions],
                content_type: newItem.content_type
            };
        }

        // Filter valid topics that have content
        const topicsToSubmit = Object.entries(allPopulatedData).filter(([tid, data]) => {
            if (String(tid).startsWith('dummy-')) return false;
            const hasData = (data.multi_pdfs?.length > 0 || data.multi_videos?.length > 0 || data.multi_video_links?.length > 0 || data.questions?.length > 0);
            return hasData;
        });

        if (topicsToSubmit.length === 0) {
            if (String(newItem.topic).startsWith('dummy-')) {
                toast.error("Cannot save to a 'Dummy' topic. Please select a real topic from Master Data.");
                return;
            }
            toast.error("Please add content to at least one topic.");
            return;
        }

        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            let successCount = 0;

            for (const [topicId, data] of topicsToSubmit) {
                const formData = new FormData();
                
                // Name for the main Library item record
                const firstResourceName = data.multi_pdfs[0]?.name || data.multi_videos[0]?.name || data.multi_video_links[0]?.name || data.multi_dpps?.[0]?.name || "Library Resource";
                formData.append('name', firstResourceName);
                formData.append('description', data.multi_pdfs[0]?.description || '');

                formData.append('session', newItem.session || '');
                formData.append('class_level', newItem.class_level || '');
                formData.append('subject', newItem.subject || '');
                formData.append('chapter', newItem.chapter || '');
                formData.append('topic', topicId);
                formData.append('content_type', data.content_type);

                // Granular PDFs
                data.multi_pdfs.forEach((item, i) => {
                    if (item.file) {
                        formData.append('multi_pdfs', item.file);
                        formData.append(`pdf_${i}_title`, item.name);
                        formData.append(`pdf_${i}_desc`, item.description);
                        if (item.thumbnail) formData.append(`pdf_${i}_thumb`, item.thumbnail);
                    }
                });

                // Granular Videos
                data.multi_videos.forEach((item, i) => {
                    if (item.file) {
                        formData.append('multi_videos', item.file);
                        formData.append(`video_${i}_title`, item.name);
                        formData.append(`video_${i}_desc`, item.description);
                        if (item.thumbnail) formData.append(`video_${i}_thumb`, item.thumbnail);
                    }
                });

                // Video Links
                if (data.multi_video_links && data.multi_video_links.length > 0) {
                    formData.append('multi_video_links_data', JSON.stringify(data.multi_video_links.map(v => ({ name: v.name, link: v.link, description: v.description }))));
                    data.multi_video_links.forEach((v, i) => {
                        if (v.thumbnail) formData.append(`link_${i}_thumb`, v.thumbnail);
                    });
                }

                // DPP Questions
                if (data.content_type === 'dpp' && data.questions.length > 0) {
                    const dppExamTypeId = (examTypes || []).find(ex => ex.name.toUpperCase() === 'DPP')?.id;
                    const dppTargetExamId = (targetExams || []).find(tx => tx.name.toUpperCase() === 'DPP')?.id;

                    const questionIds = [];
                    for (const q of data.questions) {
                        const cleanContent = await processEditorImages(q.question);
                        const cleanSolution = await processEditorImages(q.solution);
                        const cleanOptions = await Promise.all(q.options.map(async opt => ({
                            ...opt,
                            content: await processEditorImages(opt.content)
                        })));

                        const questionPayload = {
                            content: cleanContent,
                            question_options: cleanOptions,
                            solution: cleanSolution,
                            question_type: q.question_type,
                            difficulty_level: '1',
                            class_level: newItem.class_level,
                            subject: newItem.subject,
                            chapter: newItem.chapter || null,
                            topic: topicId,
                            exam_type: dppExamTypeId,
                            target_exam: dppTargetExamId,
                            solve_time: q.solve_time || 30
                        };

                        const qRes = await axios.post(`${apiUrl}/api/questions/`, questionPayload, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        questionIds.push(qRes.data.id || qRes.data._id);
                    }
                    if (questionIds.length > 0) {
                        questionIds.forEach(id => formData.append('questions', id));
                    }
                }

                await axios.post(`${apiUrl}/api/master-data/library/`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` }
                });
                successCount++;
            }

            toast.success(`Resources saved for ${successCount} topic(s)!`);
            setIsAddModalOpen(false);
            resetForm();
            setTopicDataMap({});
            fetchLibraryItems();
        } catch (err) {
            console.error(err);
            toast.error("Error batch saving items.");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleEditClick = (item) => {
        setSelectedItemForEdit(item);
        setNewItem({
            name: item.name,
            description: item.description,
            session: item.session || '',
            class_level: item.class_level || '',
            subject: item.subject || '',
            chapter: item.chapter || '',
            topic: item.topic || '',
            exam_type: item.exam_type || '',
            target_exam: item.target_exam || '',
            section: item.section || '',
            thumbnail: null,
            pdf: null,
            multi_pdfs: item.pdfs ? item.pdfs.map(p => ({ name: p.title, description: p.description, file: null, thumbnail: null, existing_thumb: p.thumbnail, existing_file: p.file })) : [],
            multi_dpps: item.dpps ? item.dpps.map(d => ({ name: d.title, description: d.description, file: null, thumbnail: null, existing_thumb: d.thumbnail, existing_file: d.file })) : (item.dpp_file ? [{ name: item.name, description: item.description, file: null, thumbnail: null, existing_thumb: item.thumbnail, existing_file: item.dpp_file }] : []),
            video_link: item.video_link || '',
            video_file: null,
            multi_videos: [],
            content_type: item.video_link || item.video_file ? 'video' : (item.dpp_file ? 'dpp' : 'pdf'),
            existing_thumbnail: item.thumbnail,
            existing_dpp: item.dpp_file,
            multi_video_links: [],
            questions: item.questions && item.questions.length > 0 ? item.questions : [{
                tempId: Date.now(),
                question: '',
                question_type: 'SINGLE_CHOICE',
                options: [
                    { id: 1, content: '', isCorrect: false },
                    { id: 2, content: '', isCorrect: false },
                    { id: 3, content: '', isCorrect: false },
                    { id: 4, content: '', isCorrect: false }
                ],
                solution: '',
                solve_time: 30
            }]
        });
        if (item.questions && item.questions.length > 0) setShowQuestionEditor(true);
        setIsEditModalOpen(true);
    };

    const handleUpdateItem = async (e) => {
        e.preventDefault();
        try {
            setIsActionLoading(true);
            const apiUrl = getApiUrl();
            const formData = new FormData();

            // Item metadata
            if (newItem.multi_pdfs[0]?.name || newItem.multi_videos[0]?.name || newItem.multi_video_links[0]?.name || newItem.multi_dpps[0]?.name) {
                const firstResourceName = newItem.multi_pdfs[0]?.name || newItem.multi_videos[0]?.name || newItem.multi_video_links[0]?.name || newItem.multi_dpps[0]?.name;
                formData.append('name', firstResourceName);
            }
            if (newItem.content_type === 'dpp') {
                formData.append('description', newItem.multi_dpps[0]?.description || '');
                if (newItem.multi_dpps[0]?.thumbnail) formData.append('thumbnail', newItem.multi_dpps[0].thumbnail);
            }
            
            formData.append('session', newItem.session || '');
            formData.append('class_level', newItem.class_level || '');
            formData.append('subject', newItem.subject || '');
            formData.append('chapter', newItem.chapter || '');
            
            if (newItem.topic && String(newItem.topic).startsWith('dummy-')) {
                toast.error("Cannot update with a dummy topic. Please create a real topic in Master Data first.");
                setIsActionLoading(false);
                return;
            }
            formData.append('topic', newItem.topic || '');
            // Handle Granular DPPs
            if (newItem.multi_dpps && newItem.multi_dpps.length > 0) {
                newItem.multi_dpps.forEach((item, i) => {
                    if (item.file) {
                        formData.append('multi_dpps', item.file);
                        formData.append(`dpp_${i}_title`, item.name);
                        formData.append(`dpp_${i}_desc`, item.description);
                        if (item.thumbnail) formData.append(`dpp_${i}_thumb`, item.thumbnail);
                    }
                });
            }
            formData.append('exam_type', newItem.exam_type || '');
            formData.append('target_exam', newItem.target_exam || '');
            formData.append('section', newItem.section || '');

            // Handle Granular PDFs
            if (newItem.multi_pdfs && newItem.multi_pdfs.length > 0) {
                newItem.multi_pdfs.forEach((item, i) => {
                    if (item.file) {
                        formData.append('multi_pdfs', item.file);
                        formData.append(`pdf_${i}_title`, item.name);
                        formData.append(`pdf_${i}_desc`, item.description);
                        if (item.thumbnail) formData.append(`pdf_${i}_thumb`, item.thumbnail);
                    }
                });
            }

            // Handle Granular Videos
            if (newItem.multi_videos && newItem.multi_videos.length > 0) {
                newItem.multi_videos.forEach((item, i) => {
                    if (item.file) {
                        formData.append('multi_videos', item.file);
                        formData.append(`video_${i}_title`, item.name);
                        formData.append(`video_${i}_desc`, item.description);
                        if (item.thumbnail) formData.append(`video_${i}_thumb`, item.thumbnail);
                    }
                });
            }

            // Handle Granular Video Links
            if (newItem.multi_video_links && newItem.multi_video_links.length > 0) {
                formData.append('multi_video_links_data', JSON.stringify(newItem.multi_video_links.map(v => ({ name: v.name, link: v.link, description: v.description }))));
                newItem.multi_video_links.forEach((v, i) => {
                    if (v.thumbnail) formData.append(`link_${i}_thumb`, v.thumbnail);
                });
            }

            // Handle DPP Questions Sync for Update (Append new ones if any)
            if (newItem.content_type === 'dpp' && newItem.questions.some(q => !q.id)) {
                const dppExamTypeId = examTypes.find(e => e.name.toUpperCase() === 'DPP')?.id;
                const dppTargetExamId = targetExams.find(t => t.name.toUpperCase() === 'DPP')?.id;

                const newQuestionIds = [];
                for (const q of newItem.questions) {
                    if (q.id) continue;

                    const cleanContent = await processEditorImages(q.question);
                    const cleanSolution = await processEditorImages(q.solution);
                    const cleanOptions = await Promise.all(q.options.map(async opt => ({
                        ...opt,
                        content: await processEditorImages(opt.content)
                    })));

                    const questionPayload = {
                        content: cleanContent,
                        question_options: cleanOptions,
                        solution: cleanSolution,
                        question_type: q.question_type,
                        difficulty_level: '1',
                        class_level: newItem.class_level,
                        subject: newItem.subject,
                        chapter: newItem.chapter || null,
                        topic: newItem.topic,
                        exam_type: dppExamTypeId,
                        target_exam: dppTargetExamId,
                        solve_time: q.solve_time || 30
                    };

                    const qRes = await axios.post(`${apiUrl}/api/questions/`, questionPayload, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    newQuestionIds.push(qRes.data.id || qRes.data._id);
                }

                if (newQuestionIds.length > 0) {
                    newQuestionIds.forEach(id => formData.append('questions', id));
                }
            }

            await axios.patch(`${apiUrl}/api/master-data/library/${selectedItemForEdit.id}/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` }
            });

            toast.success("Item updated successfully");
            setIsEditModalOpen(false);
            setSelectedItemForEdit(null);
            resetForm();
            fetchLibraryItems();
        } catch (error) {
            console.error("Failed to update item", error);
            const errorMsg = error.response?.data?.error || error.response?.data?.message || error.response?.data?.detail || "Failed to update library item";
            if (error.response?.status === 413) {
                toast.error("File size rejected by server. Increase Nginx client_max_body_size.");
            } else {
                toast.error(errorMsg);
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDeleteItem = async (id) => {
        if (!window.confirm("Are you sure you want to delete this item?")) return;
        try {
            const apiUrl = getApiUrl();
            await axios.delete(`${apiUrl}/api/master-data/library/${id}/`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            toast.success("Item deleted successfully");
            fetchLibraryItems();
        } catch (error) {
            console.error("Failed to delete item", error);
            toast.error("Failed to delete library item");
        }
    };

    const resetForm = () => {
        setThumbnailError(null);
        setShowQuestionEditor(false);
        setTopicDataMap({});
        setNewItem({
            multi_pdfs: [],
            multi_videos: [],
            multi_video_links: [],
            multi_dpps: [],
            content_type: 'pdf',
            dpp_mode: 'question',
            questions: [{
                tempId: Date.now(),
                question: '',
                question_type: 'SINGLE_CHOICE',
                options: [
                    { id: 1, content: '', isCorrect: false },
                    { id: 2, content: '', isCorrect: false },
                    { id: 3, content: '', isCorrect: false },
                    { id: 4, content: '', isCorrect: false }
                ],
                solution: '',
                solve_time: 30
            }],
            session: '',
            class_level: '',
            subject: '',
            chapter: '',
            topic: '',
            exam_type: '',
            target_exam: '',
            section: ''
        });
        setSelectedItemForEdit(null);
    };

    // Master-Data Synchronized Source
    const mergedSource = useMemo(() => {
        const safeLibrary = safeArray(libraryItems);
        const safeChapters = safeArray(chapters);
        
        // Track which chapters are already represented in Library
        const existingChapterIds = new Set(safeLibrary.map(item => String(item.chapter)));
        
        // Create virtual items for chapters that have NO library content yet
        const virtualItems = safeChapters
            .filter(ch => !existingChapterIds.has(String(ch.id)))
            .map(ch => ({
                id: `virtual-${ch.id}`,
                name: ch.name || "Untitled Chapter",
                chapter: ch.id,
                chapter_name: ch.name,
                chapter_order: ch.sort_order || 999,
                subject: ch.subject,
                subject_name: ch.subject_name,
                class_level: ch.class_level,
                class_name: ch.class_level_name,
                is_virtual: true,
                created_at: ch.created_at || new Date().toISOString(),
                pdfs: [],
                videos: [],
                dpps: []
            }));

        const itemsWithOrder = safeLibrary.map(item => {
            const chapterInfo = safeChapters.find(ch => String(ch.id) === String(item.chapter));
            return {
                ...item,
                chapter_order: chapterInfo?.sort_order || 999
            };
        });

        return [...itemsWithOrder, ...virtualItems];
    }, [libraryItems, chapters]);

    // Filter Logic
    const filteredItems = useMemo(() => {
        return mergedSource.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSession = !activeFilters.session || String(item.session) === String(activeFilters.session) || item.is_virtual;
            const matchesClass = !activeFilters.class_level || String(item.class_level) === String(activeFilters.class_level);
            const matchesSubject = !activeFilters.subject || String(item.subject) === String(activeFilters.subject);
            const matchesChapter = !activeFilters.chapter || String(item.chapter) === String(activeFilters.chapter);
            const matchesTopic = !activeFilters.topic || String(item.topic) === String(activeFilters.topic);
            const matchesExamType = !activeFilters.exam_type || String(item.exam_type) === String(activeFilters.exam_type);
            const matchesTargetExam = !activeFilters.target_exam || String(item.target_exam) === String(activeFilters.target_exam);
            const matchesSection = !activeFilters.section || String(item.section) === String(activeFilters.section);
            const matchesContentType = !activeFilters.contentType ||
                (activeFilters.contentType === 'pdf' && item.pdf_file) ||
                (activeFilters.contentType === 'video' && (item.video_link || item.video_file));

            return matchesSearch && matchesSession && matchesClass && matchesSubject && matchesChapter && matchesTopic && matchesExamType && matchesTargetExam && matchesSection && matchesContentType;
        }).sort((a, b) => {
            if (sortOrder === 'chapter') {
                // Primary: Class, Secondary: Subject, Tertiary: Chapter Order, Quaternary: Item Name
                const classComp = (a.class_name || "").localeCompare(b.class_name || "");
                if (classComp !== 0) return classComp;

                const subComp = (a.subject_name || "").localeCompare(b.subject_name || "");
                if (subComp !== 0) return subComp;
                
                if (a.chapter_order !== b.chapter_order) {
                    return a.chapter_order - b.chapter_order;
                }
                
                return (a.name || "").localeCompare(b.name || "");
            }
            if (sortOrder === 'newest') return new Date(b.created_at) - new Date(a.created_at);
            if (sortOrder === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
            if (sortOrder === 'az') return (a.name || "").localeCompare(b.name || "");
            if (sortOrder === 'za') return (b.name || "").localeCompare(a.name || "");
            return 0;
        });
    }, [mergedSource, searchQuery, activeFilters, sortOrder]);

    // Dynamic Filter Options based on available data
    const dynamicFilterOptions = useMemo(() => {
        const safeItems = safeArray(libraryItems);
        
        // Helper to filter items for a specific dropdown based on other active filters (Linked Mode)
        const getFilteredSources = (excludeFields = []) => {
            if (isFilterIndependentMode) return safeItems;
            return safeItems.filter(item => {
                const matchesSession = excludeFields.includes('session') || !activeFilters.session || String(item.session) === String(activeFilters.session);
                const matchesClass = excludeFields.includes('class_level') || !activeFilters.class_level || String(item.class_level) === String(activeFilters.class_level);
                const matchesSubject = excludeFields.includes('subject') || !activeFilters.subject || String(item.subject) === String(activeFilters.subject);
                const matchesChapter = excludeFields.includes('chapter') || !activeFilters.chapter || String(item.chapter) === String(activeFilters.chapter);
                const matchesExamType = excludeFields.includes('exam_type') || !activeFilters.exam_type || String(item.exam_type) === String(activeFilters.exam_type);
                const matchesTargetExam = excludeFields.includes('target_exam') || !activeFilters.target_exam || String(item.target_exam) === String(activeFilters.target_exam);
                const matchesSection = excludeFields.includes('section') || !activeFilters.section || String(item.section) === String(activeFilters.section);
                return matchesSession && matchesClass && matchesSubject && matchesChapter && matchesExamType && matchesTargetExam && matchesSection;
            });
        };

        return {
            sessions: [...new Set(getFilteredSources(['session']).filter(i => i.session_name).map(i => JSON.stringify({ id: i.session, name: i.session_name })))].map(s => JSON.parse(s)),
            classes: [...new Set(getFilteredSources(['class_level']).filter(i => i.class_name).map(i => JSON.stringify({ id: i.class_level, name: i.class_name })))].map(c => JSON.parse(c)),
            subjects: [...new Set(getFilteredSources(['subject']).filter(i => i.subject_name).map(i => JSON.stringify({ id: i.subject, name: i.subject_name })))].map(s => JSON.parse(s)),
            chapters: [...new Set(getFilteredSources(['chapter']).filter(i => i.chapter_name).map(i => JSON.stringify({ id: i.chapter, name: i.chapter_name })))].map(c => JSON.parse(c)),
            topics: [...new Set(getFilteredSources(['topic']).filter(i => i.topic_name).map(i => JSON.stringify({ id: i.topic, name: i.topic_name })))].map(t => JSON.parse(t)),
            examTypes: [...new Set(getFilteredSources(['exam_type']).filter(i => i.exam_type_name).map(i => JSON.stringify({ id: i.exam_type, name: i.exam_type_name })))].map(e => JSON.parse(e)),
            targetExams: [...new Set(getFilteredSources(['target_exam']).filter(i => i.target_exam_name).map(i => JSON.stringify({ id: i.target_exam, name: i.target_exam_name })))].map(t => JSON.parse(t)),
            sections: [...new Set(getFilteredSources(['section']).filter(i => i.section_name).map(i => JSON.stringify({ id: i.section, name: i.section_name })))].map(s => JSON.parse(s))
        };
    }, [libraryItems, activeFilters, isFilterIndependentMode]);

    // Stats logic
    const stats = useMemo(() => {
        const items = safeArray(libraryItems);
        return {
            total: items.length,
            managed_chapters: chapters.length,
            pdfs: items.filter(item => item.pdf_file).length,
            videos: items.filter(item => item.video_link || item.video_file).length
        };
    }, [libraryItems, chapters]);

    // Pagination logic
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredItems.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredItems, currentPage, itemsPerPage]);

    // Generate page numbers for numeric pagination
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    const handleJumpToPage = (e) => {
        e.preventDefault();
        const pageNum = parseInt(jumpToPage);
        if (pageNum >= 1 && pageNum <= totalPages) {
            setCurrentPage(pageNum);
            setJumpToPage('');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative text-slate-900 dark:text-white">
            <div className={`p-8 rounded-[5px] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-[#E67E22] text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-[#E67E22]/20">
                                    Content Management
                                </span>
                                <h2 className={`text-3xl font-black tracking-tight uppercase ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                    Study <span className="text-[#E67E22]">Library</span>
                                </h2>
                            </div>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Manage educational materials, PDFs, and thumbnails with advanced academic targeting.
                            </p>
                        </div>

                        {/* Stats Section */}
                        <div className="flex flex-wrap items-center gap-4 bg-slate-50 dark:bg-white/5 p-4 rounded-[5px] border border-slate-100 dark:border-white/5">
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Assigned Chapters</span>
                                <span className="text-xl font-black text-amber-500">{stats.managed_chapters}</span>
                            </div>
                            <div className={`w-px h-8 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`} />
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>PDFs</span>
                                <span className="text-xl font-black text-blue-500">{stats.pdfs}</span>
                            </div>
                            <div className={`w-px h-8 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`} />
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Videos</span>
                                <span className="text-xl font-black text-[#E67E22]">{stats.videos}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                            className="px-8 py-4 bg-[#E67E22] hover:bg-[#D35400] text-white rounded-[5px] font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-[#E67E22]/20 active:scale-95 flex items-center gap-2 group"
                        >
                            <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-all duration-300" />
                            <span>Add New File</span>
                        </button>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative group flex-1">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#E67E22] transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search by book name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={`w-full pl-14 pr-6 py-4 rounded-[5px] border-2 outline-none font-bold transition-colors text-sm ${isDarkMode
                                        ? 'bg-white/1 border-white/5 text-white focus:border-[#E67E22]/50'
                                        : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-[#E67E22]/50'
                                        }`}
                                />
                            </div>
                            <button
                                onClick={() => { fetchLibraryItems(); fetchMasterData(); }}
                                className={`p-4 rounded-[5px] transition-colors ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-[#E67E22] border border-white/5' : 'bg-[#E67E22]/10 hover:bg-[#E67E22]/20 text-[#E67E22] border border-[#E67E22]/20'}`}
                            >
                                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        {/* Filter Bar */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className={`p-2 rounded-[5px] flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-600'}`}>
                                <Filter size={14} /> Filters
                            </div>

                            <CustomSelect
                                label="Session"
                                options={dynamicFilterOptions.sessions}
                                value={activeFilters.session}
                                placeholder="All Sessions"
                                isDarkMode={isDarkMode}
                                onChange={(val) => setActiveFilters({ ...activeFilters, session: val })}
                            />

                            <CustomSelect
                                label="Class"
                                options={dynamicFilterOptions.classes}
                                value={activeFilters.class_level}
                                placeholder="All Classes"
                                isDarkMode={isDarkMode}
                                onChange={(val) => setActiveFilters({ ...activeFilters, class_level: val })}
                            />
                            <CustomSelect
                                label="Subject"
                                options={dynamicFilterOptions.subjects}
                                value={activeFilters.subject}
                                placeholder="All Subjects"
                                isDarkMode={isDarkMode}
                                onChange={(val) => setActiveFilters({ ...activeFilters, subject: val })}
                            />
                            <CustomSelect
                                label="Chapter"
                                options={dynamicFilterOptions.chapters}
                                value={activeFilters.chapter}
                                placeholder="All Chapters"
                                isDarkMode={isDarkMode}
                                onChange={(val) => setActiveFilters({ ...activeFilters, chapter: val })}
                            />
                            <CustomSelect
                                label="Section"
                                options={dynamicFilterOptions.sections}
                                value={activeFilters.section}
                                placeholder="All Sections"
                                isDarkMode={isDarkMode}
                                onChange={(val) => setActiveFilters({ ...activeFilters, section: val })}
                            />
                            <select
                                value={activeFilters.contentType}
                                onChange={(e) => setActiveFilters({ ...activeFilters, contentType: e.target.value })}
                                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                className={`px-4 py-2.5 rounded-[5px] font-bold text-xs outline-none border-none cursor-pointer transition-colors ${isDarkMode ? 'bg-[#1a1f2e] text-white hover:bg-[#252c41]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                            >
                                <option value="">All Types</option>
                                <option value="pdf">PDF Documents</option>
                                <option value="video">Video Content</option>
                            </select>
                            {(activeFilters.session || activeFilters.class_level || activeFilters.subject || activeFilters.chapter || activeFilters.section || activeFilters.contentType) && (
                                <button
                                    onClick={() => setActiveFilters({ session: '', class_level: '', subject: '', chapter: '', topic: '', exam_type: '', target_exam: '', section: '', contentType: '' })}
                                    className="px-4 py-2.5 rounded-[5px] font-bold text-[10px] uppercase tracking-widest text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10 active:scale-95"
                                >
                                    Clear All Filters
                                </button>
                            )}
                            <div className="flex items-center gap-2 ml-auto">
                                <div className={`p-2 rounded-[5px] flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-600'}`}>
                                    <ArrowUpDown size={14} /> Sort
                                </div>
                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value)}
                                    style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                    className={`px-4 py-2.5 rounded-[5px] font-bold text-xs outline-none border-none cursor-pointer transition-colors ${isDarkMode ? 'bg-[#1a1f2e] text-white hover:bg-[#252c41]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                                >
                                    <option value="chapter">Chapter-Wise (Default)</option>
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                    <option value="az">Alphabetical (A-Z)</option>
                                    <option value="za">Alphabetical (Z-A)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className={`rounded-[5px] border shadow-2xl overflow-hidden transition-colors ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-slate-50 text-slate-600'}`}>
                                 <th className="py-5 px-6 text-center w-20">#</th>
                                 <th className="py-5 px-6 text-center">Session</th>
                                 <th className="py-5 px-6 text-center">Class</th>
                                 <th className="py-5 px-6 text-center">Subject</th>
                                 <th className="py-5 px-6">Chapter Name</th>
                                 <th className="py-5 px-6 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 border-t border-white/5">
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-5 px-6 text-center"><div className={`h-4 w-4 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-5 px-6">
                                            <div className="flex flex-col gap-2">
                                                <div className={`h-5 w-48 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                <div className="flex items-center gap-2">
                                                    <div className={`h-3 w-16 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                    <div className={`h-3 w-16 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className={`mx-auto w-12 h-16 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className={`h-6 w-20 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className={`h-8 w-24 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="flex justify-center gap-2">
                                                <div className={`h-8 w-8 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                <div className={`h-8 w-8 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : paginatedItems.length > 0 ? (
                                paginatedItems.map((item, index) => (
                                    <tr key={item.id} className={`group transition-colors duration-200 ${isDarkMode ? 'hover:bg-white/1' : 'hover:bg-slate-50'}`}>
                                        <td className="py-5 px-6 text-center">
                                            <span className={`text-xs font-black ${isDarkMode ? 'text-slate-600' : 'text-slate-500'}`}>
                                                {((currentPage - 1) * itemsPerPage) + index + 1}
                                            </span>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
                                                {item.session_name || (activeFilters.session ? sessions.find(s => String(s.id) === String(activeFilters.session))?.name : '-') || '-'}
                                            </span>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <span className="font-black text-xs tracking-widest text-[#E67E22] uppercase">{item.class_name || '-'}</span>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            {item.subject_name ? (
                                                <span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase rounded-[5px] border border-blue-500/20">{item.subject_name}</span>
                                            ) : <span className="text-[10px] font-black uppercase opacity-20 tracking-widest text-slate-500">Unsorted</span>}
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="flex flex-col">
                                                <span className="font-extrabold text-sm uppercase text-[#E67E22] tracking-tight">{item.chapter_name || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {/* View/Watch Content */}
                                                {!item.is_virtual && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedItemForView(item);
                                                            setViewPage(1);
                                                            setIsViewModalOpen(true);
                                                            setIsFullScreen(false);
                                                        }}
                                                        className={`p-2 rounded-[5px] transition-all hover:scale-110 ${item.pdf_file ? 'bg-[#E67E22]/10 text-[#E67E22] hover:bg-[#E67E22]' : 'bg-amber-500/10 text-amber-600 hover:bg-amber-600'} hover:text-white border ${item.pdf_file ? 'border-[#E67E22]/20' : 'border-amber-500/20 shadow-sm'}`}
                                                        title={item.pdf_file ? 'View PDF' : 'Watch Video'}
                                                    >
                                                        {item.pdf_file ? <Eye size={16} strokeWidth={3} /> : <PlayCircle size={16} strokeWidth={3} />}
                                                    </button>
                                                )}
                                                
                                                {/* Edit/Add Action */}
                                                <button 
                                                    onClick={() => {
                                                        if (item.is_virtual) {
                                                            const prefillData = {
                                                                name: item.name,
                                                                session: activeFilters.session || item.session,
                                                                class_level: item.class_level,
                                                                subject: item.subject,
                                                                chapter: item.chapter
                                                            };
                                                            setNewItem(prev => ({ ...prev, ...prefillData }));
                                                            setIsAddModalOpen(true);
                                                        } else {
                                                            handleEditClick(item);
                                                        }
                                                    }} 
                                                    className={`p-2 rounded-[5px] transition-all hover:scale-110 shadow-sm ${item.is_virtual ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-blue-500/10 text-blue-500 hover:bg-blue-600 hover:text-white border border-blue-500/20'}`}
                                                    title={item.is_virtual ? 'Add Content' : 'Edit Resource'}
                                                >
                                                    {item.is_virtual ? <Plus size={16} strokeWidth={3} /> : <Edit2 size={16} strokeWidth={3} />}
                                                </button>

                                                {/* Delete Action */}
                                                {!item.is_virtual && (
                                                    <button 
                                                        onClick={() => handleDeleteItem(item.id)} 
                                                        className="p-2 rounded-[5px] bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-600 hover:text-white transition-all hover:scale-110 shadow-sm"
                                                        title="Delete Resource"
                                                    >
                                                        <Trash2 size={16} strokeWidth={3} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    )
                                )
                        ) : (
                                <tr><td colSpan={8} className="py-20 text-center text-slate-500 font-bold uppercase tracking-[0.2em] text-xs opacity-40 italic">No resources found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className={`p-8 border-t flex flex-col md:flex-row justify-between items-center gap-8 ${isDarkMode ? 'border-white/5 bg-black/20' : 'border-slate-100 bg-slate-50/50'}`}>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Showing</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                            className={`px-4 py-2 rounded-[5px] font-bold text-xs outline-none border-none cursor-pointer ${isDarkMode ? 'bg-[#1E2532] text-white' : 'bg-white text-slate-700 shadow-sm transition-all'}`}
                        >
                            {[10, 20, 50].map(val => (
                                <option key={val} value={val} className={isDarkMode ? 'bg-[#1E2532] text-white' : 'bg-white text-slate-800'}>{val} per page</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className={`p-2 rounded-[5px] bg-white/5 hover:bg-[#E67E22] hover:text-white disabled:opacity-10 transition-all active:scale-90 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}><ChevronLeft size={18} strokeWidth={2.5} /></button>

                        <div className="flex items-center gap-1.5">
                            {getPageNumbers().map(pageNum => (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`w-9 h-9 rounded-[5px] font-black text-xs transition-all active:scale-90 ${currentPage === pageNum
                                        ? 'bg-[#E67E22] text-white shadow-lg shadow-[#E67E22]/20'
                                        : (isDarkMode ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-sm')}`}
                                >
                                    {pageNum}
                                </button>
                            ))}
                            {totalPages > 5 && getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
                                <>
                                    <span className="text-slate-400 font-bold px-1">...</span>
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        className={`w-9 h-9 rounded-[5px] font-black text-xs transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-sm'}`}
                                    >
                                        {totalPages}
                                    </button>
                                </>
                            )}
                        </div>

                        <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className={`p-2 rounded-[5px] bg-white/5 hover:bg-[#E67E22] hover:text-white disabled:opacity-10 transition-all active:scale-90 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}><ChevronRight size={18} strokeWidth={2.5} /></button>
                    </div>

                    <form onSubmit={handleJumpToPage} className="flex items-center gap-2">
                        <input
                            type="number"
                            placeholder="Jump..."
                            value={jumpToPage}
                            onChange={(e) => setJumpToPage(e.target.value)}
                            className={`w-20 px-4 py-2 rounded-[5px] text-xs font-bold outline-none border transition-all ${isDarkMode ? 'bg-white/5 border-white/5 text-white focus:border-[#E67E22]/50' : 'bg-white border-slate-200 text-slate-800'}`}
                        />
                        <button type="submit" className={`p-2 rounded-[5px] transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-[#E67E22]' : 'bg-[#E67E22]/10 hover:bg-[#E67E22]/20 text-[#E67E22]'}`}>Go</button>
                    </form>
                </div>
            </div>

            {/* Modals */}
            {(isAddModalOpen || isEditModalOpen) && createPortal(
                <div className="fixed inset-0 z-[9999] flex justify-center items-start overflow-y-auto bg-black/60 backdrop-blur-md animate-in fade-in duration-300 p-4 py-2 custom-scrollbar">
                    <div className={`w-full max-w-6xl my-auto flex flex-col rounded-[5px] border shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-[#10141D] border-white/10 shadow-black text-white' : 'bg-white border-slate-100 shadow-slate-200 text-slate-800'}`}>
                        <div className={`p-4 border-b border-white/10 flex justify-between items-center text-white sticky top-0 z-10 ${isEditModalOpen ? 'bg-blue-600' : 'bg-[#E67E22]'}`}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-[5px]"><FileText size={20} /></div>
                                <h2 className="text-xl font-black uppercase tracking-tight">{isAddModalOpen ? 'Add To' : 'Edit'} <span className="opacity-70">Library</span></h2>
                            </div>
                            <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); resetForm(); }} className="p-2 hover:bg-white/10 rounded-[5px] transition-colors"><X size={20} /></button>
                        </div>

                        <form 
                            onSubmit={isAddModalOpen ? handleAddItem : handleUpdateItem} 
                            onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') e.preventDefault(); }}
                            className="p-5 space-y-5 overflow-y-auto flex-1 custom-scrollbar"
                        >
                            {/* Top Section: Academic Categorization */}
                            <div className={`p-4 rounded-[5px] border transition-all ${isDarkMode ? 'bg-white/2 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-4 bg-[#E67E22] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 text-[#E67E22]">Resource Categorization</span>
                                    </div>
                                    
                                    <button 
                                        type="button"
                                        onClick={() => setIsIndependentMode(!isIndependentMode)}
                                        className={`flex items-center gap-3 px-4 py-2 rounded-full border-2 transition-all ${isIndependentMode ? 'border-orange-500 bg-orange-500/10' : 'border-[#E67E22]/20 bg-[#E67E22]/5'}`}
                                    >
                                        <Layers size={14} className={isIndependentMode ? 'text-orange-500' : 'text-[#E67E22]'} />
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${isIndependentMode ? 'text-orange-500' : 'text-[#E67E22]'}`}>
                                            {isIndependentMode ? 'Independent Mode' : 'Linked Mode (Smart)'}
                                        </span>
                                        <div className={`w-8 h-4 rounded-full relative transition-all ${isIndependentMode ? 'bg-orange-500' : 'bg-[#E67E22]'}`}>
                                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${isIndependentMode ? 'left-4.5' : 'left-0.5'}`} style={{ left: isIndependentMode ? '1.1rem' : '0.125rem' }} />
                                        </div>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    {[
                                        { label: 'Session', field: 'session', options: sessions },
                                        { label: 'Class Level', field: 'class_level', options: classes },
                                        { label: 'Subject', field: 'subject', options: subjects },
                                        { 
                                            label: 'Chapter', 
                                            field: 'chapter', 
                                            options: isIndependentMode ? chapters : chapters.filter(c =>
                                                (!newItem.class_level || String(c.class_level) === String(newItem.class_level)) &&
                                                (!newItem.subject || String(c.subject) === String(newItem.subject))
                                            )
                                        },
                                        { label: 'Section', field: 'section', options: sections }
                                    ].map((meta, idx) => (
                                        <CustomSelect
                                            key={idx}
                                            label={meta.label}
                                            options={safeArray(meta.options)}
                                            value={newItem[meta.field]}
                                            placeholder={`Select ${meta.label}`}
                                            isDarkMode={isDarkMode}
                                            required={!['chapter', 'topic'].includes(meta.field)}
                                            onChange={(val) => {
                                                const updates = { [meta.field]: val };
                                                // Only auto-reset if NOT in independent mode
                                                if (!isIndependentMode) {
                                                    if (meta.field === 'class_level' || meta.field === 'subject') {
                                                        updates.chapter = '';
                                                        updates.topic = '';
                                                    } else if (meta.field === 'chapter') {
                                                        updates.topic = '';
                                                    }
                                                }
                                                setNewItem({ ...newItem, ...updates });
                                            }}
                                        />
                                    ))}
                                </div>

                                {/* Dynamic Topic Quick-Selection (Marked Place) */}
                                <div className={`mt-8 p-6 rounded-[10px] border-2 border-dashed transition-all animate-in slide-in-from-top-2 duration-500 ${isDarkMode ? 'bg-white/2 border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                                    <div className="flex items-center justify-between mb-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)] animate-pulse" />
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-500">Target Topic Selection</span>
                                                <span className={`text-[8px] font-bold uppercase tracking-widest ${isDarkMode ? 'opacity-40' : 'text-slate-400'}`}>
                                                    {newItem.chapter ? 'Select a specific topic to associate with these resources' : 'Select a chapter above to view topics'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            {newItem.chapter && (
                                                <div className="w-[180px] scale-90 origin-right relative z-[200]">
                                                    <CustomSelect
                                                        label="Jump to Topic"
                                                        value={newItem.topic}
                                                        options={isIndependentMode ? topics : (
                                                            (() => {
                                                                const filtered = topics.filter(t => (!newItem.chapter || String(t.chapter) === String(newItem.chapter)));
                                                                return filtered.map(t => ({ ...t, label: t.name, id: t.id }));
                                                            })()
                                                        )}
                                                        placeholder="Select Topic"
                                                        isDarkMode={isDarkMode}
                                                        required
                                                        onChange={(val) => {
                                                            const oldTopic = newItem.topic;
                                                            if (oldTopic) {
                                                                setTopicDataMap(prev => ({
                                                                    ...prev,
                                                                    [oldTopic]: {
                                                                        multi_pdfs: [...newItem.multi_pdfs],
                                                                        multi_videos: [...newItem.multi_videos],
                                                                        multi_video_links: [...newItem.multi_video_links],
                                                                        questions: [...newItem.questions],
                                                                        content_type: newItem.content_type
                                                                    }
                                                                }));
                                                            }
                                                            const existing = topicDataMap[val] || {
                                                                multi_pdfs: [],
                                                                multi_videos: [],
                                                                multi_video_links: [],
                                                                questions: [],
                                                                content_type: 'pdf'
                                                            };
                                                            setNewItem({ 
                                                                ...newItem, 
                                                                topic: val,
                                                                multi_pdfs: existing.multi_pdfs,
                                                                multi_videos: existing.multi_videos,
                                                                multi_video_links: existing.multi_video_links,
                                                                questions: existing.questions,
                                                                content_type: existing.content_type
                                                            });
                                                            setTimeout(() => {
                                                                const el = document.getElementById(`topic-btn-${val}`);
                                                                if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                                                            }, 100);
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div 
                                        ref={scrollContainerRef}
                                        className="flex items-center gap-3 overflow-x-auto pb-24 pt-4 custom-scrollbar flex-nowrap -mx-2 px-8 cursor-grab active:cursor-grabbing select-none"
                                    >
                                        {(newItem.chapter || isIndependentMode) ? (
                                            (() => {
                                                const displayTopics = isIndependentMode ? topics : topics.filter(t => String(t.chapter) === String(newItem.chapter));
                                                return displayTopics.map((t, idx) => {
                                                    const records = libraryItems.filter(li => String(li.topic) === String(t.id));
                                                    const hasContent = records.length > 0;
                                                    const summary = hasContent ? {
                                                        pdfs: records.reduce((acc, r) => acc + (r.pdfs?.length || 0) + (r.pdf_file ? 1 : 0), 0),
                                                        videos: records.reduce((acc, r) => acc + (r.videos?.length || 0) + (r.video_link ? 1 : 0), 0),
                                                        questions: records.reduce((acc, r) => acc + (r.questions?.length || 0), 0)
                                                    } : null;

                                                    return (
                                                        <div key={t.id || idx} className="relative group/topic">
                                                            <button
                                                                id={`topic-btn-${t.id}`}
                                                                type="button"
                                                                onClick={() => {
                                                                    const oldTopic = newItem.topic;
                                                                    if (oldTopic) {
                                                                        setTopicDataMap(prev => ({
                                                                            ...prev,
                                                                            [oldTopic]: {
                                                                                multi_pdfs: [...newItem.multi_pdfs],
                                                                                multi_videos: [...newItem.multi_videos],
                                                                                multi_video_links: [...newItem.multi_video_links],
                                                                                questions: [...newItem.questions],
                                                                                content_type: newItem.content_type
                                                                            }
                                                                        }));
                                                                    }

                                                                    const existing = topicDataMap[t.id] || {
                                                                        multi_pdfs: [],
                                                                        multi_videos: [],
                                                                        multi_video_links: [],
                                                                        questions: [],
                                                                        content_type: 'pdf'
                                                                    };

                                                                    setNewItem({ 
                                                                        ...newItem, 
                                                                        topic: t.id,
                                                                        multi_pdfs: existing.multi_pdfs,
                                                                        multi_videos: existing.multi_videos,
                                                                        multi_video_links: existing.multi_video_links,
                                                                        questions: existing.questions,
                                                                        content_type: existing.content_type
                                                                    });
                                                                }}
                                                                className={`px-4 py-2 rounded-[6px] text-[9px] font-black uppercase tracking-wider transition-all border-2 relative flex-shrink-0 whitespace-nowrap
                                                                    ${String(newItem.topic) === String(t.id)
                                                                        ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20 scale-[1.05] z-10'
                                                                        : isDarkMode 
                                                                            ? 'bg-black/20 border-white/5 text-slate-400 hover:border-orange-500/50 hover:text-orange-500' 
                                                                            : 'bg-white border-slate-100 text-slate-600 hover:border-orange-500 hover:text-orange-500 shadow-sm'}`}
                                                            >
                                                                {t.name}
                                                                {String(newItem.topic) === String(t.id) && (
                                                                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-white text-orange-500 rounded-full flex items-center justify-center shadow-xl border border-orange-500/10 z-[30]">
                                                                        <Check size={12} strokeWidth={4} />
                                                                    </div>
                                                                )}
                                                                {hasContent && (
                                                                    <div className={`absolute -top-1.5 -left-1.5 w-3 h-3 rounded-full shadow-lg z-[30] border-2 ${String(newItem.topic) === String(t.id) ? 'bg-white border-orange-500' : 'bg-emerald-500 border-white'}`} />
                                                                )}
                                                            </button>

                                                            {summary && (
                                                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-48 p-4 bg-slate-900 border border-white/10 rounded-[8px] shadow-2xl opacity-0 group-hover/topic:opacity-100 pointer-events-none transition-all z-[100] transform -translate-y-2 group-hover/topic:translate-y-0">
                                                                    <div className="flex flex-col gap-2">
                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#E67E22] border-b border-white/5 pb-2 mb-1">Existing Content</span>
                                                                        <div className="grid grid-cols-3 gap-2">
                                                                            <div className="flex flex-col items-center gap-1">
                                                                                <FileText size={12} className="text-blue-400" />
                                                                                <span className="text-[9px] font-black text-white">{summary.pdfs}</span>
                                                                                <span className="text-[7px] font-bold text-slate-500 uppercase">PDF</span>
                                                                            </div>
                                                                            <div className="flex flex-col items-center gap-1">
                                                                                <Video size={12} className="text-amber-400" />
                                                                                <span className="text-[9px] font-black text-white">{summary.videos}</span>
                                                                                <span className="text-[7px] font-bold text-slate-500 uppercase">VID</span>
                                                                            </div>
                                                                            <div className="flex flex-col items-center gap-1">
                                                                                <HelpCircle size={12} className="text-emerald-400" />
                                                                                <span className="text-[9px] font-black text-white">{summary.questions}</span>
                                                                                <span className="text-[7px] font-bold text-slate-500 uppercase">QUES</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-b-slate-900" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                });
                                            })()
                                        ) : (
                                            <div className="flex flex-col items-center justify-center w-full py-8 opacity-20">
                                                <Layers size={32} className="mb-2" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Select Chapter To Load Topics</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Content Type Selection Tabs */}
                            <div className="flex items-center gap-2 p-1.5 rounded-[12px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 mb-8 mt-8">
                                {[
                                    { id: 'pdf', label: 'PDF Library', icon: FileText },
                                    { id: 'video', label: 'Video Library', icon: Video },
                                    { id: 'dpp', label: 'DPP / Questions', icon: HelpCircle }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setNewItem({ ...newItem, content_type: tab.id })}
                                        className={`flex-1 py-4 px-4 rounded-[10px] flex items-center justify-center gap-3 transition-all font-black uppercase tracking-widest text-[11px] ${
                                            newItem.content_type === tab.id 
                                                ? 'bg-[#E67E22] text-white shadow-xl scale-[1.02]' 
                                                : 'hover:bg-white/10 text-slate-400 dark:text-slate-500'
                                        }`}
                                    >
                                        <tab.icon size={18} strokeWidth={3} />
                                        {tab.label}
                                        {newItem.multi_pdfs?.length > 0 && tab.id === 'pdf' && (
                                            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[8px]">{newItem.multi_pdfs.length}</span>
                                        )}
                                        {(newItem.multi_videos?.length > 0 || newItem.multi_video_links?.length > 0) && tab.id === 'video' && (
                                            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[8px]">{newItem.multi_videos.length + newItem.multi_video_links.length}</span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="min-h-[400px] animate-in slide-in-from-top-4 duration-500">
                                {newItem.content_type === 'pdf' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                                <label className={`block text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'opacity-40' : 'opacity-70 text-slate-500'}`}>PDF Materials List</label>
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => setNewItem({ ...newItem, multi_pdfs: [...newItem.multi_pdfs, { name: '', description: '', file: null, thumbnail: null }] })}
                                                className="flex items-center gap-2 px-6 py-2 bg-[#E67E22] text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#E67E22]/20 active:scale-95 transition-all"
                                            >
                                                <Plus size={16} strokeWidth={4} />
                                                Add PDF Material
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            {newItem.multi_pdfs.length === 0 ? (
                                                <div 
                                                    onClick={() => setNewItem({ ...newItem, multi_pdfs: [...newItem.multi_pdfs, { name: '', description: '', file: null, thumbnail: null }] })}
                                                    className={`h-[180px] rounded-[15px] border-4 border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer transition-all active:scale-95 group ${isDarkMode ? 'border-white/5 bg-white/2 hover:border-blue-500/30' : 'border-slate-200 bg-slate-50 hover:border-blue-500'}`}
                                                >
                                                    <div className="p-4 rounded-full bg-blue-500 text-white shadow-xl shadow-blue-500/30 group-hover:rotate-90 transition-transform"><Plus size={32} strokeWidth={3} /></div>
                                                    <div className="text-center">
                                                        <p className="font-black uppercase tracking-widest text-xs">No PDF Materials</p>
                                                        <p className="text-[10px] opacity-40 font-bold">Click the plus icon to add your first document</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 gap-4">
                                                    {newItem.multi_pdfs.map((item, i) => (
                                                        <div key={i} className={`p-6 rounded-[12px] border-2 transition-all relative group animate-in slide-in-from-right-4 duration-300 ${isDarkMode ? 'bg-[#1a1f2e] border-white/5' : 'bg-white border-slate-100 shadow-md shadow-slate-200/50'}`}>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => {
                                                                    const updated = [...newItem.multi_pdfs];
                                                                    updated.splice(i, 1);
                                                                    setNewItem({ ...newItem, multi_pdfs: updated });
                                                                }}
                                                                className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:rotate-90 active:scale-90 transition-all z-10"
                                                            >
                                                                <X size={14} strokeWidth={4} />
                                                            </button>

                                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                                                <div className="md:col-span-3">
                                                                    <div className="relative group/thumb aspect-[1/1] rounded-[10px] border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center overflow-hidden bg-slate-50 dark:bg-black/20 transition-all hover:border-blue-500/30 cursor-pointer">
                                                                        <input type="file" accept="image/*" onChange={(e) => {
                                                                            const file = e.target.files[0];
                                                                            if (file) {
                                                                                const updated = [...newItem.multi_pdfs];
                                                                                updated[i].thumbnail = file;
                                                                                setNewItem({ ...newItem, multi_pdfs: updated });
                                                                            }
                                                                        }} className="absolute inset-0 opacity-0 z-20 cursor-pointer" />
                                                                         {item.thumbnail ? (
                                                                            <>
                                                                                <img src={URL.createObjectURL(item.thumbnail)} className="w-full h-full object-cover" alt="Thumb" />
                                                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-black uppercase">Change Cover</div>
                                                                            </>
                                                                        ) : item.existing_thumb ? (
                                                                            <>
                                                                                <img src={item.existing_thumb} className="w-full h-full object-cover" alt="Thumb" />
                                                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-black uppercase">Change Cover</div>
                                                                            </>
                                                                        ) : (
                                                                            <div className="flex flex-col items-center gap-2 opacity-30 group-hover/thumb:opacity-100 group-hover/thumb:text-blue-500 transition-all">
                                                                                <Upload size={24} />
                                                                                <span className="text-[8px] font-black uppercase">Cover Image</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="md:col-span-9 space-y-4">
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        <div>
                                                                            <label className="block text-[8px] font-black uppercase tracking-widest text-blue-500 mb-1">Document Name *</label>
                                                                            <input 
                                                                                type="text"
                                                                                value={item.name || ''}
                                                                                onChange={(e) => {
                                                                                    const updated = [...newItem.multi_pdfs];
                                                                                    updated[i].name = e.target.value;
                                                                                    setNewItem({ ...newItem, multi_pdfs: updated });
                                                                                }}
                                                                                placeholder="e.g. Physics Module Vol 1"
                                                                                className={`w-full px-4 py-2.5 rounded-[5px] outline-none border-2 font-bold text-xs transition-all ${isDarkMode ? 'bg-black/20 border-white/5 focus:border-blue-500/50 text-white' : 'bg-white border-slate-100 focus:border-blue-500 text-slate-800 shadow-sm'}`}
                                                                            />
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <label className="block text-[8px] font-black uppercase tracking-widest text-[#E67E22] mb-1">Pick File *</label>
                                                                            <div className="relative group/file">
                                                                                <input type="file" accept=".pdf" onChange={(e) => {
                                                                                    const file = e.target.files[0];
                                                                                    if (file) {
                                                                                        const updated = [...newItem.multi_pdfs];
                                                                                        updated[i].file = file;
                                                                                        if(!updated[i].name) updated[i].name = file.name.replace('.pdf', '').replace(/_/g, ' ');
                                                                                        setNewItem({ ...newItem, multi_pdfs: updated });
                                                                                    }
                                                                                }} className="absolute inset-0 opacity-0 z-20 cursor-pointer" />
                                                                                <div className={`px-4 py-2.5 rounded-[5px] border-2 border-dashed flex items-center justify-between transition-all ${item.file ? 'border-[#E67E22] bg-[#E67E22]/5' : 'border-slate-200 dark:border-white/10'}`}>
                                                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                                                        <FileText size={16} className={item.file ? 'text-[#E67E22]' : 'opacity-20'} />
                                                                                        <span className={`text-[10px] font-bold truncate max-w-[120px] ${(item.file || item.existing_file) ? (isDarkMode ? 'text-white' : 'text-slate-800') : 'opacity-30'}`}>
                                                                                            {item.file ? item.file.name : (item.existing_file ? 'Existing PDF' : 'Select PDF...')}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        {item.existing_file && !item.file && (
                                                                                            <button 
                                                                                                type="button"
                                                                                                onClick={(e) => { e.stopPropagation(); setPreviewData({ url: item.existing_file, type: 'pdf', title: item.name }); }}
                                                                                                className="px-2 py-0.5 rounded-[3px] bg-blue-500 text-white text-[7px] font-black uppercase hover:bg-blue-600 transition-colors z-30"
                                                                                            >
                                                                                                View
                                                                                            </button>
                                                                                        )}
                                                                                        <div className={`px-2 py-0.5 rounded-[3px] text-[7px] font-black uppercase ${item.file ? 'bg-[#E67E22] text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>
                                                                                            {item.file ? 'Picked' : 'Add'}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div>
                                                                        <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Brief Description</label>
                                                                        <textarea 
                                                                            value={item.description || ''}
                                                                            onChange={(e) => {
                                                                                const updated = [...newItem.multi_pdfs];
                                                                                updated[i].description = e.target.value;
                                                                                setNewItem({ ...newItem, multi_pdfs: updated });
                                                                            }}
                                                                            placeholder="Brief summary of this PDF..."
                                                                            className={`w-full px-4 py-2.5 rounded-[5px] outline-none border-2 font-bold text-[10px] transition-all min-h-[50px] resize-none ${isDarkMode ? 'bg-black/20 border-white/5 focus:border-blue-500/50 text-white' : 'bg-white border-slate-100 focus:border-blue-500 text-slate-800 shadow-sm'}`}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {newItem.content_type === 'video' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                                <label className={`block text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'opacity-40' : 'opacity-70 text-slate-500'}`}>Video Content List</label>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    type="button"
                                                    onClick={() => setNewItem({ ...newItem, multi_videos: [...newItem.multi_videos, { name: '', description: '', file: null, thumbnail: null }] })}
                                                    className="flex items-center gap-2 px-6 py-2 bg-amber-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                                                >
                                                    <Plus size={16} strokeWidth={4} />
                                                    Add MP4 Video
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => setNewItem({ ...newItem, multi_video_links: [...newItem.multi_video_links, { name: '', description: '', link: '', thumbnail: null }] })}
                                                    className="flex items-center gap-2 px-6 py-2 bg-red-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                                                >
                                                    <Youtube size={16} strokeWidth={2.5} />
                                                    Add Youtube Link
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {/* Render Mixed Dynamic Video/Link List */}
                                            {[...newItem.multi_videos.map((v, idx) => ({ ...v, vType: 'file', originalIdx: idx })), 
                                              ...newItem.multi_video_links.map((v, idx) => ({ ...v, vType: 'link', originalIdx: idx }))].length === 0 ? (
                                                <div className={`h-[180px] rounded-[15px] border-4 border-dashed flex flex-col items-center justify-center gap-4 transition-all opacity-40 ${isDarkMode ? 'border-white/5 bg-white/2' : 'border-slate-200 bg-slate-50'}`}>
                                                    <Video size={40} className="mb-2" />
                                                    <p className="font-black uppercase tracking-widest text-xs">No Videos Linked Yet</p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 gap-4">
                                                    {newItem.multi_videos.map((item, i) => (
                                                        <div key={`file-${i}`} className={`p-6 rounded-[12px] border-2 transition-all relative group animate-in slide-in-from-right-4 duration-300 ${isDarkMode ? 'bg-[#1a1f2e] border-white/5' : 'bg-white border-slate-100 shadow-md shadow-slate-200/50'}`}>
                                                            <button type="button" onClick={() => { const updated = [...newItem.multi_videos]; updated.splice(i, 1); setNewItem({ ...newItem, multi_videos: updated }); }} className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:rotate-90 active:scale-90 transition-all z-10"><X size={14} strokeWidth={4} /></button>
                                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                                                <div className="md:col-span-3">
                                                                    <div className="relative group/thumb aspect-[16/9] md:aspect-[1/1] rounded-[10px] border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center overflow-hidden bg-slate-50 dark:bg-black/20 transition-all hover:border-amber-500/30 cursor-pointer">
                                                                        <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files[0]; if (file) { const updated = [...newItem.multi_videos]; updated[i].thumbnail = file; setNewItem({ ...newItem, multi_videos: updated }); } }} className="absolute inset-0 opacity-0 z-20 cursor-pointer" />
                                                                        {item.thumbnail ? (
                                                                            <><img src={URL.createObjectURL(item.thumbnail)} className="w-full h-full object-cover" alt="T" /><div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-black">Change</div></>
                                                                        ) : item.existing_thumb ? (
                                                                            <><img src={item.existing_thumb} className="w-full h-full object-cover" alt="T" /><div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-black">Change</div></>
                                                                        ) : <div className="flex flex-col items-center gap-2 opacity-30"><Upload size={24} /><span className="text-[8px] font-black uppercase text-center px-2">Video Thumb</span></div>}
                                                                    </div>
                                                                </div>
                                                                <div className="md:col-span-9 space-y-4">
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        <div><label className="block text-[8px] font-black uppercase tracking-widest text-amber-500 mb-1">Video Title *</label><input type="text" value={item.name || ''} onChange={(e) => { const updated = [...newItem.multi_videos]; updated[i].name = e.target.value; setNewItem({ ...newItem, multi_videos: updated }); }} placeholder="e.g. Introduction to Force" className={`w-full px-4 py-2.5 rounded-[5px] border-2 font-bold text-xs transition-all outline-none ${isDarkMode ? 'bg-black/20 border-white/5 focus:border-amber-500/50 text-white' : 'bg-white border-slate-100 focus:border-amber-500 text-slate-800 shadow-sm'}`} /></div>
                                                                         <div className="flex flex-col"><label className="block text-[8px] font-black uppercase tracking-widest text-orange-500 mb-1">Video File (.mp4) *</label><div className="relative group/file"><input type="file" accept="video/*" onChange={(e) => { const file = e.target.files[0]; if (file) { const updated = [...newItem.multi_videos]; updated[i].file = file; if(!updated[i].name) updated[i].name = file.name.substring(0, file.name.lastIndexOf('.')).replace(/_/g, ' '); setNewItem({ ...newItem, multi_videos: updated }); } }} className="absolute inset-0 opacity-0 z-20 cursor-pointer" /><div className={`px-4 py-2.5 rounded-[5px] border-2 border-dashed flex items-center justify-between transition-all ${(item.file || item.existing_file) ? 'border-orange-500 bg-orange-500/5' : 'border-slate-200 dark:border-white/10'}`}><div className="flex items-center gap-3 overflow-hidden"><Video size={16} className={(item.file || item.existing_file) ? 'text-orange-500' : 'opacity-20'} /><span className={`text-[10px] font-bold truncate max-w-[120px] ${(item.file || item.existing_file) ? (isDarkMode ? 'text-white' : 'text-slate-800') : 'opacity-30'}`}>{item.file ? item.file.name : (item.existing_file ? 'Existing Video' : 'Select File...')}</span></div><div className="flex items-center gap-2">{item.existing_file && !item.file && (<button type="button" onClick={(e) => { e.stopPropagation(); setPreviewData({ url: item.existing_file, type: 'video', title: item.name }); }} className="px-2 py-0.5 rounded-[3px] bg-blue-500 text-white text-[7px] font-black uppercase hover:bg-blue-600 transition-colors z-30">Play</button>)}<div className={`px-2 py-0.5 rounded-[3px] text-[7px] font-black uppercase ${(item.file || item.existing_file) ? 'bg-orange-500 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>{item.file ? 'Picked' : (item.existing_file ? 'Cloud' : 'Add')}</div></div></div></div></div>
                                                                    </div>
                                                                    <div><label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Description</label><textarea value={item.description || ''} onChange={(e) => { const updated = [...newItem.multi_videos]; updated[i].description = e.target.value; setNewItem({ ...newItem, multi_videos: updated }); }} placeholder="Describe the video content..." className={`w-full px-4 py-2.5 rounded-[5px] outline-none border-2 font-bold text-[10px] transition-all min-h-[50px] resize-none ${isDarkMode ? 'bg-black/20 border-white/5 focus:border-amber-500/50 text-white' : 'bg-white border-slate-100 focus:border-amber-500 text-slate-800 shadow-sm'}`} /></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {newItem.multi_video_links.map((item, i) => (
                                                        <div key={`link-${i}`} className={`p-6 rounded-[12px] border-2 transition-all relative group animate-in slide-in-from-right-4 duration-300 ${isDarkMode ? 'bg-[#1a1f2e] border-white/5' : 'bg-white border-slate-100 shadow-md shadow-slate-200/50'}`}>
                                                            <button type="button" onClick={() => { const updated = [...newItem.multi_video_links]; updated.splice(i, 1); setNewItem({ ...newItem, multi_video_links: updated }); }} className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:rotate-90 active:scale-90 transition-all z-10"><X size={14} strokeWidth={4} /></button>
                                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                                                <div className="md:col-span-3">
                                                                    <div className="relative group/thumb aspect-[16/9] md:aspect-[1/1] rounded-[10px] border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center overflow-hidden bg-slate-50 dark:bg-black/20 transition-all hover:border-red-500/30 cursor-pointer">
                                                                        <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files[0]; if (file) { const updated = [...newItem.multi_video_links]; updated[i].thumbnail = file; setNewItem({ ...newItem, multi_video_links: updated }); } }} className="absolute inset-0 opacity-0 z-20 cursor-pointer" />
                                                                        {item.thumbnail ? (
                                                                            <><img src={URL.createObjectURL(item.thumbnail)} className="w-full h-full object-cover" alt="T" /><div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-black">Change</div></>
                                                                        ) : item.existing_thumb ? (
                                                                            <><img src={item.existing_thumb} className="w-full h-full object-cover" alt="T" /><div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-black">Change</div></>
                                                                        ) : <div className="flex flex-col items-center gap-2 opacity-30"><Youtube size={24} className="text-red-500" /><span className="text-[8px] font-black uppercase text-center px-2">Link Thumb</span></div>}
                                                                    </div>
                                                                </div>
                                                                <div className="md:col-span-9 space-y-4">
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        <div><label className="block text-[8px] font-black uppercase tracking-widest text-red-500 mb-1">Resource Title *</label><input type="text" value={item.name || ''} onChange={(e) => { const updated = [...newItem.multi_video_links]; updated[i].name = e.target.value; setNewItem({ ...newItem, multi_video_links: updated }); }} placeholder="e.g. Masterclass by S. Sir" className={`w-full px-4 py-2.5 rounded-[5px] border-2 font-bold text-xs transition-all outline-none ${isDarkMode ? 'bg-black/20 border-white/5 focus:border-red-500/50 text-white' : 'bg-white border-slate-100 focus:border-red-500 text-slate-800 shadow-sm'}`} /></div>
                                                                        <div><label className="block text-[8px] font-black uppercase tracking-widest text-red-500/60 mb-1">Youtube URL *</label><input type="text" value={item.link || ''} onChange={(e) => { const updated = [...newItem.multi_video_links]; updated[i].link = e.target.value; setNewItem({ ...newItem, multi_video_links: updated }); }} placeholder="https://youtube.com/..." className={`w-full px-4 py-2.5 rounded-[5px] border-2 font-bold text-xs transition-all outline-none ${isDarkMode ? 'bg-black/20 border-white/5 focus:border-red-500/50 text-white' : 'bg-white border-slate-100 focus:border-red-500 text-slate-800 shadow-sm'}`} /></div>
                                                                    </div>
                                                                    <div><label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Brief Description</label><textarea value={item.description || ''} onChange={(e) => { const updated = [...newItem.multi_video_links]; updated[i].description = e.target.value; setNewItem({ ...newItem, multi_video_links: updated }); }} placeholder="Link details..." className={`w-full px-4 py-2.5 rounded-[5px] outline-none border-2 font-bold text-[10px] transition-all min-h-[50px] resize-none ${isDarkMode ? 'bg-black/20 border-white/5 focus:border-red-500/50 text-white' : 'bg-white border-slate-100 focus:border-red-500 text-slate-800 shadow-sm'}`} /></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                        {newItem.content_type === 'dpp' && (
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-500">DPP Materials</h4>
                                                        <p className="text-[9px] font-bold opacity-40">Manage multiple practice documents for this set</p>
                                                    </div>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setNewItem({ ...newItem, multi_dpps: [...newItem.multi_dpps, { name: '', description: '', file: null, thumbnail: null }] })}
                                                        className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                                                    >
                                                        <Plus size={16} strokeWidth={4} />
                                                        Add DPP Material
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                                                    <div className="md:col-span-8 space-y-4">
                                                        {newItem.multi_dpps.length === 0 ? (
                                                            <div 
                                                                onClick={() => setNewItem({ ...newItem, multi_dpps: [...newItem.multi_dpps, { name: '', description: '', file: null, thumbnail: null }] })}
                                                                className={`h-[180px] rounded-[15px] border-4 border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer transition-all active:scale-95 group ${isDarkMode ? 'border-white/5 bg-white/2 hover:border-orange-500/30' : 'border-slate-200 bg-slate-50 hover:border-orange-500/50'}`}
                                                            >
                                                                <div className="p-4 rounded-full bg-orange-500 text-white shadow-xl shadow-orange-500/30 group-hover:rotate-90 transition-transform"><Plus size={32} strokeWidth={3} /></div>
                                                                <div className="text-center">
                                                                    <p className="font-black uppercase tracking-widest text-xs">No DPP Materials</p>
                                                                    <p className="text-[10px] opacity-40 font-bold">Click to add your first practice PDF</p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-4">
                                                                 {newItem.multi_dpps.map((item, i) => (
                                                                    <div key={i} className={`p-6 rounded-[12px] border-2 transition-all relative group animate-in slide-in-from-right-4 duration-300 ${isDarkMode ? 'bg-[#1a1f2e] border-white/5' : 'bg-white border-slate-100 shadow-md shadow-slate-200/50'}`}>
                                                                        <button 
                                                                            type="button" 
                                                                            onClick={() => {
                                                                                const updated = [...newItem.multi_dpps];
                                                                                updated.splice(i, 1);
                                                                                setNewItem({ ...newItem, multi_dpps: updated });
                                                                            }}
                                                                            className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:rotate-90 active:scale-90 transition-all z-10"
                                                                        >
                                                                            <X size={14} strokeWidth={4} />
                                                                        </button>

                                                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                                                            <div className="md:col-span-3">
                                                                                <div className="relative group/thumb aspect-square rounded-[10px] border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center overflow-hidden bg-slate-50 dark:bg-black/20 transition-all hover:border-orange-500/30 cursor-pointer">
                                                                                    <input type="file" accept="image/*" onChange={(e) => {
                                                                                        const file = e.target.files[0];
                                                                                        if (file) {
                                                                                            const updated = [...newItem.multi_dpps];
                                                                                            updated[i].thumbnail = file;
                                                                                            setNewItem({ ...newItem, multi_dpps: updated });
                                                                                        }
                                                                                    }} className="absolute inset-0 opacity-0 z-20 cursor-pointer" />
                                                                                    {item.thumbnail ? (
                                                                                        <>
                                                                                            <img src={URL.createObjectURL(item.thumbnail)} className="w-full h-full object-cover" alt="Thumb" />
                                                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-black uppercase">Change Cover</div>
                                                                                        </>
                                                                                    ) : item.existing_thumb ? (
                                                                                        <>
                                                                                            <img src={item.existing_thumb} className="w-full h-full object-cover" alt="Thumb" />
                                                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-black uppercase">Change Cover</div>
                                                                                        </>
                                                                                    ) : (
                                                                                        <div className="flex flex-col items-center gap-2 opacity-30 group-hover/thumb:opacity-100 group-hover/thumb:text-orange-500 transition-all">
                                                                                            <Upload size={24} />
                                                                                            <span className="text-[8px] font-black uppercase">Cover Image</span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            <div className="md:col-span-9 space-y-4">
                                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                                    <div>
                                                                                        <label className="block text-[8px] font-black uppercase tracking-widest text-orange-500 mb-1">DPP Name *</label>
                                                                                        <input 
                                                                                            type="text"
                                                                                            value={item.name || ''}
                                                                                            onChange={(e) => {
                                                                                                const updated = [...newItem.multi_dpps];
                                                                                                updated[i].name = e.target.value;
                                                                                                setNewItem({ ...newItem, multi_dpps: updated });
                                                                                            }}
                                                                                            placeholder="e.g. Daily Practice Problems - Physics Vol 1"
                                                                                            className={`w-full px-4 py-2.5 rounded-[5px] outline-none border-2 font-bold text-xs transition-all ${isDarkMode ? 'bg-black/20 border-white/5 focus:border-orange-500/50 text-white' : 'bg-white border-slate-100 focus:border-orange-500 text-slate-800 shadow-sm'}`}
                                                                                        />
                                                                                    </div>
                                                                                    <div className="flex flex-col">
                                                                                        <label className="block text-[8px] font-black uppercase tracking-widest text-orange-400 mb-1">Pick PDF File *</label>
                                                                                        <div className="relative group/file">
                                                                                            <input type="file" accept=".pdf" onChange={(e) => {
                                                                                                const file = e.target.files[0];
                                                                                                if (file) {
                                                                                                    const updated = [...newItem.multi_dpps];
                                                                                                    updated[i].file = file;
                                                                                                    if(!updated[i].name) updated[i].name = file.name.replace('.pdf', '').replace(/_/g, ' ');
                                                                                                    setNewItem({ ...newItem, multi_dpps: updated });
                                                                                                }
                                                                                            }} className="absolute inset-0 opacity-0 z-20 cursor-pointer" />
                                                                                            <div className={`px-4 py-2.5 rounded-[5px] border-2 border-dashed flex items-center justify-between transition-all ${item.file ? 'border-orange-500 bg-orange-500/5' : 'border-slate-200 dark:border-white/10'}`}>
                                                                                                <div className="flex items-center gap-3 overflow-hidden">
                                                                                                    <FileText size={16} className={item.file ? 'text-orange-500' : 'opacity-20'} />
                                                                                                    <span className={`text-[10px] font-bold truncate max-w-[120px] ${item.file ? (isDarkMode ? 'text-white' : 'text-slate-800') : 'opacity-30'}`}>
                                                                                                        {item.file ? item.file.name : (item.existing_file ? 'Existing PDF' : 'Select PDF...')}
                                                                                                    </span>
                                                                                                </div>
                                                                                                <div className="flex items-center gap-2">
                                                                                                    {item.existing_file && !item.file && (
                                                                                                        <button 
                                                                                                            type="button"
                                                                                                            onClick={(e) => { e.stopPropagation(); setPreviewData({ url: item.existing_file, type: 'pdf', title: item.name }); }}
                                                                                                            className="px-2 py-0.5 rounded-[3px] bg-blue-500 text-white text-[7px] font-black uppercase hover:bg-blue-600 transition-colors z-30"
                                                                                                        >
                                                                                                            View
                                                                                                        </button>
                                                                                                    )}
                                                                                                    <div className={`px-2 py-0.5 rounded-[3px] text-[7px] font-black uppercase ${item.file ? 'bg-orange-500 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>
                                                                                                        {item.file ? 'Picked' : 'Add'}
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                
                                                                                <div>
                                                                                    <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Brief Description</label>
                                                                                    <textarea 
                                                                                        value={item.description || ''}
                                                                                        onChange={(e) => {
                                                                                            const updated = [...newItem.multi_dpps];
                                                                                            updated[i].description = e.target.value;
                                                                                            setNewItem({ ...newItem, multi_dpps: updated });
                                                                                        }}
                                                                                        className={`w-full px-4 py-2.5 rounded-[5px] outline-none border-2 font-bold text-[10px] transition-all min-h-[50px] resize-none ${isDarkMode ? 'bg-black/20 border-white/5 focus:border-orange-500/50 text-white' : 'bg-white border-slate-100 focus:border-orange-500 text-slate-800 shadow-sm'}`}
                                                                                        placeholder="What's inside this DPP?"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="md:col-span-4">
                                                        <div className="sticky top-4 space-y-4">
                                                            <div>
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-3 ml-1">Question Bank</h4>
                                                                {/* Interactive Questions Toggle Button */}
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => setShowQuestionEditor(!showQuestionEditor)}
                                                                    className={`w-full p-8 rounded-[12px] border-2 border-dashed transition-all active:scale-95 flex flex-col items-center justify-center gap-4 text-center ${showQuestionEditor ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/20' : isDarkMode ? 'border-white/5 bg-[#1a1f2e] hover:border-orange-500/50' : 'bg-white border-slate-100 shadow-md shadow-slate-200/50 hover:border-orange-500'}`}
                                                                >
                                                                    <HelpCircle size={40} className={`text-orange-500 ${showQuestionEditor ? 'animate-none' : 'animate-pulse'}`} />
                                                                    <div className="space-y-2">
                                                                        <p className="text-xs font-black uppercase tracking-widest text-orange-500">Interactive Questions</p>
                                                                        <p className="text-[10px] font-bold opacity-40">{showQuestionEditor ? 'Click to hide Question Bank' : 'Add your questions in the manual entry bank below.'}</p>
                                                                    </div>
                                                                </button>
                                                            </div>

                                                            <div className={`p-4 rounded-[10px] border ${isDarkMode ? 'bg-orange-500/5 border-orange-500/10' : 'bg-orange-50 border-orange-200'} space-y-2`}>
                                                                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-2">
                                                                    <Settings size={14} /> Tip
                                                                </p>
                                                                <p className="text-[9px] font-bold leading-relaxed opacity-70">
                                                                    You can upload multiple practice PDFs and link them to a single interactive question bank. Students can then toggle between the documents and the quiz.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}


                                        {/* Full Width Question Editor (Visible only when teacher clicks the button above) */}
                                        {showQuestionEditor && (
                                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-5 duration-700 bg-white/2 p-6 rounded-[5px] border border-white/5">
                                    <div className="flex flex-col gap-4 mb-6">
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-px bg-orange-500/30"></div>
                                                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">DPP Question Bank Entry</h3>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={handleSaveDraft}
                                                    className={`px-3 py-1.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-90 flex items-center gap-2 ${isDarkMode ? 'bg-orange-500/20 text-orange-500 hover:bg-orange-500/30' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                                                >
                                                    <Save size={14} /> Save Draft
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleLoadDraft}
                                                    className={`px-3 py-1.5 rounded-[5px] border-2 border-dashed text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-90 flex items-center gap-2 ${isDarkMode ? 'border-amber-500/30 text-amber-500 hover:border-amber-500/60' : 'border-amber-500/50 text-amber-600 hover:bg-amber-50'}`}
                                                >
                                                    <Download size={14} /> Load Draft
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleClearDraft}
                                                    className={`p-1.5 rounded-[5px] transition-all active:scale-90 flex items-center justify-center ${isDarkMode ? 'bg-white/5 text-slate-500 hover:bg-red-500 hover:text-white' : 'bg-slate-200 text-slate-500 hover:bg-red-500 hover:text-white'}`}
                                                    title="Clear Draft"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className={`p-4 rounded-[10px] border ${isDarkMode ? 'bg-white/2 border-white/10' : 'bg-slate-50 border-slate-100'} animate-in slide-in-from-left duration-500`}>
                                            <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ml-1 ${isDarkMode ? 'opacity-40' : 'opacity-70 text-slate-500'}`}>Set DPP Collection Name *</label>
                                            <input
                                                required
                                                type="text"
                                                value={newItem.name}
                                                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                                className={`w-full px-5 py-3 rounded-[5px] outline-none border-2 font-black transition-all text-sm ${isDarkMode ? 'bg-black/20 border-white/5 focus:border-orange-500/50 text-white' : 'bg-white border-slate-200 focus:border-orange-500 text-slate-800 shadow-sm'}`}
                                                placeholder="e.g. Daily Practice Problems - Physics Vol 1"
                                            />
                                            <p className="mt-2 text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">This will be the title displayed in the student library</p>
                                        </div>
                                    </div>

                                    {newItem.questions.map((q, qIdx) => (
                                        <div key={q.tempId} className={`p-10 rounded-[10px] border-2 border-dashed ${isDarkMode ? 'bg-white/2 border-white/10' : 'bg-slate-50 border-slate-200'} relative shadow-2xl`}>
                                            <div className="flex flex-wrap items-center justify-between gap-6 mb-8 pb-6 border-b border-dashed border-slate-200/30">
                                                <div className="flex items-center gap-6">
                                                    <h4 className="px-4 py-1.5 bg-orange-500 text-white rounded-[5px] text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-orange-500/20">
                                                        Question #{qIdx + 1}
                                                    </h4>
                                                    <div className="w-[200px]">
                                                        <CustomSelect
                                                            label="Question Type"
                                                            value={q.question_type}
                                                            options={[
                                                                { value: 'SINGLE_CHOICE', label: 'SINGLE_CHOICE' },
                                                                { value: 'MULTI_CHOICE', label: 'MULTI_CHOICE' },
                                                                { value: 'NUMERICAL', label: 'NUMERICAL' },
                                                                { value: 'MATRIX', label: 'MATRIX' },
                                                                { value: 'ASSERTION', label: 'ASSERTION' },
                                                                { value: 'INTEGER_TYPE', label: 'INTEGER_TYPE' },
                                                                { value: 'PARAGRAPH', label: 'PARAGRAPH' },
                                                            ]}
                                                            placeholder="Select Type"
                                                            onChange={(val) => {
                                                                const updated = [...newItem.questions];
                                                                updated[qIdx].question_type = val;
                                                                setNewItem({ ...newItem, questions: updated });
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                {newItem.questions.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeQuestion(qIdx)}
                                                        className="p-2 text-red-500 hover:bg-red-500 hover:text-white rounded-[5px] transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                                    >
                                                        <Trash2 size={16} /> Remove
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-6 mb-8">
                                                <div className="flex-1 space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-xs font-black uppercase tracking-[0.2em]">Enter Question Content</label>
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-[5px] border-2 border-dashed border-amber-500/30 bg-amber-500/5">
                                                                <Clock size={14} className="text-amber-500" />
                                                                <label className="text-[10px] font-black uppercase tracking-widest text-amber-600">Solve Time:</label>
                                                                <input
                                                                    type="number"
                                                                    value={q.solve_time || ''}
                                                                    onChange={(e) => {
                                                                        const updated = [...newItem.questions];
                                                                        updated[qIdx].solve_time = parseInt(e.target.value) || 0;
                                                                        setNewItem({ ...newItem, questions: updated });
                                                                    }}
                                                                    className="w-16 bg-transparent outline-none text-xs font-black text-amber-600 border-b border-amber-500/50 text-center"
                                                                />
                                                                <span className="text-[10px] font-black text-amber-600 opacity-40 uppercase">Sec</span>
                                                            </div>
                                                            <div className="flex gap-1">
                                                                <span className={`px-2 py-1 rounded-[5px] text-[9px] font-black uppercase ${isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>Character: {q.question?.length || 0}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <SmartEditor
                                                        key={`question-${q.tempId}`}
                                                        value={q.question || ''}
                                                        onChange={(val) => {
                                                            const updated = [...newItem.questions];
                                                            updated[qIdx].question = val;
                                                            setNewItem({ ...newItem, questions: updated });
                                                        }}
                                                        placeholder="Enter Question content here..."
                                                        isDarkMode={isDarkMode}
                                                    />
                                                </div>
                                            </div>

                                            {(q.image_1 || q.image_2) && (
                                                <div className="flex flex-wrap gap-4 pt-2">
                                                    {q.image_1 && (
                                                        <div className={`relative group max-w-[240px] rounded-[5px] overflow-hidden border transition-all ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white shadow-lg'}`}>
                                                            <div className="px-3 py-1.5 border-b border-inherit bg-black/5 flex items-center justify-between">
                                                                <span className="text-[8px] font-black uppercase tracking-widest opacity-50">Preview 1</span>
                                                            </div>
                                                            <img src={q.image_1} alt="Preview 1" className="w-full h-auto max-h-40 object-contain p-4" />
                                                        </div>
                                                    )}
                                                    {q.image_2 && (
                                                        <div className={`relative group max-w-[240px] rounded-[5px] overflow-hidden border transition-all ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white shadow-lg'}`}>
                                                            <div className="px-3 py-1.5 border-b border-inherit bg-black/5 flex items-center justify-between">
                                                                <span className="text-[8px] font-black uppercase tracking-widest opacity-50">Preview 2</span>
                                                            </div>
                                                            <img src={q.image_2} alt="Preview 2" className="w-full h-auto max-h-40 object-contain p-4" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Question Image 1 (URL)</label>
                                                    <input
                                                        type="text"
                                                        placeholder="https://example.com/image1.png"
                                                        value={q.image_1 || ''}
                                                        onChange={(e) => {
                                                            const updated = [...newItem.questions];
                                                            updated[qIdx].image_1 = e.target.value;
                                                            setNewItem({ ...newItem, questions: updated });
                                                        }}
                                                        className={`w-full px-6 py-4 rounded-[5px] border font-bold text-xs outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 shadow-sm'}`}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Question Image 2 (URL)</label>
                                                    <input
                                                        type="text"
                                                        placeholder="https://example.com/image2.png"
                                                        value={q.image_2 || ''}
                                                        onChange={(e) => {
                                                            const updated = [...newItem.questions];
                                                            updated[qIdx].image_2 = e.target.value;
                                                            setNewItem({ ...newItem, questions: updated });
                                                        }}
                                                        className={`w-full px-6 py-4 rounded-[5px] border font-bold text-xs outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 shadow-sm'}`}
                                                    />
                                                </div>
                                            </div>

                                            {['NUMERICAL', 'INTEGER_TYPE'].includes(q.question_type) ? (
                                                <div className="space-y-4 mt-8">
                                                    <label className="text-xs font-black uppercase tracking-[0.2em] ml-1">Answer Range</label>
                                                    <div className="flex flex-col md:flex-row gap-6">
                                                        <div className="space-y-1 flex-1">
                                                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">From *</label>
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                placeholder="Min valid value"
                                                                value={q.answerFrom || ''}
                                                                onChange={(e) => {
                                                                    const updated = [...newItem.questions];
                                                                    updated[qIdx].answerFrom = e.target.value;
                                                                    setNewItem({ ...newItem, questions: updated });
                                                                }}
                                                                className={`w-full px-6 py-4 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 shadow-sm'}`}
                                                            />
                                                        </div>
                                                        <div className="space-y-1 flex-1">
                                                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">To *</label>
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                placeholder="Max valid value"
                                                                value={q.answerTo || ''}
                                                                onChange={(e) => {
                                                                    const updated = [...newItem.questions];
                                                                    updated[qIdx].answerTo = e.target.value;
                                                                    setNewItem({ ...newItem, questions: updated });
                                                                }}
                                                                className={`w-full px-6 py-4 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 shadow-sm'}`}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                                                    {q.options.map((opt, optIndex) => (
                                                        <div key={opt.id} className="space-y-3 relative group">
                                                            <div className="flex items-center justify-between px-2">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-8 h-8 rounded-[5px] flex items-center justify-center font-black text-xs ${opt.isCorrect ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                                                        {String.fromCharCode(65 + optIndex)}
                                                                    </div>
                                                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Option {optIndex + 1}</label>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleOption(qIdx, opt.id)}
                                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-[5px] transition-all ${opt.isCorrect ? 'bg-emerald-500/10 text-emerald-500' : isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                                                                >
                                                                    <div className={`w-4 h-4 flex items-center justify-center transition-all border-2 
                                                                            ${q.question_type === 'MULTI_CHOICE' ? 'rounded-[5px]' : 'rounded-full'}
                                                                            ${opt.isCorrect ? 'border-emerald-500 bg-emerald-500' : 'border-current'}`}
                                                                    >
                                                                        {opt.isCorrect && <Check size={10} strokeWidth={4} className="text-white" />}
                                                                    </div>
                                                                    <span className="text-[9px] font-black uppercase tracking-widest">
                                                                        {opt.isCorrect ? (q.question_type === 'MULTI_CHOICE' ? 'Selected' : 'Correct Answer') : 'Mark Correct'}
                                                                    </span>
                                                                </button>
                                                            </div>
                                                            <SmartEditor
                                                                key={`opt-${q.tempId}-${optIndex}`}
                                                                value={opt.content || ''}
                                                                onChange={(val) => {
                                                                    const updated = [...newItem.questions];
                                                                    updated[qIdx].options[optIndex].content = val;
                                                                    setNewItem({ ...newItem, questions: updated });
                                                                }}
                                                                placeholder={`Enter content for Option ${String.fromCharCode(65 + optIndex)}...`}
                                                                isDarkMode={isDarkMode}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="space-y-4 mt-8">
                                                <label className="text-xs font-black uppercase tracking-[0.2em] ml-1">Step-by-step Solution <span className="opacity-40">(Optional)</span></label>
                                                <SmartEditor
                                                    key={`solution-${q.tempId}`}
                                                    value={q.solution || ''}
                                                    onChange={(val) => {
                                                        const updated = [...newItem.questions];
                                                        updated[qIdx].solution = val;
                                                        setNewItem({ ...newItem, questions: updated });
                                                    }}
                                                    placeholder="Explain how to arrive at the correct answer..."
                                                    isDarkMode={isDarkMode}
                                                />
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={addQuestion}
                                        className="w-full py-2 border-4 border-dashed border-orange-500/20 rounded-[10px] text-orange-500 font-black uppercase tracking-[0.2em] text-xs hover:bg-orange-500/5 hover:border-orange-500/50 transition-all flex items-center justify-center gap-4 group shadow-xl"
                                    >
                                        <div className="p-1 rounded-full bg-orange-500 text-white group-hover:scale-110 transition-transform">
                                            <Plus size={24} strokeWidth={4} />
                                        </div>
                                        Add Multi-Question Entry
                                    </button>
                                </div>
                            )}

                        </div>

                        <button
                            type="submit"
                                disabled={isActionLoading}
                                className={`w-full py-3 rounded-[5px] font-black font-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 flex justify-center items-center gap-2 ${isActionLoading ? 'opacity-70 cursor-not-allowed' : (isAddModalOpen ? 'bg-[#E67E22] hover:bg-[#D35400] shadow-[#E67E22]/20 text-white' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 text-white')}`}
                            >
                                {isActionLoading ? <Loader2 className="animate-spin" size={20} /> : (isAddModalOpen ? 'Save to Library' : 'Update Library Record')}
                            </button>
                        </form>
                    </div>
                </div>
                , document.body)}

            {/* View Modal */}
            {isViewModalOpen && selectedItemForView && createPortal(
                <div className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 ${isFullScreen ? 'p-0' : 'p-4'}`}>
                    <div className={`transition-all duration-300 overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col ${isFullScreen ? 'w-full h-full rounded-none' : 'w-full max-w-4xl rounded-[5px] h-[85vh]'}`}>
                        <div className={`grow overflow-hidden flex flex-col relative ${isDarkMode ? 'bg-black/80' : 'bg-slate-900/90'}`}>
                            {/* Minimalism Controls */}
                            <div className="absolute top-6 right-6 z-[10000] flex items-center gap-3">
                                {viewPage === 2 && (
                                    <button
                                        onClick={() => setIsFullScreen(!isFullScreen)}
                                        className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-[5px] transition-all active:scale-90"
                                    >
                                        {isFullScreen ? <Minimize2 size={20} strokeWidth={3} /> : <Maximize2 size={20} strokeWidth={3} />}
                                    </button>
                                )}
                                <button
                                    onClick={() => { setIsViewModalOpen(false); setSelectedItemForView(null); setIsFullScreen(false); }}
                                    className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-[5px] transition-all active:scale-90"
                                >
                                    <X size={24} strokeWidth={3} />
                                </button>
                            </div>

                            {viewPage === 1 ? (
                                <div className="flex flex-col lg:flex-row items-center justify-center h-full p-10 lg:p-16 gap-10 lg:gap-16 overflow-y-auto custom-scrollbar">
                                    <div className="relative group overflow-hidden rounded-[5px] shadow-2xl w-full max-w-[24rem] h-128 border-8 border-white/5 shrink-0 bg-black/40 flex items-center justify-center">
                                        {selectedItemForView.thumbnail ? (
                                            <img
                                                src={selectedItemForView.thumbnail}
                                                alt={selectedItemForView.name}
                                                className="w-full h-full object-contain"
                                            />
                                        ) : selectedItemForView.video_link && getYouTubeThumbnail(selectedItemForView.video_link) ? (
                                            <div className="relative w-full h-full flex items-center justify-center">
                                                <img
                                                    src={getYouTubeThumbnail(selectedItemForView.video_link)}
                                                    alt={selectedItemForView.name}
                                                    className="w-full h-full object-contain"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center text-white shadow-2xl">
                                                    <div className="bg-black/20 backdrop-blur-sm rounded-full p-2">
                                                        <PlayCircle size={80} strokeWidth={1.5} />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (selectedItemForView.video_link || selectedItemForView.video_file) ? (
                                            <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center gap-4 text-[#E67E22]">
                                                <PlayCircle size={100} strokeWidth={1} />
                                                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Video Content</span>
                                            </div>
                                        ) : (
                                            <img
                                                src={'https://via.placeholder.com/100x130?text=NO+IMAGE'}
                                                alt={selectedItemForView.name}
                                                className="w-full h-full object-contain"
                                            />
                                        )}
                                    </div>
                                    <div className="flex flex-col items-center lg:items-start text-center lg:text-left max-w-xl">
                                        <h4 className="text-3xl lg:text-5xl font-black uppercase tracking-tight mb-6 leading-tight text-white">{selectedItemForView.name}</h4>
                                        <p className="text-base font-medium leading-relaxed mb-10 text-white/60">{selectedItemForView.description || "No description available."}</p>
                                        {(selectedItemForView.pdf_file || selectedItemForView.video_link || selectedItemForView.video_file) && (
                                            <button onClick={() => setViewPage(2)} className="px-10 py-5 bg-[#E67E22] hover:bg-[#D35400] text-white rounded-[5px] font-black uppercase tracking-widest shadow-2xl shadow-[#E67E22]/20 transition-all active:scale-95 flex items-center gap-4">
                                                {selectedItemForView.pdf_file ? <FileText size={24} strokeWidth={3} /> : <PlayCircle size={24} strokeWidth={3} />}
                                                <span>{selectedItemForView.pdf_file ? 'Open Reader' : 'Play Video'}</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-full pt-20">
                                    {selectedItemForView.pdf_file ? (
                                        <iframe src={selectedItemForView.pdf_file} className="w-full h-full bg-white" title="PDF Preview" />
                                    ) : selectedItemForView.video_link ? (
                                        <div className="w-full h-full bg-black flex items-center justify-center">
                                            {selectedItemForView.video_link.includes('youtube.com') || selectedItemForView.video_link.includes('youtu.be') ? (
                                                <iframe
                                                    src={getYouTubeEmbedUrl(selectedItemForView.video_link)}
                                                    className="w-full h-full"
                                                    allowFullScreen
                                                    title="Video Player"
                                                />
                                            ) : (
                                                <a href={selectedItemForView.video_link} target="_blank" rel="noopener noreferrer" className="text-[#E67E22] font-bold hover:underline py-10 flex flex-col items-center gap-4">
                                                    <ExternalLink size={48} />
                                                    <span>Open Video in External Tab</span>
                                                </a>
                                            )}
                                        </div>
                                    ) : selectedItemForView.video_file ? (
                                        <video src={selectedItemForView.video_file} className="w-full h-full" controls />
                                    ) : (
                                        <div className="p-20 text-center uppercase font-black text-white/30 tracking-widest">No attachment available</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                , document.body)}
            
            {previewData && createPortal(
                <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setPreviewData(null)} />
                    
                    <div className={`relative w-full h-full max-w-6xl flex flex-col rounded-[20px] overflow-hidden border-2 shadow-2xl animate-in zoom-in-95 duration-500 ${isDarkMode ? 'bg-[#1a1f2e] border-white/10 shadow-black' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                        {/* Header */}
                        <div className={`px-6 py-4 flex items-center justify-between border-b ${isDarkMode ? 'border-white/5 bg-[#10141D]' : 'border-slate-100 bg-slate-50'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-2.5 rounded-[12px] ${previewData.type === 'pdf' ? 'bg-orange-500/10 text-orange-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {previewData.type === 'pdf' ? <FileText size={20} strokeWidth={2.5} /> : <PlayCircle size={20} strokeWidth={2.5} />}
                                </div>
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-widest leading-none mb-1 text-[#E67E22]">{previewData.title || 'Resource Preview'}</h3>
                                    <p className="text-[10px] font-bold opacity-40 uppercase tracking-tighter">{previewData.type === 'pdf' ? 'PDF Document' : 'Video Content'}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setPreviewData(null)}
                                className={`p-2 rounded-full transition-all active:scale-95 ${isDarkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-200 text-slate-800'}`}
                            >
                                <X size={20} strokeWidth={3} />
                            </button>
                        </div>

                        {/* Content Viewer */}
                        <div className="flex-1 bg-black/20 flex items-center justify-center p-4 overflow-hidden">
                            {previewData.type === 'pdf' ? (
                                <iframe 
                                    src={`${previewData.url}#toolbar=0`} 
                                    className="w-full h-full rounded-[10px] border-none shadow-2xl"
                                    title="PDF Preview"
                                />
                            ) : previewData.type === 'video' ? (
                                <video 
                                    controls 
                                    autoPlay 
                                    className="max-w-full max-h-full rounded-[10px] shadow-2xl"
                                    src={previewData.url}
                                />
                            ) : previewData.type === 'link' ? (
                                <iframe 
                                    src={previewData.url.includes('youtube.com') ? previewData.url.replace('watch?v=', 'embed/') : previewData.url}
                                    className="w-full h-full rounded-[10px] border-none shadow-2xl"
                                    allowFullScreen
                                    title="Video Preview"
                                />
                            ) : (
                                <div className="text-center space-y-4">
                                    <AlertCircle size={48} className="mx-auto text-orange-500 opacity-20" />
                                    <p className="text-xs font-black uppercase tracking-widest opacity-40">Preview not available for this type</p>
                                </div>
                            )}
                        </div>

                        {/* Footer / Controls */}
                        <div className={`px-6 py-4 border-t flex items-center justify-between ${isDarkMode ? 'border-white/5 bg-[#10141D]' : 'border-slate-100 bg-slate-50'}`}>
                            <div className="flex items-center gap-2">
                                <Settings size={14} className="opacity-20" />
                                <span className="text-[9px] font-bold opacity-30 uppercase tracking-widest">End-to-End Encrypted Preview</span>
                            </div>
                            <button 
                                onClick={() => window.open(previewData.url, '_blank')}
                                className="flex items-center gap-2 px-5 py-2 rounded-full bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                            >
                                <ExternalLink size={14} strokeWidth={3} />
                                Open in Full Tab
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default LibraryRegistry;
