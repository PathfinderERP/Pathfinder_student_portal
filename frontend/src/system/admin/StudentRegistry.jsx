import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Database, AlertCircle, MapPin, Mail, Power, Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import StudentDetailView from '../StudentDetailView';

const StudentRegistry = ({ studentsData, isERPLoading }) => {
    const { isDarkMode } = useTheme();
    const { user: portalUser, lastUsername, lastPassword } = useAuth();
    const [students, setStudents] = useState(studentsData || []);
    const [isLoading, setIsLoading] = useState(!studentsData || studentsData.length === 0);
    const [error, setError] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);

    useEffect(() => {
        if (studentsData && studentsData.length > 0) {
            setStudents(studentsData);
            setIsLoading(false);
            return;
        }

        const loadERPData = async () => {
            setIsLoading(true);
            try {
                const erpUrl = import.meta.env.VITE_ERP_API_URL || 'https://pathfinder-5ri2.onrender.com';
                const erpIdentifier = "atanu@gmail.com";
                const erpPassword = "000000";

                const loginRes = await axios.post(`${erpUrl}/api/superAdmin/login`, {
                    email: erpIdentifier,
                    password: erpPassword
                });

                const token = loginRes.data.token;
                const admissionRes = await axios.get(`${erpUrl}/api/admission`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                let erpData = [];
                if (Array.isArray(admissionRes.data)) {
                    erpData = admissionRes.data;
                } else if (admissionRes.data?.student?.studentsDetails) {
                    erpData = admissionRes.data.student.studentsDetails;
                } else if (admissionRes.data?.data) {
                    erpData = admissionRes.data.data;
                }

                setStudents(erpData);
            } catch (err) {
                console.error("❌ ERP Sync Massive Failure:", err);
                setError(`Sync Failed: ${err.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        loadERPData();
    }, [studentsData, portalUser?.email]);

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center py-24 space-y-6">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-orange-500/10 border-t-orange-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Database size={20} className="text-orange-500 animate-pulse" />
                </div>
            </div>
            <div className="text-center">
                <p className="font-black uppercase tracking-[0.3em] text-[10px] text-orange-500 mb-1">ERP Gateway</p>
                <p className={`text-xs font-bold opacity-40 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Synchronizing Live Student Registry...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mb-6 border border-red-500/20 shadow-2xl shadow-red-500/10">
                <AlertCircle size={40} strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight mb-2">Sync Connection Failed</h3>
            <p className="text-sm font-medium opacity-50 max-w-xs mx-auto mb-8">{error}</p>
            <button onClick={() => window.location.reload()} className="px-6 py-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all active:scale-95">Retry Sync</button>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className={`p-10 rounded-[3rem] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200/60 shadow-slate-200/40'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="px-3 py-1 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-orange-500/20">External ERP</div>
                            <h2 className="text-3xl font-black tracking-tight uppercase">Student <span className="text-orange-500">Registry</span></h2>
                        </div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Pathfinder Admission System live data synchronization.</p>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'}`}>
                                <th className="pb-6 px-4">Student Profile</th>
                                <th className="pb-6 px-4">Course / Center</th>
                                <th className="pb-6 px-4">Contact Info</th>
                                <th className="pb-6 px-4 text-center">Form ID</th>
                                <th className="pb-6 px-4 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-transparent">
                            {students.length > 0 ? students.map((std, i) => (
                                <tr key={i} onClick={() => setSelectedStudent(std)} className={`group cursor-pointer ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'} transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]`}>
                                    <td className="py-6 px-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm border-2 transition-all group-hover:scale-110 group-hover:rotate-3 ${isDarkMode ? 'bg-orange-500/10 text-orange-500 border-white/5 shadow-inner' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                                {(std.student?.studentsDetails?.[0]?.studentName || std.studentName || 'S').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-extrabold text-base tracking-tight leading-none mb-1">{std.student?.studentsDetails?.[0]?.studentName || std.studentName || 'Anonymous Student'}</p>
                                                <p className="text-[9px] opacity-40 font-black uppercase tracking-[0.2em]">{std.student?.studentsDetails?.[0]?.gender || 'Student'} • {std.student?.studentsDetails?.[0]?.board || 'Regular'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-6 px-4">
                                        <div className="text-sm font-black text-orange-500 mb-0.5">{std.course?.courseName || 'Standard Program'}</div>
                                        <div className="flex items-center gap-2">
                                            <MapPin size={10} className="opacity-40" />
                                            <span className="text-[10px] font-bold opacity-50 uppercase tracking-tighter">{std.centre || 'Main Campus'}</span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Mail size={12} className="opacity-30" />
                                            <span className="text-xs font-medium opacity-60 italic whitespace-nowrap">{std.student?.studentsDetails?.[0]?.studentEmail || 'no-email@erp.system'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Power size={10} className="rotate-90 text-emerald-500" />
                                            <span className="text-[11px] font-black opacity-70 tracking-tight">+91 {std.student?.studentsDetails?.[0]?.mobileNum || 'XXXXXXXXXX'}</span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-4 text-center">
                                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest ${isDarkMode ? 'bg-white/5 text-white/30 border border-white/5' : 'bg-slate-100 text-slate-400 border border-slate-200/50'}`}>
                                            #{std.admissionNumber?.slice(-6) || 'ERP-ID'}
                                        </span>
                                    </td>
                                    <td className="py-6 px-4 text-right">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border shadow-lg ${std.admissionStatus === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/5' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>
                                                {std.admissionStatus || 'PENDING'}
                                            </span>
                                            <span className="text-[8px] font-bold opacity-30 mt-1 uppercase tracking-tighter">Sync: Just Now</span>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="py-32 text-center">
                                        <div className="flex flex-col items-center opacity-20">
                                            <Database size={48} className="mb-4" />
                                            <p className="font-black uppercase tracking-[0.2em] text-sm">No Records Available</p>
                                            <p className="text-xs mt-1">External database returned an empty set.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedStudent && (
                <StudentDetailView
                    student={selectedStudent}
                    onClose={() => setSelectedStudent(null)}
                />
            )}
        </div>
    );
};

export default StudentRegistry;
