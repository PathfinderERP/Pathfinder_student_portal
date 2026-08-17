import React, { useState, useEffect } from 'react';
import {
    ArrowRightLeft, FileText, CheckCircle, Clock, Plus, Search,
    Send, RefreshCw, CheckSquare, Square, Radio, AlertCircle, Eye,
    Sparkles, UserCheck, Calendar, MapPin, BookOpen, MessageSquare,
    ChevronDown, X, Building2, Trash2, Lock, Paperclip, UploadCloud, Download,
    LayoutGrid, List
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import axios from 'axios';

const TEST_ANALYSIS_OPTIONS = [
    {
        id: 'report_submitted',
        label: 'PERFORMANCE ANALYSIS REPORT STUDENT WISE SUBMITTED TO HOD / ACADEMIC TEAM WITHIN 1 WEEK AFTER RESULT PUBLICATION'
    },
    {
        id: 'action_plan_above',
        label: 'ACTION PLAN FOR ABOVE AVERAGE STUDENT'
    },
    {
        id: 'action_plan_below',
        label: 'ACTION PLAN FOR BELOW AVERAGE STUDENT'
    }
];

const MENTORS_TALK_OPTIONS = [
    'SYLLABUS MANAGEMENT',
    'EXAM STRATEGY & TIME MANAGEMENT',
    'MOTIVATIONAL & STRESS MANAGEMENT',
    'REVISION & PRACTICE STRATEGY',
    'PERFORMANCE REVIEW & TARGET SETTING',
    'OTHER'
];

const BASIS_CONVERSATION_OPTIONS = [
    'STUDENT DISCONTINUATION',
    'ACADEMIC PERFORMANCE & MARKS DROPPED',
    'ATTENDANCE & IRREGULARITY ISSUES',
    'COURSE UPGRADE / ADMISSION CONVERSION',
    'BEHAVIORAL / PERSONAL GUIDANCE',
    'OTHER'
];

const CLASS_OPTIONS = [
    'CLASS 6',
    'CLASS 7',
    'CLASS 8',
    'CLASS 9',
    'CLASS 10',
    'CLASS 11 (XI)',
    'CLASS 12 (XII)',
    'REPEATER'
];

const SUPPORT_TYPE_OPTIONS = [
    'INDIVIDUAL COUNSELING OF ANY WALKING CANDIDATE',
    'ACADEMIC REMEDIAL SUPPORT',
    'PARENT-STUDENT JOINT SESSION',
    'SPECIAL BATCH TRANSFER',
    'OTHER'
];

const DEFAULT_ACTIVE_CENTRES = [
    { id: '1', name: 'Hazra', code: 'HZ', status: 'Active' },
    { id: '2', name: 'Kolkata Central', code: 'KC', status: 'Active' },
    { id: '3', name: 'Durgapur', code: 'DGP', status: 'Active' },
    { id: '4', name: 'Siliguri', code: 'SLG', status: 'Active' },
    { id: '5', name: 'Howrah', code: 'HWH', status: 'Active' },
    { id: '6', name: 'Salt Lake', code: 'SL', status: 'Active' },
    { id: '7', name: 'Garia', code: 'GAR', status: 'Active' },
    { id: '8', name: 'Barrackpore', code: 'BKP', status: 'Active' }
];

// Reusable Searchable Dropdown Component
const SearchableDropdown = ({
    label,
    required = false,
    options = [],
    selectedValues = [],
    onChange,
    placeholder = "Select options...",
    isMulti = true,
    isDarkMode = true
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredOptions = options.filter(opt => {
        const val = typeof opt === 'string' ? opt : (opt.name || opt.label || '');
        return val.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const handleSelect = (val) => {
        if (isMulti) {
            const next = selectedValues.includes(val)
                ? selectedValues.filter(v => v !== val)
                : [...selectedValues, val];
            onChange(next);
        } else {
            onChange([val]);
            setIsOpen(false);
        }
    };

    const handleRemoveTag = (val, e) => {
        e.stopPropagation();
        onChange(selectedValues.filter(v => v !== val));
    };

    return (
        <div className={`relative ${isOpen ? 'z-[100]' : 'z-10'} space-y-2`}>
            {label && (
                <label className="block text-sm font-bold tracking-wide flex items-center justify-between">
                    <span>{label} {required && <span className="text-red-500">*</span>}</span>
                    {isMulti && selectedValues.length > 0 && (
                        <span className="text-xs text-amber-500 font-bold">{selectedValues.length} selected</span>
                    )}
                </label>
            )}

            {/* Control Trigger Box */}
            <div className="relative">
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full min-h-[46px] p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between gap-2 flex-wrap transition-all ${
                        isDarkMode ? 'bg-slate-950 border-white/10 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                    }`}
                >
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {selectedValues.length === 0 ? (
                            <span className="text-slate-400 font-medium">{placeholder}</span>
                        ) : (
                            selectedValues.map(val => (
                                <span
                                    key={val}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                >
                                    {val}
                                    <X
                                        size={12}
                                        className="hover:text-red-500 cursor-pointer"
                                        onClick={(e) => handleRemoveTag(val, e)}
                                    />
                                </span>
                            ))
                        )}
                    </div>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>

                {/* Backdrop Overlay to close when clicking outside */}
                {isOpen && (
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                )}

                {/* Dropdown Popup */}
                {isOpen && (
                    <div className={`absolute top-full left-0 right-0 mt-2 z-[110] p-3 rounded-xl border shadow-2xl space-y-3 opacity-100 ${
                        isDarkMode ? 'bg-slate-900 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}>
                        {/* Inline Search Bar */}
                        <div className="relative z-50">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search options..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className={`w-full pl-9 pr-3 py-2 rounded-lg border text-xs outline-none ${
                                    isDarkMode ? 'bg-slate-950 border-white/10 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'
                                }`}
                            />
                        </div>

                        {/* Options List */}
                        <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar relative z-50">
                            {filteredOptions.length === 0 ? (
                                <div className="p-3 text-center text-xs text-slate-400 font-medium">No matching options</div>
                            ) : (
                                filteredOptions.map(opt => {
                                    const val = typeof opt === 'string' ? opt : (opt.name || opt.label);
                                    const isSelected = selectedValues.includes(val);
                                    return (
                                        <div
                                            key={val}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelect(val);
                                            }}
                                            className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                                                isSelected
                                                    ? (isDarkMode ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-amber-50 text-amber-900 border border-amber-200')
                                                    : (isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700')
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <input
                                                    type={isMulti ? "checkbox" : "radio"}
                                                    checked={isSelected}
                                                    readOnly
                                                    className="w-4 h-4 text-amber-500 accent-amber-500 rounded cursor-pointer"
                                                />
                                                <span>{val}</span>
                                            </div>
                                            {isSelected && (
                                                <CheckCircle size={14} className="text-amber-500" />
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const MentorshipConversionTab = ({ isAdminView = false, filterMentorName = '', filterTeacherEmail = '' }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token, user } = useAuth();

    const [activeView, setActiveView] = useState(isAdminView ? 'history' : 'form'); // 'form' | 'history'
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submissionsData, setSubmissionsData] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDetailModal, setSelectedDetailModal] = useState(null);
    const [historyLayoutMode, setHistoryLayoutMode] = useState('card'); // 'card' | 'list'

    // Master Data Active Centres & Multi-select Dropdown States
    const [masterCentres, setMasterCentres] = useState([]);
    const [loadingCentres, setLoadingCentres] = useState(false);
    const [selectedCentres, setSelectedCentres] = useState([]);

    // Dynamic Promising Students State (initialized with 2 rows by default)
    const [promisingStudents, setPromisingStudents] = useState([
        { name: '', stream: '' },
        { name: '', stream: '' }
    ]);

    // Documentation Attachments State for Test Analysis
    const [testAnalysisDocs, setTestAnalysisDocs] = useState({
        report_submitted: { fileName: '', fileData: '', notes: '' },
        action_plan_above: { fileName: '', fileData: '', notes: '' },
        action_plan_below: { fileName: '', fileData: '', notes: '' }
    });

    // Auto-capture logged-in mentor name
    useEffect(() => {
        if (user) {
            const autoName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || user.name || '';
            if (autoName) {
                setFormData(prev => ({ ...prev, mentor_name: autoName }));
            }
        }
    }, [user]);

    // Fetch Active Centres from Master Data
    useEffect(() => {
        const fetchMasterCentres = async () => {
            setLoadingCentres(true);
            try {
                const apiUrl = getApiUrl();
                let rawCentres = [];
                try {
                    const res = await axios.get(`${apiUrl}/api/admin/erp-centres/`, {
                        headers: token ? { Authorization: `Bearer ${token}` } : {}
                    });
                    rawCentres = res.data?.data || (Array.isArray(res.data) ? res.data : []);
                } catch (e) {
                    console.log("Fallback to local centres API");
                }

                if (!rawCentres || rawCentres.length === 0) {
                    try {
                        const resLocal = await axios.get(`${apiUrl}/api/centres/`, {
                            headers: token ? { Authorization: `Bearer ${token}` } : {}
                        });
                        rawCentres = resLocal.data || [];
                    } catch (e2) {}
                }

                // Filter ACTIVE centres only
                const activeOnly = (rawCentres || []).filter(c => {
                    if (c.is_active === false || c.is_active === 0 || c.is_active === 'false') return false;
                    const st = String(c.status || '').toLowerCase().trim();
                    if (st === 'deactive' || st === 'inactive' || st === 'disabled' || st === 'false' || st === '0') return false;
                    return true;
                }).map(c => ({
                    id: c.id || c._id || c.code || c.enterCode,
                    name: (c.centreName || c.name || '').trim(),
                    code: (c.enterCode || c.code || '').trim(),
                    status: 'Active'
                })).filter(c => c.name);

                // Deduplicate by name
                const uniqueCentres = [];
                const seenNames = new Set();
                activeOnly.forEach(item => {
                    if (!seenNames.has(item.name)) {
                        seenNames.add(item.name);
                        uniqueCentres.push(item);
                    }
                });

                if (uniqueCentres.length > 0) {
                    setMasterCentres(uniqueCentres);
                } else {
                    setMasterCentres(DEFAULT_ACTIVE_CENTRES);
                }
            } catch (err) {
                console.error("Master centres fetch error:", err);
                setMasterCentres(DEFAULT_ACTIVE_CENTRES);
            } finally {
                setLoadingCentres(false);
            }
        };

        fetchMasterCentres();
    }, [getApiUrl, token]);

    // Initial Form State matching Google Form screenshots
    const getInitialFormData = () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const mentorName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || '' : '';
        const userEmail = user?.email || 'support@pathfinder.edu.in';

        return {
            email: userEmail,
            recordEmailChecked: true,
            date: todayStr,
            mentor_name: mentorName,
            centre_name: '',
            mentors_talk: '',
            promising_students: '',
            conversation_made: '',
            basis_of_conversation: '',
            test_analysis: [],
            syllabus_tracking: '',
            selected_classes: [],
            month: '',
            support_type: '',
            remark_suggestion: ''
        };
    };

    const [formData, setFormData] = useState(getInitialFormData());

    const handleStudentChange = (index, field, value) => {
        const updated = [...promisingStudents];
        updated[index][field] = value;
        setPromisingStudents(updated);

        const formattedStr = updated
            .filter(s => s.name.trim())
            .map(s => `${s.name.trim()} (${s.stream})`)
            .join(', ');
        setFormData(prev => ({ ...prev, promising_students: formattedStr }));
    };

    const addStudentRow = () => {
        setPromisingStudents(prev => [...prev, { name: '', stream: '' }]);
    };

    const removeStudentRow = (index) => {
        if (promisingStudents.length <= 1) return;
        const updated = promisingStudents.filter((_, i) => i !== index);
        setPromisingStudents(updated);

        const formattedStr = updated
            .filter(s => s.name.trim())
            .map(s => `${s.name.trim()} (${s.stream})`)
            .join(', ');
        setFormData(prev => ({ ...prev, promising_students: formattedStr }));
    };

    const handleDocFileUpload = (optId, e) => {
        const file = e.target.files[0];
        if (!file) return;

        const optObj = TEST_ANALYSIS_OPTIONS.find(o => o.id === optId);
        const optLabel = optObj ? optObj.label : '';

        // Store file handle locally without ghost uploading to Cloudflare R2 yet
        setTestAnalysisDocs(prev => {
            const next = {
                ...prev,
                [optId]: {
                    ...prev[optId],
                    fileObj: file,
                    fileName: file.name
                }
            };
            setFormData(f => {
                const currentList = f.test_analysis || [];
                const updatedList = (optLabel && !currentList.includes(optLabel))
                    ? [...currentList, optLabel]
                    : currentList;
                return {
                    ...f,
                    test_analysis: updatedList,
                    test_analysis_docs: next
                };
            });
            return next;
        });
    };

    const handleRemoveDocFile = (optId) => {
        setTestAnalysisDocs(prev => {
            const next = {
                ...prev,
                [optId]: {
                    fileObj: null,
                    fileName: '',
                    fileData: '',
                    notes: ''
                }
            };
            setFormData(f => ({ ...f, test_analysis_docs: next }));
            return next;
        });
    };

    const handleDocNotesChange = (optId, val) => {
        const optObj = TEST_ANALYSIS_OPTIONS.find(o => o.id === optId);
        const optLabel = optObj ? optObj.label : '';

        setTestAnalysisDocs(prev => {
            const next = {
                ...prev,
                [optId]: {
                    ...prev[optId],
                    notes: val
                }
            };
            setFormData(f => {
                const currentList = f.test_analysis || [];
                const updatedList = (val && optLabel && !currentList.includes(optLabel))
                    ? [...currentList, optLabel]
                    : currentList;
                return {
                    ...f,
                    test_analysis: updatedList,
                    test_analysis_docs: next
                };
            });
            return next;
        });
    };

    const resetForm = () => {
        setFormData(getInitialFormData());
        setSelectedCentres([]);
        setPromisingStudents([
            { name: '', stream: '' },
            { name: '', stream: '' }
        ]);
        setTestAnalysisDocs({
            report_submitted: { fileObj: null, fileName: '', fileData: '', notes: '' },
            action_plan_above: { fileObj: null, fileName: '', fileData: '', notes: '' },
            action_plan_below: { fileObj: null, fileName: '', fileData: '', notes: '' }
        });
    };

    // Fetch Submissions History
    const fetchSubmissions = async () => {
        setLoading(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/mentorship-conversion/`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (res.data?.data) {
                setSubmissionsData(res.data.data);
            }
        } catch (err) {
            console.error("Fetch mentorship submissions error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubmissions();
    }, []);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (selectedCentres.length === 0 && !formData.centre_name) {
            alert("Please select at least one active centre.");
            return;
        }
        setSubmitting(true);
        setSubmitSuccess(false);

        try {
            const apiUrl = getApiUrl();

            // Upload any staged media files to Cloudflare R2 only upon actual form submission!
            const updatedDocs = { ...testAnalysisDocs };
            for (const [optId, doc] of Object.entries(updatedDocs)) {
                if (doc && doc.fileObj) {
                    try {
                        const uploadData = new FormData();
                        uploadData.append('file', doc.fileObj);
                        uploadData.append('folder', 'mentorship_docs');

                        const res = await axios.post(`${apiUrl}/api/upload-media/`, uploadData, {
                            headers: {
                                'Content-Type': 'multipart/form-data',
                                ...(token ? { Authorization: `Bearer ${token}` } : {})
                            }
                        });
                        if (res.data?.url) {
                            updatedDocs[optId] = {
                                ...doc,
                                fileData: res.data.url,
                                fileObj: null
                            };
                        }
                    } catch (upErr) {
                        console.error(`Error uploading ${doc.fileName} to Cloudflare R2:`, upErr);
                        const fileDataUrl = await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onload = (ev) => resolve(ev.target.result);
                            reader.readAsDataURL(doc.fileObj);
                        });
                        updatedDocs[optId] = {
                            ...doc,
                            fileData: fileDataUrl,
                            fileObj: null
                        };
                    }
                }
            }

            const payload = {
                ...formData,
                test_analysis_docs: updatedDocs
            };

            const res = await axios.post(`${apiUrl}/api/mentorship-conversion/`, payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            setSubmitSuccess(true);
            fetchSubmissions();
            // Clear all form inputs IMMEDIATELY so no residual data remains
            resetForm();

            setTimeout(() => {
                setSubmitSuccess(false);
                setActiveView('history');
            }, 1500);
        } catch (err) {
            console.error("Submit form error:", err);
            // Local fallback append
            const localRecord = {
                id: `loc-${Date.now()}`,
                ...formData,
                created_at: new Date().toLocaleString()
            };
            setSubmissionsData([localRecord, ...submissionsData]);
            setSubmitSuccess(true);
            // Clear all form inputs IMMEDIATELY so no residual data remains
            resetForm();

            setTimeout(() => {
                setSubmitSuccess(false);
                setActiveView('history');
            }, 1500);
        } finally {
            setSubmitting(false);
        }
    };

    const handleTestAnalysisToggle = (label) => {
        setFormData(prev => {
            const current = prev.test_analysis || [];
            if (current.includes(label)) {
                return { ...prev, test_analysis: current.filter(item => item !== label) };
            } else {
                return { ...prev, test_analysis: [...current, label] };
            }
        });
    };

    // Filter out dummy mock records completely
    let displaySubmissions = submissionsData.filter(item => item.id && !String(item.id).startsWith('mock-'));

    if (filterMentorName || filterTeacherEmail) {
        const mentorQ = (filterMentorName || '').toLowerCase();
        const emailQ = (filterTeacherEmail || '').toLowerCase();
        displaySubmissions = displaySubmissions.filter(item => {
            const mName = (item.mentor_name || '').toLowerCase();
            const mEmail = (item.email || '').toLowerCase();
            const matchesName = mentorQ && (mName.includes(mentorQ) || mentorQ.includes(mName));
            const matchesEmail = emailQ && (mEmail.includes(emailQ) || emailQ.includes(mEmail));
            return matchesName || matchesEmail;
        });
    }

    const filteredSubmissions = displaySubmissions.filter(item =>
        (item.mentor_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.centre_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.promising_students || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 pt-0 pb-12">
            {/* Navigation Header */}
            <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-xl backdrop-blur-xl transition-all`}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <ArrowRightLeft className="text-amber-500" size={24} />
                            <h2 className="text-2xl font-black tracking-tight">
                                {isAdminView ? 'Mentorship & Conversion Submissions Log' : 'Mentorship & Conversion Form'}
                            </h2>
                        </div>
                        <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {isAdminView
                                ? 'View all recorded teacher mentorship observations, student academic conversations, test analysis reviews, and conversion plans.'
                                : 'Log teacher mentorship talks, student/parent interactions, test analysis verification, and conversion plans.'
                            }
                        </p>
                    </div>

                    {!isAdminView && (
                        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10">
                            <button
                                type="button"
                                onClick={() => setActiveView('form')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                    activeView === 'form'
                                        ? 'bg-amber-500 text-white shadow-md'
                                        : 'text-slate-600 dark:text-slate-300 hover:text-amber-500'
                                }`}
                            >
                                <FileText size={15} />
                                <span>Mentorship Form</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveView('history')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                    activeView === 'history'
                                        ? 'bg-amber-500 text-white shadow-md'
                                        : 'text-slate-600 dark:text-slate-300 hover:text-amber-500'
                                }`}
                            >
                                <Clock size={15} />
                                <span>Submitted Log ({displaySubmissions.length})</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* FORM VIEW (Teacher Portal only, hidden in Admin Portal) */}
            {activeView === 'form' && !isAdminView && (
                <div className="w-full max-w-5xl mx-auto space-y-6 pt-3">
                    {/* Top Header Card (Google Forms style) */}
                    <div className={`rounded-2xl border-t-[10px] border-t-amber-500 border-x border-b ${isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-[#fffdfa] border-slate-200 text-slate-900'} p-6 shadow-lg space-y-3`}>
                        <h1 className="text-2xl font-black tracking-tight">Mentorship & Conversion Form</h1>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            Please fill in all weekly mentorship observations, student academic conversations, test analysis reviews, and conversion support details.
                        </p>
                        <div className="pt-2 border-t border-slate-200 dark:border-white/10 text-[11px] font-bold text-red-500">
                            * Indicates required question
                        </div>
                    </div>

                    {/* Submit Success Banner */}
                    {submitSuccess && (
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-300">
                            <CheckCircle size={18} />
                            <span>Mentorship & Conversion record submitted successfully! Redirecting to history log...</span>
                        </div>
                    )}

                    <form onSubmit={handleFormSubmit} className="space-y-5">

                        {/* CARD 2: DATE */}
                        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-md space-y-3`}>
                            <label className="block text-sm font-bold tracking-wide">
                                DATE <span className="text-red-500">*</span>
                            </label>
                            <div className="space-y-1">
                                <span className="text-[11px] font-medium text-slate-400 block">Date</span>
                                <input
                                    type="date"
                                    required
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className={`p-2.5 rounded-xl border text-xs outline-none ${
                                        isDarkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                                    }`}
                                />
                            </div>
                        </div>

                        {/* CARD 3: NAME OF THE MENTOR (Auto-Captured & Read-Only) */}
                        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-md space-y-3`}>
                            <label className="block text-sm font-bold tracking-wide flex items-center justify-between">
                                <span>NAME OF THE MENTOR <span className="text-red-500">*</span></span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border flex items-center gap-1 ${
                                    isDarkMode ? 'bg-slate-950 border-white/10 text-amber-400' : 'bg-slate-100 border-slate-200 text-amber-700'
                                }`}>
                                    <Lock size={10} /> Auto-Captured
                                </span>
                            </label>
                            <input
                                type="text"
                                readOnly
                                disabled
                                value={formData.mentor_name || (user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || '' : '')}
                                placeholder="Your full name"
                                className={`w-full p-2.5 border-b border-t-0 border-x-0 rounded-none text-xs font-bold outline-none cursor-not-allowed transition-all ${
                                    isDarkMode ? 'bg-transparent border-white/10 text-amber-400' : 'bg-transparent border-slate-300 text-amber-700'
                                }`}
                            />
                        </div>

                        {/* CARD 4: CENTRE NAME (Searchable Multi-Select Active Master Data Dropdown) */}
                        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-md`}>
                            <SearchableDropdown
                                label="CENTRE NAME"
                                required={true}
                                options={masterCentres.map(c => c.name)}
                                selectedValues={selectedCentres}
                                onChange={(vals) => {
                                    setSelectedCentres(vals);
                                    setFormData(prev => ({ ...prev, centre_name: vals.join(', ') }));
                                }}
                                placeholder="Search & select active master centre(s)..."
                                isMulti={true}
                                isDarkMode={isDarkMode}
                            />
                        </div>

                        {/* CARD 5: EVERY WEEK MENTOR'S TALK (15 MIN / CLASS) */}
                        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-md`}>
                            <SearchableDropdown
                                label="EVERY WEEK MENTOR'S TALK (15 MIN / CLASS)"
                                required={true}
                                options={MENTORS_TALK_OPTIONS}
                                selectedValues={formData.mentors_talk ? [formData.mentors_talk] : []}
                                onChange={(vals) => {
                                    setFormData(prev => ({ ...prev, mentors_talk: vals[0] || '' }));
                                }}
                                placeholder="Search & select mentor's talk topic..."
                                isMulti={false}
                                isDarkMode={isDarkMode}
                            />
                        </div>

                        {/* CARD 6: MENTION THE NAME & STREAM (JEE / NEET) OF ATLEAST 2 PROMISING STUDENTS OF THE CENTRE BASED ON WEEKLY PERFORMANCE */}
                        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-md space-y-4`}>
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-bold tracking-wide leading-relaxed">
                                    MENTION THE NAME & STREAM (JEE / NEET) OF ATLEAST 2 PROMISING STUDENTS OF THE CENTRE BASED ON WEEKLY PERFORMANCE <span className="text-red-500">*</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={addStudentRow}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all shadow-sm shrink-0"
                                >
                                    <Plus size={16} />
                                    <span>Add Student</span>
                                </button>
                            </div>

                            <div className="space-y-3 pt-1">
                                {promisingStudents.map((st, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex flex-col sm:flex-row items-center gap-3 p-3 rounded-xl border transition-all ${
                                            isDarkMode ? 'bg-slate-950/60 border-white/5' : 'bg-slate-50 border-slate-200'
                                        }`}
                                    >
                                        <span className="text-[10px] font-black uppercase text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md shrink-0">
                                            Student #{idx + 1}
                                        </span>

                                        <input
                                            type="text"
                                            required
                                            value={st.name}
                                            onChange={(e) => handleStudentChange(idx, 'name', e.target.value)}
                                            placeholder={`Student #${idx + 1} Name`}
                                            className={`flex-1 w-full p-2 rounded-lg border text-xs outline-none ${
                                                isDarkMode ? 'bg-slate-900 border-white/10 text-white focus:border-amber-500' : 'bg-white border-slate-200 text-slate-900 focus:border-amber-500'
                                            }`}
                                        />

                                        <select
                                            value={st.stream}
                                            onChange={(e) => handleStudentChange(idx, 'stream', e.target.value)}
                                            className={`w-full sm:w-36 p-2 rounded-lg border text-xs font-bold outline-none uppercase ${
                                                isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                                            }`}
                                        >
                                            <option value="">Select Stream</option>
                                            <option value="JEE">JEE</option>
                                            <option value="NEET">NEET</option>
                                            <option value="FOUNDATION">FOUNDATION</option>
                                            <option value="OTHER">OTHER</option>
                                        </select>

                                        {promisingStudents.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeStudentRow(idx)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                title="Remove student"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CARD 7: HAVE ANY CONVERSATION BEEN MADE TO ANY PARTICULAR STUDENT / PARENT */}
                        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-md space-y-3`}>
                            <label className="block text-sm font-bold tracking-wide">
                                HAVE ANY CONVERSATION BEEN MADE TO ANY PARTICULAR STUDENT / PARENT <span className="text-red-500">*</span>
                            </label>
                            <div className="space-y-2 pt-1">
                                {['YES', 'NO'].map(val => (
                                    <label key={val} className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="conversation_made"
                                            value={val}
                                            checked={formData.conversation_made === val}
                                            onChange={(e) => setFormData({ ...formData, conversation_made: e.target.value })}
                                            className="w-4 h-4 text-amber-500 accent-amber-500 cursor-pointer"
                                        />
                                        <span className="text-xs font-bold uppercase">{val}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* CARD 8: BASIS OF CONVERSATION WITH STUDENT/ PARENT */}
                        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-md`}>
                            <SearchableDropdown
                                label="BASIS OF CONVERSATION WITH STUDENT/ PARENT"
                                required={false}
                                options={BASIS_CONVERSATION_OPTIONS}
                                selectedValues={formData.basis_of_conversation ? [formData.basis_of_conversation] : []}
                                onChange={(vals) => {
                                    setFormData(prev => ({ ...prev, basis_of_conversation: vals[0] || '' }));
                                }}
                                placeholder="Search & select basis of conversation..."
                                isMulti={false}
                                isDarkMode={isDarkMode}
                            />
                        </div>

                        {/* CARD 9: TEST ANALYSIS (CHAPTER TEST, PHASE TEST, MOCK TEST) */}
                        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-md space-y-4`}>
                            <div>
                                <label className="block text-sm font-bold tracking-wide uppercase">
                                    TEST ANALYSIS (CHAPTER TEST, PHASE TEST, MOCK TEST)
                                </label>
                                <p className="text-xs text-slate-400 mt-1">
                                    Check completed analysis items and attach supporting documentation reports or action plan files.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                                {TEST_ANALYSIS_OPTIONS.map((opt) => {
                                    const isChecked = formData.test_analysis.includes(opt.label);
                                    const docData = testAnalysisDocs[opt.id] || { fileName: '', fileData: '', notes: '' };

                                    return (
                                        <div
                                            key={opt.id}
                                            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3.5 ${
                                                isChecked || docData.fileName || docData.notes
                                                    ? (isDarkMode ? 'bg-amber-500/10 border-amber-500/80 text-amber-300' : 'bg-amber-50/80 border-amber-500 text-amber-900')
                                                    : (isDarkMode ? 'bg-slate-950/60 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700')
                                            }`}
                                        >
                                            {/* Header Checkbox */}
                                            <div
                                                onClick={() => handleTestAnalysisToggle(opt.label)}
                                                className="flex items-start gap-2.5 cursor-pointer group select-none"
                                            >
                                                <div className="pt-0.5 shrink-0">
                                                    {isChecked ? (
                                                        <CheckSquare size={18} className="text-amber-500" />
                                                    ) : (
                                                        <Square size={18} className="text-slate-400 group-hover:text-amber-500" />
                                                    )}
                                                </div>
                                                <span className="text-[11px] font-bold uppercase leading-snug tracking-wide">
                                                    {opt.label}
                                                </span>
                                            </div>

                                            {/* Documentation Upload Box */}
                                            <div className={`p-3 rounded-xl border space-y-2.5 ${
                                                isDarkMode ? 'bg-slate-900/90 border-white/10' : 'bg-white border-slate-200'
                                            }`}>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                                        <Paperclip size={12} className="text-amber-500" /> Documentation
                                                    </span>
                                                    {docData.fileName && (
                                                        <span className="text-[9px] font-bold uppercase text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                                            Attached
                                                        </span>
                                                    )}
                                                </div>

                                                {/* File Upload Control */}
                                                {docData.fileName ? (
                                                    <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-500">
                                                        <div className="flex items-center gap-2 truncate pr-2">
                                                            <FileText size={14} className="shrink-0" />
                                                            <span className="truncate text-[11px]">{docData.fileName}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveDocFile(opt.id)}
                                                            className="p-1 hover:text-red-500 rounded transition-all"
                                                            title="Remove document"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <label className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed text-xs font-semibold cursor-pointer transition-all ${
                                                        isDarkMode ? 'bg-slate-950/60 border-white/15 hover:border-amber-500 text-slate-300 hover:text-amber-400' : 'bg-slate-50 border-slate-300 hover:border-amber-500 text-slate-600 hover:text-amber-600'
                                                    }`}>
                                                        <UploadCloud size={16} className="text-amber-500" />
                                                        <span>Upload Report / File</span>
                                                        <input
                                                            type="file"
                                                            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                                            onChange={(e) => handleDocFileUpload(opt.id, e)}
                                                            className="hidden"
                                                        />
                                                    </label>
                                                )}

                                                {/* Documentation Note Input */}
                                                <input
                                                    type="text"
                                                    value={docData.notes || ''}
                                                    onChange={(e) => handleDocNotesChange(opt.id, e.target.value)}
                                                    placeholder="Add doc link or action note..."
                                                    className={`w-full p-2 rounded-lg border text-[11px] outline-none ${
                                                        isDarkMode ? 'bg-slate-950 border-white/10 text-white placeholder:text-slate-500 focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-amber-500'
                                                    }`}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* CARD 10: SYLLABUS TRACKING OF ALL SUBJECTS (WEEKLY ONCE) */}
                        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-md space-y-3`}>
                            <label className="block text-sm font-bold tracking-wide">
                                SYLLABUS TRACKING OF ALL SUBJECTS (WEEKLY ONCE) <span className="text-red-500">*</span>
                            </label>
                            <div className="space-y-2 pt-1">
                                {['YES', 'NO'].map(val => (
                                    <label key={val} className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="syllabus_tracking"
                                            value={val}
                                            checked={formData.syllabus_tracking === val}
                                            onChange={(e) => setFormData({ ...formData, syllabus_tracking: e.target.value })}
                                            className="w-4 h-4 text-amber-500 accent-amber-500 cursor-pointer"
                                        />
                                        <span className="text-xs font-bold uppercase">{val}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* CARD 11: CLASS */}
                        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-md`}>
                            <SearchableDropdown
                                label="CLASS"
                                required={true}
                                options={CLASS_OPTIONS}
                                selectedValues={formData.selected_classes || []}
                                onChange={(vals) => {
                                    setFormData(prev => ({ ...prev, selected_classes: vals }));
                                }}
                                placeholder="Search & select class(es)..."
                                isMulti={true}
                                isDarkMode={isDarkMode}
                            />
                        </div>

                        {/* CARD 12: MONTH */}
                        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-md space-y-3`}>
                            <label className="block text-sm font-bold tracking-wide uppercase">
                                MONTH
                            </label>
                            <input
                                type="text"
                                value={formData.month}
                                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                                placeholder="Month number or name (e.g. 2, August)"
                                className={`w-full p-2.5 border-b border-t-0 border-x-0 rounded-none text-xs outline-none transition-all ${
                                    isDarkMode ? 'bg-transparent border-white/20 text-white focus:border-amber-500' : 'bg-transparent border-slate-300 text-slate-900 focus:border-amber-500'
                                }`}
                            />
                        </div>

                        {/* CARD 13: SUPPORT TYPE */}
                        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-md`}>
                            <SearchableDropdown
                                label="SUPPORT TYPE"
                                required={false}
                                options={SUPPORT_TYPE_OPTIONS}
                                selectedValues={formData.support_type ? [formData.support_type] : []}
                                onChange={(vals) => {
                                    setFormData(prev => ({ ...prev, support_type: vals[0] || '' }));
                                }}
                                placeholder="Search & select support type..."
                                isMulti={false}
                                isDarkMode={isDarkMode}
                            />
                        </div>

                        {/* CARD 14: REMARK / SUGGESTION ACTION PLAN (IF ANY) */}
                        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-md space-y-3`}>
                            <label className="block text-sm font-bold tracking-wide uppercase">
                                REMARK / SUGGESTION ACTION PLAN (IF ANY)
                            </label>
                            <input
                                type="text"
                                value={formData.remark_suggestion}
                                onChange={(e) => setFormData({ ...formData, remark_suggestion: e.target.value })}
                                placeholder="Your answer"
                                className={`w-full p-2.5 border-b border-t-0 border-x-0 rounded-none text-xs outline-none transition-all ${
                                    isDarkMode ? 'bg-transparent border-white/20 text-white focus:border-amber-500' : 'bg-transparent border-slate-300 text-slate-900 focus:border-amber-500'
                                }`}
                            />
                        </div>

                        {/* FORM ACTION BUTTONS */}
                        <div className="flex items-center justify-between pt-4">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                            >
                                {submitting ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" />
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send size={16} />
                                        <span>Submit Response</span>
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={resetForm}
                                className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider ${
                                    isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                Clear form
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* SUBMISSIONS HISTORY VIEW */}
            {(activeView === 'history' || isAdminView) && (
                <div className="space-y-6">
                    {/* Search & Layout Switcher Controls Bar */}
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search responses by mentor name, centre, email, or student stream..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-xs font-semibold outline-none ${
                                    isDarkMode
                                        ? 'bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500'
                                        : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-amber-500'
                                }`}
                            />
                        </div>

                        {/* Layout Toggle Buttons (Card View vs List View) */}
                        <div className={`flex items-center gap-1 p-1 rounded-xl border ${
                            isDarkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200 shadow-sm'
                        }`}>
                            <button
                                type="button"
                                onClick={() => setHistoryLayoutMode('card')}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                    historyLayoutMode === 'card'
                                        ? 'bg-amber-500 text-white shadow-md'
                                        : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="Card View"
                            >
                                <LayoutGrid size={15} />
                                <span>Card View</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setHistoryLayoutMode('list')}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                    historyLayoutMode === 'list'
                                        ? 'bg-amber-500 text-white shadow-md'
                                        : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="List View"
                            >
                                <List size={15} />
                                <span>List View</span>
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center text-xs font-bold uppercase tracking-widest text-slate-400 animate-pulse">
                            Loading Mentorship Log Submissions...
                        </div>
                    ) : filteredSubmissions.length === 0 ? (
                        <div className={`p-12 text-center rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                            <FileText size={40} className="mx-auto mb-3 opacity-40" />
                            <p className="text-sm font-bold">No Mentorship & Conversion submissions recorded yet.</p>
                            {!isAdminView && (
                                <button
                                    onClick={() => setActiveView('form')}
                                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold"
                                >
                                    <Plus size={14} /> Log First Session
                                </button>
                            )}
                        </div>
                    ) : historyLayoutMode === 'list' ? (
                        /* TABULAR LIST VIEW */
                        <div className={`overflow-x-auto rounded-2xl border ${
                            isDarkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'
                        } shadow-lg`}>
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${
                                        isDarkMode ? 'bg-slate-950/60 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                                    }`}>
                                        <th className="py-3.5 px-4">Date & Mentor</th>
                                        <th className="py-3.5 px-4">Centre</th>
                                        <th className="py-3.5 px-4">Weekly Mentor Talk</th>
                                        <th className="py-3.5 px-4">Promising Students</th>
                                        <th className="py-3.5 px-4 text-center">Conversation Made</th>
                                        <th className="py-3.5 px-4 text-center">Uploaded Docs</th>
                                        <th className="py-3.5 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {filteredSubmissions.map((rec, idx) => {
                                        const docCount = rec.test_analysis_docs ? Object.values(rec.test_analysis_docs).filter(d => d?.fileData).length : 0;
                                        return (
                                            <tr
                                                key={rec.id || idx}
                                                className={`transition-colors ${
                                                    isDarkMode ? 'hover:bg-slate-800/40 text-slate-200' : 'hover:bg-slate-50/80 text-slate-800'
                                                }`}
                                            >
                                                <td className="py-3.5 px-4">
                                                    <div className="font-bold text-sm text-amber-500">{rec.mentor_name || 'Mentor'}</div>
                                                    <div className="text-[11px] text-slate-400 font-mono">{rec.email || 'N/A'}</div>
                                                    <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                                        <Calendar size={11} /> {rec.date || rec.created_at || 'N/A'}
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                        {rec.centre_name || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 max-w-[220px]">
                                                    <div className="font-bold text-xs line-clamp-2">{rec.mentors_talk || 'N/A'}</div>
                                                    {rec.basis_of_conversation && (
                                                        <span className="text-[10px] text-slate-400 block mt-0.5 uppercase tracking-wider font-semibold truncate">
                                                            Basis: {rec.basis_of_conversation}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 max-w-[200px]">
                                                    <div className="text-xs truncate" title={rec.promising_students}>
                                                        {rec.promising_students || 'None'}
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 text-center">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                                                        rec.conversation_made === 'YES'
                                                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                                    }`}>
                                                        {rec.conversation_made || 'NO'}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 text-center">
                                                    {docCount > 0 ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                                            <Paperclip size={11} /> {docCount} File{docCount > 1 ? 's' : ''}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400">None</span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-right">
                                                    <button
                                                        onClick={() => setSelectedDetailModal(rec)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all"
                                                    >
                                                        <Eye size={13} /> View Details
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        /* CARD GRID VIEW */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filteredSubmissions.map((rec, idx) => (
                                <div
                                    key={rec.id || idx}
                                    className={`p-6 rounded-2xl border space-y-4 transition-all ${
                                        isDarkMode ? 'bg-slate-900/60 border-white/10 hover:border-amber-500/40' : 'bg-white border-slate-200 hover:border-amber-500/50'
                                    } shadow-lg relative group`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                {rec.centre_name || 'Hazra'} Centre
                                            </span>
                                            <h3 className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                {rec.mentor_name || 'Mentor'}
                                            </h3>
                                            <p className={`text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {rec.email}
                                            </p>
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                                            <Calendar size={13} /> {rec.date}
                                        </span>
                                    </div>

                                    <div className={`p-3.5 rounded-xl border space-y-2 text-xs ${isDarkMode ? 'bg-slate-950/60 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Weekly Mentor Talk</span>
                                            <strong className={`font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>{rec.mentors_talk}</strong>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Promising Students</span>
                                            <p className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{rec.promising_students || 'N/A'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-white/5">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Conversation Made</span>
                                            <span className={`font-bold ${rec.conversation_made === 'YES' ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                {rec.conversation_made || 'NO'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setSelectedDetailModal(rec)}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all"
                                        >
                                            <Eye size={14} /> View Details
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* DETAIL MODAL */}
            {selectedDetailModal && (
                <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                    <div className={`w-full max-w-4xl max-h-[85vh] overflow-y-auto p-6 sm:p-8 rounded-2xl border ${
                        isDarkMode ? 'bg-slate-900 border-white/10 text-white shadow-2xl' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
                    } space-y-6`}>
                        <div className={`flex items-center justify-between border-b pb-4 ${
                            isDarkMode ? 'border-white/10' : 'border-slate-200'
                        }`}>
                            <div>
                                <h3 className="text-xl font-black">Mentorship Response Detail</h3>
                                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Recorded on {selectedDetailModal.created_at || selectedDetailModal.date}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedDetailModal(null)}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                            >
                                Close
                            </button>
                        </div>

                        <div className="space-y-4 text-xs">
                            <div className={`grid grid-cols-2 gap-4 p-4 rounded-xl border ${
                                isDarkMode ? 'bg-slate-950/60 border-white/10 text-slate-200' : 'bg-amber-50/50 border-amber-200/80 text-slate-800'
                            }`}>
                                <div>
                                    <span className={`text-[10px] font-bold uppercase block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Mentor Name</span>
                                    <span className="font-bold text-sm text-amber-600 dark:text-amber-400">{selectedDetailModal.mentor_name}</span>
                                </div>
                                <div>
                                    <span className={`text-[10px] font-bold uppercase block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Centre Name</span>
                                    <span className="font-bold text-sm">{selectedDetailModal.centre_name}</span>
                                </div>
                                <div>
                                    <span className={`text-[10px] font-bold uppercase block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Email</span>
                                    <span className="font-semibold">{selectedDetailModal.email}</span>
                                </div>
                                <div>
                                    <span className={`text-[10px] font-bold uppercase block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Submission Date</span>
                                    <span className="font-semibold">{selectedDetailModal.date}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <span className={`text-[10px] font-bold uppercase block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Mentor's Talk Topic</span>
                                    <p className="font-bold text-amber-600 dark:text-amber-400 text-sm">{selectedDetailModal.mentors_talk}</p>
                                </div>

                                <div>
                                    <span className={`text-[10px] font-bold uppercase block mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Promising Students</span>
                                    <p className={`p-3 rounded-xl border text-xs font-medium ${
                                        isDarkMode ? 'bg-slate-950/40 border-white/10 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                                    }`}>
                                        {selectedDetailModal.promising_students || 'N/A'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className={`text-[10px] font-bold uppercase block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Conversation Made</span>
                                        <p className="font-bold">{selectedDetailModal.conversation_made}</p>
                                    </div>
                                    <div>
                                        <span className={`text-[10px] font-bold uppercase block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Basis of Conversation</span>
                                        <p className="font-bold">{selectedDetailModal.basis_of_conversation || 'N/A'}</p>
                                    </div>
                                </div>

                                <div>
                                    <span className={`text-[10px] font-bold uppercase block mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Test Analysis Checklist</span>
                                    <ul className="list-disc list-inside space-y-1.5 pt-1">
                                        {(selectedDetailModal.test_analysis || []).map((t, i) => (
                                            <li key={i} className="text-amber-600 dark:text-amber-400 font-semibold">{t}</li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Uploaded Documentation & Media Files Section */}
                                {selectedDetailModal.test_analysis_docs && Object.values(selectedDetailModal.test_analysis_docs).some(d => d && (d.fileName || d.notes || d.fileData)) && (
                                    <div className={`space-y-3 pt-3 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider block flex items-center gap-1 ${
                                            isDarkMode ? 'text-slate-400' : 'text-slate-600'
                                        }`}>
                                            <Paperclip size={13} className="text-amber-500" /> Uploaded Documentation & Media Files
                                        </span>
                                        <div className="grid grid-cols-1 gap-3">
                                            {Object.entries(selectedDetailModal.test_analysis_docs).map(([optId, doc]) => {
                                                if (!doc || (!doc.fileName && !doc.notes && !doc.fileData)) return null;
                                                const optionObj = TEST_ANALYSIS_OPTIONS.find(o => o.id === optId);
                                                const optTitle = optionObj ? optionObj.label : optId;
                                                const fileUrl = doc.fileData || doc.fileUrl;
                                                const isImage = fileUrl && (fileUrl.startsWith('data:image/') || (doc.fileName && doc.fileName.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)));

                                                return (
                                                    <div key={optId} className={`p-4 rounded-xl border space-y-3 ${
                                                        isDarkMode ? 'bg-slate-950/60 border-white/10 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800 shadow-sm'
                                                    }`}>
                                                        <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 uppercase block tracking-wide">{optTitle}</span>

                                                        {doc.fileName && (
                                                            <div className={`flex items-center justify-between p-3 rounded-lg border text-xs ${
                                                                isDarkMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-300/80'
                                                            }`}>
                                                                <div className="flex items-center gap-2 truncate pr-2">
                                                                    <FileText size={16} className="text-amber-500 shrink-0" />
                                                                    <span className={`font-bold truncate text-xs ${isDarkMode ? 'text-amber-400' : 'text-amber-800'}`}>{doc.fileName}</span>
                                                                </div>
                                                                {fileUrl && (
                                                                    <a
                                                                        href={fileUrl}
                                                                        download={doc.fileName}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-[11px] font-bold hover:bg-amber-600 transition-all shrink-0 shadow-md"
                                                                    >
                                                                        <Download size={13} /> Download / View File
                                                                    </a>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Image Preview */}
                                                        {isImage && (
                                                            <div className={`mt-2 rounded-xl overflow-hidden border max-h-60 flex items-center justify-center p-2 ${
                                                                isDarkMode ? 'bg-black/50 border-white/10' : 'bg-slate-100 border-slate-300'
                                                            }`}>
                                                                <img src={fileUrl} alt={doc.fileName} className="max-h-56 object-contain rounded-lg shadow-md" />
                                                            </div>
                                                        )}

                                                        {doc.notes && (
                                                            <div className={`text-xs font-mono p-3 rounded-lg border ${
                                                                isDarkMode ? 'bg-slate-900/90 border-white/10 text-slate-300' : 'bg-white border-slate-300 text-slate-800'
                                                            }`}>
                                                                <span className="text-[10px] font-bold uppercase text-amber-500 block mb-1">Documentation Note / Action Plan:</span>
                                                                {doc.notes}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <span className={`text-[10px] font-bold uppercase block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Syllabus Tracking</span>
                                        <p className="font-bold">{selectedDetailModal.syllabus_tracking}</p>
                                    </div>
                                    <div>
                                        <span className={`text-[10px] font-bold uppercase block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Class</span>
                                        <p className="font-bold">{(selectedDetailModal.selected_classes || []).join(', ') || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <span className={`text-[10px] font-bold uppercase block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Month</span>
                                        <p className="font-bold">{selectedDetailModal.month || 'N/A'}</p>
                                    </div>
                                </div>

                                <div>
                                    <span className={`text-[10px] font-bold uppercase block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Support Type</span>
                                    <p className="font-bold text-amber-600 dark:text-amber-400">{selectedDetailModal.support_type || 'N/A'}</p>
                                </div>

                                <div>
                                    <span className={`text-[10px] font-bold uppercase block mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Remark / Suggestion / Action Plan</span>
                                    <p className={`p-3 rounded-xl border text-xs font-medium ${
                                        isDarkMode ? 'bg-slate-950/40 border-white/10 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                                    }`}>
                                        {selectedDetailModal.remark_suggestion || 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MentorshipConversionTab;
