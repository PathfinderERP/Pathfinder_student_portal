import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserX, AlertTriangle, CheckCircle, Clock, Search, Filter, RefreshCw, Plus, X, Edit3, Trash2, User, BookOpen, AlertCircle, Sparkles, Building2, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import axios from 'axios';

const REASON_OPTIONS = [
    'Relocation / Moved Out',
    'Financial Constraints',
    'Health / Medical Issues',
    'School / Board Exam Priority',
    'Joined Competitor / Other Institute',
    'Lack of Academic Progress / Difficulty',
    'Personal / Family Reasons',
    'Course Completed / Early Exit',
    'Other Reason'
];

const FOLLOW_UP_OPTIONS = [
    'In Counseling',
    'Parent Follow-up Pending',
    'Fee Clearance Pending',
    'Exit Clearance Issued',
    'Course Retake Offered',
    'Scholarship Offered',
    'Resolved - Reactivated',
    'Closed / Discontinued'
];

const SearchableSelect = ({
    label,
    icon: Icon,
    badge,
    value,
    placeholder = "Select an option...",
    searchPlaceholder = "Type to search...",
    options = [],
    onChange,
    isDarkMode,
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const formattedOptions = useMemo(() => {
        return options.map(opt => {
            if (typeof opt === 'object' && opt !== null) {
                return opt;
            }
            return { value: opt, label: opt };
        });
    }, [options]);

    const filtered = useMemo(() => {
        if (!search.trim()) return formattedOptions;
        const q = search.trim().toLowerCase();
        return formattedOptions.filter(o => 
            (o.label || '').toLowerCase().includes(q) || 
            (o.sublabel || '').toLowerCase().includes(q) ||
            (o.value || '').toLowerCase().includes(q)
        );
    }, [formattedOptions, search]);

    const selectedOption = formattedOptions.find(o => o.value === value);

    return (
        <div className="space-y-1.5" ref={containerRef}>
            {label && (
                <div className="flex items-center justify-between gap-1.5">
                    <label className={`block font-bold text-xs flex items-center gap-1.5 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        {Icon && <Icon size={14} className="text-rose-500" />}
                        <span>{label}</span>
                    </label>
                    {badge && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
                            {badge}
                        </span>
                    )}
                </div>
            )}

            <div className="relative">
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                        setIsOpen(prev => !prev);
                        setSearch('');
                    }}
                    className={`w-full p-2.5 rounded-xl border text-xs font-semibold text-left flex items-center justify-between transition-all outline-none ${
                        isDarkMode
                            ? 'bg-slate-950 border-white/10 text-white hover:border-rose-500/50 focus:border-rose-500'
                            : 'bg-white border-slate-300 text-slate-900 hover:border-rose-400 focus:border-rose-500'
                    } ${isOpen ? 'ring-2 ring-rose-500/20 border-rose-500' : ''}`}
                >
                    <span className="truncate">
                        {selectedOption ? selectedOption.label : <span className="text-slate-400">{placeholder}</span>}
                    </span>
                    <ChevronDown size={15} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-rose-500' : ''}`} />
                </button>

                {isOpen && (
                    <div className={`absolute top-full left-0 right-0 mt-1 rounded-xl border shadow-2xl z-50 overflow-hidden flex flex-col max-h-60 animate-in fade-in zoom-in-95 duration-150 ${
                        isDarkMode ? 'bg-slate-900 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}>
                        {/* Search input inside dropdown */}
                        <div className={`p-2 border-b shrink-0 ${isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                                <input
                                    type="text"
                                    autoFocus
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={searchPlaceholder}
                                    className={`w-full pl-8 pr-7 py-1.5 rounded-lg border text-xs outline-none transition-all ${
                                        isDarkMode
                                            ? 'bg-slate-900 border-white/10 text-white placeholder:text-slate-500 focus:border-rose-500'
                                            : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-rose-500'
                                    }`}
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* List of items */}
                        <div className="overflow-y-auto custom-scrollbar flex-1 py-1">
                            {filtered.length === 0 ? (
                                <div className="p-3 text-center text-xs text-slate-400 italic">
                                    No matching results
                                </div>
                            ) : (
                                filtered.map((opt, i) => {
                                    const isSelected = opt.value === value;
                                    return (
                                        <button
                                            type="button"
                                            key={opt.value || i}
                                            onClick={() => {
                                                onChange(opt.value);
                                                setIsOpen(false);
                                                setSearch('');
                                            }}
                                            className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between ${
                                                isSelected
                                                    ? 'bg-rose-500 text-white font-bold'
                                                    : (isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800')
                                            }`}
                                        >
                                            <div className="truncate pr-2">
                                                <p className="truncate font-semibold">{opt.label}</p>
                                                {opt.sublabel && (
                                                    <p className={`text-[10px] truncate ${isSelected ? 'text-rose-100' : 'text-slate-400'}`}>
                                                        {opt.sublabel}
                                                    </p>
                                                )}
                                            </div>
                                            {isSelected && <CheckCircle size={14} className="shrink-0 text-white" />}
                                        </button>
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

const DCStoppedTab = ({ isAdminView = false, filterTeacherName = '', filterTeacherEmail = '' }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token, user } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    // Add / Edit Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
    const [editingRecordId, setEditingRecordId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [verifyingId, setVerifyingId] = useState(null);

    // Centre & Student states for Modal (PTM-like)
    const [dbStudents, setDbStudents] = useState([]);
    const [masterCentres, setMasterCentres] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [selectedDbStudent, setSelectedDbStudent] = useState(null);
    const [modalStudentSearch, setModalStudentSearch] = useState('');
    const [modalCentreSearch, setModalCentreSearch] = useState('');

    const defaultCentre = user?.centre_name || user?.centre || user?.centre_code || 'Kolkata Main Centre';
    const defaultTeacher = filterTeacherName || (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.username || 'Teacher'));

    const [formData, setFormData] = useState({
        student_name: '',
        roll_no: '',
        batch: '',
        status: 'DC Stopped',
        stopped_date: new Date().toISOString().split('T')[0],
        reason: 'Relocation / Moved Out',
        custom_reason: '',
        remarks: '',
        follow_up_status: 'In Counseling',
        centre_name: defaultCentre
    });

    const fetchDcStopped = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const apiUrl = getApiUrl();
            const params = {};
            if (isAdminView) {
                if (filterTeacherEmail || filterTeacherName) {
                    params.teacher = filterTeacherName || filterTeacherEmail;
                }
            } else {
                const teacherName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.username || '');
                if (teacherName) {
                    params.teacher = teacherName;
                }
            }
            const res = await axios.get(`${apiUrl}/api/dc-stopped/`, {
                params,
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (res.data?.data && Array.isArray(res.data.data)) {
                setStudents(res.data.data);
            } else {
                setStudents([]);
            }
        } catch (err) {
            console.error("DC Stopped fetch error:", err);
            setStudents([]);
        } finally {
            if (!isSilent) setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchMasterCentres = async () => {
        try {
            const apiUrl = getApiUrl();
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            let rawCentres = [];
            try {
                const res = await axios.get(`${apiUrl}/api/admin/erp-centres/`, { headers });
                rawCentres = res.data?.data || (Array.isArray(res.data) ? res.data : []);
            } catch (e) {
                console.warn("erp-centres notice:", e);
            }

            if (!rawCentres || rawCentres.length === 0) {
                try {
                    const resLocal = await axios.get(`${apiUrl}/api/centres/`, { headers });
                    rawCentres = resLocal.data?.data || (Array.isArray(resLocal.data) ? resLocal.data : []);
                } catch (e2) {
                    console.warn("centres fallback notice:", e2);
                }
            }

            const activeOnly = (rawCentres || []).filter(c => {
                if (c.is_active === false || c.is_active === 0 || c.is_active === 'false') return false;
                const st = String(c.status || '').toLowerCase().trim();
                if (st === 'deactive' || st === 'inactive' || st === 'disabled' || st === 'false' || st === '0') return false;
                return true;
            }).map(c => (c.centreName || c.name || '').trim()).filter(Boolean);

            const uniqueActive = Array.from(new Set(activeOnly));
            if (uniqueActive.length > 0) {
                setMasterCentres(uniqueActive);
            }
        } catch (err) {
            console.error("Error fetching master centres:", err);
        }
    };

    const isInvalidBatch = (val) => {
        if (!val || typeof val !== 'string') return true;
        const s = val.trim();
        if (!s) return true;
        if (['—', 'null', 'undefined', 'None', 'N/A', 'ERP Batch', 'General Batch', 'null null', 'Batch'].includes(s)) return true;
        // Filter out 24-character hexadecimal MongoDB ObjectIds (e.g. 69df815087c5f7bd0eaef72d)
        if (/^[0-9a-fA-F]{24}$/.test(s)) return true;
        // Filter out UUIDs
        if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s)) return true;
        return false;
    };

    const extractStudentBatch = (record) => {
        if (!record) return '';
        const st = record.student || record;
        const sa = record.student_academic || st.student_academic || {};
        const course = record.course || st.course || {};
        const cls = record.class || st.class || {};
        const d0 = Array.isArray(record.data) && record.data.length > 0 ? record.data[0] : {};

        const candidates = [
            record.batch_name,
            record.batch,
            record.batchName,
            st.batch_name,
            st.batch,
            st.batchName,
            sa.batch_name,
            sa.batch,
            sa.batchName,
            sa.sectionName,
            sa.section,
            record.exam_section,
            record.study_section,
            record.assigned_batch,
            st.exam_section,
            st.study_section,
            st.assigned_batch,
            course.examTagName,
            course.examTag,
            course.courseName,
            course.name,
            cls.className,
            cls.name,
            d0.examSection,
            d0.studySection,
            d0.className,
            d0.courseName,
            d0.section
        ];

        for (const c of candidates) {
            if (c && typeof c === 'string' && !isInvalidBatch(c)) {
                return c.trim();
            }
        }
        return '';
    };

    const fetchDbStudents = async () => {
        try {
            const apiUrl = getApiUrl();
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            let list = [];
            try {
                const res = await axios.get(`${apiUrl}/api/ptm-students/`, { headers });
                if (res.data?.data && Array.isArray(res.data.data)) {
                    list = res.data.data.map(item => ({
                        ...item,
                        batch: (item.batch && !['ERP Batch', 'General Batch', '—'].includes(String(item.batch).trim())) ? String(item.batch).trim() : ''
                    }));
                }
            } catch (e) {
                console.warn("ptm-students notice:", e);
            }
            if (list.length === 0) {
                try {
                    const res2 = await axios.get(`${apiUrl}/api/admin/erp-students/`, { headers });
                    const rawList = res2.data?.data || (Array.isArray(res2.data) ? res2.data : []);
                    if (rawList && rawList.length > 0) {
                        list = rawList.map(item => {
                            const name = item.student_name || item.name || item.studentName || item.full_name || '';
                            const roll = item.roll_no || item.rollNo || item.admission_number || item.admissionNo || item.student_id || '';
                            const batch = extractStudentBatch(item);
                            const centre = item.centre_name || item.centre || item.centreName || '';
                            return {
                                id: item.id || item._id || roll || name,
                                student_name: name,
                                roll_no: roll,
                                batch: batch,
                                centre_name: centre
                            };
                        }).filter(s => s.student_name);
                    }
                } catch (e) {
                    console.warn("erp-students notice:", e);
                }
            }
            setDbStudents(list);
        } catch (err) {
            console.error("Error fetching students:", err);
        }
    };

    useEffect(() => {
        fetchDcStopped();
        fetchDbStudents();
        fetchMasterCentres();

        const handleFocus = () => {
            fetchDcStopped(true);
        };

        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }, [isAdminView, filterTeacherName, filterTeacherEmail]);

    // Unique Centres derived from Active Master Centres API (fallback to students)
    const availableCentres = useMemo(() => {
        if (masterCentres.length > 0) {
            return masterCentres.slice().sort();
        }
        const centresSet = new Set();
        if (defaultCentre) centresSet.add(defaultCentre);
        dbStudents.forEach(st => {
            if (st.centre_name && typeof st.centre_name === 'string' && st.centre_name.trim()) {
                centresSet.add(st.centre_name.trim());
            }
        });
        return Array.from(centresSet).sort();
    }, [masterCentres, dbStudents, defaultCentre]);

    // Filtered Centres based on Modal Centre Search Query
    const searchedCentres = useMemo(() => {
        if (!modalCentreSearch.trim()) return availableCentres;
        const q = modalCentreSearch.trim().toLowerCase();
        return availableCentres.filter(c => c.toLowerCase().includes(q));
    }, [availableCentres, modalCentreSearch]);

    // Filter database students based on selected Centre in modal
    const filteredDbStudents = useMemo(() => {
        if (!formData.centre_name || formData.centre_name === 'ALL') {
            return dbStudents;
        }
        const target = formData.centre_name.trim().toLowerCase();
        return dbStudents.filter(st => {
            if (!st.centre_name) return true;
            const cName = String(st.centre_name).trim().toLowerCase();
            return cName.includes(target) || target.includes(cName);
        });
    }, [dbStudents, formData.centre_name]);

    // Options formatted for SearchableSelect
    const centreOptions = useMemo(() => {
        const list = [{ value: 'ALL', label: '🌐 All Centres (Show All Students)' }];
        availableCentres.forEach(c => {
            list.push({ value: c, label: `🏢 ${c}` });
        });
        return list;
    }, [availableCentres]);

    const studentOptions = useMemo(() => {
        const list = filteredDbStudents.map(st => {
            const batchDisplay = (st.batch && typeof st.batch === 'string' && !isInvalidBatch(st.batch))
                ? st.batch.trim()
                : '';
            const rollDisplay = st.admission_number || st.roll_no || '';
            const parts = [rollDisplay, batchDisplay, st.centre_name].filter(Boolean);
            const sublabel = parts.join(' • ');

            return {
                value: String(st.id),
                label: st.student_name,
                sublabel: sublabel || 'Student Profile'
            };
        });
        list.push({ value: 'manual', label: '✏️ Enter Custom / Manual Student', sublabel: 'Type name, roll number, and batch manually' });
        return list;
    }, [filteredDbStudents]);

    const handleDbStudentSelect = (studentId) => {
        setSelectedStudentId(studentId);
        if (!studentId || studentId === 'manual') {
            setSelectedDbStudent(null);
            return;
        }

        const found = dbStudents.find(s => String(s.id) === String(studentId));
        if (found) {
            setSelectedDbStudent(found);
            const validBatch = (found.batch && !isInvalidBatch(found.batch)) ? found.batch : '';
            setFormData(prev => ({
                ...prev,
                student_name: found.student_name || '',
                roll_no: found.admission_number || found.roll_no || prev.roll_no || '',
                batch: validBatch || prev.batch || '',
                centre_name: found.centre_name || prev.centre_name
            }));
        }
    };

    const handleOpenAddModal = () => {
        setModalMode('add');
        setEditingRecordId(null);
        setFormError('');
        setSelectedStudentId('');
        setSelectedDbStudent(null);
        setModalStudentSearch('');
        setModalCentreSearch('');
        setFormData({
            student_name: '',
            roll_no: '',
            batch: '',
            status: 'DC Stopped',
            stopped_date: new Date().toISOString().split('T')[0],
            reason: 'Relocation / Moved Out',
            custom_reason: '',
            remarks: '',
            follow_up_status: 'In Counseling',
            centre_name: defaultCentre
        });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (st) => {
        setModalMode('edit');
        setEditingRecordId(st.id);
        setFormError('');
        setSelectedStudentId('');
        setSelectedDbStudent(null);
        setModalStudentSearch('');
        setModalCentreSearch('');
        const isStandardReason = REASON_OPTIONS.includes(st.reason);
        setFormData({
            student_name: st.student_name || '',
            roll_no: st.roll_no || '',
            batch: st.batch || '',
            status: st.status || 'DC Stopped',
            stopped_date: st.stopped_date && st.stopped_date !== 'N/A' ? st.stopped_date : new Date().toISOString().split('T')[0],
            reason: isStandardReason ? st.reason : 'Other Reason',
            custom_reason: isStandardReason ? '' : (st.reason === 'N/A' ? '' : st.reason),
            remarks: st.remarks || '',
            follow_up_status: st.follow_up_status || 'In Counseling',
            centre_name: st.centre_name || defaultCentre
        });
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!formData.student_name.trim()) {
            setFormError('Please enter or select a student name.');
            return;
        }

        setSubmitting(true);
        setFormError('');

        const finalReason = formData.reason === 'Other Reason'
            ? (formData.custom_reason.trim() || 'Other Reason')
            : formData.reason;

        try {
            const apiUrl = getApiUrl();
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            if (modalMode === 'add') {
                const payload = {
                    student_name: formData.student_name.trim(),
                    roll_no: formData.roll_no.trim(),
                    batch: formData.batch.trim(),
                    status: formData.status,
                    stopped_date: formData.status === 'DC Stopped' ? formData.stopped_date : 'N/A',
                    reason: finalReason,
                    remarks: formData.remarks.trim(),
                    follow_up_status: formData.follow_up_status,
                    centre_name: formData.centre_name,
                    recorded_by: defaultTeacher
                };
                const res = await axios.post(`${apiUrl}/api/dc-stopped/`, payload, { headers });
                if (res.data?.status === 'success' && res.data.data) {
                    setStudents(prev => [res.data.data, ...prev]);
                    setIsModalOpen(false);
                }
            } else {
                const payload = {
                    id: editingRecordId,
                    student_name: formData.student_name.trim(),
                    roll_no: formData.roll_no.trim(),
                    batch: formData.batch.trim(),
                    status: formData.status,
                    stopped_date: formData.status === 'DC Stopped' ? formData.stopped_date : 'N/A',
                    reason: finalReason,
                    remarks: formData.remarks.trim(),
                    follow_up_status: formData.follow_up_status,
                    centre_name: formData.centre_name
                };
                const res = await axios.put(`${apiUrl}/api/dc-stopped/`, payload, { headers });
                if (res.data?.status === 'success' && res.data.data) {
                    setStudents(prev => prev.map(s => s.id === editingRecordId ? res.data.data : s));
                    setIsModalOpen(false);
                }
            }
        } catch (err) {
            console.error("Error saving DC stopped record:", err);
            setFormError(err.response?.data?.message || 'Failed to save record. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleStatus = async (st) => {
        const newStatus = st.status === 'Active' ? 'DC Stopped' : 'Active';
        const newDate = newStatus === 'DC Stopped' ? new Date().toISOString().split('T')[0] : 'N/A';
        
        // Optimistic UI update
        setStudents(prev => prev.map(item => {
            if (item.id === st.id) {
                return {
                    ...item,
                    status: newStatus,
                    stopped_date: newDate
                };
            }
            return item;
        }));

        try {
            const apiUrl = getApiUrl();
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            await axios.put(`${apiUrl}/api/dc-stopped/`, {
                id: st.id,
                student_name: st.student_name,
                roll_no: st.roll_no,
                batch: st.batch,
                status: newStatus,
                stopped_date: newDate
            }, { headers });
        } catch (err) {
            console.error("Error updating status:", err);
            // Revert on error
            fetchDcStopped();
        }
    };

    const handleApprove = async (st) => {
        setVerifyingId(st.id);
        try {
            const apiUrl = getApiUrl();
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const currentAdminName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.username || 'Super Admin');
            const res = await axios.put(`${apiUrl}/api/dc-stopped/`, {
                id: st.id,
                student_name: st.student_name,
                roll_no: st.roll_no,
                batch: st.batch,
                verification_status: 'Approved',
                is_verified: true,
                verified_by: currentAdminName
            }, { headers });

            if (res.data?.status === 'success' && res.data.data) {
                setStudents(prev => prev.map(item => item.id === st.id ? { ...item, ...res.data.data } : item));
            }
        } catch (err) {
            console.error("Error approving record:", err);
        } finally {
            setVerifyingId(null);
        }
    };

    const handleReject = async (st, reason = 'Rejected by Admin') => {
        setVerifyingId(st.id);
        try {
            const apiUrl = getApiUrl();
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const currentAdminName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.username || 'Super Admin');
            const res = await axios.put(`${apiUrl}/api/dc-stopped/`, {
                id: st.id,
                student_name: st.student_name,
                roll_no: st.roll_no,
                batch: st.batch,
                verification_status: 'Rejected',
                is_verified: false,
                verified_by: currentAdminName,
                rejection_reason: reason
            }, { headers });

            if (res.data?.status === 'success' && res.data.data) {
                setStudents(prev => prev.map(item => item.id === st.id ? { ...item, ...res.data.data } : item));
            }
        } catch (err) {
            console.error("Error rejecting record:", err);
        } finally {
            setVerifyingId(null);
        }
    };

    const handleDeleteRecord = async (id, name) => {
        if (!window.confirm(`Are you sure you want to remove the DC Stopped record for "${name}"?`)) {
            return;
        }

        // Optimistic UI update
        setStudents(prev => prev.filter(st => st.id !== id));

        try {
            const apiUrl = getApiUrl();
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            await axios.delete(`${apiUrl}/api/dc-stopped/?id=${id}&student_name=${encodeURIComponent(name)}`, { headers });
        } catch (err) {
            console.error("Error deleting record:", err);
            fetchDcStopped();
        }
    };

    const getVerificationStatus = (st) => {
        if (!st) return 'Pending';
        if (st.verification_status === 'Approved' || st.is_verified === true || String(st.is_verified).toLowerCase() === 'true') {
            return 'Approved';
        }
        if (st.verification_status === 'Rejected' || String(st.status).toLowerCase() === 'rejected') {
            return 'Rejected';
        }
        return 'Pending';
    };

    const totalCount = students.length;
    const approvedCount = students.filter(st => getVerificationStatus(st) === 'Approved').length;
    const pendingCount = students.filter(st => getVerificationStatus(st) === 'Pending').length;
    const rejectedCount = students.filter(st => getVerificationStatus(st) === 'Rejected').length;

    const filteredStudents = useMemo(() => {
        return students.filter(st => {
            const q = searchQuery.toLowerCase();
            const matchesSearch = (
                (st.student_name || '').toLowerCase().includes(q) ||
                (st.roll_no || '').toLowerCase().includes(q) ||
                (st.centre_name || '').toLowerCase().includes(q) ||
                (st.batch || '').toLowerCase().includes(q) ||
                (st.reason || '').toLowerCase().includes(q) ||
                (st.remarks || '').toLowerCase().includes(q)
            );

            let matchesStatus = true;
            if (statusFilter === 'All') {
                matchesStatus = true;
            } else if (statusFilter === 'DC Stopped') {
                matchesStatus = st.status === 'DC Stopped';
            } else if (statusFilter === 'Active') {
                matchesStatus = st.status === 'Active';
            } else if (statusFilter === 'Approved') {
                matchesStatus = getVerificationStatus(st) === 'Approved';
            } else if (statusFilter === 'Pending') {
                matchesStatus = getVerificationStatus(st) === 'Pending';
            } else if (statusFilter === 'Rejected') {
                matchesStatus = getVerificationStatus(st) === 'Rejected';
            }

            return matchesSearch && matchesStatus;
        });
    }, [students, searchQuery, statusFilter]);

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-xl backdrop-blur-xl transition-all`}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                <UserX size={22} />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight">DC Stopped (Discontinued Students)</h2>
                        </div>
                        <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Manage students who have discontinued or stopped attending classes. Track verification, reason, and follow-up notes.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end flex-wrap">
                        <div className={`flex items-center gap-1 p-1 rounded-xl border ${
                            isDarkMode
                                ? 'bg-slate-800/90 border-white/10'
                                : 'bg-slate-100 border-slate-200'
                        }`}>
                            {['All', 'Approved', 'Pending', 'Rejected'].map(st => (
                                <button
                                    key={st}
                                    onClick={() => setStatusFilter(st)}
                                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                                        statusFilter === st
                                            ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                                            : (isDarkMode
                                                ? 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                                                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/80')
                                    }`}
                                >
                                    {st}
                                </button>
                            ))}
                        </div>

                        {!isAdminView && (
                            <button
                                onClick={handleOpenAddModal}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/25 transition-all transform active:scale-95 shrink-0"
                            >
                                <Plus size={16} />
                                <span>Mark Student DC Stopped</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-rose-950/20 border-rose-500/20' : 'bg-rose-50 border-rose-200'} space-y-2`}>
                    <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">Total DC Stopped</span>
                    <div className="flex items-center justify-between">
                        <span className="text-2xl font-black text-rose-500">{totalCount}</span>
                        <UserX className="text-rose-500/80" size={24} />
                    </div>
                    <p className={`text-[11px] font-medium ${isDarkMode ? 'text-rose-400/80' : 'text-rose-600'}`}>Total Discontinued Students</p>
                </div>

                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-emerald-50/60 border-emerald-200'} space-y-2`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Approved & Verified</span>
                    <div className="flex items-center justify-between">
                        <span className={`text-2xl font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{approvedCount}</span>
                        <CheckCircle className={isDarkMode ? 'text-emerald-400/80' : 'text-emerald-600/80'} size={24} />
                    </div>
                    <p className={`text-[11px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Verified by Administration</p>
                </div>

                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-amber-50/60 border-amber-200'} space-y-2`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>Pending Review</span>
                    <div className="flex items-center justify-between">
                        <span className={`text-2xl font-black ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>{pendingCount}</span>
                        <Clock className={isDarkMode ? 'text-amber-400/80' : 'text-amber-600/80'} size={24} />
                    </div>
                    <p className={`text-[11px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Awaiting Admin Approval</p>
                </div>

                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Rejected Records</span>
                    <div className="flex items-center justify-between">
                        <span className={`text-2xl font-black ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}>{rejectedCount}</span>
                        <X className={isDarkMode ? 'text-rose-400/80' : 'text-rose-600/80'} size={24} />
                    </div>
                    <p className={`text-[11px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Declined / Non-verified</p>
                </div>
            </div>

            {/* Search and Refresh */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search discontinued students by name, roll no, batch, or reason..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-semibold outline-none transition-all ${
                            isDarkMode
                                ? 'bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500 focus:border-rose-500'
                                : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-rose-500'
                        }`}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                                isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                            }`}
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                <button
                    onClick={() => {
                        setRefreshing(true);
                        fetchDcStopped();
                    }}
                    title="Refresh List"
                    className={`p-2.5 rounded-xl border transition-all ${
                        isDarkMode
                            ? 'bg-slate-900/60 border-white/10 text-slate-300 hover:text-white hover:bg-slate-800'
                            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                    <RefreshCw size={16} className={refreshing || loading ? 'animate-spin text-rose-500' : ''} />
                </button>
            </div>

            {/* Student Registry Table or Empty State */}
            <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'} shadow-xl`}>
                {loading ? (
                    <div className="py-20 text-center space-y-3">
                        <RefreshCw className="animate-spin text-rose-500 mx-auto" size={32} />
                        <p className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading discontinued students registry...</p>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="py-16 px-6 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
                            <UserX size={32} />
                        </div>
                        <div className="space-y-1 max-w-md mx-auto">
                            <h3 className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {searchQuery || statusFilter !== 'All' ? 'No Matching Students Found' : 'No Discontinued Students Recorded'}
                            </h3>
                            <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {searchQuery || statusFilter !== 'All'
                                    ? 'Try adjusting your search criteria or resetting filters.'
                                    : 'There are currently no discontinued (DC Stopped) students in the system.'}
                            </p>
                        </div>
                        {!(searchQuery || statusFilter !== 'All') && !isAdminView && (
                            <button
                                onClick={handleOpenAddModal}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/25 transition-all"
                            >
                                <Plus size={16} />
                                <span>Mark Student DC Stopped</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className={`border-b font-extrabold uppercase tracking-wider text-[11px] ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                                    <th className="p-4">Student Name & Roll</th>
                                    <th className="p-4">Centre</th>
                                    <th className="p-4">Batch</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Stopped Date</th>
                                    <th className="p-4">Reason</th>
                                    <th className="p-4">Remarks & Follow-up</th>
                                    <th className="p-4 text-center">{isAdminView ? 'Admin Verification' : 'Verification Status'}</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-200'}`}>
                                {filteredStudents.map(st => (
                                    <tr key={st.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/80'}`}>
                                        <td className="p-4 font-bold text-sm">
                                            <p className={isDarkMode ? 'text-white' : 'text-slate-900'}>{st.student_name}</p>
                                            <p className={`text-[11px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {st.roll_no || 'N/A'}
                                            </p>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                                isDarkMode ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                            }`}>
                                                <Building2 size={12} className="opacity-70 shrink-0" />
                                                <span className="truncate max-w-[140px]">{st.centre_name || 'N/A'}</span>
                                            </span>
                                        </td>
                                        <td className={`p-4 font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                            {st.batch || 'N/A'}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                    st.status === 'DC Stopped'
                                                        ? (isDarkMode ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-rose-100 text-rose-700 border border-rose-200')
                                                        : (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-100 text-emerald-700 border border-emerald-200')
                                                }`}>
                                                    {st.status}
                                                </span>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider ${
                                                    getVerificationStatus(st) === 'Approved'
                                                        ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
                                                        : getVerificationStatus(st) === 'Rejected'
                                                            ? (isDarkMode ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-rose-50 text-rose-700 border border-rose-200')
                                                            : (isDarkMode ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-50 text-amber-700 border border-amber-200')
                                                }`}>
                                                    {getVerificationStatus(st) === 'Approved' ? '✓ Verified' : getVerificationStatus(st) === 'Rejected' ? '✕ Rejected' : '⏳ Pending'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className={`p-4 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {st.stopped_date ? String(st.stopped_date).split('T')[0].split(' ')[0] : 'N/A'}
                                        </td>
                                        <td className={`p-4 font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                                            {st.reason || 'N/A'}
                                        </td>
                                        <td className="p-4 max-w-xs">
                                            <p className={`line-clamp-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                {st.remarks || 'No remarks provided.'}
                                            </p>
                                            <span className={`text-[10px] inline-block font-semibold mt-1 px-2 py-0.5 rounded-md ${
                                                isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {st.follow_up_status || 'In Counseling'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            {isAdminView ? (
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {getVerificationStatus(st) === 'Approved' ? (
                                                        <div className="inline-flex items-center gap-1.5">
                                                            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider ${
                                                                isDarkMode
                                                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-emerald-500/10'
                                                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-emerald-500/10'
                                                            }`}>
                                                                <CheckCircle size={13} className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} />
                                                                <span>Approved</span>
                                                            </span>
                                                            <button
                                                                onClick={() => handleReject(st)}
                                                                disabled={verifyingId === st.id}
                                                                title="Change status to Rejected"
                                                                className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${
                                                                    isDarkMode
                                                                        ? 'border border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                                                                        : 'border border-rose-200 text-rose-600 hover:bg-rose-50'
                                                                } disabled:opacity-50`}
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    ) : getVerificationStatus(st) === 'Rejected' ? (
                                                        <div className="inline-flex items-center gap-1.5">
                                                            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider ${
                                                                isDarkMode
                                                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-rose-500/10'
                                                                    : 'bg-rose-50 text-rose-700 border border-rose-300 shadow-rose-500/10'
                                                            }`}>
                                                                <X size={13} className="text-rose-500" />
                                                                <span>Rejected</span>
                                                            </span>
                                                            <button
                                                                onClick={() => handleApprove(st)}
                                                                disabled={verifyingId === st.id}
                                                                title="Change status to Approved"
                                                                className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${
                                                                    isDarkMode
                                                                        ? 'border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                                                        : 'border border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                                                } disabled:opacity-50`}
                                                            >
                                                                Approve
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                onClick={() => handleApprove(st)}
                                                                disabled={verifyingId === st.id}
                                                                title="Approve & Verify this record"
                                                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all transform active:scale-95 shadow-sm ${
                                                                    isDarkMode
                                                                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/20'
                                                                        : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-500/20'
                                                                } disabled:opacity-50`}
                                                            >
                                                                {verifyingId === st.id ? (
                                                                    <RefreshCw size={12} className="animate-spin text-white" />
                                                                ) : (
                                                                    <CheckCircle size={12} className="text-white" />
                                                                )}
                                                                <span>Approve</span>
                                                            </button>

                                                            <button
                                                                onClick={() => handleReject(st)}
                                                                disabled={verifyingId === st.id}
                                                                title="Reject this record"
                                                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all transform active:scale-95 shadow-sm ${
                                                                    isDarkMode
                                                                        ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
                                                                        : 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200'
                                                                } disabled:opacity-50`}
                                                            >
                                                                <X size={12} />
                                                                <span>Reject</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                        getVerificationStatus(st) === 'Approved'
                                                            ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm' : 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm')
                                                            : getVerificationStatus(st) === 'Rejected'
                                                                ? (isDarkMode ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm' : 'bg-rose-100 text-rose-800 border border-rose-300 shadow-sm')
                                                                : (isDarkMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-100 text-amber-700 border border-amber-200')
                                                    }`}>
                                                        {getVerificationStatus(st) === 'Approved' ? <CheckCircle size={12} /> : getVerificationStatus(st) === 'Rejected' ? <X size={12} /> : <Clock size={12} />}
                                                        <span>{getVerificationStatus(st) === 'Approved' ? 'Approved & Verified' : getVerificationStatus(st) === 'Rejected' ? 'Rejected' : 'Pending Review'}</span>
                                                    </span>
                                                    {getVerificationStatus(st) === 'Approved' && st.verified_by && (
                                                        <span className={`text-[9px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                            by {st.verified_by}
                                                        </span>
                                                    )}
                                                    {getVerificationStatus(st) === 'Rejected' && st.rejection_reason && (
                                                        <span className={`text-[9px] font-medium max-w-[130px] truncate ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`} title={st.rejection_reason}>
                                                            {st.rejection_reason}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add / Edit DC Stopped Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex justify-center items-start pt-20 sm:pt-24 pb-8 px-4 overflow-hidden animate-in fade-in duration-200">
                    <div className={`w-full max-w-xl sm:max-w-2xl rounded-2xl border shadow-2xl relative z-10 flex flex-col max-h-[82vh] overflow-hidden ${
                        isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}>
                        {/* Fixed Modal Header */}
                        <div className={`p-4 sm:p-5 flex items-center justify-between border-b shrink-0 ${
                            isDarkMode ? 'border-white/10 bg-slate-900/95' : 'border-slate-200 bg-white/95'
                        } backdrop-blur-md rounded-t-2xl z-20`}>
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                    <UserX size={18} />
                                </div>
                                <h3 className="text-lg font-black tracking-tight">
                                    {modalMode === 'add' ? 'Mark Student as DC Stopped' : 'Edit DC Stopped Record'}
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                    isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                                }`}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Form with Scrollable Body & Fixed Footer */}
                        <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            <div className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1 custom-scrollbar">
                                {formError && (
                                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                                        <AlertCircle size={16} className="shrink-0" />
                                        <span>{formError}</span>
                                    </div>
                                )}

                            {/* Step 1: Select Centre / Branch */}
                            <SearchableSelect
                                label="1. Select Centre / Branch *"
                                icon={Building2}
                                badge={`${availableCentres.length} Centres`}
                                value={formData.centre_name}
                                placeholder="Choose Centre / Branch..."
                                searchPlaceholder="🔍 Search centre / branch..."
                                options={centreOptions}
                                onChange={(newCentre) => {
                                    setFormData(prev => ({ ...prev, centre_name: newCentre }));
                                    setSelectedStudentId('');
                                    setSelectedDbStudent(null);
                                }}
                                isDarkMode={isDarkMode}
                            />

                            {/* Step 2: Select Student (Filtered by Selected Centre) */}
                            <div className={`space-y-2 p-3 rounded-xl border ${isDarkMode ? 'bg-rose-950/20 border-rose-500/30' : 'bg-rose-50/70 border-rose-200'}`}>
                                <SearchableSelect
                                    label={`2. Select Student (${formData.centre_name === 'ALL' ? 'All Centres' : formData.centre_name}) *`}
                                    icon={UserX}
                                    badge={`${filteredDbStudents.length} Students`}
                                    value={selectedStudentId}
                                    placeholder="-- Choose Student from Database --"
                                    searchPlaceholder="🔍 Search student name, roll no, or batch..."
                                    options={studentOptions}
                                    onChange={(studentId) => handleDbStudentSelect(studentId)}
                                    isDarkMode={isDarkMode}
                                />

                                {selectedDbStudent && (
                                    <div className={`mt-2 p-2.5 rounded-lg text-[11px] font-bold flex items-center justify-between gap-2 border ${
                                        isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    }`}>
                                        <span className="flex items-center gap-1.5 truncate">
                                            <CheckCircle size={13} className="shrink-0 text-emerald-500" />
                                            <span className="truncate">Database Profile Loaded: <strong>{selectedDbStudent.student_name}</strong></span>
                                        </span>
                                        <span className="shrink-0 font-mono text-[10px] opacity-90 px-1.5 py-0.5 rounded bg-emerald-500/20">
                                            {selectedDbStudent.admission_number || selectedDbStudent.roll_no || selectedDbStudent.batch}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Student Name & Roll Number */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Student Full Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Karan Ghosh"
                                        value={formData.student_name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, student_name: e.target.value }))}
                                        required
                                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold outline-none transition-all ${
                                            isDarkMode
                                                ? 'bg-slate-950 border-white/10 text-white focus:border-rose-500'
                                                : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500'
                                        }`}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Roll No / Admission No
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. PATH25001079"
                                        value={formData.roll_no}
                                        onChange={(e) => setFormData(prev => ({ ...prev, roll_no: e.target.value }))}
                                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold outline-none transition-all ${
                                            isDarkMode
                                                ? 'bg-slate-950 border-white/10 text-white focus:border-rose-500'
                                                : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500'
                                        }`}
                                    />
                                </div>
                            </div>

                            {/* Batch / Course - Dedicated Full Width Row */}
                            <div className="space-y-1.5">
                                <label className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Batch / Course Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. FOUNDATION CLASS 9 INSTATION or JEE 2-YR"
                                    value={formData.batch}
                                    onChange={(e) => setFormData(prev => ({ ...prev, batch: e.target.value }))}
                                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold outline-none transition-all ${
                                        isDarkMode
                                            ? 'bg-slate-950 border-white/10 text-white focus:border-rose-500'
                                            : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500'
                                    }`}
                                />
                            </div>

                            {/* Status and Stopped Date */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Status
                                    </label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold outline-none transition-all ${
                                            isDarkMode
                                                ? 'bg-slate-950 border-white/10 text-white focus:border-rose-500'
                                                : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500'
                                        }`}
                                    >
                                        <option value="DC Stopped">DC Stopped (Discontinued)</option>
                                        <option value="Active">Active (Reactivated)</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Discontinued Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.stopped_date}
                                        onChange={(e) => setFormData(prev => ({ ...prev, stopped_date: e.target.value }))}
                                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold outline-none transition-all ${
                                            isDarkMode
                                                ? 'bg-slate-950 border-white/10 text-white focus:border-rose-500'
                                                : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500'
                                        }`}
                                    />
                                </div>
                            </div>

                            {/* Reason Dropdown */}
                            <div className="space-y-1.5">
                                <label className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Reason for Discontinuation
                                </label>
                                <select
                                    value={formData.reason}
                                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold outline-none transition-all ${
                                        isDarkMode
                                            ? 'bg-slate-950 border-white/10 text-white focus:border-rose-500'
                                            : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500'
                                    }`}
                                >
                                    {REASON_OPTIONS.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>

                            {formData.reason === 'Other Reason' && (
                                <div className="space-y-1.5">
                                    <label className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Specify Other Reason
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enter specific reason..."
                                        value={formData.custom_reason}
                                        onChange={(e) => setFormData(prev => ({ ...prev, custom_reason: e.target.value }))}
                                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold outline-none transition-all ${
                                            isDarkMode
                                                ? 'bg-slate-950 border-white/10 text-white focus:border-rose-500'
                                                : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500'
                                        }`}
                                    />
                                </div>
                            )}

                            {/* Follow-up Status */}
                            <div className="space-y-1.5">
                                <label className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Follow-up / Action Status
                                </label>
                                <select
                                    value={formData.follow_up_status}
                                    onChange={(e) => setFormData(prev => ({ ...prev, follow_up_status: e.target.value }))}
                                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold outline-none transition-all ${
                                        isDarkMode
                                            ? 'bg-slate-950 border-white/10 text-white focus:border-rose-500'
                                            : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500'
                                    }`}
                                >
                                    {FOLLOW_UP_OPTIONS.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Remarks */}
                            <div className="space-y-1.5">
                                <label className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Remarks & Detailed Notes
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Enter conversation notes, exit clearance details, or counseling status..."
                                    value={formData.remarks}
                                    onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold outline-none transition-all resize-none ${
                                        isDarkMode
                                            ? 'bg-slate-950 border-white/10 text-white focus:border-rose-500'
                                            : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500'
                                    }`}
                                />
                            </div>
                        </div>

                        {/* Fixed Modal Footer */}
                        <div className={`p-4 sm:p-5 flex items-center justify-end gap-3 border-t shrink-0 ${
                            isDarkMode ? 'border-white/10 bg-slate-900/95' : 'border-slate-200 bg-white/95'
                        } rounded-b-2xl z-20`}>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                    isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/25 transition-all disabled:opacity-50"
                            >
                                {submitting ? 'Saving...' : (modalMode === 'add' ? 'Save Record' : 'Update Record')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            )}
        </div>
    );
};

export default DCStoppedTab;

