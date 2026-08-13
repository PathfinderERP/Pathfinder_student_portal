import React, { useState, useEffect } from 'react';
import { UserCheck, Calendar, ArrowRightLeft, FileText, CheckCircle, Clock, Plus, Search, Filter, MessageSquare, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import axios from 'axios';

const MentorshipConversionTab = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [mentorshipData, setMentorshipData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        student_name: '',
        roll_no: '',
        assigned_mentor: '',
        mentorship_date: new Date().toISOString().split('T')[0],
        remarks: '',
        follow_up_date: '',
        conversion_type: 'Admission Lead',
        conversion_status: 'In Progress',
        lead_stage: 'Interested'
    });

    const fetchMentorship = async () => {
        setLoading(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/mentorship-conversion/`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (res.data?.data) {
                setMentorshipData(res.data.data);
            }
        } catch (err) {
            console.error("Mentorship conversion fetch error:", err);
            setMentorshipData([
                { id: 1, student_name: "Rahul Karmakar", roll_no: "PF-2026-0412", assigned_mentor: "Dr. Rajesh Sharma", mentorship_date: "2026-08-10", remarks: "Reviewed Physics mechanics concepts. Student needs additional practice in Rotational Dynamics.", follow_up_date: "2026-08-20", conversion_type: "Course Extension", conversion_status: "Converted", lead_stage: "Enrolled - Crash Course + Test Series" },
                { id: 2, student_name: "Sneha Mukherjee", roll_no: "PF-2026-0520", assigned_mentor: "Anita Verma", mentorship_date: "2026-08-12", remarks: "Organic Chemistry revision guidance provided. Target score set to 160+.", follow_up_date: "2026-08-22", conversion_type: "Admission Lead", conversion_status: "In Progress", lead_stage: "Interested in 2-Year Integrated Program" },
                { id: 3, student_name: "Aman Sen", roll_no: "PF-2026-0610", assigned_mentor: "Siddharth Roy", mentorship_date: "2026-08-05", remarks: "Calculus problem-solving speed discussion. Weekly goal set.", follow_up_date: "2026-08-15", conversion_type: "Upgrade", conversion_status: "Pending", lead_stage: "Offered Super 30 Special Batch Upgrade" }
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMentorship();
    }, []);

    const handleFormSubmit = (e) => {
        e.preventDefault();
        const newRecord = {
            id: Date.now(),
            ...formData
        };
        setMentorshipData([newRecord, ...mentorshipData]);
        setIsAddModalOpen(false);
        setFormData({
            student_name: '',
            roll_no: '',
            assigned_mentor: '',
            mentorship_date: new Date().toISOString().split('T')[0],
            remarks: '',
            follow_up_date: '',
            conversion_type: 'Admission Lead',
            conversion_status: 'In Progress',
            lead_stage: 'Interested'
        });
    };

    const filteredRecords = mentorshipData.filter(rec =>
        rec.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.assigned_mentor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.roll_no.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-xl backdrop-blur-xl transition-all`}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <ArrowRightLeft className="text-cyan-500" size={24} />
                            <h2 className="text-2xl font-black tracking-tight">Mentorship & Conversion Tracking</h2>
                        </div>
                        <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Student mentorship logs, assigned mentors, follow-up scheduling, and admission/course conversion pipeline.
                        </p>
                    </div>

                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20"
                    >
                        <Plus size={16} />
                        <span>Log Mentorship Session</span>
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Active Mentorship Sessions</span>
                    <div className="flex items-center justify-between">
                        <span className={`text-2xl font-black ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{mentorshipData.length}</span>
                        <MessageSquare className={isDarkMode ? 'text-cyan-400/80' : 'text-cyan-600/80'} size={24} />
                    </div>
                </div>

                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Converted Leads</span>
                    <div className="flex items-center justify-between">
                        <span className={`text-2xl font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            {mentorshipData.filter(m => m.conversion_status === 'Converted').length}
                        </span>
                        <CheckCircle className={isDarkMode ? 'text-emerald-400/80' : 'text-emerald-600/80'} size={24} />
                    </div>
                </div>

                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Follow-up Required</span>
                    <div className="flex items-center justify-between">
                        <span className={`text-2xl font-black ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                            {mentorshipData.filter(m => m.follow_up_date).length}
                        </span>
                        <Clock className={isDarkMode ? 'text-amber-400/80' : 'text-amber-600/80'} size={24} />
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                    type="text"
                    placeholder="Search by student name, roll number, or assigned mentor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-semibold outline-none ${
                        isDarkMode
                            ? 'bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500'
                            : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-cyan-500'
                    }`}
                />
            </div>

            {/* Cards List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredRecords.map(rec => (
                    <div
                        key={rec.id}
                        className={`p-6 rounded-2xl border space-y-4 transition-all ${
                            isDarkMode ? 'bg-slate-900/40 border-white/10 hover:border-cyan-500/30' : 'bg-white border-slate-200 hover:border-cyan-500/50'
                        } shadow-lg`}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{rec.student_name}</h3>
                                <p className={`text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{rec.roll_no}</p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                rec.conversion_status === 'Converted'
                                    ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-100 text-emerald-700 border border-emerald-200')
                                    : rec.conversion_status === 'In Progress'
                                    ? (isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-100 text-cyan-700 border border-cyan-200')
                                    : (isDarkMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-100 text-amber-700 border border-amber-200')
                            }`}>
                                {rec.conversion_status}
                            </span>
                        </div>

                        <div className={`p-3 rounded-xl border space-y-1.5 text-xs ${isDarkMode ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                            <div className={`flex items-center justify-between ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                <span>Assigned Mentor: <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>{rec.assigned_mentor}</strong></span>
                                <span>Date: {rec.mentorship_date}</span>
                            </div>
                            <p className={`italic ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>"{rec.remarks}"</p>
                        </div>

                        <div className={`flex items-center justify-between text-xs pt-2 border-t ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                            <div>
                                <span className={`text-[10px] font-bold uppercase block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Conversion Type</span>
                                <span className={`font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{rec.conversion_type}</span>
                            </div>
                            <div className="text-right">
                                <span className={`text-[10px] font-bold uppercase block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Next Follow-up</span>
                                <span className={`font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>{rec.follow_up_date || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Log Session Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className={`w-full max-w-lg p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} space-y-4 shadow-2xl`}>
                        <h3 className="text-xl font-black">Log Mentorship & Conversion Record</h3>
                        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Roll Number</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.roll_no}
                                        onChange={(e) => setFormData({ ...formData, roll_no: e.target.value })}
                                        className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                    />
                                </div>
                                <div>
                                    <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Assigned Mentor</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.assigned_mentor}
                                        onChange={(e) => setFormData({ ...formData, assigned_mentor: e.target.value })}
                                        className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Mentorship Remarks & Guidance</label>
                                <textarea
                                    rows="3"
                                    required
                                    value={formData.remarks}
                                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                    className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                ></textarea>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Next Follow-up Date</label>
                                    <input
                                        type="date"
                                        value={formData.follow_up_date}
                                        onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                                        className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                    />
                                </div>
                                <div>
                                    <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Conversion Status</label>
                                    <select
                                        value={formData.conversion_status}
                                        onChange={(e) => setFormData({ ...formData, conversion_status: e.target.value })}
                                        className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                    >
                                        <option value="In Progress">In Progress</option>
                                        <option value="Converted">Converted</option>
                                        <option value="Pending">Pending</option>
                                    </select>
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
                                    Save Session
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MentorshipConversionTab;
