import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    ArrowLeft, Search, RefreshCw, Smartphone, Calendar, Clock,
    Edit2, Send, Wand2, Loader2, X, ShieldCheck, BellRing, Mail, CheckSquare, Square, Trash2, Check, FileText
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
    const [bulkEditForm, setBulkEditForm] = useState({
        start_time: '',
        end_time: ''
    });

    // Custom Alert State
    const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

    const triggerAlert = (message, type = 'success') => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
    };

    const fetchAllotments = useCallback(async () => {
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/tests/${test.id}/centres/`, getAuthConfig());
            setAllotments(response.data);
        } catch (err) {
            console.error('Error fetching allotments:', err);
            triggerAlert('Failed to load allotments', 'error');
        } finally {
            setIsLoading(false);
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
            const updates = selectedAllotmentIds.map(id =>
                axios.patch(`${apiUrl}/api/tests/allotments/${id}/`, { ...bulkEditForm, is_code_sent: false }, getAuthConfig())
            );
            await Promise.all(updates);
            fetchAllotments();
            setIsBulkEditModalOpen(false);
            setSelectedAllotmentIds([]);
            triggerAlert(`${selectedAllotmentIds.length} Centres updated successfully!`, 'success');
        } catch (err) {
            triggerAlert('Failed to update centres', 'error');
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
                    <button
                        onClick={fetchAllotments}
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

            {/* Alert Notifications */}
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
