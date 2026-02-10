import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Eye, CheckCircle, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, X, User } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const SolveDoubt = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [activeTab, setActiveTab] = useState('Unsolve');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [teachers, setTeachers] = useState([]);

    // Mock Doubts State
    const [doubts, setDoubts] = useState([
        { id: 1, student: 'ABHISHEK BANERJEE', subject: 'Physics', assignDate: '16/9/2024, 6:35:43 pm', status: 'Assign', teacherId: '1', teacherName: 'Rohan Singh', description: 'Doubt about Quantum Mechanics' },
        { id: 2, student: 'ABHISHEK BANERJEE', subject: 'Physics', assignDate: '16/9/2024, 6:41:07 pm', status: 'Assign', teacherId: '1', teacherName: 'Rohan Singh', description: 'Kinematics question' },
        { id: 3, student: 'SNEHA GUPTA', subject: 'Chemistry', assignDate: '22/4/2025, 10:00:00 am', status: 'Solve', teacherId: '2', teacherName: 'Amit Varma', solvedDate: '23/4/2025, 05:30:00 pm', description: 'Organic Chemistry doubt' },
    ]);

    // Custom "Show Doubt" Modal State
    const [isShowDoubtModalOpen, setIsShowDoubtModalOpen] = useState(false);
    const [selectedDoubtForView, setSelectedDoubtForView] = useState(null);

    // Fetch teachers for the dropdown
    useEffect(() => {
        const fetchTeachers = async () => {
            try {
                const apiUrl = getApiUrl();
                const activeToken = token || localStorage.getItem('auth_token');
                if (!activeToken) return;

                const response = await axios.get(`${apiUrl}/api/master-data/teachers/`, {
                    headers: { 'Authorization': `Bearer ${activeToken}` }
                });
                setTeachers(response.data);
                // Set first teacher as default if available
                if (response.data.length > 0 && !selectedTeacherId) {
                    setSelectedTeacherId(String(response.data[0].id));
                }
            } catch (error) {
                console.error("Failed to fetch teachers:", error);
            }
        };
        fetchTeachers();
    }, [getApiUrl, token]);

    const selectedTeacherName = teachers.find(t => String(t.id) === String(selectedTeacherId))?.name || 'Select Teacher';

    const tabs = [
        { id: 'Unsolve', label: 'UNSOLVE DOUBTS' },
        { id: 'Solve', label: 'SOLVE DOUBTS' }
    ];

    const filteredDoubts = doubts.filter(d =>
        (d.status === activeTab) &&
        (String(d.teacherId) === String(selectedTeacherId)) &&
        (d.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.subject.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleSolveClick = (doubtId) => {
        setDoubts(prev => prev.map(d =>
            d.id === doubtId
                ? { ...d, status: 'Solve', solvedDate: new Date().toLocaleString() }
                : d
        ));
    };

    const handleShowDoubtClick = (doubt) => {
        setSelectedDoubtForView(doubt);
        setIsShowDoubtModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsShowDoubtModalOpen(false);
        setSelectedDoubtForView(null);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
            <div className={`p-8 rounded-[5px] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                {/* Header & Teacher Selector */}
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest rounded-[5px] shadow-lg shadow-orange-500/20">
                                    Faculty Portal
                                </span>
                                <h2 className="text-3xl font-black tracking-tight uppercase">
                                    Solve <span className="text-orange-500">Doubts</span>
                                </h2>
                            </div>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                View and resolve assigned student queries.
                            </p>
                        </div>

                        {/* Teacher Selection UI */}
                        <div className="flex items-center gap-4 p-2 rounded-[5px] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                            <div className="relative group min-w-[200px]">
                                <label className="absolute -top-7 left-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Teacher</label>
                                <select
                                    value={selectedTeacherId}
                                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                                    className={`w-full px-4 py-2.5 rounded-[5px] border-2 outline-none font-bold appearance-none transition-all ${isDarkMode
                                        ? 'bg-slate-800 border-white/10 text-white focus:border-orange-500'
                                        : 'bg-white border-slate-200 text-slate-700 focus:border-orange-500'}`}
                                >
                                    <option value="" disabled>Select Teacher</option>
                                    {teachers.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                    {/* Fallback for mock if API fails */}
                                    {teachers.length === 0 && <option value="1">Rohan Singh</option>}
                                </select>
                                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" size={16} />
                            </div>
                            <div className="h-10 w-px bg-slate-200 dark:bg-white/10 mx-2" />
                            <div className="pr-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Teacher Name</p>
                                <p className="text-sm font-black text-orange-500 uppercase tracking-tight">:{selectedTeacherName}</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-white/5 pb-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-3 text-xs font-black uppercase tracking-widest rounded-[5px] transition-all relative
                                    ${activeTab === tab.id
                                        ? (isDarkMode ? 'text-orange-400 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-orange-500' : 'text-orange-600 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-orange-600')
                                        : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Search & Refresh */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="relative group w-full md:w-96">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="Search student or subject..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-14 pr-6 py-3 rounded-[5px] border-2 outline-none font-bold transition-all ${isDarkMode
                                    ? 'bg-white/5 border-white/10 text-white focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5'
                                    : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5'
                                    }`}
                            />
                        </div>
                        <button className={`p-3 rounded-[5px] transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-orange-400 border border-white/10' : 'bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-100'}`}>
                            <RefreshCw size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className={`rounded-[5px] border shadow-2xl overflow-hidden transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-orange-50 text-orange-900/50'}`}>
                                <th className="py-4 px-6 text-center">Doubt No.</th>
                                <th className="py-4 px-6">Student Name</th>
                                <th className="py-4 px-6">Subject</th>
                                <th className="py-4 px-6 text-center">{activeTab === 'Unsolve' ? 'Solve' : 'Solved Date'}</th>
                                <th className="py-4 px-6 text-center">Assign Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredDoubts.length > 0 ? (
                                filteredDoubts.map((doubt) => (
                                    <tr key={doubt.id} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`text-sm font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                {doubt.id}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="font-bold text-sm tracking-tight uppercase">{doubt.student}</span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`px-3 py-1 rounded-[5px] text-[11px] font-black uppercase tracking-wider ${isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                                {doubt.subject}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            {activeTab === 'Unsolve' ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleShowDoubtClick(doubt)}
                                                        className="p-2.5 rounded-[5px] bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-orange-500 hover:bg-orange-500/10 transition-all"
                                                        title="View Doubt"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleSolveClick(doubt.id)}
                                                        className="px-4 py-2.5 rounded-[5px] bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-2"
                                                    >
                                                        <CheckCircle size={14} strokeWidth={3} />
                                                        <span>Mark Solved</span>
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className={`text-xs font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                                    {doubt.solvedDate}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                {doubt.assignDate}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4 opacity-30">
                                            <AlertCircle size={48} />
                                            <p className="font-bold text-lg">No doubts found for this teacher</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer status */}
                <div className={`p-6 border-t flex items-center justify-between ${isDarkMode ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'}`}>
                    <span className="text-xs font-bold opacity-50 uppercase tracking-widest">
                        Total {activeTab === 'Unsolve' ? 'Pending' : 'Resolved'}: {filteredDoubts.length}
                    </span>
                    <div className="flex gap-2">
                        <button className="p-2 rounded-lg hover:bg-black/5 opacity-30 cursor-not-allowed"><ChevronLeft size={16} /></button>
                        <button className="p-2 rounded-lg hover:bg-black/5 opacity-30 cursor-not-allowed"><ChevronRight size={16} /></button>
                    </div>
                </div>
            </div>

            {/* Show Doubt Modal */}
            {isShowDoubtModalOpen && selectedDoubtForView && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-lg mx-4 overflow-hidden rounded-[5px] shadow-2xl animate-in zoom-in-95 duration-300 border border-white/10">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-8 py-6 bg-orange-600 text-white">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">Doubt Detail</h3>
                                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Ref ID: #{selectedDoubtForView.id}</p>
                            </div>
                            <button onClick={handleCloseModal} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                <X size={24} strokeWidth={3} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className={`p-10 ${isDarkMode ? 'bg-[#1e293b] text-slate-200' : 'bg-white text-slate-700'}`}>
                            <div className="mb-6">
                                <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-2">Student Query</p>
                                <p className="font-bold text-lg leading-relaxed whitespace-pre-wrap italic">
                                    "{selectedDoubtForView.description}"
                                </p>
                            </div>

                            <div className={`grid grid-cols-2 gap-4 p-4 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Student</p>
                                    <p className="font-bold text-sm tracking-tight">{selectedDoubtForView.student}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Subject</p>
                                    <p className="font-bold text-sm tracking-tight">{selectedDoubtForView.subject}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SolveDoubt;
