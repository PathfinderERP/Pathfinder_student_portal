import React, { useState, useEffect } from 'react';
import { Send, AlertCircle, CheckCircle, Loader2, FileQuestion, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';

const Grievances = ({ isDarkMode }) => {
    const [formData, setFormData] = useState({
        subject: '',
        category: 'Academic',
        description: '',
        priority: 'Medium'
    });

    const { getApiUrl, token } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [success, setSuccess] = useState(false);
    const [grievances, setGrievances] = useState([]);

    const fetchGrievances = async () => {
        setFetchLoading(true);
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/grievances/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setGrievances(response.data);
        } catch (error) {
            console.error('Failed to fetch grievances:', error);
        } finally {
            setFetchLoading(false);
        }
    };

    useEffect(() => {
        fetchGrievances();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const apiUrl = getApiUrl();
            const status = (formData.category === 'Academic' || formData.category === 'Doubt Session') ? 'Unassigned' : 'Pending';

            await axios.post(`${apiUrl}/api/grievances/`, {
                ...formData,
                status: status
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            setSuccess(true);
            setFormData({ subject: '', category: 'Academic', description: '', priority: 'Medium' });
            fetchGrievances();
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error('Failed to submit grievance:', error);
            alert('Failed to submit. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const [deletingId, setDeletingId] = useState(null);
    const [confirmId, setConfirmId] = useState(null);

    const handleDelete = async (id) => {
        if (confirmId !== id) {
            // First click — ask for confirmation
            setConfirmId(id);
            setTimeout(() => setConfirmId(null), 3000); // auto-cancel after 3s
            return;
        }
        // Second click — confirmed, do delete
        setDeletingId(id);
        setConfirmId(null);
        try {
            const apiUrl = getApiUrl();
            await axios.delete(`${apiUrl}/api/grievances/${id}/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setGrievances(prev => prev.filter(g => g.id !== id));
        } catch (error) {
            console.error('Failed to delete grievance:', error);
            alert('Could not delete. Please try again.');
        } finally {
            setDeletingId(null);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Resolved': return 'bg-emerald-500/10 text-emerald-500';
            case 'In Progress': return 'bg-orange-500/10 text-orange-500';
            case 'Unassigned': return 'bg-purple-500/10 text-purple-500';
            case 'Assign': return 'bg-blue-500/10 text-blue-500';
            case 'Rejected': return 'bg-red-500/10 text-red-500';
            default: return 'bg-slate-500/10 text-slate-500';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'High': return 'bg-red-500/10 text-red-500';
            case 'Medium': return 'bg-orange-500/10 text-orange-500';
            default: return 'bg-blue-500/10 text-blue-500';
        }
    };

    return (
        <div className="space-y-6 sm:space-y-8 animate-fade-in-up pb-10">

            {/* Hero Banner */}
            <div className={`p-5 sm:p-8 rounded-[5px] border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-[5px] bg-orange-500/10 text-orange-500 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">
                            Student Support
                        </div>
                    </div>
                    <h2 className={`text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Help &amp; Support
                    </h2>
                    <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Submit concerns, request doubt sessions, or report facility issues for quick resolution.
                    </p>
                </div>
                <AlertCircle size={120} className="absolute -right-6 -bottom-6 opacity-[0.03] rotate-12 hidden sm:block" />
            </div>

            {/* Submit New Grievance Form */}
            <div className={`p-5 sm:p-6 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h3 className={`text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 mb-5 sm:mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    <Send size={14} className="text-orange-500" /> Submit New Grievance
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>Subject</label>
                            <input
                                type="text"
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none transition-all
                                    ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-white/20' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                placeholder="Enter subject"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none transition-all
                                    ${isDarkMode ? 'bg-[#0d1119] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                                <option>Academic</option>
                                <option>Doubt Session</option>
                                <option>Facility</option>
                                <option>Library</option>
                                <option>Transport</option>
                                <option>Other</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>Priority</label>
                        <select
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                            className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none transition-all
                                ${isDarkMode ? 'bg-[#0d1119] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                            <option>Low</option>
                            <option>Medium</option>
                            <option>High</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={4}
                            className={`w-full p-3 rounded-[5px] border font-bold text-sm outline-none transition-all resize-none
                                ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-white/20' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            placeholder="Describe your concern in detail..."
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-[5px] font-black uppercase tracking-widest text-xs transition-all active:scale-95 flex items-center justify-center gap-2">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        {loading ? 'Submitting...' : 'Submit Grievance'}
                    </button>

                    {success && (
                        <div className="p-3 sm:p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-[5px] flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
                            <CheckCircle size={16} /> Submitted Successfully
                        </div>
                    )}
                </form>
            </div>

            {/* Previous Grievances List */}
            <div className={`p-5 sm:p-6 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h3 className={`text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 mb-5 sm:mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    <AlertCircle size={14} className="text-orange-500" /> Your Grievances
                </h3>

                {fetchLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3 opacity-40">
                        <Loader2 size={32} className="animate-spin text-orange-500" />
                        <p className="text-xs font-black uppercase tracking-widest">Loading...</p>
                    </div>
                ) : grievances.length === 0 ? (
                    <div className={`py-14 text-center rounded-[5px] border-2 border-dashed ${isDarkMode ? 'border-white/5 bg-white/[0.01]' : 'border-slate-100 bg-slate-50'}`}>
                        <div className="flex flex-col items-center gap-3 opacity-30">
                            <FileQuestion size={48} />
                            <div className="space-y-1">
                                <p className="font-black uppercase tracking-[0.2em] text-sm">No Grievances Found</p>
                                <p className="text-xs font-bold">When you submit a grievance, it will appear here.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {grievances.map((item) => (
                            <div key={item.id} className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`font-black text-sm mb-1 truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            {item.subject}
                                        </h4>
                                        <p className={`text-xs font-bold ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>
                                            {item.category} &bull; {new Date(item.date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                                        <span className={`px-2.5 py-1 rounded-[5px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${getPriorityColor(item.priority)}`}>
                                            {item.priority || '—'}
                                        </span>
                                        <span className={`px-2.5 py-1 rounded-[5px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${getStatusColor(item.status)}`}>
                                            {item.status || '—'}
                                        </span>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            disabled={deletingId === item.id}
                                            title={confirmId === item.id ? 'Click again to confirm' : 'Delete'}
                                            className={`flex items-center gap-1 px-2.5 py-1 rounded-[5px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all active:scale-95
                                                ${confirmId === item.id
                                                    ? 'bg-red-500 text-white animate-pulse'
                                                    : 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'
                                                } disabled:opacity-40`}>
                                            {deletingId === item.id
                                                ? <Loader2 size={10} className="animate-spin" />
                                                : <Trash2 size={10} />}
                                            {confirmId === item.id ? 'Sure?' : ''}
                                        </button>
                                    </div>
                                </div>
                                {item.description && (
                                    <p className={`text-xs font-medium mt-2 line-clamp-2 ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
                                        {item.description}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Grievances;
