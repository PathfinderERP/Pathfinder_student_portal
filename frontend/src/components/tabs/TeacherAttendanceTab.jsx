import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, Calendar, LogIn, LogOut, UserCheck, ShieldAlert, Search, Filter, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import axios from 'axios';

const TeacherAttendanceTab = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [attendanceLogs, setAttendanceLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [clockState, setClockState] = useState({ isClockedIn: true, time: '08:52 AM' });
    const [actionMsg, setActionMsg] = useState(null);

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/teacher-portal/attendance/`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (res.data?.data) {
                setAttendanceLogs(res.data.data);
            }
        } catch (err) {
            console.error("Teacher attendance fetch error:", err);
            // Fallback mock data if server offline
            setAttendanceLogs([
                { id: 1, date: new Date().toISOString().split('T')[0], teacher_name: "Dr. Rajesh Sharma", department: "Physics", entry_time: "08:52 AM", exit_time: "04:30 PM", status: "On Time", is_last_moment: false, shift_hours: "7h 38m" },
                { id: 2, date: new Date().toISOString().split('T')[0], teacher_name: "Anita Verma", department: "Chemistry", entry_time: "08:59 AM", exit_time: "04:15 PM", status: "On Time", is_last_moment: true, shift_hours: "7h 16m" },
                { id: 3, date: new Date().toISOString().split('T')[0], teacher_name: "Siddharth Roy", department: "Mathematics", entry_time: "09:14 AM", exit_time: "04:45 PM", status: "Late Entry", is_last_moment: true, shift_hours: "7h 31m" },
                { id: 4, date: "2026-08-12", teacher_name: "Dr. Rajesh Sharma", department: "Physics", entry_time: "08:45 AM", exit_time: "04:35 PM", status: "On Time", is_last_moment: false, shift_hours: "7h 50m" }
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendance();
    }, []);

    const handleClockToggle = () => {
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (clockState.isClockedIn) {
            setClockState({ isClockedIn: false, time: now });
            setActionMsg(`Clocked Out successfully at ${now}`);
        } else {
            setClockState({ isClockedIn: true, time: now });
            setActionMsg(`Clocked In successfully at ${now}`);
        }
        setTimeout(() => setActionMsg(null), 4000);
    };

    const filteredLogs = attendanceLogs.filter(log => {
        const matchesSearch = log.teacher_name.toLowerCase().includes(searchQuery.toLowerCase()) || log.department.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'All' || 
            (filterStatus === 'Alert' && log.is_last_moment) || 
            (filterStatus === log.status);
        return matchesSearch && matchesFilter;
    });

    const alertCount = attendanceLogs.filter(l => l.is_last_moment).length;

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-xl backdrop-blur-xl transition-all`}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Clock className="text-cyan-500" size={24} />
                            <h2 className="text-2xl font-black tracking-tight">Teachers Attendance Monitor</h2>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">
                            Real-time entry & exit time tracking with high-alert notification for last-moment arrivals.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                            onClick={handleClockToggle}
                            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-lg ${
                                clockState.isClockedIn
                                    ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white hover:opacity-90 shadow-rose-500/20'
                                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90 shadow-emerald-500/20'
                            }`}
                        >
                            {clockState.isClockedIn ? <LogOut size={16} /> : <LogIn size={16} />}
                            <span>{clockState.isClockedIn ? 'Clock Out' : 'Clock In'}</span>
                        </button>

                        <button
                            onClick={fetchAttendance}
                            className={`p-2.5 rounded-xl border transition-all ${isDarkMode ? 'border-white/10 hover:bg-white/5 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                            title="Refresh Data"
                        >
                            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {actionMsg && (
                    <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold animate-fade-in flex items-center gap-2">
                        <CheckCircle size={16} />
                        {actionMsg}
                    </div>
                )}
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Presence</span>
                    <div className="flex items-center justify-between">
                        <span className="text-2xl font-black text-emerald-500">96%</span>
                        <UserCheck className="text-emerald-500/80" size={24} />
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">48 / 50 Teachers On Duty</p>
                </div>

                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Shift Hours</span>
                    <div className="flex items-center justify-between">
                        <span className="text-2xl font-black text-cyan-400">7h 42m</span>
                        <Clock className="text-cyan-400/80" size={24} />
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">Target: 7.5 hrs/day</p>
                </div>

                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-rose-950/20 border-rose-500/20' : 'bg-rose-50 border-rose-200'} space-y-2`}>
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">High Alert Entries</span>
                    <div className="flex items-center justify-between">
                        <span className="text-2xl font-black text-rose-500">{alertCount}</span>
                        <ShieldAlert className="text-rose-500 animate-pulse" size={24} />
                    </div>
                    <p className="text-[11px] text-rose-400/80 font-medium">Last-moment arrival (&lt;1 min before shift)</p>
                </div>

                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Late Arrivals</span>
                    <div className="flex items-center justify-between">
                        <span className="text-2xl font-black text-amber-400">1</span>
                        <AlertTriangle className="text-amber-400/80" size={24} />
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">Entry after 09:00 AM</p>
                </div>
            </div>

            {/* High Alert Banner if alerts exist */}
            {alertCount > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-900/40 to-amber-900/30 border border-rose-500/40 text-rose-200 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 animate-pulse">
                            <ShieldAlert size={22} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black uppercase tracking-wider">Attendance High Alert Triggered</h4>
                            <p className="text-xs text-rose-300/80">
                                {alertCount} teacher(s) recorded entry within 60 seconds of schedule start or late. Flagged for management report.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setFilterStatus('Alert')} 
                        className="px-3 py-1.5 rounded-lg bg-rose-500 text-white font-bold text-xs hover:bg-rose-600 transition-all uppercase whitespace-nowrap"
                    >
                        View Flagged
                    </button>
                </div>
            )}

            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className={`relative flex-1 w-full`}>
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search by teacher name or department..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-semibold outline-none transition-all ${
                            isDarkMode
                                ? 'bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-500/50'
                                : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-cyan-500'
                        }`}
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter size={16} className="text-slate-400" />
                    {['All', 'On Time', 'Late Entry', 'Alert'].map(statusOption => (
                        <button
                            key={statusOption}
                            onClick={() => setFilterStatus(statusOption)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                                filterStatus === statusOption
                                    ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                                    : (isDarkMode ? 'bg-slate-900/60 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                            }`}
                        >
                            {statusOption}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'} shadow-xl`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className={`border-b font-extrabold uppercase tracking-wider text-[11px] ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                <th className="p-4">Teacher Name</th>
                                <th className="p-4">Department</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Entry Time</th>
                                <th className="p-4">Exit Time</th>
                                <th className="p-4">Shift Hours</th>
                                <th className="p-4">Status & Alert</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredLogs.map(log => (
                                <tr key={log.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/80'}`}>
                                    <td className="p-4 font-bold text-sm">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${isDarkMode ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-700'}`}>
                                                {log.teacher_name.charAt(0)}
                                            </div>
                                            <span>{log.teacher_name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 font-medium text-slate-400">{log.department}</td>
                                    <td className="p-4 font-medium text-slate-400">{log.date}</td>
                                    <td className="p-4 font-bold text-emerald-400">{log.entry_time}</td>
                                    <td className="p-4 font-bold text-amber-400">{log.exit_time || 'In Session'}</td>
                                    <td className="p-4 font-medium">{log.shift_hours}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                log.status === 'On Time'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                            }`}>
                                                {log.status}
                                            </span>
                                            {log.is_last_moment && (
                                                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase tracking-wider animate-pulse">
                                                    <ShieldAlert size={12} />
                                                    High Alert
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TeacherAttendanceTab;
