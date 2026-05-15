import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
    MessageSquare, Search, Filter, Eye, X, 
    CheckCircle, Clock, AlertCircle, ChevronRight, User, 
    Calendar, Tag, MessageCircle, AlertTriangle, TrendingUp,
    MapPin, BarChart3, PieChart, RefreshCcw
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
    
    // Modal states
    const [selectedGrievance, setSelectedGrievance] = useState(null);
    const [isShowModalOpen, setIsShowModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState('');

    useEffect(() => {
        fetchGrievances();
        fetchTeachers();
        fetchCentres();
    }, []);

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

    const fetchTeachers = async () => {
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/admin/erp-teachers/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setTeachers(response.data || []);
        } catch (error) {
            console.error("Error fetching teachers:", error);
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

    const handleAssign = async () => {
        if (!selectedTeacher || !selectedGrievance) return;
        
        const teacher = teachers.find(t => (t.code || t.id) === selectedTeacher);
        if (!teacher) return;

        const teacherName = teacher.name || teacher.teacher_name;
        const teacherId = teacher.code || teacher.employee_id;

        try {
            const apiUrl = getApiUrl();
            await axios.patch(`${apiUrl}/api/grievances/${selectedGrievance.id}/`, {
                status: 'Assign',
                teacher_id: teacherId,
                teacher_name: teacherName,
                assign_date: new Date().toISOString()
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            toast.success(`Grievance assigned to ${teacherName}`);
            setIsAssignModalOpen(false);
            fetchGrievances();
        } catch (error) {
            console.error("Error assigning grievance:", error);
            toast.error("Failed to assign grievance");
        }
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

    const filteredGrievances = grievances.filter(g => {
        const matchesSearch = g.student.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             g.subject.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || g.status === statusFilter;
        const matchesCategory = categoryFilter === 'All' || g.category === categoryFilter;
        const matchesPriority = priorityFilter === 'All' || g.priority === priorityFilter;
        const matchesCentre = centreFilter === 'All' || g.centreName === centreFilter || g.centreCode === centreFilter;
        const matchesMonth = monthFilter === 'All' || g.month === monthFilter;
        const matchesDate = !dateFilter || g.shortDate === new Date(dateFilter).toLocaleDateString();
        
        return matchesSearch && matchesStatus && matchesCategory && matchesPriority && matchesCentre && matchesMonth && matchesDate;
    });

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

            {/* Grievance Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {filteredGrievances.length > 0 ? (
                    filteredGrievances.map((grievance) => (
                        <div 
                            key={grievance.id}
                            className={`group p-6 rounded-[5px] border transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5 hover:border-orange-500/30' : 'bg-white border-slate-200 hover:border-orange-500/20 shadow-lg shadow-slate-200/20'}`}
                        >
                            {/* Priority Indicator */}
                            <div className={`absolute top-0 left-0 w-1 h-full ${grievance.priority === 'High' ? 'bg-red-500' : grievance.priority === 'Medium' ? 'bg-orange-500' : 'bg-green-500'}`} />

                            <div className="flex justify-between items-start mb-6">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 mb-2">
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

                            <p className={`text-sm leading-relaxed mb-8 line-clamp-2 font-medium italic ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                "{grievance.description}"
                            </p>

                            <div className="flex items-center justify-between pt-6 border-t border-dashed border-slate-500/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-[5px] bg-orange-500 flex items-center justify-center text-white font-black uppercase text-sm shadow-lg shadow-orange-500/20">
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
                                    >
                                        <Eye size={18} strokeWidth={2.5} />
                                    </button>
                                    {grievance.status === 'Unassigned' && (
                                        <button 
                                            onClick={() => { setSelectedGrievance(grievance); setIsAssignModalOpen(true); }}
                                            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-[5px] text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                                        >
                                            Assign
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-20">
                        <MessageSquare size={80} strokeWidth={1} className="mb-6" />
                        <p className="text-2xl font-black uppercase tracking-[0.2em]">No Grievances Found</p>
                    </div>
                )}
            </div>

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

                            {selectedGrievance.status !== 'Unassigned' && (
                                <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                        <User size={14} /> Assignment Info
                                    </p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest mb-1">Teacher</p>
                                            <p className="font-black text-sm uppercase">{selectedGrievance.teacherName || 'Not Assigned'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest mb-1">Assigned On</p>
                                            <p className="font-black text-sm uppercase">{selectedGrievance.assignDate || 'N/A'}</p>
                                        </div>
                                    </div>
                                    
                                    {selectedGrievance.solution && (
                                        <div className="mt-6 pt-6 border-t border-slate-500/10">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-green-500 mb-3 flex items-center gap-2">
                                                <CheckCircle size={14} /> Resolution Note
                                            </p>
                                            <p className="text-sm font-bold italic leading-relaxed text-slate-500">
                                                {selectedGrievance.solution}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                {selectedGrievance.status === 'Assign' && (
                                    <button 
                                        onClick={() => handleStatusUpdate(selectedGrievance.id, 'Resolved')}
                                        className="flex-1 py-4 bg-green-600 hover:bg-green-700 text-white rounded-[5px] font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-green-600/20 transition-all active:scale-95"
                                    >
                                        Mark Resolved
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleStatusUpdate(selectedGrievance.id, 'Rejected')}
                                    className={`flex-1 py-4 border font-black uppercase tracking-[0.2em] text-xs rounded-[5px] transition-all active:scale-95 ${isDarkMode ? 'border-red-500/50 text-red-500 hover:bg-red-500/10' : 'border-red-200 text-red-500 hover:bg-red-50'}`}
                                >
                                    Reject Case
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Modal */}
            {isAssignModalOpen && selectedGrievance && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md mx-4 overflow-hidden rounded-[5px] shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-8 bg-orange-500 text-white">
                            <h3 className="text-2xl font-black uppercase tracking-tight">Assign Grievance</h3>
                            <p className="text-xs font-bold opacity-70 mt-1 uppercase tracking-widest">Select a teacher for resolution</p>
                        </div>
                        
                        <div className={`p-10 space-y-8 ${isDarkMode ? 'bg-[#10141D]' : 'bg-white'}`}>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available Teachers</label>
                                <select 
                                    className={`w-full p-4 rounded-[5px] border text-sm font-black outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 focus:border-orange-500' : 'bg-slate-50 border-slate-200 focus:border-orange-500'}`}
                                    value={selectedTeacher}
                                    onChange={(e) => setSelectedTeacher(e.target.value)}
                                >
                                    <option value="">Select a Teacher</option>
                                    {Array.isArray(teachers) && teachers.map(t => (
                                        <option key={t.code || t.id} value={t.code || t.id}>{t.name || t.teacher_name} ({t.code || t.employee_id || 'N/A'})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setIsAssignModalOpen(false)}
                                    className={`flex-1 py-4 font-black uppercase tracking-widest text-xs rounded-[5px] border ${isDarkMode ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleAssign}
                                    disabled={!selectedTeacher}
                                    className={`flex-1 py-4 rounded-[5px] font-black uppercase tracking-widest text-xs shadow-lg transition-all active:scale-95 ${selectedTeacher ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                                >
                                    Assign Case
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
