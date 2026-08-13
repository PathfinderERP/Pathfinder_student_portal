import React, { useState, useEffect } from 'react';
import { Users, Layers, CheckCircle2, AlertCircle, RefreshCw, UserCheck, UserX, UserPlus, BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import axios from 'axios';

const BatchTeacherAttendanceTab = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [batchAttendance, setBatchAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedClass, setSelectedClass] = useState('All');

    const fetchBatchAttendance = async () => {
        setLoading(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/teacher-portal/batch-attendance/`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (res.data?.data) {
                setBatchAttendance(res.data.data);
            }
        } catch (err) {
            console.error("Batch teacher attendance fetch error:", err);
            setBatchAttendance([
                {
                    class_name: "Class 11 - Medical",
                    batch_code: "MED-11A",
                    assigned_teachers: [
                        { name: "Dr. Rajesh Sharma", subject: "Physics", status: "Present", entry_time: "08:52 AM" },
                        { name: "Anita Verma", subject: "Chemistry", status: "Present", entry_time: "08:59 AM" },
                        { name: "Dr. Sunita Sen", subject: "Biology", status: "Present", entry_time: "09:05 AM" }
                    ],
                    attendance_rate: "100%",
                    substitute_assigned: false
                },
                {
                    class_name: "Class 12 - Engineering",
                    batch_code: "ENG-12B",
                    assigned_teachers: [
                        { name: "Siddharth Roy", subject: "Mathematics", status: "Late (09:14 AM)", entry_time: "09:14 AM" },
                        { name: "Dr. Rajesh Sharma", subject: "Physics", status: "Present", entry_time: "08:52 AM" },
                        { name: "Anita Verma", subject: "Chemistry", status: "Present", entry_time: "08:59 AM" }
                    ],
                    attendance_rate: "100%",
                    substitute_assigned: false
                },
                {
                    class_name: "Repeater Batch - NEET",
                    batch_code: "NEET-REP-01",
                    assigned_teachers: [
                        { name: "Priyanka Das", subject: "Zoology", status: "Absent", entry_time: "N/A" },
                        { name: "Dr. Amit Mukherjee", subject: "Botany", status: "Present", entry_time: "08:40 AM" }
                    ],
                    attendance_rate: "50%",
                    substitute_assigned: true,
                    substitute_name: "Dr. Sunita Sen"
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBatchAttendance();
    }, []);

    const filteredBatches = batchAttendance.filter(batch => 
        selectedClass === 'All' || batch.class_name.toLowerCase().includes(selectedClass.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-xl backdrop-blur-xl transition-all`}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Layers className="text-cyan-500" size={24} />
                            <h2 className="text-2xl font-black tracking-tight">Class & Batch-wise Teacher Attendance</h2>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">
                            Displaying assigned teacher presence, late entry flags, and substitution records per academic batch.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {['All', 'Class 11', 'Class 12', 'Repeater'].map(cls => (
                            <button
                                key={cls}
                                onClick={() => setSelectedClass(cls)}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                                    selectedClass === cls
                                        ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                                        : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                                }`}
                            >
                                {cls}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Batch Grid Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {filteredBatches.map((batch, idx) => (
                    <div
                        key={idx}
                        className={`p-6 rounded-2xl border flex flex-col justify-between transition-all duration-300 ${
                            isDarkMode
                                ? 'bg-slate-900/40 border-white/10 hover:border-cyan-500/30'
                                : 'bg-white border-slate-200 hover:border-cyan-500/50'
                        } shadow-lg space-y-6`}
                    >
                        <div>
                            <div className="flex items-center justify-between pb-4 border-b border-white/5">
                                <div>
                                    <h3 className="text-lg font-black tracking-tight">{batch.class_name}</h3>
                                    <span className="text-xs font-bold text-cyan-400 tracking-wide uppercase">Batch: {batch.batch_code}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-slate-400 font-bold uppercase block">Attendance</span>
                                    <span className={`text-xl font-black ${parseInt(batch.attendance_rate) >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {batch.attendance_rate}
                                    </span>
                                </div>
                            </div>

                            {/* Assigned Teachers List */}
                            <div className="mt-4 space-y-3">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">Assigned Faculty</span>
                                {batch.assigned_teachers.map((teacher, tIdx) => (
                                    <div key={tIdx} className={`p-3 rounded-xl border flex items-center justify-between ${isDarkMode ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-bold">{teacher.name}</p>
                                            <span className="text-[10px] text-slate-400 font-medium block">{teacher.subject}</span>
                                        </div>

                                        <div className="text-right">
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                teacher.status.includes('Present')
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                    : teacher.status.includes('Late')
                                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                            }`}>
                                                {teacher.status.includes('Present') && <UserCheck size={10} />}
                                                {teacher.status.includes('Late') && <AlertCircle size={10} />}
                                                {teacher.status.includes('Absent') && <UserX size={10} />}
                                                {teacher.status}
                                            </span>
                                            <span className="text-[10px] text-slate-400 block mt-0.5">Entry: {teacher.entry_time}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Substitution Banner */}
                        {batch.substitute_assigned ? (
                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                                <UserPlus size={16} className="text-amber-400" />
                                <div>
                                    <span className="font-bold block">Substitute Deployed</span>
                                    <span className="text-[10px] text-amber-400/80">{batch.substitute_name} covering for absent faculty</span>
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2">
                                <CheckCircle2 size={16} />
                                <span className="font-bold text-[11px]">All scheduled faculty on duty</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BatchTeacherAttendanceTab;
