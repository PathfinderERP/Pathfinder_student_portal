import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
    MessageSquare, Search, Filter, Eye, X, 
    CheckCircle, Clock, AlertCircle, ChevronRight, ChevronLeft,
    ChevronsLeft, ChevronsRight, User, 
    Calendar, Tag, MessageCircle, AlertTriangle, TrendingUp,
    MapPin, BarChart3, PieChart, RefreshCcw, Send, LayoutGrid, List
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

const GrievanceManagement = () => {
    const { token, getApiUrl } = useAuth();
    const { isDarkMode } = useTheme();
    const [grievances, setGrievances] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [centres, setCentres] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [priorityFilter, setPriorityFilter] = useState('All');
    const [centreFilter, setCentreFilter] = useState('All');
    const [monthFilter, setMonthFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState('');
    
    // View & Pagination
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [jumpPage, setJumpPage] = useState('');

    // Modal states
    const [selectedGrievance, setSelectedGrievance] = useState(null);
    const [isShowModalOpen, setIsShowModalOpen] = useState(false);
    const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [replyStatus, setReplyStatus] = useState('Resolved');
    const [submittingReply, setSubmittingReply] = useState(false);

    useEffect(() => {
        fetchGrievances();
        fetchCentres();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, categoryFilter, priorityFilter, centreFilter, monthFilter, dateFilter]);

    const fetchGrievances = async () => {
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/grievances/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const mapped = response.data.map(g => ({
                id: g.id,
                student: g.student_name,
                studentId: g.student_id,
                subject: g.subject,
                category: g.category,
                description: g.description,
                priority: g.priority,
                status: g.status,
                rawDate: g.date,
                date: g.date ? new Date(g.date).toLocaleString() : 'N/A',
                shortDate: g.date ? new Date(g.date).toLocaleDateString() : 'N/A',
                month: g.date ? new Date(g.date).toLocaleString('default', { month: 'long' }) : 'N/A',
                teacherName: g.teacher_name,
                assignDate: g.assign_date ? new Date(g.assign_date).toLocaleString() : null,
                solvedDate: g.solved_date ? new Date(g.solved_date).toLocaleString() : null,
                solution: g.solution_description,
                centreName: g.centre_name || 'N/A',
                centreCode: g.centre_code || 'N/A',
                studentClass: g.student_class || 'N/A',
                studentEmail: g.student_email || 'N/A',
                admissionNumber: g.admission_number || 'N/A',
                examTag: g.exam_tag || 'N/A'
            }));
            
            setGrievances(mapped);
        } catch (error) {
            console.error("Error fetching grievances:", error);
            toast.error("Failed to load grievances");
        } finally {
            setLoading(false);
        }
    };

    const fetchCentres = async () => {
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/admin/erp-centres/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setCentres(response.data || []);
        } catch (error) {
            console.error("Error fetching centres:", error);
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || !selectedGrievance) {
            toast.error("Please enter a reply description");
            return;
        }

        setSubmittingReply(true);
        try {
            const apiUrl = getApiUrl();
            await axios.patch(`${apiUrl}/api/grievances/${selectedGrievance.id}/`, {
                solution_description: replyText.trim(),
                status: replyStatus,
                solved_date: new Date().toISOString()
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            toast.success("Reply sent to student successfully!");
            setIsReplyModalOpen(false);
            if (isShowModalOpen) setIsShowModalOpen(false);
            setReplyText('');
            fetchGrievances();
        } catch (error) {
            console.error("Error replying to grievance:", error);
            toast.error("Failed to send reply");
        } finally {
            setSubmittingReply(false);
        }
    };

    const openReplyModal = (grievance) => {
        setSelectedGrievance(grievance);
        setReplyText(grievance.solution || '');
        setReplyStatus(grievance.status === 'Resolved' ? 'Resolved' : 'Resolved');
        setIsReplyModalOpen(true);
    };

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            const apiUrl = getApiUrl();
            await axios.patch(`${apiUrl}/api/grievances/${id}/`, {
                status: newStatus
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            toast.success(`Status updated to ${newStatus}`);
            fetchGrievances();
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    // Chart Data Preparation
    const getChartData = () => {
        const countsByDate = {};
        grievances.forEach(g => {
            const date = g.shortDate;
            if (date !== 'N/A') {
                countsByDate[date] = (countsByDate[date] || 0) + 1;
            }
        });

        return Object.keys(countsByDate)
            .sort((a, b) => new Date(a) - new Date(b))
            .map(date => ({
                date,
                count: countsByDate[date]
            })).slice(-15); // Last 15 days
    };

    const chartData = getChartData();

    const filteredGrievances = useMemo(() => {
        return grievances.filter(g => {
            const query = (searchTerm || '').toLowerCase().trim();
            const matchesSearch = !query || 
                (g.student && g.student.toLowerCase().includes(query)) || 
                (g.subject && g.subject.toLowerCase().includes(query)) ||
                (g.description && g.description.toLowerCase().includes(query)) ||
                (g.admissionNumber && g.admissionNumber.toLowerCase().includes(query)) ||
                (g.studentClass && g.studentClass.toLowerCase().includes(query)) ||
                (g.centreName && g.centreName.toLowerCase().includes(query)) ||
                (g.examTag && g.examTag.toLowerCase().includes(query)) ||
                (g.category && g.category.toLowerCase().includes(query)) ||
                (g.studentEmail && g.studentEmail.toLowerCase().includes(query));

            const matchesStatus = statusFilter === 'All' || g.status === statusFilter;
            const matchesCategory = categoryFilter === 'All' || g.category === categoryFilter;
            const matchesPriority = priorityFilter === 'All' || g.priority === priorityFilter;
            const matchesCentre = centreFilter === 'All' || g.centreName === centreFilter || g.centreCode === centreFilter;
            const matchesMonth = monthFilter === 'All' || g.month === monthFilter;
            const matchesDate = !dateFilter || g.shortDate === new Date(dateFilter).toLocaleDateString();
            
            return matchesSearch && matchesStatus && matchesCategory && matchesPriority && matchesCentre && matchesMonth && matchesDate;
        });
    }, [grievances, searchTerm, statusFilter, categoryFilter, priorityFilter, centreFilter, monthFilter, dateFilter]);

    const totalPages = Math.ceil(filteredGrievances.length / itemsPerPage) || 1;

    const paginatedGrievances = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredGrievances.slice(start, start + itemsPerPage);
    }, [filteredGrievances, currentPage, itemsPerPage]);

    const handleJumpPage = (e) => {
        e?.preventDefault();
        const pageNum = parseInt(jumpPage, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
            setCurrentPage(pageNum);
            setJumpPage('');
        } else {
            toast.error(`Please enter a page number between 1 and ${totalPages}`);
        }
    };

    const statusCounts = useMemo(() => {
        return {
            All: grievances.length,
            Pending: grievances.filter(g => g.status === 'Pending').length,
            Unassigned: grievances.filter(g => g.status === 'Unassigned').length,
            Assign: grievances.filter(g => g.status === 'Assign' || g.status === 'In Progress').length,
            Resolved: grievances.filter(g => g.status === 'Resolved').length,
            Rejected: grievances.filter(g => g.status === 'Rejected').length,
        };
    }, [grievances]);

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    // Dynamic list of unique centres from data + fetched centres
    const uniqueCentres = useMemo(() => {
        const fromData = Array.isArray(grievances) ? [...new Set(grievances.map(g => g.centreName))].filter(c => c && c !== 'N/A') : [];
        const fromERP = Array.isArray(centres) ? centres.map(c => c.centreName || c.name).filter(c => c) : [];
        return [...new Set([...fromData, ...fromERP])].sort();
    }, [grievances, centres]);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Resolved': return 'bg-green-500/20 text-green-500 border-green-500/20';
            case 'Assign': return 'bg-blue-500/20 text-blue-500 border-blue-500/20';
            case 'Rejected': return 'bg-red-500/20 text-red-500 border-red-500/20';
            case 'Unassigned': return 'bg-orange-500/20 text-orange-500 border-orange-500/20';
            default: return 'bg-slate-500/20 text-slate-500 border-slate-500/20';
        }
    };

    const getPriorityStyle = (priority) => {
        switch (priority) {
            case 'High': return 'text-red-500';
            case 'Medium': return 'text-orange-500';
            case 'Low': return 'text-green-500';
            default: return 'text-slate-400';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className={`p-10 rounded-[5px] border shadow-2xl relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
                
                <div className="relative z-10 space-y-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-orange-500 rounded-[5px] shadow-lg shadow-orange-500/20">
                                    <MessageSquare className="text-white" size={24} strokeWidth={2.5} />
                                </div>
                                <h2 className="text-3xl font-black tracking-tight uppercase">
                                    <span className="text-orange-500">Grievance</span> Analytics
                                </h2>
                            </div>
                            <p className={`text-sm font-bold opacity-60 ml-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Detailed breakdown and tracking of student concerns.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                            <button 
                                onClick={() => {
                                    setLoading(true);
                                    fetchGrievances();
                                    fetchTeachers();
                                    fetchCentres();
                                    toast.success('Data Refreshed');
                                }}
                                className={`flex items-center gap-2 px-4 py-3 rounded-[5px] border font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'}`}
                            >
                                <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
                                Refresh Data
                            </button>

                            <div className={`flex items-center px-4 py-3 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                <Search size={18} className="text-slate-400 mr-3" />
                                <input 
                                    type="text"
                                    placeholder="Search by student or subject..."
                                    className="bg-transparent border-none outline-none text-sm font-bold w-64"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Cases', value: grievances.length, icon: MessageCircle, color: 'text-blue-500' },
                            { label: 'Unassigned', value: grievances.filter(g => g.status === 'Unassigned').length, icon: Clock, color: 'text-orange-500' },
                            { label: 'Resolved', value: grievances.filter(g => g.status === 'Resolved').length, icon: CheckCircle, color: 'text-green-500' },
                            { label: 'High Priority', value: grievances.filter(g => g.priority === 'High').length, icon: AlertTriangle, color: 'text-red-500' },
                        ].map((stat, i) => (
                            <div key={i} className={`p-5 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                                <div className="flex items-center justify-between">
                                    <span className={`text-2xl font-black ${stat.color}`}>{stat.value}</span>
                                    <stat.icon size={20} className="opacity-20" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Analytics and Chart Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Area Chart Card */}
                <div className={`lg:col-span-2 p-8 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-xl' : 'bg-white border-slate-200 shadow-lg'}`}>
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                                <TrendingUp size={20} className="text-orange-500" />
                                Complaint Volume Trend
                            </h3>
                            <p className="text-xs font-bold opacity-40 uppercase tracking-widest">Daily submission frequency tracking</p>
                        </div>
                    </div>
                    
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                                <XAxis 
                                    dataKey="date" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fontWeight: 700, opacity: 0.5 }}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fontWeight: 700, opacity: 0.5 }}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF', 
                                        borderRadius: '8px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="count" 
                                    stroke="#F97316" 
                                    strokeWidth={4}
                                    fillOpacity={1} 
                                    fill="url(#colorCount)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Advanced Filters Card */}
                <div className={`p-8 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-xl' : 'bg-white border-slate-200 shadow-lg'}`}>
                    <h3 className="text-lg font-black uppercase tracking-tight mb-6 flex items-center gap-2">
                        <Filter size={20} className="text-orange-500" />
                        Advanced Filters
                    </h3>
                    
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Month Wise</label>
                            <select 
                                className={`w-full px-4 py-2.5 rounded-[5px] border text-xs font-black outline-none ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}
                                value={monthFilter}
                                onChange={(e) => setMonthFilter(e.target.value)}
                            >
                                <option value="All">All Months</option>
                                {months.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Specific Date</label>
                            <input 
                                type="date"
                                className={`w-full px-4 py-2.5 rounded-[5px] border text-xs font-black outline-none ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Priority Level</label>
                            <select 
                                className={`w-full px-4 py-2.5 rounded-[5px] border text-xs font-black outline-none ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}
                                value={priorityFilter}
                                onChange={(e) => setPriorityFilter(e.target.value)}
                            >
                                <option value="All">All Priorities</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Center Selection</label>
                            <select 
                                className={`w-full px-4 py-2.5 rounded-[5px] border text-xs font-black outline-none ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}
                                value={centreFilter}
                                onChange={(e) => setCentreFilter(e.target.value)}
                            >
                                <option value="All">All Centers</option>
                                {uniqueCentres.map(c => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button 
                            onClick={() => {
                                setMonthFilter('All');
                                setDateFilter('');
                                setPriorityFilter('All');
                                setCentreFilter('All');
                                setStatusFilter('All');
                                setCategoryFilter('All');
                                setSearchTerm('');
                            }}
                            className="w-full mt-4 py-3 bg-slate-500/10 hover:bg-slate-500/20 text-slate-500 rounded-[5px] text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                        >
                            Reset All Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Grievances Header & View Bar */}
            <div className={`p-4 rounded-[5px] border flex flex-col md:flex-row items-center justify-between gap-4 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                {/* Status Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar w-full md:w-auto pb-2 md:pb-0">
                    {[
                        { id: 'All', label: 'All', count: statusCounts.All },
                        { id: 'Pending', label: 'Pending', count: statusCounts.Pending },
                        { id: 'Unassigned', label: 'Unassigned', count: statusCounts.Unassigned },
                        { id: 'Assign', label: 'In Progress', count: statusCounts.Assign },
                        { id: 'Resolved', label: 'Resolved', count: statusCounts.Resolved },
                        { id: 'Rejected', label: 'Rejected', count: statusCounts.Rejected },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setStatusFilter(tab.id)}
                            className={`px-3 py-2 rounded-[5px] text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
                                statusFilter === tab.id
                                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                    : isDarkMode ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${statusFilter === tab.id ? 'bg-black/20 text-white' : isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-white text-slate-700'}`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* View Switcher & Total Count */}
                <div className="flex items-center gap-3 shrink-0 ml-auto">
                    <span className="text-xs font-bold text-slate-400">
                        Total: <strong className="text-orange-500 font-black">{filteredGrievances.length}</strong>
                    </span>
                    <div className={`flex items-center p-1 rounded-[5px] border ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[10px] font-black uppercase tracking-wider transition-all ${
                                viewMode === 'grid'
                                    ? 'bg-orange-500 text-white shadow-sm'
                                    : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                            }`}
                            title="Cards View"
                        >
                            <LayoutGrid size={13} />
                            <span>Cards</span>
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[10px] font-black uppercase tracking-wider transition-all ${
                                viewMode === 'table'
                                    ? 'bg-orange-500 text-white shadow-sm'
                                    : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                            }`}
                            title="Row / Table View"
                        >
                            <List size={13} />
                            <span>Rows</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Grievance Content: Row / Table View or Card Grid View */}
            {viewMode === 'table' ? (
                <div className={`rounded-[5px] border shadow-xl overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/40'}`}>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                                <tr className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-400 border-b border-white/5' : 'bg-slate-50 text-slate-600 border-b border-slate-200'}`}>
                                    <th className="py-4 px-4 text-center w-16">SL No.</th>
                                    <th className="py-4 px-4">Student &amp; Contact</th>
                                    <th className="py-4 px-4">Category &amp; Exam</th>
                                    <th className="py-4 px-4">Student Concern</th>
                                    <th className="py-4 px-4 text-center">Priority</th>
                                    <th className="py-4 px-4 text-center">Status</th>
                                    <th className="py-4 px-4 text-center">Date</th>
                                    <th className="py-4 px-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y text-xs font-bold ${isDarkMode ? 'divide-white/5 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
                                {paginatedGrievances.length > 0 ? (
                                    paginatedGrievances.map((grievance, index) => {
                                        const slNumber = ((currentPage - 1) * itemsPerPage) + index + 1;
                                        return (
                                            <tr key={grievance.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/80'}`}>
                                                <td className="py-4 px-4 text-center font-black text-orange-500">
                                                    #{slNumber}
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-[5px] bg-orange-500 flex items-center justify-center text-white font-black uppercase text-xs shrink-0 shadow-md shadow-orange-500/20">
                                                            {grievance.student?.charAt(0)}
                                                        </div>
                                                        <div className="space-y-0.5 min-w-0">
                                                            <p className="font-black text-xs uppercase tracking-tight truncate">{grievance.student}</p>
                                                            <p className="text-[9px] font-bold opacity-60 uppercase tracking-wider">{grievance.studentClass} &bull; <span className="text-orange-500">{grievance.centreName}</span></p>
                                                            <p className="text-[9px] font-medium opacity-40 lowercase">{grievance.studentEmail}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="space-y-1">
                                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-500/10 text-slate-500 border border-slate-500/10 inline-block">
                                                            {grievance.category}
                                                        </span>
                                                        <p className="font-extrabold text-[11px] uppercase text-[#E67E22] truncate max-w-[160px]">{grievance.examTag}</p>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 max-w-xs">
                                                    <p className="text-xs font-medium italic line-clamp-2" title={grievance.description}>
                                                        "{grievance.description}"
                                                    </p>
                                                    {grievance.solution && (
                                                        <div className="mt-1 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-500 truncate" title={grievance.solution}>
                                                            <CheckCircle size={10} /> Replied: {grievance.solution}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-500/5 border border-slate-500/10 ${getPriorityStyle(grievance.priority)}`}>
                                                        {grievance.priority}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-full border ${getStatusStyle(grievance.status)}`}>
                                                        {grievance.status}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-center text-[10px] font-bold opacity-60 whitespace-nowrap">
                                                    {grievance.shortDate || grievance.date}
                                                </td>
                                                <td className="py-4 px-4 text-center whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            onClick={() => { setSelectedGrievance(grievance); setIsShowModalOpen(true); }}
                                                            className={`p-2 rounded-[5px] transition-all hover:bg-orange-500 hover:text-white ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-600'}`}
                                                            title="View Details"
                                                        >
                                                            <Eye size={15} strokeWidth={2.5} />
                                                        </button>
                                                        <button
                                                            onClick={() => openReplyModal(grievance)}
                                                            className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-[5px] text-[10px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                                                        >
                                                            <MessageSquare size={12} />
                                                            {grievance.solution ? 'Edit' : 'Reply'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center opacity-30">
                                            <MessageSquare size={48} className="mx-auto mb-3" />
                                            <p className="text-sm font-black uppercase tracking-widest">No Grievances Found</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {paginatedGrievances.length > 0 ? (
                        paginatedGrievances.map((grievance, index) => {
                            const slNumber = ((currentPage - 1) * itemsPerPage) + index + 1;
                            return (
                                <div 
                                    key={grievance.id}
                                    className={`group p-6 rounded-[5px] border transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5 hover:border-orange-500/30' : 'bg-white border-slate-200 hover:border-orange-500/20 shadow-lg shadow-slate-200/20'}`}
                                >
                                    {/* Priority Indicator */}
                                    <div className={`absolute top-0 left-0 w-1.5 h-full ${grievance.priority === 'High' ? 'bg-red-500' : grievance.priority === 'Medium' ? 'bg-orange-500' : 'bg-green-500'}`} />

                                    <div className="flex justify-between items-start mb-6">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <span className="text-[10px] font-black text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-[4px] border border-orange-500/20">
                                                    #{slNumber}
                                                </span>
                                                <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-full border ${getStatusStyle(grievance.status)}`}>
                                                    {grievance.status}
                                                </span>
                                                <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-slate-500/10 text-slate-500 border border-slate-500/10`}>
                                                    {grievance.category}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-black tracking-tight leading-tight group-hover:text-orange-500 transition-colors uppercase">
                                                {grievance.examTag}
                                            </h3>
                                            <div className="flex items-center gap-2 text-[10px] font-bold opacity-40">
                                                <Calendar size={12} />
                                                <span>{grievance.date}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="flex items-center gap-2 px-3 py-1 bg-slate-500/5 rounded-full border border-slate-500/10">
                                                <AlertTriangle size={12} className={getPriorityStyle(grievance.priority)} />
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${getPriorityStyle(grievance.priority)}`}>
                                                    {grievance.priority} Priority
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <p className={`text-sm leading-relaxed mb-4 line-clamp-2 font-medium italic ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                        "{grievance.description}"
                                    </p>

                                    {grievance.solution && (
                                        <div className={`mb-6 p-3 rounded-[5px] border border-emerald-500/20 ${isDarkMode ? 'bg-emerald-500/5 text-slate-300' : 'bg-emerald-50/80 text-slate-800'}`}>
                                            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-500 mb-1">
                                                <CheckCircle size={12} /> Official Response
                                            </div>
                                            <p className="text-xs font-medium line-clamp-2 italic">
                                                {grievance.solution}
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-6 border-t border-dashed border-slate-500/10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-[5px] bg-orange-500 flex items-center justify-center text-white font-black uppercase text-sm shadow-lg shadow-orange-500/20 shrink-0">
                                                {grievance.student?.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="space-y-1">
                                                    <p className="text-xs font-black uppercase tracking-tight">{grievance.student}</p>
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                                        <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest">{grievance.studentClass}</p>
                                                        <span className="w-1 h-1 rounded-full bg-orange-500/30" />
                                                        <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest text-orange-500">{grievance.centreName}</p>
                                                        <span className="w-1 h-1 rounded-full bg-orange-500/30" />
                                                        <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest">{grievance.admissionNumber}</p>
                                                        <span className="w-1 h-1 rounded-full bg-orange-500/30" />
                                                        <p className="text-[9px] font-bold opacity-50 lowercase">{grievance.studentEmail}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => { setSelectedGrievance(grievance); setIsShowModalOpen(true); }}
                                                className={`p-2.5 rounded-[5px] transition-all hover:bg-orange-500 hover:text-white ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-600'}`}
                                                title="View Details"
                                            >
                                                <Eye size={18} strokeWidth={2.5} />
                                            </button>
                                            <button 
                                                onClick={() => openReplyModal(grievance)}
                                                className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-[5px] text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center gap-2"
                                            >
                                                <MessageSquare size={14} />
                                                {grievance.solution ? 'Edit Reply' : 'Reply'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-20">
                            <MessageSquare size={80} strokeWidth={1} className="mb-6" />
                            <p className="text-2xl font-black uppercase tracking-[0.2em]">No Grievances Found</p>
                        </div>
                    )}
                </div>
            )}

            {/* Pagination Controls */}
            {filteredGrievances.length > 0 && (
                <div className={`p-4 rounded-[5px] border flex flex-col md:flex-row items-center justify-between gap-4 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                        <span>
                            Showing <strong className="text-orange-500">{((currentPage - 1) * itemsPerPage) + 1}</strong> to <strong className="text-orange-500">{Math.min(currentPage * itemsPerPage, filteredGrievances.length)}</strong> of <strong className="text-orange-500">{filteredGrievances.length}</strong> cases
                        </span>
                        <div className="flex items-center gap-1.5 ml-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Rows:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className={`px-2.5 py-1 rounded-[5px] border text-xs font-black outline-none ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>

                    {/* Page Navigation & Jump To */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className={`p-2 rounded-[5px] border text-xs font-black transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed border-transparent' : isDarkMode ? 'border-white/10 hover:bg-white/5 text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}
                            title="First Page"
                        >
                            <ChevronsLeft size={14} />
                        </button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className={`p-2 rounded-[5px] border text-xs font-black transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed border-transparent' : isDarkMode ? 'border-white/10 hover:bg-white/5 text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}
                            title="Previous Page"
                        >
                            <ChevronLeft size={14} />
                        </button>

                        <span className="text-xs font-black px-3 py-1.5 rounded-[5px] bg-orange-500/10 text-orange-500 border border-orange-500/20">
                            Page {currentPage} of {totalPages}
                        </span>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className={`p-2 rounded-[5px] border text-xs font-black transition-all ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed border-transparent' : isDarkMode ? 'border-white/10 hover:bg-white/5 text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}
                            title="Next Page"
                        >
                            <ChevronRight size={14} />
                        </button>
                        <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className={`p-2 rounded-[5px] border text-xs font-black transition-all ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed border-transparent' : isDarkMode ? 'border-white/10 hover:bg-white/5 text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}
                            title="Last Page"
                        >
                            <ChevronsRight size={14} />
                        </button>

                        {/* Jump to Page */}
                        <form onSubmit={handleJumpPage} className="flex items-center gap-1.5 ml-3">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Jump:</span>
                            <input
                                type="number"
                                min={1}
                                max={totalPages}
                                value={jumpPage}
                                onChange={(e) => setJumpPage(e.target.value)}
                                placeholder="#"
                                className={`w-14 px-2 py-1 rounded-[5px] border text-xs font-black text-center outline-none ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-orange-500'}`}
                            />
                            <button
                                type="submit"
                                className="px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-[5px] text-[10px] font-black uppercase tracking-wider shadow-sm transition-all"
                            >
                                Go
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Show Modal */}
            {isShowModalOpen && selectedGrievance && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 pt-32 overflow-y-auto">
                    <div className="w-full max-w-3xl mx-4 mb-12 overflow-hidden rounded-[5px] shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-8 py-6 bg-orange-500 text-white">
                            <div className="space-y-1">
                                <h3 className="text-xl font-black tracking-tight uppercase">Grievance Details</h3>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Case #{selectedGrievance.id}</p>
                            </div>
                            <button onClick={() => setIsShowModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                <X size={24} strokeWidth={3} />
                            </button>
                        </div>

                        <div className={`p-8 space-y-6 ${isDarkMode ? 'bg-[#10141D] text-slate-200' : 'bg-white text-slate-700'}`}>
                            <div className="grid grid-cols-3 gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</p>
                                    <p className="font-black text-sm uppercase text-orange-500">{selectedGrievance.category}</p>
                                </div>
                                <div className="space-y-1 text-center border-x border-white/5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Priority</p>
                                    <p className={`font-black text-sm uppercase ${getPriorityStyle(selectedGrievance.priority)}`}>{selectedGrievance.priority}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</p>
                                    <p className="font-black text-sm uppercase text-blue-500">{selectedGrievance.status}</p>
                                </div>
                            </div>

                            <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                    <User size={14} /> Student Context
                                </p>
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest">Student Name</p>
                                        <p className="font-black text-sm uppercase truncate">{selectedGrievance.student}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest">Centre</p>
                                        <p className="font-black text-sm uppercase text-orange-500">{selectedGrievance.centreName}</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest">Enrollment No.</p>
                                        <p className="font-black text-sm uppercase text-orange-500">{selectedGrievance.admissionNumber}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest">Class / Section</p>
                                        <p className="font-black text-sm uppercase line-clamp-1">{selectedGrievance.studentClass}</p>
                                    </div>
                                    <div className="space-y-1 col-span-2 text-right">
                                        <div className="flex justify-end gap-6">
                                            <div className="text-right">
                                                <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest">Email Address</p>
                                                <p className="font-black text-sm lowercase">{selectedGrievance.studentEmail}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest">Student ID</p>
                                                <p className="font-black text-sm uppercase">{selectedGrievance.studentId}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={`p-6 rounded-[5px] border border-orange-500/10 bg-orange-500/5`}>
                                <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-3">Student Query</p>
                                <p className="font-bold text-base leading-relaxed italic">
                                    "{selectedGrievance.description}"
                                </p>
                            </div>

                            {selectedGrievance.solution && (
                                <div className={`p-6 rounded-[5px] border border-emerald-500/20 ${isDarkMode ? 'bg-emerald-500/5 text-slate-200' : 'bg-emerald-50 text-slate-800'}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                                            <CheckCircle size={14} /> Official Response
                                        </p>
                                        {selectedGrievance.solvedDate && (
                                            <span className="text-[9px] font-bold opacity-50">
                                                {selectedGrievance.solvedDate}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm font-medium leading-relaxed">
                                        {selectedGrievance.solution}
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button 
                                    onClick={() => {
                                        setIsShowModalOpen(false);
                                        openReplyModal(selectedGrievance);
                                    }}
                                    className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-[5px] font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <MessageSquare size={16} />
                                    {selectedGrievance.solution ? 'Edit Reply' : 'Reply to Student'}
                                </button>
                                {selectedGrievance.status !== 'Resolved' && (
                                    <button 
                                        onClick={() => handleStatusUpdate(selectedGrievance.id, 'Resolved')}
                                        className="flex-1 py-4 bg-green-600 hover:bg-green-700 text-white rounded-[5px] font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-green-600/20 transition-all active:scale-95"
                                    >
                                        Mark Resolved
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleStatusUpdate(selectedGrievance.id, 'Rejected')}
                                    className={`py-4 px-6 border font-black uppercase tracking-[0.2em] text-xs rounded-[5px] transition-all active:scale-95 ${isDarkMode ? 'border-red-500/50 text-red-500 hover:bg-red-500/10' : 'border-red-200 text-red-500 hover:bg-red-50'}`}
                                >
                                    Reject Case
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reply Modal */}
            {isReplyModalOpen && selectedGrievance && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
                    <div className="w-full max-w-xl overflow-hidden rounded-[5px] shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-8 py-6 bg-orange-500 text-white">
                            <div className="space-y-1">
                                <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                                    <MessageSquare size={20} /> Reply to Grievance
                                </h3>
                                <p className="text-xs font-bold opacity-80 uppercase tracking-widest">
                                    Student: {selectedGrievance.student} ({selectedGrievance.studentClass})
                                </p>
                            </div>
                            <button onClick={() => setIsReplyModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                <X size={20} strokeWidth={3} />
                            </button>
                        </div>
                        
                        <div className={`p-8 space-y-6 ${isDarkMode ? 'bg-[#10141D] text-slate-200' : 'bg-white text-slate-700'}`}>
                            {/* Student concern preview */}
                            <div className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">Student Concern</span>
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${getPriorityStyle(selectedGrievance.priority)}`}>
                                        {selectedGrievance.priority} Priority
                                    </span>
                                </div>
                                <p className="text-xs font-bold italic line-clamp-3 opacity-90">
                                    "{selectedGrievance.description}"
                                </p>
                            </div>

                            {/* Reply Input */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
                                    <span>Official Reply / Resolution Note *</span>
                                    <span className="text-[9px] lowercase font-normal opacity-60">Visible in student portal</span>
                                </label>
                                <textarea 
                                    rows={5}
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Type your response here to resolve the student's concern..."
                                    className={`w-full p-4 rounded-[5px] border text-sm font-medium outline-none transition-all resize-none ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-orange-500'}`}
                                />
                            </div>

                            {/* Status Selector */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Update Status To</label>
                                <select 
                                    value={replyStatus}
                                    onChange={(e) => setReplyStatus(e.target.value)}
                                    className={`w-full p-3 rounded-[5px] border text-xs font-black outline-none transition-all ${isDarkMode ? 'bg-[#1a1f2e] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                                >
                                    <option value="Resolved">Resolved (Default)</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4 pt-2">
                                <button 
                                    type="button"
                                    onClick={() => setIsReplyModalOpen(false)}
                                    className={`flex-1 py-3.5 font-black uppercase tracking-widest text-xs rounded-[5px] border ${isDarkMode ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button"
                                    onClick={handleSendReply}
                                    disabled={submittingReply || !replyText.trim()}
                                    className={`flex-1 py-3.5 rounded-[5px] font-black uppercase tracking-widest text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${replyText.trim() && !submittingReply ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/20' : 'bg-slate-300 dark:bg-white/10 text-slate-400 cursor-not-allowed'}`}
                                >
                                    {submittingReply ? <RefreshCcw size={14} className="animate-spin" /> : <Send size={14} />}
                                    {submittingReply ? 'Sending...' : 'Send Reply'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GrievanceManagement;
