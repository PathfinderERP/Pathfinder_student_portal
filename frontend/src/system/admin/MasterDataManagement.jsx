import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import {
    Calendar, Layers, GraduationCap, Plus, Search, Target,
    Edit2, Trash2, Filter, Loader2, Database, X, Check, ChevronDown, Clock, BookOpen, RefreshCw,
    Image as ImageIcon, Copy, ExternalLink, CloudUpload, ArrowLeft, AlertTriangle,
    Download, FileSpreadsheet, Upload
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import SectionRegistry from '../sections/SectionRegistry';

const subTabs = [
    { id: 'Section Management', icon: Layers, label: 'Section Management', endpoint: 'sections' },
    { id: 'Subject', icon: BookOpen, label: 'Subject', endpoint: 'subjects' },
    { id: 'Class', icon: GraduationCap, label: 'Class', endpoint: 'classes' },
    { id: 'Chapter', icon: BookOpen, label: 'Chapter', endpoint: 'chapters' },
    { id: 'Topic', icon: BookOpen, label: 'Topic', endpoint: 'topics' },
    { id: 'SubTopic', icon: BookOpen, label: 'SubTopic', endpoint: 'subtopics' },
    { id: 'Session', icon: Calendar, label: 'Session', endpoint: 'sessions' },
    { id: 'Target Exam', icon: Target, label: 'Target Exam', endpoint: 'target-exams' },
    { id: 'Exam Type', icon: Layers, label: 'Exam Type', endpoint: 'exam-types' },
    { id: 'Exam Details', icon: Database, label: 'Exam Details', endpoint: 'exam-details' },
    { id: 'Image', icon: ImageIcon, label: 'Question Images', endpoint: 'questions/images' },
];

const MasterDataManagement = ({ activeSubTab, setActiveSubTab, onBack, onNavigate }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [error, setError] = useState(null);

    // Pagination state
    const [pageNumber, setPageNumber] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [jumpPage, setJumpPage] = useState('');

    // Tab Scrolling Ref and Drag State
    const scrollRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [dragged, setDragged] = useState(false);

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragged(false);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        // Small delay to ensure onClick has time to check the 'dragged' state
        setTimeout(() => setDragged(false), 10);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        if (Math.abs(walk) > 5) {
            setDragged(true);
        }
        if (scrollRef.current) {
            scrollRef.current.scrollLeft = scrollLeft - walk;
        }
    };

    // Filter State
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Filter States
    const [sessionFilter, setSessionFilter] = useState('all');
    const [examTypeFilter, setExamTypeFilter] = useState('all');
    const [classFilter, setClassFilter] = useState('all');
    const [targetFilter, setTargetFilter] = useState('all');
    const [subjectFilter, setSubjectFilter] = useState('all');
    const [topicFilter, setTopicFilter] = useState('all');
    const [chapterFilter, setChapterFilter] = useState('all');
    const [sessionSearch, setSessionSearch] = useState('');
    const [examTypeSearch, setExamTypeSearch] = useState('');
    const [classSearch, setClassSearch] = useState('');
    const [targetSearch, setTargetSearch] = useState('');
    const [subjectSearch, setSubjectSearch] = useState('');
    const [topicSearch, setTopicSearch] = useState('');
    const [chapterSearch, setChapterSearch] = useState('');

    const [isSessionFilterOpen, setIsSessionFilterOpen] = useState(false);
    const [isExamTypeFilterOpen, setIsExamTypeFilterOpen] = useState(false);
    const [isClassFilterOpen, setIsClassFilterOpen] = useState(false);
    const [isTargetFilterOpen, setIsTargetFilterOpen] = useState(false);
    const [isSubjectFilterOpen, setIsSubjectFilterOpen] = useState(false);
    const [isTopicFilterOpen, setIsTopicFilterOpen] = useState(false);
    const [isChapterFilterOpen, setIsChapterFilterOpen] = useState(false);
    const [isModalChapterFilterOpen, setIsModalChapterFilterOpen] = useState(false);
    const [modalChapterSearch, setModalChapterSearch] = useState('');

    const [sessions, setSessions] = useState([]);
    const [examTypes, setExamTypes] = useState([]);
    const [classes, setClasses] = useState([]);
    const [targetExams, setTargetExams] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [topics, setTopics] = useState([]);
    const [chapters, setChapters] = useState([]);
    const [subTopics, setSubTopics] = useState([]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
    const [selectedItem, setSelectedItem] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null, title: '' });
    const [formValues, setFormValues] = useState({
        name: '',
        code: '',
        description: '',
        session: '',
        exam_type: '',
        target_exam: '',
        target_exams: [],
        class_level: '',
        subject: '',
        topic: '',
        sub_topic: '',
        email: '',
        phone: '',
        qualification: '',
        experience: '',
        duration: 180,
        total_marks: 0,
        is_active: true
    });

    // Bulk Import/Export State
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const bulkFileInputRef = useRef(null);

    const lastFetchedTab = useRef(null);
    const masterDataCacheRef = useRef({}); // Cache master data in memory
    const masterDataTimestampRef = useRef(null); // Track cache time
    const MASTER_DATA_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

    const sessionLabel = useMemo(() => {
        if (sessionFilter === 'all') return 'Sessions';
        return sessions.find(s => String(s.id) === String(sessionFilter))?.name || 'Sessions';
    }, [sessionFilter, sessions]);

    const examTypeLabel = useMemo(() => {
        if (examTypeFilter === 'all') return 'Types';
        return examTypes.find(et => String(et.id) === String(examTypeFilter))?.name || 'Types';
    }, [examTypeFilter, examTypes]);

    const classLabel = useMemo(() => {
        if (classFilter === 'all') return 'Classes';
        return classes.find(c => String(c.id) === String(classFilter))?.name || 'Classes';
    }, [classFilter, classes]);

    const targetFilterLabel = useMemo(() => {
        if (targetFilter === 'all') return 'Targets';
        return targetExams.find(t => String(t.id) === String(targetFilter))?.name || 'Targets';
    }, [targetFilter, targetExams]);

    const subjectLabel = useMemo(() => {
        if (subjectFilter === 'all') return 'Subjects';
        return subjects.find(s => String(s.id) === String(subjectFilter))?.name || 'Subjects';
    }, [subjectFilter, subjects]);

    const chapterLabel = useMemo(() => {
        if (chapterFilter === 'all') return 'Chapters';
        return chapters.find(c => String(c.id) === String(chapterFilter))?.name || 'Chapters';
    }, [chapterFilter, chapters]);

    const topicLabel = useMemo(() => {
        if (topicFilter === 'all') return 'Topics';
        return topics.find(t => String(t.id) === String(topicFilter))?.name || 'Topics';
    }, [topicFilter, topics]);

    const filteredTopicsForImage = useMemo(() => {
        if (!topics || topics.length === 0) return [];
        let filtered = [...topics];
        if (formValues.class_level && formValues.class_level !== '') {
            filtered = filtered.filter(t =>
                String(t.class_level || t.class_level_id) === String(formValues.class_level)
            );
        }
        if (formValues.subject && formValues.subject !== '') {
            filtered = filtered.filter(t =>
                String(t.subject || t.subject_id) === String(formValues.subject)
            );
        }
        return filtered;
    }, [topics, formValues.class_level, formValues.subject]);

    // Image Upload State
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const mediaInputRef = useRef(null);

    // Debounced search state
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const debouncedSearchRef = useRef(null);

    // Cascading Filter Options for "Exam Details" subtab
    const availableSessionsForFilter = useMemo(() => {
        if (activeSubTab !== 'Exam Details') return sessions;
        const sessionIds = [...new Set(data.map(d => String(d.session)))];
        return sessions.filter(s => sessionIds.includes(String(s.id)));
    }, [sessions, data, activeSubTab]);

    const availableClassesForFilter = useMemo(() => {
        if (activeSubTab !== 'Exam Details') return classes;
        const classIds = [...new Set(data
            .filter(d => (sessionFilter === 'all' || String(d.session) === String(sessionFilter)))
            .map(d => String(d.class_level)))];
        return classes.filter(c => classIds.includes(String(c.id)));
    }, [classes, data, activeSubTab, sessionFilter]);

    const availableTargetsForFilter = useMemo(() => {
        if (activeSubTab !== 'Exam Details') return targetExams;
        const targetIds = [...new Set(data
            .filter(d => (sessionFilter === 'all' || String(d.session) === String(sessionFilter)) &&
                (classFilter === 'all' || String(d.class_level) === String(classFilter)))
            .map(d => String(d.target_exam)))];
        return targetExams.filter(t => targetIds.includes(String(t.id)));
    }, [targetExams, data, activeSubTab, sessionFilter, classFilter]);

    const availableTypesForFilter = useMemo(() => {
        if (activeSubTab !== 'Exam Details') return examTypes;
        const typeIds = [...new Set(data
            .filter(d => (sessionFilter === 'all' || String(d.session) === String(sessionFilter)) &&
                (classFilter === 'all' || String(d.class_level) === String(classFilter)) &&
                (targetFilter === 'all' || String(d.target_exam) === String(targetFilter)))
            .map(d => String(d.exam_type)))];
        return examTypes.filter(et => typeIds.includes(String(et.id)));
    }, [examTypes, data, activeSubTab, sessionFilter, classFilter, targetFilter]);



    const currentTabConfig = useMemo(() => subTabs.find(t => t.id === activeSubTab), [activeSubTab]);

    const getAuthConfig = useCallback(() => {
        const activeToken = token || localStorage.getItem('auth_token');
        if (!activeToken) return null;
        return { headers: { 'Authorization': `Bearer ${activeToken}` } };
    }, [token]);

    // Function to fetch master data with caching (defined after getAuthConfig)
    const fetchMasterData = useCallback(async (force = false) => {
        const now = Date.now();

        // Return cached data if available and not stale
        if (!force && masterDataCacheRef.current &&
            masterDataTimestampRef.current &&
            (now - masterDataTimestampRef.current) < MASTER_DATA_CACHE_TTL &&
            Object.keys(masterDataCacheRef.current).length > 0) {
            const cached = masterDataCacheRef.current;
            setSessions(cached.sessions || []);
            setExamTypes(cached.examTypes || []);
            setClasses(cached.classes || []);
            setTargetExams(cached.targetExams || []);
            setSubjects(cached.subjects || []);
            setTopics(cached.topics || []);
            setChapters(cached.chapters || []);
            return;
        }

        // Fetch all master data in parallel
        const config = getAuthConfig();
        if (!config) return;

        try {
            const apiUrl = getApiUrl();
            const query = force ? '?refresh=true' : '';
            const [sessRes, typeRes, classRes, targetRes, subRes, topicRes, chapRes] = await Promise.all([
                axios.get(`${apiUrl}/api/master-data/sessions/${query}`, config),
                axios.get(`${apiUrl}/api/master-data/exam-types/${query}`, config),
                axios.get(`${apiUrl}/api/master-data/classes/${query}`, config),
                axios.get(`${apiUrl}/api/master-data/target-exams/${query}`, config),
                axios.get(`${apiUrl}/api/master-data/subjects/${query}`, config),
                axios.get(`${apiUrl}/api/master-data/topics/${query}`, config),
                axios.get(`${apiUrl}/api/master-data/chapters/${query}`, config),
            ]);

            // Cache the data
            masterDataCacheRef.current = {
                sessions: sessRes.data,
                examTypes: typeRes.data,
                classes: classRes.data,
                targetExams: targetRes.data,
                subjects: subRes.data,
                topics: topicRes.data,
                chapters: chapRes.data,
            };
            masterDataTimestampRef.current = now;

            // Update states
            setSessions(sessRes.data);
            setExamTypes(typeRes.data);
            setClasses(classRes.data);
            setTargetExams(targetRes.data);
            setSubjects(subRes.data);
            setTopics(topicRes.data);
            setChapters(chapRes.data);
        } catch (err) {
            console.error('Failed to fetch master data:', err);
        }
    }, [getAuthConfig, getApiUrl]);

    const fetchData = useCallback(async (force = false, topicFilterId = null) => {
        if (!currentTabConfig || activeSubTab === 'Section Management') return;

        // For SubTopic, skip the bulk data fetch - use topic filter instead
        if (activeSubTab === 'SubTopic' && !topicFilterId && !force) {
            // Load master data from cache
            await fetchMasterData();
            setData([]);
            lastFetchedTab.current = activeSubTab;
            return;
        }

        // Only skip if not forced AND we have data AND we're still on the same subtab
        if (!force && data.length > 0 && lastFetchedTab.current === activeSubTab) return;

        const config = getAuthConfig();
        if (!config) return; // Wait for token

        setIsLoading(true);
        setError(null);
        try {
            const apiUrl = getApiUrl();
            const endpoint = activeSubTab === 'Image' ? 'questions/images' : `master-data/${currentTabConfig.endpoint}`;

            // Build parameters for pagination and filtering
            const queryParams = new URLSearchParams();
            if (topicFilterId) queryParams.append('topic', topicFilterId);
            if (force) queryParams.append('refresh', 'true');

            const paramsString = queryParams.toString() ? `?${queryParams.toString()}` : '';
            const response = await axios.get(`${apiUrl}/api/${endpoint}/${paramsString}`, config);
            setData(response.data);
            if (!topicFilterId) lastFetchedTab.current = activeSubTab;

            // Load master data from cache instead of making repeated API calls
            if (activeSubTab === 'Exam Details' || activeSubTab === 'Exam Type' || activeSubTab === 'Topic' || activeSubTab === 'Chapter' || activeSubTab === 'SubTopic' || activeSubTab === 'Image') {
                await fetchMasterData(force);
            }
        } catch (err) {
            console.error(`Failed to fetch ${activeSubTab} data:`, err);
            if (err.response?.status === 401) {
                setError(`Unauthorized access. Please try logging out and back in.`);
            } else {
                setError(`Failed to load ${activeSubTab.toLowerCase()} data.`);
            }
        } finally {
            setIsLoading(false);
        }
    }, [currentTabConfig, getApiUrl, getAuthConfig, activeSubTab, fetchMasterData]);

    // Fetch CSRF token on mount
    useEffect(() => {
        const fetchCSRFToken = async () => {
            try {
                const config = getAuthConfig();
                if (!config) return;

                const apiUrl = getApiUrl();
                await axios.get(`${apiUrl}/api/master-data/sessions/`, config);

                // Configure axios to always include CSRF token
                const getCookie = (name) => {
                    const value = `; ${document.cookie}`;
                    const parts = value.split(`; ${name}=`);
                    if (parts.length === 2) return parts.pop().split(';').shift();
                };

                const csrfToken = getCookie('csrftoken');
                if (csrfToken) {
                    axios.defaults.headers.common['X-CSRFToken'] = csrfToken;
                }
            } catch (err) {
                console.error('Failed to fetch CSRF token:', err);
            }
        };
        fetchCSRFToken();
    }, [getApiUrl, getAuthConfig]);

    // Handle debounced search
    useEffect(() => {
        if (debouncedSearchRef.current) {
            clearTimeout(debouncedSearchRef.current);
        }

        debouncedSearchRef.current = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);

        return () => {
            if (debouncedSearchRef.current) {
                clearTimeout(debouncedSearchRef.current);
            }
        };
    }, [searchTerm]);

    // Pre-load master data on mount for faster tab switching
    useEffect(() => {
        fetchMasterData();
    }, [fetchMasterData]);

    // Reset filters on tab change
    useEffect(() => {
        setSearchTerm('');
        setDebouncedSearch('');
        setPageNumber(1); // Reset to first page
        setStatusFilter('all');
        setSessionFilter('all');
        setExamTypeFilter('all');
        setClassFilter('all');
        setTargetFilter('all');
        setSubjectFilter('all');
        setTopicFilter('all');
        fetchData();
    }, [activeSubTab, fetchData]);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            toast.success("Image Link Copied to Clipboard!");
        });
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        setSelectedFiles(files);

        // Revoke old previews
        previews.forEach(url => URL.revokeObjectURL(url));

        // Create new previews
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setPreviews(newPreviews);
    };

    const performImageUpload = async () => {
        if (selectedFiles.length === 0) {
            toast.error("Please select at least one image.");
            return;
        }

        const config = getAuthConfig();
        if (!config) return;

        setIsActionLoading(true);
        setIsUploadingImage(true);
        const apiUrl = getApiUrl();

        try {
            const uploadedImages = [];
            for (const file of selectedFiles) {
                const formData = new FormData();
                formData.append('image', file);

                if (formValues.class_level) formData.append('class_level', formValues.class_level);
                if (formValues.subject) formData.append('subject', formValues.subject);
                if (formValues.topic) formData.append('topic', formValues.topic);
                if (formValues.exam_type) formData.append('exam_type', formValues.exam_type);
                if (formValues.target_exam) formData.append('target_exam', formValues.target_exam);

                const result = await axios.post(`${apiUrl}/api/questions/images/`, formData, {
                    headers: {
                        ...config.headers,
                        'Content-Type': 'multipart/form-data'
                    }
                });
                uploadedImages.push(result.data);
            }

            // Optimistic: add new images to local state
            setData(prev => [...uploadedImages, ...prev]);

            setIsModalOpen(false);
            setSelectedFiles([]);
            setPreviews([]);
            toast.success(`Successfully uploaded ${selectedFiles.length} image(s)`);
        } catch (err) {
            console.error("Image upload failed", err);
            toast.error("Failed to upload image(s)");
            fetchData(true); // Revert on error
        } finally {
            setIsActionLoading(false);
            setIsUploadingImage(false);
            if (mediaInputRef.current) mediaInputRef.current.value = '';
        }
    };

    const handleCreate = () => {
        setModalMode('create');
        setSelectedItem(null);

        const initialForm = {
            name: '',
            code: '',
            target_exam: '',
            description: '',
            session: sessions[0]?.id || '',
            exam_type: '',
            class_level: classes[0]?.id || '',
            subject: subjects[0]?.id || '',
            sub_topic: '',
            email: '',
            phone: '',
            qualification: '',
            experience: '',
            duration: 180,
            total_marks: 0,
            is_active: true
        };

        if (activeSubTab === 'Image') {
            initialForm.image = null;
            initialForm.class_level = '';
            initialForm.subject = '';
            initialForm.topic = '';
        }

        setFormValues(initialForm);
        setSelectedFiles([]);
        setPreviews([]);
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setModalMode('edit');
        setSelectedItem(item);
        if (activeSubTab === 'Exam Details') {
            setFormValues({
                name: item.name || '',
                code: item.code || '',
                session: item.session,
                target_exam: item.target_exam || '',
                exam_type: item.exam_type,
                class_level: item.class_level,
                duration: item.duration,
                total_marks: item.total_marks || 0,
                is_active: item.is_active
            });
        } else if (activeSubTab === 'Chapter') {
            setFormValues({
                name: item.name || '',
                code: item.code || '',
                class_level: item.class_level,
                subject: item.subject,
                order: item.order || 1,
                is_active: item.is_active
            });
        } else if (activeSubTab === 'SubTopic') {
            setFormValues({
                name: item.name || '',
                code: item.code || '',
                topic: item.topic,
                order: item.order || 1,
                is_active: item.is_active
            });
        } else if (activeSubTab === 'Topic') {
            setFormValues({
                name: item.name || '',
                sub_topic: item.sub_topic || '',
                code: item.code || '',
                class_level: item.class_level,
                subject: item.subject,
                chapter: item.chapter || '',
                is_active: item.is_active
            });
        } else if (activeSubTab === 'Image') {
            setFormValues({
                class_level: item.class_level || '',
                subject: item.subject || '',
                topic: item.topic || '',
                is_active: true
            });
        } else {
            setFormValues({
                name: item.name,
                code: item.code,
                target_exams: item.target_exams || [],
                target_exam: item.target_exam || '',
                description: item.description || '',
                is_active: item.is_active
            });
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        setConfirmDialog({
            isOpen: true,
            id,
            title: `Are you sure you want to delete this ${activeSubTab.toLowerCase()}?`
        });
    };

    const confirmDelete = async () => {
        const id = confirmDialog.id;
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const config = getAuthConfig();

            // Get CSRF token from cookie
            const getCookie = (name) => {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) return parts.pop().split(';').shift();
            };

            const csrfToken = getCookie('csrftoken');
            if (csrfToken) {
                config.headers['X-CSRFToken'] = csrfToken;
            }

            // Optimistic delete: remove from local state immediately
            setData(prev => prev.filter(item => (item.id !== id && item._id !== id)));

            // Use correct endpoint based on active tab
            const endpoint = activeSubTab === 'Image'
                ? `questions/images/${id}`
                : `master-data/${currentTabConfig.endpoint}/${id}`;

            await axios.delete(`${apiUrl}/api/${endpoint}/`, config);
            toast.success('Item deleted successfully!');
        } catch (err) {
            console.error('Delete failed:', err);
            toast.error('Failed to delete item');
            fetchData(true); // Revert on error
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleToggleStatus = async (item) => {
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();

            // Optimistic update: toggle in local state
            setData(prev => prev.map(d => d.id === item.id ? { ...d, is_active: !d.is_active } : d));

            await axios.patch(`${apiUrl}/api/master-data/${currentTabConfig.endpoint}/${item.id}/`,
                { is_active: !item.is_active },
                getAuthConfig()
            );
            toast.success('Status updated successfully');
        } catch (err) {
            toast.error('Failed to toggle status');
            fetchData(true); // Revert on error
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleAddToLibrary = (item) => {
        sessionStorage.setItem('library_prefill', JSON.stringify({
            name: item.name,
            class_level: item.class_level,
            subject: item.subject,
            chapter: item.id
        }));
        if (onNavigate) {
            onNavigate('Library');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (activeSubTab === 'Image' && modalMode === 'create') {
            await performImageUpload();
            return;
        }

        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            if (modalMode === 'create') {
                const result = await axios.post(`${apiUrl}/api/master-data/${currentTabConfig.endpoint}/`, formValues, getAuthConfig());
                // Optimistic: add to local state
                setData(prev => [result.data, ...prev]);
            } else {
                const endpoint = activeSubTab === 'Image' ? `questions/images/${selectedItem.id}` : `master-data/${currentTabConfig.endpoint}/${selectedItem.id}`;
                const result = await axios.patch(`${apiUrl}/api/${endpoint}/`, formValues, getAuthConfig());
                // Optimistic: update in local state
                setData(prev => prev.map(d => d.id === selectedItem.id ? result.data : d));
            }
            setIsModalOpen(false);
            toast.success(`${modalMode === 'create' ? 'Created' : 'Updated'} successfully!`);

            // Clear cache and refetch to reflect changes everywhere
            masterDataCacheRef.current = {};
            fetchData(true);

            // Automatically navigate to Library for newly created Chapters
            if (modalMode === 'create' && activeSubTab === 'Chapter' && result.data) {
                handleAddToLibrary(result.data);
            }
        } catch (err) {
            toast.error(`Failed to ${modalMode} item: ` + (err.response?.data?.code || err.message));
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/master-data/${currentTabConfig.endpoint}/export/`, {
                headers: getAuthConfig().headers,
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${activeSubTab.toLowerCase()}s_export.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("CSV Exported successfully!");
        } catch (err) {
            toast.error("Export failed");
        }
    };

    const handleBulkImport = async () => {
        if (!importFile) return;
        setIsImporting(true);
        const formData = new FormData();
        formData.append('file', importFile);
        try {
            const apiUrl = getApiUrl();
            const config = getAuthConfig();
            const res = await axios.post(`${apiUrl}/api/master-data/${currentTabConfig.endpoint}/bulk-upload/`, formData, {
                headers: { ...config.headers, 'Content-Type': 'multipart/form-data' }
            });
            
            if (res.data.errors && res.data.errors.length > 0) {
                toast.success(`Imported with ${res.data.errors.length} errors. Check console.`);
                console.warn("Import Errors:", res.data.errors);
            } else {
                toast.success(res.data.message || "Import successful!");
            }
            
            setShowBulkModal(false);
            setImportFile(null);
            fetchData(true);
        } catch (err) {
            toast.error(err.response?.data?.error || "Import failed");
        } finally {
            setIsImporting(false);
        }
    };

    const filteredData = useMemo(() => {
        return data.filter(item => {
            if (activeSubTab === 'Exam Details') {
                const matchesSearch = item.session_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                    item.exam_type_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                    item.class_level_name?.toLowerCase().includes(debouncedSearch.toLowerCase());

                let matchesStatus = true;
                if (statusFilter === 'active') matchesStatus = item.is_active === true;
                if (statusFilter === 'inactive') matchesStatus = item.is_active === false;

                const matchesSession = sessionFilter === 'all' || String(item.session) === String(sessionFilter);
                const matchesExamType = examTypeFilter === 'all' || String(item.exam_type) === String(examTypeFilter);
                const matchesClass = classFilter === 'all' || String(item.class_level) === String(classFilter);
                const matchesTarget = targetFilter === 'all' || String(item.target_exam) === String(targetFilter);

                return matchesSearch && matchesStatus && matchesSession && matchesExamType && matchesClass && matchesTarget;
            }

            if (activeSubTab === 'Chapter') {
                const matchesSearch = (item.name?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
                    (item.subject_name?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
                    (item.class_level_name?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
                    (item.code?.toLowerCase() || '').includes(debouncedSearch.toLowerCase());

                let matchesStatus = true;
                if (statusFilter === 'active') matchesStatus = item.is_active === true;
                if (statusFilter === 'inactive') matchesStatus = item.is_active === false;

                const matchesClass = classFilter === 'all' || String(item.class_level) === String(classFilter);
                const matchesSubject = subjectFilter === 'all' || String(item.subject) === String(subjectFilter);

                return matchesSearch && matchesStatus && matchesClass && matchesSubject;
            }

            if (activeSubTab === 'SubTopic') {
                const matchesSearch = (item.name?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
                    (item.topic_name?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
                    (item.code?.toLowerCase() || '').includes(debouncedSearch.toLowerCase());

                let matchesStatus = true;
                if (statusFilter === 'active') matchesStatus = item.is_active === true;
                if (statusFilter === 'inactive') matchesStatus = item.is_active === false;

                const matchesTopic = topicFilter === 'all' || String(item.topic) === String(topicFilter);

                return matchesSearch && matchesStatus && matchesTopic;
            }

            if (activeSubTab === 'Topic') {
                const matchesSearch = item.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                    item.subject_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                    item.chapter_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                    item.class_level_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                    item.code?.toLowerCase().includes(debouncedSearch.toLowerCase());

                let matchesStatus = true;
                if (statusFilter === 'active') matchesStatus = item.is_active === true;
                if (statusFilter === 'inactive') matchesStatus = item.is_active === false;

                const matchesClass = classFilter === 'all' || String(item.class_level) === String(classFilter);
                const matchesSubject = subjectFilter === 'all' || String(item.subject) === String(subjectFilter);
                const matchesChapter = chapterFilter === 'all' || String(item.chapter) === String(chapterFilter);

                return matchesSearch && matchesStatus && matchesClass && matchesSubject && matchesChapter;
            }

            if (activeSubTab === 'Image') {
                const matchesSearch = (item.topic_name?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
                    (item.subject_name?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
                    (item.image?.toLowerCase() || '').includes(debouncedSearch.toLowerCase());

                const matchesClass = classFilter === 'all' || String(item.class_level) === String(classFilter);
                const matchesSubject = subjectFilter === 'all' || String(item.subject) === String(subjectFilter);
                const matchesTopic = topicFilter === 'all' || String(item.topic) === String(topicFilter);
                const matchesExamType = examTypeFilter === 'all' || String(item.exam_type) === String(examTypeFilter);
                const matchesTarget = targetFilter === 'all' || String(item.target_exam) === String(targetFilter);

                return matchesSearch && matchesClass && matchesSubject && matchesTopic && matchesExamType && matchesTarget;
            }

            const matchesSearch = (item.name?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
                (item.code?.toLowerCase() || '').includes(debouncedSearch.toLowerCase());

            let matchesStatus = true;
            if (statusFilter === 'active') matchesStatus = item.is_active === true;
            if (statusFilter === 'inactive') matchesStatus = item.is_active === false;

            return matchesSearch && matchesStatus;
        });
    }, [data, debouncedSearch, statusFilter, activeSubTab, sessionFilter, classFilter, targetFilter, topicFilter, subjectFilter, examTypeFilter, chapterFilter]);

    const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
    const paginatedData = useMemo(() => {
        const start = (pageNumber - 1) * rowsPerPage;
        return filteredData.slice(start, start + rowsPerPage);
    }, [filteredData, pageNumber, rowsPerPage]);

    const handleJumpPage = (e) => {
        e.preventDefault();
        const page = parseInt(jumpPage);
        if (page >= 1 && page <= totalPages) {
            setPageNumber(page);
        }
        setJumpPage('');
    };

    const renderHeader = () => (
        <div className={`p-6 rounded-[5px] border shadow-xl mb-6 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className={`p-3 rounded-[5px] border transition-all ${isDarkMode ? 'border-white/10 hover:bg-white/5 text-slate-400 hover:text-white' : 'border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700'}`}
                            title="Go Back"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div>
                        <h2 className="text-3xl font-black tracking-tight mb-2 uppercase text-center md:text-left">
                            Master <span className="text-orange-500">Data</span>
                        </h2>
                        <p className={`text-sm font-medium text-center md:text-left ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Configure system-wide parameters and categories.
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-center md:justify-start">
                    <div
                        ref={scrollRef}
                        onMouseDown={handleMouseDown}
                        onMouseLeave={handleMouseLeave}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                        className={`flex items-center gap-1 p-1 rounded-[5px] border overflow-x-auto custom-scrollbar max-w-full cursor-grab active:cursor-grabbing select-none ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}
                    >
                        {subTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={(e) => {
                                    if (!dragged) {
                                        setActiveSubTab(tab.id);
                                    }
                                }}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-[5px] text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === tab.id
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-105'
                                    : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-white'
                                    }`}
                            >
                                <tab.icon size={12} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderImageGallery = () => {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredData.map((img) => (
                    <div key={img.id || img._id} className={`group relative rounded-[5px] border overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                        <div className="aspect-square relative overflow-hidden bg-slate-900/5">
                            <img
                                src={img.image}
                                alt="Gallery item"
                                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                    onClick={() => copyToClipboard(img.image)}
                                    className="p-2.5 bg-white text-slate-900 rounded-[5px] hover:scale-110 active:scale-95 transition-all shadow-xl"
                                    title="Copy Excel Link"
                                >
                                    <Copy size={18} />
                                </button>
                                <a
                                    href={img.image}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2.5 bg-orange-600 text-white rounded-[5px] hover:scale-110 active:scale-95 transition-all shadow-xl"
                                    title="View Full Image"
                                >
                                    <ExternalLink size={18} />
                                </a>
                                <button
                                    onClick={() => handleDelete(img.id || img._id)}
                                    className="p-2.5 bg-red-600 text-white rounded-[5px] hover:scale-110 active:scale-95 transition-all shadow-xl"
                                    title="Delete Image"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="p-4 space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest truncate max-w-[120px]">
                                    {img.subject_name || 'Unclassified'}
                                </span>
                                <span className="text-[9px] font-bold opacity-30 truncate">
                                    {new Date(img.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <p className={`text-[11px] font-bold truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                {img.topic_name || (img.image?.split('/').pop())}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderContent = () => {
        if (activeSubTab === 'Section Management') {
            return <SectionRegistry />;
        }

        if (activeSubTab === 'Image') {
            return (
                <div className={`p-8 rounded-[5px] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                    <div className="flex flex-col xl:flex-row justify-between items-center gap-3 mb-8">
                        <div className="relative w-full xl:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder={`Search Images...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full pl-12 pr-4 py-3.5 rounded-[5px] border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                            <input
                                type="file"
                                ref={mediaInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                multiple
                                accept="image/*"
                            />

                            {/* Class Filter */}
                            <div className="relative min-w-[120px]">
                                <button
                                    onClick={() => setIsClassFilterOpen(!isClassFilterOpen)}
                                    className={`w-full px-3 py-2.5 rounded-[5px] border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center justify-between gap-2 ${classFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                >
                                    <span className="truncate">{classLabel}</span>
                                    <ChevronDown size={14} className={`transition-transform ${isClassFilterOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isClassFilterOpen && (
                                    <>
                                        <div className="fixed inset-0 z-90" onClick={() => { setIsClassFilterOpen(false); setClassSearch(''); }} />
                                        <div className={`absolute top-full left-0 right-0 mt-2 z-100 rounded-[5px] border shadow-2xl overflow-hidden py-2 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                            <div className="px-2 pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                                                <div className="relative">
                                                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search classes..."
                                                        value={classSearch}
                                                        onChange={(e) => setClassSearch(e.target.value)}
                                                        className={`w-full pl-7 pr-2 py-1.5 rounded-[3px] text-[10px] outline-none ${isDarkMode ? 'bg-white/5 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-800 placeholder:text-slate-400'}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                <div
                                                    onClick={() => { setClassFilter('all'); setIsClassFilterOpen(false); setClassSearch(''); }}
                                                    className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex justify-between items-center ${classFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-50 text-slate-600'}`}
                                                >
                                                    All Classes {classFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                                </div>
                                                {classes.filter(c => c.name.toLowerCase().includes(classSearch.toLowerCase())).map(c => (
                                                    <div
                                                        key={c.id || c._id}
                                                        onClick={() => { setClassFilter(c.id || c._id); setIsClassFilterOpen(false); setClassSearch(''); }}
                                                        className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex justify-between items-center ${String(classFilter) === String(c.id || c._id) ? 'bg-orange-500 text-white' : isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-50 text-slate-600'}`}
                                                    >
                                                        {c.name} {String(classFilter) === String(c.id || c._id) && <Check size={14} strokeWidth={3} />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Subject Filter */}
                            <div className="relative min-w-[120px]">
                                <button
                                    onClick={() => setIsSubjectFilterOpen(!isSubjectFilterOpen)}
                                    className={`w-full px-3 py-2.5 rounded-[5px] border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center justify-between gap-2 ${subjectFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                >
                                    <span className="truncate">{subjectLabel}</span>
                                    <ChevronDown size={14} className={`transition-transform ${isSubjectFilterOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isSubjectFilterOpen && (
                                    <>
                                        <div className="fixed inset-0 z-90" onClick={() => { setIsSubjectFilterOpen(false); setSubjectSearch(''); }} />
                                        <div className={`absolute top-full left-0 right-0 mt-2 z-100 rounded-[5px] border shadow-2xl overflow-hidden py-2 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                            <div className="px-2 pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                                                <div className="relative">
                                                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search subjects..."
                                                        value={subjectSearch}
                                                        onChange={(e) => setSubjectSearch(e.target.value)}
                                                        className={`w-full pl-7 pr-2 py-1.5 rounded-[3px] text-[10px] outline-none ${isDarkMode ? 'bg-white/5 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-800 placeholder:text-slate-400'}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                <div
                                                    onClick={() => { setSubjectFilter('all'); setIsSubjectFilterOpen(false); setSubjectSearch(''); }}
                                                    className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex justify-between items-center ${subjectFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-50 text-slate-600'}`}
                                                >
                                                    All Subjects {subjectFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                                </div>
                                                {subjects.filter(s => s.name.toLowerCase().includes(subjectSearch.toLowerCase())).map(s => (
                                                    <div
                                                        key={s.id || s._id}
                                                        onClick={() => { setSubjectFilter(s.id || s._id); setIsSubjectFilterOpen(false); setSubjectSearch(''); }}
                                                        className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex justify-between items-center ${String(subjectFilter) === String(s.id || s._id) ? 'bg-orange-500 text-white' : isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-50 text-slate-600'}`}
                                                    >
                                                        {s.name} {String(subjectFilter) === String(s.id || s._id) && <Check size={14} strokeWidth={3} />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Topic Filter */}
                            <div className="relative min-w-[120px]">
                                <button
                                    onClick={() => setIsTopicFilterOpen(!isTopicFilterOpen)}
                                    className={`w-full px-3 py-2.5 rounded-[5px] border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center justify-between gap-2 ${topicFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                >
                                    <span className="truncate">{topicLabel}</span>
                                    <ChevronDown size={14} className={`transition-transform ${isTopicFilterOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isTopicFilterOpen && (
                                    <>
                                        <div className="fixed inset-0 z-90" onClick={() => { setIsTopicFilterOpen(false); setTopicSearch(''); }} />
                                        <div className={`absolute top-full left-0 right-0 mt-2 z-100 rounded-[5px] border shadow-2xl overflow-hidden py-2 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                            <div className="px-2 pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                                                <div className="relative">
                                                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search topics..."
                                                        value={topicSearch}
                                                        onChange={(e) => setTopicSearch(e.target.value)}
                                                        className={`w-full pl-7 pr-2 py-1.5 rounded-[3px] text-[10px] outline-none ${isDarkMode ? 'bg-white/5 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-800 placeholder:text-slate-400'}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                <div
                                                    onClick={() => { setTopicFilter('all'); setIsTopicFilterOpen(false); setTopicSearch(''); }}
                                                    className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex justify-between items-center ${topicFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-50 text-slate-600'}`}
                                                >
                                                    All Topics {topicFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                                </div>
                                                {topics.filter(t => 
                                                    (classFilter === 'all' || String(t.class_level || t.class_level_id) === String(classFilter)) && 
                                                    (subjectFilter === 'all' || String(t.subject || t.subject_id) === String(subjectFilter)) &&
                                                    (t.name.toLowerCase().includes(topicSearch.toLowerCase()))
                                                ).map(t => (
                                                    <div
                                                        key={t.id || t._id}
                                                        onClick={() => { setTopicFilter(t.id || t._id); setIsTopicFilterOpen(false); setTopicSearch(''); }}
                                                        className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex justify-between items-center ${String(topicFilter) === String(t.id || t._id) ? 'bg-orange-500 text-white' : isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-50 text-slate-600'}`}
                                                    >
                                                        {t.name} {String(topicFilter) === String(t.id || t._id) && <Check size={14} strokeWidth={3} />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Exam Type Filter */}
                            <div className="relative min-w-[120px]">
                                <button
                                    onClick={() => setIsExamTypeFilterOpen(!isExamTypeFilterOpen)}
                                    className={`w-full px-3 py-2.5 rounded-[5px] border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center justify-between gap-2 ${examTypeFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                >
                                    <span className="truncate">{examTypeLabel}</span>
                                    <ChevronDown size={14} className={`transition-transform ${isExamTypeFilterOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isExamTypeFilterOpen && (
                                    <>
                                        <div className="fixed inset-0 z-90" onClick={() => { setIsExamTypeFilterOpen(false); setExamTypeSearch(''); }} />
                                        <div className={`absolute top-full left-0 right-0 mt-2 z-100 rounded-[5px] border shadow-2xl overflow-hidden py-2 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                            <div className="px-2 pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                                                <div className="relative">
                                                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search types..."
                                                        value={examTypeSearch}
                                                        onChange={(e) => setExamTypeSearch(e.target.value)}
                                                        className={`w-full pl-7 pr-2 py-1.5 rounded-[3px] text-[10px] outline-none ${isDarkMode ? 'bg-white/5 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-800 placeholder:text-slate-400'}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                <div
                                                    onClick={() => { setExamTypeFilter('all'); setIsExamTypeFilterOpen(false); setExamTypeSearch(''); }}
                                                    className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex justify-between items-center ${examTypeFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-50 text-slate-600'}`}
                                                >
                                                    All Types {examTypeFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                                </div>
                                                {examTypes.filter(et => et.name.toLowerCase().includes(examTypeSearch.toLowerCase())).map(et => (
                                                    <div
                                                        key={et.id || et._id}
                                                        onClick={() => { setExamTypeFilter(et.id || et._id); setIsExamTypeFilterOpen(false); setExamTypeSearch(''); }}
                                                        className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex justify-between items-center ${String(examTypeFilter) === String(et.id || et._id) ? 'bg-orange-500 text-white' : isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-50 text-slate-600'}`}
                                                    >
                                                        {et.name} {String(examTypeFilter) === String(et.id || et._id) && <Check size={14} strokeWidth={3} />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Target Filter */}
                            <div className="relative min-w-[120px]">
                                <button
                                    onClick={() => setIsTargetFilterOpen(!isTargetFilterOpen)}
                                    className={`w-full px-3 py-2.5 rounded-[5px] border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center justify-between gap-2 ${targetFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                >
                                    <span className="truncate">{targetFilterLabel}</span>
                                    <ChevronDown size={14} className={`transition-transform ${isTargetFilterOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isTargetFilterOpen && (
                                    <>
                                        <div className="fixed inset-0 z-90" onClick={() => { setIsTargetFilterOpen(false); setTargetSearch(''); }} />
                                        <div className={`absolute top-full left-0 right-0 mt-2 z-100 rounded-[5px] border shadow-2xl overflow-hidden py-2 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                            <div className="px-2 pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                                                <div className="relative">
                                                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search targets..."
                                                        value={targetSearch}
                                                        onChange={(e) => setTargetSearch(e.target.value)}
                                                        className={`w-full pl-7 pr-2 py-1.5 rounded-[3px] text-[10px] outline-none ${isDarkMode ? 'bg-white/5 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-800 placeholder:text-slate-400'}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                <div
                                                    onClick={() => { setTargetFilter('all'); setIsTargetFilterOpen(false); setTargetSearch(''); }}
                                                    className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex justify-between items-center ${targetFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-50 text-slate-600'}`}
                                                >
                                                    All Targets {targetFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                                </div>
                                                {targetExams.filter(te => te.name.toLowerCase().includes(targetSearch.toLowerCase())).map(te => (
                                                    <div
                                                        key={te.id || te._id}
                                                        onClick={() => { setTargetFilter(te.id || te._id); setIsTargetFilterOpen(false); setTargetSearch(''); }}
                                                        className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex justify-between items-center ${String(targetFilter) === String(te.id || te._id) ? 'bg-orange-500 text-white' : isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-50 text-slate-600'}`}
                                                    >
                                                        {te.name} {String(targetFilter) === String(te.id || te._id) && <Check size={14} strokeWidth={3} />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <button
                                onClick={handleCreate}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-[5px] font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-orange-600/30 active:scale-95 ml-auto"
                            >
                                <CloudUpload size={16} strokeWidth={3} />
                                Upload To Gallery
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="py-24 flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                            <p className="text-sm font-bold opacity-40 uppercase tracking-[0.2em]">Loading Gallery...</p>
                        </div>
                    ) : filteredData.length > 0 ? (
                        renderImageGallery()
                    ) : (
                        <div className="py-24 flex flex-col items-center justify-center space-y-4 opacity-20">
                            <ImageIcon size={64} />
                            <p className="font-black uppercase tracking-[0.2em] text-sm">Media Gallery is Empty</p>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className={`p-6 rounded-[5px] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                <div className="flex flex-col xl:flex-row justify-between items-center gap-3 mb-6">
                    <div className="relative w-full xl:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder={`Search ${activeSubTab}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-12 pr-4 py-3.5 rounded-[5px] border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                                }`}
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full xl:w-auto">
                        {(activeSubTab === 'Exam Details' || activeSubTab === 'Chapter' || activeSubTab === 'Topic' || activeSubTab === 'SubTopic') && (
                            <>
                                {activeSubTab === 'Exam Details' && (
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsSessionFilterOpen(!isSessionFilterOpen)}
                                            className={`pl-3 pr-7 py-2.5 rounded-[5px] border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center gap-2 ${sessionFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                        >
                                            {sessionLabel}
                                            <ChevronDown size={14} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-transform ${isSessionFilterOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isSessionFilterOpen && (
                                            <>
                                                <div className="fixed inset-0 z-140" onClick={() => { setIsSessionFilterOpen(false); setSessionSearch(''); }} />
                                                <div className={`absolute left-0 top-full mt-2 w-48 z-150 p-2 rounded-[5px] border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                                    <div className="px-2 pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                                                        <div className="relative">
                                                            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                            <input
                                                                type="text"
                                                                placeholder="Search sessions..."
                                                                value={sessionSearch}
                                                                onChange={(e) => setSessionSearch(e.target.value)}
                                                                className={`w-full pl-7 pr-2 py-1.5 rounded-[3px] text-[10px] outline-none ${isDarkMode ? 'bg-white/5 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-800 placeholder:text-slate-400'}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                        <button
                                                            onClick={() => { setSessionFilter('all'); setClassFilter('all'); setTargetFilter('all'); setExamTypeFilter('all'); setIsSessionFilterOpen(false); setSessionSearch(''); }}
                                                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all ${sessionFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                        >
                                                            All Sessions {sessionFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                                        </button>
                                                        {availableSessionsForFilter.filter(s => s.name.toLowerCase().includes(sessionSearch.toLowerCase())).map(s => (
                                                            <button
                                                                key={s.id}
                                                                onClick={() => { setSessionFilter(s.id); setClassFilter('all'); setTargetFilter('all'); setExamTypeFilter('all'); setIsSessionFilterOpen(false); setSessionSearch(''); }}
                                                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all ${String(sessionFilter) === String(s.id) ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                            >
                                                                {s.name} {String(sessionFilter) === String(s.id) && <Check size={14} strokeWidth={3} />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Class Dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => setIsClassFilterOpen(!isClassFilterOpen)}
                                        className={`pl-3 pr-7 py-2.5 rounded-[5px] border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center gap-2 ${classFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                    >
                                        {classLabel}
                                        <ChevronDown size={14} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-transform ${isClassFilterOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isClassFilterOpen && (
                                        <>
                                            <div className="fixed inset-0 z-140" onClick={() => { setIsClassFilterOpen(false); setClassSearch(''); }} />
                                            <div className={`absolute left-0 top-full mt-2 w-48 z-150 p-2 rounded-[5px] border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                                <div className="px-2 pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                                                    <div className="relative">
                                                        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input
                                                            type="text"
                                                            placeholder="Search classes..."
                                                            value={classSearch}
                                                            onChange={(e) => setClassSearch(e.target.value)}
                                                            className={`w-full pl-7 pr-2 py-1.5 rounded-[3px] text-[10px] outline-none ${isDarkMode ? 'bg-white/5 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-800 placeholder:text-slate-400'}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                    <button
                                                        onClick={() => { setClassFilter('all'); setTargetFilter('all'); setExamTypeFilter('all'); setIsClassFilterOpen(false); setClassSearch(''); }}
                                                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all ${classFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                    >
                                                        All Classes {classFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                                    </button>
                                                    {(activeSubTab === 'Exam Details' ? availableClassesForFilter : classes).filter(c => c.name.toLowerCase().includes(classSearch.toLowerCase())).map(c => (
                                                        <button
                                                            key={c.id}
                                                            onClick={() => { setClassFilter(c.id); setTargetFilter('all'); setExamTypeFilter('all'); setIsClassFilterOpen(false); setClassSearch(''); }}
                                                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all ${String(classFilter) === String(c.id) ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                        >
                                                            {c.name} {String(classFilter) === String(c.id) && <Check size={14} strokeWidth={3} />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {(activeSubTab === 'Exam Details' || activeSubTab === 'Chapter' || activeSubTab === 'Topic') && (
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsSubjectFilterOpen(!isSubjectFilterOpen)}
                                            className={`pl-3 pr-7 py-2.5 rounded-[5px] border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center gap-2 ${subjectFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                        >
                                            {subjectLabel}
                                            <ChevronDown size={14} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-transform ${isSubjectFilterOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isSubjectFilterOpen && (
                                            <>
                                                <div className="fixed inset-0 z-140" onClick={() => { setIsSubjectFilterOpen(false); setSubjectSearch(''); }} />
                                                <div className={`absolute left-0 top-full mt-2 w-48 z-150 p-2 rounded-[5px] border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                                    <div className="px-2 pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                                                        <div className="relative">
                                                            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                            <input
                                                                type="text"
                                                                placeholder="Search subjects..."
                                                                value={subjectSearch}
                                                                onChange={(e) => setSubjectSearch(e.target.value)}
                                                                className={`w-full pl-7 pr-2 py-1.5 rounded-[3px] text-[10px] outline-none ${isDarkMode ? 'bg-white/5 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-800 placeholder:text-slate-400'}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                        <button
                                                            onClick={() => { setSubjectFilter('all'); setIsSubjectFilterOpen(false); setSubjectSearch(''); }}
                                                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all ${subjectFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                        >
                                                            All Subjects {subjectFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                                        </button>
                                                        {subjects.filter(s => s.name.toLowerCase().includes(subjectSearch.toLowerCase())).map(s => (
                                                            <button
                                                                key={s.id || s._id}
                                                                onClick={() => { setSubjectFilter(s.id || s._id); setIsSubjectFilterOpen(false); setSubjectSearch(''); }}
                                                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all ${String(subjectFilter) === String(s.id || s._id) ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                            >
                                                                {s.name} {String(subjectFilter) === String(s.id || s._id) && <Check size={14} strokeWidth={3} />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {activeSubTab === 'Topic' && (
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsChapterFilterOpen(!isChapterFilterOpen)}
                                            className={`pl-3 pr-7 py-2.5 rounded-[5px] border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center gap-2 ${chapterFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                        >
                                            {chapterLabel}
                                            <ChevronDown size={14} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-transform ${isChapterFilterOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isChapterFilterOpen && (
                                            <>
                                                <div className="fixed inset-0 z-140" onClick={() => { setIsChapterFilterOpen(false); setChapterSearch(''); }} />
                                                <div className={`absolute left-0 top-full mt-2 w-56 z-150 p-2 rounded-[5px] border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                                    <div className="px-2 pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                                                        <div className="relative">
                                                            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                            <input
                                                                type="text"
                                                                placeholder="Search chapters..."
                                                                value={chapterSearch}
                                                                onChange={(e) => setChapterSearch(e.target.value)}
                                                                className={`w-full pl-7 pr-2 py-1.5 rounded-[3px] text-[10px] outline-none ${isDarkMode ? 'bg-white/5 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-800 placeholder:text-slate-400'}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                        <button
                                                            onClick={() => { setChapterFilter('all'); setIsChapterFilterOpen(false); setChapterSearch(''); }}
                                                            className={`w-full flex items-center justify-between px-2 py-2 rounded-[3px] text-[10px] font-black uppercase tracking-widest transition-all ${chapterFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                        >
                                                            All Chapters {chapterFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                                        </button>
                                                        {chapters.filter(c => 
                                                            (classFilter === 'all' || String(c.class_level) === String(classFilter)) && 
                                                            (subjectFilter === 'all' || String(c.subject) === String(subjectFilter)) &&
                                                            (c.name.toLowerCase().includes(chapterSearch.toLowerCase()))
                                                        ).map(c => (
                                                            <button
                                                                key={c.id || c._id}
                                                                onClick={() => { setChapterFilter(c.id || c._id); setIsChapterFilterOpen(false); setChapterSearch(''); }}
                                                                className={`w-full flex items-center justify-between px-2 py-2 rounded-[3px] text-[10px] font-black uppercase tracking-widest transition-all text-left ${String(chapterFilter) === String(c.id || c._id) ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                            >
                                                                <span className="truncate mr-2">{c.name}</span> {String(chapterFilter) === String(c.id || c._id) && <Check size={14} strokeWidth={3} className="shrink-0" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {activeSubTab === 'Exam Details' && (
                                    <>
                                        {/* Target Dropdown */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setIsTargetFilterOpen(!isTargetFilterOpen)}
                                                className={`pl-3 pr-7 py-2.5 rounded-[5px] border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center gap-2 ${targetFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                            >
                                                {targetFilterLabel}
                                                <ChevronDown size={14} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-transform ${isTargetFilterOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            {isTargetFilterOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-140" onClick={() => { setIsTargetFilterOpen(false); setTargetSearch(''); }} />
                                                    <div className={`absolute left-0 top-full mt-2 w-48 z-150 p-2 rounded-[5px] border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                                        <div className="px-2 pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                                                            <div className="relative">
                                                                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Search targets..."
                                                                    value={targetSearch}
                                                                    onChange={(e) => setTargetSearch(e.target.value)}
                                                                    className={`w-full pl-7 pr-2 py-1.5 rounded-[3px] text-[10px] outline-none ${isDarkMode ? 'bg-white/5 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-800 placeholder:text-slate-400'}`}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                            <button
                                                                onClick={() => { setTargetFilter('all'); setExamTypeFilter('all'); setIsTargetFilterOpen(false); setTargetSearch(''); }}
                                                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all ${targetFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                            >
                                                                All Targets {targetFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                                            </button>
                                                            {availableTargetsForFilter.filter(t => t.name.toLowerCase().includes(targetSearch.toLowerCase())).map(t => (
                                                                <button
                                                                    key={t.id}
                                                                    onClick={() => { setTargetFilter(t.id); setExamTypeFilter('all'); setIsTargetFilterOpen(false); setTargetSearch(''); }}
                                                                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all ${String(targetFilter) === String(t.id) ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                                >
                                                                    {t.name} {String(targetFilter) === String(t.id) && <Check size={14} strokeWidth={3} />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Exam Type Dropdown */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setIsExamTypeFilterOpen(!isExamTypeFilterOpen)}
                                                className={`pl-3 pr-7 py-2.5 rounded-[5px] border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center gap-2 ${examTypeFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                            >
                                                {examTypeLabel}
                                                <ChevronDown size={14} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-transform ${isExamTypeFilterOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            {isExamTypeFilterOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-140" onClick={() => { setIsExamTypeFilterOpen(false); setExamTypeSearch(''); }} />
                                                    <div className={`absolute left-0 top-full mt-2 w-48 z-150 p-3 rounded-[5px] border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                                        <div className="px-2 pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                                                            <div className="relative">
                                                                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Search types..."
                                                                    value={examTypeSearch}
                                                                    onChange={(e) => setExamTypeSearch(e.target.value)}
                                                                    className={`w-full pl-7 pr-2 py-1.5 rounded-[3px] text-[10px] outline-none ${isDarkMode ? 'bg-white/5 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-800 placeholder:text-slate-400'}`}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                            <button
                                                                onClick={() => { setExamTypeFilter('all'); setIsExamTypeFilterOpen(false); setExamTypeSearch(''); }}
                                                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all ${examTypeFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                            >
                                                                All Types {examTypeFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                                            </button>
                                                            {availableTypesForFilter.filter(et => et.name.toLowerCase().includes(examTypeSearch.toLowerCase())).map(et => (
                                                                <button
                                                                    key={et.id}
                                                                    onClick={() => { setExamTypeFilter(et.id); setIsExamTypeFilterOpen(false); setExamTypeSearch(''); }}
                                                                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all ${String(examTypeFilter) === String(et.id) ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                                >
                                                                    {et.name} {String(examTypeFilter) === String(et.id) && <Check size={14} strokeWidth={3} />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                        {/* SubTopic: Topic Filter */}
                        {activeSubTab === 'SubTopic' && (
                            <div className="relative">
                                <button
                                    onClick={() => setIsTopicFilterOpen(!isTopicFilterOpen)}
                                    className={`pl-3 pr-7 py-2.5 rounded-[5px] border font-bold text-[10px] uppercase tracking-widest outline-none transition-all cursor-pointer flex items-center gap-2 ${topicFilter !== 'all' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                                >
                                    {topicFilter === 'all' ? 'Select Topic...' : topics.find(t => String(t.id) === String(topicFilter))?.name || 'Select Topic...'}
                                    <ChevronDown size={14} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-transform ${isTopicFilterOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isTopicFilterOpen && (
                                    <>
                                        <div className="fixed inset-0 z-140" onClick={() => { setIsTopicFilterOpen(false); setTopicSearch(''); }} />
                                        <div className={`absolute left-0 top-full mt-2 w-56 z-150 p-2 rounded-[5px] border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                            <div className="px-2 pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                                                <div className="relative">
                                                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search topics..."
                                                        value={topicSearch}
                                                        onChange={(e) => setTopicSearch(e.target.value)}
                                                        className={`w-full pl-7 pr-2 py-1.5 rounded-[3px] text-[10px] outline-none ${isDarkMode ? 'bg-white/5 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-800 placeholder:text-slate-400'}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                <button
                                                    onClick={() => {
                                                        setTopicFilter('all');
                                                        setIsTopicFilterOpen(false);
                                                        setTopicSearch('');
                                                        setData([]);
                                                    }}
                                                    className={`w-full flex items-center justify-between px-2 py-2 rounded-[3px] text-[10px] font-black uppercase tracking-widest transition-all ${topicFilter === 'all' ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                >
                                                    All Topics {topicFilter === 'all' && <Check size={14} strokeWidth={3} />}
                                                </button>
                                                {topics.filter(t => t.name.toLowerCase().includes(topicSearch.toLowerCase())).map(t => (
                                                    <button
                                                        key={t.id || t._id}
                                                        onClick={() => {
                                                            const id = t.id || t._id;
                                                            setTopicFilter(id);
                                                            setIsTopicFilterOpen(false);
                                                            setTopicSearch('');
                                                            fetchData(true, id);
                                                        }}
                                                        className={`w-full flex items-center justify-between px-2 py-2 rounded-[3px] text-[10px] font-black uppercase tracking-widest transition-all text-left ${String(topicFilter) === String(t.id || t._id) ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                    >
                                                        <span className="truncate mr-2">{t.name}</span> {String(topicFilter) === String(t.id || t._id) && <Check size={14} strokeWidth={3} className="shrink-0" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        {/* Filter Button & Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[5px] border font-black text-[10px] uppercase tracking-widest transition-all ${statusFilter !== 'all'
                                    ? 'bg-orange-500/10 border-orange-500/50 text-orange-500'
                                    : isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <Filter size={16} className={statusFilter !== 'all' ? 'animate-pulse' : ''} />
                                {statusFilter === 'all' ? 'Filter' : `${statusFilter}`}
                                <ChevronDown size={14} className={`transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isFilterOpen && (
                                <>
                                    <div className="fixed inset-0 z-140" onClick={() => setIsFilterOpen(false)} />
                                    <div className={`absolute right-0 top-full mt-3 w-56 z-150 p-2 rounded-[5px] border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'
                                        }`}>
                                        {[
                                            { id: 'all', label: 'All Status' },
                                            { id: 'active', label: 'Active Only' },
                                            { id: 'inactive', label: 'Inactive Only' }
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => {
                                                    setStatusFilter(opt.id);
                                                    setIsFilterOpen(false);
                                                }}
                                                className={`w-full flex items-center justify-between px-4 py-3 rounded-[5px] text-xs font-bold transition-all ${statusFilter === opt.id
                                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                                    : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {opt.label}
                                                {statusFilter === opt.id && <Check size={14} strokeWidth={3} />}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <button
                            onClick={() => fetchData(true)}
                            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-[5px] border font-black text-[10px] uppercase tracking-widest transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            title="Fast Refresh (Bypass Cache)"
                        >
                            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        </button>

                        <button
                            onClick={handleCreate}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-[5px] font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-orange-600/30 active:scale-95"
                        >
                            <Plus size={16} strokeWidth={3} />
                            Add New {activeSubTab}
                        </button>

                        {(activeSubTab === 'Chapter' || activeSubTab === 'Topic' || activeSubTab === 'SubTopic') && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleExport}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-[5px] border font-black text-[10px] uppercase tracking-widest transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                >
                                    <Download size={16} />
                                    Export
                                </button>
                                <button
                                    onClick={() => setShowBulkModal(true)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-[5px] border font-black text-[10px] uppercase tracking-widest transition-all ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20' : 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100'}`}
                                >
                                    <Upload size={16} />
                                    Import
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="animate-pulse">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className={`border-b ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                                        {activeSubTab === 'Exam Details' ? (
                                            <>
                                                <th className="pb-4 px-4"><div className={`h-3 w-4 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></th>
                                                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <th key={i} className="pb-4 px-4"><div className={`h-3 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></th>)}
                                            </>
                                        ) : activeSubTab === 'Chapter' || activeSubTab === 'Topic' ? (
                                            <>
                                                <th className="pb-4 px-4"><div className={`h-3 w-4 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></th>
                                                {[1, 2, 3, 4, 5].map(i => <th key={i} className="pb-4 px-4"><div className={`h-3 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></th>)}
                                            </>
                                        ) : (
                                            <>
                                                <th className="pb-4 px-4"><div className={`h-3 w-4 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></th>
                                                {[1, 2, 3].map(i => <th key={i} className="pb-4 px-4"><div className={`h-3 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></th>)}
                                            </>
                                        )}
                                        <th className="pb-4 px-4"><div className={`h-3 w-16 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></th>
                                        <th className="pb-4 px-4"><div className={`h-3 w-16 ml-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-transparent">
                                    {[1, 2, 3, 4, 5].map((row) => (
                                        <tr key={row}>
                                            {activeSubTab === 'Exam Details' ? (
                                                <>
                                                    <td className="py-5 px-4"><div className={`h-4 w-4 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4"><div className={`h-4 w-32 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4"><div className={`h-4 w-16 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4"><div className={`h-4 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4"><div className={`h-4 w-12 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4"><div className={`h-4 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4"><div className={`h-4 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4"><div className={`h-4 w-10 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4"><div className={`h-4 w-16 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                </>
                                            ) : activeSubTab === 'Chapter' || activeSubTab === 'Topic' ? (
                                                <>
                                                    <td className="py-5 px-4"><div className={`h-4 w-4 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4"><div className={`h-4 w-40 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4"><div className={`h-4 w-12 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4"><div className={`h-4 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4"><div className={`h-4 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4"><div className={`h-4 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="py-5 px-4"><div className={`h-4 w-4 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                    <td className="py-5 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                            <div className={`h-4 w-32 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                        </div>
                                                    </td>
                                                    {activeSubTab === 'Exam Type' && <td className="py-5 px-4"><div className={`h-4 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>}
                                                    <td className="py-5 px-4"><div className={`h-4 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                                </>
                                            )}
                                            <td className="py-5 px-4"><div className={`h-6 w-16 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                            <td className="py-5 px-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <div className={`h-8 w-8 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                    <div className={`h-8 w-8 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : error ? (
                        <div className="py-24 flex flex-col items-center justify-center space-y-4 text-red-500">
                            <Database size={48} className="opacity-20" />
                            <p className="font-bold">{error}</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'}`}>
                                    {activeSubTab === 'Exam Details' ? (
                                        <>
                                            <th className="pb-4 px-4 font-black">#</th>
                                            <th className="pb-4 px-4 font-black">Exam Title</th>
                                            <th className="pb-4 px-4 font-black">Code</th>
                                            <th className="pb-4 px-4 font-black">Session</th>
                                            <th className="pb-4 px-4 font-black text-center">Class</th>
                                            <th className="pb-4 px-4 font-black">Target</th>
                                            <th className="pb-4 px-4 font-black">Exam Type</th>
                                            <th className="pb-4 px-4 font-black text-center">Marks</th>
                                            <th className="pb-4 px-4 font-black text-center">Duration</th>
                                        </>
                                    ) : activeSubTab === 'Chapter' ? (
                                        <>
                                            <th className="pb-4 px-4 font-black">#</th>
                                            <th className="pb-4 px-4 font-black">Chapter Name</th>
                                            <th className="pb-4 px-4 font-black text-center">Class</th>
                                            <th className="pb-4 px-4 font-black">Subject</th>
                                            <th className="pb-4 px-4 font-black">Code</th>
                                        </>
                                    ) : activeSubTab === 'SubTopic' ? (
                                        <>
                                            <th className="pb-4 px-4 font-black">#</th>
                                            <th className="pb-4 px-4 font-black">SubTopic Name</th>
                                            <th className="pb-4 px-4 font-black text-center">Topic</th>
                                            <th className="pb-4 px-4 font-black">Code</th>
                                        </>
                                    ) : activeSubTab === 'Topic' ? (
                                        <>
                                            <th className="pb-4 px-4 font-black">#</th>
                                            <th className="pb-4 px-4 font-black">Topic Name</th>
                                            <th className="pb-4 px-4 font-black text-center">Class</th>
                                            <th className="pb-4 px-4 font-black">Subject</th>
                                            <th className="pb-4 px-4 font-black">Chapter</th>
                                            <th className="pb-4 px-4 font-black">Sub-topic</th>
                                            <th className="pb-4 px-4 font-black">Code</th>
                                        </>
                                    ) : activeSubTab === 'Teacher' ? (
                                        <>
                                            <th className="pb-4 px-4 font-black">#</th>
                                            <th className="pb-4 px-4 font-black">Teacher Name</th>
                                            <th className="pb-4 px-4 font-black">Subject</th>
                                            <th className="pb-4 px-4 font-black">Email</th>
                                            <th className="pb-4 px-4 font-black">Phone</th>
                                            <th className="pb-4 px-4 font-black">Qualification</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="pb-4 px-4 font-black">#</th>
                                            <th className="pb-4 px-4 font-black">Name / Title</th>
                                            {activeSubTab === 'Exam Type' && <th className="pb-4 px-4 font-black">Target</th>}
                                            <th className="pb-4 px-4 font-black">Code</th>
                                        </>
                                    )}
                                    <th className="pb-4 px-4 font-black text-center">Status</th>
                                    <th className="pb-4 px-4 text-right font-black">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-transparent">
                                {paginatedData.length > 0 ? paginatedData.map((item, index) => (
                                    <tr key={item.id} className={`group ${isDarkMode ? 'hover:bg-white/2' : 'hover:bg-slate-200/50'} transition-colors`}>
                                        <td className="py-5 px-4 font-bold opacity-30 text-xs">{index + 1 + (pageNumber - 1) * rowsPerPage}</td>
                                        {activeSubTab === 'Exam Details' ? (
                                            <>
                                                <td className="py-5 px-4">
                                                    <span className="font-extrabold text-sm">{item.name}</span>
                                                </td>
                                                <td className="py-5 px-4 text-xs font-bold opacity-70">
                                                    <span className={`px-3 py-1 rounded-[5px] text-[10px] font-black tracking-tighter ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                                        {item.code}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-extrabold text-xs">{item.session_name}</span>
                                                        <span className="text-[9px] opacity-40 font-bold uppercase tracking-wider">Academic Year</span>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-4 text-center">
                                                    <span className="font-bold text-sm tracking-tight">{item.class_level_name}</span>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
                                                        {item.target_exam_name || '-'}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <span className={`px-3 py-1 rounded-[5px] text-[10px] font-black tracking-tighter ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                                        {item.exam_type_name}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-4 text-center">
                                                    <span className="font-bold text-sm tracking-tight">{item.total_marks || 0}</span>
                                                </td>
                                                <td className="py-5 px-4 text-center">
                                                    <div className="flex items-center justify-center gap-1.5 font-black text-xs">
                                                        <Clock size={14} className="text-orange-500" />
                                                        {item.duration}m
                                                    </div>
                                                </td>
                                            </>
                                        ) : activeSubTab === 'Chapter' ? (
                                            <>
                                                <td className="py-5 px-4">
                                                    <span className="font-extrabold text-sm uppercase">{item.name}</span>
                                                </td>
                                                <td className="py-5 px-4 text-center">
                                                    <span className="font-bold text-sm tracking-tight">{item.class_level_name}</span>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
                                                        {item.subject_name}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-4 text-xs font-bold opacity-70">
                                                    <span className={`px-3 py-1 rounded-[5px] text-[10px] font-black tracking-tighter ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                                        {item.code}
                                                    </span>
                                                </td>
                                            </>
                                        ) : activeSubTab === 'SubTopic' ? (
                                            <>
                                                <td className="py-5 px-4">
                                                    <span className="font-extrabold text-sm uppercase">{item.name}</span>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
                                                        {item.topic_name}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-4 text-xs font-bold opacity-70">
                                                    <span className={`px-3 py-1 rounded-[5px] text-[10px] font-black tracking-tighter ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                                        {item.code}
                                                    </span>
                                                </td>
                                            </>
                                        ) : activeSubTab === 'Topic' ? (
                                            <>
                                                <td className="py-5 px-4">
                                                    <span className="font-extrabold text-sm uppercase">{item.name}</span>
                                                </td>
                                                <td className="py-5 px-4 text-center">
                                                    <span className="font-bold text-sm tracking-tight">{item.class_level_name}</span>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
                                                        {item.subject_name}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <span className="text-[10px] font-bold opacity-80 uppercase">
                                                        {item.chapter_name || '-'}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <span className="text-[10px] font-bold opacity-60 uppercase">
                                                        {item.sub_topic || '-'}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-4 text-xs font-bold opacity-70">
                                                    <span className={`px-3 py-1 rounded-[5px] text-[10px] font-black tracking-tighter ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                                        {item.code}
                                                    </span>
                                                </td>
                                            </>
                                        ) : activeSubTab === 'Teacher' ? (
                                            <>
                                                <td className="py-5 px-4 block">
                                                    <span className="font-extrabold text-sm uppercase">{item.name}</span>
                                                    <div className="text-[10px] opacity-40 font-bold uppercase tracking-wider">{item.code}</div>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
                                                        {item.subject_name}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-4 font-bold text-xs opacity-70">
                                                    {item.email || '-'}
                                                </td>
                                                <td className="py-5 px-4 font-bold text-xs opacity-70">
                                                    {item.phone || '-'}
                                                </td>
                                                <td className="py-5 px-4 font-bold text-xs opacity-70">
                                                    {item.qualification || '-'}
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="py-5 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-[5px] flex items-center justify-center font-bold text-xs border transition-transform group-hover:scale-110 ${isDarkMode ? 'bg-orange-900/10 text-orange-500 border-white/5' : 'bg-orange-50 text-orange-600 border-orange-100'
                                                            }`}>
                                                            {activeSubTab.charAt(0)}
                                                        </div>
                                                        <span className={`font-bold text-sm ${activeSubTab === 'Subject' ? 'uppercase' : ''}`}>{item.name}</span>
                                                    </div>
                                                </td>
                                                {activeSubTab === 'Exam Type' && (
                                                    <td className="py-5 px-4">
                                                        <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
                                                            {item.target_exam_names || item.target_exam_name || '-'}
                                                        </span>
                                                    </td>
                                                )}
                                                <td className="py-5 px-4 text-sm font-bold opacity-70">
                                                    <span className={`px-3 py-1 rounded-[5px] text-[10px] font-black tracking-tighter ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        {item.code}
                                                    </span>
                                                </td>
                                            </>
                                        )}
                                        <td className="py-5 px-4">
                                            <div className="flex justify-center">
                                                <button
                                                    onClick={() => handleToggleStatus(item)}
                                                    disabled={isActionLoading}
                                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-[5px] text-[9px] font-black uppercase border transition-all hover:scale-105 active:scale-95 ${item.is_active
                                                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                                                        }`}
                                                >
                                                    <div className={`w-1 h-1 rounded-full ${item.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                                                    {item.is_active ? 'Active' : 'Inactive'}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="py-5 px-4">
                                            <div className="flex justify-end items-center gap-2">
                                                {activeSubTab === 'Chapter' && (
                                                    <button
                                                        onClick={() => handleAddToLibrary(item)}
                                                        className={`p-2 rounded-[5px] transition-all hover:scale-110 ${isDarkMode ? 'bg-orange-500/10 text-orange-400 hover:text-white hover:bg-orange-500' : 'bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white'}`}
                                                        title="Quick Add to Library"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className={`p-2 rounded-[5px] transition-all hover:scale-110 ${isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white'}`}
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    disabled={isActionLoading}
                                                    className={`p-2 rounded-[5px] transition-all hover:scale-110 ${isDarkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-red-50 text-red-500 hover:bg-red-600 hover:text-white'}`}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={
                                            activeSubTab === 'Exam Details' ? 11 :
                                                activeSubTab === 'Topic' ? 9 :
                                                    activeSubTab === 'Teacher' ? 8 :
                                                        activeSubTab === 'Chapter' ? 7 :
                                                            activeSubTab === 'Exam Type' ? 6 :
                                                                activeSubTab === 'SubTopic' ? 6 : 5
                                        } className="py-24 text-center">
                                            <div className="flex flex-col items-center opacity-20">
                                                <Database size={48} className="mb-4" />
                                                <p className="font-black uppercase tracking-[0.2em] text-sm">No Records Found</p>
                                                <p className="text-xs mt-1">Try adjusting your search or add a new entry.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination Controls */}
                {!isLoading && !error && filteredData.length > 0 && (
                    <div className={`p-4 border-t flex flex-col md:flex-row items-center justify-between gap-4 ${isDarkMode ? 'border-white/5 bg-[#1A1F2B]/50' : 'border-slate-100 bg-slate-50/50'}`}>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Rows per page:</span>
                                <select
                                    value={rowsPerPage}
                                    onChange={(e) => {
                                        setRowsPerPage(Number(e.target.value));
                                        setPageNumber(1);
                                    }}
                                    className={`p-1.5 rounded border text-xs font-bold outline-none ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-700'}`}
                                >
                                    {[10, 20, 50, 100].map(val => (
                                        <option key={val} value={val}>{val}</option>
                                    ))}
                                </select>
                            </div>
                            <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Showing {(pageNumber - 1) * rowsPerPage + 1} to {Math.min(pageNumber * rowsPerPage, filteredData.length)} of {filteredData.length}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <form onSubmit={handleJumpPage} className="flex items-center gap-2">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Jump to:</span>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max={totalPages}
                                    value={jumpPage}
                                    onChange={(e) => setJumpPage(e.target.value)}
                                    placeholder={pageNumber}
                                    className={`w-12 p-1.5 rounded border text-xs font-bold text-center outline-none ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-orange-500' : 'bg-white border-slate-200 text-slate-700 focus:border-orange-500'}`}
                                />
                            </form>
                            
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                                    disabled={pageNumber === 1}
                                    className={`px-3 py-1.5 rounded border text-xs font-bold transition-all ${pageNumber === 1 ? 'opacity-50 cursor-not-allowed' : isDarkMode ? 'hover:bg-white/5 border-white/10' : 'hover:bg-slate-100 border-slate-200'}`}
                                >
                                    Prev
                                </button>
                                <div className={`px-3 py-1.5 rounded text-xs font-black ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-700'}`}>
                                    {pageNumber} / {totalPages}
                                </div>
                                <button
                                    onClick={() => setPageNumber(p => Math.min(totalPages, p + 1))}
                                    disabled={pageNumber === totalPages}
                                    className={`px-3 py-1.5 rounded border text-xs font-bold transition-all ${pageNumber === totalPages ? 'opacity-50 cursor-not-allowed' : isDarkMode ? 'hover:bg-white/5 border-white/10' : 'hover:bg-slate-100 border-slate-200'}`}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderBulkImportModal = () => {
        if (!showBulkModal) return null;
        return (
            <div className="fixed inset-0 z-2000 flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
                <div className={`relative w-full max-w-lg rounded-[15px] shadow-2xl animate-in zoom-in-95 fade-in duration-300 ${isDarkMode ? 'bg-[#0F131A] border border-white/10' : 'bg-white'}`}>
                    <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-500 rounded-[10px] text-white">
                                    <CloudUpload size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight">Bulk Import {activeSubTab}s</h3>
                                    <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mt-1">Upload CSV file to process records</p>
                                </div>
                            </div>
                            <button onClick={() => setShowBulkModal(false)} className={`p-2 rounded-full transition-all ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                                <X size={20} />
                            </button>
                        </div>

                        <div 
                            onClick={() => bulkFileInputRef.current?.click()}
                            className={`p-10 border-2 border-dashed rounded-[10px] flex flex-col items-center justify-center gap-4 cursor-pointer transition-all ${importFile ? 'bg-emerald-500/5 border-emerald-500/50' : isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-orange-500/30'}`}
                        >
                            <input
                                type="file"
                                ref={bulkFileInputRef}
                                onChange={(e) => setImportFile(e.target.files[0])}
                                accept=".csv"
                                className="hidden"
                            />
                            {importFile ? (
                                <>
                                    <FileSpreadsheet size={48} className="text-emerald-500" />
                                    <div className="text-center">
                                        <p className="text-sm font-black truncate max-w-[200px]">{importFile.name}</p>
                                        <p className="text-[9px] font-bold opacity-50 uppercase mt-1">{(importFile.size / 1024).toFixed(2)} KB</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Database size={48} className="opacity-20" />
                                    <p className="text-xs font-black uppercase tracking-widest opacity-40">Click to Select CSV File</p>
                                </>
                            )}
                        </div>

                        <div className={`p-4 rounded-[10px] ${isDarkMode ? 'bg-blue-500/5' : 'bg-blue-50'} border ${isDarkMode ? 'border-blue-500/20' : 'border-blue-100'}`}>
                            <div className="flex gap-3">
                                <AlertTriangle className="text-blue-500 shrink-0" size={18} />
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest">CSV Instructions</p>
                                    <p className="text-[10px] font-bold opacity-70 leading-relaxed text-left">
                                        Ensure columns match the template: <span className="underline cursor-pointer" onClick={handleExport}>Download current as template</span>.
                                        Check Class and Subject names exactly as they appear in the system.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowBulkModal(false)}
                                className={`flex-1 py-4 rounded-[10px] font-black uppercase text-[11px] tracking-widest transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkImport}
                                disabled={!importFile || isImporting}
                                className={`flex-[1.5] py-4 rounded-[10px] font-black uppercase text-[11px] tracking-widest text-white shadow-xl transition-all flex items-center justify-center gap-3 ${!importFile || isImporting ? 'bg-slate-500 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'}`}
                            >
                                {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                                {isImporting ? 'Processing...' : 'Confirm Import'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderModal = () => {
        return (
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-1000 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isActionLoading && setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className={`relative w-full max-w-xl rounded-3xl border shadow-2xl z-1001 max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-[#0F1117] border-white/10' : 'bg-white border-slate-200'}`}
                        >
                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                <div className="flex justify-between items-center bg-linear-to-r from-orange-500/10 to-transparent -mx-6 -mt-6 p-6 border-b border-white/5 mb-2">
                                    <div>
                                        <h2 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            {modalMode === 'create' ? 'Add New' : 'Edit'} <span className="text-orange-500">{activeSubTab}</span>
                                        </h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                            <p className={`text-[9px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Configuration parameters</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => setIsModalOpen(false)} className={`p-2.5 rounded-xl transition-all hover:rotate-90 hover:scale-110 active:scale-95 ${isDarkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-900 border border-slate-200'}`}>
                                        <X size={18} strokeWidth={3} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {activeSubTab === 'Exam Details' ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5 col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Exam Title</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formValues.name}
                                                    onChange={e => setFormValues({ ...formValues, name: e.target.value })}
                                                    placeholder="e.g. JEE Advanced Mock - 1"
                                                    className={`w-full p-3.5 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500'}`}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Exam Code</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formValues.code}
                                                    onChange={e => setFormValues({ ...formValues, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                                                    placeholder="e.g. JEE_ADV_2026"
                                                    className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500'}`}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Session</label>
                                                <select
                                                    value={formValues.session}
                                                    onChange={e => setFormValues({ ...formValues, session: e.target.value })}
                                                    className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none appearance-none transition-all ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                >
                                                    {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5 text-left">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Class</label>
                                                <select
                                                    value={formValues.class_level}
                                                    onChange={e => setFormValues({ ...formValues, class_level: e.target.value })}
                                                    className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none appearance-none transition-all ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                >
                                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5 text-left">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Target Exam</label>
                                                <select
                                                    value={formValues.target_exam}
                                                    onChange={e => setFormValues({ ...formValues, target_exam: e.target.value, exam_type: '' })}
                                                    className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none appearance-none transition-all ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                >
                                                    <option value="">Select Target</option>
                                                    {targetExams.map(te => <option key={te.id} value={te.id}>{te.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Exam Type</label>
                                                <select
                                                    disabled={!formValues.target_exam}
                                                    value={formValues.exam_type}
                                                    onChange={e => setFormValues({ ...formValues, exam_type: e.target.value })}
                                                    className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none appearance-none transition-all ${!formValues.target_exam ? 'opacity-40 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                >
                                                    <option value="">Select Type</option>
                                                    {(() => {
                                                        const filteredExamTypes = examTypes.filter(et => {
                                                            if (et.target_exams && Array.isArray(et.target_exams)) {
                                                                return et.target_exams.some(teId => String(teId) === String(formValues.target_exam));
                                                            }
                                                            return String(et.target_exam || et.target_exam_id || '') === String(formValues.target_exam);
                                                        });
                                                        return filteredExamTypes.map(et => <option key={et.id} value={et.id}>{et.name}</option>);
                                                    })()}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5 text-left">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Duration (Mins)</label>
                                                <input
                                                    type="number"
                                                    value={formValues.duration}
                                                    onChange={e => setFormValues({ ...formValues, duration: e.target.value })}
                                                    className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                            <div className="space-y-1.5 text-left">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Total Marks</label>
                                                <input
                                                    type="number"
                                                    value={formValues.total_marks}
                                                    onChange={e => setFormValues({ ...formValues, total_marks: e.target.value })}
                                                    className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                        </div>
                                    ) : activeSubTab === 'Image' ? (
                                        <div className="space-y-6 text-left">
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Class</label>
                                                    <select
                                                        value={formValues.class_level}
                                                        onChange={e => setFormValues({ ...formValues, class_level: e.target.value, topic: '' })}
                                                        className={`w-full p-3.5 rounded-[5px] border font-bold text-sm outline-none appearance-none transition-all ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                    >
                                                        <option value="">No Class</option>
                                                        {classes.map(c => <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Subject</label>
                                                    <select
                                                        value={formValues.subject}
                                                        onChange={e => setFormValues({ ...formValues, subject: e.target.value, topic: '' })}
                                                        className={`w-full p-2.5 rounded-[5px] border font-bold text-[10px] outline-none appearance-none transition-all ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                    >
                                                        <option value="">No Subject</option>
                                                        {subjects.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Topic</label>
                                                    <select
                                                        value={formValues.topic}
                                                        onChange={e => setFormValues({ ...formValues, topic: e.target.value })}
                                                        className={`w-full p-2.5 rounded-[5px] border font-bold text-[10px] outline-none appearance-none transition-all ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                    >
                                                        <option value="">No Topic</option>
                                                        {filteredTopicsForImage.map(t => <option key={t.id || t._id} value={t.id || t._id}>{t.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Exam Type</label>
                                                    <select
                                                        value={formValues.exam_type}
                                                        onChange={e => setFormValues({ ...formValues, exam_type: e.target.value })}
                                                        className={`w-full p-2.5 rounded-[5px] border font-bold text-[10px] outline-none appearance-none transition-all ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                    >
                                                        <option value="">No Type</option>
                                                        {examTypes.map(et => <option key={et.id || et._id} value={et.id || et._id}>{et.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Target Exam</label>
                                                    <select
                                                        value={formValues.target_exam}
                                                        onChange={e => setFormValues({ ...formValues, target_exam: e.target.value })}
                                                        className={`w-full p-2.5 rounded-[5px] border font-bold text-[10px] outline-none appearance-none transition-all ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                    >
                                                        <option value="">No Target</option>
                                                        {targetExams.map(te => <option key={te.id || te._id} value={te.id || te._id}>{te.name}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="p-8 rounded-[5px] border-2 border-dashed border-orange-500/20 bg-orange-500/2 flex flex-col items-center justify-center text-center space-y-3">
                                                <div className="w-24 h-24 rounded-[5px] bg-orange-500/10 flex items-center justify-center text-orange-500 overflow-hidden border-4 border-white shadow-lg">
                                                    {previews.length > 0 ? (
                                                        <img src={previews[0]} alt="Preview" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <ImageIcon size={32} />
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black uppercase tracking-tight">
                                                        {selectedFiles.length > 0 ? `${selectedFiles.length} File(s) Ready` : 'Select Images First'}
                                                    </h4>
                                                    <p className="text-[10px] font-medium opacity-50 max-w-[200px] mx-auto">
                                                        {selectedFiles.length > 0 ? 'Click "Save Configuration" to start upload' : 'Tagging your images helps you find them later in the Question Bank.'}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => mediaInputRef.current.click()}
                                                    className="px-6 py-2 bg-orange-600 text-white rounded-[5px] text-xs font-bold shadow-lg shadow-orange-600/30 hover:bg-orange-700 transition-all active:scale-95"
                                                >
                                                    {selectedFiles.length > 0 ? 'Change Selection' : 'Browse Images'}
                                                </button>
                                            </div>
                                            <input
                                                type="file"
                                                ref={mediaInputRef}
                                                onChange={handleFileSelect}
                                                className="hidden"
                                                multiple
                                                accept="image/*"
                                            />
                                        </div>
                                    ) : activeSubTab === 'SubTopic' ? (
                                        <div className="grid grid-cols-2 gap-4 text-left">
                                            <div className="space-y-1.5 col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Topic</label>
                                                <select
                                                    required
                                                    value={formValues.topic}
                                                    onChange={e => setFormValues({ ...formValues, topic: e.target.value })}
                                                    className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none appearance-none transition-all ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                >
                                                    <option value="">Select Topic</option>
                                                    {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5 col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">SubTopic Name</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formValues.name}
                                                    onChange={e => setFormValues({ ...formValues, name: e.target.value })}
                                                    placeholder="e.g. Introduction, Key Concepts"
                                                    className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Unique Code</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formValues.code}
                                                    onChange={e => setFormValues({ ...formValues, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                                                    placeholder="CODE"
                                                    className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500'}`}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Order</label>
                                                <input
                                                    type="number"
                                                    value={formValues.order}
                                                    onChange={e => setFormValues({ ...formValues, order: e.target.value })}
                                                    className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                        </div>
                                    ) : activeSubTab === 'Chapter' ? (
                                        <div className="grid grid-cols-2 gap-4 text-left">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Class</label>
                                                <select
                                                    required
                                                    value={formValues.class_level}
                                                    onChange={e => setFormValues({ ...formValues, class_level: e.target.value })}
                                                    className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none appearance-none transition-all ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                >
                                                    <option value="">Select Class</option>
                                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Subject</label>
                                                <select
                                                    required
                                                    value={formValues.subject}
                                                    onChange={e => setFormValues({ ...formValues, subject: e.target.value })}
                                                    className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none appearance-none transition-all ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                >
                                                    <option value="">Select Subject</option>
                                                    {subjects.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5 col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Chapter Name</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formValues.name}
                                                    onChange={e => setFormValues({ ...formValues, name: e.target.value })}
                                                    placeholder="e.g. Chemical Bonding, Linear Algebra"
                                                    className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Unique Code</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formValues.code}
                                                    onChange={e => setFormValues({ ...formValues, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                                                    placeholder="CODE"
                                                    className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500'}`}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Order</label>
                                                <input
                                                    type="number"
                                                    value={formValues.order}
                                                    onChange={e => setFormValues({ ...formValues, order: e.target.value })}
                                                    className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                        </div>
                                    ) : activeSubTab === 'Topic' ? (
                                        <div className="grid grid-cols-2 gap-4 text-left">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Class</label>
                                                <select
                                                    required
                                                    value={formValues.class_level}
                                                    onChange={e => setFormValues({ ...formValues, class_level: e.target.value })}
                                                    className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none appearance-none transition-all ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                >
                                                    <option value="">Select Class</option>
                                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Subject</label>
                                                <select
                                                    required
                                                    value={formValues.subject}
                                                    onChange={e => setFormValues({ ...formValues, subject: e.target.value })}
                                                    className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none appearance-none transition-all ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                >
                                                    <option value="">Select Subject</option>
                                                    {subjects.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5 col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Chapter</label>
                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsModalChapterFilterOpen(!isModalChapterFilterOpen)}
                                                        className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none transition-all flex items-center justify-between ${formValues.chapter ? (isDarkMode ? 'bg-white/5 border-orange-500/50 text-white' : 'bg-orange-50 border-orange-500/50 text-orange-600') : isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                    >
                                                        {formValues.chapter ? chapters.find(c => String(c.id || c._id) === String(formValues.chapter))?.name || 'Select Chapter' : 'Select Chapter'}
                                                        <ChevronDown size={14} className={`transition-transform ${isModalChapterFilterOpen ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    {isModalChapterFilterOpen && (
                                                        <>
                                                            <div className="fixed inset-0 z-140" onClick={() => { setIsModalChapterFilterOpen(false); setModalChapterSearch(''); }} />
                                                            <div className={`absolute left-0 right-0 top-full mt-2 z-150 p-2 rounded-[5px] border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                                                                <div className="px-2 pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                                                                    <div className="relative">
                                                                        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Search chapters..."
                                                                            value={modalChapterSearch}
                                                                            onChange={(e) => setModalChapterSearch(e.target.value)}
                                                                            className={`w-full pl-7 pr-2 py-1.5 rounded-[3px] text-[10px] outline-none ${isDarkMode ? 'bg-white/5 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-800 placeholder:text-slate-400'}`}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => { setFormValues({ ...formValues, chapter: '' }); setIsModalChapterFilterOpen(false); setModalChapterSearch(''); }}
                                                                        className={`w-full flex items-center justify-between px-2 py-2 rounded-[3px] text-[10px] font-black uppercase tracking-widest transition-all ${!formValues.chapter ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                                    >
                                                                        Select Chapter {!formValues.chapter && <Check size={14} strokeWidth={3} />}
                                                                    </button>
                                                                    {chapters.filter(ch =>
                                                                        (!formValues.class_level || String(ch.class_level) === String(formValues.class_level)) &&
                                                                        (!formValues.subject || String(ch.subject) === String(formValues.subject)) &&
                                                                        (ch.name.toLowerCase().includes(modalChapterSearch.toLowerCase()))
                                                                    ).map(ch => (
                                                                        <button
                                                                            type="button"
                                                                            key={ch.id || ch._id}
                                                                            onClick={() => { setFormValues({ ...formValues, chapter: ch.id || ch._id }); setIsModalChapterFilterOpen(false); setModalChapterSearch(''); }}
                                                                            className={`w-full flex items-center justify-between px-2 py-2 rounded-[3px] text-[10px] font-black uppercase tracking-widest transition-all text-left ${String(formValues.chapter) === String(ch.id || ch._id) ? 'bg-orange-500 text-white' : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                                                        >
                                                                            <span className="truncate mr-2">{ch.name}</span> {String(formValues.chapter) === String(ch.id || ch._id) && <Check size={14} strokeWidth={3} className="shrink-0" />}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-1.5 col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Topic Name</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formValues.name}
                                                    onChange={e => setFormValues({ ...formValues, name: e.target.value })}
                                                    placeholder="e.g. Thermodynamics, Genetics"
                                                    className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Sub-topic (Optional)</label>
                                                <input
                                                    type="text"
                                                    value={formValues.sub_topic}
                                                    onChange={e => setFormValues({ ...formValues, sub_topic: e.target.value })}
                                                    placeholder="e.g. Laws of Motion"
                                                    className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                            <div className="space-y-1.5 text-left">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Unique Code</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formValues.code}
                                                    onChange={e => setFormValues({ ...formValues, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                                                    placeholder="CODE"
                                                    className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500'}`}
                                                />
                                            </div>
                                        </div>
                                    ) : activeSubTab === 'Teacher' ? (
                                        <div className="grid grid-cols-2 gap-3 text-left">
                                            <div className="space-y-1 col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Teacher Name</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formValues.name}
                                                    onChange={e => setFormValues({ ...formValues, name: e.target.value })}
                                                    placeholder="e.g. John Doe, Dr. Smith"
                                                    className={`w-full p-2 rounded-[5px] border font-bold text-xs outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                            <div className="space-y-1 col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Subject</label>
                                                <select
                                                    value={formValues.subject}
                                                    onChange={e => setFormValues({ ...formValues, subject: e.target.value })}
                                                    className={`w-full p-2 rounded-[5px] border font-bold text-xs outline-none appearance-none transition-all ${isDarkMode ? 'bg-[#1A1F2B] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                >
                                                    <option value="">Select Subject</option>
                                                    {subjects.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Email</label>
                                                <input
                                                    type="email"
                                                    value={formValues.email}
                                                    onChange={e => setFormValues({ ...formValues, email: e.target.value })}
                                                    placeholder="email@example.com"
                                                    className={`w-full p-2 rounded-[5px] border font-bold text-xs outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Phone</label>
                                                <input
                                                    type="text"
                                                    value={formValues.phone}
                                                    onChange={e => setFormValues({ ...formValues, phone: e.target.value })}
                                                    placeholder="+1 234 567 890"
                                                    className={`w-full p-2 rounded-[5px] border font-bold text-xs outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Qualification</label>
                                                <input
                                                    type="text"
                                                    value={formValues.qualification}
                                                    onChange={e => setFormValues({ ...formValues, qualification: e.target.value })}
                                                    placeholder="e.g. PhD, MSc"
                                                    className={`w-full p-2 rounded-[5px] border font-bold text-xs outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Experience</label>
                                                <input
                                                    type="text"
                                                    value={formValues.experience}
                                                    onChange={e => setFormValues({ ...formValues, experience: e.target.value })}
                                                    placeholder="e.g. 5 Years"
                                                    className={`w-full p-2 rounded-[5px] border font-bold text-xs outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                            <div className="space-y-1 text-left col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Unique Code</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formValues.code}
                                                    onChange={e => setFormValues({ ...formValues, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                                                    placeholder="TEACHER_CODE"
                                                    className={`w-full p-2 rounded-[5px] border font-bold text-xs outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500'}`}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Name / Title</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formValues.name}
                                                    onChange={e => {
                                                        const val = activeSubTab === 'Subject' ? e.target.value.toUpperCase() : e.target.value;
                                                        setFormValues({ ...formValues, name: val });
                                                    }}
                                                    placeholder={activeSubTab === 'Subject' ? "e.g. Mathematics, Physics" : "e.g. JEE Mock"}
                                                    className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>

                                            <div className="space-y-1.5 text-left">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Unique Code</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formValues.code}
                                                    onChange={e => setFormValues({ ...formValues, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                                                    className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500'}`}
                                                />
                                            </div>

                                            {activeSubTab === 'Exam Type' && (
                                                <div className="space-y-3 col-span-2 bg-black/5 p-4 rounded-xl border border-white/5">
                                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Target Exams (Select Multiple)</label>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                        {targetExams.map(te => {
                                                            const isChecked = (formValues.target_exams || []).some(id => String(id) === String(te.id));
                                                            return (
                                                                <label
                                                                    key={te.id}
                                                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${isChecked
                                                                        ? 'bg-orange-500/10 border-orange-500/50 text-orange-500'
                                                                        : isDarkMode ? 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                                        }`}
                                                                >
                                                                    <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${isChecked ? 'bg-orange-500 border-orange-500' : 'border-slate-400 group-hover:border-orange-500'
                                                                        }`}>
                                                                        {isChecked && <Check size={14} className="text-white" strokeWidth={4} />}
                                                                    </div>
                                                                    <input
                                                                        type="checkbox"
                                                                        className="hidden"
                                                                        checked={isChecked}
                                                                        onChange={() => {
                                                                            const currentExams = formValues.target_exams || [];
                                                                            const teId = String(te.id);
                                                                            const newExams = currentExams.some(id => String(id) === teId)
                                                                                ? currentExams.filter(id => String(id) !== teId)
                                                                                : [...currentExams, te.id];
                                                                            setFormValues({ ...formValues, target_exams: newExams });
                                                                        }}
                                                                    />
                                                                    <span className="font-bold text-xs uppercase tracking-tight">{te.name}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            <div className={`${activeSubTab === 'Exam Type' ? '' : 'col-span-2'} space-y-1.5`}>
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Description</label>
                                                <textarea
                                                    rows="1"
                                                    value={formValues.description}
                                                    onChange={e => setFormValues({ ...formValues, description: e.target.value })}
                                                    placeholder="Optional details..."
                                                    className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none transition-all resize-none ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setFormValues({ ...formValues, is_active: !formValues.is_active })}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-[5px] border transition-all font-black text-[10px] uppercase tracking-widest ${formValues.is_active
                                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                                                : isDarkMode ? 'bg-white/5 border-white/10 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'}`}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${formValues.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                            {formValues.is_active ? 'Active' : 'Inactive'}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    disabled={isActionLoading}
                                    type="submit"
                                    className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-[5px] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-orange-600/30 transition-all active:scale-95 flex items-center justify-center gap-3"
                                >
                                    {isActionLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>SAVE CONFIGURATION <Check size={14} strokeWidth={3} /></>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        );
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {renderHeader()}
            {renderContent()}
            {renderModal()}
            {renderBulkImportModal()}

            {/* Premium Confirm Modal */}
            <AnimatePresence>
                {confirmDialog.isOpen && (
                    <div className="fixed inset-0 z-1100 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className={`relative w-full max-w-sm rounded-3xl border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#0F1117] border-white/10' : 'bg-white border-slate-200'}`}
                        >
                            <div className="p-8 text-center">
                                <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${isDarkMode ? 'bg-red-500/10 text-red-500' : 'bg-red-50 text-red-500'}`}>
                                    <AlertTriangle size={40} strokeWidth={2.5} />
                                </div>
                                <h3 className={`text-xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    Are you sure?
                                </h3>
                                <p className={`text-sm font-medium leading-relaxed mb-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {confirmDialog.title}
                                    <br />
                                    <span className="text-red-500/80 font-bold">This action cannot be undone.</span>
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                                        className={`py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isDarkMode ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        className="py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-red-600/30 active:scale-95"
                                    >
                                        Delete Now
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MasterDataManagement;
