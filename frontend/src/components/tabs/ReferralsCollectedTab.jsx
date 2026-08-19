import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { UserPlus, Gift, CheckCircle, Clock, Plus, Search, Filter, Phone, Mail, Award, Eye, X, Calendar, User, BookOpen, Sparkles, Tag, CheckCircle2, ChevronRight, RefreshCw, GraduationCap, Building2, FileText, UserCheck, ChevronDown, Check, AlertCircle, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import axios from 'axios';

const SearchableSelect = ({
    icon: Icon,
    placeholder = 'Search...',
    options = [],
    value,
    onChange,
    allLabel = 'All',
    isDarkMode
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = useMemo(() => {
        if (!searchTerm.trim()) return options;
        const q = searchTerm.toLowerCase().trim();
        return options.filter(opt =>
            (opt.label || opt.name || opt.value || '').toLowerCase().includes(q) ||
            (opt.email || '').toLowerCase().includes(q)
        );
    }, [options, searchTerm]);

    const selectedOption = options.find(o => (o.value || o.email || o.name) === value);
    const displayLabel = value === 'ALL'
        ? allLabel
        : (selectedOption ? (selectedOption.label || selectedOption.name || selectedOption.value) : value);

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => {
                    setIsOpen(prev => !prev);
                    setSearchTerm('');
                }}
                className={`w-full flex items-center justify-between gap-2 pl-9 pr-3 py-2.5 rounded-xl border text-xs font-semibold outline-none transition-all text-left ${
                    isDarkMode
                        ? `bg-slate-950/60 border-white/10 text-white ${isOpen ? 'border-amber-500/80 ring-1 ring-amber-500/30' : 'hover:border-white/20'}`
                        : `bg-slate-50 border-slate-200 text-slate-800 ${isOpen ? 'border-amber-500 ring-1 ring-amber-500/20' : 'hover:border-slate-300'}`
                }`}
            >
                {Icon && (
                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                )}
                <span className="truncate flex-1">{displayLabel}</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className={`absolute top-full left-0 right-0 mt-1.5 rounded-xl border shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-150 ${
                    isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                    {/* Search Input */}
                    <div className="p-2 border-b border-slate-200 dark:border-white/10">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                            <input
                                autoFocus
                                type="text"
                                placeholder={placeholder}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full pl-8 pr-7 py-1.5 rounded-lg border text-xs font-medium outline-none ${
                                    isDarkMode
                                        ? 'bg-slate-950 border-white/10 text-white placeholder:text-slate-500 focus:border-amber-500'
                                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-amber-500'
                                }`}
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-56 overflow-y-auto p-1 custom-scrollbar text-xs font-medium">
                        <button
                            type="button"
                            onClick={() => {
                                onChange('ALL');
                                setIsOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                                value === 'ALL'
                                    ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 font-bold' : 'bg-amber-50 text-amber-800 font-bold')
                                    : (isDarkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-slate-700')
                            }`}
                        >
                            <span>{allLabel}</span>
                            {value === 'ALL' && <Check size={13} className="text-amber-500 shrink-0" />}
                        </button>

                        {filteredOptions.length === 0 ? (
                            <div className="p-3 text-center text-slate-400 text-xs">
                                No matching options
                            </div>
                        ) : (
                            filteredOptions.map((opt, idx) => {
                                const optVal = opt.value || opt.name || opt.email;
                                const isSelected = value === optVal;
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            onChange(optVal);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                                            isSelected
                                                ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 font-bold' : 'bg-amber-50 text-amber-800 font-bold')
                                                : (isDarkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-slate-700')
                                        }`}
                                    >
                                        <div className="truncate pr-2">
                                            <p className="truncate font-semibold">{opt.label || opt.name || optVal}</p>
                                            {opt.email && opt.name && opt.name !== opt.email && (
                                                <p className="text-[10px] text-slate-400 font-mono truncate">{opt.email}</p>
                                            )}
                                        </div>
                                        {isSelected && <Check size={13} className="text-amber-500 shrink-0" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};


const ReferralsCollectedTab = ({ isAdminView = false, filterTeacherName = null, filterTeacherEmail = null }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token, user } = useAuth();
    const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedReferral, setSelectedReferral] = useState(null);

    // Form errors state for phone and email
    const [formErrors, setFormErrors] = useState({ phone: '', email: '' });

    // Master Centres state & searchable dropdown
    const [masterCentres, setMasterCentres] = useState([]);
    const [loadingCentres, setLoadingCentres] = useState(false);
    const [centreSearch, setCentreSearch] = useState('');
    const [isCentreDropdownOpen, setIsCentreDropdownOpen] = useState(false);
    const centreDropdownRef = useRef(null);

    // Filter states
    const [selectedTeacherFilter, setSelectedTeacherFilter] = useState('ALL');
    const [selectedCentreFilter, setSelectedCentreFilter] = useState('ALL');
    const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
    const [erpTeachersList, setErpTeachersList] = useState([]);

    const currentTeacherName = filterTeacherName || user?.name || user?.full_name || user?.username || 'Teacher';
    const currentCentre = user?.centre_name || user?.center || 'Hazra Centre';

    const [formData, setFormData] = useState({
        referred_by: currentTeacherName,
        referral_source: 'Teacher',
        referred_person: '',
        phone: '',
        email: '',
        interested_course: 'Class 11 Engineering 2-Year Program',
        custom_course: '',
        centre_name: currentCentre,
        remarks: '',
        referral_date: new Date().toISOString().split('T')[0],
        follow_up_status: 'New Referral',
        conversion_status: 'In Progress'
    });



    const validatePhone = (val) => {
        if (!val || !val.trim()) {
            return 'Contact phone number is required.';
        }
        const digits = val.replace(/\D/g, '');
        if (digits.length < 10) {
            return `Valid phone must have 10 digits (${digits.length}/10 entered).`;
        }
        if (digits.length === 10 && !/^[6-9]/.test(digits)) {
            return 'Mobile number must start with 6, 7, 8, or 9.';
        }
        return '';
    };

    const validateEmail = (val) => {
        if (!val || !val.trim()) return '';
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(val.trim())) {
            return 'Please enter a valid email format (e.g. name@domain.com).';
        }
        return '';
    };

    // Close centre dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (centreDropdownRef.current && !centreDropdownRef.current.contains(event.target)) {
                setIsCentreDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

            const activeOnly = (rawCentres || []).filter(c => {
                if (c.is_active === false || c.is_active === 0 || c.is_active === 'false') return false;
                const st = String(c.status || '').toLowerCase().trim();
                if (st === 'deactive' || st === 'inactive' || st === 'disabled' || st === 'false' || st === '0') return false;
                return true;
            }).map(c => ({
                id: c.id || c._id || c.code || c.enterCode,
                name: (c.centreName || c.name || '').trim(),
                code: (c.enterCode || c.code || '').trim()
            })).filter(c => c.name);

            const uniqueCentres = [];
            const seen = new Set();
            activeOnly.forEach(item => {
                if (!seen.has(item.name)) {
                    seen.add(item.name);
                    uniqueCentres.push(item);
                }
            });

            if (uniqueCentres.length === 0) {
                uniqueCentres.push(
                    { id: '1', name: 'Hazra Centre', code: 'HAZ' },
                    { id: '2', name: 'Kolkata Main Centre', code: 'KOL' },
                    { id: '3', name: 'Garia Centre', code: 'GAR' },
                    { id: '4', name: 'Durgapur Centre', code: 'DUR' },
                    { id: '5', name: 'Siliguri Centre', code: 'SIL' }
                );
            }

            setMasterCentres(uniqueCentres);
        } catch (err) {
            console.error("Error fetching master centres:", err);
        } finally {
            setLoadingCentres(false);
        }
    };

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                referred_by: user?.name || user?.full_name || user?.username || prev.referred_by,
                centre_name: user?.centre_name || user?.center || prev.centre_name
            }));
        }
    }, [user]);

    const fetchReferrals = async () => {
        setLoading(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/referrals/`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (res.data?.data && Array.isArray(res.data.data)) {
                setReferrals(res.data.data);
            } else {
                setReferrals([]);
            }
        } catch (err) {
            console.error("Referrals fetch error:", err);
            setReferrals([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchTeachers = async () => {
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/admin/erp-teachers/`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const raw = res.data?.data || (Array.isArray(res.data) ? res.data : []);
            setErpTeachersList(raw);
        } catch (e) {
            console.log("Could not fetch ERP teachers:", e);
        }
    };

    useEffect(() => {
        fetchReferrals();
        fetchMasterCentres();
        fetchTeachers();
    }, []);

    const handleOpenAddModal = () => {
        const defaultCentreName = user?.centre_name || user?.center || (masterCentres.length > 0 ? masterCentres[0].name : 'Hazra Centre');
        setFormData({
            referred_by: user?.name || user?.full_name || user?.username || 'Teacher',
            referral_source: 'Teacher',
            referred_person: '',
            phone: '',
            email: '',
            interested_course: 'Class 11 Engineering 2-Year Program',
            custom_course: '',
            centre_name: defaultCentreName,
            remarks: '',
            referral_date: new Date().toISOString().split('T')[0],
            follow_up_status: 'New Referral',
            conversion_status: 'In Progress'
        });
        setFormErrors({ phone: '', email: '' });
        setCentreSearch('');
        setIsCentreDropdownOpen(false);
        setIsAddModalOpen(true);
    };


    const handleFormSubmit = async (e) => {
        e.preventDefault();

        // Perform validations
        const phoneErr = validatePhone(formData.phone);
        const emailErr = validateEmail(formData.email);

        if (phoneErr || emailErr) {
            setFormErrors({ phone: phoneErr, email: emailErr });
            return;
        }

        setSubmitting(true);

        const courseValue = formData.interested_course === 'Others'
            ? (formData.custom_course?.trim() || 'Other Course')
            : formData.interested_course;

        const payload = {
            ...formData,
            interested_course: courseValue,
            referred_by: formData.referred_by || currentTeacherName,
            referral_source: 'Teacher',
            reward_points: formData.conversion_status === 'Admitted' ? 500 : 0
        };

        try {
            const apiUrl = getApiUrl();
            const res = await axios.post(`${apiUrl}/api/referrals/`, payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (res.data?.data) {
                setReferrals(prev => [res.data.data, ...prev]);
            } else {
                fetchReferrals();
            }
            setIsAddModalOpen(false);
        } catch (err) {
            console.error("Error submitting referral:", err);
            const errMsg = err.response?.data?.message || err.message || "Failed to save referral";
            alert(`Error: ${errMsg}`);
        } finally {
            setSubmitting(false);
        }
    };

    // Status update states for View / Manage modal
    const [statusUpdateForm, setStatusUpdateForm] = useState({
        follow_up_status: 'New Referral',
        conversion_status: 'In Progress',
        remarks: ''
    });
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [statusUpdateSuccess, setStatusUpdateSuccess] = useState(false);

    const handleOpenViewModal = (referral) => {
        setSelectedReferral(referral);
        setStatusUpdateForm({
            follow_up_status: referral.follow_up_status || 'New Referral',
            conversion_status: referral.conversion_status || 'In Progress',
            remarks: referral.remarks || ''
        });
        setStatusUpdateSuccess(false);
    };

    const handleSaveStatusUpdate = async () => {
        if (!selectedReferral) return;
        setUpdatingStatus(true);
        try {
            const apiUrl = getApiUrl();
            const payload = {
                id: selectedReferral.id,
                follow_up_status: statusUpdateForm.follow_up_status,
                conversion_status: statusUpdateForm.conversion_status,
                remarks: statusUpdateForm.remarks
            };
            const res = await axios.put(`${apiUrl}/api/referrals/`, payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            
            const updated = res.data?.data || {
                ...selectedReferral,
                ...payload,
                reward_points: payload.conversion_status === 'Admitted' ? 500 : (payload.conversion_status === 'Dropped' ? 0 : selectedReferral.reward_points)
            };

            setSelectedReferral(updated);
            setReferrals(prev => prev.map(r => r.id === updated.id ? updated : r));
            setStatusUpdateSuccess(true);
            setTimeout(() => setStatusUpdateSuccess(false), 3500);
        } catch (err) {
            console.error("Error updating referral status:", err);
            const errMsg = err.response?.data?.message || err.message || "Failed to update status";
            alert(`Error: ${errMsg}`);
        } finally {
            setUpdatingStatus(false);
        }
    };




    const availableTeachers = useMemo(() => {
        const map = new Map();
        referrals.forEach(r => {
            const ref = (r.referred_by || '').trim();
            if (ref) {
                const key = ref.toLowerCase();
                if (!map.has(key)) {
                    const erpMatch = erpTeachersList.find(t =>
                        (t.email && t.email.toLowerCase() === key) ||
                        (t.name && t.name.toLowerCase() === key) ||
                        (t.username && t.username.toLowerCase() === key)
                    );
                    const displayName = erpMatch?.name || ref;
                    const displayLabel = erpMatch?.name && erpMatch?.email && erpMatch.name !== erpMatch.email
                        ? `${erpMatch.name} (${erpMatch.email})`
                        : ref;

                    map.set(key, {
                        name: displayName,
                        email: erpMatch?.email || ref,
                        value: ref,
                        label: displayLabel
                    });
                }
            }
        });
        return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
    }, [erpTeachersList, referrals]);

    const availableCentres = useMemo(() => {
        const set = new Set();
        referrals.forEach(r => {
            if (r.centre_name && r.centre_name.trim()) {
                set.add(r.centre_name.trim());
            }
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [referrals]);

    const baseReferrals = useMemo(() => {
        let list = referrals;

        if (filterTeacherName || filterTeacherEmail) {
            const normFilterName = (filterTeacherName || '').toLowerCase().trim();
            const normFilterNameNoSpace = normFilterName.replace(/\s+/g, '');
            const normFilterEmail = (filterTeacherEmail || '').toLowerCase().trim();
            const nameWords = normFilterName.split(/\s+/).filter(w => w.length > 2);

            list = list.filter(r => {
                const refBy = (r.referred_by || '').toLowerCase().trim();
                const refByNoSpace = refBy.replace(/\s+/g, '');

                if (normFilterEmail && (refBy.includes(normFilterEmail) || normFilterEmail.includes(refBy))) return true;
                if (normFilterName && (refBy.includes(normFilterName) || normFilterName.includes(refBy))) return true;
                if (normFilterNameNoSpace && (refByNoSpace.includes(normFilterNameNoSpace) || normFilterNameNoSpace.includes(refByNoSpace))) return true;
                if (nameWords.some(w => refBy.includes(w) || refByNoSpace.includes(w))) return true;

                return false;
            });
        }

        // Selected teacher dropdown filter
        if (selectedTeacherFilter && selectedTeacherFilter !== 'ALL') {
            const sel = selectedTeacherFilter.toLowerCase().trim();
            list = list.filter(r => {
                const refBy = (r.referred_by || '').toLowerCase().trim();
                return refBy.includes(sel) || sel.includes(refBy);
            });
        }

        // Selected centre dropdown filter
        if (selectedCentreFilter && selectedCentreFilter !== 'ALL') {
            const selCentre = selectedCentreFilter.toLowerCase().trim();
            list = list.filter(r => {
                const cName = (r.centre_name || '').toLowerCase().trim();
                return cName === selCentre || cName.includes(selCentre);
            });
        }

        // Selected status dropdown filter
        if (selectedStatusFilter && selectedStatusFilter !== 'ALL') {
            list = list.filter(r => (r.conversion_status || '') === selectedStatusFilter);
        }

        return list;
    }, [referrals, filterTeacherName, filterTeacherEmail, selectedTeacherFilter, selectedCentreFilter, selectedStatusFilter]);

    const filteredReferrals = useMemo(() => {
        if (!searchQuery.trim()) return baseReferrals;
        const q = searchQuery.toLowerCase().trim();
        return baseReferrals.filter(r =>
            (r.referred_person || '').toLowerCase().includes(q) ||
            (r.referred_by || '').toLowerCase().includes(q) ||
            (r.phone || '').toLowerCase().includes(q) ||
            (r.email || '').toLowerCase().includes(q) ||
            (r.interested_course || '').toLowerCase().includes(q) ||
            (r.centre_name || '').toLowerCase().includes(q) ||
            (r.follow_up_status || '').toLowerCase().includes(q) ||
            (r.conversion_status || '').toLowerCase().includes(q)
        );
    }, [baseReferrals, searchQuery]);

    const filteredMasterCentres = masterCentres.filter(c =>
        (c.name || '').toLowerCase().includes(centreSearch.toLowerCase()) ||
        (c.code || '').toLowerCase().includes(centreSearch.toLowerCase())
    );

    const totalPoints = baseReferrals.reduce((sum, r) => sum + (r.reward_points || 0), 0);



    return (
        <div className="space-y-6 pt-4 sm:pt-6">
            {/* Header Banner */}
            <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-xl backdrop-blur-xl transition-all`}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Gift className="text-amber-400" size={24} />
                            <h2 className="text-2xl font-black tracking-tight">Referrals Collected</h2>
                        </div>
                        <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Refer prospective students, track admission counseling progress, conversion statuses, and earned referral reward points.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchReferrals}
                            disabled={loading}
                            title="Refresh Referrals"
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all ${
                                isDarkMode
                                    ? 'bg-slate-800/80 border-white/10 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-amber-500/30'
                                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900 hover:border-slate-300'
                            } disabled:opacity-50`}
                        >
                            <RefreshCw size={15} className={loading ? 'animate-spin text-amber-500' : 'text-amber-500'} />
                            <span>Refresh</span>
                        </button>

                        {!isAdminView && (
                            <button
                                onClick={handleOpenAddModal}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90 transition-all shadow-lg shadow-amber-500/20"
                            >
                                <UserPlus size={16} />
                                <span>Refer New Student</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Students Referred</span>
                    <div className="flex items-center justify-between">
                        <span className={`text-2xl font-black ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{baseReferrals.length}</span>
                        <UserPlus className={isDarkMode ? 'text-cyan-400/80' : 'text-cyan-600/80'} size={24} />
                    </div>
                </div>

                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>In Progress / Counseling</span>
                    <div className="flex items-center justify-between">
                        <span className={`text-2xl font-black ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                            {baseReferrals.filter(r => r.conversion_status !== 'Admitted' && r.conversion_status !== 'Dropped').length}
                        </span>
                        <Clock className={isDarkMode ? 'text-amber-400/80' : 'text-amber-600/80'} size={24} />
                    </div>
                </div>

                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Admitted / Converted</span>
                    <div className="flex items-center justify-between">
                        <span className={`text-2xl font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            {baseReferrals.filter(r => r.conversion_status === 'Admitted').length}
                        </span>
                        <CheckCircle className={isDarkMode ? 'text-emerald-400/80' : 'text-emerald-600/80'} size={24} />
                    </div>
                </div>

                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Reward Points Earned</span>
                    <div className="flex items-center justify-between">
                        <span className={`text-2xl font-black ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>{totalPoints} pts</span>
                        <Award className={isDarkMode ? 'text-orange-400/80' : 'text-orange-600/80'} size={24} />
                    </div>
                </div>
            </div>

            {/* Search and Filters Bar */}
            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'} shadow-md space-y-3`}>
                <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdminView ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3`}>
                    {/* Search */}
                    <div className="relative sm:col-span-2 lg:col-span-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <input
                            type="text"
                            placeholder="Search student, course, phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs font-semibold outline-none transition-all ${
                                isDarkMode
                                    ? 'bg-slate-950/60 border-white/10 text-white placeholder:text-slate-500 focus:border-amber-500'
                                    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-amber-500'
                            }`}
                        />
                    </div>

                    {/* Teacher Filter (Admin View Only) */}
                    {isAdminView && (
                        <SearchableSelect
                            icon={User}
                            placeholder="Search teacher name/email..."
                            allLabel={`All Teachers (${availableTeachers.length})`}
                            options={availableTeachers}
                            value={selectedTeacherFilter}
                            onChange={setSelectedTeacherFilter}
                            isDarkMode={isDarkMode}
                        />
                    )}

                    {/* Centre Filter */}
                    <SearchableSelect
                        icon={Building2}
                        placeholder="Search centre..."
                        allLabel={`All Centres (${availableCentres.length})`}
                        options={availableCentres.map(c => ({ value: c, label: c, name: c }))}
                        value={selectedCentreFilter}
                        onChange={setSelectedCentreFilter}
                        isDarkMode={isDarkMode}
                    />

                    {/* Status Filter */}
                    <SearchableSelect
                        icon={Filter}
                        placeholder="Search status..."
                        allLabel="All Statuses"
                        options={[
                            { value: 'In Progress', label: 'In Progress' },
                            { value: 'Admitted', label: 'Admitted' },
                            { value: 'Dropped', label: 'Dropped' }
                        ]}
                        value={selectedStatusFilter}
                        onChange={setSelectedStatusFilter}
                        isDarkMode={isDarkMode}
                    />
                </div>

                {/* Active Filter Pills / Reset button */}
                {(selectedTeacherFilter !== 'ALL' || selectedCentreFilter !== 'ALL' || selectedStatusFilter !== 'ALL' || searchQuery) && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-white/5 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-bold text-slate-400">Active Filters:</span>
                            {selectedTeacherFilter !== 'ALL' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                                    Teacher: {selectedTeacherFilter}
                                    <button onClick={() => setSelectedTeacherFilter('ALL')} className="hover:text-cyan-300 ml-0.5"><X size={11} /></button>
                                </span>
                            )}
                            {selectedCentreFilter !== 'ALL' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                    Centre: {selectedCentreFilter}
                                    <button onClick={() => setSelectedCentreFilter('ALL')} className="hover:text-amber-300 ml-0.5"><X size={11} /></button>
                                </span>
                            )}
                            {selectedStatusFilter !== 'ALL' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                    Status: {selectedStatusFilter}
                                    <button onClick={() => setSelectedStatusFilter('ALL')} className="hover:text-emerald-300 ml-0.5"><X size={11} /></button>
                                </span>
                            )}
                            {searchQuery && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                                    Search: "{searchQuery}"
                                    <button onClick={() => setSearchQuery('')} className="hover:text-white ml-0.5"><X size={11} /></button>
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => {
                                setSelectedTeacherFilter('ALL');
                                setSelectedCentreFilter('ALL');
                                setSelectedStatusFilter('ALL');
                                setSearchQuery('');
                            }}
                            className="text-[11px] font-bold text-amber-500 hover:underline flex items-center gap-1 ml-auto"
                        >
                            <RotateCcw size={11} /> Reset All Filters
                        </button>
                    </div>
                )}
            </div>

            {/* Referrals List Table */}
            <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'} shadow-xl`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className={`border-b font-extrabold uppercase tracking-wider text-[11px] ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                                <th className="p-4">Referred Student</th>
                                <th className="p-4">Referring Teacher</th>
                                <th className="p-4">Centre</th>
                                <th className="p-4">Interested Course</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Follow-up Status</th>
                                <th className="p-4">Conversion Status</th>
                                <th className="p-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-200'}`}>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className={`w-5 h-5 border-2 rounded-full animate-spin ${isDarkMode ? 'border-amber-500/20 border-t-amber-500' : 'border-amber-200 border-t-amber-600'}`}></div>
                                            <span className={`font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading referrals...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredReferrals.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className={`p-4 rounded-full ${isDarkMode ? 'bg-slate-800/80 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                                                <GraduationCap size={32} />
                                            </div>
                                            <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                {searchQuery || selectedTeacherFilter !== 'ALL' || selectedCentreFilter !== 'ALL' || selectedStatusFilter !== 'ALL'
                                                    ? 'No matching referrals found'
                                                    : 'No student referrals logged yet'}
                                            </p>
                                            <p className={`text-xs max-w-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                {searchQuery || selectedTeacherFilter !== 'ALL' || selectedCentreFilter !== 'ALL' || selectedStatusFilter !== 'ALL'
                                                    ? 'Try adjusting your search or active filters to find other records.'
                                                    : 'Recommend prospective students for counseling to help them enroll and track their admission journey.'}
                                            </p>
                                            {!searchQuery && selectedTeacherFilter === 'ALL' && selectedCentreFilter === 'ALL' && selectedStatusFilter === 'ALL' && !isAdminView && (
                                                <button
                                                    onClick={handleOpenAddModal}
                                                    className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20"
                                                >
                                                    <UserPlus size={14} /> Refer First Student
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredReferrals.map(r => (
                                    <tr key={r.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/80'}`}>
                                        <td className="p-4">
                                            <p className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{r.referred_person}</p>
                                            {r.phone && (
                                                <p className={`text-[11px] font-mono flex items-center gap-1 mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    <Phone size={10} /> {r.phone}
                                                </p>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <p className={`font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{r.referred_by || currentTeacherName}</p>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                                                {r.referral_source || 'Teacher'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <p className={`font-semibold flex items-center gap-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                <Building2 size={12} className="text-amber-500 shrink-0" />
                                                <span>{r.centre_name || 'Hazra Centre'}</span>
                                            </p>
                                        </td>
                                        <td className={`p-4 font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{r.interested_course || 'N/A'}</td>
                                        <td className={`p-4 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{r.referral_date || 'N/A'}</td>
                                        <td className={`p-4 font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>{r.follow_up_status || 'New Referral'}</td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                r.conversion_status === 'Admitted'
                                                    ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-100 text-emerald-700 border border-emerald-200')
                                                    : (isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-100 text-cyan-700 border border-cyan-200')
                                            }`}>
                                                {r.conversion_status || 'In Progress'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => handleOpenViewModal(r)}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                                                    isDarkMode
                                                        ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white border border-amber-500/30'
                                                        : 'bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white border border-amber-200'
                                                }`}
                                            >
                                                <Eye size={13} />
                                                <span>{isAdminView ? 'View / Update' : 'View'}</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* View Details Modal */}
            {selectedReferral && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 pt-16 sm:pt-20 overflow-y-auto">
                    <div className={`w-full max-w-2xl p-6 sm:p-7 rounded-2xl border ${
                        isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                    } space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto`}>
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                    <GraduationCap size={22} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black">{selectedReferral.referred_person}</h3>
                                    <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {isAdminView ? 'Student Referral Details & Status Management' : 'Student Referral Details & Admission Status'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedReferral(null)}
                                className={`p-2 rounded-xl border transition-colors ${
                                    isDarkMode ? 'border-white/10 hover:bg-white/10 text-slate-400 hover:text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div className={`p-4 rounded-xl border space-y-3 ${isDarkMode ? 'bg-slate-950/60 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                <h4 className="text-[11px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                                    <User size={13} /> Referred Student
                                </h4>
                                <div className="space-y-2">
                                    <div>
                                        <span className={`text-[10px] uppercase font-bold block ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Student Name</span>
                                        <p className="font-bold text-sm">{selectedReferral.referred_person}</p>
                                    </div>
                                    <div>
                                        <span className={`text-[10px] uppercase font-bold block ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Contact Number</span>
                                        <p className="font-mono font-medium flex items-center gap-1 mt-0.5">
                                            <Phone size={12} className="text-cyan-500" /> {selectedReferral.phone || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <span className={`text-[10px] uppercase font-bold block ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Email Address</span>
                                        <p className="font-mono font-medium flex items-center gap-1 mt-0.5">
                                            <Mail size={12} className="text-cyan-500" /> {selectedReferral.email || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <span className={`text-[10px] uppercase font-bold block ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Interested Course</span>
                                        <p className="font-bold text-cyan-500 flex items-center gap-1 mt-0.5">
                                            <BookOpen size={12} /> {selectedReferral.interested_course}
                                        </p>
                                    </div>
                                    {selectedReferral.centre_name && (
                                        <div>
                                            <span className={`text-[10px] uppercase font-bold block ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Target Centre</span>
                                            <p className="font-medium flex items-center gap-1 mt-0.5">
                                                <Building2 size={12} className="text-slate-400" /> {selectedReferral.centre_name}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={`p-4 rounded-xl border space-y-3 ${isDarkMode ? 'bg-slate-950/60 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                <h4 className="text-[11px] font-black uppercase tracking-wider text-cyan-500 flex items-center gap-1.5">
                                    <Sparkles size={13} /> Referral Info
                                </h4>
                                <div className="space-y-2">
                                    <div>
                                        <span className={`text-[10px] uppercase font-bold block ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Referring Teacher</span>
                                        <p className="font-bold text-sm text-cyan-400">{selectedReferral.referred_by || currentTeacherName}</p>
                                    </div>
                                    <div>
                                        <span className={`text-[10px] uppercase font-bold block ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Source Role</span>
                                        <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                                            isDarkMode ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-cyan-100 text-cyan-800'
                                        }`}>
                                            {selectedReferral.referral_source || 'Teacher'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className={`text-[10px] uppercase font-bold block ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Referral Date</span>
                                        <p className="font-medium flex items-center gap-1 mt-0.5">
                                            <Calendar size={12} className="text-slate-400" /> {selectedReferral.referral_date}
                                        </p>
                                    </div>
                                    <div>
                                        <span className={`text-[10px] uppercase font-bold block ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Reward Points</span>
                                        <p className="font-black text-amber-500 flex items-center gap-1 mt-0.5">
                                            <Award size={13} /> {selectedReferral.reward_points || 0} pts earned
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Status & Counseling Update Panel (Admin Only) */}
                        {isAdminView ? (
                            <div className={`p-4 sm:p-5 rounded-xl border space-y-4 ${
                                isDarkMode ? 'bg-slate-950/80 border-amber-500/30' : 'bg-amber-50/60 border-amber-200'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <h4 className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                                        isDarkMode ? 'text-amber-400' : 'text-amber-800'
                                    }`}>
                                        <Sparkles size={14} className="text-amber-500" /> Manage Status & Counseling Progress
                                    </h4>
                                    {statusUpdateSuccess && (
                                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-pulse">
                                            <CheckCircle2 size={13} /> Updated & Synchronized!
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    <div>
                                        <label className={`block font-bold text-[11px] mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Follow-up Status
                                        </label>
                                        <select
                                            value={statusUpdateForm.follow_up_status}
                                            onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, follow_up_status: e.target.value })}
                                            className={`w-full p-2.5 rounded-xl border text-xs font-semibold outline-none transition-all ${
                                                isDarkMode ? 'bg-slate-900 border-white/10 text-white focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                                            }`}
                                        >
                                            <option value="New Referral">New Referral (Pending Counseling)</option>
                                            <option value="Contacted / In Discussion">Contacted / In Discussion</option>
                                            <option value="Counseling Scheduled">Counseling Scheduled</option>
                                            <option value="Demo Class Requested">Demo Class Requested</option>
                                            <option value="Demo Class Completed">Demo Class Completed</option>
                                            <option value="Counseled by Teacher / Staff">Counseled by Teacher / Staff</option>
                                            <option value="Visited Centre">Visited Centre</option>
                                            <option value="Lost / Not Interested">Lost / Not Interested</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className={`block font-bold text-[11px] mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Conversion / Admission Status
                                        </label>
                                        <select
                                            value={statusUpdateForm.conversion_status}
                                            onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, conversion_status: e.target.value })}
                                            className={`w-full p-2.5 rounded-xl border text-xs font-semibold outline-none transition-all ${
                                                isDarkMode ? 'bg-slate-900 border-white/10 text-white focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                                            }`}
                                        >
                                            <option value="In Progress">In Progress (Under Review / Counseling)</option>
                                            <option value="Admitted">Admitted / Enrolled (500 pts Reward)</option>
                                            <option value="Dropped">Dropped / Ineligible</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className={`block font-bold text-[11px] mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Counselor / Admin Notes & Follow-up Remarks
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="Add follow-up notes, admission details, or parent conversation summary..."
                                        value={statusUpdateForm.remarks}
                                        onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, remarks: e.target.value })}
                                        className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none resize-none transition-all ${
                                            isDarkMode ? 'bg-slate-900 border-white/10 text-white focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                                        }`}
                                    />
                                </div>
                            </div>
                        ) : (
                            /* Read-only Status & Remarks for Teacher */
                            <div className={`p-4 rounded-xl border space-y-3 ${
                                isDarkMode ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-200'
                            }`}>
                                {selectedReferral.remarks && (
                                    <div className="text-xs space-y-1">
                                        <span className={`text-[10px] uppercase font-bold flex items-center gap-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            <FileText size={11} /> Teacher Remarks / Notes
                                        </span>
                                        <p className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{selectedReferral.remarks}</p>
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-white/5">
                                    <div>
                                        <span className={`text-[10px] uppercase font-bold block ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Follow-up Status</span>
                                        <p className="font-black text-sm text-amber-400 mt-0.5">{selectedReferral.follow_up_status || 'New Referral'}</p>
                                    </div>
                                    <div>
                                        <span className={`text-[10px] uppercase font-bold block ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Conversion Status</span>
                                        <span className={`inline-block mt-0.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                                            selectedReferral.conversion_status === 'Admitted'
                                                ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-100 text-emerald-700 border border-emerald-200')
                                                : (isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-100 text-cyan-700 border border-cyan-200')
                                        }`}>
                                            {selectedReferral.conversion_status || 'In Progress'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Modal Footer */}
                        <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                            <span className="text-[11px] font-semibold text-slate-400">
                                {isAdminView ? 'Updates sync live between Admin & Teacher Portal' : 'Admission status is managed and updated by Academic Admin'}
                            </span>
                            <div className="flex items-center gap-2.5 ml-auto">
                                <button
                                    type="button"
                                    onClick={() => setSelectedReferral(null)}
                                    className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors ${
                                        isDarkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                >
                                    Close
                                </button>
                                {isAdminView && (
                                    <button
                                        type="button"
                                        onClick={handleSaveStatusUpdate}
                                        disabled={updatingStatus}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs uppercase tracking-wider hover:opacity-95 shadow-md shadow-amber-500/20 disabled:opacity-50"
                                    >
                                        {updatingStatus ? (
                                            <>
                                                <RefreshCw size={14} className="animate-spin" />
                                                <span>Saving...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={14} />
                                                <span>Save Status Update</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Refer a New Student Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 pt-16 sm:pt-20 overflow-y-auto">
                    <div className={`w-full max-w-xl p-6 sm:p-7 rounded-2xl border ${
                        isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                    } space-y-5 shadow-2xl animate-in zoom-in-95 duration-200`}>
                        {/* Header */}
                        <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                    <UserPlus size={22} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black">Refer a New Student</h3>
                                    <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Submit prospective student information for counseling and admission
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className={`p-2 rounded-xl border transition-colors ${
                                    isDarkMode ? 'border-white/10 hover:bg-white/10 text-slate-400 hover:text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Referring Teacher Summary Card */}
                        <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                            isDarkMode ? 'bg-slate-950/60 border-cyan-500/20' : 'bg-cyan-50/70 border-cyan-200'
                        }`}>
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                                    <GraduationCap size={18} />
                                </div>
                                <div>
                                    <p className={`text-[10px] uppercase font-bold tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Referring Teacher (You)
                                    </p>
                                    <p className={`font-black text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        {formData.referred_by || currentTeacherName}
                                    </p>
                                </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/10 text-cyan-500 border border-cyan-500/30">
                                Teacher Referral
                            </span>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                            {/* Student Name */}
                            <div>
                                <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Student Full Name <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                    <input
                                        type="text"
                                        required
                                        placeholder="Enter student's full name"
                                        value={formData.referred_person}
                                        onChange={(e) => setFormData({ ...formData, referred_person: e.target.value })}
                                        className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs font-semibold outline-none ${
                                            isDarkMode ? 'bg-slate-950/60 border-white/10 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                                        }`}
                                    />
                                </div>
                            </div>

                            {/* Contact Number & Email */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className={`block font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Contact Phone <span className="text-rose-500">*</span>
                                        </label>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                            {formData.phone.replace(/\D/g, '').length}/10
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 ${formErrors.phone ? 'text-rose-500' : 'text-slate-400'}`} size={15} />
                                        <input
                                            type="tel"
                                            inputMode="numeric"
                                            maxLength={10}
                                            required
                                            placeholder="e.g. 9876543210"
                                            value={formData.phone}
                                            onChange={(e) => {
                                                const cleanDigits = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                setFormData({ ...formData, phone: cleanDigits });
                                                if (formErrors.phone) {
                                                    setFormErrors(prev => ({ ...prev, phone: validatePhone(cleanDigits) }));
                                                }
                                            }}
                                            onBlur={() => {
                                                setFormErrors(prev => ({ ...prev, phone: validatePhone(formData.phone) }));
                                            }}
                                            className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs font-semibold outline-none transition-colors ${
                                                formErrors.phone
                                                    ? 'border-rose-500 bg-rose-500/5 text-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                    : (isDarkMode ? 'bg-slate-950/60 border-white/10 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500')
                                            }`}
                                        />
                                    </div>
                                    {formErrors.phone && (
                                        <div className="flex items-center gap-1 mt-1 text-[11px] text-rose-500 font-semibold animate-in fade-in duration-150">
                                            <AlertCircle size={12} className="shrink-0" />
                                            <span>{formErrors.phone}</span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className={`block font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Email Address (Optional)
                                        </label>
                                    </div>
                                    <div className="relative">
                                        <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 ${formErrors.email ? 'text-rose-500' : 'text-slate-400'}`} size={15} />
                                        <input
                                            type="email"
                                            placeholder="student@example.com"
                                            value={formData.email}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setFormData({ ...formData, email: val });
                                                if (formErrors.email) {
                                                    setFormErrors(prev => ({ ...prev, email: validateEmail(val) }));
                                                }
                                            }}
                                            onBlur={() => {
                                                setFormErrors(prev => ({ ...prev, email: validateEmail(formData.email) }));
                                            }}
                                            className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs font-semibold outline-none transition-colors ${
                                                formErrors.email
                                                    ? 'border-rose-500 bg-rose-500/5 text-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                    : (isDarkMode ? 'bg-slate-950/60 border-white/10 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500')
                                            }`}
                                        />
                                    </div>
                                    {formErrors.email && (
                                        <div className="flex items-center gap-1 mt-1 text-[11px] text-rose-500 font-semibold animate-in fade-in duration-150">
                                            <AlertCircle size={12} className="shrink-0" />
                                            <span>{formErrors.email}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Interested Course / Target Program */}
                            <div>
                                <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Target Course / Program <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={formData.interested_course}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData({
                                            ...formData,
                                            interested_course: val,
                                            custom_course: val === 'Others' ? (formData.custom_course || '') : ''
                                        });
                                    }}
                                    className={`w-full p-2.5 rounded-xl border text-xs font-semibold outline-none ${
                                        isDarkMode ? 'bg-slate-950 border-white/10 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                                    }`}
                                >
                                    <option value="Class 11 Engineering 2-Year Program">Class 11 Engineering 2-Year Program (JEE Main & Adv)</option>
                                    <option value="Class 12 Engineering 1-Year Program">Class 12 Engineering 1-Year Program (JEE Main & Adv)</option>
                                    <option value="Class 11 Medical 2-Year Program">Class 11 Medical 2-Year Program (NEET-UG)</option>
                                    <option value="Class 12 Medical 1-Year Program">Class 12 Medical 1-Year Program (NEET-UG)</option>
                                    <option value="Foundation Class 9-10 Program">Foundation Program (Class 9 - 10 / Olympiad)</option>
                                    <option value="Repeater Medical Batch">Repeater / Dropper Medical Batch (NEET)</option>
                                    <option value="Repeater Engineering Batch">Repeater / Dropper Engineering Batch (JEE)</option>
                                    <option value="WBJEE Crash Course">WBJEE Fast-Track / Crash Course</option>
                                    <option value="Others">Others (Specify Manually)</option>
                                </select>

                                {/* If 'Others' is selected, show manual input field */}
                                {formData.interested_course === 'Others' && (
                                    <div className="mt-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                                        <label className={`block text-[11px] font-bold mb-1 ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                                            Specify Course / Program Name <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" size={14} />
                                            <input
                                                type="text"
                                                required
                                                autoFocus
                                                placeholder="e.g. CBSE + NDA Integrated Batch / Crash Course"
                                                value={formData.custom_course || ''}
                                                onChange={(e) => setFormData({ ...formData, custom_course: e.target.value })}
                                                className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-semibold outline-none transition-all ${
                                                    isDarkMode
                                                        ? 'bg-slate-950/90 border-amber-500/60 text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-500'
                                                        : 'bg-amber-50/50 border-amber-300 text-slate-900 focus:border-amber-600 focus:ring-1 focus:ring-amber-500'
                                                }`}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Preferred Centre with Master Data Search & Follow-up Status */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Target Centre with Master Data Search */}
                                <div className="relative" ref={centreDropdownRef}>
                                    <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Target Centre / Branch <span className="text-rose-500">*</span>
                                    </label>
                                    
                                    <div
                                        onClick={() => setIsCentreDropdownOpen(!isCentreDropdownOpen)}
                                        className={`w-full p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                            isDarkMode
                                                ? 'bg-slate-950/60 border-white/10 text-white hover:border-amber-500/50'
                                                : 'bg-slate-50 border-slate-200 text-slate-900 hover:border-amber-500/50'
                                        } ${isCentreDropdownOpen ? 'ring-2 ring-amber-500/20 border-amber-500' : ''}`}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <Building2 size={15} className="text-amber-500 shrink-0" />
                                            <span className="font-semibold text-xs truncate">
                                                {formData.centre_name || 'Select Centre from Master Data'}
                                            </span>
                                        </div>
                                        <ChevronDown size={15} className={`text-slate-400 shrink-0 transition-transform ${isCentreDropdownOpen ? 'rotate-180' : ''}`} />
                                    </div>

                                    {/* Dropdown Menu */}
                                    {isCentreDropdownOpen && (
                                        <div className={`absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border shadow-2xl p-2 space-y-2 animate-in fade-in zoom-in-95 duration-150 ${
                                            isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                                        }`}>
                                            {/* Search Input */}
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    placeholder="Search centre by name or code..."
                                                    value={centreSearch}
                                                    onChange={(e) => setCentreSearch(e.target.value)}
                                                    className={`w-full pl-8 pr-7 py-1.5 rounded-lg border text-xs font-semibold outline-none ${
                                                        isDarkMode ? 'bg-slate-950 border-white/10 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                                                    }`}
                                                />
                                                {centreSearch && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setCentreSearch('')}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* List of Centres */}
                                            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                                                {loadingCentres ? (
                                                    <div className="p-3 text-center text-xs text-slate-400">Loading master centres...</div>
                                                ) : filteredMasterCentres.length === 0 ? (
                                                    <div className="p-3 text-center space-y-1.5">
                                                        <p className="text-xs text-slate-400">No master centre matches "{centreSearch}"</p>
                                                        {centreSearch.trim() && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setFormData({ ...formData, centre_name: centreSearch.trim() });
                                                                    setIsCentreDropdownOpen(false);
                                                                }}
                                                                className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-amber-500 text-white hover:bg-amber-600"
                                                            >
                                                                Use "{centreSearch.trim()}"
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    filteredMasterCentres.map((c) => {
                                                        const isSelected = formData.centre_name === c.name;
                                                        return (
                                                            <div
                                                                key={c.id || c.name}
                                                                onClick={() => {
                                                                    setFormData({ ...formData, centre_name: c.name });
                                                                    setIsCentreDropdownOpen(false);
                                                                }}
                                                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs font-medium transition-colors ${
                                                                    isSelected
                                                                        ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 font-bold' : 'bg-amber-50 text-amber-800 font-bold')
                                                                        : (isDarkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-100 text-slate-700')
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2 truncate">
                                                                    <Building2 size={13} className={isSelected ? 'text-amber-500' : 'text-slate-400'} />
                                                                    <span className="truncate">{c.name}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                    {c.code && (
                                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                                                                            isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                                                                        }`}>
                                                                            {c.code}
                                                                        </span>
                                                                    )}
                                                                    {isSelected && <Check size={14} className="text-amber-500" />}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Initial Status
                                    </label>
                                    <select
                                        value={formData.follow_up_status}
                                        onChange={(e) => setFormData({ ...formData, follow_up_status: e.target.value })}
                                        className={`w-full p-2.5 rounded-xl border text-xs font-semibold outline-none ${
                                            isDarkMode ? 'bg-slate-950 border-white/10 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                                        }`}
                                    >
                                        <option value="New Referral">New Referral (Pending Counseling)</option>
                                        <option value="Demo Class Requested">Demo Class Requested</option>
                                        <option value="Counseled">Counseled by Teacher / Staff</option>
                                    </select>
                                </div>
                            </div>


                            {/* Teacher Remarks */}
                            <div>
                                <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Teacher Remarks & Guidance Notes (Optional)
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Add any specific student background, parent discussion points, or batch preferences..."
                                    value={formData.remarks}
                                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                    className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none resize-none ${
                                        isDarkMode ? 'bg-slate-950/60 border-white/10 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                                    }`}
                                />
                            </div>

                            {/* Modal Footer */}
                            <div className={`flex items-center justify-end gap-3 pt-3 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider ${
                                        isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs uppercase tracking-wider hover:opacity-95 shadow-md shadow-amber-500/20 disabled:opacity-50"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Submitting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <UserCheck size={15} />
                                            <span>Submit Student Referral</span>
                                        </>
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

export default ReferralsCollectedTab;

