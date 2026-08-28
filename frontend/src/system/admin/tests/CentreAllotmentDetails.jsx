import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import {
    ArrowLeft, Search, RefreshCw, Smartphone, Calendar, Clock,
    Edit2, Send, Wand2, Loader2, X, ShieldCheck, BellRing, Mail, CheckSquare, Square, Trash2, Check, FileText,
    FileSpreadsheet, Upload, Download, AlertCircle, FileUp
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';

const CentreAllotmentDetails = ({ test, onBack }) => {
    const { getApiUrl, token } = useAuth();
    const { isDarkMode } = useTheme();
    const [allotments, setAllotments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const activeFetchKeyRef = useRef(null); // Prevent duplicate simultaneous requests

    const getAuthConfig = useCallback(() => {
        const activeToken = token || localStorage.getItem('auth_token');
        return activeToken ? { headers: { 'Authorization': `Bearer ${activeToken}` } } : {};
    }, [token]);

    // Modal state for individual editing
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedAllotment, setSelectedAllotment] = useState(null);
    const [editForm, setEditForm] = useState({
        start_time: '',
        end_time: ''
    });

    // Bulk Actions State
    const [selectedAllotmentIds, setSelectedAllotmentIds] = useState([]);
    const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
    const [shouldSendBulk, setShouldSendBulk] = useState(false);
    const [bulkEditForm, setBulkEditForm] = useState({
        start_time: '',
        end_time: ''
    });

    // Excel / CSV Import State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importPreviewRows, setImportPreviewRows] = useState([]);
    const [isImportLoading, setIsImportLoading] = useState(false);
    const [autoGenerateCodes, setAutoGenerateCodes] = useState(true);
    const [importValidationErrors, setImportValidationErrors] = useState([]);
    const fileInputRef = useRef(null);

    // Custom Alert State
    const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

    const triggerAlert = (message, type = 'success') => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
    };

    const fetchAllotments = useCallback(async (force = false) => {
        const fetchKey = `allotments-${test.id}-${force}`;
        if (activeFetchKeyRef.current === fetchKey) return;

        setIsLoading(true);
        activeFetchKeyRef.current = fetchKey;
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/tests/${test.id}/centres/${force ? '?refresh=true' : ''}`, getAuthConfig());
            setAllotments(response.data);
        } catch (err) {
            console.error('Error fetching allotments:', err);
            triggerAlert('Failed to load allotments', 'error');
        } finally {
            setIsLoading(false);
            if (activeFetchKeyRef.current === fetchKey) {
                activeFetchKeyRef.current = null;
            }
        }
    }, [test.id, getApiUrl, getAuthConfig]);

    useEffect(() => {
        fetchAllotments();
    }, [fetchAllotments]);

    const handleGenerateCode = async (id) => {
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.post(`${apiUrl}/api/tests/allotments/${id}/generate_code/`, {}, getAuthConfig());
            setAllotments(allotments.map(a => a.id === id ? { ...a, access_code: res.data.code, code_history: res.data.history } : a));
            triggerAlert('Access code generated successfully!', 'success');
        } catch (err) {
            triggerAlert('Failed to generate code', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleGenerateResult = async () => {
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.post(`${apiUrl}/api/tests/${test.id}/generate_result/`, {}, getAuthConfig());
            triggerAlert(res.data.message || 'Results generated successfully!', 'success');
            // Refresh to show updated test status if needed
        } catch (err) {
            triggerAlert(err.response?.data?.error || 'Failed to generate results', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleSendEmail = async (id) => {
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            await axios.post(`${apiUrl}/api/tests/allotments/${id}/send_email/`, {}, getAuthConfig());
            setAllotments(allotments.map(a => a.id === id ? { ...a, is_code_sent: true, was_sent: true } : a));
            triggerAlert('Access code sent via email successfully!', 'success');
        } catch (err) {
            triggerAlert(err.response?.data?.error || 'Failed to send email', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleStatusToggle = async (allotment) => {
        try {
            const apiUrl = getApiUrl();
            const newStatus = !allotment.is_active;
            await axios.patch(`${apiUrl}/api/tests/allotments/${allotment.id}/`, { is_active: newStatus }, getAuthConfig());
            setAllotments(allotments.map(a => a.id === allotment.id ? { ...a, is_active: newStatus } : a));
            triggerAlert(`Test ${newStatus ? 'activated' : 'deactivated'} for this centre`, 'success');
        } catch (err) {
            triggerAlert('Failed to update status', 'error');
        }
    };

    const handleEditClick = (allotment) => {
        setSelectedAllotment(allotment);
        setEditForm({
            start_time: allotment.start_time ? allotment.start_time.slice(0, 16) : '',
            end_time: allotment.end_time ? allotment.end_time.slice(0, 16) : ''
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateAllotment = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            await axios.patch(`${apiUrl}/api/tests/allotments/${selectedAllotment.id}/`, { ...editForm, is_code_sent: false }, getAuthConfig());
            await axios.post(`${apiUrl}/api/tests/allotments/${selectedAllotment.id}/generate_code/`, {}, getAuthConfig());
            fetchAllotments();
            setIsEditModalOpen(false);
            triggerAlert('Schedule updated successfully!', 'success');
        } catch (err) {
            triggerAlert('Failed to update schedule', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleBulkUpdate = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            
            // 1. Update schedules for all selected allotments
            const updates = selectedAllotmentIds.map(id =>
                axios.patch(`${apiUrl}/api/tests/allotments/${id}/`, { ...bulkEditForm, is_code_sent: false }, getAuthConfig())
            );
            await Promise.all(updates);

            // 2. Generate access codes for all selected allotments
            // This ensures codes are created/updated after the time change
            const codeGens = selectedAllotmentIds.map(id =>
                axios.post(`${apiUrl}/api/tests/allotments/${id}/generate_code/`, {}, getAuthConfig())
            );
            await Promise.all(codeGens);

            // 3. Send emails if requested
            if (shouldSendBulk) {
                const sendEmails = selectedAllotmentIds.map(id =>
                    axios.post(`${apiUrl}/api/tests/allotments/${id}/send_email/`, {}, getAuthConfig())
                );
                await Promise.all(sendEmails);
            }

            fetchAllotments();
            setIsBulkEditModalOpen(false);
            setShouldSendBulk(false);
            setSelectedAllotmentIds([]);
            triggerAlert(`${selectedAllotmentIds.length} Centres updated${shouldSendBulk ? ' and codes sent' : ''} successfully!`, 'success');
        } catch (err) {
            console.error('Bulk update error:', err);
            triggerAlert('Failed to update centres or generate codes', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleBulkStatusToggle = async (status) => {
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const updates = selectedAllotmentIds.map(id =>
                axios.patch(`${apiUrl}/api/tests/allotments/${id}/`, { is_active: status }, getAuthConfig())
            );
            await Promise.all(updates);
            fetchAllotments();
            setSelectedAllotmentIds([]);
            triggerAlert(`${selectedAllotmentIds.length} Centres ${status ? 'activated' : 'deactivated'}`, 'success');
        } catch (err) {
            triggerAlert('Failed to update status', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleBulkSendEmail = async () => {
        const selected = allotments.filter(a => selectedAllotmentIds.includes(a.id));
        
        // Validation checks
        const centersWithoutCodes = selected.filter(a => !a.access_code);
        if (centersWithoutCodes.length > 0) {
            triggerAlert(`${centersWithoutCodes.length} centres missing codes. Generate codes first.`, 'error');
            return;
        }

        const invalidCenters = selected.filter(a => !a.is_active || !a.start_time || !a.end_time);
        if (invalidCenters.length > 0) {
            triggerAlert(`${invalidCenters.length} centres are inactive or missing schedule times.`, 'error');
            return;
        }

        if (!window.confirm(`Send access codes to ${selectedAllotmentIds.length} centres?`)) return;

        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const sends = selectedAllotmentIds.map(id =>
                axios.post(`${apiUrl}/api/tests/allotments/${id}/send_email/`, {}, getAuthConfig())
            );
            await Promise.all(sends);
            fetchAllotments();
            setSelectedAllotmentIds([]);
            triggerAlert(`Access codes sent to ${selectedAllotmentIds.length} centres successfully!`, 'success');
        } catch (err) {
            console.error('Bulk send error:', err);
            triggerAlert('Failed to send some access codes', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const toggleSelect = (id) => {
        setSelectedAllotmentIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedAllotmentIds.length === filteredAllotments.length) {
            setSelectedAllotmentIds([]);
        } else {
            setSelectedAllotmentIds(filteredAllotments.map(a => a.id));
        }
    };

    // Download Pre-filled Excel Template
    const handleDownloadTemplate = () => {
        const formatDt = (dt) => {
            if (!dt) return '';
            const d = new Date(dt);
            if (isNaN(d.getTime())) return '';
            const yr = d.getFullYear();
            const mo = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hr = String(d.getHours()).padStart(2, '0');
            const mn = String(d.getMinutes()).padStart(2, '0');
            return `${yr}-${mo}-${day} ${hr}:${mn}`;
        };

        const rows = allotments.filter(a => a.centre_details?.code !== 'N/A' && a.centre_details?.code).map(a => ({
            'Centre Code': a.centre_details?.code || '',
            'Centre Name': a.centre_details?.name || '',
            'Start Time (YYYY-MM-DD HH:MM)': formatDt(a.start_time),
            'End Time (YYYY-MM-DD HH:MM)': formatDt(a.end_time),
            'Magic Code (Optional)': a.access_code || '',
            'Status (Active/Inactive)': a.is_active ? 'Active' : 'Inactive'
        }));

        const data = rows.length > 0 ? rows : [
            {
                'Centre Code': 'AR',
                'Centre Name': 'ARAMBAGH',
                'Start Time (YYYY-MM-DD HH:MM)': '2026-08-29 09:00',
                'End Time (YYYY-MM-DD HH:MM)': '2026-09-01 21:00',
                'Magic Code (Optional)': '482088',
                'Status (Active/Inactive)': 'Active'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [
            { wch: 15 },
            { wch: 25 },
            { wch: 30 },
            { wch: 30 },
            { wch: 24 },
            { wch: 24 }
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Centre Schedule');
        const safeName = (test.name || 'Test').replace(/[^a-zA-Z0-9_-]/g, '_');
        XLSX.writeFile(wb, `${safeName}_Centre_Schedule_Template.xlsx`);
        triggerAlert('Excel template downloaded!', 'success');
    };

    // Parse Excel/CSV File
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportFile(file);
        setImportValidationErrors([]);
        const reader = new FileReader();

        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' });

                if (!rawRows || rawRows.length === 0) {
                    setImportValidationErrors(['The selected file contains no data rows.']);
                    setImportPreviewRows([]);
                    return;
                }

                const parsed = rawRows.map((r, idx) => {
                    const getVal = (...keys) => {
                        for (const k of keys) {
                            const found = Object.keys(r).find(rk => rk.trim().toLowerCase() === k.toLowerCase());
                            if (found && r[found] !== undefined && r[found] !== null && r[found] !== '') {
                                return r[found];
                            }
                        }
                        return '';
                    };

                    const rawCode = getVal('centre code', 'center code', 'centre_code', 'center_code', 'code');
                    const rawName = getVal('centre name', 'center name', 'centre_name', 'center_name', 'name', 'centre');
                    const rawStart = getVal('start time (yyyy-mm-dd hh:mm)', 'start time', 'start_time', 'start');
                    const rawEnd = getVal('end time (yyyy-mm-dd hh:mm)', 'end time', 'end_time', 'end');
                    const rawCodeVal = getVal('magic code (optional)', 'magic code', 'access code', 'passcode', 'magic_code', 'access_code');
                    const rawStatus = getVal('status (active/inactive)', 'status', 'is_active', 'active');

                    const formatDateVal = (v) => {
                        if (!v) return '';
                        if (v instanceof Date && !isNaN(v.getTime())) {
                            const yr = v.getFullYear();
                            const mo = String(v.getMonth() + 1).padStart(2, '0');
                            const day = String(v.getDate()).padStart(2, '0');
                            const hr = String(v.getHours()).padStart(2, '0');
                            const mn = String(v.getMinutes()).padStart(2, '0');
                            return `${yr}-${mo}-${day} ${hr}:${mn}`;
                        }
                        return String(v).trim();
                    };

                    const codeStr = String(rawCode || '').trim();
                    const nameStr = String(rawName || '').trim();
                    const startStr = formatDateVal(rawStart);
                    const endStr = formatDateVal(rawEnd);
                    const magicCodeStr = String(rawCodeVal || '').trim();
                    const isActive = rawStatus ? !['inactive', 'false', '0', 'no', 'disabled'].includes(String(rawStatus).trim().toLowerCase()) : true;

                    const matchedAllotment = allotments.find(a =>
                        (codeStr && a.centre_details?.code?.toLowerCase() === codeStr.toLowerCase()) ||
                        (nameStr && a.centre_details?.name?.toLowerCase() === nameStr.toLowerCase())
                    );

                    return {
                        id: idx + 1,
                        centre_code: codeStr,
                        centre_name: nameStr || matchedAllotment?.centre_details?.name || '',
                        start_time: startStr,
                        end_time: endStr,
                        magic_code: magicCodeStr,
                        is_active: isActive,
                        matched: !!matchedAllotment,
                        centre_display: matchedAllotment?.centre_details?.name || nameStr || codeStr || 'Unknown'
                    };
                });

                setImportPreviewRows(parsed);
            } catch (err) {
                console.error('Error parsing Excel:', err);
                setImportValidationErrors([`Failed to parse file: ${err.message}`]);
                setImportPreviewRows([]);
            }
        };

        reader.readAsBinaryString(file);
    };

    // Submit Imported Rows
    const handleConfirmImport = async () => {
        if (importPreviewRows.length === 0) {
            triggerAlert('No rows to import', 'error');
            return;
        }

        setIsImportLoading(true);
        try {
            const apiUrl = getApiUrl();
            const payload = {
                rows: importPreviewRows.map(r => ({
                    centre_code: r.centre_code,
                    centre_name: r.centre_name,
                    start_time: r.start_time,
                    end_time: r.end_time,
                    magic_code: r.magic_code,
                    is_active: r.is_active
                })),
                auto_generate_missing_codes: autoGenerateCodes
            };

            const res = await axios.post(`${apiUrl}/api/tests/${test.id}/import-centre-allotments/`, payload, getAuthConfig());
            
            triggerAlert(res.data.message || 'Centres updated from Excel successfully!', 'success');
            setIsImportModalOpen(false);
            setImportFile(null);
            setImportPreviewRows([]);
            fetchAllotments(true);
        } catch (err) {
            console.error('Import error:', err);
            triggerAlert(err.response?.data?.error || 'Failed to import centre schedules', 'error');
        } finally {
            setIsImportLoading(false);
        }
    };

    const filteredAllotments = allotments.filter(a =>
        a.centre_details?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.centre_details?.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (dateString) => {
        if (!dateString) return '---';
        return new Date(dateString).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).replace(',', '');
    };

    // Drag to Scroll Logic
    const tableContainerRef = React.useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.pageX - tableContainerRef.current.offsetLeft);
        setScrollLeft(tableContainerRef.current.scrollLeft);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - tableContainerRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Scroll-fast multiplier
        tableContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    return (
        <div className={`min-h-screen ${isDarkMode ? 'bg-[#0B0F17] text-white' : 'bg-slate-50 text-slate-900'} p-6 animate-in fade-in duration-500`}>
            {/* Header Info */}
            <div className={`mb-8 p-6 rounded-[5px] border flex flex-wrap justify-between items-center gap-6 shadow-sm ${isDarkMode ? 'bg-[#1A1F2B] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-5">
                    <button
                        onClick={onBack}
                        className={`p-3 rounded-[5px] transition-all hover:scale-110 active:scale-95 ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight mb-1">
                            Test Name: <span className="text-blue-500">{test.name}</span>
                        </h1>
                        <div className="flex items-center gap-3 opacity-60 text-xs font-bold uppercase tracking-widest">
                            <span>Code: {test.code}</span>
                            <span className="w-1 h-1 rounded-full bg-current" />
                            <span>{test.session_details?.name}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {selectedAllotmentIds.length > 0 && (
                        <div className={`p-1.5 rounded-[5px] border flex items-center gap-2 animate-in slide-in-from-right-10 duration-300 ${isDarkMode ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
                            <span className="text-[10px] font-black uppercase tracking-widest px-2 text-blue-500">{selectedAllotmentIds.length} Selected</span>
                            <button
                                onClick={() => setIsBulkEditModalOpen(true)}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-[5px] text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all"
                            >
                                Bulk Edit
                            </button>
                            <button
                                onClick={handleBulkSendEmail}
                                disabled={isActionLoading || allotments.filter(a => selectedAllotmentIds.includes(a.id)).some(a => !a.access_code)}
                                className={`px-3 py-1.5 rounded-[5px] text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${allotments.filter(a => selectedAllotmentIds.includes(a.id)).some(a => !a.access_code) ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-50' : 'bg-sky-500 text-white hover:bg-sky-600'}`}
                                title={allotments.filter(a => selectedAllotmentIds.includes(a.id)).some(a => !a.access_code) ? "Generate codes for all selected centres first" : "Send codes to selected centres"}
                            >
                                <Send size={12} /> Send Codes
                            </button>
                            <div className="w-px h-4 bg-blue-500/20" />
                            <button
                                onClick={() => handleBulkStatusToggle(true)}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-[5px] text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all"
                            >
                                Activate
                            </button>
                            <button
                                onClick={() => handleBulkStatusToggle(false)}
                                className="px-3 py-1.5 bg-red-600 text-white rounded-[5px] text-[9px] font-black uppercase tracking-widest hover:bg-red-700 transition-all"
                            >
                                Disable
                            </button>
                        </div>
                    )}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={16} />
                        <input
                            type="text"
                            placeholder="Find centre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`pl-10 pr-4 py-2.5 rounded-[5px] border text-xs font-bold outline-none transition-all focus:ring-4 ${isDarkMode ? 'bg-white/5 border-white/10 focus:ring-blue-500/10' : 'bg-slate-50 border-slate-200 focus:ring-blue-500/5'}`}
                        />
                    </div>

                    {/* Download Template Button */}
                    <button
                        onClick={handleDownloadTemplate}
                        title="Download Excel template pre-filled with current centres"
                        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-[5px] border text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/10 text-emerald-400 hover:bg-emerald-500/10' : 'bg-white border-slate-200 text-emerald-600 hover:bg-emerald-50 shadow-sm'}`}
                    >
                        <Download size={15} />
                        <span className="hidden sm:inline">Template</span>
                    </button>

                    {/* Import Excel Button */}
                    <button
                        onClick={() => {
                            setIsImportModalOpen(true);
                            setImportFile(null);
                            setImportPreviewRows([]);
                            setImportValidationErrors([]);
                        }}
                        title="Import centre schedules & magic codes from Excel/CSV"
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[5px] text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 hover:scale-105 active:scale-95"
                    >
                        <FileSpreadsheet size={16} />
                        <span>Import Excel</span>
                    </button>

                    <button
                        onClick={() => fetchAllotments(true)}
                        className={`p-3 rounded-[5px] border transition-all active:rotate-180 duration-500 ${isDarkMode ? 'bg-white/5 border-white/10 text-blue-400' : 'bg-white border-slate-200 text-blue-500 hover:bg-blue-50'}`}
                    >
                        <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Table Area */}
            <div className={`rounded-[5px] border shadow-2xl h-[600px] flex flex-col ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
                <div
                    ref={tableContainerRef}
                    className={`flex-1 overflow-auto overflow-y-visible cursor-grab ${isDragging ? 'cursor-grabbing select-none' : ''}`}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                >
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                <th className="py-5 px-6 text-center">
                                    <button onClick={handleSelectAll} className="p-1 hover:bg-white/10 rounded transition-all">
                                        {selectedAllotmentIds.length === filteredAllotments.length && filteredAllotments.length > 0
                                            ? <CheckSquare size={16} className="text-blue-500" />
                                            : <Square size={16} className="opacity-30" />}
                                    </button>
                                </th>
                                <th className="py-5 px-6">Name</th>
                                <th className="py-5 px-6">Contact</th>
                                <th className="py-5 px-6">Start Time</th>
                                <th className="py-5 px-6 text-center">Status</th>
                                <th className="py-5 px-6 text-center">Generate</th>
                                <th className="py-5 px-6 text-center">Send Email</th>
                                <th className="py-5 px-6 text-center">Edit</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-50'}`}>
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="9" className="py-8 px-6">
                                            <div className={`h-4 rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />
                                        </td>
                                    </tr>
                                ))
                            ) : filteredAllotments.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="py-20 text-center">
                                        <div className="opacity-20 flex flex-col items-center gap-3">
                                            <Search size={48} />
                                            <p className="text-sm font-black uppercase tracking-[0.2em]">No Centres Found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredAllotments.map((allotment) => (
                                <tr key={allotment.id} className={`group relative transition-all hover:z-50 ${isDarkMode ? 'hover:bg-white/2' : 'hover:bg-blue-50/30'} ${selectedAllotmentIds.includes(allotment.id) ? (isDarkMode ? 'bg-blue-500/5' : 'bg-blue-50/50') : ''}`}>
                                    <td className="py-5 px-6 text-center">
                                        <button onClick={() => toggleSelect(allotment.id)} className="p-1 hover:bg-white/10 rounded transition-all">
                                            {selectedAllotmentIds.includes(allotment.id)
                                                ? <CheckSquare size={16} className="text-blue-500" />
                                                : <Square size={16} className="opacity-30 group-hover:opacity-60" />}
                                        </button>
                                    </td>
                                    <td className="py-5 px-6">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black uppercase tracking-tight">{allotment.centre_details?.name}</span>
                                            <span className="text-[9px] font-bold opacity-40">Code: {allotment.centre_details?.code}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6">
                                        <div className="flex flex-col gap-1.5">
                                            {allotment.centre_details?.email && (
                                                <div className="flex items-center gap-2 text-[10px] font-bold opacity-70">
                                                    <Mail size={11} className="text-blue-500 shrink-0" />
                                                    <span className="truncate max-w-[180px]">{allotment.centre_details.email}</span>
                                                </div>
                                            )}
                                            {allotment.centre_details?.phone_number && (
                                                <div className="flex items-center gap-2 text-[10px] font-bold opacity-70">
                                                    <Smartphone size={11} className="text-emerald-500 shrink-0" />
                                                    <span>{allotment.centre_details.phone_number}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-5 px-6 text-[10px] font-bold font-mono text-slate-500">
                                        <div className="flex flex-col">
                                            <span>S: {formatDate(allotment.start_time)}</span>
                                            <span>E: {formatDate(allotment.end_time)}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6 text-center">
                                        <button
                                            onClick={() => handleStatusToggle(allotment)}
                                            className={`relative w-10 h-5 rounded-full p-1 transition-all duration-300 ${allotment.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                        >
                                            <div className={`w-3 h-3 bg-white rounded-full transition-all duration-300 shadow-sm ${allotment.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                    </td>
                                    <td className="py-5 px-6 text-center">
                                        {allotment.access_code ? (
                                            <div className="flex items-center gap-2 justify-center">
                                                <div className="relative group/history inline-block">
                                                    <span className="px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-[5px] text-xs font-bold font-mono tracking-widest border border-blue-500/20 cursor-pointer">
                                                        {allotment.access_code}
                                                    </span>
                                                    {/* History Tooltip */}
                                                    {allotment.code_history?.length > 0 && (
                                                        <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 rounded-[5px] shadow-2xl overflow-hidden border transition-all z-99999 pointer-events-none group-hover/history:pointer-events-auto opacity-0 invisible group-hover/history:opacity-100 group-hover/history:visible ${isDarkMode ? 'bg-[#0B0F17] border-white/10' : 'bg-white border-slate-200'}`}>
                                                            {/* Tooltip Header */}
                                                            <div className={`p-3 border-b flex items-center justify-between ${isDarkMode ? 'bg-orange-500/10 border-white/5' : 'bg-orange-50 border-orange-100'}`}>
                                                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>History</span>
                                                                <span className={`text-[9px] font-bold ${isDarkMode ? 'opacity-40 text-orange-200' : 'opacity-60 text-orange-400'}`}>{allotment.code_history.length} Codes</span>
                                                            </div>
                                                            {/* Tooltip Body */}
                                                            <div className="max-h-[140px] overflow-y-auto custom-scrollbar p-1">
                                                                {allotment.code_history.slice().reverse().map((h, i) => (
                                                                    <div key={i} className={`flex justify-between items-center p-2 mb-1 rounded-[5px] text-xs font-mono transition-colors last:mb-0 ${isDarkMode ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-50 text-slate-600'}`}>
                                                                        <span className="font-bold line-through decoration-red-500/40 opacity-70">{h.code}</span>
                                                                        <span className="text-[9px] opacity-40 font-sans font-bold uppercase tracking-wider whitespace-nowrap">
                                                                            {new Date(h.generated_at).toLocaleString(undefined, {
                                                                                month: 'short',
                                                                                day: 'numeric',
                                                                                hour: '2-digit',
                                                                                minute: '2-digit',
                                                                                hour12: false
                                                                            })}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            {/* Arrow (Pointing Up) */}
                                                            <div className={`absolute top-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 border-t border-l ${isDarkMode ? 'bg-[#0B0F17] border-white/10' : 'bg-white border-slate-200'}`}></div>
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Removed Manual Button */}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    const isOver = allotment.end_time && new Date(allotment.end_time) < new Date();
                                                    if (isOver) handleGenerateResult();
                                                    else handleGenerateCode(allotment.id);
                                                }}
                                                className={`px-4 py-2 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2 mx-auto
                                                    ${(allotment.end_time && new Date(allotment.end_time) < new Date()) ? 'bg-green-500 hover:bg-green-600 shadow-green-500/20' : 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20'}
                                                `}
                                            >
                                                {(allotment.end_time && new Date(allotment.end_time) < new Date()) ? <FileText size={12} /> : <Wand2 size={12} />}
                                                {(allotment.end_time && new Date(allotment.end_time) < new Date()) ? 'Result' : 'Generate'}
                                            </button>
                                        )}
                                    </td>
                                    <td className="py-5 px-6 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <button
                                                disabled={isActionLoading || allotment.is_code_sent || !allotment.access_code || !allotment.is_active || !allotment.start_time || !allotment.end_time}
                                                onClick={() => handleSendEmail(allotment.id)}
                                                className={`px-4 py-2 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 mx-auto ${(!isActionLoading && !allotment.is_code_sent && allotment.access_code && allotment.is_active && allotment.start_time && allotment.end_time) ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                                            >
                                                {isActionLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} {allotment.was_sent ? 'Resend' : 'Send'}
                                            </button>
                                            {allotment.is_code_sent && (
                                                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter flex items-center gap-1 animate-in fade-in slide-in-from-bottom-1 duration-500">
                                                    <Check size={10} strokeWidth={4} /> Sent to Centre
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-5 px-6 text-center">
                                        <button
                                            onClick={() => handleEditClick(allotment)}
                                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2 mx-auto"
                                        >
                                            <Edit2 size={12} /> Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {/* Spacer to prevent clipping on tooltips when the table has few rows or is scrolls */}
                            {allotments.length > 0 && <tr><td colSpan="8" className="h-40 border-0"></td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Schedule Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in" onClick={() => !isActionLoading && setIsEditModalOpen(false)} />
                    <div className={`relative w-full max-w-sm rounded-[5px] shadow-2xl border overflow-hidden animate-scale-up duration-300 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                        <div className="bg-blue-600 p-6 flex justify-between items-center">
                            <h3 className="text-white text-lg font-black uppercase tracking-tighter">Edit Schedule</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-white/80 hover:text-white transition-all">
                                <X size={24} strokeWidth={3} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateAllotment} className="p-8 space-y-6">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 flex items-center gap-2">
                                        <Calendar size={12} className="text-blue-500" /> Start Date & Time
                                    </label>
                                    <input
                                        required
                                        type="datetime-local"
                                        className={`w-full p-4 rounded-[5px] border text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 focus:border-blue-500 text-white' : 'bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white'}`}
                                        value={editForm.start_time}
                                        onChange={e => setEditForm({ ...editForm, start_time: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 flex items-center gap-2">
                                        <Clock size={12} className="text-blue-500" /> End Date & Time
                                    </label>
                                    <input
                                        required
                                        type="datetime-local"
                                        className={`w-full p-4 rounded-[5px] border text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 focus:border-blue-500 text-white' : 'bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white'}`}
                                        value={editForm.end_time}
                                        onChange={e => setEditForm({ ...editForm, end_time: e.target.value })}
                                    />
                                </div>
                            </div>
                            <button
                                disabled={isActionLoading}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[5px] font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-emerald-900/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                            >
                                {isActionLoading && <Loader2 size={16} className="animate-spin" />} Save Changes
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Edit Modal */}
            {isBulkEditModalOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in" onClick={() => !isActionLoading && setIsBulkEditModalOpen(false)} />
                    <div className={`relative w-full max-w-sm rounded-[5px] shadow-2xl border overflow-hidden animate-scale-up duration-300 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                        <div className="bg-orange-600 p-6 flex justify-between items-center text-white">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tighter">Bulk Edit Schedule</h3>
                                <p className="text-[10px] font-bold opacity-60 uppercase">{selectedAllotmentIds.length} Centres Selected</p>
                            </div>
                            <button onClick={() => setIsBulkEditModalOpen(false)} className="text-white/80 hover:text-white transition-all">
                                <X size={24} strokeWidth={3} />
                            </button>
                        </div>
                        <form onSubmit={handleBulkUpdate} className="p-8 space-y-6">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 flex items-center gap-2">
                                        <Calendar size={12} className="text-orange-500" /> New Start Date & Time
                                    </label>
                                    <input
                                        required
                                        type="datetime-local"
                                        className={`w-full p-4 rounded-[5px] border text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 focus:border-orange-500 text-white' : 'bg-slate-50 border-slate-200 focus:border-orange-500 focus:bg-white'}`}
                                        value={bulkEditForm.start_time}
                                        onChange={e => setBulkEditForm({ ...bulkEditForm, start_time: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 flex items-center gap-2">
                                        <Clock size={12} className="text-orange-500" /> New End Date & Time
                                    </label>
                                    <input
                                        required
                                        type="datetime-local"
                                        className={`w-full p-4 rounded-[5px] border text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 focus:border-orange-500 text-white' : 'bg-slate-50 border-slate-200 focus:border-orange-500 focus:bg-white'}`}
                                        value={bulkEditForm.end_time}
                                        onChange={e => setBulkEditForm({ ...bulkEditForm, end_time: e.target.value })}
                                    />
                                </div>

                                {/* Generate & Send Option */}
                                <div 
                                    onClick={() => setShouldSendBulk(!shouldSendBulk)}
                                    className={`p-4 rounded-[5px] border-2 border-dashed cursor-pointer transition-all flex items-center justify-between group ${shouldSendBulk ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${shouldSendBulk ? 'bg-emerald-500 border-emerald-500 scale-110' : 'border-white/20'}`}>
                                            {shouldSendBulk && <Check size={12} className="text-white" strokeWidth={4} />}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${shouldSendBulk ? 'text-emerald-500' : 'opacity-40'}`}>Generate & Send</span>
                                            <span className="text-[8px] font-bold opacity-30 uppercase">Codes will be sent after update</span>
                                        </div>
                                    </div>
                                    <Send size={14} className={shouldSendBulk ? 'text-emerald-500' : 'opacity-20'} />
                                </div>
                            </div>
                            <button
                                disabled={isActionLoading}
                                className="w-full py-4 bg-[#2D6A4F] hover:bg-[#1B4332] text-white rounded-[5px] font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-emerald-900/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                            >
                                {isActionLoading && <Loader2 size={16} className="animate-spin" />} Apply to {selectedAllotmentIds.length} Centres
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Excel / CSV Import Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in" onClick={() => !isImportLoading && setIsImportModalOpen(false)} />
                    <div className={`relative w-full max-w-2xl rounded-[10px] shadow-2xl border overflow-hidden animate-scale-up duration-300 flex flex-col max-h-[85vh] ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                        {/* Modal Header */}
                        <div className="bg-emerald-600 p-6 flex justify-between items-center text-white shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-white/20 rounded-[5px]">
                                    <FileSpreadsheet size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight">Import Centre Exam Time & Magic Code</h3>
                                    <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Test: {test.name}</p>
                                </div>
                            </div>
                            <button onClick={() => !isImportLoading && setIsImportModalOpen(false)} className="text-white/80 hover:text-white transition-all">
                                <X size={24} strokeWidth={3} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                            {/* Download Template Banner */}
                            <div className={`p-4 rounded-[5px] border flex items-center justify-between gap-4 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-emerald-50/70 border-emerald-200'}`}>
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Need the standard Excel format?</h4>
                                    <p className="text-[11px] font-medium opacity-60 mt-0.5">Download a pre-filled template with all centres for this test.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shrink-0 transition-all active:scale-95 shadow-sm"
                                >
                                    <Download size={13} /> Download Template
                                </button>
                            </div>

                            {/* File Upload Drop Zone */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-[10px] p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${importFile ? (isDarkMode ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-emerald-500 bg-emerald-50/50') : (isDarkMode ? 'border-white/10 hover:border-white/30 bg-white/2' : 'border-slate-200 hover:border-slate-300 bg-slate-50')}`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${importFile ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-200/50 dark:bg-white/10 text-slate-400'}`}>
                                    <Upload size={24} />
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wider">
                                        {importFile ? importFile.name : 'Click to Upload Excel (.xlsx, .xls) or CSV'}
                                    </p>
                                    <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-1">
                                        {importFile ? `${(importFile.size / 1024).toFixed(1)} KB` : 'Supports Centre Code, Start Time, End Time, and Magic Code'}
                                    </p>
                                </div>
                            </div>

                            {/* Validation Errors */}
                            {importValidationErrors.length > 0 && (
                                <div className="p-4 rounded-[5px] bg-red-500/10 border border-red-500/30 text-red-500 space-y-1">
                                    {importValidationErrors.map((err, i) => (
                                        <div key={i} className="text-xs font-bold flex items-center gap-2">
                                            <AlertCircle size={14} className="shrink-0" />
                                            <span>{err}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Options */}
                            <div className="flex items-center justify-between p-4 rounded-[5px] border border-dashed border-white/10 dark:bg-white/5 bg-slate-50">
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={autoGenerateCodes}
                                        onChange={(e) => setAutoGenerateCodes(e.target.checked)}
                                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black uppercase tracking-wider">Auto-generate Magic Codes</span>
                                        <span className="text-[10px] font-medium opacity-50">Automatically create 6-digit access codes if empty in Excel</span>
                                    </div>
                                </label>
                            </div>

                            {/* Preview Table */}
                            {importPreviewRows.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-black uppercase tracking-widest opacity-60">
                                            Preview ({importPreviewRows.length} Centres detected)
                                        </h4>
                                        <span className="text-[10px] font-bold text-emerald-500 uppercase">
                                            {importPreviewRows.filter(r => r.matched).length} Matched / {importPreviewRows.filter(r => !r.matched).length} New
                                        </span>
                                    </div>
                                    <div className={`rounded-[5px] border overflow-hidden max-h-56 overflow-y-auto ${isDarkMode ? 'border-white/10 bg-[#10141D]' : 'border-slate-200 bg-slate-50'}`}>
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className={`text-[9px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-white/5 text-slate-400 border-white/5' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                    <th className="py-2.5 px-3">#</th>
                                                    <th className="py-2.5 px-3">Centre</th>
                                                    <th className="py-2.5 px-3">Start Time</th>
                                                    <th className="py-2.5 px-3">End Time</th>
                                                    <th className="py-2.5 px-3 text-center">Magic Code</th>
                                                    <th className="py-2.5 px-3 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className={`divide-y text-[11px] font-medium ${isDarkMode ? 'divide-white/5' : 'divide-slate-200'}`}>
                                                {importPreviewRows.map((row) => (
                                                    <tr key={row.id} className={row.matched ? '' : 'bg-amber-500/5'}>
                                                        <td className="py-2 px-3 opacity-40 font-mono text-[10px]">{row.id}</td>
                                                        <td className="py-2 px-3">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold uppercase">{row.centre_display}</span>
                                                                {row.centre_code && <span className="text-[9px] opacity-40 font-mono">Code: {row.centre_code}</span>}
                                                            </div>
                                                        </td>
                                                        <td className="py-2 px-3 font-mono text-[10px] opacity-80">{row.start_time || '---'}</td>
                                                        <td className="py-2 px-3 font-mono text-[10px] opacity-80">{row.end_time || '---'}</td>
                                                        <td className="py-2 px-3 text-center font-mono font-bold text-blue-500">
                                                            {row.magic_code || (autoGenerateCodes ? <span className="text-[9px] text-emerald-500 uppercase font-sans font-bold">Auto</span> : '---')}
                                                        </td>
                                                        <td className="py-2 px-3 text-center">
                                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${row.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                                {row.is_active ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className={`p-6 border-t flex items-center justify-between gap-4 shrink-0 ${isDarkMode ? 'border-white/5 bg-[#141822]' : 'border-slate-100 bg-slate-50'}`}>
                            <button
                                type="button"
                                onClick={() => setIsImportModalOpen(false)}
                                className={`px-5 py-3 rounded-[5px] text-xs font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isImportLoading || importPreviewRows.length === 0}
                                onClick={handleConfirmImport}
                                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[5px] text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/20 flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isImportLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
                                <span>Import & Apply {importPreviewRows.length > 0 ? `(${importPreviewRows.length})` : ''}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {alert.show && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-999 animate-in slide-in-from-top-10 duration-500 w-[90%] max-w-sm">
                    <div className={`flex items-center gap-4 px-6 py-4 rounded-[5px] shadow-2xl border backdrop-blur-md ${alert.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : 'bg-red-500/90 border-red-400 text-white'}`}>
                        <div className="w-10 h-10 rounded-[5px] bg-white/20 flex items-center justify-center">
                            {alert.type === 'success' ? <ShieldCheck size={22} /> : <BellRing size={22} />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-0.5">Notification</p>
                            <p className="text-sm font-bold tracking-tight">{alert.message}</p>
                        </div>
                        <button onClick={() => setAlert(prev => ({ ...prev, show: false }))} className="ml-4 opacity-50 hover:opacity-100 transition-opacity">
                            <X size={18} strokeWidth={3} />
                        </button>
                    </div>
                    <div className="absolute bottom-0 left-4 right-4 h-1 bg-white/30 rounded-full overflow-hidden">
                        <div className="h-full bg-white animate-progress-shrink" style={{ animationDuration: '3000ms' }} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CentreAllotmentDetails;
