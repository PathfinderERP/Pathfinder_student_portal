import React, { useState, useEffect } from 'react';
import { Send, AlertCircle, CheckCircle } from 'lucide-react';
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
    const [success, setSuccess] = useState(false);

    const [grievances, setGrievances] = useState([]);

    const fetchGrievances = async () => {
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/grievances/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setGrievances(response.data);
        } catch (error) {
            console.error('Failed to fetch grievances:', error);
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
            // If category is academic or doubt, it's unassigned for management
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

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            {/* Grievances Hero */}
            <div className={`p-8 rounded-[5px] border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="px-3 py-1 rounded-[5px] bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase tracking-[0.2em]">
                            Student Support
                        </div>
                    </div>
                    <h2 className={`text-3xl font-black uppercase tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Help & Support
                    </h2>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Submit concerns, request doubt sessions, or report facility issues for quick resolution.
                    </p>
                </div>
                <AlertCircle size={200} className="absolute -right-10 -bottom-10 opacity-[0.03] rotate-12" />
            </div>

            {/* Submit New Grievance */}
            <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h3 className={`text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
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
                                    ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
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
                                    ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
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
                                ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
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
                                ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            placeholder="Describe your concern in detail..."
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-[5px] font-black uppercase tracking-widest text-xs transition-all active:scale-95 flex items-center justify-center gap-2">
                        <Send size={16} />
                        {loading ? 'Submitting...' : 'Submit Grievance'}
                    </button>
                    {success && (
                        <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-[5px] flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
                            <CheckCircle size={16} /> Submitted Successfully
                        </div>
                    )}
                </form>
            </div>

            {/* Previous Grievances */}
            <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h3 className={`text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    <AlertCircle size={14} className="text-orange-500" /> Your Grievances
                </h3>
                <div className="space-y-4">
                    {grievances.map((item) => (
                        <div key={item.id} className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <h4 className={`font-black text-sm mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        {item.subject}
                                    </h4>
                                    <p className={`text-xs font-bold ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>
                                        {item.category} • {new Date(item.date).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <span className={`px-3 py-1 rounded-[5px] text-[10px] font-black uppercase tracking-widest
                                        ${item.priority === 'High' ? 'bg-red-500/10 text-red-500' :
                                            item.priority === 'Medium' ? 'bg-orange-500/10 text-orange-500' :
                                                'bg-blue-500/10 text-blue-500'}`}>
                                        {item.priority}
                                    </span>
                                    <span className={`px-3 py-1 rounded-[5px] text-[10px] font-black uppercase tracking-widest
                                        ${item.status === 'Resolved' ? 'bg-indigo-500/10 text-indigo-500' :
                                            item.status === 'In Progress' ? 'bg-orange-500/10 text-orange-500' :
                                                'bg-slate-500/10 text-slate-500'}`}>
                                        {item.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Grievances;
