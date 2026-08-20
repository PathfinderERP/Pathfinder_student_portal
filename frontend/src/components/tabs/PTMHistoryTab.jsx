import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Users, Calendar, MessageSquare, AlertCircle, CheckCircle2, Clock, Plus, Search, Filter, GraduationCap, Upload, FileText, X, Paperclip, ExternalLink, Download, Loader2, MapPin, Building2, UserCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import axios from 'axios';

const PTMHistoryTab = ({ isAdminView = false, filterTeacherName = '' }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token, user } = useAuth();
    const [ptmRecords, setPtmRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const fileInputRef = useRef(null);

    // Database students state
    const [dbStudents, setDbStudents] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [selectedDbStudent, setSelectedDbStudent] = useState(null);
    const [modalStudentSearch, setModalStudentSearch] = useState('');

    const defaultCentre = user?.centre_name || user?.centre || user?.centre_code || 'Kolkata Main Centre';
    const defaultTeacher = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.username || 'Dr. Rajesh Sharma');

    const [formData, setFormData] = useState({
        student_name: '',
        parent_name: '',
        teacher_name: defaultTeacher,
        centre_name: defaultCentre,
        admission_number: '',
        ptm_date: new Date().toISOString().split('T')[0],
        discussion_remarks: '',
        student_performance: 'Satisfactory',
        issues_discussed: '',
        follow_up_required: true,
        next_ptm_date: '',
        document_title: ''
    });

    const fetchPtm = async () => {
        setLoading(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/ptm-records/`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (res.data?.data && Array.isArray(res.data.data)) {
                setPtmRecords(res.data.data);
            } else {
                setPtmRecords([]);
            }
        } catch (err) {
            console.error("PTM records fetch error:", err);
            setPtmRecords([]);
        } finally {
            setLoading(false);
        }
    };

    const extractErpParentName = (record) => {
        if (!record) return '';
        const st = record.student || record;

        // 1. Check guardians array inside student or record
        const guardians = st.guardians || record.guardians || [];
        if (Array.isArray(guardians) && guardians.length > 0) {
            for (const g of guardians) {
                if (g && typeof g === 'object') {
                    const gName = g.guardianName || g.name || g.fatherName || g.motherName;
                    if (gName && typeof gName === 'string' && gName.trim()) {
                        return gName.trim();
                    }
                }
            }
        }

        // 2. Check guardians array inside studentsDetails
        const details = st.studentsDetails || record.studentsDetails || [];
        if (Array.isArray(details) && details.length > 0) {
            for (const d of details) {
                if (d && typeof d === 'object') {
                    const sdGuardians = d.guardians || [];
                    if (Array.isArray(sdGuardians) && sdGuardians.length > 0) {
                        for (const g of sdGuardians) {
                            if (g && typeof g === 'object') {
                                const gName = g.guardianName || g.name || g.fatherName || g.motherName;
                                if (gName && typeof gName === 'string' && gName.trim()) {
                                    return gName.trim();
                                }
                            }
                        }
                    }
                }
            }
        }

        // 3. Direct fields
        const directFields = [
            st.guardianName, st.fatherName, st.father_name, st.motherName, st.mother_name, st.parentName, st.parent_name,
            record.guardianName, record.fatherName, record.father_name, record.motherName, record.mother_name, record.parentName, record.parent_name
        ];
        for (const f of directFields) {
            if (f && typeof f === 'string' && f.trim()) {
                return f.trim();
            }
        }

        return '';
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
        const sa = record.sectionAllotment || st.sectionAllotment || {};
        const details = st.studentsDetails || record.studentsDetails || [];
        const d0 = (Array.isArray(details) && details.length > 0 && typeof details[0] === 'object') ? details[0] : {};
        const course = record.course || st.course || {};
        const cls = record.class || st.class || {};

        const candidates = [
            sa.examSection,
            sa.studySection,
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

            let allSts = [];

            // 1. Fetch from backend /api/ptm-students/ (which now queries ERP database directly)
            try {
                const res = await axios.get(`${apiUrl}/api/ptm-students/`, { headers });
                if (res.data?.data && Array.isArray(res.data.data)) {
                    allSts = res.data.data.map(item => ({
                        ...item,
                        batch: (item.batch && !['ERP Batch', 'General Batch', '—'].includes(String(item.batch).trim())) ? String(item.batch).trim() : ''
                    }));
                }
            } catch (e) {
                console.warn("ptm-students fetch notice:", e);
            }

            // 2. Fetch directly from /api/admin/erp-students/ to guarantee 100% full ERP coverage
            try {
                const erpRes = await axios.get(`${apiUrl}/api/admin/erp-students/`, { headers });
                const erpData = erpRes.data?.data || erpRes.data;
                if (Array.isArray(erpData)) {
                    const studentMap = new Map();
                    allSts.forEach(s => {
                        const k = `${(s.student_name || '').toLowerCase()}_${(s.admission_number || '').toLowerCase()}`;
                        studentMap.set(k, s);
                    });
                    
                    erpData.forEach((record, idx) => {
                        if (!record) return;
                        const st = record.student || record;
                        const details = st.studentsDetails || record.studentsDetails || [];
                        const d0 = (Array.isArray(details) && details.length > 0 && typeof details[0] === 'object') ? details[0] : {};

                        const name = d0.studentName || d0.name || st.name || st.studentName || st.first_name || record.studentName || record.name;
                        if (!name || typeof name !== 'string') return;
                        
                        const father = extractErpParentName(record);
                        const centre = d0.centre || record.centreName || record.centre || record.center || record.location || st.centreName || st.centre || 'Kolkata Main Centre';
                        const adm = record.admissionNumber || record.omr_code || record.admission_number || st.admissionNumber || st.omr_code || '';
                        const batch = extractStudentBatch(record);

                        const key = `${name.trim().toLowerCase()}_${String(adm).trim().toLowerCase()}`;
                        const existingObj = studentMap.get(key);

                        if (existingObj) {
                            // ENRICH existing object with real ERP parent name or batch if missing
                            if (father && father.trim() && (!existingObj.parent_name || existingObj.parent_name.startsWith('Parent of'))) {
                                existingObj.parent_name = father.trim();
                            }
                            if (batch && !existingObj.batch) {
                                existingObj.batch = batch;
                            }
                        } else {
                            const newObj = {
                                id: record._id || record.id || adm || `ERP_${idx}`,
                                student_name: name.trim(),
                                parent_name: father ? father.trim() : "",
                                centre_name: (centre && typeof centre === 'string') ? centre.trim() : 'Kolkata Main Centre',
                                admission_number: String(adm).trim(),
                                batch: batch
                            };
                            studentMap.set(key, newObj);
                            allSts.push(newObj);
                        }
                    });
                }
            } catch (erpErr) {
                console.warn("erp-students fetch notice:", erpErr);
            }

            if (allSts.length > 0) {
                setDbStudents(allSts);
            }
        } catch (err) {
            console.error("Error fetching database students for PTM:", err);
        }
    };

    useEffect(() => {
        fetchPtm();
        fetchDbStudents();
    }, []);

    const handleRefreshAll = async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                fetchPtm(),
                fetchDbStudents()
            ]);
        } catch (err) {
            console.error("Refresh error:", err);
        } finally {
            setTimeout(() => setRefreshing(false), 500);
        }
    };

    // Unique Centres derived dynamically from database students
    const availableCentres = useMemo(() => {
        const centresSet = new Set();
        if (defaultCentre) centresSet.add(defaultCentre);
        dbStudents.forEach(st => {
            if (st.centre_name && typeof st.centre_name === 'string' && st.centre_name.trim()) {
                centresSet.add(st.centre_name.trim());
            }
        });
        return Array.from(centresSet).sort();
    }, [dbStudents, defaultCentre]);

    // Filter database students based on selected Centre
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

    // Filter database students based on Modal Search Query
    const searchedDbStudents = useMemo(() => {
        if (!modalStudentSearch.trim()) {
            return filteredDbStudents;
        }
        const q = modalStudentSearch.trim().toLowerCase();
        return filteredDbStudents.filter(st => {
            const name = (st.student_name || '').toLowerCase();
            const parent = (st.parent_name || '').toLowerCase();
            const adm = (st.admission_number || '').toLowerCase();
            const batch = (st.batch || '').toLowerCase();
            return name.includes(q) || parent.includes(q) || adm.includes(q) || batch.includes(q);
        });
    }, [filteredDbStudents, modalStudentSearch]);

    const handleDbStudentSelect = (studentId) => {
        setSelectedStudentId(studentId);
        if (!studentId || studentId === 'manual') {
            setSelectedDbStudent(null);
            return;
        }

        const found = dbStudents.find(s => String(s.id) === String(studentId));
        if (found) {
            setSelectedDbStudent(found);
            setFormData(prev => ({
                ...prev,
                student_name: found.student_name || '',
                parent_name: found.parent_name !== undefined ? found.parent_name : '',
                centre_name: found.centre_name || prev.centre_name,
                admission_number: found.admission_number || ''
            }));
        }
    };

    const handleFileChange = (file) => {
        if (!file) return;
        setSelectedFile(file);
        if (!formData.document_title) {
            const cleanName = file.name.replace(/\.[^/.]+$/, "");
            setFormData(prev => ({ ...prev, document_title: cleanName }));
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDraggingOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDraggingOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);

        let uploadedDocUrl = '';
        let uploadedDocName = selectedFile ? selectedFile.name : (formData.document_title || '');

        if (selectedFile) {
            try {
                const apiUrl = getApiUrl();
                const uploadData = new FormData();
                uploadData.append('file', selectedFile);
                uploadData.append('folder', 'ptm_docs');

                const res = await axios.post(`${apiUrl}/api/upload-media/`, uploadData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    }
                });

                if (res.data?.url) {
                    uploadedDocUrl = res.data.url;
                    if (formData.document_title) {
                        const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.'));
                        uploadedDocName = formData.document_title.includes('.') ? formData.document_title : `${formData.document_title}${ext}`;
                    } else if (res.data?.filename) {
                        uploadedDocName = res.data.filename;
                    }
                }
            } catch (upErr) {
                console.error("Error uploading PTM document to backend storage:", upErr);
                uploadedDocUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (ev) => resolve(ev.target.result);
                    reader.readAsDataURL(selectedFile);
                });
            }
        }

        const newRecord = {
            id: Date.now(),
            student_name: formData.student_name,
            parent_name: formData.parent_name,
            teacher_name: formData.teacher_name,
            centre_name: formData.centre_name,
            ptm_date: formData.ptm_date,
            discussion_remarks: formData.discussion_remarks,
            student_performance: formData.student_performance,
            issues_discussed: formData.issues_discussed,
            follow_up_required: formData.follow_up_required,
            next_ptm_date: formData.next_ptm_date,
            document_name: uploadedDocName,
            document_url: uploadedDocUrl
        };

        try {
            const apiUrl = getApiUrl();
            await axios.post(`${apiUrl}/api/ptm-records/`, newRecord, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
        } catch (err) {
            console.warn("Backend PTM post notice:", err);
        }

        setPtmRecords([newRecord, ...ptmRecords]);
        setIsAddModalOpen(false);
        setUploading(false);
        setSelectedFile(null);
        setSelectedStudentId('');
        setSelectedDbStudent(null);
        setModalStudentSearch('');
        setFormData({
            student_name: '',
            parent_name: '',
            teacher_name: defaultTeacher,
            centre_name: defaultCentre,
            ptm_date: new Date().toISOString().split('T')[0],
            discussion_remarks: '',
            student_performance: 'Satisfactory',
            issues_discussed: '',
            follow_up_required: true,
            next_ptm_date: '',
            document_title: ''
        });
    };

    const filteredRecords = ptmRecords.filter(rec => {
        if (filterTeacherName) {
            const tName = (rec.teacher_name || '').toLowerCase().trim();
            const target = filterTeacherName.toLowerCase().trim();
            if (!tName.includes(target) && !target.includes(tName)) {
                return false;
            }
        }
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (rec.student_name && rec.student_name.toLowerCase().includes(q)) ||
            (rec.parent_name && rec.parent_name.toLowerCase().includes(q)) ||
            (rec.teacher_name && rec.teacher_name.toLowerCase().includes(q)) ||
            (rec.centre_name && rec.centre_name.toLowerCase().includes(q)) ||
            (rec.issues_discussed && rec.issues_discussed.toLowerCase().includes(q)) ||
            (rec.document_name && rec.document_name.toLowerCase().includes(q)) ||
            (rec.admission_number && rec.admission_number.toLowerCase().includes(q))
        );
    });

    const formatFileSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-xl backdrop-blur-xl transition-all`}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Users className="text-cyan-500" size={24} />
                            <h2 className="text-2xl font-black tracking-tight">PTM (Parent-Teacher Meeting) Records</h2>
                        </div>
                        <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Complete historical record of parent meetings, centre locations, student database profiles, document attachments, and follow-up schedules.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                        <button
                            type="button"
                            onClick={handleRefreshAll}
                            disabled={refreshing || loading}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all border shadow-sm ${
                                isDarkMode
                                    ? 'bg-slate-800/80 border-white/10 text-slate-200 hover:bg-slate-700 hover:text-white'
                                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                            }`}
                            title="Refresh PTM records and student database"
                        >
                            <RefreshCw size={14} className={refreshing ? 'animate-spin text-cyan-500' : ''} />
                            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                        </button>

                        <button
                            onClick={() => {
                                setModalStudentSearch('');
                                setIsAddModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20"
                        >
                            <Plus size={16} />
                            <span>Schedule / Log PTM</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                    type="text"
                    placeholder="Search PTM history by student, parent, teacher, centre, or document name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-semibold outline-none ${
                        isDarkMode
                            ? 'bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500'
                            : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-cyan-500'
                    }`}
                />
            </div>

            {/* PTM List */}
            <div className="space-y-4">
                {filteredRecords.length === 0 ? (
                    <div className={`p-8 rounded-2xl border text-center ${isDarkMode ? 'bg-slate-900/40 border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
                        <FileText className="mx-auto mb-2 opacity-50" size={32} />
                        <p className="text-sm font-semibold">No PTM records found matching your search.</p>
                    </div>
                ) : (
                    filteredRecords.map(rec => (
                        <div
                            key={rec.id}
                            className={`p-6 rounded-2xl border space-y-4 transition-all ${
                                isDarkMode ? 'bg-slate-900/40 border-white/10 hover:border-cyan-500/30' : 'bg-white border-slate-200 hover:border-cyan-500/50'
                            } shadow-lg`}
                        >
                            <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                                <div>
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <h3 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{rec.student_name}</h3>
                                        {rec.admission_number && (
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase flex items-center gap-1 ${
                                                isDarkMode ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-amber-100 text-amber-800 border border-amber-200'
                                            }`}>
                                                🎓 {rec.admission_number}
                                            </span>
                                        )}
                                        {rec.centre_name && (
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase flex items-center gap-1 ${
                                                isDarkMode ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                                            }`}>
                                                <MapPin size={11} /> {rec.centre_name}
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Parent: <strong className={isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}>{rec.parent_name}</strong> • Teacher: <strong className={isDarkMode ? 'text-amber-400' : 'text-amber-600'}>{rec.teacher_name}</strong></p>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs font-bold block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>PTM Date: {rec.ptm_date}</span>
                                    {rec.next_ptm_date && (
                                        <span className={`text-[11px] font-bold block ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>Next PTM: {rec.next_ptm_date}</span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div className={`p-3 rounded-xl border space-y-1 ${isDarkMode ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                    <span className={`text-[10px] font-black uppercase tracking-wider block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Discussion & Remarks</span>
                                    <p className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{rec.discussion_remarks}</p>
                                </div>

                                <div className={`p-3 rounded-xl border space-y-1 ${isDarkMode ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                    <span className={`text-[10px] font-black uppercase tracking-wider block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Issues & Concerns Discussed</span>
                                    <p className={`font-medium ${isDarkMode ? 'text-rose-300' : 'text-rose-600'}`}>{rec.issues_discussed || 'None reported'}</p>
                                </div>
                            </div>

                            {/* Attached Document Section */}
                            {(rec.document_url || rec.document_name) && (
                                <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                                    isDarkMode ? 'bg-cyan-950/20 border-cyan-500/30' : 'bg-cyan-50/70 border-cyan-200'
                                }`}>
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-700'}`}>
                                            <Paperclip size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <span className={`text-[10px] font-black uppercase tracking-wider block ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                                Attached Meeting Document
                                            </span>
                                            <span className={`text-xs font-bold truncate block ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                                                {rec.document_name || 'PTM Attachment'}
                                            </span>
                                        </div>
                                    </div>

                                    {rec.document_url ? (
                                        <a
                                            href={rec.document_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all shadow-md ${
                                                isDarkMode
                                                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90'
                                                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:opacity-90'
                                            }`}
                                        >
                                            <ExternalLink size={14} />
                                            <span>View Document</span>
                                        </a>
                                    ) : (
                                        <span className={`text-[11px] font-semibold italic ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            Attachment recorded
                                        </span>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-2">
                                    <GraduationCap size={16} className={isDarkMode ? 'text-cyan-400' : 'text-cyan-600'} />
                                    <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Performance Assessment: <strong className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}>{rec.student_performance}</strong>
                                    </span>
                                </div>

                                {rec.follow_up_required && (
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${isDarkMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                                        <Clock size={12} /> Follow-up Required
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex justify-center items-start pt-28 sm:pt-32 pb-8 px-4 overflow-hidden">
                    <div className={`w-full max-w-lg mt-4 sm:mt-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-2xl relative z-10 flex flex-col max-h-[76vh] sm:max-h-[78vh]`}>
                        
                        {/* FIXED MODAL HEADER */}
                        <div className={`p-4 sm:p-5 flex items-center justify-between border-b shrink-0 ${isDarkMode ? 'border-white/10 bg-slate-900/95' : 'border-slate-200 bg-white/95'} backdrop-blur-md rounded-t-2xl z-20`}>
                            <h3 className="text-lg sm:text-xl font-black flex items-center gap-2">
                                <Users size={20} className="text-cyan-500" />
                                <span>Log Parent-Teacher Meeting (PTM)</span>
                            </h3>
                            <button 
                                onClick={() => setIsAddModalOpen(false)}
                                className={`p-1.5 rounded-lg hover:bg-slate-500/20 transition-all ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* SCROLLABLE FORM BODY & FIXED FOOTER */}
                        <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            
                            {/* SCROLLABLE FORM CONTENT */}
                            <div className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1 custom-scrollbar">
                                {/* Step 1: Select Centre / Branch */}
                                <div>
                                    <label className={`block font-bold mb-1 flex items-center gap-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        <MapPin size={14} className="text-cyan-500" />
                                        <span>1. Select Centre / Branch *</span>
                                    </label>
                                    <select
                                        required
                                        value={formData.centre_name}
                                        onChange={(e) => {
                                            const newCentre = e.target.value;
                                            setFormData(prev => ({ ...prev, centre_name: newCentre }));
                                            setSelectedStudentId('');
                                            setSelectedDbStudent(null);
                                            setModalStudentSearch('');
                                        }}
                                        className={`w-full p-2.5 rounded-xl border outline-none text-xs font-semibold ${
                                            isDarkMode ? 'bg-slate-950 border-white/10 text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500'
                                        }`}
                                    >
                                        <option value="ALL">🌐 All Centres (Show All Database Students)</option>
                                        {availableCentres.map((c, idx) => (
                                            <option key={idx} value={c}>🏢 {c}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Step 2: Select Student (Filtered by Selected Centre & Search) */}
                                <div className="space-y-2 p-3 rounded-xl border bg-cyan-500/5 border-cyan-500/20">
                                    <div className="flex items-center justify-between gap-1.5">
                                        <label className={`font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
                                            <UserCheck size={14} />
                                            <span>2. Select Student ({formData.centre_name === 'ALL' ? 'All Centres' : formData.centre_name}) *</span>
                                        </label>
                                        <span className="text-[10px] font-bold opacity-90 px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400">
                                            {searchedDbStudents.length} / {filteredDbStudents.length} Students
                                        </span>
                                    </div>

                                    {/* Search Input Box inside Step 2 */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            type="text"
                                            value={modalStudentSearch}
                                            onChange={(e) => setModalStudentSearch(e.target.value)}
                                            placeholder="🔍 Type student name, admission no (e.g. PATH25...), or parent..."
                                            className={`w-full pl-9 pr-8 py-2 rounded-xl border text-xs outline-none transition-all ${
                                                isDarkMode
                                                    ? 'bg-slate-950 border-cyan-500/30 text-white placeholder:text-slate-500 focus:border-cyan-400'
                                                    : 'bg-white border-cyan-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-600'
                                            }`}
                                        />
                                        {modalStudentSearch && (
                                            <button
                                                type="button"
                                                onClick={() => setModalStudentSearch('')}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-500/20 text-slate-400"
                                            >
                                                <X size={13} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Filtered Dropdown */}
                                    <select
                                        value={selectedStudentId}
                                        onChange={(e) => handleDbStudentSelect(e.target.value)}
                                        className={`w-full p-2.5 rounded-xl border outline-none text-xs font-semibold ${
                                            isDarkMode ? 'bg-slate-950 border-cyan-500/40 text-white focus:border-cyan-400' : 'bg-white border-cyan-300 text-slate-900 focus:border-cyan-600'
                                        }`}
                                    >
                                        <option value="">
                                            {searchedDbStudents.length === 0
                                                ? `-- No student found matching "${modalStudentSearch}" --`
                                                : `-- Choose Student (${searchedDbStudents.length} matching) --`}
                                        </option>
                                        {searchedDbStudents.map(st => (
                                            <option key={st.id} value={st.id}>
                                                {st.student_name} {st.admission_number ? `(${st.admission_number}` : ''}{st.centre_name ? ` • ${st.centre_name})` : ')'}
                                            </option>
                                        ))}
                                        <option value="manual">+ Enter Custom / Manual Student</option>
                                    </select>

                                    {selectedDbStudent && (
                                        <div className={`mt-2 p-2.5 rounded-lg text-[11px] font-bold flex items-center justify-between gap-2 border ${
                                            isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        }`}>
                                            <span className="flex items-center gap-1.5 truncate">
                                                <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />
                                                <span className="truncate">Database Profile Loaded: <strong>{selectedDbStudent.student_name}</strong></span>
                                            </span>
                                            <span className="shrink-0 font-mono text-[10px] opacity-90 px-1.5 py-0.5 rounded bg-emerald-500/20">
                                                {selectedDbStudent.admission_number || selectedDbStudent.batch}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Student Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.student_name}
                                            onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                                            placeholder="e.g. Aarav Ganguly"
                                            className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500'}`}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Parent Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.parent_name}
                                            onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                                            placeholder="e.g. Mr. Subhash Ganguly"
                                            className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500'}`}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Teacher Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.teacher_name}
                                            onChange={(e) => setFormData({ ...formData, teacher_name: e.target.value })}
                                            placeholder="e.g. Dr. Rajesh Sharma"
                                            className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500'}`}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>PTM Date *</label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.ptm_date}
                                            onChange={(e) => setFormData({ ...formData, ptm_date: e.target.value })}
                                            className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500'}`}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Discussion / Remarks *</label>
                                    <textarea
                                        rows="2"
                                        required
                                        value={formData.discussion_remarks}
                                        onChange={(e) => setFormData({ ...formData, discussion_remarks: e.target.value })}
                                        placeholder="Summary of meeting discussion, key strengths, and progress feedback..."
                                        className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500'}`}
                                    ></textarea>
                                </div>

                                <div>
                                    <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Issues & Concerns Discussed</label>
                                    <textarea
                                        rows="2"
                                        value={formData.issues_discussed}
                                        onChange={(e) => setFormData({ ...formData, issues_discussed: e.target.value })}
                                        placeholder="e.g. Time management during full syllabus tests, accuracy concerns, or subject-specific doubts..."
                                        className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500'}`}
                                    ></textarea>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Next PTM Date</label>
                                        <input
                                            type="date"
                                            value={formData.next_ptm_date}
                                            onChange={(e) => setFormData({ ...formData, next_ptm_date: e.target.value })}
                                            className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500'}`}
                                        />
                                    </div>
                                    <div>
                                         <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Student Performance Rating</label>
                                         <select
                                             value={formData.student_performance}
                                             onChange={(e) => setFormData({ ...formData, student_performance: e.target.value })}
                                             className={`w-full p-2.5 rounded-xl border outline-none font-semibold text-xs ${isDarkMode ? 'bg-slate-950 border-white/10 text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500'}`}
                                         >
                                             <option value="">-- Select Performance Rating --</option>
                                             <option value="Outstanding">Outstanding</option>
                                             <option value="Excellent">Excellent</option>
                                             <option value="Good">Good / Very Satisfactory</option>
                                             <option value="Satisfactory">Satisfactory</option>
                                             <option value="Average">Average</option>
                                             <option value="Needs Improvement">Needs Improvement</option>
                                             <option value="Critical">Critical / Action Required</option>
                                         </select>
                                    </div>
                                </div>

                                {/* Document Upload Area */}
                                <div className="space-y-2 pt-2 border-t border-slate-200/20">
                                    <label className={`block font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Attach PTM Document / Report (Optional)
                                    </label>
                                    
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={(e) => handleFileChange(e.target.files[0])}
                                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                        className="hidden"
                                    />

                                    {!selectedFile ? (
                                        <div
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            onClick={() => fileInputRef.current && fileInputRef.current.click()}
                                            className={`p-4 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all ${
                                                isDraggingOver
                                                    ? 'border-cyan-500 bg-cyan-500/10'
                                                    : isDarkMode
                                                        ? 'border-white/10 bg-slate-950/40 hover:border-cyan-500/50 hover:bg-slate-950/80'
                                                        : 'border-slate-300 bg-slate-50 hover:border-cyan-500 hover:bg-cyan-50/30'
                                            }`}
                                        >
                                            <Upload size={24} className={`mx-auto mb-1.5 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                                            <p className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                                Click to browse or drag & drop document
                                            </p>
                                            <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                Supports PDF, Images (PNG, JPG), or Word Documents (DOCX) up to 15MB
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                                                isDarkMode ? 'bg-cyan-950/40 border-cyan-500/30 text-white' : 'bg-cyan-50 border-cyan-200 text-slate-900'
                                            }`}>
                                                <div className="flex items-center gap-2.5 overflow-hidden">
                                                    <FileText size={20} className={isDarkMode ? 'text-cyan-400' : 'text-cyan-600'} />
                                                    <div className="truncate">
                                                        <p className="font-bold truncate">{selectedFile.name}</p>
                                                        <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                            {formatFileSize(selectedFile.size)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedFile(null)}
                                                    className={`p-1.5 rounded-lg transition-all ${
                                                        isDarkMode ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' : 'bg-rose-100 text-rose-600 hover:bg-rose-200'
                                                    }`}
                                                    title="Remove file"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>

                                            <div>
                                                <label className={`block font-semibold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                    Document Title / Display Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.document_title}
                                                    onChange={(e) => setFormData({ ...formData, document_title: e.target.value })}
                                                    placeholder="e.g. Student Mock Test Report & Notes"
                                                    className={`w-full p-2 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500'}`}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* FIXED MODAL FOOTER */}
                            <div className={`p-4 flex items-center justify-end gap-3 border-t shrink-0 ${isDarkMode ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-slate-50'} rounded-b-2xl z-20`}>
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    disabled={uploading}
                                    className={`px-4 py-2 rounded-xl font-bold ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold hover:opacity-90 flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>Uploading & Saving...</span>
                                        </>
                                    ) : (
                                        <span>Save PTM Record</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PTMHistoryTab;
