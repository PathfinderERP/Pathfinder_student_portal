import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, Plus, FileText, Eye, Edit2, Trash2, RefreshCw, X, Upload, FileCheck, AlertCircle, ChevronLeft, Loader2, Maximize2, Minimize2, ExternalLink, Layers, CheckSquare, Square, ChevronDown, Check, ChevronRight, ChevronsLeft, ChevronsRight, Filter } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const SolutionRegistry = () => {
    const { isDarkMode } = useTheme();
    const PLACEHOLDER_IMAGE = '/images/placeholders/solution_placeholder.png';
    const { getApiUrl } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedItemForEdit, setSelectedItemForEdit] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // View Modal State
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedItemForView, setSelectedItemForView] = useState(null);
    const [viewPage, setViewPage] = useState(1); // 1 for Thumbnail, 2 for PDF
    const [pdfToView, setPdfToView] = useState(''); // 'question' or 'answer'
    const [isFullScreen, setIsFullScreen] = useState(false);

    const [solutionItems, setSolutionItems] = useState([]);

    // Master Data States
    const [sections, setSections] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [examTypes, setExamTypes] = useState([]);
    const [targetExams, setTargetExams] = useState([]);

    // Custom Multi-Select State
    const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState(false);
    const sectionDropdownRef = useRef(null);

    const [previews, setPreviews] = useState({
        question_thumbnail: null,
        answer_thumbnail: null,
        question_pdf: false,
        answer_pdf: false
    });

    const [removedFiles, setRemovedFiles] = useState({
        question_thumbnail: false,
        question_pdf: false,
        answer_thumbnail: false,
        answer_pdf: false
    });

    const [newItem, setNewItem] = useState({
        name: '',
        description: '',
        session: '',
        class_level: '',
        subject: '',
        exam_type: '',
        target_exam: '',
        selectedSections: [],
        resource_type_dpp: false,
        resource_type_rpp: false,
        resource_type_others: false,
        other_resource_name: '',

        question_title: '',
        question_thumbnail: null,
        question_pdf: null,

        answer_thumbnail: null,
        answer_pdf: null
    });

    // Advanced Pagination & Filtering State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [jumpToPage, setJumpToPage] = useState('');
    const [activeFilters, setActiveFilters] = useState({
        session: '',
        class_level: '',
        subject: '',
        target_exam: '',
        resource_type: ''
    });

    const fetchSolutionItems = useCallback(async () => {
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/master-data/solutions/`);
            setSolutionItems(response.data);
        } catch (error) {
            console.error("Failed to fetch solution items", error);
            toast.error("Failed to load solutions content");
        } finally {
            setIsLoading(false);
        }
    }, [getApiUrl]);

    const fetchMasterData = useCallback(async () => {
        try {
            const apiUrl = getApiUrl();
            const [secRes, sessRes, classRes, subRes, etRes, teRes] = await Promise.all([
                axios.get(`${apiUrl}/api/sections/`),
                axios.get(`${apiUrl}/api/master-data/sessions/`),
                axios.get(`${apiUrl}/api/master-data/classes/`),
                axios.get(`${apiUrl}/api/master-data/subjects/`),
                axios.get(`${apiUrl}/api/master-data/exam-types/`),
                axios.get(`${apiUrl}/api/master-data/target-exams/`)
            ]);
            setSections(secRes.data);
            setSessions(sessRes.data);
            setClasses(classRes.data);
            setSubjects(subRes.data);
            setExamTypes(etRes.data);
            setTargetExams(teRes.data);
        } catch (error) {
            console.error("Failed to fetch master data", error);
        }
    }, [getApiUrl]);

    useEffect(() => {
        fetchSolutionItems();
        fetchMasterData();
    }, [fetchSolutionItems, fetchMasterData]);

    // Handle outside clicks for custom multiselect
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sectionDropdownRef.current && !sectionDropdownRef.current.contains(event.target)) {
                setIsSectionDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFileChange = (e, field) => {
        const file = e.target.files[0];
        setNewItem({ ...newItem, [field]: file });

        if (file) {
            setRemovedFiles(prev => ({ ...prev, [field]: false }));
            if (field.includes('thumbnail')) {
                setPreviews(prev => ({ ...prev, [field]: URL.createObjectURL(file) }));
            } else if (field.includes('pdf')) {
                setPreviews(prev => ({ ...prev, [field]: true }));
            }
        }
    };

    const handleRemoveFile = (field) => {
        setNewItem(prev => ({ ...prev, [field]: null }));
        setPreviews(prev => ({ ...prev, [field]: field.includes('thumbnail') ? PLACEHOLDER_IMAGE : null }));
        if (isEditModalOpen) {
            setRemovedFiles(prev => ({ ...prev, [field]: true }));
        }
    };

    const handleSectionToggle = (sectionId) => {
        setNewItem(prev => {
            const isSelected = prev.selectedSections.includes(sectionId);
            if (isSelected) {
                return { ...prev, selectedSections: prev.selectedSections.filter(id => id !== sectionId) };
            } else {
                return { ...prev, selectedSections: [...prev.selectedSections, sectionId] };
            }
        });
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const formData = new FormData();
            formData.append('name', newItem.name);
            if (newItem.description) formData.append('description', newItem.description);
            if (newItem.session) formData.append('session', newItem.session);
            if (newItem.class_level) formData.append('class_level', newItem.class_level);
            if (newItem.subject) formData.append('subject', newItem.subject);
            if (newItem.exam_type) formData.append('exam_type', newItem.exam_type);
            if (newItem.target_exam) formData.append('target_exam', newItem.target_exam);

            formData.append('resource_type_dpp', newItem.resource_type_dpp);
            formData.append('resource_type_rpp', newItem.resource_type_rpp);
            formData.append('resource_type_others', newItem.resource_type_others);
            formData.append('other_resource_name', newItem.other_resource_name);

            formData.append('question_title', newItem.question_title);
            if (newItem.question_thumbnail) formData.append('question_thumbnail', newItem.question_thumbnail);
            if (newItem.question_pdf) formData.append('question_pdf', newItem.question_pdf);

            formData.append('answer_title', newItem.answer_title);
            if (newItem.answer_thumbnail) formData.append('answer_thumbnail', newItem.answer_thumbnail);
            if (newItem.answer_pdf) formData.append('answer_pdf', newItem.answer_pdf);

            newItem.selectedSections.forEach(sectionId => {
                formData.append('sections', sectionId);
            });

            await axios.post(`${apiUrl}/api/master-data/solutions/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success("Solution added successfully");
            setIsAddModalOpen(false);
            resetForm();
            fetchSolutionItems();
        } catch (error) {
            console.error("Failed to add solution", error);
            toast.error("Failed to add solution item");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleEditClick = (item) => {
        setSelectedItemForEdit(item);
        setNewItem({
            name: item.name || '',
            description: item.description || '',
            session: item.session || '',
            class_level: item.class_level || '',
            subject: item.subject || '',
            exam_type: item.exam_type || '',
            target_exam: item.target_exam || '',
            selectedSections: (item.sections || []).filter(id => typeof id === 'string' && id.length === 24),
            resource_type_dpp: item.resource_type_dpp || false,
            resource_type_rpp: item.resource_type_rpp || false,
            resource_type_others: item.resource_type_others || false,
            other_resource_name: item.other_resource_name || '',
            question_title: item.question_title || '',
            answer_title: item.answer_title || '',
            question_thumbnail: null,
            question_pdf: null,
            answer_thumbnail: null,
            answer_pdf: null
        });
        setPreviews({
            question_thumbnail: item.question_thumbnail || item.thumbnail || PLACEHOLDER_IMAGE,
            answer_thumbnail: item.answer_thumbnail || item.thumbnail || PLACEHOLDER_IMAGE,
            question_pdf: !!item.question_pdf,
            answer_pdf: !!item.answer_pdf
        });
        setRemovedFiles({
            question_thumbnail: false,
            answer_thumbnail: false,
            question_pdf: false,
            answer_pdf: false
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateItem = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const formData = new FormData();
            formData.append('name', newItem.name);
            if (newItem.description) formData.append('description', newItem.description);
            if (newItem.session) formData.append('session', newItem.session);
            if (newItem.class_level) formData.append('class_level', newItem.class_level);
            if (newItem.subject) formData.append('subject', newItem.subject);
            if (newItem.exam_type) formData.append('exam_type', newItem.exam_type);
            if (newItem.target_exam) formData.append('target_exam', newItem.target_exam);

            formData.append('resource_type_dpp', newItem.resource_type_dpp);
            formData.append('resource_type_rpp', newItem.resource_type_rpp);
            formData.append('resource_type_others', newItem.resource_type_others);
            formData.append('other_resource_name', newItem.other_resource_name);

            formData.append('question_title', newItem.question_title);
            if (removedFiles.question_thumbnail) formData.append('question_thumbnail', '');
            else if (newItem.question_thumbnail) formData.append('question_thumbnail', newItem.question_thumbnail);

            if (removedFiles.question_pdf) formData.append('question_pdf', '');
            else if (newItem.question_pdf) formData.append('question_pdf', newItem.question_pdf);

            formData.append('answer_title', newItem.answer_title);
            if (removedFiles.answer_thumbnail) formData.append('answer_thumbnail', '');
            else if (newItem.answer_thumbnail) formData.append('answer_thumbnail', newItem.answer_thumbnail);

            if (removedFiles.answer_pdf) formData.append('answer_pdf', '');
            else if (newItem.answer_pdf) formData.append('answer_pdf', newItem.answer_pdf);

            if (newItem.selectedSections.length === 0) {
                formData.append('sections', '');
            } else {
                newItem.selectedSections.forEach(sectionId => {
                    formData.append('sections', sectionId);
                });
            }

            await axios.patch(`${apiUrl}/api/master-data/solutions/${selectedItemForEdit.id}/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success("Solution updated successfully");
            setIsEditModalOpen(false);
            setSelectedItemForEdit(null);
            resetForm();
            fetchSolutionItems();
        } catch (error) {
            console.error("Failed to update solution", error);
            toast.error("Failed to update solution item");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDeleteItem = async (id) => {
        if (!window.confirm("Are you sure you want to delete this item?")) return;
        try {
            const apiUrl = getApiUrl();
            await axios.delete(`${apiUrl}/api/master-data/solutions/${id}/`);
            toast.success("Solution deleted successfully");
            fetchSolutionItems();
        } catch (error) {
            console.error("Failed to delete solution", error);
            toast.error("Failed to delete solution item");
        }
    };

    const resetForm = () => {
        setNewItem({
            name: '', description: '', session: '', class_level: '', subject: '', exam_type: '', target_exam: '',
            selectedSections: [], resource_type_dpp: false, resource_type_rpp: false, resource_type_others: false, other_resource_name: '',
            question_title: '', question_thumbnail: null, question_pdf: null,
            answer_title: '', answer_thumbnail: null, answer_pdf: null
        });
        setPreviews({
            question_thumbnail: PLACEHOLDER_IMAGE,
            answer_thumbnail: PLACEHOLDER_IMAGE,
            question_pdf: false,
            answer_pdf: false
        });
        setRemovedFiles({
            question_thumbnail: false,
            answer_thumbnail: false,
            question_pdf: false,
            answer_pdf: false
        });
        setIsSectionDropdownOpen(false);
    };

    // Extract dynamic filter options from current data
    const dynamicFilterOptions = useMemo(() => {
        const options = {
            sessions: new Set(),
            classes: new Set(),
            subjects: new Set(),
            targetExams: new Set(),
            resourceTypes: ['DPP', 'RPP', 'Others']
        };

        solutionItems.forEach(item => {
            if (item.session_name) options.sessions.add(item.session_name);
            if (item.class_name) options.classes.add(item.class_name);
            if (item.subject_name) options.subjects.add(item.subject_name);
            if (item.target_exam_name) options.targetExams.add(item.target_exam_name);
        });

        return {
            sessions: Array.from(options.sessions).sort(),
            classes: Array.from(options.classes).sort(),
            subjects: Array.from(options.subjects).sort(),
            targetExams: Array.from(options.targetExams).sort(),
            resourceTypes: options.resourceTypes
        };
    }, [solutionItems]);

    // Handle filtration
    const filteredItems = useMemo(() => {
        return solutionItems.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSession = !activeFilters.session || item.session_name === activeFilters.session;
            const matchesClass = !activeFilters.class_level || item.class_name === activeFilters.class_level;
            const matchesSubject = !activeFilters.subject || item.subject_name === activeFilters.subject;
            const matchesTargetExam = !activeFilters.target_exam || item.target_exam_name === activeFilters.target_exam;

            let matchesResourceType = true;
            if (activeFilters.resource_type === 'DPP') matchesResourceType = item.resource_type_dpp;
            else if (activeFilters.resource_type === 'RPP') matchesResourceType = item.resource_type_rpp;
            else if (activeFilters.resource_type === 'Others') matchesResourceType = item.resource_type_others;

            return matchesSearch && matchesSession && matchesClass && matchesSubject && matchesTargetExam && matchesResourceType;
        });
    }, [solutionItems, searchQuery, activeFilters]);

    // Handle pagination
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredItems.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredItems, currentPage, itemsPerPage]);

    const handleJumpToPage = (e) => {
        e.preventDefault();
        const pageNum = parseInt(jumpToPage);
        if (pageNum >= 1 && pageNum <= totalPages) {
            setCurrentPage(pageNum);
            setJumpToPage('');
        } else {
            toast.error(`Please enter a page between 1 and ${totalPages}`);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative text-slate-900 dark:text-white">
            <div className={`p-8 rounded-[5px] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                {/* Header & Controls */}
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-amber-500/20">
                                    Digital Resource
                                </span>
                                <h2 className="text-3xl font-black tracking-tight uppercase">
                                    Solution To <span className="text-amber-500">DPP & RPP</span>
                                </h2>
                            </div>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Post resources with academic metadata and dual (Question/Answer) files.
                            </p>
                        </div>
                        <button
                            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-[5px] font-bold flex items-center gap-2 transition-all shadow-lg shadow-amber-600/20 active:scale-95"
                        >
                            <Plus size={20} strokeWidth={3} />
                            <span>Add Solution</span>
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="relative group w-full md:w-96">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="Search by name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-14 pr-6 py-3 rounded-[5px] border-2 outline-none font-bold transition-all ${isDarkMode
                                    ? 'bg-white/5 border-white/5 text-white focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/5'
                                    : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/5'
                                    }`}
                            />
                        </div>
                        <button
                            onClick={fetchSolutionItems}
                            className={`p-3 rounded-[5px] transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-amber-400 border border-white/5' : 'bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-100'}`}
                        >
                            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    {/* Filter Bar */}
                    <div className={`p-6 rounded-[2rem] border flex flex-wrap items-center gap-6 ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center gap-2 mr-2">
                            <Filter size={16} className="text-amber-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Filters</span>
                        </div>

                        {[
                            { label: 'Session', field: 'session', options: dynamicFilterOptions.sessions },
                            { label: 'Class', field: 'class_level', options: dynamicFilterOptions.classes },
                            { label: 'Subject', field: 'subject', options: dynamicFilterOptions.subjects },
                            { label: 'Target Exam', field: 'target_exam', options: dynamicFilterOptions.targetExams },
                            { label: 'Resource', field: 'resource_type', options: dynamicFilterOptions.resourceTypes }
                        ].map((filter, i) => (
                            <div key={i} className="flex flex-col gap-1">
                                <select
                                    value={activeFilters[filter.field]}
                                    onChange={(e) => { setActiveFilters({ ...activeFilters, [filter.field]: e.target.value }); setCurrentPage(1); }}
                                    className={`px-4 py-2 rounded-[5px] border-none outline-none font-bold text-[10px] uppercase tracking-wider cursor-pointer transition-all ${isDarkMode ? 'bg-[#1E2532] text-slate-300 hover:bg-[#252E3D]' : 'bg-white text-slate-600 shadow-sm hover:shadow-md'}`}
                                >
                                    <option value="" className={isDarkMode ? 'bg-[#1E2532] text-white' : 'bg-white text-slate-800'}>All {filter.label}s</option>
                                    {filter.options.map((opt, idx) => (
                                        <option key={idx} value={opt} className={isDarkMode ? 'bg-[#1E2532] text-white' : 'bg-white text-slate-800'}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                        ))}

                        {(activeFilters.session || activeFilters.class_level || activeFilters.subject || activeFilters.target_exam || activeFilters.resource_type) && (
                            <button
                                onClick={() => { setActiveFilters({ session: '', class_level: '', subject: '', target_exam: '', resource_type: '' }); setCurrentPage(1); }}
                                className="px-4 py-2 bg-red-500/10 text-red-500 rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all ml-auto"
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className={`rounded-[5px] border shadow-2xl overflow-hidden transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                        <thead>
                            <tr className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-amber-50 text-amber-900/50'}`}>
                                <th className="py-5 px-6 text-center w-20">#</th>
                                <th className="py-5 px-6">Main Name</th>
                                <th className="py-5 px-6 text-center">Academic Links</th>
                                <th className="py-5 px-6 text-center">Subject Details</th>
                                <th className="py-5 px-6 text-center">Sections</th>
                                <th className="py-5 px-6 text-center">Resource Type</th>
                                <th className="py-5 px-6 text-center">View Resources</th>
                                <th className="py-5 px-6 text-center">Edit</th>
                                <th className="py-5 px-6 text-center">Delete</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={9} className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <Loader2 size={40} className="animate-spin text-amber-500" />
                                            <p className="font-bold text-lg opacity-50">Loading solutions...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedItems.length > 0 ? (
                                paginatedItems.map((item, index) => (
                                    <tr key={item.id} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                                        <td className="py-5 px-6 text-center">
                                            <span className={`text-sm font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{((currentPage - 1) * itemsPerPage) + index + 1}</span>
                                        </td>
                                        <td className="py-5 px-6">
                                            <span className="font-bold text-sm block">{item.name}</span>
                                            <span className="text-[10px] opacity-40 uppercase font-black">{new Date(item.created_at).toLocaleDateString()}</span>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="px-2 py-1 bg-white/5 rounded text-[10px] font-black uppercase text-amber-500">SES: {item.session_name || 'N/A'}</span>
                                                <span className="px-2 py-1 bg-white/5 rounded text-[10px] font-black uppercase text-slate-400">TGT: {item.target_exam_name || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-[10px] font-black uppercase"><span className="opacity-40">Class:</span> {item.class_name || 'N/A'}</span>
                                                <span className="text-[10px] font-black uppercase"><span className="opacity-40">Sub:</span> {item.subject_name || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex flex-wrap justify-center gap-1 max-w-[150px] mx-auto">
                                                {item.section_names && item.section_names.length > 0 ? (
                                                    item.section_names.map((name, i) => (
                                                        <span key={i} className="px-1.5 py-0.5 bg-slate-500/10 rounded text-[8px] font-black uppercase text-slate-500 border border-slate-500/20">{name}</span>
                                                    ))
                                                ) : <span className="text-[10px] opacity-30 italic">Global</span>}
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                {item.resource_type_dpp && <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase rounded-full border border-emerald-500/20">DPP</span>}
                                                {item.resource_type_rpp && <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[9px] font-black uppercase rounded-full border border-blue-500/20">RPP</span>}
                                                {item.resource_type_others && <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase rounded-full border border-amber-500/20">{item.other_resource_name || 'OTHER'}</span>}
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                {item.question_pdf && (
                                                    <button onClick={() => { setSelectedItemForView(item); setPdfToView('question'); setViewPage(1); setIsViewModalOpen(true); }} className="p-2 rounded-[5px] bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all tooltip" title="Question">
                                                        <Eye size={16} />
                                                    </button>
                                                )}
                                                {item.answer_pdf && (
                                                    <button onClick={() => { setSelectedItemForView(item); setPdfToView('answer'); setViewPage(1); setIsViewModalOpen(true); }} className="p-2 rounded-[5px] bg-blue-500/10 text-blue-500 hover:bg-blue-700 hover:text-white transition-all" title="Answer">
                                                        <Eye size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <button onClick={() => handleEditClick(item)} className="p-3 rounded-[5px] bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all active:scale-90">
                                                <Edit2 size={16} strokeWidth={2.5} />
                                            </button>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <button onClick={() => handleDeleteItem(item.id)} className="p-3 rounded-[5px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-90">
                                                <Trash2 size={16} strokeWidth={2.5} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="py-20 text-center text-slate-500 font-bold">No solutions found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Advanced Pagination Footer */}
                <div className={`p-8 border-t flex flex-col md:flex-row justify-between items-center gap-8 ${isDarkMode ? 'border-white/5 bg-black/20' : 'border-slate-100 bg-slate-50/50'}`}>
                    {/* Items Per Page */}
                    <div className="flex items-center gap-4 order-2 md:order-1">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">View</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                            className={`px-4 py-2 rounded-[5px] font-bold text-xs outline-none border-none cursor-pointer ${isDarkMode ? 'bg-[#1E2532] text-white' : 'bg-white text-slate-700 shadow-sm'}`}
                        >
                            {[10, 20, 50, 100].map(val => (
                                <option key={val} value={val} className={isDarkMode ? 'bg-[#1E2532] text-white' : 'bg-white text-slate-800'}>{val} per page</option>
                            ))}
                        </select>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">
                            Total: <span className="text-amber-500">{filteredItems.length}</span>
                        </span>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center gap-2 order-1 md:order-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(1)}
                            className="p-2 rounded-[5px] bg-white/5 hover:bg-amber-500 hover:text-white disabled:opacity-20 transition-all active:scale-90"
                        >
                            <ChevronsLeft size={18} strokeWidth={2.5} />
                        </button>
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="p-2 rounded-[5px] bg-white/5 hover:bg-amber-500 hover:text-white disabled:opacity-20 transition-all active:scale-90"
                        >
                            <ChevronLeft size={18} strokeWidth={2.5} />
                        </button>

                        <div className="flex items-center gap-1 mx-4">
                            <span className="text-sm font-black">Page</span>
                            <span className={`px-4 py-1.5 rounded-[5px] font-black text-sm ${isDarkMode ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-amber-500 text-white shadow-lg'}`}>
                                {currentPage}
                            </span>
                            <span className="text-sm font-black opacity-40">of {totalPages || 1}</span>
                        </div>

                        <button
                            disabled={currentPage === totalPages || totalPages === 0}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="p-2 rounded-[5px] bg-white/5 hover:bg-amber-500 hover:text-white disabled:opacity-20 transition-all active:scale-90"
                        >
                            <ChevronRight size={18} strokeWidth={2.5} />
                        </button>
                        <button
                            disabled={currentPage === totalPages || totalPages === 0}
                            onClick={() => setCurrentPage(totalPages)}
                            className="p-2 rounded-[5px] bg-white/5 hover:bg-amber-500 hover:text-white disabled:opacity-20 transition-all active:scale-90"
                        >
                            <ChevronsRight size={18} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Jump To */}
                    <div className="order-3">
                        <form onSubmit={handleJumpToPage} className="flex items-center gap-2">
                            <input
                                type="number"
                                placeholder="Jump to..."
                                value={jumpToPage}
                                onChange={(e) => setJumpToPage(e.target.value)}
                                className={`w-24 px-4 py-2 rounded-[5px] text-xs font-bold outline-none border transition-all ${isDarkMode ? 'bg-white/5 border-white/5 text-white focus:border-amber-500/50' : 'bg-white border-slate-200 text-slate-800'}`}
                            />
                            <button type="submit" className={`p-2 rounded-[5px] transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-amber-500' : 'bg-amber-50 hover:bg-amber-100 text-amber-600'}`}>
                                Go
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Combined Add/Edit Modal */}
            {(isAddModalOpen || isEditModalOpen) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 p-4">
                    <div className="w-full max-w-4xl overflow-hidden rounded-[5px] shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className={`flex-shrink-0 flex items-center justify-between px-8 py-4 text-white ${isEditModalOpen ? 'bg-blue-600' : 'bg-amber-600'}`}>
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight leading-none mb-1">{isEditModalOpen ? 'Edit Solution' : 'Add Solution'}</h3>
                                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Post new academic resources</p>
                            </div>
                            <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); resetForm(); }} className="p-2 hover:bg-white/20 rounded-[5px] transition-colors"><X size={24} strokeWidth={3} /></button>
                        </div>

                        {/* Body */}
                        <div className={`overflow-y-auto custom-scrollbar flex-grow p-6 ${isDarkMode ? 'bg-[#10141D]' : 'bg-white'}`}>
                            <form onSubmit={isEditModalOpen ? handleUpdateItem : handleAddItem} className="space-y-6">

                                {/* 1. Basic Info & Categories */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-50">Solution Item Name *</label>
                                            <input required type="text" placeholder="e.g. Maths Physics DPP 01" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className={`w-full px-5 py-3 rounded-[5px] border-2 outline-none font-bold transition-all ${isDarkMode ? 'bg-white/5 border-white/5 text-white focus:border-amber-500/50' : 'bg-slate-50 border-slate-100 focus:border-amber-500/50'}`} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-50">Resource Categories (Multiple)</label>
                                            <div className="flex flex-wrap gap-4 mt-1">
                                                <button type="button" onClick={() => setNewItem({ ...newItem, resource_type_dpp: !newItem.resource_type_dpp })} className={`flex items-center gap-2 px-4 py-2 rounded-[5px] transition-all font-bold text-xs uppercase ${newItem.resource_type_dpp ? 'bg-emerald-500 text-white' : (isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500')}`}>
                                                    {newItem.resource_type_dpp ? <CheckSquare size={16} /> : <Square size={16} />} DPP
                                                </button>
                                                <button type="button" onClick={() => setNewItem({ ...newItem, resource_type_rpp: !newItem.resource_type_rpp })} className={`flex items-center gap-2 px-4 py-2 rounded-[5px] transition-all font-bold text-xs uppercase ${newItem.resource_type_rpp ? 'bg-blue-500 text-white' : (isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500')}`}>
                                                    {newItem.resource_type_rpp ? <CheckSquare size={16} /> : <Square size={16} />} RPP
                                                </button>
                                                <div className="flex flex-col gap-2">
                                                    <button type="button" onClick={() => setNewItem({ ...newItem, resource_type_others: !newItem.resource_type_others })} className={`flex items-center gap-2 px-4 py-2 rounded-[5px] transition-all font-bold text-xs uppercase ${newItem.resource_type_others ? 'bg-amber-500 text-white' : (isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500')}`}>
                                                        {newItem.resource_type_others ? <CheckSquare size={16} /> : <Square size={16} />} Others
                                                    </button>
                                                    {newItem.resource_type_others && (
                                                        <input type="text" placeholder="Specify category" value={newItem.other_resource_name} onChange={(e) => setNewItem({ ...newItem, other_resource_name: e.target.value })} className={`px-4 py-2 rounded-[5px] border font-bold text-xs outline-none ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200'}`} />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-50">Overall Description</label>
                                        <textarea rows={2} placeholder="Brief details about this bundle" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} className={`w-full px-5 py-3 rounded-[5px] border-2 outline-none font-bold transition-all resize-none ${isDarkMode ? 'bg-white/5 border-white/5 text-white focus:border-amber-500/50' : 'bg-slate-50 border-slate-100 focus:border-amber-500/50'}`} />
                                    </div>
                                </div>

                                {/* 2. Academic Metadata (Dropdowns) */}
                                <div className="p-6 rounded-[5px] border-2 border-dashed border-white/5 space-y-4 bg-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                                        <h4 className="text-sm font-black uppercase tracking-[0.2em] opacity-80">Academic Metadata</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {[
                                            { label: 'Session', value: newItem.session, options: sessions, field: 'session' },
                                            { label: 'Class', value: newItem.class_level, options: classes, field: 'class_level' },
                                            { label: 'Subject', value: newItem.subject, options: subjects, field: 'subject' },
                                            { label: 'Exam Type', value: newItem.exam_type, options: examTypes, field: 'exam_type' },
                                            { label: 'Target Exam', value: newItem.target_exam, options: targetExams, field: 'target_exam' }
                                        ].map((sel, idx) => (
                                            <div key={idx} className="space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest ml-1 opacity-40">{sel.label}</label>
                                                <div className="relative">
                                                    <select
                                                        value={sel.value}
                                                        onChange={(e) => setNewItem({ ...newItem, [sel.field]: e.target.value })}
                                                        style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                                        className={`w-full pl-6 pr-12 py-3 rounded-[5px] border appearance-none outline-none font-bold text-sm transition-all focus:ring-4 focus:ring-amber-500/10 ${isDarkMode
                                                            ? 'bg-[#1a1f2e] border-white/5 text-white'
                                                            : 'bg-white border-slate-200 text-slate-800'
                                                            }`}
                                                    >
                                                        <option value="">Select {sel.label}</option>
                                                        {sel.options.map(opt => (
                                                            <option key={opt.id} value={opt.id}>
                                                                {opt.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" size={16} />
                                                </div>
                                            </div>
                                        ))}

                                        {/* CUSTOM MULTI-SELECT DROPDOWN FOR SECTIONS */}
                                        <div className="space-y-2 relative" ref={sectionDropdownRef}>
                                            <label className="text-[9px] font-black uppercase tracking-widest ml-1 opacity-40">Assign to SECTION</label>
                                            <button
                                                type="button"
                                                onClick={() => setIsSectionDropdownOpen(!isSectionDropdownOpen)}
                                                className={`w-full pl-6 pr-12 py-3 rounded-[5px] border outline-none font-bold text-sm transition-all text-left flex items-center justify-between focus:ring-4 focus:ring-amber-500/10 ${isDarkMode
                                                    ? 'bg-[#1e293b] border-white/5 text-white'
                                                    : 'bg-white border-slate-200 text-slate-800'
                                                    }`}
                                            >
                                                <span className="truncate">
                                                    {newItem.selectedSections.length === 0
                                                        ? 'Select SECTION'
                                                        : `${newItem.selectedSections.length} Sections Selected`}
                                                </span>
                                                <ChevronDown size={16} className={`transition-transform duration-300 ${isSectionDropdownOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            {isSectionDropdownOpen && (
                                                <div className={`absolute top-full left-0 right-0 z-[110] mt-2 rounded-[5px] border shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-300 ${isDarkMode
                                                    ? 'bg-[#1e293b] border-white/10 shadow-black/40'
                                                    : 'bg-white border-slate-100 shadow-slate-200'
                                                    }`}>
                                                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-2">
                                                        <div className="space-y-1">
                                                            {sections.length > 0 ? sections.map(sec => {
                                                                const isSelected = newItem.selectedSections.includes(sec.id);
                                                                return (
                                                                    <button
                                                                        key={sec.id}
                                                                        type="button"
                                                                        onClick={() => handleSectionToggle(sec.id)}
                                                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-[5px] text-xs font-bold transition-all ${isSelected
                                                                            ? 'bg-amber-500 text-white'
                                                                            : (isDarkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-slate-700')
                                                                            }`}
                                                                    >
                                                                        <span className="uppercase">{sec.name}</span>
                                                                        {isSelected && <Check size={14} strokeWidth={3} />}
                                                                        {!isSelected && <span className={`w-3.5 h-3.5 rounded-md border-2 ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`} />}
                                                                    </button>
                                                                );
                                                            }) : (
                                                                <div className="py-8 text-center opacity-30 text-[10px] font-bold uppercase">No sections available</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Dual Resource Upload (Question & Answer) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    {/* Question Part */}
                                    <div className="p-8 rounded-[5px] border-2 border-emerald-500/10 space-y-6 bg-emerald-500/5">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-black uppercase tracking-widest text-emerald-500">1. Question Resource</h4>
                                            <span className="text-[9px] font-bold opacity-40">STEP ONE</span>
                                        </div>
                                        <div className="space-y-4">
                                            <input type="text" placeholder="Question Title (e.g. Set A Question)" value={newItem.question_title} onChange={(e) => setNewItem({ ...newItem, question_title: e.target.value })} className={`w-full px-5 py-3 rounded-[5px] border outline-none font-bold text-xs ${isDarkMode ? 'bg-white/5 border-white/5 text-white' : 'bg-white border-slate-200'}`} />
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="relative h-24">
                                                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'question_thumbnail')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                                    <div className={`absolute inset-0 border-2 border-dashed rounded-[5px] overflow-hidden flex flex-col items-center justify-center gap-1 transition-all ${newItem.question_thumbnail || previews.question_thumbnail ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10'}`}>
                                                        {previews.question_thumbnail ? (
                                                            <>
                                                                <img src={previews.question_thumbnail} className="w-full h-full object-cover" alt="Preview" />
                                                                {previews.question_thumbnail !== PLACEHOLDER_IMAGE && (
                                                                    <button type="button" onClick={() => handleRemoveFile('question_thumbnail')} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-[5px] shadow-xl hover:bg-red-600 transition-all active:scale-90 z-20">
                                                                        <X size={12} strokeWidth={4} />
                                                                    </button>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <><Upload size={20} className="opacity-40" /><span className="text-[8px] font-black opacity-40 uppercase">Thumbnail</span></>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="relative h-24">
                                                    <input type="file" accept=".pdf" onChange={(e) => handleFileChange(e, 'question_pdf')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                                    <div className={`absolute inset-0 border-2 border-dashed rounded-[5px] overflow-hidden flex flex-col items-center justify-center gap-1 transition-all ${newItem.question_pdf || previews.question_pdf ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10'}`}>
                                                        {(newItem.question_pdf || previews.question_pdf) ? (
                                                            <>
                                                                <div className="flex flex-col items-center gap-2 p-2">
                                                                    <div className="w-10 h-10 bg-red-500 rounded-[5px] flex items-center justify-center shadow-lg shadow-red-500/20 animate-bounce">
                                                                        <span className="text-[10px] font-black text-white italic">PDF</span>
                                                                    </div>
                                                                    <span className="text-[7px] font-black uppercase text-emerald-500 truncate w-full text-center px-2">
                                                                        {newItem.question_pdf ? newItem.question_pdf.name : "Question Resource"}
                                                                    </span>
                                                                </div>
                                                                <button type="button" onClick={() => handleRemoveFile('question_pdf')} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-[5px] shadow-xl hover:bg-red-600 transition-all active:scale-90 z-20">
                                                                    <X size={12} strokeWidth={4} />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <><FileText size={20} className="opacity-40" /><span className="text-[8px] font-black opacity-40 uppercase">Question PDF</span></>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Answer Part */}
                                    <div className="p-8 rounded-[5px] border-2 border-blue-500/10 space-y-6 bg-blue-500/5">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-black uppercase tracking-widest text-blue-500">2. Answer Resource</h4>
                                            <span className="text-[9px] font-bold opacity-40">STEP TWO</span>
                                        </div>
                                        <div className="space-y-4">
                                            <input type="text" placeholder="Answer Title (e.g. Set A Answer Key)" value={newItem.answer_title} onChange={(e) => setNewItem({ ...newItem, answer_title: e.target.value })} className={`w-full px-5 py-3 rounded-[5px] border outline-none font-bold text-xs ${isDarkMode ? 'bg-white/5 border-white/5 text-white' : 'bg-white border-slate-200'}`} />
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="relative h-24">
                                                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'answer_thumbnail')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                                    <div className={`absolute inset-0 border-2 border-dashed rounded-[5px] overflow-hidden flex flex-col items-center justify-center gap-1 transition-all ${newItem.answer_thumbnail || previews.answer_thumbnail ? 'border-blue-500 bg-blue-500/10' : 'border-white/10'}`}>
                                                        {previews.answer_thumbnail ? (
                                                            <>
                                                                <img src={previews.answer_thumbnail} className="w-full h-full object-cover" alt="Preview" />
                                                                {previews.answer_thumbnail !== PLACEHOLDER_IMAGE && (
                                                                    <button type="button" onClick={() => handleRemoveFile('answer_thumbnail')} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-[5px] shadow-xl hover:bg-red-600 transition-all active:scale-90 z-20">
                                                                        <X size={12} strokeWidth={4} />
                                                                    </button>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <><Upload size={20} className="opacity-40" /><span className="text-[8px] font-black opacity-40 uppercase">Thumbnail</span></>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="relative h-24">
                                                    <input type="file" accept=".pdf" onChange={(e) => handleFileChange(e, 'answer_pdf')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                                    <div className={`absolute inset-0 border-2 border-dashed rounded-[5px] overflow-hidden flex flex-col items-center justify-center gap-1 transition-all ${newItem.answer_pdf || previews.answer_pdf ? 'border-blue-500 bg-blue-500/10' : 'border-white/10'}`}>
                                                        {(newItem.answer_pdf || previews.answer_pdf) ? (
                                                            <>
                                                                <div className="flex flex-col items-center gap-2 p-2">
                                                                    <div className="w-10 h-10 bg-red-500 rounded-[5px] flex items-center justify-center shadow-lg shadow-red-500/20 animate-bounce">
                                                                        <span className="text-[10px] font-black text-white italic">PDF</span>
                                                                    </div>
                                                                    <span className="text-[7px] font-black uppercase text-blue-500 truncate w-full text-center px-2">
                                                                        {newItem.answer_pdf ? newItem.answer_pdf.name : "Answer Resource"}
                                                                    </span>
                                                                </div>
                                                                <button type="button" onClick={() => handleRemoveFile('answer_pdf')} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-[5px] shadow-xl hover:bg-red-600 transition-all active:scale-90 z-20">
                                                                    <X size={12} strokeWidth={4} />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <><FileText size={20} className="opacity-40" /><span className="text-[8px] font-black opacity-40 uppercase">Answer PDF</span></>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" disabled={isActionLoading} className={`w-full py-3.5 rounded-[5px] font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 ${isEditModalOpen ? 'total-blue-700 bg-blue-600' : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30'}`}>
                                    {isActionLoading ? <Loader2 size={24} className="animate-spin" /> : <><RefreshCw size={20} /> {isEditModalOpen ? "Update Complete Solution" : "Save Solution Bundle"}</>}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Enhanced View Modal */}
            {isViewModalOpen && selectedItemForView && (
                <div className={`fixed z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 ${isFullScreen ? 'inset-0 p-0' : 'inset-0 p-4'}`}>
                    <div className={`transition-all duration-300 overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col ${isFullScreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl rounded-[5px] h-[85vh]'}`}>
                        {/* Header */}
                        <div className={`flex-shrink-0 flex items-center justify-between px-10 py-6 text-white ${pdfToView === 'question' ? 'bg-emerald-600' : 'bg-blue-600'} ${isFullScreen ? 'rounded-none' : ''}`}>
                            <div className="flex items-center gap-4">
                                {viewPage === 2 && (
                                    <button onClick={() => { if (isFullScreen) setIsFullScreen(false); setViewPage(1); }} className="p-2 hover:bg-white/20 rounded-[5px] transition-all flex items-center gap-2 group">
                                        <ChevronLeft size={20} strokeWidth={3} className="group-hover:-translate-x-1 transition-transform" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
                                    </button>
                                )}
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight leading-none mb-1">{pdfToView === 'question' ? 'Viewing Question' : 'Viewing Answer'}</h3>
                                    <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest truncate max-w-[400px]">{pdfToView === 'question' ? (selectedItemForView.question_title || selectedItemForView.name) : (selectedItemForView.answer_title || selectedItemForView.name)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {viewPage === 2 && (
                                    <>
                                        {isFullScreen ? (
                                            <button onClick={() => setIsFullScreen(false)} className="px-4 py-2 bg-white/20 rounded-[5px] text-xs font-bold active:scale-95"><Minimize2 size={16} strokeWidth={3} /></button>
                                        ) : (
                                            <button onClick={() => setIsFullScreen(true)} className="px-4 py-2 bg-white/20 rounded-[5px] text-xs font-bold active:scale-95"><Maximize2 size={16} strokeWidth={3} /></button>
                                        )}
                                        <button onClick={() => window.open(pdfToView === 'question' ? selectedItemForView.question_pdf : selectedItemForView.answer_pdf, '_blank')} className="p-2 hover:bg-white/20 rounded-[5px] transition-all"><ExternalLink size={20} strokeWidth={3} /></button>
                                    </>
                                )}
                                <button onClick={() => { setIsViewModalOpen(false); setSelectedItemForView(null); setIsFullScreen(false); }} className="p-2 hover:bg-white/20 rounded-[5px] transition-colors"><X size={24} strokeWidth={3} /></button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className={`flex-grow overflow-hidden flex flex-col ${isDarkMode ? 'bg-[#0f172a]' : 'bg-slate-50'}`}>
                            {viewPage === 1 ? (
                                <div className="flex flex-col lg:flex-row items-center justify-center h-full p-10 lg:p-16 gap-10 lg:gap-16 animate-in slide-in-from-right-8 duration-500 overflow-y-auto custom-scrollbar">
                                    <div className="relative group overflow-hidden rounded-[5px] shadow-2xl shadow-emerald-500/20 w-full max-w-[18rem] h-[24rem] lg:max-w-[20rem] lg:h-[28rem] border-[8px] border-white dark:border-white/5 flex-shrink-0 mt-5">
                                        <img src={pdfToView === 'question' ? (selectedItemForView.question_thumbnail || selectedItemForView.thumbnail || PLACEHOLDER_IMAGE) : (selectedItemForView.answer_thumbnail || selectedItemForView.thumbnail || PLACEHOLDER_IMAGE)} className="w-full h-full object-cover" alt="Preview" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                                    </div>
                                    <div className="flex flex-col items-center lg:items-start text-center lg:text-left max-w-xl">
                                        <div className="mb-6 w-full">
                                            <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border mb-4 inline-block ${pdfToView === 'question' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>Digital Resource</span>
                                            <h4 className={`text-3xl lg:text-5xl font-black uppercase tracking-tight mb-4 leading-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{pdfToView === 'question' ? (selectedItemForView.question_title || "Question Paper") : (selectedItemForView.answer_title || "Answer Key")}</h4>
                                            <div className={`w-20 h-2 rounded-full mb-6 lg:ml-0 mx-auto ${pdfToView === 'question' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                                        </div>
                                        <p className={`text-base font-medium mb-10 opacity-60 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{selectedItemForView.description || "No further details available for this document."}</p>
                                        <button onClick={() => setViewPage(2)} className={`px-10 py-5 text-white rounded-[5px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 flex items-center gap-4 group ring-4 ${pdfToView === 'question' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/40 ring-emerald-600/10' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/40 ring-blue-600/10'}`}>
                                            <FileText size={24} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                                            <span>Open PDF Reader</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className={`w-full h-full animate-in slide-in-from-right-8 duration-500 ${isFullScreen ? 'p-0' : 'p-4'}`}>
                                    <iframe src={pdfToView === 'question' ? selectedItemForView.question_pdf : selectedItemForView.answer_pdf} className={`w-full h-full bg-white ${isFullScreen ? 'rounded-none' : 'rounded-[5px]'}`} title="PDF Viewer" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SolutionRegistry;
