import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, Calendar, Search, Users, ShieldCheck } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const TeacherAttendance = () => {
    const { isDarkMode } = useTheme();

    const theme = {
        card: isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm',
        text: isDarkMode ? 'text-white' : 'text-slate-900',
        subtext: isDarkMode ? 'text-slate-500' : 'text-slate-500',
        border: isDarkMode ? 'border-white/5' : 'border-slate-100'
    };

    const students = [
        { name: 'Abhijit Payra', id: 'EMP26000478', status: 'P', time: '09:05 AM' },
        { name: 'Rahul Sharma', id: 'EMP26000512', status: 'A', time: '--' },
        { name: 'Priya Verma', id: 'EMP26000489', status: 'P', time: '08:58 AM' },
        { name: 'Sameer Khan', id: 'EMP26000601', status: 'L', time: '09:25 AM' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-mono">
            <div className={`p-8 rounded-[5px] border ${theme.card} flex flex-col md:flex-row md:items-center justify-between gap-6`}>
                <div>
                    <h2 className={`text-2xl font-black uppercase tracking-tight ${theme.text}`}>Attendance Registry</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Batch: NEET-2025-A • Room: L302</p>
                </div>
                <div className="flex gap-4">
                    <div className="text-right">
                        <p className={`text-xl font-black ${theme.text}`}>24 / 28</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Present Today</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className={`rounded-[5px] border ${theme.card} overflow-hidden`}>
                    <div className={`p-4 border-b ${theme.border} bg-cyan-500/5 flex items-center justify-between`}>
                        <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.text}`}>Student Roll Call</h3>
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-[2px] text-[8px] font-black text-emerald-500 uppercase">
                            <ShieldCheck size={10} /> Validated by Admin
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`border-b ${theme.border}`}>
                                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Student</th>
                                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-500">ID Number</th>
                                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Timestamp</th>
                                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Status</th>
                                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-inherit border-inherit">
                                {students.map((student, i) => (
                                    <tr key={i} className="hover:bg-cyan-500/[0.02] transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-[5px] flex items-center justify-center font-black ${isDarkMode ? 'bg-white/5 text-cyan-400' : 'bg-slate-50 text-cyan-600'}`}>
                                                    {student.name.charAt(0)}
                                                </div>
                                                <span className={`text-[10px] font-black uppercase tracking-tight ${theme.text}`}>{student.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-[10px] font-bold text-slate-500">{student.id}</td>
                                        <td className="p-4 text-[10px] font-bold text-slate-500">{student.time}</td>
                                        <td className="p-4">
                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 border rounded-[1px] ${student.status === 'P' ? 'border-emerald-500/50 text-emerald-500' :
                                                    student.status === 'A' ? 'border-rose-500/50 text-rose-500' :
                                                        'border-amber-500/50 text-amber-500'
                                                }`}>
                                                {student.status === 'P' ? 'Present' : student.status === 'A' ? 'Absent' : 'Late'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <button className="text-cyan-500 hover:text-cyan-400 italic text-[9px] font-bold uppercase tracking-widest">EDIT</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherAttendance;
