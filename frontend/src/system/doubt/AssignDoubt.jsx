import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Eye, UserPlus, Filter, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast, X, RotateCcw, CheckSquare, Square, Users, LayoutGrid } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Select from 'react-select';

const formatDuration = (start, end) => {
    if (!start || !end) return '-';
    const diffMs = Math.abs(end - start);
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
        return `${diffDays}d ${diffHours % 24}h`;
    }
    if (diffHours > 0) {
        return `${diffHours}h ${diffMins % 60}m`;
    }
    if (diffMins > 0) {
        return `${diffMins}m ${diffSecs % 60}s`;
    }
    return `${diffSecs}s`;
};

const AssignDoubt = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [activeTab, setActiveTab] = useState('Unassigned');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [selectedCenters, setSelectedCenters] = useState([]);
    const [sortOrder, setSortOrder] = useState({ value: 'newest', label: 'Newest First' });
    const [selectedDoubtIds, setSelectedDoubtIds] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [selectedExamTags, setSelectedExamTags] = useState([]);
    const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
    const [selectedTeachersForBulk, setSelectedTeachersForBulk] = useState([]);
    const [distributeEqually, setDistributeEqually] = useState(false);
    const [departmentTab, setDepartmentTab] = useState('Foundation');
    const [modalSearch, setModalSearch] = useState('');
    const [modalCentreFilter, setModalCentreFilter] = useState('');
    const [bulkDeptTab, setBulkDeptTab] = useState('Foundation');
    const [bulkSearch, setBulkSearch] = useState('');
    const [bulkCentreFilter, setBulkCentreFilter] = useState('');

    const customSelectStyles = {
        control: (provided, state) => ({
            ...provided,
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc',
            borderColor: state.isFocused 
                ? '#f97316' 
                : (isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9'),
            borderWidth: '2px',
            borderRadius: '5px',
            boxShadow: 'none',
            minHeight: '44px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 'bold',
            '&:hover': {
                borderColor: state.isFocused ? '#f97316' : (isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0'),
            }
        }),
        valueContainer: (provided) => ({
            ...provided,
            padding: '2px 12px',
        }),
        input: (provided) => ({
            ...provided,
            color: isDarkMode ? '#fff' : '#0f172a',
            margin: 0,
            padding: 0,
        }),
        placeholder: (provided) => ({
            ...provided,
            color: isDarkMode ? '#94a3b8' : '#64748b',
            fontSize: '0.75rem',
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
        }),
        singleValue: (provided) => ({
            ...provided,
            color: isDarkMode ? '#fff' : '#0f172a',
            fontSize: '0.75rem',
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
        }),
        multiValue: (provided) => ({
            ...provided,
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
            borderRadius: '4px',
        }),
        multiValueLabel: (provided) => ({
            ...provided,
            color: isDarkMode ? '#fff' : '#0f172a',
            fontSize: '0.70rem',
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            padding: '2px 6px',
        }),
        multiValueRemove: (provided) => ({
            ...provided,
            color: isDarkMode ? '#94a3b8' : '#64748b',
            ':hover': {
                backgroundColor: 'rgba(239,68,68,0.1)',
                color: '#ef4444',
            },
        }),
        menu: (provided) => ({
            ...provided,
            backgroundColor: isDarkMode ? '#10141D' : '#ffffff',
            border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 50,
            borderRadius: '5px',
        }),
        menuPortal: (provided) => ({
            ...provided,
            zIndex: 9999,
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected
                ? '#f97316'
                : state.isFocused
                    ? (isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc')
                    : 'transparent',
            color: state.isSelected
                ? '#fff'
                : (isDarkMode ? '#fff' : '#0f172a'),
            fontSize: '0.75rem',
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            cursor: 'pointer',
            '&:active': {
                backgroundColor: '#ea580c',
            }
        }),
        indicatorSeparator: () => ({ display: 'none' }),
        dropdownIndicator: (provided) => ({
            ...provided,
            color: isDarkMode ? '#94a3b8' : '#64748b',
            paddingRight: '8px',
            ':hover': {
                color: isDarkMode ? '#fff' : '#0f172a',
            }
        }),
        clearIndicator: (provided) => ({
            ...provided,
            color: isDarkMode ? '#94a3b8' : '#64748b',
            ':hover': {
                color: '#ef4444',
            }
        })
    };

    // Initial Data State (Only Unassigned Doubts initially)
    const [doubts, setDoubts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Map UI tab names to the status value the backend understands
    const TAB_STATUS_MAP = {
        'Unassigned': 'Unassigned',
        'Assign':     'Assign',
        'Solve':      'Resolved',
        'Rejected':   'Rejected',
    };

    const fetchDoubts = async (status) => {
        setLoading(true);
        try {
            const apiUrl = getApiUrl();
            const params = status ? `?status=${encodeURIComponent(status)}` : '';
            const response = await axios.get(`${apiUrl}/api/doubts/${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Map the data to the format expected by the table
            const mappedDoubts = response.data.map(d => {
                const rawClass = d.student_class || 'N/A';
                const cleanCls = rawClass.includes(' - ') ? rawClass.split(' - ')[0].trim() : rawClass;
                return {
                    id: d.id,
                    student: d.student_name,
                    studentId: d.student_id,
                    studentClass: rawClass,
                    cleanClass: cleanCls,
                    studentEmail: d.student_email || 'N/A',
                    admissionNumber: d.admission_number || 'N/A',
                    examTag: d.exam_tag || 'N/A',
                    subject: d.subject,
                    chapter: d.chapter,
                    topic: d.topic,
                    title: d.title,
                    date: d.created_at ? new Date(d.created_at).toLocaleString() : 'N/A',
                    status: d.status,
                    description: d.description,
                    image: d.image,
                    image2: d.image2,
                    image3: d.image3,
                    pdf: d.pdf,
                    voice_note: d.voice_note,
                    teacherName: d.teacher_name,
                    assignDate: d.assign_date ? new Date(d.assign_date).toLocaleString() : null,
                    solvedDate: d.resolved_at ? new Date(d.resolved_at).toLocaleString() : null,
                    rawAssignDate: d.assign_date ? new Date(d.assign_date) : null,
                    rawSolvedDate: d.resolved_at ? new Date(d.resolved_at) : null,
                    centreName: d.centre_name,
                    centreCode: d.centre_code,
                    rawDate: d.created_at ? new Date(d.created_at) : new Date(0),
                    teacherReply: d.teacher_reply,
                    replyImage: d.reply_image,
                    replyImage2: d.reply_image2,
                    replyImage3: d.reply_image3,
                    replyPdf: d.reply_pdf,
                    replyVoiceNote: d.reply_voice_note
                };
            });
            setDoubts(mappedDoubts);
        } catch (error) {
            console.error('Failed to fetch doubts:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch doubts whenever the active tab changes (server-side status filter)
    useEffect(() => {
        const status = TAB_STATUS_MAP[activeTab];
        fetchDoubts(status);
    }, [activeTab]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, activeTab, selectedSubjects, selectedCenters, sortOrder, itemsPerPage, selectedDate, selectedClasses, selectedExamTags]);

    const tabs = [
        { id: 'Unassigned', label: 'UN (ASSIGN/SOLVE DOUBTS)' },
        { id: 'Assign', label: 'ASSIGN DOUBTS' },
        { id: 'Solve', label: 'SOLVE DOUBTS' },
        { id: 'Rejected', label: 'REJECTED DOUBTS' }
    ];

    const filteredDoubts = doubts
        .filter(d =>
            (d.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
                d.subject.toLowerCase().includes(searchQuery.toLowerCase())) &&
            (activeTab === 'Solve' ? d.status === 'Resolved' : d.status === activeTab) &&
            (selectedSubjects.length === 0 || selectedSubjects.some(s => s.value === d.subject)) &&
            (selectedCenters.length === 0 || selectedCenters.some(c => c.value === d.centreName)) &&
            (selectedClasses.length === 0 || selectedClasses.some(c => c.value === d.cleanClass)) &&
            (selectedExamTags.length === 0 || selectedExamTags.some(t => t.value === d.examTag)) &&
            (!selectedDate || (() => {
                if (!(d.rawDate instanceof Date) || isNaN(d.rawDate)) return false;
                const yyyy = d.rawDate.getFullYear();
                const mm = String(d.rawDate.getMonth() + 1).padStart(2, '0');
                const dd = String(d.rawDate.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}` === selectedDate;
            })())
        )
        .sort((a, b) => {
            const timeA = a.rawDate instanceof Date && !isNaN(a.rawDate) ? a.rawDate.getTime() : 0;
            const timeB = b.rawDate instanceof Date && !isNaN(b.rawDate) ? b.rawDate.getTime() : 0;
            
            const sortVal = sortOrder ? sortOrder.value : 'newest';
            if (timeA !== timeB) {
                return sortVal === 'newest' ? timeB - timeA : timeA - timeB;
            }
            // Fallback to ID sorting if times are equal
            return sortVal === 'newest' ? b.id - a.id : a.id - b.id;
        });

    const subjectOptions = [...new Set(doubts.map(d => d.subject))].filter(Boolean).sort().map(s => ({ value: s, label: s }));
    const centerOptions = [...new Set(doubts.map(d => d.centreName))].filter(Boolean).sort().map(c => ({ value: c, label: c }));
    const classOptions = [...new Set(doubts.map(d => d.cleanClass))].filter(c => c && c !== 'N/A').sort((a, b) => {
        const numA = parseInt(a, 10);
        const numB = parseInt(b, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
    }).map(c => ({ value: c, label: `CLASS ${c}` }));
    const examTagOptions = [...new Set(doubts.map(d => d.examTag))].filter(t => t && t !== 'N/A').sort().map(t => ({ value: t, label: t }));
    const sortOptions = [
        { value: 'newest', label: 'Newest First' },
        { value: 'oldest', label: 'Oldest First' }
    ];

    const totalPages = Math.ceil(filteredDoubts.length / itemsPerPage);

    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedDoubtForAssignment, setSelectedDoubtForAssignment] = useState(null);
    const [selectedTeacher, setSelectedTeacher] = useState('');
    const [teachers, setTeachers] = useState([]);

    // Custom "Show Doubt" Modal State
    const [isShowDoubtModalOpen, setIsShowDoubtModalOpen] = useState(false);
    const [selectedDoubtForView, setSelectedDoubtForView] = useState(null);
    const [activePreview, setActivePreview] = useState(null);

    // Fetch ERP teachers when component mounts or modal opens
    useEffect(() => {
        const fetchTeachers = async () => {
            try {
                const apiUrl = getApiUrl();
                const activeToken = token || localStorage.getItem('auth_token');
                if (!activeToken) return;

                const response = await axios.get(`${apiUrl}/api/admin/erp-teachers/`, {
                    headers: { 'Authorization': `Bearer ${activeToken}` }
                });
                setTeachers(response.data);
            } catch (error) {
                console.error("Failed to fetch ERP teachers:", error);
            }
        };

        fetchTeachers();
    }, [getApiUrl, token]);

    const handleAssignClick = (doubt) => {
        setSelectedDoubtForAssignment(doubt);
        setIsAssignModalOpen(true);
    };

    const handleShowDoubtClick = (doubt) => {
        setSelectedDoubtForView(doubt);
        setIsShowDoubtModalOpen(true);
    }

    const handleCloseModal = () => {
        setIsAssignModalOpen(false);
        setSelectedDoubtForAssignment(null);
        setSelectedTeacher('');
        setIsShowDoubtModalOpen(false);
        setSelectedDoubtForView(null);
        setActivePreview(null);
    };

    const handleConfirmAssign = async () => {
        if (!selectedTeacher || !selectedDoubtForAssignment) return;

        const teacher = teachers.find(t => String(t.id) === String(selectedTeacher));
        const teacherName = teacher?.name || 'Teacher';

        try {
            const apiUrl = getApiUrl();
            await axios.patch(`${apiUrl}/api/doubts/${selectedDoubtForAssignment.id}/`, {
                status: 'Assign',
                teacher_name: teacherName,
                teacher_id: selectedTeacher,
                assign_date: new Date().toISOString()
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            fetchDoubts(TAB_STATUS_MAP[activeTab]);
            handleCloseModal();
        } catch (error) {
            console.error('Failed to assign doubt:', error);
            alert('Failed to assign doubt.');
        }
    };

    const handleRejectDoubt = async (doubtId) => {
        try {
            const apiUrl = getApiUrl();
            await axios.patch(`${apiUrl}/api/doubts/${doubtId}/`, {
                status: 'Rejected'
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchDoubts(TAB_STATUS_MAP[activeTab]);
        } catch (error) {
            console.error('Failed to reject doubt:', error);
        }
    };

    const handleRestoreDoubt = async (doubtId) => {
        try {
            const apiUrl = getApiUrl();
            await axios.patch(`${apiUrl}/api/doubts/${doubtId}/`, {
                status: 'Unassigned'
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchDoubts(TAB_STATUS_MAP[activeTab]);
        } catch (error) {
            console.error('Failed to restore doubt:', error);
        }
    };

    const toggleSelectAll = () => {
        if (selectedDoubtIds.length === filteredDoubts.length) {
            setSelectedDoubtIds([]);
        } else {
            setSelectedDoubtIds(filteredDoubts.map(d => d.id));
        }
    };

    const toggleSelectDoubt = (id) => {
        setSelectedDoubtIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleBulkConfirmAssign = async () => {
        if (selectedTeachersForBulk.length === 0 || selectedDoubtIds.length === 0) return;

        try {
            const apiUrl = getApiUrl();
            const doubtsToAssign = [...selectedDoubtIds];
            const teachersToUse = [...selectedTeachersForBulk];

            if (distributeEqually && teachersToUse.length > 1) {
                // Equal Distribution Logic
                const perTeacher = Math.ceil(doubtsToAssign.length / teachersToUse.length);
                
                const promises = [];
                for (let i = 0; i < teachersToUse.length; i++) {
                    const teacherId = teachersToUse[i];
                    const teacher = teachers.find(t => String(t.id) === String(teacherId));
                    const teacherName = teacher?.name || 'Teacher';
                    
                    const chunk = doubtsToAssign.slice(i * perTeacher, (i + 1) * perTeacher);
                    
                    chunk.forEach(doubtId => {
                        promises.push(axios.patch(`${apiUrl}/api/doubts/${doubtId}/`, {
                            status: 'Assign',
                            teacher_name: teacherName,
                            teacher_id: teacherId,
                            assign_date: new Date().toISOString()
                        }, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        }));
                    });
                }
                await Promise.all(promises);
            } else {
                // All to one or multiple teachers (all get all? no, usually bulk to one)
                // If not distributing equally, assign all to the FIRST selected teacher
                const teacherId = teachersToUse[0];
                const teacher = teachers.find(t => String(t.id) === String(teacherId));
                const teacherName = teacher?.name || 'Teacher';

                const promises = doubtsToAssign.map(doubtId => 
                    axios.patch(`${apiUrl}/api/doubts/${doubtId}/`, {
                        status: 'Assign',
                        teacher_name: teacherName,
                        teacher_id: teacherId,
                        assign_date: new Date().toISOString()
                    }, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                );
                await Promise.all(promises);
            }

            fetchDoubts(TAB_STATUS_MAP[activeTab]);
            setSelectedDoubtIds([]);
            setIsBulkAssignModalOpen(false);
            setSelectedTeachersForBulk([]);
        } catch (error) {
            console.error('Bulk assignment failed:', error);
            alert('Bulk assignment failed.');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
            <div className={`p-8 rounded-[5px] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                {/* Header & Tabs */}
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest rounded-[5px] shadow-lg shadow-orange-500/20">
                                    Doubt Management
                                </span>
                                <h2 className="text-3xl font-black tracking-tight uppercase">
                                    Assign <span className="text-orange-500">Doubts</span>
                                </h2>
                            </div>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Manage and assign student doubts to faculty.
                            </p>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-white/5 pb-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-3 text-xs font-black uppercase tracking-widest rounded-[5px] transition-all relative
                                    ${activeTab === tab.id
                                        ? (isDarkMode ? 'text-orange-400 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-orange-500' : 'text-orange-600 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-orange-600')
                                        : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Filters Row */}
                    <div className="flex flex-wrap gap-4 items-center relative w-full">
                        {/* Bulk Action Overlay */}
                        {selectedDoubtIds.length > 0 && (
                            <div className={`absolute inset-0 z-10 flex items-center justify-between px-6 rounded-[5px] animate-in slide-in-from-top-4 duration-300 ${isDarkMode ? 'bg-orange-500/20 backdrop-blur-md border border-orange-500/30' : 'bg-orange-50 border border-orange-200'}`}>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-black uppercase tracking-widest text-orange-500">
                                        {selectedDoubtIds.length} Doubts Selected
                                    </span>
                                    <button 
                                        onClick={() => setSelectedDoubtIds([])}
                                        className="text-xs font-bold underline opacity-50 hover:opacity-100 transition-opacity">
                                        Clear Selection
                                    </button>
                                </div>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setIsBulkAssignModalOpen(true)}
                                        className="px-6 py-2 bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-[5px] shadow-lg shadow-orange-600/20 hover:bg-orange-700 transition-all flex items-center gap-2">
                                        <Users size={14} />
                                        Bulk Assign
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="flex flex-row flex-nowrap gap-3 items-center w-full overflow-x-auto pb-3 custom-scrollbar">
                            <div className="relative group w-64 shrink-0">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search by student or subject..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={`w-full pl-14 pr-6 py-[9px] rounded-[5px] border-2 outline-none font-bold transition-all ${isDarkMode
                                        ? 'bg-white/5 border-white/5 text-white focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5'
                                        : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5'
                                        }`}
                                />
                            </div>

                            {/* Subject Filter */}
                            <div className="w-48 shrink-0">
                                <Select
                                    isMulti
                                    options={subjectOptions}
                                    value={selectedSubjects}
                                    onChange={(selected) => setSelectedSubjects(selected || [])}
                                    placeholder="ALL SUBJECTS"
                                    styles={customSelectStyles}
                                    classNamePrefix="react-select"
                                    menuPortalTarget={document.body}
                                />
                            </div>

                            {/* Center Filter */}
                            <div className="w-48 shrink-0">
                                <Select
                                    isMulti
                                    options={centerOptions}
                                    value={selectedCenters}
                                    onChange={(selected) => setSelectedCenters(selected || [])}
                                    placeholder="ALL CENTERS"
                                    styles={customSelectStyles}
                                    classNamePrefix="react-select"
                                    menuPortalTarget={document.body}
                                />
                            </div>

                            {/* Class Filter */}
                            <div className="w-44 shrink-0">
                                <Select
                                    isMulti
                                    options={classOptions}
                                    value={selectedClasses}
                                    onChange={(selected) => setSelectedClasses(selected || [])}
                                    placeholder="ALL CLASSES"
                                    styles={customSelectStyles}
                                    classNamePrefix="react-select"
                                    menuPortalTarget={document.body}
                                />
                            </div>

                            {/* Exam Tag Filter */}
                            <div className="w-48 shrink-0">
                                <Select
                                    isMulti
                                    options={examTagOptions}
                                    value={selectedExamTags}
                                    onChange={(selected) => setSelectedExamTags(selected || [])}
                                    placeholder="ALL EXAMS"
                                    styles={customSelectStyles}
                                    classNamePrefix="react-select"
                                    menuPortalTarget={document.body}
                                />
                            </div>

                            {/* Date Filter */}
                            <div className="relative w-40 shrink-0 flex items-center">
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className={`w-full px-4 py-[9px] pr-10 rounded-[5px] border-2 outline-none font-bold ${isDarkMode
                                        ? 'bg-white/5 border-white/5 text-white focus:border-orange-500/50'
                                        : 'bg-slate-50 border-slate-100 text-slate-855 focus:border-orange-500/50'
                                        }`}
                                />
                                {selectedDate && (
                                    <button
                                        onClick={() => setSelectedDate('')}
                                        className="absolute right-3 text-slate-400 hover:text-orange-500 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>

                            {/* Sort Filter */}
                            <div className="w-44 shrink-0">
                                <Select
                                    options={sortOptions}
                                    value={sortOrder}
                                    onChange={(selected) => setSortOrder(selected)}
                                    placeholder="SORT BY"
                                    styles={customSelectStyles}
                                    classNamePrefix="react-select"
                                    isSearchable={false}
                                    menuPortalTarget={document.body}
                                />
                            </div>

                            <button
                                onClick={() => fetchDoubts(TAB_STATUS_MAP[activeTab])}
                                className={`p-3 rounded-[5px] transition-all shrink-0 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-orange-400 border border-white/5' : 'bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-100'}`}>
                                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className={`rounded-[5px] border shadow-2xl overflow-hidden transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-orange-50 text-orange-900/50'}`}>
                                {activeTab === 'Assign' ? (
                                    <>
                                        <th className="py-4 px-2 text-center">Doubt No.</th>
                                        <th className="py-4 px-2 text-center">Student Name</th>
                                        <th className="py-4 px-2 text-center">Subject</th>
                                        <th className="py-4 px-2 text-center">Teacher Name</th>
                                        <th className="py-4 px-2 text-center">Assign Date</th>
                                        <th className="py-4 px-2 text-center">Action</th>
                                    </>
                                ) : activeTab === 'Solve' ? (
                                    <>
                                        <th className="py-4 px-2 text-center">Doubt No.</th>
                                        <th className="py-4 px-2 text-center">Student Name</th>
                                        <th className="py-4 px-2 text-center">Subject</th>
                                        <th className="py-4 px-2 text-center">Teacher Name</th>
                                        <th className="py-4 px-2 text-center">Solved Date</th>
                                        <th className="py-4 px-2 text-center">Time Taken</th>
                                        <th className="py-4 px-2 text-center">Action</th>
                                    </>
                                ) : activeTab === 'Rejected' ? (
                                    <>
                                        <th className="py-4 px-2 text-center">Doubt No.</th>
                                        <th className="py-4 px-2 text-center">Student Name</th>
                                        <th className="py-4 px-2 text-center">Subject</th>
                                        <th className="py-4 px-2 text-center">Show Doubt</th>
                                        <th className="py-4 px-2 text-center">Action</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="py-4 px-2 text-center w-12">
                                            <button onClick={toggleSelectAll} className="text-slate-400 hover:text-orange-500 transition-colors">
                                                {selectedDoubtIds.length === filteredDoubts.length && filteredDoubts.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                                            </button>
                                        </th>
                                        <th className="py-4 px-2 text-center">Doubt No.</th>
                                        <th className="py-4 px-2">Student Name</th>
                                        <th className="py-4 px-2">Class</th>
                                        <th className="py-4 px-2">Centre</th>
                                        <th className="py-4 px-2">Exam Tag</th>
                                        <th className="py-4 px-2">Subject</th>
                                        <th className="py-4 px-2">Date</th>
                                        <th className="py-4 px-2 text-center">Show Doubt</th>
                                        <th className="py-4 px-2 text-center">Assign To</th>
                                        <th className="py-4 px-2 text-center">Reject Doubt</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-4 px-2 text-center"><div className="h-4 w-4 mx-auto rounded bg-slate-100 dark:bg-white/5"></div></td>
                                        <td className="py-4 px-2 text-center">
                                            <div className={`h-4 w-4 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-4 px-2">
                                            <div className="flex flex-col gap-2">
                                                <div className={`h-4 w-32 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                <div className={`h-2.5 w-16 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                            </div>
                                        </td>
                                        {/* Class Loader */}
                                        <td className="py-4 px-2">
                                            <div className={`h-4 w-12 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        {/* Centre Loader */}
                                        <td className="py-4 px-2">
                                            <div className={`h-4 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        {/* Exam Tag Loader */}
                                        <td className="py-4 px-2">
                                            <div className={`h-4 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-4 px-2">
                                            <div className={`h-5 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-4 px-2">
                                            <div className={`h-4 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-4 px-2 text-center">
                                            <div className={`h-9 w-28 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-4 px-2 text-center">
                                            <div className={`h-9 w-28 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-4 px-2 text-center">
                                            <div className={`h-9 w-28 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredDoubts.length > 0 ? (
                                filteredDoubts
                                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                    .map((doubt) => (
                                    <tr key={doubt.id} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                                        {activeTab === 'Assign' || activeTab === 'Solve' ? (
                                            <>
                                                <td className="py-4 px-2 text-center">
                                                    <span className={`text-sm font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                        {doubt.id}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-2 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-bold text-sm tracking-tight uppercase">{doubt.student}</span>
                                                        <span className={`text-[10px] font-black opacity-40 uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>ID: {doubt.studentId || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-2 text-center">
                                                    <span className={`px-3 py-1 rounded-[5px] text-[11px] font-black uppercase tracking-wider ${isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                                        {doubt.subject}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-2 text-center">
                                                    <span className={`font-bold text-sm tracking-tight uppercase ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>{doubt.teacherName || '-'}</span>
                                                </td>
                                                <td className="py-4 px-2 text-center">
                                                    <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                        {activeTab === 'Assign' ? (doubt.assignDate || '-') : (doubt.solvedDate || '-')}
                                                    </span>
                                                </td>
                                                {activeTab === 'Solve' && (
                                                    <td className="py-4 px-2 text-center">
                                                        <span className={`text-xs font-black px-2.5 py-1 rounded-[5px] ${
                                                            isDarkMode ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-600 bg-emerald-50'
                                                        }`}>
                                                            {formatDuration(doubt.rawAssignDate, doubt.rawSolvedDate)}
                                                        </span>
                                                    </td>
                                                )}
                                                {activeTab === 'Assign' && (
                                                    <td className="py-4 px-2 text-center">
                                                        <button 
                                                            onClick={() => handleAssignClick(doubt)}
                                                            className="px-4 py-2 rounded-[5px] bg-orange-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-600/20 hover:bg-orange-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 mx-auto min-w-[100px]">
                                                            <span>Reassign</span>
                                                        </button>
                                                    </td>
                                                )}
                                                {activeTab === 'Solve' && (
                                                    <td className="py-4 px-2 text-center">
                                                        <button 
                                                            onClick={() => handleShowDoubtClick(doubt)}
                                                            className="px-4 py-2 rounded-[5px] bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 mx-auto min-w-[100px]">
                                                            <span>View Detail</span>
                                                        </button>
                                                    </td>
                                                )}
                                            </>
                                        ) : activeTab === 'Rejected' ? (
                                            <>
                                                <td className="py-4 px-2 text-center">
                                                    <span className={`text-sm font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                        {doubt.id}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-2 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-bold text-sm tracking-tight uppercase">{doubt.student}</span>
                                                        <span className={`text-[10px] font-black opacity-40 uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>ID: {doubt.studentId || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-2 text-center">
                                                    <span className={`px-3 py-1 rounded-[5px] text-[11px] font-black uppercase tracking-wider ${isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                                        {doubt.subject}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-2 text-center">
                                                    <button
                                                        onClick={() => handleShowDoubtClick(doubt)}
                                                        className="px-4 py-3 rounded-[5px] bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto min-w-[120px]">
                                                        <Eye size={14} strokeWidth={3} />
                                                        <span>Show Doubt</span>
                                                    </button>
                                                </td>
                                                <td className="py-4 px-2 text-center">
                                                    <button
                                                        onClick={() => handleRestoreDoubt(doubt.id)}
                                                        className="px-4 py-3 rounded-[5px] bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto min-w-[120px]">
                                                        <RotateCcw size={14} strokeWidth={3} />
                                                        <span>Redo / Restore</span>
                                                    </button>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="py-4 px-2 text-center">
                                                    <button 
                                                        onClick={() => toggleSelectDoubt(doubt.id)}
                                                        className={`transition-colors ${selectedDoubtIds.includes(doubt.id) ? 'text-orange-500' : 'text-slate-400 hover:text-slate-300'}`}>
                                                        {selectedDoubtIds.includes(doubt.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                                    </button>
                                                </td>
                                                <td className="py-4 px-2 text-center">
                                                    <span className={`text-sm font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                        {doubt.id}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-2">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm tracking-tight uppercase">{doubt.student}</span>
                                                        <span className={`text-[10px] font-black opacity-40 uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>ID: {doubt.studentId || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                {/* Class */}
                                                <td className="py-4 px-2">
                                                    <span className={`px-3 py-1 rounded-[5px] text-[11px] font-black uppercase tracking-wider ${isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                                        {doubt.cleanClass}
                                                    </span>
                                                </td>
                                                {/* Centre */}
                                                <td className="py-4 px-2">
                                                    <span className={`px-3 py-1 rounded-[5px] text-[11px] font-black uppercase tracking-wider ${isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                                        {doubt.centreName || 'N/A'}
                                                    </span>
                                                </td>
                                                {/* Exam Tag */}
                                                <td className="py-4 px-2">
                                                    <span className={`px-3 py-1 rounded-[5px] text-[11px] font-black uppercase tracking-wider ${isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                                        {doubt.examTag || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-2">
                                                    <span className={`px-3 py-1 rounded-[5px] text-[11px] font-black uppercase tracking-wider ${isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                                        {doubt.subject}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-2">
                                                    <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                        {doubt.date}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-2 text-center">
                                                    <button
                                                        onClick={() => handleShowDoubtClick(doubt)}
                                                        className="px-4 py-3 rounded-[5px] bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto min-w-[120px]">
                                                        <Eye size={14} strokeWidth={3} />
                                                        <span>Show Doubt</span>
                                                    </button>
                                                </td>
                                                <td className="py-4 px-2 text-center">
                                                    <button
                                                        onClick={() => handleAssignClick(doubt)}
                                                        className="px-4 py-3 rounded-[5px] bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto min-w-[120px]"
                                                    >
                                                        <UserPlus size={14} strokeWidth={3} />
                                                        <span>Assign To</span>
                                                    </button>
                                                </td>
                                                <td className="py-4 px-2 text-center">
                                                    <button
                                                        onClick={() => handleRejectDoubt(doubt.id)}
                                                        className="px-4 py-3 rounded-[5px] bg-red-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto min-w-[120px]">
                                                        <X size={14} strokeWidth={3} />
                                                        <span>Reject</span>
                                                    </button>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={activeTab === 'Assign' ? 6 : activeTab === 'Solve' ? 7 : activeTab === 'Rejected' ? 5 : 10} className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4 opacity-50">
                                            <AlertCircle size={48} className={isDarkMode ? 'text-slate-700' : 'text-slate-300'} />
                                            <p className="font-bold text-lg">No doubts found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Simplified Pagination */}
                <div className={`p-6 border-t flex flex-col md:flex-row items-center justify-between gap-4 ${isDarkMode ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'}`}>
                    <div className="flex flex-wrap items-center gap-4">
                        <span className="text-xs font-bold opacity-50">Showing {filteredDoubts.length} entries</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold opacity-50">Show</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className={`px-2 py-1.5 text-xs font-bold rounded-[5px] border outline-none ${isDarkMode ? 'bg-slate-800 border-white/10 text-white focus:border-orange-500' : 'bg-white border-slate-200 text-slate-850 focus:border-orange-500'}`}
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span className="text-xs font-bold opacity-50">entries per page</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold opacity-50">Page {currentPage} of {totalPages || 1}</span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1} 
                                className="p-2 rounded-[5px] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button 
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage >= totalPages} 
                                className="p-2 rounded-[5px] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>


            {/* Assign Teacher Modal */}
            {isAssignModalOpen && (() => {
                const doubt = selectedDoubtForAssignment;
                const doubtSubject = (doubt?.subject || '').toLowerCase();
                const doubtCentre  = (doubt?.centreName || '').toLowerCase();

                // Helper: parse teacherDepartment which may be "['All India']" or array
                const parseDept = (raw) => {
                    if (!raw) return [];
                    if (Array.isArray(raw)) return raw.map(s => String(s).trim());
                    const str = String(raw).trim();
                    if (str.startsWith('[') && str.endsWith(']')) {
                        try {
                            const parsed = JSON.parse(str.replace(/'/g, '"'));
                            if (Array.isArray(parsed)) return parsed.map(s => String(s).trim());
                        } catch {}
                    }
                    return [str];
                };

                // Helper: fuzzy subject match
                const isMath = s => s.includes('math') || s.includes('mat');
                const isBio  = s => s.includes('bio');
                const subjectMatches = (teacherSubject) => {
                    let match = teacherSubject.includes(doubtSubject) || doubtSubject.includes(teacherSubject);
                    if (!match && isMath(doubtSubject) && isMath(teacherSubject)) match = true;
                    if (!match && isBio(doubtSubject)  && isBio(teacherSubject))  match = true;
                    return match;
                };

                // 1. Only Full Time teachers
                const fullTimeTeachers = teachers.filter(t => {
                    const type = (t.teacherType || t.qualification || '').toLowerCase();
                    return type.includes('full');
                });

                // 2. Subject match
                const subjectFiltered = fullTimeTeachers.filter(t =>
                    subjectMatches((t.subject_name || t.subject || '').toLowerCase())
                );

                // 3. Split by department
                const getDeptGroup = (t, keyword) => {
                    const depts = parseDept(t.teacherDepartment);
                    const hasCombo = depts.some(d => d.toLowerCase().includes('all-india + fnd'));
                    
                    if (keyword === 'All-India + FND') return hasCombo;
                    
                    if (keyword === 'Foundation') {
                        return depts.some(d => !d.toLowerCase().includes('all-india + fnd') && (d.toLowerCase().includes('foundation') || d.toLowerCase().includes('fnd')));
                    }
                    if (keyword === 'All India') {
                        return depts.some(d => !d.toLowerCase().includes('all-india + fnd') && (d.toLowerCase().includes('all india') || d.toLowerCase().includes('all-india')));
                    }
                    return depts.some(d => d.toLowerCase().includes(keyword.toLowerCase()));
                };

                const foundationTeachers = subjectFiltered.filter(t => getDeptGroup(t, 'Foundation'));
                const allIndiaTeachers   = subjectFiltered.filter(t => getDeptGroup(t, 'All India'));
                const allIndiaFndTeachers = subjectFiltered.filter(t => getDeptGroup(t, 'All-India + FND'));

                // Available tabs (only show if teachers exist)
                const availableTabs = [];
                if (foundationTeachers.length > 0) availableTabs.push('Foundation');
                if (allIndiaTeachers.length > 0)   availableTabs.push('All India');
                if (allIndiaFndTeachers.length > 0) availableTabs.push('All-India + FND');

                // Active list based on selected tab
                let rawActiveList = [];
                if (departmentTab === 'Foundation') rawActiveList = foundationTeachers;
                else if (departmentTab === 'All India') rawActiveList = allIndiaTeachers;
                else if (departmentTab === 'All-India + FND') rawActiveList = allIndiaFndTeachers;

                // 4. Apply modal search + centre filter
                const activeList = rawActiveList.filter(t => {
                    const nameMatch = !modalSearch.trim() ||
                        (t.name || '').toLowerCase().includes(modalSearch.toLowerCase()) ||
                        (t.subject_name || t.subject || '').toLowerCase().includes(modalSearch.toLowerCase());
                    const centreMatch = !modalCentreFilter ||
                        (t.centres || []).some(c => c.toLowerCase().includes(modalCentreFilter.toLowerCase()));
                    return nameMatch && centreMatch;
                });

                // Build unique centre options from the raw (unfiltered) active tab list
                const modalCentreOptions = [...new Set(
                    rawActiveList.flatMap(t => t.centres || [])
                )].sort();

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className={`w-full max-w-lg mx-4 overflow-hidden rounded-[5px] shadow-2xl animate-in zoom-in-95 duration-200 border ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200'}`}>

                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-5 bg-orange-500 text-white">
                                <div>
                                    <h3 className="text-base font-black uppercase tracking-widest">Assign Teacher</h3>
                                    <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mt-0.5">
                                        {doubt?.subject} — {doubt?.student}
                                    </p>
                                    {(doubt?.centreName && doubt.centreName !== 'N/A' || (doubt?.examTag && doubt.examTag !== 'N/A')) && (
                                        <p className="text-[10px] font-black opacity-90 uppercase tracking-widest mt-1 flex items-center gap-2">
                                            {doubt?.centreName && doubt.centreName !== 'N/A' && (
                                                <span className="flex items-center gap-1">
                                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/60"></span>
                                                    {doubt.centreName}
                                                </span>
                                            )}
                                            {doubt?.examTag && doubt.examTag !== 'N/A' && (
                                                <span className="px-2 py-0.5 rounded bg-white/20 text-white text-[8px] font-black tracking-widest">
                                                    {doubt.examTag}
                                                </span>
                                            )}
                                        </p>
                                    )}
                                </div>
                                <button onClick={handleCloseModal} className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
                                    <X size={20} strokeWidth={2.5} />
                                </button>
                            </div>

                            {/* Department Tabs */}
                            {availableTabs.length > 0 && (
                                <div className={`flex border-b ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                                    {availableTabs.map(tab => {
                                        const count = tab === 'Foundation' ? foundationTeachers.length :
                                                      tab === 'All India' ? allIndiaTeachers.length :
                                                      allIndiaFndTeachers.length;
                                        const isActive = departmentTab === tab;
                                        return (
                                            <button
                                                key={tab}
                                                onClick={() => {
                                                    setDepartmentTab(tab);
                                                    setModalSearch('');
                                                    setModalCentreFilter('');
                                                    setSelectedTeacher(null);
                                                }}
                                                className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center justify-center gap-2 ${
                                                    isActive
                                                        ? 'border-orange-500 text-orange-500 bg-orange-500/5'
                                                        : isDarkMode
                                                            ? 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                                }`}
                                            >
                                                {tab}
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                    isActive 
                                                        ? 'bg-orange-500/20 text-orange-500' 
                                                        : isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-200 text-slate-500'
                                                }`}>
                                                    {count}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Search + Centre Filter Bar */}
                            {availableTabs.length > 0 && (
                                <div className={`px-4 py-3 flex gap-2 border-b ${isDarkMode ? 'border-white/5 bg-white/[0.01]' : 'border-slate-100 bg-slate-50/60'}`}>
                                    {/* Search */}
                                    <div className="relative flex-1">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        <input
                                            type="text"
                                            placeholder="Search teacher name..."
                                            value={modalSearch}
                                            onChange={e => setModalSearch(e.target.value)}
                                            className={`w-full pl-8 pr-8 py-2 text-[11px] font-bold rounded-[5px] border outline-none transition-all ${
                                                isDarkMode
                                                    ? 'bg-white/5 border-white/10 text-white placeholder-slate-600 focus:border-orange-500/50'
                                                    : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-orange-400'
                                            }`}
                                        />
                                        {modalSearch && (
                                            <button onClick={() => setModalSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-500 transition-colors">
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                    {/* Centre Filter */}
                                    <div className="relative">
                                        <select
                                            value={modalCentreFilter}
                                            onChange={e => setModalCentreFilter(e.target.value)}
                                            className={`appearance-none pl-3 pr-7 py-2 text-[11px] font-bold rounded-[5px] border outline-none transition-all min-w-[110px] ${
                                                modalCentreFilter
                                                    ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                                                    : isDarkMode
                                                        ? 'bg-white/5 border-white/10 text-slate-300 focus:border-orange-500/50'
                                                        : 'bg-white border-slate-200 text-slate-700 focus:border-orange-400'
                                            }`}
                                        >
                                            <option value="">All Centres</option>
                                            {modalCentreOptions.map((c, i) => (
                                                <option key={i} value={c}>{c.replace(/_/g, ' ')}</option>
                                            ))}
                                        </select>
                                        <Filter size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            )}

                            {/* Teacher List */}
                            <div className={`p-4 max-h-72 overflow-y-auto custom-scrollbar space-y-2`}>
                                {availableTabs.length === 0 ? (
                                    <div className="py-10 text-center opacity-40 space-y-2">
                                        <AlertCircle size={32} className="mx-auto" />
                                        <p className="text-xs font-black uppercase tracking-widest">No full-time teachers match this subject</p>
                                        <p className="text-[10px] font-bold opacity-60">Subject: {doubt?.subject}</p>
                                    </div>
                                ) : activeList.length === 0 ? (
                                    <div className="py-10 text-center opacity-40 space-y-2">
                                        <AlertCircle size={32} className="mx-auto" />
                                        <p className="text-xs font-black uppercase tracking-widest">No {departmentTab} teachers for this subject</p>
                                    </div>
                                ) : (
                                    activeList.map(t => {
                                        const isSelected = String(selectedTeacher) === String(t.id);
                                        const depts = parseDept(t.teacherDepartment);
                                        return (
                                            <button
                                                key={t.id}
                                                onClick={() => setSelectedTeacher(String(t.id))}
                                                className={`w-full text-left p-4 rounded-[5px] border-2 transition-all ${
                                                    isSelected
                                                        ? 'border-orange-500 bg-orange-500/10'
                                                        : isDarkMode
                                                            ? 'border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/5'
                                                            : 'border-slate-100 bg-slate-50 hover:border-orange-300 hover:bg-orange-50/30'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <div className={`w-9 h-9 shrink-0 rounded-[5px] flex items-center justify-center font-black text-sm border-2 ${
                                                            isSelected
                                                                ? 'bg-orange-500 text-white border-orange-400'
                                                                : isDarkMode ? 'bg-white/5 text-orange-400 border-white/10' : 'bg-orange-50 text-orange-500 border-orange-100'
                                                        }`}>
                                                            {(t.name || 'T').charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className={`text-xs font-black uppercase tracking-tight truncate ${isSelected ? 'text-orange-500' : ''}`}>
                                                                {t.name}
                                                            </p>
                                                            <p className={`text-[10px] font-bold opacity-50 uppercase truncate`}>
                                                                {t.subject_name || t.subject}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                                        {depts.map((d, i) => (
                                                            <span key={i} className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                                                (d.toLowerCase().includes('all india') || d.toLowerCase().includes('all-india'))
                                                                    ? 'bg-blue-500/15 text-blue-400'
                                                                    : 'bg-purple-500/15 text-purple-400'
                                                            }`}>{d}</span>
                                                        ))}
                                                        {t.centres?.length > 0 && (
                                                            <span className={`text-[8px] font-bold opacity-40 uppercase`}>
                                                                {t.centres.slice(0, 2).join(', ')}{t.centres.length > 2 ? '…' : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>

                            {/* Footer */}
                            <div className={`px-5 py-4 border-t flex items-center gap-3 ${isDarkMode ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'}`}>
                                {selectedTeacher && (() => {
                                    const sel = teachers.find(t => String(t.id) === String(selectedTeacher));
                                    return sel ? (
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 flex-1 truncate">
                                            ✓ {sel.name}
                                        </p>
                                    ) : null;
                                })()}
                                <button
                                    onClick={handleConfirmAssign}
                                    disabled={!selectedTeacher}
                                    className={`ml-auto px-8 py-2.5 rounded-[5px] font-black uppercase tracking-widest text-[11px] shadow-lg transition-all active:scale-95 ${
                                        selectedTeacher
                                            ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/30'
                                            : isDarkMode ? 'bg-white/5 text-slate-600 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                                >
                                    Assign
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Show Doubt Modal */}
            {isShowDoubtModalOpen && selectedDoubtForView && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 pt-32 overflow-y-auto">
                    <div className="w-full max-w-4xl mx-4 mb-12 overflow-hidden rounded-[5px] shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-8 py-6 bg-orange-500 text-white">
                            <div className="space-y-1">
                                <h3 className="text-xl font-black tracking-tight uppercase">Doubt Details At A Glance</h3>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Case #{selectedDoubtForView.id}</p>
                            </div>
                            <button onClick={handleCloseModal} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                <X size={24} strokeWidth={3} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className={`p-8 space-y-8 ${isDarkMode ? 'bg-[#10141D] text-slate-200' : 'bg-white text-slate-700'}`}>
                            
                            {/* Top Row: Academic Context */}
                            <div className="grid grid-cols-4 gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subject</p>
                                    <p className="font-black text-sm uppercase text-orange-500">{selectedDoubtForView.subject}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Exam Tag</p>
                                    <p className="font-black text-sm uppercase">{selectedDoubtForView.examTag}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Topic</p>
                                    <p className="font-black text-sm uppercase truncate">{selectedDoubtForView.topic || 'General'}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Posted On</p>
                                    <p className="font-black text-sm uppercase opacity-60">{selectedDoubtForView.date}</p>
                                </div>
                            </div>

                            {/* Student Identity Block */}
                            <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Student Profile</p>
                                <div className="grid grid-cols-4 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest">Name</p>
                                        <p className="font-black text-sm uppercase">{selectedDoubtForView.student}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest">Enrollment No.</p>
                                        <p className="font-black text-sm uppercase text-orange-500">{selectedDoubtForView.admissionNumber}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest">Class / Level</p>
                                        <p className="font-black text-sm uppercase">{selectedDoubtForView.studentClass}</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest">Email Address</p>
                                        <p className="font-black text-sm lowercase">{selectedDoubtForView.studentEmail}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 rounded-[5px] border border-orange-500/10 bg-orange-500/5">
                                <h4 className="text-sm font-black uppercase tracking-tight mb-3 text-orange-500">{selectedDoubtForView.title || 'Doubt Description'}</h4>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                    {selectedDoubtForView.description}
                                </p>
                            </div>

                            {/* Multimedia Attachments & Previews */}
                            <div className="space-y-8">
                                <div className="grid grid-cols-2 gap-8">
                                    {/* Left: Attachment List */}
                                    <div className="space-y-6">
                                        {/* Images Gallery */}
                                        {(selectedDoubtForView.image || selectedDoubtForView.image2 || selectedDoubtForView.image3) && (
                                            <div className="space-y-3">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Attachments (Click to preview)</p>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {[selectedDoubtForView.image, selectedDoubtForView.image2, selectedDoubtForView.image3].map((img, i) => img && (
                                                        <button 
                                                            key={i} 
                                                            onClick={() => setActivePreview({ url: img, type: 'image' })}
                                                            className={`group relative aspect-video rounded-[5px] overflow-hidden border transition-all shadow-md ${activePreview?.url === img ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-white/10 hover:border-orange-500/50'}`}
                                                        >
                                                            <img src={img} alt={`Attachment ${i+1}`} className="w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* PDF & Audio */}
                                        <div className="space-y-4">
                                            {selectedDoubtForView.pdf && (
                                                <div className="space-y-3">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Documents</p>
                                                    <button 
                                                        onClick={() => setActivePreview({ url: selectedDoubtForView.pdf, type: 'pdf' })}
                                                        className={`w-full flex items-center gap-4 p-4 rounded-[5px] border transition-all group ${activePreview?.type === 'pdf' ? 'bg-red-500/10 border-red-500' : 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10'}`}>
                                                        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 font-black text-xs">PDF</div>
                                                        <div className="flex-1 text-left min-w-0">
                                                            <p className="text-xs font-bold truncate text-red-500">View PDF Document</p>
                                                            <p className="text-[10px] opacity-50 font-medium uppercase tracking-widest">Click to preview below</p>
                                                        </div>
                                                        <Eye size={16} className="text-red-500 group-hover:scale-110 transition-transform" />
                                                    </button>
                                                </div>
                                            )}

                                            {selectedDoubtForView.voice_note && (
                                                <div className="space-y-3">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Voice Note</p>
                                                    <div className="p-4 rounded-[5px] border border-blue-500/20 bg-blue-500/5">
                                                        <audio controls className="w-full h-10 custom-audio-player">
                                                            <source src={selectedDoubtForView.voice_note} type="audio/mpeg" />
                                                        </audio>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Live Previewer */}
                                    <div className="flex flex-col">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Live Preview</p>
                                        <div className={`flex-1 min-h-[300px] rounded-[5px] border overflow-hidden flex items-center justify-center ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                            {activePreview ? (
                                                activePreview.type === 'image' ? (
                                                    <img src={activePreview.url} alt="Preview" className="max-w-full max-h-full object-contain animate-in fade-in zoom-in-95 duration-300" />
                                                ) : (
                                                    <iframe 
                                                        src={`${activePreview.url}#toolbar=0`} 
                                                        className="w-full h-full border-none"
                                                        title="PDF Preview"
                                                    />
                                                )
                                            ) : (
                                                <div className="text-center space-y-2 opacity-30">
                                                    <Eye size={32} className="mx-auto" />
                                                    <p className="text-[10px] font-bold uppercase tracking-widest">Select an attachment<br/>to preview</p>
                                                </div>
                                            )}
                                        </div>
                                        {activePreview && (
                                        <div className="mt-3 flex justify-end">
                                                <a href={activePreview.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase tracking-widest text-orange-500 hover:underline flex items-center gap-1">
                                                    Open in new tab <ChevronRight size={10} />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Teacher's Solution Section */}
                            {selectedDoubtForView.status === 'Resolved' && (
                                <div className={`p-6 rounded-[5px] border-2 border-emerald-500/20 bg-emerald-500/5 space-y-6 mt-8`}>
                                    <div className="flex justify-between items-center border-b border-emerald-500/10 pb-3">
                                        <h4 className="font-black text-sm uppercase text-emerald-500 tracking-tight flex items-center gap-2">
                                            Teacher's Solution
                                        </h4>
                                        <p className="text-[10px] font-black uppercase text-slate-400">
                                            Solved by: <span className="text-emerald-500 font-bold">{selectedDoubtForView.teacherName}</span>
                                        </p>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Explanation</p>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                            {selectedDoubtForView.teacherReply || 'No text explanation provided.'}
                                        </p>
                                    </div>

                                    {/* Solution Attachments Grid */}
                                    {(selectedDoubtForView.replyImage || selectedDoubtForView.replyImage2 || selectedDoubtForView.replyImage3 || selectedDoubtForView.replyPdf || selectedDoubtForView.replyVoiceNote) && (
                                        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-emerald-500/10">
                                            <div className="space-y-4">
                                                {/* Images */}
                                                {(selectedDoubtForView.replyImage || selectedDoubtForView.replyImage2 || selectedDoubtForView.replyImage3) && (
                                                    <div className="space-y-2">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Solution Images</p>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {[selectedDoubtForView.replyImage, selectedDoubtForView.replyImage2, selectedDoubtForView.replyImage3].map((img, i) => img && (
                                                                <button 
                                                                    key={i} 
                                                                    onClick={() => setActivePreview({ url: img, type: 'image' })}
                                                                    className={`group relative aspect-video rounded-[5px] overflow-hidden border transition-all shadow-md ${activePreview?.url === img ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-white/10 hover:border-emerald-500/50'}`}
                                                                >
                                                                    <img src={img} alt={`Solution Attachment ${i+1}`} className="w-full h-full object-cover" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {/* PDF */}
                                                {selectedDoubtForView.replyPdf && (
                                                    <div className="space-y-2">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Solution Document</p>
                                                        <button 
                                                            onClick={() => setActivePreview({ url: selectedDoubtForView.replyPdf, type: 'pdf' })}
                                                            className={`w-full flex items-center gap-3 p-3 rounded-[5px] border transition-all group ${activePreview?.type === 'pdf' ? 'bg-red-500/10 border-red-500' : 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10'}`}>
                                                            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 font-black text-[10px]">PDF</div>
                                                            <div className="flex-1 text-left min-w-0">
                                                                <p className="text-[11px] font-bold truncate text-red-500">View Solution PDF</p>
                                                            </div>
                                                            <Eye size={14} className="text-red-500 group-hover:scale-110 transition-transform" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Audio */}
                                            {selectedDoubtForView.replyVoiceNote && (
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Voice Explanation</p>
                                                    <div className="p-3 rounded-[5px] border border-blue-500/20 bg-blue-500/5">
                                                        <audio controls className="w-full h-10 custom-audio-player">
                                                            <source src={selectedDoubtForView.replyVoiceNote} type="audio/mpeg" />
                                                        </audio>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Assign Modal */}
            {isBulkAssignModalOpen && (() => {
                const selectedDoubts = doubts.filter(d => selectedDoubtIds.includes(d.id));

                // Helper: parse teacherDepartment
                const parseDeptB = (raw) => {
                    if (!raw) return [];
                    if (Array.isArray(raw)) return raw.map(s => String(s).trim());
                    const str = String(raw).trim();
                    if (str.startsWith('[') && str.endsWith(']')) {
                        try {
                            const parsed = JSON.parse(str.replace(/'/g, '"'));
                            if (Array.isArray(parsed)) return parsed.map(s => String(s).trim());
                        } catch {}
                    }
                    return [str];
                };

                // Normalize subjects for matching
                const normalizeSubject = (s) => {
                    const val = (s || '').toLowerCase().trim();
                    if (val.includes('math') || val.includes('mat')) return 'math';
                    if (val.includes('bio')) return 'biology';
                    if (val.includes('phys')) return 'physics';
                    if (val.includes('chem')) return 'chemistry';
                    return val;
                };

                const selectedSubjectsSet = new Set(selectedDoubts.map(d => normalizeSubject(d.subject)));

                // 1. Full Time only
                const fullTimeBulk = teachers.filter(t => {
                    const type = (t.teacherType || t.qualification || '').toLowerCase();
                    return type.includes('full');
                });

                // 2. Subject match
                const subjectFilteredBulk = fullTimeBulk.filter(t =>
                    Array.from(selectedSubjectsSet).some(s => s === normalizeSubject(t.subject_name || t.subject))
                );

                // 3. Split by department
                const getDeptB = (t, keyword) => {
                    const depts = parseDeptB(t.teacherDepartment);
                    const hasCombo = depts.some(d => d.toLowerCase().includes('all-india + fnd'));
                    
                    if (keyword === 'All-India + FND') return hasCombo;
                    
                    if (keyword === 'Foundation') {
                        return depts.some(d => !d.toLowerCase().includes('all-india + fnd') && (d.toLowerCase().includes('foundation') || d.toLowerCase().includes('fnd')));
                    }
                    if (keyword === 'All India') {
                        return depts.some(d => !d.toLowerCase().includes('all-india + fnd') && (d.toLowerCase().includes('all india') || d.toLowerCase().includes('all-india')));
                    }
                    return depts.some(d => d.toLowerCase().includes(keyword.toLowerCase()));
                };
                const foundationBulk = subjectFilteredBulk.filter(t => getDeptB(t, 'Foundation'));
                const allIndiaBulk   = subjectFilteredBulk.filter(t => getDeptB(t, 'All India'));
                const allIndiaFndBulk = subjectFilteredBulk.filter(t => getDeptB(t, 'All-India + FND'));

                // Available tabs
                const availableTabsB = [];
                if (foundationBulk.length > 0) availableTabsB.push('Foundation');
                if (allIndiaBulk.length > 0)   availableTabsB.push('All India');
                if (allIndiaFndBulk.length > 0) availableTabsB.push('All-India + FND');

                // Active list
                let rawActiveListB = [];
                if (bulkDepartmentTab === 'Foundation') rawActiveListB = foundationBulk;
                else if (bulkDepartmentTab === 'All India') rawActiveListB = allIndiaBulk;
                else if (bulkDepartmentTab === 'All-India + FND') rawActiveListB = allIndiaFndBulk;

                // 4. Search + centre filter
                const activeBulkList = rawActiveListB.filter(t => {
                    const nameMatch = !bulkSearch.trim() ||
                        (t.name || '').toLowerCase().includes(bulkSearch.toLowerCase()) ||
                        (t.subject_name || t.subject || '').toLowerCase().includes(bulkSearch.toLowerCase());
                    const centreMatch = !bulkCentreFilter ||
                        (t.centres || []).some(c => c.toLowerCase().includes(bulkCentreFilter.toLowerCase()));
                    return nameMatch && centreMatch;
                });

                const bulkCentreOptions = [...new Set(rawActiveListB.flatMap(t => t.centres || []))].sort();

                return (
                    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto py-8 sm:py-16">
                        <div className={`w-full max-w-2xl mx-4 overflow-hidden rounded-[5px] shadow-2xl animate-in zoom-in-95 duration-300 border relative ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200'}`}>

                            {/* Header */}
                            <div className="flex items-center justify-between px-8 py-6 bg-orange-600 text-white sticky top-0 z-10">
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight">Bulk Assignment</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mt-0.5">
                                        {selectedDoubtIds.length} Doubts Selected
                                        {selectedDoubts[0]?.subject && <span className="ml-2 opacity-70">· {selectedDoubts[0].subject}</span>}
                                    </p>
                                </div>
                                <button onClick={() => { setIsBulkAssignModalOpen(false); setBulkSearch(''); setBulkCentreFilter(''); }} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                    <X size={24} strokeWidth={3} />
                                </button>
                            </div>

                            <div className={`p-6 space-y-6 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>

                                {/* Equal Distribution Toggle */}
                                <div className="flex items-center justify-between p-4 rounded-[5px] bg-orange-500/5 border border-orange-500/10">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-full bg-orange-500/20 text-orange-500">
                                            <LayoutGrid size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black uppercase tracking-tight">Equal Distribution</p>
                                            <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Divide doubts equally among teachers</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setDistributeEqually(!distributeEqually)}
                                        className={`w-12 h-6 rounded-full transition-all relative ${distributeEqually ? 'bg-orange-600' : 'bg-slate-700'}`}>
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${distributeEqually ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>

                                {/* Department Tabs */}
                                {availableTabsB.length > 0 && (
                                    <div className={`flex rounded-[5px] border overflow-hidden ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                                        {availableTabsB.map(tab => {
                                            const count = tab === 'Foundation' ? foundationBulk.length :
                                                          tab === 'All India' ? allIndiaBulk.length :
                                                          allIndiaFndBulk.length;
                                            const isActive = bulkDepartmentTab === tab;
                                            return (
                                                <button
                                                    key={tab}
                                                    onClick={() => {
                                                        setBulkDepartmentTab(tab);
                                                        setBulkSearch('');
                                                        setBulkCentreFilter('');
                                                        setSelectedTeachersForBulk([]);
                                                    }}
                                                    className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center justify-center gap-2 ${
                                                        isActive
                                                            ? 'border-orange-500 text-orange-500 bg-orange-500/5'
                                                            : isDarkMode
                                                                ? 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {tab}
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                        isActive 
                                                            ? 'bg-orange-500/20 text-orange-500' 
                                                            : isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-200 text-slate-500'
                                                    }`}>
                                                        {count}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Search + Centre Filter */}
                                {bulkAvailableTabs.length > 0 && (
                                    <div className={`flex gap-2`}>
                                        <div className="relative flex-1">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            <input
                                                type="text"
                                                placeholder="Search teacher name..."
                                                value={bulkSearch}
                                                onChange={e => setBulkSearch(e.target.value)}
                                                className={`w-full pl-8 pr-8 py-2 text-[11px] font-bold rounded-[5px] border outline-none transition-all ${
                                                    isDarkMode
                                                        ? 'bg-white/5 border-white/10 text-white placeholder-slate-600 focus:border-orange-500/50'
                                                        : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-orange-400'
                                                }`}
                                            />
                                            {bulkSearch && (
                                                <button onClick={() => setBulkSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-500">
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <select
                                                value={bulkCentreFilter}
                                                onChange={e => setBulkCentreFilter(e.target.value)}
                                                className={`appearance-none pl-3 pr-7 py-2 text-[11px] font-bold rounded-[5px] border outline-none min-w-[120px] ${
                                                    bulkCentreFilter
                                                        ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                                                        : isDarkMode
                                                            ? 'bg-white/5 border-white/10 text-slate-300'
                                                            : 'bg-slate-50 border-slate-200 text-slate-700'
                                                }`}
                                            >
                                                <option value="">All Centres</option>
                                                {bulkCentreOptions.map((c, i) => (
                                                    <option key={i} value={c}>{c.replace(/_/g, ' ')}</option>
                                                ))}
                                            </select>
                                            <Filter size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                )}

                                {/* Teacher Multi-Select Cards */}
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                                        Select Teachers ({selectedTeachersForBulk.length})
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                        {bulkAvailableTabs.length === 0 ? (
                                            <div className="col-span-2 py-10 text-center opacity-40 space-y-2">
                                                <AlertCircle size={28} className="mx-auto" />
                                                <p className="text-xs font-black uppercase tracking-widest">No full-time teachers match selected doubts</p>
                                            </div>
                                        ) : activeBulkList.length === 0 ? (
                                            <div className="col-span-2 py-10 text-center opacity-40 space-y-2">
                                                <AlertCircle size={28} className="mx-auto" />
                                                <p className="text-xs font-black uppercase tracking-widest">No {bulkDeptTab} teachers found</p>
                                            </div>
                                        ) : (
                                            activeBulkList.map(teacher => {
                                                const isChecked = selectedTeachersForBulk.includes(teacher.id);
                                                const depts = parseDeptB(teacher.teacherDepartment);
                                                return (
                                                    <button
                                                        key={teacher.id}
                                                        onClick={() => {
                                                            setSelectedTeachersForBulk(prev =>
                                                                prev.includes(teacher.id) ? prev.filter(id => id !== teacher.id) : [...prev, teacher.id]
                                                            );
                                                        }}
                                                        className={`flex items-start gap-3 p-3 rounded-[5px] border-2 transition-all text-left ${
                                                            isChecked
                                                                ? 'border-orange-500 bg-orange-500/10'
                                                                : isDarkMode ? 'border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/5' : 'border-slate-100 bg-slate-50 hover:border-orange-300 hover:bg-orange-50/30'
                                                        }`}
                                                    >
                                                        <div className={`w-5 h-5 shrink-0 mt-0.5 rounded flex items-center justify-center transition-all ${
                                                            isChecked ? 'bg-orange-500 text-white' : isDarkMode ? 'bg-white/10 border border-white/10' : 'bg-white border border-slate-200'
                                                        }`}>
                                                            {isChecked && <CheckSquare size={13} />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-xs font-black uppercase truncate ${isChecked ? 'text-orange-500' : ''}`}>{teacher.name}</p>
                                                            <p className="text-[9px] font-bold opacity-50 truncate uppercase">{teacher.subject_name || teacher.subject}</p>
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {depts.map((d, i) => (
                                                                    <span key={i} className={`text-[7px] font-black uppercase tracking-widest px-1 py-0.5 rounded ${
                                                                        d.toLowerCase().includes('all india') ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-400'
                                                                    }`}>{d}</span>
                                                                ))}
                                                                {teacher.centres?.slice(0,1).map((c, i) => (
                                                                    <span key={i} className="text-[7px] font-bold opacity-30 uppercase">{c}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className={`pt-5 border-t flex flex-col gap-4 ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                                    {distributeEqually && selectedTeachersForBulk.length > 0 && (
                                        <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-500 bg-orange-500/10 py-2 rounded">
                                            Each teacher will get ~{Math.ceil(selectedDoubtIds.length / selectedTeachersForBulk.length)} doubts
                                        </div>
                                    )}
                                    <button
                                        onClick={handleBulkConfirmAssign}
                                        disabled={selectedTeachersForBulk.length === 0}
                                        className={`w-full py-4 rounded-[5px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-[0.98] ${
                                            selectedTeachersForBulk.length > 0
                                                ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-600/30'
                                                : isDarkMode ? 'bg-white/5 text-slate-600 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        }`}
                                    >
                                        Execute Bulk Assignment
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default AssignDoubt;

