import React, { useState } from 'react';
import { Send, AlertCircle } from 'lucide-react';

const Grievances = ({ isDarkMode }) => {
    const [formData, setFormData] = useState({
        subject: '',
        category: 'Academic',
        description: '',
        priority: 'Medium'
    });

    const [grievances, setGrievances] = useState([
        { id: 1, subject: 'Lab Equipment Issue', category: 'Facility', status: 'Resolved', date: '2026-01-05', priority: 'High' },
        { id: 2, subject: 'Doubt Session Request', category: 'Academic', status: 'In Progress', date: '2026-01-08', priority: 'Medium' },
        { id: 3, subject: 'Library Book Availability', category: 'Library', status: 'Pending', date: '2026-01-10', priority: 'Low' },
    ]);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Add API call here
        console.log('Submitting grievance:', formData);
        // Reset form
        setFormData({ subject: '', category: 'Academic', description: '', priority: 'Medium' });
    };

    return (
        <div className="space-y-6">
            {/* Submit New Grievance */}
            <div className={`p-6 rounded-[2rem] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-50 flex items-center gap-2 mb-6">
                    <Send size={14} className="text-orange-500" /> Submit New Grievance
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Subject</label>
                            <input
                                type="text"
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                className={`w-full p-3 rounded-xl border font-bold text-sm outline-none transition-all
                                    ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                placeholder="Enter subject"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className={`w-full p-3 rounded-xl border font-bold text-sm outline-none transition-all
                                    ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                                <option>Academic</option>
                                <option>Facility</option>
                                <option>Library</option>
                                <option>Transport</option>
                                <option>Other</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Priority</label>
                        <select
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                            className={`w-full p-3 rounded-xl border font-bold text-sm outline-none transition-all
                                ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                            <option>Low</option>
                            <option>Medium</option>
                            <option>High</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={4}
                            className={`w-full p-3 rounded-xl border font-bold text-sm outline-none transition-all resize-none
                                ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            placeholder="Describe your concern in detail..."
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 flex items-center justify-center gap-2">
                        <Send size={16} />
                        Submit Grievance
                    </button>
                </form>
            </div>

            {/* Previous Grievances */}
            <div className={`p-6 rounded-[2rem] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-50 flex items-center gap-2 mb-6">
                    <AlertCircle size={14} className="text-blue-500" /> Your Grievances
                </h3>
                <div className="space-y-4">
                    {grievances.map((item) => (
                        <div key={item.id} className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <h4 className={`font-black text-sm mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        {item.subject}
                                    </h4>
                                    <p className="text-xs font-bold opacity-50">{item.category} • {item.date}</p>
                                </div>
                                <div className="flex gap-2">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest
                                        ${item.priority === 'High' ? 'bg-red-500/10 text-red-500' :
                                            item.priority === 'Medium' ? 'bg-orange-500/10 text-orange-500' :
                                                'bg-blue-500/10 text-blue-500'}`}>
                                        {item.priority}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest
                                        ${item.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-500' :
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
