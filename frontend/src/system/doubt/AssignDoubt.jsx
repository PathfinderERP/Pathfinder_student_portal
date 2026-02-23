import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Eye, UserPlus, Filter, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast, X, RotateCcw } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const AssignDoubt = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [activeTab, setActiveTab] = useState('Unassigned');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Initial Data State (Only Unassigned Doubts initially)
    const [doubts, setDoubts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDoubts = async () => {
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/grievances/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Map the data to the format expected by the table
            const mappedDoubts = response.data.map(d => ({
                id: d.id,
                student: d.student_name,
                studentId: d.student_id,
                subject: d.subject + (d.category === 'Doubt Session' ? ' (Doubt)' : ''),
                date: new Date(d.date).toLocaleString(),
                status: d.status,
                description: d.description,
                teacherName: d.teacher_name,
                assignDate: d.assign_date ? new Date(d.assign_date).toLocaleString() : null,
                solvedDate: d.solved_date ? new Date(d.solved_date).toLocaleString() : null
            }));
            setDoubts(mappedDoubts);
        } catch (error) {
            console.error('Failed to fetch doubts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDoubts();
    }, []);

    const tabs = [
        { id: 'Unassigned', label: 'UN (ASSIGN/SOLVE DOUBTS)' },
        { id: 'Assign', label: 'ASSIGN DOUBTS' },
        { id: 'Solve', label: 'SOLVE DOUBTS' },
        { id: 'Rejected', label: 'REJECTED DOUBTS' }
    ];

    const filteredDoubts = doubts.filter(d =>
        (d.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.subject.toLowerCase().includes(searchQuery.toLowerCase())) &&
        (d.status === activeTab)
    );

    const totalPages = Math.ceil(filteredDoubts.length / itemsPerPage);

    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedDoubtForAssignment, setSelectedDoubtForAssignment] = useState(null);
    const [selectedTeacher, setSelectedTeacher] = useState('');
    const [teachers, setTeachers] = useState([]);

    // Custom "Show Doubt" Modal State
    const [isShowDoubtModalOpen, setIsShowDoubtModalOpen] = useState(false);
    const [selectedDoubtForView, setSelectedDoubtForView] = useState(null);

    // Fetch teachers when modal opens
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
            } catch (error) {
                console.error("Failed to fetch teachers:", error);
            }
        };

        if (isAssignModalOpen) {
            fetchTeachers();
        }
    }, [isAssignModalOpen, getApiUrl, token]);

    const handleAssignClick = (doubt) => {
        setSelectedDoubtForAssignment(doubt);
        setIsAssignModalOpen(true);
    };

    const handleShowDoubtClick = (doubt) => {
        setSelectedDoubtForView(doubt);
        setIsShowDoubtModalOpen(true);
    }

    const handleCloseModal = () => {
        setIsAssignModalOpen(false);
        setSelectedDoubtForAssignment(null);
        setSelectedTeacher('');
        setIsShowDoubtModalOpen(false);
        setSelectedDoubtForView(null);
    };

    const handleConfirmAssign = async () => {
        if (!selectedTeacher || !selectedDoubtForAssignment) return;

        const teacher = teachers.find(t => String(t.id) === String(selectedTeacher));
        const teacherName = teacher?.name || 'Teacher';

        try {
            const apiUrl = getApiUrl();
            await axios.patch(`${apiUrl}/api/grievances/${selectedDoubtForAssignment.id}/`, {
                status: 'Assign',
                teacher_name: teacherName,
                teacher_id: selectedTeacher,
                assign_date: new Date().toISOString()
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            fetchDoubts();
            handleCloseModal();
        } catch (error) {
            console.error('Failed to assign doubt:', error);
            alert('Failed to assign doubt.');
        }
    };

    const handleRejectDoubt = async (doubtId) => {
        try {
            const apiUrl = getApiUrl();
            await axios.patch(`${apiUrl}/api/grievances/${doubtId}/`, {
                status: 'Rejected'
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchDoubts();
        } catch (error) {
            console.error('Failed to reject doubt:', error);
        }
    };

    const handleRestoreDoubt = async (doubtId) => {
        try {
            const apiUrl = getApiUrl();
            await axios.patch(`${apiUrl}/api/grievances/${doubtId}/`, {
                status: 'Unassigned'
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchDoubts();
        } catch (error) {
            console.error('Failed to restore doubt:', error);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
            <div className={`p-8 rounded-[5px] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                {/* Header & Tabs */}
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest rounded-[5px] shadow-lg shadow-orange-500/20">
                                    Doubt Management
                                </span>
                                <h2 className="text-3xl font-black tracking-tight uppercase">
                                    Assign <span className="text-orange-500">Doubts</span>
                                </h2>
                            </div>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Manage and assign student doubts to faculty.
                            </p>
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

                    {/* Filters Row */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="relative group w-full md:w-96">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="Search by student or subject..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-14 pr-6 py-3 rounded-[5px] border-2 outline-none font-bold transition-all ${isDarkMode
                                    ? 'bg-white/5 border-white/5 text-white focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5'
                                    : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5'
                                    }`}
                            />
                        </div>
                        <button
                            onClick={fetchDoubts}
                            className={`p-3 rounded-[5px] transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-orange-400 border border-white/5' : 'bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-100'}`}>
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className={`rounded-[5px] border shadow-2xl overflow-hidden transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-orange-50 text-orange-900/50'}`}>
                                {activeTab === 'Assign' ? (
                                    <>
                                        <th className="py-4 px-2 text-center">Doubt No.</th>
                                        <th className="py-4 px-2 text-center">Student Name</th>
                                        <th className="py-4 px-2 text-center">Subject</th>
                                        <th className="py-4 px-2 text-center">Teacher Name</th>
                                        <th className="py-4 px-2 text-center">Assign Date</th>
                                    </>
                                ) : activeTab === 'Solve' ? (
                                    <>
                                        <th className="py-4 px-2 text-center">Doubt No.</th>
                                        <th className="py-4 px-2 text-center">Student Name</th>
                                        <th className="py-4 px-2 text-center">Subject</th>
                                        <th className="py-4 px-2 text-center">Teacher Name</th>
                                        <th className="py-4 px-2 text-center">Solved Date</th>
                                    </>
                                ) : activeTab === 'Rejected' ? (
                                    <>
                                        <th className="py-4 px-2 text-center">Doubt No.</th>
                                        <th className="py-4 px-2 text-center">Student Name</th>
                                        <th className="py-4 px-2 text-center">Subject</th>
                                        <th className="py-4 px-2 text-center">Show Doubt</th>
                                        <th className="py-4 px-2 text-center">Action</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="py-4 px-2 text-center">Doubt No.</th>
                                        <th className="py-4 px-2">Student Name</th>
                                        <th className="py-4 px-2">Subject</th>
                                        <th className="py-4 px-2">Date</th>
                                        <th className="py-4 px-2 text-center">Show Doubt</th>
                                        <th className="py-4 px-2 text-center">Assign To</th>
                                        <th className="py-4 px-2 text-center">Reject Doubt</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-4 px-2 text-center">
                                            <div className={`h-4 w-4 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-4 px-2">
                                            <div className="flex flex-col gap-2">
                                                <div className={`h-4 w-32 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                <div className={`h-2.5 w-16 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-2">
                                            <div className={`h-5 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-4 px-2">
                                            <div className={`h-4 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-4 px-2 text-center">
                                            <div className={`h-9 w-28 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-4 px-2 text-center">
                                            <div className={`h-9 w-28 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-4 px-2 text-center">
                                            <div className={`h-9 w-28 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredDoubts.length > 0 ? (
                                filteredDoubts.map((doubt) => (
                                    <tr key={doubt.id} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                                        {activeTab === 'Assign' || activeTab === 'Solve' ? (
                                            <>
                                                <td className="py-4 px-2 text-center">
                                                    <span className={`text-sm font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                        {doubt.id}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-2 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-bold text-sm tracking-tight uppercase">{doubt.student}</span>
                                                        <span className={`text-[10px] font-black opacity-40 uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>ID: {doubt.studentId || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-2 text-center">
                                                    <span className={`px-3 py-1 rounded-[5px] text-[11px] font-black uppercase tracking-wider ${isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                                        {doubt.subject}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-2 text-center">
                                                    <span className={`font-bold text-sm tracking-tight uppercase ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>{doubt.teacherName || '-'}</span>
                                                </td>
                                                <td className="py-4 px-2 text-center">
                                                    <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                        {activeTab === 'Assign' ? (doubt.assignDate || '-') : (doubt.solvedDate || '-')}
                                                    </span>
                                                </td>
                                            </>
                                        ) : activeTab === 'Rejected' ? (
                                            <>
                                                <td className="py-4 px-2 text-center">
                                                    <span className={`text-sm font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                        {doubt.id}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-2 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-bold text-sm tracking-tight uppercase">{doubt.student}</span>
                                                        <span className={`text-[10px] font-black opacity-40 uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>ID: {doubt.studentId || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-2 text-center">
                                                    <span className={`px-3 py-1 rounded-[5px] text-[11px] font-black uppercase tracking-wider ${isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                                        {doubt.subject}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-2 text-center">
                                                    <button
                                                        onClick={() => handleShowDoubtClick(doubt)}
                                                        className="px-4 py-3 rounded-[5px] bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto min-w-[120px]">
                                                        <Eye size={14} strokeWidth={3} />
                                                        <span>Show Doubt</span>
                                                    </button>
                                                </td>
                                                <td className="py-4 px-2 text-center">
                                                    <button
                                                        onClick={() => handleRestoreDoubt(doubt.id)}
                                                        className="px-4 py-3 rounded-[5px] bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto min-w-[120px]">
                                                        <RotateCcw size={14} strokeWidth={3} />
                                                        <span>Redo / Restore</span>
                                                    </button>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="py-4 px-2 text-center">
                                                    <span className={`text-sm font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                        {doubt.id}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-2">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm tracking-tight uppercase">{doubt.student}</span>
                                                        <span className={`text-[10px] font-black opacity-40 uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>ID: {doubt.studentId || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-2">
                                                    <span className={`px-3 py-1 rounded-[5px] text-[11px] font-black uppercase tracking-wider ${isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                                        {doubt.subject}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-2">
                                                    <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                        {doubt.date}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-2 text-center">
                                                    <button
                                                        onClick={() => handleShowDoubtClick(doubt)}
                                                        className="px-4 py-3 rounded-[5px] bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto min-w-[120px]">
                                                        <Eye size={14} strokeWidth={3} />
                                                        <span>Show Doubt</span>
                                                    </button>
                                                </td>
                                                <td className="py-4 px-2 text-center">
                                                    <button
                                                        onClick={() => handleAssignClick(doubt)}
                                                        className="px-4 py-3 rounded-[5px] bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto min-w-[120px]"
                                                    >
                                                        <UserPlus size={14} strokeWidth={3} />
                                                        <span>Assign To</span>
                                                    </button>
                                                </td>
                                                <td className="py-4 px-2 text-center">
                                                    <button
                                                        onClick={() => handleRejectDoubt(doubt.id)}
                                                        className="px-4 py-3 rounded-[5px] bg-red-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto min-w-[120px]">
                                                        <X size={14} strokeWidth={3} />
                                                        <span>Reject</span>
                                                    </button>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={activeTab === 'Assign' || activeTab === 'Solve' ? 5 : activeTab === 'Rejected' ? 5 : 7} className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4 opacity-50">
                                            <AlertCircle size={48} className={isDarkMode ? 'text-slate-700' : 'text-slate-300'} />
                                            <p className="font-bold text-lg">No doubts found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Simplified Pagination */}
                <div className={`p-6 border-t flex items-center justify-between ${isDarkMode ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'}`}>
                    <span className="text-xs font-bold opacity-50">Showing {filteredDoubts.length} entries</span>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} className="p-2 rounded-[5px] hover:bg-black/5 disabled:opacity-30"><ChevronLeft size={16} /></button>
                        <button disabled={currentPage >= totalPages} className="p-2 rounded-[5px] hover:bg-black/5 disabled:opacity-30"><ChevronRight size={16} /></button>
                    </div>
                </div>
            </div>

            {/* Assign Teacher Modal */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md mx-4 overflow-hidden rounded-t-lg rounded-b-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 bg-orange-500 text-white">
                            <h3 className="text-lg font-bold">Select Teacher</h3>
                            <button onClick={handleCloseModal} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className={`p-8 ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white'}`}>
                            <div className="relative">
                                <label className={`absolute -top-2 left-3 px-1 text-xs font-bold ${isDarkMode ? 'bg-[#1e293b] text-blue-400' : 'bg-white text-blue-600'}`}>
                                    Select Teacher
                                </label>
                                <select
                                    value={selectedTeacher}
                                    onChange={(e) => setSelectedTeacher(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-[5px] border-2 outline-none font-bold appearance-none ${isDarkMode
                                        ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
                                        : 'bg-white border-blue-400/50 text-slate-700 focus:border-blue-500'
                                        }`}
                                >
                                    <option value="" disabled>Select Teacher</option>
                                    {teachers.map((teacher) => (
                                        <option key={teacher.id} value={teacher.id}>{teacher.name} ({teacher.subject_name || 'No Subject'})</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                    <ChevronRight size={16} className="rotate-90" />
                                </div>
                            </div>

                            <button
                                onClick={handleConfirmAssign}
                                disabled={!selectedTeacher}
                                className={`w-full mt-8 py-3 rounded-[5px] font-bold uppercase tracking-widest text-xs shadow-lg transition-all active:scale-95 ${selectedTeacher
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}
                            >
                                Assign
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Show Doubt Modal */}
            {isShowDoubtModalOpen && selectedDoubtForView && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-lg mx-4 overflow-hidden rounded-t-lg rounded-b-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 bg-orange-500 text-white">
                            <h3 className="text-lg font-bold">Doubt Details At A Glance</h3>
                            <button onClick={handleCloseModal} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className={`p-8 min-h-[300px] max-h-[70vh] overflow-y-auto ${isDarkMode ? 'bg-[#1e293b] text-slate-200' : 'bg-white text-slate-700'}`}>
                            <div className="mb-6">
                                <p className={`text-[10px] font-black uppercase tracking-widest text-orange-500 mb-2`}>Student Query</p>
                                <p className="font-bold text-sm leading-relaxed whitespace-pre-wrap italic">
                                    "{selectedDoubtForView.description}"
                                </p>
                            </div>

                            <div className={`grid grid-cols-2 gap-4 p-4 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Student</p>
                                    <p className="font-bold text-sm tracking-tight">{selectedDoubtForView.student}</p>
                                    <p className={`text-[9px] font-black opacity-40 uppercase tracking-widest mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>ID: {selectedDoubtForView.studentId || 'N/A'}</p>
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

export default AssignDoubt;

