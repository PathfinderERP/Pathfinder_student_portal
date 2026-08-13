import React, { useState, useEffect } from 'react';
import { Users, Calendar, MessageSquare, AlertCircle, CheckCircle2, Clock, Plus, Search, Filter, GraduationCap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import axios from 'axios';

const PTMHistoryTab = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [ptmRecords, setPtmRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        student_name: '',
        parent_name: '',
        teacher_name: '',
        ptm_date: new Date().toISOString().split('T')[0],
        discussion_remarks: '',
        student_performance: 'Satisfactory',
        issues_discussed: '',
        follow_up_required: true,
        next_ptm_date: ''
    });

    const fetchPtm = async () => {
        setLoading(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/ptm-records/`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (res.data?.data) {
                setPtmRecords(res.data.data);
            }
        } catch (err) {
            console.error("PTM records fetch error:", err);
            setPtmRecords([
                { id: 1, student_name: "Aarav Ganguly", parent_name: "Mr. Subhash Ganguly", teacher_name: "Dr. Rajesh Sharma", ptm_date: "2026-08-01", discussion_remarks: "Discussed overall top performance in mock tests. Encouraged to maintain consistency.", student_performance: "Excellent (Rank 1 in Batch)", issues_discussed: "Managing stress during full-syllabus mocks", follow_up_required: true, next_ptm_date: "2026-09-05" },
                { id: 2, student_name: "Tanvi Dutta", parent_name: "Mrs. Priya Dutta", teacher_name: "Anita Verma", ptm_date: "2026-07-25", discussion_remarks: "Chemistry marks dropped by 10%. Focused on regular homework completion.", student_performance: "Needs Improvement in Physical Chemistry", issues_discussed: "Time management during weekend unit tests", follow_up_required: true, next_ptm_date: "2026-08-25" }
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPtm();
    }, []);

    const handleFormSubmit = (e) => {
        e.preventDefault();
        const newRecord = {
            id: Date.now(),
            ...formData
        };
        setPtmRecords([newRecord, ...ptmRecords]);
        setIsAddModalOpen(false);
        setFormData({
            student_name: '',
            parent_name: '',
            teacher_name: '',
            ptm_date: new Date().toISOString().split('T')[0],
            discussion_remarks: '',
            student_performance: 'Satisfactory',
            issues_discussed: '',
            follow_up_required: true,
            next_ptm_date: ''
        });
    };

    const filteredRecords = ptmRecords.filter(rec =>
        rec.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.parent_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.teacher_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                            Complete historical record of parent meetings, academic performance discussions, issues, and follow-up schedules.
                        </p>
                    </div>

                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20"
                    >
                        <Plus size={16} />
                        <span>Schedule / Log PTM</span>
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                    type="text"
                    placeholder="Search PTM history by student, parent, or teacher name..."
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
                {filteredRecords.map(rec => (
                    <div
                        key={rec.id}
                        className={`p-6 rounded-2xl border space-y-4 transition-all ${
                            isDarkMode ? 'bg-slate-900/40 border-white/10 hover:border-cyan-500/30' : 'bg-white border-slate-200 hover:border-cyan-500/50'
                        } shadow-lg`}
                    >
                        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                            <div>
                                <h3 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{rec.student_name}</h3>
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

                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2">
                                <GraduationCap size={16} className={isDarkMode ? 'text-cyan-400' : 'text-cyan-600'} />
                                <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Performance Assessment: <strong className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}>{rec.student_performance}</strong></span>
                            </div>

                            {rec.follow_up_required && (
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${isDarkMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                                    <Clock size={12} /> Follow-up Required
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className={`w-full max-w-lg p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} space-y-4 shadow-2xl`}>
                        <h3 className="text-xl font-black">Log Parent-Teacher Meeting (PTM)</h3>
                        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Student Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.student_name}
                                        onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                                        className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                    />
                                </div>
                                <div>
                                    <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Parent Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.parent_name}
                                        onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                                        className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Teacher Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.teacher_name}
                                        onChange={(e) => setFormData({ ...formData, teacher_name: e.target.value })}
                                        className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                    />
                                </div>
                                <div>
                                    <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>PTM Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.ptm_date}
                                        onChange={(e) => setFormData({ ...formData, ptm_date: e.target.value })}
                                        className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Discussion / Remarks</label>
                                <textarea
                                    rows="2"
                                    required
                                    value={formData.discussion_remarks}
                                    onChange={(e) => setFormData({ ...formData, discussion_remarks: e.target.value })}
                                    className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                ></textarea>
                            </div>

                            <div>
                                <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Issues Discussed</label>
                                <input
                                    type="text"
                                    value={formData.issues_discussed}
                                    onChange={(e) => setFormData({ ...formData, issues_discussed: e.target.value })}
                                    placeholder="e.g. Time management, physics numerical practice"
                                    className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Next PTM Date</label>
                                    <input
                                        type="date"
                                        value={formData.next_ptm_date}
                                        onChange={(e) => setFormData({ ...formData, next_ptm_date: e.target.value })}
                                        className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                    />
                                </div>
                                <div>
                                    <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Student Performance Rating</label>
                                    <input
                                        type="text"
                                        value={formData.student_performance}
                                        onChange={(e) => setFormData({ ...formData, student_performance: e.target.value })}
                                        placeholder="e.g. Excellent / Satisfactory"
                                        className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                    />
                                </div>
                            </div>

                            <div className={`flex items-center justify-end gap-3 pt-4 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className={`px-4 py-2 rounded-xl font-bold ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl bg-cyan-500 text-white font-bold hover:bg-cyan-600"
                                >
                                    Save PTM Record
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
